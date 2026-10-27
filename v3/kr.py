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

# ---------- 4) krčmarove ponude na ploči bodova: 📜 Tajni zadatak i 🗳️ Usluga (privatno, rijetko) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("  kr: { wait: 45, pactOffers: 2, pactFrom: 3, pactChance: 0.45, pactMin: 3 },",
    "  kr: { wait: 45, pactOffers: 2, pactFrom: 3, pactChance: 0.45, pactMin: 3,\n"
    "    // ponude: od kojeg pitanja, vjerojatnost po ploči (kad nema ponude pakta), najviše po partiji; zadatak: dobitak / gubitak\n"
    "    offFrom: 2, offChance: 0.35, offMax: 4, taskWin: 400, taskLoss: 200 },")
rep("    G.kp = null; G.kpN = 0;\n", "    G.kp = null; G.kpN = 0; G.koN = 0;\n    for (const p of list()) { p.ko = null; p.kt = null; p.kf = 0; p.kb = 0; p.koGot = {}; }\n")
rep("    sfExpireQ();\n    krPactMaybe();\n", "    sfExpireQ();\n    krTaskSettle();\n    krPactMaybe();\n    krOfferMaybe();\n")
rep("      case 'reveal': krPactSettle(true); return afterReveal();", "      case 'reveal': krPactSettle(true); krOfferEnd(); return afterReveal();")
# usluga: tvoj glas tajno odlučuje sljedeće glasanje
rep("    G.cw = pick(best);", "    G.cw = pick(best);\n    { const fv = active().find((p) => p.kf && p.vote >= 0); if (fv) { G.cw = fv.vote; fv.kf = 0; G.tie = 0; G.tb = null; best.length = 0; best.push(fv.vote); note(fv, '🗳️ Krčmar je poslušao tvoj glas.', 'pact'); } }")
rep("      if (ph === 'reveal' && p.tb) e.tb = p.tb;", "      if (ph === 'reveal' && p.tb) e.tb = p.tb;\n      if (ph === 'reveal' && p.kb) e.kb = p.kb;")
rep("  function startFinale() {\n", "  function startFinale() {\n    for (const p of list()) { p.kt = null; p.kf = 0; p.ko = null; }   // nedovršeni zadaci i usluge prestaju (bez promjene bodova)\n")
rep("    if (a.k === 'krPact') {", "    if (a.k === 'krOff') { const r = krOfferAnswer(p, !!a.yes); if (r) { if (krReady()) endPhase(); else onChange(); } return r; }\n    if (a.k === 'krPact') {")
rep("  function krCanGo(p) { return !(", "  function krCanGo(p) { return !(p.ko && p.ko.st === 'o') && !(")
rep("  const krFree = (p) =>", r"""  // ----- krčmarove ponude -----
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
    return r;
  }
  const krFree = (p) =>""")
rep("    const b = kp ? Object.assign(b0 || { can: false, used: false, inv: [], out: null, note: p.note }, { kp }) : b0;",
    "    const ko = p && !p.bot ? krOfferPriv(p) : {}, any = kp || ko.ko || ko.kt || ko.kf;\n"
    "    const b = any ? Object.assign(b0 || { can: false, used: false, inv: [], out: null, note: p.note }, kp ? { kp } : {}, ko) : b0;")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR 4 (krčmarove ponude) OK')
