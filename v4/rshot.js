const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, cast: 0.2, q: 3, reveal: 3 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  for (let r = 0; r < 2; r++) {
    await p.waitForSelector('.mboard .rank-row', { timeout: 40000 }); await p.waitForTimeout(r ? 450 : 1400);
    await p.screenshot({ path: __dirname + '/tour/r-' + r + '.png' });
    await p.waitForSelector('.mboard', { state: 'detached', timeout: 20000 });
    await p.waitForTimeout(200);
  }
  await p.setViewportSize({ width: 1280, height: 720 });
  console.log(errs); await b.close(); })();
