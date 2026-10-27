//#engine-start
// ---------- Mozgalica: logika igre (bez DOM-a; vodi je uređaj domaćina) ----------
const DATA = __DATA__;

const POWERS = {
  led:   { n: 'Led',          atk: true,  d: 'Zaledi protivniku odgovore. Mora razbiti led tapkanjem.' },
  sluz:  { n: 'Sluz',         atk: true,  d: 'Zalij protivniku ekran sluzi. Mora je obrisati prstom.' },
  grick: { n: 'Grickalice',   atk: true,  d: 'Pošalji gladne bubice na odgovore. Mora ih zgnječiti.' },
  bomba: { n: 'Bomba',        atk: true,  d: 'Bomba blokira odgovore dok ne eksplodira ili je ne odbaci.' },
  dupli: { n: 'Dupli bodovi', atk: false, d: 'Točan odgovor vrijedi dvostruko.' },
  pola:  { n: 'Pola-pola',    atk: false, d: 'Uklanja dva netočna odgovora s tvog ekrana.' },
  stit:  { n: 'Štit',         atk: false, d: 'Odbija sve napade na tebe u ovom pitanju.' },
};
const POWER_KEYS = Object.keys(POWERS);
const BUFF_KEYS = POWER_KEYS.filter((k) => !POWERS[k].atk);
const AV_COUNT = 10;

