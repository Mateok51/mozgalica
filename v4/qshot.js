const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, cast: 0.2, q: 15 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  await p.waitForSelector('.p-opt', { timeout: 30000 }); await p.waitForTimeout(1200);
  await p.screenshot({ path: __dirname + '/tour/q-new.png' }); await b.close(); })();
