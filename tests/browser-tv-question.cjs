// Pitanje samo na TV-u: mobitel pokazuje odgovore bez pitanja, TV pokazuje pitanje i traku čekanja.
// Uz isključenu opciju i u igri bez TV-a mobitel i dalje pokazuje pitanje.
const { chromium } = require('playwright');
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let html = require('./page-source.cjs');
html = html.replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.testUI=(d,tv)=>{if(tv){mode="host";tvV(d);}else{mode="player";applyState(d);}};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((x) => x[1]).filter((x) => x.trim());
const hashes = html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);
hashes.forEach((h, i) => { html = html.replace(h, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64')); });
const Q = 'Koji je od ponuđenih odgovora točan u ovom pitanju s duljim tekstom?';
const ANSWERS = ['Kratak odgovor', 'Nešto dulji ponuđeni odgovor koji se mora moći pročitati u cijelosti', 'Još jedan mogući odgovor', 'Posljednji odgovor'];

function state(opts, ph, answered = []) {
  const box = vm.createContext({ setTimeout, clearTimeout });
  vm.runInContext(require('./engine-source.cjs') + '\nthis.game=createGame(' + JSON.stringify(Object.assign({ code: 'TEST' }, opts)) + ');', box);
  const g = box.game;
  g.addPlayer('one', 'Igrac', 7, false); g.addPlayer('two', 'Suigrac', 1, false);
  for (let i = 3; i <= 6; i++) g.addPlayer('p' + i, 'DuljeIme123' + i, i, false);
  Object.assign(g._G, { ph, s: 5, inFinale: ph === 'fq', q: { c: 'Kategorija', t: Q, o: ph === 'fq' ? ['Točno', 'Netočno'] : ANSWERS, a: 1 }, dur: 20000, startedAt: Date.now(), endsAt: Date.now() + 20000, ev: [] });
  for (const id of answered) { const p = g._p(id); p.ans = 0; p.done = true; }
  const view = JSON.parse(JSON.stringify(g.view())); g.stop();
  return view;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    const open = async (w, h) => {
      const p = await browser.newPage({ viewport: { width: w, height: h } });
      p.on('pageerror', (e) => { throw e; });
      await p.addInitScript(() => localStorage.setItem('mz_pid', 'one'));
      await p.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'game.test') return r.abort(); const f = path.join(root, u.pathname.slice(1)); return u.pathname === '/' ? r.fulfill({ body: html, contentType: 'text/html' }) : fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f) }) : r.abort(); });
      await p.goto('http://game.test/');
      return p;
    };
    const fits = (p) => p.evaluate(() => ({ scroll: document.documentElement.scrollHeight > innerHeight, wide: document.documentElement.scrollWidth > innerWidth, zoom: +document.querySelector('#app').style.zoom || 1 }));

    // Mobitel, TV vodi igru (zadano): pitanja nema, odgovori su svi čitljivi i dodirljivi.
    for (const [w, h] of [[320, 568], [390, 844]]) {
      for (const ph of ['question', 'fq']) {
        const p = await open(w, h);
        await p.evaluate((d) => testUI(d, false), state({}, ph)); await p.waitForTimeout(500);
        const text = await p.locator('#app').innerText();
        assert.ok(!text.includes('ponuđenih odgovora točan'), `${w} ${ph}: the question must not be on the phone`);
        assert.ok(text.includes('Pitanje je na TV-u'), `${w} ${ph}: the phone says where the question is`);
        const want = ph === 'fq' ? 2 : 4;
        const buttons = await p.evaluate(() => [...document.querySelectorAll('.p-opt')].map((b) => { const r = b.getBoundingClientRect(), t = b.querySelector('.otxt') || b; return { h: r.height, text: t.innerText.trim(), cut: (() => { const x = t.getBoundingClientRect(); return x.left < r.left - 1 || x.right > r.right + 1 || x.top < r.top - 1 || x.bottom > r.bottom + 1; })(), off: r.bottom > innerHeight || r.top < 0, disabled: b.disabled }; }));
        assert.equal(buttons.length, want, `${w} ${ph}: answer count`);
        const f = await fits(p); assert.ok(!f.scroll && !f.wide, `${w} ${ph}: page fits`);
        // Najmanji mobitel sa šest igrača i dugim odgovorima smanjuje ekran i u punom prikazu; bez pitanja mora biti barem jednako velik.
        const full = await open(w, h);
        await full.evaluate((d) => testUI(d, false), state({ tvq: false }, ph)); await full.waitForTimeout(500);
        const zoomFull = (await fits(full)).zoom; await full.close();
        assert.ok(f.zoom >= zoomFull - 0.001, `${w} ${ph}: answers-only view is not smaller than the full view (${f.zoom} vs ${zoomFull})`);
        if (w >= 390) assert.ok(f.zoom >= 0.995, `${w} ${ph}: screen is not shrunk (${f.zoom})`);
        const minTap = w >= 390 ? 44 : 40;
        for (const b of buttons) { assert.ok(b.text.length > 0 && !b.cut, `${w} ${ph}: answer text is complete: ${b.text}`); assert.ok(b.h >= minTap && !b.off && !b.disabled, `${w} ${ph}: answer is tappable (${b.h})`); }
        console.log(w, ph, 'zoom', f.zoom, 'full view zoom', zoomFull);
        console.log(w, ph, 'phone shows answers only OK');
        if (ph === 'question') await p.screenshot({ path: process.env.SHOT_DIR ? path.join(process.env.SHOT_DIR, 'tvq-phone-' + w + '.png') : '/tmp/tvq-phone-' + w + '.png' });
        await p.close();
      }
    }

    // Opcija isključena na TV-u, i igra bez TV-a: mobitel pokazuje pitanje kao prije.
    for (const [label, opts] of [['TV with the option off', { tvq: false }], ['phone-hosted game', { noTv: true }], ['phone-hosted game ignores the option', { noTv: true, tvq: true }]]) {
      const p = await open(390, 844);
      const d = state(opts, 'question'); assert.ok(!d.tvq, label + ': the view carries no tvq flag');
      await p.evaluate((x) => testUI(x, false), d); await p.waitForTimeout(400);
      const text = await p.locator('#app').innerText();
      assert.ok(text.includes('ponuđenih odgovora točan') && !text.includes('Pitanje je na TV-u'), label + ': the phone shows the question');
      console.log(label, 'OK');
      await p.close();
    }

    // TV: pitanje, svi odgovori i traka čekanja koja ne otkriva odgovore.
    {
      const p = await open(1280, 720);
      await p.evaluate((d) => testUI(d, true), state({}, 'question')); await p.waitForTimeout(400);
      let text = await p.locator('#app').innerText();
      assert.ok(text.includes('ponuđenih odgovora točan') && ANSWERS.every((a) => text.includes(a)), 'TV shows the question and every answer');
      assert.ok(text.includes('Odgovorilo 0/6'), 'TV counts answers');
      const h0 = await p.locator('.tv-wait').evaluate((e) => e.getBoundingClientRect().height);
      await p.evaluate((d) => testUI(d, true), state({}, 'question', ['two'])); await p.waitForTimeout(300);
      text = await p.locator('.tv-wait').innerText();
      assert.ok(text.includes('Odgovorilo 1/6') && text.includes('Prvi: Suigrac'), 'TV names who answered first: ' + text);
      await p.evaluate((d) => testUI(d, true), state({}, 'question', ['two', 'one', 'p3', 'p4'])); await p.waitForTimeout(300);
      text = await p.locator('.tv-wait').innerText();
      assert.ok(text.includes('Odgovorilo 4/6') && text.includes('Čeka se: DuljeIme1235 i DuljeIme1236'), 'TV names the last two: ' + text);
      const h1 = await p.locator('.tv-wait').evaluate((e) => e.getBoundingClientRect().height);
      assert.ok(Math.abs(h1 - h0) < 1, 'the waiting strip keeps its height');
      const f = await fits(p); assert.ok(!f.scroll && !f.wide, 'TV page fits');
      const over = await p.evaluate(() => { const a = document.querySelector('.tv-wait').getBoundingClientRect(), b = document.querySelector('.lineup').getBoundingClientRect(); return a.bottom > b.top + 1; });
      assert.ok(!over, 'the waiting strip does not overlap the characters');
      await p.screenshot({ path: process.env.SHOT_DIR ? path.join(process.env.SHOT_DIR, 'tvq-tv.png') : '/tmp/tvq-tv.png' });
      console.log('TV question and waiting strip OK');
      await p.close();
    }
  } finally { await browser.close(); }
})();
