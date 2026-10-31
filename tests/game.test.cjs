const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const engine = require('./engine-source.cjs');
const context = vm.createContext({ setTimeout, clearTimeout, console });
vm.runInContext(engine + '\nthis.createGame = createGame;', context);

test('lobby removes disconnected players and permits them to rejoin', () => {
  const game = context.createGame({ code: 'TEST' });
  try {
    game.syncPeers([{ pid: 'one', name: 'Ana', av: 0 }, { pid: 'two', name: 'Ivo', av: 1 }]);
    assert.equal(game.view().P.length, 2);
    game.syncPeers([{ pid: 'one', name: 'Ana', av: 0 }]);
    assert.equal(game.view().P.length, 1);
    game.syncPeers([{ pid: 'one', name: 'Ana', av: 0 }, { pid: 'two', name: 'Ivo', av: 1 }]);
    assert.equal(game.view().P.length, 2);
  } finally { game.stop(); }
});

test('inputs from unknown players or wrong phases are rejected', () => {
  const game = context.createGame({ code: 'TEST' });
  try {
    game.addPlayer('one', 'Ana', 0, false);
    assert.equal(game.setInput('unknown', { s: 0, v: 0 }), false);
    assert.equal(game.setInput('one', { s: 0, v: 0 }), false);
    assert.equal(game.view().ph, 'lobby');
  } finally { game.stop(); }
});

test('starting requires a player and advances out of the lobby', () => {
  const game = context.createGame({ code: 'TEST' });
  try {
    game.start();
    assert.equal(game.view().ph, 'lobby');
    game.addPlayer('one', 'Ana', 0, false);
    game.start();
    assert.notEqual(game.view().ph, 'lobby');
  } finally { game.stop(); }
});

test('the correct answer is hidden until the reveal', () => {
  const game = context.createGame({ code: 'TEST' });
  try {
    game.addPlayer('one', 'Ana', 0, false);
    game._G.q = { c: 'Kviz', t: 'Pitanje?', o: ['A', 'B'], a: 1 };
    game._G.ph = 'question';
    assert.equal(game.view().cor, undefined);
    assert.equal(game.view().q.a, undefined);
    game._G.ph = 'reveal';
    assert.equal(game.view().cor, 1);
  } finally { game.stop(); }
});

test('answer resent on reconnect is accepted only for the current question', () => {
  const game = context.createGame({ code: 'TEST' });
  try {
    const ana = { pid: 'one', name: 'Ana', av: 0 };
    const ivo = { pid: 'two', name: 'Ivo', av: 1 };
    game.syncPeers([ana, ivo]);
    game._G.ph = 'question';
    game._G.s = 10;
    game._G.q = { c: 'Kviz', t: 'Pitanje?', o: ['A', 'B'], a: 1 };
    game._G.startedAt = Date.now();
    game.syncPeers([ivo]);
    game.syncPeers([ivo, { ...ana, in: { s: 9, c: 1 } }]);
    assert.equal(game._p('one').ans, -1);
    game.syncPeers([ivo, { ...ana, in: { s: 10, c: 1 } }]);
    assert.equal(game._p('one').ans, 1);
  } finally { game.stop(); }
});

test('replayed answer does not change an already accepted answer', () => {
  const game = context.createGame({ code: 'TEST' });
  try {
    const ana = { pid: 'one', name: 'Ana', av: 0 };
    const ivo = { pid: 'two', name: 'Ivo', av: 1 };
    game.syncPeers([ana, ivo]);
    game._G.ph = 'question'; game._G.s = 10;
    game._G.q = { c: 'Kviz', t: 'Pitanje?', o: ['A', 'B'], a: 1 };
    game._G.startedAt = Date.now();
    game.syncPeers([ivo, { ...ana, in: { s: 10, c: 1 } }]);
    game.syncPeers([ivo]);
    game.syncPeers([ivo, { ...ana, in: { s: 10, c: 0 } }]);
    assert.equal(game._p('one').ans, 1);
  } finally { game.stop(); }
});
