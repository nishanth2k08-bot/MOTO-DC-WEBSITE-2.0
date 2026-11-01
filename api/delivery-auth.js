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

    // -------------------------------------------------------------
    // 10. RIDER SUBMIT KYC DOCUMENTS & REGISTRATION
    // -------------------------------------------------------------
    if (action === 'submit-kyc' && req.method === 'POST') {
      const { name, phone, email, vehicleType, vehicleNumber, licenseNumber, dlPhoto, rcPhoto } = parseBody();

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

    return send(res, 400, { error: `Unsupported action: "${action}"` });
  } catch (err) {
    console.error('delivery-auth API error:', err);
    return send(res, 500, { error: err.message || 'Internal server error' });
  }
}
