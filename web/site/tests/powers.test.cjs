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

test('each multiplayer power offer provides both attack and personal choice', () => {
  for (const [finale, throne] of [[false, false], [true, false], [true, true]]) {
    for (const random of [() => 0, () => 0.25, () => 0.5, () => 0.999]) {
      const g = context.createGame({ code: 'TEST', random });
      try {
        g.addPlayer('one', 'Ana', 0, false); g.addPlayer('two', 'Ivo', 1, false);
        Object.assign(g._G, { ph: 'bet', s: 10, bdone: 1, inFinale: finale, throne, endsAt: Date.now() + 10000 });
        for (const id of ['one', 'two']) assert.equal(g.setInput(id, { s: 10, b: 0 }), true);
        for (const id of ['one', 'two']) {
          const offers = Array.from(g._p(id).offers);
          assert.equal(offers.length, 3);
          assert.equal(new Set(offers).size, 3);
          assert.ok(offers.some(k => ['led', 'sluz', 'grick', 'bomba'].includes(k)));
          assert.ok(offers.some(k => !['led', 'sluz', 'grick', 'bomba'].includes(k)));
          if (finale) assert.ok(!offers.includes('utjeha'));
        }
      } finally { g.stop(); }
    }
  }
});

test('consolation rewards only a submitted wrong answer and does not turn it correct', () => {
  const g = context.createGame({ code: 'TEST' });
  try {
    for (const [i, id] of ['wrong', 'right', 'silent', 'bettor'].entries()) g.addPlayer(id, id, i, false);
    Object.assign(g._G, { ph: 'question', s: 20, q: { c: 'Kviz', t: 'Pitanje', o: ['A', 'B', 'C', 'D'], a: 1 }, startedAt: Date.now(), endsAt: Date.now() + 20000, dur: 20000 });
    for (const id of ['wrong', 'right', 'silent']) g._p(id).uc = true;
    g._p('bettor').okl = 'wrong';
    g._p('silent').done = true; // simulira istek bez predanog odgovora
    assert.equal(g.view().P.find(p => p.id === 'wrong').uc, 1);
    assert.equal(g.view().P.find(p => p.id === 'wrong').ub, undefined);
    assert.equal(g.setInput('wrong', { s: 20, c: 0, t: 1000 }), true);
    assert.equal(g.setInput('right', { s: 20, c: 1, t: 1000 }), true);
    assert.equal(g.setInput('bettor', { s: 20, c: 1, t: 1000 }), true);
    const byId = id => g.view().P.find(p => p.id === id);
    assert.equal(g._G.ph, 'reveal');
    assert.equal(byId('wrong').g, 0); assert.equal(byId('wrong').ub, 250); assert.equal(byId('wrong').sc, 250);
    assert.equal(byId('right').ub, undefined); assert.ok(byId('right').g > 0);
    assert.equal(byId('silent').ub, undefined); assert.equal(byId('silent').sc, 0);
    assert.equal(g._p('bettor').ob, 0); assert.equal(g._p('bettor').oq, -1);
    assert.equal(g.view().P.find(p => p.id === 'wrong').uc, undefined);
    g._G.ph = 'final'; g.restart(); assert.equal(g._p('wrong').uc, false); assert.equal(g._p('wrong').ub, 0);
  } finally { g.stop(); }
});

test('power selection handles solo play and previous offer exclusions', () => {
  const g = context.createGame({ code: 'TEST', random: () => 0.999 });
  try {
    g.addPlayer('one', 'Ana', 0, false);
    Object.assign(g._G, { ph: 'bet', s: 10, bdone: 1, endsAt: Date.now() + 10000 });
    Object.assign(g._p('one'), { offers: ['oklada'], lastPw: 'dupli' });
    assert.equal(g.setInput('one', { s: 10, b: 0 }), true);
    const offers = Array.from(g._p('one').offers);
    assert.equal(offers.length, 3); assert.equal(new Set(offers).size, 3);
    assert.ok(offers.every(k => !['led', 'sluz', 'grick', 'bomba', 'oklada'].includes(k)));
    assert.ok(!offers.includes('dupli'));
  } finally { g.stop(); }
});
