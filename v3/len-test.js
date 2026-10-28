'use strict';
// Trajanje partije (motor, virtualni sat): raspored po načinu, runde 1/N, odabir samo u predvorju, ponovni odabir nakon restarta,
// ponude krčmara samo kad se mogu dovršiti prije piramide, sve tri završavaju piramidom. node v3/len-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function('setTimeout', 'clearTimeout', src + '; return { createGame, CFG, makePlan, PLAN };');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
function sim(len, opts) {
  let VT = 0, q = [], id = 0;
  const sT = (fn, ms) => { const t = { id: ++id, at: VT + Math.max(0, ms || 0), fn }; q.push(t); return t.id; }, cT = (i) => { q = q.filter((t) => t.id !== i); };
  const M = E(sT, cT); let lastS = -1; const log = { nr: new Set(), ph: [], lateOffers: [], kpLeft: [], rl: new Set() };
  const g = M.createGame(Object.assign({ code: 'LN', now: () => VT, onChange: () => {
    const G = g._G; if (G.s === lastS) return; lastS = G.s; const s = G.s, x = G.ph, v = g.view();
    if (x !== 'lobby') { log.nr.add(v.nr); if (v.rl) log.rl.add(v.rl); }
    if (log.ph[log.ph.length - 1] !== x) log.ph.push(x);
    const left = G.plan ? 0 : null;
    if (x === 'reveal') {
      const bl = g._plan().filter((it) => it.t === 'battle').length - (G.bdone || 0);
      for (const p of g.view().P) { const pr = g.priv(p.id) || {}; if (pr.ko && pr.ko.kind === 'st3' && bl < 3) log.lateOffers.push('st3@' + bl); }
      if (G.kp && G.kp.st === 'o') log.kpLeft.push(bl);
    }
    const at = (ms, inp) => sT(() => { if (g._G.s === s) for (const pid of ['h0', 'h1', 'h2']) if (g._p(pid)) g.setInput(pid, Object.assign({ s }, inp)); }, ms);
    if (x === 'vote') at(3000, { v: 0 }); else if (x === 'power') at(3000, { p: '' });
    else if (x === 'question') at(5000, { c: Math.random() < 0.6 ? G.q.a : (G.q.a + 1) % 4, t: 5000 });
    else if (x === 'fq') at(4000, { c: Math.random() < 0.6 ? G.q.a : (G.q.a + 1) % G.q.o.length, t: 4000 });
    else if (x === 'reveal' || x === 'howto') at(2500, { ok: 1 }); else if (x === 'bet') at(3000, { b: 0 });
  } }, opts || {}));
  const humans = (opts && opts.humans) || 1;
  for (let i = 0; i < humans; i++) g.addPlayer('h' + i, ['Ana', 'Marko', 'Iva'][i], i, false);
  if (!(opts && opts.nobots)) g.setBots(3);
  if (len) g.setOpt('len', len);
  g.start();
  const plan = g._plan();
  let n = 0; while (g._G.ph !== 'final' && q.length && n++ < 300000) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q.shift(); VT = t.at; t.fn(); }
  return { g, plan, log, min: VT / 60000, M };
}
const M0 = E(setTimeout, clearTimeout);
ok(JSON.stringify(M0.makePlan('std')) === JSON.stringify(M0.PLAN), 'standardna = dosadašnji raspored (isti PLAN)');
const want = { brza: [2, 2, 1], std: [3, 3, 2], duga: [4, 4, 3] };
for (const len of ['brza', 'std', 'duga']) {
  console.log(len + ':');
  const r = sim(len, { humans: 1 }), P = r.plan, [R, Q, C] = want[len];
  const rounds = P.filter((it) => it.t === 'intro' && /^Runda/.test(it.title)).length, nb = P.filter((it) => it.t === 'battle').length, nc = P.filter((it) => it.t === 'challenge').length;
  ok(rounds === R && nb === R * Q && nc === C, 'raspored: ' + rounds + ' runde, ' + nb + ' pitanja, ' + nc + ' izazova');
  ok(P[P.length - 1].t === 'finale' && r.log.ph.includes('fq') && r.g._G.ph === 'final', 'završava piramidom (pitanja piramide: ' + r.g._G.fqn + ')');
  ok(r.log.nr.size === 1 && r.log.nr.has(R), 'prikaz rundi: x/' + [...r.log.nr].join(','));
  ok(r.g._G.betAt.size >= 1 && [...r.g._G.betAt].every((b) => b > 0 && b < nb), 'kladionica: ' + [...r.g._G.betAt].sort((a, b) => a - b).join(','));
  ok(r.log.lateOffers.length === 0, 'nema zadatka od 3 pitanja kad ih ostaje manje');
  console.log('   trajanje (virtualno, brzi igrači): ' + r.min.toFixed(1) + ' min');
}
// paktovi: 3 čovjeka, krčmar nudi samo dok ostaje dovoljno pitanja
console.log('paktovi (3 igrača):');
for (const len of ['brza', 'std', 'duga']) {
  const left = [];
  for (let i = 0; i < 4; i++) { const r = sim(len, { humans: 3, nobots: true, cfg: { kr: { pactChance: 1, offChance: 0 } } }); left.push(...r.log.kpLeft); }
  ok(left.length > 0 && left.every((x) => x >= 2), len + ': ponude pakta kad ostaje pitanja: ' + left.join(','));
}
// odabir samo u predvorju i ponovni odabir nakon restarta
{ const r = sim('brza', { humans: 1 }); const g = r.g;
  g.setOpt('len', 'duga'); ok(g._G.opt.len === 'brza', 'tijekom/na kraju partije odabir se ne mijenja');
  g.restart(); ok(g.view().opt && g.view().opt.len === 'brza', 'nakon restarta predvorje pamti zadnji odabir');
  g.setOpt('len', 'duga'); ok(g.view().opt.len === 'duga' && g._plan().filter((it) => it.t === 'battle').length === 16, 'nakon restarta može se odabrati drugo trajanje'); }
// zadani raspored testova (o.plan) se ne dira
{ const g = E(setTimeout, clearTimeout).createGame({ code: 'X', plan: [{ t: 'battle' }, { t: 'finale' }] }); g.addPlayer('h0', 'A', 0, false); g.setOpt('len', 'duga'); ok(g._plan().length === 2, 'testni raspored ostaje nepromijenjen'); g.stop(); }
console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
