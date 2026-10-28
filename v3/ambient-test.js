'use strict';
// Kratka provjera ambijenta: canvas je iza sučelja, ne hvata dodire, crta, poštuje smanjeno kretanje. Pokretanje: node v3/ambient-test.js
const { chromium } = require('playwright'); const path = require('path');
const OUT = process.env.OUT || path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.join(__dirname, '..', 'web', 'site', 'index.html');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['mobitel', { width: 360, height: 740 }], ['TV', { width: 1280, height: 720 }]]) {
    const ctx = await b.newContext({ viewport: vp }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto(URL); await page.waitForTimeout(3500);
    const r = await page.evaluate(() => {
      const c = document.getElementById('ambient'), app = document.getElementById('app');
      const cs = c && getComputedStyle(c), z = (e) => +getComputedStyle(e).zIndex || 0;
      const g = c && c.getContext('2d'), d = g && g.getImageData(0, 0, c.width, c.height).data; let lit = 0, mx = 0;
      if (d) for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { lit++; if (d[i] > mx) mx = d[i]; }
      const btn = document.querySelector('#app button, #app .btn'), br = btn && btn.getBoundingClientRect();
      const top = br && document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
      return { has: !!c, pe: cs && cs.pointerEvents, zc: c && z(c), za: z(app), lit, mx, size: c && [c.width, c.height], topOk: !br || (top && top.id !== 'ambient') };
    });
    console.log('  [' + name + ']', JSON.stringify(r));
    ok(r.has && r.pe === 'none' && r.zc < r.za, name + ': canvas postoji, ne hvata dodire i ispod je sučelja');
    ok(r.lit > 0 && r.mx <= 160, name + ': crta (' + r.lit + ' točaka), najveća neprozirnost ' + r.mx + '/255 = suptilno');
    ok(r.topOk, name + ': gumbi su dostupni (ništa ih ne prekriva)');
    await page.screenshot({ path: OUT + '/amb-' + name + '.png' });
    // trošak po sličici
    const cost = await page.evaluate(() => new Promise((res) => { let n = 0, t = performance.now(); const f = () => { if (++n < 60) requestAnimationFrame(f); else res((performance.now() - t) / n); }; requestAnimationFrame(f); }));
    ok(cost < 40, name + ': prosječno trajanje sličice ' + cost.toFixed(1) + ' ms');
    ok(!errs.length, name + ': bez grešaka ' + errs.join('|'));
    await ctx.close();
  }
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort()); await page.goto(URL); await page.waitForTimeout(600);
  ok(await page.$('#ambient') === null, 'smanjeno kretanje: ambijent se ne prikazuje');
  await b.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
