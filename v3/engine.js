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
  intro: 3.5, vote: 10, voteShow: 3, roul: 2.6, power: 12, bet: 15, betEvents: [2, 3], cast: 1.25, fpower: 7, fstart: 9.5, startCap: 3, fqCrown: 15,
  // piramida: napredak po stepenicama (gore je teže), početak = 30 % poredak + 70 % omjer bodova, najviše 4 jedinice; vrh = pitanje za krunu
  pyrReq: [1, 1, 1, 2, 2, 2, 2], pyrMaxStart: 4, pyrRankW: 0.3, pyrStreak: 3, pyrFxCap: 2, q: 20, reveal: null,
  sort: 40, link: 40, chReveal: 8, fq: 10, fr: 4,
  steps: 8, finaleMax: 20, maxPlayers: 6, nameMax: 12,
  // Tavern Director: trajanje trenutaka, dvoboja i tajnih događaja
  howto: 7, howtoShort: 3.5, order: 25, hilo: 45, blitz: 30, maj: 10, majReveal: 4, majN: 3, hiloN: 8, blitzN: 24,
  chal: null, chalN: 2, varMax: 2,
  // tajni paktovi (balans na jednom mjestu)
  pactMin: 3, pactAfter: 3, pactBonus: 75, pactSteal: 0.25, pactDouble: 0.2, pactLoyal: 0.4, pactOffer: 25, pactOffersMax: 3, pactRich: 600, betrayShow: 6.5, loyalShow: 6,
  // tempo otkrivanja odgovora (jedno mjesto za podešavanje): w = šetnja likova, s = kolo, t = cijela faza (s)
  // n = obično, t = napeto, d = dramatično; trenutak krčme dodaje paceMo sekundi
  // reveal: ako je postavljen (npr. u testovima), otkrivanje ima to fiksno trajanje bez prilagodbe tempa
  pace: { n: { w: 1150, s: 1700, t: 6.4 }, t: { w: 1250, s: 2700, t: 7.8 }, d: { w: 1300, s: 3500, t: 9.2 } }, paceMo: 1, paceClose: 250, paceNear: 300,
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
  { t: 'challenge' },
  { t: 'intro', title: 'Runda 2', sub: 'Tri nova pitanja' }, { t: 'battle' }, { t: 'battle' }, { t: 'battle' },
  { t: 'challenge' },
  { t: 'intro', title: 'Runda 3', sub: 'Zadnja prilika za bodove prije finala' }, { t: 'battle' }, { t: 'battle' }, { t: 'battle' },
  { t: 'intro', title: 'Veliko finale', sub: 'Utrka do vrha piramide' }, { t: 'finale' },
];

