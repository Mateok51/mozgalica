'use strict';
// Prijelaz pitanje → otkrivanje: pitanje i odgovori ne smiju poskočiti (zoom i položaj), a likovi ne smiju ostati i dolje. node v3/jerk-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-jerk.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; if (!h.includes(b)) throw new Error('sidro2');
  h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.3, vote: 0.6, voteShow: 0.2, roul: 0.2, power: 0.5, cast: 0.2, q: 4, chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0], kr: { wait: 0.3, pactOffers: 0, offMax: 0, chFrom: 99, pactFrom: 99, offFrom: 99, pactChance: 0, offChance: 0, rope: 1, ropeWin: 7, ropeN: 10, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, pactMin: 3, taskWin: 400, taskLoss: 200 } };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    for (const [W, H, ANS] of [[412, 915, 0], [390, 844, 0], [412, 915, 1], [390, 844, 1]]) {
      const page = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: true })).newPage();
      await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
      await page.addInitScript((a) => { window.__ANS = a; }, ANS);
      await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(250); await page.click('#dstart');
      const r = await page.evaluate(() => new Promise((res) => { const g = __t.game(), P = __t.pid(); let last = -1; const t0 = Date.now(); const samples = [];
        const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const z = parseFloat(document.getElementById('app').style.zoom || '1'); const r = e.getBoundingClientRect(); return [Math.round(r.top * z), Math.round(r.height * z)]; };
        const iv = setInterval(() => { const G = g._G;
          if (G.ph === 'question' || G.ph === 'reveal') samples.push({ ph: G.ph, t: Date.now() - t0, z: document.getElementById('app').style.zoom || '1', q: box('.p-q'), o: box('.p-opt'), row: (() => { const r = document.querySelector('.bar-row'); return r ? getComputedStyle(r).visibility : 'nema'; })() });
          if (samples.length && G.ph !== 'question' && G.ph !== 'reveal') { clearInterval(iv); return res(samples); }
          if (Date.now() - t0 > 30000) { clearInterval(iv); return res(samples); }
          if (G.s === last) return; last = G.s; const s = G.s; if (G.ph === 'vote') g.setInput(P, { s, v: 0 }); else if (G.ph === 'power') g.setInput(P, { s, p: '' }); else if (G.ph === 'intro' || G.ph === 'howto') g.setInput(P, { s, ok: 1 }); else if (G.ph === 'question' && window.__ANS) setTimeout(() => g.setInput(P, { s, c: 1 }), 600); }, 30); }));
      const qs = r.filter((x) => x.ph === 'question'), rs = r.filter((x) => x.ph === 'reveal');
      const lq = qs[qs.length - 1], fr = rs.slice(0, 15);
      const jumpQ = Math.max(...fr.map((x) => x.q ? Math.abs(x.q[0] - lq.q[0]) : 0)), jumpO = Math.max(...fr.map((x) => x.o ? Math.abs(x.o[0] - lq.o[0]) : 0));
      console.log('   ' + W + ': zoom pitanje ' + lq.z + ' → otkrivanje ' + [...new Set(fr.map((x) => x.z))].join(',') + ' · pomak pitanja ' + jumpQ + ' px, odgovora ' + jumpO + ' px · red likova u otkrivanju: ' + [...new Set(rs.map((x) => x.row))].join(','));
      ok(jumpQ <= 2 && jumpO <= 2, W + ': pitanje i odgovori ne poskoče kad istekne vrijeme');
      ok(rs.every((x) => x.row !== 'visible'), W + ': likovi u otkrivanju nisu i dolje u redu');
      await page.context().close();
    }
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
