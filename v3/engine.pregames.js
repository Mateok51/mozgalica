//#engine-start
// ---------- Mozgalica: logika igre (bez DOM-a; vodi je uređaj domaćina) ----------
const DATA = __DATA__;

const POWERS = {
  led:   { n: 'Led',          atk: true,  d: 'Zaledi protivniku odgovore. Mora razbiti led tapkanjem.' },
  sluz:  { n: 'Sluz',         atk: true,  d: 'Zalij protivniku ekran sluzi. Mora je obrisati prstom.' },
  grick: { n: 'Grickalice',   atk: true,  d: 'Gladne bubice pojedu dio slova u protivnikovim odgovorima.' },
  bomba: { n: 'Bomba',        atk: true,  d: 'Bombe lete preko odgovora. Tko dotakne bombu, nakratko ne vidi ništa.' },
  dupli: { n: 'Dupli bodovi', atk: false, d: 'Točan odgovor vrijedi dvostruko.' },
  pola:  { n: 'Pola-pola',    atk: false, d: 'Uklanja dva netočna odgovora s tvog ekrana.' },
  stit:  { n: 'Štit',         atk: false, d: 'Odbija sve napade na tebe u ovom pitanju.' },
};
const POWER_KEYS = Object.keys(POWERS);
const BUFF_KEYS = POWER_KEYS.filter((k) => !POWERS[k].atk);
const AV_COUNT = 8;

const CFG = {
  intro: 3.5, vote: 10, voteShow: 3, power: 12, bet: 15, betEvents: [2, 3], cast: 1.25, fpower: 7, fstart: 5, startCap: 3, q: 20, reveal: 7,
  sort: 40, link: 40, chReveal: 8, fq: 10, fr: 4,
  steps: 8, finaleMax: 20, maxPlayers: 6, nameMax: 12,
  // Tavern Director: trajanje trenutaka, dvoboja i tajnih događaja
  moment: 2.4, duelIntro: 2.6, duel: 10, duelRes: 3.5, duelBonus: 300, secret: 8, secret2: 7, secretBonus: 200, helpBonus: 150,
};

// Prekidači za nove sustave (mogu se mijenjati i po igri preko createGame({ flags }))
const FLAGS = {
  ENABLE_TAVERN_DIRECTOR: true,
  ENABLE_RIVALRIES: true,
  ENABLE_DUELS: true,
  ENABLE_SECRET_EVENTS: true,
  ENABLE_SECRET_TARGET: true,
  ENABLE_SECRET_HELP: false,
  DEBUG_TAVERN_DIRECTOR: false,
};

const PLAN = [
  { t: 'intro', title: 'Runda 1', sub: 'Glasajte za kategoriju i bacajte moći!' },
  { t: 'battle' }, { t: 'battle' }, { t: 'battle' },
  { t: 'intro', title: 'Izazov', sub: 'Razvrstavanje' }, { t: 'sort' },
  { t: 'intro', title: 'Runda 2', sub: 'Tri nova pitanja' }, { t: 'battle' }, { t: 'battle' }, { t: 'battle' },
  { t: 'intro', title: 'Izazov', sub: 'Spajanje parova' }, { t: 'link' },
  { t: 'intro', title: 'Runda 3', sub: 'Zadnja prilika za bodove prije finala' }, { t: 'battle' }, { t: 'battle' }, { t: 'battle' },
  { t: 'intro', title: 'Veliko finale', sub: 'Utrka do vrha piramide' }, { t: 'finale' },
];

const INPUT_PHASES = { vote: 1, bet: 1, power: 1, question: 1, sort: 1, link: 1, fq: 1, duel: 1, secret: 1, secret2: 1 };
const SKIPPABLE = { fstart: 1, intro: 1, voteResult: 1, reveal: 1, sortReveal: 1, linkReveal: 1, fr: 1, moment: 1, duelIntro: 1, duelResult: 1 };

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const CODE_LETTERS = 'ABCDEFGHJKLMNPRSTUVZ';
function makeCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  return s;
}
function rankBy(players, key) {
  return players.slice().sort((a, b) =>
    key === 'st' ? ((b.st || 0) - (a.st || 0) || b.sc - a.sc) : (b.sc - a.sc));
}

