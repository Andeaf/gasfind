// Service worker: aplicația pornește instant și merge (cu ultimele date văzute) și fără semnal.
const VERSION = 'gasfind-v3';
const SHELL = [
  '/', '/index.html', '/app.js', '/styles.css', '/manifest.webmanifest',
  '/vendor/maplibre-gl.mjs', '/vendor/maplibre-gl-shared.mjs', '/vendor/maplibre-gl-worker.mjs', '/vendor/maplibre-gl.css',
  '/icons/icon-192.png', '/icons/favicon.svg',
];
const DATA = `${VERSION}-data`;
const MAX_DATA = 400;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k !== DATA) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trimData() {
  const c = await caches.open(DATA);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_DATA; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Date (prețuri): întâi rețeaua, iar fără semnal ultima versiune salvată
  if (url.pathname.startsWith('/api/')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request);
        if (res.ok) {
          const copy = res.clone();
          e.waitUntil(caches.open(DATA).then((c) => c.put(e.request, copy)).then(trimData));
        }
        return res;
      } catch (err) {
        const hit = await caches.match(e.request);
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }

  // Aplicația: din cache, actualizată în fundal
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(e.request, { ignoreSearch: url.pathname === '/' });
    const fresh = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || (e.request.mode === 'navigate' ? cache.match('/index.html') : Response.error());
  })());
});
