
(function () {
  'use strict';
  const JOIN_URL = 'https://claude.ai/artifact/2EJ9htojyFMcNo46Ye13xx';
  const $app = document.getElementById('app');
  const SHAPES = ['▲', '◆', '●', '■'];
  const MEDALS = ['🥇', '🥈', '🥉'];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const use = (name) => (window.claude && window.claude.use ? window.claude.use(name) : Promise.resolve(null)).catch(() => null);

  let roomNs = null, roomChecked = false;
  const roomReady = use('room').then((r) => { roomNs = r; roomChecked = true; if (mode === 'home') render(); return r; });

  let mode = 'home';          // home | join | player | host | demo
  let game = null, hostRoom = null, hostError = '', hostTimer = null, emitWarned = false;
  let proom = null, pstate = null, perr = '', pcode = '', pname = '', lastSig = '', lastKey = '';
  let qStart = 0, endsAt = 0, revealEnds = 0, myAnswer = null, waitTimer = null;

  let PID = store.get('mz_pid');
  if (!PID) { PID = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('mz_pid', PID); }

  // ---------- QR ----------
  function qrSvg(text) {
    try {
      if (typeof qrcode !== 'function') return '';
      const q = qrcode(0, 'M');
      q.addData(text); q.make();
      const n = q.getModuleCount();
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + 3) + ' ' + (r + 3) + 'h1v1h-1z';
      const sz = n + 6;
      return '<svg viewBox="0 0 ' + sz + ' ' + sz + '" shape-rendering="crispEdges" role="img" aria-label="QR kod za pridruživanje"><rect width="' + sz + '" height="' + sz + '" fill="#fff"/><path d="' + d + '" fill="#150c33"/></svg>';
    } catch (e) { return ''; }
  }
  const baseUrl = () => JOIN_URL || store.get('mz_base') || '';

  // ---------- navigacija ----------
  function reset() {
    if (game) game.stop();
    clearInterval(hostTimer); clearTimeout(waitTimer);
    if (hostRoom) hostRoom.leave().catch(() => {});
    if (proom) proom.leave().catch(() => {});
    game = null; hostRoom = null; proom = null; pstate = null; hostError = ''; perr = '';
    lastSig = ''; lastKey = ''; myAnswer = null; emitWarned = false;
    mode = 'home';
    render();
  }

  // ---------- domaćin ----------
  function readPlayers(room) {
    const out = [];
    for (const p of room.peers()) {
      const pr = p.presence;
      if (!pr || pr.role !== 'p' || typeof pr.pid !== 'string' || typeof pr.name !== 'string') continue;
      out.push({ pid: pr.pid, name: pr.name, a: pr.a && typeof pr.a === 'object' ? pr.a : null });
    }
    return out;
  }

  function publish() {
    if (!hostRoom || !game) return;
    hostRoom.emit('state', game.view()).catch((e) => {
      if (e && e.code === 'not_permitted' && !emitWarned) {
        emitWarned = true;
        hostError = 'Ova prijava nema dopuštenje za vođenje igre. Otvori stranicu na računu koji ju je objavio.';
        render();
      }
    });
  }

  async function startHost() {
    mode = 'host'; hostError = ''; game = null; render();
    const ns = await roomReady;
    if (!ns) { hostError = 'Veza između uređaja nije dostupna u ovom prikazu. Isprobaj demo ili otvori stranicu u Claude aplikaciji.'; render(); return; }
    const user = await use('user');
    try { if (user && (await user.canEdit()) === false) { hostError = 'Igru može voditi samo vlasnik stranice ili urednik. Prijavi se računom koji ju je objavio.'; render(); return; } } catch (e) {}
    const code = makeCode();
    try { hostRoom = await ns.join('mz-' + code.toLowerCase()); }
    catch (e) { hostError = 'Ne mogu otvoriti sobu (' + ((e && e.code) || 'greška') + ').'; render(); return; }
    game = createGame({ code, onChange: () => { publish(); render(); } });
    hostRoom.presence({ role: 'h' }).catch(() => {});
    hostRoom.onPeers(() => game && game.syncPeers(readPlayers(hostRoom)));
    game.syncPeers(readPlayers(hostRoom));
    hostTimer = setInterval(publish, 1000);
    render(); publish();
  }

  function startDemo() {
    mode = 'demo'; hostError = '';
    game = createGame({ code: 'DEMO', onChange: render });
    ['Ana', 'Marko', 'Iva', 'Luka'].forEach((n) => game.addBot(n));
  }

  // ---------- igrač ----------
  async function joinGame(code, name) {
    pcode = code; pname = name; perr = ''; pstate = null; lastSig = ''; lastKey = ''; myAnswer = null;
    store.set('mz_name', name);
    mode = 'player'; render();
    const ns = await roomReady;
    if (!ns) { perr = 'Veza između uređaja nije dostupna. Prijavi se na Claude i otvori stranicu s linka koji ti je domaćin poslao.'; mode = 'join'; render(); return; }
    try { proom = await ns.join('mz-' + code.toLowerCase()); }
    catch (e) { perr = 'Ne mogu se spojiti na sobu (' + ((e && e.code) || 'greška') + ').'; mode = 'join'; render(); return; }
    proom.on('state', (msg) => {
      const d = msg && msg.data;
      if (d && d.code === pcode && Array.isArray(d.players)) applyState(d);
    });
    proom.presence({ role: 'p', pid: PID, name: pname }).catch(() => {});
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      if (pstate) return;
      perr = 'Domaćin nije pronađen. Provjeri kod sobe i je li igra otvorena.';
      if (proom) proom.leave().catch(() => {});
      proom = null; mode = 'join'; render();
    }, 9000);
  }

  function applyState(d) {
    clearTimeout(waitTimer);
    const key = d.phase + ':' + (d.q ? d.q.index : 0);
    const t = Date.now();
    if (key !== lastKey) {
      lastKey = key;
      if (d.phase === 'question') { qStart = t - (d.duration - d.remainingMs); endsAt = t + d.remainingMs; }
      if (d.phase === 'reveal') revealEnds = t + (d.revealMs || 0);
      if (!d.q || !myAnswer || myAnswer.q !== d.q.index) myAnswer = null;
    }
    const sig = JSON.stringify(Object.assign({}, d, { remainingMs: 0, revealMs: 0 }));
    pstate = d;
    if (sig !== lastSig) { lastSig = sig; render(); }
  }

  function answer(i) {
    if (!pstate || pstate.phase !== 'question' || !proom) return;
    if (myAnswer && myAnswer.q === pstate.q.index) return;
    const t = Math.max(0, Math.round(Date.now() - qStart));
    myAnswer = { q: pstate.q.index, c: i, t };
    proom.presence({ a: myAnswer }).catch(() => {});
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
    render();
  }

  // ---------- prikaz ----------
  function render() {
    try {
      if (mode === 'home') return renderHome();
      if (mode === 'join') return renderJoin();
      if (mode === 'player') return renderPlayer();
      return renderHost();
    } catch (e) {
      $app.className = 'screen center';
      $app.innerHTML = '<div class="err">Nešto je pošlo po krivu: ' + esc(e && e.message) + '</div><button class="btn" id="home">Početna</button>';
      const b = document.getElementById('home'); if (b) b.onclick = reset;
    }
  }
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };

  function renderHome() {
    $app.className = 'screen center';
    const hint = roomChecked && !roomNs
      ? '<div class="err">Višeigračka veza nije dostupna u ovom prikazu. Demo i dalje radi.</div>' : '';
    $app.innerHTML =
      '<div class="brand">MOZGALICA<small>KVIZ ZA CIJELO DRUŠTVO</small></div>' +
      '<div class="stack">' + hint +
      '<button class="btn" id="host">Vodim igru (TV)</button>' +
      '<button class="btn" id="join">Pridruži se igri</button>' +
      '<button class="btn ghost" id="demo">Demo s botovima</button>' +
      '</div><div class="note">Domaćin otvori igru i castira ekran na TV. Ostali upišu kod sobe ili skeniraju QR kod.</div>';
    bind('host', startHost); bind('join', () => { mode = 'join'; render(); }); bind('demo', startDemo);
  }

  function renderJoin() {
    $app.className = 'screen phone';
    const m = (location.hash || '').match(/^#?([A-Za-z]{4})$/);
    const code = pcode || (m ? m[1].toUpperCase() : '');
    const name = pname || store.get('mz_name') || '';
    $app.innerHTML =
      '<div class="brand">MOZGALICA</div>' +
      '<form class="form" id="form" autocomplete="off">' +
      (perr ? '<div class="err">' + esc(perr) + '</div>' : '') +
      '<div><label for="code">Kod sobe</label><input id="code" class="code" maxlength="4" value="' + esc(code) + '" autocapitalize="characters" autocomplete="off"></div>' +
      '<div><label for="name">Tvoje ime</label><input id="name" maxlength="14" value="' + esc(name) + '" placeholder="npr. Mateo" autocomplete="off"></div>' +
      '<button class="btn" type="submit">Uđi u igru</button>' +
      '<button class="btn ghost" type="button" id="back">Natrag</button></form>';
    document.getElementById('form').onsubmit = (e) => {
      e.preventDefault();
      const c = document.getElementById('code').value.trim().toUpperCase();
      const n = document.getElementById('name').value.trim();
      if (!/^[A-Z]{4}$/.test(c) || !n) { perr = 'Upiši četveroslovni kod sobe i svoje ime.'; pcode = c; pname = n; renderJoin(); return; }
      joinGame(c, n);
    };
    bind('back', () => { perr = ''; pcode = ''; mode = 'home'; render(); });
    if (code) { const el = document.getElementById('name'); if (el && !name) el.focus(); }
  }

  function rankingHtml(list, gain) {
    return list.slice(0, 8).map((r) =>
      '<div class="rank-row"><span class="pos">' + r.rank + '.</span><span class="nm">' + esc(r.name) + '</span>' +
      (gain && r.gained ? '<span class="gain">+' + r.gained + '</span>' : '') +
      '<span class="sc">' + r.score + '</span></div>').join('');
  }

  function joinBlock(v) {
    if (mode === 'demo') {
      return '<div class="card join-card"><div class="big">Demo način</div><div class="join-hint">Botovi igraju umjesto prijatelja, da vidiš kako izgleda TV ekran. Pritisni „Započni igru“.</div></div>';
    }
    const base = baseUrl();
    if (!base) {
      return '<div class="card join-card"><div class="join-hint">Zalijepi link ove stranice (s claude.ai) da se napravi QR kod za igrače.</div>' +
        '<div class="field-row"><input id="baseurl" placeholder="https://claude.ai/…" inputmode="url" autocomplete="off"><button class="btn ghost" id="savebase">Spremi</button></div>' +
        '<div class="join-hint">Kod sobe:</div><div class="room-code">' + esc(v.code) + '</div></div>';
    }
    const svg = qrSvg(base.split('#')[0] + '#' + v.code);
    return '<div class="card join-card">' + (svg ? '<div class="qr">' + svg + '</div>' : '') +
      '<div class="join-hint">Skeniraj QR kod ili otvori stranicu i upiši kod</div><div class="room-code">' + esc(v.code) + '</div></div>';
  }

  function renderHost() {
    $app.className = 'screen';
    if (hostError) {
      $app.className = 'screen center';
      $app.innerHTML = '<div class="err">' + esc(hostError) + '</div><button class="btn" id="home">Natrag</button>';
      return bind('home', reset);
    }
    if (!game) {
      $app.className = 'screen center';
      $app.innerHTML = '<div class="brand">MOZGALICA</div><div class="note">Otvaram sobu…</div>';
      return;
    }
    const v = game.view();
    if (v.phase === 'lobby') return renderLobby(v);
    if (v.phase === 'final') return renderFinal(v);
    return renderQuestion(v);
  }

  function renderLobby(v) {
    const on = v.players.filter((p) => p.connected).length;
    $app.innerHTML =
      '<div class="brand">MOZGALICA<small>KVIZ ZA CIJELO DRUŠTVO</small></div>' +
      '<div class="lobby-grid">' + joinBlock(v) +
      '<div class="card players-card"><h2>Igrači (' + v.players.length + '/' + v.max + ')</h2><div class="chips">' +
      (v.players.length ? v.players.map((p) => '<div class="chip' + (p.connected ? '' : ' off') + '">' + esc(p.name) + '</div>').join('')
        : '<div class="empty">Čekamo prve igrače…</div>') +
      '</div><div class="actions"><button class="btn" id="start"' + (on < 1 ? ' disabled' : '') + '>Započni igru</button>' +
      '<button class="btn ghost" id="quit">Odustani</button></div></div></div>';
    bind('start', () => game.startGame()); bind('quit', reset);
    bind('savebase', () => {
      const el = document.getElementById('baseurl');
      const val = el ? el.value.trim() : '';
      if (/^https:\/\//.test(val)) { store.set('mz_base', val); render(); }
    });
  }

  function renderQuestion(v) {
    const rev = v.phase === 'reveal';
    const q = v.q;
    const opts = q.options.map((o, i) => {
      let cls = 'opt o' + i;
      if (rev) cls += i === v.reveal.correct ? ' correct' : ' dim';
      return '<div class="' + cls + '"><span class="shape">' + SHAPES[i] + '</span><span class="txt">' + esc(o) + '</span>' +
        (rev ? '<span class="cnt">' + v.reveal.counts[i] + '</span>' : '') + '</div>';
    }).join('');
    const foot = rev
      ? '<span>Sljedeće pitanje za <b id="rnum">' + Math.ceil(v.revealMs / 1000) + '</b> s</span><button class="btn" id="next">' + (q.index === q.total ? 'Rezultati' : 'Dalje') + ' ▶</button>'
      : '<span>Odgovorilo ' + v.answered + ' / ' + v.connectedCount + '</span><span></span>';
    $app.innerHTML =
      '<div class="q-screen' + (rev ? ' with-rank' : '') + '"><div class="q-main">' +
      '<div class="q-top"><span class="pill">' + esc(q.category) + '</span><span>Pitanje ' + q.index + ' / ' + q.total + '</span><span class="timer-num" id="tnum">' + (rev ? '' : Math.ceil(v.remainingMs / 1000)) + '</span></div>' +
      '<div class="timer" id="timer"' + (rev ? ' style="visibility:hidden"' : '') + '><div id="tbar"></div></div>' +
      '<div class="q-text">' + esc(q.text) + '</div><div class="opts">' + opts + '</div><div class="q-foot">' + foot + '</div></div>' +
      (rev ? '<div class="card rank-card"><h3>Poredak</h3>' + rankingHtml(rankOf(v.players), true) + '</div>' : '') + '</div>';
    bind('next', () => game.skipReveal());
    tick();
  }

  function renderFinal(v) {
    const r = rankOf(v.players);
    const podium = [1, 0, 2].filter((i) => r[i]).map((i) =>
      '<div class="pod p' + (i + 1) + '"><div class="medal">' + MEDALS[i] + '</div><div class="pn">' + esc(r[i].name) + '</div><div class="ps">' + r[i].score + ' bodova</div></div>').join('');
    const rest = r.slice(3).map((x) => '<div class="rank-row"><span class="pos">' + x.rank + '.</span><span class="nm">' + esc(x.name) + '</span><span class="sc">' + x.score + '</span></div>').join('');
    $app.innerHTML =
      '<div class="brand" style="text-align:center">KRAJ IGRE!<small>KONAČNI POREDAK</small></div>' +
      '<div class="podium">' + podium + '</div><div class="rest">' + rest + '</div>' +
      '<div class="actions" style="justify-content:center;margin-top:auto"><button class="btn" id="again">Nova igra</button><button class="btn ghost" id="quit">Izlaz</button></div>';
    bind('again', () => game.restart()); bind('quit', reset);
  }

  function renderPlayer() {
    $app.className = 'screen phone';
    const s = pstate;
    if (!s) {
      $app.className = 'screen phone center';
      $app.innerHTML = '<div class="brand">MOZGALICA</div><div class="big">Spajam se…</div><div class="sub">Soba ' + esc(pcode) + '</div>';
      return;
    }
    const me = s.players.find((p) => p.pid === PID);
    const center = (html) => { $app.className = 'screen phone center'; $app.innerHTML = '<div class="brand">MOZGALICA</div>' + html; };
    if (!me) {
      return s.phase === 'lobby'
        ? center('<div class="big">Prijavljujem te…</div><div class="sub">Soba ' + esc(s.code) + '</div>')
        : center('<div class="big">Igra je u tijeku</div><div class="sub">Pričekaj da završi pa se pridruži sljedećoj rundi.</div>');
    }
    const ranked = rankOf(s.players);
    const rk = ranked.find((p) => p.pid === PID);

    if (s.phase === 'lobby') {
      return center('<div class="big">Bok, ' + esc(me.name) + '! 👋</div><div class="sub">Uspješno si u sobi <b>' + esc(s.code) + '</b>.<br>Pogledaj TV. Igra počinje kad domaćin pritisne „Započni“.</div>' +
        '<div class="statline"><div class="stat"><b>' + s.players.length + '</b><span>igrača u sobi</span></div></div>' +
        '<button class="btn ghost" id="leave">Izađi</button>') || bind('leave', reset);
    }
    if (s.phase === 'question') {
      const q = s.q;
      const mine = myAnswer && myAnswer.q === q.index ? myAnswer.c : null;
      const done = mine !== null || me.answered;
      const opts = q.options.map((o, i) => {
        let cls = 'p-opt o' + i;
        if (done) cls += mine === i ? ' picked' : ' dim';
        return '<button class="' + cls + '" data-i="' + i + '"' + (done ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span>' + esc(o) + '</span></button>';
      }).join('');
      $app.innerHTML =
        '<div class="p-top"><span>' + q.index + ' / ' + q.total + '</span><span class="pill">' + esc(q.category) + '</span><span id="tnum">' + Math.ceil(s.remainingMs / 1000) + '</span></div>' +
        '<div class="timer" id="timer"><div id="tbar"></div></div><div class="p-q">' + esc(q.text) + '</div><div class="p-opts">' + opts + '</div>' +
        '<div class="waiting">' + (done ? 'Odgovor je zaprimljen ✔ Čekamo ostale…' : 'Dodirni odgovor!') + '</div>';
      $app.querySelectorAll('.p-opt').forEach((b) => { b.onclick = () => answer(Number(b.dataset.i)); });
      return tick();
    }
    if (s.phase === 'reveal') {
      const ok = me.choice === s.reveal.correct;
      const cls = ok ? 'ok' : (me.choice === null || me.choice === undefined ? 'none' : 'bad');
      const title = ok ? 'Točno! 🎉' : (cls === 'none' ? 'Vrijeme je isteklo' : 'Netočno 😬');
      $app.className = 'screen phone center';
      $app.innerHTML =
        '<div class="p-top" style="width:100%"><span>' + s.q.index + ' / ' + s.q.total + '</span><span class="pill">' + esc(s.q.category) + '</span><span></span></div>' +
        '<div class="result ' + cls + '"><div class="big">' + title + '</div>' + (ok ? '<div class="pts">+' + me.gained + '</div>'
          : '<div class="sub" style="margin-top:10px">Točan odgovor:<br><b>' + SHAPES[s.reveal.correct] + ' ' + esc(s.q.options[s.reveal.correct]) + '</b></div>') + '</div>' +
        '<div class="statline"><div class="stat"><b>' + rk.rank + '.</b><span>mjesto</span></div><div class="stat"><b>' + me.score + '</b><span>bodova</span></div></div>' +
        '<div class="sub">Sljedeće pitanje za <b id="rnum">' + Math.ceil(s.revealMs / 1000) + '</b> s</div>';
      return tick();
    }
    const medal = rk.rank === 1 ? '🥇' : rk.rank === 2 ? '🥈' : rk.rank === 3 ? '🥉' : '🎮';
    center('<div style="font-size:5rem;line-height:1">' + medal + '</div><div class="big">' + (rk.rank === 1 ? 'Pobjednik si!' : rk.rank + '. mjesto od ' + s.players.length) + '</div>' +
      '<div class="statline"><div class="stat"><b>' + me.score + '</b><span>bodova</span></div></div>' +
      '<div class="sub">Hvala na igri, ' + esc(me.name) + '! Domaćin može pokrenuti novu rundu.</div><button class="btn ghost" id="leave">Izađi</button>');
    bind('leave', reset);
  }

  // ---------- odbrojavanje (bez ponovnog crtanja) ----------
  function setTimes(ms, dur, revMs) {
    const bar = document.getElementById('tbar'), num = document.getElementById('tnum');
    const wrap = document.getElementById('timer'), rnum = document.getElementById('rnum');
    if (bar && dur) bar.style.width = (ms / dur * 100) + '%';
    if (num && dur) num.textContent = Math.ceil(ms / 1000);
    if (wrap) wrap.classList.toggle('urgent', ms <= 5000);
    if (rnum) rnum.textContent = Math.max(0, Math.ceil(revMs / 1000));
  }
  function tick() {
    if ((mode === 'host' || mode === 'demo') && game) {
      const v = game.view();
      if (v.phase === 'question') setTimes(v.remainingMs, v.duration, 0);
      else if (v.phase === 'reveal') setTimes(0, 0, v.revealMs);
    } else if (mode === 'player' && pstate) {
      if (pstate.phase === 'question') setTimes(Math.max(0, endsAt - Date.now()), pstate.duration, 0);
      else if (pstate.phase === 'reveal') setTimes(0, 0, revealEnds - Date.now());
    }
  }
  setInterval(tick, 100);

  // Ako je stranica otvorena s kodom (#ABCD), odmah ide na prijavu igrača.
  if (/^#?[A-Za-z]{4}$/.test(location.hash || '')) mode = 'join';
  render();
})();
