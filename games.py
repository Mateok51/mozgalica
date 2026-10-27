p='v3/engine.js'; s=open(p).read()
def rep(old,new,c=1):
    global s
    assert s.count(old)==c,(s.count(old),old[:80]); s=s.replace(old,new)
# ---- konfiguracija ----
rep("  moment: 2.4, duelIntro: 2.6,", "  howto: 7, howtoShort: 3.5, order: 25, hilo: 45, blitz: 30, maj: 10, majReveal: 4, majN: 3, hiloN: 8, blitzN: 24,\n  chal: null, chalN: 2, varMax: 2,\n  moment: 2.4, duelIntro: 2.6,")
rep("""  { t: 'intro', title: 'Izazov', sub: 'Razvrstavanje' }, { t: 'sort' },""", """  { t: 'challenge' },""")
rep("""  { t: 'intro', title: 'Izazov', sub: 'Spajanje parova' }, { t: 'link' },""", """  { t: 'challenge' },""")
rep("const INPUT_PHASES = { vote: 1, bet: 1, power: 1, question: 1, sort: 1, link: 1, fq: 1, duel: 1, secret: 1, secret2: 1 };",
    "const INPUT_PHASES = { vote: 1, bet: 1, power: 1, question: 1, sort: 1, link: 1, fq: 1, duel: 1, secret: 1, secret2: 1, order: 1, hilo: 1, blitz: 1, maj: 1 };")
rep("const SKIPPABLE = { fstart: 1, intro: 1, voteResult: 1, reveal: 1, sortReveal: 1, linkReveal: 1, fr: 1, moment: 1, duelIntro: 1, duelResult: 1 };",
    "const SKIPPABLE = { fstart: 1, intro: 1, voteResult: 1, reveal: 1, sortReveal: 1, linkReveal: 1, fr: 1, moment: 1, duelIntro: 1, duelResult: 1, howto: 1, orderReveal: 1, hiloReveal: 1, blitzReveal: 1, majReveal: 1 };")
rep("const SKIPPABLE =", """// Mini-igre: objašnjenje prije prve igre (kratak podsjetnik kad se ponovi)
const HOWTO = {
  who: { n: 'Tko sam ja?', i: '🕵️', r: ['Tragovi se otkrivaju jedan po jedan.', 'Što prije pogodiš, to više bodova.', 'Imaš samo jedan pokušaj!'] },
  emoji: { n: 'Emoji zagonetka', i: '🤔', r: ['Emojiji opisuju film, seriju, bajku ili nešto drugo.', 'Odaberi točan odgovor od četiri ponuđena.', 'Brži točan odgovor nosi više bodova.'] },
  sort: { n: 'Razvrstavanje', i: '🗂️', r: ['Svaki pojam povuci u jednu od dvije skupine.', 'Svaki točno razvrstan pojam donosi bodove.', 'Kad si gotov, pritisni „Gotovo“.'] },
  link: { n: 'Spajanje parova', i: '🔗', r: ['Dodirni pojam lijevo, pa njegov par desno.', 'Svaki točan par donosi bodove.', 'Kad si gotov, pritisni „Gotovo“.'] },
  order: { n: 'Poredaj', i: '🔢', r: ['Dodiruj pojmove redom, od prvog prema zadnjem.', 'Svaki pojam na pravom mjestu donosi bodove.', 'Sve točno = dodatni bonus!'] },
  hilo: { n: 'Više ili manje', i: '⚖️', r: ['Dvije stvari: odaberi onu koja ima više.', 'Svaki točan odgovor produljuje tvoj niz.', 'Prva greška prekida niz!'] },
  blitz: { n: 'Munjeviti krug', i: '⚡', r: ['Točno ili netočno, što brže možeš.', 'Točan odgovor +100, netočan −50.', 'Imaš 30 sekundi!'] },
  maj: { n: 'Što misli većina?', i: '🗳️', r: ['Nema točnog odgovora – glasaj po svom.', 'Bodove dobiva tko odabere isto kao većina.', 'Pogodi što misle ostali!'] },
};
const CHALLENGES = ['sort', 'link', 'order', 'hilo', 'blitz', 'maj'];
const SKIPPABLE =""")
# ---- unosi ----
rep("      case 'sort': {\n        const a = inp.r;\n        if (!Array.isArray(a) || a.length !== G.so.items.length", """      case 'order': {
        const a = inp.r;
        if (!Array.isArray(a) || a.length !== 4 || new Set(a).size !== 4 || !a.every((x) => isInt(x) && x >= 0 && x < 4)) return false;
        p.ordA = a.slice(); break;
      }
      case 'hilo': {
        const a = inp.r;
        if (!Array.isArray(a) || a.length > G.hl.list.length || !a.every((x) => x === 0 || x === 1)) return false;
        p.hlA = a.slice(); break;
      }
      case 'blitz': {
        // munjeviti krug: mobitel šalje odgovore usput; konačno tek kad su svi odgovoreni ili je stiglo f
        const a = inp.r;
        if (!Array.isArray(a) || a.length > G.bz.list.length || !a.every((x) => x === 0 || x === 1)) return false;
        if (!p.bzA || a.length >= p.bzA.length) p.bzA = a.slice();
        if (!(inp.f || a.length >= G.bz.list.length)) { p.lastIn = ''; return 'partial'; }
        break;
      }
      case 'maj': {
        if (!isInt(inp.v) || inp.v < 0 || inp.v >= G.mj.q.o.length) return false;
        p.mjV = inp.v; break;
      }
      case 'sort': {
        const a = inp.r;
        if (!Array.isArray(a) || a.length !== G.so.items.length""")
