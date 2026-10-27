const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'web/site/index.html'));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  const t0 = Date.now(); let seen = [];
  while (Date.now() - t0 < 60000) {
    const ph = await p.evaluate(() => (document.querySelector('#castStage') ? 'CAST' : document.querySelector('.pw-card') ? 'power' : document.querySelector('.p-q,.p-opt') ? 'question' : '')).catch(() => '');
    if (ph && seen[seen.length - 1] !== ph) seen.push(ph);
    if (ph === 'power') { const c = await p.$('.pw-card.atk'); if (c) { await c.click(); await p.waitForTimeout(100); const t = await p.$('[data-t]'); if (t) await t.click(); } }
    if (seen.includes('question') && seen.length > 3) break;
    await p.waitForTimeout(200);
  }
  console.log(seen.join(' > '), errs); await b.close();
})();
