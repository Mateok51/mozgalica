'use strict';
// Tavern Director 2.0: priče iz stvarnih događaja, prioriteti, bez ponavljanja, bez curenja privatnog, bez utjecaja na igru.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,')   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FAST = { intro: 0.02, vote: 2, voteShow: 0.02, roul: 0.02, power: 2, cast: 0.02, q: 3, pace: { n: { w: 1, s: 1, t: 0.03 }, t: { w: 1, s: 1, t: 0.03 }, d: { w: 1, s: 1, t: 0.03 } }, paceMo: 0.01,
  moment: 0.02, betrayShow: 0.05, loyalShow: 0.02, duelIntro: 0.02, duel: 2, duelRes: 0.02, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, pactOffer: 5, fstart: 0.02, fpower: 0.1, fq: 0.5, fr: 0.02 };
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
const PLAN = (n) => [{ t: 'intro', title: 'R', sub: '' }].concat(Array.from({ length: n }, () => ({ t: 'battle' })));
const NAMES = ['Ana', 'Marko', 'Iva', 'Luka'];

function mk(scores, extra) {
  const g = E.createGame(Object.assign({ code: 'TD', cfg: FAST, flags: FL, plan: PLAN(16), pacts: false }, extra || {}));
  scores.forEach((s, i) => g.addPlayer('p' + i, NAMES[i], i, false));
  g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  scores.forEach((s, i) => g._score('p' + i, s));
  return g;
}
async function until(f, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(2); } return false; }
// jedno pitanje: a = odgovori (true/false/null), atk = [[napadač, meta]], pre = poziv prije odgovora
async function Q(g, a, atk, pre) {
  const G = g._G;
  await until(() => G.ph === 'vote'); let s = G.s;
  for (const p of g.view().P) g.setInput(p.id, { s, v: 0 });
  await until(() => G.ph === 'power'); s = G.s;
  const att = new Set((atk || []).map((x) => x[0]));
  for (const [f, t] of atk || []) { g._p(f).offers = ['led', 'dupli', 'stit']; ok(g.setInput(f, { s, p: 'led', t }), '   (napad ' + f + ' → ' + t + ')'); }
  for (const p of g.view().P) if (!att.has(p.id)) g.setInput(p.id, { s, p: '' });
  await until(() => G.ph === 'question'); s = G.s;
  if (pre) pre();
  for (const [id, r] of Object.entries(a)) if (r !== null) g.setInput(id, { s, c: r ? G.q.a : (G.q.a + 1) % 4, t: 60 });
  await until(() => G.ph === 'reveal' || G.ph === 'betray');
  const v = g.view();
  return v.mo || null;
}
const all = (w) => ({ p0: w, p1: w, p2: w, p3: w });

