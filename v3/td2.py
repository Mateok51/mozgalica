# Tavern Director 2.0 — nadogradnja postojećeg TD-a u v3/engine.js (primjenjuje se na engine.pretd2.js)
import sys
SP = '/tmp/claude-0/-home-claude/d0049d8f-34eb-5d03-b489-fe414f5ca31b/scratchpad'
s = open(SP + '/v3/engine.pretd2.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80])
    s = s.replace(a, b)

# ---------- 1) stanje: lagani zapisi samo za ovu partiju ----------
rep("""        duels: 0, secrets: {}, secretTotal: 0, lastSecretBn: -9,
      };""", """        duels: 0, secrets: {}, secretTotal: 0, lastSecretBn: -9,
        // TD 2.0: parovi (zamjene mjesta, osvete), povratci, vladavina, izdaje, ponavljanje rečenica, legende
        pairs: {}, worst: {}, leadTurns: {}, chase: {}, betr: [], lineAt: {}, typeAt: {}, feat: {}, moSeq: 0,
        leg: { cb: null, bt: null, rv: null, rev: null, bet: null, lead: null },
      };""")

# ---------- 2) rečenice: više varijanti po vrsti, bez sklonidbe imena i bez roda ----------
rep("""    function reset() {
      T = {""", """    // {X} {A} {B} {N} {O} {T} {V} = imena; {K} {G} {H} {L} {R} = brojevi. Sve rečenice izbjegavaju padeže imena i rod.
    const TL = {
      NEW_LEADER: [['👑 Krčma ima novog vođu!', 'Na vrhu je sada {N}'], ['👑 Promjena na vrhu', '{N} preuzima čelo stola'], ['👑 Novi vođa', '{N} preuzima vodstvo']],
      LEAD_HABIT: [['🔄 Vrh se opet ljulja', '{N} preuzima vodstvo — zasad'], ['🔄 Tko će koga?', 'Vodstvo opet mijenja vlasnika: {N}'], ['🔄 Stolica se ne stigne ohladiti', 'Na vrhu je opet {N}']],
      THRONE: [['🔥 Kraj jedne vladavine!', '{O} dugo drži vrh, a sada ga preuzima {N}'], ['🍻 Netko je pomaknuo stolac!', 'Duga vladavina je gotova: {N} ispred, {O} iza'], ['👑 Smjena vlasti', 'Nakon duge potjere {N} preuzima vrh']],
      RIVAL_LEAD: [['⚔️ Još jedna izmjena vodstva', '{A} i {B} ne daju jedno drugom disati'], ['⚔️ Opet njih dvoje na vrhu', '{A} i {B} razmjenjuju krunu']],
      RIVAL_SWAP: [['🍻 Ovo rivalstvo nikako da završi!', '{A} i {B} opet mijenjaju mjesta'], ['⚔️ I opet!', '{A} i {B}: već {K}. zamjena mjesta']],
      RIVAL_FIRST: [['⚔️ Prva krv', '{A} → {B}: krčma je to zapamtila'], ['⚔️ Netko traži nevolju', '{A} prvi put cilja: {B}']],
      REPEAT_TARGET: [['🔥 Omiljena meta?', '{A} opet cilja istu osobu: {B}'], ['🔥 Opet ista meta', '{A} → {B}, već {K}. put']],
      REVENGE: [['⚔️ {B} uzvraća udarac!', '{A} sada plaća za svoje napade'], ['⚔️ Osveta!', 'Nakon {K} napada {B} prestiže napadača: {A}'], ['⚔️ Tko se zadnji smije…', '{B} je sada ispred, a {A} gleda u leđa']],
      POWER_REVENGE: [['⚔️ {B} vraća milo za drago!', '{A} dobiva vlastiti lijek'], ['⚔️ Uzvrat!', '{B} napokon cilja natrag: {A}']],
      BETRAY_REVENGE: [['🔥 {V} se vraća po svoje!', '{T} ipak neće mirno uživati u ukradenom zlatu'], ['🗡️ Izdaja se ne zaboravlja', '{V} je opet ispred izdajnika: {T}']],
      CB_RISE: [['🔥 {X} se vraća iz mrtvih!', 'Zaostatak je pao s {G} na {H} bodova. Ostali, oprez!'], ['🔥 Povratak se zahuktava', '{X} topi zaostatak: {G} → {H}']],
      COMEBACK: [['🔥 Povratak u igru!', '{X}: {L}. → {R}.'], ['🔥 Netko je otpisan prerano', '{X} skače s {L}. na {R}. mjesto']],
      COMEBACK_BIG: [['🏆 OD POSLJEDNJEG DO PRVOG!', '{X} upravo piše legendu ove krčme'], ['🏆 Povratak večeri!', '{X}: s dna ravno na vrh']],
      STREAK3: [['🔥 U formi!', '{X} — 3 točna zaredom'], ['🎯 Zagrijavanje je gotovo', '{X} niže treći točan zaredom']],
      STREAK5: [['⚡ Nezaustavljiv niz!', '{X} — 5 točnih zaredom'], ['⚡ Netko zove krčmara?', '{X} ima 5 zaredom i ne staje']],
      STREAK_BROKEN: [['🧊 Niz je stao', '{X} ({K} zaredom) · nakon napada: {A}'], ['🧊 Kraj niza', '{A} prekida niz od {K}: {X}']],
      BET_WIN: [['🎲 Rizik se isplatio!', '{X} uzima +{K} iz uloga'], ['🎲 Hrabri piju besplatno', '{X}: ulog donosi +{K}']],
      RIVALRY: [['⚔️ Rivalstvo se zakuhava', '{A} vs {B}'], ['⚔️ Krčma ima novi par za gledati', '{A} vs {B}']],
      RIVAL_AGAIN: [['⚔️ Opet njih dvoje', '{A} → {B}'], ['⚔️ Stari računi', '{A} opet cilja: {B}']],
    };
    // rečenica koja se nije čula nedavno; izbor je determinističan (ne troši generator slučajnih brojeva igre,
    // pa krčma ni posredno ne mijenja pitanja, ponude moći ni odgovore botova)
    function say(type, map) {
      const arr = TL[type]; if (!arr) return null;
      const fresh = arr.map((_, i) => i).filter((i) => !(T.lineAt[type + i] != null && T.turn - T.lineAt[type + i] < 8));
      const pool = fresh.length ? fresh : arr.map((_, j) => j), i = pool[(T.turn * 7 + T.moSeq * 3 + type.length) % pool.length];
      const f = (x) => x.replace(/\\{(\\w)\\}/g, (_, k) => (map && map[k] != null ? map[k] : ''));
      return { t: f(arr[i][0]), s: f(arr[i][1]), li: type + i };
    }
    // kandidat s rečenicom iz TL (zadržava postojeće ključeve, ocjene i poze)
    function cand(type, score, key, map, a, pose, extra) {
      const l = say(type, map); if (!l) return null;
      return Object.assign({ type, score, key, t: l.t, s: l.s, li: l.li, a, pose }, extra || {});
    }
    // legende ove krčme: samo najveći primjer po vrsti (ograničeno, za budući završni pregled)
    function legend(k, v, rec) { if (!T.leg[k] || v > T.leg[k].v) T.leg[k] = Object.assign({ v, turn: T.turn }, rec); }
    function pairOf(a, b) { const k = pairKey(a, b); return T.pairs[k] || (T.pairs[k] = { sw: 0, last: null, ev: 0, revAt: -99 }); }
    function reset() {
      T = {""")

# ---------- 3) moći: prvi napad, omiljena meta, uzvrat moću ----------
rep("""        if (!e.b && (T.streak[e.t] || 0) >= 3) T.threat[e.t] = e.f;
      }
    }""", """        if (!e.b && (T.streak[e.t] || 0) >= 3) T.threat[e.t] = e.f;
        pairOf(e.f, e.t).ev++;
      }
    }
    // napadi ovog pitanja kao priča (prikazuje se tek nakon pitanja, ispod poretka)
    function powerCands(cands) {
      for (const e of G.ev || []) {
        if (!e.t || e.b) continue;
        const n = (T.attacks[e.f] && T.attacks[e.f][e.t]) || 0, back = (T.attacks[e.t] && T.attacks[e.t][e.f]) || 0;
        const P = pairOf(e.f, e.t);
        // uzvrat moću: napadnuti napokon cilja onoga tko ga je više puta napao
        const before = (T.attacks[e.t] && T.attacks[e.t][e.f]) || 0;
        if (n === 1 && before >= 2 && T.turn - P.revAt > 3) {
          const c = cand('POWER_REVENGE', 7, 'pr:' + pairKey(e.f, e.t) + ':' + T.turn, { A: nm(e.t), B: nm(e.f) }, [e.f, e.t], ['attack', 'shocked'], { vs: 1, snd: 'stingRival', onShow: () => { P.revAt = T.turn; legend('rev', before, { a: e.t, b: e.f }); } });
          if (c) cands.push(c);
        } else if (n === 1 && !back && human(e.f) && human(e.t)) {
          const c = cand('RIVAL_FIRST', 3, 'fb:' + pairKey(e.f, e.t), { A: nm(e.f), B: nm(e.t) }, [e.f, e.t], ['attack', 'shocked'], { vs: 1 });
          if (c) cands.push(c);
        }
      }
    }""")
# omiljena meta: postojeći REPEAT_TARGET dobiva varijante teksta (ostaje 'Krčma pamti' razina)
rep("""        cands.push({ type: 'REPEAT_TARGET', score: 4, key: 'rt:' + f + t, t: 'Krčma pamti', s: nm(f) + ' opet cilja istu metu: ' + nm(t), a: [f, t], pose: ['attack', 'shocked'] });""",
    """        { const c = cand('REPEAT_TARGET', 4, 'rt:' + f + t, { A: nm(f), B: nm(t), K: T.attacks[f][t] }, [f, t], ['attack', 'shocked']); if (c) cands.push(c); }""")

# ---------- 4) poredak: vladavina, zamjene mjesta, osveta, povratci, izdani se vraća ----------
rep("""      if (ps[0].score > 0 && lead !== T.leader) {
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
      }""", """      if (ps[0].score > 0 && lead !== T.leader) {
        const old = T.leader;
        T.prevLeader = old; T.leader = lead;
        if (old) {
          T.leaderChanges++; T.leadHist.push(T.turn);
          const swap = T.prevRank[lead] === 2 && r[old] === 2;
          if (swap && F.ENABLE_RIVALRIES) inc(T.rival, pairKey(lead, old), 2);
          const recent = T.leadHist.filter((t) => t >= T.turn - 3).length;
          const ruled = T.leadTurns[old] || 0, chased = T.chase[lead] || 0, gap = ps[0].score - ps[1].score;
          let c;
          // velika smjena: stari vođa je dugo vladao ili je novi dugo bio u potjeri (ali nije stalna izmjena)
          if (recent < 3 && (ruled >= Math.max(4, T.turn / 2) || chased >= 4)) c = cand('THRONE', 8, 'th:' + lead + ':' + T.leaderChanges, { N: nm(lead), O: nm(old) }, [lead, old], ['happy', 'shocked'], { snd: 'stingLeader', vs: 1 });
          else if (T.activeRival === pairKey(lead, old)) c = cand('RIVAL_LEAD', 4, 'rl', { A: nm(lead), B: nm(old) }, [lead, old], ['happy', 'shocked'], { snd: 'stingRival' });
          else if (recent >= 3) c = cand('LEAD_HABIT', 3, 'lh', { N: nm(lead) }, [lead], ['happy'], { snd: 'stingSmall' });
          else c = cand('NEW_LEADER', 7, 'nl:' + lead + ':' + T.leaderChanges, { N: nm(lead) }, [lead], ['happy'], { snd: 'stingLeader' });
          if (c) cands.push(c);
          legend('lead', ruled + chased, { pid: lead, from: old });
        }
      }
      if (n >= 2 && ps[0].score > 0) inc(T.leadTurns, lead);
      for (const p of ps) { const k = p.pid; if (r[k] === 2 || r[k] === 3) inc(T.chase, k); else T.chase[k] = 0; }
      // zamjene mjesta među bliskim igračima: razvoj rivalstva i osveta (napadnuti prestiže napadača)
      if (Object.keys(T.prevRank).length) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const A = ps[i], B = ps[j];   // A je sada ispred B
        const pa = T.prevRank[A.pid], pb = T.prevRank[B.pid];
        if (!pa || !pb || pa < pb) continue;
        const P = pairOf(A.pid, B.pid), close = A.score - B.score <= 500;
        if (close) { P.sw++; P.last = A.pid; }
        const key = pairKey(A.pid, B.pid);
        legend('rv', P.sw + P.ev, { a: A.pid, b: B.pid });
        const hits = (T.attacks[B.pid] && T.attacks[B.pid][A.pid]) || 0;
        if (hits >= 2 && T.turn - P.revAt > 3) {
          const c = cand('REVENGE', 8.5, 'rg:' + key + ':' + T.turn, { A: nm(B.pid), B: nm(A.pid), K: hits }, [A.pid, B.pid], ['happy', 'shocked'], { vs: 1, snd: 'stingRival', onShow: () => { P.revAt = T.turn; legend('rev', hits, { a: B.pid, b: A.pid }); } });
          if (c) cands.push(c);
        } else if (close && P.sw >= 3 && A.pid !== lead) {
          const c = cand('RIVAL_SWAP', 5, 'sw:' + key + ':' + P.sw, { A: nm(A.pid), B: nm(B.pid), K: P.sw }, [A.pid, B.pid], ['happy', 'shocked'], { vs: 1, snd: 'stingRival' });
          if (c) cands.push(c);
        }
      }
      // izdani igrač ponovno prestiže izdajnika (samo javne izdaje)
      for (const b of T.betr) {
        if (b.done) continue;
        const V = R.get(b.v), Tr = R.get(b.t);
        if (!V || !Tr) { b.done = true; continue; }
        if (V.score > Tr.score && b.below) {
          b.done = true;
          const c = cand('BETRAY_REVENGE', 9, 'br:' + b.id, { V: nm(b.v), T: nm(b.t) }, [b.v, b.t], ['happy', 'shocked'], { vs: 1, snd: 'stingComeback', onShow: () => legend('rev', 10 + b.gain / 100, { a: b.v, b: b.t, bt: 1 }) });
          if (c) cands.push(c);
        }
      }""")
# povratci: zaostatak, smanjenje, niz; postojeće COMEBACK traži stvaran zaostatak
rep("""      for (const p of ps) {
        const k = p.pid, now = r[k];
        if (T.lowRank[k] == null || now > T.lowRank[k]) T.lowRank[k] = now;
        if (T.highRank[k] == null || now < T.highRank[k]) T.highRank[k] = now;
        const low = T.lowRank[k], was = T.prevRank[k];
        if ((T.cbN || 0) >= 2) continue;
        if (n >= 3 && low === n && now === 1 && was !== 1 && !T.shown['cb2:' + k])
          cands.push({ type: 'COMEBACK_BIG', score: 10, key: 'cb2:' + k, t: 'Povratak večeri!', s: nm(k) + ': ' + low + '. → 1.', a: [k], pose: ['happy'], snd: 'stingComeback', onShow: () => { T.cbN = (T.cbN || 0) + 1; } });
        else if (n >= 3 && low >= n - 1 && now <= 2 && was > 2 && !T.shown['cb:' + k])
          cands.push({ type: 'COMEBACK', score: 8, key: 'cb:' + k, t: 'Povratak u igru!', s: nm(k) + ': ' + low + '. → ' + now + '.', a: [k], pose: ['happy'], snd: 'stingComeback', onShow: () => { T.cbN = (T.cbN || 0) + 1; } });
      }""", """      for (const p of ps) {
        const k = p.pid, now = r[k];
        if (T.lowRank[k] == null || now > T.lowRank[k]) T.lowRank[k] = now;
        if (T.highRank[k] == null || now < T.highRank[k]) T.highRank[k] = now;
        const low = T.lowRank[k], was = T.prevRank[k], gapNow = ps[0].score - p.score;
        if (n >= 3 && now === n) T.worst[k] = Math.max(T.worst[k] || 0, gapNow);
        const worst = T.worst[k] || 0, big = worst >= Math.max(800, ps[0].score * 0.3);
        if ((T.cbN || 0) >= 3) continue;
        const done = () => { T.cbN = (T.cbN || 0) + 1; legend('cb', worst, { pid: k, low, now }); };
        if (n >= 3 && low === n && now === 1 && was !== 1 && big && !T.shown['cb2:' + k]) {
          const c = cand('COMEBACK_BIG', 10, 'cb2:' + k, { X: nm(k) }, [k], ['victory'], { snd: 'stingComeback', onShow: done }); if (c) cands.push(c);
        } else if (n >= 3 && big && low === n && now < n && gapNow <= worst * 0.35 && (T.streak[k] >= 2 || (was && was - now >= 2)) && !T.shown['cbr:' + k]) {
          const c = cand('CB_RISE', 8, 'cbr:' + k, { X: nm(k), G: worst, H: Math.max(0, gapNow) }, [k], ['happy'], { snd: 'stingComeback', onShow: done }); if (c) cands.push(c);
        } else if (n >= 3 && low >= n - 1 && now <= 2 && was > 2 && big && !T.shown['cb:' + k] && !T.shown['cbr:' + k]) {
          const c = cand('COMEBACK', 8, 'cb:' + k, { X: nm(k), L: low, R: now }, [k], ['happy'], { snd: 'stingComeback', onShow: done }); if (c) cands.push(c);
        }
      }""")
# nizovi i kladionica kroz varijante
rep("""          if (st === 5) cands.push({ type: 'STREAK5', score: 7, key: 's5:' + k + ':' + T.turn, t: 'Nezaustavljiv niz!', s: p.name + ' — 5 točnih zaredom', a: [k], pose: ['happy'], snd: 'stingStreak' });
          else if (st === 3) cands.push({ type: 'STREAK3', score: 5, key: 's3:' + k + ':' + T.turn, t: 'U formi!', s: p.name + ' — 3 točna zaredom', a: [k], pose: ['happy'], snd: 'stingStreak' });""",
"""          const c = st === 5 ? cand('STREAK5', 7, 's5:' + k + ':' + T.turn, { X: p.name }, [k], ['happy'], { snd: 'stingStreak' })
            : st === 3 ? cand('STREAK3', 5, 's3:' + k + ':' + T.turn, { X: p.name }, [k], ['happy'], { snd: 'stingStreak' }) : null;
          if (c) cands.push(c);""")
rep("""            cands.push({ type: 'STREAK_BROKEN', score: 6, key: 'sb:' + k + ':' + T.turn, t: 'Niz je stao', s: p.name + ' (' + had + ' zaredom) · nakon napada: ' + nm(by), a: [by, k], pose: ['attack', 'sad'], snd: 'stingRival' });""",
"""            const c = cand('STREAK_BROKEN', 6, 'sb:' + k + ':' + T.turn, { X: p.name, K: had, A: nm(by) }, [by, k], ['attack', 'sad'], { snd: 'stingRival' }); if (c) cands.push(c);""")
rep("""      updateRanks(cands);
      if (G.sx) cands.push(G.sx);""", """      // kladionica: veliki uspjeh (srednja važnost)
      for (const p of active()) if (p.betRes >= 500) {
        const c = cand('BET_WIN', 5, 'bw:' + p.pid + ':' + T.turn, { X: p.name, K: p.betRes }, [p.pid], ['happy'], { snd: 'stingSmall', onShow: () => legend('bet', p.betRes, { pid: p.pid }) }); if (c) cands.push(c);
      }
      powerCands(cands);
      updateRanks(cands);
      if (G.sx) cands.push(G.sx);""")
# rivalstvo: varijante teksta
rep("""            cands.push({ type: 'RIVALRY', score: 9, key: 'rv:' + best, t: 'Rivalstvo se zakuhava', s: nm(a) + ' vs ' + nm(b), a: [a, b], pose, vs: 1, snd: 'stingRival', onShow: () => { T.activeRival = best; } });""",
"""            const c = cand('RIVALRY', 9, 'rv:' + best, { A: nm(a), B: nm(b) }, [a, b], pose, { vs: 1, snd: 'stingRival', onShow: () => { T.activeRival = best; } }); if (c) cands.push(c);""")
rep("""        if (hit) cands.push({ type: 'RIVAL_AGAIN', score: 4, key: 'ra', t: 'Opet njih dvoje', s: nm(hit.f) + ' → ' + nm(hit.t), a: [hit.f, hit.t], pose: ['attack', 'shocked'], vs: 1, snd: 'stingRival' });""",
"""        if (hit) { const c = cand('RIVAL_AGAIN', 4, 'ra', { A: nm(hit.f), B: nm(hit.t) }, [hit.f, hit.t], ['attack', 'shocked'], { vs: 1, snd: 'stingRival' }); if (c) cands.push(c); }""")

# ---------- 5) odabir: prednost novom, isti igrač/vrsta ne stalno, tišina ispod praga ----------
rep("""      const val = (c) => c.score + (c.a && c.a.some(human) ? 0.6 : 0);
      ok.sort((x, y) => val(y) - val(x));""", """      const val = (c) => {
        let v = c.score + (c.a && c.a.some(human) ? 0.6 : 0);
        if (c.score < 9) {
          if (T.typeAt[c.type] != null && turn - T.typeAt[c.type] < 4) v -= 2;                         // ista vrsta nedavno
          if ((c.a || []).some((x) => T.feat[x] != null && turn - T.feat[x] < 2)) v -= 1.5;           // isti igrač stalno u fokusu
        }
        return v;
      };
      ok.sort((x, y) => val(y) - val(x));
      // tišina je bolja od nepotrebnog komentara
      while (ok.length && val(ok[0]) < 2.5) ok.shift();
      // ista priča, konkretniji nastavak: osveta istog para ima prednost pred općom najavom rivalstva (rivalstvo se svejedno bilježi)
      if (ok[0] && ok[0].type === 'RIVALRY') {
        const pair = (ok[0].a || []).slice().sort().join('|');
        const rv = ok.find((c) => /REVENGE/.test(c.type) && (c.a || []).slice().sort().join('|') === pair);
        if (rv) { const r0 = ok[0]; if (r0.onShow) r0.onShow(); T.shown[r0.key] = turn; ok.splice(ok.indexOf(rv), 1); ok.unshift(rv); }
      }""")
rep("""      T.shown[c.key] = turn; T.lastAny = turn; if (c.score >= 7) T.lastMajor = turn;""",
    """      T.shown[c.key] = turn; T.lastAny = turn; if (c.score >= 7) T.lastMajor = turn;
      T.typeAt[c.type] = turn; for (const x of c.a || []) T.feat[x] = turn; if (c.li) T.lineAt[c.li] = turn;""")
# trenutak nosi jedinstveni ID i jačinu prikaza (1 kratko, 2 istaknuto, 3 veliki događaj)
rep("""      G.pend = { mo: { k: c.type, t: c.t, s: c.s, a: c.a, pose: c.pose, vs: c.vs ? 1 : 0, snd: c.snd || 'stingSmall' } };""",
    """      G.pend = { mo: { id: ++T.moSeq, k: c.type, lv: c.score >= 9 ? 3 : c.score >= 7 ? 2 : 1, t: c.t, s: c.s, a: c.a, pose: c.pose, vs: c.vs ? 1 : 0, snd: c.snd || 'stingSmall' } };""")
# finale: dodatne priče koje imaju smisla i u piramidi (finale ne ažurira poredak bodova, pa ostaje isti popis)

# ---------- 6) izdaje: povijest pakta u rečenici + krčma pamti nakon izdaje ----------
rep("""    function secretPick() {""", """    // javna izdaja (podaci postaju javni tek s izdajom): pamti za kasniji "vraća se po svoje"
    function onBetray(e) {
      if (!T) return;
      if (e.k === 'betray') {
        const Tr = R.get(e.t), V = R.get(e.v);
        if (T.betr.length < 6) T.betr.push({ id: T.betr.length + 1, t: e.t, v: e.v, gain: e.gain, turn: T.turn, below: !!(V && Tr && V.score < Tr.score), done: false });
        legend('bt', e.gain, { t: e.t, v: e.v, dur: e.dur });
      } else legend('bt', (e.la || 0) + (e.lb || 0), { a: e.a, b: e.b, dbl: 1, dur: e.dur });
    }
    // dvoboj: kratka napomena iz povijesti para (bez utjecaja na pravila)
    function duelNote(a, b) {
      if (!T) return '';
      const key = pairKey(a, b), ab = (T.attacks[a] || {})[b] || 0, ba = (T.attacks[b] || {})[a] || 0;
      if (T.activeRival === key || (T.rival[key] || 0) >= 8) return 'Rivali se napokon sukobljavaju licem u lice!';
      if (ab + ba >= 3) return 'Ovo dvoje imaju neraščišćenih računa.';
      return '';
    }
    function duelOut(w, a, b) {
      if (!T || !w) return '';
      const l = w === a ? b : a, hits = (T.attacks[l] || {})[w] || 0;
      if (hits >= 2) { legend('rev', hits, { a: w, b: l, du: 1 }); return '⚔️ Osveta je slatka: ' + nm(w) + ' pobjeđuje napadača!'; }
      if (T.activeRival === pairKey(a, b)) return 'Rivalstvo dobiva novo poglavlje.';
      return '';
    }
    function secretPick() {""")
rep("""    return { reset, onVote, onPower, afterQuestion, afterScores, afterFinale, secretPick, get state() { return T; } };""",
    """    return { reset, onVote, onPower, afterQuestion, afterScores, afterFinale, secretPick, onBetray, duelNote, duelOut, get state() { return T; } };""")
rep("""  const pickLine = (k, map) => { const arr = PACT_LINES[k], l = arr[rnd(arr.length)]; return l.replace(/\\{(\\w)\\}/g, (_, x) => (map && map[x]) || ''); };""",
    """  const pickLine = (k, map) => { const arr = PACT_LINES[k], l = arr[rnd(arr.length)]; return l.replace(/\\{(\\w)\\}/g, (_, x) => (map && map[x] != null ? map[x] : '')); };""")
rep("""    loyal: ['Izgleda da u ovoj krčmi još postoji čast!',""", """    // izdaja s poviješću pakta (javno tek u trenutku izdaje)
    betrayLong: ['{D} pitanja prijateljstva. Jedan trenutak pohlepe. {T} bira zlato!', '{D} pitanja zajedno, a onda nož u leđa.', 'Dugo prijateljstvo, kratka pamet: {T} uzima sve.'],
    betrayShort: ['Kratko je trajalo to prijateljstvo!', 'Pakt nije preživio ni jednu kriglu.', 'Još se pivo nije ni ohladilo, a već nož u leđa.'],
    heist: ['Ovo nije bila izdaja. Ovo je bila pljačka stoljeća!', 'Krčmar broji zlato i ne vjeruje vlastitim očima.'],
    double2: ['Oboje su donijeli noževe na prijateljsku večeru!', 'Dva noža, dvije laži i nijedan pobjednik!'],
    loyal: ['Izgleda da u ovoj krčmi još postoji čast!',""")
rep("""        evs.push({ k: 'double', a: A.pid, b: B.pid, tre: k.tre, la, lb, line: pickLine('double') });""",
    """        const dur = Math.max(1, G.qn - (k.since || G.qn));
        evs.push({ k: 'double', a: A.pid, b: B.pid, tre: k.tre, la, lb, dur, line: pickLine(G.qn % 2 ? 'double2' : 'double') });
        TD.onBetray(evs[evs.length - 1]);""")
rep("""        evs.push({ k: 'betray', t: T.pid, v: V.pid, tre: k.tre, st, gain: k.tre + st, line: pickLine('betray', { T: T.name, V: V.name }) });""",
    """        const dur = Math.max(1, G.qn - (k.since || G.qn)), gain = k.tre + st;
        const kind = gain >= 1200 ? 'heist' : dur >= 4 ? 'betrayLong' : dur <= 1 ? 'betrayShort' : 'betray';
        evs.push({ k: 'betray', t: T.pid, v: V.pid, tre: k.tre, st, gain, dur, line: pickLine(kind, { T: T.name, V: V.name, D: dur }) });""")
rep("""        const TS = TD.state; if (TS && TS.rival) { const key = T.pid < V.pid ? T.pid + '|' + V.pid : V.pid + '|' + T.pid; TS.rival[key] = (TS.rival[key] || 0) + 12; }""",
    """        const TS = TD.state; if (TS && TS.rival) { const key = T.pid < V.pid ? T.pid + '|' + V.pid : V.pid + '|' + T.pid; TS.rival[key] = (TS.rival[key] || 0) + 12; }
        TD.onBetray(evs[evs.length - 1]);""")
# dvoboj: napomene u javnom stanju
rep("""    G.du = { a: pair[0], b: pair[1], w: null };
    setPhase('duelIntro', cfg.duelIntro);""", """    G.du = { a: pair[0], b: pair[1], w: null, n: TD.duelNote(pair[0], pair[1]) };
    setPhase('duelIntro', cfg.duelIntro);""")
rep("""    G.du.ms = [A, B].map((p) => (p && p.ans >= 0 ? p.ansMs : -1));
    setPhase('duelResult', cfg.duelRes);""", """    G.du.ms = [A, B].map((p) => (p && p.ans >= 0 ? p.ansMs : -1));
    G.du.o = TD.duelOut(G.du.w, G.du.a, G.du.b);
    setPhase('duelResult', cfg.duelRes);""")
rep("""      v.du = { a: G.du.a, b: G.du.b, bonus: cfg.duelBonus };
      if (ph === 'duelResult') { v.du.w = G.du.w; v.du.ms = G.du.ms; }""", """      v.du = { a: G.du.a, b: G.du.b, bonus: cfg.duelBonus };
      if (G.du.n) v.du.n = G.du.n;
      if (ph === 'duelResult') { v.du.w = G.du.w; v.du.ms = G.du.ms; if (G.du.o) v.du.o = G.du.o; }""")

# ---------- 7) tempo: jačina trenutka krčme podiže tempo (izdaja ima svoju fazu, ne dodaje čekanje) ----------
rep("""    if (lastQ && lead) return 'd';""", """    if (lastQ && lead) return 'd';
    const lv = G.pend && G.pend.mo ? G.pend.mo.lv || 0 : 0;
    if (lv >= 3) return 'd';""")
rep("""    if (lastQ) return 't';
    return 'n';""", """    if (lastQ) return 't';
    if (lv >= 2) return 't';
    return 'n';""")
rep("""    if (['COMEBACK', 'STREAK_BROKEN', 'STREAK5', 'RIVAL_LEAD', 'RIVALRY', 'RIVAL_AGAIN'].includes(mo)) return 't';""",
    """    if (['COMEBACK', 'CB_RISE', 'STREAK_BROKEN', 'STREAK5', 'RIVAL_LEAD', 'RIVALRY', 'RIVAL_AGAIN', 'RIVAL_SWAP', 'REVENGE', 'POWER_REVENGE', 'BETRAY_REVENGE', 'THRONE'].includes(mo)) return 't';""")
# testne kuke (samo lokalni API domaćina, ništa od ovoga ne ide preko mreže)
rep("_td: () => TD.state, _G: G };", "_td: () => TD.state, _tdf: () => TD, _p: (pid) => R.get(pid), _G: G };")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('TD 2.0 OK')
