'use strict';
const fs = require('fs');
const dir = '/root/mozgalica';
const html = fs.readFileSync(dir + '/mozgalica.html', 'utf8');
const m = html.match(/\/\/#engine-start([\s\S]*?)\/\/#engine-end/);
const E = new Function(m[1] + '; return { createGame, rankOf, makeCode, QUESTIONS, CFG };')();

let fails = 0;
const ok = (c, msg) => { console.log((c ? '  ✔ ' : '  ✘ ') + msg); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const idxCorrect = (v) => {
  const src = E.QUESTIONS.find((x) => x.q === v.q.text);
  return v.q.options.indexOf(src.options[src.answer]);
};

(async () => {
  console.log('Banka pitanja');
  ok(E.QUESTIONS.length >= 40, E.QUESTIONS.length + ' pitanja u stranici');
  ok(/^[A-Z]{4}$/.test(E.makeCode()), 'kod sobe ima 4 slova');

  console.log('Lobby');
  let changes = 0;
  const game = E.createGame({ code: 'TEST', cfg: { qSeconds: 2, revealSeconds: 1, perGame: 3 }, onChange: () => changes++ });
  let peers = [{ pid: 'a1', name: 'Ana' }, { pid: 'm1', name: 'Marko' }, { pid: 'i1', name: 'Iva' }, { pid: 'x1', name: 'ana' }, { pid: 'e1', name: '   ' }];
  game.syncPeers(peers);
  let v = game.view();
  ok(v.players.length === 4, 'prazno ime odbijeno, 4 igrača u sobi');
  ok(v.players.find((p) => p.pid === 'x1').name === 'ana (2)', 'duplikat imena dobiva nastavak: ' + v.players[3].name);
  peers = peers.filter((p) => p.pid !== 'x1' && p.pid !== 'e1');
  game.syncPeers(peers);
  ok(game.view().players.length === 3, 'igrač koji izađe iz lobbyja nestaje s popisa');
  ok(changes > 0, 'onChange se poziva');
  const big = JSON.stringify(game.view()).length;
  ok(big < 4096, 'stanje stane u 4 KiB (' + big + ' B)');

  console.log('Pitanje 1: bodovanje i istek vremena');
  game.startGame();
  v = game.view();
  ok(v.phase === 'question' && v.q.options.length === 4 && v.q.index === 1, 'pitanje 1 počelo s 4 odgovora');
  ok(!JSON.stringify(v).includes('correct'), 'točan odgovor nije u stanju tijekom pitanja (nema varanja)');
  const ci = idxCorrect(v);
  ok(ci >= 0, 'točan odgovor pronađen u izmiješanim opcijama');
  peers = [
    { pid: 'a1', name: 'Ana', a: { q: 1, c: ci, t: 100 } },
    { pid: 'm1', name: 'Marko', a: { q: 1, c: (ci + 1) % 4, t: 300 } },
    { pid: 'i1', name: 'Iva' },
  ];
  game.syncPeers(peers);
  ok(game.view().answered === 2, 'vidljivo 2 od 3 odgovora');
  // pokušaj promjene odgovora i odgovor za krivo pitanje se ignoriraju
  game.syncPeers([{ pid: 'a1', name: 'Ana', a: { q: 1, c: (ci + 2) % 4, t: 50 } }, peers[1], { pid: 'i1', name: 'Iva', a: { q: 7, c: 0, t: 10 } }]);
  ok(game.view().answered === 2, 'promjena odgovora i odgovor za tuđe pitanje ignorirani');
  const t0 = Date.now();
  while (game.view().phase === 'question' && Date.now() - t0 < 4000) await sleep(25);
  v = game.view();
  ok(v.phase === 'reveal' && Date.now() - t0 > 1800, 'Iva nije odgovorila: kraj nakon isteka vremena (~' + (Date.now() - t0) + ' ms)');
  const by = (id) => v.players.find((p) => p.pid === id);
  ok(by('a1').gained >= 975 && by('a1').gained <= 1000, 'Ana točno i brzo: +' + by('a1').gained);
  ok(by('m1').gained === 0 && by('i1').gained === 0, 'netočno i bez odgovora: +0');
  ok(v.reveal.counts.reduce((a, b) => a + b, 0) === 2 && v.reveal.correct === ci, 'otkriven točan odgovor i brojači ' + v.reveal.counts);
  ok(by('m1').choice === (ci + 1) % 4, 'u fazi otkrivanja vidi se izbor igrača');

  console.log('Kasno pridruživanje i ponovno spajanje');
  game.syncPeers(peers.concat([{ pid: 'late', name: 'Kasno' }]));
  ok(!game.view().players.some((p) => p.pid === 'late'), 'igrač koji dođe usred igre se ne dodaje');
  game.syncPeers(peers.filter((p) => p.pid !== 'm1'));
  ok(game.view().players.find((p) => p.pid === 'm1').connected === false, 'odspojeni igrač je označen');
  game.syncPeers(peers);
  ok(game.view().players.find((p) => p.pid === 'm1').connected === true && game.view().players.find((p) => p.pid === 'm1').score === 0, 'vratio se s istim identitetom');

  console.log('Pitanja 2 i 3: rano završavanje');
  for (const n of [2, 3]) {
    const w0 = Date.now();
    while (!(game.view().phase === 'question' && game.view().q.index === n) && Date.now() - w0 < 3000) await sleep(25);
    v = game.view();
    ok(v.phase === 'question' && v.q.index === n, 'pitanje ' + n + ' je počelo');
    const c = idxCorrect(v);
    const tq = Date.now();
    game.syncPeers(peers.map((p) => ({ pid: p.pid, name: p.name, a: { q: n, c, t: 200 } })));
    ok(game.view().phase === 'reveal' && Date.now() - tq < 200, 'završilo odmah kad su svi odgovorili');
  }
  const w1 = Date.now();
  while (game.view().phase !== 'final' && Date.now() - w1 < 3000) await sleep(25);
  v = game.view();
  ok(v.phase === 'final', 'kraj igre nakon 3 pitanja');
  const r = E.rankOf(v.players);
  ok(r[0].pid === 'a1' && r[0].rank === 1, 'poredak: ' + r.map((x) => x.rank + '. ' + x.name + ' ' + x.score).join(', '));
  ok(r[0].score >= r[1].score && r[1].score >= r[2].score, 'poredak sortiran po bodovima');

  console.log('Nova igra');
  game.restart();
  v = game.view();
  ok(v.phase === 'lobby' && v.players.length === 3 && v.players.every((p) => p.score === 0), 'povratak u lobby, bodovi nula');
  game.stop();

  console.log('Demo s botovima');
  const demo = E.createGame({ code: 'DEMO', cfg: { qSeconds: 2, revealSeconds: 1, perGame: 2 }, onChange: () => {} });
  ['Ana', 'Marko'].forEach((n) => demo.addBot(n));
  demo.startGame();
  ok(demo.view().phase === 'question', 'demo kreće samo s botovima');
  const d0 = Date.now();
  while (demo.view().phase !== 'final' && Date.now() - d0 < 12000) await sleep(50);
  ok(demo.view().phase === 'final', 'botovi odigraju cijelu igru (~' + (Date.now() - d0) + ' ms)');
  ok(demo.view().players.some((p) => p.score > 0), 'botovi su osvojili bodove');
  demo.stop();

  console.log(fails ? '\n' + fails + ' PROVJERA NIJE PROŠLO ✘' : '\nSVE PROVJERE PROŠLE ✔');
  process.exit(fails ? 1 : 0);
})();
