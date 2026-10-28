'use strict';
// Procjena trajanja partije po načinu (virtualni sat: stvarni timeri igre, bez čekanja). node v3/len-time.js [ponavljanja]
// Jedan „čovjek” (odgovara ~7 s, tapne Nastavi nakon ~4 s, mini-igre do kraja timera) + 3 bota.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame, CFG };');
function run(len, seed, H) {
  let VT = 0, q = [], id = 0;
  const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; };
  const cT = (i) => { q = q.filter((t) => t.id !== i); };
  const M = E(sT, cT);
  const ph = {}; let lastS = -1, lastPh = '', lastAt = 0;
  const g = M.createGame({ code: 'LT', now: () => VT, len, onChange: () => {
    const G = g._G;
    if (G.s === lastS) return; lastS = G.s;
    ph[lastPh] = (ph[lastPh] || 0) + (VT - lastAt); lastPh = G.ph; lastAt = VT;
    const s = G.s, P = 'h0', x = G.ph;
    const at = (ms, inp) => sT(() => { if (g._G.s === s) g.setInput(P, Object.assign({ s }, inp)); }, ms);
    const ok = Math.random() < H.acc;
    if (x === 'vote') at(H.vote, { v: 0 });
    else if (x === 'power') at(H.power, { p: '' });
    else if (x === 'question') at(H.q, { c: ok ? G.q.a : (G.q.a + 1) % 4, t: H.q });
    else if (x === 'fq') at(H.fq, { c: ok ? G.q.a : (G.q.a + 1) % G.q.o.length, t: H.fq });
    else if (x === 'reveal' || x === 'howto') at(H.ok, { ok: 1 });
    else if (x === 'bet') at(H.bet, { b: 0 });
  } });
  g.addPlayer('h0', 'Ana', 0, false); g.setBots(3); g.start();
  let n = 0;
  while (g._G.ph !== 'final' && q.length && n++ < 200000) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
  ph[lastPh] = (ph[lastPh] || 0) + (VT - lastAt);
  const fin = ['fstart', 'fpower', 'power', 'fq', 'fr', 'loyal'].reduce((a, k) => a, 0);
  return { min: VT / 60000, fqn: g._G.fqn, ph, ok: g._G.ph === 'final' };
}
const N = +(process.argv[2] || 3);
const PROF = { brzi: { vote: 4000, power: 5000, q: 7000, fq: 5000, ok: 4000, bet: 5000, acc: 0.7 }, stvarni: { vote: 8000, power: 9000, q: 11000, fq: 7000, ok: 8000, bet: 9000, acc: 0.6 } };
for (const pk of Object.keys(PROF)) for (const len of ['brza', 'std', 'duga']) {
  const r = Array.from({ length: N }, (_, i) => run(len, i, PROF[pk])); process.stdout.write(pk.padEnd(8));
  const m = r.map((x) => x.min), avg = m.reduce((a, b) => a + b, 0) / N;
  console.log(len.padEnd(5), 'min ' + Math.min(...m).toFixed(1) + ' · prosjek ' + avg.toFixed(1) + ' · max ' + Math.max(...m).toFixed(1), '| pitanja piramide: ' + r.map((x) => x.fqn).join(','), r.every((x) => x.ok) ? '' : 'NIJE ZAVRŠILO');
}
