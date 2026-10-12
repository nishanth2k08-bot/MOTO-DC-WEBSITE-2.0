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
    const authkey = process.env.MSG91_AUTHKEY;
    if (!authkey) return send(res, 500, { error: 'MSG91_AUTHKEY is not configured in Vercel' });

    const action = String(req.body?.action || 'send').toLowerCase();
    const widgetId = '36696a6b507a303132373731';
    const tokenAuth = '566450TDkg3WwhwL6a9f8bdfP1';

    let rawPhone = String(req.body?.phone || '').trim().replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    else if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = '91' + rawPhone.slice(1);

    // ─── ACTION: SEND OTP ──────────────────────────────────────────────
    if (action === 'send') {
      if (rawPhone.length < 10 || rawPhone.length > 15) {
        return send(res, 400, { error: 'Please enter a valid 10-digit mobile number' });
      }

      let response = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
        method: 'POST',
        headers: {
          authkey,
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          widgetId,
          tokenAuth,
          identifier: rawPhone
        })
      });

      let text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }

      if (!response.ok || data.type === 'error' || data.status === 'fail' || data.hasError) {
        // Fallback to control.msg91.com
        const fbResp = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers: {
            authkey,
            'content-type': 'application/json',
            accept: 'application/json'
          },
          body: JSON.stringify({
            widgetId,
            tokenAuth,
            identifier: rawPhone
          })
        });
        const fbText = await fbResp.text();
        let fbData = {};
        try { fbData = fbText ? JSON.parse(fbText) : {}; } catch { fbData = { message: fbText }; }
        if (fbResp.ok && fbData.type !== 'error' && fbData.status !== 'fail') {
          const reqId = fbData.message || fbData.reqId || fbData.data?.reqId;
          return send(res, 200, { ok: true, reqId: String(reqId || ''), message: 'OTP sent successfully' });
        }
        return send(res, 400, {
          error: data.message || data.error || fbData.message || 'Could not send verification code'
        });
      }

      const reqId = data.message || data.reqId || data.data?.reqId;
      return send(res, 200, { ok: true, reqId: String(reqId || ''), message: 'OTP sent successfully' });
    }

    // ─── ACTION: RETRY OTP ─────────────────────────────────────────────
    if (action === 'retry') {
      const reqId = String(req.body?.reqId || '').trim();
      let response = await fetch('https://api.msg91.com/api/v5/widget/retryOtp', {
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
          retryChannel: 11
        })
      });
      let data = await response.json().catch(() => ({}));
      if (!response.ok || data.type === 'error' || data.status === 'fail') {
        const freshResp = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers: { authkey, 'content-type': 'application/json' },
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
      const identifier = phone.replace(/^\+/, '');
      const name = String(req.body?.name || '').trim();

      if (!otp || otp.length < 4) {
        return send(res, 400, { error: 'Please enter all 6 digits of the verification code' });
      }

      let verified = false;
      let verifyError = '';

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

    return send(res, 400, { error: 'Unknown action' });
  } catch (e) {
    console.error('api/otp error:', e);
    const message = String(e?.message || '');
    if (message.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || message.includes('private key')) {
      return send(res, 500, { error: 'Firebase server credentials are invalid. Check FIREBASE_SERVICE_ACCOUNT_JSON in Vercel.' });
    }
    return send(res, 500, { error: e.message || 'OTP operation failed' });
  }
}
