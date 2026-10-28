'use strict';
// Kratka provjera poruke kod ždrijeba (izjednačeni glasovi) na mobitelu: poruka ne smije prekriti druge elemente. Pokretanje: node v3/tie-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(OUT, 'out-tie.html');
{ const h = fs.readFileSync(path.join(__dirname, 'out.html'), 'utf8'), a = "let S = null, lastSig = '';"; if (!h.includes(a)) throw new Error('sidro'); fs.writeFileSync(TMP, h.replace(a, a + ' window.__t = { game: () => game, S: (v) => { S = v; }, L: (v) => { L = v; }, fresh: (s) => freshLocal(s), render: () => phoneRender(true), show: () => { phoneShown = () => true; } };')); }
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  for (const W of [360, 320]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 740 }, hasTouch: true });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto('file://' + TMP);
    await page.click('#demo'); await page.waitForTimeout(250); await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(150);
    await page.evaluate(() => {
      const game = __t.game(), real = game.view.bind(game);
      game.view = () => Object.assign(real(), { ph: 'voteResult', s: 4242, ntv: false, cats: ['Dinosauri i prapovijest', 'Slavni parovi i obitelji', 'Reklame i slogani', 'Jezici i riječi'], cw: 1, tie: 1, tb: [0, 1], rd: 2600 });
      __t.S(game.view()); __t.L(__t.fresh(4242)); __t.render();
    });
    for (const [name, ms] of [['pre', 400], ['post', 3600]]) {
      await page.waitForTimeout(ms - (name === 'post' ? 400 : 0));
      const r = await page.evaluate(() => {
        const q = (s) => document.querySelector(s), bb = (e) => e && e.getBoundingClientRect();
        const vis = (e) => e && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.5;
        const els = [...document.querySelectorAll('.p-title > span, .p-sub > span, .p-sub')].filter(vis);
        const door = q('.door-btns'), title = q('.vote-head'), sub = q('.p-sub');
        const tr = bb(title), dr = bb(door);
        const texts = els.map((e) => ({ t: e.textContent.slice(0, 30), r: (() => { const x = bb(e); return [Math.round(x.top), Math.round(x.bottom)]; })() }));
        return { head: [Math.round(tr.top), Math.round(tr.bottom)], doors: [Math.round(dr.top), Math.round(dr.bottom)], texts, sw: document.documentElement.scrollWidth };
      });
      console.log('  [' + W + ' ' + name + ']', JSON.stringify(r));
      ok(r.head[1] <= r.doors[0] + 1, W + ' ' + name + ': naslov ne prelazi u vrata (' + r.head[1] + ' <= ' + r.doors[0] + ')');
      for (const t of r.texts) ok(t.r[1] <= r.doors[0] + 1, W + ' ' + name + ': "' + t.t + '" ne prekriva vrata (' + t.r[1] + ' <= ' + r.doors[0] + ')');
      await page.screenshot({ path: OUT + '/tie-' + W + '-' + name + '.png' });
    }
    ok(!errs.length, 'bez grešaka u konzoli ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
