const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const context = vm.createContext({ setTimeout, clearTimeout, console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8') + '\nthis.createGame = createGame;', context);
function resolve({ finale = false, throne = false, shield = false, random = () => 0.5 } = {}) {
  const game = context.createGame({ code: 'TEST', random });
  const ids = ['target', 'a', 'b', 'c', 'd'];
  for (let i = 0; i < ids.length; i++) game.addPlayer(ids[i], ids[i], i, false);
  Object.assign(game._G, { ph: 'power', s: 31, inFinale: finale, throne, endsAt: Date.now() + 12000 });
  for (const id of ids) game._p(id).offers = id === 'target' ? ['stit'] : ['led', 'sluz', 'grick', 'bomba'];
  for (const [i, id] of ids.slice(1).entries()) assert.equal(game.setInput(id, { s: 31, p: ['led','sluz','grick','bomba'][i], t: 'target' }), true);
  assert.equal(game.setInput('target', { s: 31, p: shield ? 'stit' : '' }), true);
  return game;
}
for (const [name, finale, throne] of [['ordinary', false, false], ['pyramid', true, false], ['throne', true, true]]) {
  test(`${name}: at most two attacks affect a player`, () => {
    const game = resolve({ finale, throne });
    try {
      const attacks = game._G.ev.filter(e => e.t === 'target');
      assert.equal(attacks.length, 4);
      assert.equal(game._p('target').fx.length, 2);
      assert.equal(attacks.filter(e => !e.b).length, 2);
      assert.equal(attacks.filter(e => e.b && e.cap).length, 2);
      assert.equal(game._p('target').sh, false);
    } finally { game.stop(); }
  });
  test(`${name}: shield blocks all attacks without invoking the limit`, () => {
    const game = resolve({ finale, throne, shield: true });
    try {
      const attacks = game._G.ev.filter(e => e.t === 'target');
      assert.equal(game._p('target').fx.length, 0);
      assert.equal(attacks.length, 4);
      assert.ok(attacks.every(e => e.b && !e.cap));
      assert.equal(game._p('target').sh, true);
    } finally { game.stop(); }
  });
}
test('attack selection does not always favour the same join order', () => {
  const low = resolve({ random: () => 0 }), high = resolve({ random: () => 0.999 });
  try {
    const succeeded = game => game._G.ev.filter(e => e.t === 'target' && !e.b).map(e => e.f).sort().join(',');
    assert.notEqual(succeeded(low), succeeded(high));
  } finally { low.stop(); high.stop(); }
});
