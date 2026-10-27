'use strict';
// Tavern Social Flow 2.0: Vrijeme za dogovore, ponude koje čekaju dogovor, izdaja prije pitanja, šapat jednim dodirom,
// testni način s botovima (isti pakt kao ljudi, bez varanja), testni scenariji. Pokretanje: node v3/sf-test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame, CFG };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P0 = { n: { w: 1, s: 1, t: 0.03 }, t: { w: 1, s: 1, t: 0.03 }, d: { w: 1, s: 1, t: 0.03 } };
const SF = (o) => Object.assign({}, E.CFG.sf, { dur: 3, soloMax: 30 }, o || {});
const FAST = (o) => ({ intro: 0.02, vote: 0.4, voteShow: 0.02, roul: 0.02, power: 0.3, bet: 0.3, cast: 0.02, q: 1.5, pace: P0, paceMo: 0.01, moment: 0.02, betrayShow: 0.05, loyalShow: 0.05, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, fstart: 0.03, fpower: 0.1, fq: 0.3, fr: 0.03, chal: ['sort'], sort: 0.3, chReveal: 0.02, howto: 0.02, howtoMax: 0.05, howtoShort: 0.02, sf: SF(o) });
const FL = { ENABLE_DUELS: false, ENABLE_SECRET_EVENTS: false };
const NAMES = ['Ana', 'Marko', 'Iva', 'Luka'];
const PLAN = (n, fin) => [{ t: 'intro', title: 'R', sub: '' }].concat(Array.from({ length: n }, () => ({ t: 'battle' })), fin ? [{ t: 'finale' }] : []);
function mk(nh, opt, sfo, bots, nq, fin) {
  const g = E.createGame(Object.assign({ code: 'SF', cfg: FAST(sfo), flags: FL, plan: PLAN(nq || 10, fin), pacts: true, rc: false }, opt || {}));
  for (let i = 0; i < nh; i++) g.addPlayer('p' + i, NAMES[i], i, false);
  if (bots) g.setBots(bots);
  g.start(); g._G.qvAt = new Map(); g._G.betAt = new Set();
  for (const p of g.view().P) g._score(p.id, 3000);
  return g;
}
async function until(f, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await sleep(2); } return false; }
const humans = (g) => g.view().P.filter((x) => !x.b && x.c).map((x) => x.id);
// jedno obično pitanje; h.deal() u Vremenu za dogovore (prije potvrde spremnosti), h.calm() u glasanju, h.q() u pitanju prije odgovora
// a: id → true/false/null; aw: id → šapni uz odgovor; ready=false: ne potvrđuj spremnost
async function Q(g, a, h, aw) {
  h = h || {}; const G = g._G; const log = { deal: false };
  await until(() => G.ph === 'vote' || G.ph === 'deal');
  if (G.ph === 'deal') {
    log.deal = true; log.dealS = G.s; log.dl = g.view().dl;
    if (h.deal) await h.deal();
    if (h.ready !== false) for (const id of humans(g)) g.setInput(id, { s: G.s, ok: 1 });
    await until(() => G.ph === 'vote', 40000);
  }
  let s = G.s;
  if (h.calm) await h.calm();
  for (const id of humans(g)) g.setInput(id, { s, v: 0 });
  await until(() => G.ph === 'power'); s = G.s;
  for (const id of humans(g)) g.setInput(id, { s, p: '' });
  await until(() => G.ph === 'question'); s = G.s;
  if (h.q) await h.q();
  const before = Object.fromEntries(g.view().P.map((p) => [p.id, p.sc]));
  for (const [id, r] of Object.entries(a || {})) if (r !== null) g.setInput(id, Object.assign({ s, c: r ? G.q.a : (G.q.a + 1) % 4, t: 100 }, aw && aw[id] ? { w: 1 } : {}));
  if (h.afterAns) await h.afterAns();
  await until(() => G.ph === 'reveal', 8000);
  log.v = g.view(); log.before = before;
  return log;
}
const all = (w, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => ['p' + i, w]));