(async () => {
  console.log('1) Dva igrača više puta zamijene mjesta → rivalstvo se razvija; rečenice se ne ponavljaju');
  let g = mk([1000, 950, 0, 0]);
  const mos = [];
  for (let i = 0; i < 9; i++) mos.push(await Q(g, { p0: i % 2 === 1, p1: i % 2 === 0, p2: false, p3: false }));
  const got = mos.filter(Boolean);
  ok(got.some((m) => ['RIVAL_SWAP', 'RIVAL_LEAD', 'LEAD_HABIT', 'RIVALRY', 'NEW_LEADER'].includes(m.k)), 'krčma prepoznaje izmjene: ' + got.map((m) => m.k).join(', '));
  ok(got.length < mos.length, 'nije komentar nakon svakog pitanja (' + got.length + '/' + mos.length + ')');
  const txt = got.map((m) => m.t + '|' + m.s);
  ok(txt.every((t, i) => txt.indexOf(t) === i), 'nijedna rečenica se ne ponavlja');
  const ids = got.map((m) => m.id);
  ok(ids.every((x, i) => i === 0 || x > ids[i - 1]), 'svaki trenutak ima jedinstveni rastući ID: ' + ids.join(','));
  ok(g._td().pairs['p0|p1'].sw >= 3, 'krčma broji zamjene mjesta para (' + g._td().pairs['p0|p1'].sw + ')');
  g.stop();

  console.log('2) Jedan igrač više puta napada drugoga, napadnuti kasnije prestigne napadača → osveta');
  g = mk([3000, 2600, 0, 0]);
  let m = await Q(g, all(false), [['p0', 'p1']]);
  ok(m && m.k === 'RIVAL_FIRST', 'prvi napad: ' + (m && m.t + ' / ' + m.s));
  await Q(g, all(false), [['p0', 'p1']]);
  await Q(g, all(false), [['p0', 'p1']]);
  ok(g._td().attacks.p0.p1 === 3, 'krčma pamti 3 napada');
  m = await Q(g, { p0: false, p1: true, p2: false, p3: false });
  ok(m && m.k === 'REVENGE', 'osveta ima prednost pred običnom promjenom vodstva: ' + (m && m.k + ' · ' + m.t + ' / ' + m.s));
  ok(m && m.lv === 2, 'istaknuti trenutak (jačina 2)');
  ok(g._td().leg.rev && g._td().leg.rev.at === 'p0' && g._td().leg.rev.av === 'p1', 'legenda: zapamćena osveta');
  g.stop();

  console.log('3) Uzvrat moću: napadnuti napokon napada onoga tko ga je napadao');
  g = mk([3000, 2900, 100, 0]);
  await Q(g, all(false), [['p0', 'p1']]); await Q(g, all(false)); await Q(g, all(false), [['p0', 'p1']]); await Q(g, all(false)); await Q(g, all(false));
  m = await Q(g, all(false), [['p1', 'p0']]);
  ok(m && m.k === 'POWER_REVENGE', 'uzvrat: ' + (m && m.t + ' / ' + m.s));
  g.stop();

  console.log('4) Povratak s dna: zaostatak se topi, pa od posljednjeg do prvog');
  g = mk([3000, 2800, 1500, 400]);
  await Q(g, all(false));
  m = await Q(g, { p0: false, p1: false, p2: false, p3: true });
  ok(!m || !/COMEBACK|CB_/.test(m.k), 'jedan dobar odgovor još nije povratak (' + (m ? m.k : 'tišina') + ')');
  m = await Q(g, { p0: false, p1: false, p2: false, p3: true });
  ok(m && m.k === 'CB_RISE', 'vraća se iz mrtvih: ' + (m && m.t + ' / ' + m.s));
  m = await Q(g, { p0: false, p1: false, p2: false, p3: true });
  ok(m && m.k === 'COMEBACK_BIG' && m.lv === 3, 'od posljednjeg do prvog (veliki događaj): ' + (m && m.t));
  ok(g._td().leg.cb && g._td().leg.cb.pid === 'p3' && g._td().leg.cb.v >= 2000, 'legenda: najveći povratak (zaostatak ' + (g._td().leg.cb || {}).v + ')');
  g.stop();

  console.log('5) Mala nevažna promjena poretka i mirna pitanja → tišina');
  g = mk([5000, 4000, 100, 90]);
  m = await Q(g, { p0: false, p1: false, p2: false, p3: true });
  ok(!m, 'zamjena 3. i 4. mjesta bez priče: ' + (m ? m.k : 'tišina'));
  const quiet = []; for (let i = 0; i < 4; i++) quiet.push(await Q(g, all(false)));
  ok(quiet.every((x) => !x), 'četiri mirna pitanja bez komentara');
  g.stop();

  console.log('6) Tajni pakt traje nekoliko pitanja, zatim izdaja: povijest u rečenici, bez curenja prije izdaje');
  g = mk([0, 0, 0, 0], { pacts: true });
  for (let i = 0; i < 3; i++) await Q(g, all(false));
  let leak = false, pacted = false;
  const chk = () => { const j = JSON.stringify(g.view()); if (/"tre"|"pacts"|"m":/.test(j)) leak = true; const mo = g.view().mo; if (mo && /p0|p1/.test(JSON.stringify(mo.a || [])) && /pakt|izdaj/i.test(mo.t + mo.s)) leak = true; };
  for (let i = 0; i < 5; i++) {
    await Q(g, { p0: true, p1: true, p2: false, p3: false }, null, () => { if (!pacted) { g.pactAction('p0', { k: 'offer', to: 'p1' }); pacted = g.pactAction('p1', { k: 'accept', from: 'p0' }); } });
    chk();
  }
  ok(pacted && !leak, 'pakt sklopljen, javno stanje i krčma ništa ne otkrivaju');
  await Q(g, { p0: false, p1: true, p2: false, p3: false }, null, () => g.pactAction('p1', { k: 'betray', on: true }));
  await until(() => g._G.ph === 'betray');
  const bt = g.view().bt, e = bt && bt.evs[0];
  ok(e && e.k === 'betray' && e.dur >= 4, 'javna izdaja nosi trajanje pakta (' + (e && e.dur) + ' pitanja)');
  ok(e && (/pitanja|prijateljstv|pljačk|zlato/i.test(e.line)), 'rečenica povezana s poviješću pakta: ' + (e && e.line));
  ok(g._td().leg.bt && g._td().leg.bt.t === 'p1', 'legenda: najveća izdaja');
  console.log('7) Izdani igrač kasnije prestigne izdajnika');
  let seen = null;
  for (let i = 0; i < 4 && !seen; i++) { const x = await Q(g, { p0: true, p1: false, p2: false, p3: false }); if (x && x.k === 'BETRAY_REVENGE') seen = x; }
  ok(seen, 'krčma povezuje izdaju i povratak: ' + (seen && seen.t + ' / ' + seen.s));
  let again = 0; for (let i = 0; i < 3; i++) { const x = await Q(g, { p0: true, p1: true, p2: false, p3: false }); if (x && x.k === 'BETRAY_REVENGE') again++; }
  ok(again === 0, 'isti događaj se ne komentira ponovno');
  g.stop();

  console.log('8) Dvostruka izdaja');
  g = mk([0, 0, 0, 0], { pacts: true });
  for (let i = 0; i < 3; i++) await Q(g, all(false));
  let pc2 = false;
  await Q(g, { p0: true, p1: true, p2: false, p3: false }, null, () => { g.pactAction('p2', { k: 'offer', to: 'p3' }); pc2 = g.pactAction('p3', { k: 'accept', from: 'p2' }); });
  await Q(g, { p0: false, p1: false, p2: true, p3: true }, null, () => { g.pactAction('p2', { k: 'betray', on: true }); g.pactAction('p3', { k: 'betray', on: true }); });
  await until(() => g._G.ph === 'betray');
  const d2 = g.view().bt && g.view().bt.evs[0];
  ok(pc2 && d2 && d2.k === 'double' && /noževe|nož|laži|pohlepn|povjerenj|kuća/.test(d2.line), 'dvostruka izdaja: ' + (d2 && d2.line));
  g.stop();

  console.log('9) Dvoboj između rivala dobiva napomenu; pobjeda nad napadačem = osveta');
  g = mk([1000, 900, 0, 0]);
  const T = g._td(); T.activeRival = 'p0|p1'; T.attacks.p1 = { p0: 2 };
  ok(/Rivali/.test(g._tdf().duelNote('p0', 'p1')), 'najava: ' + g._tdf().duelNote('p0', 'p1'));
  ok(/Osveta/.test(g._tdf().duelOut('p0', 'p0', 'p1')), 'ishod: ' + g._tdf().duelOut('p0', 'p0', 'p1'));
  ok(g._tdf().duelNote('p2', 'p3') === '', 'bez povijesti nema napomene');
  g.stop();

  console.log('10) Botovi: puna partija bez grešaka, bez dupliciranja, jačine i tempo usklađeni');
  g = E.createGame({ code: 'TB', cfg: Object.assign({}, FAST, { vote: 0.1, power: 0.1, q: 0.3, duel: 0.3 }), flags: { ENABLE_SECRET_EVENTS: false }, plan: PLAN(9).concat([{ t: 'intro', title: 'F', sub: '' }, { t: 'finale' }]) });
  g.addPlayer('h', 'Ja', 0, false); g.setBots(4); g.start();
  const rv = new Map(); let err = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && g._G.ph !== 'final') {
    try { const v = g.view(); if (v.ph === 'reveal' && v.mo) rv.set(v.s, v.mo); if (v.ph === 'question') g.setInput('h', { s: v.s, c: 0, t: 300 }); if (v.ph === 'howto') g.setInput('h', { s: v.s, ok: 1 }); } catch (x) { err = x; break; }
    await sleep(3);
  }
  const list = [...rv.values()];
  ok(!err && g._G.ph === 'final', 'partija s botovima do kraja (' + list.length + ' trenutaka krčme)');
  ok(new Set(list.map((x) => x.id)).size === list.length, 'svaki trenutak prikazan jednom (jedinstveni ID)');
  ok(list.every((x) => [1, 2, 3].includes(x.lv)), 'svi trenuci imaju jačinu prikaza');
  g.stop();

  console.log('11) Krčma ne mijenja igru: ista partija s krčmom i bez nje daje iste bodove');
  const run = async (td) => {
    let seed = 12345; const R0 = Math.random; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const x = E.createGame({ code: 'X', cfg: Object.assign({}, FAST, { betEvents: [0, 0] }), flags: { ENABLE_TAVERN_DIRECTOR: td, ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false }, plan: PLAN(8), pacts: false });
    NAMES.forEach((n, i) => x.addPlayer('p' + i, n, i, false)); x.start(); x._G.qvAt = new Map();
    for (let i = 0; i < 8; i++) await Q(x, { p0: i % 3 === 0, p1: i % 2 === 0, p2: i % 4 === 1, p3: true }, i % 2 ? [['p0', 'p3']] : null);
    const out = x.view().P.map((p) => p.sc).join(','); x.stop(); Math.random = R0; return out;
  };
  const a1 = await run(true), a2 = await run(false);
  ok(a1 === a2, 'bodovi jednaki: ' + a1 + ' = ' + a2);

  console.log(fails ? 'GREŠAKA: ' + fails : 'KRČMA 2.0 OK');
  process.exit(fails ? 1 : 0);
})();
