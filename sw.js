const CACHE='pantalla-focus-v19-local-three';
const ASSETS=['./','./index.html','./styles.css','./app.js','./games-arcade.js','./world3d.js','./anomaly3d.js','./focusia-local.js','./manifest.webmanifest','./focusia-config.js','./server.mjs','./assets/characters/naruto_low_poly_rigged.glb','./assets/characters/terrifying_hooded_horror_woman.glb','./vendor/three/three.module.min.js','./vendor/three/GLTFLoader.js','./vendor/three/BufferGeometryUtils.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const u=new URL(event.request.url);if(u.pathname.startsWith('/api/'))return;event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(c=>c||caches.match('./index.html'))));
});
