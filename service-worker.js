const CACHE_NAME='foh-wine-pairing-clean-20250908164035';
const ASSETS=['./','./index.html','./styles.css?v=20250908164035','./app.js?v=20250908164035','./manifest.json','./wines.json?v=20250908164035','./menu.json?v=20250908164035','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});