const INPUT_PHASES = { vote: 1, bet: 1, power: 1, question: 1, sort: 1, link: 1, fq: 1, duel: 1, secret: 1, secret2: 1, order: 1, hilo: 1, blitz: 1, maj: 1 };
// Mini-igre: objašnjenje prije prve igre (kratak podsjetnik kad se ponovi)
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
const DATA_KEY = { who: 'who', emoji: 'emoji', order: 'order', hilo: 'hilo', blitz: 'tf', maj: 'maj', sort: 'sort', link: 'link' };
const SKIPPABLE = { betray: 1, loyal: 1, fstart: 1, intro: 1, voteResult: 1, reveal: 1, sortReveal: 1, linkReveal: 1, fr: 1, moment: 1, duelIntro: 1, duelResult: 1, howto: 1, orderReveal: 1, hiloReveal: 1, blitzReveal: 1, majReveal: 1 };

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
  cfg.steps = cfg.pyrReq.length + 1;   // zadnji red piramide je kruna (pobjeda)
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
    opt: { pacts: o.pacts !== undefined ? !!o.pacts : true }, pacts: [], offers: [], btq: [],
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
  // human: pravi igrači mogu uzeti lika kojeg drži bot (bot se premjesti)
  function avFree(av, pid, human) { return isInt(av) && av >= 0 && av < AV_COUNT && !list().some((p) => p.pid !== pid && p.av === av && !(human && p.bot)); }
  function firstFreeAv(pid, human) {
    for (let i = 0; i < AV_COUNT; i++) if (avFree(i, pid)) return i;
    for (let i = 0; i < AV_COUNT; i++) if (avFree(i, pid, human)) return i;
    return 0;
  }
  function randFreeAv(pid) { const f = []; for (let i = 0; i < AV_COUNT; i++) if (avFree(i, pid)) f.push(i); return f.length ? pick(f) : firstFreeAv(pid); }
  // bot koji drži lika pravog igrača dobiva drugog slobodnog
  function bumpBots(human) {
    for (const b of list()) if (b.bot && b.pid !== human.pid && b.av === human.av) b.av = randFreeAv(b.pid);
  }
  const BOT_NAMES = ['Ana', 'Marko', 'Iva', 'Luka', 'Petra', 'Toni', 'Mia', 'Filip'];
  let botSeq = 0;
  const botList = () => list().filter((p) => p.bot);
  function setBots(n) {
    if (G.ph !== 'lobby' || !isInt(n)) return;
    const humans = list().length - botList().length;
    n = Math.max(0, Math.min(n, cfg.maxPlayers - humans));
    let b = botList();
    if (b.length === n) return;
    while (b.length > n) R.delete(b.pop().pid);
    while (b.length < n) {
      const nm = BOT_NAMES.find((x) => !list().some((p) => p.name.toLowerCase() === x.toLowerCase())) || 'Bot';
      if (!makePlayer('bot-' + (++botSeq), nm, randFreeAv(null), true)) break;
      b = botList();
    }
    onChange();
  }

  function makePlayer(pid, name, av, bot, local) {
    if (R.has(pid)) return R.get(pid);
    if (G.ph !== 'lobby') return null;
    if (R.size >= cfg.maxPlayers) {
      // pravi igrač ima prednost: zamijeni jednog bota
      const b = !bot && botList().pop();
      if (!b) return null;
      R.delete(b.pid);
    }
    const nm = cleanName(name);
    if (!nm) return null;
    // pravi igrač ima prednost i na ime: bot s istim imenom dobiva drugo
    if (!bot) for (const b of botList()) if (b.name.toLowerCase() === nm.toLowerCase()) {
      b.name = BOT_NAMES.find((x) => x.toLowerCase() !== nm.toLowerCase() && !list().some((q) => q.name.toLowerCase() === x.toLowerCase())) || uniqueName('Bot', b.pid);
    }
    const p = {
      pid, name: uniqueName(nm, pid), av: avFree(av, pid, !bot) ? av : firstFreeAv(pid, !bot), local: !!local,
      score: 0, gained: 0, on: true, bot: !!bot, done: false, lastIn: '',
      vote: -1, offers: [], pw: null, fx: [], dbl: false, pola: false, sh: false, hide: null,
      ans: -1, ansMs: 0, ch: -1, sortA: null, linkA: null, cnt: 0, fstep: 0, mv: 0, fst: 0, lastPw: '', bet: 0, betMul: 1, betRes: 0,
    };
    R.set(pid, p);
    if (!bot) bumpBots(p);
    return p;
  }
  function addPlayer(pid, name, av, bot, local) { const p = makePlayer(pid, name, av, bot, local); if (p) onChange(); return p; }
  function addBot(name, av) { return addPlayer('bot-' + name, name, av, true); }
  function setAvatar(pid, av) {
    const p = R.get(pid);
    if (!p || G.ph !== 'lobby' || !avFree(av, pid, !p.bot) || p.av === av) return;
    p.av = av; if (!p.bot) bumpBots(p); onChange();
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
      case 'order': {
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
    const r = p ? accept(p, inp) : false;
    if (r === 'partial') return true;
    if (!r) return false;
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
        if (G.ph === 'lobby' && x.av !== p.av && avFree(x.av, p.pid, true)) { p.av = x.av; bumpBots(p); changed = true; }
      }
      if (x.in) {
        const k = JSON.stringify(x.in);
        if (k !== p.lastIn) { p.lastIn = k; const r = accept(p, x.in); if (r === 'partial') p.lastIn = k; else if (r) changed = true; }
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
      case 'voteResult': return afterCategory();
      case 'howto': return afterHowto();
      case 'order': return scoreOrder();
      case 'hilo': return scoreHilo();
      case 'blitz': return scoreBlitz();
      case 'maj': return scoreMaj();
      case 'majReveal': return nextMaj();
      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': return afterReveal();
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
      case 'betray': return afterBetray();
      case 'loyal': return setPhase('fstart', cfg.fstart);
    }
  }

  function start() {
    if (G.ph !== 'lobby' || active().length < 1) return;
    for (const p of list()) { p.score = 0; p.gained = 0; p.fstep = 0; }
    for (const k in G.used) G.used[k].clear();
    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null; G.leg = null; G.crownWin = null;
    // kladionica: nasumično 2-3 puta po igri, najviše jednom po rundi (nikad u finalu)
    G.bn = -1; G.betAt = new Set();
    const nb = plan.filter((it) => it.t === 'battle').length, rounds = Math.ceil(nb / 3);
    const want = Math.min(rounds, cfg.betEvents[0] + rnd(cfg.betEvents[1] - cfg.betEvents[0] + 1));
    for (const r of shuffle(Array.from({ length: rounds }, (_, i) => i)).slice(0, want)) G.betAt.add(Math.min(nb - 1, r ? r * 3 + rnd(3) : 1 + rnd(2)));
    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; }
    // mini-igre: nasumično koji izazovi i koje posebne bitke, da nije svaka partija ista
    const nCh = plan.filter((it) => it.t === 'challenge').length;
    const pool = CHALLENGES.filter((k) => (k !== 'maj' || active().length >= 3) && (D[DATA_KEY[k]] || []).length);
    G.chal = (cfg.chal || shuffle(pool)).slice(0, Math.max(nCh, cfg.chal ? cfg.chal.length : 0)); G.ci = 0;
    G.qvAt = new Map();
    const slots = shuffle(Array.from({ length: Math.max(0, nb - 1) }, (_, i) => i + 1)).filter((i) => !G.betAt.has(i));
    const wantV = [['who', cfg.qv ? cfg.qv.who : rnd(cfg.varMax + 1)], ['emoji', cfg.qv ? cfg.qv.emoji : rnd(cfg.varMax + 1)]];
    for (const [k, n] of wantV) for (let j = 0; j < n && slots.length; j++) if ((D[DATA_KEY[k]] || []).length) G.qvAt.set(slots.shift(), k);
    G.seenHow = new Set();
    TD.reset();
    pactReset();
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
    if (it.t === 'challenge') { const k = G.chal[G.ci++] || 'sort'; return startHowto(k); }
    if (it.t === 'finale') return startFinale();
    return next();
  }

  function startVote() {
    const avail = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!avail.length) return next();
    G.bn = (G.bn == null ? -1 : G.bn) + 1;
    G.qv = G.qvAt && G.qvAt.get(G.bn) || null;
    if (G.qv) { G.cats = null; G.cw = -1; return startHowto(G.qv); }
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
    // neriješeno: svjetlo kruži preko izjednačenih vrata (ruleta) prije otkrivanja
    G.tb = best.length > 1 ? best : null;
    TD.onVote();
    setPhase('voteResult', cfg.voteShow + (G.tb ? cfg.roul : 0));
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
    // u finalu (točno/netočno) pola-pola i grickalice nemaju smisla
    let pool = (multi ? POWER_KEYS : BUFF_KEYS).filter((k) => !(G.inFinale && (k === 'pola' || k === 'grick')));
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
    const val = (p) => (G.inFinale ? (p.fu || 0) * 1e6 : 0) + p.score;
    const vs = ps.map(val), hi = Math.max(...vs), lo = Math.min(...vs);
    const m = new Map();
    for (const p of ps) m.set(p.pid, hi === lo ? 0.5 : (hi - val(p)) / (hi - lo));
    if (G.inFinale) { const top = Math.max(...ps.map((p) => p.fu || 0)); for (const p of ps) if ((p.fu || 0) === top) m.set(p.pid, 0); }
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
        else if (G.inFinale && t.fx.length >= cfg.pyrFxCap) G.ev.push({ f: p.pid, p: k, t: t.pid, b: 1, cap: 1 });   // nitko ne može biti beskonačno blokiran
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
    if (G.qv) return startVariantQ();
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
    const before = paceSnap();
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
    pactAfterQuestion();
    TD.afterQuestion();
    // tempo: domaćin procijeni važnost iz javnih rezultata ovog pitanja (koji se upravo otkrivaju)
    G.pace = paceOf(before);
    const pc = cfg.pace && cfg.pace[G.pace];
    // trenutak iz krčme prikazuje se ispod poretka, pa otkrivanje traje malo dulje
    const mo = G.pend && G.pend.mo ? (cfg.paceMo != null ? cfg.paceMo : 1) : 0;
    setPhase('reveal', (pc ? pc.t : cfg.reveal != null ? cfg.reveal : 10.5) + mo);
  }
  // ----- tempo otkrivanja: jednostavna pravila, najviša razina pobjeđuje (ne zbrajaju se) -----
  function paceSnap() { return list().filter((p) => p.on !== false).map((p) => ({ pid: p.pid, sc: p.score })); }
  function paceOf(before) {
    if (!cfg.pace || cfg.reveal != null) return '';
    const cur = new Map(list().map((p) => [p.pid, p.score]));
    const b = before.filter((x) => cur.has(x.pid));
    if (b.length < 2) return 'n';
    const a = b.map((x) => ({ pid: x.pid, sc: cur.get(x.pid) }));
    const sortS = (arr) => arr.slice().sort((x, y) => y.sc - x.sc);
    const B = sortS(b), A = sortS(a);
    const rB = new Map(B.map((x, i) => [x.pid, i])), rA = new Map(A.map((x, i) => [x.pid, i]));
    const changed = a.some((x) => x.sc !== b.find((y) => y.pid === x.pid).sc);
    if (!changed) return 'n';                       // nitko nije osvojio ni izgubio bodove: brzo dalje
    const gapB = B[0].sc - B[1].sc, gapA = A[0].sc - A[1].sc;
    const lead = B[0].sc > 0 && A[0].pid !== B[0].pid && A[0].sc > cur.get(B[0].pid);
    let rise = 0; for (const x of a) rise = Math.max(rise, rA.has(x.pid) ? rB.get(x.pid) - rA.get(x.pid) : 0);
    const n = a.length;
    const mo = G.pend && G.pend.mo ? G.pend.mo.k : '';
    const lastQ = !plan.slice(G.pi + 1).some((it) => it.t === 'battle' || it.t === 'challenge') && !G.inFinale;
    const close = cfg.paceClose || 250, near = cfg.paceNear || 300;
    // DRAMATIČNO: odlučena tijesna borba za vodstvo, veliki preokret, povratak večeri, novo vodstvo uoči piramide
    if (lead && (gapB <= close || gapA <= close)) return 'd';
    if (mo === 'COMEBACK_BIG' || (n >= 4 && rise >= 3)) return 'd';
    if (lastQ && lead) return 'd';
    const lv = G.pend && G.pend.mo ? G.pend.mo.lv || 0 : 0;
    if (lv >= 3) return 'd';
    // NAPETO: promjena vodstva, tijesan vrh, skok u poretku, prekinut niz, rivali, zadnje pitanje prije piramide
    if (lead) return 't';
    if (A[0].sc > 0 && gapA <= near && gapB <= near) return 't';
    if (rise >= 2) return 't';
    if (['COMEBACK', 'CB_RISE', 'STREAK_BROKEN', 'STREAK5', 'RIVAL_LEAD', 'RIVALRY', 'RIVAL_AGAIN', 'RIVAL_SWAP', 'REVENGE', 'POWER_REVENGE', 'BETRAY_REVENGE', 'THRONE'].includes(mo)) return 't';
    if (lastQ) return 't';
    if (lv >= 2) return 't';
    return 'n';
  }

  // ----- mini-igre -----
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

  // ----- piramida -----
  const pyrTop = () => cfg.pyrReq.reduce((a, b) => a + b, 0);
  // jedinice napretka → stepenica, napredak unutar nje i koliko treba za sljedeću
  function stepOf(u) { let st = 0, acc = 0; while (st < cfg.pyrReq.length && acc + cfg.pyrReq[st] <= u) { acc += cfg.pyrReq[st]; st++; } return { s: st, p: u - acc, r: st < cfg.pyrReq.length ? cfg.pyrReq[st] : 0 }; }
  // početni napredak: poredak (izjednačeni dijele isti) + stvarna bodovna razlika; sve unaprijed izračunato, bez slučajnosti
  function pyrStart() {
    const ps = list(), n = ps.length, top = Math.max(0, ...ps.map((p) => p.score)), sc = ps.map((p) => p.score);
    for (const p of ps) {
      const better = sc.filter((x) => x > p.score).length, same = sc.filter((x) => x === p.score).length;
      const rn = n > 1 ? 1 - (better + (same - 1) / 2) / (n - 1) : 1, gn = top > 0 ? p.score / top : 0;
      p.fu = top > 0 ? Math.max(0, Math.min(cfg.pyrMaxStart, Math.round((cfg.pyrRankW * rn + (1 - cfg.pyrRankW) * gn) * cfg.pyrMaxStart))) : 0;
      p.fstep = stepOf(p.fu).s; p.fst = p.fstep; p.fsc = p.score; p.fstr = 0; p.ug = 0; p.sk = 0; p.cf = 0;
    }
  }
  function startFinale() {
    G.inFinale = true; G.fqn = 0;
    const ly = payLoyalty(); G.ly = ly.length ? { id: G.s + 1, evs: ly } : null;
    pyrStart();
    for (const p of list()) { p.mv = 0; p.lastPw = ''; }
    if (G.ly && G.ly.evs.length) return setPhase('loyal', cfg.loyalShow);
    setPhase('fstart', cfg.fstart);
  }
  function startFinaleQ() {
    const pool = D.tf.map((_, i) => i).filter((i) => !G.used.tf.has(i));
    if (!pool.length || G.fqn >= cfg.finaleMax) return finish();
    startPower();
  }
  function beginFinaleQ() {
    G.crown = list().filter((p) => p.fu >= pyrTop()).map((p) => p.pid);
    if (G.crown.length) {
      const cats = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
      if (cats.length) {
        const cat = pick(cats), qi = pick(D.cats[cat].map((_, i) => i).filter((i) => !G.used.q.has(cat + '|' + i)));
        G.used.q.add(cat + '|' + qi);
        const q = D.cats[cat][qi], order = shuffle([0, 1, 2, 3]);
        G.q = { c: '👑 Pitanje za krunu · ' + cat, t: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a), crown: 1 };
        G.fqn += 1;
        for (const p of list()) { p.ans = -1; p.ansMs = 0; p.mv = 0; p.ch = -1; p.hide = null; }
        return setPhase('fq', cfg.fqCrown);
      }
    }
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
    const TOP = pyrTop(), crown = new Set(G.crown || []);
    // penjači: točan +1, najbrži točan +1 (ne u pitanju za krunu), dupli +1, svaki 3. točan zaredom +1; netočno = ostaje
    const right = list().filter((p) => !crown.has(p.pid) && p.ans === G.q.a);
    const fastest = G.q.crown ? null : right.slice().sort((a, b) => a.ansMs - b.ansMs)[0];
    for (const p of list()) {
      p.ch = p.ans; p.mv = 0; p.ug = 0; p.sk = 0;
      if (crown.has(p.pid)) { if (p.ans !== G.q.a) { p.cf++; p.fstr = 0; } continue; }
      if (p.ans !== G.q.a) { p.fstr = 0; continue; }
      p.fstr++;
      let g = 1 + (p === fastest ? 1 : 0) + (p.dbl ? 1 : 0);
      if (p.fstr % cfg.pyrStreak === 0) { g++; p.sk = 1; }
      const before = p.fstep;
      p.fu = Math.min(TOP, p.fu + g); p.ug = g;
      p.fstep = stepOf(p.fu).s; p.mv = p.fstep - before;
    }
    // kruna: tko je bio na vrhu i točno odgovori, pobjeđuje; ako ih je više, brži (vlastito vrijeme odgovora), pa više bodova
    const win = list().filter((p) => crown.has(p.pid) && p.ans === G.q.a).sort((a, b) => a.ansMs - b.ansMs || b.score - a.score || (a.name < b.name ? -1 : 1))[0];
    if (win) { win.mv = cfg.steps - win.fstep; win.fstep = cfg.steps; G.crownWin = win.pid; }
    if (!list().some((p) => p.fstep >= cfg.steps)) {
      TD.afterFinale();
      // novi na vrhu: krčma to javlja svima
      const up = list().filter((p) => p.fu >= TOP && p.ug > 0);
      if (up.length && !(G.pend && G.pend.mo)) { G.pend = G.pend || {}; G.pend.mo = { t: '👑 Na vrhu piramide!', s: up.map((p) => p.name).join(' i ') + ' — još jedno pitanje dijeli od krune!', a: up.map((p) => p.pid), pose: up.map(() => 'victory'), snd: 'stingUp' }; }
    } else G.pend = null;
    setPhase('fr', cfg.fr + (G.pend && G.pend.mo ? 1 : 0));
  }
  function afterFinaleQ() {
    if (list().some((p) => p.fstep >= cfg.steps)) return finish();
    G.pend = null;
    startFinaleQ();
  }

  // ===================== LEGENDE OVE KRČME =====================
  // Počasne nagrade iz stvarnih događaja (bez bodova). Domaćin ih sastavi jednom, pri proglašenju pobjednika.
  const LEG_T = { cb: ['🔥', 'Povratak večeri'], bt: ['🗡️', 'Najveća izdaja'], vic: ['💔', 'Najveća žrtva izdaje'], dbl: ['💀', 'Noževi pod stolom'], ly: ['❤️', 'Nerazdvojni saveznici'],
    rv: ['⚔️', 'Rivalstvo večeri'], rev: ['🔁', 'Osveta večeri'], bet: ['💰', 'Majstor rizika'], fast: ['⚡', 'Munja večeri'], acc: ['🎯', 'Oko sokolovo'], st: ['🏹', 'Najduži niz'] };
  const LEG_ORDER = Object.keys(LEG_T);
  // hrvatska množina: 1 napad, 2 napada, 5 napada
  const plN = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return n + ' ' + (b === 1 && a !== 11 ? one : b >= 2 && b <= 4 && (a < 12 || a > 14) ? few : many); };
  const fmtN = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // broj bodova s ispravnim oblikom: 1 bod, 3 boda, 5 bodova, 4.483 boda
  const bodN = (n) => { const r = Math.round(Math.abs(n)), a = r % 100, b = a % 10; return fmtN(n) + ' ' + (b === 1 && a !== 11 ? 'bod' : b >= 2 && b <= 4 && (a < 12 || a > 14) ? 'boda' : 'bodova'); };
  function buildLegends() {
    const T = TD.state, ps = list();
    if (!T || !ps.length) return null;
    const S = T.stat, nmL = (id) => (R.get(id) || {}).name || '?', n = ps.length, aw = [];
    const add = (k, score, who, line, num, story) => aw.push({ k, score, who, line, num: num || '', story: story || k + ':' + who.slice().sort().join('|') });
    // povratak: bio zadnji s velikim zaostatkom, kasnije među prva dva (nikad onome tko je stalno vodio)
    for (const p of ps) {
      const w = T.worst[p.pid] || 0, best = S.rise[p.pid];
      if (n >= 3 && T.lowRank[p.pid] === n && best && best <= 2 && w >= 800)
        add('cb', 70 + w / 60 + (best === 1 ? 25 : 0), [p.pid], best === 1 ? 'S posljednjeg mjesta sve do vrha ljestvice!' : 'S posljednjeg mjesta do ' + best + '. mjesta!', 'Najveći zaostatak: ' + bodN(w));
    }
    // izdaje (javne): izdajnik, žrtva (druga priča), dvostruka izdaja
    for (const e of S.bt) {
      if (e.k === 'betray') {
        add('bt', 90 + e.gain / 80, [e.t, e.v], nmL(e.t) + ' → ' + nmL(e.v) + ' · +' + bodN(e.gain), 'Pakt je trajao ' + plN(e.dur, 'pitanje', 'pitanja', 'pitanja'), 'bt' + e.id);
        if (e.st > 0) add('vic', 48 + e.st / 100, [e.v], 'U izdaji gubi ' + bodN(e.st) + '. Krčmar časti jednu rundu!', '', 'bt' + e.id);
      } else add('dbl', 88 + (e.la + e.lb) / 100, [e.a, e.b], 'Oboje vade noževe u istom trenutku!', 'Gubici: −' + fmtN(e.la) + ' i −' + bodN(e.lb), 'bt' + e.id);
    }
    // odani pakt do kraja (botovi ne sklapaju paktove)
    for (const e of S.loyal) add('ly', 70 + (e.tre + e.bonus) / 60, [e.a, e.b], 'Njihov pakt preživljava do kraja!', 'Riznica ' + fmtN(e.tre) + ' + bonus odanosti ' + fmtN(e.bonus));
    // rivalstvo: zamjene mjesta, međusobni napadi, dvoboj, ocjena rivalstva krčme
    for (const key in T.pairs) {
      const P = T.pairs[key], [a, b] = key.split('|');
      if (!R.get(a) || !R.get(b)) continue;
      const du = S.duels.filter((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)).length;
      const sw = P.all || 0;
      if (!(sw >= 3 || P.ev >= 3 || (sw >= 2 && P.ev >= 2) || (du && sw + P.ev >= 2))) continue;
      const sc = sw * 1.5 + P.sw + P.ev * 1.5 + (T.rival[key] || 0) * 0.3 + du * 3;
      const bits = [];
      if (sw) bits.push(plN(sw, 'zamjena mjesta', 'zamjene mjesta', 'zamjena mjesta'));
      if (P.ev) bits.push(plN(P.ev, 'međusobni napad', 'međusobna napada', 'međusobnih napada'));
      if (du) bits.push('dvoboj');
      add('rv', 50 + sc * 3, [a, b], ['Cijelu večer ne daju jedno drugom mira.', 'Krčma je cijelu večer gledala samo njih dvoje.'][(P.ev + P.sw) % 2], bits.join(' · '), 'pair:' + key);
    }
    // osveta (krčma ju je zapamtila tijekom igre)
    const rv = T.leg.rev;
    if (rv && rv.av && rv.at && R.get(rv.av) && R.get(rv.at)) add('rev', 62 + Math.min(20, rv.v * 2), [rv.av, rv.at], nmL(rv.av) + ' vraća udarac: ' + nmL(rv.at), rv.bt ? 'Osveta za izdaju' : rv.du ? 'Osveta u dvoboju' : 'Nakon ' + plN(rv.v, 'napada', 'napada', 'napada'), 'pair:' + [rv.av, rv.at].sort().join('|'));
    // kladionica: stvarni neto rezultat (dobici − gubici)
    for (const pid in S.betNet) if (S.betNet[pid] >= 300 && R.get(pid)) add('bet', 45 + S.betNet[pid] / 40, [pid], 'Neto dobitak iz kladionice: +' + bodN(S.betNet[pid]));
    // munja: najbrži točan odgovor u običnim pitanjima
    { let best = null; for (const pid in S.fast) if (R.get(pid) && (!best || S.fast[pid] < S.fast[best] || (S.fast[pid] === S.fast[best] && pid < best))) best = pid;
      if (best && S.fast[best] < 4000) add('fast', 32 + Math.max(0, 4000 - S.fast[best]) / 150, [best], 'Točan odgovor za ' + (S.fast[best] / 1000).toFixed(1).replace('.', ',') + ' s'); }
    // točnost: najmanje 4 pitanja i 60 % pitanja partije; izjednačenje: više točnih, pa brži, pa abeceda
    { const min = Math.max(4, Math.ceil(S.qn * 0.6));
      const c = ps.filter((p) => (S.ans[p.pid] || 0) >= min).map((p) => ({ pid: p.pid, ok: S.ok[p.pid] || 0, n: S.ans[p.pid] }));
      c.sort((x, y) => y.ok / y.n - x.ok / x.n || y.ok - x.ok || (S.fast[x.pid] || 9e9) - (S.fast[y.pid] || 9e9) || (x.pid < y.pid ? -1 : 1));
      if (c[0] && c[0].ok / c[0].n >= 0.7) add('acc', 30 + (c[0].ok / c[0].n) * 25, [c[0].pid], c[0].ok + ' od ' + c[0].n + ' točno (' + Math.round((c[0].ok / c[0].n) * 100) + ' %)'); }
    // najdulji niz
    { let best = null; for (const pid in S.maxSt) if (R.get(pid) && (!best || S.maxSt[pid] > S.maxSt[best] || (S.maxSt[pid] === S.maxSt[best] && pid < best))) best = pid;
      if (best && S.maxSt[best] >= 4) add('st', 34 + S.maxSt[best] * 4, [best], plN(S.maxSt[best], 'točan', 'točna', 'točnih') + ' odgovora zaredom'); }
    // izbor: najvažnije prvo; ista priča samo jednom; isti igrač najviše dvaput (uz krunu)
    aw.sort((x, y) => y.score - x.score || LEG_ORDER.indexOf(x.k) - LEG_ORDER.indexOf(y.k) || (x.who.join() < y.who.join() ? -1 : 1));
    const W = G.win, picked = [], stories = new Set(), feat = {};
    if (W) feat[W] = 1;
    for (const x of aw) {
      if (picked.length >= 5) break;
      if (stories.has(x.story) || picked.some((p) => p.k === x.k)) continue;
      if (x.who.some((id) => (feat[id] || 0) >= 2)) continue;
      picked.push(x); stories.add(x.story); for (const id of x.who) feat[id] = (feat[id] || 0) + 1;
    }
    // pobjednik: poruka prema stvarnom tijeku završnice (ne uzrocima)
    const wp = R.get(W), sorted = ps.slice().sort((a, b) => b.fstep - a.fstep || (b.fu || 0) - (a.fu || 0) || b.score - a.score);
    let wl = 'Osvaja krunu krčme!';
    if (wp) {
      const second = sorted.find((p) => p.pid !== W), maxStart = Math.max(...ps.map((p) => p.fst || 0));
      if (G.crownWin === W && (wp.fst || 0) < maxStart) wl = 'Kreće s niže stepenice, a ipak osvaja krunu!';
      else if (G.crownWin === W && second && second.fstep >= cfg.steps - 1) wl = 'Osvaja krunu nakon napete završnice!';
      else if (G.crownWin === W) wl = 'Osvaja krunu na pitanju za krunu!';
      else if ((T.leadTurns[W] || 0) >= Math.max(3, T.turn * 0.7)) wl = 'Vodi gotovo cijelu večer i ne ispušta krunu!';
    }
    // kratka priča iz odabranih događaja (predlošci; nikad ne tvrdi uzrok pobjede)
    const by = (k) => picked.find((x) => x.k === k), v = (T.turn + n) % 2;
    const ev = [];
    const b1 = by('bt'), d1 = by('dbl'), c1 = by('cb'), r1 = by('rv'), l1 = by('ly'), k1 = by('bet'), q1 = by('st') || by('acc');
    if (b1) ev.push(nmL(b1.who[0]) + ' bira zlato umjesto prijateljstva, a ' + nmL(b1.who[1]) + ' ostaje praznih džepova.');
    if (d1) ev.push(nmL(d1.who[0]) + ' i ' + nmL(d1.who[1]) + ' istovremeno vade noževe, a riznica nestaje u trenu.');
    if (r1 && ev.length < 3) ev.push(nmL(r1.who[0]) + ' i ' + nmL(r1.who[1]) + ' cijelu večer ne daju jedno drugom mira.');
    if (c1 && ev.length < 3) ev.push(c1.line.indexOf('vrha') >= 0 ? nmL(c1.who[0]) + ' se s dna penje sve do vrha ljestvice.' : nmL(c1.who[0]) + ' kreće s dna, ali ne odustaje.');
    if (l1 && ev.length < 3) ev.push(nmL(l1.who[0]) + ' i ' + nmL(l1.who[1]) + ' dokazuju da u ovoj krčmi još postoji čast.');
    if (k1 && ev.length < 3) ev.push(nmL(k1.who[0]) + ' riskira i odnosi zlato iz kladionice.');
    if (q1 && ev.length < 2) ev.push(nmL(q1.who[0]) + ' odgovara kao da zna pitanja unaprijed.');
    let story;
    if (!wp) story = 'Još jedna večer u krčmi je za nama.';
    else if (ev.length >= 2) story = [['Večer je počela mirno, ali nije dugo ostala takva.', 'Od prvog pitanja krčma je brujala.'][v]].concat(ev, [(wl.indexOf('napete') >= 0 ? 'Nakon napete završnice krunu nosi ' : 'Krunu na kraju nosi ') + wp.name + '.',
      ['Ova krčma dugo će pamtiti večerašnje goste!', 'Jedni su tražili slavu, drugi zlato, a neki su samo pokušavali preživjeti.'][v]]).join(' ');
    else if (ev.length === 1) story = ev[0] + ' Krunu na kraju nosi ' + wp.name + '. ' + ['Ova krčma dugo će pamtiti ovu večer!', 'Krčmar briše šank i smiješi se.'][v];
    else story = 'Još jedna napeta večer u krčmi! Krunu nosi ' + wp.name + ', ali ostali pružaju ozbiljan otpor.';
    return {
      id: G.s, w: wp ? { pid: W, line: wl, num: bodN(wp.score) } : null,
      aw: picked.map((x) => ({ k: x.k, ic: LEG_T[x.k][0], t: LEG_T[x.k][1], who: x.who, line: x.line, num: x.num })),
      story,
    };
  }
  function finish() {
    clear();
    payLoyalty();
    const ranked = list().slice().sort((a, b) => b.fstep - a.fstep || (b.fu || 0) - (a.fu || 0) || b.score - a.score);
    G.win = ranked.length ? ranked[0].pid : null;
    G.fact = pick(D.facts);
    // legende: sastave se jednom i ne mijenjaju se do nove partije (isti pregled pri ponovnom otvaranju i spajanju)
    try { G.leg = buildLegends(); } catch (e) { G.leg = null; }
    G.ph = 'final'; G.s += 1; G.dur = 0; G.endsAt = now();
    onChange();
  }

  function restart() {
    if (G.ph !== 'final') return;
    clear();
    for (const [id, p] of R) if (!p.on) R.delete(id);
    for (const p of list()) { p.score = 0; p.gained = 0; p.fstep = 0; p.done = false; }
    G.ph = 'lobby'; G.s += 1; G.pi = -1; G.inFinale = false; G.win = null; G.rl = ''; G.leg = null; G.crownWin = null; TD.reset(); pactReset();
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
    // {X} {A} {B} {N} {O} {T} {V} = imena; {K} {G} {H} {L} {R} = brojevi. Sve rečenice izbjegavaju padeže imena i rod.
    const TL = {
      NEW_LEADER: [['👑 Krčma ima novog vođu!', 'Na vrhu je sada {N}'], ['👑 Promjena na vrhu', '{N} preuzima čelo stola'], ['👑 Novi vođa', '{N} preuzima vodstvo']],
      LEAD_HABIT: [['🔄 Vrh se opet ljulja', '{N} preuzima vodstvo — zasad'], ['🔄 Tko će koga?', 'Vodstvo opet mijenja vlasnika: {N}'], ['🔄 Stolica se ne stigne ohladiti', 'Na vrhu je opet {N}']],
      THRONE: [['🔥 Kraj jedne vladavine!', '{O} dugo drži vrh, a sada ga preuzima {N}'], ['🍻 Netko je pomaknuo stolac!', 'Duga vladavina je gotova: {N} ispred, {O} iza'], ['👑 Smjena vlasti', 'Nakon duge potjere {N} preuzima vrh']],
      RIVAL_LEAD: [['⚔️ Još jedna izmjena vodstva', '{A} i {B} ne daju jedno drugom disati'], ['⚔️ Opet njih dvoje na vrhu', '{A} i {B} razmjenjuju krunu']],
      RIVAL_SWAP: [['🍻 Ovo rivalstvo nikako da završi!', '{A} i {B} opet mijenjaju mjesta'], ['⚔️ I opet!', '{A} i {B}: već {K}. zamjena mjesta']],
      RIVAL_FIRST: [['⚔️ Prva krv', '{A} → {B}: krčma je to zapamtila'], ['⚔️ Netko traži nevolju', '{A} prvi put cilja: {B}']],
      REPEAT_TARGET: [['🔥 Omiljena meta?', '{A} opet cilja istu osobu: {B}'], ['🔥 Opet ista meta', '{A} → {B}, već {K}. put']],
      REVENGE: [['⚔️ {B} uzvraća udarac!', '{A} sada plaća za svoje napade'], ['⚔️ Osveta!', 'Nakon {K} napada {B} prestiže napadača: {A}'], ['⚔️ Tko se zadnji smije…', '{B} je sada ispred, a {A} gleda u leđa']],
      POWER_REVENGE: [['⚔️ {B} vraća milo za drago!', '{A} dobiva vlastiti lijek'], ['⚔️ Uzvrat!', '{B} napokon cilja natrag: {A}']],
      BETRAY_REVENGE: [['🔥 {V} se vraća po svoje!', '{T} ipak neće mirno uživati u ukradenom zlatu'], ['🗡️ Izdaja se ne zaboravlja', '{V} je opet ispred izdajnika: {T}']],
      CB_RISE: [['🔥 {X} se vraća iz mrtvih!', 'Zaostatak se topi: {G} → {H}. Ostali, oprez!'], ['🔥 Povratak se zahuktava', '{X} topi zaostatak: {G} → {H}']],
      COMEBACK: [['🔥 Povratak u igru!', '{X}: {L}. → {R}.'], ['🔥 Netko je otpisan prerano', '{X} skače s {L}. na {R}. mjesto']],
      COMEBACK_BIG: [['🏆 OD POSLJEDNJEG DO PRVOG!', '{X} upravo piše legendu ove krčme'], ['🏆 Povratak večeri!', '{X}: s dna ravno na vrh']],
      STREAK3: [['🔥 U formi!', '{X} — 3 točna zaredom'], ['🎯 Zagrijavanje je gotovo', '{X} niže treći točan zaredom']],
      STREAK5: [['⚡ Nezaustavljiv niz!', '{X} — 5 točnih zaredom'], ['⚡ Netko zove krčmara?', '{X} ima 5 zaredom i ne staje']],
      STREAK_BROKEN: [['🧊 Niz je stao', '{X} ({K} zaredom) · nakon napada: {A}'], ['🧊 Kraj niza', '{A} prekida niz od {K}: {X}']],
      BET_WIN: [['🎲 Rizik se isplatio!', '{X} uzima +{K} iz uloga'], ['🎲 Hrabri piju besplatno', '{X}: ulog donosi +{K}']],
      RIVALRY: [['⚔️ Rivalstvo se zakuhava', '{A} vs {B}'], ['⚔️ Krčma ima novi par za gledati', '{A} vs {B}']],
      RIVAL_AGAIN: [['⚔️ Opet njih dvoje', '{A} → {B}'], ['⚔️ Stari računi', '{A} opet cilja: {B}']],
    };
    // rečenica koja se nije čula nedavno; izbor je determinističan (ne troši generator slučajnih brojeva igre,
    // pa krčma ni posredno ne mijenja pitanja, ponude moći ni odgovore botova)
    function say(type, map) {
      const arr = TL[type]; if (!arr) return null;
      const fresh = arr.map((_, i) => i).filter((i) => !(T.lineAt[type + i] != null && T.turn - T.lineAt[type + i] < 8));
      const pool = fresh.length ? fresh : arr.map((_, j) => j), i = pool[(T.turn * 7 + T.moSeq * 3 + type.length) % pool.length];
      const f = (x) => x.replace(/\{(\w)\}/g, (_, k) => (map && map[k] != null ? map[k] : ''));
      return { t: f(arr[i][0]), s: f(arr[i][1]), li: type + i };
    }
    // kandidat s rečenicom iz TL (zadržava postojeće ključeve, ocjene i poze)
    function cand(type, score, key, map, a, pose, extra) {
      const l = say(type, map); if (!l) return null;
      return Object.assign({ type, score, key, t: l.t, s: l.s, li: l.li, a, pose }, extra || {});
    }
    // legende ove krčme: samo najveći primjer po vrsti (ograničeno, za budući završni pregled)
    function legend(k, v, rec) { if (!T.leg[k] || v > T.leg[k].v) T.leg[k] = Object.assign({ v, turn: T.turn }, rec); }
    function pairOf(a, b) { const k = pairKey(a, b); return T.pairs[k] || (T.pairs[k] = { sw: 0, last: null, ev: 0, revAt: -99 }); }
    function reset() {
      T = {
        turn: 0, leader: null, prevLeader: null, leaderChanges: 0, leadHist: [],
        streak: {}, wrongStreak: {}, lowRank: {}, highRank: {}, prevRank: {}, rank: {},
        attacks: {}, attackedBy: {}, powerUse: {}, targeted: {}, bugs: {}, catVotes: {}, fastest: {},
        threat: {}, rival: {}, activeRival: null, lastMajor: -99, lastAny: -99, shown: {}, history: [],
        duels: 0, secrets: {}, secretTotal: 0, lastSecretBn: -9,
        // TD 2.0: parovi (zamjene mjesta, osvete), povratci, vladavina, izdaje, ponavljanje rečenica, legende
        pairs: {}, worst: {}, leadTurns: {}, chase: {}, betr: [], lineAt: {}, typeAt: {}, feat: {}, moSeq: 0,
        leg: { cb: null, bt: null, rv: null, rev: null, bet: null, lead: null },
        // za legende: pitanja, točni, najbrži točan (obična pitanja), najdulji niz, neto kladionica, najbolje mjesto nakon dna, dvoboji, izdaje, odani paktovi
        stat: { qn: 0, ans: {}, ok: {}, fast: {}, maxSt: {}, betNet: {}, rise: {}, duels: [], bt: [], loyal: [] },
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
        pairOf(e.f, e.t).ev++;
      }
    }
    // napadi ovog pitanja kao priča (prikazuje se tek nakon pitanja, ispod poretka)
    function powerCands(cands) {
      for (const e of G.ev || []) {
        if (!e.t || e.b) continue;
        const n = (T.attacks[e.f] && T.attacks[e.f][e.t]) || 0, back = (T.attacks[e.t] && T.attacks[e.t][e.f]) || 0;
        const P = pairOf(e.f, e.t);
        // uzvrat moću: napadnuti napokon cilja onoga tko ga je više puta napao
        const before = (T.attacks[e.t] && T.attacks[e.t][e.f]) || 0;
        if (n === 1 && before >= 2 && T.turn - P.revAt > 3) {
          const c = cand('POWER_REVENGE', 7, 'pr:' + pairKey(e.f, e.t) + ':' + T.turn, { A: nm(e.t), B: nm(e.f) }, [e.f, e.t], ['attack', 'shocked'], { vs: 1, snd: 'stingRival', onShow: () => { P.revAt = T.turn; legend('rev', before, { av: e.f, at: e.t }); } });
          if (c) cands.push(c);
        } else if (n === 1 && !back && human(e.f) && human(e.t)) {
          const c = cand('RIVAL_FIRST', 3, 'fb:' + pairKey(e.f, e.t), { A: nm(e.f), B: nm(e.t) }, [e.f, e.t], ['attack', 'shocked'], { vs: 1 });
          if (c) cands.push(c);
        }
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
          const ruled = T.leadTurns[old] || 0, chased = T.chase[lead] || 0, gap = ps[0].score - ps[1].score;
          let c;
          // velika smjena: stari vođa je dugo vladao ili je novi dugo bio u potjeri (ali nije stalna izmjena)
          if (recent < 3 && (ruled >= Math.max(4, T.turn / 2) || chased >= 4)) c = cand('THRONE', 8, 'th:' + lead + ':' + T.leaderChanges, { N: nm(lead), O: nm(old) }, [lead, old], ['happy', 'shocked'], { snd: 'stingLeader', vs: 1 });
          else if (T.activeRival === pairKey(lead, old)) c = cand('RIVAL_LEAD', 4, 'rl', { A: nm(lead), B: nm(old) }, [lead, old], ['happy', 'shocked'], { snd: 'stingRival' });
          else if (recent >= 3) c = cand('LEAD_HABIT', 3, 'lh', { N: nm(lead) }, [lead], ['happy'], { snd: 'stingSmall' });
          else c = cand('NEW_LEADER', 7, 'nl:' + lead + ':' + T.leaderChanges, { N: nm(lead) }, [lead], ['happy'], { snd: 'stingLeader' });
          if (c) cands.push(c);
          legend('lead', ruled + chased, { pid: lead, from: old });
        }
      }
      if (n >= 2 && ps[0].score > 0) inc(T.leadTurns, lead);
      for (const p of ps) { const k = p.pid; if (r[k] === 2 || r[k] === 3) inc(T.chase, k); else T.chase[k] = 0; }
      // zamjene mjesta među bliskim igračima: razvoj rivalstva i osveta (napadnuti prestiže napadača)
      if (Object.keys(T.prevRank).length) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const A = ps[i], B = ps[j];   // A je sada ispred B
        const pa = T.prevRank[A.pid], pb = T.prevRank[B.pid];
        if (!pa || !pb || pa < pb) continue;
        const P = pairOf(A.pid, B.pid), close = A.score - B.score <= 500;
        P.all = (P.all || 0) + 1; if (close) { P.sw++; P.last = A.pid; }
        const key = pairKey(A.pid, B.pid);
        legend('rv', P.sw + P.ev, { a: A.pid, b: B.pid });
        const hits = (T.attacks[B.pid] && T.attacks[B.pid][A.pid]) || 0;
        if (hits >= 2 && T.turn - P.revAt > 3) {
          const c = cand('REVENGE', 8.5, 'rg:' + key + ':' + T.turn, { A: nm(B.pid), B: nm(A.pid), K: hits }, [A.pid, B.pid], ['happy', 'shocked'], { vs: 1, snd: 'stingRival', onShow: () => { P.revAt = T.turn; legend('rev', hits, { av: A.pid, at: B.pid }); } });
          if (c) cands.push(c);
        } else if (close && P.sw >= 3 && A.pid !== lead) {
          const c = cand('RIVAL_SWAP', 5, 'sw:' + key + ':' + P.sw, { A: nm(A.pid), B: nm(B.pid), K: P.sw }, [A.pid, B.pid], ['happy', 'shocked'], { vs: 1, snd: 'stingRival' });
          if (c) cands.push(c);
        }
      }
      // izdani igrač ponovno prestiže izdajnika (samo javne izdaje)
      for (const b of T.betr) {
        if (b.done) continue;
        const V = R.get(b.v), Tr = R.get(b.t);
        if (!V || !Tr) { b.done = true; continue; }
        if (V.score > Tr.score && b.below) {
          b.done = true;
          const c = cand('BETRAY_REVENGE', 9, 'br:' + b.id, { V: nm(b.v), T: nm(b.t) }, [b.v, b.t], ['happy', 'shocked'], { vs: 1, snd: 'stingComeback', onShow: () => legend('rev', 10 + b.gain / 100, { av: b.v, at: b.t, bt: 1 }) });
          if (c) cands.push(c);
        }
      }
      for (const p of ps) {
        const k = p.pid, now = r[k];
        if (T.lowRank[k] == null || now > T.lowRank[k]) T.lowRank[k] = now;
        if (T.highRank[k] == null || now < T.highRank[k]) T.highRank[k] = now;
        const low = T.lowRank[k], was = T.prevRank[k], gapNow = ps[0].score - p.score;
        if (n >= 3 && now === n) T.worst[k] = Math.max(T.worst[k] || 0, gapNow);
        if (n >= 3 && T.lowRank[k] === n && (T.stat.rise[k] == null || now < T.stat.rise[k])) T.stat.rise[k] = now;
        const worst = T.worst[k] || 0, big = worst >= Math.max(800, ps[0].score * 0.3);
        if ((T.cbN || 0) >= 3) continue;
        const done = () => { T.cbN = (T.cbN || 0) + 1; legend('cb', worst, { pid: k, low, now }); };
        if (n >= 3 && low === n && now === 1 && was !== 1 && big && !T.shown['cb2:' + k]) {
          const c = cand('COMEBACK_BIG', 10, 'cb2:' + k, { X: nm(k) }, [k], ['victory'], { snd: 'stingComeback', onShow: done }); if (c) cands.push(c);
        } else if (n >= 3 && big && low === n && now < n && gapNow <= worst * 0.35 && (T.streak[k] >= 2 || (was && was - now >= 2)) && !T.shown['cbr:' + k]) {
          const c = cand('CB_RISE', 8, 'cbr:' + k, { X: nm(k), G: worst, H: Math.max(0, gapNow) }, [k], ['happy'], { snd: 'stingComeback', onShow: done }); if (c) cands.push(c);
        } else if (n >= 3 && low >= n - 1 && now <= 2 && was > 2 && big && !T.shown['cb:' + k] && !T.shown['cbr:' + k]) {
          const c = cand('COMEBACK', 8, 'cb:' + k, { X: nm(k), L: low, R: now }, [k], ['happy'], { snd: 'stingComeback', onShow: done }); if (c) cands.push(c);
        }
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
            const c = cand('RIVALRY', 9, 'rv:' + best, { A: nm(a), B: nm(b) }, [a, b], pose, { vs: 1, snd: 'stingRival', onShow: () => { T.activeRival = best; } }); if (c) cands.push(c);
          }
        }
      } else {
        const [a, b] = T.activeRival.split('|');
        const hit = G.ev.find((e) => e.t && ((e.f === a && e.t === b) || (e.f === b && e.t === a)));
        if (hit) { const c = cand('RIVAL_AGAIN', 4, 'ra', { A: nm(hit.f), B: nm(hit.t) }, [hit.f, hit.t], ['attack', 'shocked'], { vs: 1, snd: 'stingRival' }); if (c) cands.push(c); }
      }
    }
    // "krčma pamti": kratke opaske iz stvarnih događaja (male važnosti, dugi razmak)
    function memoryCands(cands) {
      for (const f in T.attacks) for (const t in T.attacks[f]) if (T.attacks[f][t] >= 3 && G.ev.some((e) => e.f === f && e.t === t))
        { const c = cand('REPEAT_TARGET', 4, 'rt:' + f + t, { A: nm(f), B: nm(t), K: T.attacks[f][t] }, [f, t], ['attack', 'shocked']); if (c) cands.push(c); }
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
      const val = (c) => {
        let v = c.score + (c.a && c.a.some(human) ? 0.6 : 0);
        if (c.score < 9) {
          if (T.typeAt[c.type] != null && turn - T.typeAt[c.type] < 4) v -= 2;                         // ista vrsta nedavno
          if ((c.a || []).some((x) => T.feat[x] != null && turn - T.feat[x] < 2)) v -= 1.5;           // isti igrač stalno u fokusu
        }
        return v;
      };
      ok.sort((x, y) => val(y) - val(x));
      // tišina je bolja od nepotrebnog komentara
      while (ok.length && val(ok[0]) < 2.5) ok.shift();
      // ista priča, konkretniji nastavak: osveta istog para ima prednost pred općom najavom rivalstva (rivalstvo se svejedno bilježi)
      if (ok[0] && ok[0].type === 'RIVALRY') {
        const pair = (ok[0].a || []).slice().sort().join('|');
        const rv = ok.find((c) => /REVENGE/.test(c.type) && (c.a || []).slice().sort().join('|') === pair);
        if (rv) { const r0 = ok[0]; if (r0.onShow) r0.onShow(); T.shown[r0.key] = turn; ok.splice(ok.indexOf(rv), 1); ok.unshift(rv); }
      }
      if (F.DEBUG_TAVERN_DIRECTOR) { try { console.log('[TavernDirector] potez ' + turn, cands.map((c) => ({ type: c.type, score: c.score })), '→', ok[0] ? ok[0].type : 'ništa'); } catch (e) {} }
      const c = ok[0];
      if (!c) return null;
      T.shown[c.key] = turn; T.lastAny = turn; if (c.score >= 7) T.lastMajor = turn;
      T.typeAt[c.type] = turn; for (const x of c.a || []) T.feat[x] = turn; if (c.li) T.lineAt[c.li] = turn;
      if (c.onShow) c.onShow();
      if (c.type === 'RIVALRY') T.shownAt = turn;
      T.history.push({ turn, type: c.type });
      return c;
    }
    function finalizePend(c) {
      if (!c) { G.pend = null; return; }
      if (c.type === 'DUEL') { T.duels++; G.pend = { duel: c.duel }; return; }
      G.pend = { mo: { id: ++T.moSeq, k: c.type, lv: c.score >= 9 ? 3 : c.score >= 7 ? 2 : 1, t: c.t, s: c.s, a: c.a, pose: c.pose, vs: c.vs ? 1 : 0, snd: c.snd || 'stingSmall' } };
    }
    function afterQuestion() {
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) { G.pend = null; return; }
      T.turn++;
      const cands = [];
      const right = active().filter((p) => p.ans === G.q.a);
      { const S = T.stat; S.qn++;
        for (const p of active()) {
          inc(S.ans, p.pid); if (p.ans === G.q.a) inc(S.ok, p.pid);
          // najbrži točan: samo obična pitanja (isto vrijeme za odgovor, bez posebnih bitaka)
          if (p.ans === G.q.a && !G.qv && p.ansMs > 0 && (S.fast[p.pid] == null || p.ansMs < S.fast[p.pid])) S.fast[p.pid] = p.ansMs;
          if (p.betRes) S.betNet[p.pid] = (S.betNet[p.pid] || 0) + p.betRes;
        } }
      const fast = right.slice().sort((a, b) => a.ansMs - b.ansMs)[0];
      T.lastFast = fast && right.length > 1 ? fast.pid : null;
      if (T.lastFast) inc(T.fastest, T.lastFast);
      for (const p of active()) {
        const k = p.pid;
        if (p.ans === G.q.a) {
          const st = inc(T.streak, k); T.wrongStreak[k] = 0;
          if (st > (T.stat.maxSt[k] || 0)) T.stat.maxSt[k] = st;
          const c = st === 5 ? cand('STREAK5', 7, 's5:' + k + ':' + T.turn, { X: p.name }, [k], ['happy'], { snd: 'stingStreak' })
            : st === 3 ? cand('STREAK3', 5, 's3:' + k + ':' + T.turn, { X: p.name }, [k], ['happy'], { snd: 'stingStreak' }) : null;
          if (c) cands.push(c);
        } else {
          const had = T.streak[k] || 0; T.streak[k] = 0; inc(T.wrongStreak, k);
          const by = T.threat[k];
          if (had >= 3 && by) {
            if (F.ENABLE_RIVALRIES) inc(T.rival, pairKey(k, by), 2);
            const c = cand('STREAK_BROKEN', 6, 'sb:' + k + ':' + T.turn, { X: p.name, K: had, A: nm(by) }, [by, k], ['attack', 'sad'], { snd: 'stingRival' }); if (c) cands.push(c);
          }
        }
      }
      // kladionica: veliki uspjeh (srednja važnost)
      for (const p of active()) if (p.betRes >= 500) {
        const c = cand('BET_WIN', 5, 'bw:' + p.pid + ':' + T.turn, { X: p.name, K: p.betRes }, [p.pid], ['happy'], { snd: 'stingSmall', onShow: () => legend('bet', p.betRes, { pid: p.pid }) }); if (c) cands.push(c);
      }
      powerCands(cands);
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
    // javna izdaja (podaci postaju javni tek s izdajom): pamti za kasniji "vraća se po svoje"
    function onBetray(e) {
      if (!T) return;
      if (T.stat.bt.length < 8) T.stat.bt.push({ id: T.stat.bt.length + 1, k: e.k, t: e.t, v: e.v, a: e.a, b: e.b, gain: e.gain || 0, st: e.st || 0, la: e.la || 0, lb: e.lb || 0, dur: e.dur || 1 });
      if (e.k === 'betray') {
        const Tr = R.get(e.t), V = R.get(e.v);
        if (T.betr.length < 6) T.betr.push({ id: T.betr.length + 1, t: e.t, v: e.v, gain: e.gain, turn: T.turn, below: !!(V && Tr && V.score < Tr.score), done: false });
        legend('bt', e.gain, { t: e.t, v: e.v, dur: e.dur });
      } else legend('bt', (e.la || 0) + (e.lb || 0), { a: e.a, b: e.b, dbl: 1, dur: e.dur });
    }
    // dvoboj: kratka napomena iz povijesti para (bez utjecaja na pravila)
    function duelNote(a, b) {
      if (!T) return '';
      const key = pairKey(a, b), ab = (T.attacks[a] || {})[b] || 0, ba = (T.attacks[b] || {})[a] || 0;
      if (T.activeRival === key || (T.rival[key] || 0) >= 8) return 'Rivali se napokon sukobljavaju licem u lice!';
      if (ab + ba >= 3) return 'Ovo dvoje imaju neraščišćenih računa.';
      return '';
    }
    function onLoyal(evs) { if (T) for (const e of evs) if (T.stat.loyal.length < 6) T.stat.loyal.push({ a: e.a, b: e.b, tre: e.tre, bonus: e.bonus }); }
    function duelOut(w, a, b) {
      if (T && T.stat.duels.length < 4) T.stat.duels.push({ a, b, w: w || null });
      if (!T || !w) return '';
      const l = w === a ? b : a, hits = (T.attacks[l] || {})[w] || 0;
      if (hits >= 2) { legend('rev', hits, { av: w, at: l, du: 1 }); return '⚔️ Osveta je slatka: ' + nm(w) + ' pobjeđuje napadača!'; }
      if (T.activeRival === pairKey(a, b)) return 'Rivalstvo dobiva novo poglavlje.';
      return '';
    }
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
    return { reset, onVote, onPower, afterQuestion, afterScores, afterFinale, secretPick, onBetray, onLoyal, duelNote, duelOut, get state() { return T; } };
  })();

  function showMoment() {
    G.mo = G.pend.mo; G.pend = null;
    setPhase('moment', cfg.moment);
  }
  // trenutci se prikazuju na ekranu s poretkom (v.mo); poseban ekran ima samo dvoboj
  function afterReveal() {
    const pd = G.pend;
    G.pend = null;
    if (G.btq && G.btq.length) {
      const evs = runBetrayals();
      if (evs.length) { G.bt = { id: G.s + 1, evs }; G.afterBt = pd; return setPhase('betray', cfg.betrayShow + (evs.length - 1) * 3); }
    }
    if (pd && pd.duel) return startDuelIntro(pd.duel);
    next();
  }
  function afterBetray() {
    const pd = G.afterBt; G.afterBt = null; G.bt = null;
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
    G.du = { a: pair[0], b: pair[1], w: null, n: TD.duelNote(pair[0], pair[1]) };
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
    G.du.o = TD.duelOut(G.du.w, G.du.a, G.du.b);
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

  // ===================== TAJNI PAKTOVI (Blood & Gold) =====================
  // Dva čovjeka sklope tajni savez: šapću odgovore, pune zajedničku riznicu i mogu se izdati.
  // Sve se obračunava ovdje (domaćin); klijenti šalju samo akcije, privatno stanje dobiva samo vlasnik (priv).
  const PACT_LINES = {
    rumor: ['🍻 Krčmom kruže glasine o tajnom savezu...', '🍻 Netko u krčmi kuje tajni plan...', '🍻 Dvije se krigle kucnule ispod stola...', '🍻 Šapuće se da netko više ne igra sam...'],
    rich: ['💰 Čujem da se negdje skriva pravo malo bogatstvo!', '💰 Nečija riznica zvecka sve glasnije...', '💰 Krčmar je primijetio sumnjivo težak kesu zlata...'],
    betray: ['Prijateljstvo je lijepo, ali zlato je ipak zlato!', 'Upravo smo saznali koliko košta prijateljstvo.', 'Nož u leđa, zlato u džep. Živjeli!', 'Krčmar briše šank i šuti. Viđao je on i gore.', 'Tko vjeruje, plaća. Danas je cijena bila visoka.', 'Krigla se diže izdajniku — iz straha, ne iz poštovanja.'],
    double: ['Dva noža, dvije laži i nijedan pobjednik!', 'Dvoje pohlepnih, a nitko bogatiji!', 'Riznica je pala, a s njom i svako povjerenje.', 'Krčmar se smije: kuća uvijek dobiva.'],
    // izdaja s poviješću pakta (javno tek u trenutku izdaje)
    betrayLong: ['{D} pitanja prijateljstva. Jedan trenutak pohlepe. {T} bira zlato!', '{D} pitanja zajedno, a onda nož u leđa.', 'Dugo prijateljstvo, kratka pamet: {T} uzima sve.'],
    betrayShort: ['Kratko je trajalo to prijateljstvo!', 'Pakt nije preživio ni jednu kriglu.', 'Još se pivo nije ni ohladilo, a već nož u leđa.'],
    heist: ['Ovo nije bila izdaja. Ovo je bila pljačka stoljeća!', 'Krčmar broji zlato i ne vjeruje vlastitim očima.'],
    double2: ['Oboje su donijeli noževe na prijateljsku večeru!', 'Dva noža, dvije laži i nijedan pobjednik!'],
    loyal: ['Izgleda da u ovoj krčmi još postoji čast!', 'Vjernost do kraja! Krčmar časti ovu rundu.', 'Neki savezi traju duže od krigle piva.'],
  };
  const pickLine = (k, map) => { const arr = PACT_LINES[k], l = arr[rnd(arr.length)]; return l.replace(/\{(\w)\}/g, (_, x) => (map && map[x] != null ? map[x] : '')); };
  let pactSeq = 0;
  function pactsOn() { return !!G.opt.pacts; }
  const humansIn = () => list().filter((p) => !p.bot);
  const pactOf = (p) => (p && p.pact ? G.pacts.find((x) => x.id === p.pact && x.on) : null);
  const partnerOf = (p) => { const k = pactOf(p); return k ? R.get(k.a === p.pid ? k.b : k.a) : null; };
  // može li igrač sudjelovati u novom paktu
  function pactFree(p) { return !!p && !p.bot && !p.pactUsed && !p.pact; }
  function pactWindow() {
    return pactsOn() && !G.inFinale && G.ph !== 'lobby' && G.ph !== 'final' && G.qn >= cfg.pactAfter && humansIn().length >= cfg.pactMin;
  }
  function pactReset() {
    G.pacts = []; G.offers = []; G.btq = []; G.bt = null; G.ly = null; G.news = null; G.newsSeq = 0; G.pactPaid = false;
    for (const p of list()) { p.pact = null; p.pactUsed = false; p.betray = false; p.wh = null; p.whS = -1; p.offersMade = 0; p.px = 0; p.note = null; }
  }
  function news(t) { G.news = { id: ++G.newsSeq, t, at: now() }; }
  function note(p, t, k) { if (p) p.note = { id: ++G.newsSeq, t, k: k || '' }; }
  // istekla ponuda: ponuditelj dobiva istu poruku bez obzira je li odbijena, ignorirana ili je druga strana već zauzeta (ništa ne otkriva)
  function cleanOffers() {
    const t = now();
    G.offers = G.offers.filter((o) => {
      const live = o.until > t && pactFree(R.get(o.from)) && (o.ghost || pactFree(R.get(o.to)));
      if (!live && o.until <= t && pactFree(R.get(o.from))) note(R.get(o.from), '🍻 Ponuda nije prihvaćena.', 'no');
      return live;
    });
  }
  // jedina ulazna točka za akcije paktova; sve se provjerava
  function pactAction(pid, a) {
    const p = R.get(pid);
    if (!p || p.bot || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;
    cleanOffers();
    let ok = false;
    switch (a.k) {
      case 'offer': {
        const t = R.get(a.to);
        if (!pactWindow() || !pactFree(p) || !t || t === p || t.bot) break;
        if (p.offersMade >= cfg.pactOffersMax || G.offers.some((o) => o.from === pid)) break;
        // zauzet igrač (u paktu, već imao pakt ili ima drugu ponudu): ponuda tiho istekne, ponuditelj ne saznaje zašto
        const ghost = !pactFree(t) || G.offers.some((o) => o.to === t.pid && !o.ghost);
        G.offers.push({ from: pid, to: t.pid, until: now() + cfg.pactOffer * 1000, ghost });
        p.offersMade++; ok = true; break;
      }
      case 'cancel': { const n = G.offers.length; G.offers = G.offers.filter((o) => o.from !== pid); ok = G.offers.length !== n; break; }
      case 'accept': {
        const o = G.offers.find((x) => x.to === pid && x.from === a.from && !x.ghost);
        const f = o && R.get(o.from);
        if (!o || !pactWindow() || !pactFree(p) || !pactFree(f)) break;
        G.offers = G.offers.filter((x) => x !== o && x.from !== pid && x.to !== o.from && x.from !== o.from && x.to !== pid);
        const k = { id: 'k' + (++pactSeq), a: f.pid, b: pid, tre: 0, on: true, since: G.qn, rich: false };
        G.pacts.push(k);
        for (const q of [f, p]) { q.pact = k.id; q.pactUsed = true; q.betray = false; q.wh = null; }
        note(f, '🍻 ' + p.name + ' je prihvatio tvoj pakt!', 'pact'); note(p, '🍻 Pakt s ' + f.name + ' je sklopljen!', 'pact');
        news(pickLine('rumor'));
        ok = true; break;
      }
      case 'decline': {
        const o = G.offers.find((x) => x.to === pid && x.from === a.from && !x.ghost);
        if (!o) break;
        G.offers = G.offers.filter((x) => x !== o);
        note(R.get(o.from), '🍻 Ponuda nije prihvaćena.', 'no');   // privatno; ista poruka kao kad ponuda istekne
        ok = true; break;
      }
      case 'whisper': {
        const mate = partnerOf(p);
        if (!mate || G.ph !== 'question' || p.whS === G.s || !isInt(a.c) || !G.q || a.c < 0 || a.c >= G.q.o.length) break;
        p.whS = G.s; mate.wh = { from: pid, c: a.c, s: G.s }; ok = true; break;
      }
      case 'betray': {
        if (!pactOf(p) || G.ph !== 'question') break;
        p.betray = !!a.on; ok = true; break;
      }
    }
    if (ok) onChange();
    return ok;
  }
  // nakon redovnog bodovanja pitanja: riznica raste, odluke o izdaji se zaključavaju (izvršavaju se nakon otkrivanja)
  function pactAfterQuestion() {
    for (const p of list()) { p.px = 0; p.wh = null; }
    for (const k of G.pacts) {
      if (!k.on) continue;
      const a = R.get(k.a), b = R.get(k.b);
      if (!a || !b) { k.on = false; continue; }
      const both = a.ans === G.q.a && b.ans === G.q.a;
      if (both) { k.tre += cfg.pactBonus; k.grew = G.s; note(a, '💰 +' + cfg.pactBonus + ' u riznicu!', 'tre'); note(b, '💰 +' + cfg.pactBonus + ' u riznicu!', 'tre'); }
      if (!k.rich && k.tre >= cfg.pactRich) { k.rich = true; news(pickLine('rich')); }
      const ta = a.betray, tb = b.betray;
      a.betray = false; b.betray = false;
      if (ta || tb) G.btq.push({ pact: k.id, a: ta, b: tb, at: G.qn });   // zaključano: nakon ovoga se ne može reagirati
    }
  }
  // izvršenje izdaja (jednom; pakt se odmah zatvara pa se ne može ponoviti)
  function runBetrayals() {
    const evs = [];
    for (const q of G.btq.splice(0)) {
      const k = G.pacts.find((x) => x.id === q.pact);
      if (!k || !k.on) continue;
      const A = R.get(k.a), B = R.get(k.b);
      k.on = false; k.end = q.a && q.b ? 'double' : 'betray';
      for (const p of [A, B]) if (p) { p.pact = null; p.betray = false; }
      if (!A || !B) continue;
      if (q.a && q.b) {
        const la = Math.round(A.score * cfg.pactDouble), lb = Math.round(B.score * cfg.pactDouble);
        A.score = Math.max(0, A.score - la); B.score = Math.max(0, B.score - lb);
        A.px = -la; B.px = -lb;
        const dur = Math.max(1, G.qn - (k.since || G.qn));
        evs.push({ k: 'double', a: A.pid, b: B.pid, tre: k.tre, la, lb, dur, line: pickLine(G.qn % 2 ? 'double2' : 'double') });
        TD.onBetray(evs[evs.length - 1]);
      } else {
        const T = q.a ? A : B, V = q.a ? B : A;
        const st = Math.max(0, Math.round(V.score * cfg.pactSteal));
        V.score = Math.max(0, V.score - st); T.score += k.tre + st;
        T.px = k.tre + st; V.px = -st;
        const dur = Math.max(1, G.qn - (k.since || G.qn)), gain = k.tre + st;
        const kind = gain >= 1200 ? 'heist' : dur >= 4 ? 'betrayLong' : dur <= 1 ? 'betrayShort' : 'betray';
        evs.push({ k: 'betray', t: T.pid, v: V.pid, tre: k.tre, st, gain, dur, line: pickLine(kind, { T: T.name, V: V.name, D: dur }) });
        // krčma pamti: izdaja rađa rivalstvo
        const TS = TD.state; if (TS && TS.rival) { const key = T.pid < V.pid ? T.pid + '|' + V.pid : V.pid + '|' + T.pid; TS.rival[key] = (TS.rival[key] || 0) + 12; }
        TD.onBetray(evs[evs.length - 1]);
      }
      k.tre = 0;
    }
    return evs;
  }
  // odanost do kraja: prije finala riznica + bonus dijeli se saveznicima (utječe na početnu stepenicu finala)
  function payLoyalty() {
    if (G.pactPaid) return [];
    G.pactPaid = true;
    const out = [];
    for (const k of G.pacts) {
      if (!k.on) continue;
      k.on = false; k.end = 'loyal';
      const A = R.get(k.a), B = R.get(k.b);
      const tot = Math.round(k.tre * (1 + cfg.pactLoyal)), half = Math.floor(tot / 2);
      if (A) { A.score += tot - half; A.pact = null; } if (B) { B.score += half; B.pact = null; }
      out.push({ a: k.a, b: k.b, tre: k.tre, bonus: tot - k.tre, each: half, ea: tot - half });
    }
    TD.onLoyal(out);
    G.offers = [];
    return out;
  }
  // privatno stanje: samo za tog igrača
  function priv(pid) {
    const p = R.get(pid);
    if (!p || p.bot || !pactsOn()) return null;
    cleanOffers();
    const k = pactOf(p), mate = partnerOf(p);
    const o = {
      can: pactWindow() && pactFree(p) && p.offersMade < cfg.pactOffersMax,
      used: !!p.pactUsed,
      inv: G.offers.filter((x) => x.to === pid && !x.ghost).map((x) => ({ f: x.from, ms: Math.max(0, x.until - now()), dur: cfg.pactOffer * 1000 })),
      out: (G.offers.find((x) => x.from === pid) || null) && (() => { const x = G.offers.find((y) => y.from === pid); return { t: x.to, ms: Math.max(0, x.until - now()) }; })(),
      note: p.note,
    };
    // svi ostali spojeni ljudi (ne otkriva tko je već u paktu)
    if (o.can) o.cand = humansIn().filter((q) => q !== p && q.on).map((q) => q.pid);
    if (k && mate) {
      o.k = { m: mate.pid, tre: k.tre, grew: k.grew === G.s ? 1 : 0, since: k.since };
      if (G.ph === 'question') { o.k.wsent = p.whS === G.s ? 1 : 0; o.k.bt = p.betray ? 1 : 0; o.k.can = 1; }
      if (p.wh && p.wh.s === G.s) o.k.wh = p.wh.c;
    }
    return o;
  }
  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'pacts') { G.opt.pacts = !!v; onChange(); } }

  // ----- botovi -----
  function botDelay() {
    switch (G.ph) {
      case 'vote': return 1200 + rnd(3500);
      case 'power': return 1500 + rnd(5000);
      case 'bet': return 1000 + rnd(3500);
      case 'question': return 2500 + rnd(cfg.q * 550);
      case 'sort': case 'link': return 6000 + rnd(cfg.sort * 450);
      case 'order': return 5000 + rnd(cfg.order * 500);
      case 'hilo': return 8000 + rnd(cfg.hilo * 500);
      case 'blitz': return Math.max(500, cfg.blitz * 1000 - 1500);
      case 'maj': return 1500 + rnd(cfg.maj * 600);
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
      case 'order': return { s, r: Math.random() < 0.45 ? G.or.key.slice() : shuffle(G.or.key.slice()) };
      case 'hilo': { const r = []; for (const x of G.hl.list) { const ok = Math.random() < 0.72; r.push(ok ? x.w : 1 - x.w); if (!ok) break; } return { s, r }; }
      case 'blitz': { const n = Math.min(G.bz.list.length, 9 + rnd(10)); return { s, f: 1, r: G.bz.list.slice(0, n).map((x) => (Math.random() < 0.72 ? x[1] : 1 - x[1])) }; }
      case 'maj': return { s, v: rnd(G.mj.q.o.length) };
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
      if (p.bot) e.b = 1;
      if (p.px && (ph === 'betray' || ph === 'loyal')) e.px = p.px;
      if ((ph === 'vote' && p.done) || (ph === 'voteResult' && p.vote >= 0)) e.vt = p.vote;
      if (ph === 'power') e.of = p.offers;
      if (ph === 'question' || ph === 'fq') {
        if (p.fx.length) e.fx = p.fx;
        if (p.dbl) e.d = 1;
        if (p.sh) e.sh = 1;
        if (p.hide) e.h = p.hide;
      }
      if (ph === 'reveal') { e.ch = p.ch; e.g = p.gained; if (p.dbl) e.d = 1; }
      if (ph === 'sortReveal' || ph === 'linkReveal' || ph === 'orderReveal' || ph === 'hiloReveal' || ph === 'blitzReveal') { e.g = p.gained; e.k = p.cnt; }
      if (ph === 'blitzReveal') e.x = p.bad;
      if (ph === 'majReveal') { e.mv = p.mjV; e.g = p.gained; }
      if (G.inFinale) { e.st = p.fstep; const so = stepOf(p.fu || 0); e.fu = p.fu || 0; e.fp = so.p; e.fr = so.r; if ((p.fu || 0) >= pyrTop() && p.fstep < cfg.steps) e.top = 1; if (ph === 'fr') { e.ug = p.ug; if (p.sk) e.sk = 1; if (p.cf) e.cf = p.cf; } if (ph === 'fstart') e.fsc = p.fsc; }
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
    if (ph === 'voteResult') { v.cw = G.cw; v.tie = G.tie; if (G.tb) { v.tb = G.tb; v.rd = Math.round(cfg.roul * 1000); } }
    if (ph === 'bet') { v.cats = G.cats; v.cw = G.cw; }
    if (ph === 'question' || ph === 'reveal' || ph === 'fq' || ph === 'fr') {
      v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: G.qn };
      if (G.q.k && (ph === 'question' || ph === 'reveal')) { v.q.k = G.q.k; if (G.q.cl) v.q.cl = G.q.cl; }
    }
    if (ph === 'howto' && G.ht) v.ht = Object.assign({}, G.ht, HOWTO[G.ht.k]);
    if (ph === 'order' || ph === 'orderReveal') v.or = { t: G.or.t, lo: G.or.lo, hi: G.or.hi, it: G.or.items };
    if (ph === 'orderReveal') { v.or.key = G.or.key; if (G.or.v) v.or.v = G.or.v; }
    if (ph === 'hilo' || ph === 'hiloReveal') v.hl = { list: G.hl.list };
    if (ph === 'blitz' || ph === 'blitzReveal') v.bz = { list: G.bz.list };
    if (ph === 'maj' || ph === 'majReveal') v.mj = { q: G.mj.q, i: G.mj.i, n: G.mj.qs.length };
    if (ph === 'majReveal') { v.mj.cnt = G.mj.cnt; v.mj.win = G.mj.win; v.mj.last = G.mj.last ? 1 : 0; }
    if (ph === 'cast' || ph === 'question' || ph === 'reveal' || ph === 'fq') v.ev = G.ev;
    if (G.inFinale) { v.fin = 1; v.ftop = pyrTop(); v.req = cfg.pyrReq; if ((ph === 'fq' || ph === 'fr') ? (G.q && G.q.crown) : (ph === 'power' || ph === 'cast') && list().some((p) => (p.fu || 0) >= pyrTop())) v.crown = 1; }
    if (ph === 'reveal' || ph === 'fr') { v.cor = G.q.a; if (G.q.cnt) v.cnt = G.q.cnt; }
    if (ph === 'reveal' && G.pace && cfg.pace && cfg.pace[G.pace]) { const pc = cfg.pace[G.pace]; v.pc = G.pace; v.tl = [pc.w, pc.s]; }
    if (ph === 'sort' || ph === 'sortReveal') v.so = { a: G.so.a, b: G.so.b, it: G.so.items };
    if (ph === 'sortReveal') v.so.key = G.so.key;
    if (ph === 'link' || ph === 'linkReveal') v.li = { t: G.li.t, L: G.li.L, R: G.li.R };
    if (ph === 'linkReveal') v.li.key = G.li.key;
    if (ph === 'final') { v.win = G.win; v.fact = G.fact; if (G.leg) v.lg = G.leg; }
    if (ph === 'moment' && G.mo) v.mo = G.mo;
    if (ph === 'betray' && G.bt) v.bt = G.bt;
    if (ph === 'loyal' && G.ly) v.ly = G.ly;
    if (G.news && now() - G.news.at < 9000) v.news = { id: G.news.id, t: G.news.t };
    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0 };
    if (pactsOn() && G.ph !== 'lobby') v.pk = 1;
    if ((ph === 'reveal' || ph === 'sortReveal' || ph === 'linkReveal' || ph === 'fr') && G.pend && G.pend.mo) v.mo = G.pend.mo;
    if ((ph === 'duelIntro' || ph === 'duel' || ph === 'duelResult') && G.du) {
      v.du = { a: G.du.a, b: G.du.b, bonus: cfg.duelBonus };
      if (G.du.n) v.du.n = G.du.n;
      if (ph === 'duelResult') { v.du.w = G.du.w; v.du.ms = G.du.ms; if (G.du.o) v.du.o = G.du.o; }
    }
    if (ph === 'duel' || ph === 'duelResult') { v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: 0 }; if (ph === 'duelResult') v.cor = G.q.a; }
    // tajni događaj: javno se zna samo da "netko nešto planira"; tko je odabran zna samo njegov mobitel (p/x), izbor se ne šalje
    if ((ph === 'secret' || ph === 'secret2') && G.se) v.se = { k: G.se.k, p: ph === 'secret' ? G.se.p : null, x: ph === 'secret2' ? G.se.x : null, by: ph === 'secret2' ? G.se.p : null, bonus: G.se.k === 'help' ? cfg.helpBonus : cfg.secretBonus };
    if (ph === 'reveal' && G.sxDone) { const x = G.sxDone; v.sxr = { k: x.k, p: x.p, x: x.x, ok: x.ok, res: x.res ? 1 : 0 }; }
    return v;
  }

  // samo za testove
  function _score(pid, n) { const p = R.get(pid); if (p) p.score = n; }
  return { pactAction, priv, setOpt, addPlayer, addBot, setBots, setAvatar, setInput, syncPeers, start, skip, restart, view, stop: clear, _score, _td: () => TD.state, _tdf: () => TD, _p: (pid) => R.get(pid), _G: G };
}
//#engine-end
