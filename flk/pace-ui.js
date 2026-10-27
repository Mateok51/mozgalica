const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.evaluate(() => Object.assign(CFG, { intro: 0.5, vote: 3, voteShow: 1, power: 3, q: 4, bet: 3 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  await page.evaluate(() => {
    window.__ev = [];
    const st0 = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) { if (document.documentElement.dataset.ph === 'reveal') window.__ev.push(['snd', 's', Math.round(performance.now())]); return st0.apply(this, a); };
    let ph = '', st = null;
    const loop = () => {
      const p = document.documentElement.dataset.ph, now = Math.round(performance.now());
      if (p !== ph) { if (ph === 'reveal' && st) window.__ev.push(['end', now]); if (p === 'reveal') { st = now; window.__ev.push(['start', now]); } ph = p; }
      if (p === 'reveal') {
        const rb = document.querySelector('.rv-b'), ok = document.querySelector('.rv-opts .rv-ok');
        if (rb && +getComputedStyle(rb).opacity > 0.5 && !window.__ev.some(e => e[0] === 'board' && e[1] === st)) window.__ev.push(['board', st, now]);
        if (ok) { const a = ok.getAnimations().find(x => x.animationName === 'rvBadge'); }
        const badge = ok && getComputedStyle(ok, '::after').opacity;
        if (badge && +badge > 0.5 && !window.__ev.some(e => e[0] === 'badge' && e[1] === st)) window.__ev.push(['badge', st, now]);
      }
      requestAnimationFrame(loop);
    }; loop();
  });
  // igraj: uvijek odgovori prvim ponuđenim
  const t0 = Date.now(); const meta = [];
  while (Date.now() - t0 < 150000) {
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => { const q = (s) => document.querySelector(s); const c = q('#htok') || q('[data-v]:not([disabled])') || q('#nopw') || q('[data-c]:not([disabled])'); if (c) c.click(); const w = q('.rv.wheel'); if (document.documentElement.dataset.ph !== 'reveal' || !w) return null; return { s: w.getAttribute('style'), rvo: parseInt(w.style.getPropertyValue('--rvo')) }; });
    if (m && !meta.some(x => x.s === m.s)) meta.push(m);
    if (meta.length >= 6) break;
  }
  await page.waitForTimeout(11000);
  const ev = await page.evaluate(() => window.__ev);
  const starts = ev.filter(e => e[0] === 'start').map(e => e[1]);
  starts.forEach((st, i) => {
    const m = meta[i] || {}; const end = ev.find(e => e[0] === 'end' && e[1] > st); const T = m.rvo;
    const badge = ev.find(e => e[0] === 'badge' && e[1] === st), board = ev.find(e => e[0] === 'board' && e[1] === st);
    const snd = ev.filter(e => e[0] === 'snd' && e[2] >= st && (!end || e[2] <= end[1])).map(e => e[1] + '@' + (e[2] - st));
    const fin = snd.map(x => +x.split('@')[1]).filter(t => Math.abs(t - T) < 200);
    console.log(`faza=${end ? end[1] - st : '?'}ms kolo staje=${T} oznaka=${badge ? badge[2] - st : '-'} poredak=${board ? board[2] - st : '-'} kraj-poretka→kraj faze=${end && board ? end[1] - board[2] : '-'} zvuk-ishoda=${fin.join(',')} zvukova=${snd.length}`);
  });
  console.log(errs.length ? 'ERR ' + errs.join(' | ') : 'bez JS grešaka');
  await b.close();
})();
