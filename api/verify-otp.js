import admin from 'firebase-admin';

function send(res, status, body) { return res.status(status).json(body); }

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
    const authkey = process.env.MSG91_AUTHKEY;
    if (!authkey) return send(res, 500, { error: 'MSG91_AUTHKEY is not configured in Vercel' });

    const otp = String(req.body?.otp || '').trim().replace(/\D/g, '');
    const reqId = String(req.body?.reqId || '').trim();
    const phone = normalizePhone(req.body?.phone);
    const identifier = phone.replace(/^\+/, '');
    const name = String(req.body?.name || '').trim();
    const widgetId = '36696a6b507a303132373731';
    const tokenAuth = '566450TDkg3WwhwL6a9f8bdfP1';

    if (!otp || otp.length < 4) return send(res, 400, { error: 'Please enter all 6 digits of the verification code' });

    let verified = false;
    let verifyError = '';

    // Verify OTP with MSG91
    let response = await fetch('https://api.msg91.com/api/v5/widget/verifyOtp', {
      method: 'POST',
      headers: {
        authkey,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        widgetId,
        tokenAuth,
        reqId,
        otp,
        identifier
      })
    });
    let text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }

    if (response.ok && data.type !== 'error' && data.status !== 'fail' && !data.hasError) {
      verified = true;
    } else {
      verifyError = data.message || data.error || 'Incorrect or expired verification code';
      // Fallback try control.msg91.com
      const fbResp = await fetch('https://control.msg91.com/api/v5/widget/verifyOtp', {
        method: 'POST',
        headers: {
          authkey,
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          widgetId,
          tokenAuth,
          reqId,
          otp,
          identifier
        })
      });
      const fbText = await fbResp.text();
      let fbData = {};
      try { fbData = fbText ? JSON.parse(fbText) : {}; } catch { fbData = { message: fbText }; }
      if (fbResp.ok && fbData.type !== 'error' && fbData.status !== 'fail') {
        verified = true;
      } else {
        verifyError = fbData.message || verifyError;
      }
    }

    if (!verified) {
      return send(res, 400, { error: verifyError || 'Incorrect or expired verification code' });
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
  } catch (e) {
    console.error('verify-otp error:', e);
    const message = String(e?.message || '');
    if (message.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || message.includes('private key')) {
      return send(res, 500, { error: 'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.' });
    }
    return send(res, 500, { error: 'Could not complete verification. Please try again.' });
  }
}
