const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.2, vote: 0.6, voteShow: 0.2, power: 0.6, cast: 0.1, q: 0.8, reveal: 0.2, sort: 60, chReveal: 8 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  await p.waitForSelector('.srt-pool .srt-card', { timeout: 90000 }); await p.waitForTimeout(600);
  await p.screenshot({ path: __dirname + '/tour/s-0.png' });
  // pravo povlačenje mišem: prva kartica u lijevu zonu, druga u desnu
  const drag = async (z) => { const c = await (await p.$('.srt-pool .srt-card')).boundingBox(); const t = await (await p.$('.srt-zone[data-z="' + z + '"]')).boundingBox();
    await p.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await p.mouse.down(); await p.mouse.move(c.x + 30, c.y - 20, { steps: 4 });
    await p.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 }); return async () => { await p.mouse.up(); }; };
  let up = await drag(0); await p.screenshot({ path: __dirname + '/tour/s-1.png' }); await up();
  up = await drag(1); await up();
  // ostale klikom: kartica pa zona
  let k = 0; while (await p.$('.srt-pool .srt-card')) { await p.click('.srt-pool .srt-card'); await p.click('.srt-zone[data-z="' + (k++ % 2) + '"] h4'); }
  // premjesti jednu karticu natrag povlačenjem iz zone u zonu
  await p.screenshot({ path: __dirname + '/tour/s-2.png' });
  await p.click('#srtDone'); await p.waitForSelector('.srt-zones .srt-card.ok, .srt-zones .srt-card.bad', { timeout: 30000 }); await p.waitForTimeout(500);
  await p.screenshot({ path: __dirname + '/tour/s-3.png' }); console.log(errs); await b.close(); })();
