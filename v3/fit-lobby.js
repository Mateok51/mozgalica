'use strict';
// Predvorje: s 6 igrača (4+ botova) ne smije se skrolati cijela stranica; dugi popis igrača skrola se iznutra. Pokretanje: node v3/fit-lobby.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); const TMP = path.join(__dirname, '..', 'web', 'site', '_out-fit-lobby.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, ''); const b = "let S = null, lastSig = '';"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
(async () => {
  const br = await chromium.launch(); let bad = 0;
  for (const [W, H, view] of [[390, 844, 'phone'], [412, 915, 'phone'], [360, 780, 'phone'], [1920, 1080, 'tv']]) {
    const ctx = await br.newContext({ viewport: { width: W, height: H }, hasTouch: view === 'phone' }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(300); await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
    for (const nb of [1, 3, 5]) {
      await page.evaluate((n) => window.__t.game().setBots(n), nb); await page.waitForTimeout(500);
      if (view === 'tv') await page.evaluate(() => { const b = document.getElementById('toTv'); if (b) b.click(); });
      await page.waitForTimeout(500);
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => { const se = document.scrollingElement || document.documentElement, app = document.getElementById('app'); return { ps: se.scrollHeight - innerHeight, fit: app.dataset.fitover, cls: app.className.includes('fit-scroll'), n: document.querySelectorAll('.lob-players *').length }; });
      console.log(W + 'x' + H + ' ' + view + ' botova=' + nb + ' ' + JSON.stringify(r)); if (r.ps > 1 || +r.fit > 2) bad++;
      if (nb === 5) await page.screenshot({ path: OUT + '/fit-lobby-' + W + 'x' + H + '-' + view + '.png' });
    }
    if (errs.length) { console.log('GREŠKE', errs[0]); bad++; }
    await ctx.close();
  }
  await br.close(); try { fs.unlinkSync(TMP); } catch (e) {}
  console.log(bad ? 'PROVJERI ' + bad : 'SVE OK'); process.exit(bad ? 1 : 0);
})();
