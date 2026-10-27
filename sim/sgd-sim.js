'use strict';
// Simulacija rasporeda izazova: N partija s kontroliranim izvorom slučajnosti; uspoređuje stari i novi raspored.
const fs = require('fs'), path = require('path');
const V3 = path.join(__dirname, '..', 'v3');
const src = fs.readFileSync(process.argv[2] || V3 + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(V3 + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG };')();
const N = +(process.env.N || 1000), MODE = process.env.MODE || 'new', PLAYERS = +(process.env.PL || 4);
const CAT = { q: 'q', who: 'assoc', emoji: 'assoc', order: 'logic', hilo: 'logic', sort: 'logic', link: 'logic', blitz: 'fast', maj: 'social' };
function planFor(kind) {
  if (kind === 'short') return [{ t: 'intro', title: 'R', sub: '' }, { t: 'battle' }, { t: 'battle' }, { t: 'battle' }, { t: 'challenge' }, { t: 'battle' }, { t: 'battle' }, { t: 'intro', title: 'F', sub: '' }, { t: 'finale' }];
  if (kind === 'long') { const p = []; for (let r = 0; r < 5; r++) { p.push({ t: 'intro', title: 'Runda ' + (r + 1), sub: '' }, { t: 'battle' }, { t: 'battle' }, { t: 'battle' }); if (r < 4) p.push({ t: 'challenge' }); } return p.concat([{ t: 'intro', title: 'F', sub: '' }, { t: 'finale' }]); }
  return null; // standardni plan igre
}
const kind = process.env.PLAN || 'std';
const seqs = [], stats = { mini: 0, items: 0, adj: 0, maxRun: 0, sameType2: 0, sameCat2: 0, gapMax: 0, distinct: 0, open: 0, fin3: 0, finAll: 0 };
const pos = {};
for (let k = 1; k <= N; k++) {
  let seed = k * 7919; const R0 = Math.random; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cfg = { intro: 60 }; if (MODE === 'old') cfg.sgd = { on: false };
  const g = E.createGame({ code: 'S', cfg, plan: planFor(kind) || undefined, flags: { ENABLE_SECRET_EVENTS: false } });
  for (let i = 0; i < PLAYERS; i++) g.addPlayer('p' + i, 'P' + i, i, false);
  g.start(); const G = g._G, plan = g._plan(); g.stop(); Math.random = R0;
  // redoslijed regularnog dijela: q / who / emoji / izazov
  const seq = []; let bn = 0, ci = 0;
  for (const it of plan) { if (it.t === 'battle') { seq.push(G.qvAt.get(bn) || 'q'); bn++; } else if (it.t === 'challenge') { seq.push(G.chal[ci++] || '?'); } }
  seqs.push(seq.join(','));
  const nb = bn, isM = (x) => x !== 'q';
  seq.forEach((x, i) => { if (isM(x)) { pos[i] = (pos[i] || 0) + 1; } });
  stats.items += seq.length; stats.mini += seq.filter(isM).length;
  let run = 0, gap = 0, lastM = null, lastI = -9;
  const seen = new Set();
  seq.forEach((x, i) => {
    if (isM(x)) { run++; stats.maxRun = Math.max(stats.maxRun, run); if (run >= 2) stats.adj++; if (lastM && lastM === x && i - lastI <= 3) stats.sameType2++; if (lastM && CAT[lastM] === CAT[x] && i - lastI <= 2) stats.sameCat2++; lastM = x; lastI = i; seen.add(x); gap = 0; }
    else { run = 0; gap++; stats.gapMax = Math.max(stats.gapMax, gap); }
  });
  stats.distinct += seen.size;
  const openN = Math.ceil(seq.length * 0.2); stats.open += seq.slice(0, openN).filter(isM).length;
  const fin = seq.slice(-3).filter(isM).length; stats.fin3 = Math.max(stats.fin3, fin); if (fin === 3) stats.finAll++;
}
const uniq = new Set(seqs).size;
const pct = (x) => (x * 100).toFixed(1) + ' %';
console.log(`[${MODE}] plan=${kind} igrača=${PLAYERS} partija=${N}`);
console.log(`  udio mini-igara: ${pct(stats.mini / stats.items)} · prosjek ${(stats.mini / N).toFixed(2)} po partiji`);
console.log(`  mini-igre zaredom (parovi): ${(stats.adj / N).toFixed(3)} po partiji · najdulji niz: ${stats.maxRun}`);
console.log(`  ista vrsta unutar 3 mjesta: ${(stats.sameType2 / N).toFixed(3)} · ista skupina unutar 2: ${(stats.sameCat2 / N).toFixed(3)} po partiji`);
console.log(`  najdulje bez mini-igre: ${stats.gapMax} pitanja · različitih vrsta u partiji: ${(stats.distinct / N).toFixed(2)}`);
console.log(`  mini-igre u prvih 20 %: ${(stats.open / N).toFixed(3)} po partiji · zadnja 3 mjesta sva posebna: ${stats.finAll} partija (najviše ${stats.fin3})`);
console.log(`  različitih rasporeda: ${uniq}/${N} (${pct(uniq / N)})`);
console.log('  učestalost po mjestu: ' + Object.keys(pos).sort((a, b) => a - b).map((i) => i + ':' + pct(pos[i] / N)).join(' '));
