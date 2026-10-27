  // ===================== TAVERN DIRECTOR =====================
  // Prati što se događa u partiji i povremeno pretvara zanimljive trenutke u kratki "show" (bez promjene pravila igre).
  // Sve je lokalno i determinističko iz stanja igre; pamti se samo unutar trenutne partije.
  const PW_ACC = { led: 'Led', sluz: 'Sluz', grick: 'Grickalice', bomba: 'Bombu', dupli: 'Dupli bodove', pola: 'Pola-pola', stit: 'Štit' };
  const TD = (() => {
    let T = null;
    const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
    const inc = (o, k, n) => { o[k] = (o[k] || 0) + (n || 1); return o[k]; };
    const nm = (pid) => (R.get(pid) || {}).name || '?';
    const human = (pid) => { const p = R.get(pid); return p && !p.bot; };
    function reset() {
      T = {
        turn: 0, leader: null, prevLeader: null, leaderChanges: 0, leadHist: [],
        streak: {}, wrongStreak: {}, lowRank: {}, highRank: {}, prevRank: {}, rank: {},
        attacks: {}, attackedBy: {}, powerUse: {}, targeted: {}, bugs: {}, catVotes: {}, fastest: {},
        threat: {}, rival: {}, activeRival: null, lastMajor: -99, lastAny: -99, shown: {}, history: [],
        duels: 0, secrets: {}, secretTotal: 0, lastSecretBn: -9,
      };
      G.pend = null; G.du = null; G.se = null; G.mo = null;
    }
    function onVote() {
      if (!T) return;
      const cat = G.cats[G.cw];
      for (const p of active()) if (p.vote >= 0) { const c = G.cats[p.vote]; T.catVotes[p.pid] = T.catVotes[p.pid] || {}; inc(T.catVotes[p.pid], c); }
      T.lastCat = cat;
    }
    function onPower() {
      if (!T) return;
      T.threat = {};
      for (const e of G.ev) {
        T.powerUse[e.f] = T.powerUse[e.f] || {}; inc(T.powerUse[e.f], e.p);
        if (!e.t) continue;
        T.attacks[e.f] = T.attacks[e.f] || {}; inc(T.attacks[e.f], e.t);
        T.attackedBy[e.t] = T.attackedBy[e.t] || {}; inc(T.attackedBy[e.t], e.f);
        inc(T.targeted, e.t);
        if (e.p === 'grick' && !e.b) inc(T.bugs, e.t);
        if (F.ENABLE_RIVALRIES) {
          inc(T.rival, pairKey(e.f, e.t), 2);
          if (T.attacks[e.t] && T.attacks[e.t][e.f] && !T['mut' + pairKey(e.f, e.t)]) { T['mut' + pairKey(e.f, e.t)] = 1; inc(T.rival, pairKey(e.f, e.t), 2); }
        }
        if (!e.b && (T.streak[e.t] || 0) >= 3) T.threat[e.t] = e.f;
      }
    }
    function ranks() {
      const ps = active().slice().sort((a, b) => b.score - a.score || (T.prevRank[a.pid] || 9) - (T.prevRank[b.pid] || 9));
      const r = {}; ps.forEach((p, i) => { r[p.pid] = i + 1; });
      return { r, ps };
    }
    // nakon promjene bodova: poredak, vođa, comeback i rivalstvo iz poretka
    function updateRanks(cands) {
      const { r, ps } = ranks(), n = ps.length;
      T.prevRank = T.rank; T.rank = r;
      if (n < 2) return;
      const lead = ps[0].pid;
      if (ps[0].score > 0 && lead !== T.leader) {
        const old = T.leader;
        T.prevLeader = old; T.leader = lead;
        if (old) {
          T.leaderChanges++; T.leadHist.push(T.turn);
          const swap = T.prevRank[lead] === 2 && r[old] === 2;
          if (swap && F.ENABLE_RIVALRIES) inc(T.rival, pairKey(lead, old), 2);
          const recent = T.leadHist.filter((t) => t >= T.turn - 3).length;
          if (T.activeRival === pairKey(lead, old)) cands.push({ type: 'RIVAL_LEAD', score: 4, key: 'rl', t: 'Još jedna izmjena vodstva', s: nm(lead) + ' i ' + nm(old), a: [lead, old], pose: ['happy', 'shocked'], snd: 'stingRival' });
          else if (recent >= 3) cands.push({ type: 'LEAD_HABIT', score: 3, key: 'lh', t: 'Vodstvo opet mijenja vlasnika', s: nm(lead) + ' je opet prvi', a: [lead], pose: ['happy'], snd: 'stingSmall' });
          else cands.push({ type: 'NEW_LEADER', score: 7, key: 'nl:' + lead + ':' + T.leaderChanges, t: 'Novi vođa', s: nm(lead), a: [lead], pose: ['happy'], snd: 'stingLeader' });
        }
      }
      for (const p of ps) {
        const k = p.pid, now = r[k];
        if (T.lowRank[k] == null || now > T.lowRank[k]) T.lowRank[k] = now;
        if (T.highRank[k] == null || now < T.highRank[k]) T.highRank[k] = now;
        const low = T.lowRank[k], was = T.prevRank[k];
        if (n >= 3 && low === n && now === 1 && was !== 1 && !T.shown['cb2:' + k])
          cands.push({ type: 'COMEBACK_BIG', score: 10, key: 'cb2:' + k, t: 'Povratak večeri!', s: nm(k) + ': ' + low + '. → 1.', a: [k], pose: ['happy'], snd: 'stingComeback' });
        else if (n >= 3 && low >= n - 1 && now <= 2 && was > 2 && !T.shown['cb:' + k])
          cands.push({ type: 'COMEBACK', score: 9, key: 'cb:' + k, t: 'Povratak u igru!', s: nm(k) + ': ' + low + '. → ' + now + '.', a: [k], pose: ['happy'], snd: 'stingComeback' });
      }
      if (F.ENABLE_RIVALRIES) for (let i = 0; i + 1 < n; i++) {
        const a = ps[i], b = ps[i + 1];
        if (a.score > 0 && a.score - b.score < 300) inc(T.rival, pairKey(a.pid, b.pid), 1);
      }
    }
    function rivalryCands(cands) {
      if (!F.ENABLE_RIVALRIES) return;
      if (!T.activeRival) {
        let best = null;
        for (const k in T.rival) if (T.rival[k] >= 8 && (!best || T.rival[k] > T.rival[best])) best = k;
        if (best) {
          const [a, b] = best.split('|');
          if (R.get(a) && R.get(b) && R.get(a).on && R.get(b).on) {
            const last = G.ev.find((e) => e.t && ((e.f === a && e.t === b) || (e.f === b && e.t === a)));
            const pose = last ? (last.f === a ? ['attack', 'shocked'] : ['shocked', 'attack']) : ['idle', 'idle'];
            cands.push({ type: 'RIVALRY', score: 9, key: 'rv:' + best, t: 'Rivalstvo se zakuhava', s: nm(a) + ' vs ' + nm(b), a: [a, b], pose, vs: 1, snd: 'stingRival', onShow: () => { T.activeRival = best; } });
          }
        }
      } else {
        const [a, b] = T.activeRival.split('|');
        const hit = G.ev.find((e) => e.t && ((e.f === a && e.t === b) || (e.f === b && e.t === a)));
        if (hit) cands.push({ type: 'RIVAL_AGAIN', score: 4, key: 'ra', t: 'Opet njih dvoje', s: nm(hit.f) + ' → ' + nm(hit.t), a: [hit.f, hit.t], pose: ['attack', 'shocked'], vs: 1, snd: 'stingRival' });
      }
    }
    // "krčma pamti": kratke opaske iz stvarnih događaja (male važnosti, dugi razmak)
    function memoryCands(cands) {
      for (const f in T.attacks) for (const t in T.attacks[f]) if (T.attacks[f][t] >= 3 && G.ev.some((e) => e.f === f && e.t === t))
        cands.push({ type: 'REPEAT_TARGET', score: 4, key: 'rt:' + f + t, t: 'Krčma pamti', s: nm(f) + ' opet cilja istu metu: ' + nm(t), a: [f, t], pose: ['attack', 'shocked'] });
      const tg = Object.entries(T.targeted).sort((x, y) => y[1] - x[1]);
      if (tg[0] && tg[0][1] >= 4 && (!tg[1] || tg[0][1] - tg[1][1] >= 2)) cands.push({ type: 'MOST_TARGETED', score: 4, key: 'mt:' + tg[0][0], t: 'Krčma pamti', s: nm(tg[0][0]) + ' je danas svima omiljena meta', a: [tg[0][0]], pose: ['shocked'] });
      for (const k in T.bugs) if (T.bugs[k] >= 2 && G.ev.some((e) => e.t === k && e.p === 'grick' && !e.b)) cands.push({ type: 'BUGS', score: 3, key: 'bg:' + k, t: 'Krčma pamti', s: nm(k) + ' stvarno nema sreće s bubama', a: [k], pose: ['shocked'] });
      for (const k in T.fastest) if (T.fastest[k] >= 3 && T.lastFast === k) cands.push({ type: 'FASTEST', score: 3, key: 'fs:' + k, t: 'Krčma pamti', s: nm(k) + ' opet prvi reagira', a: [k], pose: ['happy'] });
      for (const k in T.powerUse) for (const pw in T.powerUse[k]) if (T.powerUse[k][pw] >= 3 && G.ev.some((e) => e.f === k && e.p === pw)) cands.push({ type: 'POWER_HABIT', score: 2, key: 'ph:' + k, t: 'Krčma pamti', s: nm(k) + ' očito voli ' + PW_ACC[pw], a: [k], pose: ['idle'] });
      for (const k in T.catVotes) for (const c in T.catVotes[k]) if (T.catVotes[k][c] >= 3 && T.lastCat === c && R.get(k) && R.get(k).vote >= 0 && G.cats && G.cats[R.get(k).vote] === c) cands.push({ type: 'CATEGORY_HABIT', score: 2, key: 'ch:' + k, t: 'Krčma pamti', s: nm(k) + ' se opet vraća: ' + c, a: [k], pose: ['idle'] });
    }
    function duelCand(cands) {
      if (!F.ENABLE_DUELS || T.duels >= 1 || G.inFinale || active().length < 3) return;
      const nb = plan.filter((it) => it.t === 'battle').length;
      const left = plan.slice(G.pi + 1).some((it) => it.t === 'battle');
      if (!left || G.bn < 3) return;
      let pair = null;
      if (T.activeRival && T.shownAt && T.turn - T.shownAt >= 1) pair = T.activeRival.split('|');
      else if (!T.activeRival && G.bn >= Math.max(5, nb - 4)) {
        const ps = ranks().ps;
        let bd = Infinity;
        for (let i = 0; i + 1 < ps.length; i++) { const d = ps[i].score - ps[i + 1].score; if (d < bd && d < 400) { bd = d; pair = [ps[i].pid, ps[i + 1].pid]; } }
      }
      if (!pair || !pair.every((x) => R.get(x) && R.get(x).on)) return;
      cands.push({ type: 'DUEL', score: 9, key: 'duel', duel: pair, a: pair });
    }
    function pickMoment(cands) {
      const turn = T.turn;
      const ok = cands.filter((c) => {
        if (T.shown[c.key] != null && (c.key.length <= 3 ? turn - T.shown[c.key] < 6 : true)) return false;
        const gap = turn - T.lastAny;
        if (G.inFinale) return ['CLOSE_RACE', 'RIVAL_LEAD', 'RIVALRY', 'COMEBACK', 'COMEBACK_BIG'].includes(c.type) && gap >= 2;
        if (c.score >= 9) return gap >= 1;
        if (c.score >= 7) return gap >= 2 && turn - T.lastMajor >= 2;
        if (c.score >= 5) return gap >= 2;
        return gap >= 3;
      });
      // prednost ljudskim pričama kad je važnost slična
      const val = (c) => c.score + (c.a && c.a.some(human) ? 0.6 : 0);
      ok.sort((x, y) => val(y) - val(x));
      if (F.DEBUG_TAVERN_DIRECTOR) { try { console.log('[TavernDirector] potez ' + turn, cands.map((c) => ({ type: c.type, score: c.score })), '→', ok[0] ? ok[0].type : 'ništa'); } catch (e) {} }
      const c = ok[0];
      if (!c) return null;
      T.shown[c.key] = turn; T.lastAny = turn; if (c.score >= 7) T.lastMajor = turn;
      if (c.onShow) c.onShow();
      if (c.type === 'RIVALRY') T.shownAt = turn;
      T.history.push({ turn, type: c.type });
      return c;
    }
    function finalizePend(c) {
      if (!c) { G.pend = null; return; }
      if (c.type === 'DUEL') { T.duels++; G.pend = { duel: c.duel }; return; }
      G.pend = { mo: { k: c.type, t: c.t, s: c.s, a: c.a, pose: c.pose, vs: c.vs ? 1 : 0, snd: c.snd || 'stingSmall' } };
    }
    function afterQuestion() {
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) { G.pend = null; return; }
      T.turn++;
      const cands = [];
      const right = active().filter((p) => p.ans === G.q.a);
      const fast = right.slice().sort((a, b) => a.ansMs - b.ansMs)[0];
      T.lastFast = fast && right.length > 1 ? fast.pid : null;
      if (T.lastFast) inc(T.fastest, T.lastFast);
      for (const p of active()) {
        const k = p.pid;
        if (p.ans === G.q.a) {
          const st = inc(T.streak, k); T.wrongStreak[k] = 0;
          if (st === 5) cands.push({ type: 'STREAK5', score: 7, key: 's5:' + k + ':' + T.turn, t: 'Nezaustavljiv niz!', s: p.name + ' — 5 točnih zaredom', a: [k], pose: ['happy'], snd: 'stingStreak' });
          else if (st === 3) cands.push({ type: 'STREAK3', score: 5, key: 's3:' + k + ':' + T.turn, t: 'U formi!', s: p.name + ' — 3 točna zaredom', a: [k], pose: ['happy'], snd: 'stingStreak' });
        } else {
          const had = T.streak[k] || 0; T.streak[k] = 0; inc(T.wrongStreak, k);
          const by = T.threat[k];
          if (had >= 3 && by) {
            if (F.ENABLE_RIVALRIES) inc(T.rival, pairKey(k, by), 2);
            cands.push({ type: 'STREAK_BROKEN', score: 6, key: 'sb:' + k + ':' + T.turn, t: 'Niz je stao', s: p.name + ' (' + had + ' zaredom) · nakon napada: ' + nm(by), a: [by, k], pose: ['attack', 'sad'], snd: 'stingRival' });
          }
        }
      }
      updateRanks(cands);
      if (G.sx) cands.push(G.sx);
      rivalryCands(cands);
      memoryCands(cands);
      duelCand(cands);
      finalizePend(pickMoment(cands));
    }
    function afterScores() {
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) { G.pend = null; return; }
      T.turn++;
      const cands = [];
      updateRanks(cands);
      rivalryCands(cands);
      finalizePend(pickMoment(cands.filter((c) => c.type !== 'DUEL')));
    }
    function afterFinale() {
      G.pend = null;
      if (!T || !F.ENABLE_TAVERN_DIRECTOR) return;
      T.turn++;
      const ps = active().slice().sort((a, b) => b.fstep - a.fstep);
      const cands = [];
      if (ps.length >= 2 && !T.shown.close) {
        const a = ps[0], b = ps[1];
        if (a.fstep >= cfg.steps - 2 && a.fstep - b.fstep <= 1 && (!ps[2] || ps[2].fstep < b.fstep))
          cands.push({ type: 'CLOSE_RACE', score: 8, key: 'close', t: 'Sve se odlučuje između njih', s: a.name + ' vs ' + b.name, a: [a.pid, b.pid], pose: ['idle', 'idle'], vs: 1, snd: 'stingRival' });
      }
      finalizePend(pickMoment(cands));
    }
    // tajni događaji: najviše 2 po partiji, 1 po igraču, nikad dvije bitke zaredom
    function secretPick() {
      if (!F.ENABLE_TAVERN_DIRECTOR || !F.ENABLE_SECRET_EVENTS || !T || G.inFinale) return null;
      const kinds = [];
      if (F.ENABLE_SECRET_TARGET) kinds.push('target');
      if (F.ENABLE_SECRET_HELP) kinds.push('help');
      const ps = active();
      if (!kinds.length || ps.length < 3 || G.bn < 2 || T.secretTotal >= 2 || G.bn - T.lastSecretBn < 2) return null;
      if (Math.random() > (cfg.secretChance != null ? cfg.secretChance : 0.3)) return null;
      const kind = pick(kinds);
      const { r } = ranks();
      let pool = ps.filter((p) => !T.secrets[p.pid]);
      if (kind === 'help') pool = pool.filter((p) => r[p.pid] >= ps.length - 1);
      if (!pool.length) return null;
      const humans = pool.filter((p) => !p.bot);
      const who = pick(humans.length && Math.random() < 0.75 ? humans : pool);
      T.secrets[who.pid] = 1; T.secretTotal++; T.lastSecretBn = G.bn;
      return { k: kind, p: who.pid, x: null, ok: 0 };
    }
    return { reset, onVote, onPower, afterQuestion, afterScores, afterFinale, secretPick, get state() { return T; } };
  })();

  function showMoment() {
    G.mo = G.pend.mo; G.pend = null;
    setPhase('moment', cfg.moment);
  }
  function afterReveal() {
    const pd = G.pend;
    if (pd && pd.duel) { G.pend = null; return startDuelIntro(pd.duel); }
    if (pd && pd.mo) return showMoment();
    next();
  }
  function afterMoment() {
    G.mo = null;
    if (G.inFinale) return startFinaleQ();
    next();
  }
  // ----- dvoboj: samo dva igrača odgovaraju, brži točan dobiva bonus, nitko ne gubi bodove -----
  function startDuelIntro(pair) {
    G.du = { a: pair[0], b: pair[1], w: null };
    setPhase('duelIntro', cfg.duelIntro);
  }
  function startDuel() {
    const cats = Object.keys(D.cats).filter((c) => D.cats[c].some((_, i) => !G.used.q.has(c + '|' + i)));
    if (!cats.length) { G.du = null; return next(); }
    const cat = pick(cats);
    const pool = D.cats[cat].map((q, i) => i).filter((i) => !G.used.q.has(cat + '|' + i));
    const qi = pick(pool);
    G.used.q.add(cat + '|' + qi);
    const q = D.cats[cat][qi], order = shuffle([0, 1, 2, 3]);
    G.q = { c: cat, t: q.q, o: order.map((i) => q.o[i]), a: order.indexOf(q.a) };
    for (const p of list()) { p.ans = -1; p.ansMs = 0; p.ch = -1; p.hide = null; p.fx = []; p.dbl = false; p.sh = false; }
    setPhase('duel', cfg.duel);
    for (const p of list()) if (p.pid !== G.du.a && p.pid !== G.du.b) p.done = true;
    if (allDone()) endPhase();
  }
  function scoreDuel() {
    const A = R.get(G.du.a), B = R.get(G.du.b);
    const right = [A, B].filter((p) => p && p.ans === G.q.a).sort((x, y) => x.ansMs - y.ansMs);
    for (const p of [A, B]) if (p) p.ch = p.ans;
    G.du.w = right.length ? right[0].pid : null;
    G.du.bonus = right.length ? cfg.duelBonus : 0;
    if (right.length) right[0].score += cfg.duelBonus;
    G.du.ms = [A, B].map((p) => (p && p.ans >= 0 ? p.ansMs : -1));
    setPhase('duelResult', cfg.duelRes);
  }
  // ----- tajni događaji (privatna odluka na mobitelu jednog igrača) -----
  function maybeSecret() {
    const se = TD.secretPick();
    if (!se) return false;
    G.se = se;
    setPhase('secret', cfg.secret);
    for (const p of list()) if (p.pid !== se.p) p.done = true;
    if (allDone()) endPhase();
    return true;
  }
  function afterSecret() {
    const se = G.se;
    if (!se || !se.x) { G.se = null; return startPower(); }
    if (se.k === 'help') {
      setPhase('secret2', cfg.secret2);
      for (const p of list()) if (p.pid !== se.x) p.done = true;
      if (allDone()) endPhase();
      return;
    }
    startPower();
  }
  // nakon pitanja: tajna meta / tajna pomoć daju bonus; posljedica postaje javna tek kad se bonus dodijeli
  function resolveSecret() {
    G.sx = null;
    for (const p of list()) p.xb = 0;
    const se = G.se;
    if (!se || !se.x) { G.se = null; return; }
    const A = R.get(se.p), X = R.get(se.x);
    if (A && X && se.k === 'target') {
      se.res = X.ans !== G.q.a ? 1 : 0;
      if (se.res) {
        A.score += cfg.secretBonus; A.xb = cfg.secretBonus;
        G.sx = { type: 'SECRET_TARGET', score: 8, key: 'st:' + A.pid, t: 'Tajna meta!', s: A.name + ' je potajno ciljao/la: ' + X.name + ' · +' + cfg.secretBonus, a: [A.pid, X.pid], pose: ['happy', 'shocked'], vs: 1, snd: 'stingUp' };
      }
    }
    if (A && X && se.k === 'help' && se.ok) {
      se.res = A.ans === G.q.a && X.ans === G.q.a ? 1 : 0;
      if (se.res) {
        A.score += cfg.helpBonus; X.score += cfg.helpBonus; A.xb = X.xb = cfg.helpBonus;
        G.sx = { type: 'SECRET_HELP', score: 8, key: 'sh:' + A.pid, t: 'Tajni savez!', s: A.name + ' i ' + X.name + ' · oboje +' + cfg.helpBonus, a: [A.pid, X.pid], pose: ['happy', 'happy'], snd: 'stingUp' };
      }
    }
    G.sxDone = se; G.se = null;
  }

