const CACHE_NAME = 'scanner-v5';
const URLS_TO_CACHE = [
  '/SCANNER/',
  '/SCANNER/index.html',
  '/SCANNER/scanner-manifest.json',
  '/SCANNER/scanner-icon-192.png',
  '/SCANNER/scanner-icon-512.png',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(URLS_TO_CACHE.map(url => cache.add(url).catch(()=>{})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if(new URL(event.request.url).hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(response && response.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('/SCANNER/'));
    })
  );
});
