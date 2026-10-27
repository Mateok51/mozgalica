# Tavern Social Flow 2.0 (lanac: tk.py → sf.py)
# - "Vrijeme za dogovore": kratka faza prije glasanja, samo po rasporedu (cfg.sf.at) i samo kad netko ima stvarnu društvenu odluku.
# - Ponude (pakt, rivalski obračun) ne istječu po sekundama nego traju do kraja sljedećeg Vremena za dogovore; nikad se ne
#   prihvaćaju ni šalju dok se odgovara; u piramidi se poništavaju.
# - Izdaja se priprema samo u Vremenu za dogovore i zaključava kad pitanje počne (iznosi i obračun nepromijenjeni).
# - Šapat jednim dodirom: odgovor + šapat su jedna ulazna poruka (inp.w = 1), obrađuje je domaćin.
# - Testni način s botovima (opcija u predvorju, isključena): botovi koriste ISTE funkcije paktova kao ljudi (pactAction),
#   odlučuju po jednostavnim profilima, šapću svoj vlastiti odgovor i o izdaji odlučuju prije pitanja.
# Kad je cfg.sf.on = false, sve radi kao u v28 (stari testovi to koriste).
import subprocess, sys
SP = '/root/mozgalica'
subprocess.run([sys.executable, SP + '/v3/tk.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---------- postavke ----------
rep("  tk: { win: 150, loss: 100,", """  // Social Flow: Vrijeme za dogovore nakon tih odigranih pitanja (atBot u testnom načinu s botovima), trajanje (s),
  // nevidljiva sigurnosna granica kad je jedini čovjek u testnom načinu (nema odbrojavanja), najviše dolaznih ponuda za pakt po igraču
  sf: { on: true, at: [3, 6, 8], atBot: [3, 5, 7, 8], dur: 20, soloMax: 600, inMax: 2,
    // profili botova (samo društvene odluke): prihvaćanje ponude, slanje ponude po fazi, šapat, izdaja po fazi (uz riznicu ≥ btMin)
    prof: { loyal: { acc: 0.85, off: 0.45, wh: 0.8, bt: 0.05 }, sly: { acc: 0.7, off: 0.35, wh: 0.5, bt: 0.4 }, wild: { acc: 0.5, off: 0.4, wh: 0.5, bt: 0.2 } }, btMin: 75 },
  tk: { win: 150, loss: 100,""")
rep("tk: o.tk !== undefined ? !!o.tk : false },", "tk: o.tk !== undefined ? !!o.tk : false, bs: o.bs !== undefined ? !!o.bs : false },")
rep("const INPUT_PHASES = { vote: 1,", "const INPUT_PHASES = { deal: 1, vote: 1,")
rep("  const FC_PH = { vote: 1,", "  const FC_PH = { deal: 1, vote: 1,")
rep("  const RC_WIN = { vote: 1,", "  const RC_WIN = { deal: 1, vote: 1,")

# ---------- ulaz: spremnost i šapat jednim dodirom ----------
rep("""      case 'howto':
        if (inp.ok !== 1) return false;
        break;""", """      case 'howto':
        if (inp.ok !== 1) return false;
        break;
      case 'deal':
        if (inp.ok !== 1) return false;
        break;""")
rep("""        if (p.hide && p.hide.includes(c)) return false;
        const el = now() - G.startedAt;
        const t = Number.isFinite(inp.t) ? inp.t : el;
        p.ans = c; p.ansMs = Math.max(0, Math.min(t, el));
        break;""", """        if (p.hide && p.hide.includes(c)) return false;
        const el = now() - G.startedAt;
        const t = Number.isFinite(inp.t) ? inp.t : el;
        p.ans = c; p.ansMs = Math.max(0, Math.min(t, el));
        if (inp.w === 1 && G.ph === 'question') sfWhisper(p, c);   // odgovori i šapni: ista poruka, isti odgovor
        break;""")

# ---------- tijek: Vrijeme za dogovore prije glasanja ----------
rep("  function startVote() {\n", "  function startVote() {\n    if (sfDeal()) return;\n    startVote0();\n  }\n  function startVote0() {\n")
rep("      case 'vote': return resolveVote();\n", "      case 'deal': return afterDeal();\n      case 'vote': return resolveVote();\n")
rep("    G.seenHow = new Set();\n    TD.reset();\n    pactReset();\n", "    G.seenHow = new Set();\n    TD.reset();\n    pactReset();\n    sfReset();\n")
# stare ponude obračuna nestaju na početku pitanja samo bez Social Flowa
rep("    if (G.rc && !RC_WIN[ph]) {", "    if (G.rc && !RC_WIN[ph] && !sfOn()) {")
rep("    if (INPUT_PHASES[ph]) botsAct();", "    if (INPUT_PHASES[ph]) botsAct();\n    sfBotsTick();")

# ---------- paktovi: prozor, botovi, trajanje ponuda, izdaja ----------
rep("  function pactFree(p) { return !!p && !p.bot && !p.pactUsed && !p.pact; }",
    "  function pactFree(p) { return !!p && (!p.bot || bsOn()) && !p.pactUsed && !p.pact; }")
rep("    return pactsOn() && !G.inFinale && G.ph !== 'lobby' && G.ph !== 'final' && G.qn >= cfg.pactAfter && humansIn().length >= cfg.pactMin;",
    "    return pactsOn() && !G.inFinale && G.ph !== 'lobby' && G.ph !== 'final' && G.qn >= cfg.pactAfter && sfPeople().length >= cfg.pactMin && (!sfOn() || !SF_BUSY[G.ph]);")
rep("    if (!p || p.bot || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;\n    if (a.k === 'tkAccept'",
    "    if (!p || (p.bot && !(botCall && bsOn())) || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;\n    if (a.k === 'tkAccept'")
rep("        if (!pactWindow() || !pactFree(p) || !t || t === p || t.bot) break;",
    "        if (!pactWindow() || !pactFree(p) || !t || t === p || (t.bot && !bsOn())) break;")
rep("        const ghost = !pactFree(t) || G.offers.some((o) => o.to === t.pid && !o.ghost);\n        G.offers.push({ from: pid, to: t.pid, until: now() + cfg.pactOffer * 1000, ghost });",
    "        const ghost = !pactFree(t) || G.offers.filter((o) => o.to === t.pid && !o.ghost).length >= (sfOn() ? cfg.sf.inMax : 1);\n"
    "        G.offers.push({ id: ++G.sfSeq, from: pid, to: t.pid, until: sfOn() ? Infinity : now() + cfg.pactOffer * 1000, born: G.dealN || 0, ghost });\n"
    "        if (t.bot && !ghost) sfBotSoon();")
rep("        if (!pactOf(p) || G.ph !== 'question') break;", "        if (!pactOf(p) || G.ph !== (sfOn() ? 'deal' : 'question')) break;")
# privatno: ID ponude (za nepročitano), trajanje do sljedećeg dogovora, kandidati uključuju botove u testnom načinu
rep("      inv: G.offers.filter((x) => x.to === pid && !x.ghost).map((x) => ({ f: x.from, ms: Math.max(0, x.until - now()), dur: cfg.pactOffer * 1000 })),",
    "      inv: G.offers.filter((x) => x.to === pid && !x.ghost).map((x) => (sfOn() ? { f: x.from, id: x.id, dl: 1 } : { f: x.from, ms: Math.max(0, x.until - now()), dur: cfg.pactOffer * 1000 })),")
rep("    if (o.can) o.cand = humansIn().filter((q) => q !== p && q.on).map((q) => q.pid);",
    "    if (o.can) o.cand = sfPeople().filter((q) => q !== p && q.on).map((q) => q.pid);\n"
    "    if (sfOn()) { o.sf = 1; if (G.ph === 'deal') o.dl = 1; if (bsOn()) o.bs = 1; }")
rep("      if (G.ph === 'question') { o.k.wsent = p.whS === G.s ? 1 : 0; o.k.bt = p.betray ? 1 : 0; o.k.can = 1; }",
    "      if (G.ph === 'question') { o.k.wsent = p.whS === G.s ? 1 : 0; o.k.bt = p.betray ? 1 : 0; o.k.can = 1; }\n"
    "      if (sfOn() && G.ph === 'deal') { o.k.bt = p.betray ? 1 : 0; o.k.dl = 1; }\n"
    "      if (sfOn() && p.betray && G.ph !== 'deal') o.k.btl = 1;   // zaključana pripremljena izdaja (samo vlasnik)")
# privatno stanje i kad su paktovi isključeni, a uključen je obračun: oznaka Social Flowa
rep("    if (!pactsOn()) return Object.assign({ can: false, used: false, inv: [], out: null, note: p.note }, rcPriv(p));",
    "    if (!pactsOn()) return Object.assign({ can: false, used: false, inv: [], out: null, note: p.note }, sfOn() ? { sf: 1, dl: G.ph === 'deal' ? 1 : 0 } : {}, rcPriv(p));")

# ---------- rivalski obračun: ponude čekaju sljedeće Vrijeme za dogovore ----------
rep("      const live = o.until > t && f && to && f.on && to.on && RC_WIN[G.ph] && !G.rc.act;",
    "      const live = sfOn() ? o.until > t && f && to && !G.rc.act && !G.inFinale : o.until > t && f && to && f.on && to.on && RC_WIN[G.ph] && !G.rc.act;")
rep("        G.rc.offers.push({ id: ++G.rc.seq, f: p.pid, t: t.pid, until: now() + cfg.rcOffer * 1000,",
    "        G.rc.offers.push({ id: ++G.rc.seq, f: p.pid, t: t.pid, until: sfOn() ? Infinity : now() + cfg.rcOffer * 1000, born: G.dealN || 0,")
rep("    const inv = G.rc.offers.filter((x) => x.t === p.pid).map((x) => ({ f: x.f, ms: Math.max(0, x.until - now()), dur: cfg.rcOffer * 1000, rev: x.rev, riv: x.riv }));",
    "    const inv = G.rc.offers.filter((x) => x.t === p.pid).map((x) => (sfOn() ? { f: x.f, id: x.id, dl: 1, rev: x.rev, riv: x.riv } : { f: x.f, ms: Math.max(0, x.until - now()), dur: cfg.rcOffer * 1000, rev: x.rev, riv: x.riv }));")
rep("    if (out) r.out = { t: out.t, ms: Math.max(0, out.until - now()) };", "    if (out) r.out = sfOn() ? { t: out.t, dl: 1 } : { t: out.t, ms: Math.max(0, out.until - now()) };")
# ponuda obračuna smije se pripremiti/prihvatiti tijekom Vremena za dogovore (RC_WIN) — pravila obračuna se ne mijenjaju

# ---------- krčmarova ponuda: može stići već u Vremenu za dogovore (za pitanje koje slijedi), zaključava se prije kategorije ----------
rep("    if (!tkOn() || !K || G.ph !== 'vote' || G.inFinale || G.qv || X.cur) return;\n    if ((G.bdone || 0) < K.after || X.n >= K.perGame || X.offered >= K.offers || G.bn - X.lastBn < K.gap) return;",
    "    const nb = G.ph === 'deal' ? G.bn + 1 : G.bn, qv = G.ph === 'deal' ? !!(G.qvAt && G.qvAt.get(nb)) : !!G.qv;\n"
    "    if (!tkOn() || !K || (G.ph !== 'vote' && G.ph !== 'deal') || G.inFinale || qv || X.cur) return;\n"
    "    if ((G.bdone || 0) < K.after || X.n >= K.perGame || X.offered >= K.offers || nb - X.lastBn < K.gap) return;")
rep("    X.got[c.f.pid] = 1; X.offered++; X.lastBn = G.bn;", "    X.got[c.f.pid] = 1; X.offered++; X.lastBn = nb;")
rep("    if (G.ph !== 'vote' || G.s !== o.s || now() >= G.endsAt) return false;", "    if ((G.ph !== 'vote' && G.ph !== 'deal') || now() >= G.endsAt) return false;")

# ---------- botovi: šapat (svoj odgovor), korištenje primljenog šapata prije odgovora ----------
rep("        const right = Math.random() < (G.ph === 'fq' ? 0.7 : G.ph === 'duel' ? 0.66 : 0.62) || !wrong.length;\n        return { s, c: right ? G.q.a : pick(wrong), t: now() - G.startedAt };",
    "        const right = Math.random() < (G.ph === 'fq' ? 0.7 : G.ph === 'duel' ? 0.66 : 0.62) || !wrong.length;\n"
    "        // primljeni šapat saveznika (stigao prije bototovog odgovora) bot ponekad posluša — kao čovjek; ne zna je li točan\n"
    "        if (G.ph === 'question' && b.wh && b.wh.s === G.s && opts.includes(b.wh.c) && Math.random() < 0.6) return { s, c: b.wh.c, t: now() - G.startedAt };\n"
    "        return { s, c: right ? G.q.a : pick(wrong), t: now() - G.startedAt };")
rep("        if (accept(b, botInput(b))) { if (allDone()) endPhase(); else onChange(); }",
    "        if (accept(b, botInput(b))) { if (G.ph === 'question') sfBotWhisper(b); if (allDone()) endPhase(); else onChange(); }")
rep("      case 'secret2': return { s, y: Math.random() < 0.75 ? 1 : 0 };", "      case 'secret2': return { s, y: Math.random() < 0.75 ? 1 : 0 };\n      case 'deal': return { s, ok: 1 };")

# ---------- sam sustav ----------
rep("  const humansIn = () => list().filter((p) => !p.bot);", r"""  // ===================== TAVERN SOCIAL FLOW 2.0 =====================
  const sfOn = () => !!(cfg.sf && cfg.sf.on);
  const bsOn = () => !!G.opt.bs;   // testni način: botovi sudjeluju u paktovima (izričito uključen u predvorju)
  // dok se odgovara (pitanje, mini-igra, dvoboj, tajni događaj) nema slanja ni prihvaćanja ponuda
  const SF_BUSY = { question: 1, fq: 1, duel: 1, sort: 1, link: 1, order: 1, hilo: 1, blitz: 1, maj: 1, secret: 1, secret2: 1 };
  const sfPeople = () => list().filter((p) => !p.bot || bsOn());
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
        if (sc && sc !== 'loyal') G.scn = null;
        botPact(b, { k: 'betray', on: bt });
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
  function sfBotSoon() { if (bsOn() && !SF_BUSY[G.ph]) { const s0 = G.s; later(() => { if (G.s === s0 && !SF_BUSY[G.ph]) { for (const b of list().filter((p) => p.bot && p.on)) sfBotAnswer(b); onChange(); } }, Math.max(50, Math.min(1200 + rnd(1500), G.dur - 150))); } }
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
    switch (k) {
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
        if (!botMate) return { ok: 0, msg: 'Prvo sklopi pakt s botom (Tajni kutak → ponudi savez).' };
        G.scn = { k, pid }; return { ok: 1, msg: mate.name + ' će ti šapnuti svoj odgovor na sljedećem pitanju.' };
      case 'betray': case 'double': case 'loyal':
        if (!botMate) return { ok: 0, msg: 'Prvo sklopi pakt s botom (Tajni kutak → ponudi savez).' };
        if (k === 'loyal') { mate.sfLoyal = 1; return { ok: 1, msg: mate.name + ' ostaje odan do kraja (osim ako ti izdaš).' }; }
        if (!left && G.ph !== 'deal') return { ok: 0, msg: 'U ovoj partiji više nema Vremena za dogovore prije finala.' };
        G.scn = { k, pid };
        if (G.ph === 'deal') { mate.sfLoyal = 0; botPact(mate, { k: 'betray', on: true }); G.scn = null; }
        return { ok: 1, msg: (G.ph === 'deal' ? mate.name + ' je upravo potajno pripremio izdaju.' : mate.name + ' će pripremiti izdaju u sljedećem Vremenu za dogovore.') + (k === 'double' ? ' Pripremi i ti izdaju u Tajnom kutku.' : '') };
    }
    return { ok: 0, msg: 'Nepoznat scenarij.' };
  }
  const humansIn = () => list().filter((p) => !p.bot);""")

# ---------- predvorje i pogled ----------
rep("if (k === 'tk') { G.opt.tk = !!v; onChange(); } }", "if (k === 'tk') { G.opt.tk = !!v; onChange(); } if (k === 'bs') { G.opt.bs = !!v; onChange(); } }")
rep("v.opt = { pacts: G.opt.pacts ? 1 : 0, rc: G.opt.rc ? 1 : 0, tk: G.opt.tk ? 1 : 0 };", "v.opt = { pacts: G.opt.pacts ? 1 : 0, rc: G.opt.rc ? 1 : 0, tk: G.opt.tk ? 1 : 0, bs: G.opt.bs ? 1 : 0 };")
rep("    if (ph === 'intro') v.it = G.intro;", "    if (ph === 'intro') v.it = G.intro;\n    if (ph === 'deal' && G.dl) v.dl = { n: G.dl.n, solo: G.dl.solo, t: G.dl.line };\n    if (bsOn() && G.ph !== 'lobby') v.bs = 1;")
rep("  return { pactAction, priv, setOpt,", "  return { sfScenario, pactAction, priv, setOpt,")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('SOCIAL FLOW OK')
