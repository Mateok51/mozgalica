const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve('v3/out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, q: 2, bet: 1, qv: { who: 2, emoji: 0 } }));
  await page.click('#demo'); await page.waitForTimeout(300); await page.click('[data-av]:not([disabled])'); await page.click('#dstart');
  let n = 0; const t0 = Date.now();
  while (Date.now() - t0 < 300000 && n < 4) { await page.waitForTimeout(200);
    if (await page.$('#htok')) { n++; await page.waitForTimeout(1600); await page.screenshot({ path: 'flk/ht/u' + n + '.png' });
      if (await page.$('#htfull')) { await page.click('#htfull'); await page.waitForTimeout(300); await page.screenshot({ path: 'flk/ht/u3.png' }); }
      await page.click('#htok'); continue; }
    await page.evaluate(() => { const q = (s) => document.querySelector(s); const c = q('[data-v]:not([disabled])') || q('#nopw') || q('[data-c]:not([disabled])'); if (c) c.click(); }); }
  console.log('upute viđene', n, errs.length ? 'ERR ' + errs.join('|') : 'bez JS grešaka'); await b.close();
})();
