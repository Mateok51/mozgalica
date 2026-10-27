const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'web/site/index.html')); await p.waitForTimeout(500);
  await p.click('#demo'); await p.waitForTimeout(400); await p.click('.av-pick:not(:disabled):not(.me)'); await p.waitForTimeout(700);
  await p.screenshot({ path: __dirname + '/tour/lob-demo.png' }); await b.close(); })();
