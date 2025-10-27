const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexFile = path.join(distDir, 'index.html');

// 1) manifest ファイル名を .webmanifest にそろえる
const jsManifest = path.join(distDir, 'manifest.webmanifest.js');
const realManifest = path.join(distDir, 'manifest.webmanifest');
if (fs.existsSync(jsManifest)) {
  fs.copyFileSync(jsManifest, realManifest);
  // 残しても害はないが、気になるなら削除
  // fs.unlinkSync(jsManifest);
}

// 2) index.html に <link rel="manifest"> と Apple メタを注入
let html = fs.readFileSync(indexFile, 'utf8');
const headOpen = /<head[^>]*>/i.exec(html);
if (!headOpen) {
  console.error('[fix-pwa] <head> が見つかりません');
  process.exit(1);
}

const inject = `
  <!-- PWA manifest -->
  <link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials" />

  <!-- iOS PWA meta -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
`;

if (!/rel="manifest"/i.test(html)) {
  html = html.replace(headOpen[0], headOpen[0] + '\n' + inject);
}

// 3) 念のため Service Worker を OneSignal 側に許可（必要に応じて）
// （OneSignal.init で serviceWorkerPath を指定しているので通常は不要）

fs.writeFileSync(indexFile, html, 'utf8');
console.log('[fix-pwa] manifest と iOS meta を注入しました');
