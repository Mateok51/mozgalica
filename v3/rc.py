# Rivalski obračun — dobrovoljni izazov dvaju ljudi, rješava se na sljedećem običnom pitanju (lanac: howto.py → rc.py)
import subprocess, sys
SP = '/root/mozgalica'
subprocess.run([sys.executable, SP + '/v3/howto.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---------- konfiguracija (jedno mjesto) ----------
rep("  moment: 2.4, duelIntro: 2.6,", """  // rivalski obračun: ulog po igraču (točno pitanje vrijedi 500–1000, pa 200 znači zamah od 400 — osjeti se, ali ne odlučuje partiju),
  // od kojeg pitanja, koliko prihvaćenih po partiji, pokušaja po igraču, trajanje ponude (s)
  rcStake: 200, rcAfter: 5, rcMax: 2, rcSends: 2, rcOffer: 20,
  moment: 2.4, duelIntro: 2.6,""")
rep("    opt: { pacts: o.pacts !== undefined ? !!o.pacts : true }, pacts: [], offers: [], btq: [],",
    "    opt: { pacts: o.pacts !== undefined ? !!o.pacts : true, rc: o.rc !== undefined ? !!o.rc : true }, pacts: [], offers: [], btq: [],\n    rc: { offers: [], act: null, res: null, n: 0, seq: 0 },")

# ---------- pravila ----------
rep("  function pactsOn() { return !!G.opt.pacts; }", """  function pactsOn() { return !!G.opt.pacts; }
  // ===================== RIVALSKI OBRAČUN =====================
  // Dobrovoljno, samo ljudi, najviše rcMax prihvaćenih po partiji; ponude samo između pitanja; ishod na sljedećem običnom pitanju.
  const RC_WIN = { vote: 1, voteResult: 1, power: 1, cast: 1, reveal: 1, bet: 1 };
  const rcOn = () => !!G.opt.rc;
  function rcClean() {
    const t = now();
    G.rc.offers = G.rc.offers.filter((o) => {
      const f = R.get(o.f), to = R.get(o.t);
      const live = o.until > t && f && to && f.on && to.on && RC_WIN[G.ph] && !G.rc.act;
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
        G.rc.offers.push({ id: ++G.rc.seq, f: p.pid, t: t.pid, until: now() + cfg.rcOffer * 1000, rev: rcRev(p.pid, t.pid) ? 1 : 0, riv: rcRival(p.pid, t.pid) ? 1 : 0 });
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
  }""")
# akcije idu kroz isti zaštićeni kanal kao paktovi (domaćin provjerava ključ igrača)
rep("""  function pactAction(pid, a) {
    const p = R.get(pid);
    if (!p || p.bot || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;""", """  function pactAction(pid, a) {
    const p = R.get(pid);
    if (!p || p.bot || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;
    if (a.k.slice(0, 2) === 'rc') { const r = rcAction(p, a); if (r) onChange(); return r; }""")
# bodovanje: nakon redovnih bodova i uloga, prije krčme (da poredak uključuje obračun)
rep("""    resolveSecret();
    pactAfterQuestion();
    TD.afterQuestion();""", """    resolveSecret();
    rcResolve();
    pactAfterQuestion();
    TD.afterQuestion();""")
# ponude se zatvaraju čim krene pitanje (ne šalju se tijekom odgovaranja)
rep("""  function setPhase(ph, secs) {
    clear();""", """  function setPhase(ph, secs) {
    clear();
    if (G.rc && !RC_WIN[ph]) { for (const o of G.rc.offers) note(R.get(o.f), '⚔️ Izazov nije prihvaćen.', 'no'); G.rc.offers = []; }""")
rep("""  function startFinale() {""", """  function startFinale() {
    rcCancelAll('počinje veliko finale.');""")
rep("    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; }", "    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; p.rx = 0; p.rcSent = 0; p.rcWon = false; }\n    G.rc = { offers: [], act: null, res: null, n: 0, seq: 0 };")
rep("  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'pacts') { G.opt.pacts = !!v; onChange(); } }",
    "  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'pacts') { G.opt.pacts = !!v; onChange(); } if (k === 'rc') { G.opt.rc = !!v; onChange(); } }")
# javno stanje: aktivni obračun (javan nakon prihvaćanja) i ishod na otkrivanju
rep("      if (ph === 'reveal' && p.xb) e.xb = p.xb;", "      if (ph === 'reveal' && p.xb) e.xb = p.xb;\n      if (ph === 'reveal' && p.rx) e.rx = p.rx;")
rep("    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0 };", """    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, rc: G.opt.rc ? 1 : 0 };
    if (G.rc && G.rc.act && G.ph !== 'lobby') v.rc = { a: G.rc.act.a, b: G.rc.act.b, st: G.rc.act.stake, rev: G.rc.act.rev };
    if (ph === 'reveal' && G.rc && G.rc.res) v.rcr = G.rc.res;""")
# privatno: ponude i mogućnost izazova (neovisno o paktovima)
rep("""    if (!p || p.bot || !pactsOn()) return null;
    cleanOffers();
    const k = pactOf(p), mate = partnerOf(p);
    const o = {""", """    if (!p || p.bot || (!pactsOn() && !rcOn())) return null;
    if (!pactsOn()) return Object.assign({ can: false, used: false, inv: [], out: null, note: p.note }, rcPriv(p));
    cleanOffers();
    const k = pactOf(p), mate = partnerOf(p);
    const o = {""")
rep("""      if (p.wh && p.wh.s === G.s) o.k.wh = p.wh.c;
    }
    return o;
  }""", """      if (p.wh && p.wh.s === G.s) o.k.wh = p.wh.c;
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
    const inv = G.rc.offers.filter((x) => x.t === p.pid).map((x) => ({ f: x.f, ms: Math.max(0, x.until - now()), dur: cfg.rcOffer * 1000, rev: x.rev, riv: x.riv }));
    if (inv.length) r.inv = inv;
    const out = G.rc.offers.find((x) => x.f === p.pid);
    if (out) r.out = { t: out.t, ms: Math.max(0, out.until - now()) };
    return { rc: r };
  }""")

# ---------- krčma: priča obračuna, legende, tempo ----------
rep("""    function onLoyal(evs) {""", """    // rivalski obračun: rečenica za ishod (osveta je samo kontekst), pamćenje za legende
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
    function onLoyal(evs) {""")
rep("secretPick, onBetray, onLoyal, duelNote, duelOut, get state() { return T; } };", "secretPick, onBetray, onLoyal, onShowdown, duelNote, duelOut, get state() { return T; } };")
rep("stat: { qn: 0, ans: {}, ok: {}, fast: {}, maxSt: {}, betNet: {}, rise: {}, duels: [], bt: [], loyal: [] },",
    "stat: { qn: 0, ans: {}, ok: {}, fast: {}, maxSt: {}, betNet: {}, rise: {}, duels: [], bt: [], loyal: [], rc: [] },")
# isti potez: kartica obračuna zamjenjuje običan komentar krčme (osim velikih događaja), da ne budu dvije kartice
rep("""      finalizePend(pickMoment(cands));
    }
    function afterScores() {""", """      if (G.rc && G.rc.res) { const c = pickMoment(cands.filter((x) => x.score >= 9)); finalizePend(c); return; }
      finalizePend(pickMoment(cands));
    }
    function afterScores() {""")
# tempo: obračun na ovom pitanju = barem napeto
rep("""    if (lastQ) return 't';
    if (lv >= 2) return 't';""", """    if (lastQ) return 't';
    if (lv >= 2) return 't';
    if (G.rc && G.rc.res && G.rc.res.k === 'win') return 't';""")
# legende: obračun kao kandidat (broj nagrada se ne povećava)
rep("""  const LEG_T = { cb: ['🔥', 'Povratak večeri'],""", """  const LEG_T = { rc: ['⚔️', 'Pobjednik obračuna'], cb: ['🔥', 'Povratak večeri'],""")
rep("""    // kladionica: stvarni neto rezultat (dobici − gubici)""", """    // rivalski obračun: pobjednik najvećeg (po prenesenim bodovima)
    { const won = S.rc.filter((x) => x.k === 'win' && R.get(x.w)).sort((x, y) => y.t - x.t || (x.w < y.w ? -1 : 1))[0];
      if (won) { const l = won.w === won.a ? won.b : won.a; add('rc', 58 + won.t / 20 + (won.rev && won.w === won.a ? 10 : 0), [won.w, l], nmL(won.w) + ' pobjeđuje u obračunu: ' + nmL(won.w) + ' vs ' + nmL(l), '+' + bodN(won.t) + ' iz protivnikova uloga', 'pair:' + [won.w, l].sort().join('|')); } }
    // kladionica: stvarni neto rezultat (dobici − gubici)""")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('OBRAČUN OK')
