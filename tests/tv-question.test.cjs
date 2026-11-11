const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const context = vm.createContext({ setTimeout, clearTimeout, console });
vm.runInContext(require('./engine-source.cjs') + '\nthis.createGame = createGame;', context);
const make = (opts) => { const g = context.createGame(Object.assign({ code: 'TEST' }, opts)); g.addPlayer('a', 'Ana', 0, false); g.addPlayer('b', 'Ivo', 1, false); return g; };

test('a TV-hosted game shows the question only on the TV by default, and the host can turn that off', () => {
  const g = make({});
  try {
    assert.equal(g.view().tvq, 1); assert.equal(g.view().opt.tvq, 1);
    g.setOpt('tvq', false);
    assert.equal(g.view().tvq, undefined); assert.equal(g.view().opt.tvq, 0);
    g.setOpt('tvq', true);
    assert.equal(g.view().tvq, 1);
  } finally { g.stop(); }
});

test('a phone-hosted game never has the TV-only question, whatever is requested', () => {
  for (const opts of [{ noTv: true }, { noTv: true, tvq: true }]) {
    const g = make(opts);
    try {
      assert.equal(g.view().tvq, undefined); assert.equal(g.view().opt.tvq, -1, 'the option is not offered');
      g.setOpt('tvq', true);
      assert.equal(g.view().tvq, undefined, 'setOpt is ignored without a TV');
    } finally { g.stop(); }
  }
});

test('the setting cannot change once the game has left the lobby, and players have no input that changes it', () => {
  const g = make({});
  try {
    Object.assign(g._G, { ph: 'question', s: 20, q: { c: 'Kviz', t: 'Pitanje', o: ['A', 'B', 'C', 'D'], a: 1 }, startedAt: Date.now(), endsAt: Date.now() + 20000, dur: 20000 });
    g.setOpt('tvq', false);
    assert.equal(g.view().tvq, 1, 'unchanged outside the lobby');
    g.syncPeers([{ pid: 'a', name: 'Ana', av: 0, in: { s: 20, tvq: 0, opt: { tvq: 0 } } }, { pid: 'b', name: 'Ivo', av: 1, in: null }]);
    assert.equal(g.view().tvq, 1, 'a player message cannot switch it');
  } finally { g.stop(); }
});
