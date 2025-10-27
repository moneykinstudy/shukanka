const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public');
const dst = path.join(__dirname, '..', 'dist');

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    const a = path.join(from, entry);
    const b = path.join(to, entry);
    const st = fs.lstatSync(a);
    if (st.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}
copyDir(src, dst);
console.log('[copy-public] copied public/* -> dist/');
