const fs = require('fs'); const path = require('path');
const repoRoot = process.cwd(); const distIndex = path.join(repoRoot, 'dist', 'index.html');
if(!fs.existsSync(distIndex)){ console.warn('[patch-index] dist/index.html not found. skip.'); process.exit(0); }
let html = fs.readFileSync(distIndex,'utf8');
if(!/id=["']modal-root["']/.test(html)){ html = html.replace(/<body[^>]*>/i, m => `${m}\n<div id="modal-root"></div>`); }
const marker='__EMERGENCY_ONBOARD_BOOT__';
if(!html.includes(marker)){
  const emergencyScript = `
<script id="${marker}">
(function () {
  try { window.__ONBOARD_BOOT = 'mounted'; } catch (e) {}
  function ensurePortal(){var el=document.getElementById('modal-root');if(!el){el=document.createElement('div');el.id='modal-root';document.body.appendChild(el);}return el;}
  function hasRealOnboard(){var els=[].slice.call(document.querySelectorAll('body *'));return els.some(function(e){var t=(e.textContent||'')+'';return /初回設定のご案内|ホームに追加|通知を有効にする/.test(t);});}
  function showEmergencyModal(){if(document.getElementById('__EMERGENCY_ONBOARD__'))return;var w=document.createElement('div');w.id='__EMERGENCY_ONBOARD__';w.setAttribute('role','dialog');Object.assign(w.style,{position:'fixed',inset:'0',background:'rgba(0,0,0,0.45)',zIndex:'2147483647',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'});w.innerHTML='<div style="width:100%;max-width:480px;background:#fff;border-radius:16px;padding:20px"><div style="font-size:18px;font-weight:800;margin-bottom:8px">初回設定のご案内 (ブート版)</div><p style="color:#475467;line-height:22px;margin-bottom:10px">React 側の OnboardOverlay が未マウントのため、暫定表示しています。</p><div style="margin-bottom:12px"><div style="font-size:16px;font-weight:700;margin-bottom:4px">ホーム画面に追加（iPhone）</div><div style="color:#475467;line-height:22px">Safariの共有（□↑）→「ホーム画面に追加」→ 追加したアイコンから起動してください。</div></div><div style="display:flex;gap:10px;justify-content:flex-end"><button id="__EMERGENCY_CLOSE__" style="background:#e5e7eb;border-radius:8px;padding:10px 12px;font-weight:800">閉じる</button></div></div>';w.querySelector('#__EMERGENCY_CLOSE__')?.addEventListener('click',function(){try{localStorage.removeItem('onboard:trigger_after_login');}catch(e){}w.remove();});document.body.appendChild(w);}
  function maybeShow(){try{var t=localStorage.getItem('onboard:trigger_after_login');if(t==='1'&&!hasRealOnboard()){ensurePortal();showEmergencyModal();}}catch(e){}}
  ensurePortal();maybeShow();setTimeout(maybeShow,600);setTimeout(maybeShow,1500);
  try{new MutationObserver(maybeShow).observe(document.body,{childList:true,subtree:true});}catch(e){}
  window.addEventListener('storage',function(ev){if(ev?.key==='onboard:trigger_after_login'&&ev.newValue==='1')maybeShow();});
})();
</script>`.trim();
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${emergencyScript}\n</body>`) : (html + '\n' + emergencyScript + '\n');
}
fs.writeFileSync(distIndex, html); console.log('[patch-index] injected emergency onboard boot script');