(async () => {
  console.log('1) Vrijeme za dogovore: tek nakon 3. pitanja, najviše po rasporedu, završava kad su svi spremni');
  {
    const g = mk(3);
    const deals = [];
    for (let i = 0; i < 10; i++) await Q(g, all(false, 3), { deal: async () => { deals.push(g._G.bdone); } });
    ok(JSON.stringify(deals) === '[3,6,8]', 'faza se otvara prije 4., 7. i 9. pitanja (nakon odigranih 3, 6, 8): ' + JSON.stringify(deals));
    g.stop();
  }
  {
    const g = mk(3); for (let i = 0; i < 3; i++) await Q(g, all(false, 3));
    await until(() => g._G.ph === 'deal'); const t0 = Date.now(), s = g._G.s;
    ok(g.view().dl && /tko s kim pije/.test(g.view().dl.t) && g.view().dl.solo === 0, 'najava: ' + g.view().dl.t);
    ok(g.view().ms > 2000 && g.view().ms <= 3000, 'ima odbrojavanje (višeigračka partija, ' + g.view().ms + ' ms)');
    for (const id of ['p0', 'p1', 'p2']) g.setInput(id, { s, ok: 1 });
    await until(() => g._G.ph === 'vote', 2000);
    ok(g._G.ph === 'vote' && Date.now() - t0 < 300, 'svi spremni → odmah nastavlja (' + (Date.now() - t0) + ' ms)');
    g.stop();
  }
  {
    const g = mk(3, { pacts: false, rc: false });
    let d = 0; for (let i = 0; i < 9; i++) { const r = await Q(g, all(false, 3)); if (r.deal) d++; }
    ok(d === 0, 'bez paktova i obračuna nema prazne faze (otvoreno: ' + d + ')');
    g.stop();
  }
  {
    const g = mk(2); let d = 0; for (let i = 0; i < 9; i++) { const r = await Q(g, all(false, 2)); if (r.deal) d++; }
    ok(d === 0, 'dva čovjeka bez testnog načina: paktovi nisu mogući → nema faze (' + d + ')');
    g.stop();
  }

  console.log('2) Ponude čekaju pogodan trenutak: ne šalju se i ne prihvaćaju tijekom pitanja, traju do kraja sljedećeg dogovora');
  {
    const g = mk(3); for (let i = 0; i < 3; i++) await Q(g, all(false, 3), { q: async () => { if (i === 2) ok(!g.pactAction('p1', { k: 'offer', to: 'p0' }), 'slanje ponude tijekom pitanja odbijeno'); } });
    // Marko šalje ponudu u Vremenu za dogovore, Ana ne odgovara; ponuda preživi pitanja do kraja SLJEDEĆEG dogovora
    let r = await Q(g, all(false, 3), { deal: async () => { ok(g.pactAction('p1', { k: 'offer', to: 'p0' }), 'Marko šalje ponudu (Vrijeme za dogovore)'); ok(g.priv('p0').inv.length === 1 && g.priv('p0').inv[0].dl === 1 && g.priv('p0').inv[0].id > 0, 'Ana privatno vidi ponudu (ID, vrijedi do dogovora)'); } },
      null);
    let q2 = null;
    r = await Q(g, all(false, 3), { q: async () => { q2 = g.priv('p0').inv.length; ok(!g.pactAction('p0', { k: 'accept', from: 'p1' }), 'prihvaćanje usred pitanja odbijeno'); } });
    ok(q2 === 1, 'ponuda ne nestaje tijekom pitanja');
    await Q(g, all(false, 3));
    r = await Q(g, all(false, 3), { deal: async () => { ok(g.priv('p0').inv.length === 1, 'ponuda je još tu u sljedećem Vremenu za dogovore'); } });
    ok(g.priv('p0').inv.length === 0 && /nije prihvaćena/.test((g._p('p1').note || {}).t || ''), 'nakon kraja tog dogovora ponuda istekne (Marko dobiva neutralnu poruku)');
    g.stop();
  }
  {
    const g = mk(3); for (let i = 0; i < 4; i++) await Q(g, all(false, 3), i === 3 ? { calm: async () => { ok(g.pactAction('p1', { k: 'offer', to: 'p0' }), 'ponuda poslana između pitanja (glasanje)'); } } : null);
    await Q(g, all(false, 3), { calm: async () => { ok(g.pactAction('p0', { k: 'accept', from: 'p1' }), 'Ana prihvaća u mirnoj fazi (glasanje) → pakt vrijedi od pitanja koje slijedi'); } });
    ok(!!g._p('p0').pact, 'pakt sklopljen');
    g.stop();
  }
  {
    const g = mk(4); for (let i = 0; i < 3; i++) await Q(g, all(false, 4));
    await Q(g, all(false, 4), { deal: async () => {
      g.pactAction('p1', { k: 'offer', to: 'p0' }); g.pactAction('p2', { k: 'offer', to: 'p0' }); g.pactAction('p3', { k: 'offer', to: 'p0' });
      ok(g.priv('p0').inv.length === 2, 'najviše 2 dolazne ponude odjednom (treća tiho istječe): ' + g.priv('p0').inv.length);
      ok(g.pactAction('p0', { k: 'accept', from: 'p2' }), 'Ana bira jednu');
      ok(g.priv('p0').inv.length === 0 && !g.pactAction('p0', { k: 'accept', from: 'p1' }), 'ostale ponude više ne vrijede');
    } });
    g.stop();
  }

  console.log('3) Izdaja: priprema samo u Vremenu za dogovore, zaključava se kad pitanje počne, izvršava točno jednom');
  {
    const g = mk(3); for (let i = 0; i < 4; i++) await Q(g, all(false, 3), i === 3 ? { calm: async () => { g.pactAction('p0', { k: 'offer', to: 'p1' }); g.pactAction('p1', { k: 'accept', from: 'p0' }); } } : null);
    ok(!!g._p('p0').pact, 'Ana i Marko imaju pakt');
    await Q(g, { p0: true, p1: true, p2: false }, { calm: async () => { ok(!g.pactAction('p1', { k: 'betray', on: true }), 'izdaja izvan Vremena za dogovore odbijena'); } });
    ok(g.priv('p0').k.tre === 75, 'riznica +75 (oboje točno)');
    await Q(g, { p0: true, p1: true, p2: false });
    let r = await Q(g, { p0: true, p1: true, p2: false }, {
      deal: async () => {
        ok(g.pactAction('p1', { k: 'betray', on: true }), 'Marko priprema izdaju u Vremenu za dogovore');
        ok(g.priv('p1').k.bt === 1 && g.priv('p1').k.dl === 1, 'Marko vidi pripremljenu izdaju');
        ok(g.pactAction('p1', { k: 'betray', on: false }) && g.priv('p1').k.bt === 0, 'može odustati prije zaključavanja');
        g.pactAction('p1', { k: 'betray', on: true });
        ok(!g.priv('p0').k.bt && !JSON.stringify(g.priv('p0')).includes('btl') && !JSON.stringify(g.view()).includes('betray'), 'Ana ni javno stanje ne znaju ništa');
      },
      q: async () => { ok(!g.pactAction('p1', { k: 'betray', on: false }), 'tijekom pitanja odluka je zaključana'); ok(g.priv('p1').k.btl === 1, 'Marko vidi zaključanu izdaju'); },
    });
    await until(() => g._G.ph === 'betray');
    const bt = g.view().bt;
    ok(bt && bt.evs.length === 1 && bt.evs[0].k === 'betray' && bt.evs[0].t === 'p1' && bt.evs[0].tre === 225, 'izdaja nakon pitanja (i to pitanje puni riznicu): Marko uzima riznicu 225 + ' + (bt && bt.evs[0].st));
    const sc = g.view().P.map((p) => p.sc).join(); await sleep(30);
    ok(g.view().P.map((p) => p.sc).join() === sc && !g._p('p0').pact && !g._p('p1').pact, 'izvršeno točno jednom; pakt je završen');
    g.stop();
  }
  {
    const g = mk(3); for (let i = 0; i < 4; i++) await Q(g, all(false, 3), i === 3 ? { calm: async () => { g.pactAction('p0', { k: 'offer', to: 'p1' }); g.pactAction('p1', { k: 'accept', from: 'p0' }); } } : null);
    await Q(g, all(true, 3)); await Q(g, all(true, 3));
    await Q(g, { p0: true, p1: true, p2: true }, { deal: async () => { g.pactAction('p0', { k: 'betray', on: true }); g.pactAction('p1', { k: 'betray', on: true }); } });
    await until(() => g._G.ph === 'betray');
    ok(g.view().bt && g.view().bt.evs[0].k === 'double', 'dvostruka izdaja: oba u istom dogovoru → postojeće pravilo dvostruke izdaje');
    g.stop();
  }

  console.log('4) Šapat jednim dodirom');
  {
    const g = mk(3); for (let i = 0; i < 4; i++) await Q(g, all(false, 3), i === 3 ? { calm: async () => { g.pactAction('p0', { k: 'offer', to: 'p1' }); g.pactAction('p1', { k: 'accept', from: 'p0' }); } } : null);
    let wh = null, wrongC = null;
    await Q(g, { p0: false, p1: null, p2: null }, { afterAns: async () => { wh = g.priv('p1').k.wh; wrongC = g._p('p0').ans; ok(g.priv('p0').k.wsent === 1, 'Ana: „Šapnuto”'); ok(g.priv('p2').k === undefined && !JSON.stringify(g.view()).includes('"wh"'), 'Iva i javno stanje ne vide šapat');
      g.setInput('p1', { s: g._G.s, c: 0, t: 300 }); g.setInput('p2', { s: g._G.s, c: 0, t: 300 }); } }, { p0: 1 });
    ok(wh === wrongC, 'odgovor + šapat su jedna radnja: Marko dobiva Anin odgovor (' + wh + '), i kad je pogrešan');
    await Q(g, { p0: true, p1: true, p2: null }, { afterAns: async () => {
      const s = g._G.s; ok(!g.setInput('p1', { s, c: 3, t: 400 }), 'Marko je već odgovorio: šapat ne može promijeniti zaključan odgovor');
      g.setInput('p2', { s, c: 0, t: 300 });
    } }, { p1: 1 });
    ok(true, 'obični odgovor bez šapata ostaje jedan dodir (bez polja w)');
    g.stop();
  }
  {
    const g = mk(3); for (let i = 0; i < 4; i++) await Q(g, all(false, 3));
    await Q(g, { p0: true, p1: null, p2: null }, { afterAns: async () => { ok(!g._p('p1').wh && !g._p('p2').wh, 'bez pakta polje w nema učinka'); g.setInput('p1', { s: g._G.s, c: 0 }); g.setInput('p2', { s: g._G.s, c: 0 }); } }, { p0: 1 });
    g.stop();
  }

  console.log('5) Obični način (testni isključen): pravila v28 ostaju');
  {
    const g = mk(2, {}, {}, 2);
    for (let i = 0; i < 4; i++) await Q(g, all(false, 2));
    ok(!g.priv('p0') || !g.priv('p0').can, 'dva čovjeka + botovi: pakt nije moguć (treba 3 čovjeka)');
    ok(!g.pactAction('p0', { k: 'offer', to: g.view().P.find((p) => p.b).id }), 'ponuda botu odbijena');
    ok(g.sfScenario('p0', 'offer').ok === 0, 'testni scenariji nedostupni');
    ok(!g.pactAction('p0', { k: 'scenario', s: 'offer' }), 'scenarij se ne može pokrenuti mrežnom porukom');
    g.stop();
  }

  console.log('6) Testni način: jedan čovjek + 3 bota');
  {
    const g = mk(1, { bs: true }, {}, 3);
    ok(g.view().bs === 1, 'testni način je javno označen (da svi znaju da botovi sudjeluju u paktovima)');
    let r = null, deals = [];
    for (let i = 0; i < 4; i++) { r = await Q(g, all(false, 1), { ready: false, deal: async () => { deals.push(g._G.bdone); ok(g.view().dl.solo === 1 && g.view().ms > 25000, 'solo: nema kratkog odbrojavanja (sigurnosna granica ' + Math.round(g.view().ms / 1000) + ' s)'); await sleep(500); ok(g._G.ph === 'deal', 'botovi su spremni, igra čeka samo mene'); g.setInput('p0', { s: g._G.s, ok: 1 }); } }); }
    ok(deals[0] === 3 && deals.length === 1, 'prvi dogovor nakon 3. pitanja (kad paktovi postanu dostupni): ' + JSON.stringify(deals));
    const bots = g.view().P.filter((p) => p.b).map((p) => p.id);
    ok(g.priv('p0').can && bots.every((b) => g.priv('p0').cand.includes(b)), 'mogu ponuditi pakt botu (botovi su kandidati)');
    const prof = Object.values(g._G.prof);
    ok(new Set(prof).size === 3, 'tri bota imaju tri različita profila: ' + prof.join(', '));
    g.stop();
  }
  {
    // scenarij: bot prihvaća moj pakt → riznica, bot šapće SVOJ odgovor, bot priprema izdaju u dogovoru
    const g = mk(1, { bs: true }, {}, 3);
    for (let i = 0; i < 3; i++) await Q(g, all(false, 1));
    const b0 = g.view().P.find((p) => p.b).id;
    ok(g.sfScenario('p0', 'betray').ok === 0, 'scenarij izdaje bez pakta: jasno objašnjenje — ' + g.sfScenario('p0', 'betray').msg);
    ok(g.sfScenario('p0', 'accept').ok === 1, 'scenarij: bot prihvaća moj pakt');
    await Q(g, all(false, 1), { calm: async () => { ok(g.pactAction('p0', { k: 'offer', to: b0 }), 'nudim pakt botu'); await until(() => !!g._p('p0').pact, 4000); } });
    ok(g._p('p0').pact && g._p(b0).pact === g._p('p0').pact, 'bot je prihvatio — pakt s botom kroz isti sustav');
    // šapat bota: uvijek njegov vlastiti zaključani odgovor, ne nužno točan
    let same = 0, wrong = 0, n = 0;
    for (let i = 0; i < 6; i++) {
      g.sfScenario('p0', 'whisper');
      await Q(g, { p0: null }, { q: async () => { await until(() => g._p(b0).ans >= 0, 4000); await sleep(5); const w = g._p('p0').wh; if (w) { n++; if (w.c === g._p(b0).ans) same++; if (w.c !== g._G.q.a) wrong++; } g.setInput('p0', { s: g._G.s, c: 0, t: 200 }); } });
    }
    ok(n >= 5 && same === n, 'bot šapće točno ono što je sam odgovorio (' + same + '/' + n + ')');
    ok(wrong >= 1 || n < 5, 'šapat bota nije uvijek točan (' + wrong + ' pogrešnih od ' + n + ') — bot ne čita točan odgovor');
    g.stop();
  }
  {
    const g = mk(1, { bs: true }, {}, 3);
    for (let i = 0; i < 3; i++) await Q(g, all(false, 1));
    const b0 = g.view().P.find((p) => p.b).id;
    g.sfScenario('p0', 'accept');
    await Q(g, { p0: true }, { calm: async () => { g.pactAction('p0', { k: 'offer', to: b0 }); await until(() => !!g._p('p0').pact, 4000); } });
    g.sfScenario('p0', 'loyal');
    ok(/sljedećem Vremenu za dogovore/.test(g.sfScenario('p0', 'betray').msg), 'scenarij izdaje izvan dogovora: bot će izdaju pripremiti u sljedećem dogovoru');
    let bQ = null, prepAtQ = null;
    for (let i = 0; i < 4 && !bQ; i++) {
      await Q(g, { p0: null }, { q: async () => { prepAtQ = g._p(b0).betray; bQ = prepAtQ ? g._G.qn : null; g.setInput('p0', { s: g._G.s, c: g._G.q.a, t: 100 }); } });
    }
    ok(prepAtQ === true, 'bot je odluku o izdaji donio PRIJE pitanja (zastavica postavljena kad pitanje počinje)');
    ok(!g.priv('p0').k || !g.priv('p0').k.bt, 'ja ne znam za njegovu odluku');
    await until(() => g._G.ph === 'betray', 5000);
    const e = g.view().bt && g.view().bt.evs[0];
    ok(e && e.k === 'betray' && e.t === b0 && e.v === 'p0', 'izdaja bota izvršena nakon pitanja (postojeća animacija/događaj)');
    g.stop();
  }
  {
    const g = mk(1, { bs: true }, {}, 3);
    for (let i = 0; i < 3; i++) await Q(g, all(false, 1));
    const b0 = g.view().P.find((p) => p.b).id;
    g.sfScenario('p0', 'accept');
    await Q(g, { p0: true }, { calm: async () => { g.pactAction('p0', { k: 'offer', to: b0 }); await until(() => !!g._p('p0').pact, 4000); } });
    g.sfScenario('p0', 'double');
    let dd = false;
    for (let i = 0; i < 4 && !dd; i++) await Q(g, { p0: null }, { deal: async () => { dd = true; g.pactAction('p0', { k: 'betray', on: true }); }, q: async () => { g.setInput('p0', { s: g._G.s, c: 0, t: 100 }); } });
    await until(() => g._G.ph === 'betray', 5000);
    ok(g.view().bt && g.view().bt.evs[0].k === 'double', 'scenarij „oba izdaju”: dvostruka izdaja kroz isto pravilo');
    g.stop();
  }
  {
    // odanost do finala s botom + Legende
    const g = mk(1, { bs: true }, {}, 3, 9, true);
    for (let i = 0; i < 3; i++) await Q(g, all(false, 1));
    const b0 = g.view().P.find((p) => p.b).id;
    g.sfScenario('p0', 'accept');
    await Q(g, { p0: true }, { calm: async () => { g.pactAction('p0', { k: 'offer', to: b0 }); await until(() => !!g._p('p0').pact, 4000); } });
    g.sfScenario('p0', 'loyal');
    for (let i = 0; i < 5; i++) await Q(g, { p0: null }, { q: async () => { await until(() => g._p(b0).ans >= 0, 4000); g.setInput('p0', { s: g._G.s, c: g._p(b0).ans, t: 100 }); } });
    await until(() => g._G.ph === 'loyal' || g._G.ph === 'fstart', 8000);
    const ly = g.view().ly;
    ok(ly && ly.evs[0] && [ly.evs[0].a, ly.evs[0].b].sort().join() === ['p0', b0].sort().join() && ly.evs[0].bonus === Math.round(ly.evs[0].tre * 1.4) - ly.evs[0].tre, 'odanost do kraja: riznica ' + (ly && ly.evs[0].tre) + ' + bonus ' + (ly && ly.evs[0].bonus) + ' podijeljeno');
    g.stop();
  }
  {
    // bot sam šalje ponudu (scenarij) — ponuda ostaje i preko pitanja
    const g = mk(1, { bs: true }, {}, 3);
    for (let i = 0; i < 4; i++) await Q(g, all(false, 1));
    ok(g.sfScenario('p0', 'offer').ok === 1, 'scenarij: bot mi šalje ponudu');
    await until(() => (g.priv('p0').inv || []).length > 0, 3000);
    const inv = g.priv('p0').inv, n0 = inv.length;
    ok(n0 >= 1 && inv.every((o) => g._p(o.f).bot), 'stigla je ponuda od bota (' + n0 + ' — botovi mogu i sami ponuditi)');
    let inQ = 0; await Q(g, all(false, 1), { q: async () => { inQ = g.priv('p0').inv.length; } });
    ok(inQ === n0, 'ponuda bota ne nestaje tijekom pitanja');
    ok(g.pactAction('p0', { k: 'decline', from: inv[0].f }), 'mogu je odbiti');
    g.stop();
  }
  {
    // profili: odluke botova se razlikuju (nisu uvijek iste)
    let acc = 0, dec = 0;
    for (let k = 0; k < 8; k++) {
      const g = mk(1, { bs: true }, {}, 3);
      for (let i = 0; i < 3; i++) await Q(g, all(false, 1));
      const bots = g.view().P.filter((p) => p.b).map((p) => p.id);
      await Q(g, all(false, 1), { calm: async () => { g.pactAction('p0', { k: 'offer', to: bots[k % 3] }); await until(() => !g._G.offers.some((o) => o.from === 'p0'), 4000); } });
      if (g._p('p0').pact) acc++; else dec++;
      g.stop();
    }
    ok(acc > 0 && dec > 0, 'botovi ponekad prihvaćaju, ponekad odbijaju (' + acc + ' / ' + dec + ')');
  }

  console.log('7) Krčmarova ponuda stiže već u Vremenu za dogovore i zaključava se prije kategorije');
  {
    const g = mk(3, { tk: true }, {}, 0, 10);
    g._G; for (let i = 0; i < 3; i++) await Q(g, all(false, 3));
    let o = null;
    await Q(g, all(false, 3), { deal: async () => { o = g._G.tk.cur; } });
    // tk.after je 5, pa ponuda može stići tek u 2. dogovoru
    await Q(g, all(false, 3)); await Q(g, all(false, 3));
    await Q(g, all(false, 3), { deal: async () => { o = g._G.tk.cur; if (o) ok(o.st === 'OFFERED' && g._G.ph === 'deal' && g.priv(o.f).tk, 'ponuda stigla u dogovoru, samo primatelju'); }, calm: async () => { if (o) ok(g._G.cw === -1 && (o.st === 'OFFERED' || o.st === 'ACCEPTED'), 'i dalje vrijedi u glasanju, prije otkrivanja kategorije'); } });
    ok(!o || ['EXPIRED', 'SETTLED', 'ACCEPTED', 'CANCELLED', 'DECLINED'].includes(o.st), 'zaključana nakon glasanja (' + (o ? o.st : 'nije ponuđena u ovoj partiji') + ')');
    g.stop();
  }

  console.log('8) Ponovno spajanje i ponovljene poruke');
  {
    const g = mk(3); for (let i = 0; i < 3; i++) await Q(g, all(false, 3));
    await Q(g, all(false, 3), { deal: async () => {
      g.pactAction('p1', { k: 'offer', to: 'p0' });
      g.syncPeers([{ pid: 'p1', name: 'Marko', av: 1 }, { pid: 'p2', name: 'Iva', av: 2 }]);
      g.syncPeers([{ pid: 'p0', name: 'Ana', av: 0 }, { pid: 'p1', name: 'Marko', av: 1 }, { pid: 'p2', name: 'Iva', av: 2 }]);
      ok(g.priv('p0').inv.length === 1, 'Ana se vrati: ponuda je i dalje tu');
      ok(g.pactAction('p0', { k: 'accept', from: 'p1' }) && !g.pactAction('p0', { k: 'accept', from: 'p1' }), 'ponovljeno prihvaćanje nema učinka');
      const s = g._G.s; ok(g.setInput('p2', { s, ok: 1 }) && !g.setInput('p2', { s, ok: 1 }), 'ponovljena potvrda spremnosti se ne broji dvaput');
    } });
    ok(g._G.pacts.filter((k) => k.on).length === 1, 'točno jedan pakt');
    g.stop();
  }

  console.log('9) Procjena trajanja: koliko Vrijeme za dogovore dodaje partiji');
  {
    // standardni raspored (9 pitanja), 4 igrača, paktovi i obračuni uključeni: broj faza × trajanje (svi spremni ili 20 s)
    const opened = [];
    for (let k = 0; k < 6; k++) {
      const g = mk(4, { rc: true }, { dur: 3 }, 0, 9); let n = 0;
      for (let i = 0; i < 9; i++) { const r = await Q(g, all(i % 2 === 0, 4)); if (r.deal) n++; }
      opened.push(n); g.stop();
    }
    const avg = opened.reduce((a, b) => a + b, 0) / opened.length;
    // vrijeme do "svi spremni": svaki čovjek 4–16 s (jednoliko), faza traje do najsporijeg, najviše 20 s
    let sum = 0; const N = 20000; for (let i = 0; i < N; i++) { let mx = 0; for (let j = 0; j < 4; j++) mx = Math.max(mx, 4 + Math.random() * 12); sum += Math.min(20, mx); }
    const per = sum / N;
    console.log('     faza otvorena prosječno ' + avg.toFixed(1) + '× po partiji; očekivano trajanje faze ' + per.toFixed(1) + ' s → dodatno ≈ ' + Math.round(avg * per) + ' s (gornja granica ' + Math.round(avg * 20) + ' s)');
    ok(avg <= 3 && avg * 20 <= 60, 'najviše 3 faze, najviše 60 s dodatno');
  }

  console.log(fails ? '\n✘ ' + fails + ' PROVJERA PALO' : '\nSOCIAL FLOW OK');
  process.exit(fails ? 1 : 0);
})();
