/* PWA sin dependencias de CDN ni servicios de terceros. */
const CACHE='prevencion-v5';
const ASSETS=['./','./index.html','./app.js','./pipeline.js','./worker.js','./logo.jpg','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('prevencion-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(req.mode==='navigate'){
   try{const response=await fetch(req);if(response.ok)await cache.put('./index.html',response.clone());return response;}catch(_){return await cache.match('./index.html')||Response.error();}
  }
  const saved=await cache.match(req);if(saved)return saved;
  try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}catch(_){return Response.error();}
 })());
});
