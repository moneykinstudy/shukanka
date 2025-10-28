const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'public');
const outDir = path.resolve(__dirname, '..', 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
if (fs.existsSync(srcDir)) {
  copyDir(srcDir, outDir);
  console.log('copy-public.js: copied public/* to dist/');
} else {
  console.log('copy-public.js: skip (public/ not found)');
}
