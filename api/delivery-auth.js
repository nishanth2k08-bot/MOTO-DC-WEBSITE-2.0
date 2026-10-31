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

      return send(res, 200, {
        ok: true,
        rider: {
          username: pData.username || cleanUser,
          name: pData.name || 'Delivery Partner',
          phone: pData.phone || '',
          shiftStart: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
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
      const { username, name, phone, pin, active } = parseBody();
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

    return send(res, 400, { error: `Unsupported action: "${action}"` });
  } catch (err) {
    console.error('delivery-auth API error:', err);
    return send(res, 500, { error: err.message || 'Internal server error' });
  }
}
