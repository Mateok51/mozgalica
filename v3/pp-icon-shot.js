'use strict';
// Provjera medaljona Power picka na pravoj izgradnji (web/site): sredina, vidljivost slike, snimke. node v3/pp-icon-shot.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-ppicon.html');
let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
const a = "let S = null, lastSig = '';"; if (!h.includes(a)) throw new Error('sidro');
fs.writeFileSync(TMP, h.replace(a, a + ' window.__t = { game: () => game, S: (v) => { S = v; }, L: (v) => { L = v; }, fresh: (s) => freshLocal(s), render: () => phoneRender(true) };'));
(async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const page = await ctx.newPage();
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto('file://' + TMP);
    await page.click('#demo'); await page.waitForTimeout(250); await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(150);
    await page.evaluate(() => { const game = __t.game(), real = game.view.bind(game);
      game.view = () => { const v = real(); const P = v.P.map((p) => Object.assign({}, p, { pa: 1, vt: undefined })); return Object.assign(v, { ph: 'vote', s: 777, ntv: false, cats: ['Dinosauri i prapovijest', 'Slavni parovi i obitelji', 'Reklame i slogani', 'Jezici i riječi'], P }); };
      __t.S(game.view()); __t.L(__t.fresh(777)); __t.render(); });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => { const c = document.querySelector('.pp-coin').getBoundingClientRect(), bs = [...document.querySelectorAll('.door-btn')].map((e) => e.getBoundingClientRect());
      const L = Math.min(...bs.map((r) => r.left)), R = Math.max(...bs.map((r) => r.right)), T = Math.min(...bs.map((r) => r.top)), B = Math.max(...bs.map((r) => r.bottom));
      const cs = getComputedStyle(document.querySelector('.pp-coin')); return { dx: (c.left + c.right) / 2 - (L + R) / 2, dy: (c.top + c.bottom) / 2 - (T + B) / 2, w: c.width, bg: cs.backgroundImage, txt: document.querySelector('.pp-coin').textContent };
    });
    console.log(JSON.stringify(m)); console.log(await page.evaluate(() => { const e = document.querySelector('.pp-coin'); const o = []; for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x); if (c.opacity !== '1' || c.filter !== 'none' || c.mixBlendMode !== 'normal') o.push((x.id || x.className) + ' op=' + c.opacity + ' f=' + c.filter + ' mb=' + c.mixBlendMode); } return o.join(' | '); }));
    const loaded = await page.evaluate(() => new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.onerror = () => r(0); i.src = 'ui/pp-medal.webp'; }));
    console.log('slika učitana, širina', loaded);
    await page.screenshot({ path: OUT + '/ppicon-390.png' });
    await page.click('#ppBtn', { force: true }); await page.waitForTimeout(150); await page.screenshot({ path: OUT + '/ppicon-390-on.png' });
    console.log(Math.abs(m.dx) < 3 && Math.abs(m.dy) < 3 && loaded > 0 && m.txt.trim() === '' ? 'OK' : 'NEUSPJEH');
  } finally { await b.close(); fs.unlinkSync(TMP); }
})();
