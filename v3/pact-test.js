'use strict';
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FAST = { intro: 0.05, vote: 0.15, voteShow: 0.05, roul: 0.05, power: 0.15, cast: 0.02, q: 0.6, reveal: 0.05, betrayShow: 0.15, loyalShow: 0.1, howto: 0.05, howtoMax: 0.05, howtoShort: 0.05, sort: 0.2, link: 0.2, order: 0.2, hilo: 0.2, blitz: 0.2, maj: 0.1, majReveal: 0.05, chReveal: 0.05, fstart: 0.05, fpower: 0.1, fq: 0.15, fr: 0.05, bet: 0.1, moment: 0.05, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], pactOffer: 5 };
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
function mk(names, extra) {
  const g = E.createGame(Object.assign({ code: 'PK', cfg: FAST, flags: FL }, extra || {}));
  names.forEach((n, i) => g.addPlayer('p' + i, n, i, false));
  return g;
}
async function untilPh(g, ph, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { if (g._G.ph === ph) return true; await sleep(5); } return false; }
async function untilQn(g, n) { const t = Date.now(); while (Date.now() - t < 20000) { if (g._G.qn >= n && g._G.ph === 'question') return true; await sleep(5); } return false; }
const sc = (g, pid) => g.view().P.find((p) => p.id === pid).sc;
const answer = (g, pid, right) => { const G = g._G; return g.setInput(pid, { s: G.s, c: right ? G.q.a : (G.q.a + 1) % G.q.o.length }); };
const pact = (g, a, b) => { g.pactAction(a, { k: 'offer', to: b }); return g.pactAction(b, { k: 'accept', from: a }); };