function createGame(o) {
  const cfg = Object.assign({}, CFG, o.cfg || {});
  const F = Object.assign({}, FLAGS, o.flags || {});
  const plan = o.plan || PLAN;
  const D = o.data || DATA;
  const now = o.now || (() => Date.now());
  const onChange = o.onChange || (() => {});
  const R = new Map();
  let timers = [];
  const G = {
    code: o.code, ph: 'lobby', s: 0, endsAt: 0, dur: 0, startedAt: 0, pi: -1, rl: '',
    intro: null, cats: null, cw: -1, q: null, qn: 0, ev: [], so: null, li: null,
    win: null, fact: '', inFinale: false, fqn: 0,
    used: { q: new Set(), sort: new Set(), link: new Set(), tf: new Set() },
  };
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const list = () => [...R.values()];
  const active = () => list().filter((p) => p.on);
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const isInt = (n) => Number.isInteger(n);
  const allDone = () => { const a = active(); return a.length > 0 && a.every((p) => p.done); };

  // ----- igrači -----
  function cleanName(raw) { return String(raw || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, cfg.nameMax); }
  function uniqueName(name, pid) {
    let n = name, i = 2;
    const taken = () => list().some((p) => p.pid !== pid && p.name.toLowerCase() === n.toLowerCase());
    while (taken()) { const suf = ' ' + i; n = name.slice(0, cfg.nameMax - suf.length) + suf; i++; }
    return n;
  }
  function avFree(av, pid) { return isInt(av) && av >= 0 && av < AV_COUNT && !list().some((p) => p.pid !== pid && p.av === av); }
  function firstFreeAv(pid) { for (let i = 0; i < AV_COUNT; i++) if (avFree(i, pid)) return i; return 0; }

  function makePlayer(pid, name, av, bot, local) {
    if (R.has(pid)) return R.get(pid);
    if (G.ph !== 'lobby' || R.size >= cfg.maxPlayers) return null;
    const nm = cleanName(name);
    if (!nm) return null;
    const p = {
      pid, name: uniqueName(nm, pid), av: avFree(av, pid) ? av : firstFreeAv(pid), local: !!local,
      score: 0, gained: 0, on: true, bot: !!bot, done: false, lastIn: '',
      vote: -1, offers: [], pw: null, fx: [], dbl: false, pola: false, sh: false, hide: null,
      ans: -1, ansMs: 0, ch: -1, sortA: null, linkA: null, cnt: 0, fstep: 0, mv: 0, fst: 0, lastPw: '', bet: 0, betMul: 1, betRes: 0,
    };
    R.set(pid, p);
    return p;
  }
  function addPlayer(pid, name, av, bot, local) { const p = makePlayer(pid, name, av, bot, local); if (p) onChange(); return p; }
  function addBot(name, av) { return addPlayer('bot-' + name, name, av, true); }
  function setAvatar(pid, av) {
    const p = R.get(pid);
    if (!p || G.ph !== 'lobby' || !avFree(av, pid) || p.av === av) return;
    p.av = av; onChange();
  }

  // ----- unosi -----
  function accept(p, inp) {
    if (!inp || typeof inp !== 'object' || inp.s !== G.s || p.done || !p.on) return false;
    switch (G.ph) {
      case 'vote':
        if (!isInt(inp.v) || inp.v < 0 || inp.v >= G.cats.length) return false;
        p.vote = inp.v; break;
      case 'bet': {
        if (!BET_OPTS.includes(inp.b)) return false;
        p.bet = inp.b === -1 ? p.score : Math.min(inp.b, p.score);
        break;
      }
      case 'power': {
        if (inp.p === '' || inp.p == null) { p.pw = null; break; }
        if (!p.offers.includes(inp.p)) return false;
        if (POWERS[inp.p].atk) {
          const t = R.get(inp.t);
          if (!t || t.pid === p.pid) return false;
          p.pw = { k: inp.p, t: t.pid };
        } else p.pw = { k: inp.p };
        break;
      }
      case 'question': case 'fq': {
        const c = inp.c;
        if (!isInt(c) || c < 0 || c >= G.q.o.length) return false;
        if (p.hide && p.hide.includes(c)) return false;
        const el = now() - G.startedAt;
        const t = Number.isFinite(inp.t) ? inp.t : el;
        p.ans = c; p.ansMs = Math.max(0, Math.min(t, el));
        break;
      }
      case 'duel': {
        if (!G.du || (p.pid !== G.du.a && p.pid !== G.du.b)) return false;
        const c = inp.c;
        if (!isInt(c) || c < 0 || c >= G.q.o.length) return false;
        const el = now() - G.startedAt;
        const t = Number.isFinite(inp.t) ? inp.t : el;
        p.ans = c; p.ansMs = Math.max(0, Math.min(t, el));
        break;
      }
      case 'secret': {
        if (!G.se || p.pid !== G.se.p) return false;
        const t = R.get(inp.x);
        if (!t || t.pid === p.pid || !t.on) return false;
        G.se.x = t.pid; break;
      }
      case 'secret2': {
        if (!G.se || p.pid !== G.se.x) return false;
        G.se.ok = inp.y ? 1 : 0; break;
      }
      case 'sort': {
        const a = inp.r;
        if (!Array.isArray(a) || a.length !== G.so.items.length || !a.every((x) => x === 0 || x === 1)) return false;
        p.sortA = a.slice(); break;
      }
      case 'link': {
        const a = inp.r;
        if (!Array.isArray(a) || a.length !== G.li.L.length || !a.every((x) => isInt(x) && x >= 0 && x < G.li.R.length)) return false;
        p.linkA = a.slice(); break;
      }
      default: return false;
    }
    p.done = true;
    return true;
  }
  function setInput(pid, inp) {
    const p = R.get(pid);
    if (!p || !accept(p, inp)) return false;
    if (INPUT_PHASES[G.ph] && allDone()) endPhase(); else onChange();
    return true;
  }

  // peers: [{pid, name, av, in}] — svi igrači spojeni preko sobe
  function syncPeers(peers) {
    const seen = new Set();
    let changed = false;
    for (const x of peers) {
      if (!x || typeof x.pid !== 'string' || x.pid.length > 40) continue;
      seen.add(x.pid);
      let p = R.get(x.pid);
      if (!p) { p = makePlayer(x.pid, x.name, x.av, false); if (!p) continue; changed = true; }
      else {
        if (!p.on) { p.on = true; changed = true; }
        if (G.ph === 'lobby' && x.av !== p.av && avFree(x.av, p.pid)) { p.av = x.av; changed = true; }
      }
      if (x.in) {
        const k = JSON.stringify(x.in);
        if (k !== p.lastIn) { p.lastIn = k; if (accept(p, x.in)) changed = true; }
      }
    }
    for (const p of list()) if (!p.bot && !p.local && p.on && !seen.has(p.pid)) { p.on = false; changed = true; }
    if (G.ph === 'lobby') for (const [id, p] of R) if (!p.on) { R.delete(id); changed = true; }
    if (INPUT_PHASES[G.ph] && allDone()) return endPhase();
    if (changed) onChange();
  }

  // ----- faze -----
  function setPhase(ph, secs) {
    clear();
    G.ph = ph; G.s += 1;
    G.dur = Math.round(secs * 1000);
    G.startedAt = now(); G.endsAt = G.startedAt + G.dur;
    for (const p of list()) p.done = false;
    const s = G.s;
    later(() => { if (G.s === s) endPhase(); }, G.dur + (INPUT_PHASES[ph] ? 400 : 0));
    if (INPUT_PHASES[ph]) botsAct();
    onChange();
  }

  function endPhase() {
    switch (G.ph) {
      case 'intro': return next();
      case 'vote': return resolveVote();
      case 'voteResult': return G.betAt && G.betAt.has(G.bn) && list().some((p) => p.score > 0) ? startBet() : (maybeSecret() || startPower());
      case 'bet': return startPower();
      case 'power': return resolvePower();
      case 'cast': return afterPower();
      case 'fstart': return startFinaleQ();
      case 'question': return scoreQuestion();
      case 'reveal': return afterReveal();
      case 'sort': return scoreSort();
      case 'link': return scoreLink();
      case 'sortReveal': case 'linkReveal': return afterReveal();
      case 'moment': return afterMoment();
      case 'duelIntro': return startDuel();
      case 'duel': return scoreDuel();
      case 'duelResult': return next();
      case 'secret': return afterSecret();
      case 'secret2': return startPower();
      case 'fq': return scoreFinale();
      case 'fr': return afterFinaleQ();
    }
  }

  function start() {
    if (G.ph !== 'lobby' || active().length < 1) return;
    for (const p of list()) { p.score = 0; p.gained = 0; p.fstep = 0; }
    for (const k in G.used) G.used[k].clear();
    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null;
    // kladionica: nasumično 2-3 puta po igri, najviše jednom po rundi (nikad u finalu)
    G.bn = -1; G.betAt = new Set();
    const nb = plan.filter((it) => it.t === 'battle').length, rounds = Math.ceil(nb / 3);
    const want = Math.min(rounds, cfg.betEvents[0] + rnd(cfg.betEvents[1] - cfg.betEvents[0] + 1));
    for (const r of shuffle(Array.from({ length: rounds }, (_, i) => i)).slice(0, want)) G.betAt.add(Math.min(nb - 1, r ? r * 3 + rnd(3) : 1 + rnd(2)));
    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; }
    TD.reset();
    next();
  }

  function next() {
    G.pi += 1;
    const it = plan[G.pi];
    if (!it) return finish();
    if (it.t === 'intro') { G.intro = { t: it.title, sub: it.sub }; G.rl = it.title; return setPhase('intro', cfg.intro); }
    if (it.t === 'battle') return startVote();
    if (it.t === 'sort') return startSort();
    if (it.t === 'link') return startLink();
    if (it.t === 'finale') return startFinale();
    return next();
  }

  function startVote() {
    const avail = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!avail.length) return next();
    G.bn = (G.bn == null ? -1 : G.bn) + 1;
    G.cats = shuffle(avail).slice(0, 4);
    G.cw = -1;
    for (const p of list()) p.vote = -1;
    setPhase('vote', cfg.vote);
  }
  function resolveVote() {
    const counts = G.cats.map(() => 0);
    for (const p of active()) if (p.vote >= 0) counts[p.vote]++;
    const max = Math.max(...counts);
    const best = counts.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
    G.cw = pick(best);
    G.tie = best.length > 1 ? 1 : 0;
    TD.onVote();
    setPhase('voteResult', cfg.voteShow);
  }

  // Pravedna podjela moći: tko zaostaje češće dobiva štit, dupli i pola-pola, a vodeći ih dobiva rijetko.
  // Ista moć se ne nudi dvaput zaredom, a u finalu dupli ne dobiva vodeći ni tko je blizu vrha.
  function powerWeight(k, t, p) {
    if (POWERS[k].atk) return 1;
    if (k === 'stit') return 0.3 + 0.9 * t;
    if (k === 'pola') return 0.4 + 1.0 * t;
    if (k === 'dupli') {
      if (G.inFinale && (t === 0 || p.fstep >= cfg.steps - 2)) return 0;
      return 0.3 + 1.4 * t;
    }
    return 1;
  }
  function weightedPick(keys, wf) {
    const ws = keys.map(wf), sum = ws.reduce((a, b) => a + b, 0);
    if (sum <= 0) return null;
    let r = Math.random() * sum;
    for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0 && ws[i] > 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  function offersFor(p, t, multi) {
    let pool = (multi ? POWER_KEYS : BUFF_KEYS).filter((k) => !(G.inFinale && k === 'pola'));
    const wf = (k) => powerWeight(k, t, p) * (k === p.lastPw ? (k === 'dupli' ? 0 : 0.2) : 1);
    const out = [];
    if (multi) { const a = weightedPick(pool.filter((k) => POWERS[k].atk), wf); if (a) out.push(a); }
    while (out.length < 3) {
      const k = weightedPick(pool.filter((x) => !out.includes(x)), wf);
      if (!k) break;
      out.push(k);
    }
    return shuffle(out);
  }
  // 0 = vodeći, 1 = zadnji (prema bodovima, u finalu prema stepenici pa bodovima)
  function standing() {
    const ps = active();
    const val = (p) => (G.inFinale ? p.fstep * 1e6 : 0) + p.score;
    const vs = ps.map(val), hi = Math.max(...vs), lo = Math.min(...vs);
    const m = new Map();
    for (const p of ps) m.set(p.pid, hi === lo ? 0.5 : (hi - val(p)) / (hi - lo));
    if (G.inFinale) { const top = Math.max(...ps.map((p) => p.fstep)); for (const p of ps) if (p.fstep === top) m.set(p.pid, 0); }
    return m;
  }
  const BET_OPTS = [0, 100, 300, 500, -1];
  function startBet() {
    const st = standing(), multi = active().length > 1;
    for (const p of list()) { p.bet = 0; p.betRes = 0; p.betMul = multi && st.get(p.pid) === 1 ? 1.5 : 1; }
    setPhase('bet', cfg.bet);
  }
  function startPower() {
    const multi = active().length > 1, st = standing();
    for (const p of list()) {
      p.pw = null; p.fx = []; p.dbl = false; p.pola = false; p.sh = false; p.hide = null;
      p.offers = offersFor(p, st.has(p.pid) ? st.get(p.pid) : 0.5, multi);
    }
    setPhase('power', G.inFinale ? cfg.fpower : cfg.power);
  }
  function resolvePower() {
    G.ev = [];
    for (const p of list()) if (p.pw && p.pw.k === 'stit') p.sh = true;
    for (const p of list()) {
      p.lastPw = p.pw ? p.pw.k : '';
      if (!p.pw) continue;
      const k = p.pw.k;
      if (POWERS[k].atk) {
        const t = R.get(p.pw.t);
        if (!t) continue;
        if (t.sh) G.ev.push({ f: p.pid, p: k, t: t.pid, b: 1 });
        else { t.fx.push(k); G.ev.push({ f: p.pid, p: k, t: t.pid }); }
      } else {
        if (k === 'dupli') p.dbl = true;
        if (k === 'pola') p.pola = true;
        G.ev.push({ f: p.pid, p: k });
      }
    }
    TD.onPower();
    // prikaz bacanja: prvo štitovi, zatim ostale pomoći, zatim napadi
    const rank = (e) => (e.p === 'stit' ? 0 : e.t ? 2 : 1);
    G.ev.sort((a, b) => rank(a) - rank(b));
    if (!G.ev.length || cfg.cast <= 0) return afterPower();
    setPhase('cast', Math.min(10, 1.3 + G.ev.length * cfg.cast));
  }

  function afterPower() { return G.inFinale ? beginFinaleQ() : startQuestion(); }
  function startQuestion() {
    const cat = G.cats[G.cw];
    const pool = D.cats[cat].map((q, i) => i).filter((i) => !G.used.q.has(cat + '|' + i));
    const qi = pick(pool);
    G.used.q.add(cat + '|' + qi);
    const q = D.cats[cat][qi];
    const order = shuffle([0, 1, 2, 3]);
    G.q = { c: cat, t: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a) };
    G.qn += 1; G.sxDone = null;
    for (const p of list()) {
      p.ans = -1; p.ansMs = 0; p.gained = 0; p.ch = -1;
      if (p.pola) p.hide = shuffle([0, 1, 2, 3].filter((i) => i !== G.q.a)).slice(0, 2);
    }
    setPhase('question', cfg.q);
  }
  function scoreQuestion() {
    G.q.cnt = [0, 0, 0, 0];
    for (const p of list()) {
      p.ch = p.ans;
      if (p.ans >= 0) G.q.cnt[p.ans]++;
      if (p.ans === G.q.a) {
        const ratio = Math.min(1, Math.max(0, 1 - p.ansMs / (cfg.q * 1000)));
        p.gained = Math.round(500 + 500 * ratio) * (p.dbl ? 2 : 1);
        p.score += p.gained;
      } else p.gained = 0;
      p.betRes = 0;
      if (p.bet > 0) { p.betRes = p.ans === G.q.a ? Math.round(p.bet * p.betMul) : -p.bet; p.score = Math.max(0, p.score + p.betRes); }
      p.bet = 0;
    }
    resolveSecret();
    TD.afterQuestion();
    // trenutak iz krčme prikazuje se ispod poretka, pa otkrivanje traje sekundu dulje
    setPhase('reveal', cfg.reveal + (G.pend && G.pend.mo ? 1 : 0));
  }

  function unusedIndex(arr, set) {
    const pool = arr.map((_, i) => i).filter((i) => !set.has(i));
    const i = pool.length ? pick(pool) : rnd(arr.length);
    set.add(i);
    return i;
  }

  function startSort() {
    const set = D.sort[unusedIndex(D.sort, G.used.sort)];
    const items = shuffle(set.A.map((x) => [x, 0]).concat(set.B.map((x) => [x, 1])));
    G.so = { a: set.a, b: set.b, items: items.map((x) => x[0]), key: items.map((x) => x[1]) };
    for (const p of list()) { p.sortA = null; p.gained = 0; p.cnt = 0; }
    setPhase('sort', cfg.sort);
  }
  function scoreSort() {
    for (const p of list()) {
      p.cnt = p.sortA ? p.sortA.filter((x, i) => x === G.so.key[i]).length : 0;
      p.gained = p.cnt * 150;
      p.score += p.gained;
    }
    TD.afterScores();
    setPhase('sortReveal', cfg.chReveal);
  }

  function startLink() {
    const set = D.link[unusedIndex(D.link, G.used.link)];
    const lo = shuffle([0, 1, 2, 3]), ro = shuffle([0, 1, 2, 3]);
    G.li = { t: set.t, L: lo.map((i) => set.p[i][0]), R: ro.map((i) => set.p[i][1]), key: lo.map((i) => ro.indexOf(i)) };
    for (const p of list()) { p.linkA = null; p.gained = 0; p.cnt = 0; }
    setPhase('link', cfg.link);
  }
  function scoreLink() {
    for (const p of list()) {
      p.cnt = p.linkA ? p.linkA.filter((x, i) => x === G.li.key[i]).length : 0;
      p.gained = p.cnt * 200;
      p.score += p.gained;
    }
    TD.afterScores();
    setPhase('linkReveal', cfg.chReveal);
  }

  function startFinale() {
    G.inFinale = true; G.fqn = 0;
    // početna stepenica prema bodovima u odnosu na vodećeg, najviše cfg.startCap
    const top = Math.max(0, ...list().map((p) => p.score));
    for (const p of list()) {
      p.fstep = top > 0 ? Math.max(0, Math.min(cfg.startCap, Math.round(cfg.startCap * p.score / top))) : 0;
      p.fst = p.fstep; p.mv = 0; p.lastPw = '';
    }
    setPhase('fstart', cfg.fstart);
  }
  function startFinaleQ() {
    const pool = D.tf.map((_, i) => i).filter((i) => !G.used.tf.has(i));
    if (!pool.length || G.fqn >= cfg.finaleMax) return finish();
    startPower();
  }
  function beginFinaleQ() {
    const pool = D.tf.map((_, i) => i).filter((i) => !G.used.tf.has(i));
    if (!pool.length) return finish();
    const i = pick(pool);
    G.used.tf.add(i);
    G.q = { c: 'Točno ili netočno?', t: D.tf[i][0], o: ['Točno', 'Netočno'], a: D.tf[i][1] ? 0 : 1 };
    G.fqn += 1;
    for (const p of list()) { p.ans = -1; p.ansMs = 0; p.mv = 0; p.ch = -1; p.hide = null; }
    setPhase('fq', cfg.fq);
  }
  function scoreFinale() {
    const right = list().filter((p) => p.ans === G.q.a);
    const fastest = right.slice().sort((a, b) => a.ansMs - b.ansMs)[0];
    for (const p of list()) {
      p.ch = p.ans;
      p.mv = 0;
      if (p.ans === G.q.a) p.mv = 1 + (p === fastest ? 1 : 0) + (p.dbl ? 1 : 0);
      // dupli nikoga ne vodi do vrha: bez njega se stiže najviše do predzadnje stepenice
      if (p.dbl && p.mv > 0 && p.fstep + p.mv >= cfg.steps && p.fstep + p.mv - 1 < cfg.steps) p.mv -= 1;
      p.fstep = Math.min(cfg.steps, p.fstep + p.mv);
    }
    if (!list().some((p) => p.fstep >= cfg.steps)) TD.afterFinale(); else G.pend = null;
    setPhase('fr', cfg.fr + (G.pend && G.pend.mo ? 1 : 0));
  }
  function afterFinaleQ() {
    if (list().some((p) => p.fstep >= cfg.steps)) return finish();
    G.pend = null;
    startFinaleQ();
  }

  function finish() {
    clear();
    const ranked = list().slice().sort((a, b) => b.fstep - a.fstep || b.score - a.score);
    G.win = ranked.length ? ranked[0].pid : null;
    G.fact = pick(D.facts);
    G.ph = 'final'; G.s += 1; G.dur = 0; G.endsAt = now();
    onChange();
  }

  function restart() {
    if (G.ph !== 'final') return;
    clear();
    for (const [id, p] of R) if (!p.on) R.delete(id);
    for (const p of list()) { p.score = 0; p.gained = 0; p.fstep = 0; p.done = false; }
    G.ph = 'lobby'; G.s += 1; G.pi = -1; G.inFinale = false; G.win = null; G.rl = ''; TD.reset();
    onChange();
  }
  function skip() { if (SKIPPABLE[G.ph]) endPhase(); }

  // ===================== TAVERN DIRECTOR =====================
  // Prati što se događa u partiji i povremeno pretvara zanimljive trenutke u kratki "show" (bez promjene pravila igre).
  // Sve je lokalno i determinističko iz stanja igre; pamti se samo unutar trenutne partije.
  const PW_ACC = { led: 'Led', sluz: 'Sluz', grick: 'Grickalice', bomba: 'Bombu', dupli: 'Dupli bodove', pola: 'Pola-pola', stit: 'Štit' };
  const TD = (() => {
    let T = null;
    const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
    const inc = (o, k, n) => { o[k] = (o[k] || 0) + (n || 1); return o[k]; };
    const nm = (pid) => (R.get(pid) || {}).name || '?';
    const human = (pid) => { const p = R.get(pid); return p && !p.bot; };
    function reset() {
      T = {
        turn: 0, leader: null, prevLeader: null, leaderChanges: 0, leadHist: [],
        streak: {}, wrongStreak: {}, lowRank: {}, highRank: {}, prevRank: {}, rank: {},
        attacks: {}, attackedBy: {}, powerUse: {}, targeted: {}, bugs: {}, catVotes: {}, fastest: {},
        threat: {}, rival: {}, activeRival: null, lastMajor: -99, lastAny: -99, shown: {}, history: [],
        duels: 0, secrets: {}, secretTotal: 0, lastSecretBn: -9,
      };
      G.pend = null; G.du = null; G.se = null; G.mo = null;
    }
    function onVote() {
      if (!T) return;
      const cat = G.cats[G.cw];
      for (const p of active()) if (p.vote >= 0) { const c = G.cats[p.vote]; T.catVotes[p.pid] = T.catVotes[p.pid] || {}; inc(T.catVotes[p.pid], c); }
      T.lastCat = cat;
    }
    function onPower() {
      if (!T) return;
      T.threat = {};
      for (const e of G.ev) {
        T.powerUse[e.f] = T.powerUse[e.f] || {}; inc(T.powerUse[e.f], e.p);
        if (!e.t) continue;
        T.attacks[e.f] = T.attacks[e.f] || {}; inc(T.attacks[e.f], e.t);
        T.attackedBy[e.t] = T.attackedBy[e.t] || {}; inc(T.attackedBy[e.t], e.f);
        inc(T.targeted, e.t);
        if (e.p === 'grick' && !e.b) inc(T.bugs, e.t);
        if (F.ENABLE_RIVALRIES) {
          inc(T.rival, pairKey(e.f, e.t), 2);
          if (T.attacks[e.t] && T.attacks[e.t][e.f] && !T['mut' + pairKey(e.f, e.t)]) { T['mut' + pairKey(e.f, e.t)] = 1; inc(T.rival, pairKey(e.f, e.t), 2); }
        }
        if (!e.b && (T.streak[e.t] || 0) >= 3) T.threat[e.t] = e.f;
      }
    }
    function ranks() {
      const ps = active().slice().sort((a, b) => b.score - a.score || (T.prevRank[a.pid] || 9) - (T.prevRank[b.pid] || 9));
      const r = {}; ps.forEach((p, i) => { r[p.pid] = i + 1; });
      return { r, ps };
    }
    // nakon promjene bodova: poredak, vođa, comeback i rivalstvo iz poretka
    function updateRanks(cands) {
      const { r, ps } = ranks(), n = ps.length;
      T.prevRank = T.rank; T.rank = r;
      if (n < 2) return;
      const lead = ps[0].pid;
      if (ps[0].score > 0 && lead !== T.leader) {
        const old = T.leader;
        T.prevLeader = old; T.leader = lead;
        if (old) {
          T.leaderChanges++; T.leadHist.push(T.turn);
          const swap = T.prevRank[lead] === 2 && r[old] === 2;
          if (swap && F.ENABLE_RIVALRIES) inc(T.rival, pairKey(lead, old), 2);
          const recent = T.leadHist.filter((t) => t >= T.turn - 3).length;
          if (T.activeRival === pairKey(lead, old)) cands.push({ type: 'RIVAL_LEAD', score: 4, key: 'rl', t: 'Još jedna izmjena vodstva', s: nm(lead) + ' i ' + nm(old), a: [lead, old], pose: ['happy', 'shocked'], snd: 'stingRival' });
          else if (recent >= 3) cands.push({ type: 'LEAD_HABIT', score: 3, key: 'lh', t: 'Vodstvo opet mijenja vlasnika', s: nm(lead) + ' je opet prvi', a: [lead], pose: ['happy'], snd: 'stingSmall' });
          else cands.push({ type: 'NEW_LEADER', score: 7, key: 'nl:' + lead + ':' + T.leaderChanges, t: 'Novi vođa', s: nm(lead), a: [lead], pose: ['happy'], snd: 'stingLeader' });
        }
      }
      for (const p of ps) {
        const k = p.pid, now = r[k];
        if (T.lowRank[k] == null || now > T.lowRank[k]) T.lowRank[k] = now;
        if (T.highRank[k] == null || now < T.highRank[k]) T.highRank[k] = now;
        const low = T.lowRank[k], was = T.prevRank[k];
        if ((T.cbN || 0) >= 2) continue;
        if (n >= 3 && low === n && now === 1 && was !== 1 && !T.shown['cb2:' + k])
          cands.push({ type: 'COMEBACK_BIG', score: 10, key: 'cb2:' + k, t: 'Povratak večeri!', s: nm(k) + ': ' + low + '. → 1.', a: [k], pose: ['happy'], snd: 'stingComeback', onShow: () => { T.cbN = (T.cbN || 0) + 1; } });
        else if (n >= 3 && low >= n - 1 && now <= 2 && was > 2 && !T.shown['cb:' + k])
          cands.push({ type: 'COMEBACK', score: 8, key: 'cb:' + k, t: 'Povratak u igru!', s: nm(k) + ': ' + low + '. → ' + now + '.', a: [k], pose: ['happy'], snd: 'stingComeback', onShow: () => { T.cbN = (T.cbN || 0) + 1; } });
      }
      if (F.ENABLE_RIVALRIES) for (let i = 0; i + 1 < n; i++) {
        const a = ps[i], b = ps[i + 1];
        if (a.score > 0 && a.score - b.score < 300) inc(T.rival, pairKey(a.pid, b.pid), 1);
      }
    }
    function rivalryCands(cands) {
      if (!F.ENABLE_RIVALRIES) return;
      if (!T.activeRival) {
        let best = null;
        for (const k in T.rival) if (T.rival[k] >= 8 && (!best || T.rival[k] > T.rival[best])) best = k;
        if (best) {
          const [a, b] = best.split('|');
          if (R.get(a) && R.get(b) && R.get(a).on && R.get(b).on) {
            const last = G.ev.find((e) => e.t && ((e.f === a && e.t === b) || (e.f === b && e.t === a)));
            const pose = last ? (last.f === a ? ['attack', 'shocked'] : ['shocked', 'attack']) : ['idle', 'idle'];
            cands.push({ type: 'RIVALRY', score: 9, key: 'rv:' + best, t: 'Rivalstvo se zakuhava', s: nm(a) + ' vs ' + nm(b), a: [a, b], pose, vs: 1, snd: 'stingRival', onShow: () => { T.activeRival = best; } });
          }
        }
      } else {
        const [a, b] = T.activeRival.split('|');
        const hit = G.ev.find((e) => e.t && ((e.f === a && e.t === b) || (e.f === b && e.t === a)));
        if (hit) cands.push({ type: 'RIVAL_AGAIN', score: 4, key: 'ra', t: 'Opet njih dvoje', s: nm(hit.f) + ' → ' + nm(hit.t), a: [hit.f, hit.t], pose: ['attack', 'shocked'], vs: 1, snd: 'stingRival' });
      }
    }
    // "krčma pamti": kratke opaske iz stvarnih događaja (male važnosti, dugi razmak)
    function memoryCands(cands) {
      for (const f in T.attacks) for (const t in T.attacks[f]) if (T.attacks[f][t] >= 3 && G.ev.some((e) => e.f === f && e.t === t))
        cands.push({ type: 'REPEAT_TARGET', score: 4, key: 'rt:' + f + t, t: 'Krčma pamti', s: nm(f) + ' opet cilja istu metu: ' + nm(t), a: [f, t], pose: ['attack', 'shocked'] });
      const tg = Object.entries(T.targeted).sort((x, y) => y[1] - x[1]);
      if (tg[0] && tg[0][1] >= 4 && (!tg[1] || tg[0][1] - tg[1][1] >= 2)) cands.push({ type: 'MOST_TARGETED', score: 4, key: 'mt:' + tg[0][0], t: 'Krčma pamti', s: nm(tg[0][0]) + ' je danas svima omiljena meta', a: [tg[0][0]], pose: ['shocked'] });
      for (const k in T.bugs) if (T.bugs[k] >= 2 && G.ev.some((e) => e.t === k && e.p === 'grick' && !e.b)) cands.push({ type: 'BUGS', score: 3, key: 'bg:' + k, t: 'Krčma pamti', s: nm(k) + ' stvarno nema sreće s bubama', a: [k], pose: ['shocked'] });
      for (const k in T.fastest) if (T.fastest[k] >= 3 && T.lastFast === k) cands.push({ type: 'FASTEST', score: 3, key: 'fs:' + k, t: 'Krčma pamti', s: nm(k) + ' opet prvi reagira', a: [k], pose: ['happy'] });
      for (const k in T.powerUse) for (const pw in T.powerUse[k]) if (T.powerUse[k][pw] >= 3 && G.ev.some((e) => e.f === k && e.p === pw)) cands.push({ type: 'POWER_HABIT', score: 2, key: 'ph:' + k, t: 'Krčma pamti', s: nm(k) + ' očito voli ' + PW_ACC[pw], a: [k], pose: ['idle'] });
      for (const k in T.catVotes) for (const c in T.catVotes[k]) if (T.catVotes[k][c] >= 3 && T.lastCat === c && R.get(k) && R.get(k).vote >= 0 && G.cats && G.cats[R.get(k).vote] === c) cands.push({ type: 'CATEGORY_HABIT', score: 2, key: 'ch:' + k, t: 'Krčma pamti', s: nm(k) + ' se opet vraća: ' + c, a: [k], pose: ['idle'] });
    }
    function duelCand(cands) {
      if (!F.ENABLE_DUELS || T.duels >= 1 || G.inFinale || active().length < 3) return;
      const nb = plan.filter((it) => it.t === 'battle').length;
      const left = plan.slice(G.pi + 1).some((it) => it.t === 'battle');
      if (!left || G.bn < 3) return;
      let pair = null;
      if (T.activeRival && T.shownAt && T.turn - T.shownAt >= 1) pair = T.activeRival.split('|');
      else if (!T.activeRival && G.bn >= Math.max(5, nb - 4)) {
        const ps = ranks().ps;
        let bd = Infinity;
        for (let i = 0; i + 1 < ps.length; i++) { const d = ps[i].score - ps[i + 1].score; if (d < bd && d < 400) { bd = d; pair = [ps[i].pid, ps[i + 1].pid]; } }
      }
      if (!pair || !pair.every((x) => R.get(x) && R.get(x).on)) return;
      cands.push({ type: 'DUEL', score: 9, key: 'duel', duel: pair, a: pair });
    }
    function pickMoment(cands) {
      const turn = T.turn;
      const ok = cands.filter((c) => {
        if (T.shown[c.key] != null && (c.key.length <= 3 ? turn - T.shown[c.key] < 6 : true)) return false;
        const gap = turn - T.lastAny;
        if (G.inFinale) return ['CLOSE_RACE', 'RIVAL_LEAD', 'RIVALRY', 'COMEBACK', 'COMEBACK_BIG'].includes(c.type) && gap >= 2;
        if (c.score >= 9) return gap >= 1;
        if (c.score >= 7) return gap >= 2;
        if (c.score >= 5) return gap >= 2;
        return gap >= 3;
      });
      // prednost ljudskim pričama kad je važnost slična
      const val = (c) => c.score + (c.a && c.a.some(human) ? 0.6 : 0);
      ok.sort((x, y) => val(y) - val(x));
      if (F.DEBUG_TAVERN_DIRECTOR) { try { console.log('[TavernDirector] potez ' + turn, cands.map((c) => ({ type: c.type, score: c.score })), '→', ok[0] ? ok[0].type : 'ništa'); } catch (e) {} }
      const c = ok[0];
      if (!c) return null;
      T.shown[c.key] = turn; T.lastAny = turn; if (c.score >= 7) T.lastMajor = turn;
      if (c.onShow) c.onShow();
      if (c.type === 'RIVALRY') T.shownAt = turn;
      T.history.push({ turn, type: c.type });
      return c;
    }
    function finalizePend(c) {
      if (!c) { G.pend = null; return; }
      if (c.type === 'DUEL') { T.duels++; G.pend = { duel: c.duel }; return; }
      G.pend = { mo: { k: c.type, t: c.t, s: c.s, a: c.a, pose: c.pose, vs: c.vs ? 1 : 0, snd: c.snd || 'stingSmall' } };
    }
    function afterQuestion() {
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) { G.pend = null; return; }
      T.turn++;
      const cands = [];
      const right = active().filter((p) => p.ans === G.q.a);
      const fast = right.slice().sort((a, b) => a.ansMs - b.ansMs)[0];
      T.lastFast = fast && right.length > 1 ? fast.pid : null;
      if (T.lastFast) inc(T.fastest, T.lastFast);
      for (const p of active()) {
        const k = p.pid;
        if (p.ans === G.q.a) {
          const st = inc(T.streak, k); T.wrongStreak[k] = 0;
          if (st === 5) cands.push({ type: 'STREAK5', score: 7, key: 's5:' + k + ':' + T.turn, t: 'Nezaustavljiv niz!', s: p.name + ' — 5 točnih zaredom', a: [k], pose: ['happy'], snd: 'stingStreak' });
          else if (st === 3) cands.push({ type: 'STREAK3', score: 5, key: 's3:' + k + ':' + T.turn, t: 'U formi!', s: p.name + ' — 3 točna zaredom', a: [k], pose: ['happy'], snd: 'stingStreak' });
        } else {
          const had = T.streak[k] || 0; T.streak[k] = 0; inc(T.wrongStreak, k);
          const by = T.threat[k];
          if (had >= 3 && by) {
            if (F.ENABLE_RIVALRIES) inc(T.rival, pairKey(k, by), 2);
            cands.push({ type: 'STREAK_BROKEN', score: 6, key: 'sb:' + k + ':' + T.turn, t: 'Niz je stao', s: p.name + ' (' + had + ' zaredom) · nakon napada: ' + nm(by), a: [by, k], pose: ['attack', 'sad'], snd: 'stingRival' });
          }
        }
      }
      updateRanks(cands);
      if (G.sx) cands.push(G.sx);
      rivalryCands(cands);
      memoryCands(cands);
      duelCand(cands);
      finalizePend(pickMoment(cands));
    }
    function afterScores() {
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) { G.pend = null; return; }
      T.turn++;
      const cands = [];
      updateRanks(cands);
      rivalryCands(cands);
      finalizePend(pickMoment(cands.filter((c) => c.type !== 'DUEL')));
    }
    function afterFinale() {
      G.pend = null;
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) return;
      T.turn++;
      const ps = active().slice().sort((a, b) => b.fstep - a.fstep);
      const cands = [];
      if (ps.length >= 2 && !T.shown.close) {
        const a = ps[0], b = ps[1];
        if (a.fstep >= cfg.steps - 2 && a.fstep - b.fstep <= 1 && (!ps[2] || ps[2].fstep < b.fstep))
          cands.push({ type: 'CLOSE_RACE', score: 8, key: 'close', t: 'Sve se odlučuje između njih', s: a.name + ' vs ' + b.name, a: [a.pid, b.pid], pose: ['idle', 'idle'], vs: 1, snd: 'stingRival' });
      }
      finalizePend(pickMoment(cands));
    }
    // tajni događaji: najviše 2 po partiji, 1 po igraču, nikad dvije bitke zaredom
    function secretPick() {
      if (!F.ENABLE_TAVERN_DIRECTOR || !F.ENABLE_SECRET_EVENTS || !T || G.inFinale) return null;
      const kinds = [];
      if (F.ENABLE_SECRET_TARGET) kinds.push('target');
      if (F.ENABLE_SECRET_HELP) kinds.push('help');
      const ps = active();
      if (!kinds.length || ps.length < 3 || G.bn < 2 || T.secretTotal >= 2 || G.bn - T.lastSecretBn < 2) return null;
      if (Math.random() > (cfg.secretChance != null ? cfg.secretChance : 0.3)) return null;
      const kind = pick(kinds);
      const { r } = ranks();
      let pool = ps.filter((p) => !T.secrets[p.pid]);
      if (kind === 'help') pool = pool.filter((p) => r[p.pid] >= ps.length - 1);
      if (!pool.length) return null;
      const humans = pool.filter((p) => !p.bot);
      const who = pick(humans.length && Math.random() < 0.75 ? humans : pool);
      T.secrets[who.pid] = 1; T.secretTotal++; T.lastSecretBn = G.bn;
      return { k: kind, p: who.pid, x: null, ok: 0 };
    }
    return { reset, onVote, onPower, afterQuestion, afterScores, afterFinale, secretPick, get state() { return T; } };
  })();

  function showMoment() {
    G.mo = G.pend.mo; G.pend = null;
    setPhase('moment', cfg.moment);
  }
  // trenutci se prikazuju na ekranu s poretkom (v.mo); poseban ekran ima samo dvoboj
  function afterReveal() {
    const pd = G.pend;
    G.pend = null;
    if (pd && pd.duel) return startDuelIntro(pd.duel);
    next();
  }
  function afterMoment() {
    G.mo = null;
    if (G.inFinale) return startFinaleQ();
    next();
  }
  // ----- dvoboj: samo dva igrača odgovaraju, brži točan dobiva bonus, nitko ne gubi bodove -----
  function startDuelIntro(pair) {
    G.du = { a: pair[0], b: pair[1], w: null };
    setPhase('duelIntro', cfg.duelIntro);
  }
  function startDuel() {
    const cats = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!cats.length) { G.du = null; return next(); }
    const cat = pick(cats);
    const pool = D.cats[cat].map((q, i) => i).filter((i) => !G.used.q.has(cat + '|' + i));
    const qi = pick(pool);
    G.used.q.add(cat + '|' + qi);
    const q = D.cats[cat][qi], order = shuffle([0, 1, 2, 3]);
    G.q = { c: cat, t: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a) };
    for (const p of list()) { p.ans = -1; p.ansMs = 0; p.ch = -1; p.hide = null; p.fx = []; p.dbl = false; p.sh = false; }
    setPhase('duel', cfg.duel);
    for (const p of list()) if (p.pid !== G.du.a && p.pid !== G.du.b) p.done = true;
    if (allDone()) endPhase();
  }
  function scoreDuel() {
    const A = R.get(G.du.a), B = R.get(G.du.b);
    const right = [A, B].filter((p) => p && p.ans === G.q.a).sort((x, y) => x.ansMs - y.ansMs);
    for (const p of [A, B]) if (p) p.ch = p.ans;
    G.du.w = right.length ? right[0].pid : null;
    G.du.bonus = right.length ? cfg.duelBonus : 0;
    if (right.length) right[0].score += cfg.duelBonus;
    G.du.ms = [A, B].map((p) => (p && p.ans >= 0 ? p.ansMs : -1));
    setPhase('duelResult', cfg.duelRes);
  }
  // ----- tajni događaji (privatna odluka na mobitelu jednog igrača) -----
  function maybeSecret() {
    const se = TD.secretPick();
    if (!se) return false;
    G.se = se;
    setPhase('secret', cfg.secret);
    for (const p of list()) if (p.pid !== se.p) p.done = true;
    if (allDone()) endPhase();
    return true;
  }
  function afterSecret() {
    const se = G.se;
    if (!se || !se.x) { G.se = null; return startPower(); }
    if (se.k === 'help') {
      setPhase('secret2', cfg.secret2);
      for (const p of list()) if (p.pid !== se.x) p.done = true;
      if (allDone()) endPhase();
      return;
    }
    startPower();
  }
  // nakon pitanja: tajna meta / tajna pomoć daju bonus; posljedica postaje javna tek kad se bonus dodijeli
  function resolveSecret() {
    G.sx = null;
    for (const p of list()) p.xb = 0;
    const se = G.se;
    if (!se || !se.x) { G.se = null; return; }
    const A = R.get(se.p), X = R.get(se.x);
    if (A && X && se.k === 'target') {
      se.res = X.ans !== G.q.a ? 1 : 0;
      if (se.res) {
        A.score += cfg.secretBonus; A.xb = cfg.secretBonus;
        G.sx = { type: 'SECRET_TARGET', score: 8, key: 'st:' + A.pid, t: 'Tajna meta!', s: A.name + ' je potajno ciljao/la: ' + X.name + ' · +' + cfg.secretBonus, a: [A.pid, X.pid], pose: ['happy', 'shocked'], vs: 1, snd: 'stingUp' };
      }
    }
    if (A && X && se.k === 'help' && se.ok) {
      se.res = A.ans === G.q.a && X.ans === G.q.a ? 1 : 0;
      if (se.res) {
        A.score += cfg.helpBonus; X.score += cfg.helpBonus; A.xb = X.xb = cfg.helpBonus;
        G.sx = { type: 'SECRET_HELP', score: 8, key: 'sh:' + A.pid, t: 'Tajni savez!', s: A.name + ' i ' + X.name + ' · oboje +' + cfg.helpBonus, a: [A.pid, X.pid], pose: ['happy', 'happy'], snd: 'stingUp' };
      }
    }
    G.sxDone = se; G.se = null;
  }

  // ----- botovi -----
  function botDelay() {
    switch (G.ph) {
      case 'vote': return 1200 + rnd(3500);
      case 'power': return 1500 + rnd(5000);
      case 'bet': return 1000 + rnd(3500);
      case 'question': return 2500 + rnd(cfg.q * 550);
      case 'sort': case 'link': return 6000 + rnd(cfg.sort * 450);
      case 'fq': return 900 + rnd(cfg.fq * 450);
      case 'duel': return 1500 + rnd(cfg.duel * 500);
      case 'secret': case 'secret2': return 1200 + rnd(2500);
    }
    return 2000;
  }
  function botInput(b) {
    const s = G.s;
    switch (G.ph) {
      case 'vote': return { s, v: rnd(G.cats.length) };
      case 'bet': {
        // vodeći je oprezniji, zadnji riskira
        const t = standing().get(b.pid) || 0.5, r = Math.random();
        if (b.score <= 0) return { s, b: 0 };
        if (r < 0.25 - 0.15 * t) return { s, b: 0 };
        if (r < 0.6 - 0.2 * t) return { s, b: 100 };
        if (r < 0.85 - 0.2 * t) return { s, b: 300 };
        return { s, b: r < 0.95 - 0.15 * t ? 500 : -1 };
      }
      case 'power': {
        if (Math.random() < 0.15) return { s, p: '' };
        const k = pick(b.offers);
        if (!POWERS[k].atk) return { s, p: k };
        const others = active().filter((p) => p.pid !== b.pid);
        if (!others.length) return { s, p: '' };
        const leader = others.slice().sort((x, y) => y.score - x.score)[0];
        return { s, p: k, t: (Math.random() < 0.6 ? leader : pick(others)).pid };
      }
      case 'secret': {
        const others = active().filter((p) => p.pid !== b.pid);
        if (!others.length) return null;
        // tajna meta: bot cilja nekoga tko je nedavno griješio; tajna pomoć: nasumični saveznik
        const st = TD.state;
        const w = (p) => 1 + (st && st.wrongStreak[p.pid] ? st.wrongStreak[p.pid] : 0);
        return { s, x: G.se && G.se.k === 'target' ? weightedPick(others, w).pid : pick(others).pid };
      }
      case 'secret2': return { s, y: Math.random() < 0.75 ? 1 : 0 };
      case 'duel':
      case 'question': case 'fq': {
        const opts = G.q.o.map((_, i) => i).filter((i) => !(b.hide && b.hide.includes(i)));
        const wrong = opts.filter((i) => i !== G.q.a);
        const right = Math.random() < (G.ph === 'fq' ? 0.7 : G.ph === 'duel' ? 0.66 : 0.62) || !wrong.length;
        return { s, c: right ? G.q.a : pick(wrong), t: now() - G.startedAt };
      }
      case 'sort': return { s, r: G.so.key.map((k) => (Math.random() < 0.75 ? k : 1 - k)) };
      case 'link': return { s, r: G.li.key.map((k) => (Math.random() < 0.7 ? k : rnd(4))) };
    }
    return null;
  }
  function botsAct() {
    for (const b of list().filter((p) => p.bot && p.on)) {
      const s = G.s;
      // botovi pogođeni moćima odgovaraju sporije
      const extra = G.ph === 'question' ? b.fx.length * 2500 : G.ph === 'fq' ? b.fx.length * 1500 : 0;
      later(() => {
        if (G.s !== s || b.done) return;
        if (accept(b, botInput(b))) { if (allDone()) endPhase(); else onChange(); }
      }, Math.min(botDelay() + extra, G.dur - 200));
    }
  }

  // ----- stanje za prikaz -----
  function view() {
    const ph = G.ph;
    const v = {
      v: 3, code: G.code, ph, s: G.s, ms: Math.max(0, G.endsAt - now()), dur: G.dur,
      rl: G.rl, max: cfg.maxPlayers, steps: cfg.steps,
    };
    if (o.noTv) v.ntv = 1;
    v.P = list().map((p) => {
      const e = { id: p.pid, n: p.name, a: p.av, sc: p.score, c: p.on ? 1 : 0, ok: p.done ? 1 : 0 };
      if ((ph === 'vote' && p.done) || (ph === 'voteResult' && p.vote >= 0)) e.vt = p.vote;
      if (ph === 'power') e.of = p.offers;
      if (ph === 'question' || ph === 'fq') {
        if (p.fx.length) e.fx = p.fx;
        if (p.dbl) e.d = 1;
        if (p.sh) e.sh = 1;
        if (p.hide) e.h = p.hide;
      }
      if (ph === 'reveal') { e.ch = p.ch; e.g = p.gained; if (p.dbl) e.d = 1; }
      if (ph === 'sortReveal' || ph === 'linkReveal') { e.g = p.gained; e.k = p.cnt; }
      if (G.inFinale) e.st = p.fstep;
      if (ph === 'bet') { e.bm = p.betMul; if (p.done) e.bt = p.bet; }
      if ((ph === 'power' || ph === 'cast' || ph === 'question') && p.bet > 0) e.bt = p.bet;
      if (ph === 'reveal' && p.betRes) e.br = p.betRes;
      if (ph === 'fstart') e.fs = p.fst;
      if (ph === 'fr') { e.ch = p.ch; e.mv = p.mv; }
      if (ph === 'reveal' && p.xb) e.xb = p.xb;
      if (ph === 'duelResult' && G.du && (p.pid === G.du.a || p.pid === G.du.b)) e.ch = p.ch;
      return e;
    });
    if (ph === 'intro') v.it = G.intro;
    if (ph === 'vote' || ph === 'voteResult') v.cats = G.cats;
    if (ph === 'voteResult') { v.cw = G.cw; v.tie = G.tie; }
    if (ph === 'bet') { v.cats = G.cats; v.cw = G.cw; }
    if (ph === 'question' || ph === 'reveal' || ph === 'fq' || ph === 'fr') {
      v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: G.qn };
    }
    if (ph === 'cast' || ph === 'question' || ph === 'reveal' || ph === 'fq') v.ev = G.ev;
    if (G.inFinale) v.fin = 1;
    if (ph === 'reveal' || ph === 'fr') { v.cor = G.q.a; if (G.q.cnt) v.cnt = G.q.cnt; }
    if (ph === 'sort' || ph === 'sortReveal') v.so = { a: G.so.a, b: G.so.b, it: G.so.items };
    if (ph === 'sortReveal') v.so.key = G.so.key;
    if (ph === 'link' || ph === 'linkReveal') v.li = { t: G.li.t, L: G.li.L, R: G.li.R };
    if (ph === 'linkReveal') v.li.key = G.li.key;
    if (ph === 'final') { v.win = G.win; v.fact = G.fact; }
    if (ph === 'moment' && G.mo) v.mo = G.mo;
    if ((ph === 'reveal' || ph === 'sortReveal' || ph === 'linkReveal' || ph === 'fr') && G.pend && G.pend.mo) v.mo = G.pend.mo;
    if ((ph === 'duelIntro' || ph === 'duel' || ph === 'duelResult') && G.du) {
      v.du = { a: G.du.a, b: G.du.b, bonus: cfg.duelBonus };
      if (ph === 'duelResult') { v.du.w = G.du.w; v.du.ms = G.du.ms; }
    }
    if (ph === 'duel' || ph === 'duelResult') { v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: 0 }; if (ph === 'duelResult') v.cor = G.q.a; }
    // tajni događaj: javno se zna samo da "netko nešto planira"; tko je odabran zna samo njegov mobitel (p/x), izbor se ne šalje
    if ((ph === 'secret' || ph === 'secret2') && G.se) v.se = { k: G.se.k, p: ph === 'secret' ? G.se.p : null, x: ph === 'secret2' ? G.se.x : null, by: ph === 'secret2' ? G.se.p : null, bonus: G.se.k === 'help' ? cfg.helpBonus : cfg.secretBonus };
    if (ph === 'reveal' && G.sxDone) { const x = G.sxDone; v.sxr = { k: x.k, p: x.p, x: x.x, ok: x.ok, res: x.res ? 1 : 0 }; }
    return v;
  }

  // samo za testove
  function _score(pid, n) { const p = R.get(pid); if (p) p.score = n; }
  return { addPlayer, addBot, setAvatar, setInput, syncPeers, start, skip, restart, view, stop: clear, _score, _td: () => TD.state, _G: G };
}
//#engine-end
