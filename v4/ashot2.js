const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'web/site/index.html')); await p.waitForTimeout(400);
  await p.click('#demo'); await p.waitForTimeout(300); await p.evaluate(() => { CFG.intro = 3.5; });
  await p.click('#dstart'); await p.waitForSelector('.ann'); 
  for (const [t, n] of [[150, 'a'], [450, 'b'], [900, 'c']]) { await p.waitForTimeout(t); await p.screenshot({ path: __dirname + '/tour/an-' + n + '.png' }); }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.click('#toTv'); await p.waitForTimeout(200); await p.screenshot({ path: __dirname + '/tour/an-tv.png' });
  console.log(errs); await b.close(); })();
