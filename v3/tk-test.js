'use strict';
// Krčmarove tajne ponude: privatna oklada "Hoće li X pogriješiti?", ponuda tijekom glasanja, zaključavanje prije kategorije,
// obračun točno jednom nakon pitanja, samo domaćin odlučuje. Pokretanje: node v3/tk-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,')   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P0 = { n: { w: 1, s: 1, t: 0.03 }, t: { w: 1, s: 1, t: 0.03 }, d: { w: 1, s: 1, t: 0.03 } };
const TK = (o) => Object.assign({ win: 150, loss: 100, after: 2, perGame: 2, offers: 3, chance: 1, gap: 1 }, o || {});
const FAST = (o) => ({ intro: 0.02, vote: 0.6, voteShow: 0.02, roul: 0.02, power: 0.5, bet: 0.5, cast: 0.02, q: 2, pace: P0, paceMo: 0.01, moment: 0.02, betrayShow: 0.03, loyalShow: 0.03, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, pactOffer: 5, rcOffer: 5, fstart: 0.03, tk: TK(o) });
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
const NAMES = ['Ana', 'Marko', 'Iva', 'Luka'];
const PLAN = (n) => [{ t: 'intro', title: 'R', sub: '' }].concat(Array.from({ length: n }, () => ({ t: 'battle' })));
function mk(n, extra, tko, bots, nq) {
  const g = E.createGame(Object.assign({ code: 'TK', cfg: FAST(tko), flags: FL, plan: PLAN(nq || 12), pacts: false, rc: false, tk: true }, extra || {}));
  for (let i = 0; i < n; i++) g.addPlayer('p' + i, NAMES[i], i, false);
  if (bots) g.setBots(bots);
  g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  for (let i = 0; i < n; i++) g._score('p' + i, 3000);
  return g;
}
async function until(f, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(2); } return false; }
// jedno obično pitanje; vt() u glasanju nakon glasova ljudi, q() u pitanju prije odgovora; a: id → true/false/null (null = ne odgovara)
async function Q(g, a, vt, q) {
  const G = g._G;
  await until(() => G.ph === 'vote'); let s = G.s;
  for (const p of g.view().P.filter((x) => !x.b && x.c)) g.setInput(p.id, { s, v: 0 });
  if (vt) await vt();
  await until(() => G.ph === 'power' || G.ph === 'bet'); s = G.s;
  if (G.ph === 'bet') { for (const p of g.view().P.filter((x) => !x.b)) g.setInput(p.id, { s, b: 100 }); await until(() => G.ph === 'power'); s = G.s; }
  for (const p of g.view().P.filter((x) => !x.b && x.c)) g.setInput(p.id, { s, p: '' });
  await until(() => G.ph === 'question'); s = G.s;
  if (q) await q();
  const before = Object.fromEntries(g.view().P.map((p) => [p.id, p.sc]));
  for (const [id, r] of Object.entries(a || {})) if (r !== null) g.setInput(id, { s, c: r ? G.q.a : (G.q.a + 1) % 4, t: 100 });
  await until(() => G.ph === 'reveal', 8000);
  return { v: g.view(), before };
}
const all = (w, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => ['p' + i, w]));
const P = (r, id) => r.v.P.find((p) => p.id === id);
const cur = (g) => g._G.tk.cur;

