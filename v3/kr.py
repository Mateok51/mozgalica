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

# ---------- 5) izazov vođi: javno pitanje zadnjem na ploči bodova; dvoboj = nadvlačenje konopa ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("    offFrom: 2, offChance: 0.35, offMax: 4, taskWin: 400, taskLoss: 200 },",
    "    offFrom: 2, offChance: 0.35, offMax: 4, taskWin: 400, taskLoss: 200,\n"
    "    // izazov vođi: od kojeg odigranog pitanja, najmanji zaostatak, vrijeme za odluku (s), ulozi, obrana krune, trajanje konopa (s), prednost za pobjedu prije kraja\n"
    "    chFrom: 5, chGap: 800, chWait: 12, chStakeA: 150, chStakeB: 300, chGuard: 150, rope: 20, ropeWin: 7, ropeN: 40 },")
rep("const INPUT_PHASES = { deal: 1,", "const INPUT_PHASES = { rope: 1, deal: 1,")
rep("    G.kp = null; G.kpN = 0; G.koN = 0;\n", "    G.kp = null; G.kpN = 0; G.koN = 0; G.lc = null; G.lcDone = false;\n")
rep("    krOfferMaybe();\n", "    krOfferMaybe();\n    krChallengeMaybe();\n")
rep("      case 'reveal': krPactSettle(true); krOfferEnd(); return afterReveal();",
    "      case 'reveal': krPactSettle(true); krOfferEnd(); krChallengeEnd(); return afterReveal();")
rep("      case 'duel': return scoreDuel();", "      case 'duel': return scoreDuel();\n      case 'rope': return scoreRope();")
rep("  function startDuel() {\n", "  function startDuel() {\n    if (G.du && G.du.rope) return startRope();\n")
rep("    if (a.k === 'krOff') {", "    if (a.k === 'krCh') { const r = krChallengeAnswer(p, !!a.yes); if (r) { if (krReady()) endPhase(); else onChange(); } return r; }\n    if (a.k === 'krOff') {")
rep("  function krCanGo(p) { return !(p.ko && p.ko.st === 'o') && !(", "  function krCanGo(p) { return !(G.lc && G.lc.st === 'o' && G.lc.a === p.pid) && !(p.ko && p.ko.st === 'o') && !(")
rep("""      case 'blitz': {
        // munjeviti krug""", """      case 'rope': {
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
        // munjeviti krug""")
rep("  const krFree = (p) =>", r"""  // ----- izazov vođi -----
  function krChallengeMaybe() {
    const K = cfg.kr; G.lc = null;
    if (G.lcDone || G.inFinale || (G.bdone || 0) < K.chFrom || (G.kp && G.kp.st === 'o')) return;
    if (!plan.slice(G.pi + 1).some((it) => it.t === 'battle')) return;   // mora postojati još pitanja nakon izazova
    const ps = active().slice().sort((a, b) => b.score - a.score);
    if (ps.length < 2) return;
    const B = ps[0], A = ps[ps.length - 1];
    const forced = G.scn && G.scn.k === 'challenge';
    if (!A || A.bot || A === B || (!forced && B.score - A.score < K.chGap)) return;
    if (forced) G.scn = null;
    G.lcDone = true;
    G.lc = { id: ++G.sfSeq, a: A.pid, b: B.pid, st: 'o', sa: K.chStakeA, sb: K.chStakeB, g: K.chGuard };
    const s0 = G.s;
    later(() => { if (G.s === s0 && G.lc && G.lc.st === 'o') { G.lc.st = 'n'; G.lc.auto = 1; if (krReady()) endPhase(); else onChange(); } }, Math.round(((G.revMin || now()) - now()) + K.chWait * 1000));
  }
  function krChallengeAnswer(p, yes) {
    const o = G.lc;
    if (!o || o.st !== 'o' || G.ph !== 'reveal' || o.a !== p.pid) return false;
    o.st = yes ? 'y' : 'n';
    if (yes) news('⚔️ ' + p.name + ' izaziva vođu: ' + ((R.get(o.b) || {}).name || '?') + '!');
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
  const krFree = (p) =>""")
# afterReveal: dvoboj iz izazova (i nakon izdaje)
rep("    if (pd && pd.duel) return startDuelIntro(pd.duel);\n    next();\n  }\n  function afterBetray() {",
    "    if (pd && pd.duel) return startDuelIntro(pd.duel, pd.rope);\n    next();\n  }\n  function afterBetray() {")
rep("    if (pd && pd.duel) return startDuelIntro(pd.duel);\n    next();\n  }\n  function afterMoment() {",
    "    if (pd && pd.duel) return startDuelIntro(pd.duel, pd.rope);\n    next();\n  }\n  function afterMoment() {")
rep("  function startDuelIntro(pair) {\n    G.du = { a: pair[0], b: pair[1], w: null, n: TD.duelNote(pair[0], pair[1]) };",
    "  function startDuelIntro(pair, rope) {\n    G.du = { a: pair[0], b: pair[1], w: null, n: TD.duelNote(pair[0], pair[1]), rope: rope ? 1 : 0 };")
# pogled: javni prijedlog izazova, konop uživo, rezultat konopa
rep("    if (ph === 'reveal' && G.revMin) {", "    if (ph === 'reveal' && G.lc) v.lc = { a: G.lc.a, b: G.lc.b, st: G.lc.st, sa: G.lc.sa, sb: G.lc.sb, g: G.lc.g };\n    if (ph === 'rope' && G.rp) v.rp = { pa: G.rp.pa, pb: G.rp.pb, m: cfg.kr.ropeWin, list: G.rp.list };\n    if (ph === 'reveal' && G.revMin) {")
rep("      v.du = { a: G.du.a, b: G.du.b, bonus: cfg.duelBonus };", "      v.du = { a: G.du.a, b: G.du.b, bonus: cfg.duelBonus };\n      if (G.du.rope) { v.du.rope = 1; v.du.sa = cfg.kr.chStakeA; v.du.sb = cfg.kr.chStakeB; v.du.g = cfg.kr.chGuard; if (G.du.rr) v.du.rr = G.du.rr; }")
rep("if ((ph === 'duelIntro' || ph === 'duel' || ph === 'duelResult') && G.du) {", "if ((ph === 'duelIntro' || ph === 'duel' || ph === 'rope' || ph === 'duelResult') && G.du) {")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR 5 (izazov vođi, konop) OK')

# ---------- 6) nova moć 🎲 Oklada: kladiš se na igrača; ako oboje odgovorite točno, dobivaš i njegove bodove ----------
# Meta je tajna (javno se vidi samo da je netko upotrijebio Okladu). Nema je u piramidi ni u igri za jednog igrača.
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("  stit:  { n: 'Štit',         atk: false, d: 'Odbija sve napade na tebe u ovom pitanju.' },",
    "  stit:  { n: 'Štit',         atk: false, d: 'Odbija sve napade na tebe u ovom pitanju.' },\n"
    "  oklada: { n: 'Oklada',      atk: false, tg: true, d: 'Kladi se na igrača. Ako oboje točno odgovorite, dobivaš i njegove bodove.' },")
rep("    let pool = (multi ? POWER_KEYS : BUFF_KEYS).filter((k) => !(G.inFinale && (k === 'pola' || k === 'grick')));",
    "    let pool = (multi ? POWER_KEYS : BUFF_KEYS).filter((k) => !(G.inFinale && (k === 'pola' || k === 'grick' || k === 'oklada')) && !(k === 'oklada' && !multi));")
rep("        if (POWERS[inp.p].atk) {", "        if (POWERS[inp.p].atk || POWERS[inp.p].tg) {")
rep("      p.pw = null; p.fx = []; p.dbl = false; p.pola = false; p.sh = false; p.hide = null;", "      p.pw = null; p.fx = []; p.dbl = false; p.pola = false; p.sh = false; p.hide = null; p.okl = null; p.ob = 0;")
rep("        if (k === 'pola') p.pola = true;", "        if (k === 'pola') p.pola = true;\n        if (k === 'oklada') p.okl = p.pw.t;")
rep("    resolveSecret();", "    for (const p of list()) { p.ob = 0; const X = p.okl && R.get(p.okl); if (X && p.ans === G.q.a && X.ans === G.q.a && X.gained > 0) { p.ob = X.gained; p.score += p.ob; } }\n    resolveSecret();")
rep("      if (ph === 'reveal' && p.kb) e.kb = p.kb;", "      if (ph === 'reveal' && p.kb) e.kb = p.kb;\n      if (ph === 'reveal' && p.ob) e.ob = p.ob;")
rep("    if (p.kf) r.kf = 1;\n    return r;", "    if (p.kf) r.kf = 1;\n    if (p.okl && !G.inFinale && (G.ph === 'cast' || G.ph === 'question')) r.okl = p.okl;\n    return r;")
rep("any = kp || ko.ko || ko.kt || ko.kf;", "any = kp || ko.ko || ko.kt || ko.kf || ko.okl;")
rep("        if (!POWERS[k].atk) return { s, p: k };", "        if (!POWERS[k].atk && !POWERS[k].tg) return { s, p: k };")
rep("  const PW_ACC = { led: 'Led', sluz: 'Sluz', grick: 'Grickalice',", "  const PW_ACC = { oklada: 'Okladu', led: 'Led', sluz: 'Sluz', grick: 'Grickalice',")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR 6 (Oklada) OK')

