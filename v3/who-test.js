'use strict';
// Tko sam ja?: tragovi se otkrivaju po vremenu (svakih dur/5), a odgovori drugih igrača ne smiju otkriti trag ranije. Mobitel i TV.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-who.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; if (!h.includes(a)) throw new Error('sidro1');
  h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; if (!h.includes(b)) throw new Error('sidro2');
  h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.3, vote: 0.6, voteShow: 0.2, roul: 0.2, power: 0.5, cast: 0.2, pace: { n: { w: 1, s: 1, t: 0.3 }, t: { w: 1, s: 1, t: 0.3 }, d: { w: 1, s: 1, t: 0.3 } }, paceMo: 0.1, moment: 0.2,
  howto: 0.4, howtoMax: 0.6, howtoShort: 0.3, chal: ['sort'], qv: { who: 3, emoji: 0 }, sort: 1, chReveal: 0.3, betEvents: [0, 0], kr: { wait: 0.3, pactOffers: 0, offMax: 0, chFrom: 99, pactFrom: 99, offFrom: 99, pactChance: 0, offChance: 0, rope: 1, ropeWin: 7, ropeN: 10, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, pactMin: 3, taskWin: 400, taskLoss: 200 } };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    for (const view of ['phone', 'tv']) {
      const page = await (await b.newContext({ viewport: view === 'tv' ? { width: 1920, height: 1080 } : { width: 390, height: 844 }, hasTouch: view !== 'tv' })).newPage();
      await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
      await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(250);
      await page.click('#lobSettings'); await page.click('.len-c[data-len="brza"]'); await page.click('#dstart');
      if (view === 'tv') { await page.click('#toTv').catch(() => {}); }
      // do pitanja "Tko sam ja?" (čovjek ne odgovara, da se pitanje ne zatvori ranije)
      const got = await page.evaluate(() => new Promise((res) => { const g = __t.game(), P = __t.pid(); let last = -1; const t0 = Date.now();
        const iv = setInterval(() => { const G = g._G; if (G.ph === 'question' && G.q && G.q.k === 'who') { clearInterval(iv); return res(true); } if (Date.now() - t0 > 40000) { clearInterval(iv); return res(false); }
          if (G.s === last) return; last = G.s; const s = G.s; const inp = G.ph === 'vote' ? { v: 0 } : G.ph === 'power' ? { p: '' } : G.ph === 'question' ? { c: 0 } : { ok: 1 }; g.setInput(P, Object.assign({ s }, inp)); }, 20); }));
      ok(got, view + ': stiže pitanje Tko sam ja?');
      const log = await page.evaluate(() => new Promise((res) => { const g = __t.game(), out = []; const t0 = Date.now(), dur = g._G.dur; let answered = 0;
        const iv = setInterval(() => { const G = g._G; const el = Date.now() - t0;
          const vis = [...document.querySelectorAll('.whoq li')].filter((li) => parseFloat(getComputedStyle(li).opacity) > 0.5).length;
          const ans = g.view().P.filter((p) => p.ok).length; if (ans !== answered) { out.push({ el, ev: 'odgovor', ans }); answered = ans; }
          out.push({ el, vis, exp: Math.min(5, Math.floor(el / (dur / 5)) + 1) });
          if (G.ph !== 'question' || el > dur - 300) { clearInterval(iv); res({ out, dur }); } }, 100); }));
      const early = log.out.filter((x) => x.vis != null && x.vis > x.exp + 0 && x.el % (log.dur / 5) > 600);
      console.log('   ' + view + ' tragovi kroz vrijeme: ' + log.out.filter((x, i) => x.ev || i % 10 === 0).map((x) => x.ev ? '[odg ' + x.ans + ']' : Math.round(x.el / 100) / 10 + 's:' + x.vis + '/' + x.exp).join(' '));
      ok(early.length === 0, view + ': trag se ne pojavljuje prije svog vremena' + (early.length ? ' (' + early.slice(0, 3).map((x) => x.el + 'ms vidi ' + x.vis + ' umjesto ' + x.exp).join(', ') + ')' : ''));
      await page.context().close();
    }
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