(async () => {
  console.log('1) Isključeno po zadanom: nema ponuda, nema privatnih panela, opcija u predvorju');
  {
    const g = E.createGame({ code: 'TK', cfg: FAST(), flags: FL, plan: PLAN(6), pacts: false, rc: false });
    g.addPlayer('p0', 'Ana', 0, false); g.addPlayer('p1', 'Marko', 1, false);
    ok(g.view().opt.tk === 0, 'predvorje: tajne ponude isključene po zadanom');
    g.setOpt('tk', true); ok(g.view().opt.tk === 1, 'domaćin može uključiti'); g.setOpt('tk', false);
    g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set(); g._score('p0', 3000); g._score('p1', 3000);
    for (let i = 0; i < 5; i++) await Q(g, all(false, 2));
    ok(g._G.tk.offered === 0 && !g.priv('p0') && !g.priv('p1'), 'nema ponuda ni privatnog stanja');
    g.setOpt('tk', true); ok(!g._G.opt.tk, 'opcija se ne može mijenjati tijekom partije');
    g.stop();
  }

  console.log('2) Ponuda tijekom glasanja (prije kategorije), privatnost, prihvaćanje, meta točno → −100');
  let g = mk(2);
  let r = await Q(g, all(false, 2), async () => { ok(!cur(g), '1. pitanje: nema ponude'); });
  r = await Q(g, all(false, 2), async () => { ok(!cur(g), '2. pitanje: nema ponude'); });
  let F, T, o;
  r = await Q(g, { p0: true, p1: true }, async () => {
    o = cur(g);
    ok(o && o.st === 'OFFERED' && g._G.ph === 'vote' && g._G.cw === -1, '3. pitanje: ponuda stiže u glasanju, kategorija još nije odabrana');
    F = o.f; T = o.t;
    const pv = g.priv(F).tk;
    ok(pv && pv.st === 'o' && pv.win === 150 && pv.loss === 100 && pv.line.includes(NAMES[+T.slice(1)]), 'primatelj privatno vidi ponudu: ' + pv.line);
    ok(!(g.priv(T) || {}).tk, 'meta ne zna da je meta');
    const pub = JSON.stringify(g.view());
    ok(!pub.includes(pv.line) && !/"tk"|tkr/.test(pub), 'javno stanje (TV i drugi mobiteli) ne sadrži ponudu');
    const me = g.view().P.find((p) => p.id === F);
    ok(me.ok === 0 && me.vt === undefined, 'primatelj je glasao, ali izvana izgleda kao da još bira');
    ok(g._G.ph === 'vote', 'glasanje ne završava dok primatelj odlučuje');
    ok(!g.pactAction(T, { k: 'tkAccept', id: o.id }), 'meta ne može prihvatiti tuđu ponudu');
    ok(!g.pactAction(F, { k: 'tkAccept', id: o.id + 7 }), 'pogrešan ID ponude odbijen');
    ok(!g.pactAction(F, { k: 'tkAccept', id: String(o.id) }), 'ID mora biti broj');
    ok(g.pactAction(F, { k: 'tkAccept', id: o.id, win: 99999, t: F }), 'primatelj prihvaća (pokušaj zadavanja iznosa i mete ignoriran)');
    ok(!g.pactAction(F, { k: 'tkAccept', id: o.id }) && !g.pactAction(F, { k: 'tkDecline', id: o.id }), 'dvostruko prihvaćanje / odbijanje nakon prihvaćanja odbijeno');
    await until(() => g._G.ph !== 'vote', 3000);
    ok(o.st === 'ACCEPTED' && o.win === 150 && o.t === T, 'zaključano prije otkrivanja kategorije (dobitak 150, meta ista)');
    ok(g.priv(F).tk.st === 'a', 'primatelj vidi zaključanu okladu');
  });
  ok(P(r, F).tb === -100 && P(r, F).sc === r.before[F] + P(r, F).g - 100, 'meta točno: oklada izgubljena, ' + r.before[F] + ' + ' + P(r, F).g + ' − 100 = ' + P(r, F).sc);
  ok(P(r, T).sc === r.before[T] + P(r, T).g && !P(r, T).tb, 'bodovi mete nepromijenjeni (samo regularni odgovor)');
  ok(r.v.tkr && r.v.tkr.k === 'lose' && r.v.tkr.d === -100 && /Krčmar/.test(r.v.tkr.h), 'javni ishod tek na otkrivanju: ' + r.v.tkr.h + ' · ' + r.v.tkr.line);
  ok(r.v.pc === 't', 'kartica dobiva napetije otkrivanje');
  const sc1 = r.v.P.map((p) => p.sc).join(); await sleep(15);
  ok(g.view().P.map((p) => p.sc).join() === sc1 && g._G.tk.log.filter((x) => x.st === 'SETTLED').length === 1, 'obračunato točno jednom (ponovno čitanje ne mijenja bodove)');
  ok(!(g.priv(F) || {}).tk, 'nakon obračuna nema privatnog panela');
  console.log('3) Svaki igrač dobiva najviše jednu ponudu; drugi igrač, meta krivo → +150');
  r = await Q(g, { [F]: false, [T]: true }, async () => {
    o = cur(g); ok(o && o.f === T && o.t === F, 'druga ponuda ide drugom igraču (prvi je već imao svoju)');
    ok(g.pactAction(T, { k: 'tkAccept', id: o.id }), 'prihvaćeno');
  });
  ok(r.v.tkr.k === 'win' && P(r, T).tb === 150, 'meta krivo → +150 (' + r.v.tkr.h + ' · ' + r.v.tkr.line + ')');
  await Q(g, all(false, 2)); await Q(g, all(false, 2));
  ok(!cur(g) && g._G.tk.offered === 2, 'nema više ponuda: oba igrača su već dobila svoju');
  g.stop();

  console.log('4) Meta krivo → +150; meta ne odgovori → +150; odbijanje; istek');
  for (const [lab, tAns, expK, expD] of [['meta krivo', false, 'win', 150], ['meta ne odgovori (istek vremena)', null, 'win', 150]]) {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    await until(() => g._G.ph === 'vote' && cur(g));
    const o0 = cur(g);
    const a = { [o0.f]: true, [o0.t]: tAns };
    const r0 = await Q(g, a, async () => { g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); });
    ok(r0.v.tkr && r0.v.tkr.k === expK && P(r0, o0.f).tb === expD && P(r0, o0.f).sc === r0.before[o0.f] + P(r0, o0.f).g + expD, lab + ': ' + r0.v.tkr.h + ' · ' + r0.v.tkr.line);
    ok(P(r0, o0.t).sc === r0.before[o0.t] + P(r0, o0.t).g, lab + ': bodovi mete nepromijenjeni');
    g.stop();
  }
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    let o0; const r0 = await Q(g, all(false, 2), async () => { o0 = cur(g); ok(g.pactAction(o0.f, { k: 'tkDecline', id: o0.id }), 'odbijanje'); await until(() => g._G.ph !== 'vote', 50); ok(g._G.ph !== 'vote', 'odbijanjem glasanje odmah završava (svi su glasali)'); });
    ok(o0.st === 'DECLINED' && !r0.v.tkr && r0.v.P.every((p) => !p.tb), 'odbijeno: nema promjene bodova ni javnog traga');
    g.stop();
  }
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    let o0; const t0 = Date.now();
    const r0 = await Q(g, all(false, 2), async () => { o0 = cur(g); await until(() => g._G.ph !== 'vote', 3000); });
    ok(o0.st === 'EXPIRED' && !r0.v.tkr, 'bez odgovora ponuda istekne (= odbijena), bez promjene bodova');
    ok(Date.now() - t0 < 2500, 'istek čeka samo regularno vrijeme glasanja (' + (Date.now() - t0) + ' ms)');
    ok(!g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }), 'istekla ponuda se ne može prihvatiti');
    g.stop();
  }

  console.log('5) Prekid veze: meta bez odgovora → poništeno; meta odgovori pa izgubi vezu → vrijedi; primatelj izgubi vezu → vrijedi');
  const peers = (g, ids) => ids.map((id) => ({ pid: id, name: NAMES[+id.slice(1)], av: +id.slice(1) }));
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    let o0; const r0 = await Q(g, {}, async () => { o0 = cur(g); g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); },
      async () => { g.syncPeers(peers(g, [o0.f])); });
    ok(r0.v.tkr && r0.v.tkr.k === 'off' && r0.v.P.every((p) => !p.tb) && o0.st === 'CANCELLED', 'meta odspojena bez odgovora: poništeno, bodovi isti (' + r0.v.tkr.line + ')');
    g.stop();
  }
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    let o0; const r0 = await Q(g, {}, async () => { o0 = cur(g); g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); },
      async () => { const G = g._G; g.setInput(o0.t, { s: G.s, c: (G.q.a + 1) % 4, t: 50 }); g.syncPeers(peers(g, [o0.f])); g.setInput(o0.f, { s: G.s, c: G.q.a, t: 50 }); });
    ok(r0.v.tkr && r0.v.tkr.k === 'win', 'meta odgovorila (krivo) pa izgubila vezu: oklada vrijedi');
    g.stop();
  }
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    let o0; const r0 = await Q(g, {}, async () => { o0 = cur(g); g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); },
      async () => { const G = g._G; g.syncPeers(peers(g, [o0.t])); g.setInput(o0.t, { s: G.s, c: (G.q.a + 1) % 4, t: 50 }); });
    ok(r0.v.tkr && r0.v.tkr.k === 'win' && P(r0, o0.f).tb === 150, 'primatelj izgubi vezu: oklada se obračunava normalno');
    g.syncPeers(peers(g, ['p0', 'p1']));
    ok(!(g.priv(o0.f) || {}).tk && JSON.stringify(g.view().tkr) === JSON.stringify(r0.v.tkr), 'nakon povratka: ispravno privatno stanje, isti ishod (isti id kartice → bez ponovne animacije)');
    g.stop();
  }
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    let o0; const r0 = await Q(g, {}, async () => { o0 = cur(g); g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); g.syncPeers(peers(g, [o0.f])); g.syncPeers(peers(g, [o0.f, o0.t])); },
      async () => { const G = g._G; g.setInput(o0.t, { s: G.s, c: G.q.a, t: 50 }); });
    ok(r0.v.tkr && r0.v.tkr.k === 'lose', 'meta se vrati prije pitanja i odgovori: oklada vrijedi normalno');
    g.stop();
  }
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    await until(() => g._G.ph === 'vote');
    const o0 = cur(g); g.syncPeers(peers(g, [o0.t]));
    const pv = g.priv(o0.f); g.syncPeers(peers(g, [o0.f, o0.t]));
    ok(g.priv(o0.f).tk && g.priv(o0.f).tk.id === o0.id && g.priv(o0.f).tk.st === 'o', 'primatelj se vrati tijekom glasanja: dobiva istu ponudu (isti ID)');
    ok(g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }), 'i može je prihvatiti');
    g.stop();
  }

  console.log('6) Tajni pakt, botovi, ograničenja');
  {
    let pairBad = 0, botBad = 0, nOff = 0;
    for (let k = 0; k < 6; k++) {
      const g = mk(3, { pacts: true }, { after: 4, gap: 1, offers: 3 }, 2);
      for (let i = 0; i < 4; i++) await Q(g, all(false, 3), async () => { if (i === 3) { g.pactAction('p0', { k: 'offer', to: 'p1' }); g.pactAction('p1', { k: 'accept', from: 'p0' }); } });
      for (let i = 0; i < 6; i++) await Q(g, all(false, 3), async () => { const o0 = cur(g); if (o0) { nOff++; if ((o0.f === 'p0' && o0.t === 'p1') || (o0.f === 'p1' && o0.t === 'p0')) pairBad++; if (g._p(o0.f).bot) botBad++; g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); } });
      ok(g._G.tk.n <= 2 && g._G.tk.offered <= 3, 'partija ' + (k + 1) + ': prihvaćeno ' + g._G.tk.n + ' (≤2), ponuđeno ' + g._G.tk.offered + ' (≤3), pakt aktivan: ' + !!g._p('p0').pact);
      g.stop();
    }
    ok(nOff > 0 && pairBad === 0, 'nikad ponuda između članova pakta (' + nOff + ' ponuda)');
    ok(botBad === 0, 'botovi nikad ne dobivaju ponude (mogu biti meta)');
  }
  {
    const g = mk(2, {}, { chance: 0 });
    for (let i = 0; i < 5; i++) await Q(g, all(false, 2));
    ok(g._G.tk.offered === 0, 'chance = 0: nema ponuda (učestalost je konfigurabilna)');
    g.stop();
  }
  {
    const g = mk(2); g._score('p0', 50); g._score('p1', 50);
    for (let i = 0; i < 4; i++) await Q(g, all(false, 2));
    ok(g._G.tk.offered === 0, 'tko ne može platiti gubitak (bodovi < 100) ne dobiva ponudu');
    g.stop();
  }
  {
    const g = mk(1, {}, {}, 2);
    for (let i = 0; i < 4; i++) await Q(g, all(false, 1), async () => { const o0 = cur(g); if (o0) { ok(o0.f === 'p0' && o0.t !== 'p0', 'jedan čovjek + botovi: ponuda čovjeku o botu, nikad o sebi'); g.pactAction('p0', { k: 'tkDecline', id: o0.id }); } });
    g.stop();
  }

  console.log('7) Posebne bitke, kladionica, finale');
  {
    const g = mk(2); await Q(g, all(false, 2)); await Q(g, all(false, 2));
    // sljedeća bitka je posebna (Tko sam ja?) → nema glasanja, nema ponude
    g._G.qvAt.set(g._G.bn + 1, 'who');
    await until(() => g._G.ph === 'howto');
    ok(!cur(g), 'posebna bitka: nema ponude');
    g.stop();
  }
  {
    const g = mk(2);
    await Q(g, all(false, 2)); await Q(g, all(false, 2));
    g._G.betAt.add(g._G.bn + 1);
    await until(() => g._G.ph === 'vote' && cur(g)); const o0 = cur(g);
    const r0 = await Q(g, { [o0.f]: true, [o0.t]: false }, async () => { g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); });
    ok(r0.v.tkr && r0.v.tkr.k === 'win' && P(r0, o0.f).br === 100 && P(r0, o0.f).tb === 150, 'kladionica u istom pitanju: ulog +100 i tajna oklada +150 odvojeno');
    ok(P(r0, o0.f).sc === r0.before[o0.f] + P(r0, o0.f).g + P(r0, o0.f).br + 150, 'zbroj točan: ' + r0.before[o0.f] + ' + ' + P(r0, o0.f).g + ' + ' + P(r0, o0.f).br + ' + 150 = ' + P(r0, o0.f).sc);
    g.stop();
  }
  {
    const g = E.createGame({ code: 'TK', cfg: Object.assign(FAST(), { fq: 0.5, fr: 0.05, fpower: 0.2 }), flags: FL, plan: [{ t: 'intro', title: 'R', sub: '' }, { t: 'battle' }, { t: 'battle' }, { t: 'battle' }, { t: 'finale' }], pacts: false, rc: false, tk: true });
    g.addPlayer('p0', 'Ana', 0, false); g.addPlayer('p1', 'Marko', 1, false);
    g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set(); g._score('p0', 3000); g._score('p1', 3000);
    for (let i = 0; i < 3; i++) await Q(g, all(false, 2), async () => { const o0 = cur(g); if (o0) g.pactAction(o0.f, { k: 'tkDecline', id: o0.id }); });
    let seen = 0; const t0 = Date.now();
    while (Date.now() - t0 < 2500 && g._G.ph !== 'final') { if (g._G.inFinale && cur(g)) seen++; await sleep(5); }
    ok(g._G.inFinale || g._G.ph === 'final', 'stiglo do piramide');
    ok(seen === 0, 'u završnoj piramidi nema ponuda');
    g.stop();
  }

  console.log('8) Krčma: niz, legende');
  {
    const g = mk(2, {}, { after: 4 });
    // Marko (p1) točno 4 puta zaredom, Ana krivo
    for (let i = 0; i < 4; i++) await Q(g, { p0: false, p1: true });
    let o0;
    const r0 = await Q(g, { p0: false, p1: false }, async () => { o0 = cur(g); g.pactAction(o0.f, { k: 'tkAccept', id: o0.id }); });
    ok(o0.f === 'p0' && o0.t === 'p1' && o0.k === 'st', 'krčmar bira metu po nizu (Marko, 4 zaredom): ' + o0.line);
    ok(/niz/.test(r0.v.tkr.line), 'krčma prepoznaje kraj niza: ' + r0.v.tkr.line);
    for (let i = 0; i < 7; i++) await Q(g, all(false, 2));
    await until(() => g._G.ph === 'final', 4000);
    const lg = g.view().lg, aw = lg && lg.aw.find((x) => x.k === 'tk');
    ok(aw && aw.t === 'Krčmarov miljenik' && aw.who[0] === 'p0', 'Legende: ' + (aw ? aw.ic + ' ' + aw.t + ' — ' + aw.line + ' (' + aw.num + ')' : 'nema'));
    ok(lg.aw.length <= 5, 'broj nagrada nije povećan (' + lg.aw.length + ' ≤ 5)');
    g.stop();
  }
  {
    const g = mk(2, {}, { after: 2 });
    for (let i = 0; i < 12; i++) await Q(g, all(false, 2), async () => { const o0 = cur(g); if (o0) g.pactAction(o0.f, { k: 'tkDecline', id: o0.id }); });
    await until(() => g._G.ph === 'final', 4000);
    ok(g.view().lg && !g.view().lg.aw.some((x) => x.k === 'tk'), 'nitko nije prihvatio: nema nagrade');
    g.stop();
  }

  console.log(fails ? '\n✘ ' + fails + ' PROVJERA PALO' : '\nTAJNE PONUDE OK');
  process.exit(fails ? 1 : 0);
})();
