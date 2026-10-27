const { chromium } = require('playwright');
const path = require('path');
const file = process.argv[2], secs = +(process.argv[3] || 150);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve(file));
  await page.evaluate(() => { Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); Object.assign(CFG, { intro: 1, vote: 8, voteShow: 2, power: 10, q: 10, reveal: 3 }); });
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  await page.evaluate(() => {
    const app = document.getElementById('app');
    window.__R = {}; let prev = new Map(), ph = '';
    const hh = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; }; const ix = (e) => [...e.parentElement.children].indexOf(e); const key = (e) => { let k = e.tagName + '.' + e.className + ':' + ix(e) + ':' + hh(e.innerHTML); for (let p = e.parentElement; p && p !== app; p = p.parentElement) k = p.tagName + '.' + (p.classList[0] || '') + ':' + ix(p) + '>' + k; return k; };
    const loop = () => {
      const p = document.documentElement.dataset.ph;
      const cur = new Map();
      if (p !== ph) { prev = new Map(); ph = p; }
      for (const a of app.getAnimations({ subtree: true })) {
        const el = a.effect && a.effect.target; if (!el || !a.animationName) continue;
        const k = key(el) + '|' + a.animationName;
        const ct = a.playState === 'finished' ? 1e9 : a.currentTime;
        if (!cur.has(k)) cur.set(k, ct);
        const o = prev.get(k);
        if (o !== undefined && o > 120 && ct < o - 100) { const r = p + ' ' + a.animationName; window.__R[r] = (window.__R[r] || 0) + 1; }
      }
      prev = cur; requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const c = q('#htok') || q('[data-v]:not([disabled])') || q('[data-p]') || q('[data-t]') || q('[data-c]:not([disabled])') || q('[data-bet]:not([disabled])');
      if (c && Math.random() < 0.5) c.click();
    });
  }
  console.log(JSON.stringify(await page.evaluate(() => window.__R)), errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : '');
  await b.close();
})();