(async () => {
  console.log('1) Prije 3. pitanja i s botovima pakt nije moguć');
  let g = mk(['Ana', 'Marko', 'Iva']); g.setBots(1); g.start();
  await untilPh(g, 'question');
  ok(!g.pactAction('p0', { k: 'offer', to: 'p1' }), 'ponuda prije 3. pitanja odbijena');
  await untilQn(g, 4);
  const bot = g.view().P.find((p) => p.b).id;
  ok(!g.pactAction('p0', { k: 'offer', to: bot }), 'botu se ne može ponuditi pakt');
  ok(!g.pactAction(bot, { k: 'offer', to: 'p0' }), 'bot ne može ponuditi pakt');
  ok(!g.pactAction('p0', { k: 'offer', to: 'p0' }), 'sam sebi ne');
  ok(g.priv(bot) === null, 'bot nema privatno stanje pakta');
  g.stop();

  console.log('2) Ponuda, odbijanje (privatno), prihvaćanje');
  g = mk(['Ana', 'Marko', 'Iva', 'Luka']); g.start();
  await untilQn(g, 4);
  ok(g.pactAction('p0', { k: 'offer', to: 'p1' }), 'Ana nudi pakt Marku');
  ok(g.priv('p1').inv.length === 1 && g.priv('p1').inv[0].f === 'p0', 'Marko privatno vidi ponudu');
  ok(g.priv('p2').inv.length === 0, 'Iva ne vidi tuđu ponudu');
  ok(!JSON.stringify(g.view()).includes('"inv"') && !JSON.stringify(g.view()).includes('offers'), 'javno stanje ne sadrži ponude');
  ok(g.pactAction('p1', { k: 'decline', from: 'p0' }), 'Marko odbija');
  ok(/nije prihvaćena/.test((g.priv('p0').note || {}).t || ''), 'Ana privatno dobiva neutralnu poruku (ista kao kod isteka)');
  ok(!(g.priv('p2').note), 'ostali ne saznaju za odbijanje');
  ok(!g.pactAction('p1', { k: 'accept', from: 'p0' }), 'odbijena ponuda se ne može prihvatiti');
  ok(pact(g, 'p0', 'p1'), 'nova ponuda prihvaćena: pakt Ana–Marko');
  ok(g.priv('p0').k.m === 'p1' && g.priv('p1').k.m === 'p0', 'samo partneri vide saveznika');
  ok(!g.priv('p2').k, 'Iva ne zna za pakt');
  ok(!JSON.stringify(g.view()).match(/"m":|tre/), 'javno stanje ne otkriva pakt ni riznicu');
  ok(/savez|plan|krigle|sam/.test((g.view().news || {}).t || ''), 'anonimna glasina za sve: ' + ((g.view().news || {}).t || ''));
  ok(!g.pactAction('p0', { k: 'offer', to: 'p2' }), 'igrač u paktu ne može nuditi novi');
  g.pactAction('p2', { k: 'offer', to: 'p0' }); ok(g.priv('p0').inv.length === 0 && !g.pactAction('p0', { k: 'accept', from: 'p2' }), 'ponuda igraču u paktu ne stiže i ne može se prihvatiti (ponuditelj ne saznaje zašto)'); g.pactAction('p2', { k: 'cancel' });
  ok(g.priv('p2').cand.includes('p0'), 'popis kandidata ne otkriva tko je u paktu');
  ok(pact(g, 'p2', 'p3'), 'drugi pakt istovremeno: Iva–Luka');

  console.log('3) Šapat');
  await untilPh(g, 'reveal'); await untilPh(g, 'question');
  ok(g.pactAction('p0', { k: 'whisper', c: 2 }), 'Ana šapuće C');
  ok(g.priv('p1').k.wh === 2, 'Marko vidi šapat (C)');
  ok(!g.pactAction('p0', { k: 'whisper', c: 1 }), 'drugi šapat u istom pitanju odbijen');
  ok(!g.pactAction('p2', { k: 'whisper', c: 9 }), 'nevaljan odgovor odbijen');
  g.pactAction('p2', { k: 'whisper', c: 1, to: 'p0' }); ok(g.priv('p3').k.wh === 1 && g.priv('p0').k.wh === undefined, 'šapat ide samo partneru (Ivin šapat dolazi Luki, ne Ani)');
  ok(!g.view().P.some((p) => 'wh' in p), 'šapat nije u javnom stanju');

  console.log('4) Riznica: oba točno +75, jedan točno nema bonusa');
  answer(g, 'p0', true); answer(g, 'p1', true); answer(g, 'p2', true); answer(g, 'p3', false);
  await untilPh(g, 'reveal');
  ok(g.priv('p0').k.tre === 75 && g.priv('p1').k.tre === 75, 'Ana i Marko: riznica 75');
  ok(g.priv('p2').k.tre === 0, 'Iva i Luka (jedan pogriješio): riznica 0');
  ok(/\+75/.test(g.priv('p0').note.t), 'privatna poruka +75 u riznicu');
  ok(!g.pactAction('p0', { k: 'whisper', c: 0 }), 'šapat izvan pitanja odbijen');
  await untilPh(g, 'question');
  answer(g, 'p0', true); answer(g, 'p1', true); answer(g, 'p2', false); answer(g, 'p3', false);
  await untilPh(g, 'reveal');
  ok(g.priv('p0').k.tre === 150, 'riznica raste: 150');

  console.log('5) Odustajanje od izdaje, zatim izdaja');
  await untilPh(g, 'question');
  ok(g.pactAction('p1', { k: 'betray', on: true }), 'Marko priprema izdaju');
  ok(!g.priv('p0').k.bt, 'Ana ne zna za pripremljenu izdaju');
  ok(g.pactAction('p1', { k: 'betray', on: false }), 'Marko odustaje');
  answer(g, 'p0', false); answer(g, 'p1', false); answer(g, 'p2', false); answer(g, 'p3', false);
  await untilPh(g, 'reveal');
  ok(g.priv('p0').k && g.priv('p0').k.tre === 150, 'nakon odustajanja pakt i riznica netaknuti');
  ok(!g.pactAction('p1', { k: 'betray', on: true }), 'izdaja izvan pitanja odbijena (zaključano)');
  await untilPh(g, 'question');
  g._score('p0', 6000); g._score('p1', 4000);
  g._G.pacts.find((k) => k.a === 'p0').tre = 2000;
  ok(g.pactAction('p1', { k: 'betray', on: true }), 'Marko priprema izdaju (Ana 6000, Marko 4000, riznica 2000)');
  answer(g, 'p0', false); answer(g, 'p1', false); answer(g, 'p2', false); answer(g, 'p3', false);
  await untilPh(g, 'reveal');
  ok(sc(g, 'p0') === 6000 && sc(g, 'p1') === 4000, 'tijekom otkrivanja bodovi još nisu promijenjeni');
  await untilPh(g, 'betray');
  const bt = g.view().bt;
  ok(bt && bt.evs[0].k === 'betray' && bt.evs[0].t === 'p1' && bt.evs[0].v === 'p0', 'javni događaj: Marko je izdao Anu');
  ok(sc(g, 'p0') === 4500 && sc(g, 'p1') === 7500, 'primjer iz upute: Ana 4500, Marko 7500 (' + sc(g, 'p0') + ', ' + sc(g, 'p1') + ')');
  ok(bt.evs[0].tre === 2000 && bt.evs[0].st === 1500 && bt.evs[0].gain === 3500, 'događaj nosi iznose: riznica 2000, ukradeno 1500, ukupno 3500');
  ok(!g.priv('p0').k && !g.priv('p1').k, 'pakt je prekinut');
  ok(!g.pactAction('p1', { k: 'betray', on: true }), 'izdaja se ne može ponoviti');
  ok(!g.priv('p0').can && !g.priv('p1').can, 'izdani i izdajnik ne mogu sklopiti novi pakt');
  const evId = bt.id; const before = [sc(g, 'p0'), sc(g, 'p1')];
  await sleep(60); ok(sc(g, 'p0') === before[0] && sc(g, 'p1') === before[1], 'ponovljeno slanje stanja ne mijenja bodove (događaj ' + evId + ')');

  console.log('6) Dvostruka izdaja');
  await untilPh(g, 'question');
  g._score('p2', 1000); g._score('p3', 3000); g._G.pacts.find((k) => k.a === 'p2').tre = 900;
  g.pactAction('p2', { k: 'betray', on: true }); g.pactAction('p3', { k: 'betray', on: true });
  answer(g, 'p0', false); answer(g, 'p1', false); answer(g, 'p2', false); answer(g, 'p3', false);
  await untilPh(g, 'betray');
  const db = g.view().bt.evs[0];
  ok(db.k === 'double' && db.la === 200 && db.lb === 600, 'dvostruka izdaja: −20 % obama (200 i 600)');
  ok(sc(g, 'p2') === 800 && sc(g, 'p3') === 2400, 'bodovi nestaju iz igre, nitko ne dobiva (800, 2400)');
  ok(!g.priv('p2').k && !g.priv('p2').can, 'pakt završen, novi nije moguć');
  g.stop();

  console.log('7) Odanost do kraja (+40 %, podjela) i domaćin u paktu');
  g = E.createGame({ code: 'PL', cfg: FAST, flags: FL }); g.addPlayer('host', 'Mateo', 0, false, true); g.addPlayer('a', 'Ana', 1, false); g.addPlayer('b', 'Iva', 2, false);
  g.start(); await untilQn(g, 4);
  ok(pact(g, 'host', 'a'), 'domaćin (lokalni igrač) sklapa pakt');
  g._G.pacts[0].tre = 2000;
  const h0 = sc(g, 'host'), a0 = sc(g, 'a');
  await untilPh(g, 'loyal', 60000);
  ok(g.view().ly && g.view().ly.evs[0].bonus === 800, 'bonus odanosti 800');
  ok(sc(g, 'host') - h0 === 1400 && sc(g, 'a') - a0 === 1400, 'svaki dobiva 1400 prije finala');
  g.stop();

  console.log('8) Neovlaštene i lažne poruke');
  g = mk(['Ana', 'Marko', 'Iva']); g.start(); await untilQn(g, 4);
  ok(!g.pactAction('p2', { k: 'whisper', c: 0 }), 'šapat bez pakta odbijen');
  ok(!g.pactAction('p2', { k: 'betray', on: true }), 'izdaja bez pakta odbijena');
  ok(!g.pactAction('p2', { k: 'accept', from: 'p0' }), 'prihvat nepostojeće ponude odbijen');
  ok(!g.pactAction('xx', { k: 'offer', to: 'p0' }), 'nepoznat igrač odbijen');
  ok(!g.pactAction('p0', { k: 'tre', v: 99999 }) && !g.pactAction('p0', null), 'izmišljene akcije i vrijednosti odbijene');
  pact(g, 'p0', 'p1'); const t0 = g.priv('p0').k.tre;
  g.pactAction('p0', { k: 'whisper', c: 0, tre: 5000 });
  ok(g.priv('p0').k.tre === t0, 'klijent ne može postaviti riznicu');
  g.stop();

  console.log('9) Prekid veze tijekom pitanja');
  g = mk(['Ana', 'Marko', 'Iva']); g.start(); await untilQn(g, 4);
  pact(g, 'p0', 'p1');
  g.syncPeers([{ pid: 'p0', name: 'Ana', av: 0 }, { pid: 'p2', name: 'Iva', av: 2 }]);   // Marko ispao
  ok(g.priv('p0').k, 'pakt ostaje kad partner izgubi vezu');
  g.syncPeers([{ pid: 'p0', name: 'Ana', av: 0 }, { pid: 'p1', name: 'Marko', av: 1 }, { pid: 'p2', name: 'Iva', av: 2 }]);
  ok(g.priv('p1').k && g.priv('p1').k.m === 'p0', 'nakon povratka Marko dobiva ispravno privatno stanje');
  g.stop();

  console.log('10) Paktovi isključeni');
  g = mk(['Ana', 'Marko', 'Iva'], { pacts: false }); g.start(); await untilQn(g, 4);
  { const pv = g.priv('p0') || {}; ok(!g.pactAction('p0', { k: 'offer', to: 'p1' }) && !pv.k && !pv.can && !(pv.inv || []).length && !pv.out && !g.view().pk, 'isključeni paktovi: nema ponuda ni stanja pakta'); }
  g.stop();
  g = mk(['Ana', 'Marko', 'Iva']); g.setOpt('pacts', false); ok(g.view().opt.pacts === 0, 'prekidač u predvorju'); g.setOpt('pacts', true); ok(g.view().opt.pacts === 1, 'ponovno uključeno'); g.stop();
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE PROVJERE PROŠLE ✔'); process.exit(fails ? 1 : 0);
})();
