// Mozgalica: uvijek pokušaj mrežu, a bez interneta posluži zadnju spremljenu verziju.
const CACHE = 'mozgalica-v50';
const CORE = ['./', './index.html', './engine.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg', './vendor/qrcode.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cdn = /(^|\.)unpkg\.com$|(^|\.)cdn\.jsdelivr\.net$|^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !cdn) return;
  e.respondWith(
    fetch(req, { cache: url.origin === self.location.origin ? 'no-cache' : 'default' }).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
