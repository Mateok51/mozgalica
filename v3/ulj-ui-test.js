'use strict';
// Uljez u krčmi + odabir mini igara (prava izgradnja, demo): zaslon biranja, glasanja, otkrivanja; TV prikaz; prozor Mini igre. node v3/ulj-ui-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-ulj.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; if (h.indexOf(a) < 0) throw new Error('nema demo createGame'); h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.3, vote: 0.5, voteShow: 0.2, roul: 0.2, power: 0.4, cast: 0.2, q: 1, pace: { n: { w: 1, s: 1, t: 0.3 }, t: { w: 1, s: 1, t: 0.3 }, d: { w: 1, s: 1, t: 0.3 } }, paceMo: 0.1, moment: 0.2,
  howto: 0.3, howtoMax: 0.5, howtoShort: 0.3, chal: ['uljez', 'uljez'], qv: { who: 0, emoji: 0 }, ulj: 60, uljVote: 60, uljReveal: 30, chReveal: 1, betEvents: [0, 0] };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
async function reach(page, ph) {
  return page.evaluate((want) => new Promise((res) => { const g = __t.game(), P = __t.pid(); let last = -1; const t0 = Date.now();
    const iv = setInterval(() => { const G = g._G; if (G.ph === want) { clearInterval(iv); return res(true); } if (Date.now() - t0 > 110000) { clearInterval(iv); return res(false); }
      if (G.s === last) return; last = G.s; const s = G.s; const inp = G.ph === 'uljez' ? { v: [0, 1] } : G.ph === 'uljezVote' ? { v: g.view().P.find((q) => q.id !== P).id } : G.ph === 'vote' ? { v: 0 } : G.ph === 'power' ? { p: '' } : G.ph === 'question' ? { c: 0 } : { ok: 1 }; g.setInput(P, Object.assign({ s }, inp)); }, 20); }), ph);
}
(async () => {
  const b = await chromium.launch();
  try {
    for (const [W, H] of (process.env.ONLY === 'tv' ? [] : [[390, 844], [360, 700]])) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true }); const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(e.message)); await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
      await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(250);
      if (W === 390) {
        await page.click('#lobSettings'); await page.waitForTimeout(150);
        ok(/9 od 9/.test(await page.$eval('#mgOpen', (e) => e.textContent)), 'gumb Mini igre prikazuje 9 od 9');
        await page.click('#mgOpen'); await page.waitForTimeout(150);
        ok((await page.$$eval('#mgOv .cat-chip', (x) => x.length)) === 9, 'popis ima 9 mini igara');
        ok(await page.$eval('#mgOv [data-mg="uljez"]', (e) => /Uljez/.test(e.textContent)), 'Uljez u krčmi je na popisu');
        await page.screenshot({ path: OUT + '/mg-' + W + '.png' });
        await page.click('#mgOv [data-mg="who"]'); await page.waitForTimeout(80);
        ok(/8 od 9/.test(await page.$eval('#mgOv .cat-cnt', (e) => e.textContent)), 'isključivanje Tko sam ja → 8 od 9');
        for (const k of ['sort', 'link', 'order', 'hilo', 'blitz', 'maj']) await page.click('#mgOv [data-mg="' + k + '"]');
        await page.click('#mgOv [data-mg="uljez"]'); await page.waitForTimeout(80);
        ok(await page.$eval('#mgOv [data-mg="uljez"]', (e) => e.classList.contains('on')), 'zadnji izazov se ne može isključiti');
        ok(/Barem jedna/.test(await page.$eval('#mgOv .cat-hint', (e) => e.textContent)), 'prikazuje se objašnjenje');
        await page.click('#mgOv [data-mgall="1"]'); await page.waitForTimeout(80);
        ok(/9 od 9/.test(await page.$eval('#mgOv .cat-cnt', (e) => e.textContent)), 'Sve vraća 9 od 9');
        await page.click('#mgDone'); await page.waitForTimeout(100);
        ok(!(await page.$('#mgOv')), 'prozor se zatvara');
      }
      await page.click('#dstart');
      ok(await reach(page, 'uljez'), W + ': stiže faza Uljez'); await page.waitForTimeout(400);
      const role = await page.evaluate(() => ({ imp: !!document.querySelector('.ul-role.imp'), role: !!document.querySelector('.ul-role'), n: document.querySelectorAll('.ul-t').length, ok: document.getElementById('ulOk') && document.getElementById('ulOk').disabled }));
      ok(role.role && role.n === 8 && role.ok === true, W + ': 8 pojmova, uloga prikazana, Potvrdi isključeno dok nisu 2 odabrana');
      const fit = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      ok(fit, W + ': nema vodoravnog klizanja');
      await page.screenshot({ path: OUT + '/ulj-pick-' + W + '.png' });
      await page.click('[data-ul="0"]'); await page.click('[data-ul="1"]'); await page.click('[data-ul="2"]'); await page.waitForTimeout(100);
      const sel = await page.$$eval('.ul-t.on', (x) => x.map((e) => e.dataset.ul).join(','));
      ok(sel === '1,2', W + ': treći dodir zamjenjuje najstariji odabir (' + sel + ')');
      ok(!(await page.$eval('#ulOk', (e) => e.disabled)), W + ': Potvrdi uključeno');
      await page.click('#ulOk'); await page.waitForTimeout(150);
      ok(/Izbor poslan/.test(await page.$eval('#app', (e) => e.textContent)), W + ': izbor poslan');
      ok(await reach(page, 'uljezVote'), W + ': stiže glasanje'); await page.waitForTimeout(400);
      const rows = await page.$$eval('[data-ulv]', (x) => x.length);
      ok(rows === 3, W + ': za glasanje su 3 druge osobe (' + rows + ')');
      await page.screenshot({ path: OUT + '/ulj-vote-' + W + '.png' });
      await page.click('[data-ulv]'); await page.waitForTimeout(150);
      ok(/Glas poslan/.test(await page.$eval('#app', (e) => e.textContent)), W + ': glas poslan');
      ok(await reach(page, 'uljezReveal'), W + ': stiže otkrivanje'); await page.waitForTimeout(600);
      const rv = await page.evaluate(() => ({ th: !!document.querySelector('.ul-theme b'), rows: document.querySelectorAll('.ul-row').length, res: !!document.querySelector('.result'), chips: document.querySelectorAll('.ul-chip.ok, .ul-chip.bad').length }));
      ok(rv.th && rv.rows === 4 && rv.res && rv.chips >= 4, W + ': otkrivanje prikazuje temu, 4 retka i rezultat ' + JSON.stringify(rv));
      await page.screenshot({ path: OUT + '/ulj-reveal-' + W + '.png' });
      ok(errs.length === 0, W + ': bez grešaka ' + errs.join(' | '));
      await ctx.close();
    }
    // TV prikaz
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
    await page.goto('file://' + TMP + '?demotv=1'); await page.click('#demo'); await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('dstart').click());
    for (const ph of ['uljez', 'uljezVote', 'uljezReveal']) {
      ok(await reach(page, ph), 'TV: stiže ' + ph); await page.waitForTimeout(500);
      const t = await page.evaluate(() => ({ ul: document.querySelectorAll('.ul-t, .ul-row').length, th: !!document.querySelector('.ul-theme'), snip: '' }));
      ok(t.ul > 0, 'TV ' + ph + ': prikazuje elemente igre (' + t.ul + ')');
      if (ph !== 'uljezReveal') ok(!t.th, 'TV ' + ph + ': tema nije vidljiva svima ' + t.snip); else ok(t.th, 'TV reveal: tema je otkrivena');
      await page.screenshot({ path: OUT + '/ulj-tv-' + ph + '.png' });
    }
    ok(errs.length === 0, 'TV: bez grešaka ' + errs.join(' | '));
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'OK'); process.exit(fails ? 1 : 0);
})();