rep("""  function setInput(pid, inp) {
    const p = R.get(pid);
    if (!p || !accept(p, inp)) return false;""", """  function setInput(pid, inp) {
    const p = R.get(pid);
    const r = p ? accept(p, inp) : false;
    if (r === 'partial') return true;
    if (!r) return false;""")
rep("""        if (k !== p.lastIn) { p.lastIn = k; if (accept(p, x.in)) changed = true; }""", """        if (k !== p.lastIn) { p.lastIn = k; const r = accept(p, x.in); if (r === 'partial') p.lastIn = k; else if (r) changed = true; }""")
# ---- faze ----
rep("      case 'voteResult': return G.betAt && G.betAt.has(G.bn) && list().some((p) => p.score > 0) ? startBet() : (maybeSecret() || startPower());",
    "      case 'voteResult': return afterCategory();\n      case 'howto': return afterHowto();\n      case 'order': return scoreOrder();\n      case 'hilo': return scoreHilo();\n      case 'blitz': return scoreBlitz();\n      case 'maj': return scoreMaj();\n      case 'majReveal': return nextMaj();\n      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': return afterReveal();")
# odabir izazova i varijanti pri startu
rep("    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; }\n    TD.reset();", """    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; }
    // mini-igre: nasumično koji izazovi i koje posebne bitke, da nije svaka partija ista
    const nCh = plan.filter((it) => it.t === 'challenge').length;
    const pool = CHALLENGES.filter((k) => (k !== 'maj' || active().length >= 3) && (D[DATA_KEY[k]] || []).length);
    G.chal = (cfg.chal || shuffle(pool)).slice(0, Math.max(nCh, cfg.chal ? cfg.chal.length : 0)); G.ci = 0;
    G.qvAt = new Map();
    const slots = shuffle(Array.from({ length: Math.max(0, nb - 1) }, (_, i) => i + 1)).filter((i) => !G.betAt.has(i));
    const want = [['who', cfg.qv ? cfg.qv.who : rnd(cfg.varMax + 1)], ['emoji', cfg.qv ? cfg.qv.emoji : rnd(cfg.varMax + 1)]];
    for (const [k, n] of want) for (let j = 0; j < n && slots.length; j++) if ((D[DATA_KEY[k]] || []).length) G.qvAt.set(slots.shift(), k);
    G.seenHow = new Set();
    TD.reset();""")
rep("    if (it.t === 'sort') return startSort();\n    if (it.t === 'link') return startLink();", """    if (it.t === 'sort') return startSort();
    if (it.t === 'link') return startLink();
    if (it.t === 'challenge') { const k = G.chal[G.ci++] || 'sort'; return startHowto(k); }""")
# bitka: varijanta preskače glasanje
rep("""  function startVote() {
    const avail = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!avail.length) return next();
    G.bn = (G.bn == null ? -1 : G.bn) + 1;""", """  function startVote() {
    const avail = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!avail.length) return next();
    G.bn = (G.bn == null ? -1 : G.bn) + 1;
    G.qv = G.qvAt && G.qvAt.get(G.bn) || null;
    if (G.qv) { G.cats = null; G.cw = -1; return startHowto(G.qv); }""")
rep("""  function startQuestion() {
    const cat = G.cats[G.cw];""", """  function startQuestion() {
    if (G.qv) return startVariantQ();
    const cat = G.cats[G.cw];""")
