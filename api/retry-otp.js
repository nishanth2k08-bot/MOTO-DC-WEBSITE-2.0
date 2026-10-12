export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const authkey = process.env.MSG91_AUTHKEY;
    if (!authkey) return res.status(500).json({ error: 'MSG91_AUTHKEY is not configured in Vercel' });

    let rawPhone = String(req.body?.phone || '').trim().replace(/\D/g, '');
    if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
    else if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = '91' + rawPhone.slice(1);

    const reqId = String(req.body?.reqId || '').trim();
    const widgetId = '36696a6b507a303132373731';
    const tokenAuth = '566450TDkg3WwhwL6a9f8bdfP1';

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
      // Fallback: send fresh OTP via sendOtp
      const freshResp = await fetch('https://api.msg91.com/api/v5/widget/sendOtp', {
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
      const freshData = await freshResp.json().catch(() => ({}));
      const newReqId = freshData.message || freshData.reqId;
      return res.status(200).json({ ok: true, reqId: String(newReqId || ''), message: 'New verification code sent' });
    }

    return res.status(200).json({ ok: true, message: 'Verification code resent' });
  } catch (e) {
    console.error('retry-otp error:', e);
    return res.status(500).json({ error: e.message || 'Could not resend verification code' });
  }
}
