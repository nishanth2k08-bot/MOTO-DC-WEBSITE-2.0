import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
    if (typeof serviceAccount === 'string') serviceAccount = JSON.parse(serviceAccount);
  } catch {
    try {
      serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  }
  if (!serviceAccount?.project_id || !serviceAccount?.client_email || !serviceAccount?.private_key) {
    throw new Error('Incomplete Firebase service account');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

function send(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return res.status(status).json(body);
}

function extractBase64(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

async function verifyKycWithGemini({ name, licenseNumber, vehicleNumber, vehicleType, dlPhoto, rcPhoto }) {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GOOGLE_API_KEY;

  const apiKey = rawKey ? String(rawKey).trim().replace(/^["']|["']$/g, '') : '';
  if (!apiKey) {
    return {
      status: 'skipped',
      verdict: 'NEEDS_MANUAL_REVIEW',
      score: 50,
      summary: 'Gemini API key not configured on server. Manual review required.',
      quality: 'uninspected',
    };
  }

  const dlParsed = extractBase64(dlPhoto);
  const rcParsed = extractBase64(rcPhoto);

  if (!dlParsed && !rcParsed) {
    return {
      status: 'skipped',
      verdict: 'NEEDS_MANUAL_REVIEW',
      score: 50,
      summary: 'No document image proofs were uploaded for AI analysis.',
      quality: 'none',
    };
  }

  const promptText = `You are the official automated KYC verification AI for MotoDC Delivery Partner Fleet in India.
Analyze the uploaded document image(s) and cross-reference them against the rider's entered form details:
- Applicant Name: "${name}"
- Entered DL Number: "${licenseNumber || 'Not provided'}"
- Entered Vehicle Registration Number: "${vehicleNumber || 'Not provided'}"
- Vehicle Type: "${vehicleType || 'Motorcycle'}"

Instructions:
1. Examine the image(s). Note: Image 1 is typically the Driving License (DL); Image 2 is typically the Vehicle RC.
2. Extract visible text:
   - DL: Extracted Name, Extracted DL Number, Vehicle Classes, Expiry date.
   - RC: Extracted Registration Number, Owner Name, Vehicle Class/Model.
3. Compare:
   - Does the DL name match applicant name? (Allow minor typos, initials vs full name like "R. Kumar" vs "Ravi Kumar").
   - Does the DL number match entered DL number? (Ignore spaces and hyphens).
   - Does the RC registration number match entered vehicle number? (Ignore spaces and hyphens).
4. Evaluate document visual quality: "clear", "blurry", "cut_off", or "tampered".
5. Compute a confidence score from 0 to 100:
   - 80-100: Documents look authentic and clearly match the applicant details.
   - 50-79: Partial match, minor discrepancy, or one document missing.
   - 0-49: Illegible, blurry, fake/wrong document uploaded, or severe mismatch.
6. Provide a verdict:
   - "RECOMMENDED_APPROVE" (score >= 80)
   - "NEEDS_MANUAL_REVIEW" (score 50-79)
   - "SUSPICIOUS_OR_BLURRY" (score < 50)

Respond ONLY with a valid JSON object matching this schema (no markdown, no backticks, no comments):
{
  "score": 95,
  "verdict": "RECOMMENDED_APPROVE",
  "summary": "DL and RC are clearly readable. Name and numbers match applicant details.",
  "quality": "clear",
  "dl": {
    "isDrivingLicense": true,
    "extractedName": "...",
    "extractedNumber": "...",
    "nameMatch": true,
    "numberMatch": true
  },
  "rc": {
    "isVehicleRc": true,
    "extractedNumber": "...",
    "extractedOwner": "...",
    "numberMatch": true
  },
  "flags": []
}`;

  const parts = [{ text: promptText }];
  if (dlParsed) {
    if (dlParsed.mimeType === 'image/svg+xml' || dlParsed.mimeType.includes('svg')) {
      const svgText = Buffer.from(dlParsed.data, 'base64').toString('utf8');
      parts.push({ text: `[Driving License Document Content (SVG/Text)]:\n${svgText}` });
    } else {
      parts.push({
        inlineData: {
          mimeType: dlParsed.mimeType,
          data: dlParsed.data,
        },
      });
    }
  }
  if (rcParsed) {
    if (rcParsed.mimeType === 'image/svg+xml' || rcParsed.mimeType.includes('svg')) {
      const svgText = Buffer.from(rcParsed.data, 'base64').toString('utf8');
      parts.push({ text: `[Vehicle RC Document Content (SVG/Text)]:\n${svgText}` });
    } else {
      parts.push({
        inlineData: {
          mimeType: rcParsed.mimeType,
          data: rcParsed.data,
        },
      });
    }
  }

  const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  const allErrors = [];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = rawText.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
        const parsedJson = JSON.parse(cleaned);
        return {
          status: 'completed',
          model,
          analyzedAt: Date.now(),
          score: typeof parsedJson.score === 'number' ? parsedJson.score : 75,
          verdict: parsedJson.verdict || 'NEEDS_MANUAL_REVIEW',
          summary: parsedJson.summary || 'AI inspection completed.',
          quality: parsedJson.quality || 'clear',
          dl: parsedJson.dl || null,
          rc: parsedJson.rc || null,
          flags: Array.isArray(parsedJson.flags) ? parsedJson.flags : [],
        };
      } else {
        const errText = await res.text();
        console.warn(`Gemini model ${model} returned (${res.status}):`, errText);
        allErrors.push(`${model} [${res.status}]: ${errText.slice(0, 200)}`);
      }
    } catch (e) {
      console.warn(`Gemini model ${model} error:`, e.message);
      allErrors.push(`${model} [ERR]: ${e.message}`);
    }
  }

  return {
    status: 'failed',
    verdict: 'NEEDS_MANUAL_REVIEW',
    score: 50,
    summary: 'AI inspection encountered a service error. Please review manually.',
    error: allErrors.join(' || '),
  };
}

function getShiftSchedule(serviceMode) {
  const mode = String(serviceMode || 'Standard').toLowerCase();
  if (mode.includes('part')) {
    return {
      name: 'Part-Time',
      windows: [
        {
          startMinutes: 9 * 60, // 09:00 AM
          endMinutes: 14 * 60, // 02:00 PM
          checkinOpensMinutes: 8 * 60 + 45, // 08:45 AM (15m before)
          checkinCutoffMinutes: 9 * 60 + 20, // 09:20 AM (20m grace)
          label: '9:00 AM – 2:00 PM (Morning)',
          shiftStartTime: '09:00 AM',
          cutoffTime: '09:20 AM',
        },
        {
          startMinutes: 15 * 60 + 30, // 03:30 PM
          endMinutes: 20 * 60 + 30, // 08:30 PM
          checkinOpensMinutes: 15 * 60 + 15, // 03:15 PM
          checkinCutoffMinutes: 15 * 60 + 50, // 03:50 PM
          label: '3:30 PM – 8:30 PM (Evening)',
          shiftStartTime: '03:30 PM',
          cutoffTime: '03:50 PM',
        },
      ],
      overallLabel: '9:00 AM – 2:00 PM & 3:30 PM – 8:30 PM',
    };
  }
  if (mode.includes('power')) {
    return {
      name: 'Power Rider',
      windows: [
        {
          startMinutes: 8 * 60, // 08:00 AM
          endMinutes: 21 * 60 + 30, // 09:30 PM
          checkinOpensMinutes: 7 * 60 + 45, // 07:45 AM
          checkinCutoffMinutes: 8 * 60 + 30, // 08:30 AM (30m grace)
          label: '8:00 AM – 9:30 PM',
          shiftStartTime: '08:00 AM',
          cutoffTime: '08:30 AM',
        },
      ],
      overallLabel: '8:00 AM – 9:30 PM',
    };
  }
  // Standard
  return {
    name: 'Standard',
    windows: [
      {
        startMinutes: 8 * 60 + 30, // 08:30 AM
        endMinutes: 20 * 60 + 30, // 08:30 PM
        checkinOpensMinutes: 8 * 60 + 15, // 08:15 AM
        checkinCutoffMinutes: 9 * 60 + 0, // 09:00 AM (30m grace)
        label: '8:30 AM – 8:30 PM',
        shiftStartTime: '08:30 AM',
        cutoffTime: '09:00 AM',
      },
    ],
    overallLabel: '8:30 AM – 8:30 PM',
  };
}

function evaluateRiderCheckin(serviceMode, pData) {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utcMillis + 330 * 60000);
  const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();
  const istTimeString = istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Hub Manager Emergency Override Check
  if (pData?.adminShiftOverride) {
    return { allowed: true, isLate: false, reason: 'Admin Override Active', istTimeString, currentMinutes };
  }

  // 1-Time Emergency Login Pass Check
  // Grants immediate 1-time testing pass for MDC-8586 if not yet consumed
  const isOneTimePermitted = (pData?.oneTimePassGranted && !pData?.oneTimePassConsumed) || (pData?.username === 'MDC-8586' && !pData?.oneTimePassConsumed);
  if (isOneTimePermitted) {
    return {
      allowed: true,
      isLate: false,
      isOneTimePass: true,
      reason: '1-Time Emergency Login Pass Approved',
      istTimeString,
      currentMinutes,
    };
  }

  const schedule = getShiftSchedule(serviceMode);

  // Check if current time falls within any active operating window
  const activeWindow = schedule.windows.find(
    (w) => currentMinutes >= w.checkinOpensMinutes && currentMinutes <= w.endMinutes
  );

  if (!activeWindow) {
    return {
      allowed: false,
      code: 'OUTSIDE_OPERATING_HOURS',
      istTimeString,
      schedule,
      error: `Shift Closed: Deliveries operate during your scheduled shift (${schedule.overallLabel} IST). Current time is ${istTimeString} IST.`,
    };
  }

  // Check if rider is late for check-in
  if (currentMinutes > activeWindow.checkinCutoffMinutes) {
    return {
      allowed: false,
      code: 'LATE_CHECKIN_BLOCKED',
      istTimeString,
      activeWindow,
      schedule,
      shiftStartTime: activeWindow.shiftStartTime,
      cutoffTime: activeWindow.cutoffTime,
      minutesLate: currentMinutes - activeWindow.startMinutes,
      error: `Late Check-In Blocked: Shift scheduled for ${activeWindow.shiftStartTime}. On-time check-in window closed at ${activeWindow.cutoffTime}.`,
    };
  }

  return {
    allowed: true,
    isLate: false,
    activeWindow,
    istTimeString,
    currentMinutes,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const a = getAdmin();
    const db = getFirestore(a.app(), 'asia-south1');
    const action = String(req.query.action || '').trim().toLowerCase();

    const partnersCol = db.collection('deliveryPartners');
    const resetsCol = db.collection('deliveryPartnerResets');
    const kycCol = db.collection('deliveryPartnerKYC');

    const parseBody = () => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));

    // -------------------------------------------------------------
    // 1. RIDER LOGIN: Alphanumeric Username + 6-Digit PIN
    // -------------------------------------------------------------
    if (action === 'login' && req.method === 'POST') {
      const { username, pin } = parseBody();
      const cleanUser = String(username || '').trim().toUpperCase();
      const cleanPin = String(pin || '').trim();

      if (!cleanUser || !cleanPin) {
        return send(res, 400, { error: 'Username (Alphanumeric Code) and 6-digit PIN are required' });
      }

      if (!/^\d{6}$/.test(cleanPin)) {
        return send(res, 400, { error: 'PIN must be exactly 6 digits' });
      }

      const partnerDoc = await partnersCol.doc(cleanUser).get();
      if (!partnerDoc.exists) {
        return send(res, 401, { error: `Delivery partner "${cleanUser}" not found. Contact Admin.` });
      }

      const pData = partnerDoc.data();
      if (pData.active === false) {
        return send(res, 403, { error: 'Your account is deactivated. Contact Admin.' });
      }

      if (String(pData.pin) !== cleanPin) {
        return send(res, 401, { error: 'Invalid 6-digit PIN. Tap "Forgot PIN" if forgotten.' });
      }

      // Shift Hour & On-Time Check-In Enforcement
      const checkinEval = evaluateRiderCheckin(pData.serviceMode, pData);
      if (!checkinEval.allowed) {
        if (checkinEval.code === 'LATE_CHECKIN_BLOCKED') {
          const lateStrikes = (pData.lateStrikes || 0) + 1;
          const bonusCutoff = lateStrikes >= 3;
          // Record late strike in Firestore
          await partnerDoc.ref.update({
            lateStrikes,
            bonusCutoff,
            lastLateDate: new Date().toISOString(),
            lastLateTime: checkinEval.istTimeString,
          });

          // If 3 strikes reached: Send Bonus Forfeiture Email via MSG91
          if (bonusCutoff && !pData.bonusCutoffEmailSent && pData.email) {
            try {
              const authKey = process.env.MSG91_AUTHKEY;
              const domain = process.env.MSG91_EMAIL_DOMAIN;
              const templateId = process.env.MSG91_TEMPLATE_BONUS_CANCEL || 'motodc_rider_bonus_cancelled';
              const fromEmail = String(process.env.MSG91_FROM_EMAIL || `no-reply@${domain || 'motodc.in'}`).trim();
              const currentMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
              const riderName = pData.name || 'MotoDC Partner';

              if (authKey && domain && templateId) {
                await fetch('https://control.msg91.com/api/v5/email/send', {
                  method: 'POST',
                  headers: {
                    accept: 'application/json',
                    authkey: authKey,
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify({
                    recipients: [
                      {
                        to: [{ name: riderName, email: pData.email }],
                        variables: {
                          rider_name: riderName,
                          rider_id: pData.username || cleanUser,
                          bonus_month: currentMonth,
                          month: currentMonth,
                          strikes_count: '3',
                          bonus_amount: '₹2,500',
                          policy_reason: 'Repeated unpunctuality and shift check-in cutoff violations',
                          hub_location: 'Karaikal Central Fleet Hub',
                          VAR1: riderName,
                          VAR2: '₹2,500',
                          VAR3: currentMonth,
                          VAR4: '3',
                          var1: riderName,
                          var2: '₹2,500',
                          var3: currentMonth,
                          var4: '3',
                        },
                      },
                    ],
                    from: { name: process.env.MSG91_FROM_NAME || 'MOTO DC FLEET', email: fromEmail },
                    domain,
                    template_id: templateId,
                    validate_before_send: true,
                  }).catch((err) => console.warn('MSG91 bonus cancel dispatch error:', err));

                  await partnerDoc.ref.update({
                    bonusCutoffEmailSent: true,
                    bonusCutoffEmailSentAt: new Date().toISOString(),
                  });
                }
              }
            } catch (emailErr) {
              console.warn('Bonus cancellation email error:', emailErr);
            }
          }

          return send(res, 403, {
            ok: false,
            code: 'LATE_CHECKIN_BLOCKED',
            error: checkinEval.error,
            lateStrikes,
            bonusCutoff,
            shiftStartTime: checkinEval.shiftStartTime,
            cutoffTime: checkinEval.cutoffTime,
            istTimeString: checkinEval.istTimeString,
            minutesLate: checkinEval.minutesLate,
            message: `You attempted to check in late at ${checkinEval.istTimeString}. Your shift was scheduled for ${checkinEval.shiftStartTime} (check-in closed at ${checkinEval.cutoffTime}). You have accumulated ${lateStrikes}/3 late strikes. ${
              bonusCutoff
                ? '⚠️ ATTENDANCE PENALTY: Your monthly punctuality bonus (₹2,500) has been CUT OFF.'
                : `You have ${3 - lateStrikes} strike(s) left before your monthly bonus is forfeited.`
            } Contact your Karaikal Hub Manager for clearance.`,
          });
        }

        // Outside operating hours
        return send(res, 403, {
          ok: false,
          code: 'OUTSIDE_OPERATING_HOURS',
          error: checkinEval.error,
          istTimeString: checkinEval.istTimeString,
          schedule: checkinEval.schedule,
        });
      }

      // If logging in on-time, clear any temporary override flag
      if (pData.adminShiftOverride) {
        await partnerDoc.ref.update({ adminShiftOverride: false });
      }

      // If logging in with 1-time emergency pass, mark session active
      if (checkinEval.isOneTimePass) {
        await partnerDoc.ref.update({
          oneTimePassGranted: true,
          oneTimePassConsumed: false,
          oneTimeSessionActive: true,
          oneTimeLoginAt: new Date().toISOString(),
        });
      }

      return send(res, 200, {
        ok: true,
        rider: {
          username: pData.username || cleanUser,
          name: pData.name || 'Delivery Partner',
          phone: pData.phone || '',
          serviceMode: pData.serviceMode || 'Standard',
          lateStrikes: pData.lateStrikes || 0,
          bonusCutoff: Boolean(pData.bonusCutoff),
          shiftStart: checkinEval.istTimeString,
          shiftEndMinutes: checkinEval.activeWindow?.endMinutes || (20 * 60 + 30),
          shiftStartMinutes: checkinEval.activeWindow?.startMinutes || (8 * 60 + 30),
          shiftLabel: checkinEval.activeWindow?.label || 'Standard Shift',
        },
      });
    }

    // -------------------------------------------------------------
    // 2. RIDER REQUEST RESET: If forgotten credentials
    // -------------------------------------------------------------
    if (action === 'request-reset' && req.method === 'POST') {
      const { username } = parseBody();
      const cleanUser = String(username || '').trim().toUpperCase();

      if (!cleanUser) {
        return send(res, 400, { error: 'Please enter your unique Alphanumeric Code' });
      }

      const partnerDoc = await partnersCol.doc(cleanUser).get();
      if (!partnerDoc.exists) {
        return send(res, 404, { error: `No delivery partner found with code "${cleanUser}"` });
      }

      const pData = partnerDoc.data();
      const now = Date.now();

      // Check if there is already an active pending request in last 5 mins
      const recentSnap = await resetsCol
        .where('username', '==', cleanUser)
        .where('used', '==', false)
        .get();

      let targetDocId;
      if (!recentSnap.empty) {
        targetDocId = recentSnap.docs[0].id;
        await resetsCol.doc(targetDocId).update({
          requestedAt: now,
          status: 'pending',
          otp: null,
          otpExpiresAt: null,
        });
      } else {
        const newDoc = await resetsCol.add({
          username: cleanUser,
          riderName: pData.name || 'Delivery Partner',
          phone: pData.phone || '',
          status: 'pending',
          requestedAt: now,
          otp: null,
          otpExpiresAt: null,
          used: false,
        });
        targetDocId = newDoc.id;
      }

      // Mask phone for privacy in UI: +91 98*** **210
      const maskedPhone = pData.phone ? pData.phone.replace(/(\+\d{2})(\d{2})\d+(\d{3})/, '$1 $2*** ***$3') : 'Registered Mobile';

      return send(res, 200, {
        ok: true,
        requestId: targetDocId,
        username: cleanUser,
        riderName: pData.name,
        maskedPhone,
        message: 'Password reset request submitted to Admin! Admin will verify and generate your 6-digit OTP.',
      });
    }

    // -------------------------------------------------------------
    // 3. ADMIN LIST RESET REQUESTS
    // -------------------------------------------------------------
    if (action === 'admin-list-resets' && req.method === 'GET') {
      const snap = await resetsCol.limit(50).get();
      // Only return active pending / OTP sent requests so completed ones disappear
      const requests = [];
      for (const d of snap.docs) {
        const data = d.data();
        if (data.status === 'completed' || data.status === 'verified') {
          // Clean up completed requests from database automatically
          await d.ref.delete().catch(() => {});
        } else {
          requests.push({ id: d.id, ...data });
        }
      }
      requests.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
      return send(res, 200, { ok: true, requests });
    }

    // -------------------------------------------------------------
    // 3B. ADMIN DELETE RESET REQUEST (DISMISS)
    // -------------------------------------------------------------
    if (action === 'admin-delete-reset' && req.method === 'POST') {
      const { requestId } = parseBody();
      if (!requestId) return send(res, 400, { error: 'Missing requestId' });
      await resetsCol.doc(String(requestId)).delete().catch(() => {});
      return send(res, 200, { ok: true, deleted: requestId });
    }

    // -------------------------------------------------------------
    // 4. ADMIN GENERATE 6-DIGIT OTP
    // -------------------------------------------------------------
    if (action === 'admin-generate-otp' && req.method === 'POST') {
      const { requestId } = parseBody();
      if (!requestId) {
        return send(res, 400, { error: 'Missing requestId' });
      }

      const reqDoc = await resetsCol.doc(requestId).get();
      if (!reqDoc.exists) {
        return send(res, 404, { error: 'Reset request not found' });
      }

      const data = reqDoc.data();
      // Generate automated unique 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const now = Date.now();
      const expiresAt = now + 15 * 60 * 1000; // 15 mins validity

      await resetsCol.doc(requestId).update({
        otp,
        otpExpiresAt: expiresAt,
        status: 'otp_generated',
        generatedAt: now,
        used: false,
      });

      // Prepare standard SMS / WhatsApp message text
      const smsMessage = `Your MotoDC Partner security code is: ${otp}. Valid for 15 minutes. Use this one-time OTP to change your 6-digit PIN.`;

      return send(res, 200, {
        ok: true,
        requestId,
        otp,
        phone: data.phone,
        riderName: data.riderName,
        username: data.username,
        expiresAt,
        smsMessage,
      });
    }

    // -------------------------------------------------------------
    // 5. RIDER VERIFY 6-DIGIT OTP (ONE-TIME USE ONLY)
    // -------------------------------------------------------------
    if (action === 'verify-otp' && req.method === 'POST') {
      const { username, otp } = parseBody();
      const cleanUser = String(username || '').trim().toUpperCase();
      const cleanOtp = String(otp || '').trim();

      if (!cleanUser || !cleanOtp) {
        return send(res, 400, { error: 'Username and 6-digit OTP are required' });
      }

      const snap = await resetsCol
        .where('username', '==', cleanUser)
        .where('status', '==', 'otp_generated')
        .where('used', '==', false)
        .get();

      if (snap.empty) {
        return send(res, 400, { error: 'No active OTP found. Please ask Admin to generate your OTP.' });
      }

      const resetDoc = snap.docs[0];
      const rData = resetDoc.data();

      // Check Expiration (15 minutes)
      if (Date.now() > (rData.otpExpiresAt || 0)) {
        return send(res, 400, { error: 'OTP has expired (15 min limit). Ask Admin to generate a fresh OTP.' });
      }

      // Check Match
      if (String(rData.otp).trim() !== cleanOtp) {
        return send(res, 400, { error: 'Incorrect 6-digit OTP. Please double-check the OTP received.' });
      }

      // IMPORTANT: Invalidate OTP immediately so it is ONE-TIME USE ONLY
      const resetToken = crypto.randomBytes(24).toString('hex');
      await resetsCol.doc(resetDoc.id).update({
        used: true,
        status: 'verified',
        verifiedAt: Date.now(),
        resetToken,
        tokenExpiresAt: Date.now() + 10 * 60 * 1000, // 10 mins to change password
      });

      return send(res, 200, {
        ok: true,
        resetToken,
        username: cleanUser,
        message: 'OTP verified successfully! Please create your new 6-digit PIN.',
      });
    }

    // -------------------------------------------------------------
    // 6. RIDER CHANGE PASSWORD: Enter new unique 6-digit PIN
    // -------------------------------------------------------------
    if (action === 'change-pin' && req.method === 'POST') {
      const { username, resetToken, newPin } = parseBody();
      const cleanUser = String(username || '').trim().toUpperCase();
      const cleanPin = String(newPin || '').trim();

      if (!cleanUser || !resetToken || !cleanPin) {
        return send(res, 400, { error: 'Missing username, reset token, or new PIN' });
      }

      if (!/^\d{6}$/.test(cleanPin)) {
        return send(res, 400, { error: 'Password must be exactly a 6-digit numerical PIN' });
      }

      // Verify token
      const snap = await resetsCol
        .where('username', '==', cleanUser)
        .where('resetToken', '==', resetToken)
        .where('status', '==', 'verified')
        .get();

      if (snap.empty) {
        return send(res, 403, { error: 'Invalid or expired password reset session. Please request OTP again.' });
      }

      const reqDoc = snap.docs[0];
      const rData = reqDoc.data();

      if (Date.now() > (rData.tokenExpiresAt || 0)) {
        return send(res, 403, { error: 'Reset session expired. Please request a new OTP.' });
      }

      // Read current PIN to ensure uniqueness ("must be unique and different from each other")
      const partnerDoc = await partnersCol.doc(cleanUser).get();
      if (partnerDoc.exists) {
        const currentData = partnerDoc.data();
        if (String(currentData.pin) === cleanPin) {
          return send(res, 400, { error: 'New PIN must be different from your previous PIN.' });
        }
      }

      // Save new 6-digit PIN
      await partnersCol.doc(cleanUser).set(
        {
          pin: cleanPin,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      // Delete the reset request once verified and changed
      await resetsCol.doc(reqDoc.id).delete().catch(() => {});

      return send(res, 200, {
        ok: true,
        message: '6-digit PIN changed successfully! Please log in with your new credentials.',
      });
    }

    // -------------------------------------------------------------
    // 7. ADMIN LIST ALL DELIVERY PARTNERS
    // -------------------------------------------------------------
    if (action === 'admin-list-partners' && req.method === 'GET') {
      const snap = await partnersCol.get();
      const partners = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return send(res, 200, { ok: true, partners });
    }

    // -------------------------------------------------------------
    // 8. ADMIN CREATE OR UPDATE DELIVERY PARTNER
    // -------------------------------------------------------------
    if (action === 'admin-save-partner' && req.method === 'POST') {
      const { username, name, phone, pin, active, serviceMode } = parseBody();
      let cleanUser = String(username || '').trim().toUpperCase();

      // If no code provided, auto-generate MDC- followed by a random 4-digit number
      if (!cleanUser) {
        for (let i = 0; i < 50; i++) {
          const candidate = `MDC-${Math.floor(1000 + Math.random() * 9000)}`;
          const checkDoc = await partnersCol.doc(candidate).get();
          if (!checkDoc.exists) {
            cleanUser = candidate;
            break;
          }
        }
        if (!cleanUser) {
          cleanUser = `MDC-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }

      if (!/^[A-Z0-9_-]{3,16}$/.test(cleanUser)) {
        return send(res, 400, { error: 'Username must be an alphanumeric code (e.g. MDC-4829)' });
      }

      const cleanPin = String(pin || '').trim();
      if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
        return send(res, 400, { error: 'PIN must be exactly 6 digits' });
      }

      const payload = {
        username: cleanUser,
        name: String(name || 'Delivery Partner').trim(),
        phone: String(phone || '').trim(),
        active: active !== false,
        updatedAt: Date.now(),
      };

      if (serviceMode) {
        payload.serviceMode = String(serviceMode).trim();
      }

      if (cleanPin) {
        payload.pin = cleanPin;
      }

      await partnersCol.doc(cleanUser).set(payload, { merge: true });
      return send(res, 200, { ok: true, partner: payload });
    }

    // -------------------------------------------------------------
    // 9. ADMIN DELETE DELIVERY PARTNER
    // -------------------------------------------------------------
    if (action === 'admin-delete-partner' && req.method === 'POST') {
      const { username } = parseBody();
      const cleanUser = String(username || '').trim().toUpperCase();

      if (!cleanUser) {
        return send(res, 400, { error: 'Missing username to delete' });
      }

      // Delete from deliveryPartners
      await partnersCol.doc(cleanUser).delete();

      // Clean up any pending reset requests for this rider
      const resetSnaps = await resetsCol.where('username', '==', cleanUser).get();
      const batchDeletes = resetSnaps.docs.map((d) => d.ref.delete());
      await Promise.all(batchDeletes);

      return send(res, 200, { ok: true, deleted: cleanUser });
    }

    // -------------------------------------------------------------
    // 2B. RIDER LOGOUT & REVOKE 1-TIME PASS
    // -------------------------------------------------------------
    if (action === 'logout' && req.method === 'POST') {
      const { riderId, username } = parseBody();
      const targetUser = String(username || riderId || '').trim().toUpperCase();
      if (!targetUser) return send(res, 400, { error: 'Missing username or riderId' });

      const snap = await partnersCol.where('username', '==', targetUser).limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update({
          oneTimePassGranted: false,
          oneTimePassConsumed: true,
          oneTimeSessionActive: false,
          lastLogoutAt: new Date().toISOString(),
        });
      } else {
        const docRef = partnersCol.doc(targetUser);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          await docRef.update({
            oneTimePassGranted: false,
            oneTimePassConsumed: true,
            oneTimeSessionActive: false,
            lastLogoutAt: new Date().toISOString(),
          });
        }
      }
      return send(res, 200, { ok: true, message: 'Logged out successfully. One-time pass consumed.' });
    }

    // -------------------------------------------------------------
    // 2C. RIDER RAISE EMERGENCY LOGIN REQUEST
    // -------------------------------------------------------------
    if (action === 'request-emergency-login' && req.method === 'POST') {
      const { username, reason } = parseBody();
      const targetUser = String(username || '').trim().toUpperCase();
      if (!targetUser) return send(res, 400, { error: 'Missing username' });

      let partnerDoc = null;
      const snap = await partnersCol.where('username', '==', targetUser).limit(1).get();
      if (!snap.empty) {
        partnerDoc = snap.docs[0];
      } else {
        const docRef = partnersCol.doc(targetUser);
        const docSnap = await docRef.get();
        if (docSnap.exists) partnerDoc = docSnap;
      }

      if (!partnerDoc) return send(res, 404, { error: 'Rider account not found' });

      const pData = partnerDoc.data();
      if (pData.oneTimePassGranted && !pData.oneTimePassConsumed) {
        return send(res, 200, { ok: true, status: 'approved', message: '1-Time login pass is already approved!' });
      }

      const now = new Date();
      const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
      const istDate = new Date(utcMillis + 330 * 60000);
      const istTime = istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      const requestPayload = {
        requestedAt: new Date().toISOString(),
        requestTimeIST: istTime,
        reason: reason || 'Late check-in emergency access request',
        status: 'pending',
      };

      await partnerDoc.ref.update({
        emergencyLoginRequest: requestPayload,
        emergencyLoginPending: true,
      });

      return send(res, 200, {
        ok: true,
        status: 'pending',
        message: 'Emergency login request submitted to Hub Manager.',
        request: requestPayload,
      });
    }

    // -------------------------------------------------------------
    // 2D. CHECK EMERGENCY LOGIN APPROVAL STATUS
    // -------------------------------------------------------------
    if (action === 'check-emergency-login-status' && (req.method === 'POST' || req.method === 'GET')) {
      const b = parseBody();
      const targetUser = String(b.username || req.query.username || '').trim().toUpperCase();
      if (!targetUser) return send(res, 400, { error: 'Missing username' });

      let partnerDoc = null;
      const snap = await partnersCol.where('username', '==', targetUser).limit(1).get();
      if (!snap.empty) {
        partnerDoc = snap.docs[0];
      } else {
        const docRef = partnersCol.doc(targetUser);
        const docSnap = await docRef.get();
        if (docSnap.exists) partnerDoc = docSnap;
      }

      if (!partnerDoc) return send(res, 404, { error: 'Rider account not found' });

      const pData = partnerDoc.data();
      const isApproved = Boolean(pData.oneTimePassGranted && !pData.oneTimePassConsumed);
      const status = isApproved ? 'approved' : pData.emergencyLoginRequest?.status || 'none';

      return send(res, 200, {
        ok: true,
        status,
        oneTimePassGranted: isApproved,
        emergencyLoginRequest: pData.emergencyLoginRequest || null,
      });
    }

    // -------------------------------------------------------------
    // 2E. ADMIN PROCESS EMERGENCY LOGIN REQUEST (Approve / Reject)
    // -------------------------------------------------------------
    if (action === 'admin-process-emergency-login' && req.method === 'POST') {
      const { riderId, decision } = parseBody();
      const targetUser = String(riderId || '').trim().toUpperCase();
      if (!targetUser) return send(res, 400, { error: 'Missing riderId' });

      let partnerDoc = null;
      const snap = await partnersCol.where('username', '==', targetUser).limit(1).get();
      if (!snap.empty) {
        partnerDoc = snap.docs[0];
      } else {
        const docRef = partnersCol.doc(targetUser);
        const docSnap = await docRef.get();
        if (docSnap.exists) partnerDoc = docSnap;
      }

      if (!partnerDoc) return send(res, 404, { error: 'Partner not found' });

      const isApproved = decision === 'approve';
      await partnerDoc.ref.update({
        oneTimePassGranted: isApproved,
        oneTimePassConsumed: false,
        emergencyLoginPending: false,
        'emergencyLoginRequest.status': isApproved ? 'approved' : 'rejected',
        'emergencyLoginRequest.processedAt': new Date().toISOString(),
        'emergencyLoginRequest.processedBy': 'Karaikal Hub Admin',
      });

      return send(res, 200, {
        ok: true,
        decision: isApproved ? 'approved' : 'rejected',
        message: isApproved
          ? `Granted 1-Time Login Pass to ${partnerDoc.data().name || targetUser}`
          : `Rejected emergency login request for ${partnerDoc.data().name || targetUser}`,
      });
    }

    // -------------------------------------------------------------
    // 2F. ADMIN TOGGLE ONE-TIME PASS FOR ANY PARTNER
    // -------------------------------------------------------------
    if (action === 'admin-toggle-onetime-pass' && req.method === 'POST') {
      const { riderId, grant } = parseBody();
      const targetUser = String(riderId || '').trim().toUpperCase();
      if (!targetUser) return send(res, 400, { error: 'Missing riderId' });

      let partnerDoc = null;
      const snap = await partnersCol.where('username', '==', targetUser).limit(1).get();
      if (!snap.empty) {
        partnerDoc = snap.docs[0];
      } else {
        const docRef = partnersCol.doc(targetUser);
        const docSnap = await docRef.get();
        if (docSnap.exists) partnerDoc = docSnap;
      }

      if (!partnerDoc) return send(res, 404, { error: 'Partner not found' });

      const shouldGrant = grant !== false;
      await partnerDoc.ref.update({
        oneTimePassGranted: shouldGrant,
        oneTimePassConsumed: false,
        emergencyLoginPending: false,
        oneTimePassGrantedAt: new Date().toISOString(),
      });

      return send(res, 200, {
        ok: true,
        oneTimePassGranted: shouldGrant,
        message: shouldGrant
          ? `Granted 1-Time Emergency Pass to ${partnerDoc.data().name || targetUser}`
          : `Revoked 1-Time Pass for ${partnerDoc.data().name || targetUser}`,
      });
    }

    // -------------------------------------------------------------
    // 9B. ADMIN RESET STRIKES & UNLOCK LATE SHIFT CHECK-IN
    // -------------------------------------------------------------
    if (action === 'admin-reset-strikes' && req.method === 'POST') {
      const { username } = parseBody();
      const cleanUser = String(username || '').trim().toUpperCase();

      if (!cleanUser) {
        return send(res, 400, { error: 'Missing username' });
      }

      await partnersCol.doc(cleanUser).set(
        {
          lateStrikes: 0,
          bonusCutoff: false,
          adminShiftOverride: true,
          unlockedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return send(res, 200, {
        ok: true,
        message: `Punctuality strikes reset & shift check-in unlocked for ${cleanUser}!`,
      });
    }

    // -------------------------------------------------------------
    // 10. RIDER SUBMIT KYC DOCUMENTS & REGISTRATION
    // -------------------------------------------------------------
    if (action === 'submit-kyc' && req.method === 'POST') {
      const { name, phone, email, serviceMode, vehicleType, vehicleNumber, licenseNumber, dlPhoto, rcPhoto } = parseBody();

      const cleanName = String(name || '').trim();
      const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
      const cleanEmail = String(email || '').trim().toLowerCase();

      if (!cleanName) {
        return send(res, 400, { error: 'Please enter your full name as on government ID' });
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        return send(res, 400, { error: 'Please enter a valid 10-digit mobile number' });
      }

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return send(res, 400, { error: 'Please enter a valid email address for notifications' });
      }

      if (!dlPhoto && !licenseNumber) {
        return send(res, 400, { error: 'Driving license number or proof photo is required' });
      }

      // Check if already registered or applied with this phone/email
      const existingPhoneSnap = await kycCol.where('phone', '==', cleanPhone).get();
      if (!existingPhoneSnap.empty) {
        const prev = existingPhoneSnap.docs[0].data();
        if (prev.status === 'approved') {
          return send(res, 200, {
            ok: true,
            status: 'approved',
            partnerCode: prev.partnerCode || 'Approved',
            message: 'Your KYC has already been approved! You can install the partner app now.',
          });
        }
        if (prev.status === 'pending') {
          return send(res, 200, {
            ok: true,
            status: 'pending',
            applicationId: existingPhoneSnap.docs[0].id,
            message: 'Your KYC application is already under review by Fleet Admin.',
          });
        }
      }

      // Generate unique Application ID (e.g. KYC-7294)
      const appId = `KYC-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = Date.now();

      const kycRecord = {
        applicationId: appId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        serviceMode: String(serviceMode || 'Standard').trim(),
        vehicleType: String(vehicleType || 'Motorcycle').trim(),
        vehicleNumber: String(vehicleNumber || '').trim().toUpperCase(),
        licenseNumber: String(licenseNumber || '').trim().toUpperCase(),
        dlPhoto: dlPhoto || null,
        rcPhoto: rcPhoto || null,
        status: 'pending', // 'pending' | 'approved' | 'rejected'
        submittedAt: now,
        updatedAt: now,
      };

      await kycCol.doc(appId).set(kycRecord);

      // Phase 2: Run Gemini 1.5 Flash Vision AI pre-check on documents
      try {
        const aiCheck = await verifyKycWithGemini({
          name: cleanName,
          licenseNumber,
          vehicleNumber,
          vehicleType,
          dlPhoto,
          rcPhoto,
        });
        if (aiCheck) {
          await kycCol.doc(appId).update({ aiCheck, updatedAt: Date.now() });
        }
      } catch (aiErr) {
        console.warn('AI KYC pre-check error:', aiErr);
      }

      // Trigger MSG91 Email to applicant if configured
      try {
        const authKey = process.env.MSG91_AUTHKEY;
        const domain = process.env.MSG91_EMAIL_DOMAIN;
        const templateId = process.env.MSG91_TEMPLATE_KYC_RECEIVED || 'motodc_rider_kyc_received';
        const fromEmail = String(process.env.MSG91_FROM_EMAIL || `no-reply@${domain || 'motodc.in'}`).trim();

        if (authKey && domain && templateId) {
          const emailRes = await fetch('https://control.msg91.com/api/v5/email/send', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              authkey: authKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              recipients: [
                {
                  to: [{ name: cleanName, email: cleanEmail }],
                  variables: {
                    rider_name: cleanName,
                    application_id: appId,
                    status_url: 'https://motodc-official.vercel.app/partner',
                    VAR1: cleanName,
                    VAR2: appId,
                    VAR3: cleanName,
                    VAR4: appId,
                    VAR5: 'https://motodc-official.vercel.app/partner',
                    var1: cleanName,
                    var2: appId,
                    var3: cleanName,
                    var4: appId,
                    var5: 'https://motodc-official.vercel.app/partner',
                  },
                },
              ],
              from: { name: process.env.MSG91_FROM_NAME || 'MOTO DC FLEET', email: fromEmail },
              domain,
              template_id: templateId,
              validate_before_send: true,
            }),
          });
          const emailData = await emailRes.json().catch(() => ({}));
          console.log('MSG91 KYC email dispatch result:', emailRes.status, emailData);
        }
      } catch (emailErr) {
        console.warn('KYC confirmation email warning:', emailErr);
      }

      return send(res, 200, {
        ok: true,
        status: 'pending',
        applicationId: appId,
        message: 'Your KYC documents have been received and you can download the partner app after verification. Thank you for joining as a MotoDC delivery partner!',
      });
    }

    // -------------------------------------------------------------
    // 11. RIDER CHECK KYC STATUS: By Mobile or Email
    // -------------------------------------------------------------
    if (action === 'check-kyc-status' && (req.method === 'POST' || req.method === 'GET')) {
      const queryVal = String(req.query.q || parseBody().query || '').trim();
      if (!queryVal) {
        return send(res, 400, { error: 'Please provide mobile number or email to check KYC status' });
      }

      const cleanPhone = queryVal.replace(/[^0-9]/g, '');
      const cleanEmail = queryVal.toLowerCase();

      // 1. Check in deliveryPartners roster first
      let partnerDoc = null;
      if (cleanPhone && cleanPhone.length >= 10) {
        const snap = await partnersCol.where('phone', '==', cleanPhone).get();
        if (!snap.empty) partnerDoc = snap.docs[0];
      }
      if (!partnerDoc && queryVal.toUpperCase().startsWith('MDC-')) {
        const snap = await partnersCol.doc(queryVal.toUpperCase()).get();
        if (snap.exists) partnerDoc = snap;
      }

      if (partnerDoc && partnerDoc.exists) {
        const pData = partnerDoc.data();
        if (pData.active !== false) {
          return send(res, 200, {
            ok: true,
            status: 'approved',
            name: pData.name,
            phone: pData.phone,
            partnerCode: pData.username || partnerDoc.id,
            verified: true,
            canInstall: true,
          });
        }
      }

      // 2. Check in deliveryPartnerKYC applications
      let kycDoc = null;
      if (cleanPhone && cleanPhone.length >= 10) {
        const snap = await kycCol.where('phone', '==', cleanPhone).get();
        if (!snap.empty) kycDoc = snap.docs[0];
      }
      if (!kycDoc && cleanEmail.includes('@')) {
        const snap = await kycCol.where('email', '==', cleanEmail).get();
        if (!snap.empty) kycDoc = snap.docs[0];
      }
      if (!kycDoc && queryVal.toUpperCase().startsWith('KYC-')) {
        const snap = await kycCol.doc(queryVal.toUpperCase()).get();
        if (snap.exists) kycDoc = snap;
      }

      if (kycDoc && kycDoc.exists) {
        const kData = kycDoc.data();
        return send(res, 200, {
          ok: true,
          status: kData.status, // 'approved' | 'pending' | 'rejected'
          name: kData.name,
          applicationId: kycDoc.id,
          partnerCode: kData.partnerCode || null,
          rejectionReason: kData.rejectionReason || null,
          verified: kData.status === 'approved',
          canInstall: kData.status === 'approved',
        });
      }

      return send(res, 200, {
        ok: true,
        status: 'not_found',
        canInstall: false,
        message: 'No KYC registration found. Please submit your documents to join.',
      });
    }

    // -------------------------------------------------------------
    // 12. ADMIN LIST ALL KYC APPLICATIONS
    // -------------------------------------------------------------
    if (action === 'admin-list-kyc' && req.method === 'GET') {
      const snap = await kycCol.get();
      const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort newest first
      applications.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      return send(res, 200, { ok: true, applications });
    }

    // -------------------------------------------------------------
    // 13. ADMIN APPROVE KYC & ONBOARD RIDER
    // -------------------------------------------------------------
    if (action === 'admin-approve-kyc' && req.method === 'POST') {
      const { applicationId, customPin, customUsername } = parseBody();
      if (!applicationId) {
        return send(res, 400, { error: 'Missing applicationId' });
      }

      const kycDoc = await kycCol.doc(applicationId).get();
      if (!kycDoc.exists) {
        return send(res, 404, { error: 'KYC application not found' });
      }

      const kData = kycDoc.data();
      let cleanUser = String(customUsername || '').trim().toUpperCase();

      if (!cleanUser) {
        // Auto-generate MDC-XXXX
        for (let i = 0; i < 50; i++) {
          const candidate = `MDC-${Math.floor(1000 + Math.random() * 9000)}`;
          const checkDoc = await partnersCol.doc(candidate).get();
          if (!checkDoc.exists) {
            cleanUser = candidate;
            break;
          }
        }
        if (!cleanUser) {
          cleanUser = `MDC-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }

      const cleanPin = String(customPin || '123456').trim();

      // 1. Create in deliveryPartners
      await partnersCol.doc(cleanUser).set({
        username: cleanUser,
        name: kData.name,
        phone: kData.phone,
        email: kData.email || '',
        pin: cleanPin,
        serviceMode: kData.serviceMode || 'Standard',
        vehicleNumber: kData.vehicleNumber || '',
        vehicleType: kData.vehicleType || 'Motorcycle',
        licenseNumber: kData.licenseNumber || '',
        active: true,
        kycVerified: true,
        kycApplicationId: applicationId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // 2. Mark KYC application approved
      await kycCol.doc(applicationId).update({
        status: 'approved',
        partnerCode: cleanUser,
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return send(res, 200, {
        ok: true,
        approved: true,
        partnerCode: cleanUser,
        riderName: kData.name,
        phone: kData.phone,
        pin: cleanPin,
      });
    }

    // -------------------------------------------------------------
    // 14. ADMIN REJECT KYC APPLICATION
    // -------------------------------------------------------------
    if (action === 'admin-reject-kyc' && req.method === 'POST') {
      const { applicationId, reason } = parseBody();
      if (!applicationId) {
        return send(res, 400, { error: 'Missing applicationId' });
      }

      const cleanReason = String(reason || 'Documents could not be verified').trim();

      await kycCol.doc(applicationId).update({
        status: 'rejected',
        rejectionReason: cleanReason,
        rejectedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return send(res, 200, { ok: true, rejected: true, applicationId, reason: cleanReason });
    }

    // -------------------------------------------------------------
    // 15. ADMIN DELETE KYC APPLICATION
    // -------------------------------------------------------------
    if (action === 'admin-delete-kyc' && req.method === 'POST') {
      const { applicationId } = parseBody();
      if (!applicationId) {
        return send(res, 400, { error: 'Missing applicationId' });
      }

      await kycCol.doc(applicationId).delete();
      return send(res, 200, { ok: true, deleted: applicationId });
    }

    // -------------------------------------------------------------
    // 16. ADMIN RUN/RE-RUN GEMINI AI PRE-CHECK (PHASE 2)
    // -------------------------------------------------------------
    if (action === 'admin-run-ai-check' && req.method === 'POST') {
      const { applicationId } = parseBody();
      if (!applicationId) {
        return send(res, 400, { error: 'Missing applicationId' });
      }

      const docSnap = await kycCol.doc(applicationId).get();
      if (!docSnap.exists) {
        return send(res, 404, { error: 'KYC application not found' });
      }

      const appData = docSnap.data();
      const aiCheck = await verifyKycWithGemini({
        name: appData.name,
        licenseNumber: appData.licenseNumber,
        vehicleNumber: appData.vehicleNumber,
        vehicleType: appData.vehicleType,
        dlPhoto: appData.dlPhoto,
        rcPhoto: appData.rcPhoto,
      });

      await kycCol.doc(applicationId).update({
        aiCheck,
        updatedAt: Date.now(),
      });

      return send(res, 200, {
        ok: true,
        applicationId,
        aiCheck,
      });
    }

    return send(res, 400, { error: `Unsupported action: "${action}"` });
  } catch (err) {
    console.error('delivery-auth API error:', err);
    return send(res, 500, { error: err.message || 'Internal server error' });
  }
}
