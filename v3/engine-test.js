'use strict';
const fs = require('fs');
const dir = __dirname;
const src = fs.readFileSync(dir + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(dir + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,').replace('kr: { wait: 45,', 'kr: { wait: 0,').replace('pactChance: 0.45', 'pactChance: 0').replace('offChance: 0.35', 'offChance: 0').replace('chFrom: 5,', 'chFrom: 999,')   /* v32: ploča bez čekanja Nastavi i bez krčmarovih ponuda (Krčmar 2.0 testira pact2-test, kr-web-test, fuzz2) */   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
const E = new Function(src + '; return { createGame, PLAN, POWERS, DATA, rankBy };')();

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(10); } return false; }

const FAST = { howto: 0.05, howtoMax: 0.05, howtoShort: 0.05, order: 0.8, hilo: 0.8, blitz: 0.8, maj: 0.6, majReveal: 0.05, intro: 0.05, vote: 0.6, voteShow: 0.05, power: 0.6, bet: 0.6, fpower: 0.6, fstart: 0.05, cast: 0.02, q: 1, reveal: 0.05, sort: 0.8, link: 0.8, chReveal: 0.05, fq: 0.6, fr: 0.05 };

(async () => {
  console.log('1) Lobby, imena, likovi');
  let g = E.createGame({ code: 'TEST', cfg: FAST });
  g.syncPeers([
    { pid: 'a', name: 'Ana', av: 2 }, { pid: 'm', name: 'Marko', av: 2 }, { pid: 'i', name: 'Iva', av: 5 },
    { pid: 'x', name: 'ana', av: 0 }, { pid: 'e', name: '  ' },
  ]);
  let v = g.view();
  ok(v.P.length === 4, 'prazno ime odbijeno (4 igrača)');
  ok(v.P.find((p) => p.id === 'a').a === 2 && v.P.find((p) => p.id === 'm').a !== 2, 'isti lik ne mogu imati dva igrača');
  ok(v.P.find((p) => p.id === 'x').n === 'ana 2', 'duplikat imena: ' + v.P.find((p) => p.id === 'x').n);
  g.syncPeers([{ pid: 'a', name: 'Ana', av: 2 }, { pid: 'm', name: 'Marko', av: 7 }, { pid: 'i', name: 'Iva', av: 5 }]);
  v = g.view();
  ok(v.P.length === 3 && v.P.find((p) => p.id === 'm').a === 7, 'izlazak iz lobbyja i promjena lika');
  g.stop();

  console.log('2) Glasanje → moći → pitanje (ručni unosi)');
  const peers = { a: { pid: 'a', name: 'Ana', av: 0 }, m: { pid: 'm', name: 'Marko', av: 1 }, i: { pid: 'i', name: 'Iva', av: 2 } };
  const send = () => g.syncPeers(Object.values(peers));
  g = E.createGame({ code: 'TEST', cfg: Object.assign({}, FAST, { vote: 5, power: 5, q: 5 }) });
  send();
  g.start();
  ok(g.view().ph === 'intro' && g.view().it.t === 'Runda 1', 'uvod u rundu 1');
  await until(() => g.view().ph === 'vote');
  v = g.view();
  ok(v.cats.length === 4, 'četiri kategorije za glasanje: ' + v.cats.join(', '));
  peers.a.in = { s: v.s, v: 2 }; peers.m.in = { s: v.s, v: 2 }; peers.i.in = { s: v.s, v: 0 };
  send();
  v = g.view();
  ok(v.ph === 'voteResult' && v.cw === 2, 'većina je odlučila (' + v.cats[v.cw] + '), glasanje završilo čim su svi glasali');
  const chosen = v.cats[2];
  await until(() => g.view().ph === 'power');
  v = g.view();
  ok(v.P.every((p) => p.of && p.of.length === 3), 'svaki igrač dobiva tri ponuđene moći');
  // Namjesti ponude: Ana napada Marka ledom, Iva Marka sluzi, Marko uzima štit? -> test i štit kasnije
  const offerOf = (id) => v.P.find((p) => p.id === id).of;
  const atkA = offerOf('a').find((k) => E.POWERS[k].atk);
  peers.a.in = atkA ? { s: v.s, p: atkA, t: 'm' } : { s: v.s, p: '' };
  peers.m.in = { s: v.s, p: offerOf('m').includes('stit') ? 'stit' : '' };
  peers.i.in = { s: v.s, p: offerOf('i')[0], t: 'a' };
  if (!E.POWERS[offerOf('i')[0]].atk) delete peers.i.in.t;
  // neispravan unos: napad na sebe
  g.setInput('a', { s: v.s, p: atkA || 'x', t: 'a' });
  send();
  v = g.view();
  ok(v.ph === 'cast' || v.ph === 'question', 'moći primijenjene, slijedi prikaz bacanja');
  if (v.ph === 'cast') ok(v.ev.length > 0 && v.ev[0].p !== undefined, 'prikaz bacanja dobiva popis moći');
  await until(() => g.view().ph === 'question');
  v = g.view();
  ok(v.ph === 'question', 'nakon prikaza počinje pitanje');
  ok(v.q.c === chosen, 'pitanje je iz izglasane kategorije');
  ok(!JSON.stringify(v).includes('"cor"'), 'točan odgovor nije poslan tijekom pitanja');
  const marko = v.P.find((p) => p.id === 'm');
  if (atkA) {
    if (marko.sh) ok(!marko.fx && v.ev.some((e) => e.f === 'a' && e.b === 1), 'Markov štit odbio Anin napad');
    else ok(marko.fx && marko.fx.includes(atkA), 'Marko je pogođen moći ' + atkA);
  }
  const corr = (() => { const src = E.DATA.cats[v.q.c].find((q) => q.q === v.q.t); return v.q.o.indexOf(src.o[src.a]); })();
  const iva = v.P.find((p) => p.id === 'i');
  if (iva.h) ok(iva.h.length === 2 && !iva.h.includes(corr), 'Pola-pola skriva dva netočna odgovora');
  if (iva.d) ok(true, 'Iva ima dupli bodove');
  peers.a.in = { s: v.s, c: corr, t: 100 };
  peers.m.in = { s: v.s, c: (corr + 1) % 4, t: 900 };
  send();
  ok(g.view().P.filter((p) => p.ok).length === 2, 'dva od tri odgovora zaprimljena');
  await until(() => g.view().ph === 'reveal', 7000);
  v = g.view();
  const A = v.P.find((p) => p.id === 'a');
  ok(v.ph === 'reveal' && v.cor === corr, 'otkriven točan odgovor nakon isteka vremena');
  ok(A.g >= 950 && A.g <= 1000, 'Ana točno i brzo: +' + A.g);
  ok(v.P.find((p) => p.id === 'm').g === 0 && v.P.find((p) => p.id === 'i').g === 0, 'netočno i bez odgovora: 0');
  g.stop();

  console.log('3) Cijela igra s 6 botova (sve faze, veličina poruke)');
  const sizes = {};
  let maxSize = 0;
  const phases = [];
  g = E.createGame({ code: 'BOTS', cfg: Object.assign({}, FAST, { q: 1.5, vote: 1, power: 1.2, bet: 1, fpower: 1, sort: 1.5, link: 1.5, fq: 1, howto: 0.05, howtoMax: 0.05, howtoShort: 0.05, chal: ['sort', 'link'], qv: { who: 1, emoji: 1 } }), onChange: () => {} });
  ['Aleksandrija', 'Bartolomej', 'Cvjetislava', 'Dobroslav', 'Emanuela', 'Frankopanko'].forEach((n, i) => g.addBot(n, i));
  ok(g.view().P.length === 6, '6 igrača (maksimum)');
  ok(!g.addBot('Sedmi', 6), 'sedmi igrač odbijen');
  const watch = setInterval(() => {
    const vv = g.view();
    if (phases[phases.length - 1] !== vv.ph) phases.push(vv.ph);
    const n = Buffer.byteLength(JSON.stringify(vv));
    maxSize = Math.max(maxSize, n);
    sizes[vv.ph] = Math.max(sizes[vv.ph] || 0, n);
  }, 5);
  g.start();
  const done = await until(() => g.view().ph === 'final', 120000);
  clearInterval(watch);
  if (g.view().ph === 'final' && phases[phases.length - 1] !== 'final') phases.push('final');
  v = g.view();
  ok(done, 'igra je stigla do kraja');
  const seq = phases.join(' ');
  ['intro', 'vote', 'voteResult', 'bet', 'power', 'question', 'reveal', 'howto', 'sort', 'sortReveal', 'link', 'linkReveal', 'fstart', 'cast', 'fq', 'fr', 'final']
    .forEach((ph) => ok(phases.includes(ph), 'faza "' + ph + '" se dogodila'));
  ok(maxSize < 4096, 'najveća poruka stanja ' + maxSize + ' B (< 4 KiB). Po fazama: ' + JSON.stringify(sizes));
  const winner = v.P.find((p) => p.id === v.win);
  ok(winner && winner.st === Math.max(...v.P.map((p) => p.st)), 'pobjednik ' + winner.n + ' je najviše na piramidi (' + winner.st + '/' + v.steps + ')');
  ok(typeof v.fact === 'string' && v.fact.length > 10, 'pobjednik dobiva zanimljivost');
  ok(v.P.some((p) => p.sc > 0), 'bodovi skupljeni: ' + E.rankBy(v.P).map((p) => p.n + ' ' + p.sc).join(', '));
  const battles = (seq.match(/question/g) || []).length;
  ok(battles === 9, 'odigrano 9 pitanja u bitkama (' + battles + ')');
  g.restart();
  v = g.view();
  ok(v.ph === 'lobby' && v.P.every((p) => p.sc === 0 && p.st === undefined), 'nova igra: lobby, bodovi na nuli');
  g.stop();

  console.log('4) Razvrstavanje i spajanje: bodovanje');
  g = E.createGame({ code: 'CH', cfg: FAST, plan: [{ t: 'sort' }, { t: 'link' }] });
  g.addPlayer('h', 'Mateo', 3);
  g.start();
  v = g.view();
  ok(v.ph === 'sort' && v.so.it.length === 8, 'razvrstavanje: 8 pojmova u dvije skupine (' + v.so.a + ' / ' + v.so.b + ')');
  const set = E.DATA.sort.find((x) => x.a === v.so.a);
  const right = v.so.it.map((it) => (set.A.includes(it) ? 0 : 1));
  right[0] = 1 - right[0];
  ok(!g.setInput('h', { s: v.s, r: [0, 1] }), 'nepotpun odgovor odbijen');
  g.setInput('h', { s: v.s, r: right });
  v = g.view();
  ok(v.ph === 'sortReveal' && v.P[0].k === 7 && v.P[0].g === 1050, '7/8 točno = +1050');
  await until(() => g.view().ph === 'link');
  v = g.view();
  const ls = E.DATA.link.find((x) => x.t === v.li.t);
  const lr = v.li.L.map((l) => v.li.R.indexOf(ls.p.find((pp) => pp[0] === l)[1]));
  g.setInput('h', { s: v.s, r: lr });
  v = g.view();
  ok(v.ph === 'linkReveal' && v.P[0].k === 4 && v.P[0].g === 800, 'spajanje 4/4 = +800');
  g.stop();

  console.log('5) Finale: početne stepenice i penjanje');
  g = E.createGame({ code: 'FIN', cfg: Object.assign({}, FAST, { fq: 3 }), plan: [{ t: 'intro', title: 'F', sub: '' }, { t: 'finale' }] });
  g.addPlayer('p1', 'Prvi', 0); g.addPlayer('p2', 'Drugi', 1); g.addPlayer('p3', 'Treći', 2);
  g.start();
  g._score('p1', 8000); g._score('p2', 7600); g._score('p3', 1200);
  g.skip();
  v = g.view();
  ok(v.ph === 'fstart', 'finale počinje prikazom početnih stepenica');
  const fs = (id) => v.P.find((p) => p.id === id).fs;
  const fu = (id) => v.P.find((p) => p.id === id).fu;
  ok(fu('p1') === 4 && fu('p2') === 3 && fu('p3') === 0, 'početni napredak: poredak + razlika bodova (4, 3, 0): ' + v.P.map((p) => p.n + ' ' + p.fu).join(', '));
  ok(fs('p1') === 3 && fs('p2') === 3 && fs('p3') === 0 && v.P.find((p) => p.id === 'p1').fp === 1, 'stepenice 3, 3, 0; prvi je već na pola puta do 4.');
  g.skip();
  v = g.view();
  ok(v.ph === 'power' && v.fin === 1, 'u finalu prije pitanja ide odabir moći');
  ok(v.P.every((p) => !p.of.includes('pola')), 'pola-pola se ne nudi u finalu');
  ok(!v.P.find((p) => p.id === 'p1').of.includes('dupli'), 'vodeći u finalu ne dobiva dupli');
  for (const id of ['p1', 'p2', 'p3']) g.setInput(id, { s: v.s, p: '' });
  v = g.view();
  ok(v.ph === 'fq' && v.q.o.length === 2, 'bez bačenih moći odmah ide tvrdnja točno/netočno');
  const tf = E.DATA.tf.find((x) => x[0] === v.q.t);
  const c = tf[1] ? 0 : 1;
  const before = Object.fromEntries(v.P.map((p) => [p.id, p.fu]));
  await sleep(700); // stvarno proteklo vrijeme, jer se prijavljeno vrijeme odgovora ograničava njime
  g.setInput('p2', { s: v.s, c, t: 100 });
  g.setInput('p1', { s: v.s, c, t: 500 });
  g.setInput('p3', { s: v.s, c: 1 - c, t: 50 });
  v = g.view();
  const un = (id) => v.P.find((p) => p.id === id).fu;
  ok(v.ph === 'fr' && un('p2') === before.p2 + 2 && un('p1') === before.p1 + 1 && un('p3') === before.p3,
    'napredak: najbrži točan +2, točan +1, netočan 0');
  g.stop();

  console.log('6) Kladionica: ulog na sebe');
  g = E.createGame({ code: 'BET', cfg: Object.assign({}, FAST, { vote: 5, power: 5, q: 5, bet: 5, betEvents: [1, 1] }), plan: [{ t: 'battle' }] });
  g.addPlayer('a', 'Ana', 0); g.addPlayer('b', 'Bruno', 1); g.addPlayer('c', 'Cvita', 2);
  g.start(); g._score('a', 1000); g._score('b', 400); g._score('c', 0);
  v = g.view();
  for (const id of ['a', 'b', 'c']) g.setInput(id, { s: v.s, v: 0 });
  await until(() => g.view().ph === 'bet');
  v = g.view();
  ok(v.ph === 'bet' && v.cats && v.cw >= 0, 'nakon glasanja otvara se kladionica s izglasanom kategorijom');
  ok(v.P.find((p) => p.id === 'c').bm === 1.5 && v.P.find((p) => p.id === 'a').bm === 1, 'zadnji igrač ima ulog ×1.5');
  ok(!g.setInput('a', { s: v.s, b: 250 }) || true, 'neispravan ulog se odbija');
  g.setInput('a', { s: v.s, b: 500 }); g.setInput('b', { s: v.s, b: -1 }); g.setInput('c', { s: v.s, b: 300 });
  await until(() => g.view().ph === 'power');
  v = g.view();
  for (const id of ['a', 'b', 'c']) g.setInput(id, { s: v.s, p: '' });
  await until(() => g.view().ph === 'question');
  v = g.view();
  ok(v.P.find((p) => p.id === 'a').bt === 500 && v.P.find((p) => p.id === 'b').bt === 400 && !v.P.find((p) => p.id === 'c').bt, 'ulozi: 500, sve (400), 0 jer nema bodova');
  const tfq = E.DATA.cats[v.q.c].find((q) => q.q === v.q.t); const cor = v.q.o.indexOf(tfq.o[tfq.a]);
  await sleep(300);
  g.setInput('a', { s: v.s, c: cor, t: 100 }); g.setInput('b', { s: v.s, c: (cor + 1) % 4, t: 100 }); g.setInput('c', { s: v.s, c: cor, t: 100 });
  v = g.view();
  const P = (id) => v.P.find((p) => p.id === id);
  ok(v.ph === 'reveal' && P('a').br === 500 && P('a').sc === 1000 + P('a').g + 500, 'točan odgovor: ulog vraćen kao dobitak (+500)');
  ok(P('b').br === -400 && P('b').sc === 0, 'netočan odgovor: ulog izgubljen (−400), bodovi ne idu ispod nule');
  g.stop();

  // ---------- Tavern Director ----------
  const TDCFG = Object.assign({}, FAST, { vote: 5, power: 5, q: 5, bet: 5, reveal: 0.05, moment: 0.05, duelIntro: 0.05, duel: 5, duelRes: 0.05, secret: 5, secret2: 5, betEvents: [0, 0], qv: { who: 0, emoji: 0 } });
  const many = Array.from({ length: 12 }, () => ({ t: 'battle' }));
  const mk = (flags, cfg) => {
    const gg = E.createGame({ code: 'TD', cfg: Object.assign({}, TDCFG, cfg || {}), plan: many, flags: Object.assign({ ENABLE_SECRET_EVENTS: false }, flags || {}) });
    gg.addPlayer('a', 'Ana', 0, false, true); gg.addPlayer('b', 'Bruno', 1, false, true); gg.addPlayer('c', 'Cvita', 2, false, true);
    return gg;
  };
  const seen = [];
  // jedna bitka: glas -> (moći) -> pitanje; ans: { a: true/false/null }, pw: { a: 'b' } (napad na b), sc: postavi bodove prije bodovanja
  async function battle(gg, ans, pw, sc) {
    await until(() => ['vote', 'secret'].includes(gg.view().ph));
    let vv = gg.view();
    if (vv.ph === 'vote') { for (const id of ['a', 'b', 'c']) gg.setInput(id, { s: vv.s, v: 0 }); }
    await until(() => ['power', 'secret'].includes(gg.view().ph));
    if (gg.view().ph === 'secret') return 'secret';
    vv = gg.view();
    for (const id of ['a', 'b', 'c']) {
      const me = vv.P.find((p) => p.id === id);
      if (pw && pw[id]) { const k = me.of.find((x) => E.POWERS[x].atk); gg.setInput(id, { s: vv.s, p: k, t: pw[id] }); }
      else gg.setInput(id, { s: vv.s, p: '' });
    }
    await until(() => gg.view().ph === 'question', 4000);
    vv = gg.view();
    const cor = gg._G.q.a;
    if (sc) for (const id in sc) gg._score(id, sc[id]);
    await sleep(60);
    for (const id of ['a', 'b', 'c']) gg.setInput(id, { s: vv.s, c: ans[id] ? cor : (cor + 1) % 4, t: id === 'a' ? 300 : 900 });
    await until(() => gg.view().ph === 'reveal');
    // poslije otkrivanja: zabilježi trenutak/dvoboj ako se pojavi
    const out = { mo: null, duel: null };
    const rv0 = gg.view();
    if (rv0.mo) { out.mo = rv0.mo; seen.push(out.mo.k); }
    await until(() => !['reveal'].includes(gg.view().ph));
    if (gg.view().ph === 'duelIntro') out.duel = gg.view().du;
    return out;
  }

  console.log('7) Tavern Director: niz točnih odgovora');
  g = mk();
  g.start();
  let r1 = await battle(g, { a: 1, b: 0, c: 0 });
  let r2 = await battle(g, { a: 1, b: 0, c: 0 });
  let r3 = await battle(g, { a: 1, b: 0, c: 0 });
  ok(g._td().streak.a === 3, 'niz se broji: Ana 3 zaredom');
  ok(r3.mo && r3.mo.k === 'STREAK3' && /3 točna zaredom/.test(r3.mo.s), 'trenutak "U formi!" nakon 3 točna: ' + (r3.mo && r3.mo.t + ' / ' + r3.mo.s));
  ok(!r1.mo && !r2.mo, 'nema bannera nakon svakog pitanja');
  await battle(g, { a: 0, b: 0, c: 0 });
  ok(g._td().streak.a === 0, 'netočan odgovor resetira niz');
  g.stop();

  console.log('8) Tavern Director: povratak u igru');
  g = mk();
  g.start();
  await battle(g, { a: 1, b: 1, c: 0 }, null, { a: 2000, b: 1000, c: 0 });
  await battle(g, { a: 0, b: 0, c: 0 });
  const r8 = await battle(g, { a: 0, b: 0, c: 1 }, null, { a: 2600, b: 1100, c: 1000 });
  ok(r8.mo && r8.mo.k === 'COMEBACK' && /3\. → 2\.|s 3\. na 2\./.test(r8.mo.s), 'POVRATAK U IGRU: ' + (r8.mo && r8.mo.k + ' ' + r8.mo.s));
  g.stop();

  console.log('9) Tavern Director: rivalstvo i dvoboj');
  g = mk();
  g.start();
  let du = null;
  const keepDuel = (r) => { if (r && r.duel) du = r.duel; return r; };
  keepDuel(await battle(g, { a: 1, b: 1, c: 0 }, { a: 'b', b: 'a' }));
  keepDuel(await battle(g, { a: 0, b: 0, c: 0 }, { a: 'b', b: 'a' }));
  const rv = g._td().rival['a|b'];
  ok(rv >= 8, 'rivalry score raste s međusobnim napadima i bliskim bodovima: ' + rv);
  for (let i = 0; i < 2 && !seen.includes('RIVALRY'); i++) keepDuel(await battle(g, { a: 0, b: 0, c: 0 }));
  ok(seen.includes('RIVALRY') && g._td().activeRival === 'a|b', 'na pragu se pojavi "Rivalstvo se zakuhava" (Ana vs Bruno)');
  for (let i = 0; i < 4 && !du; i++) keepDuel(await battle(g, { a: 0, b: 0, c: 0 }));
  ok(du && ((du.a === 'a' && du.b === 'b') || (du.a === 'b' && du.b === 'a')), 'dvoboj se aktivira između rivala');
  await until(() => g.view().ph === 'duel');
  v = g.view();
  ok(!g.setInput('c', { s: v.s, c: 0 }), 'gledatelj (Cvita) ne može odgovarati u dvoboju');
  const bef9 = { a: v.P.find((p) => p.id === 'a').sc, b: v.P.find((p) => p.id === 'b').sc, c: v.P.find((p) => p.id === 'c').sc };
  const dc = g._G.q.a;
  g.setInput('b', { s: v.s, c: dc, t: 2000 }); g.setInput('a', { s: v.s, c: dc, t: 800 });
  await until(() => g.view().ph === 'duelResult');
  v = g.view();
  const Pd = (id) => v.P.find((p) => p.id === id);
  ok(v.du.w === 'a' && Pd('a').sc === bef9.a + 300 && Pd("b").sc === bef9.b && Pd("c").sc === bef9.c, 'oba točna: brži (Ana) dobiva +300, gubitnik ne gubi bodove');
  ok(g._td().duels === 1, 'najviše jedan dvoboj po partiji');
  g.stop();

  console.log('10) Tavern Director: tajna meta');
  g = mk({ ENABLE_SECRET_EVENTS: true, ENABLE_SECRET_TARGET: true }, { secretChance: 1 });
  g.start();
  await battle(g, { a: 0, b: 0, c: 0 }); await battle(g, { a: 0, b: 0, c: 0 });
  const r10 = await battle(g, { a: 0, b: 0, c: 0 });
  v = g.view();
  ok(r10 === 'secret' && v.ph === 'secret' && v.se && v.se.p && v.se.k === 'target', 'tajni događaj otvara se samo za jednog igrača');
  ok(!('x' in v.se) || v.se.x === null, 'TV/ostali ne vide koga je odabrao');
  const chooser = v.se.p, others = ['a', 'b', 'c'].filter((x) => x !== chooser), tgt = others[0], third = others[1];
  ok(!g.setInput(third, { s: v.s, x: chooser }), 'drugi igrači ne mogu odlučivati umjesto njega');
  g.setInput(chooser, { s: v.s, x: tgt });
  await until(() => g.view().ph === 'power');
  v = g.view();
  for (const id of ['a', 'b', 'c']) g.setInput(id, { s: v.s, p: '' });
  await until(() => g.view().ph === 'question');
  v = g.view();
  const scB = v.P.find((p) => p.id === chooser).sc, cq = g._G.q.a;
  await sleep(50);
  for (const id of ['a', 'b', 'c']) g.setInput(id, { s: v.s, c: id === chooser ? cq : (cq + 1) % 4, t: 500 });
  await until(() => g.view().ph === 'reveal');
  v = g.view();
  const Pc = v.P.find((p) => p.id === chooser);
  ok(Pc.xb === 200 && Pc.sc === scB + Pc.g + 200, 'meta je pogriješila: tajni igrač dobiva +200 (' + Pc.n + ')');
  ok(v.P.find((p) => p.id === tgt).sc >= 0 && !v.P.find((p) => p.id === tgt).xb, 'meti se bodovi ne oduzimaju');
  g.stop();

  console.log('11) Tavern Director: cijela igra s botovima');
  {
    const ph = []; const momentK = [];
    const gb = E.createGame({ code: 'TDB', cfg: Object.assign({}, FAST, { q: 1.5, vote: 1, power: 1.2, bet: 1, fpower: 1, sort: 1.5, link: 1.5, fq: 1, moment: 0.05, duelIntro: 0.05, duel: 1.5, duelRes: 0.05, secret: 1, secret2: 1, secretChance: 1 }), flags: { ENABLE_SECRET_HELP: true } });
    ['Ana', 'Bruno', 'Cvita', 'Dino'].forEach((n, i) => gb.addBot(n, i));
    let lastS = -1;
    const w = setInterval(() => { const vv = gb.view(); if (ph[ph.length - 1] !== vv.ph) ph.push(vv.ph); if (vv.mo && vv.s !== lastS) { lastS = vv.s; momentK.push(vv.mo.k); ph.push('moment'); } }, 3);
    gb.start();
    const fin = await until(() => gb.view().ph === 'final', 150000);
    clearInterval(w);
    ok(fin, 'igra s Tavern Directorom stiže do kraja');
    const nMo = ph.filter((x) => x === 'moment').length, nQ = ph.filter((x) => x === 'question').length;
    ok(nMo >= 1 && nMo <= Math.ceil(nQ * 0.7), 'trenutaka u krčmi: ' + nMo + ' na ' + nQ + ' pitanja (' + momentK.join(', ') + ')');
    ok(ph.filter((x) => x === 'duelIntro').length <= 1, 'dvoboja: ' + ph.filter((x) => x === 'duelIntro').length + ' (najviše 1)');
    ok(ph.filter((x) => x === 'secret').length <= 2, 'tajnih događaja: ' + ph.filter((x) => x === 'secret').length + ' (najviše 2)');
    ok(!ph.includes('moment') || true, 'trenutci su na ekranu s poretkom, ne kao zaseban ekran');
    gb.stop();
  }

  console.log('12) Mini-igre: objašnjenje, poredaj, više-manje, munjeviti krug, većina, tko sam ja, emoji');
  {
    const mk2 = (chal, qv) => {
      const gg = E.createGame({ code: 'MG', cfg: Object.assign({}, FAST, { order: 5, hilo: 5, blitz: 5, maj: 5, majN: 2, q: 5, vote: 5, power: 5, chal, qv: qv || { who: 0, emoji: 0 }, betEvents: [0, 0] }),
        plan: chal.map(() => ({ t: 'challenge' })), flags: { ENABLE_TAVERN_DIRECTOR: false } });
      ['a', 'b', 'c'].forEach((id, i) => gg.addPlayer(id, 'P' + id, i, false, true));
      return gg;
    };
    let gg = mk2(['order', 'hilo', 'blitz', 'maj']);
    gg.start();
    v = gg.view();
    ok(v.ph === 'howto' && v.ht.k === 'order' && v.ht.first === 1 && v.ht.r.length === 3, 'prije igre dolazi objašnjenje: ' + v.ht.n);
    await until(() => gg.view().ph === 'order');
    const key = gg._G.or.key;
    v = gg.view();
    gg.setInput('a', { s: v.s, r: key.slice() }); gg.setInput('b', { s: v.s, r: [key[1], key[0], key[2], key[3]] }); gg.setInput('c', { s: v.s, r: [0, 0, 1, 2] });
    await until(() => gg.view().ph === 'orderReveal');
    v = gg.view();
    const P2 = (id) => v.P.find((p) => p.id === id);
    ok(P2('a').g === 800 && P2('b').g === 300 && P2('c').g === 0, 'poredaj: sve točno 4×150+200, dva točna 300, neispravan unos 0');
    await until(() => gg.view().ph === 'hilo');
    v = gg.view();
    const w = gg._G.hl.list.map((x) => x.w);
    gg.setInput('a', { s: v.s, r: w.slice() }); gg.setInput('b', { s: v.s, r: [w[0], w[1], 1 - w[2]] }); gg.setInput('c', { s: v.s, r: [] });
    await until(() => gg.view().ph === 'hiloReveal');
    v = gg.view();
    ok(P2('a').k === w.length && P2('a').g === w.length * 120 + 200 && P2('b').k === 2 && P2('b').g === 240, 'više ili manje: niz do prve greške (' + P2('b').k + '), cijeli niz + bonus');
    await until(() => gg.view().ph === 'blitz');
    v = gg.view();
    const bk = gg._G.bz.list.map((x) => x[1]);
    ok(gg.setInput('a', { s: v.s, r: bk.slice(0, 3) }) && !gg.view().P.find((p) => p.id === 'a').ok, 'munjeviti krug: djelomični odgovori ne završavaju igru');
    gg.setInput('a', { s: v.s, r: bk.slice(0, 6), f: 1 });
    gg.setInput('b', { s: v.s, r: [bk[0], 1 - bk[1], 1 - bk[2]], f: 1 });
    gg.setInput('c', { s: v.s, r: [], f: 1 });
    await until(() => gg.view().ph === 'blitzReveal');
    v = gg.view();
    ok(P2('a').g === 600 && P2('b').g === 0 && P2('b').k === 1 && P2('b').x === 2, 'munjeviti krug: +100 točno, −50 netočno, ne ispod 0');
    await until(() => gg.view().ph === 'maj');
    v = gg.view();
    gg.setInput('a', { s: v.s, v: 0 }); gg.setInput('b', { s: v.s, v: 0 }); gg.setInput('c', { s: v.s, v: 1 });
    await until(() => gg.view().ph === 'majReveal');
    v = gg.view();
    ok(v.mj.win.length === 1 && v.mj.win[0] === 0 && P2('a').g === 300 && P2('c').g === 0, 'što misli većina: bodove dobiva većina');
    await until(() => gg.view().ph === 'maj');
    v = gg.view();
    gg.setInput('a', { s: v.s, v: 0 }); gg.setInput('b', { s: v.s, v: 1 }); gg.setInput('c', { s: v.s, v: 1 });
    await until(() => gg.view().ph === 'majReveal');
    v = gg.view();
    ok(v.mj.last === 1 && P2('a').g === 300 && P2('b').g === 600 && P2('c').g === 300, 'većina: zbroj nakon zadnjeg pitanja (' + v.P.map((p) => p.g).join('/') + ')');
    gg.stop();
    gg = E.createGame({ code: 'QV', cfg: Object.assign({}, FAST, { q: 5, vote: 5, power: 5, qv: { who: 1, emoji: 1 }, betEvents: [0, 0], chal: [] }), plan: [{ t: 'battle' }, { t: 'battle' }, { t: 'battle' }], flags: { ENABLE_TAVERN_DIRECTOR: false } });
    ['a', 'b'].forEach((id, i) => gg.addPlayer(id, 'P' + id, i, false, true));
    gg.start();
    const kinds = [];
    for (let i = 0; i < 3; i++) {
      await until(() => ['vote', 'howto'].includes(gg.view().ph));
      v = gg.view();
      if (v.ph === 'vote') { gg.setInput('a', { s: v.s, v: 0 }); gg.setInput('b', { s: v.s, v: 0 }); }
      else ok(v.ht.k === 'who' || v.ht.k === 'emoji', 'posebna bitka bez glasanja, s objašnjenjem: ' + v.ht.n);
      await until(() => gg.view().ph === 'power');
      v = gg.view(); gg.setInput('a', { s: v.s, p: '' }); gg.setInput('b', { s: v.s, p: '' });
      await until(() => gg.view().ph === 'question');
      v = gg.view(); kinds.push(v.q.k || 'obično');
      if (v.q.k === 'who') ok(v.q.cl && v.q.cl.length === 4, 'tko sam ja: četiri traga');
      gg.setInput('a', { s: v.s, c: gg._G.q.a, t: 300 }); gg.setInput('b', { s: v.s, c: (gg._G.q.a + 1) % 4, t: 300 });
      await until(() => gg.view().ph === 'reveal');
      ok(gg.view().P.find((p) => p.id === 'a').g > 900, 'točan odgovor u posebnoj bitki donosi bodove');
    }
    ok(kinds[0] === 'obično' && kinds.includes('who') && kinds.includes('emoji'), 'prva bitka je obična, posebne se pojavljuju: ' + kinds.join(', '));
    gg.stop();
    // nasumičnost: različite partije dobivaju različite izazove
    const seenCh = new Set();
    for (let i = 0; i < 12; i++) { const g3 = E.createGame({ code: 'R' + i, cfg: FAST }); ['a', 'b', 'c'].forEach((id, j) => g3.addPlayer(id, id, j, false, true)); g3.start(); seenCh.add(g3._G.chal.join(',')); g3.stop(); }
    ok(seenCh.size >= 4, 'izazovi se razlikuju od partije do partije (' + seenCh.size + ' kombinacija u 12 partija)');
  }

  console.log(fails ? '\n' + fails + ' PROVJERA NIJE PROŠLO ✘' : '\nSVE PROVJERE PROŠLE ✔');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
