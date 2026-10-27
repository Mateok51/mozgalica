const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.2, vote: 0.5, voteShow: 0.2, power: 0.5, cast: 0.1, q: 0.6, reveal: 0.2, sort: 0.8, link: 90, chReveal: 8 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  await p.waitForSelector('.lnk [data-ll]', { timeout: 150000 }); await p.waitForTimeout(500);
  await p.screenshot({ path: __dirname + '/tour/l-0.png' });
  await p.click('[data-ll="0"]'); await p.waitForTimeout(150); await p.screenshot({ path: __dirname + '/tour/l-1.png' }); await p.click('[data-ll="0"]');
  const n = await p.$$eval('[data-ll]', (a) => a.length);
  for (let i = 0; i < n; i++) { await p.click('[data-ll="' + i + '"]'); await p.click('[data-lr="' + ((i + 1) % n) + '"]'); }
  await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/tour/l-2.png' });
  await p.click('#lnkDone'); await p.waitForSelector('.lnk.rev .lnk-card.ok, .lnk.rev .lnk-card.bad', { timeout: 40000 }); await p.waitForTimeout(600);
  await p.screenshot({ path: __dirname + '/tour/l-3.png' }); console.log(n, errs); await b.close(); })();
