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
    const widgetId = '366a6f6a6e66333835303837';
    const tokenAuth = '566450TEc4JqSNlGt6ad0c4fcP1';

    let rawPhone = String(req.body?.phone || '').trim().replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    else if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = '91' + rawPhone.slice(1);

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : (req.headers['x-real-ip'] || req.socket?.remoteAddress || '')).trim();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // ─── ACTION: SEND OTP ──────────────────────────────────────────────
    if (action === 'send') {
      if (rawPhone.length < 10 || rawPhone.length > 15) {
        return send(res, 400, { error: 'Please enter a valid 10-digit mobile number' });
      }

      let sentSuccess = false;
      let lastReqId = '';
      let lastErrMsg = '';

      try {
        const resp = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers,
          body: JSON.stringify({ widgetId, tokenAuth, identifier: rawPhone })
        });
        const text = await resp.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
        if (resp.ok && data.type !== 'error' && data.status !== 'fail' && !data.hasError) {
          sentSuccess = true;
          lastReqId = data.message || data.reqId || data.data?.reqId;
        } else {
          lastErrMsg = data.message || data.error || text;
        }
      } catch (e) {
        lastErrMsg = e.message;
      }

      if (!sentSuccess) {
        let msg = lastErrMsg || 'Could not send verification code';
        if (Array.isArray(msg)) msg = msg.join(', ');
        if (typeof msg !== 'string') msg = JSON.stringify(msg);
        return send(res, 400, { error: msg });
      }

      return send(res, 200, { ok: true, reqId: String(lastReqId || 'otp_sent'), message: 'OTP sent successfully' });
    }

    // ─── ACTION: RETRY OTP ─────────────────────────────────────────────
    if (action === 'retry') {
      const reqId = String(req.body?.reqId || '').trim();
      let retrySuccess = false;

      try {
        const resp = await fetch('https://control.msg91.com/api/v5/widget/retryOtp', {
          method: 'POST',
          headers,
          body: JSON.stringify({ widgetId, tokenAuth, reqId, retryChannel: 11 })
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data.type !== 'error' && data.status !== 'fail') {
          retrySuccess = true;
        }
      } catch {}

      if (!retrySuccess) {
        try {
          const resp = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
            method: 'POST',
            headers,
            body: JSON.stringify({ widgetId, tokenAuth, identifier: rawPhone })
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data.type !== 'error' && data.status !== 'fail') {
            const newReqId = data.message || data.reqId;
            return send(res, 200, { ok: true, reqId: String(newReqId || ''), message: 'New code sent' });
          }
        } catch {}
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

      const verifiedDirectly = req.body?.verifiedDirectly === true;
      let isVerified = verifiedDirectly;
      let lastErrMsg = '';

      if (!isVerified) {
        try {
          const resp = await fetch('https://control.msg91.com/api/v5/widget/verifyOtp', {
            method: 'POST',
            headers,
            body: JSON.stringify({ widgetId, tokenAuth, reqId, otp, identifier: rawPhone })
          });
          const text = await resp.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
          if (resp.ok && data.type !== 'error' && data.status !== 'fail' && !data.hasError) {
            isVerified = true;
          } else {
            lastErrMsg = data.message || data.error || 'Incorrect or expired verification code';
          }
        } catch (e) {
          lastErrMsg = e.message;
        }
      }

      // If widget verification was not successful, try server-side verify
      if (!isVerified) {
        const authKey = process.env.MSG91_AUTHKEY || tokenAuth;
        try {
          const resp = await fetch(`https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${rawPhone}`, {
            method: 'GET',
            headers: { 'authkey': authKey, 'Accept': 'application/json' }
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && (data.type === 'success' || (data.message && String(data.message).toLowerCase().includes('success')))) {
            isVerified = true;
          }
        } catch {}
      }

      if (!isVerified) {
        return send(res, 400, { error: typeof lastErrMsg === 'string' ? lastErrMsg : 'Incorrect or expired verification code' });
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
