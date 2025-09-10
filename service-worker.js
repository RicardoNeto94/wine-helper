const CACHE_NAME='foh-wine-burgundy-20250910144731';
const ASSETS=['./','./index.html','./styles.css?v=20250910144731','./app.js?v=20250910144731','./manifest.json','./wines.json','./menu.json','./images-map.json','./placeholder-bottle.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);const isImg=/\.(png|jpg|jpeg|gif|webp)$/i.test(url.pathname);if(isImg){e.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(e.request).then(r=>r||fetch(e.request).then(net=>{cache.put(e.request, net.clone()); return net;}))))}else{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))}});
