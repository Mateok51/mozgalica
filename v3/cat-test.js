'use strict';
// Odabir kategorija: isključene kategorije se nikad ne nude ni ne pitaju (glasanje, kladionica, piramida); pad na sve kategorije ako je uključeno < 4. node v3/cat-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame };');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
function sim(off) {
  let VT = 0, q = [], id = 0;
  const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; }, cT = (i) => { q = q.filter((t) => t.id !== i); };
  const M = E(sT, cT); let lastS = -1; const seen = new Set();
  const g = M.createGame({ code: 'CT', now: () => VT, onChange: () => {
    const G = g._G; if (G.s === lastS) return; lastS = G.s; const s = G.s, x = G.ph;
    if (G.cats) G.cats.forEach((c) => seen.add(c));
    if (G.q && G.q.cat) seen.add(G.q.cat);
    const at = (ms, inp) => sT(() => { if (g._G.s === s) g.setInput('h0', Object.assign({ s }, inp)); }, ms);
    if (x === 'vote') at(3000, { v: 0 }); else if (x === 'power') at(3000, { p: '' });
    else if (x === 'question') at(5000, { c: G.q.a, t: 5000 }); else if (x === 'fq') at(4000, { c: G.q.a, t: 4000 });
    else if (x === 'reveal' || x === 'howto') at(2500, { ok: 1 }); else if (x === 'bet') at(3000, { b: 0 });
  } });
  g.addPlayer('h0', 'Ana', 0, false); g.setBots(3);
  if (off) g.setOpt('cats', off);
  g.start();
  let n = 0; while (g._G.ph !== 'final' && q.length && n++ < 300000) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
  return { g, seen, ph: g._G.ph };
}
const all = Object.keys(JSON.parse(fs.readFileSync(__dirname + '/data.json', 'utf8')).cats);
const keep = all.slice(0, 5), off = all.slice(5);
const r = sim(off);
ok(r.ph === 'final', 'partija s 5 kategorija stiže do kraja');
ok(r.seen.size > 0 && [...r.seen].every((c) => keep.includes(c)), 'ponuđene i pitane samo uključene kategorije: ' + [...r.seen].join(', '));
const v = r.g.view();
const g2 = E(setTimeout, clearTimeout).createGame({ code: 'C2' });
g2.setOpt('cats', ['Nepostojeća', all[0]]);
ok(g2.view().opt.off.length === 1 && g2.view().opt.off[0] === all[0] && g2.view().opt.all.length === all.length, 'nepoznate kategorije se ignoriraju, popis svih ide u prikaz predvorja');
g2.setOpt('cats', all.slice());
ok(g2.view().opt.off.length === all.length, 'dopušteno je isključiti sve u predvorju (UI blokira početak)');
const r3 = sim(all.slice());
ok(r3.ph === 'final' && r3.seen.size >= 4, 'ako je uključeno < 4, motor koristi sve kategorije');
console.log(fails ? 'NEUSPJEH ' + fails : 'OK'); process.exit(fails ? 1 : 0);
