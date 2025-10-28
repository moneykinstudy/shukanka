const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, '..', 'dist');
for (const name of ['OneSignalSDKWorker.js', 'OneSignalSDKUpdaterWorker.js']) {
  const p = path.join(DIST, name);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '// placeholder for OneSignal worker\n');
}
console.log('patch-pwa-meta.js: ensured OneSignal worker placeholders.');
