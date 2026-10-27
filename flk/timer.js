const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 2, voteShow: 0.5, power: 2, q: 10 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  await page.evaluate(() => {
    window.__j = { up: 0, blank: 0, frames: 0, swaps: 0 }; let last = null, lastEl = null;
    const loop = () => {
      const t = document.getElementById('tbar'), n = document.getElementById('tnum');
      if (document.documentElement.dataset.ph === 'question' && t) {
        const w = t.getBoundingClientRect().width, W = t.parentElement.getBoundingClientRect().width || 1, fr = w / W;
        if (t !== lastEl) { if (lastEl) window.__j.swaps++; lastEl = t; }
        if (last != null && fr > last + 0.02) window.__j.up++;
        if (n && !n.textContent) window.__j.blank++;
        last = fr; window.__j.frames++;
      } else last = null;
      requestAnimationFrame(loop);
    }; loop();
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await page.waitForTimeout(300);
    await page.evaluate(() => { const q = (s) => document.querySelector(s); const c = q('#htok') || q('[data-v]:not([disabled])') || q('#nopw'); if (c) c.click(); });
  }
  console.log(JSON.stringify(await page.evaluate(() => window.__j)));
  await b.close();
})();
