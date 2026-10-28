'use strict';
// Provjera medaljona Power picka na pravoj izgradnji (web/site): sredina, vidljivost slike, snimke. node v3/pp-icon-shot.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-ppicon.html');
let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
const a = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; if (!h.includes(a)) throw new Error('sidro');
fs.writeFileSync(TMP, h.replace(a, a + ' window.__t = { game: () => game, S: (v) => { S = v; }, L: (v) => { L = v; }, fresh: (s) => freshLocal(s), render: () => phoneRender(true) };'));
(async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: +(process.env.W || 390), height: +(process.env.H || 844) }, hasTouch: true }); const page = await ctx.newPage();
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto('file://' + TMP);
    await page.click('#demo'); await page.waitForTimeout(250); await page.click('#lobAvatar').catch(() => {}); await page.waitForTimeout(150); await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(150);
    await page.evaluate(() => { const game = __t.game(), real = game.view.bind(game);
      game.view = () => { const v = real(); const P = v.P.map((p) => Object.assign({}, p, { pa: 1, vt: undefined })); return Object.assign(v, { ph: 'vote', s: 777, ntv: false, cats: ['Dinosauri i prapovijest', 'Slavni parovi i obitelji', 'Reklame i slogani', 'Jezici i riječi'], P }); };
      __t.S(game.view()); __t.L(__t.fresh(777)); __t.render(); });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => { const c = document.querySelector('#ppBtn').getBoundingClientRect(), bs = [...document.querySelectorAll('.door-btn')].map((e) => e.getBoundingClientRect());
      const B = Math.max(...bs.map((r) => r.bottom)); const z = parseFloat(document.getElementById('app').style.zoom || '1');
      return { below: c.top >= B - 1, inView: c.bottom * z <= innerHeight, h: c.height, txt: document.querySelector('#ppBtn').textContent, zoom: z };
    });
    console.log(JSON.stringify(m));
    await page.screenshot({ path: OUT + '/ppicon-390.png' });
    await page.click('#ppBtn', { force: true }); await page.waitForTimeout(250); await page.screenshot({ path: OUT + '/ppicon-390-on.png' });
    const on = await page.evaluate(() => ({ txt: document.querySelector('#ppBtn').textContent, arm: document.querySelectorAll('.door-btn.pp-arm').length }));
    console.log(JSON.stringify(on));
    console.log(m.below && m.inView && /POWER PICK/.test(m.txt) && on.arm === 4 ? 'OK' : 'NEUSPJEH');
  } finally { await b.close(); fs.unlinkSync(TMP); }
})();
