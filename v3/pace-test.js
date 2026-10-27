'use strict';
// Tempo otkrivanja: domaćin određuje razinu (n/t/d) i trajanje; bodovi se ne mijenjaju zbog tempa.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,')   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
const E = new Function(src + '; return { createGame, DATA };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(f, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(2); } return false; }
// kratka trajanja za test, ali ista pravila; razine se razlikuju po trajanju da ih možemo provjeriti
const PACE = { n: { w: 1150, s: 1700, t: 0.21 }, t: { w: 1250, s: 2700, t: 0.32 }, d: { w: 1300, s: 3500, t: 0.43 } };
const FAST = { intro: 0.02, vote: 2, voteShow: 0.02, roul: 0.02, power: 2, cast: 0.02, q: 3, pace: PACE, paceMo: 0.05, moment: 0.02, betrayShow: 0.02 };
const FL = { ENABLE_TAVERN_DIRECTOR: false, ENABLE_SECRET_EVENTS: false, ENABLE_DUELS: false };
const BATTLE2 = [{ t: 'battle' }, { t: 'battle' }, { t: 'intro', title: 'Veliko finale', sub: '' }, { t: 'finale' }];

function game(scores, extra) {
  const g = E.createGame(Object.assign({ code: 'PC', cfg: FAST, plan: BATTLE2, pacts: false, flags: FL }, extra || {}));
  scores.forEach((sc, i) => g.addPlayer('p' + i, 'Igrač' + i, i, false));
  g.start(); g._G.betAt = new Set(); g._G.qvAt = new Map();
  scores.forEach((sc, i) => g._score('p' + i, sc));
  return g;
}
// jedno pitanje: glasanje, bez moći, zadani odgovori (true = točno, false = krivo, null = bez odgovora)
async function question(g, ans, times) {
  await until(() => g.view().ph === 'vote'); let v = g.view();
  for (const p of v.P) g.setInput(p.id, { s: v.s, v: 0 });
  await until(() => g.view().ph === 'power'); v = g.view();
  for (const p of v.P) g.setInput(p.id, { s: v.s, p: '' });
  await until(() => g.view().ph === 'question'); v = g.view();
  const qv = v, G = g._G;
  const sc0 = Object.fromEntries(v.P.map((p) => [p.id, p.sc]));
  for (const [id, a] of Object.entries(ans)) if (a !== null) g.setInput(id, { s: v.s, c: a ? G.q.a : (G.q.a + 1) % 4, t: (times && times[id]) || 100 });
  await until(() => g.view().ph === 'reveal', 6000);
  v = g.view();
  return { qv, v, sc0 };
}
const pc = (r) => r.v.pc;

(async () => {
  console.log('1) Obično pitanje: vodeći daleko ispred, poredak ostaje isti → NORMAL');
  let g = game([5000, 3000, 1500, 0]);
  let r = await question(g, { p0: true, p1: false, p2: false, p3: false });
  ok(pc(r) === 'n', 'razina ' + pc(r));
  ok(r.v.dur === 210, 'trajanje faze iz tablice (' + r.v.dur + ' ms)');
  ok(JSON.stringify(r.v.tl) === '[1150,1700]', 'vremenske točke šetnje i kola poslane klijentima ' + JSON.stringify(r.v.tl));
  ok(r.qv.pc === undefined && r.qv.tl === undefined, 'tijekom pitanja nema podataka o tempu (ništa ne otkriva unaprijed)');
  const p0 = r.v.P.find((p) => p.id === 'p0');
  ok(p0.sc === r.sc0.p0 + p0.g && p0.g > 0, 'bodovi obračunati točno jednom (' + r.sc0.p0 + ' + ' + p0.g + ' = ' + p0.sc + ')');
  g.stop();

  console.log('2) Svi isti krivi odgovor / nitko ne odgovori → NORMAL (bez razvlačenja)');
  g = game([2000, 1900, 1800, 0]);
  r = await question(g, { p0: false, p1: false, p2: false, p3: false });
  ok(pc(r) === 'n', 'svi pogriješe: ' + pc(r));
  g.stop();
  g = game([2000, 1900, 1800, 0]);
  r = await question(g, { p0: null, p1: null, p2: null, p3: null });
  ok(pc(r) === 'n', 'nitko ne odgovori: ' + pc(r));
  g.stop();

  console.log('3) Tijesna borba za vodstvo odlučena ovim pitanjem → DRAMATIC');
  g = game([3000, 2900, 0, 0]);
  r = await question(g, { p0: false, p1: true, p2: false, p3: false });
  ok(pc(r) === 'd', 'drugi preuzima vodstvo nakon razlike 100: ' + pc(r));
  ok(r.v.dur === 430, 'dramatično traje dulje (' + r.v.dur + ' ms)');
  g.stop();

  console.log('4) Vrh ostaje tijesan → TENSE');
  g = game([3000, 2850, 0, 0]);
  r = await question(g, { p0: true, p1: true, p2: false, p3: false }, { p0: 300, p1: 300 });
  ok(pc(r) === 't', 'oba vodeća točna, razlika ostaje mala: ' + pc(r));
  g.stop();

  console.log('5) Skok za dva mjesta → TENSE');
  g = game([6000, 2800, 2600, 2000]);
  r = await question(g, { p0: false, p1: false, p2: false, p3: true }, { p3: 50 });
  ok(pc(r) === 't', 'četvrti postaje drugi: ' + pc(r));
  g.stop();

  console.log('6) Jedan igrač točan, nitko ne mijenja poredak → NORMAL');
  g = game([9000, 5000, 3000, 0]);
  r = await question(g, { p0: false, p1: false, p2: true, p3: false });
  ok(pc(r) === 'n', pc(r));
  g.stop();

  console.log('7) Zadnje pitanje prije piramide → barem TENSE; s novim vodstvom DRAMATIC');
  g = game([9000, 5000, 3000, 0]);
  await question(g, { p0: false, p1: false, p2: false, p3: false });
  r = await question(g, { p0: true, p1: false, p2: false, p3: false });
  ok(pc(r) === 't', 'zadnje pitanje, bez promjene: ' + pc(r));
  g.stop();
  g = game([4000, 3500, 0, 0]);
  await question(g, { p0: false, p1: false, p2: false, p3: false });
  r = await question(g, { p0: false, p1: true, p2: false, p3: false }, { p1: 50 });
  ok(pc(r) === 'd', 'zadnje pitanje + novo vodstvo: ' + pc(r));
  g.stop();

  console.log('8) Fiksno trajanje (cfg.reveal) isključuje prilagodbu');
  g = game([3000, 2900, 0, 0], { cfg: Object.assign({}, FAST, { reveal: 0.25 }) });
  r = await question(g, { p0: false, p1: true, p2: false, p3: false });
  ok(r.v.pc === undefined && r.v.dur === 250, 'bez razine, trajanje ' + r.v.dur);
  g.stop();

  console.log('9) Igra s botovima prolazi otkrivanja s ispravnim trajanjem');
  g = E.createGame({ code: 'PB', cfg: FAST, plan: BATTLE2, pacts: false, flags: FL });
  g.addPlayer('h', 'Ja', 0, false); g.setBots(3); g.start(); g._G.betAt = new Set(); g._G.qvAt = new Map();
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 20000 && seen.length < 2) {
    const v = g.view();
    if (v.ph === 'vote') g.setInput('h', { s: v.s, v: 0 });
    if (v.ph === 'power') g.setInput('h', { s: v.s, p: '' });
    if (v.ph === 'question') g.setInput('h', { s: v.s, c: 0, t: 500 });
    if (v.ph === 'reveal' && !seen.some((x) => x.s === v.s)) seen.push({ s: v.s, pc: v.pc, dur: v.dur });
    await sleep(5);
  }
  ok(seen.length === 2 && seen.every((x) => PACE[x.pc] && x.dur === Math.round(PACE[x.pc].t * 1000)), 'dva otkrivanja: ' + JSON.stringify(seen));
  g.stop();

  console.log(fails ? 'GREŠAKA: ' + fails : 'TEMPO OK');
  process.exit(fails ? 1 : 0);
})();
