'use strict';
// Provjera "sve staje na ekran": prolazi kroz faze demo igre ubrzano i mjeri koje prelaze visinu ekrana (cijela stranica bi se skrolala).
// Pokretanje: node v3/fit-audit.js <širina> <visina> [phone|tv] [sekunde]   (rezultat: v3/shots/fit-<WxH>-<phone|tv>.json + slike)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [W, H, VIEW = 'phone', SECS = '150'] = process.argv.slice(2); const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-fit-' + W + 'x' + H + VIEW + '.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, ''); const a = "createGame({ code: 'DEMO', noTv: true,"; if (!h.includes(a)) throw new Error('sidro1');
  h = h.replace(a, "createGame({ code: 'DEMO', noTv: true, cfg: window.__FASTCFG ? Object.assign({}, window.__FASTCFG, { kr: Object.assign({}, CFG.kr, window.__FASTCFG.kr) }) : {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; if (!h.includes(b)) throw new Error('sidro2'); h = h.replace(b, b + ' window.__t = { game: () => game, S: () => S, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 1.5, vote: 1.4, voteShow: 1.2, roul: 1, power: 1.4, bet: 1.4, cast: 0.8, q: 1.6, pace: { n: { w: 1, s: 1, t: 0.4 }, t: { w: 1, s: 1, t: 0.4 }, d: { w: 1, s: 1, t: 0.4 } }, paceMo: 0.3, moment: 0.8, howto: 1.5, howtoMax: 3, howtoShort: 1.2, sort: 3, link: 3, order: 3, hilo: 3, blitz: 3, maj: 2, majReveal: 1.2, chReveal: 1.5, fstart: 2, fpower: 1.4, fq: 2, fr: 1.5, duelIntro: 1.5, duel: 3, duelRes: 1.5, secret: 2, secret2: 2, betrayShow: 1.5, loyalShow: 1.5, kr: { wait: 2.5 } };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: VIEW === 'phone' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.addInitScript((f) => { window.__FASTCFG = f; Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); }, FAST);
  await page.goto('file://' + TMP); await page.click('#demo'); await page.waitForTimeout(300); await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.evaluate(() => { const s = document.querySelector('#botPlus, [data-bot-add], .bot-stepper button:last-child'); if (s) { s.click(); s.click(); } });
  await page.waitForTimeout(200);
  // pokretanje igre: gumb "Kreni"/start u predvorju
  await page.evaluate(() => { const g = window.__t.game(); g.setBots(Math.max(3, g.view().P.length)); });
  await page.waitForTimeout(200);
  const started = await page.evaluate(() => { const g = window.__t.game(); try { g.start(); return true; } catch (e) { return String(e); } });
  if (VIEW === 'tv') await page.evaluate(() => { const b = document.getElementById('toTv'); if (b) b.click(); });
  const seen = {}, bad = {}; const t0 = Date.now(); let n = 0;
  // pomoćna igra: odgovara umjesto čovjeka da faze teku kao u pravoj partiji
  await page.evaluate(() => { setInterval(() => { try { const g = window.__t.game(), v = g.view(), id = window.__t.pid(), s = v.s;
    if (v.ph === 'vote') g.setInput(id, { s, v: Math.floor(Math.random() * 4) }); else if (v.ph === 'question' || v.ph === 'fq') g.setInput(id, { s, c: Math.floor(Math.random() * 4), t: 800 });
    else if (v.ph === 'howto' || v.ph === 'deal') g.setInput(id, { s, ok: 1 }); else if (v.ph === 'bet') g.setInput(id, { s, b: 100 }); else if (v.ph === 'power') g.setInput(id, { s, p: '' });
    const ok = document.getElementById('krok'); if (ok) ok.click(); const dec = document.querySelector('.pk-dec'); if (dec) dec.click(); } catch (e) {} }, 300); });
  while (Date.now() - t0 < SECS * 1000) {
    const r = await page.evaluate(() => { const se = document.scrollingElement || document.documentElement, v = window.__t.game().view(), appEl = document.getElementById('app'), ov = +(appEl.dataset.fitover || 0), pageScroll = se.scrollHeight - innerHeight;
      // tko uzrokuje: najniži element sadržaja
      let low = null; if (ov > 2) { let mb = 0; for (const e of document.querySelectorAll('#app *')) { const r = e.getBoundingClientRect(); if (r.height > 0 && r.bottom > mb && r.bottom < se.scrollHeight + 5) { mb = r.bottom; low = (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ').slice(0, 2).join('.'); } } }
      let els = []; if (ov > 2) { for (const e of document.querySelectorAll('#app *')) { if (e.closest('.walker, .rv-who, .spot, .cast, [aria-hidden="true"], .pp-tag')) continue; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (r.height > 0 && r.bottom > innerHeight + 2 && +cs.opacity > 0.05 && cs.display !== 'none') els.push((e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0, 3).join('.')).slice(0, 60) + ' b=' + Math.round(r.bottom) + ' h=' + Math.round(r.height) + ' pos=' + cs.position + ' op=' + (+cs.opacity).toFixed(2) + ' vis=' + cs.visibility); } els = els.slice(0, 14); }
      return { ph: v.ph, ov, low, els, ps: pageScroll, sh: se.scrollHeight, hw: se.scrollWidth - innerWidth }; });
    n++; seen[r.ph] = (seen[r.ph] || 0) + 1;
    if (r.ps > 1) { bad['STRANICA-' + r.ph] = { ov: r.ps, n: 1 }; }
    if (r.ov > 2 || r.hw > 1) { const k = r.ph; if (!bad[k] || r.ov > bad[k].ov) { const first = !bad[k]; bad[k] = { ov: r.ov, hw: r.hw, low: r.low, els: r.els, n: (bad[k] ? bad[k].n : 0) + 1 }; await page.screenshot({ path: OUT + '/fit-' + W + 'x' + H + '-' + VIEW + '-' + k + '.png', fullPage: true }); } else bad[k].n++; }
    if (r.ph === 'final' || r.ph === 'win') { await page.waitForTimeout(1500); }
    await page.waitForTimeout(160);
  }
  fs.writeFileSync(OUT + '/fit-' + W + 'x' + H + '-' + VIEW + '.json', JSON.stringify({ started, samples: n, seen, bad, errs }, null, 1));
  console.log(W + 'x' + H + ' ' + VIEW + ' started=' + started + ' uzoraka=' + n + ' faza=' + Object.keys(seen).length + ' prelazi=' + Object.keys(bad).length + (errs.length ? ' GREŠKE ' + errs[0] : ''));
  await b.close(); try { fs.unlinkSync(TMP); } catch (e) {}
})();
