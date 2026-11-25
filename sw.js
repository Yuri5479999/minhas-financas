const CACHE = 'financas-v12';
const FILES = ['./', './index.html', './fonts/Inter-Regular.woff', './fonts/Inter-Medium.woff', './fonts/Inter-SemiBold.woff', './fonts/Inter-Bold.woff', './fonts/Inter-ExtraBold.woff', './fonts/InstrumentSerif-Italic.woff'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (com limite de 4s) e, sem internet, usa o que está guardado.
// Assim cada abertura já traz a versão mais nova do GitHub.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  const nav = e.request.mode === 'navigate';
  const key = nav ? new Request(e.request.url.split('?')[0]) : e.request;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(key, { cache: 'reload' }).then(res => {
      if (res && res.ok) { const c = res.clone(); e.waitUntil(cache.put(key, c)); }
      return res;
    });
    try {
      return await Promise.race([net, new Promise((_, rej) => setTimeout(rej, nav ? 4000 : 8000))]);
    } catch (_) {
      net.catch(() => {});
      return (await cache.match(key)) || (await cache.match('./index.html')) || Response.error();
    }
  })());
});
