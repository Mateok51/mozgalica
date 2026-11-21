// Real engine/private-state and client hydration code, with no browser lifecycle
// claims: a separate browser suite covers a discarded/reloaded Safari tab.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const plain = value => JSON.parse(JSON.stringify(value));
const engine = vm.createContext({ setTimeout, clearTimeout, console });
vm.runInContext(require('./engine-source.cjs') + '\nthis.createGame=createGame;', engine);
const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const begin = app.indexOf('  function restorePartialProgress(d) {');
const end = app.indexOf('  function phoneSig(d) {', begin);
assert.ok(begin >= 0 && end > begin, 'Use the production progress hydrator');
const restoreSource = app.slice(begin, end);

const cases = [
  { ph: 'sort', field: 'sortA', local: 'sortP', a: [1, -1, 0, -1], b: [0, 1, -1, -1],
    state: { so: { a: 'A', b: 'B', items: ['one', 'two', 'three', 'four'], key: [0, 1, 1, 0] } } },
  { ph: 'link', field: 'linkA', local: 'linkP', a: [2, -1, 0], b: [1, 2, -1],
    state: { li: { t: 'Pairs', L: ['A', 'B', 'C'], R: ['X', 'Y', 'Z'], key: [1, 0, 2] } } },
  { ph: 'order', field: 'ordA', local: 'ord', a: [1, -1, 0, -1], b: [-1, 0, -1, 1],
    state: { or: { t: 'Order', lo: 'first', hi: 'last', items: ['A', 'B', 'C', 'D'], key: [3, 2, 1, 0] } } },
  { ph: 'hilo', field: 'hlA', local: 'hl', a: [1, 0], b: [0],
    state: { hl: { list: [{ a: ['low', 'high'], w: 1 }, { a: ['low', 'high'], w: 0 }, { a: ['low', 'high'], w: 1 }] } } },
  { ph: 'blitz', field: 'bzA', local: 'bz', a: [1, 0], b: [0],
    state: { bz: { list: [['one', 1], ['two', 1], ['three', 0]] } } },
  { ph: 'rope', field: 'rpA', local: 'rp', a: [1, 0], b: [0],
    state: { du: { a: 'A', b: 'B', rope: 1 }, rp: { pa: 0, pb: 0, list: [['one', 1], ['two', 0], ['three', 1]] } } },
];

function gameFor(c) {
  const g = engine.createGame({ code: 'TEST', now: () => 1000000 });
  ['A', 'B', 'idle'].forEach((id, i) => g.addPlayer(id, id, i, false));
  Object.assign(g._G, plain(c.state), { ph: c.ph, s: 42, startedAt: 1000000, endsAt: 1020000, dur: 20000 });
  return g;
}

function client(d, pv, local = { s: d.s, sent: null }) {
  const context = vm.createContext({ PV: pv, L: local });
  vm.runInContext(restoreSource + '\nthis.restore=restorePartialProgress;', context);
  context.restore(d);
  return context;
}

