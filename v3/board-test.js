'use strict';
// Ploča bodova sa 6 igrača: ekran se ne smanjuje, skrola se samo popis (moj red vidljiv). Početni ekran: glavna tipka „Igraj”. node v3/board-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = '/tmp/claude-0/-home-claude/49734958-2839-5e3f-a778-4ec741c0b014/scratchpad';
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-board.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.3, vote: 0.6, voteShow: 0.2, roul: 0.2, power: 0.5, cast: 0.2, q: 1.5, chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0], kr: { wait: 30, pactOffers: 0, offMax: 0, chFrom: 99, pactFrom: 99, offFrom: 99, pactChance: 0, offChance: 0, rope: 1, ropeWin: 7, ropeN: 10, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, pactMin: 3, taskWin: 400, taskLoss: 200 } };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    for (const [W, H] of [[360, 740], [390, 844]]) {
      const page = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: true })).newPage();
      await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
      await page.goto('file://' + TMP); await page.waitForTimeout(300);
      if (W === 390) { const t = await page.evaluate(() => [...document.querySelectorAll('.home button')].map((x) => x.id + ':' + x.textContent.trim()).join(' | ')); console.log('   početni: ' + t); ok(/hostp:Igraj/.test(t) && /host:Prikaži igru na TV-u/.test(t), 'glavna tipka „Igraj”, TV u drugom planu'); await page.screenshot({ path: OUT + '/home-new.png' }); }
      await page.click('#demo'); await page.waitForTimeout(250);
      await page.evaluate(() => __t.game().setBots(5)); await page.waitForTimeout(200); await page.click('#dstart');
      const r = await page.evaluate(() => new Promise((res) => { const g = __t.game(), P = __t.pid(); let last = -1; const t0 = Date.now();
        const iv = setInterval(() => { const G = g._G;
          if (G.ph === 'reveal' && Date.now() - G.startedAt > 6000) { const mb = document.querySelector('.mboard'); const me = mb && mb.querySelector('.rank-row.me');
            const vis = me ? (() => { const a = mb.getBoundingClientRect(), c = me.getBoundingClientRect(); return c.top >= a.top - 1 && c.bottom <= a.bottom + 1; })() : false;
            clearInterval(iv); return res({ z: document.getElementById('app').style.zoom || '1', scroll: mb ? mb.classList.contains('mb-scroll') : null, rows: mb ? mb.querySelectorAll('.rank-row').length : 0, vis, doc: (document.scrollingElement || document.documentElement).scrollHeight, ih: innerHeight }); }
          if (Date.now() - t0 > 30000) { clearInterval(iv); return res(null); }
          if (G.s === last) return; last = G.s; const s = G.s; const inp = G.ph === 'vote' ? { v: 0 } : G.ph === 'power' ? { p: '' } : G.ph === 'question' ? { c: 0 } : G.ph === 'reveal' ? null : { ok: 1 }; if (inp) g.setInput(P, Object.assign({ s }, inp)); }, 30); }));
      console.log('   ' + W + 'x' + H + ': ' + JSON.stringify(r));
      ok(r && +r.z >= 0.97 && r.rows === 6, W + ': ploča sa 6 igrača bez smanjivanja ekrana (mjerilo ' + (r && r.z) + ', skrol popisa ' + (r && r.scroll) + ')');
      ok(r && r.vis, W + ': moj red je vidljiv');
      await page.screenshot({ path: OUT + '/board-' + W + '.png' });
      await page.context().close();
    }
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
