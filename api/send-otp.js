export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const authkey = process.env.MSG91_AUTHKEY;
    if (!authkey) return res.status(500).json({ error: 'MSG91_AUTHKEY is not configured in Vercel' });

    let rawPhone = String(req.body?.phone || '').trim().replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    else if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = '91' + rawPhone.slice(1);

    if (rawPhone.length < 10 || rawPhone.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    const widgetId = '36696a6b507a303132373731';
    const tokenAuth = '566450TDkg3WwhwL6a9f8bdfP1';

    // 1. Call MSG91 Widget sendOtp API with server authkey
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

    // If api.msg91.com fails or returns error, try control.msg91.com as fallback
    if (!response.ok || data.type === 'error' || data.status === 'fail' || data.hasError) {
      console.warn('api.msg91.com sendOtp warning:', response.status, data);
      const fallbackResp = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
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
      const fbText = await fallbackResp.text();
      let fbData = {};
      try { fbData = fbText ? JSON.parse(fbText) : {}; } catch { fbData = { message: fbText }; }
      if (fallbackResp.ok && fbData.type !== 'error' && fbData.status !== 'fail') {
        const reqId = fbData.message || fbData.reqId || fbData.data?.reqId;
        return res.status(200).json({ ok: true, reqId: String(reqId || ''), message: 'OTP sent successfully' });
      }
      return res.status(400).json({
        error: data.message || data.error || fbData.message || 'Could not send verification code'
      });
    }

    const reqId = data.message || data.reqId || data.data?.reqId;
    return res.status(200).json({ ok: true, reqId: String(reqId || ''), message: 'OTP sent successfully' });
  } catch (e) {
    console.error('send-otp error:', e);
    return res.status(500).json({ error: e.message || 'Could not send verification code' });
  }
}
