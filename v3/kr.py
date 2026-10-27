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
