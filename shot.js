const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.argv[2]);
  let prev = 0;
  for (const [t, n] of [[2750, 'a'], [3500, 'b'], [8600, 'c'], [10500, 'd']]) { await p.waitForTimeout(t - prev); prev = t; await p.screenshot({ path: process.argv[3] + n + '.png' }); }
  console.log('errors', errs); await b.close();
})();
