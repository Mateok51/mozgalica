const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'web/site/index.html')); await p.waitForTimeout(1200);
  await p.screenshot({ path: __dirname + '/tour/h-390.png' });
  await p.setViewportSize({ width: 360, height: 640 }); await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/tour/h-360.png' });
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/tour/h-tv.png' });
  console.log(errs, await p.evaluate(() => document.documentElement.scrollHeight)); await b.close(); })();
