const fs = require('fs'); const path = require('path');
const repoRoot = process.cwd();
const distDir = path.join(repoRoot, 'dist');
const srcDir = path.join(repoRoot, 'app', 'public');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(srcDir)) { console.warn('[copy-public] app/public not found. skip.'); process.exit(0); }
function copyRecursive(src, dest){const stat=fs.statSync(src); if(stat.isDirectory()){ if(!fs.existsSync(dest)) fs.mkdirSync(dest,{recursive:true}); for(const e of fs.readdirSync(src)){copyRecursive(path.join(src,e), path.join(dest,e));}} else {fs.copyFileSync(src,dest);}}
copyRecursive(srcDir, distDir); console.log('[copy-public] copied app/public -> dist/');
