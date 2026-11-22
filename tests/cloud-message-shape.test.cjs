// Exercise the production socket dispatch/error methods with the actual policy.
// No Workers runtime or game fixture is needed before a packet reaches dispatch.
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const worker = fs.readFileSync(path.join(__dirname, '../server/worker.mjs'), 'utf8');
const method = (from, to) => {
  const start = worker.indexOf('  ' + from), end = worker.indexOf('  ' + to, start);
  assert(start >= 0 && end > start, 'Production socket methods must be present');
  return worker.slice(start, end);
};
const policy = import('../server/policy.mjs');
async function fixture(authenticated) {
  const Protocol = vm.runInNewContext('(class {' + method('error(', 'queue(') +
    method('async webSocketMessage(', 'async webSocketClose(') + '})', { ...await policy, Date });
  const packets = [], closes = [], states = [];
  const socket = { send: text => packets.push(JSON.parse(text)), close: (...args) => closes.push(args) };
  const info = { authenticated, pid: 'player', role: 'player', bucket: Date.now(), count: 0, bytes: 0 };
  const protocol = new Protocol();
  Object.assign(protocol, { sockets: new Map([[socket, info]]), expired: false,
    meta: { expires: Date.now() + 60000, owner: { pid: 'owner' } },
    sendState: (...args) => states.push(args) });
  return { protocol, socket, info, packets, closes, states };
}
for (const authenticated of [true, false]) {
  test(`${authenticated ? 'authenticated' : 'unauthenticated'} non-object JSON packets are rejected without throwing`, async () => {
    for (const raw of ['null', '42', 'true', '"text"', '[]', '[{"t":"ping"}]']) {
      const f = await fixture(authenticated);
      await assert.doesNotReject(() => f.protocol.webSocketMessage(f.socket, raw), raw);
      assert.equal(f.packets.length, 1, raw);
      assert.equal(f.packets[0].reason, 'invalid', raw);
      assert.equal(f.closes.length, 1, raw);
      assert.equal(f.closes[0][0], 1008, raw);
      assert.equal(f.protocol.sockets.has(f.socket), false, raw);
      assert.equal(f.states.length, 0, 'Invalid envelopes must not expose game state');
    }
  });
}
test('authenticated object ping retains the connection and sends its existing identity state', async () => {
  const f = await fixture(true);
  await f.protocol.webSocketMessage(f.socket, '{"t":"ping"}');
  assert.deepEqual(f.states, [[f.socket, f.info]]);
  assert.equal(f.packets.length, 0); assert.equal(f.closes.length, 0);
  assert.equal(f.protocol.sockets.has(f.socket), true);
});
test('unauthenticated object ping still requires authentication and closes the socket', async () => {
  const f = await fixture(false);
  await f.protocol.webSocketMessage(f.socket, '{"t":"ping"}');
  assert.equal(f.packets[0].reason, 'auth'); assert.equal(f.closes[0][0], 1008);
  assert.equal(f.protocol.sockets.has(f.socket), false); assert.equal(f.states.length, 0);
});
