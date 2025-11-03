const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(file)) {
  console.error('[patch-pwa-meta] dist/index.html not found');
  process.exit(1);
}
let html = fs.readFileSync(file, 'utf8');

if (html.includes('APPLE_MOBILE_WEB_APP_CAPABLE') || html.includes('rel="manifest"')) {
  console.log('[patch-pwa-meta] already patched');
  process.exit(0);
}

const inject = `
  <!-- APPLE_MOBILE_WEB_APP_CAPABLE -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="#ffffff">
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png">
  <link rel="manifest" href="/manifest.webmanifest">
`;

html = html.replace('<head>', '<head>' + inject);
fs.writeFileSync(file, html, 'utf8');
console.log('[patch-pwa-meta] injected PWA meta & manifest');
