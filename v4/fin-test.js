const { chromium } = require('playwright'); const path = require('path');
const out = path.join(__dirname, 'cast-shots');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 1, cast: 0.2, q: 1.5, reveal: 0.3, sort: 1, link: 1, chReveal: 0.3, fstart: 4, fpower: 5, fq: 6, fr: 1.5 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  const shot = async (n) => { await p.screenshot({ path: `${out}/${n}.png` }); };
  await p.waitForFunction(() => /Krećeš s/.test(document.body.innerText), null, { timeout: 90000 });
  await shot('f-phone-start');
  await p.setViewportSize({ width: 1280, height: 720 }); await p.click('#toTv'); await p.waitForTimeout(400); await shot('f-tv-start');
  await p.click('#toPhone'); await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForSelector('.pw-card', { timeout: 20000 }); await shot('f-phone-power');
  const c = await p.$('.pw-card.atk'); await c.click(); await p.waitForTimeout(100); await (await p.$('[data-t]')).click();
  await p.setViewportSize({ width: 1280, height: 720 }); await p.click('#toTv'); await p.waitForTimeout(300); await shot('f-tv-power');
  await p.waitForSelector('#castStage', { timeout: 20000 }); await p.waitForTimeout(1500); await shot('f-tv-cast');
  await p.waitForSelector('.tf-row', { timeout: 20000 }); await p.waitForTimeout(500); await shot('f-tv-fq');
  await p.click('#toPhone'); await p.setViewportSize({ width: 390, height: 844 });
  // pričekaj sljedeće pitanje u kojem je igrač pogođen
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(2500); if (await p.$('.q-area .fx, .q-area [class*="fx"]')) { await shot('f-phone-fx'); break; } }
  await shot('f-phone-any');
  console.log('errors', errs); await b.close();
})();
