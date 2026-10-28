'use strict';
// Piramida: prikaz napretka (prava izgradnja web/site, demo). Scenariji: +1 bez uspona, točno dovoljno za uspon, bonus preskače
// više stepenica, više igrača na istoj stepenici, vrh i pitanje za krunu (uspjeh i promašaj). Mobitel 390x844 i TV 1920x1080.
// Pokretanje: node v3/pyr-ui-test.js   (snimke: v3/shots/pyr-*.png)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-pyr.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; if (!h.includes(a)) throw new Error('sidro1');
  h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '';"; if (!h.includes(b)) throw new Error('sidro2');
  h = h.replace(b, b + ' window.__t = { game: () => game, apply: (v) => applyState(v), render: () => render(), pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 0.4, vote: 0.8, voteShow: 0.3, roul: 0.3, power: 0.6, bet: 0.6, cast: 0.3, q: 1, pace: { n: { w: 1, s: 1, t: 0.3 }, t: { w: 1, s: 1, t: 0.3 }, d: { w: 1, s: 1, t: 0.3 } }, paceMo: 0.1, moment: 0.3,
  howto: 0.5, howtoMax: 1, howtoShort: 0.4, sort: 1, link: 1, order: 1, hilo: 1, blitz: 1, maj: 1, majReveal: 0.5, chReveal: 0.5, fstart: 0.6, fpower: 0.6, fq: 1, fr: 60, secret: 1, secret2: 1, betrayShow: 0.5, loyalShow: 0.5,
  kr: { wait: 0.5, pactOffers: 0, offMax: 0, chFrom: 99, rope: 1, ropeWin: 7, ropeN: 10, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, pactFrom: 99, pactChance: 0, pactMin: 3, offFrom: 99, offChance: 0, taskWin: 400, taskLoss: 200 } };
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
// req = [1,1,1,2,2,2,2] → jedinice do stepenice: 1→1, 2→2, 3→3, 5→4, 7→5, 9→6, 11→7 (vrh), kruna = 8
const SC = {
  part: { me: { fu: 6, st: 4, mv: 0, ug: 1, ok: 1 } },
  exact: { me: { fu: 7, st: 5, mv: 1, ug: 1, ok: 1 } },
  multi: { me: { fu: 5, st: 4, mv: 2, ug: 3, ok: 1, fb: 'fd' } },
  same: { me: { fu: 6, st: 4, mv: 0, ug: 1, ok: 1 }, b0: { fu: 5, st: 4, mv: 0, ug: 0, ok: 0 }, b1: { fu: 6, st: 4, mv: 0, ug: 1, ok: 1, fb: '' }, b2: { fu: 5, st: 4, mv: 1, ug: 2, ok: 1, fb: 'f' } },
  top: { me: { fu: 11, st: 7, mv: 1, ug: 2, ok: 1, fb: 's', top: 1 } },
  cmiss: { crown: 1, me: { fu: 11, st: 7, mv: 0, ug: 0, ok: 0, top: 1 } },
  cwin: { crown: 1, me: { fu: 11, st: 8, mv: 1, ug: 0, ok: 1 } },
};
const REQ = [1, 1, 1, 2, 2, 2, 2];
const so = (u) => { const REQ = [1, 1, 1, 2, 2, 2, 2]; let st = 0, acc = 0; while (st < REQ.length && acc + REQ[st] <= u) { acc += REQ[st]; st++; } return { s: st, p: u - acc, r: st < REQ.length ? REQ[st] : 0 }; };
(async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
    await page.goto('file://' + TMP);
    await page.click('#demo'); await page.waitForTimeout(250);
    await page.click('.len-c[data-len="brza"]'); await page.waitForTimeout(100);
    await page.click('#dstart');
    // automatski čovjek: odgovara i potvrđuje dok ne stigne prva piramida
    const reached = await page.evaluate(() => new Promise((res) => {
      const g = __t.game(), P = __t.pid(); let last = -1; const t0 = Date.now();
      const iv = setInterval(() => { const G = g._G; if (G.ph === 'fr') { clearInterval(iv); return res(true); } if (Date.now() - t0 > 90000) { clearInterval(iv); return res(false); }
        if (G.s === last) return; last = G.s; const s = G.s;
        const inp = G.ph === 'vote' ? { v: 0 } : G.ph === 'power' ? { p: '' } : (G.ph === 'question' || G.ph === 'fq') ? { c: 0 } : G.ph === 'bet' ? { b: 0 } : { ok: 1 };
        g.setInput(P, Object.assign({ s }, inp)); }, 30); }));
    ok(reached, 'demo s botovima stiže do piramide (Brza partija)');
    const shots = {};
    for (const view of ['phone', 'tv']) {
      if (view === 'tv') { await page.click('#toTv'); await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(300); }
      for (const [k, sc] of Object.entries(SC)) {
        await page.evaluate(({ sc, so0 }) => {
          const g = __t.game(), real = g.view(), P = __t.pid(), so = new Function('return ' + so0)();
          const ids = real.P.map((p) => p.id), bots = ids.filter((id) => id !== P);
          const patch = (p, x) => { if (!x) return Object.assign({}, p, { st: 1, fu: 1, fp: 0, fr: 1, mv: 0, ug: 0, fb: undefined, ch: (real.cor + 1) % 2, top: undefined }); const c = so(x.fu);
            return Object.assign({}, p, { st: x.st, fu: x.fu, fp: c.p, fr: c.r, mv: x.mv, ug: x.ug, fb: x.fb || undefined, ch: x.ok ? real.cor : (real.cor + 1) % 2, top: x.top || (x.fu >= 11 && x.st < 8 ? 1 : undefined) }); };
          const v = Object.assign({}, real, { ph: 'fr', s: real.s + 1000 + Math.floor(Math.random() * 1e6), dur: 60000, ms: 60000, crown: sc.crown ? 1 : undefined,
            P: real.P.map((p) => patch(p, p.id === P ? sc.me : sc['b' + bots.indexOf(p.id)])) });
          window.__v = v; g.view = () => window.__v; __t.apply(Object.assign({}, v, { pv: g.priv(P) }));
          if (document.getElementById('toPhone')) { /* TV prikaz se crta iz game.view() */ }
        }, { sc, so0: so.toString() });
        if (view === 'tv') await page.evaluate(() => __t.render());
        await page.waitForTimeout(view === 'phone' ? 3600 : 2600);
        const r = await page.evaluate(() => { const me = document.querySelector('.pyramid .climber.me') || document.querySelector('.pyramid .climber');
          const all = [...document.querySelectorAll('.pyramid .climber')];
          return { cls: me ? me.className : '', pb: me && me.querySelector('.pb') ? me.querySelector('.pb').textContent : '', bar: me && me.querySelector('.pbar b') ? me.querySelector('.pbar b').textContent : '',
            kinds: all.map((c) => (c.className.match(/k-(\w+)/) || [])[1] || '-').join(','), note: (document.querySelector('.rv-b .fin-note') || {}).textContent || '', crownk: (document.querySelector('.crown-k') || {}).textContent || '',
            over: (() => { const se = document.scrollingElement || document.documentElement; return se.scrollHeight > innerHeight + 1; })() }; });
        shots[view + k] = r;
        await page.screenshot({ path: OUT + '/pyr-' + view + '-' + k + '.png' });
      }
      const S = (k) => shots[view + k];
      ok(/k-part/.test(S('part').cls) && S('part').pb.trim() === '+1' && S('part').bar === '1/2', view + ': +1 bez uspona → zelena +1, traka 1/2, lik poskoči (' + S('part').pb + ' · ' + S('part').bar + ')');
      ok(/k-lvl/.test(S('exact').cls) && /go/.test(S('exact').cls) && /\+1/.test(S('exact').pb) && !S('exact').bar, view + ': točno dovoljno → uspon, zlatna oznaka (' + S('exact').pb + ')');
      ok(/k-lvl/.test(S('multi').cls) && /multi m2/.test(S('multi').cls) && /\+3/.test(S('multi').pb) && /⚡/.test(S('multi').pb) && /✖2/.test(S('multi').pb), view + ': bonus preskače 2 stepenice korak po korak (' + S('multi').pb + ')');
      ok(S('same').kinds.split(',').filter((x) => x !== '-').length >= 4 && /miss/.test(S('same').kinds) && /part/.test(S('same').kinds) && /lvl/.test(S('same').kinds), view + ': više igrača, različiti ishodi (' + S('same').kinds + ')');
      ok(/k-lvl/.test(S('top').cls) && /ontop/.test(S('top').cls) && /🔥/.test(S('top').pb), view + ': dolazak na vrh (' + S('top').pb + ')');
      ok(/k-cmiss/.test(S('cmiss').cls) && /👑✗/.test(S('cmiss').pb), view + ': kruna izmiče (' + S('cmiss').pb + ')');
      ok(/k-win/.test(S('cwin').cls), view + ': kruna osvojena');
      if (view === 'phone') {
        ok(/napredak 1\/2/.test(S('part').note) && /⬆ 5\. stepenica/.test(S('exact').note) && /⚡✖2/.test(S('multi').note), 'mobitel: kratka poruka (' + S('part').note + ' | ' + S('exact').note + ' | ' + S('multi').note + ')');
        ok(Object.keys(SC).every((k) => !S(k).over), 'mobitel: sve staje na ekran');
      }
    }
    ok(errs.length === 0, 'bez grešaka ' + errs.join(' | '));
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
