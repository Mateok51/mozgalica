// Actual UI handler, app send adapter, server payload sanitizer and engine.
// Delayed delivery is controlled here; this is not a physical iPhone result.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const engine = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.make=createGame;', engine);
function capturedAcceptance(kind = 'krPact', replaceView = false) {
  const attribute = { krPact: 'krp', krOff: 'kro', krCh: 'krc' }[kind];
  const packets = [], button = { dataset: { [attribute]: '1' } };
  const context = vm.createContext({
    PID: 'ana', L: { s: 10 }, S: { s: 10, ph: 'reveal', lc: { id: 301 } }, PV: { kp: { id: 101, m: 'boris', x: 'Boris' }, ko: { id: 201 } },
    document: { querySelectorAll: selector => selector === '#app [data-' + attribute + ']' ? [button] : [] },
    AUDIO: { play() {} }, bind() {}, isLocalHost: () => false,
    netSend: value => packets.push(JSON.parse(JSON.stringify(value))),
  });
  const sender = app.slice(app.indexOf('  function pactSend('), app.indexOf('  function chooseAvatar('));
  const binder = kind === 'krCh'
    ? app.slice(app.indexOf('  function bindRope('), app.indexOf('  // broj spremnih', app.indexOf('  function bindRope(')))
    : app.slice(app.indexOf('  function bindKr('), app.indexOf('  // ----- izazov vođi:', app.indexOf('  function bindKr(')));
  vm.runInContext(sender + '\nconst krSend = a => pactSend(a);\n' + binder + '\n' + (kind === 'krCh' ? 'bindRope(S);' : 'bindKr(S);'), context);
  if (replaceView) { context.PV = { kp: { id: 102 }, ko: { id: 202 } }; context.S = { s: 20, ph: 'reveal', lc: { id: 302 } }; }
  button.onclick();
  assert.equal(packets.length, 1);
  assert.equal(packets[0].t, 'pa');
  return packets[0].a;
}
test('a delayed acceptance for an expired pact cannot accept a later offer from another partner', async () => {
  const { gamePayload } = await import('../server/policy.mjs');
  const game = engine.make({ code: 'ABCD', noTv: true });
  try {
    for (const [id, name] of [['ana', 'Ana'], ['boris', 'Boris'], ['cedo', 'Čedo']]) game.addPlayer(id, name, 0, false, false);
    Object.assign(game._G, { ph: 'reveal', s: 10, kp: { id: 101, a: 'ana', b: 'boris', st: 'o', ans: {} } });
    const held = gamePayload(capturedAcceptance(), true);
    assert(held && held.k === 'krPact' && held.yes, 'Capture the real acceptance sent for Ana/Boris');
    Object.assign(game._G, { ph: 'vote', s: 11, kp: null });
    assert.equal(game.pactAction('ana', held), false, 'The original offer is legitimately closed outside its reveal window');
    Object.assign(game._G, { ph: 'reveal', s: 20, kp: { id: 102, a: 'ana', b: 'cedo', st: 'o', ans: {} } });
    const accepted = game.pactAction('ana', held);
    assert.equal(accepted, false, 'A packet accepting Boris must not silently accept the later Čedo offer; payload=' + JSON.stringify(held));
    assert.equal(game._G.kp.ans.ana, undefined, 'The later offer must remain undecided');
  } finally { game.stop(); }
});
function offeredGame(kind) {
  const game = engine.make({ code: 'ABCD', noTv: true });
  for (const [id, name] of [['ana', 'Ana'], ['boris', 'Boris']]) game.addPlayer(id, name, 0, false, false);
  Object.assign(game._G, { ph: 'reveal', s: 10 });
  if (kind === 'krPact') game._G.kp = { id: 101, a: 'ana', b: 'boris', st: 'o', ans: {} };
  if (kind === 'krOff') game._p('ana').ko = { id: 201, k: 'task', st: 'o', kind: 'st3', line: 'Tri točna', win: 300, loss: 100 };
  if (kind === 'krCh') game._G.lc = { id: 301, a: 'ana', b: 'boris', st: 'o' };
  return game;
}
for (const [kind, id] of [['krPact', 101], ['krOff', 201], ['krCh', 301]]) {
  test(kind + ' binds the original displayed offer ID even if the global view changes', async () => {
    const { gamePayload } = await import('../server/policy.mjs');
    const sent = gamePayload(capturedAcceptance(kind, true), true);
    assert.deepEqual(sent, { k: kind, yes: true, id }, 'The sent ID must describe the rendered offer rather than its later replacement');
  });
  test(kind + ' rejects stale/invalid IDs, accepts the matching ID once, and keeps the legacy no-ID contract', () => {
    const game = offeredGame(kind);
    try {
      for (const bad of [id - 1, null, 'wrong', 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.equal(game.pactAction('ana', { k: kind, yes: true, id: bad }), false, 'Invalid or stale ID=' + String(bad));
      assert.equal(game.pactAction('ana', { k: kind, yes: true, id }), true, 'A timely decision for the current offer must work');
      assert.equal(game.pactAction('ana', { k: kind, yes: true, id }), false, 'A duplicate decision cannot apply twice');
    } finally { game.stop(); }
    const legacy = offeredGame(kind);
    try { assert.equal(legacy.pactAction('ana', { k: kind, yes: true }), true, 'Older APKs without offer IDs retain their existing protocol'); }
    finally { legacy.stop(); }
  });
}