const CFG = {
  intro: 3.5, vote: 10, voteShow: 3, power: 12, cast: 1.25, q: 20, reveal: 7,
  sort: 40, link: 40, chReveal: 8, fq: 10, fr: 4,
  steps: 8, finaleMax: 20, maxPlayers: 6, nameMax: 12,
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

const INPUT_PHASES = { vote: 1, power: 1, question: 1, sort: 1, link: 1, fq: 1 };
const SKIPPABLE = { intro: 1, voteResult: 1, reveal: 1, sortReveal: 1, linkReveal: 1, fr: 1 };

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
      ans: -1, ansMs: 0, ch: -1, sortA: null, linkA: null, cnt: 0, fstep: 0, mv: 0,
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
      case 'voteResult': return startPower();
      case 'power': return resolvePower();
      case 'cast': return startQuestion();
      case 'question': return scoreQuestion();
      case 'reveal': return next();
      case 'sort': return scoreSort();
      case 'link': return scoreLink();
      case 'sortReveal': case 'linkReveal': return next();
      case 'fq': return scoreFinale();
      case 'fr': return afterFinaleQ();
    }
  }

  function start() {
    if (G.ph !== 'lobby' || active().length < 1) return;
    for (const p of list()) { p.score = 0; p.gained = 0; p.fstep = 0; }
    for (const k in G.used) G.used[k].clear();
    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null;
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
    setPhase('voteResult', cfg.voteShow);
  }

  function startPower() {
    const keys = active().length > 1 ? POWER_KEYS : BUFF_KEYS;
    for (const p of list()) {
      p.pw = null; p.fx = []; p.dbl = false; p.pola = false; p.sh = false; p.hide = null;
      p.offers = shuffle(keys).slice(0, 3);
    }
    setPhase('power', cfg.power);
  }
  function resolvePower() {
    G.ev = [];
    for (const p of list()) if (p.pw && p.pw.k === 'stit') p.sh = true;
    for (const p of list()) {
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
    // prikaz bacanja: prvo štitovi, zatim ostale pomoći, zatim napadi
    const rank = (e) => (e.p === 'stit' ? 0 : e.t ? 2 : 1);
    G.ev.sort((a, b) => rank(a) - rank(b));
    if (!G.ev.length || cfg.cast <= 0) return startQuestion();
    setPhase('cast', Math.min(10, 1.3 + G.ev.length * cfg.cast));
  }

  function startQuestion() {
    const cat = G.cats[G.cw];
    const pool = D.cats[cat].map((q, i) => i).filter((i) => !G.used.q.has(cat + '|' + i));
    const qi = pick(pool);
    G.used.q.add(cat + '|' + qi);
    const q = D.cats[cat][qi];
    const order = shuffle([0, 1, 2, 3]);
    G.q = { c: cat, t: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a) };
    G.qn += 1;
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
    }
    setPhase('reveal', cfg.reveal);
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
    setPhase('linkReveal', cfg.chReveal);
  }

  function startFinale() {
    G.inFinale = true; G.fqn = 0;
    const ranked = list().slice().sort((a, b) => b.score - a.score);
    ranked.forEach((p, i) => { p.fstep = Math.max(0, 3 - i); p.mv = 0; });
    startFinaleQ();
  }
  function startFinaleQ() {
    const pool = D.tf.map((_, i) => i).filter((i) => !G.used.tf.has(i));
    if (!pool.length || G.fqn >= cfg.finaleMax) return finish();
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
      if (p.ans === G.q.a) p.mv = 1 + (p === fastest ? 1 : 0);
      p.fstep = Math.min(cfg.steps, p.fstep + p.mv);
    }
    setPhase('fr', cfg.fr);
  }
  function afterFinaleQ() {
    if (list().some((p) => p.fstep >= cfg.steps)) return finish();
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
    G.ph = 'lobby'; G.s += 1; G.pi = -1; G.inFinale = false; G.win = null; G.rl = '';
    onChange();
  }
  function skip() { if (SKIPPABLE[G.ph]) endPhase(); }

  // ----- botovi -----
  function botDelay() {
    switch (G.ph) {
      case 'vote': return 1200 + rnd(3500);
      case 'power': return 1500 + rnd(5000);
      case 'question': return 2500 + rnd(cfg.q * 550);
      case 'sort': case 'link': return 6000 + rnd(cfg.sort * 450);
      case 'fq': return 900 + rnd(cfg.fq * 450);
    }
    return 2000;
  }
  function botInput(b) {
    const s = G.s;
    switch (G.ph) {
      case 'vote': return { s, v: rnd(G.cats.length) };
      case 'power': {
        if (Math.random() < 0.15) return { s, p: '' };
        const k = pick(b.offers);
        if (!POWERS[k].atk) return { s, p: k };
        const others = active().filter((p) => p.pid !== b.pid);
        if (!others.length) return { s, p: '' };
        const leader = others.slice().sort((x, y) => y.score - x.score)[0];
        return { s, p: k, t: (Math.random() < 0.6 ? leader : pick(others)).pid };
      }
      case 'question': case 'fq': {
        const opts = G.q.o.map((_, i) => i).filter((i) => !(b.hide && b.hide.includes(i)));
        const wrong = opts.filter((i) => i !== G.q.a);
        const right = Math.random() < (G.ph === 'fq' ? 0.7 : 0.62) || !wrong.length;
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
      const extra = G.ph === 'question' ? b.fx.length * 2500 : 0;
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
      if (ph === 'question') {
        if (p.fx.length) e.fx = p.fx;
        if (p.dbl) e.d = 1;
        if (p.sh) e.sh = 1;
        if (p.hide) e.h = p.hide;
      }
      if (ph === 'reveal') { e.ch = p.ch; e.g = p.gained; if (p.dbl) e.d = 1; }
      if (ph === 'sortReveal' || ph === 'linkReveal') { e.g = p.gained; e.k = p.cnt; }
      if (G.inFinale) e.st = p.fstep;
      if (ph === 'fr') { e.ch = p.ch; e.mv = p.mv; }
      return e;
    });
    if (ph === 'intro') v.it = G.intro;
    if (ph === 'vote' || ph === 'voteResult') v.cats = G.cats;
    if (ph === 'voteResult') { v.cw = G.cw; v.tie = G.tie; }
    if (ph === 'question' || ph === 'reveal' || ph === 'fq' || ph === 'fr') {
      v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: G.qn };
    }
    if (ph === 'cast' || ph === 'question' || ph === 'reveal') v.ev = G.ev;
    if (ph === 'reveal' || ph === 'fr') { v.cor = G.q.a; if (G.q.cnt) v.cnt = G.q.cnt; }
    if (ph === 'sort' || ph === 'sortReveal') v.so = { a: G.so.a, b: G.so.b, it: G.so.items };
    if (ph === 'sortReveal') v.so.key = G.so.key;
    if (ph === 'link' || ph === 'linkReveal') v.li = { t: G.li.t, L: G.li.L, R: G.li.R };
    if (ph === 'linkReveal') v.li.key = G.li.key;
    if (ph === 'final') { v.win = G.win; v.fact = G.fact; }
    return v;
  }

  return { addPlayer, addBot, setAvatar, setInput, syncPeers, start, skip, restart, view, stop: clear };
}
//#engine-end
