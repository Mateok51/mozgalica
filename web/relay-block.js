  // ---------- rezervni put: poruke preko javnog MQTT posrednika (WebSocket, port 443/8084...) ----------
  // Kad su oba uređaja na mobilnim podacima (CGNAT), izravna WebRTC veza često ne uspije. Tada se
  // stanje igre i unosi šalju preko MQTT teme sobe. Minimalni MQTT 3.1.1 klijent, QoS 0.
  const RELAY_URLS = window.__MQTT_URLS || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const RELAY_NS = 'mozgalica-kip/v1/';
  const enc = new TextEncoder(), dec = new TextDecoder();
  function mqttClient(url, onMsg, onDown) {
    let ws = null, ready = false, buf = new Uint8Array(0), pid = 1, ping = null, dead = false;
    const subs = new Set(), q = [], waiters = [];
    const str = (s) => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
    const len = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; };
    const pkt = (h, body) => new Uint8Array([h, ...len(body.length), ...body]);
    const raw = (u8) => { if (ws && ws.readyState === 1) ws.send(u8); };
    function publish(topic, obj) {
      const body = [...str(topic)], pl = enc.encode(typeof obj === 'string' ? obj : JSON.stringify(obj));
      const hdr = [0x30, ...len(body.length + pl.length), ...body], out = new Uint8Array(hdr.length + pl.length);
      out.set(hdr, 0); out.set(pl, hdr.length);
      if (ready) raw(out); else q.push(out);
    }
    function subscribe(topic) { subs.add(topic); if (ready) raw(pkt(0x82, [(pid >> 8) & 255, pid++ & 255, ...str(topic), 0])); }
    function parse() {
      for (;;) {
        if (buf.length < 2) return;
        let mul = 1, n = 0, i = 1, b;
        do { if (i >= buf.length) return; b = buf[i++]; n += (b & 127) * mul; mul *= 128; } while (b & 128);
        if (buf.length < i + n) return;
        const type = buf[0] >> 4, flags = buf[0] & 15, body = buf.subarray(i, i + n);
        buf = buf.slice(i + n);
        if (type === 2) {
          if (body[1] !== 0) { down(); return; }
          ready = true; subs.forEach((t) => raw(pkt(0x82, [(pid >> 8) & 255, pid++ & 255, ...str(t), 0])));
          q.splice(0).forEach(raw); waiters.splice(0).forEach((f) => f(true));
        } else if (type === 3) {
          const tl = (body[0] << 8) | body[1], topic = dec.decode(body.subarray(2, 2 + tl));
          let off = 2 + tl; if ((flags >> 1) & 3) off += 2;
          try { onMsg(topic, JSON.parse(dec.decode(body.subarray(off)))); } catch (e) {}
        }
      }
    }
    function down() {
      if (dead) return; dead = true; ready = false; clearInterval(ping);
      try { ws && ws.close(); } catch (e) {}
      waiters.splice(0).forEach((f) => f(false)); if (onDown) onDown();
    }
    try {
      ws = new WebSocket(url, ['mqtt']); ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        const cid = 'mz' + Math.random().toString(36).slice(2, 12);
        raw(pkt(0x10, [...str('MQTT'), 4, 0x02, 0, 40, ...str(cid)]));
        ping = setInterval(() => raw(new Uint8Array([0xc0, 0])), 20000);
      };
      ws.onmessage = (e) => { const d = new Uint8Array(e.data), n = new Uint8Array(buf.length + d.length); n.set(buf); n.set(d, buf.length); buf = n; parse(); };
      ws.onclose = down; ws.onerror = down;
    } catch (e) { setTimeout(down, 0); }
    return {
      url, publish, subscribe, get ready() { return ready; }, get dead() { return dead; },
      whenReady(ms) { return ready ? Promise.resolve(true) : dead ? Promise.resolve(false) : new Promise((r) => { waiters.push(r); setTimeout(() => r(ready), ms); }); },
      close() { dead = true; clearInterval(ping); try { raw(new Uint8Array([0xe0, 0])); ws.close(); } catch (e) {} },
    };
  }
  const rTopic = (code, k) => RELAY_NS + code.toLowerCase() + '/' + k;

  // domaćin: sluša na svim posrednicima; igrač preko releja dobiva "virtualnu vezu"
  let hostRelays = [], relaySweep = null;
  const relayConns = new Map();   // pid → lažna veza
  function startHostRelay(code) {
    stopHostRelay();
    hostRelays = RELAY_URLS.map((u) => {
      const c = mqttClient(u, (topic, m) => onRelayHost(c, code, m), () => {});
      c.subscribe(rTopic(code, 'h'));
      return c;
    });
    relaySweep = setInterval(() => {
      const now = Date.now(); let changed = false;
      for (const [pid, conn] of relayConns) if (now - conn.last > 12000) { relayConns.delete(pid); hostConns.delete(conn); conn.open = false; changed = true; }
      if (changed) syncConns();
    }, 3000);
  }
  function stopHostRelay() {
    clearInterval(relaySweep); relaySweep = null;
    hostRelays.forEach((c) => c.close()); hostRelays = [];
    for (const conn of relayConns.values()) hostConns.delete(conn);
    relayConns.clear();
  }
  function onRelayHost(client, code, m) {
    if (!m || typeof m !== 'object' || typeof m.pid !== 'string' || !game) return;
    const pid = m.pid.slice(0, 40);
    let conn = relayConns.get(pid);
    if (!conn || conn.client !== client) {
      if (conn) hostConns.delete(conn);
      conn = { relay: true, open: true, client, pid, last: Date.now(),
        send(v) { client.publish(rTopic(code, 'p/' + pid), v); }, close() { this.open = false; } };
      relayConns.set(pid, conn); hostConns.set(conn, { pid: null, name: '', av: 0, in: null });
    }
    conn.last = Date.now();
    if (m.t === 'ping') { if (!hostConns.get(conn).pid) { try { conn.send({ t: 'who' }); } catch (e) {} } return; }
    if (m.t === 'bye') { relayConns.delete(pid); hostConns.delete(conn); syncConns(); return; }
    onHostData(conn, m);
  }

  // igrač: spoji se na prvi posrednik koji radi i šalji preko njega
  let prelay = null, prelayPing = null, prelayHello = null;
  async function startPlayerRelay() {
    if (prelay || mode !== 'player') return;
    const code = pcode;
    for (const u of RELAY_URLS) {
      if (mode !== 'player' || pcode !== code || (pconn && pconn.open)) return;
      const c = mqttClient(u, (topic, d) => {
        if (prelay !== c) return;
        if (d && d.t === 'who') { c.publish(rTopic(code, 'h'), { t: 'hello', pid: PID, name: pname, av: myAv }); return; }
        if (d && d.code === pcode && Array.isArray(d.P)) {
          if (pconn && pconn.open) return;           // izravna veza ima prednost
          clearTimeout(waitTimer);
          if (netNote) { netNote = ''; if (S) phoneRender(true); }
          applyState(d);
        }
      }, () => { if (prelay === c) { prelay = null; clearInterval(prelayPing); clearInterval(prelayHello); if (mode === 'player' && !(pconn && pconn.open)) setTimeout(startPlayerRelay, 1500); } });
      c.subscribe(rTopic(code, 'all')); c.subscribe(rTopic(code, 'p/' + PID));
      prelay = c;
      if (await c.whenReady(5000)) {
        const hello = () => c.publish(rTopic(code, 'h'), { t: 'hello', pid: PID, name: pname, av: myAv });
        hello(); if (L.sent) c.publish(rTopic(code, 'h'), { t: 'in', pid: PID, in: L.sent });
        clearInterval(prelayHello); prelayHello = setInterval(() => { if (!S) hello(); else clearInterval(prelayHello); }, 2000);
        clearInterval(prelayPing); prelayPing = setInterval(() => c.publish(rTopic(code, 'h'), { t: 'ping', pid: PID }), 3000);
        return;
      }
      if (prelay === c) prelay = null;
      c.close();
    }
  }
  function stopPlayerRelay() {
    clearInterval(prelayPing); clearInterval(prelayHello);
    if (prelay) { try { prelay.publish(rTopic(pcode, 'h'), { t: 'bye', pid: PID }); } catch (e) {} const c = prelay; prelay = null; setTimeout(() => c.close(), 200); }
  }
  // jedno mjesto za slanje domaćinu: izravna veza ako je otvorena, inače relej
  function netSend(m) {
    if (pconn && pconn.open) { try { pconn.send(m); return; } catch (e) {} }
    if (prelay) prelay.publish(rTopic(pcode, 'h'), Object.assign({ pid: PID }, m));
  }

