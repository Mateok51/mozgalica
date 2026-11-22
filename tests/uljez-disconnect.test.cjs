const { test } = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const source = require('./engine-source.cjs');
const options = { code: 'TEST', plan: [{ t: 'challenge' }, { t: 'intro', title: 'Runda 2', sub: '' }, { t: 'battle' }], cfg: { chal: ['uljez'] } };
const peers = Array.from({ length: 3 }, (_, i) => ({ pid: 'p' + i, name: 'Igrac' + i, av: i }));
function fixture() {
  let clock = 1000000, sequence = 0;
  const jobs = new Map();
  const context = vm.createContext({ crypto: require('node:crypto').webcrypto,
    Date: class extends Date { static now() { return clock; } },
    setTimeout(fn, ms) { const id = ++sequence; jobs.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout: id => jobs.delete(id) });
  vm.runInContext(source + ';this.recover=createRecoverableGame;', context);
  const create = saved => context.recover(options, saved);
  const game = create();
  for (const p of peers) game.addPlayer(p.pid, p.name, p.av, false);
  game.start();
  assert.equal(game.view().ph, 'howto'); assert.equal(game._G.ht.k, 'uljez');
  const advance = ms => {
    const until = clock + ms;
    for (;;) {
      const next = [...jobs].filter(([, task]) => task.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      jobs.delete(next[0]); clock = next[1].at; next[1].fn();
    }
    clock = until;
  };
  return { game, create, advance, remaining: () => game._G.endsAt - clock, jobs };
}
test('Uljez with everyone disconnected skips at the instruction deadline without points and resumes the next phase', () => {
  const f = fixture(), g = f.game;
  try {
    g.syncPeers([]);
    assert.doesNotThrow(() => f.advance(f.remaining()), 'The real instruction timer must not dereference an absent impostor');
    assert.equal(g.view().ph, 'intro'); assert.equal(g.view().ms > 0, true);
    assert.equal(f.jobs.size > 0, true, 'The room must retain a live transition timer');
    assert.equal(g._G.ul, undefined, 'A skipped challenge must not choose an impostor or score an absent player');
    assert.equal(g.view().P.length, 3); assert(g.view().P.every(p => !p.c && p.sc === 0));
    g.syncPeers(peers); f.advance(f.remaining());
    assert.equal(g.view().ph, 'vote'); assert(g.view().P.every(p => p.c && p.sc === 0));
  } finally { g.stop(); }
});
test('the zero-player deadline remains replayable with the same phase and a functioning next timer', () => {
  const f = fixture(), g = f.game; let restored;
  try {
    g.syncPeers([]); f.advance(f.remaining());
    const expected = JSON.stringify(g.view()), saved = JSON.parse(JSON.stringify(g.checkpoint()));
    assert.equal(typeof saved.events.at(-1).timer, 'number', 'Exercise replay of the actual deadline callback');
    g.stop(); restored = f.create(saved);
    assert.equal(JSON.stringify(restored.view()), expected);
    restored.syncPeers(peers);
    f.advance(restored.view().ms);
    assert.equal(restored.view().ph, 'vote'); assert.equal(restored.view().P.length, 3);
  } finally { g.stop(); if (restored) restored.stop(); }
});
test('one or two remaining players keep the existing Uljez flow and replay deterministically', () => {
  for (const remaining of [1, 2]) {
    const f = fixture(), g = f.game; let restored;
    try {
      g.syncPeers(peers.slice(0, remaining));
      for (const p of peers.slice(0, remaining)) g.setInput(p.pid, { s: g._G.s, ok: 1 });
      assert.equal(g.view().ph, 'uljez');
      assert(peers.slice(0, remaining).some(p => p.pid === g._G.ul.imp));
      const expected = JSON.stringify(g.view()), saved = JSON.parse(JSON.stringify(g.checkpoint()));
      g.stop(); restored = f.create(saved);
      assert.equal(JSON.stringify(restored.view()), expected);
    } finally { g.stop(); if (restored) restored.stop(); }
  }
});
