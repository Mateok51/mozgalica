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
  oklada: { n: 'Oklada',      atk: false, tg: true, d: 'Kladi se na igrača. Ako oboje točno odgovorite, dobivaš i njegove bodove.' },
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
  // upute: nema odbrojavanja, kreće kad svi potvrde; howtoMax je samo nevidljiva sigurnosna granica (npr. netko ode od mobitela)
  howto: 7, howtoShort: 3.5, howtoMax: 180, order: 25, hilo: 45, blitz: 30, maj: 10, majReveal: 4, majN: 3, hiloN: 8, blitzN: 24,
  chal: null, chalN: 2, varMax: 2,
  // Smart Game Director (raspored, nikad ishod): udio mini-igara u regularnom dijelu, početak bez posebnih bitaka (udio),
  // najviše posebnih u zadnjih fcLast, broj posebnih bitaka, pomak izazova unutar runde, slabije ponavljanje iste skupine/vrste, težine vrsta
  sgd: { on: true, share: 0.3, open: 0.2, finalMax: 1, varMin: 1, varMax: 2, moveChal: 0.5, sameCat: 0.35, sameType: 0.1,
    w: { who: 1, emoji: 1, order: 1, hilo: 1, sort: 1, link: 1, blitz: 1, maj: 1 } },
  // tajni paktovi (balans na jednom mjestu)
  pactMin: 3, pactAfter: 3, pactBonus: 100, pactOne: 40, pactMinQ: 2, pactSteal: 0.08, pactStealMax: 300, pactDouble: 0, pactLoyal: 0.4, pactOffer: 25, pactOffersMax: 3, pactRich: 600, betrayShow: 6.5, loyalShow: 6,
  // tempo otkrivanja odgovora (jedno mjesto za podešavanje): w = šetnja likova, s = kolo, t = cijela faza (s)
  // n = obično, t = napeto, d = dramatično; trenutak krčme dodaje paceMo sekundi
  // reveal: ako je postavljen (npr. u testovima), otkrivanje ima to fiksno trajanje bez prilagodbe tempa
  pace: { n: { w: 1150, s: 1700, t: 6.4 }, t: { w: 1250, s: 2700, t: 7.8 }, d: { w: 1300, s: 3500, t: 9.2 } }, paceMo: 1, paceClose: 250, paceNear: 300,
  // rivalski obračun: ulog po igraču (točno pitanje vrijedi 500–1000, pa 200 znači zamah od 400 — osjeti se, ali ne odlučuje partiju),
  // od kojeg pitanja, koliko prihvaćenih po partiji, pokušaja po igraču, trajanje ponude (s)
  // posljednji poziv: koliko zadnjih običnih pitanja prije piramide prikazuje projekciju početka
  fcLast: 3,
  rcStake: 200, rcAfter: 5, rcMax: 2, rcSends: 2, rcOffer: 20,
  // krčmarove tajne ponude: dobitak / gubitak (točan odgovor vrijedi 500–1000, pa je oklada osjetna, ali ne odlučuje partiju;
  // očekivani dobitak je ≈ 0 kad meta griješi u ~40 % pitanja), od kojeg pitanja (nakon after odigranih), najviše prihvaćenih
  // po partiji, najviše ponuda po partiji, vjerojatnost ponude na prikladnom glasanju, najmanji razmak (pitanja) između ponuda
  // Social Flow: Vrijeme za dogovore nakon tih odigranih pitanja (atBot u testnom načinu s botovima), trajanje (s),
  // nevidljiva sigurnosna granica kad je jedini čovjek u testnom načinu (nema odbrojavanja), najviše dolaznih ponuda za pakt po igraču
  // offerQ: koliko odigranih običnih pitanja ponuda (pakt, obračun) čeka odgovor — dovoljno mirnog vremena između pitanja
  // Krčmar 2.0: sigurnosna granica čekanja na ploči bodova (s)
  // pakt: najviše ponuda po partiji, od kojeg odigranog pitanja, vjerojatnost na pogodnoj ploči, najmanje igrača
  kr: { wait: 45, pactOffers: 2, pactFrom: 3, pactChance: 0.45, pactMin: 3,
    // ponude: od kojeg pitanja, vjerojatnost po ploči (kad nema ponude pakta), najviše po partiji; zadatak: dobitak / gubitak
    offFrom: 2, offChance: 0.35, offMax: 4, taskWin: 400, taskLoss: 200,
    // izazov vođi: od kojeg odigranog pitanja, najmanji zaostatak, vrijeme za odluku (s), ulozi, obrana krune, trajanje konopa (s), prednost za pobjedu prije kraja
    chFrom: 5, chGap: 800, chWait: 12, chStakeA: 150, chStakeB: 300, chGuard: 150, rope: 20, ropeWin: 7, ropeN: 40 },
  sf: { on: true, at: [], atBot: [], dur: 20, soloMax: 600, inMax: 2, offerQ: 2,
    // profili botova (samo društvene odluke): prihvaćanje ponude, slanje ponude po fazi, šapat, izdaja po fazi (uz riznicu ≥ btMin)
    prof: { loyal: { acc: 0.85, off: 0.45, wh: 0.8, bt: 0.05 }, sly: { acc: 0.7, off: 0.35, wh: 0.5, bt: 0.4 }, wild: { acc: 0.5, off: 0.4, wh: 0.5, bt: 0.2 } }, btMin: 75 },
  tk: { win: 150, loss: 100, after: 5, perGame: 2, offers: 3, chance: 0.5, gap: 2 },
  moment: 2.4, duelIntro: 2.6, duel: 10, duelRes: 3.5, duelBonus: 300, secret: 8, secret2: 7, secretBonus: 200, helpBonus: 150,
};

