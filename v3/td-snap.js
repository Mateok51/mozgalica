'use strict';
// Slike Tavern Director faza (mobitel + TV) u demo igri s botovima.
const { chromium } = require('playwright');
const path = require('path');
const shots = path.join(__dirname, 'shots');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(__dirname, 'out.html'));
  await page.evaluate(() => { Object.assign(CFG, { intro: 0.8, vote: 3, voteShow: 0.5, power: 3, bet: 2, cast: 0.6, q: 5, reveal: 2, sort: 4, link: 4, chReveal: 1, fq: 3, fr: 1, fpower: 2, fstart: 1.5, moment: 3, duelIntro: 3, duel: 8, duelRes: 3, secret: 6, secretChance: 1 }); Object.assign(FLAGS, { ENABLE_SECRET_HELP: true }); });
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.click('#dstart');
  const want = ['moment', 'duelIntro', 'duel', 'duelResult', 'secret', 'secret2'];
  const got = {};
  const t0 = Date.now();
  while (Date.now() - t0 < 6 * 60 * 1000) {
    await page.waitForTimeout(250);
    const ph = await page.evaluate(() => document.documentElement.dataset.ph || '?');
    if (want.includes(ph) && !got[ph]) {
      got[ph] = 1;
      await page.waitForTimeout(ph === 'moment' || ph === 'duelIntro' ? 900 : 300);
      await page.screenshot({ path: shots + '/td-' + ph + '.png' });
      const tag = await page.evaluate(() => (document.querySelector('.tm-t') || document.querySelector('.du-k') || document.querySelector('.se-k') || {}).textContent || '');
      console.log('faza', ph, '→', tag);
      if (ph !== 'duel') { await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(250); await page.screenshot({ path: shots + '/td-tv-' + ph + '.png' }); await page.click('#toPhone'); await page.setViewportSize({ width: 390, height: 844 }); }
    }
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s); const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
      if (q('#dagain')) return 'end';
      click('[data-v]:not([disabled])') || click('[data-bet]:not([disabled])') || click('[data-sx]') || click('[data-sy="1"]') || click('[data-t]') || click('[data-p]') || click('.p-opts.two [data-c]:not([disabled])') || click('[data-c]:not([disabled]):not(.locked)') || click('#srtDone:not([disabled])') || click('#lnkDone:not([disabled])');
      return '';
    });
    if (r === 'end') break;
  }
  console.log('snimljeno:', Object.keys(got).join(', '), '| greške:', errors.length ? errors : 'nema');
  await browser.close();
})();
