# Legende ove krčme — nadogradnja motora (pokreće td2.py, zatim dodaje legende na v3/engine.js)
import subprocess, sys
SP = '/tmp/claude-0/-home-claude/d0049d8f-34eb-5d03-b489-fe414f5ca31b/scratchpad'
subprocess.run([sys.executable, SP + '/v3/td2.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---------- 1) minimalna statistika koja je nedostajala (u postojećem stanju krčme) ----------
rep("""        leg: { cb: null, bt: null, rv: null, rev: null, bet: null, lead: null },
      };""", """        leg: { cb: null, bt: null, rv: null, rev: null, bet: null, lead: null },
        // za legende: pitanja, točni, najbrži točan (obična pitanja), najdulji niz, neto kladionica, najbolje mjesto nakon dna, dvoboji, izdaje, odani paktovi
        stat: { qn: 0, ans: {}, ok: {}, fast: {}, maxSt: {}, betNet: {}, rise: {}, duels: [], bt: [], loyal: [] },
      };""")
rep("""      T.turn++;
      const cands = [];
      const right = active().filter((p) => p.ans === G.q.a);""", """      T.turn++;
      const cands = [];
      const right = active().filter((p) => p.ans === G.q.a);
      { const S = T.stat; S.qn++;
        for (const p of active()) {
          inc(S.ans, p.pid); if (p.ans === G.q.a) inc(S.ok, p.pid);
          // najbrži točan: samo obična pitanja (isto vrijeme za odgovor, bez posebnih bitaka)
          if (p.ans === G.q.a && !G.qv && p.ansMs > 0 && (S.fast[p.pid] == null || p.ansMs < S.fast[p.pid])) S.fast[p.pid] = p.ansMs;
          if (p.betRes) S.betNet[p.pid] = (S.betNet[p.pid] || 0) + p.betRes;
        } }""")
rep("""          const st = inc(T.streak, k); T.wrongStreak[k] = 0;""",
    """          const st = inc(T.streak, k); T.wrongStreak[k] = 0;
          if (st > (T.stat.maxSt[k] || 0)) T.stat.maxSt[k] = st;""")
rep("""        if (n >= 3 && now === n) T.worst[k] = Math.max(T.worst[k] || 0, gapNow);""",
    """        if (n >= 3 && now === n) T.worst[k] = Math.max(T.worst[k] || 0, gapNow);
        if (n >= 3 && T.lowRank[k] === n && (T.stat.rise[k] == null || now < T.stat.rise[k])) T.stat.rise[k] = now;""")
rep("""    function onBetray(e) {
      if (!T) return;""", """    function onBetray(e) {
      if (!T) return;
      if (T.stat.bt.length < 8) T.stat.bt.push({ id: T.stat.bt.length + 1, k: e.k, t: e.t, v: e.v, a: e.a, b: e.b, gain: e.gain || 0, st: e.st || 0, la: e.la || 0, lb: e.lb || 0, dur: e.dur || 1 });""")
rep("""    function duelOut(w, a, b) {
      if (!T || !w) return '';""", """    function onLoyal(evs) { if (T) for (const e of evs) if (T.stat.loyal.length < 6) T.stat.loyal.push({ a: e.a, b: e.b, tre: e.tre, bonus: e.bonus }); }
    function duelOut(w, a, b) {
      if (T && T.stat.duels.length < 4) T.stat.duels.push({ a, b, w: w || null });
      if (!T || !w) return '';""")
rep("""secretPick, onBetray, duelNote, duelOut, get state() { return T; } };""", """secretPick, onBetray, onLoyal, duelNote, duelOut, get state() { return T; } };""")
rep("""      out.push({ a: k.a, b: k.b, tre: k.tre, bonus: tot - k.tre, each: half, ea: tot - half });
    }""", """      out.push({ a: k.a, b: k.b, tre: k.tre, bonus: tot - k.tre, each: half, ea: tot - half });
    }
    TD.onLoyal(out);""")
rep("""    if (win) { win.mv = cfg.steps - win.fstep; win.fstep = cfg.steps; }""",
    """    if (win) { win.mv = cfg.steps - win.fstep; win.fstep = cfg.steps; G.crownWin = win.pid; }""")

# ---------- 2) legende: sastavljaju se jednom na kraju partije, nepromjenjive, samo javni podaci ----------
rep("""  function finish() {
    clear();
    payLoyalty();
    const ranked = list().slice().sort((a, b) => b.fstep - a.fstep || (b.fu || 0) - (a.fu || 0) || b.score - a.score);
    G.win = ranked.length ? ranked[0].pid : null;
    G.fact = pick(D.facts);""", """  // ===================== LEGENDE OVE KRČME =====================
  // Počasne nagrade iz stvarnih događaja (bez bodova). Domaćin ih sastavi jednom, pri proglašenju pobjednika.
  const LEG_T = { cb: ['🔥', 'Povratak večeri'], bt: ['🗡️', 'Najveća izdaja'], vic: ['💔', 'Najveća žrtva izdaje'], dbl: ['💀', 'Noževi pod stolom'], ly: ['❤️', 'Nerazdvojni saveznici'],
    rv: ['⚔️', 'Rivalstvo večeri'], rev: ['🔁', 'Osveta večeri'], bet: ['💰', 'Majstor rizika'], fast: ['⚡', 'Munja večeri'], acc: ['🎯', 'Oko sokolovo'], st: ['🏹', 'Najduži niz'] };
  const LEG_ORDER = Object.keys(LEG_T);
  // hrvatska množina: 1 napad, 2 napada, 5 napada
  const plN = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return n + ' ' + (b === 1 && a !== 11 ? one : b >= 2 && b <= 4 && (a < 12 || a > 14) ? few : many); };
  const fmtN = (n) => String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
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
      } else add('dbl', 88 + (e.la + e.lb) / 100, [e.a, e.b], 'Oboje vade noževe u istom trenutku!', 'Gubici: −' + fmtN(e.la) + ' i −' + bodN(e.lb), 'bt' + e.id);
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
    try { G.leg = buildLegends(); } catch (e) { G.leg = null; }""")
rep("""    G.ph = 'lobby'; G.s += 1; G.pi = -1; G.inFinale = false; G.win = null; G.rl = ''; TD.reset(); pactReset();""",
    """    G.ph = 'lobby'; G.s += 1; G.pi = -1; G.inFinale = false; G.win = null; G.rl = ''; G.leg = null; G.crownWin = null; TD.reset(); pactReset();""")
rep("""    if (ph === 'final') { v.win = G.win; v.fact = G.fact; }""", """    if (ph === 'final') { v.win = G.win; v.fact = G.fact; if (G.leg) v.lg = G.leg; }""")
rep("        if (close) { P.sw++; P.last = A.pid; }", "        P.all = (P.all || 0) + 1; if (close) { P.sw++; P.last = A.pid; }")
rep("    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null;\n", "    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null; G.leg = null; G.crownWin = null;\n")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('LEGENDE OK')
