// pitanje na mobitelu (odabran odgovor) + otkrivanje na TV-u + finale
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, cast: 0.2, q: 12, reveal: 6 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  await p.waitForSelector('.p-opt', { timeout: 30000 }); await p.waitForTimeout(900);
  await p.screenshot({ path: __dirname + '/tour/a-phone.png' });
  // ukloni efekt ako postoji pa odaberi
  for (let i = 0; i < 40 && await p.$('#fx'); i++) { const fx = await p.$('#fx'); const bb = await fx.boundingBox(); for (let k = 0; k < 8; k++) await p.mouse.click(bb.x + 20 + k * 30, bb.y + 40 + k * 40); await p.waitForTimeout(150); }
  await p.waitForTimeout(1100); const o = await p.$('.p-opt:not(:disabled)'); if (o) await o.click(); await p.waitForTimeout(400);
  await p.screenshot({ path: __dirname + '/tour/a-picked.png' });
  await p.setViewportSize({ width: 1280, height: 720 }); await p.click('#toTv'); await p.waitForTimeout(500); await p.screenshot({ path: __dirname + '/tour/a-tv.png' });
  await p.waitForFunction(() => !!document.querySelector('.opt.correct'), null, { timeout: 30000 }); await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/tour/a-tv-rev.png' }); console.log(errs); await b.close(); })();
