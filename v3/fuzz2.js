'use strict';
// Fuzz Krčmar 2.0: nasumične partije s "ljudima" koji nasumično (i pogrešno) šalju poruke, botovima, prekidima veze.
// Invarijante: bez iznimki, igra završava, bodovi cijeli i ≥ 0, javno stanje bez privatnih podataka, privatno stanje samo vlasniku,
// paktovi dosljedni. Pokretanje: N=40 node v3/fuzz2.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG };')();
const P0 = { n: { w: 1, s: 1, t: 0.05 }, t: { w: 1, s: 1, t: 0.05 }, d: { w: 1, s: 1, t: 0.05 } };
const FAST = { intro: 0.03, vote: 0.25, voteShow: 0.03, roul: 0.03, power: 0.25, bet: 0.25, cast: 0.02, q: 0.5, pace: P0, paceMo: 0.01, moment: 0.03, howto: 0.03, howtoMax: 0.3, howtoShort: 0.03,
  sort: 0.3, link: 0.3, order: 0.3, hilo: 0.3, blitz: 0.3, maj: 0.2, majReveal: 0.03, chReveal: 0.03, fstart: 0.05, fpower: 0.2, fq: 0.3, fr: 0.03, duelIntro: 0.05, duel: 0.4, duelRes: 0.05,
  secret: 0.2, secret2: 0.2, betrayShow: 0.05, loyalShow: 0.05,
  kr: Object.assign({}, E.CFG.kr, { wait: 0.6, pactChance: 0.7, offChance: 0.6, chFrom: 2, chGap: 0, chWait: 0.3, rope: 0.6 }) };