# ---------- 7) testni scenariji (skriveni izbornik, samo lokalni domaćin u testnom načinu s botovima) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("    const mate = partnerOf(p), botMate = mate && mate.bot;\n    const left = (bsOn() ? cfg.sf.atBot : cfg.sf.at).slice(G.dealI).length;\n    switch (k) {",
    """    const mate = partnerOf(p), botMate = mate && mate.bot;
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
        return { ok: 1, msg: mate.name + ' će potajno pripremiti izdaju na sljedećoj ploči bodova' + ((pactOf(p).n || 0) < (cfg.pactMinQ || 0) ? ' (kad prođu 2 zajednička pitanja)' : '') + '.' };""")
rep("        if (k === 'loyal') { mate.sfLoyal = 1; return { ok: 1, msg: mate.name + ' ostaje odan do kraja (osim ako ti izdaš).' }; }",
    "        if (k === 'loyal') { mate.sfLoyal = 1; mate.betray = false; return { ok: 1, msg: mate.name + ' ostaje odan do kraja (osim ako ti izdaš).' }; }")
# bot u izazovu (scenarij): prisilno izazivač = ti
rep("    const B = ps[0], A = ps[ps.length - 1];\n    const forced = G.scn && G.scn.k === 'challenge';",
    "    const forced = G.scn && G.scn.k === 'challenge';\n    let B = ps[0], A = ps[ps.length - 1];\n    if (forced) { A = R.get(G.scn.pid); B = ps[0] !== A ? ps[0] : ps[1]; }")
# bot u ponudi pakta (scenarij): bot prihvaća
rep("    for (const p of [A, B]) if (p.bot) G.kp.ans[p.pid] = Math.random() <", "    for (const p of [A, B]) if (p.bot) G.kp.ans[p.pid] = forced ? 1 : Math.random() <")
# botovi odlučuju o izdaji na ploči bodova (prije sljedećeg pitanja, bez znanja o njemu); po ploči 1/3 vjerojatnosti profila
rep("  function krRevealStart(rb) {\n", """  function krBotsBoard() {
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
""")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR 7 (testni scenariji) OK')
# samo za testove: izravno sklapanje pakta (isti put kao krčmarova ponuda koju oboje prihvate)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("  return { sfScenario, pactAction,", "  return { _pact: (a, b) => { const A = R.get(a), B = R.get(b); if (!A || !B || !krFree(A) || !krFree(B)) return false; krPactMake({}, A, B); return true; }, sfScenario, pactAction,")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR test hook OK')

# ---------- popravci nakon testiranja ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# BUG: rok od 12 s za odluku o izazovu postavljao se prije početka ploče, pa ga je setPhase odmah poništavao
# (izazivač je mogao blokirati igru do sigurnosne granice od 45 s). Rok se sada postavlja kad ploča počne.
rep("    const s0 = G.s;\n    later(() => { if (G.s === s0 && G.lc && G.lc.st === 'o') { G.lc.st = 'n'; G.lc.auto = 1; if (krReady()) endPhase(); else onChange(); } }, Math.round(((G.revMin || now()) - now()) + K.chWait * 1000));\n", "")
rep("    later(() => { if (G.s === s0 && krReady()) endPhase(); }, Math.round(rb * 1000) + 30);\n",
    "    later(() => { if (G.s === s0 && krReady()) endPhase(); }, Math.round(rb * 1000) + 30);\n"
    "    if (G.lc && G.lc.st === 'o') later(() => { if (G.s === s0 && G.lc && G.lc.st === 'o') { G.lc.st = 'n'; G.lc.auto = 1; if (krReady()) endPhase(); else onChange(); } }, Math.round((rb + cfg.kr.chWait) * 1000));\n")
# dvobojaši u nadvlačenju konopa su zauzeti (ne mogu pripremati izdaju), gledatelji nisu
rep("  const sfBusy = (p) => (G.ph === 'duel' ?", "  const sfBusy = (p) => (G.ph === 'duel' || G.ph === 'rope' ?")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR popravci 1 OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# jedna odluka u jednom trenutku: izazov vođi ne dolazi na ploču na kojoj je već tajna ponuda (pakt, zadatak, usluga)
rep("    if (G.lcDone || G.inFinale || (G.bdone || 0) < K.chFrom || (G.kp && G.kp.st === 'o')) return;",
    "    if (G.lcDone || G.inFinale || (G.bdone || 0) < K.chFrom || (G.kp && G.kp.st === 'o') || list().some((p) => p.ko && p.ko.st === 'o')) return;")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR popravci 2 OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# najava izazova već je na ploči i u uvodu dvoboja; obavijest bi prekrila kontrole konopa
rep("    if (yes) news('⚔️ ' + p.name + ' izaziva vođu: ' + ((R.get(o.b) || {}).name || '?') + '!');\n", "")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR popravci 3 OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# Oklada: vidljiv ishod. Javno samo tko je profitirao (oq=1, ob) ili promašio (oq=-1), bez mete; bettor privatno dobiva razlog (okr)
rep("    for (const p of list()) { p.ob = 0; const X = p.okl && R.get(p.okl); if (X && p.ans === G.q.a && X.ans === G.q.a && X.gained > 0) { p.ob = X.gained; p.score += p.ob; } }",
    "    for (const p of list()) {\n      p.ob = 0; p.oq = 0; p.okr = null;\n      if (!p.okl) continue;\n      const X = R.get(p.okl), mine = p.ans === G.q.a, theirs = !!X && X.ans === G.q.a && X.gained > 0;\n      if (X && mine && theirs) { p.ob = X.gained; p.score += p.ob; p.oq = 1; }\n      else p.oq = -1;\n      p.okr = { t: p.okl, w: p.ob, why: p.oq > 0 ? '' : (!mine ? 'me' : 'x') };\n    }")
rep("p.okl = null; p.ob = 0;", "p.okl = null; p.ob = 0; p.oq = 0; p.okr = null;")
rep("      if (ph === 'reveal' && p.ob) e.ob = p.ob;", "      if (ph === 'reveal' && p.ob) e.ob = p.ob;\n      if (ph === 'reveal' && p.oq) e.oq = p.oq;")
rep("    if (p.okl && !G.inFinale && (G.ph === 'cast' || G.ph === 'question')) r.okl = p.okl;", "    if (p.okl && !G.inFinale && (G.ph === 'cast' || G.ph === 'question')) r.okl = p.okl;\n    if (p.okr && G.ph === 'reveal') r.okr = p.okr;")
rep("any = kp || ko.ko || ko.kt || ko.kf || ko.okl;", "any = kp || ko.ko || ko.kt || ko.kf || ko.okl || ko.okr;")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR oklada ishod OK')

s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# moći se ne nude prije prvog pitanja (nitko još nema bodova ni ishoda); Oklada se ne nudi dvaput zaredom
rep("      p.offers = offersFor(p, st.has(p.pid) ? st.get(p.pid) : 0.5, multi);\n    }\n    setPhase('power', G.inFinale ? cfg.fpower : cfg.power);",
    "      p.lastOf = p.offers || [];\n      p.offers = firstQ ? [] : offersFor(p, st.has(p.pid) ? st.get(p.pid) : 0.5, multi);\n    }\n    if (firstQ) { G.ev = []; return afterPower(); }\n    setPhase('power', G.inFinale ? cfg.fpower : cfg.power);")
rep("    const multi = active().length > 1, st = standing();\n    for (const p of list()) {\n      p.pw = null;", "    const multi = active().length > 1, st = standing(), firstQ = !G.inFinale && !(G.bdone > 0);\n    for (const p of list()) {\n      p.pw = null;")
rep("(k === p.lastPw ? (k === 'dupli' ? 0 : 0.2) : 1);", "(k === p.lastPw ? (k === 'dupli' ? 0 : 0.2) : 1) * (k === 'oklada' && (p.lastOf || []).includes('oklada') ? 0 : 1);")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR moći: ne prije prvog pitanja, Oklada ne dvaput OK')

s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# POWER PICK: svaki igrač ima jedan po partiji; na glasanju bira baš svoju kategoriju. Zamjenjuje Krčmarovu uslugu „tvoj glas bira kategoriju”.
# Ako je pick već iskorišten u ovom glasanju (prvi pobjeđuje), kasniji zahtjev vrijedi kao običan glas, a pick se ne troši.
rep("        p.vote = inp.v; break;",
    "        if (G.ppv && G.ppv.pid === p.pid && inp.v !== G.ppv.c) return false;\n"
    "        if (inp.pp && p.pp !== 0 && !G.ppv && !G.inFinale) { p.pp = 0; p.ppc = inp.v; G.ppv = { pid: p.pid, c: inp.v }; }\n"
    "        p.vote = inp.v; break;")
rep("    for (const p of list()) p.vote = -1;\n    setPhase('vote', cfg.vote);",
    "    for (const p of list()) { p.vote = -1; p.ppc = -1; }\n    G.ppv = null; G.ppw = null;\n    setPhase('vote', cfg.vote);")
rep("    G.cw = pick(best);\n",
    "    G.cw = pick(best);\n    G.ppw = null;\n    if (G.ppv && G.ppv.c >= 0 && G.ppv.c < G.cats.length) { G.cw = G.ppv.c; best.length = 0; best.push(G.cw); G.ppw = G.ppv.pid; }\n")
rep("p.kb = 0; p.koGot = {}; }", "p.kb = 0; p.koGot = {}; p.pp = 1; p.ppc = -1; G.ppv = null; G.ppw = null; }")
rep("      if (ph === 'reveal' && p.oq) e.oq = p.oq;",
    "      if (ph === 'reveal' && p.oq) e.oq = p.oq;\n      e.pa = p.pp === 0 ? 0 : 1;\n      if ((ph === 'vote' || ph === 'voteResult') && p.ppc >= 0) e.pk = 1;")
