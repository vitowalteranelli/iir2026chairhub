const CACHE_NAME = 'iir2026-chair-hub-v10';
const APP_ROOT = new URL('./', self.registration.scope);
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=20261109-11',
  './app.js?v=20261109-12',
  './content.enc.json',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/iir2026-logo.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('iir2026-chair-hub-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== APP_ROOT.origin) return;

  const papersRoot = new URL('./papers/', APP_ROOT);
  if (url.pathname.startsWith(papersRoot.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(APP_ROOT.href)) || cache.match(new URL('./index.html', APP_ROOT).href);
      }),
    );
    return;
  }

  if (url.pathname.endsWith('/content.enc.json')) {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
        return response;
      }).catch(async () => (await caches.match(request)) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
      if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
      return response;
    })),
  );
});
