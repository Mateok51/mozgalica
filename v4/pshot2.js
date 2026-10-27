const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'web/site/index.html')); await p.waitForTimeout(400);
  await p.click('#demo'); await p.waitForTimeout(300); await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 30, cast: 0.2, q: 2, reveal: 0.5 }));
  await p.click('#dstart');
  let got = {};
  for (let r = 0; r < 6 && !(got.a && got.b); r++) {
    await p.waitForSelector('.pw-card[data-p]', { timeout: 60000 }); await p.waitForTimeout(400);
    if (!got.s) { await p.screenshot({ path: __dirname + '/tour/pw2-0.png' }); got.s = 1; }
    const atk = await p.$('.pw-card.atk[data-p]'), buf = await p.$('.pw-card.buff[data-p]');
    if (!got.a && atk) { await atk.click(); await p.waitForTimeout(350); await p.screenshot({ path: __dirname + '/tour/pw2-1.png' }); await p.click('[data-t]'); await p.waitForTimeout(250); await p.screenshot({ path: __dirname + '/tour/pw2-2.png' }); got.a = 1; }
    else if (!got.b && buf) { await buf.click(); await p.waitForTimeout(250); await p.screenshot({ path: __dirname + '/tour/pw2-3.png' }); got.b = 1; }
    else await p.click('#nopw');
    await p.waitForSelector('.pw-card[data-p]', { state: 'detached', timeout: 60000 });
  }
  console.log(got, errs); await b.close(); })();
