const CACHE_NAME = 'foh-wine-pairing-dish-20250907215428';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=20250907215428',
  './app.js?v=20250907215428',
  './manifest.json',
  './wines.json?v=20250907215428',
  './menu.json?v=20250907215428',
  './icon-192.png',
  './icon-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});