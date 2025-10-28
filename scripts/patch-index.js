const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const INDEX = path.join(DIST, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error('dist/index.html not found');
  process.exit(1);
}

let html = fs.readFileSync(INDEX, 'utf8');
const inject = `
<link rel="manifest" href="/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
`.trim();

if (!/rel=["']manifest["']/.test(html)) {
  html = html.replace(/<\/head>/i, `${inject}\n</head>`);
}

fs.writeFileSync(INDEX, html, 'utf8');
console.log('patch-index.js: injected manifest & iOS meta if missing.');
