'use strict';
// Balans paktova v31: riznica +100 / +40 / 0, izdaja tek nakon 2 zajednička pitanja, krađa 8 % (najviše 300, nikad ispod 0),
// dvostruka izdaja bez krađe, odanost +40 % podijeljena prije piramide, bez šaputanja. Ljudi i botovi. node v3/pact2-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(2); } return false; };
const P0 = { n: { w: 1, s: 1, t: 0.03 }, t: { w: 1, s: 1, t: 0.03 }, d: { w: 1, s: 1, t: 0.03 } };
const CFG = { kr: { wait: 0.3, pactOffers: 0, pactFrom: 99, pactChance: 0, pactMin: 3, offFrom: 99, offChance: 0, offMax: 0, chFrom: 99, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, rope: 1, ropeWin: 7, ropeN: 10 }, intro: 0.02, vote: 0.3, voteShow: 0.02, roul: 0.02, power: 0.3, cast: 0.02, q: 1.2, pace: P0, paceMo: 0.01, moment: 0.02, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, betrayShow: 0.05, loyalShow: 0.3, fstart: 0.3, fpower: 0.1, fq: 0.3, fr: 0.05, sf: Object.assign({}, E.CFG.sf, { dur: 3, soloMax: 30 }) };
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
const plan = (n, fin) => [{ t: 'intro', title: 'R', sub: '' }].concat(Array.from({ length: n }, () => ({ t: 'battle' })), fin ? [{ t: 'finale' }] : []);
function mk(nh, opt, bots, n, fin) {
  const g = E.createGame(Object.assign({ code: 'P2', cfg: CFG, flags: FL, plan: plan(n || 10, fin), pacts: true, rc: false }, opt || {}));
  for (let i = 0; i < nh; i++) g.addPlayer('p' + i, ['Ana', 'Marko', 'Iva'][i], i, false);
  if (bots) g.setBots(bots);
  g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  return g;
}
// a: id → true/false/null; h.calm() u glasanju, h.deal() u Vremenu za dogovore (testni način)
async function Q(g, a, h) {
  h = h || {}; const G = g._G;
  await until(() => G.ph === 'vote' || G.ph === 'deal');
  if (G.ph === 'deal') { if (h.deal) await h.deal(); for (const p of g.view().P.filter((x) => !x.b)) g.setInput(p.id, { s: G.s, ok: 1 }); await until(() => G.ph === 'vote'); }
  if (h.calm) await h.calm();
  let s = G.s; for (const p of g.view().P.filter((x) => !x.b)) g.setInput(p.id, { s, v: 0 });
  await until(() => G.ph === 'power'); s = G.s; for (const p of g.view().P.filter((x) => !x.b)) g.setInput(p.id, { s, p: '' });
  await until(() => G.ph === 'question'); s = G.s;
  if (h.q) await h.q();
  for (const [id, r] of Object.entries(a)) if (r !== null) g.setInput(id, { s, c: r ? G.q.a : (G.q.a + 1) % 4, t: 100, w: 1 });
  await until(() => G.ph === 'reveal');
  await until(() => G.ph !== 'reveal' || g.view().rmin === 0, 4000);
  if (h.board) await h.board();
  if (G.ph === 'reveal') for (const p of g.view().P.filter((x) => !x.b)) g.setInput(p.id, { s: G.s, ok: 1 });
}
const pact = (g, a, b) => g._pact(a, b);   // v32: pakt nudi krčmar; test ga sklapa izravno

