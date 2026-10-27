  // ===================== TAJNI PAKTOVI (Blood & Gold) =====================
  // Dva čovjeka sklope tajni savez: šapću odgovore, pune zajedničku riznicu i mogu se izdati.
  // Sve se obračunava ovdje (domaćin); klijenti šalju samo akcije, privatno stanje dobiva samo vlasnik (priv).
  const PACT_LINES = {
    rumor: ['🍻 Krčmom kruže glasine o tajnom savezu...', '🍻 Netko u krčmi kuje tajni plan...', '🍻 Dvije se krigle kucnule ispod stola...', '🍻 Šapuće se da netko više ne igra sam...'],
    rich: ['💰 Čujem da se negdje skriva pravo malo bogatstvo!', '💰 Nečija riznica zvecka sve glasnije...', '💰 Krčmar je primijetio sumnjivo težak kesu zlata...'],
    betray: ['Prijateljstvo je lijepo, ali zlato je ipak zlato!', '{T} je upravo dokazao da prijateljstvo ima cijenu!', 'Nož u leđa, zlato u džep. Živjeli!', 'Krčmar briše šank i šuti. Viđao je on i gore.', 'Tko vjeruje, plaća. {V} je platio skupo.'],
    double: ['Dva noža, dvije laži i nijedan pobjednik!', 'Dvoje pohlepnih, a nitko bogatiji!', 'Riznica je pala, a s njom i svako povjerenje.', 'Krčmar se smije: kuća uvijek dobiva.'],
    loyal: ['Izgleda da u ovoj krčmi još postoji čast!', 'Vjernost do kraja! Krčmar časti ovu rundu.', 'Neki savezi traju duže od krigle piva.'],
  };
  const pickLine = (k, map) => { const arr = PACT_LINES[k], l = arr[rnd(arr.length)]; return l.replace(/\{(\w)\}/g, (_, x) => (map && map[x]) || ''); };
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
  function cleanOffers() { const t = now(); G.offers = G.offers.filter((o) => o.until > t && pactFree(R.get(o.from)) && pactFree(R.get(o.to))); }
  // jedina ulazna točka za akcije paktova; sve se provjerava
  function pactAction(pid, a) {
    const p = R.get(pid);
    if (!p || p.bot || !a || typeof a !== 'object' || typeof a.k !== 'string') return false;
    cleanOffers();
    let ok = false;
    switch (a.k) {
      case 'offer': {
        const t = R.get(a.to);
        if (!pactWindow() || !pactFree(p) || !pactFree(t) || t === p || t.bot) break;
        if (p.offersMade >= cfg.pactOffersMax || G.offers.some((o) => o.from === pid || o.to === t.pid)) break;
        G.offers.push({ from: pid, to: t.pid, until: now() + cfg.pactOffer * 1000 });
        p.offersMade++; ok = true; break;
      }
      case 'cancel': { const n = G.offers.length; G.offers = G.offers.filter((o) => o.from !== pid); ok = G.offers.length !== n; break; }
      case 'accept': {
        const o = G.offers.find((x) => x.to === pid && x.from === a.from);
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
        const o = G.offers.find((x) => x.to === pid && x.from === a.from);
        if (!o) break;
        G.offers = G.offers.filter((x) => x !== o);
        note(R.get(o.from), p.name + ' je odbio pakt.', 'no');   // privatno, samo onome tko je ponudio
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
        evs.push({ k: 'double', a: A.pid, b: B.pid, tre: k.tre, la, lb, line: pickLine('double') });
      } else {
        const T = q.a ? A : B, V = q.a ? B : A;
        const st = Math.max(0, Math.round(V.score * cfg.pactSteal));
        V.score = Math.max(0, V.score - st); T.score += k.tre + st;
        T.px = k.tre + st; V.px = -st;
        evs.push({ k: 'betray', t: T.pid, v: V.pid, tre: k.tre, st, gain: k.tre + st, line: pickLine('betray', { T: T.name, V: V.name }) });
        // krčma pamti: izdaja rađa rivalstvo
        const TS = TD.state; if (TS && TS.rival) { const key = T.pid < V.pid ? T.pid + '|' + V.pid : V.pid + '|' + T.pid; TS.rival[key] = (TS.rival[key] || 0) + 12; }
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
      inv: G.offers.filter((x) => x.to === pid).map((x) => ({ f: x.from, ms: Math.max(0, x.until - now()), dur: cfg.pactOffer * 1000 })),
      out: (G.offers.find((x) => x.from === pid) || null) && (() => { const x = G.offers.find((y) => y.from === pid); return { t: x.to, ms: Math.max(0, x.until - now()) }; })(),
      note: p.note,
    };
    if (o.can) o.cand = humansIn().filter((q) => q !== p && pactFree(q) && q.on).map((q) => q.pid);
    if (k && mate) {
      o.k = { m: mate.pid, tre: k.tre, grew: k.grew === G.s ? 1 : 0, since: k.since };
      if (G.ph === 'question') { o.k.wsent = p.whS === G.s ? 1 : 0; o.k.bt = p.betray ? 1 : 0; o.k.can = 1; }
      if (p.wh && p.wh.s === G.s) o.k.wh = p.wh.c;
    }
    return o;
  }
  function setOpt(k, v) { if (G.ph !== 'lobby') return; if (k === 'pacts') { G.opt.pacts = !!v; onChange(); } }
