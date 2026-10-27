// Minimalni MQTT 3.1.1 posrednik preko WebSocketa (samo za testove): CONNECT, SUBSCRIBE, PUBLISH QoS0, PINGREQ
const { WebSocketServer } = require('/opt/npm-tools/node_modules/ws');
function start(port) {
  const wss = new WebSocketServer({ port, handleProtocols: (ps) => (ps.has('mqtt') ? 'mqtt' : false) });
  const clients = new Set(); let stats = { pub: 0, bytes: 0, conn: 0 };
  const len = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; };
  wss.on('connection', (ws) => {
    const c = { ws, subs: new Set(), buf: Buffer.alloc(0) }; clients.add(c);
    ws.on('message', (data) => {
      c.buf = Buffer.concat([c.buf, Buffer.from(data)]);
      for (;;) {
        if (c.buf.length < 2) return;
        let mul = 1, n = 0, i = 1, b;
        do { if (i >= c.buf.length) return; b = c.buf[i++]; n += (b & 127) * mul; mul *= 128; } while (b & 128);
        if (c.buf.length < i + n) return;
        const type = c.buf[0] >> 4, body = c.buf.subarray(i, i + n), whole = c.buf.subarray(0, i + n);
        c.buf = c.buf.subarray(i + n);
        if (type === 1) { const pl = body.readUInt16BE(0); if (body.toString('utf8', 2, 2 + pl) !== 'MQTT' || body[2 + pl] !== 4) { ws.close(); return; } stats.conn++; ws.send(Buffer.from([0x20, 2, 0, 0])); }
        else if (type === 8) { const id = body.readUInt16BE(0); let off = 2; const codes = []; while (off < body.length) { const tl = body.readUInt16BE(off); c.subs.add(body.toString('utf8', off + 2, off + 2 + tl)); off += 2 + tl + 1; codes.push(0); } ws.send(Buffer.from([0x90, 2 + codes.length, id >> 8, id & 255, ...codes])); }
        else if (type === 3) { const tl = body.readUInt16BE(0), topic = body.toString('utf8', 2, 2 + tl); stats.pub++; stats.bytes += whole.length; const out = Buffer.from(whole); for (const o of clients) if (o.subs.has(topic) && o.ws.readyState === 1) o.ws.send(out); }
        else if (type === 12) ws.send(Buffer.from([0xd0, 0]));
        else if (type === 14) ws.close();
      }
    });
    ws.on('close', () => clients.delete(c));
  });
  return { stats: () => stats, close: () => new Promise((r) => { for (const c of clients) c.ws.terminate(); wss.close(r); }) };
}
module.exports = { start };
