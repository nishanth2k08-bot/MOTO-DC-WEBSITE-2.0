// Serverless API to provide reliable, high-speed, 100% completion APK downloads on all mobile devices
export default function handler(req, res) {
  const version = req.query.v || '1.0.17';
  const cdnUrl = `https://github.com/nishanth2k08-bot/MOTODC-APP/releases/download/v${version}/MotoDC-Partner.apk`;

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Location', cdnUrl);
  return res.status(302).end();
}
