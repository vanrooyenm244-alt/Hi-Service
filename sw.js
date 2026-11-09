/* Atomic app shell. Versioned assets keep open pages consistent during updates. */
const CACHE = 'hi-service-v66-google-calendar';
const SHELL = ["./app-calendar-tools.js?release=calendar-google-20261109",
  "./quote-job-calendar.js?release=20261104-step1-query",
  "./schedule-jobs.js?release=calendar-google-20261109",
  "./",
  "./index.html",
  "./hi-jobcards.js?release=hi-jobcards-20261105-open-fix2",
  "./hi-booking-parser.js",
  "./release-notes.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./user-privileges.js?release=hi-service-v40-attendance-po",
  "./stock-categories.11473024c506.js",
  "./stock-import.js?release=hi-service-v40-attendance-po",
  "./stock-count.js",
  "./attendance-review.js?release=hi-service-v40-attendance-po",
  "./hi-app-updates-v31.js?release=hi-service-v66-google-calendar",
  "./vendor/rrule.min.js",
  "./timetree-calendar.8f9594366230.js",
  "./calendar.d834827ecad6.js",
  "./ops-theme.css?release=20261029",
  "./ops-theme.js?release=20261029",
  "./po-inventory.js?release=hi-service-v40-attendance-po",
  "./purchase-orders.js?release=hi-service-v40-attendance-po",
  "./calendar-ui.9682a845278e.css"
];
const REQUIRED = SHELL.filter(p=>/\.(?:js|css)(?:\?|$)/.test(p)||p==='./index.html'||p==='./');
const MANUAL_GRANT_CACHE='manual-update-approval-hi-service';
async function requireManualUpdateApproval(){
 const gate=await caches.open(MANUAL_GRANT_CACHE),url=new URL('./__manual_update_grant__',self.registration.scope).href,grant=await gate.match(url);
 if(!grant)throw Error('Manual update approval required.');
 await gate.delete(url);
 const at=Number(await grant.text());
 if(!at||Date.now()-at>120000)throw Error('Manual update approval expired. Tap Update again.');
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  await requireManualUpdateApproval();
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

self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  for(const client of clients){if(new URL(client.url).origin===self.location.origin){await client.focus();return;}}
  return self.clients.openWindow(self.registration.scope);
 }));
});

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 const exact=SHELL.some(p=>new URL(p,self.registration.scope).href===url.href);
 if(event.request.mode==='navigate'&&!url.search){
  event.respondWith((async()=>{const cache=await caches.open(CACHE),saved=await cache.match('./index.html');if(saved)return saved;const response=await fetch(event.request,{cache:'no-store'});if(!response.ok)throw Error('Navigation failed.');return response;})());
  return;
 }
 if(!exact)return; // API/auth/query requests and other apps never enter this shell cache.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(event.request);
  if(hit)return hit;
  return fetch(event.request,{cache:'no-store'}).then(r=>r.ok?r:Response.error()).catch(()=>Response.error());
 })());
});


