const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.evaluate(() => Object.assign(CFG, { intro: 1, vote: 3, voteShow: 1, power: 4, q: 12, reveal: 2 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  await page.waitForFunction(() => document.documentElement.dataset.ph === 'question' && document.querySelector('.bar-row'), null, { timeout: 60000 });
  const r = await page.evaluate(() => new Promise(res => {
    const seen = new Set(), out = []; const t0 = performance.now();
    const loop = () => {
      document.querySelectorAll('.bar-row .spr').forEach((e, i) => e.getAnimations().forEach(a => {
        const k = i + a.animationName; if (seen.has(k)) return; seen.add(k);
        out.push(a.animationName + ' prvi kadar t=' + Math.round(a.currentTime) + ' stanje=' + a.playState);
      }));
      if (performance.now() - t0 < 9000) requestAnimationFrame(loop); else res(out);
    }; loop();
  }));
  console.log(r.join('\n')); await b.close();
})();
