// Popularni mobiteli u stvarnoj vidljivoj veličini (preglednik s adresnom trakom, ne cijeli zaslon):
// igra mora stati bez skrolanja i bez smanjivanja cijelog prikaza, a fontovi se moraju učitati i svesti na iste debljine.
// BROWSER=webkit pokreće isti test u motoru Safarija (na CI-ju); zadano je chromium.
const pw = require('playwright');
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('node:assert/strict');
const ENGINE = process.env.BROWSER || 'chromium';
const root = path.join(__dirname, '..');
let html = require('./page-source.cjs');
html = html.replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.testUI=(d,tv)=>{if(tv){mode="host";tvV(d);}else{mode="player";applyState(d);}};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((x) => x[1]).filter((x) => x.trim());
const hashes = html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);
hashes.forEach((h, i) => { html = html.replace(h, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64')); });

// [naziv, širina, vidljiva visina, najmanje dopušteno mjerilo]; iPhone SE je najmanji ekran koji se još prodaje, pa smije biti malo smanjen
const PHONES = [
  ['iPhone SE u Safariju', 375, 553, 0.84],
  ['iPhone 13-15 u Safariju', 390, 664, 0.985],
  ['iPhone Pro Max u Safariju', 430, 739, 0.985],
  ['iPhone 13-15 instalirano', 390, 844, 0.985],
  ['Samsung Galaxy S u Chromeu', 360, 668, 0.97],
  ['Samsung Galaxy S u Samsung Internetu', 360, 700, 0.985],
  ['Xiaomi/Pixel u Chromeu', 393, 740, 0.985],
  ['veći Xiaomi/Samsung A u Chromeu', 412, 780, 0.985],
];
const Q = 'Tko je 1888. prvi prevalio dulje putovanje automobilom, od Mannheima do Pforzheima?';

function state(ph) {
  const box = vm.createContext({ setTimeout, clearTimeout });
  vm.runInContext(require('./engine-source.cjs') + '\nthis.game=createGame({code:"TEST",noTv:true});', box);
  const g = box.game;
  [['one', 'Mateo'], ['two', 'Ana'], ['p3', 'Marko'], ['p4', 'Iva']].forEach(([id, n], i) => g.addPlayer(id, n, i, false, i === 0));
  Object.assign(g._G, { ph, s: 5, inFinale: ph === 'fq', cats: ['Izumi i otkrića', 'Sport', 'Anime', 'Automobili i promet'], cw: 3,
    q: { c: 'Automobili i promet', t: ph === 'fq' ? 'Mjesec nema vlastitu svjetlost, nego odbija Sunčevu.' : Q, o: ph === 'fq' ? ['Točno', 'Netočno'] : ['Karl Benz', 'Henry Ford', 'Gottlieb Daimler', 'Bertha Benz'], a: 3 },
    dur: 20000, startedAt: Date.now(), endsAt: Date.now() + 20000, ev: [] });
  g._p('one').offers = ['bomba', 'pola', 'utjeha'];
  const view = JSON.parse(JSON.stringify(g.view())); g.stop();
  return view;
}

(async () => {
  const launch = ENGINE === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] } : {};
  const browser = await pw[ENGINE].launch(launch);
  const mobile = ENGINE === 'webkit' ? { userAgent: pw.devices['iPhone 13'].userAgent, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { deviceScaleFactor: 2, hasTouch: true };
  try {
    const open = async (w, h) => {
      const ctx = await browser.newContext(Object.assign({ viewport: { width: w, height: h } }, mobile));
      const p = await ctx.newPage();
      const errors = []; p.on('pageerror', (e) => errors.push(e.message)); p.__errors = errors;
      await p.addInitScript(() => localStorage.setItem('mz_pid', 'one'));
      await ctx.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'game.test') return r.abort(); const f = path.join(root, u.pathname.slice(1)); return u.pathname === '/' ? r.fulfill({ body: html, contentType: 'text/html' }) : fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f) }) : r.abort(); });
      await p.goto('http://game.test/');
      p.__close = () => ctx.close();
      return p;
    };

    // Fontovi: učitani iz igre, bez samostalnog povećavanja teksta, a tražene debljine svode se jednako u svakom motoru.
    {
      const p = await open(390, 664);
      const f = await p.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(['800 20px Cinzel', '600 20px Nunito', '800 20px Nunito', '900 20px Nunito'].map((x) => document.fonts.load(x, 'Odgovori šđčćž')));
        const width = (fam, w) => { const s = document.createElement('span'); s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + w + ' 40px "' + fam + '",monospace'; s.textContent = 'Odgovori šđčćž 1234'; document.body.appendChild(s); const x = s.getBoundingClientRect().width; s.remove(); return Math.round(x * 10) / 10; };
        const cs = getComputedStyle(document.documentElement);
        return { ok: ['800 20px Cinzel', '600 20px Nunito', '900 20px Nunito'].map((x) => document.fonts.check(x, 'šđčćž A1')), n: Object.fromEntries([400, 600, 700, 800, 900].map((w) => [w, width('Nunito', w)])), c: Object.fromEntries([400, 800].map((w) => [w, width('Cinzel', w)])), mono: width('no-such-font', 400), tsa: cs.webkitTextSizeAdjust || cs.textSizeAdjust };
      });
      console.log(ENGINE, 'fonts', JSON.stringify(f));
      assert.ok(f.ok.every(Boolean), 'Cinzel and Nunito are loaded, including Croatian letters');
      assert.ok(f.n[600] !== f.mono && f.c[800] !== f.mono, 'the game fonts are used, not a fallback');
      assert.equal(f.n[400], f.n[600], 'weight 400 renders as 600');
      assert.equal(f.n[700], f.n[800], 'weight 700 renders as 800');
      assert.ok(f.n[900] > f.n[800] && f.n[800] > f.n[600], 'the three weights are distinct');
      assert.equal(f.c[400], f.c[800], 'the display font has one weight');
      // WebKit izvan iOS-a ne poznaje text-size-adjust pa ga ne može ni pročitati; da je zapisan u CSS-u čuva tests/phones.test.cjs
      assert.ok(f.tsa === undefined || f.tsa === '' || f.tsa === '100%', 'the browser must not inflate text on its own (got ' + f.tsa + ')');
      assert.deepEqual(p.__errors, []);
      await p.__close();
    }

    for (const [name, w, h, minZoom] of PHONES) {
      const zooms = {};
      for (const ph of ['vote', 'power', 'question', 'fq']) {
        const p = await open(w, h);
        await p.evaluate((d) => testUI(d, false), state(ph)); await p.waitForTimeout(550);
        const m = await p.evaluate(() => {
          const rect = (e) => e.getBoundingClientRect(), mute = rect(document.querySelector('#mute'));
          const buttons = [...document.querySelectorAll('#app .p-opt, #app .door-btn, #app .pw-card, #app #nopw')].map((b) => { const r = rect(b); return { h: Math.round(r.height), bottom: Math.round(r.bottom), top: Math.round(r.top), overSound: r.bottom > mute.top && r.right > mute.left }; });
          return { scroll: document.documentElement.scrollHeight > innerHeight + 1, wide: document.documentElement.scrollWidth > innerWidth + 1, zoom: +document.querySelector('#app').style.zoom || 1, buttons, vh: innerHeight };
        });
        zooms[ph] = m.zoom;
        assert.ok(!m.scroll && !m.wide, `${name} ${ph}: the page fits without scrolling`);
        assert.ok(m.zoom >= minZoom, `${name} ${ph}: the screen is shrunk to ${m.zoom} (allowed ${minZoom})`);
        assert.ok(m.buttons.length >= 2, `${name} ${ph}: choices are rendered`);
        for (const b of m.buttons) {
          assert.ok(b.h >= 40, `${name} ${ph}: a choice is only ${b.h}px tall`);
          assert.ok(b.top >= 0 && b.bottom <= m.vh && !b.overSound, `${name} ${ph}: a choice is off screen or under the sound buttons`);
        }
        assert.deepEqual(p.__errors, [], `${name} ${ph}: script errors`);
        await p.__close();
      }
      console.log(ENGINE, name, w + 'x' + h, JSON.stringify(zooms));
    }
  } finally { await browser.close(); }
})();