// Prekidači za nove sustave (mogu se mijenjati i po igri preko createGame({ flags }))
const FLAGS = {
  ENABLE_TAVERN_DIRECTOR: true,
  ENABLE_RIVALRIES: true,
  ENABLE_DUELS: false,   // krčmar više ne nameće dvoboje rivalima; dvoboj postoji samo kao izazov vođi
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

const INPUT_PHASES = { rope: 1, deal: 1, vote: 1, bet: 1, power: 1, question: 1, sort: 1, link: 1, fq: 1, duel: 1, secret: 1, secret2: 1, order: 1, hilo: 1, blitz: 1, maj: 1 };
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
// skupine izazova po osjećaju igre (Smart Game Director izmjenjuje skupine)
const KIND = { who: 'assoc', emoji: 'assoc', order: 'logic', hilo: 'logic', sort: 'logic', link: 'logic', blitz: 'fast', maj: 'social' };
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
  const planBase = (o.plan || PLAN).slice(), plan = planBase.slice();
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
    opt: { pacts: o.pacts !== undefined ? !!o.pacts : true, rc: false, tk: false, bs: o.bs !== undefined ? !!o.bs : false }, pacts: [], offers: [], btq: [],
    rc: { offers: [], act: null, res: null, n: 0, seq: 0 },
    tk: { cur: null, res: null, n: 0, offered: 0, seq: 0, lastBn: -9, got: {}, log: [] },
  };
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const list = () => [...R.values()];
  const active = () => list().filter((p) => p.on);
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const isInt = (n) => Number.isInteger(n);
  const tkHold = (p) => !!(G.tk && G.tk.cur && G.tk.cur.st === 'OFFERED' && G.tk.cur.f === p.pid && G.ph === 'vote');
  const allDone = () => { const a = active(); return a.length > 0 && a.every((p) => p.done && !tkHold(p)); };

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
      case 'howto':
        if (inp.ok !== 1) return false;
        break;
      case 'deal':
        if (inp.ok !== 1) return false;
        break;
      case 'reveal':
        if (inp.ok !== 1 || !krCanGo(p)) return false;
        break;
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
        if (POWERS[inp.p].atk || POWERS[inp.p].tg) {
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
      case 'rope': {
        // nadvlačenje konopa: odgovori stižu usput; domaćin broji (točno vuče, netočno vraća)
        if (!G.du || (p.pid !== G.du.a && p.pid !== G.du.b)) return false;
        const a = inp.r;
        if (!Array.isArray(a) || a.length > G.rp.list.length || !a.every((x) => x === 0 || x === 1)) return false;
        if (!p.rpA || a.length >= p.rpA.length) p.rpA = a.slice();
        ropeTally();
        if (Math.abs(G.rp.pa - G.rp.pb) >= cfg.kr.ropeWin) { const s0 = G.s; later(() => { if (G.s === s0) endPhase(); }, 0); }
        onChange();
        p.lastIn = ''; return 'partial';
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
    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) endPhase(); else if (krReady()) endPhase(); else onChange();
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
    for (const p of list()) if (!p.bot && !p.local && p.on && !seen.has(p.pid)) { p.on = false; changed = true; tkGone(p); }
    if (G.ph === 'lobby') for (const [id, p] of R) if (!p.on) { R.delete(id); changed = true; }
    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) return endPhase();
    if (krReady()) return endPhase();
    if (changed) onChange();
  }

  // ----- faze -----
  function setPhase(ph, secs) {
    clear();
    if (G.rc && !RC_WIN[ph] && !sfOn()) { for (const o of G.rc.offers) note(R.get(o.f), '⚔️ Izazov nije prihvaćen.', 'no'); G.rc.offers = []; }
    G.ph = ph; G.s += 1;
    G.dur = Math.round(secs * 1000);
    G.startedAt = now(); G.endsAt = G.startedAt + G.dur;
    for (const p of list()) p.done = false;
    const s = G.s;
    later(() => { if (G.s === s) endPhase(); }, G.dur + (INPUT_PHASES[ph] ? 400 : 0));
    if (INPUT_PHASES[ph]) botsAct();
    sfBotsTick();
    onChange();
  }

  function endPhase() {
    switch (G.ph) {
      case 'intro': return next();
      case 'deal': return afterDeal();
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
      case 'reveal': krPactSettle(true); krOfferEnd(); krChallengeEnd(); return afterReveal();
      case 'sort': return scoreSort();
      case 'link': return scoreLink();
      case 'sortReveal': case 'linkReveal': return afterReveal();
      case 'moment': return afterMoment();
      case 'duelIntro': return startDuel();
      case 'duel': return scoreDuel();
      case 'rope': return scoreRope();
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
    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null; G.leg = null; G.crownWin = null; G.bdone = 0;
    // kladionica: nasumično 2-3 puta po igri, najviše jednom po rundi (nikad u finalu)
    G.bn = -1; G.betAt = new Set();
    const nb = plan.filter((it) => it.t === 'battle').length, rounds = Math.ceil(nb / 3);
    const want = Math.min(rounds, cfg.betEvents[0] + rnd(cfg.betEvents[1] - cfg.betEvents[0] + 1));
    for (const r of shuffle(Array.from({ length: rounds }, (_, i) => i)).slice(0, want)) G.betAt.add(Math.min(nb - 1, r ? r * 3 + rnd(3) : 1 + rnd(2)));
    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; p.rx = 0; p.rcSent = 0; p.rcWon = false; p.tb = 0; }
    G.tk = { cur: null, res: null, n: 0, offered: 0, seq: 0, lastBn: -9, got: {}, log: [] };
    G.rc = { offers: [], act: null, res: null, n: 0, seq: 0 };
    // mini-igre: nasumično koji izazovi i koje posebne bitke, da nije svaka partija ista
    const nCh = plan.filter((it) => it.t === 'challenge').length;
    const pool = CHALLENGES.filter((k) => (k !== 'maj' || active().length >= 3) && (D[DATA_KEY[k]] || []).length);
    G.qvAt = new Map(); G.ci = 0;
    if (cfg.sgd && cfg.sgd.on && !cfg.chal && !cfg.qv) sgdPlan(nb, pool);
    else {
      // stari raspored (testovi s točno zadanim izazovima, ili kad je Smart Game Director isključen)
      G.chal = (cfg.chal || shuffle(pool)).slice(0, Math.max(nCh, cfg.chal ? cfg.chal.length : 0));
      const slots = shuffle(Array.from({ length: Math.max(0, nb - 1) }, (_, i) => i + 1)).filter((i) => !G.betAt.has(i));
      const wantV = [['who', cfg.qv ? cfg.qv.who : rnd(cfg.varMax + 1)], ['emoji', cfg.qv ? cfg.qv.emoji : rnd(cfg.varMax + 1)]];
      for (const [k, n] of wantV) for (let j = 0; j < n && slots.length; j++) if ((D[DATA_KEY[k]] || []).length) G.qvAt.set(slots.shift(), k);
    }
    G.seenHow = new Set();
    TD.reset();
    pactReset();
    sfReset();
    next();
  }

  // ===================== SMART GAME DIRECTOR =====================
  // Na početku partije domaćin složi raspored (jednom; ponovno spajanje ga ne mijenja). Upravlja samo time KOJA vrsta
  // izazova dolazi i GDJE — nikad bodovima, pitanjima ni težinom, i ne gleda tko vodi.
  function sgdPlan(nb, pool) {
    const SG = cfg.sgd, W = SG.w || {};
    // 1) izazovi nisu uvijek nakon istih pitanja: unutar runde mogu doći pitanje ranije (nikad na početku runde)
    plan.splice(0, plan.length, ...planBase);
    for (let i = 2; i < plan.length; i++) if (plan[i].t === 'challenge' && plan[i - 1].t === 'battle' && plan[i - 2].t === 'battle' && Math.random() < SG.moveChal) { const t = plan[i]; plan[i] = plan[i - 1]; plan[i - 1] = t; }
    // redoslijed mjesta regularnog dijela: B = obično pitanje (bitka), C = izazov
    const slots = []; let bn = 0;
    for (const it of plan) { if (it.t === 'battle') slots.push({ k: 'B', bn: bn++ }); else if (it.t === 'challenge') slots.push({ k: 'C' }); }
    const nC = slots.filter((x) => x.k === 'C').length;
    const vars = ['who', 'emoji'].filter((k) => (D[DATA_KEY[k]] || []).length);
    // 2) koliko posebnih bitaka: ciljani udio mini-igara ± 1, u granicama
    let nV = Math.round(slots.length * SG.share) - nC + rnd(3) - 1;
    nV = vars.length ? Math.max(SG.varMin, Math.min(SG.varMax, nV)) : 0;
    // 3) gdje: ne u uvodnom dijelu, ne do drugog izazova, najviše finalMax u zadnjih fcLast; ako nema mjesta, pravila se blaže
    const openN = Math.max(1, Math.ceil(nb * SG.open)), finFrom = Math.max(0, nb - (cfg.fcLast || 3));
    const si = (b) => slots.findIndex((x) => x.k === 'B' && x.bn === b);
    const nearMini = (b, chosen) => { const i = si(b); return [i - 1, i + 1].some((j) => slots[j] && (slots[j].k === 'C' || chosen.includes(slots[j].bn))); };
    const chosen = [];
    for (const strict of [2, 1, 0]) {
      while (chosen.length < nV) {
        const ok = Array.from({ length: nb }, (_, b) => b).filter((b) => !chosen.includes(b) && !G.betAt.has(b) && b >= (strict ? openN : 1) &&
          (!strict || !nearMini(b, chosen)) && (strict < 2 || b < finFrom || chosen.filter((x) => x >= finFrom).length + slots.slice(si(finFrom)).filter((x) => x.k === 'C').length < SG.finalMax));
        if (!ok.length) break;
        chosen.push(ok[rnd(ok.length)]);
      }
    }
    chosen.sort((a, b) => a - b);
    // 4) vrste: ponderirani izbor, slabije ista skupina kao prethodna mini-igra i ista vrsta; bez potpunih zabrana
    const used = {}; let last = null;
    const pick = (cands) => {
      const wt = cands.map((k) => (W[k] != null ? W[k] : 1) * (last && KIND[last] === KIND[k] ? SG.sameCat : 1) * (used[k] ? SG.sameType : 1));
      let r = Math.random() * wt.reduce((a, b) => a + b, 0);
      for (let i = 0; i < cands.length; i++) { r -= wt[i]; if (r <= 0) return cands[i]; }
      return cands[cands.length - 1];
    };
    G.chal = [];
    for (const sl of slots) {
      if (sl.k === 'C') {
        const c = pool.filter((k) => !G.chal.includes(k)); const k = pick(c.length ? c : pool.length ? pool : ['sort']);
        G.chal.push(k); used[k] = (used[k] || 0) + 1; last = k;
      } else if (chosen.includes(sl.bn) && vars.length) {
        const k = pick(vars); G.qvAt.set(sl.bn, k); used[k] = (used[k] || 0) + 1; last = k;
      }
    }
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
    if (sfDeal()) return;
    startVote0();
  }
  function startVote0() {
    const avail = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!avail.length) return next();
    G.bn = (G.bn == null ? -1 : G.bn) + 1;
    G.qv = G.qvAt && G.qvAt.get(G.bn) || null;
    if (G.qv) { G.cats = null; G.cw = -1; return startHowto(G.qv); }
    G.cats = shuffle(avail).slice(0, 4);
    G.cw = -1;
    for (const p of list()) p.vote = -1;
    setPhase('vote', cfg.vote);
    tkOffer();
  }
  function resolveVote() {
    tkLock();
    const counts = G.cats.map(() => 0);
    for (const p of active()) if (p.vote >= 0) counts[p.vote]++;
    const max = Math.max(...counts);
    const best = counts.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
    G.cw = pick(best);
    { const fv = active().find((p) => p.kf && p.vote >= 0); if (fv) { G.cw = fv.vote; fv.kf = 0; G.tie = 0; G.tb = null; best.length = 0; best.push(fv.vote); note(fv, '🗳️ Krčmar je poslušao tvoj glas.', 'pact'); } }
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
    let pool = (multi ? POWER_KEYS : BUFF_KEYS).filter((k) => !(G.inFinale && (k === 'pola' || k === 'grick' || k === 'oklada')) && !(k === 'oklada' && !multi));
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
      p.pw = null; p.fx = []; p.dbl = false; p.pola = false; p.sh = false; p.hide = null; p.okl = null; p.ob = 0; p.oq = 0; p.okr = null;
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
        if (k === 'oklada') p.okl = p.pw.t;
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
  // koliko običnih pitanja (bitaka) još nije odigrano; projekcija samo ako partija ima piramidu
  const fcTotal = () => plan.filter((it) => it.t === 'battle').length;
  const fcLeft = () => Math.max(0, fcTotal() - (G.bdone || 0));
  const fcOn = () => plan.some((it) => it.t === 'finale') && !G.inFinale && G.ph !== 'lobby' && G.ph !== 'final' && (G.bdone || 0) >= 1 && fcLeft() <= cfg.fcLast && fcLeft() >= 1;   // nakon zadnjeg pitanja nema projekcije: stvarni raspored ostaje iznenađenje piramide
  // projekcija: trenutni javni (već obračunati) bodovi kroz isti izračun kao stvarni početak; bez skrivenih riznica
  function fcProj() {
    const ps = list(), U = pyrUnitsOf(ps.map((p) => p.score)), o = {};
    ps.forEach((p, i) => { const so = stepOf(U[i]); o[p.pid] = [so.s, so.p, so.r, U[i]]; });
    return o;
  }
  function scoreQuestion() {
    G.bdone = (G.bdone || 0) + 1;
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
    for (const p of list()) {
      p.ob = 0; p.oq = 0; p.okr = null;
      if (!p.okl) continue;
      const X = R.get(p.okl), mine = p.ans === G.q.a, theirs = !!X && X.ans === G.q.a && X.gained > 0;
      if (X && mine && theirs) { p.ob = X.gained; p.score += p.ob; p.oq = 1; }
      else p.oq = -1;
      p.okr = { t: p.okl, w: p.ob, why: p.oq > 0 ? '' : (!mine ? 'me' : 'x') };
    }
    resolveSecret();
    rcResolve();
    tkResolve();
    pactAfterQuestion();
    sfExpireQ();
    krTaskSettle();
    krPactMaybe();
    krOfferMaybe();
    krChallengeMaybe();
    TD.afterQuestion();
    // tempo: domaćin procijeni važnost iz javnih rezultata ovog pitanja (koji se upravo otkrivaju)
    G.pace = paceOf(before);
    const pc = cfg.pace && cfg.pace[G.pace];
    // trenutak iz krčme prikazuje se ispod poretka, pa otkrivanje traje malo dulje
    const mo = G.pend && G.pend.mo ? (cfg.paceMo != null ? cfg.paceMo : 1) : 0;
    const rb = (pc ? pc.t : cfg.reveal != null ? cfg.reveal : 10.5) + mo;
    setPhase('reveal', rb + (cfg.kr ? cfg.kr.wait : 0));
    krRevealStart(rb);
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
    const lv = G.pend && G.pend.mo && G.pend.mo.k !== 'FINAL_CALL' ? G.pend.mo.lv || 0 : 0;
    if (lv >= 3) return 'd';
    // NAPETO: promjena vodstva, tijesan vrh, skok u poretku, prekinut niz, rivali, zadnje pitanje prije piramide
    if (lead) return 't';
    if (A[0].sc > 0 && gapA <= near && gapB <= near) return 't';
    if (rise >= 2) return 't';
    if (['COMEBACK', 'CB_RISE', 'STREAK_BROKEN', 'STREAK5', 'RIVAL_LEAD', 'RIVALRY', 'RIVAL_AGAIN', 'RIVAL_SWAP', 'REVENGE', 'POWER_REVENGE', 'BETRAY_REVENGE', 'THRONE'].includes(mo)) return 't';
    if (lastQ) return 't';
    if (lv >= 2) return 't';
    if (G.rc && G.rc.res && G.rc.res.k === 'win') return 't';
    if (G.tk && G.tk.res && G.tk.res.k !== 'off') return 't';
    return 'n';
  }

  // ----- mini-igre -----
  function afterCategory() { return G.betAt && G.betAt.has(G.bn) && list().some((p) => p.score > 0) ? startBet() : (maybeSecret() || startPower()); }
  function startHowto(k) {
    const first = !G.seenHow.has(k); G.seenHow.add(k);
    G.ht = { k, first: first ? 1 : 0, chal: CHALLENGES.includes(k) ? 1 : 0 };
    G.rl = G.ht.chal ? 'Izazov' : G.rl;
    // igra samo s botovima (npr. gleda se na TV-u): nema koga čekati, upute ostaju vidljive kao prije
    if (!list().some((p) => !p.bot && p.on)) return setPhase('howto', first ? cfg.howto : cfg.howtoShort);
    setPhase('howto', cfg.howtoMax || 180);
    // botovi potvrđuju odmah; ljudi tipkom na mobitelu
    const s0 = G.s;
    for (const p of list()) if (p.bot) p.done = true;
    if (G.s === s0 && allDone()) return endPhase();
    onChange();
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
  // bodovi svih igrača → početne jedinice napretka (isti redoslijed); koristi je i projekcija "Posljednjeg poziva"
  function pyrUnitsOf(sc) {
    const n = sc.length, top = Math.max(0, ...sc);
    return sc.map((x) => {
      const better = sc.filter((y) => y > x).length, same = sc.filter((y) => y === x).length;
      const rn = n > 1 ? 1 - (better + (same - 1) / 2) / (n - 1) : 1, gn = top > 0 ? x / top : 0;
      return top > 0 ? Math.max(0, Math.min(cfg.pyrMaxStart, Math.round((cfg.pyrRankW * rn + (1 - cfg.pyrRankW) * gn) * cfg.pyrMaxStart))) : 0;
    });
  }
  function pyrStart() {
    const ps = list(), U = pyrUnitsOf(ps.map((p) => p.score));
    for (const [i, p] of ps.entries()) {
      p.fu = U[i];
      p.fstep = stepOf(p.fu).s; p.fst = p.fstep; p.fsc = p.score; p.fstr = 0; p.ug = 0; p.sk = 0; p.cf = 0;
    }
  }
  function startFinale() {
    for (const p of list()) { p.kt = null; p.kf = 0; p.ko = null; }   // nedovršeni zadaci i usluge prestaju (bez promjene bodova)
    rcCancelAll('počinje veliko finale.');
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
  const LEG_T = { rc: ['⚔️', 'Pobjednik obračuna'], cb: ['🔥', 'Povratak večeri'], bt: ['🗡️', 'Najveća izdaja'], vic: ['💔', 'Najveća žrtva izdaje'], dbl: ['💀', 'Noževi pod stolom'], ly: ['❤️', 'Nerazdvojni saveznici'],
    rv: ['⚔️', 'Rivalstvo večeri'], rev: ['🔁', 'Osveta večeri'], tk: ['🍺', 'Krčmarov miljenik'], bet: ['💰', 'Majstor rizika'], fast: ['⚡', 'Munja večeri'], acc: ['🎯', 'Oko sokolovo'], st: ['🏹', 'Najduži niz'] };
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
      } else add('dbl', 88 + (e.la + e.lb) / 100, [e.a, e.b], 'Oboje vade noževe u istom trenutku!', 'Riznica ' + bodN(e.tre) + ' propada', 'bt' + e.id);
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
    // rivalski obračun: pobjednik najvećeg (po prenesenim bodovima)
    { const won = S.rc.filter((x) => x.k === 'win' && R.get(x.w)).sort((x, y) => y.t - x.t || (x.w < y.w ? -1 : 1))[0];
      if (won) { const l = won.w === won.a ? won.b : won.a; add('rc', 58 + won.t / 20 + (won.rev && won.w === won.a ? 10 : 0), [won.w, l], nmL(won.w) + ' pobjeđuje u obračunu: ' + nmL(won.w) + ' vs ' + nmL(l), '+' + bodN(won.t) + ' iz protivnikova uloga', 'pair:' + [won.w, l].sort().join('|')); } }
    // tajna ponuda: najzanimljivija uspješna (kraj velikog niza, rival)
    { const w = (S.tk || []).filter((x) => R.get(x.f) && R.get(x.t)).map((x) => ({ x, v: 44 + (x.why === 'st' ? 6 + x.n * 2 : 0) + (x.rv ? 8 : 0) })).sort((a, b) => b.v - a.v)[0];
      if (w) { const x = w.x; add('tk', w.v, [x.f], x.why === 'st' ? 'Predviđa kraj niza od ' + x.n + ': ' + nmL(x.t) : x.rv ? 'Predviđa pogrešku svog rivala: ' + nmL(x.t) : 'Tajna oklada protiv krčmara: ' + nmL(x.t) + ' griješi', '+' + bodN(cfg.tk.win) + ' iz tajne ponude'); } }
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
  const PW_ACC = { oklada: 'Okladu', led: 'Led', sluz: 'Sluz', grick: 'Grickalice', bomba: 'Bombu', dupli: 'Dupli bodove', pola: 'Pola-pola', stit: 'Štit' };
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
      FINAL_CALL: [['🏆 Posljednji poziv!', 'Još {K} do piramide! Svaki bod može promijeniti početni položaj!']],
      PJ_LEAD: [['🏆 {X} preuzima prednost!', 'Prema trenutačnim bodovima: najbolji početak na piramidi'], ['🏆 Nova prednost za piramidu', 'Najbolja projicirana početna pozicija: {X}']],
      PJ_UP: [['🔥 {X} se penje!', 'Prema trenutačnim bodovima: {K}. stepenica na piramidi'], ['🔥 Važan korak prema vrhu', '{X} sada kreće s {K}. stepenice — zasad']],
      PJ_TIE: [['⚔️ Borba za prednost!', '{A} i {B} krenuli bi s iste stepenice'], ['⚔️ {A} i {B} su izjednačeni!', 'Ista projicirana početna pozicija na piramidi']],
      PJ_LAST: [['⚔️ Posljednja prilika!', 'Još jedno pitanje prije završnog uspona!']],
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
        pjPrev: null, fcAnn: 0,
        pairs: {}, worst: {}, leadTurns: {}, chase: {}, betr: [], lineAt: {}, typeAt: {}, feat: {}, moSeq: 0,
        leg: { cb: null, bt: null, rv: null, rev: null, bet: null, lead: null },
        // za legende: pitanja, točni, najbrži točan (obična pitanja), najdulji niz, neto kladionica, najbolje mjesto nakon dna, dvoboji, izdaje, odani paktovi
        stat: { qn: 0, ans: {}, ok: {}, fast: {}, maxSt: {}, betNet: {}, rise: {}, duels: [], bt: [], loyal: [], rc: [], tk: [] },
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
      fcCands(cands);
      if (G.sx) cands.push(G.sx);
      rivalryCands(cands);
      memoryCands(cands);
      duelCand(cands);
      if ((G.rc && G.rc.res) || (G.tk && G.tk.res)) { const c = pickMoment(cands.filter((x) => x.score >= 9)); finalizePend(c); return; }
      finalizePend(pickMoment(cands));
    }
    function afterScores() {
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) { G.pend = null; return; }
      T.turn++;
      const cands = [];
      updateRanks(cands);
      rivalryCands(cands);
      if (T.fcAnn) fcCands(cands);
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
    // posljednji poziv: najava pri aktivaciji, zatim samo stvarne promjene projicirane stepenice
    const numW = (n) => (n === 1 ? 'jedno pitanje' : n === 2 ? 'dva pitanja' : n === 3 ? 'tri pitanja' : n + ' pitanja');
    function fcCands(cands) {
      if (!fcOn()) { T.pjPrev = null; return; }
      const pj = fcProj(), prev = T.pjPrev, left = fcLeft();
      T.pjPrev = pj;
      if (!T.fcAnn) {
        // najava se ponavlja dok se stvarno ne prikaže (može je nadjačati samo veći događaj)
        const c = cand('FINAL_CALL', 9.2, 'fc', { K: numW(left) }, list().slice().sort((a, b) => b.score - a.score).slice(0, 2).map((p) => p.pid), ['idle', 'idle'], { snd: 'stingLeader', vs: 0, onShow: () => { T.fcAnn = 1; } });
        if (c) cands.push(c);
        return;
      }
      // bez komentara o projiciranim stepenicama (početne pozicije su iznenađenje piramide)
      if (left === 1) { const c = cand('PJ_LAST', 4.5, 'pjlast', {}, [], [], { snd: 'stingSmall' }); if (c) cands.push(c); }
    }
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
    // rivalski obračun: rečenica za ishod (osveta je samo kontekst), pamćenje za legende
    function onShowdown(r) {
      if (!T) return;
      const A = nm(r.a), B = nm(r.b);
      if (r.k === 'win') {
        const W = nm(r.w), L = nm(r.w === r.a ? r.b : r.a);
        r.line = r.rev && r.w === r.a ? '🔥 Osveta je slatka! ' + W + ' naplaćuje stare račune!' : r.rev ? '🍻 ' + W + ' opet nadmudruje izazivača!' : [W + ' pobjeđuje, a ' + L + ' plaća skupu lekciju!', 'Krčma nazdravlja: ' + W + ' uzima ulog!'][T.turn % 2];
        if (r.rev && r.w === r.a) legend('rev', 12, { av: r.a, at: r.b, rc: 1 });
        pairOf(r.a, r.b).ev++;
      } else if (r.k === 'tie') r.line = '🍻 Izgleda da će ovaj račun ipak ostati otvoren!';
      else r.line = 'Obračun je otkazan — netko je izgubio vezu prije odgovora.';
      if (T.stat.rc.length < 4) T.stat.rc.push({ a: r.a, b: r.b, w: r.w, t: r.t, rev: r.rev ? 1 : 0, k: r.k });
    }
    // tajna ponuda: rečenica prema povijesti (niz, rival); isti igrač ne dobiva odmah i trenutak krčme
    function onTk(r) {
      if (!T) return;
      const F0 = nm(r.f), X = nm(r.t);
      if (r.k === 'win') {
        r.h = '💰 ' + F0 + ' nadmudruje krčmara!';
        r.line = r.why === 'st' && r.n >= 3 ? '🔥 ' + F0 + ' predviđa kraj velikog niza: ' + X + ' griješi!' : r.why === 'rv' ? '⚔️ ' + F0 + ' očito dobro poznaje svog rivala!'
          : r.to ? '⏳ ' + X + ' ne stiže odgovoriti — ' + F0 + ' ipak naplaćuje!' : ['Krčmar plaća: ' + F0 + ' zna kako će ovo završiti!','Krčmar plaća, a ' + F0 + ' se smije: ' + X + ' griješi!'][T.turn % 2];
        if (T.stat.tk.length < 4) T.stat.tk.push({ f: r.f, t: r.t, why: r.why, n: r.n, rv: r.why === 'rv' ? 1 : 0 });
      } else if (r.k === 'lose') {
        r.h = '🍺 Krčmar pobjeđuje!';
        r.line = r.why === 'st' ? '🍻 ' + X + ' nastavlja niz, a ' + F0 + ' ostaje bez zlata!' : ['Ovaj put ' + X + ' ne griješi. Krčmar naplaćuje!', F0 + ' podcjenjuje protivnika — krčmar naplaćuje!'][T.turn % 2];
      } else { r.h = '🍺 Tajna ponuda je poništena'; r.line = 'Veza je pukla prije odgovora — bodovi se ne mijenjaju.'; }
      T.feat[r.f] = T.turn;
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
    return { reset, onTk, onVote, onPower, afterQuestion, afterScores, afterFinale, secretPick, onBetray, onLoyal, onShowdown, duelNote, duelOut, get state() { return T; } };
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
    if (pd && pd.duel) return startDuelIntro(pd.duel, pd.rope);
    next();
  }
  function afterBetray() {
    const pd = G.afterBt; G.afterBt = null; G.bt = null;
    if (pd && pd.duel) return startDuelIntro(pd.duel, pd.rope);
    next();
  }
  function afterMoment() {
    G.mo = null;
    if (G.inFinale) return startFinaleQ();
    next();
  }
  // ----- dvoboj: samo dva igrača odgovaraju, brži točan dobiva bonus, nitko ne gubi bodove -----
  function startDuelIntro(pair, rope) {
    G.du = { a: pair[0], b: pair[1], w: null, n: TD.duelNote(pair[0], pair[1]), rope: rope ? 1 : 0 };
    setPhase('duelIntro', cfg.duelIntro);
  }
  function startDuel() {
    if (G.du && G.du.rope) return startRope();
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
  const FC_PH = { deal: 1, vote: 1, voteResult: 1, power: 1, cast: 1, reveal: 1, bet: 1, betray: 1, intro: 1, howto: 1, sortReveal: 1, linkReveal: 1, orderReveal: 1, hiloReveal: 1, blitzReveal: 1, majReveal: 1, duelResult: 1, moment: 1 };
  function pactsOn() { return !!G.opt.pacts; }
  // ===================== RIVALSKI OBRAČUN =====================
  // Dobrovoljno, samo ljudi, najviše rcMax prihvaćenih po partiji; ponude samo između pitanja; ishod na sljedećem običnom pitanju.
  const RC_WIN = { deal: 1, vote: 1, voteResult: 1, power: 1, cast: 1, reveal: 1, bet: 1 };
  const rcOn = () => !!G.opt.rc;
  function rcClean() {
    const t = now();
    G.rc.offers = G.rc.offers.filter((o) => {
      const f = R.get(o.f), to = R.get(o.t);
      const live = sfOn() ? o.until > t && f && to && !G.rc.act && !G.inFinale : o.until > t && f && to && f.on && to.on && RC_WIN[G.ph] && !G.rc.act;
      if (!live && f) note(f, '⚔️ Izazov nije prihvaćen.', 'no');   // ista poruka za odbijanje, istek i prekid (nikoga ne posramljuje)
      return live;
    });
  }
  function rcCanSend(p) {
    return rcOn() && !!p && !p.bot && p.on && !G.inFinale && RC_WIN[G.ph] && G.qn >= cfg.rcAfter && !G.rc.act && G.rc.n < cfg.rcMax &&
      !p.rcWon && (p.rcSent || 0) < cfg.rcSends && p.score >= cfg.rcStake && !G.rc.offers.some((o) => o.f === p.pid || o.t === p.pid);
  }
  function rcOk(t, p) { return !!t && t !== p && !t.bot && t.on && t.score >= cfg.rcStake && !G.rc.offers.some((o) => o.t === t.pid || o.f === t.pid); }
  // osveta: onaj koji izaziva bio je meta barem dva napada izazvanoga (samo kontekst, bez bonusa)
  function rcRev(a, b) { const T = TD.state; return !!(T && T.attacks[b] && (T.attacks[b][a] || 0) >= 2); }
  function rcRival(a, b) { const T = TD.state; if (!T) return false; const k = a < b ? a + '|' + b : b + '|' + a; const P = T.pairs && T.pairs[k]; return T.activeRival === k || (T.rival[k] || 0) >= 8 || !!(P && (P.all || 0) >= 2); }
  function rcAction(p, a) {
    rcClean();
    switch (a.k) {
      case 'rcOffer': {
        const t = R.get(a.to);
        if (!rcCanSend(p) || !rcOk(t, p)) return false;
        G.rc.offers.push({ id: ++G.rc.seq, f: p.pid, t: t.pid, until: sfOn() ? Infinity : now() + cfg.rcOffer * 1000, born: G.dealN || 0, bq: G.bdone || 0, rev: rcRev(p.pid, t.pid) ? 1 : 0, riv: rcRival(p.pid, t.pid) ? 1 : 0 });
        p.rcSent = (p.rcSent || 0) + 1; return true;
      }
      case 'rcCancel': { const n = G.rc.offers.length; G.rc.offers = G.rc.offers.filter((o) => o.f !== p.pid); return G.rc.offers.length !== n; }
      case 'rcDecline': {
        const o = G.rc.offers.find((x) => x.t === p.pid && x.f === a.from); if (!o) return false;
        G.rc.offers = G.rc.offers.filter((x) => x !== o); note(R.get(o.f), '⚔️ Izazov nije prihvaćen.', 'no'); return true;
      }
      case 'rcAccept': {
        const o = G.rc.offers.find((x) => x.t === p.pid && x.f === a.from), f = o && R.get(o.f);
        if (!o || !f || !RC_WIN[G.ph] || G.inFinale || G.rc.act || G.rc.n >= cfg.rcMax || f.score < cfg.rcStake || p.score < cfg.rcStake || !f.on) return false;
        G.rc.offers = [];
        G.rc.act = { id: o.id, a: f.pid, b: p.pid, stake: cfg.rcStake, rev: o.rev, riv: o.riv, at: G.qn };
        G.rc.n++; f.rcWon = true;
        note(f, '⚔️ ' + p.name + ' prihvaća izazov! Obračun je na sljedećem pitanju.', 'pact'); note(p, '⚔️ Izazov prihvaćen. Obračun je na sljedećem pitanju.', 'pact');
        news(o.rev ? '🔥 ' + f.name + ' traži osvetu: ' + f.name + ' vs ' + p.name + '!' : '⚔️ Rivalski obračun: ' + f.name + ' vs ' + p.name + '!');
        return true;
      }
    }
    return false;
  }
  // ishod na običnom pitanju (posebne bitke i mini-igre se preskaču); domaćin sve računa, klijent ništa ne šalje
  function rcResolve() {
    const A0 = G.rc.act; G.rc.res = null;
    for (const p of list()) p.rx = 0;
    if (!A0 || G.qv) return;
    G.rc.act = null;
    const A = R.get(A0.a), B = R.get(A0.b);
    const res = { id: A0.id, a: A0.a, b: A0.b, rev: A0.rev, riv: A0.riv, w: null, t: 0, k: 'tie' };
    if (!A || !B || (!A.on && A.ans < 0) || (!B.on && B.ans < 0)) res.k = 'off';   // izgubljena veza bez odgovora: otkazano, nitko ne gubi
    else {
      const ra = A.ans === G.q.a, rb = B.ans === G.q.a;
      // oboje točno = neriješeno: vrijeme odgovora šalje mobitel i ovisi o mreži, pa nije pošten sudac
      if (ra !== rb) {
        const W = ra ? A : B, L = ra ? B : A, t = Math.min(A0.stake, Math.max(0, L.score));
        L.score -= t; W.score += t; W.rx = t; L.rx = -t;
        res.w = W.pid; res.t = t; res.k = 'win';
      }
    }
    G.rc.res = res;
    TD.onShowdown(res);
  }
  function rcCancelAll(why) {
    rcClean();
    for (const o of G.rc.offers) note(R.get(o.f), '⚔️ Izazov nije prihvaćen.', 'no');
    G.rc.offers = [];
    if (G.rc.act) { const A0 = G.rc.act; G.rc.act = null; for (const id of [A0.a, A0.b]) note(R.get(id), '⚔️ Obračun je otkazan: ' + why, 'no'); }
  }
  // ===================== KRČMAROVE TAJNE PONUDE =====================
  // Domaćin je jedini koji odlučuje: kome, o kome, iznosi, ishod. Klijent šalje samo tkAccept/tkDecline s ID-om ponude
  // (kroz isti provjereni kanal kao paktovi). Ponudu vidi samo primatelj (priv); javno se vidi tek ishod na otkrivanju.
  const tkOn = () => !!G.opt.tk;
  // dopušteni prijelazi stanja
  const TK_NEXT = { OFFERED: { ACCEPTED: 1, DECLINED: 1, EXPIRED: 1, CANCELLED: 1 }, ACCEPTED: { SETTLED: 1, CANCELLED: 1 } };
  function tkSet(o, st) { if (!o || !TK_NEXT[o.st] || !TK_NEXT[o.st][st]) return false; o.st = st; return true; }
  function tkDone(o) { G.tk.cur = null; if (G.tk.log.length < 8) G.tk.log.push({ id: o.id, f: o.f, t: o.t, st: o.st, k: o.k }); }
  const TK_LINE = {
    st: '🔥 {X}: {K} zaredom. Misliš li da će niz napokon puknuti?',
    rv: '⚔️ Znaš li svog rivala dovoljno dobro? Hoće li {X} pogriješiti?',
    cb: '🍻 {X} se vraća u igru. Ali može li nastaviti ovim tempom?',
    ld: '👑 {X} sjedi na vrhu stola. Hoće li se napokon spotaknuti?',
    gen: '🍺 {X} djeluje nešto previše samouvjereno. Hoće li se spotaknuti na sljedećem pitanju?',
  };
  // jesu li dvoje vezani drugim aktivnim dogovorom (pakt ili rivalski obračun)
  function tkTied(a, b) {
    const k = pactOf(a); if (k && (k.a === b.pid || k.b === b.pid)) return true;
    const r = G.rc && G.rc.act; return !!(r && ((r.a === a.pid && r.b === b.pid) || (r.a === b.pid && r.b === a.pid)));
  }
  // zašto je meta zanimljiva — samo iz povijesti partije (nikad iz pitanja ili odgovora koji tek dolaze)
  function tkWhy(f, t) {
    const T = TD.state; if (!T) return { k: 'gen', w: 1 };
    const st = T.streak[t.pid] || 0;
    if (st >= 3) return { k: 'st', w: 3 + st, n: st };
    if (rcRival(f.pid, t.pid)) return { k: 'rv', w: 5 };
    const ps = active().length, low = T.lowRank[t.pid], now = T.rank[t.pid];
    if (ps >= 3 && low === ps && now && now <= 2) return { k: 'cb', w: 4 };
    if (now === 1) return { k: 'ld', w: 2 };
    return { k: 'gen', w: 1 };
  }
  // poziva se odmah nakon početka glasanja; ništa ne radi ako uvjeti nisu ispunjeni (bez nove faze)
  function tkOffer() {
    const K = cfg.tk, X = G.tk;
    const nb = G.ph === 'deal' ? G.bn + 1 : G.bn, qv = G.ph === 'deal' ? !!(G.qvAt && G.qvAt.get(nb)) : !!G.qv;
    if (!tkOn() || !K || (G.ph !== 'vote' && G.ph !== 'deal') || G.inFinale || qv || X.cur) return;
    if ((G.bdone || 0) < K.after || X.n >= K.perGame || X.offered >= K.offers || nb - X.lastBn < K.gap) return;
    const ps = active(); if (ps.length < 2) return;
    // primatelj: čovjek, spojen, još nije dobio ponudu, može platiti gubitak
    const fs = ps.filter((p) => !p.bot && !X.got[p.pid] && p.score >= K.loss);
    if (!fs.length) return;
    if (Math.random() >= K.chance) return;
    const opts = [];
    for (const f of fs) for (const t of ps) if (t !== f && !tkTied(f, t)) { const w = tkWhy(f, t); opts.push({ f, t, w }); }
    if (!opts.length) return;
    const best = Math.max(...opts.map((x) => x.w.w)), top = opts.filter((x) => x.w.w === best), c = top[rnd(top.length)];
    const nn = c.w.n || 0, a10 = nn % 100, b10 = a10 % 10, map = { X: c.t.name, K: nn + (b10 >= 2 && b10 <= 4 && (a10 < 12 || a10 > 14) ? ' točna' : ' točnih') };
    X.cur = { id: ++X.seq, f: c.f.pid, t: c.t.pid, s: G.s, bn: G.bn, k: c.w.k, n: c.w.n || 0, win: K.win, loss: K.loss, st: 'OFFERED',
      line: TK_LINE[c.w.k].replace(/\{(\w)\}/g, (_, k) => (map[k] != null ? map[k] : '')) };
    X.got[c.f.pid] = 1; X.offered++; X.lastBn = nb;
    onChange();
  }
  // glasanje je gotovo: neodgovorena ponuda je odbijena (istekla); prihvaćena se zaključava za pitanje koje tek slijedi
  function tkLock() {
    const o = G.tk && G.tk.cur; if (!o) return;
    if (o.st === 'OFFERED') { tkSet(o, 'EXPIRED'); tkDone(o); }
  }
  function tkAction(p, a) {
    const o = G.tk.cur;
    if (!tkOn() || !o || typeof a.id !== 'number' || a.id !== o.id || o.f !== p.pid || o.st !== 'OFFERED') return false;
    if ((G.ph !== 'vote' && G.ph !== 'deal') || now() >= G.endsAt) return false;
    if (a.k === 'tkAccept') {
      const t = R.get(o.t);
      if (!t || G.tk.n >= cfg.tk.perGame || p.score < o.loss || tkTied(p, t)) { tkSet(o, 'CANCELLED'); tkDone(o); return true; }
      tkSet(o, 'ACCEPTED'); G.tk.n++; return true;
    }
    if (a.k === 'tkDecline') { tkSet(o, 'DECLINED'); tkDone(o); return true; }
    return false;
  }
  function tkGone(p) { const o = G.tk && G.tk.cur; if (o && o.st === 'ACCEPTED' && o.t === p.pid && !(p.ans >= 0 && G.ph === 'question')) o.off = 1; }
  // nakon redovnog bodovanja: pogrešno ili bez odgovora = dobitak; točno = gubitak; meta bez odgovora i bez veze = poništeno
  function tkResolve() {
    G.tk.res = null;
    for (const p of list()) p.tb = 0;
    const o = G.tk.cur;
    if (!o || o.st !== 'ACCEPTED') return;
    const F0 = R.get(o.f), T0 = R.get(o.t);
    const res = { id: o.id, f: o.f, t: o.t, k: 'off', d: 0, why: o.k, n: o.n };
    if (!F0 || !T0 || G.qv || (T0.ans < 0 && (o.off || !T0.on))) tkSet(o, 'CANCELLED');
    else {
      tkSet(o, 'SETTLED');
      if (T0.ans === G.q.a) { const d = Math.min(o.loss, Math.max(0, F0.score)); F0.score -= d; res.k = 'lose'; res.d = -d; }
      else { F0.score += o.win; res.k = 'win'; res.d = o.win; res.to = T0.ans < 0 ? 1 : 0; }
      F0.tb = res.d;
    }
    tkDone(o);
    G.tk.res = res;
    TD.onTk(res);
  }
  // privatno: samo primatelj vidi ponudu i svoju zaključanu okladu
  function tkPriv(p) {
    if (!tkOn() || !p) return null;
    const o = G.tk.cur;
    if (!o || o.f !== p.pid) return null;
    const t = R.get(o.t);
    const r = { id: o.id, t: o.t, x: t ? t.name : '?', line: o.line, win: o.win, loss: o.loss, st: o.st === 'OFFERED' ? 'o' : 'a' };
    if (o.st === 'OFFERED') { r.ms = Math.max(0, G.endsAt - now()); r.dur = G.dur; }
    return r;
  }
  // ===================== TAVERN SOCIAL FLOW 2.0 =====================
  const sfOn = () => !!(cfg.sf && cfg.sf.on);
  const bsOn = () => !!G.opt.bs;   // testni način: botovi sudjeluju u paktovima (izričito uključen u predvorju)
  // dok se odgovara (pitanje, mini-igra, dvoboj, tajni događaj) nema slanja ni prihvaćanja ponuda
  const SF_BUSY = { question: 1, fq: 1, duel: 1, sort: 1, link: 1, order: 1, hilo: 1, blitz: 1, maj: 1, secret: 1, secret2: 1 };
  const sfPeople = () => list().filter((p) => !p.bot || bsOn());
  const sfBusy = (p) => (G.ph === 'duel' || G.ph === 'rope' ? !!(G.du && p && (p.pid === G.du.a || p.pid === G.du.b)) : !!SF_BUSY[G.ph]);
  let botCall = false;
  function botPact(b, a) { botCall = true; try { return pactAction(b.pid, a); } finally { botCall = false; } }
  const SF_LINES = ['🍻 Vrijeme je da vidimo tko s kim pije, a tko kome radi iza leđa!', '🍻 Krčmar briše šank i pravi se da ništa ne čuje…', '🍻 Krigle gore — i uši otvorene!'];
  function sfReset() {
    G.dealN = 0; G.dealI = 0; G.dl = null; G.sfSeq = G.sfSeq || 0; G.scn = null; G.prof = {};
    // profili botova: raznoliki (krug izmiješanih profila), samo u testnom načinu
    for (const p of list()) p.sfLoyal = 0;
    if (bsOn()) { const P = shuffle(['loyal', 'sly', 'wild']); list().filter((p) => p.bot).forEach((b, i) => { G.prof[b.pid] = P[i % P.length]; }); }
  }
  function sfWhisper(p, c) {
    const mate = partnerOf(p);
    if (!mate || G.ph !== 'question' || p.whS === G.s || !isInt(c) || !G.q || c < 0 || c >= G.q.o.length) return false;
    p.whS = G.s; mate.wh = { from: p.pid, c, s: G.s }; return true;
  }
  // ima li stvarne društvene odluke (inače se faza ne otvara)
  function sfRelevant() {
    const hs = list().filter((p) => !p.bot && p.on);
    if (!hs.length) return false;
    if (pactsOn() && G.qn >= cfg.pactAfter && sfPeople().length >= cfg.pactMin) {
      if (hs.some((h) => pactOf(h))) return true;                                            // odluka o odanosti/izdaji
      if (G.offers.some((o) => !o.ghost && hs.some((h) => h.pid === o.to))) return true;     // ponuda čeka odgovor
      if (hs.some((h) => pactFree(h) && h.offersMade < cfg.pactOffersMax && sfPeople().some((q) => q !== h && q.on && pactFree(q)))) return true;
    }
    if (rcOn() && !G.rc.act && G.rc.n < cfg.rcMax && G.qn >= cfg.rcAfter) {
      if (G.rc.offers.length) return true;
      const can = hs.filter((h) => !h.rcWon && (h.rcSent || 0) < cfg.rcSends && h.score >= cfg.rcStake);
      if (can.some((h) => list().some((q) => q !== h && !q.bot && q.on && q.score >= cfg.rcStake))) return true;
    }
    return false;
  }
  // otvara Vrijeme za dogovore kad je na redu (po rasporedu); vraća true ako je faza počela
  function sfDeal() {
    if (!sfOn() || G.inFinale) return false;
    const at = bsOn() ? cfg.sf.atBot : cfg.sf.at, done = G.bdone || 0;
    let due = false;
    while (G.dealI < at.length && at[G.dealI] <= done) { G.dealI++; due = true; }
    if (!due || !sfRelevant()) return false;
    G.dealN++;
    const solo = bsOn() && list().filter((p) => !p.bot && p.on).length === 1;
    G.dl = { n: G.dealN, solo: solo ? 1 : 0, line: SF_LINES[(G.dealN - 1) % SF_LINES.length] };
    setPhase('deal', solo ? cfg.sf.soloMax : cfg.sf.dur);
    const s0 = G.s;
    sfBotsDeal();
    for (const p of list()) if (p.bot) p.done = true;
    tkOffer();
    if (G.s === s0 && allDone()) { endPhase(); return true; }
    onChange();
    return true;
  }
  function sfExpireQ() {
    if (!sfOn()) return;
    const n = G.bdone || 0, q = cfg.sf.offerQ || 2;
    let any = false;
    for (const o of G.offers) if (n - (o.bq || 0) >= q) { o.until = 0; any = true; }
    for (const o of G.rc.offers) if (n - (o.bq || 0) >= q) { o.until = 0; any = true; }
    if (any) { cleanOffers(); rcClean(); }
  }
  // kraj faze: istječu ponude koje su čekale cijelo jedno Vrijeme za dogovore (pakt i obračun); izdaje ostaju zaključane
  function afterDeal() {
    const n = G.dealN;
    for (const o of G.offers) if ((o.born || 0) < n) o.until = 0;
    cleanOffers();
    for (const o of G.rc.offers) if ((o.born || 0) < n) o.until = 0;
    rcClean();
    G.dl = null;
    startVote0();
  }
  // ----- botovi u testnom načinu: iste radnje kao ljudi (pactAction), odluke po profilu -----
  const profOf = (b) => cfg.sf.prof[G.prof[b.pid] || 'wild'] || cfg.sf.prof.wild;
  function sfBotAnswer(b) {
    // odgovor na dolazne ponude: profil, osim ako testni scenarij kaže drukčije (samo za ponude onoga tko je scenarij zadao)
    for (const o of G.offers.filter((x) => x.to === b.pid && !x.ghost)) {
      const sc = G.scn && G.scn.pid === o.from && (G.scn.k === 'accept' || G.scn.k === 'decline') ? G.scn.k : null;
      const yes = sc ? sc === 'accept' : Math.random() < profOf(b).acc;
      if (sc) G.scn = null;
      botPact(b, { k: yes ? 'accept' : 'decline', from: o.from });
      if (b.pact) break;
    }
  }
  function sfBotsDeal() {
    if (!bsOn() || !pactsOn()) return;
    for (const b of shuffle(list().filter((p) => p.bot && p.on))) {
      sfBotAnswer(b);
      const k = pactOf(b), pr = profOf(b);
      if (k) {
        // izdaja se odlučuje SADA (prije pitanja), bez ikakvog znanja o pitanju koje dolazi
        const sc = G.scn && k && (G.scn.k === 'betray' || G.scn.k === 'double' || G.scn.k === 'loyal') && (k.a === G.scn.pid || k.b === G.scn.pid) ? G.scn.k : null;
        const bt = sc ? sc !== 'loyal' : !b.sfLoyal && k.tre >= cfg.sf.btMin && Math.random() < pr.bt;
        if (sc === 'loyal') b.sfLoyal = 1;
        const okBt = botPact(b, { k: 'betray', on: bt });
        if (sc && sc !== 'loyal' && okBt) G.scn = null;
        continue;
      }
      sfBotOffer(b, Math.random() < pr.off);
    }
  }
  function sfBotOffer(b, want) {
    if (!pactFree(b) || G.offers.some((o) => o.from === b.pid) || !pactWindow()) return false;
    const sc = G.scn && G.scn.k === 'offer' ? R.get(G.scn.pid) : null;
    if (!want && !sc) return false;
    let ts = sfPeople().filter((q) => q !== b && q.on && pactFree(q));
    if (sc) ts = ts.filter((q) => q === sc);
    if (!ts.length) return false;
    const hs = ts.filter((q) => !q.bot), t = pick(hs.length && Math.random() < 0.75 ? hs : ts);
    const ok = botPact(b, { k: 'offer', to: t.pid });
    if (ok && sc) G.scn = null;
    return ok;
  }
  // ponuda botu izvan Vremena za dogovore: bot odgovori nakon kratke "razmišljanja" (samo u mirnim fazama)
  function sfBotSoon() { if (bsOn() && (!SF_BUSY[G.ph] || G.ph === 'duel')) { const s0 = G.s; later(() => { if (G.s === s0 && !SF_BUSY[G.ph]) { for (const b of list().filter((p) => p.bot && p.on)) sfBotAnswer(b); onChange(); } }, Math.max(50, Math.min(1200 + rnd(1500), G.dur - 150))); } }
  // na početku svake mirne faze: botovi odgovore na ponude koje čekaju; scenarij "bot mi šalje ponudu" se izvrši čim je dopušteno
  function sfBotsTick() {
    if (!bsOn() || !pactsOn() || SF_BUSY[G.ph] || G.ph === 'lobby' || G.ph === 'final') return;
    if (G.offers.some((o) => !o.ghost && R.get(o.to) && R.get(o.to).bot)) sfBotSoon();
    if (G.scn && G.scn.k === 'offer') { const b = list().find((p) => p.bot && p.on && pactFree(p) && !G.offers.some((o) => o.from === p.pid)); if (b && sfBotOffer(b, false)) onChange(); }
  }
  // šapat bota: ISTI odgovor koji je bot upravo zaključao (vlastita "procjena", može biti pogrešna); nikad naknadno
  function sfBotWhisper(b) {
    if (!bsOn() || !partnerOf(b) || b.ans < 0) return;
    const sc = G.scn && G.scn.k === 'whisper' && partnerOf(b).pid === G.scn.pid;
    if (sc || Math.random() < profOf(b).wh) { if (sfWhisper(b, b.ans) && sc) G.scn = null; }
  }
  // ----- testni scenariji: samo lokalni domaćin (nije dostupno preko mreže), samo u testnom načinu; postavljaju SLJEDEĆI
  // valjan događaj kroz ista pravila (nikad ne mijenjaju bodove ni ishode izravno) -----
  function sfScenario(pid, k) {
    const p = R.get(pid);
    if (!bsOn() || !pactsOn() || !p || p.bot) return { ok: 0, msg: 'Testni scenariji rade samo u testnom načinu s botovima.' };
    if (G.ph === 'lobby' || G.ph === 'final' || G.inFinale) return { ok: 0, msg: 'Scenariji su dostupni tijekom regularnog dijela partije.' };
    const mate = partnerOf(p), botMate = mate && mate.bot;
    const left = (bsOn() ? cfg.sf.atBot : cfg.sf.at).slice(G.dealI).length;
    const K = cfg.kr, when = (n) => ((G.bdone || 0) < n ? ' (od ' + n + '. odigranog pitanja)' : ' (na sljedećoj ploči bodova)');
    switch (k) {
      case 'krpact':
        if (!krFree(p)) return { ok: 0, msg: p.pact ? 'Već imaš pakt.' : 'Već si imao pakt u ovoj partiji (jedan po partiji).' };
        if (!list().some((b) => b.bot && krFree(b))) return { ok: 0, msg: 'Nema slobodnog bota za pakt.' };
        if (G.kpN >= K.pactOffers) return { ok: 0, msg: 'Krčmar je u ovoj partiji već ponudio sve paktove.' };
        G.scn = { k, pid }; return { ok: 1, msg: 'Krčmar će ti ponuditi pakt s botom' + when(K.pactFrom) + ' — bot će prihvatiti.' };
      case 'challenge':
        if (G.lcDone) return { ok: 0, msg: 'Izazov vođi već je bio u ovoj partiji (jednom po partiji).' };
        G.scn = { k, pid }; return { ok: 1, msg: 'Krčmar će te pitati da izazoveš vođu' + when(K.chFrom) + '.' };
      case 'task': case 'fav':
        if (k === 'task' && (p.kt || p.koGot.task)) return { ok: 0, msg: 'Tajni zadatak već si dobio u ovoj partiji.' };
        if (k === 'fav' && (p.kf || p.koGot.fav)) return { ok: 0, msg: 'Uslugu već si dobio u ovoj partiji.' };
        G.scn = { k, pid }; return { ok: 1, msg: 'Krčmar će ti ponuditi ' + (k === 'task' ? 'tajni zadatak' : 'uslugu (biraš kategoriju)') + when(K.offFrom) + '.' };
      case 'betray':
        if (!botMate) return { ok: 0, msg: 'Prvo sklopi pakt s botom (scenarij „Krčmar mi nudi pakt s botom”).' };
        mate.sfLoyal = 0; G.scn = { k, pid };
        return { ok: 1, msg: mate.name + ' će potajno pripremiti izdaju na sljedećoj ploči bodova' + ((pactOf(p).n || 0) < (cfg.pactMinQ || 0) ? ' (kad prođu 2 zajednička pitanja)' : '') + '.' };
      case 'offer':
        if (!pactFree(p)) return { ok: 0, msg: p.pact ? 'Već imaš pakt — scenarij treba igrača bez pakta.' : 'Već si imao pakt u ovoj partiji (jedan po partiji).' };
        if (!list().some((b) => b.bot && b.on && pactFree(b))) return { ok: 0, msg: 'Nema slobodnog bota (svi su već u paktu).' };
        G.scn = { k, pid }; sfBotsTick();
        if (!G.scn) return { ok: 1, msg: 'Bot ti je upravo ponudio pakt — pogledaj Tajni kutak.' };
        return { ok: 1, msg: G.qn < cfg.pactAfter ? 'Bot će ti ponuditi pakt kad paktovi postanu dostupni (od ' + cfg.pactAfter + '. pitanja).' : 'Bot će ti ponuditi pakt čim to pravila dopuste (između pitanja).' };
      case 'accept': case 'decline':
        if (!pactFree(p)) return { ok: 0, msg: 'Za ovaj scenarij ne smiješ već imati pakt.' };
        G.scn = { k, pid }; return { ok: 1, msg: 'Sada u Tajnom kutku ponudi pakt botu — ' + (k === 'accept' ? 'prihvatit će ga.' : 'odbit će ga.') };
      case 'whisper':
        return { ok: 0, msg: 'Šaputanje je uklonjeno iz igre.' };
        if (!botMate) return { ok: 0, msg: 'Prvo sklopi pakt s botom (Tajni kutak → ponudi savez).' };
        G.scn = { k, pid }; return { ok: 1, msg: mate.name + ' će ti šapnuti svoj odgovor na sljedećem pitanju.' };
      case 'betray': case 'double': case 'loyal':
        if (!botMate) return { ok: 0, msg: 'Prvo sklopi pakt s botom (Tajni kutak → ponudi savez).' };
        if (k === 'loyal') { mate.sfLoyal = 1; mate.betray = false; return { ok: 1, msg: mate.name + ' ostaje odan do kraja (osim ako ti izdaš).' }; }
        if (!left && G.ph !== 'deal') return { ok: 0, msg: 'U ovoj partiji više nema Vremena za dogovore prije finala.' };
        G.scn = { k, pid };
        if (G.ph === 'deal') { mate.sfLoyal = 0; if (botPact(mate, { k: 'betray', on: true })) G.scn = null; }
        return { ok: 1, msg: (G.ph === 'deal' ? mate.name + ' je upravo potajno pripremio izdaju.' : mate.name + ' će pripremiti izdaju u sljedećem Vremenu za dogovore.') + (k === 'double' ? ' Pripremi i ti izdaju u Tajnom kutku.' : '') };
    }
    return { ok: 0, msg: 'Nepoznat scenarij.' };
  }
  // ===================== KRČMAR 2.0 =====================
  // ploča bodova nakon pitanja: animacija (rb) pa čekanje da svi dodirnu Nastavi
  function krBotsBoard() {
    if (!bsOn() || !pactsOn()) return;
    for (const b of list().filter((p) => p.bot && p.on && p.pact)) {
      const k = pactOf(b); if (!k || (k.n || 0) < (cfg.pactMinQ || 0)) continue;
      const sc = G.scn && G.scn.k === 'betray' && (k.a === G.scn.pid || k.b === G.scn.pid);
      if (sc) { if (botPact(b, { k: 'betray', on: true })) G.scn = null; continue; }
      if (b.sfLoyal || b.betray) continue;
      if (k.tre >= cfg.sf.btMin && Math.random() < (cfg.sf.prof[G.prof[b.pid] || 'wild'] || cfg.sf.prof.wild).bt / 3) botPact(b, { k: 'betray', on: true });
    }
  }
  function krRevealStart(rb) {
    krBotsBoard();
    G.revMin = G.startedAt + Math.round(rb * 1000);
    for (const p of list()) if (p.bot) p.done = true;
    const s0 = G.s;
    later(() => { if (G.s === s0 && krReady()) endPhase(); }, Math.round(rb * 1000) + 30);
    if (G.lc && G.lc.st === 'o') later(() => { if (G.s === s0 && G.lc && G.lc.st === 'o') { G.lc.st = 'n'; G.lc.auto = 1; if (krReady()) endPhase(); else onChange(); } }, Math.round((rb + cfg.kr.chWait) * 1000));
    onChange();
  }
  // može li igrač potvrditi Nastavi (kasnije: tko ima otvorenu odluku krčmara, prvo odlučuje)
  function krCanGo(p) { return !(G.lc && G.lc.st === 'o' && G.lc.a === p.pid) && !(p.ko && p.ko.st === 'o') && !(G.kp && G.kp.st === 'o' && (G.kp.a === p.pid || G.kp.b === p.pid) && G.kp.ans[p.pid] == null); }
  // ----- krčmarove ponude -----
  function krOfferMaybe() {
    const K = cfg.kr;
    for (const p of list()) p.ko = null;
    if (G.inFinale || (G.kp && G.kp.st === 'o') || G.koN >= K.offMax || (G.bdone || 0) < K.offFrom) return;
    const forced = G.scn && (G.scn.k === 'task' || G.scn.k === 'fav') ? G.scn : null;
    if (!forced && Math.random() >= K.offChance) return;
    const ps = active(), lead = ps.slice().sort((a, b) => b.score - a.score)[0];
    const cand = [];
    for (const p of ps.filter((x) => !x.bot)) {
      if (forced && p.pid !== forced.pid) continue;
      if (!p.kt && !p.koGot.task && (!forced || forced.k === 'task')) cand.push([p, 'task']);
      if (!p.kf && !p.koGot.fav && p !== lead && (!forced || forced.k === 'fav')) cand.push([p, 'fav']);
    }
    if (!cand.length) return;
    if (forced) G.scn = null;
    const [p, k] = pick(cand);
    p.koGot[k] = 1; G.koN++;
    if (k === 'fav') { p.ko = { id: ++G.sfSeq, k, st: 'o', line: 'Sljedeću kategoriju biraš ti — tvoj glas tajno odlučuje.' }; return; }
    // zadatak: 3 točna zaredom ili brži točan odgovor od vođe (vođi: od drugog) na sljedećem pitanju
    const others = ps.filter((x) => x !== p).sort((a, b) => b.score - a.score), vs = others[0];
    const kind = vs && Math.random() < 0.5 ? 'fast' : 'st3';
    const line = kind === 'st3' ? 'Odgovori točno na sljedeća 3 pitanja zaredom.' : 'Na sljedećem pitanju odgovori točno i brže od: ' + vs.name + '.';
    p.ko = { id: ++G.sfSeq, k, st: 'o', kind, vs: kind === 'fast' ? vs.pid : null, line, win: K.taskWin, loss: K.taskLoss };
  }
  function krOfferAnswer(p, yes) {
    const o = p.ko;
    if (!o || o.st !== 'o' || G.ph !== 'reveal') return false;
    o.st = yes ? 'a' : 'n';
    if (yes && o.k === 'fav') p.kf = 1;
    if (yes && o.k === 'task') p.kt = { kind: o.kind, vs: o.vs, n: 0, line: o.line, win: o.win, loss: o.loss, from: G.bdone || 0 };
    return true;
  }
  function krOfferEnd() { for (const p of list()) if (p.ko && p.ko.st === 'o') p.ko.st = 'n'; }
  // obračun zadataka nakon redovnog bodovanja pitanja (samo pitanja nakon prihvaćanja)
  function krTaskSettle() {
    for (const p of list()) p.kb = 0;
    for (const p of list()) {
      const t = p.kt; if (!t || (G.bdone || 0) <= t.from) continue;
      if (!p.on && p.ans < 0) { p.kt = null; note(p, '📜 Zadatak je poništen (prekid veze).', 'no'); continue; }
      const right = p.ans === G.q.a;
      let done = null;
      if (t.kind === 'st3') { if (!right) done = false; else if (++t.n >= 3) done = true; }
      else { const X = R.get(t.vs); done = right && (!X || X.ans !== G.q.a || p.ansMs < X.ansMs); }
      if (done === null) continue;
      p.kt = null;
      if (done) { p.score += t.win; p.kb = t.win; note(p, '📜 Zadatak izvršen! +' + t.win, 'tre'); }
      else { const d = Math.min(t.loss, Math.max(0, p.score)); p.score -= d; p.kb = -d; note(p, '📜 Zadatak nije uspio. −' + d, 'no'); }
    }
  }
  function krOfferPriv(p) {
    const r = {};
    if (p.ko && p.ko.st === 'o' && G.ph === 'reveal') r.ko = { id: p.ko.id, k: p.ko.k, line: p.ko.line, win: p.ko.win, loss: p.ko.loss };
    if (p.kt) r.kt = { line: p.kt.line, n: p.kt.n, kind: p.kt.kind, win: p.kt.win };
    if (p.kf) r.kf = 1;
    if (p.okl && !G.inFinale && (G.ph === 'cast' || G.ph === 'question')) r.okl = p.okl;
    if (p.okr && G.ph === 'reveal') r.okr = p.okr;
    return r;
  }
  // ----- izazov vođi -----
  function krChallengeMaybe() {
    const K = cfg.kr; G.lc = null;
    if (G.lcDone || G.inFinale || (G.bdone || 0) < K.chFrom || (G.kp && G.kp.st === 'o') || list().some((p) => p.ko && p.ko.st === 'o')) return;
    if (!plan.slice(G.pi + 1).some((it) => it.t === 'battle')) return;   // mora postojati još pitanja nakon izazova
    const ps = active().slice().sort((a, b) => b.score - a.score);
    if (ps.length < 2) return;
    const forced = G.scn && G.scn.k === 'challenge';
    let B = ps[0], A = ps[ps.length - 1];
    if (forced) { A = R.get(G.scn.pid); B = ps[0] !== A ? ps[0] : ps[1]; }
    if (!A || A.bot || A === B || (!forced && B.score - A.score < K.chGap)) return;
    if (forced) G.scn = null;
    G.lcDone = true;
    G.lc = { id: ++G.sfSeq, a: A.pid, b: B.pid, st: 'o', sa: K.chStakeA, sb: K.chStakeB, g: K.chGuard };
  }
  function krChallengeAnswer(p, yes) {
    const o = G.lc;
    if (!o || o.st !== 'o' || G.ph !== 'reveal' || o.a !== p.pid) return false;
    o.st = yes ? 'y' : 'n';
    return true;
  }
  function krChallengeEnd() {
    const o = G.lc; if (!o) return;
    if (o.st === 'o') o.st = 'n';
    if (o.st === 'y') G.pend = Object.assign(G.pend || {}, { duel: [o.a, o.b], rope: 1 });
  }
  function startRope() {
    const set = G.used.tf, list0 = [];
    for (let i = 0; i < cfg.kr.ropeN && i < D.tf.length; i++) { const t = D.tf[unusedIndex(D.tf, set)]; list0.push([t[0], t[1] ? 1 : 0]); }
    G.rp = { list: list0, pa: 0, pb: 0 };
    for (const p of list()) p.rpA = null;
    setPhase('rope', cfg.kr.rope);
    for (const p of list()) if (p.pid !== G.du.a && p.pid !== G.du.b) p.done = true;
    // bot u dvoboju: odgovara redom, ~72 % točno (isto kao u munjevitom krugu)
    for (const id of [G.du.a, G.du.b]) {
      const b = R.get(id); if (!b || !b.bot) continue;
      const s0 = G.s, r = [];
      const step = () => { if (G.s !== s0 || r.length >= G.rp.list.length) return; r.push(Math.random() < 0.72 ? G.rp.list[r.length][1] : 1 - G.rp.list[r.length][1]); accept(b, { s: s0, r: r.slice() }); later(step, 900 + rnd(700)); };
      later(step, 1200 + rnd(600));
    }
  }
  function ropeTally() {
    const L0 = G.rp.list, f = (p) => { const a = (p && p.rpA) || []; let n = 0; a.forEach((x, i) => { n += x === L0[i][1] ? 1 : -1; }); return n; };
    G.rp.pa = f(R.get(G.du.a)); G.rp.pb = f(R.get(G.du.b));
  }
  function scoreRope() {
    ropeTally();
    const A = R.get(G.du.a), B = R.get(G.du.b), K = cfg.kr, d = G.rp.pa - G.rp.pb;
    G.du.w = d > 0 ? G.du.a : d < 0 ? G.du.b : null; G.du.bonus = 0; G.du.ms = null;
    G.du.rr = { pa: G.rp.pa, pb: G.rp.pb, t: 0, g: 0 };
    if (A && B && G.du.w === G.du.a) { const t = Math.min(K.chStakeB, Math.max(0, B.score)); B.score -= t; A.score += t; G.du.rr.t = t; }
    else if (A && B && G.du.w === G.du.b) { const t = Math.min(K.chStakeA, Math.max(0, A.score)); A.score -= t; B.score += t + K.chGuard; G.du.rr.t = t; G.du.rr.g = K.chGuard; }
    G.du.o = TD.duelOut(G.du.w, G.du.a, G.du.b);
    setPhase('duelResult', cfg.duelRes + 1);
  }
  const krFree = (p) => !!p && p.on && (!p.bot || bsOn()) && !p.pact && !p.pactUsed;
  // nakon obračuna pitanja: možda ponuda pakta za dvojicu (nasumično; samo podaci partije, nikad pitanje)
  function krPactMaybe() {
    G.kp = null;
    const K = cfg.kr;
    if (!pactsOn() || G.inFinale || G.kpN >= K.pactOffers || (G.bdone || 0) < K.pactFrom) return;
    if (sfPeople().length < K.pactMin) return;
    const c = list().filter(krFree);
    if (!c.some((p) => !p.bot) || c.length < 2) return;
    const forced = G.scn && G.scn.k === 'krpact';
    if (!forced && Math.random() >= K.pactChance) return;
    const hs = c.filter((p) => !p.bot);
    const A = forced ? R.get(G.scn.pid) : pick(hs), rest = c.filter((p) => p !== A);
    if (!A || !krFree(A) || !rest.length) return;
    const B = pick(forced ? rest.filter((p) => p.bot).concat(rest).slice(0, 1) : rest);
    if (forced) G.scn = null;
    G.kpN++;
    G.kp = { id: ++G.sfSeq, a: A.pid, b: B.pid, st: 'o', ans: {} };
    for (const p of [A, B]) if (p.bot) G.kp.ans[p.pid] = forced ? 1 : Math.random() < (cfg.sf.prof[G.prof[p.pid] || 'wild'] || cfg.sf.prof.wild).acc ? 1 : 0;
  }
  function krPactAnswer(p, yes) {
    const o = G.kp;
    if (!o || o.st !== 'o' || G.ph !== 'reveal' || (o.a !== p.pid && o.b !== p.pid) || o.ans[p.pid] != null) return false;
    o.ans[p.pid] = yes ? 1 : 0;
    krPactSettle(false);
    return true;
  }
  // kad su oba odgovorila (ili ploča završi): sklopi ili odustani
  function krPactSettle(end) {
    const o = G.kp; if (!o || o.st !== 'o') return;
    const A = R.get(o.a), B = R.get(o.b), ya = o.ans[o.a], yb = o.ans[o.b];
    if (ya === 0 || yb === 0 || end || !A || !B) {
      if (ya === 1 && yb === 1 && A && B) return krPactMake(o, A, B);
      o.st = 'x';
      for (const q of [A, B]) if (q && o.ans[q.pid] === 1) note(q, '🍺 Krčmar je odustao od ponude.', 'no');
      return;
    }
    if (ya === 1 && yb === 1) krPactMake(o, A, B);
  }
  function krPactMake(o, A, B) {
    o.st = 'y';
    if (!krFree(A) || !krFree(B)) { o.st = 'x'; return; }
    const k = { id: 'k' + (++pactSeq), a: A.pid, b: B.pid, tre: 0, on: true, since: G.qn, rich: false, n: 0 };
    G.pacts.push(k);
    for (const q of [A, B]) { q.pact = k.id; q.pactUsed = true; q.betray = false; q.wh = null; }
    note(A, '🍻 Pakt s ' + B.name + ' je sklopljen!', 'pact'); note(B, '🍻 Pakt s ' + A.name + ' je sklopljen!', 'pact');
    news(pickLine('rumor'));
  }
  const krReady = () => G.ph === 'reveal' && G.revMin && now() >= G.revMin && allDone();
  const humansIn = () => list().filter((p) => !p.bot);
  const pactOf = (p) => (p && p.pact ? G.pacts.find((x) => x.id === p.pact && x.on) : null);
  const partnerOf = (p) => { const k = pactOf(p); return k ? R.get(k.a === p.pid ? k.b : k.a) : null; };
  // može li igrač sudjelovati u novom paktu
  function pactFree(p) { return !!p && (!p.bot || bsOn()) && !p.pactUsed && !p.pact; }
  function pactWindow() {
    return pactsOn() && !G.inFinale && G.ph !== 'lobby' && G.ph !== 'final' && G.qn >= cfg.pactAfter && sfPeople().length >= cfg.pactMin && (!sfOn() || !SF_BUSY[G.ph] || G.ph === 'duel');
  }
  function pactReset() {
    G.kp = null; G.kpN = 0; G.koN = 0; G.lc = null; G.lcDone = false;
    for (const p of list()) { p.ko = null; p.kt = null; p.kf = 0; p.kb = 0; p.koGot = {}; }
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
    if (!p || (p.bot && !(botCall && bsOn())) || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;
    if (sfOn() && sfBusy(p) && a.k !== 'whisper' && a.k.slice(0, 2) !== 'tk') return false;   // nitko ne odlučuje dok odgovara
    if (a.k === 'krCh') { const r = krChallengeAnswer(p, !!a.yes); if (r) { if (krReady()) endPhase(); else onChange(); } return r; }
    if (a.k === 'krOff') { const r = krOfferAnswer(p, !!a.yes); if (r) { if (krReady()) endPhase(); else onChange(); } return r; }
    if (a.k === 'krPact') { const r = krPactAnswer(p, !!a.yes); if (r) { if (krReady()) endPhase(); else onChange(); } return r; }
    if (a.k === 'offer' || a.k === 'accept' || a.k === 'decline' || a.k === 'cancel' || a.k.slice(0, 2) === 'rc' || a.k.slice(0, 2) === 'tk') return false;
    if (a.k === 'tkAccept' || a.k === 'tkDecline') { const r = tkAction(p, a); if (r) { if (G.ph === 'vote' && allDone()) endPhase(); else onChange(); } return r; }
    if (a.k.slice(0, 2) === 'rc') { const r = rcAction(p, a); if (r) onChange(); return r; }
    cleanOffers();
    let ok = false;
    switch (a.k) {
      case 'offer': {
        const t = R.get(a.to);
        if (!pactWindow() || !pactFree(p) || !t || t === p || (t.bot && !bsOn())) break;
        if (p.offersMade >= cfg.pactOffersMax || G.offers.some((o) => o.from === pid)) break;
        // zauzet igrač (u paktu, već imao pakt ili ima drugu ponudu): ponuda tiho istekne, ponuditelj ne saznaje zašto
        const ghost = !pactFree(t) || G.offers.filter((o) => o.to === t.pid && !o.ghost).length >= (sfOn() ? cfg.sf.inMax : 1);
        G.offers.push({ id: ++G.sfSeq, from: pid, to: t.pid, until: sfOn() ? Infinity : now() + cfg.pactOffer * 1000, born: G.dealN || 0, bq: G.bdone || 0, ghost });
        if (t.bot && !ghost) sfBotSoon();
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
        break;   // šaputanje je uklonjeno
        const mate = partnerOf(p);
        if (!mate || G.ph !== 'question' || p.whS === G.s || !isInt(a.c) || !G.q || a.c < 0 || a.c >= G.q.o.length) break;
        p.whS = G.s; mate.wh = { from: pid, c: a.c, s: G.s }; ok = true; break;
      }
      case 'betray': {
        if (!pactOf(p) || (a.on && (pactOf(p).n || 0) < (cfg.pactMinQ || 0)) || (sfOn() ? sfBusy(p) || G.inFinale || G.ph === 'lobby' || G.ph === 'final' : G.ph !== 'question')) break;
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
      const ra = a.ans === G.q.a, rb = b.ans === G.q.a, add = ra && rb ? cfg.pactBonus : ra || rb ? (cfg.pactOne || 0) : 0;
      k.n = (k.n || 0) + 1;   // zajednički odigrana pitanja (za pravilo najmanje pactMinQ prije izdaje)
      if (add) { k.tre += add; k.grew = G.s; note(a, '💰 +' + add + ' u riznicu!', 'tre'); note(b, '💰 +' + add + ' u riznicu!', 'tre'); }
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
        const st = Math.max(0, Math.min(V.score, Math.round(V.score * cfg.pactSteal), cfg.pactStealMax != null ? cfg.pactStealMax : Infinity));
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
    const p = R.get(pid), b0 = priv0(pid), t = p && !p.bot ? tkPriv(p) : null, kp = p && !p.bot ? krPriv(p) : null;
    const ko = p && !p.bot ? krOfferPriv(p) : {}, any = kp || ko.ko || ko.kt || ko.kf || ko.okl || ko.okr;
    const b = any ? Object.assign(b0 || { can: false, used: false, inv: [], out: null, note: p.note }, kp ? { kp } : {}, ko) : b0;
    if (!t) return b;
    return Object.assign(b || { can: false, used: false, inv: [], out: null, note: p.note }, { tk: t });
  }
  function krPriv(p) {
    const o = G.kp;
    if (!o || o.st !== 'o' || G.ph !== 'reveal' || (o.a !== p.pid && o.b !== p.pid)) return null;
    const m = R.get(o.a === p.pid ? o.b : o.a);
    return { id: o.id, m: m ? m.pid : '', x: m ? m.name : '?', ans: o.ans[p.pid] };
  }
  function priv0(pid) {
    const p = R.get(pid);
    if (!p || p.bot || (!pactsOn() && !rcOn())) return null;
    if (!pactsOn()) return Object.assign({ can: false, used: false, inv: [], out: null, note: p.note }, sfOn() ? { sf: 1, dl: G.ph === 'deal' ? 1 : 0 } : {}, rcPriv(p));
    cleanOffers();
    const k = pactOf(p), mate = partnerOf(p);
    const o = {
      can: pactWindow() && pactFree(p) && p.offersMade < cfg.pactOffersMax,
      used: !!p.pactUsed,
      inv: G.offers.filter((x) => x.to === pid && !x.ghost).map((x) => (sfOn() ? { f: x.from, id: x.id, dl: 1 } : { f: x.from, ms: Math.max(0, x.until - now()), dur: cfg.pactOffer * 1000 })),
      out: (G.offers.find((x) => x.from === pid) || null) && (() => { const x = G.offers.find((y) => y.from === pid); return { t: x.to, ms: Math.max(0, x.until - now()) }; })(),
      note: p.note,
    };
    // svi ostali spojeni ljudi (ne otkriva tko je već u paktu)
    o.can = false;   // igrači više ne šalju ponude; pakt nudi krčmar
    if (sfOn()) { o.sf = 1; if (G.ph === 'deal') o.dl = 1; if (bsOn()) o.bs = 1; }
    if (k && mate) {
      o.k = { m: mate.pid, tre: k.tre, grew: k.grew === G.s ? 1 : 0, since: k.since };
      if (G.ph === 'question') o.k.bt = p.betray ? 1 : 0;
      if (sfOn() && G.ph === 'deal') { o.k.bt = p.betray ? 1 : 0; o.k.dl = 1; }
      if (sfOn() && !sfBusy(p) && !G.inFinale && (k.n || 0) >= (cfg.pactMinQ || 0)) { o.k.cb = 1; o.k.bt = p.betray ? 1 : 0; }
      if ((k.n || 0) < (cfg.pactMinQ || 0)) o.k.wait = (cfg.pactMinQ || 0) - (k.n || 0);
      if (sfOn() && p.betray && sfBusy(p)) o.k.btl = 1;   // zaključana pripremljena izdaja (samo vlasnik)
    }
    return Object.assign(o, rcPriv(p));
  }
  function rcPriv(p) {
    if (!rcOn()) return {};
    rcClean();
    const r = { st: cfg.rcStake };
    if (rcCanSend(p)) {
      r.can = 1;
      r.cand = list().filter((q) => rcOk(q, p)).map((q) => ({ id: q.pid, rev: rcRev(p.pid, q.pid) ? 1 : 0, riv: rcRival(p.pid, q.pid) ? 1 : 0 }));
      if (!r.cand.length) delete r.can;
    }
    const inv = G.rc.offers.filter((x) => x.t === p.pid).map((x) => (sfOn() ? { f: x.f, id: x.id, dl: 1, rev: x.rev, riv: x.riv } : { f: x.f, ms: Math.max(0, x.until - now()), dur: cfg.rcOffer * 1000, rev: x.rev, riv: x.riv }));
    if (inv.length) r.inv = inv;
    const out = G.rc.offers.find((x) => x.f === p.pid);
    if (out) r.out = sfOn() ? { t: out.t, dl: 1 } : { t: out.t, ms: Math.max(0, out.until - now()) };
    return { rc: r };
  }
  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'pacts') { G.opt.pacts = !!v; onChange(); } if (k === 'bs') { G.opt.bs = !!v; onChange(); } }

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
        if (!POWERS[k].atk && !POWERS[k].tg) return { s, p: k };
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
      case 'deal': return { s, ok: 1 };
      case 'duel':
      case 'question': case 'fq': {
        const opts = G.q.o.map((_, i) => i).filter((i) => !(b.hide && b.hide.includes(i)));
        const wrong = opts.filter((i) => i !== G.q.a);
        const right = Math.random() < (G.ph === 'fq' ? 0.7 : G.ph === 'duel' ? 0.66 : 0.62) || !wrong.length;
        // primljeni šapat saveznika (stigao prije bototovog odgovora) bot ponekad posluša — kao čovjek; ne zna je li točan
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
      const e = { id: p.pid, n: p.name, a: p.av, sc: p.score, c: p.on ? 1 : 0, ok: p.done && !tkHold(p) ? 1 : 0 };
      if (p.bot) e.b = 1;
      if (p.px && (ph === 'betray' || ph === 'loyal')) e.px = p.px;
      if ((ph === 'vote' && p.done && !tkHold(p)) || (ph === 'voteResult' && p.vote >= 0)) e.vt = p.vote;
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
      if (ph === 'reveal' && p.rx) e.rx = p.rx;
      if (ph === 'reveal' && p.tb) e.tb = p.tb;
      if (ph === 'reveal' && p.kb) e.kb = p.kb;
      if (ph === 'reveal' && p.ob) e.ob = p.ob;
      if (ph === 'reveal' && p.oq) e.oq = p.oq;
      if (ph === 'duelResult' && G.du && (p.pid === G.du.a || p.pid === G.du.b)) e.ch = p.ch;
      return e;
    });
    if (ph === 'intro') v.it = G.intro;
    if (ph === 'deal' && G.dl) v.dl = { n: G.dl.n, solo: G.dl.solo, t: G.dl.line };
    if (bsOn() && G.ph !== 'lobby') v.bs = 1;
    if (ph === 'vote' || ph === 'voteResult') v.cats = G.cats;
    if (ph === 'voteResult') { v.cw = G.cw; v.tie = G.tie; if (G.tb) { v.tb = G.tb; v.rd = Math.round(cfg.roul * 1000); } }
    if (ph === 'bet') { v.cats = G.cats; v.cw = G.cw; }
    if (ph === 'question' || ph === 'reveal' || ph === 'fq' || ph === 'fr') {
      v.q = { c: G.q.c, t: G.q.t, o: G.q.o, n: G.qn };
      if (G.q.k && (ph === 'question' || ph === 'reveal')) { v.q.k = G.q.k; if (G.q.cl) v.q.cl = G.q.cl; }
    }
    if (ph === 'howto' && G.ht) v.ht = Object.assign({ kd: KIND[G.ht.k] || '' }, G.ht, HOWTO[G.ht.k]);
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
    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, bs: G.opt.bs ? 1 : 0 };
    if (G.rc && G.rc.act && G.ph !== 'lobby') v.rc = { a: G.rc.act.a, b: G.rc.act.b, st: G.rc.act.stake, rev: G.rc.act.rev };
    if (ph === 'reveal' && G.rc && G.rc.res) v.rcr = G.rc.res;
    if (ph === 'reveal' && G.tk && G.tk.res) v.tkr = G.tk.res;
    if (ph === 'reveal' && G.lc) v.lc = { a: G.lc.a, b: G.lc.b, st: G.lc.st, sa: G.lc.sa, sb: G.lc.sb, g: G.lc.g };
    if (ph === 'rope' && G.rp) v.rp = { pa: G.rp.pa, pb: G.rp.pb, m: cfg.kr.ropeWin, list: G.rp.list };
    if (ph === 'reveal' && G.revMin) { v.rw = 1; v.rmin = Math.max(0, G.revMin - now()); }
    // posljednji poziv: projekcija samo između pitanja (nikad tijekom odgovaranja)
    if (pactsOn() && G.ph !== 'lobby') v.pk = 1;
    if ((ph === 'reveal' || ph === 'sortReveal' || ph === 'linkReveal' || ph === 'fr') && G.pend && G.pend.mo) v.mo = G.pend.mo;
    if ((ph === 'duelIntro' || ph === 'duel' || ph === 'rope' || ph === 'duelResult') && G.du) {
      v.du = { a: G.du.a, b: G.du.b, bonus: cfg.duelBonus };
      if (G.du.rope) { v.du.rope = 1; v.du.sa = cfg.kr.chStakeA; v.du.sb = cfg.kr.chStakeB; v.du.g = cfg.kr.chGuard; if (G.du.rr) v.du.rr = G.du.rr; }
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
  return { _pact: (a, b) => { const A = R.get(a), B = R.get(b); if (!A || !B || !krFree(A) || !krFree(B)) return false; krPactMake({}, A, B); return true; }, sfScenario, pactAction, priv, setOpt, addPlayer, addBot, setBots, setAvatar, setInput, syncPeers, start, skip, restart, view, stop: clear, _score, _td: () => TD.state, _tdf: () => TD, _p: (pid) => R.get(pid), _pyrUnits: (sc) => pyrUnitsOf(sc), _plan: () => plan.slice(), _G: G };
}
//#engine-end
