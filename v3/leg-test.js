'use strict';
// Legende ove krčme: nagrade samo za stvarne događaje, točni iznosi, nepromjenjivo, bez utjecaja na bodove.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,')   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
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
const ks = (lg) => lg.aw.map((x) => x.k);
function sane(lg, v, label) {
  const ids = new Set(v.P.map((p) => p.id));
  ok(lg && lg.w && lg.w.pid === v.win, label + ': kruna = pobjednik igre (' + (lg && lg.w && lg.w.pid) + ' / ' + v.win + ')');
  ok(lg.aw.length <= 5 && new Set(ks(lg)).size === lg.aw.length, label + ': najviše 5 nagrada, bez dupliciranih vrsta: ' + ks(lg).join(', '));
  ok(lg.aw.every((x) => x.who.length && x.who.every((id) => ids.has(id)) && x.t && x.ic && x.line), label + ': svaka nagrada ima stvarne igrače i tekst');
  ok(typeof lg.story === 'string' && lg.story.length > 20 && !/undefined|null|NaN|\?\?/.test(JSON.stringify(lg)), label + ': priča bez praznina');
}

(async () => {
  console.log('1) Četiri igrača, bez paktova: povratak s dna i niz, kruna u piramidi');
  let g = mk([3000, 2800, 1500, 400]);
  let r = await play(g, (qn) => qn <= 1 ? all(false) : { p0: false, p1: false, p2: qn % 3 === 0, p3: true }, () => ({ p0: false, p1: false, p2: false, p3: true }));
  let lg = r.v.lg; sane(lg, r.v, 'povratak');
  ok(ks(lg).includes('cb') && lg.aw.find((x) => x.k === 'cb').who[0] === 'p3', 'Povratak večeri: Luka · ' + (lg.aw.find((x) => x.k === 'cb') || {}).line);
  ok(!ks(lg).some((k) => ['bt', 'vic', 'dbl', 'ly'].includes(k)), 'bez paktova nema nagrada za paktove');
  ok(!ks(lg).includes('st') && !ks(lg).includes('acc'), 'isti junak (kruna + povratak) ne dobiva i treću nagradu za istu priču');
  ok(/krun/i.test(lg.w.line), 'poruka pobjednika: ' + lg.w.line);
  ok(r.lastFr === r.v.P.map((p) => p.sc).join(','), 'legende ne mijenjaju bodove (' + r.lastFr + ')');
  const j1 = JSON.stringify(r.v.lg); await sleep(50);
  ok(JSON.stringify(g.view().lg) === j1, 'ponovno otvaranje / novo stanje: isti pregled');
  console.log('   priča: ' + lg.story);
  g.restart(); ok(!g.view().lg && g._G.ph === 'lobby', 'nova partija briše legende');
  g.stop();

  console.log('2) Velika izdaja: točni iznosi i trajanje, žrtva samo ako je druga priča');
  g = mk([0, 0, 0, 0], { pacts: true });
  let btEv = null;
  r = await play(g, (qn) => qn >= 4 && qn <= 8 ? { p0: true, p1: true, p2: false, p3: false } : qn === 9 ? { p0: false, p1: true, p2: false, p3: false } : all(false),
    () => ({ p0: false, p1: true, p2: false, p3: false }),
    (qn) => { if (qn === 4) { g.pactAction('p0', { k: 'offer', to: 'p1' }); g.pactAction('p1', { k: 'accept', from: 'p0' }); } if (qn === 9) g.pactAction('p1', { k: 'betray', on: true }); });
  btEv = g._td().stat.bt[0];
  lg = r.v.lg; sane(lg, r.v, 'izdaja');
  const bta = lg.aw.find((x) => x.k === 'bt');
  ok(btEv && bta && bta.who[0] === 'p1' && bta.who[1] === 'p0' && bta.line.includes('+' + String(btEv.gain).replace(/\B(?=(\d{3})+(?!\d))/g, '.')), 'Najveća izdaja: ' + (bta && bta.line + ' · ' + bta.num) + ' (događaj: +' + (btEv && btEv.gain) + ')');
  ok(bta && /Pakt je trajao 5 pitanja/.test(bta.num), 'trajanje pakta točno: ' + (bta && bta.num));
  ok(!ks(lg).includes('vic'), 'žrtva iste izdaje se ne ponavlja kao zasebna priča');
  ok(/zlato umjesto prijateljstva/.test(lg.story), 'priča spominje izdaju: ' + lg.story);
  g.stop();

  console.log('3) Dvostruka izdaja');
  g = mk([0, 0, 0, 0], { pacts: true });
  r = await play(g, (qn) => qn >= 4 && qn <= 6 ? { p0: false, p1: false, p2: true, p3: true } : all(false), () => ({ p0: true, p1: false, p2: false, p3: false }),
    (qn) => { if (qn === 4) { g.pactAction('p2', { k: 'offer', to: 'p3' }); g.pactAction('p3', { k: 'accept', from: 'p2' }); } if (qn === 6) { g.pactAction('p2', { k: 'betray', on: true }); g.pactAction('p3', { k: 'betray', on: true }); } });
  lg = r.v.lg; sane(lg, r.v, 'dvostruka');
  const dd = lg.aw.find((x) => x.k === 'dbl'), de = g._td().stat.bt[0];
  ok(dd && de && dd.num.includes(String(de.la)) && dd.num.includes(String(de.lb)), 'Noževi pod stolom: ' + (dd && dd.line + ' · ' + dd.num));
  g.stop();

  console.log('4) Pakt preživi do kraja → Nerazdvojni saveznici s točnom riznicom i bonusom');
  g = mk([0, 0, 0, 0], { pacts: true });
  r = await play(g, (qn) => qn >= 4 ? { p0: true, p1: true, p2: false, p3: false } : all(false), () => ({ p0: true, p1: false, p2: false, p3: false }),
    (qn) => { if (qn === 4) { g.pactAction('p0', { k: 'offer', to: 'p1' }); g.pactAction('p1', { k: 'accept', from: 'p0' }); } });
  lg = r.v.lg; sane(lg, r.v, 'odanost');
  const ly = lg.aw.find((x) => x.k === 'ly'), le = g._td().stat.loyal[0];
  ok(ly && le && ly.who.join() === 'p0,p1' && ly.num.includes(String(le.tre)) && ly.num.includes(String(le.bonus)), 'saveznici: ' + (ly && ly.line + ' · ' + ly.num));
  g.stop();

  console.log('5) Partija bez značajnih događaja → bez izmišljenih nagrada, kratka priča');
  g = mk([0, 0, 0, 0]);
  r = await play(g, () => all(false), (fqn) => ({ p0: fqn % 2 === 0, p1: false, p2: false, p3: false }));
  lg = r.v.lg; sane(lg, r.v, 'mirno');
  ok(!ks(lg).some((k) => ['cb', 'bt', 'rv', 'rev', 'bet', 'ly', 'dbl', 'acc', 'st'].includes(k)), 'nema izmišljenih nagrada: [' + ks(lg).join(', ') + ']');
  ok(/Još jedna napeta večer/.test(lg.story), 'kratka priča: ' + lg.story);
  g.stop();

  console.log('6) Veliko rivalstvo: česte zamjene mjesta');
  g = mk([1000, 950, 0, 0]);
  r = await play(g, (qn) => ({ p0: qn % 2 === 0, p1: qn % 2 === 1, p2: false, p3: false }), () => ({ p0: true, p1: false, p2: false, p3: false }));
  lg = r.v.lg; sane(lg, r.v, 'rivalstvo');
  const rva = lg.aw.find((x) => x.k === 'rv');
  ok(rva && rva.who.slice().sort().join() === 'p0,p1' && /zamjen/.test(rva.num), 'Rivalstvo večeri: ' + (rva && rva.line + ' · ' + rva.num));
  g.stop();

  console.log('7) Jednaka statistika → determinističko pravilo (ista partija dvaput = isti pregled)');
  const twin = async () => { let seed = 99; const R0 = Math.random; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const x = mk([0, 0, 0, 0]); const out = await play(x, () => ({ p0: true, p1: true, p2: false, p3: false }), () => ({ p0: true, p1: true, p2: false, p3: false }));
    x.stop(); Math.random = R0; return out.v.lg; };
  const L1 = await twin(), L2 = await twin();
  ok(JSON.stringify(L1.aw) === JSON.stringify(L2.aw) && L1.story === L2.story, 'isti pregled: ' + ks(L1).join(', '));
  const acc = L1.aw.find((x) => x.k === 'acc'); ok(!acc || acc.who[0] === 'p0', 'izjednačena točnost: odlučuje stalno pravilo (' + (acc ? acc.who[0] : '—') + ')');

  console.log('8) Jedan čovjek i botovi: bez nagrada za paktove botovima, pregled postoji');
  g = mk([0], { cfg: Object.assign({}, FAST, { vote: 0.2, power: 0.2, q: 0.4, fq: 0.4, fqCrown: 0.4, fpower: 0.2 }) }, 3);
  r = await play(g, (qn) => ({ p0: qn % 2 === 0 }), () => ({ p0: true }));
  lg = r.v.lg; sane(lg, r.v, 'botovi');
  ok(!ks(lg).some((k) => ['bt', 'ly', 'dbl', 'vic'].includes(k)), 'botovi nemaju paktove ni izdaje');
  console.log('   priča: ' + lg.story);
  g.stop();

  console.log(fails ? 'GREŠAKA: ' + fails : 'LEGENDE OK');
  process.exit(fails ? 1 : 0);
})();
