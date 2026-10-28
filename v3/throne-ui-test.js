'use strict';
// Krčmarovo prijestolje u demu (prava izgradnja): odabir u predvorju, dvorana, posljednji rizik (jedan dodir), ploča, pobjednik. 390x844 + TV.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/claude-0/-home-claude/49734958-2839-5e3f-a778-4ec741c0b014/scratchpad/th'; fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-th.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  h = h.replace('</head>', '<style>@font-face { font-family: "Cinzel"; src: url("file://' + path.join(__dirname, '..', 'fonts', 'Cinzel-wght.ttf') + '"); font-weight: 800; }</style></head>');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.5, vote: 1, voteShow: 0.4, roul: 0.3, power: 1.2, fpower: 1.2, cast: 0.3, q: 3, tstart: 2.5, trisk: 4, chal: ['sort'], sort: 2, link: 2, chReveal: 0.5, howto: 0.5, howtoMax: 1, howtoShort: 0.4, qv: { who: 0, emoji: 0 }, betEvents: [0, 0], pace: { n: { w: 1, s: 1, t: 2.5 }, t: { w: 1, s: 1, t: 2.5 }, d: { w: 1, s: 1, t: 2.5 } },
  kr: { wait: 1.5, pactOffers: 0, offMax: 0, chFrom: 99, pactFrom: 99, offFrom: 99, pactChance: 0, offChance: 0, rope: 1, ropeWin: 7, ropeN: 10, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, pactMin: 3, taskWin: 400, taskLoss: 200 } };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); await page.route(/fonts\.g|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
    await page.goto('file://' + TMP + '?demotv=1'); await page.click('#demo'); await page.waitForTimeout(250);
    await page.click('#lobSettings'); await page.waitForTimeout(150);
    ok(await page.$$eval('.end-c', (x) => x.length) === 2 && await page.$eval('.end-c.on', (e) => e.dataset.end) === 'pyr', 'predvorje: dva završetka, zadana Piramida');
    await page.click('.len-c[data-len="brza"]'); await page.click('.end-c[data-end="throne"]'); await page.waitForTimeout(150);
    ok(await page.$eval('.end-c.on', (e) => e.dataset.end) === 'throne', 'odabrano Krčmarovo prijestolje');
    await page.screenshot({ path: OUT + '/0-lobby.png' });
    await page.click('#dstart');
    const shots = {}; const t0 = Date.now(); let riskClicked = false, overflow = [];
    while (Date.now() - t0 < 170000) {
      const st = await page.evaluate(() => { const g = __t.game(), G = g._G; return { ph: G.ph, th: !!G.throne, s: G.s, tq: G.tq || 0, last: G.q && G.q.last, tie: G.q && G.q.tie }; });
      if (st.ph === 'final') { await page.waitForTimeout(1500); await page.screenshot({ path: OUT + '/9-final.png' }); break; }
      const key = st.th ? st.ph + (st.ph === 'reveal' || st.ph === 'question' ? (st.last ? '-last' : st.tq === 1 ? '-1' : '') : '') : '';
      if (key && !shots[key]) { shots[key] = 1; await page.waitForTimeout(st.ph === 'reveal' ? 2000 : 600); await page.screenshot({ path: OUT + '/' + Object.keys(shots).length + '-' + key + '.png' });
        const of = await page.evaluate(() => { const se = document.scrollingElement || document.documentElement; return se.scrollHeight > innerHeight + 1; }); if (of) overflow.push(key); }
      if ((key === 'tstart' || key === 'trisk') && !shots['tv-' + key]) { shots['tv-' + key] = 1; await page.setViewportSize({ width: 1920, height: 1080 }); await page.click('#toTv').catch(() => {}); await page.waitForTimeout(500);
        const tvok = await page.evaluate(() => !!document.querySelector('.tv .throne-hall, #app.tv .throne-hall') || !!document.querySelector('.throne-hall')); if (!tvok) overflow.push('tv-' + key + ':nema dvorane');
        await page.screenshot({ path: OUT + '/tv-' + key + '.png' }); await page.click('#toPhone').catch(() => {}); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200); }
      if (st.ph === 'trisk' && !riskClicked) { riskClicked = true; await page.click('.risk-c.r2'); await page.waitForTimeout(200);
        const r = await page.evaluate(() => ({ on: !!document.querySelector('.risk-c.r2.on'), dis: [...document.querySelectorAll('.risk-c')].every((x) => x.disabled), pv: (__t.game().priv(__t.pid()) || {}).trk }));
        ok(r.on && r.dis && r.pv === 2, 'posljednji rizik: jedan dodir, odluka zaključana (' + JSON.stringify(r) + ')'); await page.screenshot({ path: OUT + '/r-risk.png' }); }
      await page.evaluate(() => { const g = __t.game(), G = g._G, P = __t.pid(); if (window.__ls === G.s) return; window.__ls = G.s; const s = G.s;
        const inp = G.ph === 'vote' ? { v: 0 } : G.ph === 'power' ? { p: '' } : G.ph === 'question' ? { c: G.q.a, t: 900 } : G.ph === 'trisk' ? null : { ok: 1 };
        if (inp) setTimeout(() => g.setInput(P, Object.assign({ s }, inp)), G.ph === 'question' ? 900 : 300); });
      await page.waitForTimeout(120);
    }
    const fin = await page.evaluate(() => { const v = __t.game().view(); return { ph: v.ph, win: v.win, th: !!v.th, rows: [...document.querySelectorAll('.mboard .rank-row .sc')].map((e) => e.textContent).join(' ') }; });
    ok(fin.ph === 'final' && fin.th, 'igra završava prijestoljem; završna ploča s bodovima: ' + fin.rows);
    ok(shots.tstart && shots['reveal-1'] && shots.trisk && shots['reveal-last'], 'faze: dvorana, ploča, rizik, zadnja ploča (' + Object.keys(shots).join(',') + ')');
    ok(overflow.length === 0, 'stranica se ne skrola ni u jednoj fazi prijestolja' + (overflow.length ? ' (' + overflow.join(',') + ')' : ''));
    ok(errs.length === 0, 'bez grešaka ' + errs.join(' | '));
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
