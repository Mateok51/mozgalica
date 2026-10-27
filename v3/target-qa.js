'use strict';
// Dodirne površine < 44px i horizontalni scroll na 4 tipična mobitela, kroz prvi dio partije.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of [[360, 800], [390, 844], [412, 915], [430, 932]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage();
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto('file://' + path.join(__dirname, 'out.html'));
    await page.evaluate(() => Object.assign(CFG, { intro: 0.8, vote: 2.5, voteShow: 0.5, power: 2.5, bet: 2, cast: 0.6, q: 3, reveal: 1.5, sort: 4, link: 4, chReveal: 1, fq: 2, fr: 1, fpower: 1.5, fstart: 1.5 }));
    const small = {}, hs = {};
    const scan = async (tag) => {
      const r = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('button, a[href], input, [role=button], [data-v], [data-p], [data-t], [data-c], [data-bet], [data-av]')) {
          const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          if (!b.width || cs.visibility === 'hidden' || el.disabled || el.closest('.scene-ghost')) continue;
          if (b.width < 44 || b.height < 44) out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 2).join('.')) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
        }
        return { out, hs: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      r.out.forEach((k) => { small[k.replace(/ \d+x\d+$/, '')] = tag + ' ' + k.match(/\d+x\d+$/)[0]; });
      if (r.hs) hs[tag] = 1;
    };
    await scan('home');
    await page.click('#demo'); await page.waitForTimeout(300); await scan('avatar');
    await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(300); await scan('lobby');
    await page.click('#dstart');
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      await page.waitForTimeout(300);
      const ph = await page.evaluate(() => document.documentElement.dataset.ph || '?');
      await scan(ph);
      const r = await page.evaluate(() => {
        const q = (s) => document.querySelector(s); const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
        if (q('#dagain')) return 'end';
        click('[data-v]:not([disabled])') || click('[data-bet]:not([disabled])') || click('[data-t]') || click('[data-p]') || click('.p-opts.two [data-c]:not([disabled])') || click('[data-c]:not([disabled]):not(.locked)') || click('#srtDone:not([disabled])') || click('#lnkDone:not([disabled])');
        return '';
      });
      if (r === 'end') { await scan('final'); break; }
    }
    console.log(w + 'x' + h, 'h-scroll:', JSON.stringify(hs));
    for (const k of Object.keys(small).sort()) console.log('   <44  ' + k + '  (' + small[k] + ')');
    await page.context().close();
  }
  await browser.close();
})();
