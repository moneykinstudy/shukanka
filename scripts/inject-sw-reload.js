/**
 * dist/index.html の </head> 直前に、SWが初回で controller を掴めない問題を回避するスニペットを注入する
 * idempotent（再注入しない）に動く
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(process.cwd(), 'dist');
const indexFile = path.join(dist, 'index.html');
if (!fs.existsSync(indexFile)) {
  console.error('dist/index.html が見つかりません。先に `npm run build` が必要です。');
  process.exit(0); // ビルド前なら無視（CIでもOKにする）
}

let html = fs.readFileSync(indexFile, 'utf8');
const MARK = '/*__SW_FIRST_CONTROL_RELOAD__*/';
if (html.includes(MARK)) {
  console.log('既に SW リロードスニペットが入っています。スキップ。');
  process.exit(0);
}

const SNIPPET = `
<script>${MARK}
(function () {
  if (!('serviceWorker' in navigator)) return;
  try {
    if (localStorage.getItem('sw:controlled') === '1') return;
  } catch (_) {}

  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      if (!navigator.serviceWorker.controller) {
        try { localStorage.setItem('sw:controlled', '1'); } catch (_){}
        location.reload();
      }
    })
    .catch(function(e){ console.warn('SW init warn:', e); });
})();
</script>
`;

html = html.replace('</head>', SNIPPET + '\n</head>');
fs.writeFileSync(indexFile, html, 'utf8');
console.log('SW リロードスニペットを dist/index.html に注入しました。');
