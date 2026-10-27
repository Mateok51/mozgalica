'use strict';
const { chromium } = require('playwright');
const path = require('path');
const shots = path.join(__dirname, 'shots');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(__dirname, 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.6, vote: 2, voteShow: 0.4, power: 2, bet: 2, cast: 0.5, q: 3, reveal: 7, sort: 3, link: 3, chReveal: 6, fq: 3, fr: 5, fpower: 1.5, fstart: 1, duelIntro: 1, duel: 3, duelRes: 1, secret: 2 }));
  await page.click('#demo'); await page.waitForTimeout(500);
  await page.screenshot({ path: shots + '/likovi.png' });
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(300);
  await page.screenshot({ path: shots + '/likovi-lobby.png' });
  await page.click('#dstart');
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 300000 && n < 2) {
    await page.waitForTimeout(200);
    if (await page.$('.tdl')) {
      await page.waitForTimeout(3300); n++;
      await page.screenshot({ path: shots + '/tdl-' + n + '.png' });
      await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(3300);
      await page.screenshot({ path: shots + '/tdl-tv-' + n + '.png' });
      await page.click('#toPhone'); await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => !document.querySelector('.tdl'), null, { timeout: 20000 }).catch(() => {});
      continue;
    }
    await page.evaluate(() => {
      const q = (s) => document.querySelector(s); const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
      click('[data-v]:not([disabled])') || click('[data-bet]:not([disabled])') || click('[data-sx]') || click('[data-t]') || click('[data-p]') || click('.p-opts.two [data-c]:not([disabled])') || click('[data-c]:not([disabled]):not(.locked)') || click('#srtDone:not([disabled])') || click('#lnkDone:not([disabled])');
    });
  }
  console.log('tdl snimki:', n, errors);
  await browser.close();
})();
