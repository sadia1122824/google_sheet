const CACHE_NAME = 'client-web-app-v1';
const urlsToCache = [
  '/webLogin',
  '/users/styles.css',
  '/users/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});