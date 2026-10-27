'use strict';
// Traži žive elemente sa starim neon/cyan/magenta/ljubičastim bojama ili glass efektom (backdrop-filter), po fazi. Arg: tv
const { chromium } = require('playwright');
const path = require('path');
const dir = __dirname;
const TV = process.argv[2] === 'tv';
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: TV ? { width: 1280, height: 720 } : { width: 390, height: 844 }, hasTouch: !TV })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(dir, 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 1.5, vote: 4, voteShow: 1, power: 4, bet: 3, q: 6, reveal: 3, sort: 6, link: 6, chReveal: 2, fq: 4, fr: 1.5, fpower: 3, fstart: 3 }));
  const scan = (tag) => page.evaluate((tag) => {
    const out = window.__hits = window.__hits || {};
    const bad = (str) => {
      const m = String(str).match(/rgba?\([^)]+\)/g) || [];
      for (const c of m) {
        const v = c.match(/[\d.]+/g).map(Number); const [r, g, b] = v; const a = v.length > 3 ? v[3] : 1;
        if (a < 0.08) continue;
        const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn;
        if (d >= 0.06 && d < 0.25 && a >= 0.3) { let hh; const R0 = r / 255, G0 = g / 255, B0 = b / 255; if (mx === R0) hh = 60 * (((G0 - B0) / d) % 6); else if (mx === G0) hh = 60 * ((B0 - R0) / d + 2); else hh = 60 * ((R0 - G0) / d + 4); if (hh < 0) hh += 360; if (hh >= 215 && hh <= 300) return 'DARKCOOL ' + c; }
        if (d < 0.25) continue;
        const s = d / (1 - Math.abs(2 * l - 1));
        let h; const R = r / 255, G = g / 255, B = b / 255;
        if (mx === R) h = 60 * (((G - B) / d) % 6); else if (mx === G) h = 60 * ((B - R) / d + 2); else h = 60 * ((R - G) / d + 4);
        if (h < 0) h += 360;
        if (s > 0.45 && ((h >= 165 && h <= 255) || (h >= 265 && h <= 340))) return c;
      }
      return null;
    };
    const props = ['color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'boxShadow', 'textShadow', 'outlineColor', 'filter'];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg') && el.tagName !== 'svg') continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const name = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
      if (/Fredoka|Baloo/.test(cs.fontFamily.split(',')[0]) && el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) out['FONT ' + name] = out['FONT ' + name] || tag + ' ' + cs.fontFamily.split(',')[0];
      if (cs.backdropFilter && cs.backdropFilter !== 'none') out['GLASS ' + name] = (out['GLASS ' + name] || '') || tag + ' ' + cs.backdropFilter;
      for (const p of props) { const c = bad(cs[p]); if (c) { const k = p + ' ' + name; if (!out[k]) out[k] = tag + ' ' + c; } }
      for (const pe of ['::before', '::after']) {
        const ps = getComputedStyle(el, pe); if (ps.content === 'none' || ps.display === 'none') continue;
        for (const p of props) { const c = bad(ps[p]); if (c) { const k = p + ' ' + name + pe; if (!out[k]) out[k] = tag + ' ' + c; } }
      }
    }
  }, tag);
  await scan('home');
  await page.click('#demo'); await page.waitForTimeout(300);
  await scan('avatar');
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await scan('lobby');
  await page.click('#dstart');
  if (TV) { await page.waitForTimeout(300); await page.click('#toTv'); }
  const t0 = Date.now(); let last = '', done = false;
  while (Date.now() - t0 < 4.5 * 60 * 1000) {
    await page.waitForTimeout(350);
    const ph = await page.evaluate(() => document.documentElement.dataset.ph || (document.querySelector('.tv-top .tv-sub') || {}).textContent || '');
    await scan(ph);
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s); const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
      if (q('#dagain') || q('.winscr')) return 'end';
      click('[data-v]:not([disabled])') || click('[data-bet]:not([disabled])') || click('[data-t]') || click('[data-p]') || click('.p-opts.two [data-c]:not([disabled])') || click('[data-c]:not([disabled]):not(.locked)') || click('#srtDone:not([disabled])') || click('#lnkDone:not([disabled])');
      return '';
    });
    if (r === 'end') { await page.waitForTimeout(1500); await scan('final'); done = true; break; }
  }
  const hits = await page.evaluate(() => window.__hits);
  console.log((TV ? 'TV' : 'MOBITEL') + ' kraj:', done, '| pogodaka:', Object.keys(hits).length);
  for (const k of Object.keys(hits).sort()) console.log('  ' + k + '  →  ' + hits[k]);
  if (errors.length) console.log('greške:', errors.join('\n'));
  await browser.close();
})();
