  // ---------- stanje stranice ----------
  // Povezivanje: TV (domaćin) otvara "sobu" s imenom mozgalica-kip-v1-<kod>, a mobiteli
  // se na nju spajaju izravno (WebRTC preko PeerJS-a). Igru vodi uređaj domaćina.
  const PEER_PREFIX = 'mozgalica-kip-v1-';
  const hasPeer = () => typeof Peer === 'function';
  const appUrl = () => location.origin + location.pathname;
  let mode = 'home';            // home | join | player | host | demo
  let demoView = 'phone';       // phone | tv (u demo načinu)
  let game = null, hostPeer = null, hostErr = '', pubTimer = null, pubPending = false;
  const hostConns = new Map();
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
    clearInterval(pubTimer); clearTimeout(waitTimer); clearTimeout(retryTimer); stopFxTimer();
    for (const c of hostConns.keys()) { try { c.close(); } catch (e) {} }
    hostConns.clear();
    if (hostPeer) { try { hostPeer.destroy(); } catch (e) {} }
    if (ppeer) { try { ppeer.destroy(); } catch (e) {} }
    game = null; hostPeer = null; ppeer = null; pconn = null; S = null;
    hostErr = ''; perr = ''; netNote = ''; lastSig = '';
    L = freshLocal(-1);
    try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    mode = 'home';
    render();
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
    const v = game.view();
    for (const c of hostConns.keys()) if (c.open) { try { c.send(v); } catch (e) {} }
  }
  function publishSoon() { if (pubPending) return; pubPending = true; setTimeout(() => { pubPending = false; publish(); }, 30); }

  function startHost() {
    mode = 'host'; hostErr = ''; game = null; render(); keepAwake();
    if (!hasPeer()) { hostErr = 'Modul za povezivanje se nije učitao. Provjeri internet i osvježi stranicu.'; return render(); }
    openHostPeer(0);
  }
  function openHostPeer(tries, opts) {
    const code = makeCode();
    const peer = new Peer(PEER_PREFIX + code.toLowerCase(), { debug: 0 });
    let opened = false;
    peer.on('open', () => {
      if ((mode !== 'host' && mode !== 'hostp') || hostPeer) { try { peer.destroy(); } catch (e) {} return; }
      opened = true; hostPeer = peer;
      if (opts && opts.noTv) {
        // domaćin igra s ovog mobitela; ostali se spajaju kao i inače
        pcode = code;
        game = createGame({ code, noTv: true, onChange: () => { publishSoon(); applyState(game.view()); } });
        game.addPlayer(PID, opts.me, myAv, false, true);
      } else {
        game = createGame({ code, onChange: () => { publishSoon(); render(); } });
      }
      pubTimer = setInterval(publish, 1000);
      render();
    });
    peer.on('connection', (conn) => {
      hostConns.set(conn, { pid: null, name: '', av: 0, in: null });
      conn.on('data', (m) => onHostData(conn, m));
      const drop = () => { if (hostConns.delete(conn)) syncConns(); };
      conn.on('close', drop);
      conn.on('error', drop);
    });
    peer.on('disconnected', () => { if (hostPeer === peer && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} } });
    peer.on('error', (e) => {
      if (opened) return; // gubitak veze jednog igrača ne ruši sobu
      try { peer.destroy(); } catch (er) {}
      if (e && e.type === 'unavailable-id' && tries < 5) return openHostPeer(tries + 1, opts);
      if (mode === 'host' || mode === 'hostp') {
        hostErr = 'Ne mogu otvoriti sobu (' + ((e && e.type) || 'greška') + '). Provjeri internet i pokušaj ponovno.';
        if (mode === 'hostp') mode = 'hostform';
        render();
      }
    });
  }

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
    if (!hasPeer()) return failJoin('Modul za povezivanje se nije učitao. Provjeri internet i osvježi stranicu.');
    const peer = new Peer({ debug: 0 });
    ppeer = peer;
    peer.on('open', () => { if (ppeer === peer) connectHost(); });
    peer.on('disconnected', () => { if (ppeer === peer && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} } });
    peer.on('error', (e) => {
      if (ppeer !== peer) return;
      const t = e && e.type;
      if (!S) {
        if (t === 'peer-unavailable') return failJoin('Soba ' + pcode + ' nije pronađena. Provjeri kod i je li igra otvorena na TV-u.');
        if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return failJoin('Nema veze s poslužiteljem za povezivanje. Provjeri internet.');
        return failJoin('Spajanje nije uspjelo (' + (t || 'greška') + ').');
      }
      retrySoon();
    });
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => { if (!S && mode === 'player') failJoin('Spajanje traje predugo. Provjeri kod sobe i internet pa pokušaj ponovno.'); }, 15000);
  }
  function failJoin(msg) {
    clearTimeout(waitTimer); clearTimeout(retryTimer);
    if (ppeer) { try { ppeer.destroy(); } catch (e) {} }
    ppeer = null; pconn = null; perr = msg; mode = 'join';
    render();
  }
  function connectHost() {
    if (!ppeer || ppeer.destroyed) return;
    const conn = ppeer.connect(PEER_PREFIX + pcode.toLowerCase(), { reliable: true, serialization: 'json' });
    pconn = conn;
    conn.on('open', () => {
      if (pconn !== conn) return;
      try {
        conn.send({ t: 'hello', pid: PID, name: pname, av: myAv });
        if (L.sent) conn.send({ t: 'in', in: L.sent });
      } catch (e) {}
      if (netNote) { netNote = ''; if (S) phoneRender(true); }
    });
    conn.on('data', (d) => { if (pconn === conn && d && d.code === pcode && Array.isArray(d.P)) applyState(d); });
    const lost = () => { if (pconn === conn && mode === 'player') retrySoon(); };
    conn.on('close', lost);
    conn.on('error', lost);
  }
  function retrySoon() {
    if (mode !== 'player' || !S) return;
    if (!netNote) { netNote = 'Veza je prekinuta. Spajam ponovno…'; phoneRender(true); }
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (mode !== 'player') return;
      if (!ppeer || ppeer.destroyed) return failJoin('Veza s igrom je izgubljena.');
      if (ppeer.disconnected) { try { ppeer.reconnect(); } catch (e) {} retryTimer = setTimeout(connectHost, 1500); }
      else connectHost();
    }, 1500);
  }

  // zatvaranje kartice odmah javi domaćinu (umjesto da čeka da veza istekne)
  window.addEventListener('pagehide', () => { try { if (pconn) pconn.close(); } catch (e) {} });

  function sendInput(inp) {
    AUDIO.play('confirm');
    inp.s = L.s;
    L.sent = inp;
    if (isLocalHost()) game.setInput(PID, inp);
    else if (pconn && pconn.open) { try { pconn.send({ t: 'in', in: inp }); } catch (e) {} }
    phoneRender(true);
  }
  function chooseAvatar(i) {
    myAv = i; store.set('mz_av', String(i));
    if (isLocalHost()) game.setAvatar(PID, i);
    else if (pconn && pconn.open) { try { pconn.send({ t: 'av', av: i }); } catch (e) {} }
  }

