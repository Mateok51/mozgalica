// Actual transport with a narrow native socket/timer seam. Invalid local
// payloads must not be mistaken for a native write failure and close the room.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../cloud-transport.js'), 'utf8');
function fixture() {
  const sockets = [], status = [], jobs = new Map(); let sequence = 0;
  class WS {
    constructor() { this.readyState = 0; this.sent = []; sockets.push(this); }
    send(text) { this.sent.push(JSON.parse(text)); }
    close() { this.readyState = 3; }
  }
  const c = vm.createContext({ URL, WebSocket: WS, Date, AbortController,
    setTimeout: (fn, ms) => { const id = ++sequence; jobs.set(id, { fn, ms }); return id; }, clearTimeout: id => jobs.delete(id),
    setInterval: (fn, ms) => { const id = ++sequence; jobs.set(id, { fn, ms }); return id; }, clearInterval: id => jobs.delete(id) });
  vm.runInContext(source, c);
  const client = c.TAVERN_CLOUD_TRANSPORT.create({ apiOrigin: 'https://game.test', onStatus: value => status.push(value) });
  client.connect({ code: 'ABCD', secret: 'a'.repeat(22), pid: 'one', sk: 'f'.repeat(32), name: 'Ana', av: 0, role: 'player' });
  const ws = sockets[0]; ws.readyState = 1; ws.onopen();
  ws.onmessage({ data: JSON.stringify({ code: 'ABCD', P: [{ id: 'one' }], ph: 'lobby', s: 0, ms: 0, dur: 0, cloud: { owner: false, noTv: true } }) });
  return { client, ws, sockets, status, jobs };
}
test('malformed, circular, undefined and oversized local messages preserve the healthy socket', () => {
  const circular = {}; circular.self = circular;
  for (const invalid of [undefined, circular, { large: 'x'.repeat(8193) }, { toJSON() { throw Error('local serialization failure'); } }]) {
    const f = fixture();
    assert.equal(f.client.send(invalid), false);
    assert.equal(f.client.connected, true);
    assert.equal(f.ws.readyState, 1);
    assert.equal(f.ws.sent.length, 1, 'Invalid payload must not be written to the native socket');
    assert(!f.status.includes('reconnecting'), 'Local payload errors cannot force recovery');
    assert.equal(f.client.send({ t: 'in', in: { s: 0, c: 0 } }), true, 'A valid later write must still work');
    f.client.close();
  }
});
test('an identity replacement stops retries and ignores late old-socket events', () => {
  const f = fixture();
  f.ws.onmessage({ data: JSON.stringify({ t: 'error', reason: 'identity' }) });
  assert.equal(f.client.connected, false);
  assert.equal(f.ws.readyState, 3);
  assert.equal(f.jobs.size, 0, 'A displaced tab cannot start a reconnect race');
  f.ws.onclose(); f.ws.onerror(); f.client.check(true);
  assert.equal(f.sockets.length, 1);
  assert.equal(f.jobs.size, 0);
  assert(!f.status.includes('reconnecting'));
});
