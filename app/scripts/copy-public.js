const fs = require('fs'); const path = require('path');
const repoRoot = process.cwd(); const distDir = path.join(repoRoot, 'dist');
const cand1 = path.join(repoRoot, 'app', 'public'); const cand2 = path.join(repoRoot, 'public');
const srcDir = fs.existsSync(cand1) ? cand1 : (fs.existsSync(cand2) ? cand2 : null);
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!srcDir) { console.warn('[copy-public] no public dir found. skip.'); process.exit(0); }
function copyRecursive(src, dest){const stat=fs.statSync(src); if(stat.isDirectory()){ if(!fs.existsSync(dest)) fs.mkdirSync(dest,{recursive:true}); for(const e of fs.readdirSync(src)){copyRecursive(path.join(src,e), path.join(dest,e));}} else {fs.copyFileSync(src,dest);}}
copyRecursive(srcDir, distDir); console.log(`[copy-public] copied from ${path.relative(repoRoot, srcDir)} to dist/`);