rep("      case 'vote': return { s, v: rnd(G.cats.length) };",
    "      case 'vote': { const o = { s, v: rnd(G.cats.length) }; if (b.pp !== 0 && !G.ppv && !G.inFinale && (G.bdone || 0) >= 1 && Math.random() < 0.2) o.pp = 1; return o; }")
rep("      if (!p.kf && !p.koGot.fav && p !== lead && (!forced || forced.k === 'fav')) cand.push([p, 'fav']);",
    "      // usluga „tvoj glas bira kategoriju” zamijenjena je power pickom na glasanju")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR power pick OK')

s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# Power pick: kad je iskorišten, glasanje se zaustavlja uz kratku pauzu da svi vide što se dogodilo; ostali ne moraju birati
rep("  const allDone = () => { const a = active(); return a.length > 0 && a.every((p) => p.done && !tkHold(p)); };",
    "  const allDone = () => { const a = active(); return a.length > 0 && !(G.ph === 'vote' && G.ppHeld) && a.every((p) => p.done && !tkHold(p)); };")
rep("        if (G.ppv && G.ppv.pid === p.pid && inp.v !== G.ppv.c) return false;\n",
    "        if (G.ppv && G.ppv.pid !== p.pid) break;   // pick je već iskorišten: ostali više ne biraju\n        if (G.ppv && G.ppv.pid === p.pid && inp.v !== G.ppv.c) return false;\n")
rep("G.ppv = { pid: p.pid, c: inp.v }; }", "G.ppv = { pid: p.pid, c: inp.v }; ppLock(); }")
rep("  function startVote() {\n    if (sfDeal()) return;",
    "  function ppLock() {\n    const s0 = G.s, hold = Math.round((cfg.ppHold || 2.6) * 1000);\n    G.ppHeld = 1; G.dur = hold; G.startedAt = now(); G.endsAt = G.startedAt + hold;\n    later(() => { if (G.s === s0 && G.ph === 'vote') endPhase(); }, hold);\n  }\n  function startVote() {\n    if (sfDeal()) return;")
rep("    G.ppv = null; G.ppw = null;\n    setPhase('vote', cfg.vote);", "    G.ppv = null; G.ppw = null; G.ppHeld = 0;\n    setPhase('vote', cfg.vote);")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR power pick: pauza i kraj glasanja OK')

s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# produljena faza (npr. pauza nakon power picka) ne smije završiti prvotnim, ranijim satom
rep("    later(() => { if (G.s === s) endPhase(); }, G.dur + (INPUT_PHASES[ph] ? 400 : 0));",
    "    later(() => { if (G.s === s && now() >= G.endsAt - 5) endPhase(); }, G.dur + (INPUT_PHASES[ph] ? 400 : 0));")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR produljena faza OK')

s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# Power pick: kategorija je odmah odabrana (glasanje se zatvara), a ekran s rezultatom traje malo duže da svi vide što se dogodilo
rep("    const s0 = G.s, hold = Math.round((cfg.ppHold || 2.6) * 1000);\n    G.ppHeld = 1; G.dur = hold; G.startedAt = now(); G.endsAt = G.startedAt + hold;\n    later(() => { if (G.s === s0 && G.ph === 'vote') endPhase(); }, hold);",
    "    const s0 = G.s;\n    G.ppHeld = 1;\n    later(() => { if (G.s === s0 && G.ph === 'vote') endPhase(); }, 40);")
rep("    setPhase('voteResult', cfg.voteShow + (G.tb ? cfg.roul : 0));", "    setPhase('voteResult', cfg.voteShow + (G.tb ? cfg.roul : 0) + (G.ppw ? (cfg.ppShow === undefined ? 2.4 : cfg.ppShow) : 0));")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR power pick: odmah odabir, duži rezultat OK')

# ---------- Krčmar kao osobnost: replike, pamćenje odnosa, završna riječ ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep(r"""      PJ_LAST: [['⚔️ Posljednja prilika!', 'Još jedno pitanje prije završnog uspona!']],
    };""", r"""      PJ_LAST: [['⚔️ Posljednja prilika!', 'Još jedno pitanje prije završnog uspona!']],
    };
    // Krčmar 3.0: duhovit, malo sarkastičan; nove replike dolaze ispred starih, sve bez padeža i roda
    { const N = {
      STREAK3: [['🎯 {X} ne griješi', 'Krčmar sumnjičavo provjerava ima li špijunke u rukavu']],
      STREAK5: [['📚 {X} zna cijelu enciklopediju', 'Pet zaredom. Krčmar više ne nudi pomoć, nego se boji']],
      WRONG3: [['🍺 {X} danas pije za hrabrost', 'Tri pogrešna zaredom. Krčma suosjeća, ali ne previše'], ['🫗 {X} pije za utjehu', 'Tri pogrešna zaredom. Krčmar već priprema račun za žalovanje']],
      STREAK_BROKEN: [['🧊 {X} spušten na zemlju', 'Niz od {K} prekinut. Žao nam je. Zapravo ne baš']],
      NEW_LEADER: [['👑 Stolica je promijenila stražnjicu', '{N} sjeda na vrh, a prethodno sjedenje se još hladi']],
      THRONE: [['👑 Stolica je promijenila stražnjicu', '{N} sjeda na vrh, a {O} se još grije od prethodnog sjedenja']],
      RIVAL_SWAP: [['⚔️ {A} opet pretiče {B}', 'Već {K}. put ove večeri. {B} počinje to shvaćati osobno']],
      COMEBACK_BIG: [['🧟 Mrtvi su ustali', 'Dno je ostalo iza, a {X} je na vrhu. Krčmar je upravo promijenio okladu']],
      COMEBACK: [['🧟 Mrtvi su ustali', '{X} skače s {L}. na {R}. mjesto. Krčmar je upravo promijenio okladu']],
      RIVALRY: [['⚔️ {A} i {B} imaju stari račun', 'Krčma je prestala brojati. Računi ne staju']],
      PACT_SEEN: [['🤝 Krčmar je vidio rukovanje', '{A} i {B} imaju dogovor. Detalji su, naravno, tajna']],
      BETRAYED: [['🗡️ Nož u leđa, uz pivo', '{T} je izdao partnera i uzeo {K}. {V} ostaje s poukom'], ['🗡️ Pakt je pukao', '{T} odlazi s {K}, a {V} s lekcijom o povjerenju']],
      BETRAY_REVENGE: [['🍺 Krčma pamti', '{V} je opet ispred, a {T} još čuje onu staru izdaju']],
    }; for (const k in N) TL[k] = N[k].concat(TL[k] || []); }""")
# wrong streak 3
rep(r"""          const had = T.streak[k] || 0; T.streak[k] = 0; inc(T.wrongStreak, k);
""", r"""          const had = T.streak[k] || 0; T.streak[k] = 0; const wsN = inc(T.wrongStreak, k);
          if (wsN === 3) { const wc = cand('WRONG3', 4, 'w3:' + k + ':' + T.turn, { X: p.name }, [k], ['sad'], { snd: 'stingSmall' }); if (wc) cands.push(wc); }