for (const c of cases) {
  test(c.ph + ': accepted progress is private to each player and every snapshot is detached', () => {
    const g = gameFor(c);
    try {
      assert.equal(g.setInput('A', { s: 42, r: c.a.slice(), p: 1 }), true);
      assert.equal(g.setInput('B', { s: 42, r: c.b.slice(), p: 1 }), true);
      const publicState = plain(g.view());
      assert.equal('progress' in publicState, false, 'Public state has no recovery payload');
      for (const p of publicState.P) {
        for (const key of ['r', 'in', 'progress', ...cases.map(x => x.field)]) {
          assert.equal(key in p, false, 'Public roster does not expose ' + key);
        }
      }
      const a = g.priv('A'), b = g.priv('B');
      assert.deepEqual(plain(a.progress), { s: 42, ph: c.ph, r: c.a });
      assert.deepEqual(plain(b.progress), { s: 42, ph: c.ph, r: c.b });
      assert.ok(!g.priv('idle')?.progress && !g.priv('unknown')?.progress, 'No fabricated progress for another identity');
      a.progress.r[0] = 999;
      a.progress.r.push(999);
      a.progress.s = -1;
      assert.deepEqual(plain(g._p('A')[c.field]), c.a, 'A snapshot cannot mutate accepted server input');
      assert.deepEqual(plain(b.progress.r), c.b, 'A mutation cannot affect B');
      assert.deepEqual(plain(g.priv('A').progress), { s: 42, ph: c.ph, r: c.a }, 'Next private snapshot is fresh');
    } finally { g.stop(); }
  });

  test(c.ph + ': a fresh client resumes accepted choices at the next unanswered item', () => {
    const g = gameFor(c);
    try {
      g.setInput('A', { s: 42, r: c.a.slice(), p: 1 });
      const d = plain(g.view()), pv = plain(g.priv('A'));
      const { L } = client(d, pv);
      assert.equal(L.progressRestored, true);
      assert.equal(L.sent, null, 'Partial recovery must allow continued play');
      if (c.ph === 'order') assert.deepEqual(plain(L.ord), [2, 0], 'Ranks become the existing click-order UI representation');
      else if (['sort', 'link'].includes(c.ph)) assert.deepEqual(plain(L[c.local]), c.a);
      else {
        assert.equal(L[c.local].i, c.a.length);
        assert.deepEqual(plain(L[c.local].r), c.a);
        assert.equal(L[c.local].fb, '', 'Do not replay old answer animations');
        if (c.ph === 'blitz') { assert.equal(L.bz.ok, 1); assert.equal(L.bz.bad, 1); }
      }
      const localAnswers = ['sort', 'link', 'order'].includes(c.ph) ? L[c.local] : L[c.local].r;
      localAnswers[0] = 999;
      assert.deepEqual(pv.progress.r, c.a, 'Hydrated UI input has no alias to its private snapshot');
    } finally { g.stop(); }
  });

  test(c.ph + ': late same-step recovery never rolls back new local choices or a sent answer', () => {
    const g = gameFor(c);
    try {
      const d = plain(g.view()), pv = { progress: { s: 42, ph: c.ph, r: c.a.slice() } };
      for (const guard of [{ partial: { s: 42, r: c.b.slice(), p: 1 } }, { sent: { s: 42, r: c.b.slice() } }, { progressRestored: true }]) {
        const local = Object.assign({ s: 42, sent: null, [c.local]: { sentinel: 'new local input' } }, guard);
        const before = plain(local);
        assert.deepEqual(plain(client(d, pv, local).L), before, 'Same-step local input stays authoritative');
      }
    } finally { g.stop(); }
  });
}

test('stale step/phase, wrong local step, and malformed progress never hydrate the current game', () => {
  for (const c of cases) {
    const g = gameFor(c);
    try {
      const d = plain(g.view()), base = { s: 42, ph: c.ph, r: c.a.slice() };
      const invalid = [null, {}, { ...base, s: 41 }, { ...base, ph: 'question' }, { ...base, r: null }, { ...base, r: '1,0' }, { ...base, r: [999] }, { ...base, r: c.a.map(() => null) }];
      for (const progress of invalid) {
        const context = client(d, { progress });
        assert.deepEqual(plain(context.L), { s: 42, sent: null }, c.ph + ': ignore invalid/stale payload');
      }
      assert.deepEqual(plain(client(d, { progress: base }, { s: 41, sent: null }).L), { s: 41, sent: null });
    } finally { g.stop(); }
  }
});

test('noncontiguous or duplicate ordering ranks and overlong answer sequences are rejected', () => {
  for (const [ph, sequences] of [['order', [[0, 0, -1, -1], [2, -1, -1, -1], [1, 2, -1, -1]]], ['hilo', [[1, 0, 1, 0]]], ['blitz', [[1, 0, 1, 0]]], ['rope', [[1, 0, 1, 0]]]]) {
    const c = cases.find(x => x.ph === ph), g = gameFor(c);
    try {
      const d = plain(g.view());
      for (const r of sequences) assert.equal(client(d, { progress: { s: 42, ph, r } }).L.progressRestored, undefined, ph);
    } finally { g.stop(); }
  }
});
