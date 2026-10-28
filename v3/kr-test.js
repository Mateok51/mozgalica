'use strict';
// Legende ove krčme: nagrade samo za stvarne događaje, točni iznosi, nepromjenjivo, bez utjecaja na bodove.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,').replace('kr: { wait: 45,', 'kr: { wait: 0,').replace('pactChance: 0.45', 'pactChance: 0').replace('offChance: 0.35', 'offChance: 0').replace('chFrom: 5,', 'chFrom: 999,')   /* v32: ploča bez čekanja Nastavi i bez krčmarovih ponuda (Krčmar 2.0 testira pact2-test, kr-web-test, fuzz2) */   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P0 = { n: { w: 1, s: 1, t: 0.02 }, t: { w: 1, s: 1, t: 0.02 }, d: { w: 1, s: 1, t: 0.02 } };
const FAST = { intro: 0.02, vote: 2, voteShow: 0.02, roul: 0.02, power: 2, cast: 0.02, q: 3, pace: P0, paceMo: 0.01, moment: 0.02, betrayShow: 0.03, loyalShow: 0.03,
  duelIntro: 0.02, duel: 2, duelRes: 0.02, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, pactOffer: 5, fstart: 0.03, fpower: 2, fq: 2, fqCrown: 2, fr: 0.02, finaleMax: 30 };
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
const NAMES = ['Ana', 'Marko', 'Iva', 'Luka'];
const PLAN = (n) => [{ t: 'intro', title: 'R', sub: '' }].concat(Array.from({ length: n }, () => ({ t: 'battle' })), [{ t: 'intro', title: 'Veliko finale', sub: '' }, { t: 'finale' }]);

function mk(scores, extra, bots) {
  const g = E.createGame(Object.assign({ code: 'LG', cfg: FAST, flags: FL, plan: PLAN(10), pacts: false }, extra || {}));
  scores.forEach((s, i) => g.addPlayer('p' + i, NAMES[i], i, false));
  if (bots) g.setBots(bots);
  g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  scores.forEach((s, i) => g._score('p' + i, s));
  return g;
}
// vodi partiju do kraja: ans(qn, G) → { pid: true/false/null } za obična pitanja, fin(fqn) za piramidu; hook(qn, G) prije odgovora
async function play(g, ans, fin, hook) {
  const G = g._G, t0 = Date.now(); let lastS = -1, lastFr = null;
  while (G.ph !== 'final' && Date.now() - t0 < 60000) {
    if (G.s !== lastS) {
      lastS = G.s; const s = G.s, v = g.view(), hum = v.P.filter((p) => !p.b);
      if (G.ph === 'vote') for (const p of hum) g.setInput(p.id, { s, v: 0 });
      if (G.ph === 'power') for (const p of hum) g.setInput(p.id, { s, p: '' });
      if (G.ph === 'question') { if (hook) hook(G.qn, G); const a = ans(G.qn, G); for (const [id, r] of Object.entries(a)) if (r !== null) g.setInput(id, { s, c: r ? G.q.a : (G.q.a + 1) % 4, t: 50 + (+id.slice(1)) * 10 }); }
      if (G.ph === 'fq') { const a = fin(G.fqn, G); for (const [id, r] of Object.entries(a)) if (r !== null) g.setInput(id, { s, c: r ? G.q.a : (G.q.a + 1) % G.q.o.length, t: 100 }); }
      if (G.ph === 'fr') lastFr = g.view().P.map((p) => p.sc).join(',');
    }
    await sleep(2);
  }
  return { v: g.view(), lastFr };
}
const all = (w) => ({ p0: w, p1: w, p2: w, p3: w });
(async () => {
  const seen = []; let last = -1;
  var g; g = mk([1000, 900, 800, 700], { onChange: () => { if (typeof g === "undefined" || !g) return; const G = g._G; if ((G.pend && G.pend.mo) && G.pend.mo.id !== last) { const m = G.pend.mo; last = m.id; seen.push("Q" + G.qn + " " + m.k + " | " + m.t + " — " + m.s); } } });
  const r = await play(g, (qn) => qn <= 3 ? { p0: true, p1: false, p2: false, p3: true } : qn <= 6 ? { p0: false, p1: false, p2: true, p3: true } : { p0: false, p1: true, p2: true, p3: false }, () => ({ p0: true, p1: false, p2: false, p3: false }));
  console.log(seen.join('\n'));
  ok(seen.length >= 1 && seen.length <= 12, 'komentara: ' + seen.length + ' (nije na svako pitanje)');
  ok(!seen.some((x) => /NaN|\{[A-Z]\}|\?\?/.test(x)), 'nema neispunjenih mjesta u tekstu');
  const lg = r.v.lg; console.log('Završna: ' + lg.kl);
  ok(lg && typeof lg.kl === 'string' && lg.kl.length > 20, 'završna riječ postoji');
  console.log(fails ? 'NEUSPJEH' : 'SVE OK'); process.exit(fails ? 1 : 0);
})();
