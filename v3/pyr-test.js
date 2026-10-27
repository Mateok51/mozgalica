'use strict';
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, DATA };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FAST = { intro: 0.02, fstart: 0.05, fpower: 0.3, cast: 0.02, fq: 2, fqCrown: 2, fr: 0.05, moment: 0.02, loyalShow: 0.02 };
const PLAN = [{ t: 'intro', title: 'F', sub: '' }, { t: 'finale' }];
async function until(f, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(3); } return false; }
function game(scores, extra) {
  const g = E.createGame(Object.assign({ code: 'PY', cfg: FAST, plan: PLAN, pacts: false }, extra || {}));
  scores.forEach((sc, i) => g.addPlayer('p' + i, 'Igrač' + i, i, false));
  g.start(); scores.forEach((sc, i) => g._score('p' + i, sc)); g.skip();
  return g;
}
const P = (g, id) => g.view().P.find((p) => p.id === id);
// jedno pitanje finala: sve moći preskočene, zadani odgovori (true = točno), vrijeme odgovora
async function round(g, ans, times) {
  await until(() => g.view().ph === 'power');
  let v = g.view(); for (const p of v.P) g.setInput(p.id, { s: v.s, p: '' });
  await until(() => g.view().ph === 'fq'); v = g.view();
  const G = g._G; await sleep(times ? 1000 : 30);
  for (const [id, right] of Object.entries(ans)) g.setInput(id, { s: v.s, c: right ? G.q.a : (G.q.a + 1) % G.q.o.length, t: (times && times[id]) || 10 });
  await until(() => g.view().ph === 'fr' || g.view().ph === 'final'); return g.view();
}
(async () => {
  console.log('1) Početni raspored: izjednačeni dijele, različiti se razlikuju, razmak najviše 4 jedinice');
  let g = game([5000, 5000, 2000]);
  ok(P(g, 'p0').fu === P(g, 'p1').fu, 'jednaki bodovi = isti početak (' + P(g, 'p0').fu + ')');
  ok(P(g, 'p2').fu < P(g, 'p0').fu, 'manje bodova = niži početak (' + P(g, 'p2').fu + ')');
  g.stop();
  g = game([5200, 5100, 5000, 4900]);
  const A = [0, 1, 2, 3].map((i) => P(g, 'p' + i).fu);
  ok(Math.max(...A) - Math.min(...A) <= 2, 'gotovo jednaki bodovi: mala razlika na startu ' + JSON.stringify(A));
  g.stop();
  g = game([12000, 3000, 2500, 2000]);
  const B = [0, 1, 2, 3].map((i) => P(g, 'p' + i).fu);
  ok(B[0] === 4 && Math.max(...B) - Math.min(...B) <= 4, 'ogromna prednost: vodeći 4 jedinice, razmak ≤ 4 ' + JSON.stringify(B));
  g.stop();
  g = game([0, 0, 0]); ok([0, 1, 2].every((i) => P(g, 'p' + i).fu === 0), 'svi bez bodova kreću od dna'); g.stop();

  console.log('2) Niz od 3 točna daje bonus, vrh = pitanje za krunu');
  g = game([8000, 1000, 500]);
  let v = await round(g, { p0: true, p1: false, p2: false }, { p0: 50 });
  ok(P(g, 'p0').ug === 2, 'točan i najbrži: +2 (' + P(g, 'p0').ug + ')');
  v = await round(g, { p0: true, p1: true, p2: false }, { p0: 900, p1: 100 });
  ok(P(g, 'p0').ug === 1 && P(g, 'p1').ug === 2, 'samo najbrži dobiva +1 bonus');
  v = await round(g, { p0: true, p1: false, p2: false }, { p0: 50 });
  ok(P(g, 'p0').sk === 1 && P(g, 'p0').ug === 3, 'treći točan zaredom: +1 bonus za niz (ukupno +3)');
  // dovedi p0 na vrh
  g._G; for (let k = 0; k < 6 && !P(g, 'p0').top; k++) await round(g, { p0: true, p1: false, p2: false }, { p0: 50 });
  ok(P(g, 'p0').top === 1 && P(g, 'p0').st === 7, 'p0 je na vrhu (stepenica 7), ali još nije pobijedio');
  ok(g.view().mo && /vrhu/.test(g.view().mo.t), 'krčma javlja da je netko na vrhu');
  await until(() => g.view().ph === 'power'); ok(g.view().crown === 1, 'sljedeće je pitanje za krunu');
  v = await round(g, { p0: false, p1: true, p2: true }, { p1: 100 });
  ok(v.ph === 'fr' && P(g, 'p0').st === 7 && P(g, 'p0').cf === 1, 'pogrešan odgovor na vrhu: ne pobjeđuje, ostaje na vrhu (ne vraća se na početak)');
  ok(g._G.q.o.length === 4, 'pitanje za krunu ima 4 odgovora');
  v = await round(g, { p0: true, p1: false, p2: false });
  ok(v.ph === 'fr' && P(g, 'p0').st === 8, 'točan odgovor na pitanje za krunu = kruna');
  await until(() => g.view().ph === 'final'); ok(g.view().win === 'p0', 'pobjednik p0');
  g.stop();

  console.log('3) Više igrača na vrhu: pobjeđuje brži točan; svi pogriješe = nastavlja se');
  g = game([5000, 5000, 100]);
  g._G; for (const p of ['p0', 'p1']) { const r = g._G; }
  await until(() => g.view().ph === 'power');
  for (const id of ['p0', 'p1']) { const pl = [...g._G ? [] : []]; }
  // izravno postavi napredak na vrh (testni prečac) i pokreni pitanje
  for (const p of [...Array(2).keys()]) { const pp = g._G; }
  const R = (id) => g._P ? null : null;
  g.stop();
  g = game([5000, 5000, 100]);
  await until(() => g.view().ph === 'power');
  // dovedi oba na vrh istim tempom
  for (let k = 0; k < 10 && !(P(g, 'p0').top && P(g, 'p1').top); k++) await round(g, { p0: !P(g, 'p0').top, p1: !P(g, 'p1').top, p2: false }, { p0: 100, p1: 100 });
  ok(P(g, 'p0').top && P(g, 'p1').top, 'oba na vrhu');
  v = await round(g, { p0: false, p1: false, p2: true });
  ok(v.ph === 'fr' && P(g, 'p0').st === 7 && P(g, 'p1').st === 7, 'oba pogriješila: nitko ne pobjeđuje, igra se nastavlja');
  v = await round(g, { p0: true, p1: true, p2: false }, { p0: 800, p1: 300 });
  await until(() => g.view().ph === 'final'); ok(g.view().win === 'p1', 'oba točna: pobjeđuje brži (p1)');
  g.stop();

  console.log('4) Moći: najviše 2 napada na istog igrača po pitanju');
  g = game([5000, 4000, 3000, 2000]);
  await until(() => g.view().ph === 'power');
  v = g.view(); const G = g._G;
  for (const pl of v.P) { const p = G.pend; }
  // tri napadača na p0 (ako imaju napadačku moć u ponudi)
  let att = 0;
  for (const id of ['p1', 'p2', 'p3']) { const me = v.P.find((p) => p.id === id); const k = me.of.find((x) => ['led', 'sluz', 'bomba'].includes(x)); if (k) { g.setInput(id, { s: v.s, p: k, t: 'p0' }); att++; } else g.setInput(id, { s: v.s, p: '' }); }
  g.setInput('p0', { s: v.s, p: '' });
  await until(() => g.view().ph === 'cast' || g.view().ph === 'fq');
  const hits = (g.view().ev || []).filter((e) => e.t === 'p0' && !e.b).length;
  ok(hits <= 2, 'pogodaka na p0: ' + hits + ' od ' + att + ' napada (ostali odbijeni)');
  g.stop();

  console.log('5) Zaštita od beskonačnog finala');
  g = game([5000, 4000], { cfg: Object.assign({}, FAST, { finaleMax: 3 }) });
  for (let k = 0; k < 3; k++) await round(g, { p0: false, p1: false });
  await until(() => g.view().ph === 'final'); ok(g.view().ph === 'final' && g.view().win === 'p0', 'nakon najviše pitanja pobjeđuje onaj s najviše napretka, pa bodova');
  g.stop();
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE PROVJERE PROŠLE ✔'); process.exit(fails ? 1 : 0);
})();
