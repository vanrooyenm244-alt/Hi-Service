/* Atomic app shell. Versioned assets keep open pages consistent during updates. */
const CACHE = 'hi-service-v42-job-completion';
const SHELL = [
  "./",
  "./index.html",
  "./release-notes.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./user-privileges.js?release=hi-service-v40-attendance-po",
  "./stock-categories.11473024c506.js",
  "./stock-import.js?release=hi-service-v40-attendance-po",
  "./stock-count.js",
  "./attendance-review.js?release=hi-service-v40-attendance-po",
  "./hi-app-updates-v31.js?release=hi-service-v40-attendance-po",
  "./vendor/rrule.min.js",
  "./timetree-calendar.071000ecf91b.js",
  "./calendar.3eb04cd0d79d.js",
  "./ops-theme.css?release=20261029",
  "./ops-theme.js?release=20261029",
  "./po-inventory.js?release=hi-service-v40-attendance-po",
  "./purchase-orders.js?release=hi-service-v40-attendance-po",
  "./calendar-ui.364cf824c602.css"
];
const REQUIRED = SHELL.filter(p=>/\.(?:js|css)(?:\?|$)/.test(p)||p==='./index.html'||p==='./');
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{
   await Promise.all(SHELL.map(async path=>{
    try{
     const response=await fetch(path,{cache:'no-store'});
     if(!response.ok)throw Error('HTTP '+response.status);
     await cache.put(path,response);
    }catch(error){if(REQUIRED.includes(path))throw error;}
   }));
   for(const path of REQUIRED)if(!await cache.match(path))throw Error('Incomplete app release.');
   await self.skipWaiting();
  }catch(error){await caches.delete(CACHE);throw error;}
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  await self.clients.claim();
  // Retain the previous release so open tabs can finish using their own assets.
  const keys=(await caches.keys()).filter(k=>/^hi-service-/i.test(k));
  const previous=keys.filter(k=>k!==CACHE).sort((a,b)=>Number((b.match(/v(\d+)/)||[])[1]||0)-Number((a.match(/v(\d+)/)||[])[1]||0));
  await Promise.all(previous.slice(1).map(k=>caches.delete(k)));
 })());
});
self.addEventListener('message',event=>{
 if(event.data&&event.data.type==='GET_VERSION'&&event.ports&&event.ports[0])event.ports[0].postMessage({version:CACHE});
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 const exact=SHELL.some(p=>new URL(p,self.registration.scope).href===url.href);
 if(event.request.mode==='navigate'&&!url.search){
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Navigation failed.');return r;}).catch(async()=>{const cache=await caches.open(CACHE);return cache.match('./index.html');}));
  return;
 }
 if(!exact)return; // API/auth/query requests and other apps never enter this shell cache.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(event.request);
  if(hit)return hit;
  return fetch(event.request,{cache:'no-store'}).then(r=>r.ok?r:Response.error()).catch(()=>Response.error());
 })());
});
