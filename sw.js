// ═══════════════════════════════════════════
// SERVICE WORKER — Cache com versão automática
// MUDA ESTE NÚMERO em cada deploy para forçar
// atualização em TODOS os telemóveis
// ═══════════════════════════════════════════
const CACHE_VERSION = 'v' + Date.now(); // Muda automaticamente a cada instalação
const CACHE_NAME = 'scanner-faturas-' + CACHE_VERSION;

// Ficheiros a guardar em cache
const ASSETS = [
  './',
  './index.html',
  './scanner-manifest.json'
];

// ── INSTALL: guardar assets em cache ──
self.addEventListener('install', event => {
  console.log('[SW] Instalar versão:', CACHE_NAME);
  // Forçar ativação imediata sem esperar tab fechar
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Alguns assets não foram cacheados:', err);
      });
    })
  );
});

// ── ACTIVATE: apagar caches antigas ──
self.addEventListener('activate', event => {
  console.log('[SW] Ativar versão:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('scanner-faturas-') && key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Apagar cache antiga:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      // Tomar controlo de todos os tabs imediatamente
      return self.clients.claim();
    })
  );
});

// ── FETCH: Network First para HTML, Cache First para assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase e APIs externas: sempre ir à rede, nunca cache
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    url.protocol === 'chrome-extension:'
  ) {
    return; // deixar o browser tratar normalmente
  }

  // Para o index.html: Network First (sempre tentar buscar o mais recente)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Guardar cópia em cache se OK
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: usar cache
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            return new Response('<h2>Sem ligação à internet</h2>', {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // Para outros assets: Cache First (mais rápido)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── MENSAGEM: forçar atualização quando pedido pela app ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
