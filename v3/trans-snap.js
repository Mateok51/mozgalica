'use strict';
const { chromium } = require('playwright');
const path = require('path');
const dir = __dirname, shots = path.join(dir, 'shots');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(dir, 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 1.5, vote: 3, voteShow: 1, power: 3, q: 5, reveal: 3 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.click('#dstart');
  await page.evaluate(() => {
    window.__n = 0;
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('scene-ghost') && window.__n < 4 && !window.__hold) {
      setTimeout(() => { document.getAnimations().forEach((a) => a.pause()); window.__hold = document.documentElement.dataset.ph; }, 75);
    } }).observe(document.body, { childList: true });
  });
  for (let k = 0; k < 4; k++) {
    await page.waitForFunction(() => window.__hold, null, { timeout: 60000 });
    const ph = await page.evaluate(() => window.__hold);
    await page.screenshot({ path: shots + '/trans-' + k + '-' + ph + '.png' });
    await page.evaluate(() => { document.getAnimations().forEach((a) => a.play()); window.__hold = null; window.__n++; });
  }
  await browser.close();
})();
