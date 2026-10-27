const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html')); await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/cast-shots/h-phone.png' });
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(500); await p.screenshot({ path: __dirname + '/cast-shots/h-tv.png' }); await b.close(); })();
