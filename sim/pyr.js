// Simulacija piramide: staro pravilo vs. novo. Igrač: znanje k (0..1), brzina s (0..1).
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const tf = (k) => k + (1 - k) * 0.5, q4 = (k) => k + (1 - k) * 0.25;
const REQ = [1, 1, 1, 2, 2, 2, 2]; const TOPU = REQ.reduce((a, b) => a + b, 0); // 11 jedinica do vrha
const unitsToStep = (u) => { let s = 0, acc = 0; while (s < REQ.length && acc + REQ[s] <= u) { acc += REQ[s]; s++; } return s; };
function startOld(ps) { const top = Math.max(...ps.map((p) => p.sc)); return ps.map((p) => (top > 0 ? Math.round(3 * p.sc / top) : 0)); }
function startNew(ps, MAXU = 4) {
  const n = ps.length, top = Math.max(...ps.map((p) => p.sc)), sorted = ps.map((p) => p.sc).sort((a, b) => b - a);
  return ps.map((p) => { const better = sorted.filter((x) => x > p.sc).length, same = sorted.filter((x) => x === p.sc).length; const rank = better + (same - 1) / 2; const rn = n > 1 ? 1 - rank / (n - 1) : 1; const gn = top > 0 ? p.sc / top : 0; return Math.round(((+process.env.WR || 0.5) * rn + (1 - (+process.env.WR || 0.5)) * gn) * MAXU); });
}
function playOld(ps, atk) {
  const st = startOld(ps); for (let q = 1; q <= 20; q++) {
    const res = ps.map((p, i) => { const k = p.k * (atk && atk(i, st) ? 0.8 : 1); return { ok: rnd() < tf(k), t: (1 - p.s) + rnd() * 0.6 + (atk && atk(i, st) ? 0.4 : 0) }; });
    const right = res.map((r, i) => (r.ok ? i : -1)).filter((i) => i >= 0); const fast = right.sort((a, b) => res[a].t - res[b].t)[0];
    for (const i of right) st[i] = Math.min(8, st[i] + 1 + (i === fast ? 1 : 0));
    const w = st.map((s, i) => (s >= 8 ? i : -1)).filter((i) => i >= 0); if (w.length) return { w: w[0], q, st0: startOld(ps) };
  } return { w: st.indexOf(Math.max(...st)), q: 20, st0: startOld(ps) };
}
function playNew(ps, atk) {
  const u = startNew(ps), u0 = u.slice(), str = ps.map(() => 0); let crownQ = 0;
  for (let q = 1; q <= 20; q++) {
    const tops = u.map((x, i) => (x >= TOPU ? i : -1)).filter((i) => i >= 0), crown = tops.length > 0;
    const res = ps.map((p, i) => { const hit = atk && atk(i, u); const k = p.k * (hit ? 0.8 : 1); return { ok: rnd() < (crown ? q4(k) : tf(k)), t: (1 - p.s) + rnd() * 0.6 + (hit ? 0.4 : 0) }; });
    if (crown) { crownQ++; const won = tops.filter((i) => res[i].ok).sort((a, b) => res[a].t - res[b].t); if (won.length) return { w: won[0], q, u0, crownQ }; }
    const right = res.map((r, i) => (r.ok ? i : -1)).filter((i) => i >= 0 && u[i] < TOPU); const fast = right.slice().sort((a, b) => res[a].t - res[b].t)[0];
    ps.forEach((_, i) => { if (u[i] >= TOPU) return; if (res[i].ok) { str[i]++; u[i] = Math.min(TOPU, u[i] + 1 + (i === fast && !crown ? 1 : 0) + (str[i] % 3 === 0 ? 1 : 0)); } else str[i] = 0; });
  } const best = u.indexOf(Math.max(...u)); return { w: best, q: 20, u0, crownQ, cap: 1 };
}
const S = {
  'A gotovo jednaki bodovi': [{ sc: 5200, k: 0.6, s: 0.5 }, { sc: 5100, k: 0.6, s: 0.5 }, { sc: 5000, k: 0.6, s: 0.5 }, { sc: 4900, k: 0.6, s: 0.5 }],
  'B ogromna prednost': [{ sc: 12000, k: 0.6, s: 0.5 }, { sc: 3000, k: 0.6, s: 0.5 }, { sc: 2500, k: 0.6, s: 0.5 }, { sc: 2000, k: 0.6, s: 0.5 }],
  'C dvojica jednaka': [{ sc: 6000, k: 0.6, s: 0.5 }, { sc: 6000, k: 0.6, s: 0.5 }, { sc: 3000, k: 0.6, s: 0.5 }],
  'D zadnji najbolji u finalu': [{ sc: 8000, k: 0.5, s: 0.5 }, { sc: 6000, k: 0.5, s: 0.5 }, { sc: 5000, k: 0.5, s: 0.5 }, { sc: 3000, k: 0.9, s: 0.8 }],
  'E vodeći stalno točno': [{ sc: 8000, k: 0.95, s: 0.6 }, { sc: 6000, k: 0.6, s: 0.5 }, { sc: 5000, k: 0.6, s: 0.5 }, { sc: 4000, k: 0.6, s: 0.5 }],
  'F vodeći griješi': [{ sc: 8000, k: 0.3, s: 0.5 }, { sc: 6000, k: 0.6, s: 0.5 }, { sc: 5000, k: 0.6, s: 0.5 }, { sc: 4000, k: 0.6, s: 0.5 }],
  'G moći protiv vodećeg': [{ sc: 8000, k: 0.6, s: 0.5 }, { sc: 6000, k: 0.6, s: 0.5 }, { sc: 5000, k: 0.6, s: 0.5 }, { sc: 4000, k: 0.6, s: 0.5 }],
  'H više blizu vrha': [{ sc: 7000, k: 0.75, s: 0.5 }, { sc: 6900, k: 0.75, s: 0.5 }, { sc: 6800, k: 0.75, s: 0.5 }, { sc: 2000, k: 0.6, s: 0.5 }],
  'I svi nisko': [{ sc: 600, k: 0.5, s: 0.5 }, { sc: 400, k: 0.5, s: 0.5 }, { sc: 300, k: 0.5, s: 0.5 }, { sc: 100, k: 0.5, s: 0.5 }],
  'J šest igrača': [9000, 7500, 6000, 5000, 3500, 2000].map((sc) => ({ sc, k: 0.6, s: 0.5 })),
};
const N = 4000;
console.log('scenarij'.padEnd(28), '| staro: start, pob. vodeći, pob. zadnji, pitanja | novo: start(jedinice), pob. vodeći, pob. zadnji, pitanja (p95), cap%');
for (const [name, ps] of Object.entries(S)) {
  const atk = name.startsWith('G') ? (i, st) => i === st.indexOf(Math.max(...st)) && rnd() < 0.6 : null;
  let o = { lead: 0, last: 0, q: 0 }, nw = { lead: 0, last: 0, q: 0, qs: [], cap: 0 }, so, sn;
  for (let r = 0; r < N; r++) {
    const a = playOld(ps, atk); so = a.st0; if (a.w === 0) o.lead++; if (a.w === ps.length - 1) o.last++; o.q += a.q;
    const b = playNew(ps, atk); sn = b.u0; if (b.w === 0) nw.lead++; if (b.w === ps.length - 1) nw.last++; nw.q += b.q; nw.qs.push(b.q); if (b.cap) nw.cap++;
  }
  nw.qs.sort((x, y) => x - y);
  const pc = (x) => Math.round(x / N * 100) + '%';
  console.log(name.padEnd(28), '|', JSON.stringify(so).padEnd(16), pc(o.lead).padStart(4), pc(o.last).padStart(4), (o.q / N).toFixed(1).padStart(5), ' | ', JSON.stringify(sn).padEnd(16), pc(nw.lead).padStart(4), pc(nw.last).padStart(4), (nw.q / N).toFixed(1).padStart(5), '(' + nw.qs[Math.floor(N * 0.95)] + ')', pc(nw.cap));
}
