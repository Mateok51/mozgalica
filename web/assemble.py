import json, os
SP = '/root/mozgalica'
OUT = SP + '/web/site'
os.makedirs(OUT, exist_ok=True)

body = open(SP + '/web/body.html', encoding='utf-8').read()
data = json.dumps(json.load(open(SP + '/v3/data.json', encoding='utf-8')), ensure_ascii=False).replace('<', '\\u003c')
engine = open(SP + '/v3/engine.js', encoding='utf-8').read().replace('__DATA__', data)
body = body.replace('__ENGINE__', engine)
body = body.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')

i = body.index('<div id="app"')
head_part, rest = body[:i], body[i:]
# PeerJS prije skripti igre
# QR biblioteka (MIT) poslužuje se s vlastite stranice; PeerJS s točno ove verzije na CDN-u (CSP ništa drugo ne dopušta)
rest = rest.replace(
    '<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>',
    '<script src="vendor/qrcode.js"></script>\n'
    '<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>', 1)
assert 'peerjs.min.js' in rest

sw = """
<script>
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  }
</script>
"""

html = ('<!doctype html>\n<html lang="hr">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="theme-color" content="#0a1433">\n'
        '<meta name="description" content="Party kviz za TV i mobitele: likovi, moći, izazovi i utrka do vrha piramide.">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="icon" href="icon.svg" type="image/svg+xml">\n'
        '<link rel="apple-touch-icon" href="icon-192.png">\n'
        + head_part.rstrip() + '\n</head>\n<body>\n' + rest.rstrip() + '\n' + sw + '</body>\n</html>\n')
VERSION = 'v33'
html = html.replace('MOZGALICA', '<span class="lt">Trivia</span><span class="lt">Tavern</span>').replace('<title>Mozgalica</title>', '<title>Trivia Tavern</title>')
assert html.count('__VER__') == 1
html = html.replace('__VER__', VERSION)
# sigurnosna politika sadržaja: izvršava se samo vlastiti kod (otisci ugrađenih skripti), PeerJS točne verzije i ništa drugo
import re, hashlib, base64
hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode('utf-8')).digest()).decode() + "'" for m in re.finditer(r'<script>([\s\S]*?)</script>', html)]
CSP = ("default-src 'self'; "
       "script-src 'self' https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js " + ' '.join(hashes) + "; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; "
       "img-src 'self' data: blob:; media-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; "
       "connect-src 'self' https://0.peerjs.com wss://0.peerjs.com wss://broker.emqx.io:8084 wss://broker.hivemq.com:8884 wss://test.mosquitto.org:8081 https://unpkg.com https://fonts.googleapis.com https://fonts.gstatic.com; "
       "object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'")
html = html.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n<meta name="referrer" content="no-referrer">\n', 1)
assert 'Content-Security-Policy' in html
open(OUT + '/index.html', 'w', encoding='utf-8').write(html)

manifest = {
    "name": "Trivia Tavern", "short_name": "Trivia Tavern",
    "description": "Party kviz za TV i mobitele",
    "lang": "hr", "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#0a1433", "theme_color": "#0a1433",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ]
}
json.dump(manifest, open(OUT + '/manifest.webmanifest', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

open(OUT + '/sw.js', 'w').write("""// Mozgalica: uvijek pokušaj mrežu, a bez interneta posluži zadnju spremljenu verziju.
const CACHE = 'mozgalica-""" + VERSION + """';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon.svg', './vendor/qrcode.js'];
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
  const cdn = /(^|\\.)unpkg\\.com$|(^|\\.)cdn\\.jsdelivr\\.net$|^fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !cdn) return;
  e.respondWith(
    fetch(req, { cache: url.origin === self.location.origin ? 'no-cache' : 'default' }).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
""")

icon = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#3b5bdb"/><stop offset="1" stop-color="#0a1433"/></radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <path d="M86 420h340l-34-52H120z" fill="#c98a12"/>
  <path d="M120 368h272l-30-46H150z" fill="#e7b45a"/>
  <path d="M150 322h212l-26-40H176z" fill="#ffc93c"/>
  <g transform="translate(156 52) scale(2)">
    <ellipse cx="50" cy="96" rx="26" ry="6" fill="#000" opacity=".15"/>
    <ellipse cx="50" cy="62" rx="38" ry="40" fill="#ff6b6b"/>
    <path d="M50 22V6" stroke="#1a1a2e" stroke-width="3"/><circle cx="50" cy="6" r="6" fill="#ffc93c"/>
    <circle cx="38" cy="52" r="9" fill="#fff"/><circle cx="39.5" cy="53" r="4" fill="#1a1a2e"/>
    <circle cx="62" cy="52" r="9" fill="#fff"/><circle cx="63.5" cy="53" r="4" fill="#1a1a2e"/>
    <path d="M36 72Q50 90 64 72Z" fill="#1a1a2e"/>
  </g>
</svg>
"""
open(OUT + '/icon.svg', 'w').write(icon)

open(OUT + '/README.md', 'w', encoding='utf-8').write("""# Trivia Tavern

Party kviz za 2–6 igrača. TV prikazuje igru, a svi igraju s mobitela: biraju lika, glasaju za kategoriju,
šalju moći protivnicima (led, sluz, grickalice, bomba), rješavaju izazove i utrkuju se do vrha piramide.

**Igraj:** https://mateok51.github.io/mozgalica/

## Kako igrati
1. Na TV-u (ili računalu) u pregledniku otvori adresu i odaberi **Otvori igru na TV-u**.
2. Igrači skeniraju QR kod mobitelom (ili otvore adresu i upišu kod sobe). Prijava ni instalacija nisu potrebne.
3. Domaćin pritisne **Započni igru**.

Nema TV preglednika? Otvori **Otvori igru na TV-u** na jednom mobitelu i zrcali ga na TV.

## Instalacija na mobitel
Chrome → izbornik ⋮ → **Dodaj na početni zaslon** (ili gumb *Instaliraj kao aplikaciju* na početnom ekranu igre).

## Tehnički
- Jedna statična stranica (`index.html`), bez poslužitelja. Igru vodi uređaj domaćina.
- Uređaji se spajaju izravno (WebRTC) preko [PeerJS](https://peerjs.com) i njegovog besplatnog javnog posrednika.
- Pitanja su u objektu `DATA` u `index.html`.
""")
import shutil  # slike likova
shutil.rmtree(OUT + '/chars', ignore_errors=True)
shutil.copytree(SP + '/chars', OUT + '/chars')
shutil.rmtree(OUT + '/ui', ignore_errors=True)
shutil.copytree(SP + '/ui', OUT + '/ui', ignore=shutil.ignore_patterns('bg-p-old.webp', 'bg-mobile-tavern.webp', 'new', 'pw'))
shutil.rmtree(OUT + '/vendor', ignore_errors=True)
shutil.copytree(SP + '/vendor', OUT + '/vendor')
shutil.rmtree(OUT + '/audio', ignore_errors=True)
shutil.copytree(SP + '/audio', OUT + '/audio')
print('OK', os.listdir(OUT))
