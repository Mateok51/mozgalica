  // ---------- stanje stranice ----------
  // Povezivanje: TV (domaćin) otvara "sobu" s imenom mozgalica-kip-v1-<kod>, a mobiteli
  // se na nju spajaju izravno (WebRTC preko PeerJS-a). Igru vodi uređaj domaćina.
  const PEER_PREFIX = 'mozgalica-kip-v1-';
  // više STUN/TURN poslužitelja: bez TURN-a se mobiteli na mobilnoj mreži (4G/5G, CGNAT) često ne mogu spojiti
  const PEER_OPTS = { debug: 0, pingInterval: 4000, config: { iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp', 'turns:openrelay.metered.ca:443'], username: 'openrelayproject', credential: 'openrelayproject' },
  ], sdpSemantics: 'unified-plan' } };
  let hostWatch = null;
  const hasPeer = () => typeof Peer === 'function';
  const appUrl = () => location.origin + location.pathname;
  let mode = 'home';            // home | join | player | host | demo
  let demoView = 'phone';       // phone | tv (u demo načinu)
  let game = null, hostPeer = null, hostErr = '', pubTimer = null, pubPending = false;
  const hostConns = new Map();
  let joinTries = 0, relayTimer = null;
  let ppeer = null, pconn = null, waitTimer = null, retryTimer = null, perr = '', pcode = '', pname = '', netNote = '';
  let S = null, lastSig = '';
  let L = freshLocal(-1);
  let clockEnds = 0, clockDur = 0;
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (mode === 'home') render(); });

  let PID = store.get('mz_pid');
  if (!PID) { PID = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('mz_pid', PID); }
  let myAv = parseInt(store.get('mz_av'), 10);
  if (!(myAv >= 0 && myAv < 10)) myAv = 8 + Math.floor(Math.random() * 2);

  function freshLocal(s) {
    return { s, sent: null, pw: null, fxq: [], fx: null, fxTimer: null, sortI: 0, sortR: [], linkI: 0, linkR: [] };
  }

  // ---------- QR ----------
  function qrSvg(text) {
    try {
      if (typeof qrcode !== 'function') return '';
      const q = qrcode(0, 'M'); q.addData(text); q.make();
      const n = q.getModuleCount(); let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + 3) + ' ' + (r + 3) + 'h1v1h-1z';
      const sz = n + 6;
      return '<svg viewBox="0 0 ' + sz + ' ' + sz + '" shape-rendering="crispEdges" role="img" aria-label="QR kod za pridruživanje"><rect width="' + sz + '" height="' + sz + '" fill="#fff"/><path d="' + d + '" fill="#0a1433"/></svg>';
    } catch (e) { return ''; }
  }

  // ---------- ekran ne smije zaspati tijekom igre ----------
  let wake = null;
  async function keepAwake() {
    try {
      if (navigator.wakeLock && !wake) {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', () => { wake = null; });
      }
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (mode === 'host' || mode === 'player' || mode === 'demo')) keepAwake();
  });

  // ---------- navigacija ----------
  function reset() {
    if (game) game.stop();
    clearInterval(pubTimer); clearInterval(hostWatch); clearTimeout(waitTimer); clearTimeout(retryTimer); stopFxTimer(); hostOff = false;
    for (const c of hostConns.keys()) { try { c.close(); } catch (e) {} }
    hostConns.clear();
    if (hostPeer) { try { hostPeer.destroy(); } catch (e) {} }
    if (ppeer) { try { ppeer.destroy(); } catch (e) {} }
    stopHostRelay(); stopPlayerRelay();
    game = null; hostPeer = null; ppeer = null; pconn = null; S = null;
    hostErr = ''; perr = ''; netNote = ''; lastSig = '';
    L = freshLocal(-1);
    try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    mode = 'home';
    render();
  }

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
  function relayReachable() {
    return new Promise((res) => {
      let left = RELAY_URLS.length, done = false;
      RELAY_URLS.forEach((u) => { const c = mqttClient(u, () => {}, () => {}); c.whenReady(6000).then((ok) => { c.close(); if (done) return; if (ok) { done = true; res(true); } else if (--left === 0) res(false); }); });
    });
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

  // ---------- domaćin (TV) ----------
  function syncConns() {
    if (game) game.syncPeers([...hostConns.values()].filter((x) => x.pid));
  }
  function onHostData(conn, m) {
    const x = hostConns.get(conn);
    if (!x || !m || typeof m !== 'object' || !game) return;
    if (m.t === 'hello' && typeof m.pid === 'string' && typeof m.name === 'string') { x.pid = m.pid.slice(0, 40); x.name = m.name; x.av = m.av; }
    else if (m.t === 'av') x.av = m.av;
    else if (m.t === 'in' && m.in && typeof m.in === 'object') x.in = m.in;
    else return;
    syncConns();
    if (m.t === 'hello' && conn.open) { try { conn.send(game.view()); } catch (e) {} }
  }
  function publish() {
    if (!game) return;
    const v = game.view(), rel = new Set();
    for (const c of hostConns.keys()) { if (c.relay) { if (c.open) rel.add(c.client); continue; } if (c.open) { try { c.send(v); } catch (e) {} } }
    if (rel.size) { const js = JSON.stringify(v); rel.forEach((cl) => cl.publish(rTopic(v.code, 'all'), js)); }
  }
  function publishSoon() { if (pubPending) return; pubPending = true; setTimeout(() => { pubPending = false; publish(); }, 30); }

  function startHost() {
    mode = 'host'; hostErr = ''; game = null; render(); keepAwake();
    if (!hasPeer()) { hostErr = 'Modul za povezivanje se nije učitao. Provjeri internet i osvježi stranicu.'; return render(); }
    openHostPeer(0);
  }
  function openHostPeer(tries, opts) {
    const code = makeCode();
    const peer = new Peer(PEER_PREFIX + code.toLowerCase(), PEER_OPTS);
    let opened = false;
    peer.on('open', () => {
      if (hostPeer === peer) return; // ponovno spajanje s posrednikom: soba ostaje ista (ranije se tu greškom uništavala)
      if ((mode !== 'host' && mode !== 'hostp') || hostPeer || game) { try { peer.destroy(); } catch (e) {} return; }
      opened = true; hostPeer = peer;
      openRoom(code, opts);
      // čuvar: ako veza s posrednikom padne (mobitel u pozadini, promjena mreže), soba je nevidljiva novim igračima → stalno ponovno spajanje
      clearInterval(hostWatch);
      hostWatch = setInterval(() => hostKeepAlive(peer), 3000);
      render();
    });
    peer.on('connection', (conn) => {
      hostConns.set(conn, { pid: null, name: '', av: 0, in: null });
      conn.on('data', (m) => onHostData(conn, m));
      const drop = () => { if (hostConns.delete(conn)) syncConns(); };
      conn.on('close', drop);
      conn.on('error', drop);
    });
    peer.on('disconnected', () => { if (hostPeer === peer) { hostOffline(true); hostKeepAlive(peer); } });
    peer.on('open', () => { if (hostPeer === peer) hostOffline(false); });
    peer.on('error', (e) => {
      if (opened) { if (hostPeer === peer) setTimeout(() => hostKeepAlive(peer), 1500); return; } // gubitak veze jednog igrača ne ruši sobu
      try { peer.destroy(); } catch (er) {}
      if (e && e.type === 'unavailable-id' && tries < 5) return openHostPeer(tries + 1, opts);
      // posrednik za WebRTC ne radi: otvori sobu samo preko releja ako je neki MQTT posrednik dostupan
      if ((mode === 'host' || mode === 'hostp') && !game) {
        relayReachable().then((ok) => {
          if (!ok) return fail();
          if ((mode === 'host' || mode === 'hostp') && !game) { openRoom(code, opts); render(); }
        });
        return;
      }
      fail();
    });
    function fail() {
      if (mode === 'host' || mode === 'hostp') {
        hostErr = 'Ne mogu otvoriti sobu (' + ((e && e.type) || 'greška') + '). Provjeri internet i pokušaj ponovno.';
        if (mode === 'hostp') mode = 'hostform';
        render();
      }
    }
  }
  function openRoom(code, opts) {
    if (opts && opts.noTv) {
      // domaćin igra s ovog mobitela; ostali se spajaju kao i inače
      pcode = code;
      game = createGame({ code, noTv: true, onChange: () => { publishSoon(); applyState(game.view()); } });
      game.addPlayer(PID, opts.me, myAv, false, true);
    } else {
      game = createGame({ code, onChange: () => { publishSoon(); render(); } });
    }
    clearInterval(pubTimer); pubTimer = setInterval(publish, 1000);
    startHostRelay(code);
  }

  let hostOff = false;
  function hostOffline(v) {
    if (hostOff === v) return; hostOff = v;
    netNote = v ? 'Soba se ponovno povezuje… novi igrači se mogu spojiti za koju sekundu.' : '';
    if (mode === 'hostp') phoneRender(true); else if (mode === 'host') render();
  }
  function hostKeepAlive(peer) {
    if (hostPeer !== peer || peer.destroyed) { clearInterval(hostWatch); return; }
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} } else if (hostOff) hostOffline(false);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (hostPeer) hostKeepAlive(hostPeer);
    if (mode === 'player' && ppeer && !ppeer.destroyed) {
      if (ppeer.disconnected) { try { ppeer.reconnect(); } catch (e) {} }
      if (S && (!pconn || !pconn.open)) retrySoon();
    }
  });

  // ---------- igra bez TV-a: domaćin igra s mobitela ----------
  function hostFormV() {
    $app.className = 'screen phone';
    const name = store.get('mz_name') || '';
    $app.innerHTML = '<div class="logo" style="font-size:2.6rem;text-align:center">MOZGALICA</div>' +
      '<form class="form" id="hform" autocomplete="off">' + (hostErr ? '<div class="err">' + esc(hostErr) + '</div>' : '') +
      '<div class="p-title" style="font-size:1.5rem">Igra bez TV-a</div>' +
      '<div class="p-sub">Ti otvaraš sobu i igraš kao i ostali. Svatko na svom mobitelu vidi pitanja, glasove, moći, poredak i piramidu.</div>' +
      '<div><label for="hname">Tvoje ime</label><input id="hname" maxlength="12" value="' + esc(name) + '" placeholder="npr. Mateo" autocomplete="off"></div>' +
      '<button class="btn" type="submit">Otvori sobu</button><button class="btn ghost" type="button" id="back">Natrag</button></form>';
    document.getElementById('hform').onsubmit = (e) => {
      e.preventDefault();
      const n = document.getElementById('hname').value.trim();
      if (!n) { hostErr = 'Upiši svoje ime.'; return hostFormV(); }
      startHostPhone(n);
    };
    bind('back', reset);
  }
  function startHostPhone(name) {
    store.set('mz_name', name);
    hostErr = ''; S = null; lastSig = ''; L = freshLocal(-1); pcode = '';
    if (!hasPeer()) { hostErr = 'Modul za povezivanje se nije učitao. Provjeri internet i osvježi stranicu.'; mode = 'hostform'; return render(); }
    mode = 'hostp';
    keepAwake();
    render();
    openHostPeer(0, { noTv: true, me: name });
  }

  // ---------- demo: ti + botovi na jednom uređaju ----------
  function startDemo() {
    mode = 'demo'; demoView = 'phone'; S = null; lastSig = ''; L = freshLocal(-1);
    keepAwake();
    game = createGame({ code: 'DEMO', noTv: true, onChange: () => { applyState(game.view()); if (demoView === 'tv') render(); } });
    const name = store.get('mz_name') || 'Ti';
    game.addPlayer(PID, name, myAv, false);
    game.setBots(3);
    render();
  }

  // ---------- igrač (mobitel) ----------
  function joinGame(code, name) {
    pcode = code; pname = name; perr = ''; netNote = ''; S = null; lastSig = ''; L = freshLocal(-1);
    store.set('mz_name', name);
    mode = 'player'; render(); keepAwake();
    if (!hasPeer()) { startPlayerRelay(); waitTimer = setTimeout(() => { if (!S && mode === 'player') failJoin('Spajanje nije uspjelo. Provjeri kod sobe i internet.'); }, 20000); return; }
    const peer = new Peer(PEER_OPTS);
    ppeer = peer; joinTries = 0;
    peer.on('open', () => { if (ppeer === peer) connectHost(); });
    peer.on('disconnected', () => { if (ppeer === peer && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} } });
    peer.on('error', (e) => {
      if (ppeer !== peer) return;
      const t = e && e.type;
      if (!S) {
        // domaćin se možda upravo ponovno spaja (mobitel bio u pozadini): pokušaj još nekoliko puta prije poruke
        if (t === 'peer-unavailable') { joinTries++; startPlayerRelay(); clearTimeout(retryTimer); retryTimer = setTimeout(() => { if (!S && ppeer === peer && !peer.destroyed) connectHost(); }, 2500); return; }  // soba možda postoji samo preko releja; vrijeme ističe waitTimer
        if ((t === 'network' || t === 'socket-error' || t === 'socket-closed' || t === 'disconnected') && joinTries < 3) { joinTries++; clearTimeout(retryTimer); retryTimer = setTimeout(() => { if (ppeer === peer && !peer.destroyed) { if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} } else connectHost(); } }, 2000); return; }
        startPlayerRelay(); return;
      }
      retrySoon();
    });
    // ako se izravna veza ne otvori brzo, uključi relej (radi i na mobilnim podacima)
    clearTimeout(relayTimer); relayTimer = setTimeout(() => { if (mode === 'player' && !(pconn && pconn.open)) startPlayerRelay(); }, 4500);
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => { if (!S && mode === 'player') failJoin(joinTries >= 4 ? 'Soba ' + pcode + ' nije pronađena. Provjeri kod i je li soba još otvorena kod domaćina.' : 'Spajanje traje predugo. Provjeri kod sobe i internet pa pokušaj ponovno. Domaćin neka drži igru otvorenu na ekranu.'); }, 20000);
  }
  function failJoin(msg) {
    clearTimeout(waitTimer); clearTimeout(retryTimer); clearTimeout(relayTimer); stopPlayerRelay();
    if (ppeer) { try { ppeer.destroy(); } catch (e) {} }
    ppeer = null; pconn = null; perr = msg; mode = 'join';
    render();
  }
  function connectHost() {
    if (!ppeer || ppeer.destroyed) return;
    if (pconn && !pconn.open) { try { pconn.close(); } catch (e) {} }
    const conn = ppeer.connect(PEER_PREFIX + pcode.toLowerCase(), { reliable: true, serialization: 'json' });
    pconn = conn;
    // WebRTC zna "zapeti" (NAT): ako se kanal ne otvori brzo, pokušaj ponovno umjesto da čekaš do isteka
    const stuck = setTimeout(() => { if (pconn === conn && !conn.open && mode === 'player') { joinTries++; if (S) retrySoon(); else if (joinTries < 5) connectHost(); } }, 7000);
    conn.on('open', () => {
      clearTimeout(stuck);
      if (pconn !== conn) return;
      try {
        conn.send({ t: 'hello', pid: PID, name: pname, av: myAv });
        if (L.sent) conn.send({ t: 'in', in: L.sent });
      } catch (e) {}
      if (netNote) { netNote = ''; if (S) phoneRender(true); }
      clearTimeout(relayTimer); stopPlayerRelay();
    });
    conn.on('data', (d) => { if (pconn === conn && d && d.code === pcode && Array.isArray(d.P)) applyState(d); });
    const lost = () => { clearTimeout(stuck); if (pconn !== conn || mode !== 'player') return; if (S) retrySoon(); else if (joinTries < 5) { joinTries++; clearTimeout(retryTimer); retryTimer = setTimeout(connectHost, 1500); } };
    conn.on('close', lost);
    conn.on('error', lost);
  }
  function retrySoon() {
    if (mode !== 'player' || !S) return;
    if (prelay && prelay.ready) return;            // relej i dalje radi
    startPlayerRelay();
    if (!netNote) { netNote = 'Veza je prekinuta. Spajam ponovno…'; phoneRender(true); }
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (mode !== 'player') return;
      if (!ppeer || ppeer.destroyed) { if (!prelay) failJoin('Veza s igrom je izgubljena.'); return; }
      if (ppeer.disconnected) { try { ppeer.reconnect(); } catch (e) {} retryTimer = setTimeout(connectHost, 1500); }
      else connectHost();
    }, 1500);
  }

  // zatvaranje kartice odmah javi domaćinu (umjesto da čeka da veza istekne)
  window.addEventListener('pagehide', () => { try { if (pconn) pconn.close(); } catch (e) {} if (mode === 'player') stopPlayerRelay(); });

  function sendInput(inp) {
    AUDIO.play('confirm');
    inp.s = L.s;
    L.sent = inp;
    if (isLocalHost()) game.setInput(PID, inp);
    else netSend({ t: 'in', in: inp });
    phoneRender(true);
  }
  function chooseAvatar(i) {
    myAv = i; store.set('mz_av', String(i));
    if (isLocalHost()) game.setAvatar(PID, i);
    else netSend({ t: 'av', av: i });
  }

