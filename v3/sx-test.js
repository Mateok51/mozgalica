'use strict';
// Tajni događaj: nakon pitanja svi vide tko je što smjerao (i kad plan nije iskorišten). node v3/sx-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame, CFG };');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
for (const pickT of [false, true]) {
  let VT = 0, q = [], id = 0; const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; }, cT = (i) => { q = q.filter((t) => t.id !== i); };
  const M = E(sT, cT); let lastS = -1; const seen = []; let secrets = 0;
  const g = M.createGame({ code: 'SX', now: () => VT, cfg: { secretChance: 1, kr: Object.assign({}, M.CFG.kr, { pactChance: 0, offChance: 0, chFrom: 99, wait: 3 }), chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0] }, onChange: () => {
    const G = g._G; if (G.s === lastS) return; lastS = G.s; const s = G.s, x = G.ph, v = g.view();
    if (x === 'secret') { secrets++; if (pickT) { const P = G.se.p, X = ['h0', 'h1', 'h2'].find((k) => k !== P); sT(() => { if (g._G.s === s) g.setInput(P, { s, x: X }); }, 400); } }
    if (x === 'reveal' && v.sxr) seen.push(v.sxr);
    const at = (ms, inp) => sT(() => { if (g._G.s === s) for (const p of ['h0', 'h1', 'h2']) g.setInput(p, Object.assign({ s }, inp)); }, ms);
    if (x === 'vote') at(500, { v: 0 }); else if (x === 'power') at(500, { p: '' }); else if (x === 'question') at(800, { c: Math.random() < 0.5 ? G.q.a : (G.q.a + 1) % 4, t: 800 });
    else if (x === 'reveal' || x === 'howto') at(700, { ok: 1 }); else if (x === 'bet') at(500, { b: 0 });
  } });
  for (const [i, n] of ['Ana', 'Iva', 'Luka'].entries()) g.addPlayer('h' + i, n, i, false);
  g.start();
  let n = 0; while (g._G.ph !== 'final' && q.length && n++ < 300000) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
  ok(secrets > 0 && seen.length === secrets, (pickT ? 'odabrana meta' : 'bez odabira') + ': svaki tajni događaj (' + secrets + ') otkriva se na ploči: ' + seen.map((x) => x.k + (x.none ? ':neiskorišten' : ':' + x.p + '→' + x.x + (x.res ? ' pogodak' : ''))).join(', '));
}
console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
