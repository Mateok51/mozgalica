
(function () {
  'use strict';
  const JOIN_URL = 'https://claude.ai/artifact/2EJ9htojyFMcNo46Ye13xx';
  const $app = document.getElementById('app');
  const SHAPES = ['▲', '◆', '●', '■'];
  const ICON = { led: '❄️', sluz: '🟢', grick: '🐛', bomba: '💣', dupli: '✖️2', pola: '✂️', stit: '🛡️' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const use = (n) => (window.claude && window.claude.use ? window.claude.use(n) : Promise.resolve(null)).catch(() => null);

  // ---------- likovi (originalni) ----------
  const AV = [
    { n: 'Bubi',   c: '#ff6b6b', s: 'round',  e: 2, x: 'antena' },
    { n: 'Brko',   c: '#4dabf7', s: 'square', e: 2, x: 'brkovi' },
    { n: 'Zvrk',   c: '#ffd43b', s: 'tall',   e: 1, x: 'sesir' },
    { n: 'Lila',   c: '#b197fc', s: 'round',  e: 2, x: 'masna' },
    { n: 'Tikvan', c: '#ff922b', s: 'pear',   e: 3, x: 'list' },
    { n: 'Mrki',   c: '#69db7c', s: 'square', e: 2, x: 'rogovi' },
    { n: 'Pipi',   c: '#f783ac', s: 'tall',   e: 2, x: 'naocale' },
    { n: 'Ćiro',   c: '#38d9a9', s: 'pear',   e: 1, x: 'kruna' },
  ];
  const TOP = { round: 22, square: 26, tall: 14, pear: 20 };
  const avCache = {};
  function avSvg(i, mood) {
    const k = i + ':' + (mood || '');
    if (avCache[k]) return avCache[k];
    const a = AV[i] || AV[0];
    const t = TOP[a.s];
    const dark = '#1a1a2e';
    let body = '';
    if (a.s === 'round') body = '<ellipse cx="50" cy="62" rx="38" ry="40" fill="' + a.c + '"/>';
    else if (a.s === 'square') body = '<rect x="14" y="26" width="72" height="76" rx="22" fill="' + a.c + '"/>';
    else if (a.s === 'tall') body = '<rect x="22" y="14" width="56" height="90" rx="28" fill="' + a.c + '"/>';
    else body = '<path d="M50 20C72 20 76 44 74 54C88 66 90 102 50 104C10 102 12 66 26 54C24 44 28 20 50 20Z" fill="' + a.c + '"/>';
    const shade = '<ellipse cx="50" cy="96" rx="26" ry="6" fill="#000" opacity=".12"/>';
    const eyePos = a.e === 1 ? [[50, 52, 13]] : a.e === 3 ? [[32, 56, 8], [50, 46, 8], [68, 56, 8]] : [[38, 52, 9], [62, 52, 9]];
    let eyes = '';
    for (const [x, y, r] of eyePos) {
      if (mood === 'dizzy') eyes += '<path d="M' + (x - r * .6) + ' ' + (y - r * .6) + 'l' + r * 1.2 + ' ' + r * 1.2 + 'M' + (x + r * .6) + ' ' + (y - r * .6) + 'l-' + r * 1.2 + ' ' + r * 1.2 + '" stroke="' + dark + '" stroke-width="3.5" stroke-linecap="round"/>';
      else eyes += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff"/><circle cx="' + (x + 1.5) + '" cy="' + (y + 1) + '" r="' + (r * .45) + '" fill="' + dark + '"/>';
    }
    const mouth = mood === 'happy'
      ? '<path d="M36 72Q50 90 64 72Z" fill="' + dark + '"/>'
      : mood === 'dizzy' ? '<path d="M40 80Q50 72 60 80" stroke="' + dark + '" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : '<path d="M38 74Q50 86 62 74" stroke="' + dark + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
    let acc = '';
    switch (a.x) {
      case 'antena': acc = '<path d="M50 ' + t + 'V6" stroke="' + dark + '" stroke-width="3"/><circle cx="50" cy="6" r="6" fill="#ffc93c"/>'; break;
      case 'brkovi': acc = '<path d="M32 68Q41 60 50 66Q59 60 68 68Q59 72 50 69Q41 72 32 68Z" fill="' + dark + '"/>'; break;
      case 'sesir': acc = '<rect x="20" y="' + (t - 2) + '" width="60" height="6" rx="3" fill="' + dark + '"/><rect x="32" y="' + (t - 18) + '" width="36" height="18" rx="4" fill="' + dark + '"/><rect x="32" y="' + (t - 8) + '" width="36" height="4" fill="#e8384f"/>'; break;
      case 'masna': acc = '<path d="M50 ' + (t + 2) + 'L34 ' + (t - 8) + 'L34 ' + (t + 12) + 'Z M50 ' + (t + 2) + 'L66 ' + (t - 8) + 'L66 ' + (t + 12) + 'Z" fill="#ff4d8d"/><circle cx="50" cy="' + (t + 2) + '" r="5" fill="#ff4d8d"/>'; break;
      case 'list': acc = '<path d="M50 ' + (t + 2) + 'C48 ' + (t - 10) + ' 60 ' + (t - 16) + ' 70 ' + (t - 14) + 'C66 ' + (t - 4) + ' 58 ' + t + ' 50 ' + (t + 2) + 'Z" fill="#2f9e44"/><path d="M50 ' + (t + 2) + 'V' + (t - 6) + '" stroke="#5c3d1e" stroke-width="3"/>'; break;
      case 'rogovi': acc = '<path d="M28 ' + (t + 12) + 'L22 ' + (t - 8) + 'L40 ' + (t + 4) + 'Z M72 ' + (t + 12) + 'L78 ' + (t - 8) + 'L60 ' + (t + 4) + 'Z" fill="#fff4e0"/>'; break;
      case 'naocale': acc = '<circle cx="38" cy="52" r="12" fill="none" stroke="' + dark + '" stroke-width="3"/><circle cx="62" cy="52" r="12" fill="none" stroke="' + dark + '" stroke-width="3"/><path d="M50 52h0" stroke="' + dark + '" stroke-width="3"/><path d="M48 52h4" stroke="' + dark + '" stroke-width="3"/>'; break;
      case 'kruna': acc = '<path d="M30 ' + (t + 4) + 'L30 ' + (t - 12) + 'L40 ' + (t - 4) + 'L50 ' + (t - 16) + 'L60 ' + (t - 4) + 'L70 ' + (t - 12) + 'L70 ' + (t + 4) + 'Z" fill="#ffc93c" stroke="#c98a12" stroke-width="2"/>'; break;
    }
    const svg = '<svg class="av" viewBox="0 0 100 110" aria-hidden="true">' + shade + body + acc + eyes + mouth + '</svg>';
    avCache[k] = svg;
    return svg;
  }
  const bugSvg = '<svg viewBox="0 0 60 60" aria-hidden="true"><ellipse cx="30" cy="34" rx="20" ry="16" fill="#8b5a2b"/><circle cx="30" cy="20" r="11" fill="#5c3d1e"/><circle cx="25" cy="18" r="4" fill="#fff"/><circle cx="35" cy="18" r="4" fill="#fff"/><circle cx="26" cy="19" r="2" fill="#000"/><circle cx="36" cy="19" r="2" fill="#000"/><path d="M24 26q6 5 12 0" stroke="#fff" stroke-width="2" fill="none"/><path d="M12 30l-8-4M12 38l-9 2M48 30l8-4M48 38l9 2" stroke="#5c3d1e" stroke-width="3" stroke-linecap="round"/></svg>';
  const bombSvg = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="46" cy="58" r="34" fill="#1d1d2b"/><circle cx="34" cy="46" r="8" fill="#fff" opacity=".25"/><rect x="58" y="16" width="16" height="16" rx="3" fill="#555" transform="rotate(35 66 24)"/><path d="M70 18q10-12 18-6" stroke="#c98a12" stroke-width="4" fill="none"/><circle cx="89" cy="11" r="6" fill="#ffc93c"/></svg>';

  // ---------- stanje stranice ----------
  let roomNs = null, roomChecked = false;
  const roomReady = use('room').then((r) => { roomNs = r; roomChecked = true; if (mode === 'home') render(); return r; });
  let mode = 'home';            // home | join | player | host | demo
  let demoView = 'phone';       // phone | tv (u demo načinu)
  let game = null, hostRoom = null, hostErr = '', pubTimer = null, pubPending = false, emitWarned = false;
  let proom = null, waitTimer = null, perr = '', pcode = '', pname = '';
  let S = null, lastSig = '';
  let L = freshLocal(-1);
  let clockEnds = 0, clockDur = 0;

  let PID = store.get('mz_pid');
  if (!PID) { PID = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('mz_pid', PID); }
  let myAv = parseInt(store.get('mz_av'), 10);
  if (!(myAv >= 0 && myAv < 8)) myAv = Math.floor(Math.random() * 8);

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
  const baseUrl = () => JOIN_URL || store.get('mz_base') || '';

  // ---------- navigacija ----------
  function reset() {
    if (game) game.stop();
    clearInterval(pubTimer); clearTimeout(waitTimer); stopFxTimer();
    if (hostRoom) hostRoom.leave().catch(() => {});
    if (proom) proom.leave().catch(() => {});
    game = null; hostRoom = null; proom = null; S = null; hostErr = ''; perr = ''; lastSig = ''; emitWarned = false;
    L = freshLocal(-1);
    mode = 'home';
    render();
  }

  // ---------- domaćin (TV) ----------
  function readPeers(room) {
    const out = [];
    for (const p of room.peers()) {
      const pr = p.presence;
      if (!pr || pr.role !== 'p' || typeof pr.pid !== 'string' || typeof pr.name !== 'string') continue;
      out.push({ pid: pr.pid, name: pr.name, av: pr.av, in: pr.in && typeof pr.in === 'object' ? pr.in : null });
    }
    return out;
  }
  function publish() {
    if (!hostRoom || !game) return;
    hostRoom.emit('state', game.view()).catch((e) => {
      if (e && e.code === 'not_permitted' && !emitWarned) {
        emitWarned = true;
        hostErr = 'Ovaj račun ne može voditi igru. Otvori stranicu računom koji ju je objavio.';
        render();
      }
    });
  }
  function publishSoon() { if (pubPending) return; pubPending = true; setTimeout(() => { pubPending = false; publish(); }, 30); }

  async function startHost() {
    mode = 'host'; hostErr = ''; game = null; render();
    const ns = await roomReady;
    if (!ns) { hostErr = 'Povezivanje uređaja ne radi u ovom prikazu. Isprobaj demo ili otvori stranicu u Claude aplikaciji ili na claude.ai.'; return render(); }
    const user = await use('user');
    try { if (user && (await user.canEdit()) === false) { hostErr = 'Igru može voditi samo vlasnik ili urednik stranice.'; return render(); } } catch (e) {}
    const code = makeCode();
    try { hostRoom = await ns.join('mz-' + code.toLowerCase()); }
    catch (e) { hostErr = 'Ne mogu otvoriti sobu (' + ((e && e.code) || 'greška') + ').'; return render(); }
    game = createGame({ code, onChange: () => { publishSoon(); render(); } });
    hostRoom.presence({ role: 'h' }).catch(() => {});
    hostRoom.onPeers(() => game && game.syncPeers(readPeers(hostRoom)));
    game.syncPeers(readPeers(hostRoom));
    pubTimer = setInterval(publish, 1000);
    render(); publish();
  }

  // ---------- demo: ti + botovi na jednom uređaju ----------
  function startDemo() {
    mode = 'demo'; demoView = 'phone'; S = null; lastSig = ''; L = freshLocal(-1);
    game = createGame({ code: 'DEMO', onChange: () => { applyState(game.view()); if (demoView === 'tv') render(); } });
    const name = store.get('mz_name') || 'Ti';
    game.addPlayer(PID, name, myAv, false);
    const botAvs = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i !== game.view().P[0].a);
    ['Ana', 'Marko', 'Iva'].forEach((n, i) => game.addBot(n, botAvs[i]));
    render();
  }

  // ---------- igrač ----------
  async function joinGame(code, name) {
    pcode = code; pname = name; perr = ''; S = null; lastSig = ''; L = freshLocal(-1);
    store.set('mz_name', name);
    mode = 'player'; render();
    const ns = await roomReady;
    if (!ns) { perr = 'Povezivanje ne radi u ovom prikazu. Prijavi se na Claude i otvori link koji ti je poslao domaćin.'; mode = 'join'; return render(); }
    try { proom = await ns.join('mz-' + code.toLowerCase()); }
    catch (e) { perr = 'Ne mogu se spojiti na sobu (' + ((e && e.code) || 'greška') + ').'; mode = 'join'; return render(); }
    proom.on('state', (msg) => { const d = msg && msg.data; if (d && d.code === pcode && Array.isArray(d.P)) applyState(d); });
    proom.presence({ role: 'p', pid: PID, name: pname, av: myAv, in: null }).catch(() => {});
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      if (S) return;
      perr = 'Domaćin nije pronađen. Provjeri kod sobe i je li igra otvorena na TV-u.';
      if (proom) proom.leave().catch(() => {});
      proom = null; mode = 'join'; render();
    }, 9000);
  }

  function sendInput(inp) {
    inp.s = L.s;
    L.sent = inp;
    if (mode === 'demo') game.setInput(PID, inp);
    else if (proom) proom.presence({ in: inp }).catch(() => {});
    phoneRender(true);
  }
  function chooseAvatar(i) {
    myAv = i; store.set('mz_av', String(i));
    if (mode === 'demo') game.setAvatar(PID, i);
    else if (proom) proom.presence({ av: i }).catch(() => {});
  }

  const meOf = (d) => d && d.P.find((p) => p.id === PID);

  function applyState(d) {
    clearTimeout(waitTimer);
    const t = Date.now();
    if (!S || d.s !== L.s) {
      stopFxTimer();
      L = freshLocal(d.s);
      clockEnds = t + d.ms; clockDur = d.dur;
      L.start = t - (d.dur - d.ms);
      const me = meOf(d);
      if (d.ph === 'question' && me && me.fx) { L.fxq = me.fx.slice(); L.fx = makeFx(L.fxq[0]); }
    }
    S = d;
    if (mode === 'player' || (mode === 'demo' && demoView === 'phone')) {
      const sig = phoneSig(d);
      if (sig !== lastSig) { lastSig = sig; phoneRender(false); }
    }
  }
  function phoneSig(d) {
    const me = meOf(d) || null;
    const roster = (d.ph === 'lobby' || d.ph === 'power' || d.ph === 'final') ? d.P.map((p) => [p.id, p.n, p.a, p.c]) : null;
    return JSON.stringify([d.ph, d.s, me, d.cats, d.cw, d.q, d.so, d.li, d.cor, d.win, d.it, d.ev, roster]);
  }

  // ---------- efekti moći ----------
  function makeFx(k) {
    if (!k) return null;
    if (k === 'led') return { k, hits: 0, need: 7 };
    if (k === 'sluz') return { k, cells: new Array(48).fill(1), left: 48 };
    if (k === 'grick') return { k, bugs: Array.from({ length: 5 }, () => ({ x: 10 + Math.random() * 80, y: 12 + Math.random() * 76, on: true })) };
    if (k === 'bomba') return { k, taps: 0, need: 4, ends: Date.now() + 5000, boom: false };
    return null;
  }
  function stopFxTimer() { if (L && L.fxTimer) { clearInterval(L.fxTimer); L.fxTimer = null; } }
  function fxDone() {
    stopFxTimer();
    L.fxq.shift();
    L.fx = makeFx(L.fxq[0]);
    if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
    phoneRender(true);
  }
  const FX_LABEL = { led: 'Zaleđen si! Tapkaj da razbiješ led', sluz: 'Sluz! Obriši je prstom', grick: 'Grickalice! Zgnječi sve bubice', bomba: 'Bomba! Tapni je da je odbaciš' };
  function fxHtml(fx) {
    if (!fx) return '';
    const label = '<div class="fx-label">' + FX_LABEL[fx.k] + '</div>';
    if (fx.k === 'led') {
      const crack = Math.min(1, fx.hits / fx.need);
      let lines = '';
      for (let i = 0; i < fx.hits; i++) {
        const x = 15 + ((i * 37) % 70), y = 20 + ((i * 53) % 60);
        lines += '<path d="M' + x + ' ' + y + 'l' + (8 + i) + ' ' + (10 - i) + 'l-6 ' + (12 + i) + 'M' + x + ' ' + y + 'l-' + (10 + i) + ' 6" stroke="#fff" stroke-width="1.4" fill="none"/>';
      }
      return '<div class="fx fx-led" id="fx" style="opacity:' + (1 - crack * 0.35) + '">' + label +
        '<svg class="cracks" viewBox="0 0 100 100" preserveAspectRatio="none">' + lines + '</svg><div class="ice-txt">' + (fx.need - fx.hits) + '</div></div>';
    }
    if (fx.k === 'sluz') {
      let cells = '';
      fx.cells.forEach((on) => { cells += '<div class="cell' + (on ? '' : ' gone') + '"></div>'; });
      return '<div class="fx fx-sluz" id="fx" style="grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(8,1fr)">' + label + cells + '</div>';
    }
    if (fx.k === 'grick') {
      let bugs = '';
      fx.bugs.forEach((b, i) => { if (b.on) bugs += '<button class="bug" data-b="' + i + '" style="left:' + b.x + '%;top:' + b.y + '%" aria-label="Zgnječi bubicu">' + bugSvg + '</button>'; });
      return '<div class="fx fx-grick" id="fx">' + label + bugs + '</div>';
    }
    if (fx.k === 'bomba') {
      const left = Math.max(0, Math.ceil((fx.ends - Date.now()) / 1000));
      return '<div class="fx fx-bomba' + (fx.boom ? ' boom' : '') + '" id="fx">' + label +
        (fx.boom ? '' : '<button class="bomb-btn" id="bomb" aria-label="Odbaci bombu">' + bombSvg + '</button><div class="bomb-num" id="bombnum">' + left + '</div>') + '</div>';
    }
    return '';
  }
  function bindFx() {
    const el = document.getElementById('fx');
    const fx = L.fx;
    if (!el || !fx) return;
    if (fx.k === 'led') {
      el.onpointerdown = (e) => {
        e.preventDefault();
        fx.hits++;
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (er) {} }
        if (fx.hits >= fx.need) return fxDone();
        el.outerHTML = fxHtml(fx); bindFx();
        const n = document.getElementById('fx'); if (n) n.classList.add('shake');
      };
    } else if (fx.k === 'sluz') {
      const cells = el.querySelectorAll('.cell');
      const wipe = (e) => {
        const r = el.getBoundingClientRect();
        const cx = Math.floor(((e.clientX - r.left) / r.width) * 6), cy = Math.floor(((e.clientY - r.top) / r.height) * 8);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) + Math.abs(dy) > 1) continue;
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x > 5 || y < 0 || y > 7) continue;
          const i = y * 6 + x;
          if (fx.cells[i]) { fx.cells[i] = 0; fx.left--; if (cells[i]) cells[i].classList.add('gone'); }
        }
        if (fx.left <= 5) fxDone();
      };
      let down = false;
      el.onpointerdown = (e) => { e.preventDefault(); down = true; try { el.setPointerCapture(e.pointerId); } catch (er) {} wipe(e); };
      el.onpointermove = (e) => { if (down) wipe(e); };
      el.onpointerup = el.onpointercancel = () => { down = false; };
    } else if (fx.k === 'grick') {
      el.querySelectorAll('.bug').forEach((b) => {
        b.onpointerdown = (e) => {
          e.preventDefault(); e.stopPropagation();
          fx.bugs[+b.dataset.b].on = false; b.remove();
          if (navigator.vibrate) { try { navigator.vibrate(20); } catch (er) {} }
          if (!fx.bugs.some((x) => x.on)) fxDone();
        };
      });
      el.onpointerdown = (e) => e.preventDefault();
      if (!L.fxTimer) L.fxTimer = setInterval(() => {
        const f = L.fx; if (!f || f.k !== 'grick') return stopFxTimer();
        document.querySelectorAll('.bug').forEach((b) => {
          const bug = f.bugs[+b.dataset.b];
          bug.x = Math.max(8, Math.min(92, bug.x + (Math.random() - 0.5) * 30));
          bug.y = Math.max(10, Math.min(90, bug.y + (Math.random() - 0.5) * 30));
          b.style.left = bug.x + '%'; b.style.top = bug.y + '%';
        });
      }, 700);
    } else if (fx.k === 'bomba') {
      el.onpointerdown = (e) => e.preventDefault();
      const btn = document.getElementById('bomb');
      if (btn) btn.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation();
        fx.taps++;
        if (fx.taps >= fx.need) { fx.boom = false; return fxDone(); }
        btn.style.transform = 'scale(' + (1 - fx.taps * 0.12) + ') rotate(' + (fx.taps * 25) + 'deg)';
      };
      if (!L.fxTimer) L.fxTimer = setInterval(() => {
        const f = L.fx; if (!f || f.k !== 'bomba') return stopFxTimer();
        const left = f.ends - Date.now();
        const n = document.getElementById('bombnum');
        if (n) n.textContent = Math.max(0, Math.ceil(left / 1000));
        if (left <= 0 && !f.boom) {
          f.boom = true; stopFxTimer();
          if (navigator.vibrate) { try { navigator.vibrate([80, 40, 120]); } catch (er) {} }
          phoneRender(true);
          setTimeout(() => { if (L.fx === f) fxDone(); }, 900);
        }
      }, 150);
    }
  }

  // ---------- zajednički dijelovi ----------
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  const byScore = (P) => P.slice().sort((a, b) => b.sc - a.sc);
  const nameOf = (d, id) => { const p = d.P.find((x) => x.id === id); return p ? p.n : '?'; };
  const avOf = (d, id) => { const p = d.P.find((x) => x.id === id); return p ? p.a : 0; };
  function timerHtml(urgentAt) { return '<div class="timer" id="timer" data-u="' + (urgentAt || 5000) + '"><div id="tbar"></div></div>'; }
  function lineup(d, opts) {
    opts = opts || {};
    return '<div class="lineup">' + d.P.map((p) => {
      let badge = '';
      if (opts.check && p.ok) badge = '<span class="badge">✓</span>';
      if (opts.gain && p.g) badge = '<span class="badge gain">+' + p.g + '</span>';
      const fx = opts.fx && p.fx ? p.fx.map((k) => ICON[k]).join('') : '';
      const extra = (opts.fx && p.sh ? '🛡️' : '') + (opts.fx && p.d ? '✖️2' : '');
      const mood = opts.mood ? opts.mood(p) : (p.fx && opts.fx ? 'dizzy' : '');
      return '<div class="who' + (p.c ? '' : ' off') + '">' + badge +
        '<div class="fxrow">' + fx + extra + '</div><div class="bob" style="width:100%">' + avSvg(p.a, mood) + '</div>' +
        '<div class="nm">' + esc(p.n) + '</div><div class="sc">' + p.sc + '</div></div>';
    }).join('') + '</div>';
  }
  function evHtml(d) {
    if (!d.ev || !d.ev.length) return '';
    return '<div class="events">' + d.ev.map((e) => {
      if (e.t) return '<span class="ev' + (e.b ? ' blocked' : '') + '"><span class="mini">' + avSvg(avOf(d, e.f)) + '</span>' + esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + ' ' + esc(nameOf(d, e.t)) + (e.b ? ' 🛡️' : '') + '</span>';
      return '<span class="ev"><span class="mini">' + avSvg(avOf(d, e.f)) + '</span>' + esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + '</span>';
    }).join('') + '</div>';
  }

  // ---------- glavni prikaz ----------
  function render() {
    try {
      if (mode === 'home') return homeV();
      if (mode === 'join') return joinV();
      if (mode === 'player') return phoneRender(true);
      if (mode === 'demo') return demoView === 'tv' ? tvV(game.view()) : phoneRender(true);
      return hostV();
    } catch (e) { crash(e); }
  }
  function crash(e) {
    $app.className = 'screen center';
    $app.innerHTML = '<div class="err">Nešto je pošlo po krivu: ' + esc(e && e.message) + '</div><button class="btn" id="home">Početna</button>';
    bind('home', reset);
  }

  function homeV() {
    $app.className = 'screen center';
    const hint = roomChecked && !roomNs ? '<div class="err">Povezivanje uređaja ne radi u ovom prikazu. Demo i dalje radi.</div>' : '';
    const faces = [0, 3, 6, 4].map((i) => '<span style="width:64px" class="bob">' + avSvg(i, 'happy') + '</span>').join('');
    $app.innerHTML =
      '<div class="logo">MOZGALICA<small>KVIZ · MOĆI · PIRAMIDA</small></div>' +
      '<div class="lineup" style="gap:10px">' + faces + '</div>' +
      '<div class="stack">' + hint +
      '<button class="btn" id="host">Otvori igru na TV-u</button>' +
      '<button class="btn" id="join">Pridruži se s mobitelom</button>' +
      '<button class="btn ghost" id="demo">Probaj sam protiv botova</button></div>' +
      '<div class="note">2 do 6 igrača. TV prikazuje igru, a svi igraju s mobitela: glasaju za kategoriju, šalju moći protivnicima i odgovaraju.</div>';
    bind('host', startHost); bind('join', () => { mode = 'join'; render(); }); bind('demo', startDemo);
  }

  function joinV() {
    $app.className = 'screen phone';
    const m = (location.hash || '').match(/^#?([A-Za-z]{4})$/);
    const code = pcode || (m ? m[1].toUpperCase() : '');
    const name = pname || store.get('mz_name') || '';
    $app.innerHTML =
      '<div class="logo" style="font-size:2.4rem;text-align:center">MOZGALICA</div>' +
      '<form class="form" id="form" autocomplete="off">' + (perr ? '<div class="err">' + esc(perr) + '</div>' : '') +
      '<div><label for="code">Kod sobe</label><input id="code" class="code" maxlength="4" value="' + esc(code) + '" autocapitalize="characters" autocomplete="off"></div>' +
      '<div><label for="name">Tvoje ime</label><input id="name" maxlength="12" value="' + esc(name) + '" placeholder="npr. Mateo" autocomplete="off"></div>' +
      '<button class="btn" type="submit">Uđi u igru</button><button class="btn ghost" type="button" id="back">Natrag</button></form>';
    document.getElementById('form').onsubmit = (e) => {
      e.preventDefault();
      const c = document.getElementById('code').value.trim().toUpperCase();
      const n = document.getElementById('name').value.trim();
      if (!/^[A-Z]{4}$/.test(c) || !n) { perr = 'Upiši četveroslovni kod sobe i svoje ime.'; pcode = c; pname = n; return joinV(); }
      joinGame(c, n);
    };
    bind('back', () => { perr = ''; pcode = ''; mode = 'home'; render(); });
    if (code && !name) { const el = document.getElementById('name'); if (el) el.focus(); }
  }

  function hostV() {
    if (hostErr) {
      $app.className = 'screen center';
      $app.innerHTML = '<div class="err">' + esc(hostErr) + '</div><button class="btn" id="home">Natrag</button>';
      return bind('home', reset);
    }
    if (!game) { $app.className = 'screen center'; $app.innerHTML = '<div class="logo">MOZGALICA</div><div class="note">Otvaram sobu…</div>'; return; }
    tvV(game.view());
  }

  // ---------- TV ----------
  function tvTop(d, label) {
    return '<div class="tv-top"><span class="rl">' + esc(d.rl || '') + '</span><span class="tv-sub" style="flex:1">' + (label || '') + '</span><span class="tv-num" id="tnum"></span></div>';
  }
  function tvV(d) {
    clockEnds = Date.now() + d.ms; clockDur = d.dur;
    $app.className = 'screen tv';
    let h = '';
    const demoBar = mode === 'demo' ? '<div class="demo-bar"><span class="pill">DEMO · TV prikaz</span><button class="btn ghost" id="toPhone">📱 Natrag na mobitel</button></div>' : '';
    switch (d.ph) {
      case 'lobby': return tvLobby(d, demoBar);
      case 'intro':
        h = '<div class="intro-card"><div class="big">' + esc(d.it.t) + '</div><div class="sub">' + esc(d.it.sub) + '</div></div>' + lineup(d);
        break;
      case 'vote': case 'voteResult': {
        const doors = d.cats.map((c, i) => {
          const voters = d.P.filter((p) => p.vt === i).map((p) => '<span>' + avSvg(p.a) + '</span>').join('');
          const cls = d.ph === 'voteResult' ? (i === d.cw ? ' win' : ' lose') : '';
          return '<div class="door o' + i + cls + '"><div class="dn">' + esc(c) + '</div><div class="voters">' + voters + '</div><span class="knob"></span></div>';
        }).join('');
        h = tvTop(d, d.ph === 'vote' ? 'Glasajte za kategoriju!' : 'Kategorija: ' + esc(d.cats[d.cw])) +
          (d.ph === 'vote' ? timerHtml() : '') + '<div class="tv-mid"><div class="doors">' + doors + '</div></div>' + lineup(d, { check: d.ph === 'vote' });
        break;
      }
      case 'power': {
        const legend = Object.keys(POWERS).map((k) => '<div class="pw-mini"><span class="pw-ico">' + ICON[k] + '</span><div><b>' + POWERS[k].n + '</b><span>' + POWERS[k].d + '</span></div></div>').join('');
        h = tvTop(d, 'Odaberite moć na mobitelu') + timerHtml() +
          '<div class="tv-mid"><div class="tv-title">Vrijeme je za moći!</div><div class="powers-legend">' + legend + '</div></div>' + lineup(d, { check: true });
        break;
      }
      case 'question': case 'reveal': {
        const rev = d.ph === 'reveal';
        const opts = d.q.o.map((o, i) => '<div class="opt o' + i + (rev ? (i === d.cor ? ' correct' : ' dim') : '') + '"><span class="shape">' + SHAPES[i] + '</span><span class="txt">' + esc(o) + '</span>' + (rev && d.cnt ? '<span class="cnt">' + d.cnt[i] + '</span>' : '') + '</div>').join('');
        h = tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + (rev ? '' : timerHtml()) +
          '<div class="tv-mid"><div class="q-text">' + esc(d.q.t) + '</div><div class="opts">' + opts + '</div>' + evHtml(d) + '</div>' +
          lineup(d, rev ? { gain: true, mood: (p) => (p.ch === d.cor ? 'happy' : 'dizzy') } : { check: true, fx: true });
        if (rev) h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
        break;
      }
      case 'sort': case 'sortReveal': {
        const rev = d.ph === 'sortReveal';
        const col = (side) => d.so.it.map((x, i) => (rev ? (d.so.key[i] === side ? '<span class="chip">' + esc(x) + '</span>' : '') : '')).join('');
        h = tvTop(d, rev ? 'Rješenje' : 'Razvrstajte pojmove na mobitelu!') + (rev ? '' : timerHtml(8000)) +
          '<div class="tv-mid"><div class="tv-title">Izazov: razvrstavanje</div><div class="sort-cols">' +
          '<div class="sort-col a"><h3>' + esc(d.so.a) + '</h3><div class="chips">' + col(0) + '</div></div>' +
          '<div class="sort-col b"><h3>' + esc(d.so.b) + '</h3><div class="chips">' + col(1) + '</div></div></div>' +
          (rev ? '' : '<div class="chips">' + d.so.it.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>') + '</div>' +
          lineup(d, rev ? { gain: true } : { check: true });
        if (rev) h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
        break;
      }
      case 'link': case 'linkReveal': {
        const rev = d.ph === 'linkReveal';
        const pairs = d.li.L.map((l, i) => '<div class="pair"><span>' + esc(l) + '</span><span class="arrow">→</span><span>' + (rev ? esc(d.li.R[d.li.key[i]]) : '?') + '</span></div>').join('');
        h = tvTop(d, rev ? 'Rješenje' : 'Spojite parove na mobitelu!') + (rev ? '' : timerHtml(8000)) +
          '<div class="tv-mid"><div class="tv-title">Izazov: ' + esc(d.li.t) + '</div><div class="pairs card">' + pairs + '</div>' +
          (rev ? '' : '<div class="chips">' + d.li.R.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>') + '</div>' +
          lineup(d, rev ? { gain: true } : { check: true });
        if (rev) h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
        break;
      }
      case 'fq': case 'fr': {
        const rev = d.ph === 'fr';
        const tf = d.q.o.map((o, i) => '<div class="opt o' + (i === 0 ? 3 : 0) + (rev ? (i === d.cor ? ' correct' : ' dim') : '') + '" style="justify-content:center"><span class="txt" style="text-align:center">' + esc(o) + '</span></div>').join('');
        h = tvTop(d, 'Točno ili netočno? Točan odgovor = stepenica više, najbrži = dvije!') + (rev ? '' : timerHtml(3000)) +
          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="q-text">' + esc(d.q.t) + '</div><div class="tf-row">' + tf + '</div></div>' +
          pyramidHtml(d, rev) + '</div>';
        break;
      }
      case 'final': {
        const w = d.P.find((p) => p.id === d.win) || d.P[0];
        const ranked = d.P.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || b.sc - a.sc);
        h = '<div class="winner"><div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center">' +
          '<div class="logo" style="font-size:clamp(2rem,5vw,4.4rem)">POBJEDNIK!</div><div class="champ">' + avSvg(w.a, 'happy') + '</div>' +
          '<div class="tv-title">' + esc(w.n) + '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:10px">' +
          ranked.map((p, i) => '<div class="rank-row"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a) + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + ' b · ' + (p.st || 0) + '/' + d.steps + '</span></div>').join('') +
          '<div class="scroll"><b>Nagrada za pobjednika: zanimljivost</b>' + esc(d.fact) + '</div>' +
          '<div class="actions">' + (mode === 'demo' ? '<button class="btn" id="again">Igraj opet</button>' : '<button class="btn" id="again">Nova igra</button>') + '<button class="btn ghost" id="quit">Izlaz</button></div></div></div>';
        break;
      }
    }
    $app.innerHTML = demoBar + h;
    bind('skip', () => game.skip());
    bind('again', () => { game.restart(); });
    bind('quit', reset);
    bind('toPhone', () => { demoView = 'phone'; lastSig = ''; render(); });
    tick();
  }

  function pyramidHtml(d, rev) {
    let rows = '';
    for (let s = d.steps; s >= 0; s--) {
      const w = 34 + (d.steps - s) * (62 / d.steps);
      const here = d.P.filter((p) => (p.st || 0) === s).map((p) => '<span class="climber">' + (rev && p.mv ? '<span class="up">+' + p.mv + '</span>' : '') + avSvg(p.a, rev ? (p.mv ? 'happy' : 'dizzy') : '') + '</span>').join('');
      rows += '<div class="pstep' + (s === d.steps ? ' top' : '') + '" style="width:' + w + '%"><span class="lv">' + (s === d.steps ? '★' : s) + '</span>' + here + '</div>';
    }
    return '<div class="pyramid">' + rows + '</div>';
  }

  function tvLobby(d, demoBar) {
    let join;
    if (mode === 'demo') join = '<div class="card join-card"><div class="tv-title">Demo</div><div class="tv-sub">Botovi igraju s tobom. Na pravoj igri ovdje je QR kod.</div></div>';
    else {
      const base = baseUrl();
      const svg = base ? qrSvg(base.split('#')[0] + '#' + d.code) : '';
      join = '<div class="card join-card">' + (svg ? '<div class="qr">' + svg + '</div>' : '') +
        (base ? '' : '<div class="tv-sub">Zalijepi link ove stranice da se napravi QR kod.</div><div class="field-row"><input id="baseurl" placeholder="https://claude.ai/…" inputmode="url" autocomplete="off"><button class="btn ghost" id="savebase">Spremi</button></div>') +
        '<div class="tv-sub">Skeniraj QR ili otvori stranicu i upiši kod</div><div class="room-code">' + esc(d.code) + '</div></div>';
    }
    const on = d.P.filter((p) => p.c).length;
    $app.innerHTML = demoBar +
      '<div class="logo" style="text-align:center">MOZGALICA<small>ODABERITE LIKOVE NA MOBITELIMA</small></div>' +
      '<div class="lobby-grid">' + join + '<div class="card lobby-cast"><h2 class="h" style="font-size:clamp(1.4rem,2.6vw,2.4rem)">Igrači ' + d.P.length + '/' + d.max + '</h2>' +
      (d.P.length ? lineup(d) : '<div class="tv-sub">Čekamo prve igrače…</div>') +
      '<div class="actions"><button class="btn" id="start"' + (on < 1 ? ' disabled' : '') + '>Započni igru</button><button class="btn ghost" id="quit">Odustani</button></div></div></div>';
    bind('start', () => game.start());
    bind('quit', reset);
    bind('toPhone', () => { demoView = 'phone'; lastSig = ''; render(); });
    bind('savebase', () => {
      const el = document.getElementById('baseurl'); const v = el ? el.value.trim() : '';
      if (/^https:\/\//.test(v)) { store.set('mz_base', v); render(); }
    });
  }

  // ---------- mobitel ----------
  function phoneRender(force) {
    try {
      if (!(mode === 'player' || (mode === 'demo' && demoView === 'phone'))) return;
      if (force && S) lastSig = phoneSig(S);
      phoneV();
    } catch (e) { crash(e); }
  }
  function phoneV() {
    $app.className = 'screen phone';
    const d = S;
    if (!d) { $app.className = 'screen phone center'; $app.innerHTML = '<div class="logo" style="font-size:2.4rem">MOZGALICA</div><div class="p-title">Spajam se…</div><div class="p-sub">Soba ' + esc(pcode) + '</div>'; return; }
    const me = meOf(d);
    const demoBar = mode === 'demo' ? '<div class="demo-bar"><span class="pill">DEMO</span><button class="btn ghost" id="toTv">📺 Pogledaj TV</button></div>' : '';
    const head = me ? '<div class="p-top"><span class="p-me"><span class="mini">' + avSvg(me.a) + '</span><span>' + esc(me.n) + '</span></span><span>' + esc(d.rl || '') + '</span><span>' + me.sc + ' b</span></div>' : '';
    const center = (inner) => { $app.className = 'screen phone center'; return inner; };
    let h = '';
    if (!me) {
      h = center(d.ph === 'lobby' ? '<div class="p-title">Prijavljujem te…</div>' : '<div class="p-title">Igra je u tijeku</div><div class="p-sub">Pričekaj kraj pa uđi u sljedeću igru.</div>');
    } else switch (d.ph) {
      case 'lobby': {
        const taken = {}; d.P.forEach((p) => { if (p.id !== PID) taken[p.a] = p.n; });
        const grid = AV.map((a, i) => '<button class="av-pick' + (me.a === i ? ' me' : '') + '" data-av="' + i + '"' + (taken[i] !== undefined ? ' disabled' : '') + '>' + avSvg(i, me.a === i ? 'happy' : '') + '<span>' + esc(taken[i] !== undefined ? taken[i] : a.n) + '</span></button>').join('');
        h = '<div class="p-title">Bok, ' + esc(me.n) + '!</div><div class="p-sub">Odaberi svog lika</div><div class="av-grid">' + grid + '</div>' +
          (mode === 'demo'
            ? '<button class="btn" id="dstart">Započni igru</button><div class="p-sub">Igraš protiv tri bota. Bacat će moći i na tebe!</div>'
            : '<div class="waiting">U sobi ' + esc(d.code) + ' · ' + d.P.length + ' igrača. Igra počinje kad domaćin pritisne „Započni“.</div>') +
          '<button class="btn ghost" id="leave">Izađi</button>';
        break;
      }
      case 'intro':
        h = center('<div class="p-title" style="font-size:3rem;color:var(--gold)">' + esc(d.it.t) + '</div><div class="p-sub">' + esc(d.it.sub) + '</div><div style="width:130px" class="bob">' + avSvg(me.a, 'happy') + '</div>');
        break;
      case 'vote': {
        const mine = L.sent ? L.sent.v : (me.ok ? -2 : -1);
        h = head + timerHtml() + '<div class="p-title">Glasaj za kategoriju</div><div class="door-btns">' +
          d.cats.map((c, i) => '<button class="door-btn o' + i + (mine === i ? ' picked' : '') + '" data-v="' + i + '"' + (mine !== -1 ? ' disabled' : '') + '>' + esc(c) + '</button>').join('') + '</div>' +
          (mine !== -1 ? '<div class="waiting">Glas zaprimljen ✔</div>' : '');
        break;
      }
      case 'voteResult':
        h = center(head + '<div class="p-sub">Kategorija je</div><div class="p-title" style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</div>');
        break;
      case 'power': h = head + timerHtml() + powerPhone(d, me); break;
      case 'question': h = head + questionPhone(d, me); break;
      case 'reveal': h = head + revealPhone(d, me); break;
      case 'sort': h = head + timerHtml(8000) + sortPhone(d, me); break;
      case 'link': h = head + timerHtml(8000) + linkPhone(d, me); break;
      case 'sortReveal': case 'linkReveal': {
        const tot = d.ph === 'sortReveal' ? d.so.it.length : d.li.L.length;
        h = center(head + '<div class="result ' + (me.k ? 'ok' : 'none') + '"><div class="p-title">Točno ' + me.k + ' od ' + tot + '</div><div class="pts">+' + (me.g || 0) + '</div></div>' + rankStat(d, me));
        break;
      }
      case 'fq': h = head + finalePhone(d, me); break;
      case 'fr': {
        const ok = me.ch === d.cor;
        h = center(head + '<div class="result ' + (ok ? 'ok' : me.ch >= 0 ? 'bad' : 'none') + '"><div class="p-title">' + (ok ? (me.mv === 2 ? 'Najbrži! +2 stepenice' : 'Točno! +1 stepenica') : me.ch >= 0 ? 'Netočno, ostaješ' : 'Prespor!') + '</div>' +
          '<div class="p-sub">Bilo je: <b>' + esc(d.q.o[d.cor]) + '</b></div></div>' + stepMeter(d, me));
        break;
      }
      case 'final': {
        const won = d.win === PID;
        const ranked = d.P.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || b.sc - a.sc);
        const pos = ranked.findIndex((p) => p.id === PID) + 1;
        h = center('<div style="width:150px">' + avSvg(me.a, won ? 'happy' : '') + '</div><div class="p-title" style="font-size:2.4rem;color:var(--gold)">' + (won ? 'Pobijedio si!' : pos + '. mjesto') + '</div>' +
          (won ? '<div class="scroll"><b>Tvoja nagrada: zanimljivost</b>' + esc(d.fact) + '</div>' : '<div class="p-sub">Pobjednik je ' + esc(nameOf(d, d.win)) + '.</div>') +
          '<div class="statline"><div class="stat"><b>' + me.sc + '</b><span>bodova</span></div><div class="stat"><b>' + (me.st || 0) + '/' + d.steps + '</b><span>piramida</span></div></div>' +
          (mode === 'demo' ? '<button class="btn" id="dagain">Igraj opet</button>' : '<div class="p-sub">Domaćin može pokrenuti novu igru.</div>') + '<button class="btn ghost" id="leave">Izađi</button>');
        break;
      }
    }
    $app.innerHTML = demoBar + h;
    bindPhone(d, me);
    tick();
  }

  function rankStat(d, me) {
    const pos = byScore(d.P).findIndex((p) => p.id === PID) + 1;
    return '<div class="statline"><div class="stat"><b>' + pos + '.</b><span>mjesto</span></div><div class="stat"><b>' + me.sc + '</b><span>bodova</span></div></div>';
  }
  function stepMeter(d, me) {
    let bars = '';
    for (let s = 1; s <= d.steps; s++) bars += '<i class="' + ((me.st || 0) >= s ? 'on' : '') + '" style="width:' + (40 + (d.steps - s) * 18) + 'px"></i>';
    return '<div class="step-meter" aria-label="Stepenica ' + (me.st || 0) + ' od ' + d.steps + '">' + bars + '</div><div class="p-sub">Stepenica ' + (me.st || 0) + ' od ' + d.steps + '</div>';
  }

  function powerPhone(d, me) {
    if (L.sent || me.ok) {
      const k = L.sent && L.sent.p;
      return '<div class="result none"><div class="p-title">' + (k ? ICON[k] + ' ' + POWERS[k].n : 'Bez moći') + '</div>' +
        (k && L.sent.t ? '<div class="p-sub">Meta: <b>' + esc(nameOf(d, L.sent.t)) + '</b></div>' : '') + '<div class="waiting">Čekamo ostale…</div></div>';
    }
    if (L.pw) {
      const others = d.P.filter((p) => p.id !== PID && p.c);
      return '<div class="p-title">' + ICON[L.pw] + ' ' + POWERS[L.pw].n + ': na koga?</div><div class="targets">' +
        others.map((p) => '<button class="target" data-t="' + esc(p.id) + '"><span class="mini">' + avSvg(p.a) + '</span>' + esc(p.n) + '<span class="tag">' + p.sc + ' b</span></button>').join('') +
        '</div><button class="btn ghost" id="pwback">Natrag</button>';
    }
    const offers = me.of || [];
    return '<div class="p-title">Odaberi moć</div><div class="pw-cards">' +
      offers.map((k) => '<button class="pw-card ' + (POWERS[k].atk ? 'atk' : 'buff') + '" data-p="' + k + '"><span class="pw-ico">' + ICON[k] + '</span><span><b>' + POWERS[k].n + '</b><span>' + POWERS[k].d + '</span></span></button>').join('') +
      '</div><button class="btn ghost" id="nopw">Preskoči</button>';
  }

  function questionPhone(d, me) {
    const answered = L.sent || me.ok;
    const mine = L.sent ? L.sent.c : -1;
    const hide = me.h || [];
    const buffs = (me.d ? '<span class="tag" style="background:var(--gold);color:#2b1a00">✖️2 Dupli bodovi</span>' : '') + (me.sh ? '<span class="tag">🛡️ Štit</span>' : '') + (hide.length ? '<span class="tag">✂️ Pola-pola</span>' : '');
    const opts = d.q.o.map((o, i) => {
      const gone = hide.includes(i);
      let cls = 'p-opt o' + i + (gone ? ' gone' : '');
      if (answered && !gone) cls += mine === i ? ' picked' : ' dim';
      return '<button class="' + cls + '" data-c="' + i + '"' + (answered || gone ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');
    const attackers = (d.ev || []).filter((e) => e.t === PID);
    const hit = attackers.length ? '<div class="p-sub">' + attackers.map((e) => esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + (e.b ? ' (odbijeno)' : '')).join(' · ') + '</div>' : '';
    return timerHtml() + '<div class="p-top"><span class="pill">' + esc(d.q.c) + '</span><span id="tnum"></span></div>' +
      '<div class="p-q">' + esc(d.q.t) + '</div>' + (buffs ? '<div class="buffs">' + buffs + '</div>' : '') + hit +
      '<div class="q-area"><div class="p-opts">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx)) + '</div>' +
      '<div class="waiting">' + (answered ? 'Odgovor zaprimljen ✔' : L.fx ? '' : 'Brže = više bodova!') + '</div>';
  }

  function revealPhone(d, me) {
    const ok = me.ch === d.cor;
    const cls = ok ? 'ok' : me.ch >= 0 ? 'bad' : 'none';
    const title = ok ? 'Točno!' : me.ch >= 0 ? 'Netočno' : 'Vrijeme je isteklo';
    return '<div class="result ' + cls + '"><div style="width:110px">' + avSvg(me.a, ok ? 'happy' : 'dizzy') + '</div><div class="p-title">' + title + '</div>' +
      (ok ? '<div class="pts">+' + me.g + (me.d ? ' (×2)' : '') + '</div>' : '<div class="p-sub">Točan odgovor: <b>' + SHAPES[d.cor] + ' ' + esc(d.q.o[d.cor]) + '</b></div>') + '</div>' + rankStat(d, me);
  }

  function progress(n, done) { let s = ''; for (let i = 0; i < n; i++) s += '<i class="' + (i < done ? 'done' : '') + '"></i>'; return '<div class="progress">' + s + '</div>'; }

  function sortPhone(d, me) {
    const n = d.so.it.length;
    if (L.sent || me.ok || L.sortI >= n) return '<div class="result none"><div class="p-title">Poslano ✔</div><div class="waiting">Čekamo ostale…</div></div>';
    return '<div class="p-title" style="font-size:1.4rem">Gdje pripada?</div>' + progress(n, L.sortI) +
      '<div class="sort-card">' + esc(d.so.it[L.sortI]) + '</div>' +
      '<div class="sort-btns"><button class="sort-btn a" data-s="0">' + esc(d.so.a) + '</button><button class="sort-btn b" data-s="1">' + esc(d.so.b) + '</button></div>';
  }
  function linkPhone(d, me) {
    const n = d.li.L.length;
    if (L.sent || me.ok || L.linkI >= n) return '<div class="result none"><div class="p-title">Poslano ✔</div><div class="waiting">Čekamo ostale…</div></div>';
    return '<div class="p-title" style="font-size:1.4rem">' + esc(d.li.t) + '</div>' + progress(n, L.linkI) +
      '<div class="sort-card">' + esc(d.li.L[L.linkI]) + '</div><div class="link-opts">' +
      d.li.R.map((r, i) => '<button class="link-opt" data-l="' + i + '">' + esc(r) + '</button>').join('') + '</div>';
  }
  function finalePhone(d, me) {
    const answered = L.sent || me.ok;
    const mine = L.sent ? L.sent.c : -1;
    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + (i === 0 ? 3 : 0) + (answered ? (mine === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '>' + esc(o) + '</button>').join('');
    return timerHtml(3000) + '<div class="p-top"><span class="pill">Finale · stepenica ' + (me.st || 0) + '/' + d.steps + '</span><span id="tnum"></span></div>' +
      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div><div class="p-opts two">' + opts + '</div>' +
      (answered ? '<div class="waiting">Zaprimljeno ✔</div>' : '');
  }

  function bindPhone(d, me) {
    bind('toTv', () => { demoView = 'tv'; render(); });
    bind('leave', reset);
    bind('dstart', () => game.start());
    bind('dagain', () => { game.restart(); });
    $app.querySelectorAll('[data-av]').forEach((b) => { b.onclick = () => chooseAvatar(+b.dataset.av); });
    $app.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ v: +b.dataset.v }); }; });
    $app.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.p;
        if (POWERS[k].atk) { L.pw = k; phoneRender(true); } else sendInput({ p: k });
      };
    });
    $app.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => sendInput({ p: L.pw, t: b.dataset.t }); });
    bind('pwback', () => { L.pw = null; phoneRender(true); });
    bind('nopw', () => sendInput({ p: '' }));
    $app.querySelectorAll('[data-c]').forEach((b) => {
      b.onclick = () => {
        if (L.sent || L.fx) return;
        if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) {} }
        sendInput({ c: +b.dataset.c, t: Math.max(0, Math.round(Date.now() - L.start)) });
      };
    });
    $app.querySelectorAll('[data-s]').forEach((b) => {
      b.onclick = () => {
        L.sortR.push(+b.dataset.s); L.sortI++;
        if (L.sortI >= d.so.it.length) sendInput({ r: L.sortR.slice() }); else phoneRender(true);
      };
    });
    $app.querySelectorAll('[data-l]').forEach((b) => {
      b.onclick = () => {
        L.linkR.push(+b.dataset.l); L.linkI++;
        if (L.linkI >= d.li.L.length) sendInput({ r: L.linkR.slice() }); else phoneRender(true);
      };
    });
    if (d.ph === 'question' && L.fx && !(L.sent || (me && me.ok))) bindFx();
  }

  // ---------- odbrojavanje ----------
  function tick() {
    const ms = Math.max(0, clockEnds - Date.now());
    const bar = document.getElementById('tbar'), num = document.getElementById('tnum'), wrap = document.getElementById('timer');
    if (bar && clockDur) bar.style.width = (ms / clockDur * 100) + '%';
    if (num) num.textContent = wrap && clockDur ? Math.ceil(ms / 1000) : '';
    if (wrap) wrap.classList.toggle('urgent', ms <= +(wrap.dataset.u || 5000));
  }
  setInterval(tick, 100);

  if (/^#?[A-Za-z]{4}$/.test(location.hash || '')) mode = 'join';
  render();
})();
