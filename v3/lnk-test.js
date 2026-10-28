'use strict';
// Spoji parove 2 (prava izgradnja, demo): povlačenje konopa spaja par, dodir-dodir radi, ponovno povlačenje mijenja par, slanje. node v3/lnk-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-lnk.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.3, vote: 0.5, voteShow: 0.2, roul: 0.2, power: 0.4, cast: 0.2, q: 1, pace: { n: { w: 1, s: 1, t: 0.3 }, t: { w: 1, s: 1, t: 0.3 }, d: { w: 1, s: 1, t: 0.3 } }, paceMo: 0.1, moment: 0.2,
  howto: 0.3, howtoMax: 0.5, howtoShort: 0.3, chal: ['link', 'link'], qv: { who: 0, emoji: 0 }, link: 60, chReveal: 1, betEvents: [0, 0], kr: { wait: 0.3, pactOffers: 0, offMax: 0, chFrom: 99, pactFrom: 99, offFrom: 99, pactChance: 0, offChance: 0, rope: 1, ropeWin: 7, ropeN: 10, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, pactMin: 3, taskWin: 400, taskLoss: 200 } };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext({ viewport: { width: +(process.env.W || 390), height: +(process.env.H || 844) }, hasTouch: true })).newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
    await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(250); await page.click('#dstart');
    const got = await page.evaluate(() => new Promise((res) => { const g = __t.game(), P = __t.pid(); let last = -1; const t0 = Date.now();
      const iv = setInterval(() => { const G = g._G; if (G.ph === 'link') { clearInterval(iv); return res(true); } if (Date.now() - t0 > 40000) { clearInterval(iv); return res(false); }
        if (G.s === last) return; last = G.s; const s = G.s; const inp = G.ph === 'vote' ? { v: 0 } : G.ph === 'power' ? { p: '' } : G.ph === 'question' ? { c: 0 } : { ok: 1 }; g.setInput(P, Object.assign({ s }, inp)); }, 20); }));
    ok(got, 'stiže Spoji parove'); await page.waitForTimeout(500);
    const ctr = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
    const dragTo = async (a, z) => { const [x1, y1] = await ctr(a), [x2, y2] = await ctr(z); await page.mouse.move(x1, y1); await page.mouse.down(); for (let k = 1; k <= 8; k++) { await page.mouse.move(x1 + (x2 - x1) * k / 8, y1 + (y2 - y1) * k / 8); await page.waitForTimeout(20); } };
    await dragTo('[data-ll="0"]', '[data-lr="2"]');
    const mid = await page.evaluate(() => ({ live: !!document.querySelector('.lnk-board svg .rope.live'), hov: !!document.querySelector('.lnk-card.hov') }));
    await page.screenshot({ path: OUT + '/lnk-drag.png' });
    await page.mouse.up(); await page.waitForTimeout(200);
    ok(mid.live && mid.hov, 'tijekom povlačenja vidi se konop i označeni cilj');
    let pr = await page.evaluate(() => document.querySelector('.lnk-board').dataset.pairs);
    ok(pr.split(',')[0] === '2', 'povlačenje spaja par (lijevo 0 → desno 2): ' + pr);
    // od desne strane prema lijevoj
    await dragTo('[data-lr="0"]', '[data-ll="1"]'); await page.mouse.up(); await page.waitForTimeout(200);
    pr = await page.evaluate(() => document.querySelector('.lnk-board').dataset.pairs);
    ok(pr.split(',')[1] === '0', 'povlačenje s desne strane radi (desno 0 → lijevo 1): ' + pr);
    // dodir-dodir
    await page.click('[data-ll="2"]'); await page.waitForTimeout(120); await page.click('[data-lr="1"]'); await page.waitForTimeout(200);
    pr = await page.evaluate(() => document.querySelector('.lnk-board').dataset.pairs);
    ok(pr.split(',')[2] === '1', 'dodir-dodir i dalje spaja: ' + pr);
    // preusmjeravanje: lijevo 0 na desno 1 (oduzima ga lijevom 2)
    await dragTo('[data-ll="0"]', '[data-lr="1"]'); await page.mouse.up(); await page.waitForTimeout(200);
    pr = await page.evaluate(() => document.querySelector('.lnk-board').dataset.pairs);
    ok(pr.split(',')[0] === '1' && pr.split(',')[2] === '-1', 'novi konop preuzima par: ' + pr);
    const n = await page.evaluate(() => document.querySelectorAll('[data-ll]').length);
    // dovrši sve preostale dodirom i pošalji
    for (let i = 0; i < n; i++) { const p = (await page.evaluate(() => document.querySelector('.lnk-board').dataset.pairs)).split(',').map(Number);
      if (p[i] >= 0) continue; const free = [...Array(n).keys()].find((j) => !p.includes(j)); await page.click('[data-ll="' + i + '"]'); await page.click('[data-lr="' + free + '"]'); await page.waitForTimeout(120); }
    const ropes = await page.evaluate(() => document.querySelectorAll('.lnk-board svg .rope').length);
    ok(ropes === n, 'svi parovi imaju konop (' + ropes + '/' + n + ')');
    await page.screenshot({ path: OUT + '/lnk-full.png' });
    await page.click('#lnkDone'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !!document.querySelector('.lnk.sent') || __t.game()._G.ph !== 'link'), 'slanje radi');
    ok(errs.length === 0, 'bez grešaka ' + errs.join(' | '));
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
