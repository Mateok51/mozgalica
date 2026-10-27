# Smart Game Director — raspored posebnih bitaka i izazova (lanac: fc.py → sgd.py)
import subprocess, sys
SP = '/root/mozgalica'
subprocess.run([sys.executable, SP + '/v3/fc.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

rep("  chal: null, chalN: 2, varMax: 2,", """  chal: null, chalN: 2, varMax: 2,
  // Smart Game Director (raspored, nikad ishod): udio mini-igara u regularnom dijelu, početak bez posebnih bitaka (udio),
  // najviše posebnih u zadnjih fcLast, broj posebnih bitaka, pomak izazova unutar runde, slabije ponavljanje iste skupine/vrste, težine vrsta
  sgd: { on: true, share: 0.3, open: 0.2, finalMax: 1, varMin: 1, varMax: 2, moveChal: 0.5, sameCat: 0.35, sameType: 0.1,
    w: { who: 1, emoji: 1, order: 1, hilo: 1, sort: 1, link: 1, blitz: 1, maj: 1 } },""")
rep("const CHALLENGES = ['sort', 'link', 'order', 'hilo', 'blitz', 'maj'];", """const CHALLENGES = ['sort', 'link', 'order', 'hilo', 'blitz', 'maj'];
// skupine izazova po osjećaju igre (Smart Game Director izmjenjuje skupine)
const KIND = { who: 'assoc', emoji: 'assoc', order: 'logic', hilo: 'logic', sort: 'logic', link: 'logic', blitz: 'fast', maj: 'social' };""")
rep("  const plan = o.plan || PLAN;", "  const planBase = (o.plan || PLAN).slice(), plan = planBase.slice();")
rep("""    const nCh = plan.filter((it) => it.t === 'challenge').length;
    const pool = CHALLENGES.filter((k) => (k !== 'maj' || active().length >= 3) && (D[DATA_KEY[k]] || []).length);
    G.chal = (cfg.chal || shuffle(pool)).slice(0, Math.max(nCh, cfg.chal ? cfg.chal.length : 0)); G.ci = 0;
    G.qvAt = new Map();
    const slots = shuffle(Array.from({ length: Math.max(0, nb - 1) }, (_, i) => i + 1)).filter((i) => !G.betAt.has(i));
    const wantV = [['who', cfg.qv ? cfg.qv.who : rnd(cfg.varMax + 1)], ['emoji', cfg.qv ? cfg.qv.emoji : rnd(cfg.varMax + 1)]];
    for (const [k, n] of wantV) for (let j = 0; j < n && slots.length; j++) if ((D[DATA_KEY[k]] || []).length) G.qvAt.set(slots.shift(), k);""", """    const nCh = plan.filter((it) => it.t === 'challenge').length;
    const pool = CHALLENGES.filter((k) => (k !== 'maj' || active().length >= 3) && (D[DATA_KEY[k]] || []).length);
    G.qvAt = new Map(); G.ci = 0;
    if (cfg.sgd && cfg.sgd.on && !cfg.chal && !cfg.qv) sgdPlan(nb, pool);
    else {
      // stari raspored (testovi s točno zadanim izazovima, ili kad je Smart Game Director isključen)
      G.chal = (cfg.chal || shuffle(pool)).slice(0, Math.max(nCh, cfg.chal ? cfg.chal.length : 0));
      const slots = shuffle(Array.from({ length: Math.max(0, nb - 1) }, (_, i) => i + 1)).filter((i) => !G.betAt.has(i));
      const wantV = [['who', cfg.qv ? cfg.qv.who : rnd(cfg.varMax + 1)], ['emoji', cfg.qv ? cfg.qv.emoji : rnd(cfg.varMax + 1)]];
      for (const [k, n] of wantV) for (let j = 0; j < n && slots.length; j++) if ((D[DATA_KEY[k]] || []).length) G.qvAt.set(slots.shift(), k);
    }""")
rep("""  function next() {
    G.pi += 1;""", """  // ===================== SMART GAME DIRECTOR =====================
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
    G.pi += 1;""")
rep("_pyrUnits: (sc) => pyrUnitsOf(sc), _G: G };", "_pyrUnits: (sc) => pyrUnitsOf(sc), _plan: () => plan.slice(), _G: G };")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('SMART GAME DIRECTOR OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# upute znaju skupinu izazova (za kratku najavu na ekranu uputa)
rep("    if (ph === 'howto' && G.ht) v.ht = Object.assign({}, G.ht, HOWTO[G.ht.k]);", "    if (ph === 'howto' && G.ht) v.ht = Object.assign({ kd: KIND[G.ht.k] || '' }, G.ht, HOWTO[G.ht.k]);")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('upute: skupina OK')
