'use strict';
// Piramida (motor, virtualni sat, botovi): podaci za prikaz napretka su dosljedni pravilima, a pravila su nepromijenjena.
// Za svako pitanje piramide: točan → +g (1 + ⚡ najbrži + ✖2 dupli + 🔥 svaki 3. zaredom), netočan → 0; stepenice = stepOf(prije + g).
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame, CFG };');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const REQ = [1, 1, 1, 2, 2, 2, 2], TOP = 11;
const so = (u) => { let st = 0, acc = 0; while (st < REQ.length && acc + REQ[st] <= u) { acc += REQ[st]; st++; } return { s: st, p: u - acc, r: st < REQ.length ? REQ[st] : 0 }; };
const seen = { part: 0, exact: 0, multi: 0, same: 0, top: 0, crownQ: 0, bad: [] , bonus: { f: 0, d: 0, s: 0 } };
for (let run = 0; run < 6; run++) {
  let VT = 0, q = [], id = 0; const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; }, cT = (i) => { q = q.filter((t) => t.id !== i); };
  const M = E(sT, cT); let lastS = -1, prevFu = {};
  const g = M.createGame({ code: 'PY', now: () => VT, len: 'brza', onChange: () => {
    const G = g._G; if (G.s === lastS) return; lastS = G.s; const v = g.view(), x = G.ph, s = G.s;
    if (x === 'fq') { prevFu = Object.fromEntries(v.P.map((p) => [p.id, p.fu])); if (v.crown) seen.crownQ++; }
    if (x === 'fr') {
      const cnt = {};
      for (const p of v.P) {
        cnt[p.st] = (cnt[p.st] || 0) + 1;
        const was = prevFu[p.id], crownP = v.crown && was >= TOP;
        if (crownP || was == null) continue;
        const right = p.ch === v.cor, gN = 1 + (p.fb || '').length;
        if (right !== (p.ug > 0)) seen.bad.push('ug/točno ' + p.n);
        if (right && p.ug !== gN) seen.bad.push('bonus ' + p.n + ' ' + p.ug + ' vs ' + p.fb);
        if (p.fu !== Math.min(TOP, was + (p.ug || 0))) seen.bad.push('fu ' + p.n);
        if (p.mv !== so(p.fu).s - so(was).s) seen.bad.push('mv ' + p.n + ' ' + p.mv);
        for (const c of p.fb || '') seen.bonus[c]++;
        if (right && p.ug > 0 && p.mv === 0) seen.part++;
        if (right && p.mv === 1 && so(p.fu).p === 0 && p.ug === 1) seen.exact++;
        if (p.mv >= 2) seen.multi++;
        if (p.top && p.mv > 0) seen.top++;
      }
      if (Object.entries(cnt).some(([k, n]) => n >= 2 && +k > 0)) seen.same++;
    }
    const at = (ms, inp) => sT(() => { if (g._G.s === s) g.setInput('h0', Object.assign({ s }, inp)); }, ms);
    if (x === 'vote') at(2000, { v: 0 }); else if (x === 'power') at(2000, { p: '' });
    else if (x === 'question') at(4000, { c: G.q.a, t: 4000 }); else if (x === 'fq') at(1500 + run * 300, { c: Math.random() < 0.7 ? G.q.a : (G.q.a + 1) % G.q.o.length, t: 1500 + run * 300 });
    else if (x === 'reveal' || x === 'howto') at(1500, { ok: 1 }); else if (x === 'bet') at(2000, { b: 0 });
  } });
  g.addPlayer('h0', 'Ana', 0, false); g.setBots(3); g.start();
  let n = 0; while (g._G.ph !== 'final' && q.length && n++ < 300000) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
}
ok(seen.bad.length === 0, 'napredak, bonusi i stepenice dosljedni pravilima' + (seen.bad.length ? ': ' + seen.bad.slice(0, 5).join('; ') : ''));
ok(seen.part > 0, 'točan odgovor +1 bez uspona: ' + seen.part + ' puta');
ok(seen.exact > 0, 'točno dovoljno za uspon (+1, nova stepenica): ' + seen.exact + ' puta');
ok(seen.multi > 0, 'bonus preskače više stepenica: ' + seen.multi + ' puta');
ok(seen.same > 0, 'više igrača na istoj stepenici: ' + seen.same + ' rezultata');
ok(seen.top > 0 && seen.crownQ > 0, 'dolazak na vrh (' + seen.top + ') i pitanje za krunu (' + seen.crownQ + ')');
ok(seen.bonus.f > 0 && seen.bonus.s > 0, 'izvori bonusa vidljivi: ⚡ ' + seen.bonus.f + ', ✖2 ' + seen.bonus.d + ', 🔥 ' + seen.bonus.s);
console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
