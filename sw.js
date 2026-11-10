// Mozgalica: uvijek pokušaj mrežu, a bez interneta posluži zadnju spremljenu verziju.
const CACHE = 'mozgalica-v70';
const CORE = ['./', './index.html', './styles.css', './fonts/cinzel-800-latin.woff2', './fonts/cinzel-800-latin-ext.woff2', './fonts/nunito-latin.woff2', './fonts/nunito-latin-ext.woff2', './app.js', './sw-register.js', './engine.js', './data/questions.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg', './vendor/qrcode.js', './vendor/peerjs.min.js', './ui/challenge-medal.webp', './ui/bomb-effect.webp', './ui/bug-effect.webp', './ui/bot-medal.webp', './ui/pw-utjeha.webp'];
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
  if (url.origin !== self.location.origin) return;   // sve što igra treba je na vlastitom izvoru
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
