
  // ---------- Tavern Director ----------
  const TDCFG = Object.assign({}, FAST, { vote: 5, power: 5, q: 5, bet: 5, reveal: 0.05, moment: 0.05, duelIntro: 0.05, duel: 5, duelRes: 0.05, secret: 5, secret2: 5, betEvents: [0, 0] });
  const many = Array.from({ length: 12 }, () => ({ t: 'battle' }));
  const mk = (flags, cfg) => {
    const gg = E.createGame({ code: 'TD', cfg: Object.assign({}, TDCFG, cfg || {}), plan: many, flags: Object.assign({ ENABLE_SECRET_EVENTS: false }, flags || {}) });
    gg.addPlayer('a', 'Ana', 0, false, true); gg.addPlayer('b', 'Bruno', 1, false, true); gg.addPlayer('c', 'Cvita', 2, false, true);
    return gg;
  };
  const seen = [];
  // jedna bitka: glas -> (moći) -> pitanje; ans: { a: true/false/null }, pw: { a: 'b' } (napad na b), sc: postavi bodove prije bodovanja
  async function battle(gg, ans, pw, sc) {
    await until(() => ['vote', 'secret'].includes(gg.view().ph));
    let vv = gg.view();
    if (vv.ph === 'vote') { for (const id of ['a', 'b', 'c']) gg.setInput(id, { s: vv.s, v: 0 }); }
    await until(() => ['power', 'secret'].includes(gg.view().ph));
    if (gg.view().ph === 'secret') return 'secret';
    vv = gg.view();
    for (const id of ['a', 'b', 'c']) {
      const me = vv.P.find((p) => p.id === id);
      if (pw && pw[id]) { const k = me.of.find((x) => E.POWERS[x].atk); gg.setInput(id, { s: vv.s, p: k, t: pw[id] }); }
      else gg.setInput(id, { s: vv.s, p: '' });
    }
    await until(() => gg.view().ph === 'question', 4000);
    vv = gg.view();
    const cor = gg._G.q.a;
    if (sc) for (const id in sc) gg._score(id, sc[id]);
    await sleep(60);
    for (const id of ['a', 'b', 'c']) gg.setInput(id, { s: vv.s, c: ans[id] ? cor : (cor + 1) % 4, t: id === 'a' ? 300 : 900 });
    await until(() => gg.view().ph === 'reveal');
    // poslije otkrivanja: zabilježi trenutak/dvoboj ako se pojavi
    const out = { mo: null, duel: null };
    await until(() => !['reveal'].includes(gg.view().ph));
    const ph = gg.view().ph;
    if (ph === 'moment') { out.mo = gg.view().mo; seen.push(out.mo.k); }
    if (ph === 'duelIntro') out.duel = gg.view().du;
    return out;
  }

  console.log('7) Tavern Director: niz točnih odgovora');
  g = mk();
  g.start();
  let r1 = await battle(g, { a: 1, b: 0, c: 0 });
  let r2 = await battle(g, { a: 1, b: 0, c: 0 });
  let r3 = await battle(g, { a: 1, b: 0, c: 0 });
  ok(g._td().streak.a === 3, 'niz se broji: Ana 3 zaredom');
  ok(r3.mo && r3.mo.k === 'STREAK3' && /3 točna zaredom/.test(r3.mo.s), 'trenutak "U formi!" nakon 3 točna: ' + (r3.mo && r3.mo.t + ' / ' + r3.mo.s));
  ok(!r1.mo && !r2.mo, 'nema bannera nakon svakog pitanja');
  await battle(g, { a: 0, b: 0, c: 0 });
  ok(g._td().streak.a === 0, 'netočan odgovor resetira niz');
  g.stop();

  console.log('8) Tavern Director: povratak u igru');
  g = mk();
  g.start();
  await battle(g, { a: 1, b: 1, c: 0 }, null, { a: 2000, b: 1000, c: 0 });
  await battle(g, { a: 0, b: 0, c: 0 });
  const r8 = await battle(g, { a: 0, b: 0, c: 1 }, null, { a: 2600, b: 1100, c: 1000 });
  ok(r8.mo && r8.mo.k === 'COMEBACK' && /3\. → 2\./.test(r8.mo.s), 'POVRATAK U IGRU: ' + (r8.mo && r8.mo.s));
  g.stop();

  console.log('9) Tavern Director: rivalstvo i dvoboj');
  g = mk();
  g.start();
  await battle(g, { a: 1, b: 1, c: 0 }, { a: 'b', b: 'a' });
  await battle(g, { a: 0, b: 0, c: 0 }, { a: 'b', b: 'a' });
  const rv = g._td().rival['a|b'];
  ok(rv >= 8, 'rivalry score raste s međusobnim napadima i bliskim bodovima: ' + rv);
  let r9 = null; for (let i = 0; i < 2 && !(r9 && r9.mo && r9.mo.k === 'RIVALRY'); i++) r9 = await battle(g, { a: 0, b: 0, c: 0 });
  ok(seen.includes('RIVALRY') && g._td().activeRival === 'a|b', 'na pragu se pojavi "Rivalstvo se zakuhava" (Ana vs Bruno)');
  let du = null;
  for (let i = 0; i < 4 && !du; i++) { const r = await battle(g, { a: 0, b: 0, c: 0 }); du = r.duel; }
  ok(du && ((du.a === 'a' && du.b === 'b') || (du.a === 'b' && du.b === 'a')), 'dvoboj se aktivira između rivala');
  await until(() => g.view().ph === 'duel');
  v = g.view();
  ok(!g.setInput('c', { s: v.s, c: 0 }), 'gledatelj (Cvita) ne može odgovarati u dvoboju');
  const before = { a: v.P.find((p) => p.id === 'a').sc, b: v.P.find((p) => p.id === 'b').sc, c: v.P.find((p) => p.id === 'c').sc };
  const dc = g._G.q.a;
  g.setInput('b', { s: v.s, c: dc, t: 2000 }); g.setInput('a', { s: v.s, c: dc, t: 800 });
  await until(() => g.view().ph === 'duelResult');
  v = g.view();
  const Pd = (id) => v.P.find((p) => p.id === id);
  ok(v.du.w === 'a' && Pd('a').sc === before.a + 300 && Pd('b').sc === before.b && Pd('c').sc === before.c, 'oba točna: brži (Ana) dobiva +300, gubitnik ne gubi bodove');
  ok(g._td().duels === 1, 'najviše jedan dvoboj po partiji');
  g.stop();

  console.log('10) Tavern Director: tajna meta');
  g = mk({ ENABLE_SECRET_EVENTS: true, ENABLE_SECRET_TARGET: true }, { secretChance: 1 });
  g.start();
  await battle(g, { a: 0, b: 0, c: 0 }); await battle(g, { a: 0, b: 0, c: 0 });
  const r10 = await battle(g, { a: 0, b: 0, c: 0 });
  v = g.view();
  ok(r10 === 'secret' && v.ph === 'secret' && v.se && v.se.p && v.se.k === 'target', 'tajni događaj otvara se samo za jednog igrača');
  ok(!('x' in v.se) || v.se.x === null, 'TV/ostali ne vide koga je odabrao');
  const chooser = v.se.p, others = ['a', 'b', 'c'].filter((x) => x !== chooser), tgt = others[0], third = others[1];
  ok(!g.setInput(third, { s: v.s, x: chooser }), 'drugi igrači ne mogu odlučivati umjesto njega');
  g.setInput(chooser, { s: v.s, x: tgt });
  await until(() => g.view().ph === 'power');
  v = g.view();
  for (const id of ['a', 'b', 'c']) g.setInput(id, { s: v.s, p: '' });
  await until(() => g.view().ph === 'question');
  v = g.view();
  const scB = v.P.find((p) => p.id === chooser).sc, cq = g._G.q.a;
  await sleep(50);
  for (const id of ['a', 'b', 'c']) g.setInput(id, { s: v.s, c: id === chooser ? cq : (cq + 1) % 4, t: 500 });
  await until(() => g.view().ph === 'reveal');
  v = g.view();
  const Pc = v.P.find((p) => p.id === chooser);
  ok(Pc.xb === 200 && Pc.sc === scB + Pc.g + 200, 'meta je pogriješila: tajni igrač dobiva +200 (' + Pc.n + ')');
  ok(v.P.find((p) => p.id === tgt).sc >= 0 && !v.P.find((p) => p.id === tgt).xb, 'meti se bodovi ne oduzimaju');
  g.stop();

  console.log('11) Tavern Director: cijela igra s botovima');
  {
    const ph = []; const momentK = [];
    const gb = E.createGame({ code: 'TDB', cfg: Object.assign({}, FAST, { q: 1.5, vote: 1, power: 1.2, bet: 1, fpower: 1, sort: 1.5, link: 1.5, fq: 1, moment: 0.05, duelIntro: 0.05, duel: 1.5, duelRes: 0.05, secret: 1, secret2: 1, secretChance: 1 }), flags: { ENABLE_SECRET_HELP: true } });
    ['Ana', 'Bruno', 'Cvita', 'Dino'].forEach((n, i) => gb.addBot(n, i));
    const w = setInterval(() => { const vv = gb.view(); if (ph[ph.length - 1] !== vv.ph) { ph.push(vv.ph); if (vv.ph === 'moment') momentK.push(vv.mo.k); } }, 3);
    gb.start();
    const fin = await until(() => gb.view().ph === 'final', 150000);
    clearInterval(w);
    ok(fin, 'igra s Tavern Directorom stiže do kraja');
    const nMo = ph.filter((x) => x === 'moment').length, nQ = ph.filter((x) => x === 'question').length;
    ok(nMo >= 1 && nMo <= Math.ceil(nQ * 0.7), 'trenutaka u krčmi: ' + nMo + ' na ' + nQ + ' pitanja (' + momentK.join(', ') + ')');
    ok(ph.filter((x) => x === 'duelIntro').length <= 1, 'dvoboja: ' + ph.filter((x) => x === 'duelIntro').length + ' (najviše 1)');
    ok(ph.filter((x) => x === 'secret').length <= 2, 'tajnih događaja: ' + ph.filter((x) => x === 'secret').length + ' (najviše 2)');
    for (let i = 1; i < ph.length; i++) if (ph[i] === 'moment' && ph[i - 1] === 'moment') { ok(false, 'dva trenutka zaredom'); break; }
    gb.stop();
  }
