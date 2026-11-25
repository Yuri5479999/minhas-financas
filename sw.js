const CACHE = 'financas-v10';
const FILES = ['./', './index.html', './fonts/Inter-Regular.woff', './fonts/Inter-Medium.woff', './fonts/Inter-SemiBold.woff', './fonts/Inter-Bold.woff', './fonts/Inter-ExtraBold.woff', './fonts/InstrumentSerif-Italic.woff'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Abre na hora com o que está guardado e atualiza em segundo plano.
// Se achar uma versão nova, avisa o app para mostrar "Nova versão disponível".
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;  // APIs externas (Gemini) não passam pelo cache
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // abrir com ?parâmetros (Atalho) usa a mesma página guardada
    const req = e.request.mode === 'navigate' ? new Request(e.request.url.split('?')[0]) : e.request;
    const cached = await cache.match(req);
    const net = fetch(req, { cache: 'no-cache' }).then(async res => {
      if (res && res.ok) {
        const fresh = await res.clone().text();
        const old = cached ? await cached.clone().text() : null;
        await cache.put(req, res.clone());
        if (old !== null && old !== fresh) {
          const clients = await self.clients.matchAll();
          clients.forEach(c => c.postMessage('update'));
        }
      }
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    const res = await net;
    return res || (await cache.match('./index.html')) || Response.error();
  })());
});
