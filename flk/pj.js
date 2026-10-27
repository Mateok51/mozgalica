const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve('v3/out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1.5, voteShow: 0.4, power: 1.5, q: 2.5, bet: 1.5, sort: 5, link: 5, order: 5, hilo: 5, blitz: 5, maj: 3, chReveal: 1.5, majReveal: 1, duel: 3, secret: 2, secret2: 2, howtoMax: 0.5 }));
  await page.click('#demo'); await page.waitForTimeout(300); await page.click('[data-av]:not([disabled])'); await page.click('#dstart');
  const t0 = Date.now(); let shot = 0;
  while (Date.now() - t0 < 400000 && shot < 3) {
    await page.waitForTimeout(200);
    const st = await page.evaluate(() => { const q = (s) => document.querySelector(s); const ph = document.documentElement.dataset.ph;
      const chip = !!q('.pj-chip'), rv = ph === 'reveal' && q('.rv-b') && +getComputedStyle(q('.rv-b')).opacity > 0.9 && !!q('.pjb');
      if (!chip) { const c = q('#htok') || q('[data-v]:not([disabled])') || q('#nopw') || q('[data-c]:not([disabled])') || q('#srtDone:not([disabled])'); if (c) c.click(); }
      return { chip, rv, ph }; });
    if (st.rv && shot === 0) { shot = 1; await page.screenshot({ path: 'flk/pj/1-reveal.png' }); await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300); await page.screenshot({ path: 'flk/pj/2-tv.png' }); await page.setViewportSize({ width: 390, height: 844 }); await page.click('#toPhone'); continue; }
    if (st.chip && shot === 1 && st.ph !== 'reveal') { shot = 2; await page.screenshot({ path: 'flk/pj/3-chip.png' }); await page.click('[data-pjopen]'); await page.waitForTimeout(900); await page.screenshot({ path: 'flk/pj/4-modal.png' }); await page.click('[data-pjx]'); shot = 3; }
    if (st.chip && st.ph !== 'reveal') await page.evaluate(() => { const q = (s) => document.querySelector(s); const c = q('[data-v]:not([disabled])') || q('#nopw') || q('[data-c]:not([disabled])'); if (c) c.click(); });
  }
  console.log('slika', shot, errs.length ? 'ERR ' + errs.join('|') : 'bez JS grešaka'); await b.close();
})();
