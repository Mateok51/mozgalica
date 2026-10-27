'use strict';
// QA za polish: prazni kadrovi, horizontalni scroll, beskonačne animacije po fazi, ostaci ghost slojeva.
const { chromium } = require('playwright');
const path = require('path');
const dir = __dirname, shots = path.join(dir, 'shots');
const W = +(process.argv[2] || 390), H = +(process.argv[3] || 844);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: process.env.REDUCE ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(dir, 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 1.5, vote: 4, voteShow: 1, power: 4, bet: 3, q: 6, reveal: 3, sort: 8, link: 8, chReveal: 2, fq: 4, fr: 1.5, fpower: 3, fstart: 3 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  await page.evaluate(() => {
    const R = window.__qa = { blank: 0, hscroll: {}, inf: {}, ghosts: 0, phases: [] };
    const app = document.getElementById('app');
    let ph = '';
    const loop = () => {
      const p = document.documentElement.dataset.ph || '?';
      if (p !== ph) { ph = p; R.phases.push(p); }
      if (!app.firstElementChild && !document.querySelector('.scene-ghost')) R.blank++;
      if (document.documentElement.scrollWidth > innerWidth + 1) R.hscroll[p] = (R.hscroll[p] || 0) + 1;
      if (document.querySelectorAll('.scene-ghost').length > 1) R.ghosts++;
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.getTiming && a.effect.getTiming();
        if (t && t.iterations === Infinity && a.playState === 'running') {
          const el = a.effect.target; const k = p + ' :: ' + (a.animationName || '?') + ' @ ' + (el && el.className && el.className.baseVal === undefined ? String(el.className).split(' ').slice(0, 3).join('.') : el && el.tagName);
          R.inf[k] = 1;
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const t0 = Date.now(); let done = false, mid = 0;
  while (Date.now() - t0 < 5 * 60 * 1000) {
    await page.waitForTimeout(200);
    if (mid < 3 && await page.$('.scene-ghost')) { await page.screenshot({ path: shots + '/trans-' + (++mid) + '.png' }); }
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
      if (q('#dagain')) return 'end';
      if (q('#fx')) { const b = q('#bomb, .fly-bomb'); return 'fx'; }
      click('[data-v]:not([disabled])') || click('[data-bet]:not([disabled])') || click('[data-t]') || click('[data-p]') ||
        click('.p-opts.two [data-c]:not([disabled])') || click('[data-c]:not([disabled]):not(.locked)') || click('#srtDone:not([disabled])') || click('#lnkDone:not([disabled])');
      return '';
    });
    if (r === 'end') { done = true; break; }
  }
  if (process.env.RES) { await page.click('#toTv').catch(() => {}); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(1500); console.log('RES', JSON.stringify(await page.evaluate(() => [...new Set(performance.getEntriesByType('resource').map((e) => e.name.replace(/^.*scratchpad\/v3\//, '')))].filter((n) => !/^data:/.test(n)).sort()))); }
  const R = await page.evaluate(() => window.__qa);
  console.log('kraj igre:', done, Math.round((Date.now() - t0) / 1000) + 's');
  console.log('faze:', R.phases.join(' > '));
  console.log('prazni kadrovi:', R.blank, '| višestruki ghost:', R.ghosts, '| h-scroll:', JSON.stringify(R.hscroll));
  console.log('beskonačne animacije:\n  ' + Object.keys(R.inf).sort().join('\n  '));
  console.log('greške:', errors.length ? errors.join('\n') : 'nema');
  await browser.close();
})();
