'use strict';
// Glasanje: vrata se ne pomiču kad igrač glasa, iskoristi power pick ili istekne vrijeme (power pick ostaje na mjestu, siv). node v3/vote-stable-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-vote.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.3, vote: 5, voteShow: 2, roul: 0.3, chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0] };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    for (const [W, H, how] of [[412, 915, 'glas'], [412, 915, 'pick'], [390, 844, 'isteklo'], [360, 740, 'pick']]) {
      const page = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: true })).newPage();
      await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
      await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(250); await page.click('#dstart');
      await page.waitForSelector('.door-btn', { timeout: 10000 }); await page.waitForTimeout(500);
      const pos = () => page.evaluate(() => { const z = parseFloat(document.getElementById('app').style.zoom || '1'); const r = document.querySelector('.door-btns').getBoundingClientRect(); const pp = document.querySelector('.pp-bar');
        return { z, top: Math.round(r.top * z), left: Math.round(r.left * z), pp: pp ? pp.className : 'nema', ph: __t.game()._G.ph }; });
      const p0 = await pos(); const seen = [p0];
      if (how === 'glas') await page.click('.door-btn.o1', { force: true });
      if (how === 'pick') { await page.click('#ppBtn', { force: true }); await page.waitForTimeout(150); await page.click('.door-btn.o2', { force: true }); }
      for (let i = 0; i < (how === 'isteklo' ? 40 : 14); i++) { await page.waitForTimeout(150); seen.push(await pos()); }
      if (process.env.DBG) console.log(seen.map((x) => x.ph + ":" + x.z + ":" + x.top).join(" "));
      const moved = Math.max(...seen.map((x) => Math.max(Math.abs(x.top - p0.top), Math.abs(x.left - p0.left)))), zs = [...new Set(seen.map((x) => x.z))];
      ok(moved <= 1 && zs.length === 1, W + ' (' + how + '): vrata ostaju na mjestu (pomak ' + moved + ' px, mjerilo ' + zs.join(',') + ', faze ' + [...new Set(seen.map((x) => x.ph))].join('→') + ')');
      ok(seen.every((x) => x.pp !== 'nema') && /off/.test(seen[seen.length - 1].pp), W + ' (' + how + '): power pick ostaje, poslije siv (' + seen[seen.length - 1].pp + ')');
      await page.context().close();
    }
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
