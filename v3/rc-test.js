'use strict';
// Rivalski obračun: dobrovoljno, između pitanja, rješava domaćin na sljedećem običnom pitanju, točno jednom.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P0 = { n: { w: 1, s: 1, t: 0.03 }, t: { w: 1, s: 1, t: 0.03 }, d: { w: 1, s: 1, t: 0.03 } };
const FAST = { intro: 0.02, vote: 2, voteShow: 0.02, roul: 0.02, power: 2, cast: 0.02, q: 3, pace: P0, paceMo: 0.01, moment: 0.02, betrayShow: 0.03, loyalShow: 0.03, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, pactOffer: 5, rcOffer: 5, fstart: 0.03 };
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
const NAMES = ['Ana', 'Marko', 'Iva', 'Luka'];
const PLAN = (n) => [{ t: 'intro', title: 'R', sub: '' }].concat(Array.from({ length: n }, () => ({ t: 'battle' })));
function mk(scores, extra, bots) {
  const g = E.createGame(Object.assign({ code: 'RC', cfg: FAST, flags: FL, plan: PLAN(14), pacts: false }, extra || {}));
  scores.forEach((s, i) => g.addPlayer('p' + i, NAMES[i], i, false));
  if (bots) g.setBots(bots);
  g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  scores.forEach((s, i) => g._score('p' + i, s));
  return g;
}
async function until(f, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(2); } return false; }
// jedno pitanje; pw() se poziva u fazi moći (prozor za izazove), q() tijekom pitanja prije odgovora
async function Q(g, a, pw, q) {
  const G = g._G;
  await until(() => G.ph === 'vote'); let s = G.s;
  for (const p of g.view().P.filter((x) => !x.b)) g.setInput(p.id, { s, v: 0 });
  await until(() => G.ph === 'power'); s = G.s;
  if (pw) pw();
  for (const p of g.view().P.filter((x) => !x.b)) g.setInput(p.id, { s, p: '' });
  await until(() => G.ph === 'question'); s = G.s;
  if (q) q();
  const before = Object.fromEntries(g.view().P.map((p) => [p.id, p.sc]));
  for (const [id, r] of Object.entries(a)) if (r !== null) g.setInput(id, { s, c: r ? G.q.a : (G.q.a + 1) % 4, t: 100 });
  await until(() => G.ph === 'reveal', 6000);
  return { v: g.view(), before };
}
const all = (w, n = 4) => Object.fromEntries(Array.from({ length: n }, (_, i) => ['p' + i, w]));
const P = (r, id) => r.v.P.find((p) => p.id === id);
const off = async (g, k) => { for (let i = 0; i < k; i++) await Q(g, all(false)); };

