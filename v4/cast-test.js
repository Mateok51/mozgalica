const { chromium } = require('playwright'); const path = require('path');
const dir = path.join(__dirname, '..', 'v3'), out = path.join(__dirname, 'cast-shots'); require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await p.goto('file://' + path.join(dir, 'out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.5, vote: 2, voteShow: 0.5, power: 4, q: 3, reveal: 1 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  for (let round = 0; round < 2; round++) {
    // čekaj odabir moći na mobitelu i odaberi napad
    await p.waitForSelector('.pw-card', { timeout: 20000 }).catch(() => {});
    const btn = await p.$('.pw-card.atk') || await p.$('.pw-card'); if (btn) { await btn.click(); await p.waitForTimeout(150); const t = await p.$('[data-t]'); if (t) await t.click(); }
    if (round === 0) { await p.setViewportSize({ width: 1280, height: 720 }); const tv = await p.$('#toTv'); if (tv) await tv.click(); }
    await p.waitForSelector('#castStage', { timeout: 20000 });
    const n = await p.evaluate(() => document.querySelectorAll('.cact').length);
    for (let i = 0; i < 6; i++) { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/r${round}-${i}.png` }); }
    console.log('round', round, 'actors', n, 'banner', await p.$eval('#castBanner', (e) => e.textContent).catch(() => '(gotovo)'));
    if (round === 0) { await p.click('#toPhone'); await p.setViewportSize({ width: 390, height: 844 }); }
    await p.waitForSelector('#castStage', { state: 'detached', timeout: 15000 }).catch(() => {});
  }
  await p.waitForSelector('#castStage', { timeout: 30000 }); await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/phone.png` });
  console.log('errors', errs); await b.close();
})();
