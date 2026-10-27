# Krčmarove tajne ponude (lanac: sgd.py → tk.py)
# Krčmar privatno nudi jednom čovjeku okladu "Hoće li X pogriješiti na sljedećem pitanju?" (+win / −loss, fiksno).
# Ponuda stiže na početku glasanja za kategoriju i zaključava se prije otkrivanja kategorije; pitanje se bira tek kasnije,
# pa ni krčmar ni igrač ne znaju ništa o pitanju. Postojeća kladionica (bet) se ne dira.
import subprocess, sys
SP = '/root/mozgalica'
subprocess.run([sys.executable, SP + '/v3/sgd.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---------- 1) postavke (jedno mjesto za balans) ----------
rep("  rcStake: 200, rcAfter: 5, rcMax: 2, rcSends: 2, rcOffer: 20,", """  rcStake: 200, rcAfter: 5, rcMax: 2, rcSends: 2, rcOffer: 20,
  // krčmarove tajne ponude: dobitak / gubitak (točan odgovor vrijedi 500–1000, pa je oklada osjetna, ali ne odlučuje partiju;
  // očekivani dobitak je ≈ 0 kad meta griješi u ~40 % pitanja), od kojeg pitanja (nakon after odigranih), najviše prihvaćenih
  // po partiji, najviše ponuda po partiji, vjerojatnost ponude na prikladnom glasanju, najmanji razmak (pitanja) između ponuda
  tk: { win: 150, loss: 100, after: 5, perGame: 2, offers: 3, chance: 0.5, gap: 2 },""")
rep("opt: { pacts: o.pacts !== undefined ? !!o.pacts : true, rc: o.rc !== undefined ? !!o.rc : true },",
    "opt: { pacts: o.pacts !== undefined ? !!o.pacts : true, rc: o.rc !== undefined ? !!o.rc : true, tk: o.tk !== undefined ? !!o.tk : false },")
rep("    rc: { offers: [], act: null, res: null, n: 0, seq: 0 },\n  };", "    rc: { offers: [], act: null, res: null, n: 0, seq: 0 },\n    tk: { cur: null, res: null, n: 0, offered: 0, seq: 0, lastBn: -9, got: {}, log: [] },\n  };")

# ---------- 2) dok igrač odlučuje o ponudi, glasanje ne završava ranije (izvana izgleda kao da još glasa) ----------
rep("  const allDone = () => { const a = active(); return a.length > 0 && a.every((p) => p.done); };",
    "  const tkHold = (p) => !!(G.tk && G.tk.cur && G.tk.cur.st === 'OFFERED' && G.tk.cur.f === p.pid && G.ph === 'vote');\n"
    "  const allDone = () => { const a = active(); return a.length > 0 && a.every((p) => p.done && !tkHold(p)); };")
rep("      if ((ph === 'vote' && p.done) || (ph === 'voteResult' && p.vote >= 0)) e.vt = p.vote;",
    "      if ((ph === 'vote' && p.done && !tkHold(p)) || (ph === 'voteResult' && p.vote >= 0)) e.vt = p.vote;")
rep("      const e = { id: p.pid, n: p.name, a: p.av, sc: p.score, c: p.on ? 1 : 0, ok: p.done ? 1 : 0 };",
    "      const e = { id: p.pid, n: p.name, a: p.av, sc: p.score, c: p.on ? 1 : 0, ok: p.done && !tkHold(p) ? 1 : 0 };")

# ---------- 3) tijek: ponuda na početku glasanja, zaključavanje prije otkrivanja kategorije, obračun nakon pitanja ----------
rep("    for (const p of list()) p.vote = -1;\n    setPhase('vote', cfg.vote);", "    for (const p of list()) p.vote = -1;\n    setPhase('vote', cfg.vote);\n    tkOffer();")
rep("  function resolveVote() {\n", "  function resolveVote() {\n    tkLock();\n")
rep("    resolveSecret();\n    rcResolve();\n", "    resolveSecret();\n    rcResolve();\n    tkResolve();\n")
rep("    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; p.rx = 0; p.rcSent = 0; p.rcWon = false; }",
    "    for (const p of list()) { p.bet = 0; p.betRes = 0; p.xb = 0; p.rx = 0; p.rcSent = 0; p.rcWon = false; p.tb = 0; }\n"
    "    G.tk = { cur: null, res: null, n: 0, offered: 0, seq: 0, lastBn: -9, got: {}, log: [] };")
# meta izgubi vezu dok oklada čeka: zapamti (bez odgovora = poništeno)
rep("    for (const p of list()) if (!p.bot && !p.local && p.on && !seen.has(p.pid)) { p.on = false; changed = true; }",
    "    for (const p of list()) if (!p.bot && !p.local && p.on && !seen.has(p.pid)) { p.on = false; changed = true; tkGone(p); }")
# tempo: riješena ponuda dobiva napetije (malo dulje) otkrivanje da se kartica stigne pročitati
rep("    if (G.rc && G.rc.res && G.rc.res.k === 'win') return 't';", "    if (G.rc && G.rc.res && G.rc.res.k === 'win') return 't';\n    if (G.tk && G.tk.res && G.tk.res.k !== 'off') return 't';")

# ---------- 4) sam sustav ----------
rep("  const humansIn = () => list().filter((p) => !p.bot);", r"""  // ===================== KRČMAROVE TAJNE PONUDE =====================
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
    if (!tkOn() || !K || G.ph !== 'vote' || G.inFinale || G.qv || X.cur) return;
    if ((G.bdone || 0) < K.after || X.n >= K.perGame || X.offered >= K.offers || G.bn - X.lastBn < K.gap) return;
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
    X.got[c.f.pid] = 1; X.offered++; X.lastBn = G.bn;
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
    if (G.ph !== 'vote' || G.s !== o.s || now() >= G.endsAt) return false;
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
  const humansIn = () => list().filter((p) => !p.bot);""")

# ---------- 5) privatno stanje: postojeći priv + ponuda ----------
rep("  function priv(pid) {\n    const p = R.get(pid);\n    if (!p || p.bot || (!pactsOn() && !rcOn())) return null;",
    "  function priv(pid) {\n    const p = R.get(pid), b = priv0(pid), t = p && !p.bot ? tkPriv(p) : null;\n    if (!t) return b;\n"
    "    return Object.assign(b || { can: false, used: false, inv: [], out: null, note: p.note }, { tk: t });\n  }\n"
    "  function priv0(pid) {\n    const p = R.get(pid);\n    if (!p || p.bot || (!pactsOn() && !rcOn())) return null;")
rep("  function pactAction(pid, a) {\n    const p = R.get(pid);\n    if (!p || p.bot || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;\n",
    "  function pactAction(pid, a) {\n    const p = R.get(pid);\n    if (!p || p.bot || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;\n"
    "    if (a.k === 'tkAccept' || a.k === 'tkDecline') { const r = tkAction(p, a); if (r) { if (G.ph === 'vote' && allDone()) endPhase(); else onChange(); } return r; }\n")
rep("if (k === 'rc') { G.opt.rc = !!v; onChange(); } }", "if (k === 'rc') { G.opt.rc = !!v; onChange(); } if (k === 'tk') { G.opt.tk = !!v; onChange(); } }")

# ---------- 6) javni pogled: samo ishod, tek nakon obračuna ----------
rep("      if (ph === 'reveal' && p.rx) e.rx = p.rx;", "      if (ph === 'reveal' && p.rx) e.rx = p.rx;\n      if (ph === 'reveal' && p.tb) e.tb = p.tb;")
rep("    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, rc: G.opt.rc ? 1 : 0 };", "    if (G.ph === 'lobby') v.opt = { pacts: G.opt.pacts ? 1 : 0, rc: G.opt.rc ? 1 : 0, tk: G.opt.tk ? 1 : 0 };")
rep("    if (ph === 'reveal' && G.rc && G.rc.res) v.rcr = G.rc.res;", "    if (ph === 'reveal' && G.rc && G.rc.res) v.rcr = G.rc.res;\n    if (ph === 'reveal' && G.tk && G.tk.res) v.tkr = G.tk.res;")

# ---------- 7) Tavern Director: rečenica ishoda, legenda, prednost većih događaja ----------
rep("    function onLoyal(evs) {", r"""    // tajna ponuda: rečenica prema povijesti (niz, rival); isti igrač ne dobiva odmah i trenutak krčme
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
    function onLoyal(evs) {""")
rep("    return { reset, onVote, onPower, afterQuestion,", "    return { reset, onTk, onVote, onPower, afterQuestion,")
rep("stat: { qn: 0, ans: {}, ok: {}, fast: {}, maxSt: {}, betNet: {}, rise: {}, duels: [], bt: [], loyal: [], rc: [] },",
    "stat: { qn: 0, ans: {}, ok: {}, fast: {}, maxSt: {}, betNet: {}, rise: {}, duels: [], bt: [], loyal: [], rc: [], tk: [] },")
rep("      if (G.rc && G.rc.res) { const c = pickMoment(cands.filter((x) => x.score >= 9)); finalizePend(c); return; }",
    "      if ((G.rc && G.rc.res) || (G.tk && G.tk.res)) { const c = pickMoment(cands.filter((x) => x.score >= 9)); finalizePend(c); return; }")
# legende: kandidat (ne povećava broj nagrada; vrijedi manje od izdaje, povratka i rivalstva)
rep("rv: ['⚔️', 'Rivalstvo večeri'], rev: ['🔁', 'Osveta večeri'], bet: ['💰', 'Majstor rizika'],",
    "rv: ['⚔️', 'Rivalstvo večeri'], rev: ['🔁', 'Osveta večeri'], tk: ['🍺', 'Krčmarov miljenik'], bet: ['💰', 'Majstor rizika'],")
rep("    // kladionica: stvarni neto rezultat (dobici − gubici)\n", """    // tajna ponuda: najzanimljivija uspješna (kraj velikog niza, rival)
    { const w = (S.tk || []).filter((x) => R.get(x.f) && R.get(x.t)).map((x) => ({ x, v: 44 + (x.why === 'st' ? 6 + x.n * 2 : 0) + (x.rv ? 8 : 0) })).sort((a, b) => b.v - a.v)[0];
      if (w) { const x = w.x; add('tk', w.v, [x.f], x.why === 'st' ? 'Predviđa kraj niza od ' + x.n + ': ' + nmL(x.t) : x.rv ? 'Predviđa pogrešku svog rivala: ' + nmL(x.t) : 'Tajna oklada protiv krčmara: ' + nmL(x.t) + ' griješi', '+' + bodN(cfg.tk.win) + ' iz tajne ponude'); } }
    // kladionica: stvarni neto rezultat (dobici − gubici)
""")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('TAJNE PONUDE OK')