(async () => {
  console.log('1) Dva igrača: prije 5. pitanja nema izazova; zatim izazov, prihvaćanje, javni događaj');
  let g = mk([2000, 2000], {}, 0);
  let r = await Q(g, all(false, 2), () => { ok(!g.pactAction('p0', { k: 'rcOffer', to: 'p1' }), 'prije 5. pitanja izazov odbijen'); });
  await off(g, 4);
  r = await Q(g, { p0: true, p1: false }, () => {
    ok(g.priv('p0').rc && g.priv('p0').rc.can && g.priv('p0').rc.cand.some((c) => c.id === 'p1'), 'Ana može izazvati Marka');
    ok(g.pactAction('p0', { k: 'rcOffer', to: 'p1' }), 'Ana šalje izazov');
    const inv = (g.priv('p1').rc || {}).inv || [];
    ok(inv.length === 1 && inv[0].f === 'p0' && inv[0].dur === 5000, 'Marko privatno vidi ponudu s rokom');
    ok(!g.view().rc && !JSON.stringify(g.view()).includes('rcOffer'), 'prije prihvaćanja javno ništa');
    ok(!g.pactAction('p1', { k: 'rcAccept', from: 'p3' }) && !g.pactAction('p0', { k: 'rcAccept', from: 'p0' }), 'ne može se prihvatiti u tuđe ime ni sam sebi');
    ok(g.pactAction('p1', { k: 'rcAccept', from: 'p0' }), 'Marko prihvaća');
    ok(g.view().rc && g.view().rc.a === 'p0' && g.view().rc.b === 'p1' && g.view().rc.st === 200, 'svi vide aktivan obračun (ulog 200)');
    ok(/Rivalski obračun: Ana vs Marko/.test((g.view().news || {}).t || ''), 'javna obavijest: ' + (g.view().news || {}).t);
  });
  console.log('2) Ana točno, Marko krivo → +200 / −200, regularni bodovi nepromijenjeni');
  ok(P(r, 'p0').sc === r.before.p0 + P(r, 'p0').g + 200 && P(r, 'p0').rx === 200, 'Ana: ' + r.before.p0 + ' + ' + P(r, 'p0').g + ' + 200 = ' + P(r, 'p0').sc);
  ok(P(r, 'p1').sc === r.before.p1 - 200 && P(r, 'p1').rx === -200, 'Marko: ' + r.before.p1 + ' − 200 = ' + P(r, 'p1').sc);
  ok(r.v.rcr && r.v.rcr.k === 'win' && r.v.rcr.w === 'p0' && r.v.rcr.t === 200 && /pobjeđuje|nazdravlja/.test(r.v.rcr.line), 'ishod na otkrivanju: ' + (r.v.rcr && r.v.rcr.line));
  ok(r.v.pc === 't' || r.v.pc === 'd', 'otkrivanje s obračunom je barem napeto (' + r.v.pc + ')');
  const sc1 = r.v.P.map((p) => p.sc).join(); await sleep(20);
  ok(g.view().P.map((p) => p.sc).join() === sc1 && JSON.stringify(g.view().rcr) === JSON.stringify(r.v.rcr), 'ponovno čitanje stanja ne obračunava ponovno');
  ok(!g.view().rc, 'obračun je završen');
  console.log('3) Ista osoba ne može ponovno pokrenuti; Marko može jednom; najviše 2 po partiji');
  r = await Q(g, { p0: true, p1: true }, () => {
    ok(!g.pactAction('p0', { k: 'rcOffer', to: 'p1' }), 'Ana je već imala svoj obračun');
    ok(g.pactAction('p1', { k: 'rcOffer', to: 'p0', st: 99999 }) && g.pactAction('p0', { k: 'rcAccept', from: 'p1' }), 'Marko izaziva Anu (pokušaj zadavanja uloga ignoriran)');
    ok(g.view().rc.st === 200, 'ulog određuje domaćin: 200');
  });
  console.log('4) Oboje točno → neriješeno (brzina se ne koristi)');
  ok(r.v.rcr.k === 'tie' && !P(r, 'p0').rx && !P(r, 'p1').rx && /otvoren/.test(r.v.rcr.line), r.v.rcr.line);
  r = await Q(g, all(false, 2), () => { ok(!g.pactAction('p1', { k: 'rcOffer', to: 'p0' }), 'treći obračun nije moguć (najviše 2)'); });
  g.stop();

  console.log('5) Oboje krivo, odbijanje i istek bez traga');
  g = mk([3000, 3000, 3000, 3000]); await off(g, 5);
  r = await Q(g, all(false), () => { g.pactAction('p2', { k: 'rcOffer', to: 'p3' }); g.pactAction('p3', { k: 'rcAccept', from: 'p2' }); });
  ok(r.v.rcr && r.v.rcr.k === 'tie' && r.v.P.every((p) => !p.rx), 'oboje krivo: neriješeno, nitko ne gubi');
  await Q(g, all(false), () => {
    ok(g.pactAction('p0', { k: 'rcOffer', to: 'p1' }), 'Ana izaziva Marka');
    ok(!g.pactAction('p0', { k: 'rcOffer', to: 'p2' }), 'drugi izazov dok je prvi otvoren: odbijen');
    ok(g.pactAction('p1', { k: 'rcDecline', from: 'p0' }), 'Marko odbija');
    ok(/nije prihvaćen/.test((g.priv('p0').note || {}).t || '') && !g.view().rc && !g.priv('p2').rc.inv, 'Ana dobiva neutralnu poruku, ostali ništa');
  });
  await Q(g, all(false), () => { ok(g.pactAction('p0', { k: 'rcOffer', to: 'p1' }), 'Ana opet izaziva (drugi pokušaj)'); });
  ok(!g._G.rc.offers.length && /nije prihvaćen/.test((g.priv('p0').note || {}).t || ''), 'ponuda bez odgovora zatvara se kad krene pitanje (ista poruka)');
  await Q(g, all(false), () => { ok(!g.pactAction('p0', { k: 'rcOffer', to: 'p1' }), 'najviše 2 pokušaja po igraču'); });
  g.stop();

  console.log('6) Izgubljena veza: bez odgovora = otkazano; nakon odgovora ishod vrijedi');
  g = mk([3000, 3000, 1000, 1000]); await off(g, 5);
  r = await Q(g, { p0: true, p1: null, p2: false, p3: false }, () => { g.pactAction('p0', { k: 'rcOffer', to: 'p1' }); g.pactAction('p1', { k: 'rcAccept', from: 'p0' }); },
    () => g.syncPeers([{ pid: 'p0' }, { pid: 'p2' }, { pid: 'p3' }]));
  ok(r.v.rcr && r.v.rcr.k === 'off' && !P(r, 'p0').rx && P(r, 'p1').sc === r.before.p1, 'Marko bez veze i bez odgovora: otkazano, nitko ne gubi');
  g.syncPeers([{ pid: 'p0' }, { pid: 'p1' }, { pid: 'p2' }, { pid: 'p3' }]);
  r = await Q(g, { p0: true, p1: false, p2: false, p3: false }, () => { g.pactAction('p1', { k: 'rcOffer', to: 'p0' }); g.pactAction('p0', { k: 'rcAccept', from: 'p1' }); });
  ok(r.v.rcr.k === 'win' && r.v.rcr.w === 'p0', 'odgovor dan prije prekida vrijedi (ne može se izbjeći gubitak)');
  g.stop();

  console.log('7) Premalo bodova, botovi, isključena opcija');
  g = mk([3000, 100], {}, 2); await off(g, 5);
  await Q(g, all(false, 2), () => {
    const pv = g.priv('p0').rc || {};
    ok(!(pv.cand || []).some((c) => c.id === 'p1'), 'igrač s manje od uloga ne može biti izazvan');
    ok(!(pv.cand || []).some((c) => c.id.startsWith('bot')), 'botovi se ne mogu izazvati');
    ok(!g.pactAction('p1', { k: 'rcOffer', to: 'p0' }), 'igrač s manje od uloga ne može izazivati');
  });
  g.stop();
  g = mk([3000, 3000], { rc: false }); await off(g, 5);
  await Q(g, all(false, 2), () => { ok(!g.pactAction('p0', { k: 'rcOffer', to: 'p1' }) && !(g.priv('p0') || {}).rc, 'opcija isključena: nema izazova ni stanja'); });
  g.stop();

  console.log('8) Uz pakt, kladionicu i moći: sve se obračunava točno jednom');
  g = mk([3000, 3000, 2000, 2000], { pacts: true }); await off(g, 5);
  let pk = false;
  r = await Q(g, { p0: true, p1: false, p2: false, p3: false }, () => {
    g.pactAction('p0', { k: 'offer', to: 'p1' }); pk = g.pactAction('p1', { k: 'accept', from: 'p0' });
    g.pactAction('p0', { k: 'rcOffer', to: 'p1' }); g.pactAction('p1', { k: 'rcAccept', from: 'p0' });
    g._p('p2').offers = ['led', 'dupli', 'stit']; g.setInput('p2', { s: g._G.s, p: 'led', t: 'p0' });
  });
  ok(pk && r.v.rcr.k === 'win' && g._G.pacts.some((k) => k.on), 'pakt ostaje aktivan nakon obračuna između saveznika');
  ok(P(r, 'p0').sc === r.before.p0 + P(r, 'p0').g + 200, 'bodovi uz moć i pakt: ' + P(r, 'p0').sc);
  g.stop();
  g = mk([3000, 3000, 2000, 2000]); await off(g, 5);
  g._G.betAt = new Set([g._G.bn + 1]);
  await until(() => g._G.ph === 'vote'); for (const p of g.view().P) g.setInput(p.id, { s: g._G.s, v: 0 });
  await until(() => g._G.ph === 'bet');
  g.pactAction('p0', { k: 'rcOffer', to: 'p1' }); g.pactAction('p1', { k: 'rcAccept', from: 'p0' });
  for (const p of g.view().P) g.setInput(p.id, { s: g._G.s, b: 500 });
  await until(() => g._G.ph === 'power'); for (const p of g.view().P) g.setInput(p.id, { s: g._G.s, p: '' });
  await until(() => g._G.ph === 'question'); const b0 = Object.fromEntries(g.view().P.map((p) => [p.id, p.sc])); const s = g._G.s;
  g.setInput('p0', { s, c: g._G.q.a, t: 100 }); for (const id of ['p1', 'p2', 'p3']) g.setInput(id, { s, c: (g._G.q.a + 1) % 4, t: 100 });
  await until(() => g._G.ph === 'reveal'); const v8 = g.view(), A = v8.P.find((p) => p.id === 'p0'), B = v8.P.find((p) => p.id === 'p1');
  ok(A.sc === b0.p0 + A.g + A.br + 200 && B.sc === b0.p1 + B.br - 200, 'uz kladionicu: Ana ' + b0.p0 + ' + ' + A.g + ' + ' + A.br + ' + 200 = ' + A.sc + ' · Marko ' + b0.p1 + ' ' + B.br + ' − 200 = ' + B.sc);
  g.stop();

  console.log('9) Postojeći rivali i osveta; legende');
  g = mk([3000, 3000, 1000, 1000]); await off(g, 5);
  const T = g._td(); T.attacks.p1 = { p0: 2 };
  r = await Q(g, { p0: true, p1: false, p2: false, p3: false }, () => {
    const c = (g.priv('p0').rc.cand || []).find((x) => x.id === 'p1'); ok(c && c.rev === 1, 'Ana vidi da Marku može uzvratiti (osveta)');
    g.pactAction('p0', { k: 'rcOffer', to: 'p1' }); ok(g.priv('p1').rc.inv[0].rev === 1, 'Marko vidi da Ana traži osvetu');
    g.pactAction('p1', { k: 'rcAccept', from: 'p0' }); ok(/traži osvetu/.test(g.view().news.t), 'javno: ' + g.view().news.t);
  });
  ok(/Osveta je slatka/.test(r.v.rcr.line) && P(r, 'p0').rx === 200, 'osveta bez bonusa, samo ulog: ' + r.v.rcr.line);
  ok(T.stat.rc.length === 1 && T.leg.rev && T.leg.rev.rc, 'krčma pamti obračun i osvetu');
  g.stop();

  console.log('10) Finale s neriješenom ponudom ili aktivnim obračunom: otkazano bez bodova');
  g = E.createGame({ code: 'RF', cfg: FAST, flags: FL, plan: PLAN(6).concat([{ t: 'intro', title: 'F', sub: '' }, { t: 'finale' }]), pacts: false });
  NAMES.forEach((n, i) => g.addPlayer('p' + i, n, i, false)); g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set(); NAMES.forEach((n, i) => g._score('p' + i, 3000));
  await off(g, 6);
  ok(g._G.ph === 'reveal' && g._G.qn === 6, 'zadnje otkrivanje prije finala');
  ok(g.pactAction('p0', { k: 'rcOffer', to: 'p1' }) && g.pactAction('p1', { k: 'rcAccept', from: 'p0' }), 'obračun dogovoren na zadnjem otkrivanju');
  const sc0 = g.view().P.map((p) => p.sc + (p.id === 'p0' || p.id === 'p1' ? 0 : 0)).join();
  await until(() => g._G.inFinale, 8000);
  ok(!g._G.rc.act && /otkazan/.test((g.priv('p0').note || {}).t || ''), 'u finalu: obračun otkazan, oba igrača obaviještena');
  g.stop();

  console.log(fails ? 'GREŠAKA: ' + fails : 'OBRAČUN OK');
  process.exit(fails ? 1 : 0);
})();
