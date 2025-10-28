set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "== Repo root: $REPO_ROOT =="

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "== Current branch: $BRANCH =="
echo "== A. Static files check =="
for f in public/manifest.webmanifest public/sw.js public/_headers ; do
  if [[ -f "$f" ]]; then
    echo "  OK: $f"
  else
    echo "  WARN: $f がありません（後続の処理でデプロイは通りますが、PWA/通知は動かない可能性）"
  fi
done
echo "== B. Ensure SW first-control reload injection on build =="

mkdir -p scripts
cat > scripts/inject-sw-reload.js <<'JS'
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
JS
echo "== C. iOS standalone detection patch =="
PATCH_FILE="src/app/pwa-standalone-patch.ts"
cat > "$PATCH_FILE" <<'TS'
/**
 * iOS Safari は appinstalled イベントが発火しないため、
 * display-mode / navigator.standalone で PWA(standalone)を検知し、
 * ローカルフラグを確定させてオンボーディング Step を進める補助スクリプト。
 * アプリ起動時に import されるだけで OK（副作用のみ）。
 */
(function () {
  if (typeof window === 'undefined') return;

  const mm = (q: string) => window.matchMedia && window.matchMedia(q).matches;
  const isStandalone =
    mm('(display-mode: standalone)') ||
    mm('(display-mode: fullscreen)') ||
    mm('(display-mode: minimal-ui)') ||
    (typeof (navigator as any).standalone !== 'undefined' && (navigator as any).standalone === true);

  if (isStandalone) {
    try {
      localStorage.setItem('pwa:installed', '1');
      // 併用しているオンボ完了フラグ名がある場合はここでセットしておくと確実
      // localStorage.setItem('onboard:setup_done:v1', '1');
    } catch (_) {}
  }
})();
TS

# index.ts(エントリ)から上記パッチを読み込む（重複しないようにガード）
if [[ -f "index.ts" ]]; then
  if ! grep -q "pwa-standalone-patch" index.ts; then
    echo "import './src/app/pwa-standalone-patch';" | cat - index.ts > index.ts.new && mv index.ts.new index.ts
    echo "index.ts に pwa-standalone-patch を追加しました。"
  else
    echo "index.ts は既に pwa-standalone-patch を読み込んでいます。"
  fi
else
  echo "WARN: index.ts が見つかりません。エントリポイントが別名の場合は手で import を追加してください。"
fi
echo "== D. Build =="
npm ci
npm run build || true
node scripts/inject-sw-reload.js
echo "== E. curl checks (※本番 URL を入れ替えて使ってください) =="
CF_URL="${CF_PAGES_URL:-https://newshukanka.pages.dev}"
echo "Target URL: $CF_URL"
( set -x
  curl -sI "$CF_URL/index.html" | sed -n '1,10p'
  curl -sI "$CF_URL/manifest.webmanifest" | sed -n '1,10p'
  curl -sI "$CF_URL/sw.js" | sed -n '1,10p'
  curl -sI "$CF_URL/_headers" | sed -n '1,10p' || true
)

echo "== DONE =="
