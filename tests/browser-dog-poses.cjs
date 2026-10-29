const { chromium } = require('playwright');
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.dogTest={avatar:avSvg};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]).filter(x => x.trim());
const hashes = html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);
hashes.forEach((h, i) => html = html.replace(h, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64')));
const poses = ['idle', 'happy', 'sad', 'shocked', 'attack', 'victory'];
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const missing of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.route('**/*', r => {
        const u = new URL(r.request().url());
        if (u.hostname !== 'game.test' || (missing && u.pathname === '/chars/njusko/attack.webp')) return r.abort();
        const f = path.join(root, u.pathname.slice(1));
        return u.pathname === '/' ? r.fulfill({ body: html, contentType: 'text/html' }) :
          fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ body: fs.readFileSync(f) }) : r.abort();
      });
      await page.goto('http://game.test/');
      await page.evaluate(poses => {
        const fixture = document.createElement('div'); fixture.id = 'dog-fixture';
        fixture.innerHTML = poses.map(p => '<div id="dog-' + p + '" style="width:80px">' + dogTest.avatar(7, p) + '</div>').join('');
        document.body.append(fixture);
      }, poses);
      for (const pose of poses) {
        const img = page.locator('#dog-' + pose + ' img.av');
        const expected = missing && pose === 'attack' ? 'idle' : pose;
        await img.waitFor();
        await page.waitForFunction(([id, src]) => {
          const e = document.querySelector('#dog-' + id + ' img.av');
          return e && e.getAttribute('src') === src && e.complete && e.naturalWidth > 0;
        }, [pose, 'chars/njusko/' + expected + '.webp']);
        const box = await img.evaluate(e => ({ w: e.offsetWidth, h: e.offsetHeight }));
        if (Math.abs(box.w - box.h) > 1 || box.w !== 80) throw Error(pose + ': avatar dimensions changed');
      }
      console.log(missing ? 'Original poses and missing-image fallback OK' : 'All six original dog poses load OK');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
