'use strict';
// Najmanji MQTT 3.1.1 posrednik preko WebSocketa (samo za testove): CONNECT, SUBSCRIBE, PUBLISH (QoS 0), PINGREQ.
// Bilježi sve objavljene poruke (tema + sadržaj) da test može provjeriti da na posredniku nema otvorenog teksta.
const http = require('http'), crypto = require('crypto');
function start(port) {
  const subs = new Map(), log = [];
  const server = http.createServer((q, r) => { r.writeHead(404); r.end(); });
  server.on('upgrade', (req, sock) => {
    const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\nSec-WebSocket-Protocol: mqtt\r\n\r\n');
    let wbuf = Buffer.alloc(0), mbuf = Buffer.alloc(0); const mine = new Set();
    const send = (b) => { const n = b.length, h = n < 126 ? Buffer.from([0x82, n]) : n < 65536 ? Buffer.from([0x82, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x82, 127, 0, 0, 0, 0]), Buffer.from([n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255])]); try { sock.write(Buffer.concat([h, b])); } catch (e) {} };
    const enc = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; };
    const mqtt = () => { for (;;) {
      if (mbuf.length < 2) return; let mul = 1, n = 0, i = 1, b;
      do { if (i >= mbuf.length) return; b = mbuf[i++]; n += (b & 127) * mul; mul *= 128; } while (b & 128);
      if (mbuf.length < i + n) return; const type = mbuf[0] >> 4, body = mbuf.subarray(i, i + n); mbuf = mbuf.subarray(i + n);
      if (type === 1) send(Buffer.from([0x20, 2, 0, 0]));
      else if (type === 8) { const pid = body.subarray(0, 2); let o = 2; while (o < body.length) { const l = body.readUInt16BE(o); const t = body.subarray(o + 2, o + 2 + l).toString(); o += 3 + l; mine.add(t); if (!subs.has(t)) subs.set(t, new Set()); subs.get(t).add(send); } send(Buffer.from([0x90, 3, pid[0], pid[1], 0])); }
      else if (type === 3) { const l = body.readUInt16BE(0), t = body.subarray(2, 2 + l).toString(), pl = body.subarray(2 + l); log.push({ t, p: pl.toString() });
        const pkt = Buffer.concat([Buffer.from([0x30, ...enc(2 + l + pl.length)]), body.subarray(0, 2 + l), pl]); (subs.get(t) || new Set()).forEach((f) => f(pkt)); }
      else if (type === 12) send(Buffer.from([0xd0, 0]));
      else if (type === 14) { try { sock.end(); } catch (e) {} } } };
    sock.on('data', (d) => { wbuf = Buffer.concat([wbuf, d]); for (;;) {
      if (wbuf.length < 2) return; const op = wbuf[0] & 15; let len = wbuf[1] & 127, o = 2;
      if (len === 126) { if (wbuf.length < 4) return; len = wbuf.readUInt16BE(2); o = 4; } else if (len === 127) { if (wbuf.length < 10) return; len = Number(wbuf.readBigUInt64BE(2)); o = 10; }
      const masked = wbuf[1] & 128, mk = masked ? wbuf.subarray(o, o + 4) : null; if (masked) o += 4; if (wbuf.length < o + len) return;
      const pl = Buffer.from(wbuf.subarray(o, o + len)); wbuf = wbuf.subarray(o + len); if (mk) for (let k = 0; k < pl.length; k++) pl[k] ^= mk[k & 3];
      if (op === 8) { try { sock.end(); } catch (e) {} return; } if (op === 2 || op === 0) { mbuf = Buffer.concat([mbuf, pl]); mqtt(); } } });
    const off = () => mine.forEach((t) => subs.get(t) && subs.get(t).delete(send));
    sock.on('close', off); sock.on('error', off);
  });
  return new Promise((res) => server.listen(port, () => res({ log, close: () => server.close() })));
}
module.exports = { start };
