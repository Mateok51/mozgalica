'use strict';
// Logo iste veličine (početni, otvaranje sobe, ulazak), bez trake Demo/TV, traka s bodovima iste veličine u svim fazama,
// hodači u otkrivanju kreću s mjesta u redu likova. node v3/ui4-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = '/tmp/claude-0/-home-claude/49734958-2839-5e3f-a778-4ec741c0b014/scratchpad';
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-ui4.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.4, vote: 1.2, voteShow: 0.4, roul: 0.3, power: 1, cast: 0.3, q: 2.5, chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0] };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); await page.route(/fonts|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
    await page.goto('file://' + TMP); await page.waitForTimeout(300);
    const logoW = () => page.evaluate(() => { const l = document.querySelector('.logo'); return l ? Math.round(l.getBoundingClientRect().width) : 0; });
    const w0 = await logoW(); await page.screenshot({ path: OUT + '/u-home.png' });
    await page.click('#hostp').catch(() => {}); await page.waitForTimeout(300); const w1 = await logoW(); await page.screenshot({ path: OUT + '/u-host.png' });
    await page.goto('file://' + TMP + '#ABCD'); await page.waitForTimeout(300); const w2 = await logoW();
    ok(w0 > 0 && Math.abs(w1 - w0) <= 2 && Math.abs(w2 - w0) <= 2, 'logo iste širine: početni ' + w0 + ', otvaranje sobe ' + w1 + ', ulazak ' + w2);
    await page.goto('file://' + TMP); await page.waitForTimeout(200); await page.click('#demo'); await page.waitForTimeout(300);
    ok(!(await page.$('#toTv')) && !(await page.$('.demo-bar')), 'u demu nema trake Demo / Pogledaj TV');
    await page.click('#dstart');
    const r = await page.evaluate(() => new Promise((res) => { const g = __t.game(), P = __t.pid(); let last = -1; const t0 = Date.now(); const hud = {}; let walk = null;
      const iv = setInterval(() => { const G = g._G; const t = document.querySelector('#app > .p-top');
        if (t) { const h = Math.round(t.getBoundingClientRect().height * 10) / 10; (hud[G.ph] = hud[G.ph] || new Set()).add(h + '@' + (document.getElementById('app').style.zoom || '1')); }
        if (G.ph === 'reveal' && !walk) { const w = document.querySelector('.walker[data-pid]'); if (w) { const bw = document.querySelector('.bar-row .bw[data-pid="' + w.dataset.pid + '"] .av'); const a = w.getBoundingClientRect(), c = bw && bw.getBoundingClientRect();
          walk = c ? { dx: Math.round(Math.abs((a.left + a.width / 2) - (c.left + c.width / 2))), dy: Math.round(Math.abs(a.bottom - c.bottom)) } : { none: 1 }; } }
        if ((G.ph === 'reveal' && walk && Date.now() - t0 > 1000 && G.bdone >= 2) || Date.now() - t0 > 40000) { clearInterval(iv); return res({ hud: Object.fromEntries(Object.entries(hud).map(([k, v]) => [k, [...v]])), walk }); }
        if (G.ph === 'reveal' && walk && G.bdone < 2) walk = null;
        if (G.s === last) return; last = G.s; const s = G.s; const inp = G.ph === 'vote' ? { v: 0 } : G.ph === 'power' ? { p: '' } : G.ph === 'question' ? null : { ok: 1 }; if (inp) setTimeout(() => g.setInput(P, Object.assign({ s }, inp)), 300); }, 16); }));
    const hs = Object.values(r.hud).flat().map((x) => +x.split('@')[0]), zs = Object.values(r.hud).flat().map((x) => x.split('@')[1]);
    console.log('   traka s bodovima po fazama: ' + JSON.stringify(r.hud));
    ok(Math.max(...hs) - Math.min(...hs) <= 1.5, 'traka s bodovima iste visine u svim fazama (' + Math.min(...hs) + '–' + Math.max(...hs) + ' px, mjerila ' + [...new Set(zs)].join(',') + ')');
    ok(r.walk && !r.walk.none && r.walk.dx <= 4 && r.walk.dy <= 4, 'hodač kreće s mjesta svog lika u redu (odmak ' + JSON.stringify(r.walk) + ')');
    await page.waitForTimeout(400); await page.screenshot({ path: OUT + '/u-walk.png' });
    ok(errs.length === 0, 'bez grešaka ' + errs.join(' | '));
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
