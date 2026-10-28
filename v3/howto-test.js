'use strict';
// Upute: bez odbrojavanja; igra kreće tek kad svi ljudi potvrde, botovi potvrđuju sami.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,').replace('kr: { wait: 45,', 'kr: { wait: 0,').replace('pactChance: 0.45', 'pactChance: 0').replace('offChance: 0.35', 'offChance: 0').replace('chFrom: 5,', 'chFrom: 999,')   /* v32: ploča bez čekanja Nastavi i bez krčmarovih ponuda (Krčmar 2.0 testira pact2-test, kr-web-test, fuzz2) */   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
const E = new Function(src + '; return { createGame };')();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const plan = [{ t: 'challenge' }, { t: 'intro', title: 'x', sub: '' }];
  const g = E.createGame({ code: 'HT', cfg: { intro: 5, chal: ['sort'], howtoMax: 60, sort: 30 }, plan, flags: { ENABLE_SECRET_EVENTS: false } });
  g.addPlayer('a', 'Ana', 0, false); g.addPlayer('b', 'Bruno', 1, false); g.setBots(2); g.start();
  const G = g._G;
  ok(G.ph === 'howto', 'upute su prve');
  const v = g.view();
  ok(v.dur >= 60000, 'nema kratkog odbrojavanja (sigurnosna granica ' + v.dur / 1000 + ' s)');
  ok(v.P.filter((p) => p.b).every((p) => p.ok) && v.P.filter((p) => !p.b).every((p) => !p.ok), 'botovi su odmah potvrdili, ljudi još nisu');
  await sleep(300);
  ok(G.ph === 'howto', 'igra čeka (nakon 0,3 s i dalje upute)');
  ok(!g.setInput('a', { s: G.s, ok: 0 }), 'neispravna potvrda se odbija');
  ok(g.setInput('a', { s: G.s, ok: 1 }) && G.ph === 'howto', 'Ana potvrdi → i dalje čekamo Bruna');
  ok(!g.setInput('a', { s: G.s, ok: 1 }), 'dvostruka potvrda se ne broji');
  ok(g.view().P.find((p) => p.id === 'a').ok === 1, 'svi vide da je Ana spremna');
  g.setInput('b', { s: G.s, ok: 1 });
  ok(G.ph === 'sort', 'svi potvrdili → igra odmah kreće (' + G.ph + ')');
  g.stop();
  // samo botovi + jedan čovjek koji se odspojio: upute ne blokiraju igru
  const g2 = E.createGame({ code: 'H2', cfg: { chal: ['sort'], howtoMax: 0.3, sort: 30 }, plan, flags: { ENABLE_SECRET_EVENTS: false } });
  g2.addPlayer('a', 'Ana', 0, false); g2.setBots(2); g2.start();
  await sleep(500);
  ok(g2._G.ph === 'sort', 'ako netko ne potvrdi, nevidljiva sigurnosna granica pokreće igru');
  g2.stop();
  console.log(fails ? 'GREŠAKA: ' + fails : 'UPUTE OK'); process.exit(fails ? 1 : 0);
})();
