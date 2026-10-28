'use strict';
// Kratka provjera sučelja power picka (mobitel + TV): gumb, slanje {v,pp:1}, značka na vratima. Pokretanje: node v3/pick-ui-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(OUT, 'out-pick.html');
{ const h = fs.readFileSync(path.join(__dirname, 'out.html'), 'utf8'), a = "let S = null, lastSig = '';"; if (!h.includes(a)) throw new Error('sidro'); fs.writeFileSync(TMP, h.replace(a, a + ' window.__t = { game: () => game, S: (v) => { S = v; }, L: (v) => { L = v; }, fresh: (s) => freshLocal(s), render: () => phoneRender(true), pid: () => PID };')); }
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  for (const W of [390, 360, 320]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 740 }, hasTouch: true });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto('file://' + TMP);
    await page.click('#demo'); await page.waitForTimeout(250); await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(150);
    await page.evaluate(() => {
      window.__inp = []; window.__mode = 'free';
      const game = __t.game(), real = game.view.bind(game);
      game.view = () => { const v = real(); const P = v.P.map((p) => Object.assign({}, p, { pa: 1, vt: undefined })); 
        if (window.__mode === 'used') { P[1] = Object.assign({}, P[1], { pk: 1, vt: 2 }); }
        return Object.assign(v, { ph: 'vote', s: 555, ntv: false, cats: ['Dinosauri i prapovijest', 'Slavni parovi i obitelji', 'Reklame i slogani', 'Jezici i riječi'], P }); };
      game.setInput = (id, inp) => { window.__inp.push(JSON.stringify(inp)); return true; };
      __t.S(game.view()); __t.L(__t.fresh(555)); __t.render();
    });
    ok(await page.$('#ppBtn') !== null, W + ': gumb Power pick se vidi dok je pick dostupan');
    await page.click('#ppBtn', { force: true }); await page.waitForTimeout(100);
    ok(await page.$('.door-btn.pp-arm') !== null, W + ': nakon dodira vrata svijetle (spremno za pick)');
    const g = await page.evaluate(() => { const c = document.querySelector('#ppBtn').getBoundingClientRect(), r = (e) => e.getBoundingClientRect(); const txt = [...document.querySelectorAll('.door-btn .dname')].map((e) => { const x = r(e); return x.left < c.right && x.right > c.left && x.top < c.bottom && x.bottom > c.top; }); return { w: Math.round(c.width), over: txt.some(Boolean), doc: document.documentElement.scrollHeight, ih: innerHeight }; });
    ok(!g.over, W + ': gumb Power pick ne prekriva tekst vrata');
    ok(g.doc <= g.ih + 1, W + ': sve staje na ekran bez skrolanja (' + g.doc + ' <= ' + g.ih + ')');
    await page.screenshot({ path: OUT + '/pick-' + W + '-a.png' });
    await page.click('.door-btn.o1'); await page.waitForTimeout(100);
    const sent = await page.evaluate(() => window.__inp);
    ok(sent.length === 1 && JSON.parse(sent[0]).v === 1 && JSON.parse(sent[0]).pp === 1, W + ': šalje se {v:1, pp:1} → ' + sent.join(','));
    // običan glas bez picka
    await page.evaluate(() => { window.__inp.length = 0; __t.L(__t.fresh(555)); __t.render(); });
    await page.click('.door-btn.o0'); await page.waitForTimeout(100);
    const s2 = await page.evaluate(() => window.__inp); ok(s2.length === 1 && JSON.parse(s2[0]).pp === undefined, W + ': običan glas bez picka → ' + s2.join(','));
    // netko drugi iskoristio pick: značka na vratima, gumba nema
    await page.evaluate(() => { window.__mode = 'used'; __t.S(__t.game().view()); __t.L(__t.fresh(555)); __t.render(); });
    ok(await page.$('#ppBtn') === null, W + ': kad je pick iskorišten, gumba nema');
    const tag = await page.evaluate(() => { const t = document.querySelector('.door-btn.o2 .pp-tag'); return t ? t.textContent : null; });
    ok(!!tag && /power pick/.test(tag), W + ': značka na tuđim vratima: "' + tag + '"');
    const cb = await page.evaluate(() => { const c = document.querySelector('#ppBtn'); return c ? 1 : 0; }); ok(cb === 0, W + ': nakon iskorištenja nema kovanice');
    await page.screenshot({ path: OUT + '/pick-' + W + '-b.png' });
    ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= W + 1, W + ': bez vodoravnog skrola');
    ok(!errs.length, W + ': bez grešaka ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
