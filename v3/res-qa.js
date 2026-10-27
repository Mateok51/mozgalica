'use strict';
// Popis slika koje igra stvarno učita (mobitel + TV) kroz cijelu partiju.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const got = {}, fail = [];
  let ph = 'boot';
  page.on('request', (r) => { const u = r.url(); const m = u.match(/v3\/((ui|chars|audio)\/.+)$/); if (m && !got[m[1]]) got[m[1]] = ph; });
  page.on('requestfailed', (r) => fail.push(r.url()));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(__dirname, 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.8, vote: 2, voteShow: 0.5, power: 2, bet: 1.5, cast: 0.6, q: 3, reveal: 1.5, sort: 3, link: 3, chReveal: 1, fq: 2, fr: 1, fpower: 1.5, fstart: 1.5 }));
  ph = 'home';
  await page.click('#demo'); await page.waitForTimeout(300); ph = 'avatar';
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(300); ph = 'lobby';
  await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(400); ph = 'tvlobby';
  await page.click('#toPhone'); await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#dstart');
  const t0 = Date.now(); let n = 0, seenPh = {};
  while (Date.now() - t0 < 4 * 60 * 1000) {
    await page.waitForTimeout(250);
    ph = await page.evaluate(() => document.documentElement.dataset.ph || '?');
    if (!seenPh[ph]) { seenPh[ph] = 1; ph = 'tv:' + ph; await page.click('#toTv').catch(() => {}); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300); await page.click('#toPhone').catch(() => {}); await page.setViewportSize({ width: 390, height: 844 }); }
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s); const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
      if (q('#dagain')) return 'end';
      click('[data-v]:not([disabled])') || click('[data-bet]:not([disabled])') || click('[data-t]') || click('[data-p]') || click('.p-opts.two [data-c]:not([disabled])') || click('[data-c]:not([disabled]):not(.locked)') || click('#srtDone:not([disabled])') || click('#lnkDone:not([disabled])');
      return '';
    });
    if (r === 'end') { await page.waitForTimeout(800); break; }
  }
  console.log(JSON.stringify(got, null, 1));
  console.log('FAIL', fail.filter((u) => /v3\//.test(u)));
  await browser.close();
})();