const N = +process.env.N || 30, NAMES = ['Ana', 'Marko', 'Iva', 'Luka', 'Sara'];
const bad = []; let uncaught = []; const ST = { kp: 0, pakt: 0, izdaja: 0, dvostruka: 0, odanost: 0, izazov: 0, konop: 0, oklada: 0, zadatak: 0, usluga: 0, final: 0 };
process.on('uncaughtException', (e) => { uncaught.push(String(e.stack).split('\n').slice(0, 4).join(' | ')); });
const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
const PUB_BAN = ['kp', 'ko', 'kt', 'kf', 'okl', 'pacts', 'offers', 'scn', 'prof'];
const P_BAN = ['okl', 'pact', 'betray', 'kt', 'ko', 'kf', 'koGot', 'wh', 'rpA', 'okr', 'oq_'];
function runOne(i) {
  return new Promise((res) => {
    const nh = 1 + rnd(5), nb = rnd(Math.max(1, 6 - nh)), opt = { pacts: Math.random() < 0.85, bs: Math.random() < 0.5 };
    const tag = 'igra ' + i + ' (' + nh + ' ljudi, ' + nb + ' botova, ' + JSON.stringify(opt) + ')';
    const errs = [];
    let g, done = false, lastS = -1, lastT = Date.now();
    const report = (m) => { if (errs.length < 5) errs.push(m); };
    const check = () => {
      let v; try { v = g.view(); } catch (e) { return report('view: ' + e.message); }
      const js = JSON.stringify(v);
      for (const k of PUB_BAN) if (k in v) report('javno polje ' + k + ' u ph=' + v.ph);
      for (const p of v.P) {
        for (const k of P_BAN) if (k in p) report('javno polje igrača ' + k);
        if (!Number.isInteger(p.sc) || p.sc < 0) report('bodovi ' + p.n + ' = ' + p.sc + ' u ph=' + v.ph);
      }
      if (v.ph === 'cast' || v.ph === 'question') for (const e of v.ev || []) if (e.p === 'oklada' && e.t) report('meta Oklade javna');
      const G = g._G;
      // privatno: ponude samo onima kojima pripadaju, partner dosljedan
      for (const p of v.P) {
        if (p.b) continue;
        let pv; try { pv = g.priv(p.id); } catch (e) { report('priv: ' + e.message); continue; }
        if (!pv) continue;
        if (pv.kp && !(G.kp && (G.kp.a === p.id || G.kp.b === p.id))) report('tuđa ponuda pakta u priv');
        if (pv.k) { const me = g._p(p.id), m = g._p(pv.k.m); if (!me.pact || !m || m.pact !== me.pact) report('nedosljedan pakt u priv'); }
      }
      const on = G.pacts.filter((k) => k.on);
      const ids = on.flatMap((k) => [k.a, k.b]);
      if (new Set(ids).size !== ids.length) report('igrač u dva pakta');
      if (G.kp && !G.__kp) { G.__kp = G.kp; ST.kp++; } if (G.kp !== G.__kp) G.__kp = G.kp;
      if (v.ph === 'betray' && G.bt && G.bt.id !== G.__bt) { G.__bt = G.bt.id; for (const e of G.bt.evs) e.k === 'double' ? ST.dvostruka++ : ST.izdaja++; }
      if (v.ph === 'loyal' && G.ly && G.ly.id !== G.__ly) { G.__ly = G.ly.id; ST.odanost += G.ly.evs.length; }
      if (v.ph === 'rope' && G.s !== G.__rp) { G.__rp = G.s; ST.konop++; }
      if (v.lc && v.lc.st === 'y' && G.lc && !G.lc.__c) { G.lc.__c = 1; ST.izazov++; }
      for (const p of v.P) { const q = g._p(p.id); if (q.okl && q.__ok !== G.s && v.ph === 'question') { q.__ok = G.s; ST.oklada++; } if (q.kt && !q.__kt) { q.__kt = 1; ST.zadatak++; } if (q.kf && !q.__kf) { q.__kf = 1; ST.usluga++; } }
      ST.pakt = Math.max(ST.pakt, 0) + 0;
      if (v.ph === 'final' && !done) { ST.final++; ST.pakt += G.pacts.length; done = true; if (!v.lg && G.leg !== null) report('nema legendi'); finish(); }
      if (v.s !== lastS) { lastS = v.s; lastT = Date.now(); }
    };
    g = E.createGame({ code: 'Z' + i, cfg: FAST, plan: undefined, pacts: opt.pacts, bs: opt.bs, onChange: () => { try { check(); } catch (e) { report('check: ' + e.stack.split('\n')[1]); } } });
    const H = []; for (let j = 0; j < nh; j++) { H.push('h' + j); g.addPlayer('h' + j, NAMES[j], j, false); }
    if (nb) g.setBots(nb);
    let online = new Set(H);
    const sync = () => g.syncPeers(H.filter((id) => online.has(id)).map((id, j) => ({ pid: id, name: NAMES[+id.slice(1)], av: +id.slice(1) })));
    sync(); g.start();
    const act = (id) => {
      const G = g._G, s = Math.random() < 0.05 ? G.s - 1 : G.s, r = Math.random(), others = g.view().P.filter((p) => p.id !== id).map((p) => p.id);
      try {
        switch (G.ph) {
          case 'vote': g.setInput(id, { s, v: rnd(5) - 0 }); break;
          case 'power': { const me = g._p(id), k = me.offers && pick(me.offers.concat(['', 'oklada', 'xx'])); g.setInput(id, { s, p: k, t: pick(others.concat([id, 'nope'])) }); break; }
          case 'bet': g.setInput(id, { s, b: pick([0, 100, 300, 500, -1, 999]) }); break;
          case 'question': case 'fq': case 'duel': g.setInput(id, { s, c: rnd(5) - (r < 0.1 ? 1 : 0), t: rnd(20000) }); break;
          case 'rope': { const me = g._p(id), L0 = G.rp ? G.rp.list : []; const a = (me.rpA || []).slice(); a.push(rnd(2)); g.setInput(id, { s, r: r < 0.05 ? [7] : a.slice(0, L0.length) }); break; }
          case 'reveal': {
            const pv = g.priv(id) || {};
            if (pv.kp && pv.kp.ans == null) g.pactAction(id, { k: 'krPact', yes: Math.random() < 0.8 });
            if (pv.ko) g.pactAction(id, { k: 'krOff', yes: Math.random() < 0.7 });
            if (G.lc && G.lc.a === id && G.lc.st === 'o') g.pactAction(id, { k: 'krCh', yes: Math.random() < 0.8 });
            if (pv.k && pv.k.cb && Math.random() < 0.15) g.pactAction(id, { k: 'betray', on: true });
            if (Math.random() < 0.7) g.setInput(id, { s, ok: 1 });
            break;
          }
          case 'howto': case 'deal': g.setInput(id, { s, ok: 1 }); break;
          case 'sort': g.setInput(id, { s, r: G.so.items.map(() => rnd(2)) }); break;
          case 'link': g.setInput(id, { s, r: G.li.L.map(() => rnd(G.li.R.length)) }); break;
          case 'order': g.setInput(id, { s, r: [0, 1, 2, 3].sort(() => Math.random() - 0.5) }); break;
          case 'hilo': g.setInput(id, { s, r: G.hl.list.slice(0, rnd(G.hl.list.length)).map(() => rnd(2)) }); break;
          case 'blitz': g.setInput(id, { s, r: G.bz.list.slice(0, rnd(G.bz.list.length)).map(() => rnd(2)), f: 1 }); break;
          case 'maj': g.setInput(id, { s, v: rnd(4) }); break;
          case 'secret': g.setInput(id, { s, x: pick(others) }); break;
          case 'secret2': g.setInput(id, { s, y: rnd(2) }); break;
        }
        // društvene radnje i smeće u bilo kojoj fazi
        const k = pick(['krPact', 'krOff', 'krCh', 'betray', 'betray', 'offer', 'accept', 'whisper', 'rcOffer', 'tkAccept', 'junk']);
        if (Math.random() < 0.35) g.pactAction(id, k === 'junk' ? { k: 'x'.repeat(rnd(5)), yes: 1 } : { k, yes: Math.random() < 0.6, on: Math.random() < 0.5, to: pick(others), from: pick(others), id: rnd(9), c: rnd(4) });
        if (Math.random() < 0.02) g.pactAction(id, null);
      } catch (e) { report('akcija ' + G.ph + ': ' + e.message + ' ' + String(e.stack).split('\n')[1]); }
    };
    const tick = setInterval(() => {
      if (done) return;
      for (const id of H) if (online.has(id) && Math.random() < 0.45) act(id);
      if (Math.random() < 0.04) { const id = pick(H); if (online.has(id)) online.delete(id); else online.add(id); sync(); }
      if (Math.random() < 0.08) sync();
      if (Date.now() - lastT > 8000) { report('zapelo u ph=' + g._G.ph + ' (' + Math.round((Date.now() - lastT) / 1000) + ' s)'); finish(); }
    }, 25);
    const killer = setTimeout(() => { report('nije došlo do kraja (ph=' + g._G.ph + ')'); finish(); }, 120000);
    function finish() { clearInterval(tick); clearTimeout(killer); try { g.stop(); } catch (e) {} res({ tag, errs, ph: g._G.ph }); }
  });
}
(async () => {
  let ok = 0;
  for (let i = 0; i < N; i++) {
    uncaught = [];
    const r = await runOne(i);
    const all = r.errs.concat(uncaught.map((u) => 'IZNIMKA ' + u));
    if (all.length) { bad.push(r.tag + ': ' + [...new Set(all)].join(' || ')); console.log('✘ ' + r.tag + '\n    ' + [...new Set(all)].slice(0, 4).join('\n    ')); }
    else { ok++; process.stdout.write('.'); }
  }
  console.log('\n' + ok + '/' + N + ' partija bez problema · pokriveno: ' + JSON.stringify(ST));
  process.exit(bad.length ? 1 : 0);
})();
