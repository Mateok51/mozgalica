'use strict';
// Uljez u krčmi + odabir mini-igara. node v3/ulj-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame, CFG };');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
function sim(opts) {
  let VT = 0, q = [], id = 0;
  const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; }, cT = (i) => { q = q.filter((t) => t.id !== i); };
  const M = E(sT, cT); let lastS = -1; const log = { ph: new Set(), priv: [], views: [], rej: [], chal: [], gains: [] };
  const g = M.createGame({ code: 'UL', now: () => VT, cfg: opts.cfg, onChange: () => {
    const G = g._G; if (G.s === lastS) return; lastS = G.s; const s = G.s, x = G.ph; log.ph.add(x);
    const at = (ms, inp) => sT(() => { if (g._G.s === s) g.setInput('h0', Object.assign({ s }, inp)); }, ms);
    if (x === 'vote') at(3000, { v: 0 }); else if (x === 'power') at(3000, { p: '' });
    else if (x === 'question') at(5000, { c: G.q.a, t: 5000 }); else if (x === 'fq') at(4000, { c: G.q.a, t: 4000 });
    else if (x === 'reveal' || x === 'howto') at(2500, { ok: 1 }); else if (x === 'bet') at(3000, { b: 0 });
    else if (x === 'uljez') {
      log.priv.push(g.priv('h0') && g.priv('h0').ul); log.views.push(JSON.stringify(g.view().ul));
      sT(() => { if (g._G.s !== s) return; log.rej.push(g.setInput('h0', { s, v: [0, 0] }), g.setInput('h0', { s, v: [0] }), g.setInput('h0', { s, v: [0, 99] }), g.setInput('h0', { s, v: 'x' })); }, 1000);
      at(4000, { v: [0, 1] });
    } else if (x === 'uljezVote') {
      log.views.push(JSON.stringify(g.view().ul));
      sT(() => { if (g._G.s !== s) return; log.rej.push(g.setInput('h0', { s, v: 'h0' }), g.setInput('h0', { s, v: 'nema' }), g.setInput('h0', { s, v: 5 })); }, 500);
      at(3000, { v: g.view().P.find((p) => p.id !== 'h0').id });
    } else if (x === 'uljezReveal') {
      const u = g.view().ul, G2 = g._G;
      log.chal.push({ u, imp: G2.ul.imp, gains: g.view().P.map((p) => [p.id, p.g]) });
      log.views.push(JSON.stringify(u));
    }
  } });
  g.addPlayer('h0', 'Ana', 0, false); g.setBots(3);
  if (opts.setup) opts.setup(g);
  g.start();
  let n = 0; while (g._G.ph !== 'final' && q.length && n++ < 400000) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
  return { g, log, ph: g._G.ph };
}
let r = sim({ cfg: { chal: ['uljez', 'uljez'] } });
ok(r.ph === 'final', 'partija s Uljezom stiže do kraja');
ok(['uljez', 'uljezVote', 'uljezReveal'].every((p) => r.log.ph.has(p)), 'sve tri faze se pojavljuju');
ok(r.log.priv.length >= 1 && r.log.priv.every((p) => p && ((p.imp === 1 && !p.th) || (typeof p.th === 'string' && !p.imp))), 'privatni podatak: uljez vidi samo ulogu, ostali temu');
ok(r.log.views.slice(0, 1).every((v) => !/"th"|"ok"/.test(v)), 'javni prikaz tijekom biranja ne sadrži temu ni točne pojmove');
ok(r.log.rej.length > 0 && r.log.rej.every((x) => x === false || x === undefined), 'neispravan unos se odbija');
ok(r.log.chal.length >= 1 && r.log.chal.every((c) => c.u.th && c.u.ok.length === 8 && c.u.imp === c.imp), 'otkrivanje: tema, točni pojmovi i uljez');
let pts = true;
for (const c of r.log.chal) {
  const gain = Object.fromEntries(c.gains), caught = !!c.u.caught;
  for (const p of Object.keys(gain)) {
    const want = p === c.imp ? (caught ? 0 : 400) : (c.u.vt[p] === c.imp ? 250 : 0);
    if (gain[p] !== want) { pts = false; console.log('  ! ', p, gain[p], want); }
  }
}
ok(pts, 'bodovi: ispravan glas 250, uljez neotkriven 400');
// podaci
const D = JSON.parse(fs.readFileSync(__dirname + '/data.json', 'utf8')).ulj;
ok(D.length >= 40 && D.every((t) => t.t && t.y.length === 4 && t.n.length === 4 && new Set(t.y.concat(t.n)).size === 8), 'podaci: ' + D.length + ' tema, svaka 4+4 različitih pojmova');
// odabir mini-igara
const all = ['sort', 'link', 'order', 'hilo', 'blitz', 'maj', 'uljez', 'who', 'emoji'];
r = sim({ setup: (g) => g.setOpt('mg', all.filter((k) => k !== 'sort')) });
ok(r.ph === 'final' && r.g._G.chal.every((k) => k === 'sort'), 'samo Razvrstavanje uključeno: svi izazovi su Razvrstavanje (' + r.g._G.chal.join(',') + ')');
ok(r.g._G.qvAt.size === 0, 'who/emoji isključeni: nema varijanti pitanja');
r = sim({ setup: (g) => g.setOpt('mg', ['uljez']) });
ok(!r.g._G.chal.includes('uljez') && r.g._G.chal.length > 0, 'isključen Uljez se ne bira');
const g2 = E(setTimeout, clearTimeout).createGame({ code: 'M2' });
g2.setOpt('mg', ['sort', 'link', 'order', 'hilo', 'blitz', 'maj', 'uljez']);
ok(g2.view().opt.mgOff.length === 0, 'ne može se isključiti svaki izazov');
g2.setOpt('mg', ['who', 'emoji', 'nema']);
ok(g2.view().opt.mgOff.join() === 'who,emoji' && g2.view().opt.mg.length === 9, 'varijante se mogu isključiti, nepoznati ključevi se ignoriraju');
console.log(fails ? 'NEUSPJEH ' + fails : 'OK'); process.exit(fails ? 1 : 0);
