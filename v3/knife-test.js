'use strict';
// Ponovno iscrtavanje ekrana otkrivanja (npr. dodir „Pripremi izdaju“ u paktu) ne smije vratiti prikaz pitanja i odgovora.
// node v3/knife-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-knife.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID, render: () => phoneRender(true) };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.3, vote: 1, voteShow: 0.5, roul: 0.3, chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0], reveal: 12 };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
    await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(250); await page.click('#dstart');
    await page.waitForFunction(() => __t.game()._G.ph === 'question', null, { timeout: 30000 });
    await page.click('#app .p-opt', { force: true }).catch(() => {});
    await page.waitForFunction(() => __t.game()._G.ph === 'reveal', null, { timeout: 40000 });
    await page.waitForFunction(() => { const e = document.querySelector('#app .rv-b'); return e && +getComputedStyle(e).opacity > 0.99; }, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const vis = await page.evaluate(async () => {
      const out = []; __t.render();
      for (let i = 0; i < 30; i++) { const a = document.querySelector('#app .rv-a'), bb = document.querySelector('#app .rv-b'); out.push([+getComputedStyle(a).opacity, +getComputedStyle(bb).opacity]); await new Promise((r) => requestAnimationFrame(r)); }
      return out; });
    const maxA = Math.max(...vis.map((x) => x[0])), minB = Math.min(...vis.map((x) => x[1]));
    ok(maxA < 0.05 && minB > 0.95, 'nakon ponovnog iscrtavanja ostaje ploča bodova (pitanje ' + maxA.toFixed(2) + ', ploča najmanje ' + minB.toFixed(2) + ')');
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
