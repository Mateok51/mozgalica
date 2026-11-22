// Mozgalica: kod igre (HTML, JS, CSS) uvijek ide preko mreže, a bez interneta se poslužuje zadnja spremljena verzija.
// Slike, zvukovi i fontovi poslužuju se iz predmemorije odmah, a u pozadini se osvježavaju (brže otvaranje na slaboj mreži).
const CACHE = 'mozgalica-v94';
const CORE = ['./', './index.html', './styles.css', './fonts/cinzel-800-latin.woff2', './fonts/cinzel-800-latin-ext.woff2', './fonts/nunito-latin.woff2', './fonts/nunito-latin-ext.woff2', './runtime-config.js', './cloud-transport.js', './diagnostics.js', './app.js', './sw-register.js', './engine.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg', './vendor/qrcode.js', './vendor/peerjs.min.js', './ui/challenge-medal.webp', './ui/bomb-effect.webp', './ui/bug-effect.webp', './ui/bot-medal.webp', './ui/pw-utjeha.webp'];
// Pitanja (705 KB) treba samo uređaj koji vodi igru ili demo, pa se ne preuzimaju pri instalaciji ni u pozadini za goste.
// Kad domaćin prvi put otvori sobu, spremi ih fetch rukovatelj ispod i dalje rade bez mreže. Popis provjerava tests/offline.test.cjs.
const LAZY = ['./data/questions.js'];
// Ostale datoteke igre (likovi, grafika, zvukovi): ne blokiraju instalaciju, nego se spremaju u pozadini kad stranica to zatraži,
// da instalirana igra radi i bez mreže. Popis mora sadržavati sve iz chars/, ui/ i audio/ (provjerava tests/offline.test.cjs).
const EXTRA = [
  './audio/beep.mp3', './audio/boom.mp3', './audio/confirm.mp3', './audio/correct.mp3', './audio/crack.mp3', './audio/fanfare.mp3',
  './audio/freeze.mp3', './audio/music.mp3', './audio/pop.mp3', './audio/score.mp3', './audio/splat.mp3', './audio/squish.mp3', './audio/step.mp3',
  './audio/stingDuel.mp3', './audio/stingRise.mp3', './audio/stingSmall.mp3', './audio/stingTension.mp3', './audio/stingUp.mp3', './audio/tap.mp3',
  './audio/tick.mp3', './audio/timeup.mp3', './audio/whoosh.mp3', './audio/wrong.mp3', './audio/zap.mp3', './chars/kovac/attack.webp',
  './chars/kovac/happy.webp', './chars/kovac/idle.webp', './chars/kovac/sad.webp', './chars/kovac/shocked.webp', './chars/kovac/victory.webp',
  './chars/kuhar/attack.webp', './chars/kuhar/happy.webp', './chars/kuhar/idle.webp', './chars/kuhar/sad.webp', './chars/kuhar/shocked.webp',
  './chars/kuhar/victory.webp', './chars/macak/attack.webp', './chars/macak/happy.webp', './chars/macak/idle.webp', './chars/macak/sad.webp',
  './chars/macak/shocked.webp', './chars/macak/victory.webp', './chars/njusko/attack.webp', './chars/njusko/happy.webp', './chars/njusko/idle.webp',
  './chars/njusko/sad.webp', './chars/njusko/shocked.webp', './chars/njusko/victory.webp', './chars/sjena/attack.webp', './chars/sjena/happy.webp',
  './chars/sjena/idle.webp', './chars/sjena/sad.webp', './chars/sjena/shocked.webp', './chars/sjena/victory.webp', './chars/sova/attack.webp',
  './chars/sova/happy.webp', './chars/sova/idle.webp', './chars/sova/sad.webp', './chars/sova/shocked.webp', './chars/sova/victory.webp',
  './chars/zar/attack.webp', './chars/zar/happy.webp', './chars/zar/idle.webp', './chars/zar/sad.webp', './chars/zar/shocked.webp',
  './chars/zar/victory.webp', './chars/zlata/attack.webp', './chars/zlata/happy.webp', './chars/zlata/idle.webp', './chars/zlata/sad.webp',
  './chars/zlata/shocked.webp', './chars/zlata/victory.webp', './icon-maskable-512.png', './ui/ans-blue.webp', './ui/ans-gold.webp',
  './ui/ans-green.webp', './ui/ans-red.webp', './ui/ans2-blue.webp', './ui/ans2-gold.webp', './ui/ans2-green.webp', './ui/ans2-red.webp',
  './ui/bg-l.webp', './ui/bg-mobile.webp', './ui/bg-p.webp', './ui/btn-blue.webp', './ui/btn-green.webp', './ui/btn-neutral.webp',
  './ui/btn-orange.webp', './ui/btn-purple.webp', './ui/btn-wood.webp', './ui/door-blue.webp', './ui/door-gold.webp', './ui/door-green.webp',
  './ui/door-red.webp', './ui/door2-blue.webp', './ui/door2-gold.webp', './ui/door2-green.webp', './ui/door2-red.webp', './ui/logo.webp',
  './ui/panel.webp', './ui/parch-q.webp', './ui/parch.webp', './ui/pp-medal.webp', './ui/pw-bomba.webp', './ui/pw-card.webp', './ui/pw-dupli.webp',
  './ui/pw-grick.webp', './ui/pw-led.webp', './ui/pw-oklada.webp', './ui/pw-pola.webp', './ui/pw-sluz.webp', './ui/pw-stit.webp',
  './ui/q-panel.webp', './ui/round.webp', './ui/step.webp', './ui/timer2.webp', './ui/timerbar.webp', './ui/token.webp'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Slike, zvukovi i fontovi mijenjaju se rijetko i velike su: prvo predmemorija (odmah), pa tiho osvježavanje u pozadini.
// Verzija predmemorije (CACHE) mijenja se pri svakoj objavi, pa nova objava uvijek kreće s čistom predmemorijom.
const MEDIA = /\.(?:webp|png|jpe?g|mp3|woff2)$/i;
function refresh(req) {
  return fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
    return res;
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // sve što igra treba je na vlastitom izvoru
  if (MEDIA.test(url.pathname)) {
    if (req.headers && req.headers.has('range')) return;   // djelomični zahtjevi (mp3 premotavanje) idu izravno na mrežu
    e.respondWith(caches.match(req).then((hit) => {
      if (hit) { e.waitUntil(refresh(req).catch(() => {})); return hit; }
      return refresh(req).catch(() => undefined);
    }));
    return;
  }
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
// Spremanje u pozadini: samo ono što još nije u predmemoriji, po nekoliko datoteka odjednom; pogreška jedne datoteke ne prekida ostale.
let precaching = null;
function precacheExtra() {
  if (precaching) return precaching;
  precaching = caches.open(CACHE).then(async (c) => {
    const queue = [];
    for (const u of EXTRA) { if (!(await c.match(u))) queue.push(u); }
    const worker = async () => { for (let u = queue.shift(); u; u = queue.shift()) { try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (e) {} } };
    await Promise.all([worker(), worker(), worker()]);
  }).catch(() => {}).then(() => { precaching = null; });
  return precaching;
}
self.addEventListener('message', (e) => {
  if (e.data && e.data.t === 'precache') e.waitUntil(precacheExtra());
});
