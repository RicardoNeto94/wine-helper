const CACHE_NAME = 'foh-wine-pairing-v2-20250907213529';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=20250907213529',
  './app.js?v=20250907213529',
  './manifest.json',
  './assets/wines.json?v=20250907213529',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('/assets/wines.json')) {
    const noQuery = new Request(url.origin + url.pathname, {headers: e.request.headers});
    e.respondWith(caches.match(noQuery).then(resp => resp || fetch(noQuery)));
    return;
  }
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});