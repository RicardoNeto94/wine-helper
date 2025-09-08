const CACHE_NAME='foh-wine-pairing-dish-quiz-20250908162752';
const ASSETS=['./','./index.html','./styles.css?v=20250908162752','./app.js?v=20250908162752','./manifest.json','./wines.json?v=20250908162752','./menu.json?v=20250908162752','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});