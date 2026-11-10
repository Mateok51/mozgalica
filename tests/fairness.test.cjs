const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const context = vm.createContext({ setTimeout, clearTimeout, console });
vm.runInContext(require('./engine-source.cjs') + '\nthis.createGame = createGame;', context);

// Pitanje s četiri igrača; "idle" nikad ne odgovara, pa faza ne završi dok mjerimo.
function question(ids = ['a', 'b', 'c', 'idle']) {
  const clock = { t: 1000000 };
  const g = context.createGame({ code: 'TEST', now: () => clock.t });
  ids.forEach((id, i) => g.addPlayer(id, id, i, false));
  Object.assign(g._G, { ph: 'question', s: 20, q: { c: 'Kviz', t: 'Pitanje', o: ['A', 'B', 'C', 'D'], a: 1 }, startedAt: clock.t, endsAt: clock.t + 20000, dur: 20000 });
  return { g, clock };
}

test('a reported answer time far earlier than the arrival is pulled into the grace window', () => {
  const { g, clock } = question();
  try {
    clock.t += 10000;                                   // odgovor stiže 10 s nakon početka pitanja
    assert.equal(g.setInput('a', { s: 20, c: 1, t: 0 }), true);       // tvrdi "0 ms"
    assert.equal(g._p('a').ansMs, 7000, 'at most 3 s earlier than the arrival');
    assert.equal(g.setInput('b', { s: 20, c: 1, t: 9400 }), true);    // pošten igrač, 600 ms kašnjenja
    assert.equal(g._p('b').ansMs, 9400, 'an honest time inside the window is kept exactly');
    assert.equal(g.setInput('c', { s: 20, c: 1, t: 999999 }), true);  // vrijeme iz budućnosti
    assert.equal(g._p('c').ansMs, 10000, 'never later than the arrival');
  } finally { g.stop(); }
});

test('early answers and missing or invalid times behave as before', () => {
  const { g, clock } = question();
  try {
    clock.t += 1200;
    assert.equal(g.setInput('a', { s: 20, c: 1, t: 300 }), true);
    assert.equal(g._p('a').ansMs, 300, 'inside the first 3 s the reported time is trusted');
    assert.equal(g.setInput('b', { s: 20, c: 1 }), true);
    assert.equal(g._p('b').ansMs, 1200, 'no reported time means the arrival time');
    assert.equal(g.setInput('c', { s: 20, c: 1, t: -500 }), true);
    assert.equal(g._p('c').ansMs, 0, 'negative times are clamped to zero');
  } finally { g.stop(); }
});

test('a faked instant answer no longer beats an honest faster player', () => {
  const { g, clock } = question();
  try {
    clock.t += 4000; g.setInput('a', { s: 20, c: 1, t: 3800 });       // pošten, 3,8 s
    clock.t += 8000; g.setInput('b', { s: 20, c: 1, t: 0 });          // vara nakon 12 s
    assert.ok(g._p('b').ansMs > g._p('a').ansMs, 'the cheater is ranked slower than the honest player');
  } finally { g.stop(); }
});

test('oversized or unserialisable input from a peer is ignored, normal input still works', () => {
  const { g } = question();
  try {
    const peers = (input) => ['a', 'b', 'c', 'idle'].map((id, i) => ({ pid: id, name: id, av: i, in: id === 'a' ? input : null }));
    g.syncPeers(peers({ s: 20, c: 1, pad: 'x'.repeat(5000) }));
    assert.equal(g._p('a').ans, -1, 'a 5 kB input is dropped');
    const loop = { s: 20, c: 1 }; loop.self = loop;
    assert.doesNotThrow(() => g.syncPeers(peers(loop)));
    assert.equal(g._p('a').ans, -1, 'a circular input is dropped without crashing the host');
    g.syncPeers(peers({ s: 20, c: 1, t: 0 }));
    assert.equal(g._p('a').ans, 1, 'a normal input is accepted afterwards');
  } finally { g.stop(); }
});

test('the largest inputs the client really sends stay well under the size limit', () => {
  // Oblici iz app.js (sendInput): odgovor s vremenom, nizovi za razvrstavanje/parove/poredak/munjeviti krug, cilj moći (id do 40 znakova).
  const pid = 'p'.repeat(40);
  const biggest = [
    { s: 9999, c: 3, t: 20000 },
    { s: 9999, r: Array.from({ length: 24 }, () => 1), f: 1 },
    { s: 9999, r: Array.from({ length: 12 }, (_, i) => i) },
    { s: 9999, p: 'oklada', t: pid },
    { s: 9999, v: [pid, pid] },
    { s: 9999, v: 3, pp: 1 },
  ];
  for (const input of biggest) assert.ok(JSON.stringify(input).length < 400, JSON.stringify(input).length + ' chars: ' + JSON.stringify(input).slice(0, 40));
});
