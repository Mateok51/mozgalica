// Real UI handlers and timers in Chromium/WebKit; no physical iPhone claim.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const pw = require('playwright'), engine = process.env.BROWSER || 'chromium', root = path.join(__dirname, '..');
let html = require('./page-source.cjs');
const marker = '  setInterval(tick, 100);';
assert(html.includes(marker));
html = html.replace(marker, marker + 'window.duelUI={apply(d,resuming=false){mode="player";applyState(d,resuming);},local(){return {s:L.s,sent:L.sent};}};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g) || []).forEach((hash, i) => {
  html = html.replace(hash, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64'));
});
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.game=createGame({code:"TEST",noTv:true});', box);
['one', 'two', 'watcher'].forEach((id, i) => box.game.addPlayer(id, id, i, false));
let step = 900;
function state(ms) {
  Object.assign(box.game._G, { ph: 'duel', s: ++step, q: { c: 'Kviz', t: 'Koji odgovor biraš?', o: ['Prvi', 'Drugi', 'Treći', 'Četvrti'], a: 0 }, du: { a: 'one', b: 'two', bonus: 500 }, dur: 20000, endsAt: Date.now() + ms });
  const d = JSON.parse(JSON.stringify(box.game.view()));
  d.ms = ms; d.dur = 20000;
  return d;
}
(async () => {
  const browser = await pw[engine].launch(engine === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
  try {
    for (const [width, height] of [[375, 553], [390, 664]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true }), page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem('mz_pid', 'one'));
      await page.route('**/*', route => {
        const u = new URL(route.request().url()); if (u.hostname !== 'game.test') return route.abort();
        const file = path.join(root, u.pathname.slice(1));
        return u.pathname === '/' ? route.fulfill({ body: html, contentType: 'text/html' }) : fs.existsSync(file) && fs.statSync(file).isFile() ? route.fulfill({ body: fs.readFileSync(file) }) : route.abort();
      });
      await page.goto('http://game.test/'); await page.evaluate(() => document.fonts.ready);
      const d = state(100);
      await page.evaluate(d => duelUI.apply(d), d);
      await page.waitForFunction(() => parseFloat(document.querySelector('#tbar')?.style.width) === 0, {}, { timeout: 3000 });
      assert(await page.locator('[data-c]').evaluateAll(es => es.length === 4 && es.every(el => el.disabled)), 'Expired duel choices must be disabled while waiting for the server');
      assert((await page.locator('#app').innerText()).includes('Vrijeme je isteklo'), 'An expired duel must explain that the server result is pending');
      await page.evaluate(() => {
        const button = document.querySelector('[data-c="0"]');
        button.onpointerdown(new PointerEvent('pointerdown', { pointerId: 10 }));
        button.onclick(new MouseEvent('click', { detail: 0 }));
      });
      assert.equal((await page.evaluate(() => duelUI.local())).sent, null, 'A stale or keyboard callback cannot fabricate a duel answer after expiry');
      const resumed = { ...d, ms: 5000 };
      await page.evaluate(d => duelUI.apply(d, true), resumed);
      assert(await page.locator('[data-c]').evaluateAll(es => es.every(el => !el.disabled)), 'Authoritative same-step resume reopens a duel with remaining time');
      await page.locator('[data-c="1"]').click();
      assert.equal((await page.evaluate(() => duelUI.local())).sent.c, 1, 'A normal answer still works after authoritative resume');
      await page.evaluate(d => duelUI.apply(d), state(0));
      assert(await page.locator('[data-c]').evaluateAll(es => es.every(el => el.disabled)), 'Already expired snapshots must start disabled');
      assert.equal((await page.evaluate(() => duelUI.local())).sent, null);
      assert.deepEqual(errors, []);
      console.log(engine, width, 'duel local expiry, late callback, authoritative resume and expired admission passed');
      await context.close();
    }
  } finally { box.game.stop(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
