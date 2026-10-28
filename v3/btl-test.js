'use strict';
// Izdaja pripremljena na ploči: na sljedećoj ploči je zaključana (ne nudi se ponovno), a odmah nakon te ploče se izvršava. node v3/btl-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame, CFG };');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
let VT = 0, q = [], id = 0; const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; }, cT = (i) => { q = q.filter((t) => t.id !== i); };
const M = E(sT, cT); let lastS = -1, step = 'pact', seenLocked = null, offeredAgain = false, betrayAt = null, prepQ = null, lockQ = null;
const g = M.createGame({ code: 'BT', now: () => VT, cfg: { kr: Object.assign({}, M.CFG.kr, { pactChance: 0, offChance: 0, chFrom: 99, wait: 3 }), chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0] }, onChange: () => {
  const G = g._G; if (G.s === lastS) return; lastS = G.s; const s = G.s, x = G.ph;
  if (x === 'reveal') {
    const pv = g.priv('h0') || {}, k = pv.k;
    if (step === 'pact' && G.bdone >= 1) { g._pact('h0', 'h1'); step = 'wait'; }
    else if (step === 'wait' && k && k.cb && !k.wait) { g.pactAction('h0', { k: 'betray', on: true }); prepQ = G.bdone; step = 'prep'; }
    else if (step === 'prep' && G.bdone > prepQ) { lockQ = G.bdone; seenLocked = !!(k && k.btl); offeredAgain = !!(k && k.cb); step = 'locked'; }
  }
  if (x === 'betray' && betrayAt == null) betrayAt = G.bdone;
  const at = (ms, inp) => sT(() => { if (g._G.s === s) for (const p of ['h0', 'h1', 'h2']) g.setInput(p, Object.assign({ s }, inp)); }, ms);
  if (x === 'vote') at(500, { v: 0 }); else if (x === 'power') at(500, { p: '' }); else if (x === 'question') at(800, { c: G.q.a, t: 800 });
  else if (x === 'reveal' || x === 'howto') at(700, { ok: 1 }); else if (x === 'bet') at(500, { b: 0 });
} });
for (const [i, n] of ['Ana', 'Iva', 'Luka'].entries()) g.addPlayer('h' + i, n, i, false);
g.start();
let n = 0; while (g._G.ph !== 'final' && q.length && n++ < 300000 && betrayAt == null) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
ok(prepQ != null, 'izdaja pripremljena na ploči nakon ' + prepQ + '. pitanja');
ok(seenLocked === true && offeredAgain === false, 'na sljedećoj ploči izdaja je zaključana i ne nudi se ponovno (zaključana ' + seenLocked + ', ponovno ponuđena ' + offeredAgain + ')');
ok(betrayAt === lockQ, 'izdaja se otkriva odmah nakon te ploče (nakon ' + betrayAt + '. pitanja)');
console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
