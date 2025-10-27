const fs = require('fs'); const path = require('path');
const repoRoot = process.cwd(); const distIndex = path.join(repoRoot, 'dist', 'index.html');
if(!fs.existsSync(distIndex)){ console.warn('[patch-pwa-meta] dist/index.html not found. skip.'); process.exit(0); }
let html = fs.readFileSync(distIndex,'utf8');
function ensureHeadTag(content){ if(!/<head[^>]*>/i.test(content)){ return content.replace(/<html[^>]*>/i, m => `${m}\n<head></head>`);} return content;}
html = ensureHeadTag(html);
function injectOnce(content, needleRegex, snippet){ if(needleRegex.test(content)) return content; return content.replace(/<\/head>/i, `${snippet}\n</head>`); }
const snippet = [
  `<link rel="manifest" href="/manifest.webmanifest">`,
  `<meta name="theme-color" content="#ffffff">`,
  `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
  `<meta name="apple-mobile-web-app-title" content="Study Rank">`,
  `<link rel="apple-touch-icon" href="/icons/icon-192.png">`,
  `<link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png">`,
  `<meta name="mobile-web-app-capable" content="yes">`
].join('\n');
html = injectOnce(html, /<link[^>]+rel=["']manifest["'][^>]*>/i, snippet);
fs.writeFileSync(distIndex, html); console.log('[patch-pwa-meta] injected PWA meta tags into dist/index.html');
