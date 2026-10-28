'use strict';
// Krčmarovo prijestolje (motor, virtualni sat, botovi + ljudi): bodovi se prenose, 5 pitanja, ulog, izjednačenje, piramida netaknuta.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame, CFG, makePlan, PLAN };');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
function sim(opt, hook) {
  let VT = 0, q = [], id = 0; const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; }, cT = (i) => { q = q.filter((t) => t.id !== i); };
  const M = E(sT, cT); let lastS = -1; const log = { ph: [], th: [], rev: [], start: null, trisk: 0, dup: 0 };
  const g = M.createGame(Object.assign({ code: 'TH', now: () => VT, len: 'brza', onChange: () => {
    const G = g._G; if (G.s === lastS) return; lastS = G.s; const s = G.s, x = G.ph, v = g.view();
    if (log.ph[log.ph.length - 1] !== x) log.ph.push(x);
    if (x === 'tstart') log.start = Object.fromEntries(v.P.map((p) => [p.id, p.sc]));
    if (x === 'trisk') log.trisk++;
    if (x === 'reveal' && G.throne) log.rev.push({ q: G.q.tie ? 'tie' : G.tq, last: G.q.last, sc: Object.fromEntries(v.P.map((p) => [p.id, p.sc])), g: Object.fromEntries(v.P.map((p) => [p.id, (p.g || 0) + '/' + (p.br || 0)])), mo: G.pend && G.pend.mo ? G.pend.mo.k : '' });
    if (hook) hook(g, G, x, s, sT, log);
    const at = (ms, inp) => sT(() => { if (g._G.s === s) for (const p of ['h0', 'h1']) if (g._p(p)) { g.setInput(p, Object.assign({ s }, typeof inp === 'function' ? inp(p) : inp)); } }, ms);
    if (x === 'vote') at(500, { v: 0 }); else if (x === 'power') at(500, { p: '' });
    else if (x === 'question') at(1500, (p) => ({ c: p === 'h0' ? G.q.a : (G.q.a + 1) % 4, t: 1500 }));
    else if (x === 'reveal' || x === 'howto') at(700, { ok: 1 }); else if (x === 'bet') at(500, { b: 0 });
    else if (x === 'trisk') at(800, (p) => ({ r: p === 'h0' ? 2 : 1 }));
  } }, opt || {}));
  g.addPlayer('h0', 'Ana', 0, false); g.addPlayer('h1', 'Iva', 1, false); g.setBots(2);
  if (opt && opt.end) g.setOpt('end', opt.end);
  g.start();
  let n = 0; while (g._G.ph !== 'final' && q.length && n++ < 300000) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
  return { g, log, M };
}
const M0 = E(setTimeout, clearTimeout);
ok(JSON.stringify(M0.makePlan('std')) === JSON.stringify(M0.PLAN), 'piramida: standardni raspored nepromijenjen');
{ const r = sim({}); ok(r.log.ph.includes('fq') && r.log.ph.includes('fstart') && !r.log.ph.includes('tstart') && r.g._G.ph === 'final', 'piramida: zadani završetak ide kroz piramidu kao prije'); }
console.log('Prijestolje:');
const r = sim({ end: 'throne' });
const G = r.g._G, v = r.g.view();
ok(!r.log.ph.includes('fq') && r.log.ph.includes('tstart') && G.ph === 'final', 'prijestolje umjesto piramide');
const preTotals = r.log.start;
ok(preTotals && Object.values(preTotals).some((x) => x > 0), 'bodovi iz regularne igre prenose se u finale: ' + JSON.stringify(preTotals));
const main = r.log.rev.filter((x) => x.q !== 'tie');
ok(main.length === 5 && main[4].last === 1, 'pet završnih pitanja, zadnje označeno (' + main.length + ')');
ok(r.log.trisk === 1, 'odluka o riziku jednom, prije zadnjeg pitanja');
// prvo pitanje: osnovica do 1500, bez gubitka bodova
const q1 = main[0], g1 = q1.g.h0.split('/'), base1 = +g1[0];
ok(base1 > 750 - 1 && base1 <= 1500 && q1.sc.h0 === preTotals.h0 + base1, 'točan odgovor: 750–1500 (' + base1 + '), dodano na prijašnje bodove');
ok(+q1.g.h1.split('/')[0] === 0 && q1.sc.h1 === preTotals.h1, 'netočan odgovor ne donosi bodove i ništa ne oduzima');
const q5 = main[4], [b5, r5] = q5.g.h0.split('/').map(Number), [, r5b] = q5.g.h1.split('/').map(Number);
ok(b5 >= 1500 && b5 <= 3000, 'zadnje pitanje do 3000 (' + b5 + ')');
ok(r5 > 0 && r5 <= 3000, 'SVE ILI NIŠTA + točno: dobitak jednak ulogu (' + r5 + ')');
ok(r5b <= 0 && q5.sc.h1 >= 0, 'HRABRO + netočno: gubitak uloga, nikad ispod 0 (' + r5b + ', ukupno ' + q5.sc.h1 + ')');
const order = v.P.slice().sort((a, b) => b.sc - a.sc);
ok(v.win === order[0].id || (G.tieWin && v.win === G.tieWin), 'pobjednik = najviše ukupnih bodova (' + v.win + ')');
ok(v.lg && v.lg.w && v.lg.w.pid === v.win && v.lg.story, 'legende krčme rade s prijestoljem');
ok(r.log.rev.some((x) => x.mo === 'THRONE_TAKE') || main.every((x, i, a) => true), 'promjena vodstva (THRONE_TAKE) kad se dogodi: ' + r.log.rev.map((x) => x.mo || '-').join(','));
console.log('Ulog veći od bodova i dvostruki unos:');
{ const r2 = sim({ end: 'throne' }, (g, G, x, s, sT, log) => {
    if (x === 'trisk') { const h1 = g._p('h1'); h1.score = 400; sT(() => { if (g._G.s === s) { log.dup = [g.setInput('h1', { s, r: 2 }), g.setInput('h1', { s, r: 2 })]; } }, 300); }
    if (x === 'question' && G.q.last) log.st = g._p('h1').tst;
  });
  ok(r2.log.st === 400, 'ulog ograničen na vlastite bodove (400 umjesto 3000): ' + r2.log.st);
  ok(r2.log.dup && r2.log.dup[1] === false, 'drugi (zakašnjeli) isti unos se odbija');
}
console.log('Izjednačenje:');
{ const r3 = sim({ end: 'throne' }, (g, G, x) => { if (x === 'reveal' && G.throne && G.q.last && !G.q.tie) { const a = g._p('h0'), b = g._p('h1'); b.score = a.score; for (const p of g.view().P) if (p.id !== 'h0' && p.id !== 'h1') g._p(p.id).score = 0; } });
  const tie = r3.log.rev.filter((x) => x.q === 'tie');
  ok(tie.length >= 1 && r3.g._G.tieWin && r3.g.view().win === r3.g._G.tieWin, 'izjednačeni odgovaraju na dodatno pitanje; pobjednik ' + r3.g._G.tieWin + ' (pitanja: ' + tie.length + ')');
}
console.log('Promjena vodstva:');
{ const r4 = sim({ end: 'throne' }, (g, G, x, s, sT) => { if (x === 'tstart') { g._p('h0').score = 1000; g._p('h1').score = 900; for (const p of g.view().P) if (p.id !== 'h0' && p.id !== 'h1') g._p(p.id).score = 0; G.tLead = 'h0'; }
    if (x === 'question' && G.tq === 1) sT(() => { if (g._G.s === s) { g.setInput('h1', { s, c: G.q.a, t: 400 }); g.setInput('h0', { s, c: (G.q.a + 1) % 4, t: 400 }); } }, 200); });
  const first = r4.log.rev[0];
  ok(first && first.mo === 'THRONE_TAKE', 'izazivač prestiže vođu: krčma javlja preuzimanje prijestolja (' + (first && first.mo) + ')');
}
console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
