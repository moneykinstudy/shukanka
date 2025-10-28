const CACHE = "ox-static-v1";
const ASSETS = ["/","/index.html","/manifest.json","/icon-192.png","/icon-512.png"];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e)=>{ self.clients.claim(); });

self.addEventListener("fetch", (e)=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res=>{
      if (req.method==="GET" && res.ok){
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
      }
      return res;
    }).catch(()=>cached))
  );
});

// Web Push受信
self.addEventListener("push", (event)=>{
  let data = {};
  try { data = event.data?.json?.() ?? {}; } catch {}
  const title = data.title || "お知らせ";
  const body  = data.body  || "タップして開く";
  const url   = data.url   || "/";
  event.waitUntil(
    self.registration.showNotification(title,{
      body, data:{url}, icon:"/icon-192.png", badge:"/icon-192.png"
    })
  );
});

// クリックでアプリへ
self.addEventListener("notificationclick", (event)=>{
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil((async ()=>{
    const all = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    for (const c of all){ try{ await c.navigate(url); c.focus(); return; }catch{} }
    await self.clients.openWindow(url);
  })());
});