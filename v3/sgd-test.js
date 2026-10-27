'use strict';
// Smart Game Director: raspored je ponovljiv, ne mijenja se tijekom igre ni pri ponovnom spajanju, poštuje sadržaj, ne ovisi o bodovima.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG, DATA };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function seeded(seed, fn) { const R0 = Math.random; let s = seed; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; try { return fn(); } finally { Math.random = R0; } }
function sched(g) { const G = g._G, out = []; let bn = 0, ci = 0; for (const it of g._plan()) { if (it.t === 'battle') out.push(G.qvAt.get(bn++) || 'q'); else if (it.t === 'challenge') out.push(G.chal[ci++]); else out.push('|'); } return out.join(','); }
function mk(n, extra, scores) { const g = E.createGame(Object.assign({ code: 'SG', cfg: { intro: 60 }, flags: { ENABLE_SECRET_EVENTS: false } }, extra || {})); for (let i = 0; i < n; i++) g.addPlayer('p' + i, 'P' + i, i, false); if (scores) scores.forEach((x, i) => g._score('p' + i, x)); return g; }
(async () => {
  console.log('1) Ponovljivo i različito');
  const a = seeded(11, () => { const g = mk(4); g.start(); const x = sched(g); g.stop(); return x; });
  const b = seeded(11, () => { const g = mk(4); g.start(); const x = sched(g); g.stop(); return x; });
  const c = new Set([12, 13, 14, 15, 16, 17].map((sd) => seeded(sd, () => { const g = mk(4); g.start(); const x = sched(g); g.stop(); return x; })));
  ok(a === b, 'isti izvor slučajnosti → isti raspored: ' + a);
  ok(c.size >= 4, 'različite partije → različiti rasporedi (' + c.size + '/6)');
  console.log('2) Raspored ne ovisi o bodovima i ne mijenja se tijekom igre ni pri ponovnom spajanju');
  const s1 = seeded(21, () => { const g = mk(4, null, [0, 0, 0, 0]); g.start(); const x = sched(g); g.stop(); return x; });
  const s2 = seeded(21, () => { const g = mk(4, null, [9000, 10, 500, 0]); g.start(); const x = sched(g); g.stop(); return x; });
  ok(s1 === s2, 'jednak raspored bez obzira na bodove');
  const g = seeded(31, () => { const g = mk(4); g.start(); return g; }); const before = sched(g);
  g.syncPeers([{ pid: 'p0' }, { pid: 'p1' }]); g.syncPeers([{ pid: 'p0' }, { pid: 'p1' }, { pid: 'p2' }, { pid: 'p3' }]); g.view(); g.view();
  ok(sched(g) === before, 'odspajanje i ponovno spajanje ne mijenjaju raspored');
  g.stop();
  console.log('3) Sadržaj: bez podataka za vrstu ta se vrsta ne bira; bez Što misli većina s 2 igrača');
  const noWho = Object.assign({}, E.DATA, { who: [] }), none = Object.assign({}, E.DATA, { who: [], emoji: [] });
  let whoSeen = 0, varSeen = 0, majSeen = 0;
  for (let k = 0; k < 300; k++) {
    seeded(100 + k, () => { const g1 = mk(4, { data: noWho }); g1.start(); if (sched(g1).includes('who')) whoSeen++; g1.stop();
      const g2 = mk(4, { data: none }); g2.start(); if (/who|emoji/.test(sched(g2))) varSeen++; g2.stop();
      const g3 = mk(2); g3.start(); if (sched(g3).includes('maj')) majSeen++; g3.stop(); });
  }
  ok(whoSeen === 0 && varSeen === 0 && majSeen === 0, 'bez "Tko sam ja?" nikad who (' + whoSeen + '), bez obje vrste nikad posebne bitke (' + varSeen + '), s 2 igrača nikad većina (' + majSeen + ')');
  console.log('4) Nova partija: novi raspored, osnovni plan se ne "kvari" ponavljanjem');
  const g4 = mk(3); let ok4 = true; const seen4 = new Set();
  for (let k = 0; k < 40; k++) { seeded(200 + k, () => g4.start()); const sq = sched(g4); seen4.add(sq);
    const pl = g4._plan(); if (pl.length !== E.createGame({ code: 'X' })._plan().length) ok4 = false;
    pl.forEach((it, i) => { if (it.t === 'challenge' && (!pl[i - 1] || pl[i - 1].t !== 'battle')) ok4 = false; });
    g4._G.ph = 'final'; g4.restart(); }
  ok(ok4 && seen4.size > 20, 'nakon 40 novih partija plan je cjelovit, izazov nikad na početku runde; ' + seen4.size + ' različitih rasporeda');
  g4.stop();
  console.log('5) Partija s botovima do kraja uz novi raspored (upute s potvrdom)');
  const P0 = { n: { w: 1, s: 1, t: 0.03 }, t: { w: 1, s: 1, t: 0.03 }, d: { w: 1, s: 1, t: 0.03 } };
  const g5 = E.createGame({ code: 'SB', cfg: { intro: 0.03, vote: 0.3, voteShow: 0.03, roul: 0.03, power: 0.3, cast: 0.03, q: 0.5, pace: P0, paceMo: 0.01, moment: 0.03, howtoMax: 5, sort: 0.6, link: 0.6, order: 0.6, hilo: 0.6, blitz: 0.6, maj: 0.4, majReveal: 0.03, chReveal: 0.03, bet: 0.3, duelIntro: 0.03, duel: 0.4, duelRes: 0.03, fstart: 0.05, fpower: 0.2, fq: 0.4, fqCrown: 0.4, fr: 0.03, betrayShow: 0.03, loyalShow: 0.03 }, flags: { ENABLE_SECRET_EVENTS: false } });
  g5.addPlayer('h', 'Ja', 0, false); g5.setBots(3); g5.start();
  const kinds = new Set(); let ht = 0; const t0 = Date.now();
  while (g5._G.ph !== 'final' && Date.now() - t0 < 90000) { const v = g5.view(); if (v.ph === 'howto' && !v.P.find((p) => p.id === 'h').ok) { ht++; kinds.add(v.ht.kd); g5.setInput('h', { s: v.s, ok: 1 }); } if (v.ph === 'question') g5.setInput('h', { s: v.s, c: 0, t: 200 }); await sleep(3); }
  ok(g5._G.ph === 'final', 'stigli do kraja; potvrđenih uputa: ' + ht + ', skupine: ' + [...kinds].join(', '));
  g5.stop();
  console.log(fails ? 'GREŠAKA: ' + fails : 'SMART GAME DIRECTOR OK'); process.exit(fails ? 1 : 0);
})();
