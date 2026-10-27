'use strict';
// Posljednji poziv: projekcija = stvarni početak piramide (isti izračun), samo javni bodovi, samo između pitanja.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(f, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(2); } return false; }
const P0 = { n: { w: 1, s: 1, t: 0.03 }, t: { w: 1, s: 1, t: 0.03 }, d: { w: 1, s: 1, t: 0.03 } };
const FAST = { intro: 0.02, vote: 2, voteShow: 0.02, roul: 0.02, power: 2, cast: 0.02, q: 3, pace: P0, paceMo: 0.01, moment: 0.02, betrayShow: 0.03, loyalShow: 0.03, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, fstart: 5, fpower: 2 };
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
// izvorna formula prije izdvajanja (kopija), da dokažemo da se ponašanje nije promijenilo
const C = E.CFG;
function orig(sc) { const n = sc.length, top = Math.max(0, ...sc); return sc.map((x) => { const better = sc.filter((y) => y > x).length, same = sc.filter((y) => y === x).length; const rn = n > 1 ? 1 - (better + (same - 1) / 2) / (n - 1) : 1, gn = top > 0 ? x / top : 0; return top > 0 ? Math.max(0, Math.min(C.pyrMaxStart, Math.round((C.pyrRankW * rn + (1 - C.pyrRankW) * gn) * C.pyrMaxStart))) : 0; }); }
const NAMES = ['Ana', 'Marko', 'Iva', 'Luka', 'Ema', 'Toni'];
const PLAN = (n) => [{ t: 'intro', title: 'R', sub: '' }].concat(Array.from({ length: n }, () => ({ t: 'battle' })), [{ t: 'intro', title: 'Veliko finale', sub: '' }, { t: 'finale' }]);
(async () => {
  console.log('1) Isti izračun: projekcija = stvarni početak piramide (300 nasumičnih skupova bodova, s izjednačenjima i nulama)');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let same = 0, sameOrig = 0, N = 300;
  for (let k = 0; k < N; k++) {
    const n = 2 + Math.floor(rnd() * 5);
    const sc = Array.from({ length: n }, () => (rnd() < 0.15 ? 0 : rnd() < 0.2 ? 3000 : Math.round(rnd() * 12000 / 50) * 50));
    const g = E.createGame({ code: 'PJ', cfg: FAST, plan: [{ t: 'intro', title: 'F', sub: '' }, { t: 'finale' }], pacts: false, flags: FL });
    sc.forEach((x, i) => g.addPlayer('p' + i, NAMES[i], i, false)); g.start(); sc.forEach((x, i) => g._score('p' + i, x));
    const proj = g._pyrUnits(sc);
    g.skip(); // uvod → stvarni početak piramide
    const real = sc.map((x, i) => g.view().P.find((p) => p.id === 'p' + i).fu);
    if (JSON.stringify(real) === JSON.stringify(proj)) same++;
    if (JSON.stringify(orig(sc)) === JSON.stringify(real)) sameOrig++;
    g.stop();
  }
  ok(same === N, 'projekcija i stvarni početak identični u ' + same + '/' + N + ' skupova');
  ok(sameOrig === N, 'izdvojena funkcija daje iste rezultate kao izvorna formula (' + sameOrig + '/' + N + ')');
  ok(JSON.stringify(orig([0, 0, 0])) === '[0,0,0]' && JSON.stringify(orig([5000, 5000])) === JSON.stringify(orig([5000, 5000]).map(() => orig([5000, 5000])[0])), 'svi nula → svi na dnu; jednaki bodovi → ista pozicija');

  console.log('2) Partija s 5 pitanja: projekcija kad ostanu 3, samo između pitanja, nestaje nakon zadnjeg');
  const g = E.createGame({ code: 'PK', cfg: FAST, plan: PLAN(5), pacts: true, flags: FL });
  NAMES.slice(0, 4).forEach((n, i) => g.addPlayer('p' + i, n, i, false)); g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  const G = g._G, seen = {}, mos = []; let lastPj = null, qLeak = false, pactLeak = false, pacted = false;
  const t0 = Date.now(); let lastS = -1;
  while (G.ph !== 'fstart' && Date.now() - t0 < 40000) {
    if (G.s !== lastS) {
      lastS = G.s; const v = g.view(), s = G.s;
      if (['question', 'fq'].includes(v.ph) && v.pj) qLeak = true;
      if (v.pj) { lastPj = v.pj; seen[G.bdone + ':' + v.ph] = v.pj.left; if (/tre|"m":/.test(JSON.stringify(v.pj))) pactLeak = true; }
      if (v.ph === 'reveal' && v.mo) mos.push(v.mo.k + ':' + v.mo.s);
      if (v.ph === 'vote') for (const p of v.P) g.setInput(p.id, { s, v: 0 });
      if (v.ph === 'power') for (const p of v.P) g.setInput(p.id, { s, p: '' });
      if (v.ph === 'question') {
        if (G.qn === 4 && !pacted) { g.pactAction('p2', { k: 'offer', to: 'p3' }); pacted = g.pactAction('p3', { k: 'accept', from: 'p2' }); }
        // zadnje pitanje: svi krivo (bodovi se više ne mijenjaju) → projekcija s 4. otkrivanja mora biti stvarni početak
        const right = G.bdone < 4 ? { p0: G.bdone % 2 === 0, p1: true, p2: G.bdone >= 2, p3: G.bdone >= 2 } : {};
        for (const p of v.P) g.setInput(p.id, { s, c: right[p.id] ? G.q.a : (G.q.a + 1) % 4, t: 100 + (+p.id.slice(1)) * 37 });
      }
    }
    await sleep(2);
  }
  ok(!seen['1:reveal'] && seen['2:reveal'] === 3, 'aktivacija kad ostanu 3 pitanja (nakon 2. od 5)');
  ok(seen['4:reveal'] === 1 && !seen['5:reveal'], 'na zadnjem otkrivanju nema projekcije (stvarni raspored ostaje iznenađenje)');
  ok(!qLeak, 'tijekom odgovaranja projekcija se ne šalje');
  ok(pacted && !pactLeak, 'pakt s riznicom: projekcija ne sadrži riznicu ni saveznike');
  ok(mos.some((m) => /^FINAL_CALL:Još tri pitanja do piramide/.test(m)), 'najava: ' + (mos.find((m) => m.startsWith('FINAL_CALL')) || '—'));
  await until(() => G.ph === 'fstart' || G.ph === 'loyal', 5000);
  await until(() => G.ph === 'fstart', 5000);
  const lo = (G.ly && G.ly.evs) || [];
  ok(lo.length === 1, 'odani pakt isplaćen tek na početku piramide (projekcija ga nije unaprijed uračunala)');
  console.log('   najave i promjene: ' + mos.filter((m) => /FINAL_CALL|PJ_/.test(m)).join(' | '));
  g.stop();

  console.log('2b) Bez pakta: zadnja projekcija = stvarni početak piramide');
  { const g3 = E.createGame({ code: 'PB', cfg: FAST, plan: PLAN(5), pacts: false, flags: FL });
    NAMES.slice(0, 4).forEach((n, i) => g3.addPlayer('p' + i, n, i, false)); g3.start(); g3._G.qvAt = new Map(); g3._G.betAt = new Set();
    const G3 = g3._G; let lp = null, ls3 = -1; const t3 = Date.now();
    while (G3.ph !== 'fstart' && Date.now() - t3 < 40000) { if (G3.s !== ls3) { ls3 = G3.s; const v = g3.view(), s = G3.s; if (v.pj) lp = v.pj;
      if (v.ph === 'vote') for (const p of v.P) g3.setInput(p.id, { s, v: 0 }); if (v.ph === 'power') for (const p of v.P) g3.setInput(p.id, { s, p: '' });
      if (v.ph === 'question') { const right = G3.bdone < 4 ? { p0: G3.bdone % 2 === 0, p1: true, p2: G3.bdone >= 2, p3: false } : {}; for (const p of v.P) g3.setInput(p.id, { s, c: right[p.id] ? G3.q.a : (G3.q.a + 1) % 4, t: 100 + (+p.id.slice(1)) * 37 }); } } await sleep(2); }
    const real = Object.fromEntries(g3.view().P.map((p) => [p.id, p.fu]));
    ok(lp && Object.keys(real).every((id) => lp.P[id][3] === real[id]), 'projekcija ' + JSON.stringify(Object.fromEntries(Object.keys(real).map((id) => [id, lp.P[id][3]]))) + ' = stvarno ' + JSON.stringify(real));
    g3.stop(); }
  console.log('3) Drukčija duljina partije (8 pitanja): aktivacija nakon 5.');
  const g2 = E.createGame({ code: 'P8', cfg: FAST, plan: PLAN(8), pacts: false, flags: FL });
  g2.addPlayer('a', 'Ana', 0, false); g2.setBots(3); g2.start(); g2._G.qvAt = new Map(); g2._G.betAt = new Set();
  const on = {}; let ls = -1; const t1 = Date.now();
  while (!g2._G.inFinale && Date.now() - t1 < 60000) { const v = g2.view(); if (g2._G.s !== ls) { ls = g2._G.s; if (v.ph === 'reveal') on[g2._G.bdone] = !!v.pj; if (v.ph === 'vote') g2.setInput('a', { s: v.s, v: 0 }); if (v.ph === 'power') g2.setInput('a', { s: v.s, p: '' }); if (v.ph === 'question') g2.setInput('a', { s: v.s, c: 0, t: 300 }); } await sleep(2); }
  ok(!on[4] && on[5] && on[6] && on[7] && !on[8], 'projekcija nakon 5., 6. i 7. pitanja (ne nakon 4. ni 8.): ' + JSON.stringify(on));
  g2.stop();
  console.log(fails ? 'GREŠAKA: ' + fails : 'POSLJEDNJI POZIV OK'); process.exit(fails ? 1 : 0);
})();
