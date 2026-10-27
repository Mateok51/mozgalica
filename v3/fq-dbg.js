'use strict';
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(__dirname, 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.5, vote: 1.5, voteShow: 0.3, power: 1.5, bet: 1, cast: 0.4, q: 2, reveal: 0.8, sort: 2, link: 2, chReveal: 0.5, fq: 6, fr: 1, fpower: 1.5, fstart: 1, moment: 0.8, duelIntro: 0.5, duel: 2, duelRes: 0.5, secret: 1.5 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.click('#dstart');
  await page.evaluate(() => { window.__mut = 0; new MutationObserver(() => window.__mut++).observe(document.getElementById('app'), { childList: true }); });
  await page.waitForFunction(() => document.documentElement.dataset.ph === 'fq', null, { timeout: 240000 });
  const m0 = await page.evaluate(() => window.__mut); await page.waitForTimeout(2000); const m1 = await page.evaluate(() => window.__mut);
  console.log('fq: re-renderi u 2s =', m1 - m0);
  const info = await page.evaluate(() => ({ cls: document.getElementById('app').className, two: !!document.querySelector('.p-opts.two'), anims: document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.p-opts')).map((a) => a.animationName + ':' + a.effect.getTiming().iterations) }));
  console.log(JSON.stringify(info));
  await browser.close();
})();
