const fs = require('fs'); const path = require('path');
const repoRoot = process.cwd(); const distIndex = path.join(repoRoot, 'dist', 'index.html');
if(!fs.existsSync(distIndex)){ console.warn('[patch-pwa-meta] dist/index.html not found. skip.'); process.exit(0); }
let html = fs.readFileSync(distIndex,'utf8');
if(!/<head[^>]*>/i.test(html)){ html = html.replace(/<html[^>]*>/i, m => `${m}\n<head></head>`); }
const inject = [
  `<link rel="manifest" href="/manifest.webmanifest">`,
  `<meta name="theme-color" content="#ffffff">`,
  `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
  `<meta name="apple-mobile-web-app-title" content="Study Rank">`,
  `<link rel="apple-touch-icon" href="/icons/icon-192.png">`,
  `<link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png">`,
  `<meta name="mobile-web-app-capable" content="yes">`
].join('\n');
if (!/rel=["']manifest["']/i.test(html)) {
  html = html.replace(/<\/head>/i, `${inject}\n</head>`);
}
fs.writeFileSync(distIndex, html);
console.log('[patch-pwa-meta] injected PWA tags');
