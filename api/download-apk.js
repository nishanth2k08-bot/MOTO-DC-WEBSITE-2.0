// Serverless endpoint for downloading the latest MotoDC Delivery Partner APK
export default function handler(req, res) {
  const source = req.query?.source;
  
  if (source === 'github') {
    return res.redirect(302, 'https://github.com/nishanth2k08-bot/MOTODC-APP/releases/latest/download/MotoDC-Partner.apk');
  }

  // Redirect to the CDN-cached static APK with cache-busting timestamp
  const ts = Date.now();
  res.writeHead(302, {
    'Location': `/MotoDC-Partner.apk?v=${ts}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': 'attachment; filename="MotoDC-Partner.apk"'
  });
  return res.end();
}
