/* Cache only this app's public offline shell. API/auth responses stay on the network. */
const CACHE='hi-service-v21-audit';
const CORE=['./','./index.html','./stock-count.js','./user-privileges.js','./stock-categories.js','./stock-import.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&/^hi-service-/.test(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin||url.search||!CORE.some(p=>new URL(p,self.registration.scope).pathname===url.pathname))return;
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
    if(!r||!r.ok)throw Error('Shell request failed');
    const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));return r;
  }).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
