const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r => r.abort());
  await page.goto('file://' + path.join(__dirname, '..', 'v3', 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 1, vote: 8, voteShow: 2, power: 12, q: 12, reveal: 2 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  await page.waitForSelector('[data-v]:not([disabled])', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__sw = 0; window.__log = [];
    const app = document.getElementById('app');
    new MutationObserver(ms => { if (ms.some(m => m.type === 'childList' && m.target === app)) window.__sw++; }).observe(app, { childList: true });
    const t0 = performance.now();
    const samp = () => {
      const el = document.querySelector('.door-btn.picked, [data-v][data-bv="picked"]') ;
      const all = [...document.querySelectorAll('[data-v]')].map(e => { const cs = getComputedStyle(e); return cs.transform.slice(0,30) + '|' + cs.opacity; });
      const cl=[...document.querySelectorAll('[data-v]')].map(e=>e.className.replace('door-btn ','')+(e.disabled?'/D':'')+'/'+e.dataset.bv).join(' '); const an = el ? el.getAnimations({ subtree: true }).map(a => a.animationName + '@' + Math.round(a.currentTime)).join(',') : '';
      window.__log.push([Math.round(performance.now() - t0), window.__sw, cl, document.documentElement.dataset.ph, an.replace(/@\d+/g,''), all.join(' ')]);
      if (performance.now() - t0 < 9000) requestAnimationFrame(samp);
    };
    requestAnimationFrame(samp);
  });
  await page.click('[data-v]:not([disabled])');
  await page.waitForTimeout(9200);
  const log = await page.evaluate(() => window.__log);
  let prev = '';
  for (const r of log) { const k = r.slice(1).join(' ; '); if (k !== prev) console.log(r.join(' ; ')); prev = k; }
  // phase: power targets
  await b.close();
})();