# pomoćne funkcije prije "function unusedIndex"
rep("  function unusedIndex(arr, set) {", r"""  // ----- mini-igre -----
  function afterCategory() { return G.betAt && G.betAt.has(G.bn) && list().some((p) => p.score > 0) ? startBet() : (maybeSecret() || startPower()); }
  function startHowto(k) {
    const first = !G.seenHow.has(k); G.seenHow.add(k);
    G.ht = { k, first: first ? 1 : 0, chal: CHALLENGES.includes(k) ? 1 : 0 };
    G.rl = G.ht.chal ? 'Izazov' : G.rl;
    setPhase('howto', first ? cfg.howto : cfg.howtoShort);
  }
  function afterHowto() {
    const k = G.ht.k;
    if (k === 'who' || k === 'emoji') return afterCategory();
    if (k === 'sort') return startSort();
    if (k === 'link') return startLink();
    if (k === 'order') return startOrder();
    if (k === 'hilo') return startHilo();
    if (k === 'blitz') return startBlitz();
    if (k === 'maj') return startMaj();
    return next();
  }
  function startVariantQ() {
    const k = G.qv, arr = D[DATA_KEY[k]];
    const set = G.used[k] || (G.used[k] = new Set());
    const it = arr[unusedIndex(arr, set)];
    const order = shuffle([0, 1, 2, 3]);
    G.q = { k, c: k === 'who' ? 'Tko sam ja?' : 'Emoji · ' + it.c, t: k === 'who' ? it.c : it.e, cl: k === 'who' ? it.cl : null, o: order.map((i) => it.o[i]), a: order.indexOf(it.a) };
    G.qn += 1; G.sxDone = null;
    for (const p of list()) {
      p.ans = -1; p.ansMs = 0; p.gained = 0; p.ch = -1;
      if (p.pola) p.hide = shuffle([0, 1, 2, 3].filter((i) => i !== G.q.a)).slice(0, 2);
    }
    setPhase('question', cfg.q);
  }
  function scoreRun(key, rf) {
    for (const p of list()) { p.gained = rf(p); p.score += p.gained; }
    TD.afterScores();
    setPhase(key, cfg.chReveal);
  }
  function startOrder() {
    const set = G.used.order || (G.used.order = new Set());
    const it = D.order[unusedIndex(D.order, set)];
    const idx = shuffle([0, 1, 2, 3]);
    G.or = { t: it.t, lo: it.lo, hi: it.hi, items: idx.map((i) => it.p[i]), v: it.v ? idx.map((i) => it.v[i]) : null, key: idx.slice() };
    for (const p of list()) { p.ordA = null; p.gained = 0; p.cnt = 0; }
    setPhase('order', cfg.order);
  }
  function scoreOrder() {
    scoreRun('orderReveal', (p) => {
      p.cnt = p.ordA ? p.ordA.filter((x, i) => x === G.or.key[i]).length : 0;
      return p.cnt * 150 + (p.cnt === 4 ? 200 : 0);
    });
  }
  function startHilo() {
    const set = G.used.hilo || (G.used.hilo = new Set());
    const list0 = [];
    for (let i = 0; i < cfg.hiloN && i < D.hilo.length; i++) {
      const it = D.hilo[unusedIndex(D.hilo, set)];
      const sw = Math.random() < 0.5;
      list0.push({ q: it.q, a: sw ? [it.b, it.a] : [it.a, it.b], w: sw ? 1 : 0, v: it.va ? (sw ? [it.vb, it.va] : [it.va, it.vb]) : null });
    }
    G.hl = { list: list0 };
    for (const p of list()) { p.hlA = null; p.gained = 0; p.cnt = 0; }
    setPhase('hilo', cfg.hilo);
  }
  function scoreHilo() {
    scoreRun('hiloReveal', (p) => {
      let n = 0; const a = p.hlA || [];
      while (n < a.length && a[n] === G.hl.list[n].w) n++;
      p.cnt = n;
      return n * 120 + (n === G.hl.list.length ? 200 : 0);
    });
  }
  function startBlitz() {
    const set = G.used.tf;
    const list0 = [];
    for (let i = 0; i < cfg.blitzN && i < D.tf.length; i++) { const t = D.tf[unusedIndex(D.tf, set)]; list0.push([t[0], t[1] ? 1 : 0]); }
    G.bz = { list: list0 };
    for (const p of list()) { p.bzA = null; p.gained = 0; p.cnt = 0; p.bad = 0; }
    setPhase('blitz', cfg.blitz);
  }
  function scoreBlitz() {
    scoreRun('blitzReveal', (p) => {
      const a = p.bzA || [];
      p.cnt = a.filter((x, i) => x === G.bz.list[i][1]).length; p.bad = a.length - p.cnt;
      return Math.max(0, p.cnt * 100 - p.bad * 50);
    });
  }
  function startMaj() {
    const set = G.used.maj || (G.used.maj = new Set());
    G.mj = { qs: [], i: 0 };
    for (let i = 0; i < cfg.majN && i < D.maj.length; i++) G.mj.qs.push(D.maj[unusedIndex(D.maj, set)]);
    for (const p of list()) { p.gained = 0; p.mjSum = 0; }
    askMaj();
  }
  function askMaj() {
    G.mj.q = G.mj.qs[G.mj.i];
    for (const p of list()) { p.mjV = -1; }
    setPhase('maj', cfg.maj);
  }
  function scoreMaj() {
    const cnt = G.mj.q.o.map(() => 0);
    for (const p of active()) if (p.mjV >= 0) cnt[p.mjV]++;
    const max = Math.max(...cnt);
    G.mj.cnt = cnt; G.mj.win = max >= 2 ? cnt.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0) : [];
    for (const p of list()) {
      p.gained = G.mj.win.includes(p.mjV) ? 300 : 0;
      p.score += p.gained; p.mjSum += p.gained;
    }
    G.mj.last = G.mj.i === G.mj.qs.length - 1;
    if (G.mj.last) { for (const p of list()) p.gained = p.mjSum; TD.afterScores(); }
    setPhase('majReveal', cfg.majReveal);
  }
  function nextMaj() {
    if (G.mj.last) return afterReveal();
    G.mj.i++; askMaj();
  }

  function unusedIndex(arr, set) {""")
