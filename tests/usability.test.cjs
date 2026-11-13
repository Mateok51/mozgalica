const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const context = vm.createContext({ console, setTimeout, clearTimeout, crypto: require('node:crypto').webcrypto });
vm.runInContext(require('./engine-source.cjs') + '\nthis.createGame=createGame; this.recover=createRecoverableGame;', context);

function session(kind, options = {}) {
  let clock = 1000000, seq = 0;
  const pending = new Map();
  const game = context.createGame({ code: 'TEST', plan: [{ t: 'challenge' }, { t: 'challenge' }],
    cfg: { chal: [kind, kind] }, now: () => clock,
    schedule(fn, ms) { const id = ++seq; pending.set(id, { fn, at: clock + ms }); return id; },
    cancel(id) { pending.delete(id); }, ...options });
  game.addPlayer('one', 'Ana', 0, false);
  game.addPlayer('two', 'Ivo', 1, !!options.secondBot);
  const input = (id, values) => game.setInput(id, { s: game._G.s, ...values });
  const advance = (ms) => {
    const until = clock + ms;
    for (;;) {
      const next = [...pending].filter(([, v]) => v.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      pending.delete(next[0]); clock = next[1].at; next[1].fn();
    }
    clock = until;
  };
  const ready = () => { input('one', { ok: 1 }); input('two', { ok: 1 }); };
  game.start();
  return { game, input, advance, ready, timeout() { advance(Math.max(0, game._G.endsAt - clock) + 400); } };
}

for (const [kind, field, gain] of [['sort', 'sortA', 150], ['link', 'linkA', 200], ['order', 'ordA', 150]]) {
  test(`${kind}: timeout scores saved partial work without treating it as a final submission`, () => {
    const s = session(kind);
    try {
      s.ready(); assert.equal(s.game.view().ph, kind);
      const model = kind === 'sort' ? s.game._G.so : kind === 'link' ? s.game._G.li : s.game._G.or;
      const partial = model.key.map((x, i) => i < 2 ? x : -1);
      assert.equal(s.input('one', { r: partial, p: 1 }), true);
      assert.equal(s.game._p('one').done, false);
      assert.deepEqual(Array.from(s.game._p('one')[field]), Array.from(partial));
      // A stale phase message must not replace the saved draft.
      assert.equal(s.game.setInput('one', { s: s.game._G.s - 1, r: partial.map(() => -1), p: 1 }), false);
      s.timeout();
      assert.equal(s.game.view().ph, kind + 'Reveal');
      assert.equal(s.game._p('one').gained, gain * 2);
      assert.equal(s.game._p('two').gained, 0);
    } finally { s.game.stop(); }
  });
}

test('hilo: correct prefix survives timeout and does not prematurely finish the round', () => {
  const s = session('hilo');
  try {
    s.ready();
    const prefix = s.game._G.hl.list.slice(0, 3).map(x => x.w);
    assert.equal(s.input('one', { r: prefix, p: 1 }), true);
    assert.equal(s.game._p('one').done, false);
    assert.equal(s.game.view().ph, 'hilo');
    s.timeout();
    assert.equal(s.game._p('one').gained, 360);
    assert.equal(s.game._p('two').gained, 0);
  } finally { s.game.stop(); }
});

test('saved draft edits replace previous choices, including removing an answer', () => {
  const s = session('link');
  try {
    s.ready(); const key = Array.from(s.game._G.li.key);
    assert.equal(s.input('one', { r: key, p: 1 }), true);
    const undone = key.map((x, i) => i === 0 ? x : -1);
    assert.equal(s.input('one', { r: undone, p: 1 }), true);
    s.timeout();
    assert.equal(s.game._p('one').gained, 200);
  } finally { s.game.stop(); }
});

test('partial submission can be confirmed early and cannot be edited after confirmation', () => {
  const s = session('sort');
  try {
    s.ready(); const key = Array.from(s.game._G.so.key);
    const partial = key.map((x, i) => i === 0 ? x : -1);
    assert.equal(s.input('one', { r: partial }), true);
    assert.equal(s.game._p('one').done, true);
    assert.equal(s.input('one', { r: key, p: 1 }), false);
    assert.equal(s.input('two', { r: key }), true);
    assert.equal(s.game.view().ph, 'sortReveal');
    assert.equal(s.game._p('one').gained, 150);
  } finally { s.game.stop(); }
});

for (const [kind, field] of [['sort', 'so'], ['link', 'li'], ['order', 'or']]) {
  test(`${kind}: invalid drafts cannot erase a valid saved answer`, () => {
    const s = session(kind);
    try {
      s.ready(); const key = Array.from(s.game._G[field].key);
      assert.equal(s.input('one', { r: key, p: 1 }), true);
      for (const r of [null, [], key.map(() => -2), key.map(() => 999), key.map(() => '0')]) {
        assert.equal(s.input('one', { r, p: 1 }), false);
      }
      s.timeout(); assert.ok(s.game._p('one').gained > 0);
    } finally { s.game.stop(); }
  });
}

test('first mini-game occurrence gives additional time, later occurrence returns to normal duration', () => {
  for (const [kind, first, normal] of [['sort', 50, 40], ['link', 50, 40], ['order', 30, 25], ['hilo', 60, 45]]) {
    const s = session(kind);
    try {
      s.ready(); assert.equal(s.game.view().dur, first * 1000, kind);
      s.timeout(); s.game.skip();
      assert.equal(s.game.view().ph, 'howto'); s.ready();
      assert.equal(s.game.view().dur, normal * 1000, kind);
    } finally { s.game.stop(); }
  }
});

test('pyramid introduction waits for both humans before starting its first power decision', () => {
  const s = session('sort', { plan: [{ t: 'finale' }] });
  try {
    assert.equal(s.game.view().ph, 'fstart');
    s.advance(12000); assert.equal(s.game.view().ph, 'fstart');
    assert.equal(s.input('one', { ok: 1 }), true);
    assert.equal(s.game.view().ph, 'fstart');
    assert.equal(s.input('two', { ok: 1 }), true);
    assert.equal(s.game.view().ph, 'power');
    assert.ok(s.game.view().dur >= 18000);
  } finally { s.game.stop(); }
});

test('ordinary and crown questions include answer text when allocating reading time', () => {
  const data = vm.runInContext('JSON.parse(JSON.stringify(DATA))', context);
  data.cats = { Test: [{ q: 'Koji je pravi odgovor?', o: [
    'jedan dva tri četiri pet šest sedam osam',
    'devet deset jedanaest dvanaest trinaest četrnaest petnaest šesnaest',
    'sedamnaest osamnaest devetnaest dvadeset još nekoliko dugih ponuđenih',
    'odgovor koji također zahtijeva vremena za pažljivo čitanje'
  ], a: 0 }] };
  for (const crown of [false, true]) {
    const s = session('sort', { data, plan: [{ t: crown ? 'finale' : 'battle' }],
      cfg: { cast: 0, betEvents: [0, 0], qv: { who: 0, emoji: 0 }, sgd: { on: false } } });
    try {
      if (crown) {
        s.ready();
        s.game._p('one').fu = 999;
        s.input('one', { p: '' }); s.input('two', { p: '' });
        assert.equal(s.game._G.q.crown, 1);
        assert.equal(s.game.view().ph, 'fq');
      } else {
        s.input('one', { v: 0 }); s.input('two', { v: 0 });
        s.game.skip();
        assert.equal(s.game.view().ph, 'question');
      }
      assert.equal(s.game.view().dur, 26000);
    } finally { s.game.stop(); }
  }
});

test('the first ordinary power choice is longer while later choices return to the base time', () => {
  const s = session('sort');
  try {
    for (const [round, expected] of [[1, 25000], [2, 18000]]) {
      Object.assign(s.game._G, { ph: 'bet', s: s.game._G.s + 1, bdone: round, inFinale: false });
      for (const id of ['one', 'two']) s.game._p(id).done = false;
      s.input('one', { b: 0 }); s.input('two', { b: 0 });
      assert.equal(s.game.view().ph, 'power');
      assert.equal(s.game.view().dur, expected);
    }
  } finally { s.game.stop(); }
});

test('a human can start the pyramid after reading without waiting for an automated player', () => {
  const s = session('sort', { plan: [{ t: 'finale' }], secondBot: true });
  try {
    assert.equal(s.game.view().ph, 'fstart');
    assert.equal(s.game._p('two').done, true);
    assert.equal(s.game._p('one').done, false);
    assert.equal(s.input('one', { ok: 1 }), true);
    assert.equal(s.game.view().ph, 'power');
  } finally { s.game.stop(); }
});

test('throne introduction also waits for the human, then advances with a ready bot', () => {
  const s = session('sort', { plan: undefined, end: 'throne', secondBot: true });
  try {
    // Move the fixture to the last entry of the real generated plan, retaining
    // normal finale routing rather than the fixed-plan test override.
    assert.equal(s.game.view().ph, 'intro');
    s.game._G.pi = s.game._plan().length - 2;
    s.game.skip();
    assert.equal(s.game.view().ph, 'tstart');
    assert.equal(s.game.view().readyIntro, true);
    assert.equal(s.game._p('two').done, true);
    s.advance(12000);
    assert.equal(s.game.view().ph, 'tstart');
    assert.equal(s.input('one', { ok: 1 }), true);
    assert.notEqual(s.game.view().ph, 'tstart');
  } finally { s.game.stop(); }
});

for (const [kind, model, field] of [['sort', 'so', 'sortA'], ['link', 'li', 'linkA'], ['order', 'or', 'ordA'], ['hilo', 'hl', 'hlA']]) {
  test(`${kind}: journal recovery preserves the latest unconfirmed answers`, () => {
    const options = { code: 'TEST', plan: [{ t: 'challenge' }], cfg: { chal: [kind] } };
    const game = context.recover(options);
    let restored;
    try {
      game.addPlayer('one', 'Ana', 0, false); game.addPlayer('two', 'Ivo', 1, false);
      game.start();
      for (const id of ['one', 'two']) game.setInput(id, { s: game._G.s, ok: 1 });
      const key = kind === 'hilo' ? game._G.hl.list.map(x => x.w) : game._G[model].key;
      const draft = kind === 'hilo' ? Array.from(key.slice(0, 2)) : Array.from(key, (x, i) => i < 2 ? x : -1);
      game.setInput('one', { s: game._G.s, r: draft, p: 1 });
      restored = context.recover(options, JSON.parse(JSON.stringify(game.checkpoint())));
      assert.equal(restored.view().ph, kind);
      assert.equal(restored._p('one').done, false);
      assert.deepEqual(Array.from(restored._p('one')[field]), draft);
      assert.equal(restored.view().dur, game.view().dur);
      assert.equal(restored.setInput('one', { s: restored._G.s, r: draft }), true);
      assert.equal(restored.setInput('two', { s: restored._G.s, r: Array.from(key) }), true);
      assert.equal(restored.view().ph, kind + 'Reveal');
      assert.equal(restored._p('one').cnt, 2);
    } finally { game.stop(); if (restored) restored.stop(); }
  });
}
