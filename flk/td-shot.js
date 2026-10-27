const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve('v3/out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.5, vote: 2, voteShow: 1, power: 2, q: 3, bet: 2 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  const t0 = Date.now(); let n = 0, tv = false; const seen = new Set();
  while (Date.now() - t0 < 400000 && n < 4) {
    await page.waitForTimeout(200);
    const st = await page.evaluate(() => { const q = (s) => document.querySelector(s); const c = q('[data-v]:not([disabled])') || q('#nopw') || q('[data-c]:not([disabled])'); if (c) c.click(); const t = q('.tdl'); return t ? { id: t.dataset.mo, op: +getComputedStyle(t).opacity, cls: t.className, txt: t.innerText.replace(/\n/g, ' / ') } : null; });
    if (st && st.op > 0.95 && !seen.has(st.id)) {
      seen.add(st.id); n++;
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'flk/td/m' + n + '.png' });
      console.log('trenutak', st.id, st.cls, '·', st.txt);
      if (!tv) { tv = true; await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300); await page.screenshot({ path: 'flk/td/tv' + n + '.png' }); await page.setViewportSize({ width: 390, height: 844 }); await page.click('#toPhone'); }
    }
  }
  console.log(errs.length ? 'ERR ' + errs.join(' | ') : 'bez JS grešaka');
  await b.close();
})();
