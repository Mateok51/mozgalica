const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve('v3/out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, q: 2, bet: 1, qv: { who: 1, emoji: 1 } }));
  await page.click('#demo'); await page.waitForTimeout(300); await page.click('[data-av]:not([disabled])'); await page.click('#dstart');
  const t0 = Date.now();
  while (Date.now() - t0 < 200000) { await page.waitForTimeout(200); if (await page.$('#htok')) break; await page.evaluate(() => { const q = (s) => document.querySelector(s); const c = q('[data-v]:not([disabled])') || q('#nopw') || q('[data-c]:not([disabled])'); if (c) c.click(); }); }
  await page.waitForTimeout(1500); await page.screenshot({ path: 'flk/ht/m1.png' });
  const w0 = await page.evaluate(() => document.documentElement.dataset.ph); await page.waitForTimeout(4000);
  const w1 = await page.evaluate(() => document.documentElement.dataset.ph);
  console.log('upute nakon 4 s i dalje:', w0, w1);
  await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(400); await page.screenshot({ path: 'flk/ht/tv.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.click('#toPhone'); await page.waitForTimeout(300);
  await page.click('#htok'); await page.waitForTimeout(500);
  console.log('nakon potvrde:', await page.evaluate(() => document.documentElement.dataset.ph));
  console.log(errs.length ? 'ERR ' + errs.join('|') : 'bez JS grešaka'); await b.close();
})();