(async () => {
  console.log('1) Riznica: +100 / +40 / 0; izdaja tek nakon dva zajednička pitanja; bez šaputanja');
  let g = mk(3);
  for (let i = 0; i < 3; i++) await Q(g, { p0: false, p1: false, p2: false });
  await Q(g, { p0: true, p1: true, p2: false }, { calm: async () => {
    ok(pact(g, 'p0', 'p1'), 'Ana i Marko sklapaju pakt');
    ok(!g.pactAction('p0', { k: 'betray', on: true }) && !g.priv('p0').k.cb && g.priv('p0').k.wait === 2, 'izdaja odmah nakon sklapanja nije moguća (čeka 2 pitanja)');
  }, q: async () => { ok(!g.pactAction('p0', { k: 'whisper', c: 1 }), 'šaputanje uklonjeno (akcija odbijena)'); } });
  ok(g.priv('p0').k.tre === 100, 'oboje točno → +100 (' + g.priv('p0').k.tre + ')');
  ok(!g._p('p1').wh, 'ni odgovor s oznakom šapata ne šalje ništa');
  ok(/\+100 u riznicu/.test((g._p('p0').note || {}).t || ''), 'kratka obavijest o porastu: ' + (g._p('p0').note || {}).t);
  await Q(g, { p0: true, p1: false, p2: false }, { calm: async () => { ok(!g.pactAction('p1', { k: 'betray', on: true }), 'nakon 1 zajedničkog pitanja izdaja još nije moguća'); } });
  ok(g.priv('p0').k.tre === 140, 'jedan točno → +40 (' + g.priv('p0').k.tre + ')');
  await Q(g, { p0: false, p1: false, p2: false });
  ok(g.priv('p0').k.tre === 140, 'oboje pogrešno → +0 (' + g.priv('p0').k.tre + ')');
  console.log('2) Izdaja: riznica + 8 % partnerovih bodova, najviše 300');
  await Q(g, { p0: false, p1: false, p2: false }, { calm: async () => {
    ok(g.priv('p1').k.cb === 1 && g.pactAction('p1', { k: 'betray', on: true }), 'nakon 2+ zajednička pitanja Marko priprema izdaju');
    g._score('p0', 10000); g._score('p1', 2000);
  } });
  await until(() => g._G.ph === 'betray');
  let e = g.view().bt.evs[0];
  ok(e.k === 'betray' && e.tre === 140 && e.st === 300 && e.gain === 440, 'Ana ima 10.000 → 8 % = 800, ograničeno na 300; Marko +140 riznica +300 = ' + e.gain);
  ok(g._p('p0').score === 9700 && g._p('p1').score === 2440, 'bodovi: Ana 9.700, Marko 2.440');
  g.stop();

  g = mk(3);
  for (let i = 0; i < 3; i++) await Q(g, { p0: false, p1: false, p2: false });
  await Q(g, { p0: true, p1: true, p2: false }, { calm: async () => { pact(g, 'p0', 'p1'); } });
  await Q(g, { p0: false, p1: false, p2: false });
  await Q(g, { p0: false, p1: false, p2: false }, { calm: async () => { g.pactAction('p0', { k: 'betray', on: true }); g._score('p1', 1000); g._score('p0', 500); } });
  await until(() => g._G.ph === 'betray');
  e = g.view().bt.evs[0];
  ok(e.st === 80 && g._p('p1').score === 920 && g._p('p0').score === 500 + 100 + 80, 'Marko ima 1.000 → krađa 80 (8 %), Ana +100 riznica +80');
  g.stop();

  g = mk(3);
  for (let i = 0; i < 3; i++) await Q(g, { p0: false, p1: false, p2: false });
  await Q(g, { p0: true, p1: false, p2: false }, { calm: async () => { pact(g, 'p0', 'p1'); } });
  await Q(g, { p0: false, p1: false, p2: false });
  await Q(g, { p0: false, p1: false, p2: false }, { calm: async () => { g.pactAction('p0', { k: 'betray', on: true }); g._score('p1', 0); } });
  await until(() => g._G.ph === 'betray');
  e = g.view().bt.evs[0];
  ok(e.st === 0 && g._p('p1').score === 0, 'partner s 0 bodova: krađa 0, nitko ne ide ispod nule');
  g.stop();

  console.log('3) Dvostruka izdaja: riznica propada, nitko nikome ne krade');
  g = mk(3);
  for (let i = 0; i < 3; i++) await Q(g, { p0: false, p1: false, p2: false });
  await Q(g, { p0: true, p1: true, p2: false }, { calm: async () => { pact(g, 'p0', 'p1'); } });
  await Q(g, { p0: true, p1: true, p2: false });
  await Q(g, { p0: false, p1: false, p2: false }, { calm: async () => { g.pactAction('p0', { k: 'betray', on: true }); g.pactAction('p1', { k: 'betray', on: true }); g._score('p0', 3000); g._score('p1', 4000); } });
  await until(() => g._G.ph === 'betray');
  e = g.view().bt.evs[0];
  ok(e.k === 'double' && e.tre === 200 && e.la === 0 && e.lb === 0 && g._p('p0').score === 3000 && g._p('p1').score === 4000, 'dvostruka izdaja: riznica 200 propada, bodovi 3.000 / 4.000 nepromijenjeni');
  ok(!g._p('p0').pact && !g._p('p1').pact, 'pakt je završen');
  g.stop();

  console.log('4) Odanost: riznica +40 %, ravnopravno podijeljena prije piramide');
  g = mk(3, {}, 0, 6, true);
  for (let i = 0; i < 3; i++) await Q(g, { p0: false, p1: false, p2: false });
  await Q(g, { p0: true, p1: true, p2: false }, { calm: async () => { pact(g, 'p0', 'p1'); } });
  await Q(g, { p0: true, p1: true, p2: false });
  let sc0, sc1;
  await Q(g, { p0: true, p1: false, p2: false }, { board: async () => { sc0 = g._p('p0').score; sc1 = g._p('p1').score; } });
  await until(() => g._G.ly && g._G.ly.evs.length, 6000);   // isplata se događa pri početku finala; pregled (v.ly) postoji samo dok traje faza 'loyal'
  const ly = g._G.ly.evs[0], tot = Math.round(ly.tre * 1.4);
  ok(ly.tre > 0 && ly.bonus === tot - ly.tre && ly.each === Math.floor(tot / 2) && ly.ea === tot - ly.each, 'riznica ' + ly.tre + ' → +40 % = ' + tot + ', svakome ' + ly.each + '/' + ly.ea);
  ok(g._p('p0').score >= ly.ea && g._p('p1').score >= ly.each, 'bodovi dodani prije početka piramide');
  g.stop();

  console.log('5) Botovi (testni način): pakt s botom, riznica, izdaja bota tek nakon 2 pitanja');
  g = E.createGame({ code: 'P2', cfg: Object.assign({}, CFG, { kr: Object.assign({}, CFG.kr, { pactOffers: 2, pactFrom: 3 }) }), flags: FL, plan: plan(10), pacts: true, bs: true });
  g.addPlayer('p0', 'Ana', 0, false); g.setBots(3); g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  g.sfScenario('p0', 'krpact');
  for (let i = 0; i < 4 && !g._p('p0').pact; i++) await Q(g, { p0: false }, { board: async () => { if ((g.priv('p0') || {}).kp) g.pactAction('p0', { k: 'krPact', yes: true }); } });
  const b0 = (g.priv('p0').k || {}).m;
  ok(!!g._p('p0').pact && g._p(b0).pact === g._p('p0').pact, 'bot je prihvatio pakt');
  ok(g.sfScenario('p0', 'whisper').ok === 0, 'scenarij šaputanja više ne postoji');
  g.sfScenario('p0', 'betray');
  let bt = null;
  for (let i = 0; i < 6 && !bt; i++) { await Q(g, { p0: true }); if (await until(() => g._G.ph === 'betray', 400)) bt = g.view().bt.evs[0]; }
  const k = g._G.pacts[0];
  ok(bt && bt.t === b0 && bt.v === 'p0' && (k.n || 0) >= 3, 'bot je izdao tek nakon najmanje 2 zajednička pitanja (izvršeno nakon ' + (k.n || 0) + '. pitanja)');
  ok(bt && bt.st <= 300 && bt.st === Math.min(300, Math.round((g._p('p0').score + bt.st) * 0.08)), 'krađa bota 8 % (najviše 300): ' + (bt && bt.st));
  g.stop();

  console.log(fails ? '\n✘ ' + fails + ' PROVJERA PALO' : '\nPAKTOVI (NOVI BALANS) OK');
  process.exit(fails ? 1 : 0);
})();
