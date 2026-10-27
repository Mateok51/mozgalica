# Krčmar 2.0 (lanac: ux.py → kr.py)
# 1) Uklanja se: ponude između igrača (pakt nudi samo krčmar), Vrijeme za dogovore, rivalski obračun, nametnuti dvoboji rivala,
#    krčmarove tajne oklade. Kod ostaje uspavan (opcije su isključene i ne mogu se uključiti) da se ništa drugo ne poremeti.
import subprocess, sys
SP = '/root/mozgalica'
subprocess.run([sys.executable, SP + '/v3/ux.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---------- 1) uklanjanje ----------
rep("  sf: { on: true, at: [], atBot: [3, 5, 7],", "  sf: { on: true, at: [], atBot: [],")
rep("  ENABLE_DUELS: true,", "  ENABLE_DUELS: false,   // krčmar više ne nameće dvoboje rivalima; dvoboj postoji samo kao izazov vođi")
rep("rc: o.rc !== undefined ? !!o.rc : true, tk: o.tk !== undefined ? !!o.tk : false,", "rc: false, tk: false,")
rep(" if (k === 'rc') { G.opt.rc = !!v; onChange(); } if (k === 'tk') { G.opt.tk = !!v; onChange(); }", "")
rep("    if (o.can) o.cand = sfPeople().filter((q) => q !== p && q.on).map((q) => q.pid);", "    o.can = false;   // igrači više ne šalju ponude; pakt nudi krčmar")
rep("    if (a.k === 'tkAccept' || a.k === 'tkDecline') {",
    "    if (a.k === 'offer' || a.k === 'accept' || a.k === 'decline' || a.k === 'cancel' || a.k.slice(0, 2) === 'rc' || a.k.slice(0, 2) === 'tk') return false;\n"
    "    if (a.k === 'tkAccept' || a.k === 'tkDecline') {")
rep("v.opt = { pacts: G.opt.pacts ? 1 : 0, rc: G.opt.rc ? 1 : 0, tk: G.opt.tk ? 1 : 0, bs: G.opt.bs ? 1 : 0 };", "v.opt = { pacts: G.opt.pacts ? 1 : 0, bs: G.opt.bs ? 1 : 0 };")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR 1 (uklanjanje) OK')

# ---------- 2) ploča bodova: svi dodirnu „Nastavi” prije sljedećeg pitanja ----------
# Otkrivanje teče kao i dosad (Smart Pacing određuje animaciju); nakon toga ploča čeka da svi (ljudi) potvrde.
# Botovi su odmah spremni; nevidljiva sigurnosna granica (cfg.kr.wait) nastavlja ako netko ode od mobitela.
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("  ENABLE_DUELS: false,", "  ENABLE_DUELS: false,")
rep("  sf: { on: true, at: [], atBot: [],", "  // Krčmar 2.0: sigurnosna granica čekanja na ploči bodova (s)\n  kr: { wait: 45 },\n  sf: { on: true, at: [], atBot: [],")
rep("    setPhase('reveal', (pc ? pc.t : cfg.reveal != null ? cfg.reveal : 10.5) + mo);",
    "    const rb = (pc ? pc.t : cfg.reveal != null ? cfg.reveal : 10.5) + mo;\n"
    "    setPhase('reveal', rb + (cfg.kr ? cfg.kr.wait : 0));\n"
    "    krRevealStart(rb);")
rep("""      case 'deal':
        if (inp.ok !== 1) return false;
        break;""", """      case 'deal':
        if (inp.ok !== 1) return false;
        break;
      case 'reveal':
        if (inp.ok !== 1 || !krCanGo(p)) return false;
        break;""")
rep("    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) endPhase(); else onChange();",
    "    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) endPhase(); else if (krReady()) endPhase(); else onChange();")
rep("    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) return endPhase();",
    "    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) return endPhase();\n    if (krReady()) return endPhase();")
rep("  const humansIn = () => list().filter((p) => !p.bot);", r"""  // ===================== KRČMAR 2.0 =====================
  // ploča bodova nakon pitanja: animacija (rb) pa čekanje da svi dodirnu Nastavi
  function krRevealStart(rb) {
    G.revMin = G.startedAt + Math.round(rb * 1000);
    for (const p of list()) if (p.bot) p.done = true;
    const s0 = G.s;
    later(() => { if (G.s === s0 && krReady()) endPhase(); }, Math.round(rb * 1000) + 30);
    onChange();
  }
  // može li igrač potvrditi Nastavi (kasnije: tko ima otvorenu odluku krčmara, prvo odlučuje)
  function krCanGo(p) { return true; }
  const krReady = () => G.ph === 'reveal' && G.revMin && now() >= G.revMin && allDone();
  const humansIn = () => list().filter((p) => !p.bot);""")
rep("    if (ph === 'reveal' && G.tk && G.tk.res) v.tkr = G.tk.res;", "    if (ph === 'reveal' && G.tk && G.tk.res) v.tkr = G.tk.res;\n    if (ph === 'reveal' && G.revMin) { v.rw = 1; v.rmin = Math.max(0, G.revMin - now()); }")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR 2 (Nastavi na ploči) OK')

# ---------- 3) krčmar nudi tajni pakt dvojici na ploči bodova; izdaja također na ploči ----------
# Odluka (k: 'krPact', yes) samo dok je ploča otvorena (faza reveal). Pakt nastaje kad oba prihvate; ako jedan odbije
# ili ne odgovori, drugi dobiva neutralno „Krčmar je odustao” (ne zna tko je odbio). Ponuda čeka do kraja te ploče.
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("  kr: { wait: 45 },", "  // pakt: najviše ponuda po partiji, od kojeg odigranog pitanja, vjerojatnost na pogodnoj ploči, najmanje igrača\n  kr: { wait: 45, pactOffers: 2, pactFrom: 3, pactChance: 0.45, pactMin: 3 },")
rep("    G.pacts = []; G.offers = []; G.btq = [];", "    G.kp = null; G.kpN = 0;\n    G.pacts = []; G.offers = []; G.btq = [];")
rep("  function krCanGo(p) { return true; }", r"""  function krCanGo(p) { return !(G.kp && G.kp.st === 'o' && (G.kp.a === p.pid || G.kp.b === p.pid) && G.kp.ans[p.pid] == null); }
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
    for (const p of [A, B]) if (p.bot) G.kp.ans[p.pid] = Math.random() < (cfg.sf.prof[G.prof[p.pid] || 'wild'] || cfg.sf.prof.wild).acc ? 1 : 0;
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
  }""")
rep("    sfExpireQ();\n", "    sfExpireQ();\n    krPactMaybe();\n")
# kraj ploče: neodgovorena ponuda = odbijeno
rep("      case 'reveal': return afterReveal();", "      case 'reveal': krPactSettle(true); return afterReveal();")
# akcije s mobitela
rep("    if (a.k === 'offer' || a.k === 'accept' ||", "    if (a.k === 'krPact') { const r = krPactAnswer(p, !!a.yes); if (r) { if (krReady()) endPhase(); else onChange(); } return r; }\n    if (a.k === 'offer' || a.k === 'accept' ||")
# izdaja na ploči bodova (mirna faza): već dopušteno (sfBusy je false u reveal); privatno: ponuda
rep("  function priv0(pid) {", "  function krPriv(p) {\n    const o = G.kp;\n    if (!o || o.st !== 'o' || G.ph !== 'reveal' || (o.a !== p.pid && o.b !== p.pid)) return null;\n    const m = R.get(o.a === p.pid ? o.b : o.a);\n    return { id: o.id, m: m ? m.pid : '', x: m ? m.name : '?', ans: o.ans[p.pid] };\n  }\n  function priv0(pid) {")
rep("    const p = R.get(pid), b = priv0(pid), t = p && !p.bot ? tkPriv(p) : null;\n    if (!t) return b;",
    "    const p = R.get(pid), b0 = priv0(pid), t = p && !p.bot ? tkPriv(p) : null, kp = p && !p.bot ? krPriv(p) : null;\n"
    "    const b = kp ? Object.assign(b0 || { can: false, used: false, inv: [], out: null, note: p.note }, { kp }) : b0;\n    if (!t) return b;")
# privatno stanje pakta i bez paktova: ništa novo
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR 3 (krčmar nudi pakt) OK')
