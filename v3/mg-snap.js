'use strict';
// Slike mini-igara: node mg-snap.js order,hilo
const { chromium } = require('playwright');
const path = require('path');
const shots = path.join(__dirname, 'shots');
const chal = (process.argv[2] || 'order,hilo').split(',');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(__dirname, 'out.html'));
  await page.evaluate((chal) => Object.assign(CFG, { intro: 0.5, vote: 2, voteShow: 0.4, power: 2, bet: 2, cast: 0.5, q: 8, reveal: 2.5, chReveal: 4, howto: 4, howtoShort: 2, order: 12, hilo: 20, blitz: 12, maj: 6, majReveal: 3, chal, qv: { who: 1, emoji: 1 }, secretChance: 0 }), chal);
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.click('#dstart');
  const want = { howto: 2, order: 1, orderReveal: 1, hilo: 1, hiloReveal: 1, blitz: 1, blitzReveal: 1, maj: 1, majReveal: 1, question: 0 };
  const got = {}; let qk = {};
  const t0 = Date.now();
  while (Date.now() - t0 < 4 * 60 * 1000) {
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => ({ ph: document.documentElement.dataset.ph || '?', k: (document.querySelector('.whoq') ? 'who' : document.querySelector('.emo') ? 'emoji' : ''), ht: (document.querySelector('.ht-t') || {}).textContent || '' }));
    let key = info.ph;
    if (info.ph === 'question' && info.k) key = 'q-' + info.k;
    if (info.ph === 'howto') key = 'howto-' + info.ht;
    const isNew = (want[info.ph] !== undefined || key.startsWith('q-')) && !got[key];
    if (isNew) {
      got[key] = 1;
      await page.waitForTimeout(key.startsWith('q-who') ? 3500 : 1300);
      const nm = key.replace(/[^a-zA-Z0-9-]/g, '_');
      await page.screenshot({ path: shots + '/mg-' + nm + '.png' });
      if (!/^(hilo|blitz)$/.test(info.ph)) { await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300); await page.screenshot({ path: shots + '/mg-tv-' + nm + '.png' }); await page.click('#toPhone'); await page.setViewportSize({ width: 390, height: 844 }); }
    }
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s); const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
      if (q('#dagain')) return 'end';
      click('[data-or]:not([disabled])') || click('[data-hl]') || click('[data-bz]') || click('[data-mj]:not([disabled])') || click('[data-v]:not([disabled])') || click('[data-bet]:not([disabled])') || click('[data-t]') || click('[data-p]') || click('.p-opts.two [data-c]:not([disabled])') || click('[data-c]:not([disabled]):not(.locked)') || click('#srtDone:not([disabled])') || click('#lnkDone:not([disabled])');
      return '';
    });
    if (r === 'end' || (got.majReveal || !chal.includes('maj')) && Object.keys(got).filter((k) => /Reveal/.test(k)).length >= 2 && got['q-who'] && got['q-emoji']) break;
  }
  console.log('snimljeno:', Object.keys(got).join(', '), '| greške:', errors.length ? errors : 'nema');
  await browser.close();
})();
