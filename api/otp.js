import admin from 'firebase-admin';

function send(res, status, body) {
  return res.status(status).json(body);
}

function getAdmin() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
    if (typeof serviceAccount === 'string') serviceAccount = JSON.parse(serviceAccount);
  } catch (e) {
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

function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  return '+' + digits;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const action = String(req.body?.action || 'send').toLowerCase();
    const widgetId = '36696a6b507a303132373731';
    const tokenAuth = '566450TDkg3WwhwL6a9f8bdfP1';

    let rawPhone = String(req.body?.phone || '').trim().replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    else if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = '91' + rawPhone.slice(1);

    const headers = {
      'Content-Type': 'application/json',
      'Origin': 'https://motodc.in',
      'Referer': 'https://motodc.in/'
    };

    // ─── ACTION: SEND OTP ──────────────────────────────────────────────
    if (action === 'send') {
      if (rawPhone.length < 10 || rawPhone.length > 15) {
        return send(res, 400, { error: 'Please enter a valid 10-digit mobile number' });
      }

      const response = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          widgetId,
          tokenAuth,
          identifier: rawPhone
        })
      });

      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }

      if (!response.ok || data.type === 'error' || data.status === 'fail' || data.hasError) {
        const errMsg = data.message || data.error || 'Could not send verification code';
        return send(res, 400, { error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) });
      }

      const reqId = data.message || data.reqId || data.data?.reqId;
      return send(res, 200, { ok: true, reqId: String(reqId || ''), message: 'OTP sent successfully' });
    }

    // ─── ACTION: RETRY OTP ─────────────────────────────────────────────
    if (action === 'retry') {
      const reqId = String(req.body?.reqId || '').trim();
      const response = await fetch('https://control.msg91.com/api/v5/widget/retryOtp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          widgetId,
          tokenAuth,
          reqId,
          retryChannel: 11
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.type === 'error' || data.status === 'fail') {
        // Fallback to fresh sendOtp
        const freshResp = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers,
          body: JSON.stringify({ widgetId, tokenAuth, identifier: rawPhone })
        });
        const freshData = await freshResp.json().catch(() => ({}));
        const newReqId = freshData.message || freshData.reqId;
        return send(res, 200, { ok: true, reqId: String(newReqId || ''), message: 'New code sent' });
      }
      return send(res, 200, { ok: true, message: 'Verification code resent' });
    }

    // ─── ACTION: VERIFY OTP ────────────────────────────────────────────
    if (action === 'verify') {
      const otp = String(req.body?.otp || '').trim().replace(/\D/g, '');
      const reqId = String(req.body?.reqId || '').trim();
      const phone = normalizePhone(req.body?.phone);
      const name = String(req.body?.name || '').trim();

      if (!otp || otp.length < 4) {
        return send(res, 400, { error: 'Please enter all 6 digits of the verification code' });
      }

      const response = await fetch('https://control.msg91.com/api/v5/widget/verifyOtp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          widgetId,
          tokenAuth,
          reqId,
          otp,
          identifier: rawPhone
        })
      });

      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }

      const isVerified = (response.ok && data.type !== 'error' && data.status !== 'fail' && !data.hasError);
      if (!isVerified) {
        const errMsg = data.message || data.error || 'Incorrect or expired verification code';
        return send(res, 400, { error: typeof errMsg === 'string' ? errMsg : 'Incorrect or expired verification code' });
      }

      // OTP verified successfully! Connect to Firebase
      const a = getAdmin();
      let user;
      let isNewUser = false;
      try {
        user = await a.auth().getUserByPhoneNumber(phone);
      } catch (e) {
        if (e?.code !== 'auth/user-not-found') throw e;
        isNewUser = true;
      }

      if (isNewUser && !name) {
        user = await a.auth().createUser({ phoneNumber: phone });
        const customToken = await a.auth().createCustomToken(user.uid, { phone_verified: true });
        return send(res, 200, { ok: false, needsName: true, customToken, uid: user.uid, phone });
      }

      if (isNewUser) {
        user = await a.auth().createUser({ phoneNumber: phone, displayName: name });
      } else if (name && user.displayName !== name) {
        user = await a.auth().updateUser(user.uid, { displayName: name });
      }

      const customToken = await a.auth().createCustomToken(user.uid, { phone_verified: true });
      return send(res, 200, { ok: true, customToken, uid: user.uid, phone, name: user.displayName || name || '' });
    }

    return send(res, 400, { error: 'Invalid action' });
  } catch (e) {
    console.error('api/otp error:', e);
    return send(res, 500, { error: e.message || 'Server error processing OTP request' });
  }
}
