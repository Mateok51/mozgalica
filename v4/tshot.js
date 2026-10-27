const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, cast: 0.2, q: 10 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  await p.waitForSelector('.p-opt', { timeout: 30000 });
  for (const [t, n] of [[800, 'g'], [5300, 'a'], [3000, 'r']]) { await p.waitForTimeout(t); await p.screenshot({ path: __dirname + '/tour/t-' + n + '.png', clip: { x: 0, y: 120, width: 390, height: 60 } }); }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.click('#toTv'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/tour/t-tv.png', clip: { x: 0, y: 0, width: 1280, height: 300 } }); console.log(errs); await b.close(); })();