""")
# pakt i izdaja: javno se zna samo da pakt postoji (nikad namjera izdaje)
rep(r"""      powerCands(cands);
      updateRanks(cands);
      fcCands(cands);""", r"""      pactCands(cands);
      powerCands(cands);
      updateRanks(cands);
      fcCands(cands);""")
rep(r"""    function onBetray(e) {
      if (!T) return;""", r"""    function onPact(a, b) { if (T) { T.pk = T.pk || []; T.pk.push({ id: T.pk.length + 1, a, b, turn: T.turn }); } }
    function pactCands(cands) {
      T.pk = (T.pk || []).filter((x) => T.turn - x.turn <= 2); T.bq = (T.bq || []).filter((x) => T.turn - x.turn <= 2);
      for (const x of T.pk) if (R.get(x.a) && R.get(x.b)) { const c = cand('PACT_SEEN', 5, 'pk:' + x.id, { A: nm(x.a), B: nm(x.b) }, [x.a, x.b], ['happy', 'happy'], { vs: 1, snd: 'stingSmall' }); if (c) cands.push(c); }
      for (const x of T.bq) if (R.get(x.t) && R.get(x.v)) { const c = cand('BETRAYED', 8.5, 'bd:' + x.id, { T: nm(x.t), V: nm(x.v), K: bodN(x.gain || 0) }, [x.t, x.v], ['victory', 'sad'], { vs: 1, snd: 'stingRival' }); if (c) cands.push(c); }
    }
    function onBetray(e) {
      if (!T) return;
      if (e.k === 'betray') { T.bq = T.bq || []; T.bq.push({ id: (T.bqN = (T.bqN || 0) + 1), t: e.t, v: e.v, gain: e.gain || 0, turn: T.turn }); }""")
rep("return { reset, onTk, onVote, onPower,", "return { reset, onPact, onTk, onVote, onPower,")
rep(r"""    note(A, '🍻 Pakt s ' + B.name + ' je sklopljen!', 'pact'); note(B, '🍻 Pakt s ' + A.name + ' je sklopljen!', 'pact');
    news(pickLine('rumor'));""", r"""    note(A, '🍻 Pakt s ' + B.name + ' je sklopljen!', 'pact'); note(B, '🍻 Pakt s ' + A.name + ' je sklopljen!', 'pact');
    news(pickLine('rumor')); TD.onPact(A.pid, B.pid);""")
rep(r"""        note(f, '🍻 ' + p.name + ' je prihvatio tvoj pakt!', 'pact'); note(p, '🍻 Pakt s ' + f.name + ' je sklopljen!', 'pact');
        news(pickLine('rumor'));""", r"""        note(f, '🍻 ' + p.name + ' je prihvatio tvoj pakt!', 'pact'); note(p, '🍻 Pakt s ' + f.name + ' je sklopljen!', 'pact');
        news(pickLine('rumor')); TD.onPact(f.pid, p.pid);""")
# dvoboj: pamti staru izdaju; inače kratka porugljiva napomena
rep(r"""      if (T.activeRival === pairKey(a, b)) return 'Rivalstvo dobiva novo poglavlje.';
      return '';""", r"""      if ((T.betr || []).some((b) => b.v === w && b.t === l)) return '🍺 Krčma pamti: ' + nm(w) + ' vraća staru izdaju!';
      if (T.activeRival === pairKey(a, b)) return 'Rivalstvo dobiva novo poglavlje.';
      return T.turn % 2 ? '🪢 Konop je pao, ponos nije: ' + nm(l) + ' traži alibi u nogama.' : '';""")
# završna riječ prema načinu pobjede
rep(r"""    return {
      id: G.s, w: wp ? { pid: W, line: wl, num: bodN(wp.score) } : null,""", r"""    let kl = '';
    if (wp) {
      const sec2 = sorted.find((p) => p.pid !== W), v2 = (T.turn + n) % 2;
      const bet2 = (S.bt || []).some((b) => b.k === 'betray' && b.t === W && (b.gain || 0) >= 400);
      const cb2 = n >= 3 && T.lowRank[W] === n && (T.worst[W] || 0) >= 800;
      const tight2 = G.crownWin === W || (sec2 && wp.fstep - sec2.fstep <= 1);
      const dom2 = (T.leadTurns[W] || 0) >= Math.max(3, T.turn * 0.7);
      kl = (bet2 ? ['Kruna je došla s nožem u leđa. Krčma to ne zaboravlja, ali plaća.', 'Prijateljstvo je izgubilo, kruna je dobila. Krčmar sve bilježi u knjigu računa.']
        : cb2 ? ['S dna do krune. Ovo će se prepričavati uz pivo.', 'Krčmar je otpisao ovu pobjedu prije polovice večeri. Ispričava se, ali ne u novcu.']
        : tight2 ? ['Razlika je bila tanja od pjene na pivu. Krčmar još broji, za svaki slučaj.', 'Kruna je pala za dlaku. Krčma još hvata dah.']
        : dom2 ? ['Vodstvo je cijelu večer ostalo na istom mjestu. Krčmar je prestao pratiti da ne ispadne pristran.', 'Večer je bila monolog, a ostali su bili publika s pivom.']
        : ['Kruna je pronašla vlasnika. Krčmar je već naručio sljedeću turu.', 'Večer je gotova, kruna ima novog vlasnika, a šank je ostao pun.'])[v2];
    }
    return {
      id: G.s, kl, w: wp ? { pid: W, line: wl, num: bodN(wp.score) } : null,""")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR krčmar osobnost OK')

# ---------- Trajanje partije: brza / standardna / duga (raspored se generira; standardna = dosadašnji PLAN) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("""  { t: 'intro', title: 'Veliko finale', sub: 'Utrka do vrha piramide' }, { t: 'finale' },
];
""", """  { t: 'intro', title: 'Veliko finale', sub: 'Utrka do vrha piramide' }, { t: 'finale' },
];
// Trajanje partije: runde (r), obična pitanja po rundi (q), posebni izazovi (c, nakon prvih c rundi) i prilagodbe mehanika.
// Standardna nema prilagodbi: raspored i pravila su točno dosadašnji. Pojedinačni timeri, bodovanje, moći i mini-igre se ne mijenjaju.
const LENS = {
  brza: { r: 2, q: 2, c: 1, betEvents: [1, 1], fcLast: 2, secretMax: 1, sgd: { varMin: 0, varMax: 1 },
    kr: { pactOffers: 1, pactFrom: 1, offFrom: 1, offMax: 2, chFrom: 2 } },
  std: { r: 3, q: 3, c: 2 },
  duga: { r: 4, q: 4, c: 3, betEvents: [3, 4], secretMax: 3, sgd: { varMin: 2, varMax: 3 },
    kr: { pactOffers: 3, pactFrom: 4, offFrom: 3, offMax: 5, chFrom: 7 } },
};
const NUM_W = ['', 'Jedno', 'Dva', 'Tri', 'Četiri', 'Pet'];
function makePlan(k) {
  const L = LENS[k] || LENS.std, out = [];
  for (let r = 1; r <= L.r; r++) {
    const sub = r === 1 ? 'Glasajte za kategoriju i bacajte moći!' : r === L.r ? 'Zadnja prilika za bodove prije finala' : (NUM_W[L.q] || L.q) + ' nova pitanja';
    out.push({ t: 'intro', title: 'Runda ' + r, sub });
    for (let i = 0; i < L.q; i++) out.push({ t: 'battle' });
    if (r <= L.c && r < L.r) out.push({ t: 'challenge' });
  }
  // više izazova nego međurundi (ne događa se u zadanim načinima): ostatak prije zadnje runde
  for (let n = out.filter((x) => x.t === 'challenge').length; n < L.c; n++) out.splice(out.map((x) => x.title).lastIndexOf('Runda ' + L.r), 0, { t: 'challenge' });
  out.push({ t: 'intro', title: 'Veliko finale', sub: 'Utrka do vrha piramide' }, { t: 'finale' });
  return out;
}
""")
rep("  const planBase = (o.plan || PLAN).slice(), plan = planBase.slice();",
    """  const planBase = (o.plan || PLAN).slice(), plan = planBase.slice();
  // trajanje: zadani raspored testova (o.plan) se ne dira; vrijednosti iz o.cfg uvijek imaju prednost pred prilagodbom načina
  const fixedPlan = !!o.plan, oc = o.cfg || {}, CB = { betEvents: cfg.betEvents, fcLast: cfg.fcLast, secretMax: cfg.secretMax, sgd: cfg.sgd, kr: cfg.kr };
  function applyLen(k) {
    const L = fixedPlan ? {} : LENS[k] || LENS.std;
    if (!fixedPlan) planBase.splice(0, planBase.length, ...makePlan(k));
    plan.splice(0, plan.length, ...planBase);
    for (const key of ['betEvents', 'fcLast', 'secretMax']) cfg[key] = oc[key] !== undefined || L[key] === undefined ? CB[key] : L[key];
    // načinske vrijednosti preko zadanih, a ono što test/poziv izričito zada (o.cfg) ima prednost po ključu
    cfg.sgd = L.sgd ? Object.assign({}, CFG.sgd, L.sgd, oc.sgd || {}) : CB.sgd;
    cfg.kr = L.kr ? Object.assign({}, CFG.kr, L.kr, oc.kr || {}) : CB.kr;
    G.nr = planBase.filter((it) => it.t === 'intro' && /^Runda \\d+$/.test(it.title)).length || 1;
  }""")
rep("opt: { pacts: o.pacts !== undefined ? !!o.pacts : true, rc: false, tk: false, bs: o.bs !== undefined ? !!o.bs : false },",
    "opt: { pacts: o.pacts !== undefined ? !!o.pacts : true, rc: false, tk: false, bs: o.bs !== undefined ? !!o.bs : false, len: LENS[o.len] ? o.len : 'std' },")
# početak partije: raspored prema odabranom trajanju; kladionica po stvarnoj veličini runde
rep("""    G.bn = -1; G.betAt = new Set();
    const nb = plan.filter((it) => it.t === 'battle').length, rounds = Math.ceil(nb / 3);""",
    """    G.bn = -1; G.betAt = new Set();
    applyLen(G.opt.len);
    const nb = plan.filter((it) => it.t === 'battle').length, rounds = G.nr, qpr = Math.max(1, Math.round(nb / rounds));""")
rep("G.betAt.add(Math.min(nb - 1, r ? r * 3 + rnd(3) : 1 + rnd(2)));", "G.betAt.add(Math.min(nb - 1, r ? r * qpr + rnd(qpr) : 1 + rnd(Math.max(1, qpr - 1))));")
# SGD: raspored se slaže iz trenutnog (već generiranog) rasporeda
rep("    plan.splice(0, plan.length, ...planBase);\n    for (let i = 2; i < plan.length; i++) if (plan[i].t === 'challenge'",
    "    plan.splice(0, plan.length, ...planBase);   // planBase je već raspored odabranog trajanja\n    for (let i = 2; i < plan.length; i++) if (plan[i].t === 'challenge'")
rep("T.secretTotal >= 2 ||", "T.secretTotal >= (cfg.secretMax || 2) || fcLeft() < 1 ||")
# ponude se nude samo ako se mogu pošteno dovršiti prije piramide
rep("    if (!pactsOn() || G.inFinale || G.kpN >= K.pactOffers || (G.bdone || 0) < K.pactFrom) return;",
    "    if (!pactsOn() || G.inFinale || G.kpN >= K.pactOffers || (G.bdone || 0) < K.pactFrom) return;\n    if (fcLeft() < (cfg.pactMinQ || 2)) return;   // pakt mora imati barem toliko zajedničkih pitanja prije piramide")
rep("    if (G.inFinale || (G.kp && G.kp.st === 'o') || G.koN >= K.offMax || (G.bdone || 0) < K.offFrom) return;",
    "    if (G.inFinale || (G.kp && G.kp.st === 'o') || G.koN >= K.offMax || (G.bdone || 0) < K.offFrom || fcLeft() < 1) return;")
rep("    const kind = vs && Math.random() < 0.5 ? 'fast' : 'st3';", "    const kind = vs && (Math.random() < 0.5 || fcLeft() < 3) ? 'fast' : fcLeft() < 3 ? null : 'st3';\n    if (!kind) { p.koGot[k] = 0; G.koN--; return; }   // zadatak od 3 pitanja ne stane prije piramide")
# opcija u predvorju (samo domaćin ima objekt igre) i prikaz za sve
rep("  function setOpt(k, v) { if (G.ph !== 'lobby') return;", "  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'len' && LENS[v]) { G.opt.len = v; applyLen(v); onChange(); return; }")
rep("    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, bs: G.opt.bs ? 1 : 0 };", "    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, bs: G.opt.bs ? 1 : 0, len: G.opt.len };")
rep("      rl: G.rl, max: cfg.maxPlayers, steps: cfg.steps,", "      rl: G.rl, nr: G.nr || 3, len: G.opt.len, max: cfg.maxPlayers, steps: cfg.steps,")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR trajanje partije OK')

# ---------- Piramida: izvor bonusa napretka za prikaz (pravila se ne mijenjaju) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("      p.ch = p.ans; p.mv = 0; p.ug = 0; p.sk = 0;\n", "      p.ch = p.ans; p.mv = 0; p.ug = 0; p.sk = 0; p.fb = '';\n")
rep("      let g = 1 + (p === fastest ? 1 : 0) + (p.dbl ? 1 : 0);\n      if (p.fstr % cfg.pyrStreak === 0) { g++; p.sk = 1; }",
    "      let g = 1 + (p === fastest ? 1 : 0) + (p.dbl ? 1 : 0);\n      if (p.fstr % cfg.pyrStreak === 0) { g++; p.sk = 1; }\n      p.fb = (p === fastest ? 'f' : '') + (p.dbl ? 'd' : '') + (p.sk ? 's' : '');   // samo za prikaz: odakle je bonus")
rep("if (ph === 'fr') { e.ug = p.ug; if (p.sk) e.sk = 1;", "if (ph === 'fr') { e.ug = p.ug; if (p.fb) e.fb = p.fb; if (p.sk) e.sk = 1;")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR piramida bonus za prikaz OK')

# ---------- Prijenos s maina (v48): ubrizgavanje slučajnosti i vremena, refresh() izvan view(), obnova partije ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("function createGame(o) {\n  const cfg = Object.assign({}, CFG, o.cfg || {});",
    "function createGame(o) {\n  const Math = Object.create(globalThis.Math);\n  if (o.random) Math.random = o.random;\n"
    "  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };\n"
    "  const cfg = Object.assign({}, CFG, o.cfg || {});")
rep("  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };\n  const clear = () => { timers.forEach(clearTimeout); timers = []; };",
    "  const later = (fn, ms) => { timers.push((o.schedule || setTimeout)(fn, ms)); };\n  const clear = () => { timers.forEach(o.cancel || clearTimeout); timers = []; };")
rep("    cleanOffers();\n    const k = pactOf(p), mate = partnerOf(p);", "    const k = pactOf(p), mate = partnerOf(p);")
rep("    rcClean();\n    const r = { st: cfg.rcStake };", "    const r = { st: cfg.rcStake };")
rep("  return { _pact: (a, b) =>", "  return { refresh: () => { cleanOffers(); rcClean(); }, _pact: (a, b) =>")
rep("\n//#engine-end", "\n" + open(SP + '/v3/recover.js', encoding='utf-8').read().rstrip() + "\n\n//#engine-end")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR prijenos s maina (motor) OK')

# ---------- Bacanje moći: dovoljno vremena da se vidi što se dogodilo ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("    if (!G.ev.length || cfg.cast <= 0) return afterPower();\n    setPhase('cast', Math.min(10, 1.3 + G.ev.length * cfg.cast));",
    "    if (cfg.cast <= 0) return afterPower();\n"
    "    // svi su odabrali prije isteka vremena, a nema vidljivih moći: kratki predah umjesto naglog prijelaza\n"
    "    if (!G.ev.length) return now() < G.endsAt - 800 ? setPhase('cast', 1.2) : afterPower();\n"
    "    setPhase('cast', Math.min(10, 2 + G.ev.length * cfg.cast));")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR bacanje moći OK')

# ---------- Izdaja: zaključana izdaja se ne nudi ponovno dok se ne izvrši ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("      if (sfOn() && p.betray && sfBusy(p)) o.k.btl = 1;   // zaključana pripremljena izdaja (samo vlasnik)",
    "      if (sfOn() && p.betray && sfBusy(p)) o.k.btl = 1;   // zaključana pripremljena izdaja (samo vlasnik)\n"
    "      // već zaključana (čeka izvršenje nakon ove ploče): ne nudi se ponovno, vlasnik vidi da je izdaja na putu\n"
    "      if ((G.btq || []).some((q) => q.pact === k.id && ((q.a && k.a === p.pid) || (q.b && k.b === p.pid)))) { delete o.k.cb; o.k.bt = 0; o.k.btl = 1; }")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR izdaja zaključana OK')

# ---------- Tajni događaj: poslije se svima otkrije tko je što smjerao (i kad je plan propao) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("    if (!se || !se.x) { G.se = null; return; }", "    if (!se) return;\n    if (!se.x) { G.sxDone = Object.assign({}, se, { none: 1 }); G.se = null; return; }")
rep("v.sxr = { k: x.k, p: x.p, x: x.x, ok: x.ok, res: x.res ? 1 : 0 };", "v.sxr = { k: x.k, p: x.p, x: x.x, ok: x.ok, res: x.res ? 1 : 0, none: x.none ? 1 : 0 };")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR tajni događaj otkrivanje OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("    if (!se || !se.x) { G.se = null; return startPower(); }", "    if (!se || !se.x) { if (se) se.none = 1; else G.se = null; return startPower(); }   // neiskorišten plan otkriva se na ploči")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR neiskorišten tajni plan OK')

# ---------- Krčmarovo prijestolje: alternativni završetak (piramida ostaje nepromijenjena) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# konfiguracija: 5 pitanja, najviše 1500 (zadnje 3000), ulozi prije zadnjeg pitanja, trajanje faza
rep("  fcLast: 3,\n", "  fcLast: 3,\n  // Krčmarovo prijestolje: broj pitanja, najveći bodovi po pitanju (zadnje), ulozi, trajanje uvoda / odluke, najviše pitanja za izjednačenje\n"
    "  thN: 5, thMax: 1500, thLast: 3000, thRisk: [0, 1000, 3000], tstart: 8, trisk: 12, thTieMax: 3,\n")
rep("const SKIPPABLE = { betray: 1, loyal: 1, fstart: 1,", "const SKIPPABLE = { betray: 1, loyal: 1, fstart: 1, tstart: 1,")
rep("const INPUT_PHASES = { rope: 1,", "const INPUT_PHASES = { trisk: 1, rope: 1,")
# odabir završetka (domaćin, samo u predvorju)
rep("bs: o.bs !== undefined ? !!o.bs : false, len: LENS[o.len] ? o.len : 'std' },", "bs: o.bs !== undefined ? !!o.bs : false, len: LENS[o.len] ? o.len : 'std', end: o.end === 'throne' ? 'throne' : 'pyr' },")
rep("  function setOpt(k, v) { if (G.ph !== 'lobby') return;", "  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'end' && (v === 'pyr' || v === 'throne')) { G.opt.end = v; applyLen(G.opt.len); onChange(); return; }")
rep("    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, bs: G.opt.bs ? 1 : 0, len: G.opt.len };",
    "    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, bs: G.opt.bs ? 1 : 0, len: G.opt.len, end: G.opt.end };")
# raspored: najava finala prema završetku
rep("    if (!fixedPlan) planBase.splice(0, planBase.length, ...makePlan(k));",
    "    if (!fixedPlan) { planBase.splice(0, planBase.length, ...makePlan(k)); if (G.opt && G.opt.end === 'throne') { const fi = planBase.findIndex((it) => it.t === 'intro' && it.title === 'Veliko finale'); if (fi >= 0) planBase[fi] = { t: 'intro', title: 'Krčmarovo prijestolje', sub: 'Svaki bod vrijedi. Pobjeđuje najbogatiji.' }; } }")
# početak finala: zajednički uvod (isplata odanosti, kraj zadataka), zatim piramida ili prijestolje
rep("    const ly = payLoyalty(); G.ly = ly.length ? { id: G.s + 1, evs: ly } : null;\n    pyrStart();",
    "    const ly = payLoyalty(); G.ly = ly.length ? { id: G.s + 1, evs: ly } : null;\n    if (G.opt.end === 'throne' && !fixedPlan) return throneStart();\n    pyrStart();")
rep("      case 'loyal': return setPhase('fstart', cfg.fstart);", "      case 'loyal': return G.throne ? setPhase('tstart', cfg.tstart) : setPhase('fstart', cfg.fstart);\n      case 'tstart': return throneNext();\n      case 'trisk': return throneRiskLock();")
rep("      case 'question': return scoreQuestion();", "      case 'question': return G.throne ? scoreThrone() : scoreQuestion();")
rep("  function afterPower() { return G.inFinale ? beginFinaleQ() : startQuestion(); }",
    "  function afterPower() { return G.throne ? throneAfterPower() : G.inFinale ? beginFinaleQ() : startQuestion(); }")
# moći u prijestolju rade kao u regularnoj igri (bez piramidnih prilagodbi); oklada se ne nudi (isplata vezana uz regularna pitanja)
rep("(G.inFinale && (k === 'pola' || k === 'grick' || k === 'oklada'))", "(G.inFinale && (G.throne ? k === 'oklada' : k === 'pola' || k === 'grick' || k === 'oklada'))")
rep("    const val = (p) => (G.inFinale ? (p.fu || 0) * 1e6 : 0) + p.score;", "    const val = (p) => (G.inFinale && !G.throne ? (p.fu || 0) * 1e6 : 0) + p.score;")
rep("    if (G.inFinale) { const top = Math.max(...ps.map((p) => p.fu || 0));", "    if (G.inFinale && !G.throne) { const top = Math.max(...ps.map((p) => p.fu || 0));")
rep("      if (G.inFinale && (t === 0 || p.fstep >= cfg.steps - 2)) return 0;", "      if (G.inFinale && !G.throne && (t === 0 || p.fstep >= cfg.steps - 2)) return 0;")
rep("        else if (G.inFinale && t.fx.length >= cfg.pyrFxCap)", "        else if (G.inFinale && !G.throne && t.fx.length >= cfg.pyrFxCap)")
# pogled: piramidni podaci samo za piramidu; prijestolje ima svoje
rep("      if (G.inFinale) { e.st = p.fstep;", "      if (G.throne && (ph === 'reveal' || ph === 'final') && p.tst != null && G.thLastDone) { e.tsk = p.tst; }\n      if (G.inFinale && !G.throne) { e.st = p.fstep;")
rep("    if (G.inFinale) { v.fin = 1; v.ftop = pyrTop();", "    if (G.throne) v.th = { n: cfg.thN, q: G.tq || 0, lead: G.tLead || null, last: G.tq >= cfg.thN ? 1 : 0, tie: G.tieP ? G.tieP.slice() : null, tw: G.tieWin || null, risk: cfg.thRisk, ch: G.tChg || null, t0: G.tq0 || null };\n    if (G.inFinale && !G.throne) { v.fin = 1; v.ftop = pyrTop();")
# botovi: smislena odluka o riziku
rep("      case 'secret2': return { s, y: Math.random() < 0.75 ? 1 : 0 };",
    "      case 'secret2': return { s, y: Math.random() < 0.75 ? 1 : 0 };\n      case 'trisk': return { s, r: throneBotRisk(b) };")
rep("      case 'power': return 1500 + rnd(5000);", "      case 'power': return 1500 + rnd(5000);\n      case 'trisk': return 1500 + rnd(4000);")
# unos odluke o riziku (tajno, jednom; nevaljano = ignorira se)
rep("      case 'howto':\n        if (inp.ok !== 1) return false;\n        break;",
    "      case 'howto':\n        if (inp.ok !== 1) return false;\n        break;\n      case 'trisk':\n        if (inp.r !== 0 && inp.r !== 1 && inp.r !== 2) return false;\n        p.trk = inp.r; break;")
# izjednačenje: odgovaraju samo izjednačeni
rep("      case 'question': case 'fq': {\n        const c = inp.c;", "      case 'question': case 'fq': {\n        if (G.tieP && G.ph === 'question' && !G.tieP.includes(p.pid)) return false;\n        const c = inp.c;")
# zapis za privatni pogled: vlastita odluka o riziku
rep("  function finish() {\n    clear();", r"""  // ===================== KRČMAROVO PRIJESTOLJE =====================
  // Svi bodovi iz regularne igre ostaju. 5 pitanja (do 1500, zadnje do 3000), prije zadnjeg tajni ulog; pobjeđuje najviše bodova.
  function thLeader() { const ps = list().slice().sort((a, b) => b.score - a.score || (a.tq0r || 0) - (b.tq0r || 0)); return ps.length && ps[0].score > 0 ? ps[0].pid : null; }
  function throneStart() {
    G.throne = true; G.tq = 0; G.thLastDone = 0; G.tieP = null; G.tieWin = null; G.tieN = 0; G.tChg = null;
    const ps = list().slice().sort((a, b) => b.score - a.score);
    ps.forEach((p, i) => { p.tq0 = p.score; p.tq0r = i + 1; p.trk = 0; p.tst = null; p.tok = 0; p.mv = 0; p.lastPw = ''; });
    G.tq0 = Object.fromEntries(list().map((p) => [p.pid, p.score]));
    G.tLead = thLeader();
    if (G.ly && G.ly.evs.length) return setPhase('loyal', cfg.loyalShow);
    setPhase('tstart', cfg.tstart);
  }
  function throneNext() {
    if (G.tieP) return throneTieQ();
    if (G.tq >= cfg.thN) return throneEnd();
    startPower();
  }
  function throneAfterPower() {
    if (G.tq === cfg.thN - 1 && !G.thRiskDone) { G.thRiskDone = 1; for (const p of list()) p.trk = 0; return setPhase('trisk', cfg.trisk); }
    throneQ(false);
  }
  function throneRiskLock() {
    // zaključavanje: tko nije odabrao = SIGURNO; ulog nikad veći od vlastitih bodova
    for (const p of list()) p.tst = Math.min(p.score, cfg.thRisk[p.trk || 0] || 0);
    throneQ(false);
  }
  function throneQ(tie) {
    const cats = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!cats.length) return finish();
    const cat = pick(cats), qi = pick(D.cats[cat].map((_, i) => i).filter((i) => !G.used.q.has(cat + '|' + i)));
    G.used.q.add(cat + '|' + qi);
    const q = D.cats[cat][qi], order = shuffle([0, 1, 2, 3]);
    if (!tie) G.tq += 1;
    G.q = { c: cat, t: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a), th: 1, last: !tie && G.tq === cfg.thN ? 1 : 0, tie: tie ? 1 : 0 };
    G.rl = tie ? 'Prijestolje · izjednačenje' : 'Prijestolje ' + G.tq + '/' + cfg.thN;
    G.qn += 1; G.sxDone = null;
    for (const p of list()) {
      p.ans = -1; p.ansMs = 0; p.gained = 0; p.ch = -1; p.betRes = 0;
      if (p.pola && !tie) p.hide = shuffle([0, 1, 2, 3].filter((i) => i !== G.q.a)).slice(0, 2); else if (tie) p.hide = null;
    }
    setPhase('question', cfg.q);
    if (tie) { for (const p of list()) if (!G.tieP.includes(p.pid)) p.done = true; }
  }
  function scoreThrone() {
    const max = G.q.last ? cfg.thLast : cfg.thMax, before = paceSnap(), lead0 = G.tLead;
    G.q.cnt = [0, 0, 0, 0];
    for (const p of list()) {
      p.ch = p.ans; if (p.ans >= 0) G.q.cnt[p.ans]++;
      const ok = p.ans === G.q.a;
      if (G.q.tie) { p.gained = 0; continue; }
      if (ok) {
        const ratio = Math.min(1, Math.max(0, 1 - p.ansMs / (cfg.q * 1000)));
        p.gained = Math.round(max / 2 + (max / 2) * ratio) * (p.dbl ? 2 : 1); p.score += p.gained; p.tok = (p.tok || 0) + 1;
      } else p.gained = 0;
      p.betRes = 0;
      if (G.q.last && p.tst > 0) { p.betRes = ok ? p.tst : -p.tst; p.score = Math.max(0, p.score + p.betRes); }
    }
    G.pend = null; G.tChg = null;
    if (G.q.tie) {
      // izjednačenje: pobjeđuje najbrži točan odgovor među izjednačenima (bez slučajnosti)
      const right = list().filter((p) => G.tieP.includes(p.pid) && p.ans === G.q.a).sort((a, b) => a.ansMs - b.ansMs || (a.name < b.name ? -1 : 1));
      G.tieN = (G.tieN || 0) + 1;
      if (right.length) G.tieWin = right[0].pid;
      else if (G.tieN >= cfg.thTieMax) G.tieWin = throneTieFallback(G.tieP);
      if (G.tieWin) G.pend = { mo: { k: 'THRONE_TIE', lv: 3, t: '👑 Prijestolje je odlučeno!', s: (R.get(G.tieWin) || {}).name + ' pobjeđuje u izjednačenju', a: [G.tieWin], pose: ['victory'], snd: 'stingLeader' } };
    } else {
      if (G.q.last) G.thLastDone = 1;
      TD.afterQuestion();
      const lead = thLeader();
      if (lead && lead !== lead0) {
        G.tLead = lead; G.tChg = { to: lead, from: lead0 };
        const N = (R.get(lead) || {}).name, O = lead0 ? (R.get(lead0) || {}).name : '';
        const ln = [['👑 ' + N + ' preuzima prijestolje!', O ? O + ' se vraća među izazivače' : 'Krčmar briše stolicu za novog vladara'],
          ['👑 Smjena na prijestolju!', N + ' sjeda gore, a ' + (O || 'netko') + ' traži novu stolicu']][(G.tq || 0) % 2];
        G.pend = { mo: { k: 'THRONE_TAKE', lv: 3, t: ln[0], s: ln[1], a: lead0 ? [lead, lead0] : [lead], pose: lead0 ? ['victory', 'shocked'] : ['victory'], vs: lead0 ? 1 : 0, snd: 'stingLeader' } };
      }
    }
    G.pace = paceOf(before);
    const pc = cfg.pace && cfg.pace[G.pace];
    const rb = (pc ? pc.t : cfg.reveal != null ? cfg.reveal : 10.5) + (G.pend && G.pend.mo ? (cfg.paceMo != null ? cfg.paceMo : 1) : 0);
    setPhase('reveal', rb + (cfg.kr ? cfg.kr.wait : 0));
    krRevealStart(rb);
  }
  function throneTieFallback(ids) {
    // pošteno i unaprijed poznato: više točnih u finalu, pa više bodova prije finala, pa abeceda
    return ids.map((id) => R.get(id)).filter(Boolean).sort((a, b) => (b.tok || 0) - (a.tok || 0) || (b.tq0 || 0) - (a.tq0 || 0) || (a.name < b.name ? -1 : 1))[0].pid;
  }
  function throneEnd() {
    const ps = active(), top = Math.max(0, ...ps.map((p) => p.score)), tied = ps.filter((p) => p.score === top).map((p) => p.pid);
    if (tied.length > 1 && !G.tieWin) { G.tieP = tied; return throneTieQ(); }
    finish();
  }
  function throneTieQ() {
    if (G.tieWin) { G.tieP = null; return finish(); }
    throneQ(true);
  }
  function throneBotRisk(b) {
    // vođa s velikom prednošću igra sigurno; tko kasni više nego što pitanje nosi, ide na sve; inače ponekad hrabro
    const ps = active().slice().sort((x, y) => y.score - x.score), lead = ps[0], second = ps[1];
    if (!lead || b.score <= 0) return 0;
    if (b === lead) return second && b.score - second.score > cfg.thLast + 1000 ? 0 : Math.random() < 0.35 ? 1 : 0;
    const gap = lead.score - b.score;
    if (gap > cfg.thLast) return b.score >= (cfg.thRisk[2] || 0) * 0.5 ? 2 : 1;
    return Math.random() < 0.55 ? 1 : 0;
  }
  function finish() {
    clear();""")
rep("    const ranked = list().slice().sort((a, b) => b.fstep - a.fstep || (b.fu || 0) - (a.fu || 0) || b.score - a.score);",
    "    const ranked = G.throne ? list().slice().sort((a, b) => (b.pid === G.tieWin) - (a.pid === G.tieWin) || b.score - a.score || (b.tok || 0) - (a.tok || 0) || (b.tq0 || 0) - (a.tq0 || 0) || (a.name < b.name ? -1 : 1))\n"
    "      : list().slice().sort((a, b) => b.fstep - a.fstep || (b.fu || 0) - (a.fu || 0) || b.score - a.score);")
# nakon otkrivanja: prijestolje ide dalje svojim redom (ne iz rasporeda)
rep("  function afterReveal() {\n    const pd = G.pend;\n    G.pend = null;", "  function afterReveal() {\n    const pd = G.pend;\n    G.pend = null;\n    if (G.throne) return throneNext();")
# ponovno pokretanje
rep("G.ph = 'lobby'; G.s += 1; G.pi = -1; G.inFinale = false; G.win = null; G.rl = ''; G.leg = null; G.crownWin = null; TD.reset(); pactReset();",
    "G.ph = 'lobby'; G.s += 1; G.pi = -1; G.inFinale = false; G.throne = false; G.tq = 0; G.tieP = null; G.tieWin = null; G.thRiskDone = 0; G.thLastDone = 0; G.tLead = null; G.tChg = null; G.win = null; G.rl = ''; G.leg = null; G.crownWin = null; TD.reset(); pactReset();")
rep("    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null;", "    G.pi = -1; G.qn = 0; G.inFinale = false; G.throne = false; G.tq = 0; G.tieP = null; G.tieWin = null; G.thRiskDone = 0; G.thLastDone = 0; G.tLead = null; G.tChg = null; G.win = null;")
# Tavern Director u prijestolju: dopuštene vrste trenutaka
rep("        if (G.inFinale) return ['CLOSE_RACE',", "        if (G.throne) return ['NEW_LEADER', 'THRONE', 'LEAD_HABIT', 'RIVAL_LEAD', 'COMEBACK', 'COMEBACK_BIG', 'CB_RISE', 'STREAK3', 'STREAK5'].includes(c.type) && gap >= 1;\n        if (G.inFinale) return ['CLOSE_RACE',")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR prijestolje (motor) OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# privatno: vlastita odluka o riziku (nikad drugima)
rep("  function priv(pid) {\n    const p = R.get(pid), b0 = priv0(pid),", "  function priv(pid) {\n    const pr = privBase(pid), p0 = R.get(pid);\n    if (p0 && G.throne && G.ph === 'trisk') return Object.assign(pr || { can: false, used: false, inv: [], out: null, note: p0.note }, { trk: p0.trk || 0 });\n    return pr;\n  }\n  function privBase(pid) {\n    const p = R.get(pid), b0 = priv0(pid),")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR prijestolje priv OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# legende i završna riječ s prijestoljem: tijesno = mala razlika u bodovima; poruka pobjednika prema tijeku finala
rep("const tight2 = G.crownWin === W || (sec2 && wp.fstep - sec2.fstep <= 1);",
    "const tight2 = G.throne ? !!(sec2 && wp.score - sec2.score <= 1500) || !!G.tieWin : G.crownWin === W || (sec2 && wp.fstep - sec2.fstep <= 1);")
rep("    // kratka priča iz odabranih događaja", "    if (wp && G.throne) wl = G.tieWin === W ? 'Osvaja prijestolje u izjednačenju!' : (wp.tq0r || 1) > 1 ? 'Preuzima Krčmarovo prijestolje u završnom obračunu!' : 'Čuva Krčmarovo prijestolje do kraja!';\n    // kratka priča iz odabranih događaja")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR prijestolje legende OK')
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# posljednji poziv: tekst prema odabranom završetku (prijestolje ne spominje piramidu)
rep("{ snd: 'stingLeader', vs: 0, onShow: () => { T.fcAnn = 1; } });\n", "{ snd: 'stingLeader', vs: 0, onShow: () => { T.fcAnn = 1; } });\n        if (c && G.opt && G.opt.end === 'throne') { c.t = '👑 Posljednji poziv!'; c.s = 'Još ' + numW(left) + ' do Krčmarova prijestolja! Svaki bod nosiš u finale.'; }\n")
rep("      if (left === 1) { const c = cand('PJ_LAST', 4.5, 'pjlast', {}, [], [], { snd: 'stingSmall' });",
    "      if (left === 1) { const c = cand('PJ_LAST', 4.5, 'pjlast', {}, [], [], { snd: 'stingSmall' }); if (c && G.opt && G.opt.end === 'throne') c.s = 'Još jedno pitanje prije borbe za prijestolje!';")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR posljednji poziv prema završetku OK')
# izmjene s grane main (v54 → 98dee1a): nasumičan redoslijed napada, limit napada u svim načinima, jasniji tekstovi
import json as _json
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
for _o, _n in _json.load(open(SP + '/v3/port-main2-engine.json', encoding='utf-8')):
    rep(_o, _n)
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR izmjene s maina (moći, tekstovi) OK')
# izmjene s grane main (v55 → f2d0ede): Novčić utjehe, uvijek ponuđena obrana ili korist, završni poredak iz motora
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
for _o, _n in _json.load(open(SP + '/v3/port-main3-engine.json', encoding='utf-8')):
    rep(_o, _n)
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR izmjene s maina (utjeha, poredak) OK')
# ---------- odabir kategorija (v59+): domaćin u predvorju isključuje kategorije koje ne želi (najmanje 4 ostaju uključene) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)))", "enabledCats().filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)))", 4)
rep("len: LENS[o.len] ? o.len : 'std', end: o.end === 'throne' ? 'throne' : 'pyr' },", "len: LENS[o.len] ? o.len : 'std', end: o.end === 'throne' ? 'throne' : 'pyr', off: [] },")
rep("len: G.opt.len, end: G.opt.end };", "len: G.opt.len, end: G.opt.end, off: G.opt.off.slice(), all: Object.keys(D.cats) };")
rep("  function setOpt(k, v) { if (G.ph !== 'lobby') return;",
    "  function enabledCats() { const all = Object.keys(D.cats), off = G.opt && G.opt.off ? G.opt.off : []; const on = all.filter((c) => off.indexOf(c) < 0); return on.length >= 4 ? on : all; }\n"
    "  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'cats') { if (!Array.isArray(v)) return; const off = Object.keys(D.cats).filter((c) => v.indexOf(c) >= 0); G.opt.off = off; onChange(); return; }")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR odabir kategorija (motor) OK')
# ---------- nova mini-igra "Uljez u krčmi" + odabir mini-igara u predvorju (v61) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("maj: 10, majReveal: 4, majN: 3,", "maj: 10, majReveal: 4, majN: 3, ulj: 18, uljVote: 14, uljReveal: 7,")
rep("blitz: 1, maj: 1 } },", "blitz: 1, maj: 1, uljez: 1 } },")
rep("secret2: 1, order: 1, hilo: 1, blitz: 1, maj: 1 };", "secret2: 1, order: 1, hilo: 1, blitz: 1, maj: 1, uljez: 1, uljezVote: 1 };")
rep("const SKIPPABLE = {",
    "HOWTO.uljez = { n: 'Uljez u krčmi', i: '🎭', r: ['Jedna osoba ne zna temu, a ostali znaju.', 'Odaberi dva pojma koji najbolje pašu uz temu.', 'Zatim glasajte tko je uljez.'] };\n"
    "KIND.uljez = 'social'; DATA_KEY.uljez = 'ulj'; CHALLENGES.push('uljez');\n"
    "const MG_ALL = CHALLENGES.concat(['who', 'emoji']);\n"
    "const SKIPPABLE = {")
rep("blitzReveal: 1, majReveal: 1, duelResult: 1, moment: 1 };", "blitzReveal: 1, majReveal: 1, uljezReveal: 1, duelResult: 1, moment: 1 };")
rep("blitz: 1, maj: 1, secret: 1, secret2: 1 };", "blitz: 1, maj: 1, uljez: 1, uljezVote: 1, secret: 1, secret2: 1 };")
rep("hiloReveal: 1, blitzReveal: 1, majReveal: 1 };", "hiloReveal: 1, blitzReveal: 1, majReveal: 1, uljezReveal: 1 };")
# unos
rep("      case 'maj': {\n        if (!isInt(inp.v) || inp.v < 0 || inp.v >= G.mj.q.o.length) return false;",
    "      case 'uljez': {\n        const a = inp.v, n = G.ul.terms.length;\n"
    "        if (!Array.isArray(a) || a.length !== 2 || !a.every((x) => isInt(x) && x >= 0 && x < n) || a[0] === a[1]) return false;\n"
    "        p.ulP = a.slice(); break;\n      }\n"
    "      case 'uljezVote': {\n        if (typeof inp.v !== 'string' || inp.v === p.pid || !active().some((q) => q.pid === inp.v)) return false;\n"
    "        p.ulV = inp.v; break;\n      }\n"
    "      case 'maj': {\n        if (!isInt(inp.v) || inp.v < 0 || inp.v >= G.mj.q.o.length) return false;")
rep("      case 'maj': return scoreMaj();\n", "      case 'maj': return scoreMaj();\n      case 'uljez': return startUljezVote();\n      case 'uljezVote': return scoreUljez();\n      case 'uljezReveal': return afterReveal();\n")
rep("    if (k === 'maj') return startMaj();\n    return next();", "    if (k === 'maj') return startMaj();\n    if (k === 'uljez') return startUljez();\n    return next();")
# pool i varijante prema odabiru mini-igara
rep("    const pool = CHALLENGES.filter((k) => (k !== 'maj' || active().length >= 3) && (D[DATA_KEY[k]] || []).length);",
    "    const pool0 = CHALLENGES.filter((k) => ((k !== 'maj' && k !== 'uljez') || active().length >= 3) && (D[DATA_KEY[k]] || []).length);\n"
    "    const pool = pool0.filter(mgOn).length ? pool0.filter(mgOn) : pool0;")
rep("if ((D[DATA_KEY[k]] || []).length) G.qvAt.set(slots.shift(), k);", "if ((D[DATA_KEY[k]] || []).length && mgOn(k)) G.qvAt.set(slots.shift(), k);")
rep("const vars = ['who', 'emoji'].filter((k) => (D[DATA_KEY[k]] || []).length);", "const vars = ['who', 'emoji'].filter((k) => (D[DATA_KEY[k]] || []).length && mgOn(k));")
# mini-igra
rep("  function startMaj() {",
"""  // ----- Uljez u krčmi: jedna osoba ne zna temu; svi biraju dva pojma, zatim glasaju tko je uljez -----
  function startUljez() {
    const set = G.used.uljez || (G.used.uljez = new Set());
    const it = D.ulj[unusedIndex(D.ulj, set)];
    const terms = shuffle(it.y.map((w) => ({ w, ok: 1 })).concat(it.n.map((w) => ({ w, ok: 0 }))));
    const act = active();
    G.ul = { th: it.t, terms, imp: act[rnd(act.length)].pid, cnt: {}, caught: false };
    for (const p of list()) { p.gained = 0; p.ulP = null; p.ulV = null; }
    setPhase('uljez', cfg.ulj);
  }
  function startUljezVote() { setPhase('uljezVote', cfg.uljVote); }
  function scoreUljez() {
    const cnt = {}, imp = G.ul.imp;
    for (const p of list()) cnt[p.pid] = 0;
    for (const p of active()) if (p.ulV && cnt[p.ulV] !== undefined) cnt[p.ulV]++;
    const ic = cnt[imp] || 0;
    const caught = ic > 0 && Object.keys(cnt).every((k) => k === imp || cnt[k] < ic);
    G.ul.cnt = cnt; G.ul.caught = caught;
    for (const p of list()) {
      p.gained = p.pid === imp ? (caught ? 0 : 400) : (p.ulV === imp ? 250 : 0);
      p.score += p.gained;
    }
    TD.afterScores();
    setPhase('uljezReveal', cfg.uljReveal);
  }
  function ulPriv(pid) {
    const p = R.get(pid);
    if (!p || p.bot || !G.ul || (G.ph !== 'uljez' && G.ph !== 'uljezVote')) return null;
    return G.ul.imp === pid ? { imp: 1 } : { th: G.ul.th };
  }
  function ulBotPick(b) {
    const T = G.ul.terms, idx = T.map((_, i) => i);
    if (b.pid === G.ul.imp) { const f = rnd(2); const same = shuffle(idx.filter((i) => T[i].ok === f)); return same.slice(0, 2); }
    const good = shuffle(idx.filter((i) => T[i].ok)), bad = shuffle(idx.filter((i) => !T[i].ok));
    return Math.random() < 0.1 ? [good[0], bad[0]] : good.slice(0, 2);
  }
  function ulBotVote(b) {
    const others = active().filter((q) => q.pid !== b.pid);
    if (b.pid !== G.ul.imp) {
      const sus = others.filter((q) => q.ulP && q.ulP.some((i) => !G.ul.terms[i].ok));
      if (sus.length) return pick(sus).pid;
    }
    return pick(others).pid;
  }
  function startMaj() {""")
# botovi
rep("      case 'maj': return 1500 + rnd(cfg.maj * 600);\n", "      case 'maj': return 1500 + rnd(cfg.maj * 600);\n      case 'uljez': return 2500 + rnd(cfg.ulj * 500);\n      case 'uljezVote': return 1500 + rnd(cfg.uljVote * 500);\n")
rep("      case 'maj': return { s, v: rnd(G.mj.q.o.length) };\n", "      case 'maj': return { s, v: rnd(G.mj.q.o.length) };\n      case 'uljez': return { s, v: ulBotPick(b) };\n      case 'uljezVote': return { s, v: ulBotVote(b) };\n")
# pogled
rep("      if (ph === 'majReveal') { e.mv = p.mjV; e.g = p.gained; }", "      if (ph === 'majReveal') { e.mv = p.mjV; e.g = p.gained; }\n      if (ph === 'uljezReveal') e.g = p.gained;")
rep("    if (ph === 'maj' || ph === 'majReveal') v.mj =",
"""    if (G.ul && (ph === 'uljez' || ph === 'uljezVote' || ph === 'uljezReveal')) {
      v.ul = { t: G.ul.terms.map((x) => x.w) };
      if (ph !== 'uljez') { v.ul.pk = {}; for (const p of list()) if (p.ulP) v.ul.pk[p.pid] = p.ulP; }
      if (ph === 'uljezReveal') {
        v.ul.th = G.ul.th; v.ul.ok = G.ul.terms.map((x) => x.ok); v.ul.imp = G.ul.imp; v.ul.caught = G.ul.caught ? 1 : 0; v.ul.cnt = G.ul.cnt; v.ul.vt = {};
        for (const p of list()) if (p.ulV) v.ul.vt[p.pid] = p.ulV;
      }
    }
    if (ph === 'maj' || ph === 'majReveal') v.mj =""")
rep("  function priv(pid) {\n    const pr = privBase(pid), p0 = R.get(pid);",
    "  function priv(pid) {\n    const pr0 = privBase(pid), p0 = R.get(pid), ul = ulPriv(pid);\n"
    "    const pr = ul ? Object.assign(pr0 || { can: false, used: false, inv: [], out: null, note: p0.note }, { ul }) : pr0;")
# odabir mini-igara
rep("off: [] },", "off: [], offMg: [] },")
rep("off: G.opt.off.slice(), all: Object.keys(D.cats) };",
    "off: G.opt.off.slice(), all: Object.keys(D.cats), mgOff: G.opt.offMg.slice(), mg: MG_ALL.filter((k) => (D[DATA_KEY[k]] || []).length).map((k) => [k, HOWTO[k].i, HOWTO[k].n, CHALLENGES.indexOf(k) >= 0 ? 1 : 0]) };")
rep("  function enabledCats() {",
    "  function mgOn(k) { return !(G.opt && G.opt.offMg && G.opt.offMg.indexOf(k) >= 0); }\n  function enabledCats() {")
rep("if (k === 'cats') { if (!Array.isArray(v)) return;",
    "if (k === 'mg') { if (!Array.isArray(v)) return; const off = MG_ALL.filter((c) => v.indexOf(c) >= 0); if (!CHALLENGES.some((c) => off.indexOf(c) < 0 && (D[DATA_KEY[c]] || []).length)) return; G.opt.offMg = off; onChange(); return; } if (k === 'cats') { if (!Array.isArray(v)) return;")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('KR uljez + odabir mini-igara (motor) OK')
