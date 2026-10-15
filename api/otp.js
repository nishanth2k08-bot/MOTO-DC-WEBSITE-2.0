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
    let authKey = (process.env.MSG91_AUTHKEY || '').trim().replace(/^["']|["']$/g, '');
    if (!authKey || authKey.startsWith('566450')) {
      authKey = '581935AFRUsSRC8lRR6ad0efb4P1';
    }
    const widgetId = (process.env.MSG91_WIDGET_ID || process.env.WIDGET_ID || process.env.VITE_MSG91_WIDGET_ID || '366a6f6c5846393532323030').trim().replace(/^["']|["']$/g, '');
    const tokenAuth = (process.env.MSG91_TOKEN_AUTH || process.env.TOKEN_AUTH || process.env.MSG91_TOKEN || process.env.VITE_MSG91_TOKEN_AUTH || '581935TGJobIRJ68W6ad0cc84P1').trim().replace(/^["']|["']$/g, '');

    if (action === 'ping') {
      return send(res, 200, {
        ok: true,
        version: 'v_core_otp_unblocked',
        hasEnvWidget: Boolean(process.env.MSG91_WIDGET_ID),
        hasEnvToken: Boolean(process.env.MSG91_TOKEN_AUTH),
        hasEnvAuthKey: Boolean(process.env.MSG91_AUTHKEY),
        authKeyPrefix: authKey.slice(0, 8),
        widgetPrefix: widgetId.slice(0, 8),
        tokenPrefix: tokenAuth.slice(0, 8)
      });
    }

    let rawPhone = String(req.body?.phone || '').trim().replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    else if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = '91' + rawPhone.slice(1);

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : (req.headers['x-real-ip'] || req.socket?.remoteAddress || '')).trim();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(authKey ? { 'authkey': authKey } : {})
    };

    // ─── ACTION: SEND OTP ──────────────────────────────────────────────
    if (action === 'send') {
      if (rawPhone.length < 10 || rawPhone.length > 15) {
        return send(res, 400, { error: 'Please enter a valid 10-digit mobile number' });
      }

      let sentSuccess = false;
      let lastReqId = '';
      let lastErrMsg = '';

      // 1. Primary: MSG91 Core OTP API (Server-to-Server authenticated via master authkey)
      if (authKey) {
        try {
          const resp = await fetch(`https://api.msg91.com/api/v5/otp?mobile=${rawPhone}&otp_length=6`, {
            method: 'POST',
            headers: {
              'authkey': authKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          const text = await resp.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
          if (resp.ok && data.type !== 'error' && data.status !== 'fail') {
            lastReqId = data.request_id || data.reqId || data.message || 'otp_active';
            sentSuccess = true;
          } else {
            lastErrMsg = data.message || data.error || text;
          }
        } catch (e) {
          lastErrMsg = e.message;
        }
      }

      // 2. Secondary fallback: MSG91 Widget sendOtp API
      if (!sentSuccess) {
        try {
          const payload = { widgetId, identifier: rawPhone };
          if (!authKey) payload.tokenAuth = tokenAuth;

          const resp = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          const text = await resp.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
          if (resp.ok && data.type !== 'error' && data.status !== 'fail' && !data.hasError) {
            lastReqId = data.reqId || data.data?.reqId || data.message || '';
            if (lastReqId) sentSuccess = true;
            else lastErrMsg = 'MSG91 accepted the request but did not return a request ID. Check the MSG91 response and widget configuration.';
          } else {
            lastErrMsg = (data.message || data.error || (typeof text === 'string' ? text : JSON.stringify(text))) + (resp.status !== 200 ? ` (MSG91 HTTP ${resp.status})` : '');
          }
        } catch (e) {
          lastErrMsg = e.message;
        }
      }

      if (!sentSuccess) {
        let msg = lastErrMsg || 'Could not send verification code';
        if (Array.isArray(msg)) msg = msg.join(', ');
        if (typeof msg !== 'string') msg = JSON.stringify(msg);
        return send(res, 400, { error: msg });
      }

      return send(res, 200, { ok: true, reqId: String(lastReqId), message: 'OTP sent successfully' });
    }

    // ─── ACTION: RETRY OTP ─────────────────────────────────────────────
    if (action === 'retry') {
      const reqId = String(req.body?.reqId || '').trim();
      let retrySuccess = false;
      let newReqId = '';

      // 1. Primary: Core OTP retry API
      if (authKey) {
        try {
          const resp = await fetch(`https://api.msg91.com/api/v5/otp/retry?authkey=${authKey}&mobile=${rawPhone}&retrytype=text`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data.type === 'success') {
            retrySuccess = true;
            newReqId = reqId || 'otp_active';
          }
        } catch {}
      }

      // 2. Core OTP fresh send if retry was not supported
      if (!retrySuccess && authKey) {
        try {
          const resp = await fetch(`https://api.msg91.com/api/v5/otp?mobile=${rawPhone}&otp_length=6`, {
            method: 'POST',
            headers: { 'authkey': authKey, 'Content-Type': 'application/json' }
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data.type !== 'error' && data.status !== 'fail') {
            retrySuccess = true;
            newReqId = data.request_id || data.reqId || data.message || 'otp_active';
          }
        } catch {}
      }

      // 3. Fallback to widget retry
      if (!retrySuccess && reqId && reqId !== 'otp_active') {
        try {
          const payload = { widgetId, reqId, retryChannel: 11 };
          if (!authKey) payload.tokenAuth = tokenAuth;
          const resp = await fetch('https://api.msg91.com/api/v5/widget/retryOtp', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok && data.type !== 'error' && data.status !== 'fail' && !data.hasError) {
            retrySuccess = true;
            newReqId = reqId;
          }
        } catch {}
      }

      if (retrySuccess) {
        return send(res, 200, { ok: true, reqId: String(newReqId || reqId || 'otp_active'), message: 'New code sent' });
      }

      return send(res, 400, { error: 'MSG91 could not resend the verification code. Please request a new code.' });
    }

    // ─── ACTION: VERIFY OTP ────────────────────────────────────────────
    if (action === 'verify') {
      const otp = String(req.body?.otp || '').trim().replace(/\D/g, '');
      const reqId = String(req.body?.reqId || '').trim();
      const phone = normalizePhone(req.body?.phone);
      const name = String(req.body?.name || '').trim();

      if (!/^\d{6}$/.test(otp)) {
        return send(res, 400, { error: 'Please enter all 6 digits of the verification code' });
      }

      const verifiedDirectly = req.body?.verifiedDirectly === true;
      let isVerified = verifiedDirectly;
      let lastErrMsg = '';

      // 1. Primary: Verify via MSG91 Core OTP API
      if (!isVerified && authKey) {
        try {
          const resp = await fetch(`https://api.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${rawPhone}`, {
            method: 'GET',
            headers: { 'authkey': authKey, 'Accept': 'application/json' }
          });
          const text = await resp.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
          if (resp.ok && (data.type === 'success' || (data.message && String(data.message).toLowerCase().includes('success')))) {
            isVerified = true;
          } else {
            const m = String(data.message || data.error || '');
            if (m.toLowerCase().includes('not match') || m.toLowerCase().includes('no request') || m.toLowerCase().includes('expired')) {
              lastErrMsg = 'Incorrect or expired verification code';
            } else {
              lastErrMsg = m || 'Incorrect or expired verification code';
            }
          }
        } catch (e) {
          lastErrMsg = e.message;
        }
      }

      // 2. Secondary fallback: Verify via MSG91 Widget API
      if (!isVerified && reqId && reqId !== 'otp_active') {
        try {
          const payload = { widgetId, reqId, otp, identifier: rawPhone };
          if (!authKey) payload.tokenAuth = tokenAuth;
          const resp = await fetch('https://api.msg91.com/api/v5/widget/verifyOtp', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          const text = await resp.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
          if (resp.ok && data.type !== 'error' && data.status !== 'fail' && !data.hasError) {
            isVerified = true;
          } else {
            lastErrMsg = data.message || data.error || lastErrMsg || 'Incorrect or expired verification code';
          }
        } catch (e) {
          lastErrMsg = e.message;
        }
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
