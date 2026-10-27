const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'web/site/index.html')); await p.waitForTimeout(400);
  await p.click('#demo'); await p.waitForTimeout(300); await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, cast: 0.2, q: 5, reveal: 7 }));
  await p.click('#dstart');
  // drugo pitanje (da poredak već postoji)
  for (let r = 0; r < 2; r++) { await p.waitForSelector('.rv', { timeout: 60000 }); if (r === 0) await p.waitForSelector('.rv', { state: 'detached', timeout: 30000 }); }
  for (const [t, n] of [[250, 'a'], [900, 'b'], [1700, 'c']]) { await p.waitForTimeout(t); await p.screenshot({ path: __dirname + '/tour/rv-' + n + '.png' }); }
  await p.waitForSelector('.rv', { state: 'detached', timeout: 30000 }); await p.waitForSelector('.rv', { timeout: 60000 });
  await p.setViewportSize({ width: 1280, height: 720 }); await p.click('#toTv'); await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/tour/rv-tv1.png' });
  await p.waitForTimeout(2600); await p.screenshot({ path: __dirname + '/tour/rv-tv2.png' });
  console.log(errs); await b.close(); })();