rep("const SKIPPABLE =", "const DATA_KEY = { who: 'who', emoji: 'emoji', order: 'order', hilo: 'hilo', blitz: 'tf', maj: 'maj', sort: 'sort', link: 'link' };\nconst SKIPPABLE =")
# ---- botovi ----
rep("      case 'sort': case 'link': return 6000 + rnd(cfg.sort * 450);", """      case 'sort': case 'link': return 6000 + rnd(cfg.sort * 450);
      case 'order': return 5000 + rnd(cfg.order * 500);
      case 'hilo': return 8000 + rnd(cfg.hilo * 500);
      case 'blitz': return Math.max(500, cfg.blitz * 1000 - 1500);
      case 'maj': return 1500 + rnd(cfg.maj * 600);""")
rep("      case 'sort': return { s, r: G.so.key.map((k) => (Math.random() < 0.75 ? k : 1 - k)) };", """      case 'order': return { s, r: Math.random() < 0.45 ? G.or.key.slice() : shuffle(G.or.key.slice()) };
      case 'hilo': { const r = []; for (const x of G.hl.list) { const ok = Math.random() < 0.72; r.push(ok ? x.w : 1 - x.w); if (!ok) break; } return { s, r }; }
      case 'blitz': { const n = Math.min(G.bz.list.length, 9 + rnd(10)); return { s, f: 1, r: G.bz.list.slice(0, n).map((x) => (Math.random() < 0.72 ? x[1] : 1 - x[1])) }; }
      case 'maj': return { s, v: rnd(G.mj.q.o.length) };
      case 'sort': return { s, r: G.so.key.map((k) => (Math.random() < 0.75 ? k : 1 - k)) };""")
# ---- prikaz ----
rep("      if (ph === 'sortReveal' || ph === 'linkReveal') { e.g = p.gained; e.k = p.cnt; }", """      if (ph === 'sortReveal' || ph === 'linkReveal' || ph === 'orderReveal' || ph === 'hiloReveal' || ph === 'blitzReveal') { e.g = p.gained; e.k = p.cnt; }
      if (ph === 'blitzReveal') e.x = p.bad;
      if (ph === 'majReveal') { e.mv = p.mjV; e.g = p.gained; }""")
rep("    if (ph === 'question' || ph === 'reveal' || ph === 'fq' || ph === 'fr') {\n      v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: G.qn };\n    }", """    if (ph === 'question' || ph === 'reveal' || ph === 'fq' || ph === 'fr') {
      v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: G.qn };
      if (G.q.k && (ph === 'question' || ph === 'reveal')) { v.q.k = G.q.k; if (G.q.cl) v.q.cl = G.q.cl; }
    }
    if (ph === 'howto' && G.ht) v.ht = Object.assign({}, G.ht, HOWTO[G.ht.k]);
    if (ph === 'order' || ph === 'orderReveal') v.or = { t: G.or.t, lo: G.or.lo, hi: G.or.hi, it: G.or.items };
    if (ph === 'orderReveal') { v.or.key = G.or.key; if (G.or.v) v.or.v = G.or.v; }
    if (ph === 'hilo' || ph === 'hiloReveal') v.hl = { list: G.hl.list };
    if (ph === 'blitz' || ph === 'blitzReveal') v.bz = { list: G.bz.list };
    if (ph === 'maj' || ph === 'majReveal') v.mj = { q: G.mj.q, i: G.mj.i, n: G.mj.qs.length };
    if (ph === 'majReveal') { v.mj.cnt = G.mj.cnt; v.mj.win = G.mj.win; v.mj.last = G.mj.last ? 1 : 0; }""")
open(p,'w').write(s); print('engine OK')
