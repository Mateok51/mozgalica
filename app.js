(function () {
  'use strict';
  const $app = document.getElementById('app');
  const SHAPES = ['A', 'B', 'C', 'D'];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // ---------- likovi (originalni, sjenčani) ----------
  const AV = [
    { n: 'Mačak',  spr: 'macak' },
    { n: 'Kuhar',  spr: 'kuhar' },
    { n: 'Zlata',  spr: 'zlata' },
    { n: 'Kovač',  spr: 'kovac' },
    { n: 'Žar',    spr: 'zar' },
    { n: 'Sova',   spr: 'sova' },
    { n: 'Sjena',  spr: 'sjena' },
    { n: 'Njuško', spr: 'njusko' },
  ];
  // naslikani likovi: jedna slika po pozi; prvi se nude pri odabiru
  const PICK_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];
  const SPR_POSES = ['idle', 'happy', 'sad', 'shocked', 'attack', 'victory'];
  // Preload u fazama: start (odmah), predvorje (likovi), početak igre (ploče, vrata, moći), finale (stepenice).
  // Sve ide tiho u pozadini; prethodna faza uvijek daje dovoljno vremena da slike budu spremne prije svoje scene.
  const PRELOAD = (() => {
    const W = (n) => 'ui/' + n + '.webp';
    const SETS = {
      start: [innerWidth > innerHeight ? 'bg-l' : 'bg-mobile', 'logo', 'btn-neutral', 'btn-green', 'btn-blue', 'round', 'panel'].map(W),
      lobby: [].concat(...AV.filter((a) => a.spr).map((a) => SPR_POSES.map((p) => 'chars/' + a.spr + '/' + p + '.webp'))).concat([W(innerWidth > innerHeight ? 'bg-mobile' : 'bg-l')]),
      game: ['q-panel', 'ans2-red', 'ans2-blue', 'ans2-gold', 'ans2-green', 'door2-red', 'door2-blue', 'door2-gold', 'door2-green', 'timer2', 'pw-card', 'btn-wood', 'btn-purple',
        'pw-led', 'pw-sluz', 'pw-grick', 'pw-bomba', 'pw-dupli', 'pw-pola', 'pw-stit'].map(W),
      finale: ['step', 'token'].map(W),
    };
    const done = {};
    const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 900 }) : setTimeout(fn, 120));
    function img(u) {
      // samo u priručnu memoriju preglednika (HTTP/SW); ne držimo dekodirane slike (Android ruši karticu)
      if (window.fetch && location.protocol !== 'file:') return fetch(u).then((r) => r.blob()).then(() => {}, () => {});
      return new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = u; });
    }
    function stage(k) {
      if (!done[k]) done[k] = new Promise((r) => { const go = () => Promise.all(SETS[k].map(img)).then(r); if (k === 'start') go(); else idle(go); });
      return done[k];
    }
    // ph = 't:lobby' / 'p:question' …; lobby i odabir lika pripremaju likove, a odmah iza toga i igru; igra priprema finale
    function on(ph) {
      const p = String(ph || '').replace(/^[tp]:/, '');
      if (!p || p === 'home') return;
      stage('lobby').then(() => stage('game')).then(() => { if (p !== 'lobby') stage('finale'); });
    }
    stage('start');
    return { stage, on };
  })();
  // slika se ne učita: poza lika pada na idle, ostalo se samo sakrije (nikad ikona slomljene slike)
  document.addEventListener('error', (e) => {
    const t = e.target; if (!t || t.tagName !== 'IMG') return;
    const m = (t.getAttribute('src') || '').match(/^chars\/([^/]+)\/(\w+)\.webp$/);
    if (m && m[2] !== 'idle') { t.src = 'chars/' + m[1] + '/idle.webp'; return; }
    t.classList.add('img-fail');
  }, true);
  const OLD_MOOD = { sad: 'dizzy', shocked: 'dizzy', victory: 'happy', attack: '' };
  const TOP = { round: 22, square: 26, tall: 14, pear: 20 };
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
  }
  const avCache = {};
  const PRE_AV = new Set(), PRE_AV_IMG = [];
  function avSvg(i, mood) {
    const A = AV[i] || AV[0];
    if (A.spr) {
      const pose = SPR_POSES.includes(mood) ? mood : mood === 'dizzy' ? 'sad' : 'idle';
      if (!PRE_AV.has(A.spr)) { PRE_AV.add(A.spr); for (const ps of SPR_POSES) { const im = new Image(); im.src = 'chars/' + A.spr + '/' + ps + '.webp'; PRE_AV_IMG.push(im); } }
      return '<img class="av spr spr-' + A.spr + ' m-' + pose + '" src="chars/' + A.spr + '/' + pose + '.webp" alt="" draggable="false" decoding="sync">';
    }
    if (mood in OLD_MOOD) mood = OLD_MOOD[mood];
    const k = i + ':' + (mood || '');
    if (avCache[k]) return avCache[k];
    const a = AV[i] || AV[0];
    const t = TOP[a.s];
    const ink = '#1a1530';
    const hi = shade(a.c, 0.5), lo = shade(a.c, -0.5), gid = 'avb' + i, eid = 'ave' + i;
    const fill = 'url(#' + gid + ')';
    let shape = '';
    if (a.s === 'round') shape = '<ellipse cx="50" cy="62" rx="38" ry="40"/>';
    else if (a.s === 'square') shape = '<rect x="14" y="26" width="72" height="76" rx="24"/>';
    else if (a.s === 'tall') shape = '<rect x="22" y="14" width="56" height="90" rx="28"/>';
    else shape = '<path d="M50 20C72 20 76 44 74 54C88 66 90 102 50 104C10 102 12 66 26 54C24 44 28 20 50 20Z"/>';
    const defs = '<defs>' +
      '<radialGradient id="' + gid + '" cx="34%" cy="26%" r="80%"><stop offset="0" stop-color="' + hi + '"/><stop offset=".5" stop-color="' + a.c + '"/><stop offset="1" stop-color="' + lo + '"/></radialGradient>' +
      '<radialGradient id="' + eid + '" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d9dcf0"/></radialGradient>' +
      '</defs>';
    const feet = '<ellipse cx="36" cy="103" rx="10" ry="5" fill="' + lo + '"/><ellipse cx="64" cy="103" rx="10" ry="5" fill="' + lo + '"/>';
    const shadow = '<ellipse cx="50" cy="107" rx="30" ry="5" fill="#000" opacity=".28"/>';
    const body = '<g fill="' + fill + '">' + shape + '</g>';
    const belly = '<ellipse cx="50" cy="82" rx="20" ry="13" fill="' + hi + '" opacity=".35"/>';
    const spec = '<ellipse cx="33" cy="' + (t + 15) + '" rx="10" ry="5.5" fill="#fff" opacity=".55" transform="rotate(-28 33 ' + (t + 15) + ')"/>' +
      '<circle cx="45" cy="' + (t + 9) + '" r="2.4" fill="#fff" opacity=".6"/>';
    const eyePos = a.e === 1 ? [[50, 52, 13]] : a.e === 3 ? [[32, 56, 8], [50, 45, 8], [68, 56, 8]] : [[38, 52, 9.5], [62, 52, 9.5]];
    let eyes = '';
    for (const [x, y, r] of eyePos) {
      if (mood === 'dizzy') {
        eyes += '<path d="M' + (x - r * 0.6) + ' ' + (y - r * 0.6) + 'l' + r * 1.2 + ' ' + r * 1.2 + 'M' + (x + r * 0.6) + ' ' + (y - r * 0.6) + 'l-' + r * 1.2 + ' ' + r * 1.2 + '" stroke="' + ink + '" stroke-width="3.6" stroke-linecap="round"/>';
      } else if (mood === 'happy') {
        eyes += '<path d="M' + (x - r * 0.8) + ' ' + (y + 2) + 'Q' + x + ' ' + (y - r * 1.1) + ' ' + (x + r * 0.8) + ' ' + (y + 2) + '" stroke="' + ink + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>';
      } else {
        eyes += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#' + eid + ')"/>' +
          '<circle cx="' + (x + 1.2) + '" cy="' + (y + 1) + '" r="' + (r * 0.58) + '" fill="#3a2a8c"/>' +
          '<circle cx="' + (x + 1.2) + '" cy="' + (y + 1) + '" r="' + (r * 0.32) + '" fill="' + ink + '"/>' +
          '<circle cx="' + (x - r * 0.15) + '" cy="' + (y - r * 0.3) + '" r="' + (r * 0.2) + '" fill="#fff"/>' +
          '<ellipse class="lid" cx="' + x + '" cy="' + y + '" rx="' + (r + 1) + '" ry="' + (r + 1) + '" fill="' + a.c + '"/>';
      }
    }
    const cheeks = a.x === 'brkovi' ? '' : '<circle cx="27" cy="68" r="5" fill="#ff7aa8" opacity=".45"/><circle cx="73" cy="68" r="5" fill="#ff7aa8" opacity=".45"/>';
    let mouth;
    if (mood === 'happy') mouth = '<path d="M35 70Q50 94 65 70Z" fill="' + ink + '"/><path d="M42 80Q50 88 58 80Q50 76 42 80Z" fill="#ff6f91"/>';
    else if (mood === 'dizzy') mouth = '<path d="M39 81Q44 76 50 81Q56 86 61 81" stroke="' + ink + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>';
    else mouth = '<path d="M38 73Q50 85 62 73" stroke="' + ink + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>';
    let acc = '';
    switch (a.x) {
      case 'antena': acc = '<path d="M50 ' + t + 'Q47 14 52 6" stroke="' + ink + '" stroke-width="3" fill="none"/><circle cx="52" cy="6" r="6.5" fill="#ffcf4a" stroke="#b7760d" stroke-width="1.5"/><circle cx="50" cy="4" r="2" fill="#fff"/>'; break;
      case 'brkovi': acc = '<path d="M30 67Q40 58 50 65Q60 58 70 67Q60 73 50 69Q40 73 30 67Z" fill="#3b2412"/>'; break;
      case 'sesir': acc = '<ellipse cx="50" cy="' + (t + 1) + '" rx="32" ry="5" fill="#241a3c"/><rect x="32" y="' + (t - 20) + '" width="36" height="21" rx="5" fill="#2e2350"/><rect x="32" y="' + (t - 8) + '" width="36" height="5" fill="#ff3d81"/><rect x="35" y="' + (t - 18) + '" width="6" height="14" rx="3" fill="#fff" opacity=".2"/>'; break;
      case 'masna': acc = '<path d="M50 ' + (t + 2) + 'L33 ' + (t - 9) + 'Q30 ' + (t + 2) + ' 33 ' + (t + 13) + 'Z M50 ' + (t + 2) + 'L67 ' + (t - 9) + 'Q70 ' + (t + 2) + ' 67 ' + (t + 13) + 'Z" fill="#ff3d81"/><circle cx="50" cy="' + (t + 2) + '" r="5.5" fill="#ff7fae"/>'; break;
      case 'list': acc = '<path d="M50 ' + (t + 2) + 'V' + (t - 7) + '" stroke="#5c3d1e" stroke-width="3.5" stroke-linecap="round"/><path d="M50 ' + (t - 4) + 'C50 ' + (t - 16) + ' 62 ' + (t - 20) + ' 73 ' + (t - 16) + 'C68 ' + (t - 5) + ' 59 ' + (t - 2) + ' 50 ' + (t - 4) + 'Z" fill="#37b24d"/><path d="M53 ' + (t - 6) + 'Q62 ' + (t - 12) + ' 70 ' + (t - 15) + '" stroke="#b2f2bb" stroke-width="1.5" fill="none"/>'; break;
      case 'rogovi': acc = '<path d="M28 ' + (t + 12) + 'Q18 ' + (t - 2) + ' 22 ' + (t - 12) + 'Q30 ' + (t - 2) + ' 41 ' + (t + 4) + 'Z M72 ' + (t + 12) + 'Q82 ' + (t - 2) + ' 78 ' + (t - 12) + 'Q70 ' + (t - 2) + ' 59 ' + (t + 4) + 'Z" fill="#fff1d6" stroke="#d9b98a" stroke-width="1.5"/>'; break;
      case 'naocale': acc = '<g fill="rgba(255,255,255,.15)" stroke="' + ink + '" stroke-width="3"><circle cx="38" cy="52" r="13"/><circle cx="62" cy="52" r="13"/></g><path d="M51 50h-2" stroke="' + ink + '" stroke-width="3"/>'; break;
      case 'kruna': acc = '<path d="M29 ' + (t + 4) + 'L29 ' + (t - 13) + 'L39 ' + (t - 4) + 'L50 ' + (t - 18) + 'L61 ' + (t - 4) + 'L71 ' + (t - 13) + 'L71 ' + (t + 4) + 'Z" fill="#ffcf4a" stroke="#b7760d" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="' + (t - 4) + '" r="3" fill="#ff3d81"/>'; break;
    }
    const svg = '<svg class="av" viewBox="0 0 100 112" aria-hidden="true">' + defs + shadow + feet + body + belly + spec + cheeks + eyes + mouth + acc + '</svg>';
    avCache[k] = svg;
    return svg;
  }

  // ---------- ikone moći ----------
  const svgIc = (body) => '<svg class="ic" viewBox="0 0 48 48" aria-hidden="true">' + body + '</svg>';
  const ICON = {
    led: svgIc('<defs><linearGradient id="icl" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="48"><stop offset="0" stop-color="#f0fdff"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><g stroke="url(#icl)" stroke-width="4.4" stroke-linecap="round" fill="none"><path d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20"/><path d="M18 7l6 5 6-5M18 41l6-5 6 5M4.6 21l8.2 1.4 2.6-7.6M43.4 27l-8.2-1.4-2.6 7.6M4.6 27l8.2-1.4 2.6 7.6M43.4 21l-8.2 1.4-2.6-7.6"/></g>'),
    sluz: svgIc('<defs><radialGradient id="ics" cx="35%" cy="35%" r="75%"><stop offset="0" stop-color="#e2ffb0"/><stop offset=".5" stop-color="#7ed63b"/><stop offset="1" stop-color="#2f8a0c"/></radialGradient></defs><path d="M24 3C24 3 8 22 8 31a16 16 0 0 0 32 0C40 22 24 3 24 3z" fill="url(#ics)"/><ellipse cx="17.5" cy="30" rx="4" ry="6.5" fill="#fff" opacity=".55"/>'),
    grick: svgIc('<defs><radialGradient id="icg" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#d9a066"/><stop offset="1" stop-color="#6b3f17"/></radialGradient></defs><path d="M10 26l-6-3M10 32l-7 1M38 26l6-3M38 32l7 1" stroke="#4a2b10" stroke-width="3" stroke-linecap="round"/><ellipse cx="24" cy="30" rx="15" ry="13" fill="url(#icg)"/><circle cx="24" cy="15" r="9" fill="#5a3412"/><circle cx="20" cy="13" r="3.4" fill="#fff"/><circle cx="28" cy="13" r="3.4" fill="#fff"/><circle cx="21" cy="14" r="1.6" fill="#000"/><circle cx="29" cy="14" r="1.6" fill="#000"/><path d="M20 19q4 3.4 8 0" stroke="#fff" stroke-width="1.8" fill="none"/>'),
    bomba: svgIc('<defs><radialGradient id="icb" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#6a6a86"/><stop offset=".55" stop-color="#22222f"/><stop offset="1" stop-color="#0a0a10"/></radialGradient></defs><circle cx="21" cy="29" r="16" fill="url(#icb)"/><ellipse cx="15" cy="23" rx="4.5" ry="3" fill="#fff" opacity=".35"/><rect x="27" y="9" width="9" height="8" rx="2" fill="#555" transform="rotate(38 31 13)"/><path d="M34 9q5-6 9-3" stroke="#d99a35" stroke-width="2.6" fill="none"/><path d="M43 1l1.4 3.6L48 6l-3.6 1.4L43 11l-1.4-3.6L38 6l3.6-1.4z" fill="#ffcf4a"/>'),
    dupli: svgIc('<defs><radialGradient id="icd" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff6c8"/><stop offset=".55" stop-color="#ffcf4a"/><stop offset="1" stop-color="#c47f12"/></radialGradient></defs><circle cx="24" cy="24" r="21" fill="url(#icd)" stroke="#9a5f08" stroke-width="2"/><text x="24" y="31.5" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, sans-serif" font-weight="700" font-size="21" fill="#3a2100">×2</text>'),
    pola: svgIc('<defs><linearGradient id="icp" x1="0" x2="1"><stop offset=".5" stop-color="#ffffff"/><stop offset=".5" stop-color="#e2c891"/></linearGradient></defs><circle cx="24" cy="24" r="21" fill="url(#icp)" stroke="#1a6f8a" stroke-width="2"/><path d="M24 3v42" stroke="#1a6f8a" stroke-width="2" stroke-dasharray="4 3"/><text x="13.5" y="30" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, sans-serif" font-weight="700" font-size="15" fill="#1a1530">50</text><text x="34.5" y="30" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, sans-serif" font-weight="700" font-size="15" fill="#06344a">50</text>'),
    stit: svgIc('<defs><linearGradient id="ict" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8f4ff"/><stop offset=".5" stop-color="#4a8dff"/><stop offset="1" stop-color="#1b3fa8"/></linearGradient></defs><path d="M24 3l17 6v12c0 11-7.5 20-17 24C14.5 41 7 32 7 21V9z" fill="url(#ict)" stroke="#e8f4ff" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 24l6 6 11-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  };
  ICON.oklada = '';
  ICON.utjeha = '';
  for (const k in ICON) ICON[k] = '<img class="ic pw-img" src="ui/pw-' + k + '.webp" alt="" draggable="false">';
  const bugSvg = '<img src="ui/bug-effect.webp" alt="" aria-hidden="true" draggable="false">';
  const bombSvg = '<img src="ui/bomb-effect.webp" alt="" aria-hidden="true" draggable="false">';

  // ---------- zvuk (sintetiziran, bez datoteka) ----------
  const SFX = (() => {
    let ctx = null;
    let muted = store.get('mz_mute') === '1';
    function ac() {
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ctx = new C(); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    function tone(f, t0, dur, type, vol, f2) {
      const c = ac(); if (!c || muted) return;
      const o = c.createOscillator(), g = c.createGain(), s = c.currentTime + t0;
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, s);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + dur);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol || 0.2, s + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g); g.connect(c.destination); o.start(s); o.stop(s + dur + 0.05);
    }
    function noise(t0, dur, vol, freq, type) {
      const c = ac(); if (!c || muted) return;
      const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain(), s = c.currentTime + t0;
      src.buffer = buf; flt.type = type || 'highpass'; flt.frequency.value = freq || 1000;
      g.gain.setValueAtTime(vol || 0.2, s); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      src.connect(flt); flt.connect(g); g.connect(c.destination); src.start(s); src.stop(s + dur);
    }
    const P = {
      pick: () => { tone(120, 0, 0.2, 'sine', 0.3, 60); noise(0, 0.05, 0.1, 2600, 'highpass'); tone(1319, 0.03, 0.5, 'sine', 0.12); tone(1976, 0.08, 0.6, 'sine', 0.09); [392, 523, 659, 784].forEach((f, k) => tone(f, 0.22 + k * 0.09, 0.28, 'triangle', 0.11)); },
      tap: () => { noise(0, 0.035, 0.05, 1400, 'bandpass'); tone(330, 0, 0.05, 'triangle', 0.045, 220); },
      confirm: () => { noise(0, 0.05, 0.08, 900, 'bandpass'); tone(523, 0, 0.09, 'triangle', 0.11); tone(784, 0.05, 0.12, 'triangle', 0.08); },
      score: () => { tone(880, 0, 0.08, 'triangle', 0.08); tone(1175, 0.06, 0.12, 'triangle', 0.07); },
      stingUp: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.12)),
      stingRise: () => { tone(262, 0, 0.5, 'triangle', 0.1, 523); [523, 659, 784].forEach((f, i) => tone(f, 0.32 + i * 0.07, 0.25, 'triangle', 0.12)); },
      stingTension: () => { tone(147, 0, 0.45, 'sawtooth', 0.05); tone(156, 0, 0.45, 'sawtooth', 0.04); tone(220, 0.22, 0.4, 'triangle', 0.08, 208); },
      stingDuel: () => { noise(0, 0.12, 0.12, 2200); tone(330, 0.02, 0.16, 'square', 0.06); tone(494, 0.18, 0.28, 'square', 0.06); },
      stingSmall: () => { tone(659, 0, 0.12, 'triangle', 0.08); tone(988, 0.08, 0.16, 'triangle', 0.07); },
      tick: () => tone(1250, 0, 0.05, 'square', 0.05),
      beep: (n) => { const f = [0, 1568, 1319, 1175, 988, 880][n] || 880; tone(f, 0, 0.16, 'square', 0.09); tone(f / 2, 0, 0.16, 'triangle', 0.08); },
      timeup: () => { tone(220, 0, 0.5, 'sawtooth', 0.12, 150); tone(233, 0, 0.5, 'square', 0.06, 160); noise(0, 0.3, 0.1, 600, 'lowpass'); },
      pop: () => { tone(420, 0, 0.14, 'sine', 0.22, 900); tone(880, 0.05, 0.1, 'triangle', 0.08); },
      whoosh: () => { noise(0, 0.6, 0.22, 400, 'bandpass'); tone(180, 0, 0.6, 'sawtooth', 0.04, 1200); tone(523, 0.35, 0.3, 'triangle', 0.12); tone(784, 0.45, 0.4, 'triangle', 0.12); },
      correct: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.075, 0.3, 'triangle', 0.17)),
      wrong: () => { tone(260, 0, 0.18, 'sawtooth', 0.1, 200); tone(196, 0.16, 0.35, 'sawtooth', 0.1, 120); },
      zap: () => { tone(1600, 0, 0.28, 'sawtooth', 0.07, 180); noise(0, 0.22, 0.08, 2500); },
      freeze: () => { noise(0, 0.5, 0.14, 5000); tone(2600, 0, 0.4, 'sine', 0.06, 1300); },
      crack: () => { noise(0, 0.07, 0.3, 1800); tone(3000, 0, 0.05, 'square', 0.03, 1500); },
      splat: () => { noise(0, 0.25, 0.25, 300, 'lowpass'); tone(160, 0, 0.2, 'sine', 0.2, 60); },
      squish: () => { tone(300, 0, 0.1, 'square', 0.08, 90); noise(0, 0.08, 0.12, 900); },
      boom: () => { noise(0, 0.9, 0.55, 140, 'lowpass'); tone(110, 0, 0.7, 'sine', 0.45, 32); },
      step: () => { tone(392, 0, 0.12, 'triangle', 0.14, 523); tone(784, 0.1, 0.18, 'triangle', 0.12); },
      fanfare: () => [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.4], [784, 0.62], [1047, 0.76]].forEach(([f, t]) => { tone(f, t, 0.36, 'triangle', 0.18); tone(f / 2, t, 0.36, 'sine', 0.08); }),
    };
    // Zvučni assetovi: kad postoji datoteka u audio/<ime>.mp3, upiši ime u AUDIO_FILES i igra je koristi umjesto sintetiziranog zvuka.
    // Dok datoteka ne postoji (ili se ne uspije učitati), svira postojeći sintetizirani zvuk.
    const AUDIO_FILES = ["beep", "boom", "confirm", "correct", "crack", "fanfare", "freeze", "pop", "score", "splat", "squish", "step", "stingDuel", "stingRise", "stingSmall", "stingTension", "stingUp", "tap", "tick", "timeup", "whoosh", "wrong", "zap"];
    const ALIAS = { powerIce: 'freeze', powerSlime: 'splat', powerBug: 'squish', powerBomb: 'boom', powerZap: 'zap', victory: 'fanfare',
      stingLeader: 'stingUp', stingComeback: 'stingRise', stingRival: 'stingTension', stingStreak: 'stingSmall' };
    // datoteke su već ujednačene po glasnoći; ovdje samo fino podešavanje
    const VOL = { tap: 0.7, tick: 0.6, pop: 0.8, whoosh: 0.7 };
    const fileOf = (n) => (AUDIO_FILES.indexOf(n) >= 0 ? n : ALIAS[n] && AUDIO_FILES.indexOf(ALIAS[n]) >= 0 ? ALIAS[n] : null);
    let preloaded = false;
    const bufs = {}, loading = {};
    function load(n) {
      if (loading[n] || AUDIO_FILES.indexOf(n) < 0) return;
      loading[n] = 1;
      const c = ac(); if (!c || !window.fetch || location.protocol === 'file:') return;
      fetch('audio/' + n + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
        .then((b) => { bufs[n] = b; }).catch(() => { bufs[n] = null; });
    }
    function playBuf(n) {
      const c = ac(), b = bufs[n]; if (!c || !b || muted) return false;
      const src = c.createBufferSource(), g = c.createGain(); src.buffer = b; g.gain.value = VOL[n] != null ? VOL[n] : 0.8;
      src.connect(g); g.connect(c.destination); src.start(); return true;
    }
    return {
      play(n, a) {
        try {
          if (muted) return;
          const f = fileOf(n);
          if (f && bufs[f] && playBuf(f)) return;
          if (f) load(f);
          const k = P[n] ? n : ALIAS[n];
          if (k && P[k]) P[k](a);
        } catch (e) {}
      },
      preload() { AUDIO_FILES.forEach(load); },
      ctx() { return ac(); },
      unlock() { const c = ac(); if (c && !preloaded) { preloaded = true; AUDIO_FILES.forEach(load); } },
      get muted() { return muted; },
      toggle() { muted = !muted; store.set('mz_mute', muted ? '1' : '0'); },
    };
  })();
  const AUDIO = SFX;
  // ---------- vibracija: jedno mjesto za sve obrasce; tiho ne radi ništa gdje vibracija nije podržana ----------
  const HAPTIC = (() => {
    function v(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
    return {
      tap: () => v(12), confirm: () => v(20), error: () => v([25, 60, 25]), impact: () => v(50),
      bomb: () => v([80, 40, 120]), step: () => v(15), victory: () => v([30, 70, 30, 70, 110]),
    };
  })();
  // ---------- glazba u pozadini (sintetizirana petlja, A-mol: Am F C G) ----------
  const MUSIC = (() => {
    let on = store.get('mz_music') !== '0', gain = null, timer = null, next = 0, step = 0, playing = false;
    const BPM = 108, S16 = 60 / BPM / 4;
    const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const CH = [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]], BASS = [45, 41, 48, 43];
    const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
    function out(c) {
      if (!gain) {
        gain = c.createGain(); gain.gain.value = 0;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
        gain.connect(lp); lp.connect(c.destination);
      }
      return gain;
    }
    function note(c, f, t, dur, type, vol, f2) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out(c)); o.start(t); o.stop(t + dur + 0.05);
    }
    let nbuf = null;
    function hat(c, t, vol, dur) {
      if (!nbuf) { const len = Math.floor(c.sampleRate * 0.3); nbuf = c.createBuffer(1, len, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = nbuf; f.type = dur > 0.08 ? 'bandpass' : 'highpass'; f.frequency.value = dur > 0.08 ? 1800 : 7000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(out(c)); src.start(t); src.stop(t + dur);
    }
    function schedule() {
      const c = SFX.ctx(); if (!c) return;
      while (next < c.currentTime + 0.25) {
        const bar = Math.floor(step / 16) % 4, st = step % 16, t = next, ch = CH[bar];
        if (st === 0) ch.forEach((m) => note(c, mf(m), t, S16 * 15, 'triangle', 0.035));
        if (st === 0 || st === 6 || st === 8 || st === 14) note(c, mf(BASS[bar]), t, S16 * 1.8, 'sine', 0.16);
        if (st % 2 === 0) note(c, mf(ch[ARP[(st / 2) % 8]] + 12), t, S16 * 1.6, 'square', 0.018);
        if (st === 0 || st === 8) note(c, 120, t, 0.18, 'sine', 0.22, 42);
        if (st === 4 || st === 12) hat(c, t, 0.06, 0.12);
        if (st % 4 === 2) hat(c, t, 0.035, 0.04);
        next += S16; step++;
      }
    }
    let mbuf = null, mload = false, msrc = null, mgain = null;
    function loadMusic(c) {
      if (mload || !window.fetch || location.protocol === 'file:') return; mload = true;
      fetch('audio/music.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
        .then((b) => { mbuf = b; if (playing) { stopSynth(); startBuf(c); } }).catch(() => {});
    }
    function stopSynth() { clearInterval(timer); timer = null; if (gain) { const c = SFX.ctx(); gain.gain.setTargetAtTime(0, c.currentTime, 0.3); } }
    function startBuf(c) {
      if (!mgain) { mgain = c.createGain(); mgain.gain.value = 0; mgain.connect(c.destination); }
      if (msrc) { try { msrc.stop(); } catch (e) {} }
      msrc = c.createBufferSource(); msrc.buffer = mbuf; msrc.loop = true; msrc.connect(mgain); msrc.start();
      mgain.gain.cancelScheduledValues(c.currentTime); mgain.gain.setTargetAtTime(0.34, c.currentTime, 0.6);
    }
    function want(play) {
      const c = play ? SFX.ctx() : null;
      if (c) loadMusic(c);
      if (play && c && c.state === 'running' && !playing && mbuf) { playing = true; startBuf(c); return; }
      if (!play && playing && msrc) {
        playing = false; const cc = SFX.ctx(); const src = msrc; msrc = null;
        if (cc && mgain) mgain.gain.setTargetAtTime(0, cc.currentTime, 0.2);
        setTimeout(() => { try { src.stop(); } catch (e) {} }, 900);
        return;
      }
      if (play && c && c.state === 'running' && !playing) {
        playing = true; out(c); next = c.currentTime + 0.05; step = 0;
        gain.gain.cancelScheduledValues(c.currentTime); gain.gain.setTargetAtTime(0.5, c.currentTime, 0.4);
        timer = setInterval(schedule, 90); schedule();
      } else if (!play && playing) {
        playing = false; clearInterval(timer); timer = null;
        const cc = SFX.ctx(); if (cc && gain) gain.gain.setTargetAtTime(0, cc.currentTime, 0.15);
      }
    }
    return { want, get on() { return on; }, toggle() { on = !on; store.set('mz_music', on ? '1' : '0'); } };
  })();
  document.addEventListener('pointerdown', (e) => {
    SFX.unlock();
    if (e.target && e.target.closest && e.target.closest('button') && !e.target.closest('#fx')) SFX.play('tap');
  }, true);

  // ---------- konfete ----------
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function confetti(n) {
    if (reduceMotion) return;
    const c = document.createElement('canvas');
    c.id = 'fxlayer';
    document.body.appendChild(c);
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const cols = ['#f2c35b', '#e2ac54', '#c9783a', '#fbefd6', '#8fae5a', '#b5543c'];
    const P = Array.from({ length: n || 160 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.4,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 5,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
      w: 7 + Math.random() * 8, h: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)],
    }));
    const t0 = performance.now();
    (function frame(t) {
      const e = t - t0;
      g.clearRect(0, 0, W, H);
      g.globalAlpha = Math.max(0, 1 - Math.max(0, e - 1500) / 1300);
      for (const p of P) {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
        g.restore();
      }
      if (e < 3800) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  // ---------- ambijent krčme: vrlo suptilne iskre iz kamina, prašina u svjetlu i lagani dim; canvas #ambient je iza sučelja (#app ima z-index 1) ----------
  (function ambient() {
    const c = document.getElementById('ambient');
    if (!c || !c.getContext) return;
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq && mq.matches) { c.remove(); return; }
    const weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;
    const g = c.getContext('2d');
    let W = 0, H = 0, dust = [], embers = [], haze = [], last = 0, acc = 0, slow = 0, frames = 0, lvl = weak ? 1 : 2, raf = 0, t0 = 0;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const land = () => W > H;   // kamin postoji samo na pozadini u landscapeu (TV); u portretu je drvena stijena
    const hearth = () => ({ x: W * 0.09, y: H * 0.6 });   // otvor kamina na slici pozadine
    function mkDust(init) { return { x: rnd(0, W), y: init ? rnd(0, H) : H + 6, r: rnd(0.9, 2.1), vy: rnd(4, 11), ph: rnd(0, 6.28), sw: rnd(5, 16), a: rnd(0.22, 0.55), tw: rnd(0.4, 1.2) }; }
    function mkEmber() { const h = hearth(); return { x: h.x + rnd(-W * 0.03, W * 0.03), y: h.y + rnd(-H * 0.02, H * 0.04), r: rnd(1.3, 2.6), vy: rnd(16, 34), ph: rnd(0, 6.28), sw: rnd(6, 16), life: 0, max: rnd(3, 5.5) }; }
    function seed() {
      const k = (W > H ? 60 : 36) * (lvl === 1 ? 0.45 : 1);
      dust = Array.from({ length: Math.round(k) }, () => mkDust(true));
      embers = [];
      haze = lvl >= 2 ? Array.from({ length: 4 }, (_, i) => ({ x: rnd(0, W), by: H * rnd(0.2, 0.85), amp: H * rnd(0.12, 0.22), ph: rnd(0, 6.28), sp: rnd(0.05, 0.11), r: Math.max(W, H) * rnd(0.26, 0.42), br: rnd(0.04, 0.09), vx: rnd(7, 15) * (i % 2 ? -1 : 1), a: rnd(0.03, 0.05) })) : [];
    }
    function size() {
      const cw = innerWidth || 360, ch = innerHeight || 640, s = Math.min(1, 900 / Math.max(cw, ch));
      W = Math.max(2, Math.round(cw * s)); H = Math.max(2, Math.round(ch * s));
      c.width = W; c.height = H; seed();
    }
    function draw(dt, t) {
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      // dim: tri vrlo blijeda, spora oblaka pri dnu
      for (const z of haze) {
        z.x += z.vx * dt; if (z.x < -z.r * 0.6) z.x = W + z.r * 0.6; else if (z.x > W + z.r * 0.6) z.x = -z.r * 0.6;
        z.y = z.by + Math.sin(t * z.sp * 6.2832 + z.ph) * z.amp;   // dim lebdi i gore-dolje, ne samo ulijevo/udesno
        const zr = z.r * (1 + 0.08 * Math.sin(t * z.br * 6.2832 + z.ph)), gr = g.createRadialGradient(z.x, z.y, 0, z.x, z.y, zr);
        gr.addColorStop(0, 'rgba(255,196,130,' + z.a + ')'); gr.addColorStop(1, 'rgba(255,196,130,0)');
        g.fillStyle = gr; g.fillRect(z.x - zr, z.y - zr, zr * 2, zr * 2);
      }
      // titranje svjetla kamina (nepravilno, vrlo blago)
      if (land()) { const h = hearth(), fl = 0.5 + 0.5 * Math.sin(t * 1.9) * Math.sin(t * 0.7 + 1) + 0.15 * Math.sin(t * 7.3), a = 0.06 + 0.07 * Math.max(0, Math.min(1, fl)), R = H * 0.55;
        const gr = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, R); gr.addColorStop(0, 'rgba(255,150,60,' + a + ')'); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.fillRect(h.x - R, h.y - R, R * 2, R * 2); }
      // prašina
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i]; p.y -= p.vy * dt; p.ph += dt * p.tw;
        if (p.y < -6) { dust[i] = mkDust(false); continue; }
        const x = p.x + Math.sin(p.ph) * p.sw, a = p.a * (0.55 + 0.45 * Math.sin(p.ph * 1.7));
        g.fillStyle = 'rgba(255,222,170,' + a.toFixed(3) + ')'; g.beginPath(); g.arc(x, p.y, p.r, 0, 6.2832); g.fill();
      }
      // iskre iz kamina
      if (lvl >= 2 && land() && embers.length < 14 && Math.random() < dt * 2.2) embers.push(mkEmber());
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.life += dt; e.y -= e.vy * dt; e.ph += dt * 2.2;
        if (e.life > e.max || e.y < -6) { embers.splice(i, 1); continue; }
        const k = e.life / e.max, a = 0.9 * Math.sin(Math.min(1, k * 1.15) * 3.1416), x = e.x + Math.sin(e.ph) * e.sw * (0.4 + k);
        const rr = e.r * (1 - 0.4 * k); g.fillStyle = 'rgba(255,120,40,' + (Math.max(0, a) * 0.22).toFixed(3) + ')'; g.beginPath(); g.arc(x, e.y, rr * 3.2, 0, 6.2832); g.fill();   // mekani sjaj oko iskre
        g.fillStyle = 'rgba(255,' + Math.round(190 - 70 * k) + ',80,' + Math.max(0, a).toFixed(3) + ')'; g.beginPath(); g.arc(x, e.y, rr, 0, 6.2832); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!t0) t0 = ts;
      const dtm = ts - last; if (dtm < 33) return;   // najviše ~30 sličica u sekundi
      last = ts; const dt = Math.min(0.1, dtm / 1000);
      const t = performance.now();
      draw(dt, (ts - t0) / 1000);
      // ako uređaj kasni, smanji sloj (i na kraju ugasi) — igra ima prednost
      if (++frames > 20) { const cost = performance.now() - t; slow = cost > 9 ? slow + 1 : Math.max(0, slow - 1); if (slow > 25) { slow = 0; frames = 0; if (lvl > 1) { lvl = 1; seed(); } else { stop(); c.remove(); } } }
    }
    function start() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    window.addEventListener('resize', () => { size(); });
    if (mq && mq.addEventListener) mq.addEventListener('change', (e) => { if (e.matches) { stop(); c.remove(); } });
    size(); start();
  })();
  // ---------- sve stane na ekran: stranica se nikad ne skrola; ako pravi sadržaj ipak pređe visinu, skrola se samo #app (nikad ne ostaje nedostupan) ----------
  (function fitGuard() {
    const app = document.getElementById('app');
    if (!app) return;
    const SKIP = '.walker, .rv-who, .spot, .cast, [aria-hidden="true"], .pp-tag';
    let tm = 0;
    function measure() {
      tm = 0;
      const lim = app.clientHeight || innerHeight; let mb = 0;
      for (const e of app.querySelectorAll('*')) {
        if (e.closest(SKIP)) continue;
        const r = e.getBoundingClientRect();
        if (r.height < 1 || r.width < 1) continue;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.position === 'fixed' || +cs.opacity < 0.05 || cs.display === 'none') continue;
        if (r.bottom > mb) mb = r.bottom;
      }
      const over = Math.max(0, Math.round(mb + app.scrollTop - app.getBoundingClientRect().top - lim));
      app.dataset.fitover = String(over);
      app.classList.toggle('fit-scroll', over > 2);
    }
    function schedule() { if (!tm) tm = setTimeout(measure, 350); }
    if (window.MutationObserver) new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
    addEventListener('resize', schedule); addEventListener('orientationchange', schedule);
    schedule();
  })();
  // ---------- pozadina: unutrašnjost krčme (drveni zid, prozor u noć, kamin, svijeće, šank na TV-u) ----------
  (function backdrop() {
    const c = document.getElementById('bg');
    if (!c || !c.getContext || getComputedStyle(c).display === 'none') { if (c) { c.width = c.height = 0; } return; }
    const g = c.getContext('2d');
    let W = 0, H = 0, dpr = 1, wall = null, L = null;
    const rnd = (a, b) => a + Math.random() * (b - a);
    function layout() {
      const port = H > W;
      return port
        ? { win: { x: W * 0.07, y: H * 0.1, w: W * 0.3, h: H * 0.2 }, fire: { x: W * 0.6, y: H * 0.62, w: W * 0.36, h: H * 0.26 }, bar: 0, candles: [[W * 0.5, H * 0.235], [W * 0.88, H * 0.235]] }
        : { win: { x: W * 0.05, y: H * 0.12, w: W * 0.13, h: H * 0.32 }, fire: { x: W * 0.8, y: H * 0.34, w: W * 0.16, h: H * 0.42 }, bar: H * 0.8, candles: [[W * 0.3, H * 0.8], [W * 0.62, H * 0.8], [W * 0.72, H * 0.8]] };
    }
    function paintWall() {
      wall = document.createElement('canvas'); wall.width = W * dpr; wall.height = H * dpr;
      const w = wall.getContext('2d'); w.setTransform(dpr, 0, 0, dpr, 0, 0);
      // daske
      const pw = Math.max(46, W / (H > W ? 6 : 14));
      for (let x = 0, k = 0; x < W; x += pw, k++) {
        const base = 34 + (k * 37 % 11), lg = w.createLinearGradient(x, 0, x + pw, 0);
        lg.addColorStop(0, 'rgb(' + (base + 18) + ',' + (base) + ',' + (base - 14) + ')'); lg.addColorStop(0.5, 'rgb(' + (base + 26) + ',' + (base + 6) + ',' + (base - 10) + ')'); lg.addColorStop(1, 'rgb(' + (base + 10) + ',' + (base - 6) + ',' + (base - 18) + ')');
        w.fillStyle = lg; w.fillRect(x, 0, pw, H);
        w.strokeStyle = 'rgba(0,0,0,0.12)'; w.lineWidth = 1;
        for (let l = 0; l < 7; l++) { const lx = x + rnd(4, pw - 4); w.beginPath(); w.moveTo(lx, 0); for (let y = 0; y <= H; y += 40) w.lineTo(lx + Math.sin(y / 90 + l) * 3, y); w.stroke(); }
        w.fillStyle = 'rgba(10,5,2,0.75)'; w.fillRect(x, 0, 2, H);
        if (k % 2) { w.fillStyle = 'rgba(10,5,2,0.5)'; w.fillRect(x, H * (0.3 + (k % 3) * 0.17), pw, 2); }
      }
      // greda pod stropom
      const bh = Math.max(18, H * 0.035), bg = w.createLinearGradient(0, 0, 0, bh);
      bg.addColorStop(0, '#3a2414'); bg.addColorStop(0.7, '#5a3a22'); bg.addColorStop(1, '#22140a');
      w.fillStyle = bg; w.fillRect(0, 0, W, bh);
      // prozor u noć
      const o = L.win, r = o.w / 2;
      w.save(); w.beginPath(); w.moveTo(o.x, o.y + o.h); w.lineTo(o.x, o.y + r); w.arc(o.x + r, o.y + r, r, Math.PI, 0); w.lineTo(o.x + o.w, o.y + o.h); w.closePath();
      w.fillStyle = '#5a3a22'; w.fill(); w.clip();
      const sk = w.createLinearGradient(0, o.y, 0, o.y + o.h); sk.addColorStop(0, '#1c2558'); sk.addColorStop(1, '#3b2a6a');
      w.fillStyle = sk; w.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
      for (let n = 0; n < 26; n++) { w.fillStyle = 'rgba(255,246,220,' + rnd(0.4, 1).toFixed(2) + ')'; w.beginPath(); w.arc(rnd(o.x, o.x + o.w), rnd(o.y, o.y + o.h * 0.8), rnd(0.5, 1.5), 0, 6.283); w.fill(); }
      const mx = o.x + o.w * 0.68, my = o.y + o.h * 0.32, mr = o.w * 0.13;
      w.fillStyle = '#ffe2a0'; w.shadowColor = 'rgba(255,220,140,.8)'; w.shadowBlur = 18; w.beginPath(); w.arc(mx, my, mr, 0, 6.283); w.fill(); w.shadowBlur = 0;
      w.fillStyle = sk; w.beginPath(); w.arc(mx - mr * 0.45, my - mr * 0.2, mr * 0.9, 0, 6.283); w.fill();
      w.restore();
      w.strokeStyle = '#4a2c17'; w.lineWidth = 8; w.beginPath(); w.moveTo(o.x, o.y + o.h); w.lineTo(o.x, o.y + r); w.arc(o.x + r, o.y + r, r, Math.PI, 0); w.lineTo(o.x + o.w, o.y + o.h); w.closePath(); w.stroke();
      w.lineWidth = 5; w.beginPath(); w.moveTo(o.x + r, o.y); w.lineTo(o.x + r, o.y + o.h); w.moveTo(o.x, o.y + o.h * 0.55); w.lineTo(o.x + o.w, o.y + o.h * 0.55); w.stroke();
      w.fillStyle = '#5a3a22'; w.fillRect(o.x - 8, o.y + o.h, o.w + 16, 10);
      // police za svijeće
      if (!L.bar) for (const [cx, cy] of L.candles) { w.fillStyle = '#5a3a22'; w.fillRect(cx - 26, cy, 52, 7); w.fillStyle = '#2a170b'; w.beginPath(); w.moveTo(cx - 14, cy + 7); w.lineTo(cx, cy + 22); w.lineTo(cx + 14, cy + 7); w.fill(); }
      // kamin od kamena
      const f = L.fire;
      for (let y = f.y, row = 0; y < f.y + f.h; y += f.h / 7, row++) for (let x = f.x - (row % 2) * f.w / 10; x < f.x + f.w; x += f.w / 5) {
        const sw = f.w / 5 - 3, sh = f.h / 7 - 3, v = 70 + Math.floor(rnd(-12, 12));
        w.fillStyle = 'rgb(' + v + ',' + (v - 8) + ',' + (v - 16) + ')'; w.beginPath(); w.roundRect(Math.max(f.x, x), y, Math.min(sw, f.x + f.w - x), sh, 4); w.fill();
      }
      const ox = f.x + f.w * 0.2, ow = f.w * 0.6, oy = f.y + f.h * 0.3, oh = f.h * 0.7;
      w.fillStyle = '#0d0603'; w.beginPath(); w.moveTo(ox, oy + oh); w.lineTo(ox, oy + ow / 2); w.arc(ox + ow / 2, oy + ow / 2, ow / 2, Math.PI, 0); w.lineTo(ox + ow, oy + oh); w.fill();
      w.fillStyle = '#4a2c17'; w.fillRect(f.x - 6, f.y - 8, f.w + 12, 12);
      L.open = { x: ox, y: oy, w: ow, h: oh };
      // šank (samo položeni zaslon, na njemu stoje likovi na TV-u)
      if (L.bar) {
        const top = L.bar, tg = w.createLinearGradient(0, top - 10, 0, top + 14);
        tg.addColorStop(0, '#9a6a3a'); tg.addColorStop(0.4, '#6e4424'); tg.addColorStop(1, '#3a2210');
        w.fillStyle = tg; w.fillRect(0, top - 8, W, 22);
        w.fillStyle = 'rgba(255,220,170,.35)'; w.fillRect(0, top - 8, W, 2);
        const fg = w.createLinearGradient(0, top + 14, 0, H); fg.addColorStop(0, '#4a2c17'); fg.addColorStop(1, '#22130a');
        w.fillStyle = fg; w.fillRect(0, top + 14, W, H - top);
        for (let x = 0; x < W; x += W / 9) { w.strokeStyle = 'rgba(0,0,0,.35)'; w.lineWidth = 3; w.strokeRect(x + 14, top + 30, W / 9 - 28, H - top - 44); }
      }
      // sjena po rubovima
      const vg = w.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
      w.fillStyle = vg; w.fillRect(0, 0, W, H);
    }
    function size() {
      dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      L = layout(); paintWall();
    }
    size();
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
    function flame(x, y, s, t, ph) {
      const fl = 0.85 + 0.15 * Math.sin(t * 9 + ph) + 0.08 * Math.sin(t * 23 + ph * 2);
      const gl = g.createRadialGradient(x, y - s, 0, x, y - s, s * 9 * fl);
      gl.addColorStop(0, 'rgba(255,190,90,0.35)'); gl.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(x, y - s, s * 9 * fl, 0, 6.283); g.fill();
      g.fillStyle = '#efe0c0'; g.fillRect(x - s * 0.55, y, s * 1.1, s * 2.6);
      g.fillStyle = '#ffd27a'; g.beginPath(); g.ellipse(x + Math.sin(t * 7 + ph) * s * 0.15, y - s * 0.9, s * 0.45, s * 1.1 * fl, 0, 0, 6.283); g.fill();
      g.fillStyle = '#fff4cf'; g.beginPath(); g.ellipse(x, y - s * 0.6, s * 0.18, s * 0.45, 0, 0, 6.283); g.fill();
    }
    function draw(t) {
      t /= 1000;
      g.clearRect(0, 0, W, H);
      g.drawImage(wall, 0, 0, W, H);
      // vatra
      const o = L.open, base = o.y + o.h, cx = o.x + o.w / 2, glow = 0.8 + 0.2 * Math.sin(t * 3.1) + 0.1 * Math.sin(t * 7.7);
      const sp = g.createRadialGradient(cx, base - o.h * 0.3, 0, cx, base - o.h * 0.3, Math.max(W, H) * 0.45);
      sp.addColorStop(0, 'rgba(255,140,50,' + (0.28 * glow).toFixed(3) + ')'); sp.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = sp; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); g.rect(o.x, o.y, o.w, o.h); g.clip();
      const ig = g.createRadialGradient(cx, base, 0, cx, base, o.w * 0.7);
      ig.addColorStop(0, 'rgba(255,120,30,' + (0.55 * glow).toFixed(3) + ')'); ig.addColorStop(1, 'rgba(120,30,0,0)');
      g.fillStyle = ig; g.fillRect(o.x, o.y, o.w, o.h);
      g.globalCompositeOperation = 'lighter';
      try { g.filter = 'blur(' + Math.max(1, o.w / 90).toFixed(1) + 'px)'; } catch (e) {}
      const layers = [['rgba(200,40,10,0.55)', 1, 0.95], ['rgba(255,120,20,0.6)', 0.75, 0.8], ['rgba(255,200,80,0.7)', 0.5, 0.6], ['rgba(255,245,200,0.6)', 0.28, 0.35]];
      for (const [col, ws, hs] of layers) {
        g.fillStyle = col;
        for (let k = 0; k < 5; k++) {
          const fx = cx + (k - 2) * o.w * 0.14, fw = o.w * 0.2 * ws + o.w * 0.04, ph = k * 1.9;
          const fh = o.h * hs * (0.5 + 0.18 * Math.sin(t * (3.2 + k * 0.4) + ph) + 0.1 * Math.sin(t * 8.3 + ph)) * (k === 2 ? 1.15 : 1);
          const sway = Math.sin(t * 2.6 + ph) * fw * 0.35;
          g.beginPath(); g.moveTo(fx - fw, base);
          g.bezierCurveTo(fx - fw, base - fh * 0.45, fx - fw * 0.25 + sway, base - fh * 0.7, fx + sway * 1.4, base - fh);
          g.bezierCurveTo(fx + fw * 0.25 + sway, base - fh * 0.7, fx + fw, base - fh * 0.45, fx + fw, base);
          g.fill();
        }
      }
      try { g.filter = 'none'; } catch (e) {}
      g.globalCompositeOperation = 'source-over';
      // cjepanice i žar
      g.fillStyle = '#3a1e0c'; g.beginPath(); g.roundRect(o.x + o.w * 0.12, base - o.h * 0.07, o.w * 0.76, o.h * 0.06, 6); g.fill();
      g.fillStyle = '#4a2810'; g.beginPath(); g.roundRect(o.x + o.w * 0.2, base - o.h * 0.12, o.w * 0.6, o.h * 0.055, 6); g.fill();
      g.fillStyle = 'rgba(255,120,30,' + (0.5 + 0.3 * glow).toFixed(2) + ')'; g.fillRect(o.x + o.w * 0.15, base - o.h * 0.02, o.w * 0.7, o.h * 0.02);
      g.restore();
      for (let k = 0; k < L.candles.length; k++) flame(L.candles[k][0], L.candles[k][1] - 10, Math.max(4, Math.min(W, H) * 0.012), t, k * 1.7);
    }
    let last = 0;
    function loop(t) {
      if (document.visibilityState === 'visible' && t - last > 40) { last = t; draw(t); }
      requestAnimationFrame(loop);
    }
    if (reduceMotion) draw(0); else requestAnimationFrame(loop);
  })();

  // ---------- ukrasi bajke: lampice na žici, mjesec, loze u kutovima ----------
  (function deco() {
    const box = document.getElementById('deco');
    if (!box || getComputedStyle(box).display === 'none') return;
    const vine = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M2 98 C10 70 8 50 22 36 C34 24 30 10 44 4" fill="none" stroke="#3c7a2a" stroke-width="3.5" stroke-linecap="round"/><path d="M2 98 C24 92 44 96 62 86 C76 78 86 84 98 76" fill="none" stroke="#3c7a2a" stroke-width="3" stroke-linecap="round"/><g fill="#5fa23a"><ellipse cx="16" cy="52" rx="7" ry="3.6" transform="rotate(-50 16 52)"/><ellipse cx="30" cy="30" rx="6" ry="3.2" transform="rotate(-30 30 30)"/><ellipse cx="40" cy="92" rx="7" ry="3.4" transform="rotate(-10 40 92)"/><ellipse cx="70" cy="82" rx="6" ry="3" transform="rotate(-25 70 82)"/></g><circle cx="24" cy="40" r="4.5" fill="#ffd24a"/><circle cx="24" cy="40" r="1.8" fill="#e07a2a"/><circle cx="56" cy="88" r="4" fill="#d79cf0"/><circle cx="56" cy="88" r="1.6" fill="#fff6c8"/><circle cx="86" cy="80" r="3.5" fill="#ff9fb2"/><circle cx="40" cy="8" r="3.4" fill="#ffd24a"/></svg>';
    function lights() {
      const W = innerWidth, n = Math.max(6, Math.round(W / 110)), spans = Math.max(2, Math.round(W / 520)), sag = Math.min(46, 18 + W / 60);
      let path = 'M0 6', bulbs = '';
      for (let i = 0; i < spans; i++) { const x0 = i * W / spans, x1 = (i + 1) * W / spans; path += ' Q' + ((x0 + x1) / 2) + ' ' + (6 + sag * 2) + ' ' + x1 + ' 6'; }
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * W / n, seg = Math.min(spans - 1, Math.floor(x / (W / spans))), lx = (x - seg * W / spans) / (W / spans), y = 6 + 4 * sag * lx * (1 - lx);
        bulbs += '<g class="bulb" style="animation-delay:' + (-i * 0.53).toFixed(2) + 's"><line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + 7) + '" stroke="#2a2418" stroke-width="2"/><circle cx="' + x + '" cy="' + (y + 15) + '" r="18" fill="url(#bulbGlow)"/><ellipse cx="' + x + '" cy="' + (y + 14) + '" rx="5" ry="7" fill="#ffe3a0"/></g>';
      }
      return '<svg class="lights" width="' + W + '" height="' + (sag + 40) + '" aria-hidden="true"><defs><radialGradient id="bulbGlow"><stop offset="0" stop-color="rgba(255,210,120,.8)"/><stop offset="1" stop-color="rgba(255,180,80,0)"/></radialGradient></defs><path d="' + path + '" fill="none" stroke="#2a2418" stroke-width="2.5"/>' + bulbs + '</svg>';
    }
    function build() { box.innerHTML = lights() + '<div class="moon"></div><div class="vine l">' + vine + '</div><div class="vine r">' + vine + '</div>'; }
    build();
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  })();

  // ---------- zvuk faza ----------
  let tvStep = -1, phoneStep = -1, lastTickSec = -1;
  function tvSound(d) {
    if ((d.mo || d.rcr || d.tkr) && d.ph !== 'moment') tdSting(d);
    switch (d.ph) {
      case 'intro': return SFX.play('whoosh');
      case 'fstart': return fstartSound(d);
      case 'vote': case 'sort': case 'link': case 'fq': return SFX.play('pop');
      case 'voteResult': if (d.tb) return rouletteSound(d); return SFX.play('step');
      case 'fr': return SFX.play('step');
      case 'power': return SFX.play('zap');
      case 'bet': return SFX.play('whoosh');
      case 'betray': case 'loyal': return betraySound(d);
      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');
      case 'deal': case 'howto': return AUDIO.play('whoosh');
      case 'order': case 'hilo': case 'blitz': case 'maj': case 'uljez': case 'uljezVote': return AUDIO.play('pop');
      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': case 'majReveal': case 'uljezReveal': return AUDIO.play('correct');
      case 'duelIntro': return AUDIO.play('stingDuel');
      case 'duelResult': return AUDIO.play(d.du && d.du.w ? 'correct' : 'wrong');
      case 'secret': return AUDIO.play('pop');
      case 'question': return SFX.play(d.ev && d.ev.some((e) => e.t) ? 'zap' : 'pop');
      case 'reveal': return wheelSound(d, () => SFX.play('correct'));
      case 'sortReveal': case 'linkReveal': return SFX.play('correct');
      case 'final': AUDIO.play('victory'); setTimeout(() => confetti(150), 350); return;
    }
  }
  const FX_SOUND = { led: 'powerIce', sluz: 'powerSlime', grick: 'powerBug', bomba: 'powerZap' };
  function phoneSound(d, me) {
    if (!me) return;
    if ((d.mo || d.rcr || d.tkr) && d.ph !== 'moment') tdSting(d);
    switch (d.ph) {
      case 'intro': return SFX.play('whoosh');
      case 'bet': return SFX.play('pop');
      case 'fstart': if (d.ntv) fstartSound(d); return;
      case 'voteResult': if (d.ntv && d.tb) rouletteSound(d); return;
      case 'betray': case 'loyal': return betraySound(d);
      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');
      case 'deal': case 'howto': return AUDIO.play('whoosh');
      case 'order': case 'hilo': case 'blitz': case 'maj': case 'uljez': case 'uljezVote': return AUDIO.play('pop');
      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': return AUDIO.play(me.g ? 'correct' : 'wrong');
      case 'majReveal': return AUDIO.play(d.mj && d.mj.win.includes(me.mv) ? 'correct' : 'wrong');
      case 'uljezReveal': return AUDIO.play(me.g ? 'correct' : 'wrong');
      case 'duelIntro': AUDIO.play('stingDuel'); if (d.du && (d.du.a === me.id || d.du.b === me.id)) HAPTIC.impact(); return;
      case 'duelResult': if (d.du && d.du.w === me.id) { AUDIO.play('correct'); HAPTIC.confirm(); } else if (d.du && (d.du.a === me.id || d.du.b === me.id)) AUDIO.play('wrong'); return;
      case 'secret': case 'secret2': if (d.se && (d.se.p === me.id || d.se.x === me.id)) { AUDIO.play('pop'); HAPTIC.tap(); } return;
      case 'question': case 'fq': if (L.fx || (L.bombs && L.bombs.length) || L.eat) HAPTIC.impact(); if (L.fx) AUDIO.play(FX_SOUND[L.fx.k] || 'powerZap'); else if (L.bombs && L.bombs.length) AUDIO.play('powerZap'); else if (L.eat) AUDIO.play('powerBug'); return;
      case 'reveal': return wheelSound(d, () => { if (me.ch === d.cor) { AUDIO.play('correct'); HAPTIC.confirm(); } else { AUDIO.play('wrong'); HAPTIC.error(); } });
      case 'sortReveal': case 'linkReveal': return AUDIO.play(me.k ? 'correct' : 'wrong');
      case 'fr': if (me.mv) { AUDIO.play('step'); HAPTIC.step(); } else if (me.ch === d.cor && me.ug) AUDIO.play('correct'); else AUDIO.play('wrong'); return;
      case 'final': AUDIO.play('victory'); if (d.win === PID) HAPTIC.victory(); setTimeout(() => confetti(110), 350); return;
    }
  }
  const MUTE_ON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const MUTE_OFF = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 9l6 6M22 9l-6 6" stroke="#c0533c" stroke-width="2.2" stroke-linecap="round"/></svg>';
  function updMute() {
    const b = document.getElementById('mute');
    if (!b) return;
    b.innerHTML = SFX.muted ? MUTE_OFF : MUTE_ON;
    b.setAttribute('aria-label', SFX.muted ? 'Uključi zvuk' : 'Isključi zvuk');
  }
  (function () { const b = document.getElementById('mute'); if (b) { b.onclick = () => { SFX.toggle(); updMute(); }; updMute(); } })();
  const NOTE_ON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17V5l11-2v12" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="2.8" fill="#fff"/><circle cx="17.5" cy="15.5" r="2.8" fill="#fff"/></svg>';
  const NOTE_OFF = NOTE_ON.replace('</svg>', '<path d="M3 3l18 18" stroke="#c0533c" stroke-width="2.4" stroke-linecap="round"/></svg>');
  function updMusic() {
    const b = document.getElementById('music'); if (!b) return;
    b.innerHTML = MUSIC.on ? NOTE_ON : NOTE_OFF;
    b.setAttribute('aria-label', MUSIC.on ? 'Isključi glazbu' : 'Uključi glazbu');
    b.classList.toggle('off', !MUSIC.on);
  }
  (function () { const b = document.getElementById('music'); if (b) { b.onclick = () => { MUSIC.toggle(); updMusic(); }; updMusic(); } })();

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
  let hostWatch = null, hostRetryTimer = null;
  const hasPeer = () => typeof Peer === 'function';
  const appUrl = () => location.origin + location.pathname;
  let mode = 'home';            // home | join | player | host | demo
  let demoView = 'phone';       // phone | tv (u demo načinu)
  let game = null, hostPeer = null, hostErr = '', pubTimer = null, pubPending = false;
  const hostConns = new Map();
  const connRate = new WeakMap();
  let joinTries = 0, relayTimer = null;
  let ppeer = null, pconn = null, waitTimer = null, retryTimer = null, perr = '', pcode = '', pname = '', netNote = '';
  let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;
  let L = freshLocal(-1);
  let clockEnds = 0, clockDur = 0;
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (mode === 'home') render(); });

  let PID = store.get('mz_pid');
  if (!PID) { PID = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('mz_pid', PID); }
  // Novi ključ: prethodni je mogao biti izložen preko javnog MQTT-a.
  let SK = store.get('mz_sk_v2');
  if (!SK || !/^[0-9a-f]{32}$/.test(SK)) {
    const a = new Uint8Array(16);
    try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256); }
    SK = Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); store.set('mz_sk_v2', SK);
  }
  const hostKeys = new Map();   // domaćin: pid → ključ (prvi koji se javio s tim pid-om)
  const okKey = (k) => typeof k === 'string' && /^[0-9a-f]{32}$/.test(k);
  let myAv = parseInt(store.get('mz_av'), 10);
  if (!(myAv >= 0 && myAv < 10)) myAv = 8 + Math.floor(Math.random() * 2);

  function freshLocal(s) {
    return { s, sent: null, pw: null, fxq: [], fx: null, fxTimer: null, sortI: 0, sortR: [], linkI: 0, linkR: [], ulSel: [] };
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
    if (document.visibilityState === 'visible' && (mode === 'host' || mode === 'hostp' || mode === 'player' || mode === 'demo')) keepAwake();
  });

  // ---------- navigacija ----------
  function reset() {
    try { sessionStorage.removeItem('mz_recovery_v1'); } catch (e) {}
    if (game) game.stop();
    clearInterval(pubTimer); clearInterval(hostWatch); clearTimeout(hostRetryTimer); clearTimeout(relayTimer); clearTimeout(waitTimer); clearTimeout(retryTimer); stopFxTimer(); hostOff = false;
    for (const c of hostConns.keys()) { try { c.close(); } catch (e) {} }
    hostConns.clear();
    if (hostPeer) { try { hostPeer.destroy(); } catch (e) {} }
    if (ppeer) { try { ppeer.destroy(); } catch (e) {} }
    stopHostRelay(); stopPlayerRelay();
    game = null; hostPeer = null; ppeer = null; pconn = null; S = null; PV = null;
    hostErr = ''; perr = ''; netNote = ''; lastSig = '';
    L = freshLocal(-1);
    try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    mode = 'home';
    lastLobbyFeedback = null; connectionWasLost = false;
    const notice = document.getElementById('connectionNotice'); if (notice) notice.remove();
    render();
  }

  // ---------- rezervni put: poruke preko javnog MQTT posrednika (WebSocket, port 443/8084...) ----------
  // Javni MQTT nije autentificiran, zato su sve poruke šifrirane tajnim ključem sobe (AES-GCM); bez ključa relej se ne koristi.
  const RELAY_ENABLED = !!(window.crypto && crypto.subtle);
  // Kad su oba uređaja na mobilnim podacima (CGNAT), izravna WebRTC veza često ne uspije. Tada se
  // stanje igre i unosi šalju preko MQTT teme sobe. Minimalni MQTT 3.1.1 klijent, QoS 0.
  const RELAY_URLS = window.__MQTT_URLS || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const RELAY_NS = 'mozgalica-kip/v2/';
  // ključ sobe: domaćin ga stvara; igrač ga dobiva iz poveznice/QR koda (#KOD-ključ) i pamti za tu sobu
  let HOST_RS = null, PLAYER_RS = null;
  const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const ub64u = (t) => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)), (c) => c.charCodeAt(0));
  const newRoomSecret = () => b64u(crypto.getRandomValues(new Uint8Array(16)));
  const okRS = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{22}$/.test(t);
  const joinHash = (code) => '#' + code + (HOST_RS ? '-' + HOST_RS : '');
  function rememberRS(code, rs) { try { if (okRS(rs)) sessionStorage.setItem('mz_rs_' + code, rs); } catch (e) {} }
  function recallRS(code) { try { const t = sessionStorage.getItem('mz_rs_' + code); return okRS(t) ? t : null; } catch (e) { return null; } }
  const RCTX = new Map();
  async function relayCtx(rs) {
    if (!okRS(rs)) return null;
    if (RCTX.has(rs)) return RCTX.get(rs);
    const raw = ub64u(rs), base = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey', 'deriveBits']);
    const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('mz-relay-key') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const tb = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('mz-relay-topic') }, base, 128));
    const ctx = { key, t: Array.from(tb, (b) => b.toString(16).padStart(2, '0')).join('') };
    RCTX.set(rs, ctx); return ctx;
  }
  async function rEnc(ctx, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12)), pt = enc.encode(typeof obj === 'string' ? obj : JSON.stringify(obj));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, ctx.key, pt));
    return JSON.stringify({ v: 2, i: b64u(iv), c: b64u(ct) });
  }
  async function rDec(ctx, m) {
    if (!ctx || !m || m.v !== 2 || typeof m.i !== 'string' || typeof m.c !== 'string') return null;
    try { return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64u(m.i) }, ctx.key, ub64u(m.c)))); } catch (e) { return null; }
  }
  // šifrirano slanje i primanje uz očuvan redoslijed poruka
  function rPub(client, ctx, topic, obj) { client.q2 = (client.q2 || Promise.resolve()).then(() => rEnc(ctx, obj)).then((t) => client.publish(topic, t)).catch(() => {}); }
  function rOn(ctx, fn) { let chain = Promise.resolve(); return (topic, m) => { chain = chain.then(() => rDec(ctx, m)).then((d) => { if (d) fn(topic, d); }).catch(() => {}); }; }
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
          if (n - off <= 700000) { try { onMsg(topic, JSON.parse(dec.decode(body.subarray(off)))); } catch (e) {} }
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
    if (!RELAY_ENABLED) return Promise.resolve(false);
    return new Promise((res) => {
      let left = RELAY_URLS.length, done = false;
      RELAY_URLS.forEach((u) => { const c = mqttClient(u, () => {}, () => {}); c.whenReady(6000).then((ok) => { c.close(); if (done) return; if (ok) { done = true; res(true); } else if (--left === 0) res(false); }); });
    });
  }
  const rTopic = (ctx, k) => RELAY_NS + ctx.t + '/' + k;

  // domaćin: sluša na svim posrednicima; igrač preko releja dobiva "virtualnu vezu"
  let hostRelays = [], relaySweep = null;
  const relayConns = new Map();   // pid → lažna veza
  let hostCtx = null;
  async function startHostRelay(code) {
    if (!RELAY_ENABLED || !HOST_RS) return;
    stopHostRelay();
    const ctx = await relayCtx(HOST_RS); if (!ctx || !game) return;
    hostCtx = ctx;
    hostRelays = RELAY_URLS.map((u) => {
      const c = mqttClient(u, rOn(ctx, (topic, m) => onRelayHost(c, ctx, m)), () => {});
      c.subscribe(rTopic(ctx, 'h'));
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
    hostRelays.forEach((c) => c.close()); hostRelays = []; hostCtx = null;
    for (const conn of relayConns.values()) hostConns.delete(conn);
    relayConns.clear();
  }
  function onRelayHost(client, ctx, m) {
    if (!m || typeof m !== 'object' || typeof m.pid !== 'string' || !game || !okKey(m.sk)) return;
    const pid = m.pid.slice(0, 40);
    const key = hostKeys.get(pid);
    if (key && key !== m.sk) return;                                   // lažno predstavljanje
    if (!key) { if (m.t !== 'hello') return; hostKeys.set(pid, m.sk); }
    let conn = relayConns.get(pid);
    if (!conn || conn.client !== client) {
      if (conn) hostConns.delete(conn);
      conn = { relay: true, open: true, client, pid, last: Date.now(),
        send(v) { rPub(client, ctx, rTopic(ctx, 'p/' + pid + '/' + m.sk.slice(0, 16)), v); }, close() { this.open = false; } };
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
    if (!RELAY_ENABLED) return;
    if (prelay || mode !== 'player') return;
    const code = pcode, ctx = await relayCtx(PLAYER_RS);
    if (!ctx) return;   // kod upisan ručno, bez ključa sobe: samo izravna veza
    for (const u of RELAY_URLS) {
      if (mode !== 'player' || pcode !== code || (pconn && pconn.open)) return;
      const c = mqttClient(u, rOn(ctx, (topic, d) => {
        if (prelay !== c) return;
        if (d && d.t === 'who') { rPub(c, ctx, rTopic(ctx, 'h'), { t: 'hello', pid: PID, sk: SK, name: pname, av: myAv }); return; }
        if (d && d.t === 'pv' && d.code === pcode) { if (pconn && pconn.open) return; const ch = JSON.stringify(d.pv) !== JSON.stringify(PV); PV = d.pv; if (ch && S) phoneRender(); return; }
        if (d && d.code === pcode && Array.isArray(d.P) && d.P.length <= 12 && typeof d.ph === 'string') {
          if (pconn && pconn.open) return;           // izravna veza ima prednost
          clearTimeout(waitTimer);
          if (netNote) { netNote = ''; if (S) phoneRender(true); }
          applyState(d);
        }
      }), () => { if (prelay === c) { prelay = null; clearInterval(prelayPing); clearInterval(prelayHello); if (mode === 'player' && !(pconn && pconn.open)) setTimeout(startPlayerRelay, 1500); } });
      c.subscribe(rTopic(ctx, 'all')); c.subscribe(rTopic(ctx, 'p/' + PID + '/' + SK.slice(0, 16)));
      prelay = c;
      if (await c.whenReady(5000)) {
        if (prelay !== c || mode !== 'player' || pcode !== code || (pconn && pconn.open)) { c.close(); return; }
        const hello = () => rPub(c, ctx, rTopic(ctx, 'h'), { t: 'hello', pid: PID, sk: SK, name: pname, av: myAv });
        hello(); if (L.sent) rPub(c, ctx, rTopic(ctx, 'h'), { t: 'in', pid: PID, sk: SK, in: L.sent });
        clearInterval(prelayHello); prelayHello = setInterval(() => { if (!S) hello(); else clearInterval(prelayHello); }, 2000);
        clearInterval(prelayPing); prelayPing = setInterval(() => rPub(c, ctx, rTopic(ctx, 'h'), { t: 'ping', pid: PID, sk: SK }), 3000);
        c.ctx = ctx;
        return;
      }
      if (prelay === c) prelay = null;
      c.close();
    }
  }
  function stopPlayerRelay() {
    clearInterval(prelayPing); clearInterval(prelayHello);
    if (prelay) { const c = prelay; prelay = null; try { if (c.ctx) rPub(c, c.ctx, rTopic(c.ctx, 'h'), { t: 'bye', pid: PID, sk: SK }); } catch (e) {} setTimeout(() => c.close(), 300); }
  }
  // jedno mjesto za slanje domaćinu: izravna veza ako je otvorena, inače relej
  function netSend(m) {
    if (pconn && pconn.open) { try { pconn.send(m); return; } catch (e) {} }
    if (prelay && prelay.ctx) rPub(prelay, prelay.ctx, rTopic(prelay.ctx, 'h'), Object.assign({}, m, { pid: PID, sk: SK }));
  }

  // ---------- domaćin (TV) ----------
  function syncConns() {
    if (game) game.syncPeers([...hostConns.values()].filter((x) => x.pid));
  }
  // ograničenje učestalosti po vezi (spremnik žetona, 30 poruka + 20 u sekundi): štiti domaćina od zatrpavanja porukama
  function allowHostMessage(conn, now) {
    const rl = connRate.get(conn) || { n: 30, t: now };
    rl.n = Math.min(30, rl.n + Math.max(0, now - rl.t) / 1000 * 20); rl.t = now;
    connRate.set(conn, rl);
    if (rl.n < 1) return false;
    rl.n -= 1;
    return true;
  }
  function onHostData(conn, m) {
    const x = hostConns.get(conn);
    if (!x || !m || typeof m !== 'object' || !game) return;
    if (!allowHostMessage(conn, Date.now())) return;
    if (m.t === 'hello' && typeof m.pid === 'string' && typeof m.name === 'string') {
      const pid = m.pid.slice(0, 40);
      if (!okKey(m.sk) || (x.pid && x.pid !== pid)) return;           // bez ključa ili zamjena identiteta na istoj vezi
      const k = hostKeys.get(pid); if (k && k !== m.sk) return;        // netko drugi već je taj igrač
      hostKeys.set(pid, m.sk); x.pid = pid; x.name = m.name.slice(0, 40); x.av = m.av;
    }
    else if (!x.pid) return;
    else if (m.t === 'av') x.av = m.av;
    else if (m.t === 'in' && m.in && typeof m.in === 'object') x.in = m.in;
    else if (m.t === 'pa') { if (x.pid && m.a && typeof m.a === 'object') game.pactAction(x.pid, m.a); return; }   // pakt: domaćin sve provjerava
    else return;
    syncConns();
    if (m.t === 'hello' && conn.open) { try { conn.send(Object.assign(game.view(), { pv: game.priv(x.pid) })); } catch (e) {} }
  }
  function publish() {
    if (!game) return;
    if (game.refresh) game.refresh();
    const v = game.view(), rel = new Set();
    // javno stanje je isto za sve; privatno (paktovi) ide samo vlasniku, nikad svima
    for (const [c, x] of hostConns) {
      if (!c.open || !x.pid) continue;
      if (c.relay) { rel.add(c.client); if (x.pid) { try { c.send({ t: 'pv', code: v.code, s: v.s, pv: game.priv(x.pid) }); } catch (e) {} } continue; }
      try { c.send(x.pid ? Object.assign({}, v, { pv: game.priv(x.pid) }) : v); } catch (e) {}
    }
    if (rel.size && hostCtx) { const js = JSON.stringify(v), ctx = hostCtx; rel.forEach((cl) => rPub(cl, ctx, rTopic(ctx, 'all'), js)); }
  }
  function publishSoon() { if (pubPending) return; pubPending = true; setTimeout(() => { pubPending = false; publish(); }, 30); }

  function startHost() {
    mode = 'host'; hostErr = ''; game = null; render(); keepAwake();
    if (!hasPeer()) { hostErr = 'Modul za povezivanje se nije učitao. Provjeri internet i osvježi stranicu.'; return render(); }
    openHostPeer(0);
  }
  // Pitanja (data/questions.js) treba samo uređaj koji vodi igru, pa se učitavaju tek kad domaćin otvara sobu ili demo.
  let dataPromise = null;
  function ensureData() {
    if (typeof DATA !== 'undefined') return Promise.resolve();
    if (!dataPromise) dataPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'data/questions.js';
      s.onload = () => (typeof DATA !== 'undefined' ? resolve() : reject(new Error('Pitanja nisu učitana')));
      s.onerror = () => reject(new Error('Pitanja nisu učitana'));
      document.head.appendChild(s);
    }).catch((e) => { dataPromise = null; throw e; });
    return dataPromise;
  }
  function openHostPeer(tries, opts) {
    ensureData().then(() => openHostPeerNow(tries, opts), () => {
      hostErr = 'Ne mogu učitati pitanja. Provjeri internet i pokušaj ponovno.';
      if (mode === 'hostp') mode = 'hostform';
      render();
    });
  }
  function openHostPeerNow(tries, opts) {
    const code = opts && opts.recovery ? opts.recovery.code : makeCode();
    const peer = new Peer(PEER_PREFIX + code.toLowerCase(), PEER_OPTS);
    let opened = false;
    peer.on('open', () => {
      if (hostPeer === peer) return; // ponovno spajanje s posrednikom: soba ostaje ista (ranije se tu greškom uništavala)
      if ((mode !== 'host' && mode !== 'hostp') || hostPeer || game) { try { peer.destroy(); } catch (e) {} return; }
      opened = true; hostPeer = peer;
      try { openRoom(code, opts); } catch (e) {
        try { peer.destroy(); } catch (_) {}
        hostPeer = null; game = null;
        hostErr = 'Spremljenu partiju nije moguće obnoviti. Vrati se na početni ekran i otvori novu sobu.';
        if (mode === 'hostp') mode = 'hostform';
        render(); return;
      }
      // čuvar: ako veza s posrednikom padne (mobitel u pozadini, promjena mreže), soba je nevidljiva novim igračima → stalno ponovno spajanje
      clearInterval(hostWatch);
      hostWatch = setInterval(() => hostKeepAlive(peer), 3000);
      render();
    });
    peer.on('connection', (conn) => {
      // Ograniči istodobne veze i ne zadržavaj veze koje ne pošalju prijavu.
      if (hostConns.size >= 24) { try { conn.close(); } catch (e) {} return; }
      hostConns.set(conn, { pid: null, name: '', av: 0, in: null });
      const loginTimer = setTimeout(() => {
        const x = hostConns.get(conn);
        if (x && !x.pid) { hostConns.delete(conn); try { conn.close(); } catch (e) {} }
      }, 10000);
      conn.on('data', (m) => onHostData(conn, m));
      const drop = () => { clearTimeout(loginTimer); if (hostConns.delete(conn)) syncConns(); };
      conn.on('close', drop);
      conn.on('error', drop);
    });
    peer.on('disconnected', () => { if (hostPeer === peer) { hostOffline(true); hostKeepAlive(peer); } });
    peer.on('open', () => { if (hostPeer === peer) hostOffline(false); });
    peer.on('error', (e) => {
      if (opened) { if (hostPeer === peer) setTimeout(() => hostKeepAlive(peer), 1500); return; } // gubitak veze jednog igrača ne ruši sobu
      try { peer.destroy(); } catch (er) {}
      if (e && e.type === 'unavailable-id' && tries < 5) {
        if (!(opts && opts.recovery)) return openHostPeer(tries + 1, opts);
        hostRetryTimer = setTimeout(() => { if ((mode === 'host' || mode === 'hostp') && !hostPeer && !game) openHostPeer(tries + 1, opts); }, 1000);
        return;
      }
      // posrednik za WebRTC ne radi: otvori sobu samo preko releja ako je neki MQTT posrednik dostupan
      if ((mode === 'host' || mode === 'hostp') && !game) {
        relayReachable().then((ok) => {
          if (!ok) return fail(e);
          if ((mode === 'host' || mode === 'hostp') && !game) { openRoom(code, opts); render(); }
        });
        return;
      }
      fail(e);
    });
    function fail(e) {
      if (mode === 'host' || mode === 'hostp') {
        hostErr = 'Ne mogu otvoriti sobu (' + ((e && e.type) || 'greška') + '). Provjeri internet i pokušaj ponovno.';
        if (mode === 'hostp') mode = 'hostform';
        render();
      }
    }
  }
  function saveRecovery(journal) {
    if (!game || (mode !== 'host' && mode !== 'hostp')) return;
    try {
      if (game.view().ph === 'final') { sessionStorage.removeItem('mz_recovery_v1'); return; }
      sessionStorage.setItem('mz_recovery_v1', JSON.stringify({ savedAt: Date.now(), code: game.view().code, noTv: mode === 'hostp', keys: [...hostKeys], rs: HOST_RS, journal }));
    } catch (e) { /* Storage may be unavailable or full; the live game continues. */ }
  }
  function openRoom(code, opts) {
    HOST_RS = opts && opts.recovery && okRS(opts.recovery.rs) ? opts.recovery.rs : RELAY_ENABLED ? newRoomSecret() : null;
    if (opts && opts.noTv) {
      // domaćin igra s ovog mobitela; ostali se spajaju kao i inače
      pcode = code;
      hostKeys.clear(); hostKeys.set(PID, SK);
      game = createRecoverableGame({ code, noTv: true, onCheckpoint: saveRecovery, pacts: opts.pacts, onChange: () => { publishSoon(); applyState(Object.assign(game.view(), { pv: game.priv(PID) })); } }, opts.recovery && opts.recovery.journal);
      if (!opts.recovery) game.addPlayer(PID, opts.me, myAv, false, true);
    } else {
      hostKeys.clear();
      game = createRecoverableGame({ code, onCheckpoint: saveRecovery, pacts: opts && opts.pacts, onChange: () => { publishSoon(); render(); } }, opts && opts.recovery && opts.recovery.journal);
    }
    if (opts && opts.recovery) {
      for (const [pid, key] of opts.recovery.keys) if (typeof pid === 'string' && okKey(key)) hostKeys.set(pid, key);
      if (opts.noTv) applyState(Object.assign(game.view(), { pv: game.priv(PID) }));
    }
    saveRecovery(game.checkpoint());
    clearInterval(pubTimer); pubTimer = setInterval(() => { publish(); saveRecovery(game.checkpoint()); }, 1000);
    startHostRelay(code);
  }

  let hostOff = false;
  function hostOffline(v) {
    if (hostOff === v) return; hostOff = v;
    if (v) connectionWasLost = true; else if (connectionWasLost) { connectionWasLost = false; connectionNotice(); }
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
    $app.innerHTML = '<div class="logo"><span class="lt">Trivia</span><span class="lt">Tavern</span></div>' +
      '<form class="form" id="hform" autocomplete="off">' + (hostErr ? '<div class="err">' + esc(hostErr) + '</div>' : '') +
      '<div class="p-title" style="font-size:1.5rem">Nova igra</div>' +
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
    ensureData().then(startDemoNow, () => { mode = 'home'; render(); });
  }
  function startDemoNow() {
    if (mode !== 'demo') return;
    game = createGame({ code: 'DEMO', noTv: true, onChange: () => { applyState(Object.assign(game.view(), { pv: game.priv(PID) })); if (demoView === 'tv') render(); } });
    const name = store.get('mz_name') || 'Ti';
    game.addPlayer(PID, name, myAv, false);
    game.setBots(3);
    render();
  }

  // ---------- igrač (mobitel) ----------
  function joinGame(code, name) {
    pcode = code; pname = name; perr = ''; netNote = ''; S = null; lastSig = ''; L = freshLocal(-1);
    PLAYER_RS = recallRS(code);
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
    if (pconn && pconn.open) return; // ponovno otvaranje signalizacije ne zamjenjuje aktivnu vezu
    if (pconn && !pconn.open) { try { pconn.close(); } catch (e) {} }
    const conn = ppeer.connect(PEER_PREFIX + pcode.toLowerCase(), { reliable: true, serialization: 'json' });
    pconn = conn;
    // WebRTC zna "zapeti" (NAT): ako se kanal ne otvori brzo, pokušaj ponovno umjesto da čekaš do isteka
    const stuck = setTimeout(() => { if (pconn === conn && !conn.open && mode === 'player') { joinTries++; if (S) retrySoon(); else if (joinTries < 5) connectHost(); } }, 7000);
    conn.on('open', () => {
      clearTimeout(stuck);
      if (pconn !== conn) return;
      try {
        conn.send({ t: 'hello', pid: PID, sk: SK, name: pname, av: myAv });
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
    connectionWasLost = true;
    if (!netNote) { netNote = 'Veza je prekinuta. Spajam ponovno…'; phoneRender(true); }
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (mode !== 'player') return;
      if (!ppeer || ppeer.destroyed) { if (!prelay) failJoin('Veza s igrom je izgubljena.'); return; }
      if (ppeer.disconnected) { try { ppeer.reconnect(); } catch (e) {} retryTimer = setTimeout(connectHost, 1500); }
      else connectHost();
    }, 1500);
  }

  function checkConnection() {
    if (hostPeer) hostKeepAlive(hostPeer);
    if (mode !== 'player' || !S || document.visibilityState !== 'visible') return;
    if (lastStateAt && Date.now() - lastStateAt > 12000) {
      lastStateAt = Date.now();
      const stale = pconn; pconn = null;
      try { if (stale) stale.close(); } catch (e) {}
      retrySoon();
    }
  }
  window.addEventListener('online', checkConnection);
  setInterval(checkConnection, 3000);

  // zatvaranje kartice odmah javi domaćinu (umjesto da čeka da veza istekne)
  window.addEventListener('beforeunload', (e) => {
    // Stanje partije je samo u memoriji domaćina; osvježavanje ga briše.
    if (game && (mode === 'host' || mode === 'hostp') && game.view().ph !== 'lobby' && game.view().ph !== 'final') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('pagehide', () => { if (game && game.checkpoint) saveRecovery(game.checkpoint()); try { if (pconn) pconn.close(); } catch (e) {} if (mode === 'player') stopPlayerRelay(); });

  function sendInput(inp) {
    AUDIO.play('confirm');
    inp.s = L.s;
    L.sent = inp;
    if (isLocalHost()) game.setInput(PID, inp);
    else netSend({ t: 'in', in: inp });
    phoneRender(true);
  }
  function pactSend(a) {
    if (isLocalHost()) { if (game) game.pactAction(PID, a); }
    else netSend({ t: 'pa', a });
  }
  function chooseAvatar(i) {
    myAv = i; store.set('mz_av', String(i));
    if (isLocalHost()) game.setAvatar(PID, i);
    else netSend({ t: 'av', av: i });
  }

  const meOf = (d) => d && d.P.find((p) => p.id === PID);
  const PW_SHORT = { led: 'Protivnik tapkanjem razbija led.', sluz: 'Protivnik mora obrisati sluz.', grick: 'Protivniku nestaje dio slova.', bomba: 'Dodir bombe zaklanja pogled na 2 sekunde.', dupli: 'Točan odgovor vrijedi dvostruko.', pola: 'Ukloni dva netočna odgovora.', stit: 'Odbij sve napade u ovom pitanju.', utjeha: 'Netočno: +250. Bez odgovora: +0.' };
  const pwDesc = (k, d) => (d && d.fin && k === 'dupli' ? 'Točan odgovor: dodatni napredak.' : PW_SHORT[k] || POWERS[k].d);
  const stepTxt = (n) => (n ? n + '. stepenice' : 'dna piramide');
  const isLocalHost = () => mode === 'demo' || mode === 'hostp';
  const phoneShown = () => mode === 'player' || mode === 'hostp' || (mode === 'demo' && demoView === 'phone');
  function miniBoard(d, gain) {
    const r = d.P.slice().sort((a, b) => b.sc - a.sc);
    const before = gain ? d.P.slice().sort((a, b) => (b.sc - (b.g || 0) - (b.ub || 0) - (b.br || 0) - (b.xb || 0) - (b.rx || 0) - (b.tb || 0) - (b.kb || 0) - (b.ob || 0)) - (a.sc - (a.g || 0) - (a.ub || 0) - (a.br || 0) - (a.xb || 0) - (a.rx || 0) - (a.tb || 0) - (a.kb || 0) - (a.ob || 0))).map((p) => p.id) : [];
    return '<div class="mboard' + (gain ? '' : ' wide') + '">' + r.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '" data-id="' + esc(p.id) + '" data-prev="' + (gain ? before.indexOf(p.id) : i) + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a, gain && p.g ? 'happy' : '') + '</span><span class="nm">' + esc(p.n) + (p.id === PID ? '<span class="you">Ti</span>' : '') + pjBadge(d, p.id) + (gain && p.ub ? '<span class="betb">Utjeha +' + p.ub + '</span>' : '') + (gain && p.ob ? '<span class="betb krb">🎲 +' + p.ob + '</span>' : '') + (gain && p.oq < 0 ? '<span class="betb krb neg">🎲 promašaj</span>' : '') + (gain && p.kb ? '<span class="betb krb' + (p.kb < 0 ? ' neg' : '') + '">📜 ' + (p.kb > 0 ? '+' : '−') + Math.abs(p.kb) + '</span>' : '') + (gain && p.tb ? '<span class="betb tkb' + (p.tb < 0 ? ' neg' : '') + '">🍺 ' + (p.tb > 0 ? '+' : '−') + Math.abs(p.tb) + '</span>' : '') + (gain && p.rx ? '<span class="betb rcb' + (p.rx < 0 ? ' neg' : '') + '">⚔️ ' + (p.rx > 0 ? '+' : '−') + Math.abs(p.rx) + '</span>' : '') + (gain && p.br ? '<span class="betb' + (p.br < 0 ? ' neg' : '') + '">ulog ' + (p.br > 0 ? '+' : '−') + Math.abs(p.br) + '</span>' : '') + '</span>' +
      (gain ? '<span class="gain' + ((p.g || p.ub) ? '' : ' zero') + '">+' + ((p.g || 0) + (p.ub || 0)) + '</span>' : '') + '<span class="sc"' + (gain ? ' data-ck="mb' + esc(p.id) + '" data-cu="' + (p.sc - (p.g || 0) - (p.ub || 0) - (p.br || 0) - (p.xb || 0) - (p.rx || 0) - (p.tb || 0) - (p.kb || 0) - (p.ob || 0)) + '" data-to="' + p.sc + '" data-cud="' + (gain === true ? 450 : gain) + '" data-cdur="900"' : '') + '>' + p.sc + '</span></div>').join('') + '</div>';
  }
  function phoneEvents(d) {
    if (!d.ev || !d.ev.length) return '';
    return '<div class="p-sub" style="margin-top:4px">Moći u ovom pitanju</div>' + evHtml(d);
  }

  function applyState(d) {
    if (connectionWasLost) { connectionWasLost = false; netNote = ''; connectionNotice(); }
    lastStateAt = Date.now();
    if (d && 'pv' in d) PV = d.pv || null;
    clearTimeout(waitTimer);
    const t = Date.now();
    if (!S || d.s !== L.s) {
      stopFxTimer();
      L = freshLocal(d.s);
      clockEnds = t + d.ms; clockDur = d.dur;
      L.start = t - (d.dur - d.ms);
      const me = meOf(d);
      if ((d.ph === 'question' || d.ph === 'fq') && me && me.fx) {
        L.fxq = me.fx.filter((k) => k === 'led' || k === 'sluz'); L.fx = makeFx(L.fxq[0]);
        L.eat = me.fx.filter((k) => k === 'grick').length;
        const nb = me.fx.filter((k) => k === 'bomba').length * 3;
        L.bombs = Array.from({ length: nb }, (_, i) => ({ x: 12 + Math.random() * 76, y: 15 + Math.random() * 70, vx: (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 14), vy: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 12), on: true }));
      }
    }
    S = d; document.documentElement.dataset.ph = d.ph;
    if (phoneShown()) {
      const sig = phoneSig(d);
      if (sig !== lastSig) { lastSig = sig; phoneRender(false); } else krLive(d);
    }
  }
  function phoneSig(d) {
    const me = meOf(d) || null;
    const roster = (d.ph === 'lobby' || d.ph === 'power' || d.ph === 'final') ? d.P.map((p) => [p.id, p.n, p.a, p.c])
      : (d.ph === 'vote' || d.ph === 'voteResult') ? d.P.map((p) => [p.id, p.a, p.vt]) : ['duel', 'question', 'fq', 'howto'].includes(d.ph) ? d.P.map((p) => [p.id, p.a, p.ok, p.c]) : null;
    return JSON.stringify([PV ? JSON.stringify(PV, (k, v) => (k === 'ms' ? Math.ceil(v / 1000) : v)) : 0, d.news ? d.news.id : 0, d.bt ? d.bt.id : 0, d.ph, d.s, me, d.cats, d.cw, d.q, d.so, d.li, d.cor, d.win, d.it, d.ev, roster, d.mo, d.du, d.se, d.sxr, d.ht, d.or, d.hl ? 1 : 0, d.bz ? 1 : 0, d.mj, d.ul, d.rc || 0, d.rcr ? d.rcr.id : 0, d.tkr ? d.tkr.id : 0, d.rw || 0, d.lc || 0, d.rp ? [d.rp.pa, d.rp.pb] : 0, d.opt || 0, d.pj || 0]);
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
    HAPTIC.impact();
    // odgovori ostaju zaključani kratko vrijeme da se zadnji dodir ne pretvori u odgovor
    L.lockUntil = Date.now() + 400;
    const s0 = L.s;
    setTimeout(() => { if (L.s === s0) phoneRender(true); }, 420);
    phoneRender(true);
  }
  const FX_LABEL = { led: 'Zaleđen si! Tapkaj da razbiješ led', sluz: 'Sluz! Obriši je prstom' };
  // grickalice: dio slova u odgovorima je pojeden (isti za cijelo pitanje)
  function optText(o, i) {
    if (!L.eat) return esc(o);
    let seed = (L.s * 97 + i * 131 + 7) >>> 0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) / 16777216; };
    const chars = Array.from(o), idx = chars.map((c, j) => (/\S/.test(c) ? j : -1)).filter((j) => j >= 0);
    const frac = Math.min(0.7, 0.4 + 0.15 * (L.eat - 1));
    const n = Math.max(1, Math.round(idx.length * frac));
    const gone = new Set();
    while (gone.size < Math.min(n, idx.length)) gone.add(idx[Math.floor(rnd() * idx.length)]);
    let k = 0;
    return chars.map((c, j) => (gone.has(j) ? '<span class="bite" style="animation-delay:calc(' + (150 + (k++) * 60) + 'ms - var(--pel, 0ms))">' + esc(c) + '</span>' : esc(c))).join('') +
      '<span class="eater" aria-hidden="true">' + bugSvg + '</span>';
  }
  function bombLayer() {
    if (!L.bombs || !L.bombs.some((b) => b.on) || L.fx) return '';
    return '<div class="bomb-layer" id="bombs">' + L.bombs.map((b, i) => (b.on ? '<button class="fly-bomb" data-bi="' + i + '" style="transform:translate(' + b.x + 'cqw,' + b.y + 'cqh)" aria-label="Bomba, ne diraj!">' + bombSvg + '</button>' : '')).join('') + '</div>';
  }
  function boomCover() { const left = (L.boomUntil || 0) - Date.now(); return left > 0 ? '<div class="boom-cover" style="--bel:' + Math.round(2000 - left) + 'ms"><b>BUM!</b></div>' : ''; }
  function bindBombs() {
    const layer = document.getElementById('bombs');
    if (!layer) return;
    layer.querySelectorAll('[data-bi]').forEach((b) => {
      b.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation();
        const bomb = L.bombs[+b.dataset.bi]; if (!bomb || !bomb.on) return;
        bomb.on = false; L.boomUntil = Date.now() + 2000;
        AUDIO.play('powerBomb'); HAPTIC.bomb();
        const s0 = L.s; setTimeout(() => { if (L.s === s0) phoneRender(true); }, 2050);
        phoneRender(true);
      };
    });
    if (L.bombRaf) return;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const lay = document.getElementById('bombs');
      if (!lay || !L.bombs) { L.bombRaf = 0; return; }
      for (const el of lay.querySelectorAll('[data-bi]')) {
        const b = L.bombs[+el.dataset.bi];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 8 || b.x > 92) { b.vx *= -1; b.x = Math.max(8, Math.min(92, b.x)); }
        if (b.y < 10 || b.y > 90) { b.vy *= -1; b.y = Math.max(10, Math.min(90, b.y)); }
        el.style.transform = 'translate(' + b.x.toFixed(2) + 'cqw,' + b.y.toFixed(2) + 'cqh)';
      }
      L.bombRaf = requestAnimationFrame(step);
    };
    L.bombRaf = requestAnimationFrame(step);
  }
  function fxHtml(fx) {
    if (!fx) return '';
    const label = '<div class="fx-label">' + FX_LABEL[fx.k] + '</div>';
    if (fx.k === 'led') {
      const crack = Math.min(1, fx.hits / fx.need);
      let lines = '';
      for (let i = 0; i < fx.hits; i++) {
        const x = 15 + ((i * 37) % 70), y = 20 + ((i * 53) % 60);
        lines += '<path' + (i === fx.hits - 1 ? ' class="new"' : '') + ' d="M' + x + ' ' + y + 'l' + (8 + i) + ' ' + (10 - i) + 'l-6 ' + (12 + i) + 'M' + x + ' ' + y + 'l-' + (10 + i) + ' 6" stroke="#fff" stroke-width="1.4" fill="none"/>';
      }
      return '<div class="fx fx-led' + (fx.hits ? '' : ' in') + '" id="fx" style="opacity:' + (1 - crack * 0.35) + '">' + label +
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
        SFX.play('crack');
        HAPTIC.tap();
        if (fx.hits >= fx.need) return fxDone();
        el.outerHTML = fxHtml(fx); bindFx();
        const n = document.getElementById('fx'); if (n) n.classList.add('shake');
      };
    } else if (fx.k === 'sluz') {
      const cells = el.querySelectorAll('.cell');
      let lx = null, ly = null;
      const hit = (px, py) => {
        const cx = Math.floor(px), cy = Math.floor(py);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x > 5 || y < 0 || y > 7) continue;
          const i = y * 6 + x;
          if (fx.cells[i]) { fx.cells[i] = 0; fx.left--; if (cells[i]) cells[i].classList.add('gone'); if (fx.left % 7 === 0) SFX.play('splat'); }
        }
      };
      const wipe = (e) => {
        const r = el.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 6, py = ((e.clientY - r.top) / r.height) * 8;
        if (lx === null) hit(px, py);
        else { const n = Math.max(1, Math.ceil(Math.hypot(px - lx, py - ly) / 0.5)); for (let k = 1; k <= n; k++) hit(lx + (px - lx) * k / n, ly + (py - ly) * k / n); }
        lx = px; ly = py;
        if (fx.left <= 10) { fx.cells.fill(0); fx.left = 0; cells.forEach((c) => c.classList.add('gone')); fxDone(); }
      };
      let down = false;
      el.onpointerdown = (e) => { e.preventDefault(); down = true; lx = ly = null; try { el.setPointerCapture(e.pointerId); } catch (er) {} wipe(e); };
      el.onpointermove = (e) => { if (down) wipe(e); };
      el.onpointerup = el.onpointercancel = () => { down = false; lx = ly = null; };
    } else if (fx.k === 'grick') {
      el.querySelectorAll('.bug').forEach((b) => {
        b.onpointerdown = (e) => {
          e.preventDefault(); e.stopPropagation();
          fx.bugs[+b.dataset.b].on = false; b.remove(); SFX.play('squish');
          HAPTIC.confirm();
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
          f.boom = true; stopFxTimer(); AUDIO.play('powerBomb');
          HAPTIC.bomb();
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
  function timerNow() { const ms = Math.max(0, clockEnds - Date.now()); return { ms, fr: clockDur ? Math.max(0, Math.min(1, ms / clockDur)) : 1 }; }
  function timerHtml(urgentAt) { const t = timerNow(), u = urgentAt || 3000; return '<div class="timer' + (clockDur && t.ms <= u ? ' urgent' : '') + '" id="timer" data-u="' + u + '"><div id="tbar" data-lv="' + (t.fr > 0.5 ? 'g' : t.fr > 0.2 ? 'a' : 'r') + '" style="width:' + (t.fr * 100).toFixed(2) + '%"></div></div>'; }
  function lineup(d, opts) {
    opts = opts || {};
    return '<div class="lineup">' + d.P.map((p) => {
      let badge = '';
      if (opts.check && p.ok) badge = '<span class="badge" data-bk="ok' + esc(p.id) + '" data-bv="1">✓</span>';
      if (opts.gain && (p.g || p.ub)) badge = '<span class="badge gain">+' + ((p.g || 0) + (p.ub || 0)) + '</span>';
      const fx = opts.fx && p.fx ? p.fx.map((k) => ICON[k]).join('') : '';
      const extra = (opts.fx && p.sh ? '🛡️' : '') + (opts.fx && p.d ? '✖️2' : '') + (opts.fx && p.uc ? ICON.utjeha : '');
      const mood = opts.mood ? opts.mood(p) : (p.fx && opts.fx ? 'shocked' : '');
      return '<div class="who' + (p.c ? '' : ' off') + '">' + badge +
        '<div class="fxrow">' + fx + extra + '</div><div class="bob" style="width:100%">' + avSvg(p.a, mood) + '</div>' +
        '<div class="nm">' + esc(p.n) + '</div><div class="sc"' + (opts.gain && (p.g || p.ub) ? ' data-ck="lu' + esc(p.id) + '" data-cu="' + (p.sc - (p.g || 0) - (p.ub || 0)) + '" data-to="' + p.sc + '" data-cud="700" data-cdur="900"' : '') + '>' + p.sc + '</div></div>';
    }).join('') + '</div>';
  }
  function evHtml(d) {
    if (!d.ev || !d.ev.length) return '';
    return '<div class="events">' + d.ev.map((e) => {
      if (e.t) return '<span class="ev' + (e.b ? ' blocked' : '') + '"><span class="mini">' + avSvg(avOf(d, e.f), 'attack') + '</span>' + esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + ' ' + esc(nameOf(d, e.t)) + (e.cap ? ' (limit napada)' : e.b ? ' 🛡️' : '') + '</span>';
      return '<span class="ev buff"><span class="mini">' + avSvg(avOf(d, e.f)) + '</span>' + esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + '</span>';
    }).join('') + '</div>';
  }

  // ---------- prikaz bacanja moći (između odabira moći i pitanja) ----------
  function castHtml(d) {
    const actors = d.P.map((p) => '<div class="cact" data-id="' + esc(p.id) + '"><div class="cfig idle">' + avSvg(p.a, 'idle') + '</div>' +
      '<div class="cshield"></div><div class="cbadges"></div><div class="cnm">' + esc(p.n) + '</div></div>').join('');
    return '<div class="cast" id="castStage"><canvas class="cast-cv"></canvas><div class="cast-banner" id="castBanner"></div>' +
      '<div class="cast-row" style="--n:' + d.P.length + ';--c:' + (d.P.length <= 3 ? d.P.length : Math.ceil(d.P.length / 2)) + '">' + actors + '</div></div>';
  }

  const CAST = (() => {
    let run = 0, fx = [], cv = null, ctx = null, stage = null, W = 1, H = 1, last = 0, looping = false;
    const SND = { utjeha: 'correct', oklada: 'correct', led: 'freeze', sluz: 'splat', grick: 'squish', bomba: 'zap', dupli: 'correct', pola: 'pop', stit: 'step' };
    const COL = { utjeha: '#f0c66a', oklada: '#f0c66a', led: '#bcdbe6', sluz: '#a8c46a', grick: '#e0b07a', bomba: '#e8a55a', dupli: '#f0c66a', pola: '#f1dcb0', stit: '#9cc7a4' };
    const S = () => W / 960;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function fit() {
      if (!stage || !cv) return;
      const r = stage.getBoundingClientRect(), dp = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = W * dp; cv.height = H * dp; ctx.setTransform(dp, 0, 0, dp, 0, 0);
    }
    function loop(now) {
      if (!stage || !document.body.contains(stage)) { looping = false; fx = []; return; }
      const dt = Math.min(50, now - last); last = now;
      ctx.clearRect(0, 0, W, H);
      fx = fx.filter((e) => { e.step(dt); e.draw(ctx); return !e.dead; });
      requestAnimationFrame(loop);
    }
    function pt(el, fx_, fy) { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - s.left + r.width * fx_, y: r.top - s.top + r.height * fy }; }

    // ----- čestice -----
    function particle(o) {
      const p = Object.assign({ vx: 0, vy: 0, g: 0, life: 600, t: 0, size: 4, color: '#fff', shape: 'dot', rot: 0, vr: 0 }, o);
      p.step = function (dt) { this.t += dt; this.x += this.vx * dt / 16; this.y += this.vy * dt / 16; this.vy += this.g * dt / 16; this.rot += this.vr * dt / 16; if (this.t > this.life) this.dead = 1; };
      p.draw = function (c) {
        const k = 1 - this.t / this.life, s = this.size * S();
        c.save(); c.globalAlpha = Math.max(0, k); c.translate(this.x, this.y); c.rotate(this.rot);
        c.fillStyle = this.color; c.strokeStyle = this.color;
        if (this.shape === 'flake') { c.lineWidth = 1.6 * S(); for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); } }
        else if (this.shape === 'shard') { c.beginPath(); c.moveTo(s * 1.6, 0); c.lineTo(0, s * 0.5); c.lineTo(-s, 0); c.lineTo(0, -s * 0.5); c.fill(); }
        else if (this.shape === 'spark') c.fillRect(-s * 1.8, -s * 0.25, s * 3.6, s * 0.5);
        else if (this.shape === 'star') { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s * 1.2, a = i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); }
        else { c.beginPath(); c.arc(0, 0, s * (0.4 + 0.6 * k), 0, 7); c.fill(); }
        c.restore();
      };
      fx.push(p);
    }
    function burst(x, y, n, opt) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 7, v = (opt.v || 6) * (0.4 + Math.random());
        particle(Object.assign({ x, y, vx: Math.cos(a) * v * S(), vy: Math.sin(a) * v * S() - (opt.up || 0) * S(), rot: a, vr: (Math.random() - 0.5) * 0.3, life: 400 + Math.random() * 500, size: 3 + Math.random() * 5 }, opt));
      }
    }

    // ----- crtanje projektila -----
    function drawShard(c, x, y, ang) {
      const s = 24 * S(); c.save(); c.translate(x, y); c.rotate(ang); c.shadowColor = '#9fe7ff'; c.shadowBlur = 22;
      const g = c.createLinearGradient(-s, 0, s * 1.4, 0); g.addColorStop(0, '#2f8fd8'); g.addColorStop(0.6, '#9fe7ff'); g.addColorStop(1, '#fff');
      c.fillStyle = g; c.beginPath(); c.moveTo(s * 1.5, 0); c.lineTo(s * 0.3, s * 0.45); c.lineTo(-s, s * 0.25); c.lineTo(-s * 0.7, 0); c.lineTo(-s, -s * 0.25); c.lineTo(s * 0.3, -s * 0.45); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(s * 1.3, 0); c.lineTo(s * 0.2, -s * 0.3); c.lineTo(-s * 0.4, -s * 0.05); c.fill(); c.restore();
    }
    function drawBlob(c, x, y, ang, k) {
      const s = 22 * S(), wob = Math.sin(k * 30) * 0.12; c.save(); c.translate(x, y); c.rotate(ang); c.scale(1.15 + wob, 0.9 - wob);
      c.shadowColor = '#8be04a'; c.shadowBlur = 18;
      const g = c.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s); g.addColorStop(0, '#e2ffb0'); g.addColorStop(0.5, '#7ed63b'); g.addColorStop(1, '#2f8a0c');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s * 0.35, -s * 0.35, s * 0.25, s * 0.15, -0.5, 0, 7); c.fill(); c.restore();
    }
    function drawBug(c, x, y, ang, sc) {
      const s = 9 * S() * (sc || 1); c.save(); c.translate(x, y); c.rotate(ang);
      c.strokeStyle = '#3a2008'; c.lineWidth = 1.6 * S();
      const leg = Math.sin(performance.now() / 40) * 0.25;
      for (const sy of [-1, 1]) for (const lx of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(lx * s, 0); c.lineTo(lx * s + leg * s, sy * s * 1.1); c.stroke(); }
      c.fillStyle = 'rgba(220,240,255,.55)';
      const fl = Math.abs(Math.sin(performance.now() / 25));
      c.beginPath(); c.ellipse(-s * 0.1, -s * 0.6, s * 0.7, s * 0.35 * fl + 1, -0.4, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-s * 0.1, s * 0.6, s * 0.7, s * 0.35 * fl + 1, 0.4, 0, 7); c.fill();
      c.fillStyle = '#8a5424'; c.beginPath(); c.ellipse(-s * 0.2, 0, s * 0.85, s * 0.6, 0, 0, 7); c.fill();
      c.fillStyle = '#4a2b10'; c.beginPath(); c.arc(s * 0.7, 0, s * 0.45, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 0.85, -s * 0.18, s * 0.16, 0, 7); c.arc(s * 0.85, s * 0.18, s * 0.16, 0, 7); c.fill();
      c.restore();
    }
    function drawSwarm(c, x, y, ang, k) {
      for (let i = 0; i < 7; i++) {
        const ph = i * 0.9, r = (10 + i * 3) * S();
        drawBug(c, x + Math.cos(k * 18 + ph) * r - Math.cos(ang) * i * 7 * S(), y + Math.sin(k * 22 + ph) * r - Math.sin(ang) * i * 7 * S(), ang + Math.sin(k * 20 + i) * 0.6, 0.8 + (i % 3) * 0.15);
      }
    }
    function drawBomb(c, x, y, ang, k) {
      const s = 22 * S(); c.save(); c.translate(x, y); c.rotate(k * 9);
      const g = c.createRadialGradient(-s * 0.35, -s * 0.35, s * 0.1, 0, 0, s); g.addColorStop(0, '#70708c'); g.addColorStop(0.55, '#23232f'); g.addColorStop(1, '#08080d');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, 7); c.fill();
      c.fillStyle = '#555'; c.fillRect(s * 0.45, -s * 1.05, s * 0.5, s * 0.45);
      c.strokeStyle = '#d99a35'; c.lineWidth = 2.5 * S(); c.beginPath(); c.moveTo(s * 0.7, -s * 1.05); c.quadraticCurveTo(s * 1.1, -s * 1.6, s * 1.4, -s * 1.3); c.stroke();
      c.restore();
      const a = k * 9, fxp = x + Math.cos(a) * s * 1.4 - Math.sin(a) * -s * 1.3, fyp = y + Math.sin(a) * s * 1.4 + Math.cos(a) * -s * 1.3;
      particle({ x: fxp, y: fyp, vx: (Math.random() - 0.5) * 3 * S(), vy: (Math.random() - 0.5) * 3 * S(), life: 300, size: 2.5, color: Math.random() < 0.5 ? '#ffcf4a' : '#ff7a2e' });
    }
    const TRAIL = {
      led: (x, y) => particle({ x, y, vx: (Math.random() - 0.5) * S(), vy: (Math.random() - 0.5) * S(), life: 450, size: 2 + Math.random() * 3, color: Math.random() < 0.5 ? '#fff' : '#9fe7ff', shape: Math.random() < 0.3 ? 'flake' : 'dot' }),
      sluz: (x, y) => { if (Math.random() < 0.6) particle({ x, y, vx: (Math.random() - 0.5) * S(), vy: 0, g: 0.35 * S(), life: 500, size: 2 + Math.random() * 3, color: Math.random() < 0.5 ? '#7ed63b' : '#b6f070' }); },
      grick: () => {},
      bomba: () => {},
    };
    const DRAW = { led: drawShard, sluz: drawBlob, grick: drawSwarm, bomba: drawBomb };
    const ARC = { led: 70, sluz: 110, grick: 40, bomba: 190 };

    function fly(a, b, ms, k, my) {
      return new Promise((res) => {
        let t = 0;
        fx.push({
          step(dt) { t += dt / ms; if (t >= 1 || my !== run) { this.dead = 1; res(); } },
          draw(c) {
            const q = Math.min(1, t), e = q * q * (3 - 2 * q) * 0.35 + q * 0.65, arc = ARC[k] * S();
            const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e - arc * 4 * e * (1 - e);
            const ang = Math.atan2((b.y - a.y) - arc * 4 * (1 - 2 * e), b.x - a.x);
            TRAIL[k](x, y); DRAW[k](c, x, y, ang, q);
          },
        });
      });
    }
    function flyAway(a, dir, k) {
      let t = 0; const b = { x: a.x - dir * 260 * S(), y: -40 };
      fx.push({
        step(dt) { t += dt / 600; if (t >= 1) this.dead = 1; },
        draw(c) { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - 60 * S() * 4 * t * (1 - t); c.save(); c.globalAlpha = 1 - t; DRAW[k](c, x, y, Math.PI + t * 6, t); c.restore(); },
      });
    }
    function charge(p, color, ms, my) {
      return new Promise((res) => {
        let t = 0;
        fx.push({
          step(dt) {
            t += dt; if (t > ms || my !== run) { this.dead = 1; res(); }
            if (Math.random() < 0.6) { const a = Math.random() * 7, dd = 46 * S(); particle({ x: p.x + Math.cos(a) * dd, y: p.y + Math.sin(a) * dd, vx: -Math.cos(a) * 2.5 * S(), vy: -Math.sin(a) * 2.5 * S(), life: 300, size: 3, color }); }
          },
          draw(c) { const k = t / ms; c.save(); c.globalAlpha = 0.8; c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 26; c.beginPath(); c.arc(p.x, p.y, (5 + 13 * k) * S(), 0, 7); c.fill(); c.restore(); },
        });
      });
    }

    // ----- trajni učinci na meti -----
    function persist(el, kind) {
      const rnd = (n, f) => Array.from({ length: n }, f);
      const items = kind === 'led' ? rnd(12, () => ({ fx: 0.15 + Math.random() * 0.7, fy: 0.5 + Math.random() * 0.5, h: 0.12 + Math.random() * 0.22, w: 0.04 + Math.random() * 0.05, tilt: (Math.random() - 0.5) * 0.9 }))
        : kind === 'sluz' ? rnd(7, () => ({ fx: 0.2 + Math.random() * 0.6, fy: 0.15 + Math.random() * 0.4, r: 0.05 + Math.random() * 0.06, len: 0.1 + Math.random() * 0.3, sp: 0.6 + Math.random() }))
        : rnd(5, (_, i) => ({ ph: i * 1.26, r: 0.32 + Math.random() * 0.12, sp: 0.0016 + Math.random() * 0.001, fy: 0.35 + Math.random() * 0.3 }));
      let t = 0;
      fx.push({
        step(dt) { t += dt; if (!document.body.contains(el)) this.dead = 1; },
        draw(c) {
          const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(), ox = r.left - s.left, oy = r.top - s.top, grow = Math.min(1, t / 300);
          c.save();
          if (kind === 'led') {
            c.globalAlpha = 0.85; c.shadowColor = '#9fe7ff'; c.shadowBlur = 10;
            for (const k of items) {
              const h = r.height * k.h * grow, w = r.width * k.w;
              c.save(); c.translate(ox + r.width * k.fx, oy + r.height * k.fy); c.rotate(k.tilt);
              const g = c.createLinearGradient(0, 0, 0, -h); g.addColorStop(0, 'rgba(120,200,255,.75)'); g.addColorStop(1, 'rgba(240,252,255,.95)');
              c.fillStyle = g; c.beginPath(); c.moveTo(-w, 0); c.lineTo(0, -h); c.lineTo(w, 0); c.closePath(); c.fill(); c.restore();
            }
          } else if (kind === 'sluz') {
            c.globalAlpha = 0.88; c.fillStyle = '#6cc72f'; c.shadowColor = '#8be04a'; c.shadowBlur = 8;
            for (const k of items) {
              const x = ox + r.width * k.fx, y = oy + r.height * k.fy, rr = r.width * k.r * grow, len = r.height * k.len * Math.min(1, t * k.sp / 1500);
              c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill();
              c.fillRect(x - rr * 0.35, y, rr * 0.7, len); c.beginPath(); c.arc(x, y + len, rr * 0.45, 0, 7); c.fill();
            }
            c.fillStyle = 'rgba(255,255,255,.45)'; for (const k of items) { c.beginPath(); c.arc(ox + r.width * k.fx - r.width * k.r * 0.3, oy + r.height * k.fy - r.width * k.r * 0.3, r.width * k.r * 0.25 * grow, 0, 7); c.fill(); }
          } else {
            for (const k of items) {
              const a = k.ph + t * k.sp * 6, cx = ox + r.width * 0.5, cy = oy + r.height * k.fy;
              const x = cx + Math.cos(a) * r.width * k.r, y = cy + Math.sin(a) * r.width * k.r * 0.45;
              drawBug(c, x, y, a + Math.PI / 2, 0.9 * grow);
            }
          }
          c.restore();
        },
      });
    }
    function badge(act, html, cls) { const b = act.querySelector('.cbadges'); b.insertAdjacentHTML('beforeend', '<span class="cbadge ' + (cls || '') + '">' + html + '</span>'); }

    // ----- likovi -----
    function pose(act, a, p, anim, dir) {
      const fig = act.querySelector('.cfig');
      fig.innerHTML = avSvg(a, p); fig.className = 'cfig'; void fig.offsetWidth; fig.className = 'cfig ' + (anim || 'idle');
      if (dir) fig.style.setProperty('--dir', dir);
    }
    function banner(html) { const b = stage.querySelector('#castBanner'); if (!b) return; b.classList.remove('on'); void b.offsetWidth; b.innerHTML = html; if (html) b.classList.add('on'); }
    function shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

    async function play(d, sound, my) {
      const acts = {}; stage.querySelectorAll('.cact').forEach((el) => { acts[el.dataset.id] = el; });
      const P = {}; d.P.forEach((p) => { P[p.id] = p; });
      const n = d.ev.length, per = Math.max(650, Math.min(1250, (d.ms - 900) / Math.max(1, n)));
      const snd = (k) => { if (sound) SFX.play(k); };
      await sleep(250); if (my !== run) return;
      for (const e of d.ev) {
        const fa = acts[e.f], fp = P[e.f]; if (!fa || !fp) continue;
        const nm = '<b class="pw-' + e.p + '">' + POWERS[e.p].n + '</b>';
        if (!e.t) {
          // pomoć za sebe
          banner(esc(fp.n) + ' <span class="cico">' + ICON[e.p] + '</span> ' + nm);
          pose(fa, fp.a, 'happy', 'cheer');
          const core = pt(fa, 0.5, 0.55);
          await charge(core, COL[e.p], per * 0.35, my); if (my !== run) return;
          snd(SND[e.p]);
          if (e.p === 'stit') { fa.querySelector('.cshield').classList.add('on'); burst(core.x, core.y, 20, { color: COL.stit, v: 6, shape: 'spark' }); }
          if (e.p === 'dupli') { fa.classList.add('gold'); burst(core.x, core.y - 20 * S(), 26, { color: '#ffd23c', v: 6, up: 3, g: 0.12, shape: 'star' }); badge(fa, '×2', 'b-dupli'); }
          if (e.p === 'utjeha') { burst(core.x, core.y - 20 * S(), 18, { color: '#ffd36a', v: 5, up: 2, g: 0.12, shape: 'star' }); badge(fa, 'UTJEHA', 'b-dupli'); fa.insertAdjacentHTML('beforeend', '<img class="ccoin" src="ui/pw-utjeha.webp" alt="" aria-hidden="true" draggable="false">'); const cc = fa.querySelector('.ccoin:last-of-type'); cc.addEventListener('animationend', () => cc.remove()); }
          if (e.p === 'pola') { burst(core.x, core.y - 30 * S(), 18, { color: '#f1dcb0', v: 5, shape: 'spark' }); badge(fa, '50:50', 'b-pola'); fa.insertAdjacentHTML('beforeend', '<span class="csplit"><i></i><i></i></span>'); }
          await sleep(per * 0.55); if (my !== run) return;
          pose(fa, fp.a, 'idle');
          continue;
        }
        const ta = acts[e.t], tp = P[e.t]; if (!ta || !tp) continue;
        banner(esc(fp.n) + ' <span class="cico">' + ICON[e.p] + '</span> ' + nm + ' <span class="carr">→</span> ' + esc(tp.n));
        const dir = ta.getBoundingClientRect().left >= fa.getBoundingClientRect().left ? 1 : -1;
        pose(fa, fp.a, 'attack', 'lunge', dir);
        const hand = pt(fa, 0.5 + 0.22 * dir, 0.42);
        await charge(hand, COL[e.p], per * 0.2, my); if (my !== run) return;
        snd('whoosh');
        const end = e.b ? pt(ta, 0.5 - 0.5 * dir, 0.45) : pt(ta, 0.5, e.p === 'bomba' ? 0.88 : 0.5);
        await fly(hand, end, per * 0.38, e.p, my); if (my !== run) return;
        if (e.b) {
          if (!e.cap) { const sh = ta.querySelector('.cshield'); sh.classList.remove('hit'); void sh.offsetWidth; sh.classList.add('hit'); }
          burst(end.x, end.y, 20, { color: '#fff', shape: 'spark', v: 8 }); burst(end.x, end.y, 10, { color: COL.stit, v: 5 });
          flyAway(end, dir, e.p); snd('step');
          banner(e.cap ? '<b>Zaustavljeno!</b> ' + esc(tp.n) + ' već ima najviše napada' : '<b class="pw-stit">Odbijeno!</b> ' + esc(tp.n) + ' ima štit');
          pose(fa, fp.a, 'shocked', 'jolt'); pose(ta, tp.a, 'victory', 'cheer');
        } else {
          snd(SND[e.p]); shake();
          if (e.p === 'led') { burst(end.x, end.y, 22, { color: '#dff7ff', shape: 'shard', v: 7, g: 0.25 }); burst(end.x, end.y, 10, { color: '#9fe7ff', shape: 'flake', v: 4 }); ta.classList.add('frozen'); persist(ta, 'led'); }
          if (e.p === 'sluz') { burst(end.x, end.y, 26, { color: '#7ed63b', v: 7, g: 0.35 }); ta.classList.add('slimed'); persist(ta, 'sluz'); }
          if (e.p === 'grick') { burst(end.x, end.y, 10, { color: '#e0a86a', v: 4 }); persist(ta, 'grick'); }
          if (e.p === 'bomba') { burst(end.x, end.y, 16, { color: '#c9b9a0', v: 4, up: 2, g: 0.2 }); ta.insertAdjacentHTML('beforeend', '<span class="cbomb">' + bombSvg + '</span>'); }
          pose(ta, tp.a, 'shocked', 'jolt'); pose(fa, fp.a, 'happy', 'cheer');
        }
        await sleep(per * 0.42); if (my !== run) return;
        pose(fa, fp.a, 'idle');
      }
      banner('Spremni? Slijedi pitanje!');
    }

    function start(el, d, sound) {
      if (!el || !d.ev) return;
      const my = ++run;
      stage = el; cv = el.querySelector('canvas'); ctx = cv.getContext('2d'); fx = [];
      fit();
      if (window.ResizeObserver) new ResizeObserver(fit).observe(el);
      last = performance.now();
      if (!looping) { looping = true; requestAnimationFrame(loop); }
      requestAnimationFrame(() => { fit(); play(d, sound, my); });
    }
    return { start };
  })();

  function flipBoards() {
    document.querySelectorAll('.mboard:not([data-flipped])').forEach((b) => {
      b.dataset.flipped = '1';
      const rows = [...b.querySelectorAll('.rank-row[data-prev]')]; if (!rows.length || reduceMotion) return;
      const h = rows[0].getBoundingClientRect().height, dl = b.dataset.delay !== undefined ? +b.dataset.delay : 350;
      if (b.dataset.delay === 'x' || isNaN(dl)) return;
      rows.forEach((r, i) => {
        const dy = (+r.dataset.prev - i) * h; if (!dy) return;
        r.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 600, delay: dl, easing: 'cubic-bezier(.3,.9,.3,1)', fill: 'backwards' });
      });
    });
  }
  function fitQuestions() {
    flipBoards();
    drawLinks();
    document.querySelectorAll('.door .dn, .door-btn .dname').forEach((el) => {
      el.style.fontSize = '';
      const inner = el.firstElementChild || el, base = parseFloat(getComputedStyle(el).fontSize), lh = 1.08;
      let f = base;
      const tooBig = () => inner.scrollWidth > el.clientWidth + 1 || inner.offsetHeight > el.clientHeight + 1 || inner.offsetHeight > f * lh * 3 + 2;
      while (tooBig() && f > base * 0.55) { f -= 1; el.style.fontSize = f + 'px'; }
    });
    document.querySelectorAll('.p-q, .q-text').forEach((el) => {
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize), min = base * 0.68;
      let f = base;
      while (el.scrollHeight > el.clientHeight + 1 && f > min) { f -= 1; el.style.fontSize = f + 'px'; }
    });
  }
  (function () {
    const app = document.getElementById('app');
    if (app && window.MutationObserver) new MutationObserver(() => requestAnimationFrame(fitQuestions)).observe(app, { childList: true });
    addEventListener('resize', () => requestAnimationFrame(fitQuestions));
  })();

  // ---------- glavni prikaz ----------
  function render() {
    try {
      if (mode === 'home') { tvStep = -1; phoneStep = -1; SCENE.reset(); return homeV(); }
      if (mode === 'join') return joinV();
      if (mode === 'player') return phoneRender(true);
      if (mode === 'demo') return demoView === 'tv' ? tvV(game.view()) : phoneRender(true);
      if (mode === 'hostp') return phoneRender(true);
      if (mode === 'hostform') return hostFormV();
      return hostV();
    } catch (e) { crash(e); }
  }
  function crash(e) {
    $app.className = 'screen center';
    $app.innerHTML = '<div class="err">Nešto je pošlo po krivu: ' + esc(e && e.message) + '</div><button class="btn" id="home">Početna</button>';
    bind('home', reset);
  }

  function homeV() {
    $app.className = 'screen center home-screen';
    const standalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    const status = hasPeer() ? '' : '<div class="home-status">Povezivanje uređaja nije dostupno. Igra protiv botova i dalje radi.</div>';
    const install = standalone || !installEvt ? '' : '<button class="home-link" id="install">Instaliraj kao aplikaciju</button>';
    $app.innerHTML =
      '<div class="home">' +
        '<div class="home-logo"><div class="logo"><span class="lt">Trivia</span><span class="lt">Tavern</span></div></div>' +
        '<div class="home-actions">' +
          '<button class="btn home-cta" id="hostp"><span class="hb-t">Igraj</span><span class="hb-s">Otvori sobu i pozovi društvo</span></button>' +
          '<div class="home-sec"><button class="btn ghost" id="join">Pridruži se igri</button></div>' +
          '<div class="home-try"><span class="home-sep">Još</span><button class="home-link" id="demo">Igraj protiv botova</button><button class="home-link" id="host">Prikaži igru na TV-u</button>' + install + '</div>' +
        '</div>' +
        '<div class="home-foot">' + status + '<span class="home-ver">v65</span></div>' +
      '</div>';
    bind('host', startHost); bind('join', () => { mode = 'join'; render(); }); bind('demo', startDemo);
    bind('hostp', () => { hostErr = ''; mode = 'hostform'; render(); });
    bind('install', async () => {
      if (!installEvt) return;
      installEvt.prompt();
      try { await installEvt.userChoice; } catch (e) {}
      installEvt = null; render();
    });
  }

  function joinV() {
    $app.className = 'screen phone';
    const m = (location.hash || '').match(/^#?([A-Za-z]{4})(?:-[A-Za-z0-9_-]{22})?$/);
    const code = pcode || (m ? m[1].toUpperCase() : '');
    const name = pname || store.get('mz_name') || '';
    $app.innerHTML =
      '<div class="logo"><span class="lt">Trivia</span><span class="lt">Tavern</span></div>' +
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
    if (!game) { $app.className = 'screen center'; $app.innerHTML = '<div class="logo"><span class="lt">Trivia</span><span class="lt">Tavern</span></div><div class="note">Otvaram sobu…</div>'; return; }
    tvV(game.view());
  }

  // ---------- prijelazi scena ----------
  // Jedan sustav za sve faze: kad se faza promijeni, stari sadržaj se premjesti u sloj koji izblijedi (150 ms),
  // a novi se iscrta odmah (nema praznog ekrana ni čekanja). --pel = ms od početka faze, za jednokratne animacije.
  const MOTION = (() => {
    let ph0 = '', prev = new Map(), starts = new Map(), live = new Map(), raf = 0;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    function tick() {
      raf = 0; const now = performance.now(); let more = false;
      document.querySelectorAll('#app [data-cu]').forEach((e) => {
        const st = starts.get(e.dataset.ck); if (st === undefined) return;
        const to = +e.dataset.to, from = +e.dataset.cu, dur = +(e.dataset.cdur || 800);
        const x = Math.max(0, Math.min(1, (now - st) / dur));
        e.textContent = (e.dataset.pre || '') + Math.round(from + (to - from) * ease(x)) + (e.dataset.suf || '');
        if (x < 1) more = true; else if (!e.dataset.cdone) { e.dataset.cdone = '1'; e.classList.add('bump'); }
      });
      if (more) raf = requestAnimationFrame(tick);
    }
    function after(ph) {
      const now = performance.now(), same = ph === ph0;
      if (!same) { starts = new Map(); live = new Map(); }
      // brojanje: početak se pamti po fazi i ključu, pa novo iscrtavanje nastavlja gdje je stalo
      document.querySelectorAll('#app [data-cu]').forEach((e, k) => {
        const key = e.dataset.ck || (e.dataset.ck = 'c' + k);
        if (reduceMotion || +e.dataset.cu === +e.dataset.to) { starts.delete(key); return; }
        if (!starts.has(key)) starts.set(key, now + (+(e.dataset.cud || 0)));
      });
      if (!raf) raf = requestAnimationFrame(tick);
      if (starts.size) tick();
      // poskok: vrijednost se promijenila (ili se element pojavio) unutar iste faze
      const cur = new Map();
      document.querySelectorAll('#app [data-bk]').forEach((e) => {
        const k = e.dataset.bk, v = e.dataset.bv !== undefined ? e.dataset.bv : e.textContent;
        cur.set(k, v);
        if (reduceMotion) return;
        if (same && ph0 && prev.has(k) && prev.get(k) !== v || same && ph0 && !prev.has(k) && !e.dataset.ba) live.set(k, { c: e.dataset.ba || 'bump', t: now, v });
        const a = live.get(k);
        if (a && (a.v !== v || now - a.t > 600)) { live.delete(k); return; }
        if (a) {
          // animacija traje dalje i kad se ekran u međuvremenu ponovno iscrta
          const tg = e.dataset.bt === 'app' ? [...$app.children].filter((x) => !/\b(demo-bar|p-top|bar-row)\b/.test(x.className) && x.tagName !== 'I') : [e];
          tg.forEach((x) => { x.classList.add(a.c); x.style.animationDelay = -(now - a.t) + 'ms'; });
        }
      });
      prev = cur; ph0 = ph;
    }
    return { after };
  })();
  let PV = null;
  // ===================== TAJNI PAKTOVI: sučelje =====================
  // PV = privatno stanje ovog igrača (šalje ga samo domaćin, samo njemu). Javno stanje (d) nikad ne sadrži tuđe paktove.
  const fmtN = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const LET = ['A', 'B', 'C', 'D'];
  const PACT_PH = { vote: 1, voteResult: 1, power: 1, cast: 1, question: 1, reveal: 1, bet: 1, howto: 1, order: 1, hilo: 1, blitz: 1, maj: 1, majReveal: 1, uljez: 1, uljezVote: 1, uljezReveal: 1, orderReveal: 1, hiloReveal: 1, blitzReveal: 1, sortReveal: 1, linkReveal: 1, sort: 1, link: 1, duelIntro: 1, duel: 1, duelResult: 1, secret: 1, secret2: 1, moment: 1, intro: 1 };
  // traka pakta ide odmah ispod gornje trake (HUD); ne prekriva pitanje, odgovore ni sat
  function pactHead(d, me, head) {
    if (sfOnPV() && me && d.ph !== 'lobby' && d.ph !== 'final') return sfHead(d, me, head);
    return pactHeadOld(d, me, head);
  }
  function pactHeadOld(d, me, head) {
    if (!me || !PACT_PH[d.ph]) return head;
    if (!PV) return head + rcBar(d, me) + tkBar(d, me) + pjChip(d, me);
    const q = d.ph === 'question';
    let h = '';
    // dolazna ponuda: kratka u pitanju, kartica između pitanja
    for (const o of PV.inv || []) {
      const f = pById(d, o.f); if (!f) continue;
      const pct = Math.max(0, Math.min(100, (o.ms / o.dur) * 100));
      h += q
        ? '<div class="pk-inv mini"><span class="mini">' + avSvg(f.a, 'happy') + '</span><span class="pk-t"><b>🍻 ' + esc(f.n) + '</b> nudi pakt</span><button class="pk-b ok" data-pk="accept" data-f="' + esc(o.f) + '">Prihvati</button><button class="pk-b no" data-pk="decline" data-f="' + esc(o.f) + '">✕</button><i class="pk-tm" style="--w:' + pct + '%"></i></div>'
        : '<div class="pk-inv"><div class="pk-inv-h"><span class="mini">' + avSvg(f.a, 'happy') + '</span><b>🍻 ' + esc(f.n) + ' ti nudi tajni pakt!</b></div>' +
          '<div class="pk-inv-s">„Zajednički odgovori pune riznicu. Saveznik te kasnije može izdati i uzeti bodove.”</div>' +
          '<div class="pk-row"><button class="btn pk-acc" data-pk="accept" data-f="' + esc(o.f) + '">Prihvati pakt</button><button class="btn ghost pk-dec" data-pk="decline" data-f="' + esc(o.f) + '">Odbij</button></div><i class="pk-tm" style="--w:' + pct + '%"></i></div>';
    }
    if (PV.k) {
      const m = pById(d, PV.k.m), k = PV.k;
      let act = '';
      if (q && k.can) {
        if (L.whOpen && !k.wsent) act = '<span class="pk-wh-pick">' + d.q.o.map((_, i) => '<button class="pk-l" data-wh="' + i + '">' + LET[i] + '</button>').join('') + '<button class="pk-l x" data-whx="1" aria-label="Zatvori">✕</button></span>';
        else act = (k.wsent ? '<span class="pk-sent">🔮 Šapnuto</span>' : '<button class="pk-b" data-whopen="1">🔮 Šapni</button>') +
          (k.bt ? '<button class="pk-b bt on" data-bt="0">🗡️ Odustani</button>' : '<button class="pk-b bt" data-bt="1" aria-label="Pripremi izdaju">🗡️</button>');
      }
      h += '<div class="pk-bar' + (k.bt && q ? ' armed' : '') + '"><span class="mini">' + (m ? avSvg(m.a, 'idle') : '') + '</span><span class="pk-t"><b>🍻 ' + esc(m ? m.n : '?') + '</b><span class="pk-tre" data-bk="pktre" data-bv="' + k.tre + '">💰 ' + fmtN(k.tre) + '</span></span>' +
        (k.wh !== undefined && q ? '<span class="pk-whin" data-bk="pkwh" data-bv="' + k.wh + '">🔮 ' + esc(m ? m.n : '') + ': <b>' + LET[k.wh] + '</b></span>' : '') + act + '</div>';
      if (q && k.bt) h += '<div class="pk-note">🗡️ Izdaja je pripremljena. Ako ne odustaneš, na kraju pitanja pokušat ćeš ukrasti zajedničku riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova.</div>';
      else if (!q && (d.ph === 'reveal' || d.ph === 'vote' || d.ph === 'power')) h += '<div class="pk-card-s">Zajednička riznica: <b>' + fmtN(k.tre) + ' bodova</b></div>';
    } else if (PV.out && !q) {
      const t = pById(d, PV.out.t);
      h += '<div class="pk-bar out"><span class="pk-t">🍻 Ponuda poslana: <b>' + esc(t ? t.n : '') + '</b> · ' + Math.ceil(PV.out.ms / 1000) + ' s</span><button class="pk-b" data-pk="cancel">Povuci</button></div>';
    } else if (PV.can && !q && PV.cand && PV.cand.length && !(PV.inv || []).length) {
      h += L.pkOpen
        ? '<div class="pk-pick"><div class="pk-pick-h">🍻 Kome nudiš tajni pakt?<button class="pk-l x" data-pkx="1" aria-label="Zatvori">✕</button></div><div class="pk-cands">' + PV.cand.map((id) => { const p = pById(d, id); return p ? '<button class="pk-cand" data-pk="offer" data-to="' + esc(id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span>' + esc(p.n) + '</button>' : ''; }).join('') + '</div><div class="pk-inv-s">Ostali neće saznati. Svatko može imati samo jedan pakt po partiji.</div></div>'
        : '<button class="pk-open" data-pkopen="1">🍻 Tajni pakt</button>';
    }
    return head + h + rcBar(d, me) + tkBar(d, me) + pjChip(d, me);
  }
  // ===================== RIVALSKI OBRAČUN: sučelje =====================
  // Ponude su privatne (PV.rc), aktivan obračun i ishod su javni (d.rc, d.rcr). Domaćin sve provjerava i računa.
  const RC_PH = { vote: 1, voteResult: 1, power: 1, cast: 1, reveal: 1, bet: 1 };
  const rcN = (d, id) => esc((pById(d, id) || {}).n || '?');
  function rcBar(d, me) {
    const R0 = PV && PV.rc, act = d.rc, mine = act && me && (act.a === me.id || act.b === me.id);
    if (d.ph === 'question') return mine ? '<div class="rc-tag" data-bk="rctag" data-bv="1">⚔️ Obračun: <b>' + rcN(d, act.a) + ' vs ' + rcN(d, act.b) + '</b> · ulog ' + act.st + '</div>' : '';
    if (!RC_PH[d.ph] || !me) return '';
    let h = '';
    if (mine) h += '<div class="rc-tag">⚔️ Obračun na sljedećem pitanju: <b>' + rcN(d, act.a) + ' vs ' + rcN(d, act.b) + '</b> · ulog ' + act.st + '</div>';
    if (!R0) return h;
    for (const o of R0.inv || []) {
      const f = pById(d, o.f); if (!f) continue;
      const pct = Math.max(0, Math.min(100, (o.ms / o.dur) * 100));
      const t = o.rev ? '🔥 ' + esc(f.n) + ' traži osvetu!' : o.riv ? '⚔️ Obračun s rivalom: ' + esc(f.n) + ' te izaziva!' : '⚔️ ' + esc(f.n) + ' te izaziva na rivalski obračun!';
      h += '<div class="pk-inv rc-inv"><div class="pk-inv-h"><span class="mini">' + avSvg(f.a, 'attack') + '</span><b>' + t + '</b></div>' +
        '<div class="pk-inv-s">Oboje riskirate <b>' + R0.st + ' bodova</b>. Na sljedećem pitanju: tko odgovori točno, a protivnik ne, uzima protivnikov ulog. Oboje točno ili oboje krivo — neriješeno.</div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-rc="rcAccept" data-f="' + esc(o.f) + '">Prihvati izazov</button><button class="btn ghost pk-dec" data-rc="rcDecline" data-f="' + esc(o.f) + '">Odbij</button></div><i class="pk-tm" style="--w:' + pct + '%"></i></div>';
    }
    if (R0.out) h += '<div class="pk-bar out rc-out"><span class="pk-t">⚔️ Izazov poslan: <b>' + rcN(d, R0.out.t) + '</b> · ' + Math.ceil(R0.out.ms / 1000) + ' s</span><button class="pk-b" data-rc="rcCancel">Povuci</button></div>';
    else if (R0.can && R0.cand && R0.cand.length && !(R0.inv || []).length && !act) {
      const riv = R0.cand.some((c) => c.riv || c.rev);
      h += L.rcOpen
        ? '<div class="pk-pick rc-pick"><div class="pk-pick-h">⚔️ Koga izazivaš? <small>ulog ' + R0.st + ' · sljedeće pitanje</small><button class="pk-l x" data-rcx="1" aria-label="Zatvori">✕</button></div><div class="pk-cands">' +
          R0.cand.slice().sort((x, y) => (y.rev + y.riv) - (x.rev + x.riv)).map((c) => { const p = pById(d, c.id); return p ? '<button class="pk-cand" data-rc="rcOffer" data-to="' + esc(c.id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span>' + esc(p.n) + (c.rev ? ' <em>🔥 osveta</em>' : c.riv ? ' <em>⚔️ rival</em>' : '') + '</span></button>' : ''; }).join('') + '</div></div>'
        : '<button class="pk-open rc-open" data-rcopen="1">' + (riv ? '⚔️ Obračun s rivalom' : '⚔️ Rivalski obračun') + '</button>';
    }
    return h;
  }
  function bindRc() {
    const q = (s) => document.querySelectorAll('#app ' + s);
    q('[data-rc]').forEach((b) => { b.onclick = () => { const k = b.dataset.rc; AUDIO.play(k === 'rcDecline' || k === 'rcCancel' ? 'tap' : 'confirm'); L.rcOpen = false; krSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
    q('[data-rcopen]').forEach((b) => { b.onclick = () => { L.rcOpen = true; phoneRender(true); }; });
    q('[data-rcx]').forEach((b) => { b.onclick = () => { L.rcOpen = false; phoneRender(true); }; });
  }
  // ishod na otkrivanju: oba lika, rezultat i komentar krčme (isti trenutak kao kartica krčme)
  function rcCard(d) {
    const r = d.rcr; if (!r) return '';
    const el = Math.max(0, d.dur - d.ms), A = pById(d, r.a), B = pById(d, r.b);
    const pose = (id) => r.k === 'win' ? (id === r.w ? 'victory' : 'sad') : 'idle';
    const fig = (p) => p ? '<span class="mini">' + avSvg(p.a, pose(p.id)) + '</span>' : '';
    const W = r.w && pById(d, r.w), L0 = r.w && pById(d, r.w === r.a ? r.b : r.a);
    const res = r.k === 'win' && W ? '<b class="rc-w">🏆 ' + esc(W.n) + ' pobjeđuje!</b><span class="rc-pts"><i class="up">+' + r.t + ' ' + esc(W.n) + '</i> <i class="dn">−' + r.t + ' ' + esc(L0 ? L0.n : '') + '</i></span>'
      : r.k === 'tie' ? '<b class="rc-w">Neriješeno</b>' : '<b class="rc-w">Obračun otkazan</b>';
    return '<div class="tdl lv2 rcx" data-mo="rc' + (+r.id || 0) + '" style="--el:' + el + 'ms"><span class="figs rc-figs">' + fig(A) + '<span class="rc-vs">VS</span>' + fig(B) + '</span><span class="tx"><b>' + (r.rev ? '🔥 Osveta' : '⚔️ Rivalski obračun') + '</b>' + res + '<span>' + esc(r.line || '') + '</span></span></div>';
  }
  function rcToggle(d) {
    return '';   // rivalski obračun je uklonjen
    if (!d.opt) return '';
    if (!game) return d.opt.rc ? '<div class="lob-info">⚔️ Rivalski obračuni su uključeni</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l">⚔️ Rivalski obračuni<small>Dobrovoljni izazovi s malim ulogom (od 5. pitanja)</small></span><button class="tgl' + (d.opt.rc ? '' : ' off') + '" data-rcopt="' + (d.opt.rc ? 0 : 1) + '">' + (d.opt.rc ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
  // ===================== POSLJEDNJI POZIV: projekcija početka piramide =====================
  // Sve brojke dolaze gotove od domaćina (d.pj, isti izračun kao stvarni početak); klijent samo prikazuje.
  const PJV = { open: false };
  const pjWord = (n) => (n === 1 ? 'Još jedno pitanje' : n === 2 ? 'Još dva pitanja' : n === 3 ? 'Još tri pitanja' : 'Još ' + n + ' pitanja') + ' do piramide';
  function pjOf(d, id) { const x = d.pj && d.pj.P && d.pj.P[id]; return x ? { s: +x[0] || 0, p: +x[1] || 0, r: +x[2] || 0 } : null; }
  function pjBadge(d, id) { const x = pjOf(d, id); return x ? '<span class="pjb" data-bk="pjb' + esc(id) + '" data-bv="' + x.s + '" title="Projicirana početna stepenica">🪜' + x.s + '</span>' : ''; }
  function pjChip(d, me) {
    if (!d.pj || !me || d.ph === 'question' || d.ph === 'fq') { return ''; }
    const x = pjOf(d, me.id); if (!x) return '';
    return '<div class="pj-chip"><span class="pj-t">🪜 Tvoja projekcija: <b>' + x.s + '. stepenica</b>' + (x.r && x.p ? '<small> · napredak ' + x.p + '/' + x.r + '</small>' : '') + '<small class="pj-left">' + pjWord(+d.pj.left || 0) + '</small></span><button class="pk-b" data-pjopen="1">Piramida</button></div>' + (PJV.open ? pjModal(d) : '');
  }
  function pjModal(d) {
    const max = Math.max(1, +d.pj.max || 1), rows = [];
    for (let st = max; st >= 0; st--) {
      const here = d.P.filter((p) => { const x = pjOf(d, p.id); return x && x.s === st; });
      rows.push('<div class="pj-row' + (here.length ? ' on' : '') + '" style="--w:' + Math.round(46 + (max - st) / max * 54) + '%"><span class="pj-st">' + st + '</span><span class="pj-av">' +
        here.map((p) => { const x = pjOf(d, p.id); return '<span class="pj-fig' + (p.id === PID ? ' me' : '') + '" title="' + esc(p.n) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span class="pj-nm">' + esc(p.n) + (x.r && x.p ? ' <i>' + x.p + '/' + x.r + '</i>' : '') + '</span></span>'; }).join('') + '</span></div>');
    }
    return '<div class="lg-wrap pj-wrap lg-instant-book" id="pjWrap"><div class="lg-book pj-book"><div class="lg-head"><div class="lg-t">🏆 Put prema piramidi</div><div class="lg-sub">Ovako bi piramida izgledala da regularni dio sada završi.</div></div>' +
      '<div class="pj-pyr">' + rows.join('') + '</div>' +
      '<div class="pj-note">Projekcija prema trenutačnim bodovima. ' + esc(pjWord(+d.pj.left || 0)) + ' — konačne pozicije mogu se promijeniti nakon završnih obračuna.</div>' +
      '<div class="lg-act"><button class="btn ghost" data-pjx="1">Zatvori</button></div></div></div>';
  }
  function bindPj() {
    document.querySelectorAll('#app [data-pjopen]').forEach((b) => { b.onclick = () => { AUDIO.play('tap'); PJV.open = true; phoneRender(true); }; });
    document.querySelectorAll('#app [data-pjx]').forEach((b) => { b.onclick = () => { AUDIO.play('tap'); PJV.open = false; phoneRender(true); }; });
  }
  // ===================== KRČMAROVE TAJNE PONUDE: sučelje =====================
  // Ponuda je privatna (PV.tk, šalje je domaćin samo primatelju); javno je samo ishod nakon otkrivanja (d.tkr).
  // Mobitel šalje samo { k: 'tkAccept' | 'tkDecline', id }, sve ostalo određuje i provjerava domaćin.
  const TK_TAG = { voteResult: 1, bet: 1, power: 1, cast: 1, question: 1 };
  function tkBar(d, me) {
    const o = PV && PV.tk;
    if (!o || !me) return '';
    const t = pById(d, o.t), X = esc(o.x);
    if (o.st === 'o' && d.ph === 'vote') {
      const pct = o.dur ? Math.max(0, Math.min(100, (o.ms / o.dur) * 100)) : 0;
      return '<div class="pk-inv tk-inv" data-bk="tkinv" data-bv="' + o.id + '"><div class="pk-inv-h"><span class="mini">' + (t ? avSvg(t.a, 'idle') : '') + '</span><b>🍺 Tajna krčmarova ponuda</b></div>' +
        '<div class="pk-inv-s">„' + esc(o.line) + '”</div>' +
        '<div class="tk-odds"><span class="up">Ako ' + X + ' pogriješi: <b>+' + o.win + '</b></span><span class="dn">Ako ' + X + ' odgovori točno: <b>−' + o.loss + '</b></span></div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-tk="tkAccept" data-id="' + o.id + '">Prihvati</button><button class="btn ghost pk-dec" data-tk="tkDecline" data-id="' + o.id + '">Odbij</button></div><i class="pk-tm" style="--w:' + pct + '%"></i></div>';
    }
    if (o.st === 'a' && TK_TAG[d.ph]) return '<div class="rc-tag tk-tag" data-bk="tktag" data-bv="1">🍺 Tajna oklada: <b>' + X + '</b> griješi → +' + o.win + ' · točno → −' + o.loss + '</div>';
    return '';
  }
  function bindTk() {
    document.querySelectorAll('#app [data-tk]').forEach((b) => { b.onclick = () => { const k = b.dataset.tk; AUDIO.play(k === 'tkDecline' ? 'tap' : 'confirm'); krSend({ k, id: +b.dataset.id }); }; });
  }
  // ishod na otkrivanju (mobitel i TV): kratka kartica u stilu trenutka krčme; isti id → ponovno spajanje ne pokreće animaciju iznova
  function tkCard(d) {
    const r = d.tkr; if (!r) return '';
    const el = Math.max(0, d.dur - d.ms), F = pById(d, r.f), X = pById(d, r.t);
    const fig = (p, pose) => p ? '<span class="mini">' + avSvg(p.a, pose) + '</span>' : '';
    const win = r.k === 'win', pts = r.k === 'off' ? '' : '<span class="tk-pts ' + (win ? 'up' : 'dn') + '">' + (win ? '+' : '−') + Math.abs(r.d) + ' ' + esc(F ? F.n : '') + '</span>';
    return '<div class="tdl lv2 tkx' + (win ? ' tk-win' : '') + '" data-mo="tk' + (+r.id || 0) + '" style="--el:' + el + 'ms"><span class="figs tk-figs">' + fig(F, win ? 'victory' : r.k === 'lose' ? 'sad' : 'idle') + fig(X, win ? 'shocked' : r.k === 'lose' ? 'happy' : 'idle') +
      (win ? '<span class="bt-coins tk-coins">' + '<i>🪙</i>'.repeat(3) + '</span>' : '') + '</span><span class="tx"><b class="tk-h">' + esc(r.h || '') + '</b>' + pts + '<span>' + esc(r.line || '') + '</span></span></div>';
  }
  function tkToggle(d) {
    return '';   // krčmarove tajne oklade su uklonjene (oklada je sada moć)
    if (!d.opt) return '';
    if (!game) return d.opt.tk ? '<div class="lob-info">🍺 Krčmarove tajne ponude su uključene</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l">🍺 Krčmarove tajne ponude<small>Krčmar povremeno nudi igračima tajne oklade na uspjeh njihovih protivnika.</small></span><button class="tgl' + (d.opt.tk ? '' : ' off') + '" data-tkopt="' + (d.opt.tk ? 0 : 1) + '">' + (d.opt.tk ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
  // ===================== TAVERN SOCIAL FLOW 2.0: sučelje =====================
  // Tajni kutak (🗝️): jedno mjesto za privatne radnje; Vrijeme za dogovore (faza 'deal'); šapat jednim dodirom.
  // Sve što se vidi dolazi iz PV (privatno, samo ovaj igrač) ili javnog d; domaćin sve provjerava.
  const SF_BUSY_PH = { question: 1, fq: 1, duel: 1, sort: 1, link: 1, order: 1, hilo: 1, blitz: 1, maj: 1, uljez: 1, uljezVote: 1, secret: 1, secret2: 1 };
  const SF = { open: false, qi: 0, btAsk: false, rules: false, scn: false, seen: new Set(), told: new Set(), wh: true };
  try { SF.wh = localStorage.getItem('mz_sf_wh') !== '0'; } catch (e) {}
  const sfIntroSeen = () => { try { return localStorage.getItem('mz_sf_intro') === '1'; } catch (e) { return true; } };
  const sfOnPV = () => !!(PV && PV.sf);
  const sfName = (d, id) => { const p = pById(d, id); return p ? esc(p.n) + (p.b ? ' <img class="tavern-bot" src="ui/bot-medal.webp" alt="" aria-hidden="true">' : '') : '?'; };
  // odluke koje čekaju (najvažnije prvo): krčmarova ponuda se zaključava najranije, zatim pakt, zatim obračun
  function sfQueue(d) {
    const out = [];
    if (!PV) return out;
    if (PV.tk && PV.tk.st === 'o') out.push({ key: 't' + PV.tk.id, k: 'tk', o: PV.tk });
    for (const o of PV.inv || []) if (pById(d, o.f)) out.push({ key: 'p' + (o.id || o.f), k: 'pk', o });
    for (const o of (PV.rc && PV.rc.inv) || []) if (pById(d, o.f)) out.push({ key: 'r' + (o.id || o.f), k: 'rc', o });
    return out;
  }
  // zauzet sam samo dok odgovaram; dok drugi igraju dvoboj, gledatelji su slobodni
  const sfSpect = (d, me) => !!(d.du && me && me.id !== d.du.a && me.id !== d.du.b && (d.ph === 'duelIntro' || d.ph === 'duel' || d.ph === 'duelResult'));
  const sfBusyMe = (d, me) => !!SF_BUSY_PH[d.ph] && !(d.ph === 'duel' && sfSpect(d, me));
  function sfUnread(d) { return sfQueue(d).filter((x) => !SF.seen.has(x.key)).length; }
  // kratka privatna obavijest + zvuk za NOVU važnu ponudu (tijekom odgovaranja čeka kraj pitanja, kao i ostale obavijesti)
  function sfNotify(d) {
    if (!sfOnPV()) return;
    const me = meOf(d);
    if (d.ph === 'duelIntro' && sfSpect(d, me) && PV.can && PV.cand && PV.cand.length && !SF.told.has('du' + d.s)) { SF.told.add('du' + d.s); toastHold.push(['🍻 Dok traje dvoboj, možeš potajno ponuditi pakt 🗝️', 'pact']); }
    for (const x of sfQueue(d)) {
      if (SF.told.has(x.key)) continue;
      SF.told.add(x.key);
      const t = x.k === 'tk' ? '🍺 Krčmar ima tajnu ponudu za tebe!' : x.k === 'pk' ? '🍻 ' + ((pById(d, x.o.f) || {}).n || '?') + ' ti nudi tajni pakt!' : '⚔️ ' + ((pById(d, x.o.f) || {}).n || '?') + ' te izaziva na obračun!';
      toastHold.push([t + ' 🗝️', 'pact']);
    }
  }
  function sfCard(d, x) {
    if (x.k === 'tk') return tkBar(Object.assign({}, d, { ph: 'vote' }), meOf(d)).replace('<div class="pk-inv tk-inv"', '<div class="pk-inv tk-inv sf-card"');
    if (x.k === 'pk') {
      const f = pById(d, x.o.f);
      return '<div class="pk-inv sf-card"><div class="pk-inv-h"><span class="mini">' + avSvg(f.a, 'happy') + '</span><b>🍻 ' + sfName(d, x.o.f) + ' ti nudi tajni pakt</b></div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-pk="accept" data-f="' + esc(x.o.f) + '">Prihvati</button><button class="btn ghost pk-dec" data-pk="decline" data-f="' + esc(x.o.f) + '">Odbij</button></div></div>';
    }
    const f = pById(d, x.o.f), o = x.o, st = PV.rc ? PV.rc.st : 200;
    const t = o.rev ? '🔥 ' + sfName(d, o.f) + ' traži osvetu!' : o.riv ? '⚔️ Obračun s rivalom: ' + sfName(d, o.f) + ' te izaziva!' : '⚔️ ' + sfName(d, o.f) + ' te izaziva na rivalski obračun!';
    return '<div class="pk-inv rc-inv sf-card"><div class="pk-inv-h"><span class="mini">' + avSvg(f.a, 'attack') + '</span><b>' + t + '</b></div>' +
      '<div class="pk-inv-s">Ulog <b>' + st + '</b>. Tko jedini odgovori točno, uzima do iznosa uloga od protivnika; u suprotnom je neriješeno.</div>' +
      '<div class="pk-row"><button class="btn pk-acc" data-rc="rcAccept" data-f="' + esc(o.f) + '">Prihvati</button><button class="btn ghost pk-dec" data-rc="rcDecline" data-f="' + esc(o.f) + '">Odbij</button></div></div>';
  }
  const sfRules = () => '<div class="sf-rules"><div class="sf-h">🍻 Tajni paktovi</div><ol>' +
    '<li><b>1</b>Oboje točno → riznica +100. Jedan točno → +40.</li>' +
    '<li><b>2</b>Odani do finala: riznica +40 %, dijeli se napola.</li>' +
    '<li><b>3</b>Izdaja (nakon 2 zajednička pitanja): uzimaš riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova (najviše 300). Izdate li oboje, riznica propada.</li></ol></div>';
  function sfPact(d, me) {
    if (!PV || !PV.k) return '';
    const k = PV.k, m = pById(d, k.m);
    let h = '<div class="sf-sec"><div class="sf-ally"><span class="mini">' + (m ? avSvg(m.a, 'happy') : '') + '</span><span>🍻 <b>' + sfName(d, k.m) + '</b></span>' +
      '<span class="sf-tre">💰 <b>' + fmtN(k.tre) + '</b></span></div>';
    if (k.dl || k.cb) {
      if (k.bt) h += '<div class="sf-row"><span class="sf-bt on">🗡️ Izdaja pripremljena</span><button class="pk-b" data-bt="0">Odustani</button></div>';
      else if (SF.btAsk) h += '<div class="sf-bt">🗡️ Ako samo ti izdaš, uzimaš riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova (najviše 300). Ako oboje izdate, riznica propada.</div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-bt="1">Potvrdi</button><button class="btn ghost" data-sfbt="0">Odustani</button></div>';
      else h += '<button class="sf-link sf-btask" data-sfbt="1">🗡️ Pripremi izdaju</button>';
    } else if (k.btl) h += '<div class="sf-bt on">🗡️ Izdaja je zaključana · otkriva se odmah nakon ove ploče</div>';
    return h + '</div>';
  }
  function sfSend(d, me) {
    let h = '';
    if (PV.out) h += '<div class="pk-bar out"><span class="pk-t">🍻 Ponuda poslana: <b>' + sfName(d, PV.out.t) + '</b></span><button class="pk-b" data-pk="cancel">Povuci</button></div>';
    else if (PV.can && PV.cand && PV.cand.length) h += '<div class="sf-sec"><div class="sf-h">🍻 Ponudi pakt</div><div class="pk-cands">' + PV.cand.map((id) => { const p = pById(d, id); return p ? '<button class="pk-cand" data-pk="offer" data-to="' + esc(id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span>' + sfName(d, id) + '</button>' : ''; }).join('') + '</div></div>';
    const R0 = PV.rc;
    if (R0 && R0.out) h += '<div class="pk-bar out rc-out"><span class="pk-t">⚔️ Izazov poslan: <b>' + sfName(d, R0.out.t) + '</b></span><button class="pk-b" data-rc="rcCancel">Povuci</button></div>';
    else if (R0 && R0.can && R0.cand && R0.cand.length && !d.rc) h += '<div class="sf-sec"><div class="sf-h">⚔️ Rivalski obračun <small>ulog ' + R0.st + '</small></div><div class="pk-cands">' +
      R0.cand.slice().sort((x, y) => (y.rev + y.riv) - (x.rev + x.riv)).map((c) => { const p = pById(d, c.id); return p ? '<button class="pk-cand" data-rc="rcOffer" data-to="' + esc(c.id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span>' + sfName(d, c.id) + (c.rev ? ' <em>🔥 osveta</em>' : c.riv ? ' <em>⚔️ rival</em>' : '') + '</span></button>' : ''; }).join('') + '</div></div>';
    return h;
  }
  const SCN = [['krpact', 'Krčmar mi nudi pakt s botom'], ['betray', 'Bot (saveznik) priprema izdaju'], ['loyal', 'Bot (saveznik) ostaje odan'], ['challenge', 'Krčmar me pita da izazovem vođu'], ['task', 'Krčmar mi nudi tajni zadatak'], ['fav', 'Krčmar mi nudi uslugu (kategorija)']];
  // skriveni razvojni izbornik: 5 dodira na naslov „Tajni kutak” ili #dev u adresi (samo lokalni domaćin u testnom načinu s botovima)
  const sfDev = () => { if (SF.dev) return true; try { return /dev/.test(location.hash) || sessionStorage.getItem('mz_dev') === '1'; } catch (e) { return false; } };
  function sfScn(d) {
    if (!PV || !PV.bs || !game || !game.sfScenario || mode === 'player' || !sfDev()) return '';
    return '<div class="sf-sec sf-scn"><button class="pk-b" data-sfscnopen="1"><img class="tavern-bot" src="ui/bot-medal.webp" alt="" aria-hidden="true"> Testni scenariji ' + (SF.scn ? '▴' : '▾') + '</button>' +
      (SF.scn ? '<div class="sf-scn-l">' + SCN.map(([k, t]) => '<button class="pk-cand" data-scn="' + k + '">' + t + '</button>').join('') + '</div>' : '') + '</div>';
  }
  // sadržaj Tajnog kutka: samo ono što je trenutačno relevantno
  function sfBody(d, me) {
    if (!PV) return '<div class="sf-empty">Trenutačno nema tajnih poslova.</div>';
    const pactsIn = PV.can || PV.k || (PV.inv || []).length || PV.out;
    if (pactsIn && SF.rules) return sfRules() + '<div class="pk-row"><button class="btn pk-acc" data-sfintro="1">U redu</button></div>';
    const Q = sfQueue(d);
    let h = '';
    if (Q.length) {
      SF.qi = Math.min(SF.qi, Q.length - 1);
      const x = Q[SF.qi];
      for (const y of Q) SF.seen.add(y.key);
      h += (Q.length > 1 ? '<div class="sf-qn">Odluka ' + (SF.qi + 1) + '/' + Q.length + '<button class="pk-b" data-sfq="1">Sljedeća ›</button></div>' : '') + sfCard(d, x);
    }
    h += sfPact(d, me) + (Q.length ? '' : sfSend(d, me));   // jedna važna odluka u jednom trenutku: slanje ponuda čeka
    if (!h) h = '<div class="sf-empty">Nema tajnih poslova.</div>';
    if (pactsIn) h += '<button class="sf-link" data-sfrules="1">📜 Pravila</button>';
    return h + sfScn(d);
  }
  // gumb 🗝️ Tajne (mirne faze) i kartica kutka; tijekom odgovaranja se zatvara (stanje ponuda ostaje)
  function sfKey(d, me) {
    SF.open = false; return '';   // tipka Tajni kutak je uklonjena (Krčmar 2.0: sve se događa na ploči bodova)
    if (!phoneShown() || !me || !sfOnPV() || d.ph === 'lobby' || d.ph === 'final' || d.ph === 'deal' || sfBusyMe(d, me) || d.fin) { SF.open = false; return ''; }
    const n = sfUnread(d);
    const btn = '<button class="sf-key' + (n ? ' new' : '') + '" data-sfk="1" aria-label="Tajne' + (n ? ', nepročitano ' + n : '') + '"><span class="sf-ki">🗝️</span><span class="sf-kt">Tajne</span>' + (n ? '<span class="sf-badge">' + n + '</span>' : PV.k ? '<span class="sf-ally-dot" title="Savez">🍻</span>' : '') + '</button>';
    if (!SF.open) return btn;
    return btn + '<div class="sf-sheet" role="dialog" aria-label="Tajni kutak"><div class="sf-sheet-in"><div class="sf-top"><b data-sfdev="1">🗝️ Tajni kutak</b><button class="pk-l x" data-sfk="0" aria-label="Zatvori">✕</button></div>' + sfBody(d, me) + '</div></div>';
  }
  // Vrijeme za dogovore (mobitel): kutak je odmah otvoren, bez žurbe u testnom načinu
  function dealPhone(d, me) {
    const dl = d.dl || {}, mine = me && (me.ok || (L && L.sent));
    const ps = d.P.filter((p) => p.c && !p.b), ready = ps.filter((p) => p.ok).length;
    // gumb za spremnost odmah ispod naslova: uvijek vidljiv bez pomicanja i ne ispod okruglih gumba za zvuk
    const go = mine ? '<div class="sf-go"><span class="ht-go">Čekamo ostale…</span><span class="ht-ready">Spremno: <b>' + ready + '/' + ps.length + '</b></span></div>'
      : '<div class="sf-go"><button class="btn win-cta sf-ok" id="sfready">' + (dl.solo ? 'Nastavi kada si spreman ✓' : 'Spreman ✓') + '</button>' + (ps.length > 1 ? '<span class="ht-ready">Spremno: <b>' + ready + '/' + ps.length + '</b></span>' : '') + '</div>';
    return (dl.solo ? '' : timerHtml(5000)) + '<div class="sf-deal"><div class="sf-dt">🍻 VRIJEME ZA DOGOVORE</div><div class="sf-dl">' + esc(dl.t || '') + '</div></div>' +
      go + '<div class="sf-inline">' + sfBody(d, me) + '</div>';
  }
  // TV / javni prikaz: samo najava i koliko je spremno (nikakvi privatni podaci)
  function dealTv(d) {
    const dl = d.dl || {}, ps = d.P.filter((p) => p.c && !p.b), ready = ps.filter((p) => p.ok).length;
    return '<div class="sf-deal tv"><div class="sf-dt">🍻 VRIJEME ZA DOGOVORE</div><div class="sf-dl">' + esc(dl.t || '') + '</div><div class="sf-ds">Igrači sklapaju dogovore na mobitelima…</div>' +
      '<div class="ht-ready" data-bk="sfr" data-bv="' + ready + '">Spremno: <b>' + ready + '/' + ps.length + '</b></div></div>';
  }
  // tijekom pitanja: samo saveznik, riznica, šapat (jedan dodir uz odgovor) i primljeni šapat
  function sfQuestionBar(d, me) {
    if (!PV || !PV.k || d.ph !== 'question') return '';
    const k = PV.k, m = pById(d, k.m);
    const act = k.wsent ? '<span class="pk-sent">🔮 Šapnuto</span>' : '<button class="pk-b sf-whtg' + (SF.wh ? ' on' : '') + '" data-sfwh="1" aria-pressed="' + SF.wh + '">' + (SF.wh ? '🔮 Odgovori i šapni' : '🔮 Bez šapata') + '</button>';
    return '<div class="pk-bar sf-qbar"><span class="mini">' + (m ? avSvg(m.a, 'idle') : '') + '</span><span class="pk-t"><b>🍻 ' + sfName(d, k.m) + '</b><span class="pk-tre" data-bk="pktre" data-bv="' + k.tre + '">💰 ' + fmtN(k.tre) + '</span></span>' +
      (k.wh !== undefined ? '<span class="pk-whin" data-bk="pkwh" data-bv="' + k.wh + '">🔮 <b>' + LET[k.wh] + '</b></span>' : '') + act + '</div>';
  }
  function sfHead(d, me, head) {
    const act = d.rc, mine = act && me && (act.a === me.id || act.b === me.id);
    let tags = '';
    if (mine && (d.ph === 'question' || RC_PH[d.ph])) tags += '<div class="rc-tag" data-bk="rctag" data-bv="1">⚔️ Obračun: <b>' + rcN(d, act.a) + ' vs ' + rcN(d, act.b) + '</b> · ulog ' + act.st + '</div>';
    if (PV && PV.tk && ((PV.tk.st === 'a' && TK_TAG[d.ph]) || (PV.tk.st === 'o' && d.ph === 'vote'))) tags += tkBar(d, me);
    if (sfSpect(d, me) && PV && ((PV.can && PV.cand && PV.cand.length) || sfQueue(d).length)) tags += '<button class="pk-open sf-duelhint" data-sfk="1">🍻 Tajni pakt dok traje dvoboj</button>';
    return head + tags + pjChip(d, me);
  }
  function bindSf(d) {
    sfNotify(d);
    // gumb i kartica kutka žive izvan #app (ne sudjeluju u prijelazima ekrana); mijenjaju se samo kad se sadržaj promijeni
    let box = document.getElementById('sfbox');
    if (!box) { box = document.createElement('div'); box.id = 'sfbox'; document.body.appendChild(box); }
    const kh = sfKey(d, meOf(d));
    if (box.__h !== kh) { box.innerHTML = kh; box.__h = kh; }
    const q = (s) => document.querySelectorAll('#app ' + s + ', #sfbox ' + s);
    q('[data-sfk]').forEach((b) => { b.onclick = () => { AUDIO.play('tap'); SF.open = b.dataset.sfk === '1'; SF.btAsk = false; phoneRender(true); }; });
    q('[data-sfq]').forEach((b) => { b.onclick = () => { SF.qi = (SF.qi + 1) % Math.max(1, sfQueue(S).length); phoneRender(true); }; });
    q('[data-sfintro]').forEach((b) => { b.onclick = () => { try { localStorage.setItem('mz_sf_intro', '1'); } catch (e) {} SF.rules = false; AUDIO.play('confirm'); phoneRender(true); }; });
    q('[data-sfrules]').forEach((b) => { b.onclick = () => { SF.rules = true; phoneRender(true); }; });
    q('[data-sfbt]').forEach((b) => { b.onclick = () => { SF.btAsk = b.dataset.sfbt === '1'; AUDIO.play('tap'); phoneRender(true); }; });
    q('[data-sfdev]').forEach((b) => { b.onclick = () => { SF.devN = (SF.devN || 0) + 1; if (SF.devN >= 5) { SF.dev = true; try { sessionStorage.setItem('mz_dev', '1'); } catch (e) {} phoneRender(true); } }; });
    q('[data-sfwh]').forEach((b) => { b.onclick = () => { SF.wh = !SF.wh; try { localStorage.setItem('mz_sf_wh', SF.wh ? '1' : '0'); } catch (e) {} AUDIO.play('tap'); phoneRender(true); }; });
    q('[data-sfscnopen]').forEach((b) => { b.onclick = () => { SF.scn = !SF.scn; phoneRender(true); }; });
    q('[data-scn]').forEach((b) => { b.onclick = () => { if (!game || !game.sfScenario) return; const r = game.sfScenario(PID, b.dataset.scn); toastHold.push([(r.ok ? '🤖 ' : '⚠️ ') + r.msg, r.ok ? 'pact' : 'no']); AUDIO.play(r.ok ? 'confirm' : 'tap'); SF.scn = false; phoneRender(true); pactToasts(S); }; });
    q('[data-bt]').forEach((b) => { const f = b.onclick; b.onclick = () => { SF.btAsk = false; if (f) f(); }; });
    // gumbi paktova i obračuna u kartici kutka (izvan #app) — isti postupci kao u bindPact/bindRc
    document.querySelectorAll('#sfbox [data-pk]').forEach((b) => { b.onclick = () => { const k = b.dataset.pk; AUDIO.play(k === 'decline' ? 'tap' : 'confirm'); krSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
    document.querySelectorAll('#sfbox [data-rc]').forEach((b) => { b.onclick = () => { const k = b.dataset.rc; AUDIO.play(k === 'rcDecline' || k === 'rcCancel' ? 'tap' : 'confirm'); krSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
    document.querySelectorAll('#sfbox [data-tk]').forEach((b) => { b.onclick = () => { const k = b.dataset.tk; AUDIO.play(k === 'tkDecline' ? 'tap' : 'confirm'); krSend({ k, id: +b.dataset.id }); }; });
    document.querySelectorAll('#sfbox [data-bt]').forEach((b) => { b.onclick = () => { SF.btAsk = false; AUDIO.play(b.dataset.bt === '1' ? 'zap' : 'tap'); krSend({ k: 'betray', on: b.dataset.bt === '1' }); }; });
    bindWhi();
    bindKr(d);
    bindRope(d);
    bind('sfready', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });
  }
  function bsToggle(d) {
    if (!d.opt) return '';
    if (!game) return d.opt.bs ? '<div class="lob-info"><img class="tavern-bot" src="ui/bot-medal.webp" alt="" aria-hidden="true"> Testiranje društvenih mehanika s botovima je uključeno</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l"><img class="tavern-bot" src="ui/bot-medal.webp" alt="" aria-hidden="true"> Paktovi s botovima<small>Botovi mogu sklapati paktove i pokušati izdaju.</small></span><button class="tgl' + (d.opt.bs ? '' : ' off') + '" data-bsopt="' + (d.opt.bs ? 0 : 1) + '">' + (d.opt.bs ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
  // šapat na kartici odgovora: 🔮 šalje to slovo savezniku (vlastiti odgovor se NE zaključava); primljeni šapat = mali avatar saveznika
  function sfOptX(d, i, answered, gone) {
    return '';   // šaputanje je uklonjeno
    if (!PV || !PV.sf || !PV.k || d.ph !== 'question') return '';
    const k = PV.k, m = pById(d, k.m);
    let h = '';
    if (k.wh === i && m) h += '<span class="sf-whav" title="Šapat saveznika">' + avSvg(m.a, 'happy') + '</span>';
    if (k.wc === i) h += '<span class="sf-whi sent" aria-label="Šapnuto">🔮</span>';
    else if (!answered && !gone && !k.wsent) h += '<span class="sf-whi" data-whi="' + i + '" role="button" aria-label="Šapni ' + LET[i] + ' savezniku">🔮</span>';
    return h;
  }
  function bindWhi() {
    document.querySelectorAll('#app [data-whi]').forEach((x) => {
      x.onpointerdown = (e) => { e.stopPropagation(); };
      x.onclick = (e) => { e.stopPropagation(); e.preventDefault(); AUDIO.play('whoosh'); krSend({ k: 'whisper', c: +x.dataset.whi }); };
    });
  }
  // slanje akcija domaćinu (web: pactSend iz mrežnog sloja; samostalni demo: izravno u igru)
  const krSend = (a) => (typeof pactSend === 'function' ? pactSend(a) : game && game.pactAction(PID, a));
  // ===================== KRČMAR 2.0: sučelje ploče bodova =====================
  // Ispod poretka: privatni dio (samo ovaj igrač) i „Nastavi”. Igra ide dalje kad svi potvrde (domaćin odlučuje).
  function krReadyCount(d) { const ps = d.P.filter((p) => p.c && !p.b); return [ps.filter((p) => p.ok).length, ps.length]; }
  // privatni dio ploče: ponuda pakta (blokira Nastavi dok ne odlučiš), savez + izdaja
  // ishod Oklade (samo bettor): tko je meta i zašto nije uspjela
  function krOkr(d) {
    const o = PV && PV.okr; if (!o) return '';
    const t = pById(d, o.t), nm = '<b>' + esc(t ? t.n : '?') + '</b>';
    const msg = o.why === '' ? 'Oklada na ' + nm + ' je uspjela! <span class="up">+' + o.w + '</span>'
      : 'Oklada na ' + nm + ' nije uspjela — ' + (o.why === 'me' ? 'tvoj odgovor nije bio točan.' : 'odgovor mete nije bio točan.');
    return '<div class="kr-note kr-okr' + (o.why === '' ? ' win' : '') + '">🎲 ' + msg + '</div>';
  }
  function krPriv(d, me) {
    const r = krPriv0(d, me), n = krOkr(d);
    if (!n) return r;
    return r && typeof r === 'object' ? Object.assign({}, r, { html: n + (r.html || '') }) : n + (r || '');
  }
  function krPriv0(d, me) {
    if (!PV) return '';
    if (PV.ko) {
      const o = PV.ko;
      const t = o.k === 'fav' ? '🗳️ Krčmarova usluga' : '📜 Tajni zadatak';
      const sub = o.k === 'fav' ? esc(o.line) : esc(o.line) + '<br><span class="up">Uspjeh +' + o.win + '</span> · <span class="dn">neuspjeh −' + o.loss + '</span>';
      return { block: 1, html: '<div class="pk-inv kr-card kr-off"><div class="pk-inv-h"><b>🍺 ' + t + '</b></div><div class="pk-inv-s">' + sub + '</div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-kro="1">Prihvati</button><button class="btn ghost pk-dec" data-kro="0">Odbij</button></div></div>' + krMine() };
    }
    const mine = krMine();
    if (PV.kp) {
      const o = PV.kp, m = pById(d, o.m);
      if (o.ans == null) return { block: 1, html: '<div class="pk-inv kr-card"><div class="pk-inv-h"><span class="mini">' + (m ? avSvg(m.a, 'happy') : '') + '</span><b>🍺 Krčmar ti nudi tajni pakt s: ' + esc(o.x) + '</b></div>' +
        '<div class="pk-inv-s">Oboje točno → riznica +100, jedan točno → +40. Odanost donosi podjelu; nakon 2 pitanja moguća je izdaja. Jedan pakt po igri; oboje morate prihvatiti.</div><button class="sf-link" data-pactrules="1">📜 Pravila i posljedice</button>' +
        '<div class="pk-row"><button class="btn pk-acc" data-krp="1">Prihvati</button><button class="btn ghost pk-dec" data-krp="0">Odbij</button></div></div>' };
      return '<div class="kr-note">🍺 Čekamo odgovor drugog igrača…</div>' + mine;
    }
    if (PV.k) {
      const k = PV.k, m = pById(d, k.m);
      let h = '<div class="sf-sec kr-ally"><div class="sf-ally"><span class="mini">' + (m ? avSvg(m.a, 'happy') : '') + '</span><span>🍻 <b>' + esc(m ? m.n : '?') + '</b></span><span class="sf-tre">💰 <b>' + fmtN(k.tre) + '</b></span></div>';
      if (k.wait) h += '<div class="sf-note">Izdaja je moguća za ' + k.wait + (k.wait === 1 ? ' pitanje' : ' pitanja') + '.</div>';
      else if (k.cb) {
        if (k.bt) h += '<div class="sf-row"><span class="sf-bt on">🗡️ Izdaja pripremljena</span><button class="pk-b" data-bt="0">Odustani</button></div>';
        else if (SF.btAsk) h += '<div class="sf-bt">🗡️ Ako samo ti izdaš, uzimaš riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova (najviše 300). Ako oboje izdate, riznica propada.</div><div class="pk-row"><button class="btn pk-acc" data-bt="1">Potvrdi</button><button class="btn ghost" data-sfbt="0">Odustani</button></div>';
        else h += '<button class="sf-link sf-btask" data-sfbt="1">🗡️ Pripremi izdaju</button>';
      }
      else if (k.btl) h += '<div class="sf-bt on">🗡️ Izdaja je zaključana · otkriva se odmah nakon ove ploče</div>';
      return h + '</div>' + mine;
    }
    return mine;
  }
  // aktivni zadatak / usluga (mala oznaka)
  function krMine() {
    let h = '';
    if (PV.kt) h += '<div class="kr-tag">📜 ' + esc(PV.kt.line) + (PV.kt.kind === 'st3' ? ' <b>' + PV.kt.n + '/3</b>' : '') + '</div>';
    if (PV.kf) h += '<div class="kr-tag">🗳️ Tvoj glas bira sljedeću kategoriju</div>';
    return h;
  }
  function krBox(d, me) {
    if (!d.rw || !me) return '';
    const [r, n] = krReadyCount(d), mine = me.ok || (L && L.sent);
    let priv = krPriv(d, me);
    if (d.lc && d.lc.st === 'o' && d.lc.a === me.id && !priv.block) priv = { block: 1, html: priv && typeof priv === 'object' ? priv.html || '' : priv || '' };
    const go = mine ? '<div class="kr-wait">Čekamo ostale… <b class="kr-cnt">' + r + '/' + n + '</b></div>'
      : priv.block ? '' : '<button class="btn win-cta kr-go" id="krok">Nastavi</button>' + (n > 1 ? '<div class="kr-wait">Spremno <b class="kr-cnt">' + r + '/' + n + '</b></div>' : '');
    const ph0 = priv && typeof priv === 'object' ? priv.html || '' : priv || '';
    const dev = PV && PV.bs && game && mode !== 'player' ? (sfDev() ? sfScn(d) : '<button class="kr-dev" data-sfdev="1" aria-label="Testni način"><img class="tavern-bot" src="ui/bot-medal.webp" alt="" aria-hidden="true"></button>') : '';
    return '<div class="kr-box">' + krChallenge(d, me) + ph0 + go + dev + '</div>';
  }
  function krTv(d) {
    if (!d.rw) return '';
    const [r, n] = krReadyCount(d);
    return krChallenge(d, null) + (n ? '<div class="kr-wait tv" data-bk="krr" data-bv="' + r + '">Spremno <b>' + r + '/' + n + '</b></div>' : '');
  }
  function bindKr(d) {
    document.querySelectorAll('#app [data-pactrules]').forEach((b) => { b.onclick = () => {
      if (document.getElementById('pactRulesModal')) return;
      const modal = document.createElement('div'); modal.id = 'pactRulesModal'; modal.className = 'pact-rules-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Pravila tajnog pakta');
      modal.innerHTML = '<div class="sf-rules"><div class="sf-h">🍻 Pravila tajnog pakta</div><ol><li>Oboje točno: riznica +100; jedan točno: +40.</li><li>Odanost do finala: riznica raste 40 % i dijeli se.</li><li>Nakon 2 pitanja moguća je izdaja: riznica i 8 % partnerovih bodova (najviše 300). Ako oboje izdate, riznica propada.</li><li>U partiji možeš sklopiti jedan pakt. Pakt nastaje tek kad oboje prihvatite.</li></ol><button class="btn ghost" type="button">Zatvori</button></div>';
      document.body.appendChild(modal); const close = () => { modal.remove(); if (b.isConnected) b.focus(); }; modal.querySelector('button').onclick = close; modal.onclick = (e) => { if (e.target === modal) close(); }; modal.onkeydown = (e) => { if (e.key === 'Escape') close(); }; modal.querySelector('button').focus();
    }; });
    document.querySelectorAll('#app [data-kro]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.kro === '1' ? 'confirm' : 'tap'); krSend({ k: 'krOff', yes: b.dataset.kro === '1' }); }; });
    document.querySelectorAll('#app [data-krp]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.krp === '1' ? 'confirm' : 'tap'); krSend({ k: 'krPact', yes: b.dataset.krp === '1' }); }; });
    bind('krok', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });
  }
  // ----- izazov vođi: javni prijedlog na ploči -----
  function krChallenge(d, me) {
    const o = d.lc; if (!o) return '';
    const A = pById(d, o.a), B = pById(d, o.b), mine = me && me.id === o.a;
    const head = '<div class="pk-inv kr-card kr-ch"><div class="pk-inv-h"><span class="mini">' + (A ? avSvg(A.a, 'attack') : '') + '</span><b>⚔️ ' + esc(A ? A.n : '?') + ', izazivaš li vođu ' + esc(B ? B.n : '?') + '?</b></div>' +
      '<div class="pk-inv-s">Točno vuče konop, netočno vraća. Pobjeda izazivača: uzima do ' + fmtN(o.sb) + ' od vođe. Pobjeda vođe: uzima do ' + fmtN(o.sa) + ' i bonus ' + fmtN(o.g) + '. Neriješeno: bez prijenosa.</div>';
    if (o.st === 'o') return head + (mine ? '<div class="pk-row"><button class="btn pk-acc" data-krc="1">Izazovi</button><button class="btn ghost pk-dec" data-krc="0">Ne ovaj put</button></div>' : '<div class="kr-note">' + esc(A ? A.n : '?') + ' odlučuje…</div>') + '</div>';
    if (o.st === 'y') return head + '<div class="kr-note">⚔️ Izazov prihvaćen! Dvoboj kreće nakon ploče.</div></div>';
    return head + '<div class="kr-note">🍺 Možda drugi put…</div></div>';
  }
  // ----- nadvlačenje konopa -----
  function ropeBar(d) {
    const r = d.rp || { pa: 0, pb: 0, m: 7 }, du = d.du, A = pById(d, du.a), B = pById(d, du.b);
    const x = Math.max(-1, Math.min(1, (r.pa - r.pb) / r.m));
    return '<div class="rope"><span class="rope-p a"><span class="mini">' + (A ? avSvg(A.a, x > 0 ? 'happy' : 'attack') : '') + '</span><b>' + esc(A ? A.n : '') + '</b><i>' + r.pa + '</i></span>' +
      '<span class="rope-t"><span class="rope-line"></span><span class="rope-k" style="--x:' + (-x * 50).toFixed(1) + '%"></span><span class="rope-mid"></span></span>' +
      '<span class="rope-p b"><i>' + r.pb + '</i><b>' + esc(B ? B.n : '') + '</b><span class="mini">' + (B ? avSvg(B.a, x < 0 ? 'happy' : 'attack') : '') + '</span></span></div>';
  }
  function ropePhone(d, me) {
    const du = d.du, mine = me && (me.id === du.a || me.id === du.b);
    if (!mine) return timerHtml() + '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="waiting">Gledaš dvoboj. Točno vuče, netočno vraća!</div>';
    const list = d.rp.list, st = L.rp || (L.rp = { i: 0, r: [], fb: '', last: 1 });
    const fb = st.fb ? '<div class="mg-fb ' + (st.last ? 'ok' : 'bad') + ' pop">' + esc(st.fb) + '</div>' : '<div class="mg-fb"></div>';
    if (st.i >= list.length) return timerHtml() + '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="waiting">Nema više tvrdnji — čekamo kraj!</div>';
    return timerHtml() + '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="mg rope-mg"><div class="mg-q">' + esc(list[st.i][0]) + '</div><div class="mg-tf"><button class="btn" data-rpv="1">Točno</button><button class="btn ghost" data-rpv="0">Netočno</button></div>' + fb + '</div>';
  }
  function ropeTv(d) { return '<div class="tv-mid"><div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="du-note">Točan odgovor vuče konop, netočan ga vraća.</div></div>'; }
  function ropeResult(d) {
    const du = d.du, rr = du.rr || {}, W = du.w ? pById(d, du.w) : null, Lp = du.w ? pById(d, du.w === du.a ? du.b : du.a) : null;
    const pose = (id) => (!du.w ? 'idle' : id === du.w ? 'victory' : 'sad');
    const res = !W ? 'Neriješeno — nitko ne gubi bodove.' : du.w === du.a ? '🏆 <b>' + esc(W.n) + '</b> ruši vođu! +' + rr.t + ' od ' + esc(Lp ? Lp.n : '') : '🛡️ <b>' + esc(W.n) + '</b> brani krunu! +' + rr.t + ' od ' + esc(Lp ? Lp.n : '') + ' · obrana krune +' + rr.g;
    return '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + duelVs(d, pose) + '<div class="du-res">' + res + '</div><div class="du-ms">' + (rr.pa || 0) + ' : ' + (rr.pb || 0) + '</div>' + (du.o ? '<div class="du-note">' + esc(du.o) + '</div>' : '');
  }
  function bindRope(d) {
    document.querySelectorAll('#app [data-krc]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.krc === '1' ? 'confirm' : 'tap'); krSend({ k: 'krCh', yes: b.dataset.krc === '1' }); }; });
    document.querySelectorAll('#app [data-rpv]').forEach((b) => { b.onclick = () => {
      const st = L.rp, list = d.rp && d.rp.list; if (!st || !list || st.i >= list.length) return;
      const v = +b.dataset.rpv, ok = v === list[st.i][1];
      st.r.push(v); st.i++; st.last = ok ? 1 : 0; st.fb = ok ? '✓ Vuci!' : '✗ Konop klizi';
      AUDIO.play(ok ? 'tap' : 'wrong'); sendPartial({ r: st.r.slice() }); phoneRender(true);
    }; });
  }
  // broj spremnih mijenja se bez ponovnog crtanja ploče (da se ne ponavljaju animacije bodova)
  function krLive(d) {
    if (!d || !d.rw) return;
    const [r, n] = krReadyCount(d), t = r + '/' + n;
    document.querySelectorAll('#app .kr-cnt').forEach((e) => { if (e.textContent !== t) e.textContent = t; });
  }
  const PACT_STEAL = 0.08;
  function bindPact(d) {
    bindRc();
    bindTk();
    bindPj();
    const q = (s) => document.querySelectorAll('#app ' + s);
    q('[data-pk]').forEach((b) => { b.onclick = () => { const k = b.dataset.pk; AUDIO.play(k === 'decline' ? 'tap' : 'confirm'); L.pkOpen = false; krSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
    q('[data-pkopen]').forEach((b) => { b.onclick = () => { L.pkOpen = true; phoneRender(true); }; });
    q('[data-pkx]').forEach((b) => { b.onclick = () => { L.pkOpen = false; phoneRender(true); }; });
    q('[data-whopen]').forEach((b) => { b.onclick = () => { L.whOpen = true; phoneRender(true); }; });
    q('[data-whx]').forEach((b) => { b.onclick = () => { L.whOpen = false; phoneRender(true); }; });
    q('[data-wh]').forEach((b) => { b.onclick = () => { L.whOpen = false; AUDIO.play('whoosh'); krSend({ k: 'whisper', c: +b.dataset.wh }); }; });
    q('[data-bt]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.bt === '1' ? 'zap' : 'tap'); krSend({ k: 'betray', on: b.dataset.bt === '1' }); }; });
    bindSf(d);
  }
  // obavijesti: javne glasine (svi) i privatne poruke (samo ja); ne blokiraju ništa
  const toastSeen = new Set(); let toastHold = [];
  function pactToasts(d) {
    const out = [];
    // tijekom pitanja ništa ne smije prekriti odgovore: obavijesti čekaju kraj pitanja
    const busy = d.ph === 'question' || d.ph === 'fq' || d.ph === 'duel' || d.ph === 'rope' || d.ph === 'order' || d.ph === 'hilo' || d.ph === 'blitz' || d.ph === 'sort' || d.ph === 'link' || d.ph === 'maj' || d.ph === 'uljez' || d.ph === 'uljezVote';
    if (d.news && !toastSeen.has('n' + d.news.id)) { toastSeen.add('n' + d.news.id); out.push([d.news.t, 'pub']); }
    if (PV && PV.note && !toastSeen.has('p' + PV.note.id)) { toastSeen.add('p' + PV.note.id); out.push([PV.note.t, PV.note.k || '']); }
    if (busy) { toastHold.push(...out); return; }
    out.unshift(...toastHold.splice(0));
    for (const [t, k] of out) {
      let box = document.getElementById('ptoasts');
      if (!box) { box = document.createElement('div'); box.id = 'ptoasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      const e = document.createElement('div'); e.className = 'ptoast ' + k; e.textContent = t; box.appendChild(e);
      if (k === 'tre') AUDIO.play('score'); else if (k === 'pub') AUDIO.play('stingSmall'); else if (k === 'pact') AUDIO.play('correct');
      setTimeout(() => { e.classList.add('out'); setTimeout(() => e.remove(), 400); }, 3600);
    }
  }
  // ----- veliki javni događaji: izdaja, dvostruka izdaja, odanost (isti na mobitelu i TV-u) -----
  const KRCMAR = '<span class="krc">🍺</span>';
  function betrayHtml(d, tv) {
    const B = d.bt; if (!B) return '';
    const el = Math.max(0, d.dur - d.ms), per = 3000, i = Math.min(B.evs.length - 1, B.evs.length > 1 ? Math.floor(el / per) : 0), e = B.evs[i];
    const off = B.evs.length > 1 ? i * per : 0;
    const fig = (id, pose, cls) => { const p = pById(d, id); return '<div class="bt-fig ' + cls + '"><span class="bt-av">' + (p ? avSvg(p.a, pose) : '') + '</span><b>' + esc(p ? p.n : '?') + '</b></div>'; };
    const num = (k, v, sgn, cud) => '<span data-ck="' + k + '" data-cu="0" data-to="' + v + '" data-pre="' + sgn + '" data-cud="' + cud + '" data-cdur="900">' + sgn + v + '</span>';
    let h;
    if (e.k === 'double') {
      h = '<div class="bt-t dbl">💀 DVOSTRUKA IZDAJA!</div><div class="bt-s"><span class="bt-who">' + esc(nameOf(d, e.a)).toUpperCase() + '</span> <span class="bt-arrow">⚔️</span> <span class="bt-who">' + esc(nameOf(d, e.b)).toUpperCase() + '</span></div>' +
        '<div class="bt-stage dbl">' + fig(e.a, 'attack', 'l') + '<div class="bt-mid"><span class="bt-knife a">🗡️</span><span class="bt-knife b">🗡️</span><span class="bt-chest broken">💰</span></div>' + fig(e.b, 'attack', 'r') + '</div>' +
        '<div class="bt-rows"><div class="bt-row lost">💰 Riznica <b>' + fmtN(e.tre) + '</b> propada</div>' +
        (e.la || e.lb ? '<div class="bt-row neg">' + esc(nameOf(d, e.a)) + ' ' + num('bta' + i, e.la, '−', 1700) + '</div><div class="bt-row neg">' + esc(nameOf(d, e.b)) + ' ' + num('btb' + i, e.lb, '−', 1900) + '</div>' : '<div class="bt-row">Nitko nikome ne krade bodove</div>') + '</div>';
    } else {
      h = '<div class="bt-t">🗡️ IZDAJA U KRČMI!</div><div class="bt-s"><span class="bt-who t">' + esc(nameOf(d, e.t)).toUpperCase() + '</span> <span class="bt-arrow">🗡️</span> <span class="bt-who v">' + esc(nameOf(d, e.v)).toUpperCase() + '</span></div>' +
        '<div class="bt-stage">' + fig(e.t, 'attack', 'l') + '<div class="bt-mid"><span class="bt-knife">🗡️</span><span class="bt-coins">' + '<i>🪙</i>'.repeat(6) + '</span></div>' + fig(e.v, 'shocked', 'r v') + '</div>' +
        '<div class="bt-rows"><div class="bt-row">💰 Ukradena riznica ' + num('btt' + i, e.tre, '+', 1500) + '</div>' +
        '<div class="bt-row">🗡️ Ukradeno partneru (' + Math.round(PACT_STEAL * 100) + ' %, najviše 300) ' + num('bts' + i, e.st, '+', 1800) + '</div>' +
        '<div class="bt-row tot">Izdajnik ' + esc(nameOf(d, e.t)) + ' ' + num('btg' + i, e.gain, '+', 2300) + '</div>' +
        '<div class="bt-row neg">Izdan: ' + esc(nameOf(d, e.v)) + ' ' + num('btv' + i, e.st, '−', 2300) + '</div></div>';
    }
    h += '<div class="bt-line">' + KRCMAR + '<span>„' + esc(e.line) + '”</span></div>';
    return '<div class="bt' + (tv ? ' tv-bt' : '') + '" style="--el:' + Math.max(0, el - off) + 'ms" data-bk="bt' + B.id + 'x' + i + '" data-bv="' + i + '">' + h + '</div>';
  }
  function loyalHtml(d, tv) {
    const Y = d.ly; if (!Y) return '';
    const el = Math.max(0, d.dur - d.ms);
    const rows = Y.evs.map((e, i) => {
      const A = pById(d, e.a), Bp = pById(d, e.b);
      return '<div class="ly-pair" style="--i:' + i + '"><span class="bt-av">' + (A ? avSvg(A.a, 'happy') : '') + '</span><span class="ly-heart">❤️</span><span class="bt-av">' + (Bp ? avSvg(Bp.a, 'happy') : '') + '</span>' +
        '<div class="ly-tx"><b>' + esc(A ? A.n : '?') + ' & ' + esc(Bp ? Bp.n : '?') + '</b><span>Riznica ' + fmtN(e.tre) + ' + bonus ' + fmtN(e.bonus) + '</span><span class="ly-each">+' + fmtN(e.each) + ' svakome</span></div></div>';
    }).join('');
    return '<div class="bt ly' + (tv ? ' tv-bt' : '') + '" style="--el:' + el + 'ms"><div class="bt-t ly">❤️ ODANOST DO KRAJA</div><div class="bt-s">Tajni savezi preživjeli su do finala</div>' + rows +
      '<div class="bt-line">' + KRCMAR + '<span>„' + esc(['Izgleda da u ovoj krčmi još postoji čast!', 'Vjernost do kraja! Krčmar časti ovu rundu.', 'Neki savezi traju duže od krigle piva.'][Y.id % 3]) + '”</span></div></div>';
  }
  let btSoundKey = '';
  function betraySound(d) {
    const B = d.ph === 'betray' ? d.bt : d.ly; if (!B) return;
    const key = d.ph + B.id; if (btSoundKey === key) return; btSoundKey = key;
    const el = Math.max(0, d.dur - d.ms), at = (ms, n) => { if (ms - el >= -50) setTimeout(() => { if (btSoundKey === key) AUDIO.play(n); }, Math.max(0, ms - el)); };
    if (d.ph === 'loyal') { at(0, 'stingRise'); at(1400, 'score'); return; }
    B.evs.forEach((e, i) => { const o = B.evs.length > 1 ? i * 3000 : 0; if (e.k === 'double') { at(o, 'stingDuel'); at(o + 900, 'crack'); at(o + 1500, 'wrong'); } else { at(o, 'stingTension'); at(o + 850, 'boom'); at(o + 1500, 'score'); } });
  }
  // ===================== PIRAMIDA: prikaz =====================
  // početni raspored je izračunat na domaćinu; ovdje se samo otkriva: bodovi rastu od nule, završavaju redom (najmanje prvi), lik se zatim penje
  function fsEnd(d, p) {
    const order = d.P.slice().sort((a, b) => (a.fsc || 0) - (b.fsc || 0) || (a.n < b.n ? -1 : 1));
    return 1100 + order.findIndex((x) => x.id === p.id) * 650;
  }
  const fsLabel = (p) => (p.st ? p.st + '. stepenica' : 'podnožje') + (p.fr > 1 && p.fp ? ' · ' + p.fp + '/' + p.fr : '');
  function fsRows(d) {
    const el = Math.max(0, d.dur - d.ms);
    return '<div class="fs-rows" style="--el:' + el + 'ms">' + d.P.slice().sort((a, b) => (b.fsc || 0) - (a.fsc || 0) || (a.n < b.n ? -1 : 1)).map((p) => {
      const end = fsEnd(d, p);
      return '<div class="fs-row' + (p.id === PID ? ' me' : '') + '" style="--fe:' + end + 'ms"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span class="nm">' + esc(p.n) + '</span>' +
        '<span class="fs-sc" data-ck="fs' + esc(p.id) + '" data-cu="0" data-to="' + (p.fsc || 0) + '" data-cud="' + Math.round(150 - el) + '" data-cdur="' + (end - 150) + '">' + (p.fsc || 0) + '</span><span class="fs-go">→ ' + esc(fsLabel(p)) + '</span></div>';
    }).join('') + '</div>';
  }
  let fsSoundKey = '';
  function fstartSound(d) {
    if (fsSoundKey === d.s) return; fsSoundKey = d.s;
    const el = Math.max(0, d.dur - d.ms), ends = d.P.map((p) => fsEnd(d, p)), last = Math.max(...ends);
    for (let t = 200; t < last; t += 170) if (t > el) setTimeout(() => { if (fsSoundKey === d.s) AUDIO.play('tick'); }, t - el);
    ends.forEach((t) => { if (t > el) setTimeout(() => { if (fsSoundKey === d.s) AUDIO.play('step'); }, t - el); });
    if (last + 900 > el) setTimeout(() => { if (fsSoundKey === d.s) AUDIO.play('stingUp'); }, last + 900 - el);
  }
  // napredak za igrača: jasna jedna rečenica
  function progTxt(d, me) {
    if (me.st >= d.steps) return '👑 Kruna je tvoja!';
    if (me.top) return '👑 Na vrhu si! Točan odgovor na pitanje za krunu = pobjeda.';
    const need = (me.fr || 1) - (me.fp || 0);
    return 'Napredak ' + (me.fp || 0) + '/' + (me.fr || 1) + ' · još ' + need + (need === 1 ? ' točan' : ' točna') + ' do ' + ((me.st || 0) + 1 === d.steps - 1 ? 'vrha' : ((me.st || 0) + 1) + '. stepenice');
  }
  function progMeter(d, me) {
    const steps = d.steps - 1; let bars = '';
    for (let s = 1; s <= steps; s++) bars += '<i class="' + ((me.st || 0) >= s ? 'on' : (me.st || 0) + 1 === s && me.fp ? 'half' : '') + '" style="width:' + (40 + (steps - s) * 18) + 'px"></i>';
    return '<div class="step-meter" aria-label="Stepenica ' + (me.st || 0) + ' od ' + steps + '"><i class="crown' + (me.st >= d.steps ? ' on' : '') + '">👑</i>' + bars + '</div><div class="p-sub">' + esc(progTxt(d, me)) + '</div>';
  }
  // ===================== LEGENDE OVE KRČME: prikaz =====================
  // Pregled je osobni (svaki uređaj ga sam otvara i zatvara) i ne blokira domaćina; sadržaj dolazi gotov od domaćina (d.lg).
  const LEGV = { open: -1, done: -1, png: null, pngId: -1, busy: false, note: '' };
  const legP = (d, id) => d.P.find((p) => p.id === id);
  function legRank(d) {
    const ids = d.P.map((p) => p.id), rank = d.rank;
    if (Array.isArray(rank) && rank.length === ids.length && new Set(rank).size === ids.length && rank.every((id) => ids.includes(id))) {
      const byId = new Map(d.P.map((p) => [p.id, p]));
      return rank.map((id) => byId.get(id));
    }
    return d.P.slice().sort((a, b) => (b.id === d.win) - (a.id === d.win) || (d.th ? b.sc - a.sc : (b.st || 0) - (a.st || 0) || (b.fu || 0) - (a.fu || 0) || b.sc - a.sc));
  }
  const finalPosition = (d, p) => d.th ? fmtN(p.sc) + ' b' : (p.st || 0) >= d.steps ? 'Kruna' : 'step. ' + (p.st || 0) + '/' + (d.steps - 1);
  function legFig(d, id, pose) {
    const p = legP(d, id); if (!p) return '';
    return '<span class="lg-fig"><span class="mini">' + avSvg(p.a, pose || 'happy') + '</span>' + (p.b ? '<span class="lg-bot">BOT</span>' : '') + '</span>';
  }
  function legNames(d, who) { return who.map((id) => esc((legP(d, id) || {}).n || '?')).join(who.length === 2 ? ' i ' : ', '); }
  function legHtml(d, tv) {
    const L0 = d.lg, w = L0.w && legP(d, L0.w.pid);
    const instant = LEGV.done === L0.id ? ' lg-instant' : '';
    const crown = w ? '<div class="lg-card lg-crown" style="--i:0"><div class="lg-k"><span class="lg-ic">🏆</span>Kruna krčme</div>' +
      '<div class="lg-who">' + legFig(d, w.id, 'victory') + '<span class="lg-nm">' + esc(w.n) + '</span></div><div class="lg-line">' + esc(L0.w.line) + '</div>' + (L0.w.num ? '<div class="lg-num">' + esc(L0.w.num) + '</div>' : '') + '</div>' : '';
    const cards = L0.aw.map((x, i) => '<div class="lg-card lg-' + esc(x.k) + '" style="--i:' + (i + 1) + '"><div class="lg-k"><span class="lg-ic">' + esc(x.ic) + '</span>' + esc(x.t) + '</div>' +
      '<div class="lg-who">' + x.who.map((id) => legFig(d, id, x.k === 'vic' ? 'sad' : x.k === 'rv' || x.k === 'dbl' ? 'attack' : 'happy')).join('') + '<span class="lg-nm">' + legNames(d, x.who) + '</span></div>' +
      '<div class="lg-line">' + esc(x.line) + '</div>' + (x.num ? '<div class="lg-num">' + esc(x.num) + '</div>' : '') + '</div>').join('');
    const share = '<button class="btn win-cta" id="legSave"' + (LEGV.busy ? ' disabled' : '') + '>📸 Spremi legendu</button>';
    return '<div class="lg-wrap' + (tv ? ' tv-lg' : '') + instant + '" id="legWrap"><div class="lg-sticky"><button class="btn ghost" id="legClose">Natrag na poredak</button></div><div class="lg-book" id="legBook">' +
      '<div class="lg-head"><div class="lg-t">📜 Legende ove krčme</div><div class="lg-sub">Počasna priznanja ne donose dodatne bodove.</div></div>' +
      '<div class="lg-story">' + esc(L0.story || '') + '</div>' +
      '<div class="lg-list">' + crown + cards + '</div>' +
      '<div class="lg-act">' + share + '<div class="lg-note" role="status">' + esc(LEGV.note) + '</div></div>' +
      '</div></div>';
  }
  function legRerender() { if (!S) return; if (phoneShown()) phoneRender(false); else tvV(S); }
  function bindLeg(d) {
    if (!d || d.ph !== 'final' || !d.lg) return;
    bind('legOpen', () => { AUDIO.play('whoosh'); LEGV.open = d.lg.id; LEGV.note = ''; legRerender(); legPrep(d); });
    bind('legClose', () => { AUDIO.play('tap'); LEGV.open = -1; LEGV.done = d.lg.id; legRerender(); });
    // dodir na knjigu: odmah prikaži sve (bez čekanja animacija)
    const bk = document.getElementById('legBook');
    if (bk) bk.addEventListener('click', (e) => { if (e.target.closest('button')) return; const wr = document.getElementById('legWrap'); if (wr && !wr.classList.contains('lg-instant')) { wr.classList.add('lg-instant'); LEGV.done = d.lg.id; } });
    if (LEGV.open === d.lg.id) setTimeout(() => { LEGV.done = d.lg.id; }, 2200);
    bind('legSave', () => legSave(d));
  }

  // ---------- kartica za dijeljenje (9:16, crta se lokalno na canvasu, samo javni podaci) ----------
  const legImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  function legWrap(c, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(/\s+/); let line = '', n = 0;
    for (let i = 0; i < words.length; i++) {
      const t = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(t).width > maxW && line) {
        if (maxLines && n === maxLines - 1) { while (c.measureText(line + '…').width > maxW && line) line = line.slice(0, -1); c.fillText(line + '…', x, y + n * lh); return n + 1; }
        c.fillText(line, x, y + n * lh); n++; line = words[i];
      } else line = t;
    }
    if (line) { c.fillText(line, x, y + n * lh); n++; }
    return n;
  }
  function legPanel(c, x, y, w, h, gold) {
    const r = 28;
    c.save(); c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h);
    c.fillStyle = 'rgba(42, 23, 11, 0.9)'; c.fill();
    c.lineWidth = gold ? 6 : 4; c.strokeStyle = gold ? 'rgba(255, 204, 110, 0.95)' : 'rgba(176, 122, 58, 0.9)'; c.stroke();
    c.beginPath(); c.roundRect ? c.roundRect(x + 10, y + 10, w - 20, h - 20, r - 8) : c.rect(x + 10, y + 10, w - 20, h - 20);
    c.lineWidth = 2; c.strokeStyle = 'rgba(232, 170, 80, 0.45)'; c.stroke(); c.restore();
  }
  async function legCard(d) {
    const L0 = d.lg, W = 1080, H = 1920;
    try { if (document.fonts) { await Promise.race([Promise.all([document.fonts.load('80px "Titan One"'), document.fonts.load('900 40px Nunito'), document.fonts.ready]), new Promise((r) => setTimeout(r, 1500))]); } } catch (e) {}
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const DISP = '"Titan One", "Fredoka", "Trebuchet MS", sans-serif', BODY = 'Nunito, system-ui, sans-serif';
    const spr = (p, pose) => p && AV[p.a] && AV[p.a].spr ? 'chars/' + AV[p.a].spr + '/' + pose + '.webp' : null;
    const rank = legRank(d), w = L0.w && legP(d, L0.w.pid);
    const aws = L0.aw.slice(0, 3);
    const srcs = ['ui/bg-p.webp', spr(w, 'victory')].concat(rank.slice(0, 6).map((p) => spr(p, 'idle')), aws.map((x) => spr(legP(d, x.who[0]), 'happy')));
    const imgs = await Promise.all(srcs.map((s) => (s ? legImg(s) : Promise.resolve(null))));
    // pozadina krčme + topli sloj
    c.fillStyle = '#2a170b'; c.fillRect(0, 0, W, H);
    const bg = imgs[0];
    if (bg) { const k = Math.max(W / bg.width, H / bg.height), bw = bg.width * k, bh = bg.height * k; c.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh); }
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(20, 10, 4, 0.55)'); gr.addColorStop(0.5, 'rgba(20, 10, 4, 0.35)'); gr.addColorStop(1, 'rgba(20, 10, 4, 0.75)');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    // naslov
    c.fillStyle = '#ffe2a6'; c.font = '900 40px ' + BODY; c.fillText('🍻 TRIVIA TAVERN', W / 2, 110);
    c.font = '84px ' + DISP; c.lineWidth = 10; c.strokeStyle = 'rgba(70, 36, 10, 0.95)'; c.strokeText('LEGENDE VEČERI', W / 2, 205);
    c.fillStyle = '#ffcf6e'; c.fillText('LEGENDE VEČERI', W / 2, 205);
    // pobjednik
    let y = 250;
    legPanel(c, 70, y, W - 140, 430, true);
    if (imgs[1]) { const s = 300; c.drawImage(imgs[1], W / 2 - s / 2, y + 20, s, s); }
    c.fillStyle = '#ffe2a0'; c.font = '64px ' + DISP; c.fillText('👑 ' + (w ? w.n : ''), W / 2, y + 372);
    c.fillStyle = '#f6ead0'; c.font = '800 34px ' + BODY; legWrap(c, L0.w ? L0.w.line : '', W / 2, y + 412, W - 220, 40, 1);
    // konačni poredak
    y += 460;
    const rows = rank.slice(0, 6), rh = 64;
    legPanel(c, 70, y, W - 140, 40 + rows.length * rh, false);
    rows.forEach((p, i) => {
      const ry = y + 26 + i * rh;
      c.textAlign = 'left'; c.fillStyle = i === 0 ? '#ffcf6e' : '#e2b764'; c.font = '900 36px ' + BODY; c.fillText((i + 1) + '.', 110, ry + 44);
      const im = imgs[2 + i]; if (im) c.drawImage(im, 170, ry + 2, 56, 56);
      c.fillStyle = '#f6ead0'; c.font = '800 36px ' + BODY; legWrap(c, p.n + (p.b ? ' (bot)' : ''), 245, ry + 44, 520, 40, 1);
      c.textAlign = 'right'; c.fillStyle = '#ffe2a6'; c.font = '900 36px ' + BODY; c.fillText(finalPosition(d, p), W - 110, ry + 44);
    });
    c.textAlign = 'center';
    y += 40 + rows.length * rh + 30;
    // 2–3 najvažnija događaja
    const ah = 150;
    aws.forEach((x, i) => {
      const ay = y + i * (ah + 18);
      if (ay + ah > H - 260) return;
      legPanel(c, 70, ay, W - 140, ah, false);
      const im = imgs[2 + rows.length + i]; if (im) c.drawImage(im, 100, ay + 20, 110, 110);
      c.textAlign = 'left'; c.fillStyle = '#ffcf6e'; c.font = '44px ' + DISP; legWrap(c, x.ic + ' ' + x.t, 235, ay + 62, W - 360, 46, 1);
      c.fillStyle = '#f6ead0'; c.font = '800 32px ' + BODY; legWrap(c, x.who.map((id) => (legP(d, id) || {}).n || '?').join(' i ') + ' — ' + x.line, 235, ay + 108, W - 360, 36, 1);
      c.textAlign = 'center';
    });
    // završna poruka (kraj priče)
    const end = (((L0.story || '').match(/[^.!?]+[.!?]+/g) || []).pop() || '').trim();
    c.fillStyle = '#ffe2a6'; c.font = 'italic 800 36px ' + BODY; legWrap(c, end, W / 2, H - 170, W - 200, 44, 2);
    c.fillStyle = 'rgba(246, 234, 208, 0.7)'; c.font = '900 28px ' + BODY; c.fillText('Trivia Tavern · krčma koja pamti', W / 2, H - 70);
    return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
  }
  // pripremi sliku čim se legende otvore (dijeljenje mora krenuti odmah na dodir)
  function legPrep(d) {
    if (LEGV.pngId === d.lg.id && LEGV.png) return Promise.resolve(LEGV.png);
    const id = d.lg.id;
    return legCard(d).then((b) => { if (b && id === (S && S.lg && S.lg.id)) { LEGV.png = b; LEGV.pngId = id; } return b; }).catch(() => null);
  }
  async function legSave(d) {
    if (LEGV.busy) return;
    AUDIO.play('tap');
    const setNote = (t) => { LEGV.note = t; const n = document.querySelector('.lg-note'); if (n) n.textContent = t; };
    try {
      let blob = LEGV.pngId === d.lg.id ? LEGV.png : null;
      if (!blob) { LEGV.busy = true; setNote('Pripremam sliku…'); blob = await legPrep(d); LEGV.busy = false; }
      if (!blob) { setNote('Slika se nije mogla napraviti. Pokušaj ponovno.'); return; }
      const file = typeof File === 'function' ? new File([blob], 'trivia-tavern-legende.png', { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Trivia Tavern — Legende večeri' }); setNote('Legenda je podijeljena! 🍻'); return; }
        catch (e) { if (e && e.name === 'AbortError') { setNote(''); return; } }
      }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'trivia-tavern-legende.png'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNote('Slika je spremljena (trivia-tavern-legende.png).');
    } catch (e) { LEGV.busy = false; setNote('Spremanje nije uspjelo. Pokušaj ponovno.'); }
  }
  const CONT = { 't:vote>t:voteResult': 1, 'p:vote>p:voteResult': 1 };
  // ---------- KEEP: isti ekran iscrtan ponovno -> animacije se nastavljaju gdje su stale ----------
  // (bez ovoga svako osvježavanje unutar iste faze ponovno pokrene ulazne animacije pa elementi "zatitraju")
  const KEEP = (() => {
    let saved = null, t0 = 0;
    const IDS = ['bk', 'v', 'c', 't', 'p', 'av', 'pk', 'bet', 'k'];
    function idOf(e) {
      let s = e.id ? '#' + e.id : '';
      if (e.getAttribute && e.getAttribute('title')) s += '[t=' + e.getAttribute('title') + ']';
      for (const k of IDS) if (e.dataset && e.dataset[k] !== undefined) s += '[' + k + '=' + e.dataset[k] + ']';
      return s;
    }
    function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }
    function keyOf(e) {
      const own = idOf(e);
      let k = e.tagName + '.' + (e.classList[0] || '') + own + (own ? '' : ':' + hash(e.innerHTML));
      for (let p = e.parentElement; p && p !== $app; p = p.parentElement) k = (p.tagName + '.' + (p.classList[0] || '') + idOf(p)) + '>' + k;
      return k;
    }
    function list() {
      const out = [], seen = new Map();
      let anims = [];
      try { anims = $app.getAnimations({ subtree: true }); } catch (e) { return out; }
      for (const a of anims) {
        const el = a.effect && a.effect.target;
        if (!el || !a.animationName || !el.isConnected) continue;
        let k = keyOf(el) + '|' + a.animationName;
        const n = seen.get(k) || 0; seen.set(k, n + 1); k += '#' + n;
        out.push([k, a]);
      }
      return out;
    }
    function grab(fresh) {
      saved = null;
      if (fresh || reduceMotion || !$app.firstElementChild) return;
      saved = new Map();
      t0 = performance.now();
      for (const [k, a] of list()) {
        const ct = a.currentTime;
        if (ct === null) continue;
        saved.set(k, { ct, fin: a.playState === 'finished', dl: a.effect && a.effect.getTiming ? +a.effect.getTiming().delay || 0 : 0 });
      }
    }
    function put() {
      if (!saved || !saved.size) { saved = null; return; }
      const dt = performance.now() - t0;
      for (const [k, a] of list()) {
        const o = saved.get(k); if (!o) continue;
        try {
          if (o.fin) a.finish();
          else {
            const dn = a.effect && a.effect.getTiming ? +a.effect.getTiming().delay || 0 : 0, pg = o.ct - o.dl;
            if (dn === o.dl) a.currentTime = o.ct + dt;
            else if (pg >= 0) a.currentTime = dn + pg + dt;   // već pokrenuta: isti napredak
            // još u odgodi: nova odgoda (iz --pel) već uključuje proteklo vrijeme, ništa se ne mijenja
          }
        } catch (e) {}
      }
      saved = null;
    }
    return { grab, put };
  })();
  const SCENE = (() => {
    let ph0 = null, t0 = 0, tIn = -1e9, cls0 = '';
    function swap(html, fresh, ph) {
      const now = performance.now();
      const cont = fresh && ph0 !== null && !!CONT[ph0 + '>' + ph];
      const changed = !cont && fresh && ph0 !== null && ph !== ph0 && !!$app.firstElementChild;
      if (fresh) t0 = now;
      if (changed) {
        const r = $app.getBoundingClientRect();
        const g = document.createElement('div');
        g.className = cls0.replace(/\b(fresh|scene-in)\b/g, '') + ' scene-ghost';
        g.setAttribute('aria-hidden', 'true');
        g.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;box-sizing:border-box;z-index:5;pointer-events:none;overflow:hidden';
        while ($app.firstChild) g.appendChild($app.firstChild);
        g.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
        // traka na vrhu (HUD, demo) ostaje mirna: ne blijedi ako postoji i u novoj sceni
        ['demo-bar', 'p-top'].forEach((c) => { if (html.indexOf('class="' + c) >= 0) g.querySelectorAll(':scope > .' + c).forEach((e) => { e.style.visibility = 'hidden'; }); });
        document.body.appendChild(g);
        setTimeout(() => g.remove(), 260);
        tIn = now;
      }
      $app.innerHTML = html;
      if (cont) $app.classList.remove('fresh');
      $app.style.setProperty('--pel', Math.round(now - t0) + 'ms');
      if (now - tIn < 300) $app.classList.add('scene-in');
      ph0 = ph; cls0 = $app.className;
      PRELOAD.on(ph);
    }
    function reset() { ph0 = null; }
    return { swap, reset };
  })();

  // ---------- TV ----------
  function tvTop(d, label) {
    const ring = INPUT_PHASES[d.ph]
      ? '<span class="ring" id="tring"><svg viewBox="0 0 100 100"><circle class="rbg" cx="50" cy="50" r="42"/><circle class="rfg" id="tarc" cx="50" cy="50" r="42" stroke-dasharray="263.9" stroke-dashoffset="' + (clockDur ? (263.9 * (1 - timerNow().fr)).toFixed(1) : 0) + '"/></svg><b id="tnum">' + (clockDur ? Math.ceil(timerNow().ms / 1000) : '') + '</b></span>'
      : '<span class="ring empty"></span>';
    return '<div class="tv-top"><span class="rl">' + esc(hudRound(d.rl, d.nr)) + '</span><span class="tv-sub" style="flex:1">' + (label || '') + '</span>' + ring + '</div>';
  }
  function tvV(d) {
    { const sb = document.getElementById('sfbox'); if (sb && sb.__h) { sb.innerHTML = ''; sb.__h = ''; } }
    clockEnds = Date.now() + d.ms; clockDur = d.dur;
    if (d.ph === 'cast' && d.s === tvStep && document.getElementById('castStage')) return;
    const fresh = d.s !== tvStep;
    if (fresh) { tvStep = d.s; lastTickSec = -1; tvSound(d); }
    $app.className = 'screen tv' + (fresh ? ' fresh' : '');
    let h = '';
    const demoBar = mode === 'demo' && /demotv/.test(location.search) ? '<div class="demo-bar"><button class="btn ghost" id="toPhone">Mobitel</button></div>' : '';
    switch (d.ph) {
      case 'lobby': return tvLobby(d, demoBar);
      case 'intro':
        h = annHtml(d);
        break;
      case 'vote': case 'voteResult': {
        const counts = d.cats.map((_, i) => d.P.filter((p) => p.vt === i).length);
        const max = Math.max(0, ...counts);
        const rl = roulette(d), ppBy = d.P.find((p) => p.pk);
        if (ppBy && window.__ppS !== d.s) { window.__ppS = d.s; AUDIO.play('pick'); }
        const doors = d.cats.map((c, i) => {
          const voters = voterFaces(d.P.filter((p) => p.vt === i), 5);
          const cls = d.ph === 'voteResult' ? (i === d.cw ? ' win' : ' lose') : (max > 0 && counts[i] === max ? ' lead' : '');
          const ppT = ppBy && ppBy.vt === i ? '<span class="pp-tag"><span class="pp-av">' + avSvg(ppBy.a, 'happy') + '</span><span class="pp-tx">' + esc(ppBy.n) + ' ⭐<span class="pp-lb"> power pick</span></span></span>' : '';
          return '<div class="door o' + i + cls + (ppT ? ' pp-on' : '') + '"' + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + '>' + (rl ? rl.spot(i) : '') + ppT + '<span class="vcount' + (counts[i] ? '' : ' zero') + '" data-bk="vc' + i + '">' + counts[i] + '</span><div class="dn"><span>' + esc(c) + '</span></div><div class="voters">' + voters + '</div><span class="knob"></span></div>';
        }).join('');
        const voted = d.P.filter((p) => p.vt !== undefined).length;
        const label = d.ph === 'vote' ? 'Glasajte za kategoriju! Glasalo ' + voted + ' od ' + d.P.filter((p) => p.c).length
          : rl ? '<span class="rl-pre" style="--rd:' + rl.R + 'ms">Neriješeno! Ždrijeb bira kategoriju…</span><span class="rl-post" style="--rd:' + rl.R + 'ms">Kategorija: ' + esc(d.cats[d.cw]) + '</span>' : 'Kategorija: ' + esc(d.cats[d.cw]);
        h = (rl ? '<style>' + rl.css + '</style>' : '') + tvTop(d, label) + (d.ph === 'vote' ? timerHtml() : '<div class="timer spent" aria-hidden="true"><div></div></div>') +
          '<div class="tv-mid"><div class="doors">' + doors + '</div>' +
          (d.ph === 'voteResult' && d.tie ? '<div class="tie-note' + (rl ? ' rl-post' : '') + '"' + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + '>' + (voted ? 'Neriješeno! Kategoriju je odabrao ždrijeb.' : 'Nitko nije glasao, kategoriju je odabrao ždrijeb.') + '</div>' : '') +
          '</div>' + lineup(d, { check: d.ph === 'vote' });
        break;
      }
      case 'moment': h = tvTop(d, 'Krčma pamti') + momentHtml(d, d.mo); break;
      case 'betray': h = tvTop(d, 'Krčma je vidjela sve') + betrayHtml(d, true) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'loyal': h = tvTop(d, 'Prije finala') + loyalHtml(d, true) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'deal': h = tvTop(d, 'Vrijeme za dogovore') + dealTv(d); break;
      case 'howto': h = tvTop(d, 'Kako se igra') + howtoHtml(d) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'order': h = tvTop(d, 'Poredajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">' + esc(d.or.t) + '</div><div class="mg-s">od <b>' + esc(d.or.lo) + '</b> do <b>' + esc(d.or.hi) + '</b></div><div class="chips">' + d.or.it.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div></div></div>' + lineup(d, { check: true }); break;
      case 'orderReveal': h = tvTop(d, 'Točan poredak') + '<div class="tv-mid"><div class="mg"><div class="mg-t">' + esc(d.or.t) + '</div>' + orderSolution(d) + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'hilo': h = tvTop(d, 'Igrajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Više ili manje</div><div class="mg-s">Prva greška prekida niz. Tko će imati najdulji niz?</div></div></div>' + lineup(d, { check: true }); break;
      case 'hiloReveal': h = tvTop(d, 'Rezultati') + '<div class="tv-mid"><div class="mg"><div class="mg-t">Više ili manje</div><div class="mg-list">' + d.hl.list.slice(0, 4).map((x) => '<div class="mg-q">' + esc(x.q) + ' <b>' + esc(x.a[x.w]) + '</b>' + (x.v ? ' (' + esc(x.v[x.w]) + ')' : '') + '</div>').join('') + '</div>' + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'blitz': h = tvTop(d, 'Igrajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Munjeviti krug</div><div class="mg-s">Točno ili netočno – što brže! Točno +100, netočno −50.</div></div></div>' + lineup(d, { check: true }); break;
      case 'blitzReveal': h = tvTop(d, 'Rezultati') + '<div class="tv-mid"><div class="mg"><div class="mg-t">Munjeviti krug</div>' + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'maj': h = tvTop(d, 'Glasajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Što misli većina?</div><div class="mg-q">' + esc(d.mj.q.q) + '</div><div class="mg-list">' + d.mj.q.o.map((o, i) => '<div class="mg-btn"><span class="n">' + String.fromCharCode(65 + i) + '</span>' + esc(o) + '</div>').join('') + '</div></div></div>' + lineup(d, { check: true }); break;
      case 'majReveal': h = tvTop(d, 'Što misli većina?') + '<div class="tv-mid"><div class="mg"><div class="mg-q">' + esc(d.mj.q.q) + '</div>' + majBars(d, -1) + (d.mj.last ? tdLine(d) : '') + '</div></div>' + lineup(d, d.mj.last ? { gain: true } : {}) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'uljez': h = tvTop(d, 'Birajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Uljez u krčmi</div><div class="mg-s">Jedna osoba ne zna temu. Svi biraju dva pojma koji najbolje paše uz temu.</div><div class="ul-grid">' + d.ul.t.map((w) => '<div class="ul-t">' + esc(w) + '</div>').join('') + '</div></div></div>' + lineup(d, { check: true }); break;
      case 'uljezVote': h = tvTop(d, 'Glasajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Tko je uljez?</div>' + ulRows(d, false) + '</div></div>' + lineup(d, { check: true }); break;
      case 'uljezReveal': h = tvTop(d, 'Uljez u krčmi') + '<div class="tv-mid"><div class="mg">' + ulReveal(d) + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'duelIntro': h = tvTop(d, 'Dvoboj') + momentHtml(d, duelIntroMo(d)); break;
      case 'duel':
        h = tvTop(d, 'Dvoboj') + timerHtml() + '<div class="tv-mid">' + duelVs(d) + '<div class="q-text">' + esc(d.q.t) + '</div><div class="opts">' +
          d.q.o.map((o, i) => '<div class="opt o' + i + '"><span class="shape">' + SHAPES[i] + '</span><span class="txt">' + esc(o) + '</span></div>').join('') + '</div></div>';
        break;
      case 'rope': h = tvTop(d, 'Izazov vođi') + timerHtml() + ropeTv(d); break;
      case 'duelResult': h = tvTop(d, 'Dvoboj') + '<div class="tv-mid">' + (d.du && d.du.rope ? ropeResult(d) : duelResultHtml(d, true)) + '</div>'; break;
      case 'secret': case 'secret2': h = tvTop(d, 'Pst…') + secretWait(d); break;
      case 'bet':
        h = tvTop(d, 'Kladionica je otvorena!') + timerHtml() + '<div class="tv-mid bet-mid"><div class="bet-t">Kladionica</div><div class="bet-sub">' + (d.cats && d.cw >= 0 ? 'Kategorija: <b>' + esc(d.cats[d.cw]) + '</b> · ' : '') + 'odaberite ulog na mobitelu</div><div class="bet-sub">Točan odgovor na sljedeće pitanje osvaja ulog, netočan ga gubi.</div></div>' + lineup(d, { check: true });
        break;
      case 'cast':
        h = tvTop(d, 'Bacanje moći!') + '<div class="tv-mid cast-mid">' + castHtml(d) + '</div>';
        break;
      case 'power': {
        const legend = Object.keys(POWERS).filter((k) => !(d.fin && (k === 'pola' || k === 'grick')) && !((d.fin || d.th) && k === 'utjeha')).map((k) => '<div class="pw-mini ' + (POWERS[k].atk ? 'atk' : 'buff') + '"><span class="pw-ico">' + ICON[k] + '</span><div><b>' + POWERS[k].n + '</b><span>' + pwDesc(k, d) + '</span></div></div>').join('');
        if (d.fin) {
          h = tvTop(d, 'Finale · odaberite moć na mobitelu') + timerHtml() +
            '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="tv-title">Moći prije pitanja!</div><div class="powers-legend">' + legend + '</div>' + lineup(d, { check: true }) + '</div>' + pyramidHtml(d, false) + '</div>';
          break;
        }
        h = tvTop(d, 'Odaberite moć na mobitelu') + timerHtml() +
          '<div class="tv-mid"><div class="tv-title">Vrijeme je za moći!</div><div class="powers-legend">' + legend + '</div></div>' + lineup(d, { check: true });
        break;
      }
      case 'question': case 'reveal': {
        const rev = d.ph === 'reveal';
        const opts = d.q.o.map((o, i) => '<div class="opt o' + i + (rev ? (i === d.cor ? ' correct' : ' dim') : '') + '"><span class="shape">' + SHAPES[i] + '</span><span class="txt">' + esc(o) + '</span>' + (rev && d.cnt ? '<span class="cnt">' + d.cnt[i] + '</span>' : '') + '</div>').join('');
        if (rev) {
          const el = Math.max(0, d.dur - d.ms), b = revBoard(d, el);
          h = '<style>' + wheel(d).css + '</style>' + tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + '<div class="tv-mid"><div class="rv wheel" style="--el:' + el + 'ms;--rvo:' + whT(d).end + 'ms;--rvw:' + whT(d).walk + 'ms">' +
            '<div class="rv-a">' + qTextHtml(d, true) + revOpts(d, -1, true) + '</div>' +
            '<div class="rv-b"><div class="rv-title">Poredak</div>' + b.html + (d.pj ? '<div class="pj-cap">🏆 Utrka prema piramidi · 🪜 projekcija prema trenutačnim bodovima</div>' : '') + rcCard(d) + tkCard(d) + (d.mo ? tdLine(d) : !d.rcr && !d.tkr && b.lead ? '<div class="rv-lead">Novo vodstvo: ' + esc(b.lead.n) + '!</div>' : '') + krTv(d) + '</div></div></div>';
          h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
          break;
        }
        h = tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + timerHtml() +
          '<div class="tv-mid">' + qTextHtml(d, true) + '<div class="opts">' + opts + '</div>' + evHtml(d) + '</div>' +
          lineup(d, { check: true, fx: true });
        if (rev) h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
        break;
      }
      case 'sort': case 'sortReveal': {
        const rev = d.ph === 'sortReveal';
        const col = (side) => d.so.it.map((x, i) => (rev ? (d.so.key[i] === side ? '<span class="chip">' + esc(x) + '</span>' : '') : '')).join('');
        h = tvTop(d, rev ? 'Rješenje' : 'Razvrstajte pojmove na mobitelu!') + (rev ? '' : timerHtml()) +
          '<div class="tv-mid"><div class="tv-title">Izazov: razvrstavanje</div><div class="sort-cols">' +
          '<div class="sort-col a"><h3>' + esc(d.so.a) + '</h3><div class="chips">' + col(0) + '</div></div>' +
          '<div class="sort-col b"><h3>' + esc(d.so.b) + '</h3><div class="chips">' + col(1) + '</div></div></div>' +
          (rev ? '' : '<div class="chips">' + d.so.it.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>') + '</div>' +
          lineup(d, rev ? { gain: true } : { check: true }) + (rev ? tdLine(d) : '');
        if (rev) h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
        break;
      }
      case 'link': case 'linkReveal': {
        const rev = d.ph === 'linkReveal';
        const pairs = d.li.L.map((l, i) => '<div class="pair"><span>' + esc(l) + '</span><span class="arrow">→</span><span>' + (rev ? esc(d.li.R[d.li.key[i]]) : '?') + '</span></div>').join('');
        h = tvTop(d, rev ? 'Rješenje' : 'Spojite parove na mobitelu!') + (rev ? '' : timerHtml()) +
          '<div class="tv-mid"><div class="tv-title">Izazov: ' + esc(d.li.t) + '</div><div class="pairs card">' + pairs + '</div>' +
          (rev ? '' : '<div class="chips">' + d.li.R.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div>') + '</div>' +
          lineup(d, rev ? { gain: true } : { check: true }) + (rev ? tdLine(d) : '');
        if (rev) h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
        break;
      }
      case 'tstart': h = tvTop(d, 'Svi bodovi ostaju · pobjeđuje najbogatiji') + '<div class="tv-mid" style="justify-content:center"><div class="tv-title">Krčmarovo prijestolje</div>' + throneHtml(d) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div></div>'; break;
      case 'trisk': h = tvTop(d, 'Tajni ulog prije zadnjeg pitanja') + riskTv(d); break;
      case 'fstart': {
        h = tvTop(d, 'Bodovi iz kviza određuju početak') +
          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="tv-title">Tko kreće odakle?</div>' + fsRows(d) +
          '<div class="tie-note">Start: poredak + razlika u bodovima (najviše 4 koraka napretka). Gore je teže: od 4. stepenice svaka traži 2 točna. Na vrhu čeka pitanje za krunu.</div>' +
          '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div></div>' + pyramidHtml(d, false) + '</div>';
        break;
      }
      case 'fq': case 'fr': {
        const rev = d.ph === 'fr';
        const cr = !!d.crown;
        const tf = d.q.o.map((o, i) => '<div class="opt o' + (cr ? i : i === 0 ? 3 : 0) + (rev ? (i === d.cor ? ' correct' : ' dim') : '') + '"' + (cr ? '' : ' style="justify-content:center"') + '>' + (cr ? '<span class="shape">' + SHAPES[i] + '</span>' : '') + '<span class="txt"' + (cr ? '' : ' style="text-align:center"') + '>' + esc(o) + '</span></div>').join('');
        const tops = d.P.filter((p) => p.top).map((p) => p.n);
        h = tvTop(d, cr ? '👑 Pitanje za krunu! ' + esc(tops.join(' i ')) + (tops.length > 1 ? ' — točan i brži pobjeđuje' : ' — točan odgovor = pobjeda') : 'Točno ili netočno? Točan = napredak, najbrži +1, svaki 3. zaredom +1') + (rev ? '' : timerHtml(3000)) +
          '<div class="finale-q' + (cr ? ' crownq' : '') + '"><div class="tv-mid" style="justify-content:center">' + (cr ? '<div class="crown-k">' + esc(d.q.c) + '</div>' : '') + '<div class="q-text">' + esc(d.q.t) + '</div><div class="' + (cr ? 'opts' : 'tf-row') + '">' + tf + '</div>' + (rev ? tdLine(d) : evHtml(d)) + '</div>' +
          pyramidHtml(d, rev, { delay: 1000 }) + '</div>';
        break;
      }
      case 'final':
        h = winHtml(d, true);
        break;
    }
    KEEP.grab(fresh);
    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);
    fitScreen();
    lobbyFeedback(d);
    pactToasts(d);
    MOTION.after('t:' + d.ph + ':' + d.s);
    KEEP.put();
    if (d.ph === 'cast') CAST.start(document.getElementById('castStage'), d, true);
    bind('skip', () => game.skip());
    bind('again', () => { game.restart(); });
    bindLeg(d);
    bind('quit', reset);
    bind('toPhone', () => { demoView = 'phone'; lastSig = ''; render(); });
    tick();
  }

  function pyramidHtml(d, rev, o) {
    o = o || {};
    const el = Math.max(0, d.dur - d.ms), base = o.delay || 0, intro = d.ph === 'fstart';
    // napredak unutar stepenice (isti izračun kao na domaćinu, iz javnog d.req)
    const req = d.req || [];
    const so = (u) => { let st = 0, acc = 0; while (st < req.length && acc + req[st] <= u) { acc += req[st]; st++; } return { s: st, p: u - acc, r: st < req.length ? req[st] : 0 }; };
    const BN = { f: '⚡', d: '✖2', s: '🔥' };
    let rows = '', idx = 0;
    for (let s = d.steps; s >= 0; s--) {
      const w = s === 0 ? 100 : 100 - (s - 1) * (59 / Math.max(1, d.steps - 1));
      const here = d.P.filter((p) => (p.st || 0) === s).map((p) => {
        // uvod: svi kreću iz podnožja i penju se stepenicu po stepenicu kad im završi brojanje bodova
        const mv = intro ? (p.st || 0) : (p.mv || 0), go = (rev || intro) && mv > 0;
        // ishod pitanja piramide: uspon, djelomičan napredak, kruna izmiče, netočno
        const ok = rev && p.ch === d.cor, ug = rev ? (p.ug || 0) : 0;
        const kind = !rev || intro ? '' : p.st >= d.steps && mv ? 'win' : d.crown && p.top && !mv ? 'cmiss' : ok && ug > 0 && mv > 0 ? 'lvl' : ok && ug > 0 ? 'part' : 'miss';
        const cd = intro ? fsEnd(d, p) : rev ? base + (idx++) * 90 : 0;
        const mood = intro ? (el > fsEnd(d, p) + 300 && p.st ? 'happy' : 'idle') : rev ? (kind === 'win' ? 'victory' : kind === 'lvl' || kind === 'part' ? 'happy' : 'sad') : p.top ? 'victory' : '';
        const bn = rev && p.fb ? '<span class="bn">' + p.fb.split('').map((c) => BN[c] || '').join('') + '</span>' : '';
        const badge = !kind ? '' : kind === 'win' ? '<span class="pb pb-win">👑</span>' : kind === 'lvl' ? '<span class="pb pb-lvl">+' + ug + '<i>⬆</i>' + bn + '</span>'
          : kind === 'part' ? '<span class="pb pb-part">+' + ug + bn + '</span>' : kind === 'cmiss' ? '<span class="pb pb-cmiss">👑✗</span>' : '<span class="pb pb-miss">✗</span>';
        // traka napretka do sljedeće stepenice (puni se nakon točnog odgovora)
        const cur = so(p.fu || 0);
        let bar = '';
        if (!intro && !p.top && p.st < d.steps && cur.r > 1 && (cur.p > 0 || kind === 'part')) {
          const from = kind === 'part' ? Math.max(0, cur.p - ug) : kind === 'lvl' ? 0 : cur.p;
          bar = '<span class="pbar' + (kind === 'part' || (kind === 'lvl' && cur.p) ? ' fill' : '') + '" style="--a:' + (from / cur.r).toFixed(3) + ';--b:' + (cur.p / cur.r).toFixed(3) + '"><i></i><b>' + cur.p + '/' + cur.r + '</b></span>';
        }
        const cls = 'climber' + (go ? ' go' + (intro ? ' walk' : mv > 1 ? ' multi m' + Math.min(mv, 8) : '') : '') + (kind ? ' k-' + kind : '') + (p.top ? ' ontop' : '') + (p.id === PID ? ' me' : '');
        return '<span class="' + cls + '" style="--mv:' + (mv || 0) + ';--cd:' + cd + 'ms;--el:' + (rev || intro ? el : 0) + 'ms">' +
          badge + (o.you && p.id === PID && !kind ? '<span class="tag-you">Ti</span>' : '') +
          avSvg(p.a, mood) + bar + '<span class="cn">' + esc(p.n) + '</span></span>';
      }).join('');
      rows += '<div class="pstep' + (s === 0 ? ' base' : '') + (s === d.steps ? ' top crown' : '') + (s === d.steps - 1 ? ' summit' : '') + '" style="width:' + w.toFixed(1) + '%"><span class="lv">' + (s === d.steps ? '👑' : s) + '</span><span class="here">' + here + '</span></div>';
    }
    return '<div class="pyramid' + (intro ? ' intro' : '') + (rev && !intro ? ' res' : '') + '">' + rows + '</div>';
  }

  let lastLobbyFeedback = null;
  function feedbackPulse(el, entering) {
    if (!el || !el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(entering ? [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }] :
      [{ filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }], { duration: entering ? 230 : 260, easing: 'ease-out' });
  }
  function lobbyFeedback(d) {
    if (!d || d.ph !== 'lobby') { lastLobbyFeedback = null; return; }
    const next = { key: d.code + ':' + mode, ids: new Set(d.P.map(p => p.id)), bots: d.P.filter(p => p.b).length, len: d.len || (d.opt && d.opt.len) };
    const prev = lastLobbyFeedback; lastLobbyFeedback = next;
    if (!prev || prev.key !== next.key) return;
    $app.querySelectorAll('[data-player-id]').forEach(el => { if (!prev.ids.has(el.dataset.playerId)) feedbackPulse(el, true); });
    if (prev.bots !== next.bots) feedbackPulse($app.querySelector('.lob-bots-c b'), false);
    if (prev.len !== next.len) feedbackPulse($app.querySelector('.len-c.on, .len-info'), false);
  }
  function connectionNotice() {
    let el = document.getElementById('connectionNotice');
    if (!el) { el = document.createElement('div'); el.id = 'connectionNotice'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = '✓ Veza obnovljena'; feedbackPulse(el, true);
    clearTimeout(connectionNotice.timer); connectionNotice.timer = setTimeout(() => el.remove(), 2600);
  }

  // Animiraj samo izričitu radnju, ne svako mrežno osvježavanje predvorja.
  function lobbyChange(buttonId, update, panelSelector) {
    const focused = document.activeElement && document.activeElement.id === buttonId;
    update();
    const button = document.getElementById(buttonId);
    if (focused && button) button.focus({ preventScroll: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (button && button.animate) button.animate([
      { transform: 'scale(.96)' }, { transform: 'scale(1.025)', offset: .65 }, { transform: 'none' }
    ], { duration: 190, easing: 'ease-out' });
    const panel = $app.querySelector(panelSelector);
    if (panel && panel.animate) panel.animate([
      { opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }
    ], { duration: 180, easing: 'ease-out' });
  }

  function tvLobby(d, demoBar) {
    const addr = esc(location.host + location.pathname.replace(/index\.html$/, ''));
    const svg = mode === 'demo' ? '' : qrSvg(appUrl() + joinHash(d.code));
    const inv = mode === 'demo'
      ? '<div class="tvlob-inv"><span class="lob-code-l">Demo</span><span class="lob-addr">Botovi igraju s tobom. U pravoj igri ovdje su kod sobe i QR kod.</span></div>'
      : '<div class="tvlob-inv"><span class="lob-code-l">Pozovi igrače</span><span class="lob-code">' + esc(d.code) + '</span>' + (svg ? '<div class="lob-qr">' + svg + '</div>' : '') +
        '<span class="lob-addr">Skeniraj QR kod ili otvori <b>' + addr + '</b> i upiši kod sobe.</span>' + (netNote ? '<span class="lob-addr net-reconnecting" role="status" style="color:#f0b070">' + esc(netNote) + '</span>' : '') + '</div>';
    const on = d.P.filter((p) => p.c && !p.b).length;
    let slots = d.P.map((p) => '<div class="tvlob-slot' + (p.c ? '' : ' off') + '" data-player-id="' + esc(p.id) + '" data-a="' + p.a + '"' + (p.b ? ' data-bot="1"' : '') + '><span class="pick-img">' + avSvg(p.a, 'idle') + '</span><span class="pick-nm">' + esc(p.n) + '</span>' + (p.b ? '<span class="pick-bot">BOT</span>' : '') + '</div>').join('');
    for (let k = d.P.length; k < d.max; k++) slots += '<div class="tvlob-slot empty"><span class="pick-nm">Slobodno mjesto</span></div>';
    const fsBtn = mode !== 'demo' && document.fullscreenEnabled && !document.fullscreenElement ? '<button class="btn ghost" id="fs">Cijeli zaslon</button>' : '';
    $app.innerHTML = demoBar +
      '<div class="tvlob"><div class="tvlob-side">' + inv + (game ? '<button class="btn ghost" id="tvSettings" aria-expanded="' + !!L.tvSettings + '">Postavke igre</button>' + (L.tvSettings ? botStepper(d) + lenPick(d) + endPick(d) + catPick(d) + mgPick(d) + pactToggle(d) + tkToggle(d) + bsToggle(d).replace('class="lob-opt"', 'class="lob-opt bs-tv"') : '') : '') + '</div>' + '<div class="tvlob-cast"><h2>Odaberite likove na mobitelima<span>' + d.P.length + '/' + d.max + '</span></h2>' +
      '<div class="tvlob-grid">' + slots + '</div>' +
      '<div class="tvlob-act"><button class="btn lob-cta" id="start"' + (on < 1 || catFew(d) ? ' disabled' : '') + '>Započni igru</button>' + fsBtn + '<button class="home-link" id="quit">Odustani</button></div></div></div>';
    bind('tvSettings', () => lobbyChange('tvSettings', () => { L.tvSettings = !L.tvSettings; render(); }, L.tvSettings ? '.tvlob-act' : '.tvlob-side'));
    bind('start', () => game.start());
    if (game) { bindBots(d); bindOpt(); }
    bind('quit', reset);
    bind('toPhone', () => { demoView = 'phone'; lastSig = ''; render(); });
    bind('fs', () => { try { const p = document.documentElement.requestFullscreen(); if (p && p.then) p.then(render, () => {}); } catch (e) {} });
  }

  // ---------- mobitel ----------
  function phoneRender(force) {
    try {
      if (!phoneShown()) return;
      if (force && S) lastSig = phoneSig(S);
      phoneV();
    } catch (e) { crash(e); }
  }
  function phoneV() {
    const d = S && typeof S.ms === 'number' && lastStateAt ? Object.assign({}, S, { ms: Math.max(0, S.ms - (Date.now() - lastStateAt)) }) : S;
    const freshP = !!d && L.s !== phoneStep;
    if (d && d.ph === 'cast' && d.ntv && !freshP && document.getElementById('castStage')) return;
    $app.className = 'screen phone' + (freshP ? ' fresh' : '');
    if (!d) { $app.className = 'screen phone center'; $app.innerHTML = '<div class="logo" style="font-size:2.4rem"><span class="lt">Trivia</span><span class="lt">Tavern</span></div><div class="p-title">Spajam se…</div><div class="p-sub">Soba ' + esc(pcode) + '</div>'; return; }
    const me = meOf(d);
    const demoBar = (mode === 'demo' && /demotv/.test(location.search) ? '<div class="demo-bar"><button class="btn ghost" id="toTv">TV</button></div>' : '') +
      (netNote ? '<div class="err net-reconnecting" role="status" style="display:flex;justify-content:space-between;align-items:center;gap:8px">' + esc(netNote) + '<button class="btn ghost" id="leave2">Izađi</button></div>' : '');
    const head = pactHead(d, me, me ? '<div class="p-top"><span class="p-me"><span class="mini">' + avSvg(me.a, d.ph === 'question' && me.fx ? 'shocked' : '') + '</span><span>Ti</span></span><span>' + esc(hudRound(d.rl, d.nr)) + '</span><span data-bk="hud"' + (d.ph === 'reveal' && ((me.g || 0) + (me.ub || 0)) > 0 ? ' data-ck="hud" data-cu="' + (me.sc - (me.g || 0) - (me.ub || 0) - (me.br || 0) - (me.rx || 0) - (me.tb || 0) - (me.kb || 0) - (me.ob || 0)) + '" data-to="' + me.sc + '" data-suf=" b" data-cud="' + (2150 + whT(d).end) + '" data-cdur="500"' : '') + '>' + (d.fin ? (me.top ? '👑 Vrh' : 'Stepenica ' + (me.st || 0) + '/' + (d.steps - 1)) : me.sc + ' b') + '</span></div>' : '');
    const center = (inner) => { $app.className = 'screen phone center' + (freshP ? ' fresh' : ''); return inner; };
    let h = '';
    if (!me) {
      h = center(d.ph === 'lobby' ? '<div class="p-title">Prijavljujem te…</div>' : '<div class="p-title">Igra je u tijeku</div><div class="p-sub">Pričekaj kraj pa uđi u sljedeću igru.</div>');
    } else switch (d.ph) {
      case 'lobby': {
        const taken = {}; d.P.forEach((p) => { if (p.id !== PID && !p.b) taken[p.a] = p.n; });
        const grid = PICK_ORDER.map((i) => { const a = AV[i], tk = taken[i] !== undefined;
          return '<button class="av-pick' + (me.a === i ? ' me' : '') + (L.popAv === i ? ' pop' : '') + '" data-av="' + i + '"' + (tk ? ' disabled' : '') + ' aria-label="' + esc(a.n) + (tk ? ', zauzeto' : '') + '">' +
            '<span class="pick-img">' + avSvg(i, me.a === i ? 'happy' : 'idle') + '</span><span class="pick-nm">' + esc(a.n) + '</span>' + (tk ? '<span class="pick-tk">Zauzeto</span>' : '') + '</button>'; }).join('');
        L.popAv = null;
        const hostId = d.ntv && d.P.length ? d.P[0].id : null;
        const rows = d.P.map((p) => '<div class="lob-row" data-player-id="' + esc(p.id) + '" data-a="' + p.a + '"' + (p.b ? ' data-bot="1"' : '') + '><span class="mini">' + avSvg(p.a, 'idle') + '</span><span class="nm">' + esc(p.n) + (p.id === hostId ? '<span class="crown" title="Domaćin">♛</span>' : '') + (p.id === PID ? '<span class="you">Ti</span>' : '') + '</span>' +
          (p.b ? '<span class="st bot"><img class="tavern-bot" src="ui/bot-medal.webp" alt="" aria-hidden="true"> Bot</span></div>' : '<span class="st' + (p.c ? '' : ' off') + '">' + (p.c ? '✓ U sobi' : 'Nije povezan') + '</span></div>')).join('');
        let invite = '', cta = '';
        if (mode === 'hostp') {
          const open = !!L.inv, qr = open ? qrSvg(appUrl() + joinHash(d.code)) : '';
          invite = '<button class="btn ghost lob-toggle" id="lobInv" aria-haspopup="dialog" aria-expanded="' + open + '">Pozovi igrače <span class="lob-chip">Kod <b class="lob-code">' + esc(d.code) + '</b></span></button>' +
            (open ? '<div class="inv-modal" id="invModal" role="dialog" aria-modal="true" aria-label="Pozivnica"><div class="inv-card"><span class="lob-code-l">Kod sobe</span><span class="inv-code">' + esc(d.code) + '</span>' + (qr ? '<div class="lob-qr inv-qr">' + qr + '</div>' : '') +
              '<span class="lob-addr">Skeniraj QR ili otvori ' + esc(location.host + location.pathname.replace(/index\.html$/, '')) + ' i upiši kod.</span><button class="btn lob-cta" id="invClose">Zatvori</button></div></div>' : '');
          cta = botStepper(d) + lenPick(d) + endPick(d) + catPick(d) + mgPick(d) + pactToggle(d) + rcToggle(d) + tkToggle(d) + bsToggle(d) + '<button class="btn lob-cta" id="dstart"' + (d.P.length < 2 || catFew(d) ? ' disabled' : '') + '>Započni igru</button>' + (catFew(d) ? '<div class="lob-wait">Uključi barem 4 kategorije.</div>' : d.P.length < 2 ? '<div class="lob-wait">Čekamo barem još jednog igrača ili dodaj bota.</div>' : '');
        } else if (mode === 'demo') {
          const nb = d.P.filter((p) => p.b).length;
          cta = botStepper(d) + lenPick(d) + endPick(d) + catPick(d) + mgPick(d) + bsToggle(d) + '<button class="btn lob-cta" id="dstart"' + (nb < 1 || catFew(d) ? ' disabled' : '') + '>Započni igru</button><div class="lob-wait">' + (catFew(d) ? 'Uključi barem 4 kategorije.' : nb < 1 ? 'Dodaj barem jednog bota.' : 'Igraš protiv ' + botWord(nb) + '. Bacat će moći i na tebe!') + '</div>';
        } else {
          cta = lenPick(d) + endPick(d) + catPick(d) + mgPick(d) + pactToggle(d) + rcToggle(d) + tkToggle(d) + bsToggle(d) + '<div class="lob-wait">Soba ' + esc(d.code) + ' · igra počinje kad domaćin pritisne „Započni igru“.</div>';
        }
        const startAt = cta.indexOf('<button class="btn lob-cta"');
        const settingsAt = startAt >= 0 ? startAt : cta.indexOf('<div class="lob-wait"');
        const settings = settingsAt >= 0 ? cta.slice(0, settingsAt) : cta;
        const actions = settingsAt >= 0 ? cta.slice(settingsAt) : '';
        h = '<div class="lob waiting-room"><div class="p-title lob-title">Igrači u sobi <span class="lob-count">' + d.P.length + '/' + d.max + '</span></div>' +
          '<div class="lob-players" aria-label="Igrači u sobi">' + rows + '</div>' + invite +
          '<div class="lob-tools"><button class="btn ghost" id="lobAvatar" aria-expanded="' + (L.lobPanel === 'avatar') + '">Promijeni lika</button>' +
          (settings ? '<button class="btn ghost" id="lobSettings" aria-expanded="' + (L.lobPanel === 'settings') + '">Postavke igre</button>' : '') + '</div>' +
          (L.lobPanel === 'avatar' ? '<div class="av-grid">' + grid + '</div>' : '') +
          (L.lobPanel === 'settings' ? '<div class="lob-settings">' + settings + '</div>' : '') +
          actions + '<button class="home-link" id="leave">Izađi</button></div>';
        break;
      }
      case 'intro':
        h = annHtml(d);
        break;
      case 'vote': case 'voteResult': {
        const res = d.ph === 'voteResult', rl = roulette(d);
        const mine = L.sent ? L.sent.v : (me.vt !== undefined ? me.vt : (me.ok ? -2 : -1));
        const ppBy = d.P.find((p) => p.pk), ppMe = d.P.find((p) => p.id === PID), ppAvail = !res && !ppBy && mine === -1 && ppMe && ppMe.pa !== 0 && !d.fin, ppShow = !!ppMe && !d.fin;
        if (ppBy && window.__ppS !== d.s) { window.__ppS = d.s; AUDIO.play('pick'); }
        // gumb je uvijek na istom mjestu (ekran se ne pomiče); kad se ne može iskoristiti, siv je i kaže zašto
        const ppWhy = ppAvail ? (L.ppOn ? 'Sad dodirni vrata koja želiš' : 'Odaberi kategoriju bez glasanja · jednom po igri') : ppMe && ppMe.pa === 0 ? 'Već iskorišten u ovoj igri' : ppBy ? 'U ovoj rundi: ' + esc(ppBy.n) : res ? 'Odaberi kategoriju bez glasanja · jednom po igri' : 'Glas je predan';
        const ppBar = ppShow ? (ppAvail ? '<button class="pp-bar' + (L.ppOn ? ' on' : '') + '" id="ppBtn" aria-pressed="' + (L.ppOn ? 'true' : 'false') + '">'
          : '<div class="pp-bar off" aria-disabled="true">') + '<span class="pp-med" aria-hidden="true"></span><span class="pp-txt"><b>POWER PICK</b><small>' + ppWhy + '</small></span>' + (ppAvail ? '</button>' : '</div>') : '';
        const doorBtns = d.cats.map((c, i) => {
          const who = d.P.filter((p) => p.vt === i);
          const faces = voterFaces(who, 4);
          const cls = res ? (i === d.cw ? ' win' : ' lose') : (mine === i ? ' picked' : '');
          const dst = !res && mine !== -1 ? (mine === i ? 'picked' : 'dim') : '';
          const ppT = ppBy && ppBy.vt === i ? '<span class="pp-tag"><span class="pp-av">' + avSvg(ppBy.a, 'happy') + '</span><span class="pp-tx">' + esc(ppBy.n) + ' ⭐<span class="pp-lb"> power pick</span></span></span>' : '';
          return '<button class="door-btn o' + i + cls + (ppT ? ' pp-on' : '') + (L.ppOn && !res && mine === -1 ? ' pp-arm' : '') + '" data-v="' + i + '" data-bk="dv' + i + '" data-bv="' + dst + '"' + (dst ? ' data-ba="' + (dst === 'picked' ? 'pickIn' : 'dimIn') + '"' : '') + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + (res || mine !== -1 || ppBy ? ' disabled' : '') + '>' + (rl ? rl.spot(i) : '') + ppT + '<span class="dname"><span>' + esc(c) + '</span></span>' +
            '<span class="dvoters">' + faces + '</span></button>';
        }).join('');
        const resT = 'Kategorija: <span style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</span>';
        h = (rl ? '<style>' + rl.css + '</style>' : '') + head + '<div class="vote-head"><div class="p-title">' + (res ? (rl ? '<span class="rl-pre" style="--rd:' + rl.R + 'ms">Ždrijeb bira…</span><span class="rl-post" style="--rd:' + rl.R + 'ms">' + resT + '</span>' : resT) : 'Odaberi kategoriju') + '</div>' +
          '<div class="p-sub" data-bk="vwait" data-ba="subIn">' + (res ? (d.tie ? '<span' + (rl ? ' class="rl-post" style="--rd:' + rl.R + 'ms"' : '') + '>Neriješeno! Odlučio je ždrijeb.</span>' : ppBy ? '⭐ Power pick: ' + esc(ppBy.n) : 'Kreće pitanje…') : ppBy ? '⭐ Power pick: ' + esc(ppBy.n) + ' bira kategoriju' : mine !== -1 ? 'Glas zaprimljen ✔' : L.ppOn ? '⭐ Power pick: dodirni vrata koja želiš' : 'Dodirni kategoriju za svoj glas.') + '</div></div>' + (res ? '<div class="timer spent" aria-hidden="true"><div></div></div>' : timerHtml()) +
          '<div class="door-btns">' + doorBtns + '</div>' + ppBar +

          '';
        break;
      }
      case 'cast': {
        if (d.ntv) { h = head + '<div class="p-title">Bacanje moći!</div>' + castHtml(d); break; }
        const hits = d.ev.filter((e) => e.t === PID);
        h = center(head + '<div class="p-title" style="color:var(--gold)">Gledaj TV!</div><div class="p-cast-me bob">' + avSvg(me.a, hits.some((e) => !e.b) ? 'shocked' : 'idle') + '</div>' +
          (hits.length ? '<div class="p-sub">' + hits.map((e) => esc(nameOf(d, e.f)) + ' ti šalje: ' + POWERS[e.p].n + (e.cap ? ' (dosegnut limit napada)' : e.b ? ' (štit ga odbija)' : '')).join('<br>') + '</div>' : '<div class="p-sub">' + (d.ev && d.ev.length ? 'Moći lete po pozornici…' : 'Svi su odabrali!') + '</div>'));
        break;
      }
      case 'bet': h = head + betPhone(d, me); break;
      case 'moment': h = center(head + momentHtml(d, d.mo)); break;
      case 'betray': h = head + betrayHtml(d, false); break;
      case 'loyal': h = head + loyalHtml(d, false); break;
      case 'deal': h = head + dealPhone(d, me); break;
      case 'howto': h = center(head + howtoHtml(d)); break;
      case 'order': h = head + timerHtml() + orderPhone(d, me); break;
      case 'hilo': h = head + timerHtml() + hiloPhone(d, me); break;
      case 'blitz': h = head + timerHtml() + blitzPhone(d, me); break;
      case 'maj': h = head + timerHtml() + majPhone(d, me); break;
      case 'orderReveal': h = head + chalReveal(d, me, 'Točan poredak', orderSolution(d), 'Točno ' + (me.k || 0) + ' od 4', (me.k || 0) + ' × 150' + (me.k === 4 ? ' + 200 bonus' : '')); break;
      case 'hiloReveal': h = head + chalReveal(d, me, 'Više ili manje', '', 'Niz: ' + (me.k || 0) + ' točnih', (me.k || 0) + ' × 120' + (d.hl && me.k === d.hl.list.length && me.k > 0 ? ' + 200 bonus' : '')); break;
      case 'blitzReveal': h = head + chalReveal(d, me, 'Munjeviti krug', '', '✓ ' + (me.k || 0) + ' · ✗ ' + (me.x || 0), (me.k || 0) + ' × 100 − ' + (me.x || 0) + ' × 50' + ((me.k || 0) * 100 - (me.x || 0) * 50 < 0 ? ' · najmanje 0' : '')); break;
      case 'majReveal': {
        const inW = d.mj.win.includes(me.mv), none = !d.mj.win.length;
        h = head + '<div class="mg"><div class="mg-t">Što misli većina?</div><div class="mg-q">' + esc(d.mj.q.q) + '</div>' + majBars(d, me.mv) +
          '<div class="mg-fb ' + (inW ? 'ok' : 'bad') + '">' + (none ? 'Nema većine – svatko je za sebe!' : inW ? 'S većinom si! +300 za ovo pitanje' : me.mv >= 0 ? 'Ovaj put nisi s većinom.' : 'Nisi glasao.') + '</div></div>' +
          (d.mj.last ? '<div class="result ' + (me.g ? 'ok' : 'none') + '"><div class="p-title">Ukupno</div><div class="pts">+' + (me.g || 0) + '</div></div>' + (d.ntv ? miniBoard(d, true) : rankStat(d, me)) + tdLine(d) : '');
        break;
      }
      case 'uljez': h = head + timerHtml() + ulPick(d, me); break;
      case 'uljezVote': h = head + timerHtml() + ulVote(d, me); break;
      case 'uljezReveal': {
        const u = d.ul, iAm = u.imp === PID, voted = (u.vt || {})[PID];
        const res = iAm ? (u.caught ? 'Ostali su te prozreli' : 'Prošlo je neopaženo!') : voted === u.imp ? 'Pogodak! Uljez je prepoznat' : voted ? 'Ovaj put promašaj' : 'Bez glasa';
        h = head + chalReveal(d, me, 'Uljez u krčmi', ulReveal(d), res, iAm ? (u.caught ? 'Razotkriven: 0' : 'Neotkriven: 400') : voted === u.imp ? 'Ispravan glas: 250' : '0'); break;
      }
      case 'duelIntro': h = center(head + momentHtml(d, duelIntroMo(d))); break;
      case 'duel': h = head + duelPhone(d, me); break;
      case 'rope': h = head + ropePhone(d, me); break;
      case 'duelResult': h = head + (d.du && d.du.rope ? ropeResult(d) : duelResultHtml(d, false)); break;
      case 'secret': case 'secret2': h = head + secretPhone(d, me); break;
      case 'power': h = head + timerHtml() + powerPhone(d, me); break;
      case 'question': h = head + questionPhone(d, me); break;
      case 'reveal': h = head + revealPhone(d, me); break;
      case 'sort': h = head + timerHtml() + sortPhone(d, me); break;
      case 'link': h = head + timerHtml() + linkPhone(d, me); break;
      case 'sortReveal': case 'linkReveal': {
        const tot = d.ph === 'sortReveal' ? d.so.it.length : d.li.L.length;
        let sol = '', personal = false;
        if (d.ph === 'sortReveal' && lastSort && lastSort.k === d.so.it.join('|')) sol = sortZonesHtml(d, lastSort.p, d.so.key, ' sort-cols');
        if (sol) personal = true;
        if (!sol && d.ph === 'sortReveal') sol = '<div class="sort-cols" style="width:100%">' + [0, 1].map((k) => '<div class="sort-col ' + (k ? 'b' : 'a') + '" style="padding:10px"><h3 style="font-size:1.1rem">' + esc(k ? d.so.b : d.so.a) + '</h3><div class="chips">' + d.so.it.filter((_, i) => d.so.key[i] === k).map((x) => '<span class="chip" style="font-size:.9rem">' + esc(x) + '</span>').join('') + '</div></div>').join('') + '</div>';
        if (d.ph === 'linkReveal' && lastLink && lastLink.k === d.li.L.join('|') + '#' + d.li.R.join('|')) sol = '<div class="lnk rev pairs">' + lnkHtml(d, lastLink.p, d.li.key, true) + '</div>';
        if (d.ph === 'linkReveal' && sol) personal = true;
        if (!sol && d.ph === 'linkReveal') sol = '<div class="pairs" style="width:100%">' + d.li.L.map((l, i) => '<div class="pair" style="font-size:1rem"><span>' + esc(l) + '</span><span class="arrow">→</span><span>' + esc(d.li.R[d.li.key[i]]) + '</span></div>').join('') + '</div>';
        h = head + '<div class="result ' + (me.k ? 'ok' : 'none') + '"><div class="p-title">Točno ' + (me.k || 0) + ' od ' + tot + '</div><div class="pts">+' + (me.g || 0) + '</div><div class="score-detail">' + (me.k || 0) + ' × ' + (d.ph === 'sortReveal' ? 150 : 200) + ' bodova</div></div>' +
          '<div class="score-detail">' + (personal ? 'Tvoji odabiri: zeleno ✓ točno · crveno ✕ netočno' : 'Točno rješenje') + '</div>' + sol + (d.ntv ? miniBoard(d, true) : rankStat(d, me)) + tdLine(d);
        if (!d.ntv) h = center(h);
        break;
      }
      case 'tstart': h = head + '<div class="th-intro"><div class="p-title">Krčmarovo prijestolje</div><div class="p-sub">Svi bodovi ostaju. ' + ((d.th && d.th.n) || 5) + ' pitanja, zadnje vrijedi dvostruko. Pobjeđuje najbogatiji.</div>' + throneHtml(d) + '</div>'; break;
      case 'trisk': h = head + riskPhone(d, me); break;
      case 'fstart': {
        const el = Math.max(0, d.dur - d.ms);
        h = head + '<div class="fs" style="--el:' + el + 'ms;--fe:' + fsEnd(d, me) + 'ms"><div class="p-title">Tko kreće odakle?</div>' + fsRows(d) +
          '<div class="fs-me">Krećeš s: <b>' + esc(fsLabel(me)) + '</b></div><div class="p-sub fs-rule">Točnim odgovorima napreduješ. Na vrhu te čeka pitanje za krunu.</div><div class="phone-pyr big">' + pyramidHtml(d, false, { you: true }) + '</div></div>';
        break;
      }
      case 'fq': h = head + finalePhone(d, me); break;
      case 'fr': {
        const ok = me.ch === d.cor;
        const el = Math.max(0, d.dur - d.ms), mine = me.ch;
        const tf = '<div class="rv-opts' + (d.crown ? '' : ' two') + '">' + d.q.o.map((o, i) => '<div class="p-opt o' + (d.crown ? i : i === 0 ? 3 : 0) + (i === d.cor ? ' rv-ok' + (mine === i ? ' mine' : '') : mine === i ? ' rv-bad' : ' rv-dim') + '"><span class="otxt">' + esc(o) + '</span></div>').join('') + '</div>';
        const wasTop = d.crown && (me.top || me.st >= d.steps);
        const note = me.st >= d.steps ? '👑 KRUNA JE TVOJA!' : wasTop ? (mine >= 0 ? 'Kruna izmiče! Ostaješ na vrhu — nova prilika u sljedećem pitanju.' : 'Vrijeme je isteklo · ostaješ na vrhu') :
          ok ? 'Točno! +' + (me.ug || 1) + (me.fb ? ' ' + me.fb.split('').map((c) => ({ f: '⚡', d: '✖2', s: '🔥' })[c] || '').join('') : '') + (me.top ? ' · 👑 na vrhu!' : me.mv ? ' · ⬆ ' + me.st + '. stepenica' : ' · napredak ' + (me.fp || 0) + '/' + (me.fr || 1)) : mine >= 0 ? 'Netočno · napredak ostaje' : 'Vrijeme je isteklo';
        h = head + '<div class="rv" style="--el:' + el + 'ms"><div class="rv-a"><div class="p-q">' + esc(d.q.t) + '</div>' + tf + '<div class="fin-note' + (ok ? '' : ' zero') + '">' + note + '</div></div>' +
          '<div class="rv-b"><div class="fin-note' + (ok ? '' : ' zero') + '">' + note + '</div>' + (d.ntv ? '<div class="phone-pyr big">' + pyramidHtml(d, true, { delay: 2000, you: true }) + '</div>' + '<div class="p-sub">' + esc(progTxt(d, me)) + '</div>' : progMeter(d, me)) + tdLine(d) + '</div></div>';
        break;
      }
      case 'final':
        h = winHtml(d, false);
        break;
    }
    if (freshP && me) { phoneStep = L.s; phoneSound(d, me); }
    if (me && (!d.ntv || d.ph !== 'fq') && (d.ph === 'power' || d.ph === 'question' || d.ph === 'reveal' || d.ph === 'fq')) h += barRow(d);
    KEEP.grab(freshP);
    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);
    $app.classList.toggle('lobfit', !!d && d.ph === 'lobby');
    $app.classList.toggle('final-question', !!d && d.ph === 'fq');
    fitScreen();
    if (d.ph === 'fq') {
      const area = $app.querySelector('.q-area');
      if (area) {
        const hint = () => {
          const scrollable = /^(auto|scroll)$/.test(getComputedStyle(area).overflowY) && area.scrollHeight > area.clientHeight + 1;
          const bottom = area.getBoundingClientRect().bottom;
          // Efekti, sjene i animacije mogu povećati scrollHeight i kada su svi odgovori vidljivi.
          const hiddenAnswer = [...area.querySelectorAll('.p-opts .p-opt')].some((answer) => {
            const text = answer.querySelector('.otxt') || answer;
            return text.getBoundingClientRect().bottom > bottom + 2;
          });
          area.classList.toggle('more-answers', scrollable && hiddenAnswer);
        };
        area.addEventListener('scroll', hint, { passive: true });
        area.addEventListener('animationend', hint);
        hint();
      }
    }
    walkFromRow();
    lobbyFeedback(d);
    MOTION.after('p:' + d.ph + ':' + d.s);
    KEEP.put();
    if (freshP) $app.classList.add('fresh');
    if (d.ph === 'cast' && d.ntv) CAST.start(document.getElementById('castStage'), d, true);
    bindPhone(d, me);
    if (freshP && me && d.ph === 'reveal' && ((me.g || 0) + (me.ub || 0)) > 0) flyPoints(L.s, (me.g || 0) + (me.ub || 0), d);
    tick();
  }

  function barRow(d) {
    const mood = (p) => (d.ph === 'question' || d.ph === 'fq') && p.fx ? 'shocked' : p.ok ? 'happy' : 'idle';
    return '<div class="bar-row' + (d.ph === 'reveal' ? ' rv-hold' : '') + '">' + d.P.map((p) => '<div class="bw' + (p.id === PID ? ' me' : '') + '" data-pid="' + esc(p.id) + '" title="' + esc(p.n) + '" aria-label="' + esc(p.n) + '"><span class="glow"></span>' + avSvg(p.a, mood(p)) + (d.rc && (d.rc.a === p.id || d.rc.b === p.id) ? '<span class="rc-mk" title="Rivalski obračun">⚔️</span>' : '') + (p.ok ? '<span class="ok" data-bk="bw' + esc(p.id) + '" data-bv="1">✓</span>' : '') + '</div>').join('') + '</div>';
  }
  function hudRound(rl, nr) { const m = /^Runda (\d+)$/.exec(rl || ''); return m ? 'Runda ' + m[1] + '/' + (nr || 3) : (rl || ''); }
  const ANN_SUB = { 'Runda 1': 'Avantura počinje.', 'Runda 2': 'Vrijeme je za novu rundu.', 'Runda 3': 'Još samo jedna runda.', 'Veliko finale': 'Sve se odlučuje sada.' };
  function annHtml(d) {
    const t = d.it.t || '', fin = /finale/i.test(t);
    return '<div class="ann' + (fin ? ' fin' : '') + '" style="--dur:' + Math.max(800, d.dur) + 'ms;--el:' + Math.max(0, d.dur - d.ms) + 'ms"><div class="ann-t">' + esc(t) + '</div><div class="ann-s">' + esc((/^Runda \d+$/.test(t) && t !== 'Runda 1' ? (t === 'Runda ' + (d.nr || 3) ? 'Još samo jedna runda.' : 'Vrijeme je za novu rundu.') : ANN_SUB[t]) || d.it.sub || '') + '</div></div>';
  }
  function voterFaces(list, maxN) {
    const show = list.length > maxN ? list.slice(0, maxN - 1) : list;
    return show.map((p) => '<span class="vface" title="' + esc(p.n) + '">' + avSvg(p.a, 'idle') + '</span>').join('') + (list.length > show.length ? '<span class="vface more">+' + (list.length - show.length) + '</span>' : '');
  }
  function winHtml(d, tv) {
    const legBtn = d.lg ? '<button class="btn lg-open" id="legOpen">📜 Legende ove krčme</button>' : '';
    const ranked = legRank(d);
    const w = d.P.find((p) => p.id === d.win) || ranked[0];
    const others = ranked.filter((p) => p !== w);
    const fig = (p, cls, pose, lab) => p ? '<div class="win-fig ' + cls + '" data-pose="' + pose + '"><span class="pic">' + avSvg(p.a, pose) + '</span>' + (lab ? '<span class="pl">' + lab + '</span>' : '') + '</div>' : '<div class="win-fig ' + cls + '"></div>';
    const hero = '<div class="win-hero">' + fig(others[0], 'side', 'idle', others[0] ? '2. ' + esc(others[0].n) : '') + fig(w, 'main', 'victory', '') + fig(others[1], 'side', 'idle', others[1] ? '3. ' + esc(others[1].n) : '') + '</div>';
    const me = d.P.find((p) => p.id === PID);
    const sub = !tv && me ? (w.id === PID ? 'Tvoja je kruna! Vladar Trivia Taverna!' : 'Vladar Trivia Taverna!') : 'Vladar Trivia Taverna!';
    const board = '<div class="mboard wide">' + ranked.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a) + '</span><span class="nm">' + esc(p.n) + (!tv && p.id === PID ? '<span class="you">Ti</span>' : '') + '</span><span class="sc">' + esc(finalPosition(d, p)) + '</span></div>').join('') + '</div>';
    const fact = d.fact && (tv || (me && w.id === PID)) ? '<div class="win-fact"><b>Zanimljivost za pobjednika:</b> ' + esc(d.fact) + '</div>' : '';
    const act = tv ? '<div class="win-act">' + legBtn + '<button class="btn win-cta" id="again">Igraj ponovno</button><button class="btn ghost" id="quit">Početni ekran</button></div>'
      : '<div class="win-act">' + legBtn + (isLocalHost() ? '<button class="btn win-cta" id="dagain">Igraj ponovno</button>' : '<div class="win-wait">Domaćin može pokrenuti novu igru.</div>') + '<button class="btn ghost" id="leave">Početni ekran</button></div>';
    const name = '<div class="win-name">' + esc(w.n) + '</div><div class="win-sub">' + sub + '</div>';
    const lgo = d.lg && LEGV.open === d.lg.id ? legHtml(d, tv) : '';
    const klh = d.lg && d.lg.kl ? '<div class="win-kl">🍺 ' + esc(d.lg.kl) + '</div>' : '';
    if (tv) return '<div class="winscr"><div class="win-t">Pobjednik!</div><div class="win-left">' + hero + name + '</div><div class="win-right">' + klh + board + fact + '</div>' + act + '</div>' + lgo;
    return '<div class="winscr"><div class="win-t">Pobjednik!</div>' + hero + name + klh + board + fact + act + '</div>' + lgo;
  }
  // ---------- Tavern Director ----------
  const pById = (d, id) => d.P.find((p) => p.id === id);
  function tmFig(d, id, pose, cls) {
    const p = pById(d, id); if (!p) return '';
    return '<div class="tm-fig' + (cls || '') + '"><div class="pic">' + avSvg(p.a, pose || 'idle') + '</div><span class="tm-nm">' + esc(p.n) + '</span></div>';
  }
  function momentHtml(d, m) {
    const ids = m.a || [], poses = m.pose || [];
    const figs = ids.length === 2 && m.vs ? tmFig(d, ids[0], poses[0]) + '<span class="tm-vs">VS</span>' + tmFig(d, ids[1], poses[1]) : ids.map((id, i) => tmFig(d, id, poses[i])).join('');
    const mem = m.t === 'Krčma pamti';
    return '<div class="tm' + (mem ? ' mem' : '') + '" style="--dur:' + Math.max(800, d.dur) + 'ms;--el:' + Math.max(0, d.dur - d.ms) + 'ms"><div class="tm-figs">' + figs + '</div><div class="tm-t">' + esc(m.t) + '</div><div class="tm-s">' + esc(m.s || '') + '</div></div>';
  }
  // trenutak ispod poretka (ne poseban ekran); el = ms od početka faze
  function tdLine(d) {
    const m = d.mo; if (!m) return '';
    const el = Math.max(0, d.dur - d.ms), ids = m.a || [], poses = m.pose || [];
    const figs = ids.map((id, i) => { const p = pById(d, id); return p ? '<span class="mini">' + avSvg(p.a, poses[i] || 'idle') + '</span>' : ''; }).join('');
    const lv = m.lv === 3 ? ' lv3' : m.lv === 2 ? ' lv2' : '';
    return '<div class="tdl' + (m.t === 'Krčma pamti' ? ' mem' : '') + lv + '" data-mo="' + (+m.id || 0) + '" style="--el:' + el + 'ms"><span class="figs">' + figs + '</span><span class="tx"><b>' + esc(m.t) + '</b><span>' + esc(m.s || '') + '</span></span></div>';
  }
  function tdSting(d) { if (!d.mo && !d.rcr && !d.tkr) return; const at = 2700 + (d.ph === 'reveal' ? whT(d).end : 0), el0 = Math.max(0, d.dur - d.ms); if (el0 > at + 800) return; const s0 = d.s, wait = Math.max(0, at - el0); setTimeout(() => { if (s0 === d.s) AUDIO.play(d.mo ? d.mo.snd || 'stingSmall' : d.rcr ? 'stingRival' : d.tkr.k === 'win' ? 'stingUp' : 'stingSmall'); }, wait); }
  function duelIntroMo(d) { if (d.du.rope) return { t: '⚔️ Izazov vođi!', s: 'Nadvlačenje konopa: točno vuče, netočno vraća · ulog ' + d.du.sa + ' protiv ' + d.du.sb, a: [d.du.a, d.du.b], pose: ['attack', 'attack'], vs: 1 };
    return { t: 'Dvoboj!', s: (d.du.n ? d.du.n + ' ' : '') + 'Brži točan odgovor osvaja +' + d.du.bonus, a: [d.du.a, d.du.b], pose: ['attack', 'attack'], vs: 1 }; }
  function duelVs(d, pose) {
    const du = d.du, st = (id) => (pById(d, id) || {}).ok ? ' ok' : '';
    return '<div class="du-vs">' + tmFig(d, du.a, pose ? pose(du.a) : 'idle', d.ph === 'duel' ? st(du.a) : '') + '<span class="tm-vs">VS</span>' + tmFig(d, du.b, pose ? pose(du.b) : 'idle', d.ph === 'duel' ? st(du.b) : '') + '</div>';
  }
  function duelPhone(d, me) {
    const du = d.du, mine = me && (me.id === du.a || me.id === du.b);
    if (!mine) return timerHtml() + '<div class="du-k">Dvoboj u tijeku</div>' + duelVs(d) + '<div class="p-q">' + esc(d.q.t) + '</div><div class="waiting">Gledaš dvoboj. Brži točan odgovor osvaja +' + du.bonus + '.</div>';
    const answered = L.sent || me.ok, pick = L.sent ? L.sent.c : -1;
    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + i + (answered ? (pick === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span class="otxt">' + esc(o) + '</span></button>').join('');
    return timerHtml() + '<div class="du-k">Dvoboj!</div>' + duelVs(d) + '<div class="p-q">' + esc(d.q.t) + '</div><div class="q-area"><div class="p-opts">' + opts + '</div></div>' +
      '<div class="waiting" data-bk="qwait" data-ba="subIn">' + (answered ? 'Odgovor zaprimljen ✔' : 'Brži točan odgovor pobjeđuje!') + '</div>';
  }
  function duelResultHtml(d, tv) {
    const du = d.du, w = du.w ? pById(d, du.w) : null;
    const pose = (id) => (!du.w ? 'sad' : id === du.w ? 'happy' : 'sad');
    const me = pById(d, PID), mine = me && (me.id === du.a || me.id === du.b) ? me.ch : -1;
    const sec = (ms) => (ms >= 0 ? (ms / 1000).toFixed(1).replace('.', ',') + ' s' : '—');
    return '<div class="du-k">Dvoboj</div>' + duelVs(d, pose) +
      '<div class="du-res">' + (w ? 'Pobjeđuje <b>' + esc(w.n) + '</b> · +' + du.bonus : 'Nema pobjednika. Nitko ne gubi bodove.') + '</div>' + (du.o ? '<div class="du-note">' + esc(du.o) + '</div>' : '') +
      (du.ms ? '<div class="du-ms">' + esc((pById(d, du.a) || {}).n || '') + ' ' + sec(du.ms[0]) + ' · ' + esc((pById(d, du.b) || {}).n || '') + ' ' + sec(du.ms[1]) + '</div>' : '') +
      (tv ? '' : '<div class="p-q">' + esc(d.q.t) + '</div>') + revOpts(d, mine, tv);
  }
  const SE_TXT = {
    target: { k: 'Tajna meta', d: (b) => 'Odaberi igrača. Ako na sljedeće pitanje odgovori <b>netočno ili ne odgovori</b>, dobivaš <b>+' + b + '</b>.' },
    help: { k: 'Tajna pomoć', d: (b) => 'Odaberi saveznika. Ako oboje točno odgovorite na sljedeće pitanje, oboje dobivate <b>+' + b + '</b>.' },
  };
  function secretWait(d) { return '<div class="se-wait"><div class="tm-t">Netko u krčmi nešto planira…</div>' + (d ? '' : '') + '</div>'; }
  function secretPhone(d, me) {
    const se = d.se;
    if (d.ph === 'secret' && me && se.p === me.id) {
      const T = SE_TXT[se.k] || SE_TXT.target;
      if (L.sent || me.ok) return '<div class="se"><div class="se-k">' + T.k + '</div><div class="se-d">Odabrano. Pst! 🤫</div><div class="se-note">Nitko ne vidi tvoj izbor.</div></div>';
      const opts = d.P.filter((p) => p.id !== me.id && p.c).map((p) => '<button class="btn ghost" data-sx="' + esc(p.id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span>' + esc(p.n) + '</button>').join('');
      return timerHtml() + '<div class="se"><div class="se-k">' + T.k + '</div><div class="se-d">' + T.d(se.bonus) + '</div><div class="se-list">' + opts + '</div><div class="se-note">Samo ti vidiš ovaj ekran. Nema kazne.</div></div>';
    }
    if (d.ph === 'secret2' && me && se.x === me.id) {
      const by = pById(d, se.by);
      if (L.sent || me.ok) return '<div class="se"><div class="se-k">Tajna pomoć</div><div class="se-d">Odgovor poslan. Pst! 🤫</div></div>';
      return timerHtml() + '<div class="se"><div class="se-k">Tajna pomoć</div><div class="se-d"><b>' + esc(by ? by.n : '?') + '</b> traži tvoju pomoć. Ako oboje točno odgovorite na sljedeće pitanje, oboje dobivate <b>+' + se.bonus + '</b>. Bez kazne.</div>' +
        '<div class="se-list"><button class="btn" data-sy="1">Prihvati</button><button class="btn ghost" data-sy="0">Odbij</button></div></div>';
    }
    return secretWait();
  }
  // javno otkrivanje tajnog plana (za sve osim sudionika, koji vide svoj redak)
  function secretPublicLine(d, me) {
    const x = d.sxr; if (!x) return '';
    if (me && !x.none && (x.p === me.id || (x.k === 'help' && x.ok && x.x === me.id))) return '';
    const A = esc(nameOf(d, x.p)), X = x.x ? esc(nameOf(d, x.x)) : '';
    const t = x.none ? A + ' · tajni plan ostao je neiskorišten'
      : x.k === 'target' ? A + ' → ' + X + ' · tajna meta ' + (x.res ? '<b>pogođena</b>' : 'odgovara točno, bez bonusa')
      : !x.ok ? A + ' → ' + X + ' · tajni savez je odbijen' : A + ' i ' + X + ' · tajni savez ' + (x.res ? '<b>uspio</b>' : 'bez bonusa');
    return '<div class="rv-sxp">🕵️ <span>Krčma otkriva:</span> ' + t + '</div>';
  }
  function secretRevealLine(d, me) {
    const x = d.sxr; if (!x || !me || x.none) return '';
    if (x.k === 'target' && x.p === me.id) return '<div class="rv-sx' + (x.res ? '' : ' none') + '">' + (x.res ? 'Tajna meta nije odgovorila točno: +' + (me.xb || 0) : 'Tajna meta je odgovorila točno · bez bonusa') + '</div>';
    if (x.k === 'help' && (x.p === me.id || x.x === me.id) && x.ok) return '<div class="rv-sx' + (x.res ? '' : ' none') + '">' + (x.res ? 'Tajni savez: +' + (me.xb || 0) : 'Tajni savez · ovaj put bez bonusa') + '</div>';
    return '';
  }
  // ---------- mini-igre ----------
  function qTextHtml(d, tv) {
    const q = d.q;
    if (q.k === 'who') {
      const step = Math.round(d.dur / 5), all = d.ph !== 'question';
      return '<div class="whoq' + (all ? ' all' : '') + '"><div class="whoq-k">Tko sam ja? · ' + esc(q.t) + '</div><ol>' +
        (q.cl || []).map((t, i) => '<li style="--cd:' + (i * step) + 'ms"><i>' + (i + 1) + '.</i>' + esc(t) + '</li>').join('') + '</ol></div>';
    }
    if (q.k === 'emoji') return '<div class="emo">' + esc(q.t) + '</div>';
    return '<div class="' + (tv ? 'q-text' : 'p-q') + '">' + esc(q.t) + '</div>';
  }
  const HT_KICK = { fast: 'Vrijeme je da vidimo tko najbrže razmišlja!', social: 'Koliko se zapravo poznajete?', logic: 'Malo logike — bez žurbe, ali i bez greške!', assoc: 'Tko će prvi prepoznati?' };
  function howtoHtml(d) {
    const h = d.ht;
    return '<div class="ht"><div class="ht-i"><img src="ui/challenge-medal.webp" alt="" aria-hidden="true"></div><div class="ht-k">' + (h.chal ? 'Izazov' : 'Posebna bitka') + '</div><div class="ht-t">' + esc(h.n) + '</div>' +
      (HT_KICK[h.kd] ? '<div class="ht-kick">' + HT_KICK[h.kd] + '</div>' : '') +
      (h.first || L.htFull ? '<ol>' + h.r.map((r, i) => '<li style="--cd:' + (h.first ? 350 + i * 500 : 0) + 'ms"><b>' + (i + 1) + '</b>' + esc(r) + '</li>').join('') + '</ol>' : '<div class="mg-s">Podsjetnik: ' + esc(h.r[0]) + '</div>' + (phoneShown() ? '<button class="pk-b ht-full" id="htfull">📜 Cijele upute</button>' : '')) +
      howtoReady(d) + '</div>';
  }
  // tko je pročitao: mobitel ima tipku, TV i svi vide koliko je spremno
  function howtoReady(d) {
    const ps = d.P.filter((p) => p.c), ready = ps.filter((p) => p.ok).length;
    const me = phoneShown() ? meOf(d) : null, mine = me && (me.ok || (L && L.sent));
    const count = '<div class="ht-ready" data-bk="htr" data-bv="' + ready + '">Spremno: <b>' + ready + '/' + ps.length + '</b></div>';
    if (me && !mine) return '<button class="btn win-cta ht-ok" id="htok">✔ Razumijem, idemo!</button>' + count;
    if (!me) return '<div class="ht-ready" data-bk="htr" data-bv="' + ready + '">Spremno: <b>' + ready + '/' + ps.length + '</b> · igra kreće kad svi potvrde</div>';
    return '<div class="ht-go">Čekamo ostale…</div>' + count;
  }
  function sendPartial(inp) {
    inp.s = L.s;
    if (isLocalHost()) game.setInput(PID, inp);
    else netSend({ t: 'in', in: inp });
  }
  function orderRanks(o) { return [0, 1, 2, 3].map((r) => o.key.indexOf(r)); }
  function orderPhone(d, me) {
    const o = d.or, sent = !!(L.sent || me.ok), picks = L.ord || [];
    const btn = (x, i) => {
      const pos = L.sent && L.sent.r ? L.sent.r[i] : picks.indexOf(i);
      return '<button class="mg-btn' + (pos >= 0 ? ' set' : '') + '" data-or="' + i + '"' + (sent || pos >= 0 ? ' disabled' : '') + '><span class="n">' + (pos >= 0 ? pos + 1 : '') + '</span>' + esc(x) + '</button>';
    };
    return '<div class="mg"><div class="mg-t">' + esc(o.t) + '</div><div class="mg-s">Dodiruj redom: <b>1 = ' + esc(o.lo) + '</b> … <b>4 = ' + esc(o.hi) + '</b></div><div class="mg-list">' + o.it.map(btn).join('') + '</div>' +
      (sent ? '<div class="waiting">Poslano ✔ Čekamo ostale…</div>' : '<div class="mg-row"><button class="btn ghost" id="ordUndo"' + (picks.length ? '' : ' disabled') + '>Poništi</button></div>') + '</div>';
  }
  function orderSolution(d) {
    const o = d.or;
    return '<div class="mg-list">' + orderRanks(o).map((i, r) => '<div class="mg-btn set"><span class="n">' + (r + 1) + '</span>' + esc(o.it[i]) + (o.v ? '<span class="val">' + esc(o.v[i]) + '</span>' : '') + '</div>').join('') + '</div>';
  }
  function hiloPhone(d, me) {
    const list = d.hl.list, st = L.hl || (L.hl = { i: 0, r: [], fb: '', ok: 1 });
    const fb = st.fb ? '<div class="mg-fb ' + (st.ok ? 'ok' : 'bad') + ' pop">' + esc(st.fb) + '</div>' : '<div class="mg-fb"></div>';
    let n = 0; while (n < st.r.length && st.r[n] === list[n].w) n++;
    if (L.sent || me.ok || st.i >= list.length) {
      return '<div class="mg"><div class="mg-t">Više ili manje</div>' + fb + '<div class="mg-big">' + n + '</div><div class="mg-s">' + (n === list.length ? 'Savršen niz! Bonus +200' : 'točnih zaredom') + '</div><div class="waiting">Čekamo ostale…</div></div>';
    }
    const x = list[st.i];
    return '<div class="mg"><div class="mg-t">Više ili manje</div><div class="mg-s">Niz: <b>' + n + '</b> · ' + (st.i + 1) + '/' + list.length + '</div><div class="mg-q">' + esc(x.q) + '</div>' +
      '<div class="mg-two">' + x.a.map((a, k) => '<button class="mg-btn" data-hl="' + k + '">' + esc(a) + '</button>').join('') + '</div>' + fb + '</div>';
  }
  function blitzPhone(d, me) {
    const list = d.bz.list, st = L.bz || (L.bz = { i: 0, r: [], ok: 0, bad: 0, fb: '', last: 1 });
    const fb = st.fb ? '<div class="mg-fb ' + (st.last ? 'ok' : 'bad') + ' pop">' + esc(st.fb) + '</div>' : '<div class="mg-fb"></div>';
    const cnt = '<div class="mg-s">✓ <b>' + st.ok + '</b> · ✗ <b>' + st.bad + '</b> · bodovi <b>' + Math.max(0, st.ok * 100 - st.bad * 50) + '</b></div>';
    if (L.sent || me.ok || st.i >= list.length) return '<div class="mg"><div class="mg-t">Munjeviti krug</div>' + cnt + '<div class="waiting">Gotovo! Čekamo kraj kruga…</div></div>';
    return '<div class="mg"><div class="mg-t">Munjeviti krug</div>' + cnt + '<div class="mg-q">' + esc(list[st.i][0]) + '</div><div class="mg-tf"><button class="btn" data-bz="1">Točno</button><button class="btn ghost" data-bz="0">Netočno</button></div>' + fb + '</div>';
  }
  function ulRole() {
    const u = PV && PV.ul;
    if (!u) return '';
    return u.imp ? '<div class="ul-role imp">🕵️ Tvoja uloga: uljez<small>Ne znaš temu. Pokušaj se uklopiti!</small></div>' : '<div class="ul-role"><small>Tema</small><b>' + esc(u.th) + '</b></div>';
  }
  function ulPick(d, me) {
    const sent = !!(L.sent || me.ok), sel = L.ulSel || [];
    return '<div class="mg"><div class="mg-t">Uljez u krčmi</div><div class="mg-s">Odaberi dva pojma koji najbolje paše uz temu.</div>' + ulRole() +
      '<div class="ul-grid">' + d.ul.t.map((w, i) => '<button class="ul-t' + (sel.includes(i) ? ' on' : '') + '" data-ul="' + i + '"' + (sent ? ' disabled' : '') + '>' + esc(w) + '</button>').join('') + '</div>' +
      (sent ? '<div class="waiting">Izbor poslan ✔</div>' : '<button class="btn" id="ulOk"' + (sel.length === 2 ? '' : ' disabled') + '>Potvrdi izbor (' + sel.length + '/2)</button>') + '</div>';
  }
  function ulChips(u, pk, mark) {
    if (!pk || !pk.length) return '<span class="ul-chip none">bez izbora</span>';
    return pk.map((i) => '<span class="ul-chip' + (mark ? (u.ok[i] ? ' ok' : ' bad') : '') + '">' + esc(u.t[i]) + '</span>').join('');
  }
  function ulRows(d, vote) {
    const u = d.ul;
    return '<div class="ul-rows">' + d.P.filter((p) => p.c && !(vote && p.id === PID)).map((p) => {
      const inner = '<span class="mini">' + avSvg(p.a) + '</span><span class="ul-nm">' + esc(p.n) + '</span><span class="ul-ch">' + ulChips(u, (u.pk || {})[p.id], false) + '</span>';
      return vote ? '<button class="ul-row' + (L.sent && L.sent.v === p.id ? ' set' : '') + '" data-ulv="' + esc(p.id) + '"' + (L.sent || (meOf(d) || {}).ok ? ' disabled' : '') + '>' + inner + '</button>' : '<div class="ul-row">' + inner + '</div>';
    }).join('') + '</div>';
  }
  function ulVote(d, me) {
    const sent = !!(L.sent || me.ok), mine = (d.ul.pk || {})[PID];
    return '<div class="mg"><div class="mg-t">Tko je uljez?</div><div class="mg-s">Dodirni osobu koju najviše sumnjičiš.</div>' + ulRole() +
      (mine ? '<div class="mg-s">Tvoj izbor: ' + ulChips(d.ul, mine, false) + '</div>' : '') + ulRows(d, true) + (sent ? '<div class="waiting">Glas poslan ✔</div>' : '') + '</div>';
  }
  function ulReveal(d) {
    const u = d.ul, im = d.P.find((p) => p.id === u.imp);
    return '<div class="ul-theme">Tema: <b>' + esc(u.th) + '</b></div><div class="ul-who">Uljez: <b>' + esc(im ? im.n : '?') + '</b> · ' + (u.caught ? 'razotkriven' : 'neotkriven') + '</div><div class="ul-rows">' +
      d.P.map((p) => '<div class="ul-row' + (p.id === u.imp ? ' imp' : '') + '"><span class="mini">' + avSvg(p.a) + '</span><span class="ul-nm">' + esc(p.n) + (p.id === u.imp ? ' 🕵️' : '') + '</span><span class="ul-ch">' + ulChips(u, (u.pk || {})[p.id], true) + '</span><b class="ul-v" title="glasova">🗳️ ' + ((u.cnt || {})[p.id] || 0) + '</b></div>').join('') + '</div>';
  }
  function majPhone(d, me) {
    const m = d.mj, sent = !!(L.sent || me.ok);
    return '<div class="mg"><div class="mg-t">Što misli većina?</div><div class="mg-s">Pitanje ' + (m.i + 1) + '/' + m.n + ' · pogodi što će većina izabrati</div><div class="mg-q">' + esc(m.q.q) + '</div><div class="mg-list">' +
      m.q.o.map((o, i) => '<button class="mg-btn' + (L.sent && L.sent.v === i ? ' set' : '') + '" data-mj="' + i + '"' + (sent ? ' disabled' : '') + '><span class="n">' + String.fromCharCode(65 + i) + '</span>' + esc(o) + '</button>').join('') + '</div>' +
      (sent ? '<div class="waiting">Glas poslan ✔</div>' : '') + '</div>';
  }
  function majBars(d, meV) {
    const m = d.mj, tot = m.cnt.reduce((a, b) => a + b, 0) || 1;
    return '<div class="mj-bars">' + m.q.o.map((o, i) => '<div class="mj-bar' + (m.win.includes(i) ? ' win' : '') + (meV === i ? ' me' : '') + '" style="--w:' + Math.round((m.cnt[i] / tot) * 100) + '%"><i></i><span>' + esc(o) + '</span><b>' + m.cnt[i] + '</b></div>').join('') + '</div>';
  }
  function chalReveal(d, me, title, sol, res, detail) {
    return '<div class="mg"><div class="mg-t">' + title + '</div>' + (sol || '') + '<div class="result ' + (me.g ? 'ok' : 'none') + '"><div class="p-title">' + res + '</div><div class="pts">+' + (me.g || 0) + '</div><div class="score-detail">' + detail + ' bodova</div></div></div>' +
      (d.ntv ? miniBoard(d, true) : rankStat(d, me)) + tdLine(d);
  }
  function betPhone(d, me) {
    const cat = d.cats && d.cw >= 0 ? esc(d.cats[d.cw]) : '';
    const top = '<i hidden data-bk="betss" data-bv="' + (L.sent || me.ok ? 'done' : 'pick') + '" data-ba="subIn" data-bt="app"></i><div class="bet"><div class="bet-t">Kladionica</div><div class="bet-sub">Koliko bodova ulažeš da ćeš <b>točno</b> odgovoriti na sljedeće pitanje' + (cat ? ' (' + cat + ')' : '') + '?</div>' + timerHtml();
    if (L.sent || me.ok) {
      const b = me.bt !== undefined ? me.bt : L.sent && L.sent.b === -1 ? me.sc : Math.min(L.sent ? L.sent.b : 0, me.sc);
      return top + '<div class="bet-done">' + (b > 0 ? 'Uložio si <b>' + b + '</b> bodova' : 'Bez uloga ovaj put') + '</div><div class="bet-rule">Čekamo ostale…</div></div>';
    }
    const opt = (v, lab, cls) => { const dis = v > 0 && v > me.sc || (v === -1 && me.sc <= 0); return '<button class="btn ghost' + (cls ? ' ' + cls : '') + '" data-bet="' + v + '"' + (dis ? ' disabled' : '') + '>' + lab + '</button>'; };
    return top + '<div class="bet-have">Imaš <b>' + me.sc + '</b> bodova</div><div class="bet-opts">' + opt(100, '100') + opt(300, '300') + opt(500, '500') + opt(-1, 'Sve<small>' + me.sc + '</small>', 'all') + opt(0, 'Bez uloga', 'none') + '</div>' +
      '<div class="bet-rule">Točan odgovor: <b>dobivaš ulog</b>. Netočan ili bez odgovora: gubiš ulog.' + (me.bm > 1 ? '<br>Zadnji si: dobitak vrijedi <b>×1.5</b>!' : '') + '</div></div>';
  }
  function botWord(n) { return n + (n < 5 ? ' bota' : ' botova'); }
  // samo domaćin (igra je lokalna): − broj +
  const LEN_UI = { brza: ['⚡', 'Brza', '8–10 min', 2], std: ['⚔️', 'Standardna', '13–17 min', 3], duga: ['👑', 'Duga', '20–25 min', 4] };
  const rundeW = (n) => n + (n === 1 ? ' runda' : n < 5 ? ' runde' : ' rundi');
  // ===================== KRČMAROVO PRIJESTOLJE: prikaz =====================
  // dvorana: vođa sjedi na prijestolju (CSS: naslon od baršuna u zlatnom okviru, sjedalo, kruna), izazivači stoje oko njega
  function throneHtml(d, o) {
    o = o || {};
    const th = d.th || {}, ps = d.P.slice().sort((a, b) => b.sc - a.sc), leadId = th.lead || (ps[0] && ps[0].sc > 0 ? ps[0].id : null);
    const king = d.P.find((p) => p.id === leadId), court = ps.filter((p) => p !== king);
    const chg = th.ch && th.ch.to === leadId && (d.ph === 'reveal');
    const kingH = king ? '<div class="th-king' + (chg ? ' th-new' : '') + (king.id === PID ? ' me' : '') + '">' + avSvg(king.a, d.ph === 'final' || chg ? 'victory' : 'happy') + '</div>' : '<div class="th-king th-empty"></div>';
    const nm = king ? '<div class="th-name"><b>' + esc(king.n) + '</b><span>' + fmtN(king.sc) + '</span></div>' : '<div class="th-name"><b>Prijestolje čeka</b></div>';
    const courtH = '<div class="th-court">' + court.map((p, i) => '<div class="th-ch' + (p.id === PID ? ' me' : '') + (chg && th.ch.from === p.id ? ' th-old' : '') + '" style="--i:' + i + '"><span class="th-av">' + avSvg(p.a, chg && th.ch.from === p.id ? 'sad' : 'idle') + '</span><b>' + esc(p.n) + '</b><span>' + fmtN(p.sc) + '</span></div>').join('') + '</div>';
    const left = th.n ? Math.max(0, th.n - (th.q || 0)) : 0;
    const qH = o.noq ? '' : '<div class="th-q">' + (th.tie ? 'Izjednačenje!' : d.ph === 'final' ? 'Kraj' : (th.q || 0) === 0 ? th.n + ' pitanja' : 'Pitanje ' + th.q + '/' + th.n + (left ? ' · još ' + left : '')) + '</div>';
    return '<div class="throne-hall' + (o.mini ? ' mini' : '') + '"><div class="th-stage"><div class="th-glow"></div><div class="th-seat"><div class="th-back"></div><div class="th-arm l"></div><div class="th-arm r"></div><div class="th-base"></div>' +
      '<div class="th-crown' + (chg ? ' th-drop' : '') + '"><i></i></div>' + kingH + '</div>' + nm + '</div>' + qH + (o.mini ? '' : courtH) + '</div>';
  }
  // odabir završetka u postavkama predvorja (samo domaćin; ostali vide odabrani)
  const END_UI = { pyr: ['🏔️', 'Piramida', 'Utrka do vrha! Osvojeni bodovi određuju početnu poziciju.'], throne: ['👑', 'Krčmarovo prijestolje', 'Sačuvaj bodove! U završnom obračunu pobjeđuje najbogatiji.'] };
  function endPick(d) {
    const cur = (d.opt && d.opt.end) || 'pyr', U = END_UI[cur] || END_UI.pyr;
    if (!game) return '<div class="len-info">' + U[0] + ' Završetak: ' + U[1] + '</div>';
    return '<div class="lob-end" role="radiogroup" aria-label="Završetak igre">' + ['pyr', 'throne'].map((k) => { const u = END_UI[k];
      return '<button class="end-c' + (k === cur ? ' on' : '') + '" data-end="' + k + '" role="radio" aria-checked="' + (k === cur) + '"><span class="end-n"><span aria-hidden="true">' + u[0] + '</span> ' + u[1] + '</span><span class="end-s">' + u[2] + '</span></button>'; }).join('') + '</div>';
  }
  document.addEventListener('click', (e) => { const b = e.target && e.target.closest && e.target.closest('[data-end]'); if (!b || !game) return; AUDIO.play('tap'); game.setOpt('end', b.dataset.end); });
  // posljednji rizik: tri jasne opcije, jedan dodir (bez dodatne potvrde)
  const RISK_UI = [['🛡️', 'Sigurno', 'Bez uloga'], ['⚔️', 'Hrabro', 'Ulog'], ['🔥', 'Sve ili ništa', 'Ulog']];
  function riskPhone(d, me) {
    const th = d.th || {}, R = th.risk || [0, 1000, 3000], mine = L.sent ? L.sent.r : PV && PV.trk != null && me.ok ? PV.trk : null, done = !!(L.sent || me.ok);
    const cards = RISK_UI.map((u, i) => { const st = Math.min(me.sc || 0, R[i] || 0);
      return '<button class="risk-c r' + i + (mine === i ? ' on' : '') + (done && mine !== i ? ' dim' : '') + '" data-trk="' + i + '"' + (done ? ' disabled' : '') + '><span class="risk-i" aria-hidden="true">' + u[0] + '</span><span class="risk-t"><b>' + u[1] + '</b><small>' +
        (i === 0 ? u[2] : u[2] + ' ' + fmtN(st) + (st < R[i] ? ' (sve što imaš)' : '')) + '</small></span></button>'; }).join('');
    return '<div class="risk"><div class="p-title">Posljednji rizik</div><div class="p-sub">Biraš tajno. Točno: +ulog. Netočno ili bez odgovora: −ulog.</div>' + throneHtml(d, { mini: 1, noq: 1 }) +
      '<div class="risk-list">' + cards + '</div><div class="waiting">' + (done ? 'Odluka zaključana ✔ Čekamo ostale…' : 'Bez odabira = Sigurno') + '</div></div>';
  }
  function riskTv(d) {
    return '<div class="tv-mid" style="justify-content:center"><div class="tv-title">Posljednji rizik</div><div class="tv-sub">Svatko tajno bira ulog za zadnje pitanje (do 3.000 bodova)</div>' + throneHtml(d) + lineup(d, { check: true }) + '</div>';
  }
  function bindRisk() { document.querySelectorAll('#app [data-trk]').forEach((b) => { b.onclick = () => { if (L.sent) return; AUDIO.play('tap'); sendInput({ r: +b.dataset.trk }); }; }); }
  // ---------- odabir kategorija ----------
  function catFew(d) { return !!(game && d.opt && d.opt.all && d.opt.all.length - (d.opt.off || []).length < 4); }
  let catGame = null, catTimer = 0;
  function catSave(off) { try { localStorage.setItem('tt_cats_off', JSON.stringify(off)); } catch (e) {} }
  function catLoad() { try { const v = JSON.parse(localStorage.getItem('tt_cats_off') || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch (e) { return []; } }
  function catPick(d) {
    if (!d.opt || !d.opt.all) return '';
    const all = d.opt.all, off = d.opt.off || [], n = all.length - off.length;
    if (!game) return off.length ? '<div class="len-info">🗂️ Kategorije: ' + n + ' od ' + all.length + '</div>' : '';
    if (catGame !== game) { // zapamćeni odabir s prošle igre primijeni jednom po sobi
      catGame = game; const g = game, saved = catLoad();
      if (saved.length) setTimeout(() => { if (game === g && g.view().ph === 'lobby') g.setOpt('cats', saved); }, 0);
    }
    return '<button class="btn ghost cat-open' + (n < 4 ? ' cat-bad' : '') + '" id="catOpen" aria-haspopup="dialog">🗂️ Kategorije · ' + n + ' od ' + all.length + '</button>';
  }
  // ---------- odabir mini-igara ----------
  let mgGame = null, mgTimer = 0;
  function mgSave(off) { try { localStorage.setItem('tt_mg_off', JSON.stringify(off)); } catch (e) {} }
  function mgLoad() { try { const v = JSON.parse(localStorage.getItem('tt_mg_off') || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch (e) { return []; } }
  function mgPick(d) {
    if (!d.opt || !d.opt.mg) return '';
    const all = d.opt.mg, off = d.opt.mgOff || [], n = all.length - off.length;
    if (!game) return off.length ? '<div class="len-info">🎲 Mini igre: ' + n + ' od ' + all.length + '</div>' : '';
    if (mgGame !== game) {
      mgGame = game; const g = game, saved = mgLoad();
      if (saved.length) setTimeout(() => { if (game === g && g.view().ph === 'lobby') g.setOpt('mg', saved); }, 0);
    }
    return '<button class="btn ghost cat-open" id="mgOpen" aria-haspopup="dialog">🎲 Mini igre · ' + n + ' od ' + all.length + '</button>';
  }
  function mgOvClose() { const ov = document.getElementById('mgOv'); if (ov) ov.remove(); clearInterval(mgTimer); mgTimer = 0; }
  function mgOvSync() {
    const ov = document.getElementById('mgOv'); if (!ov) return;
    if (!game || game.view().ph !== 'lobby') return mgOvClose();
    const o = game.view().opt, off = o.mgOff || [], n = o.mg.length - off.length;
    ov.querySelectorAll('[data-mg]').forEach((b) => { const on = off.indexOf(b.dataset.mg) < 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    ov.querySelector('.cat-cnt').textContent = n + ' od ' + o.mg.length + ' uključeno';
  }
  function mgOvOpen() {
    if (!game || document.getElementById('mgOv')) return;
    const o = game.view().opt; if (!o || !o.mg) return;
    const chip = (m) => '<button class="cat-chip" data-mg="' + esc(m[0]) + '" aria-pressed="true">' + m[1] + ' ' + esc(m[2]) + '</button>';
    const ov = document.createElement('div'); ov.id = 'mgOv'; ov.className = 'inv-modal cat-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Odabir mini igara');
    ov.innerHTML = '<div class="inv-card cat-card"><div class="cat-top"><b>Mini igre</b><span class="cat-cnt"></span></div>' +
      '<div class="cat-bulk"><button class="btn ghost" data-mgall="1">Sve</button></div>' +
      '<div class="cat-grid">' + o.mg.filter((m) => m[3]).map(chip).join('') + '</div>' +
      '<div class="cat-top"><b>Posebna pitanja</b></div><div class="cat-grid mg-var">' + o.mg.filter((m) => !m[3]).map(chip).join('') + '</div>' +
      '<div class="cat-hint" role="status"></div><button class="btn lob-cta" id="mgDone">Gotovo</button></div>';
    document.body.appendChild(ov); mgOvSync();
    mgTimer = setInterval(mgOvSync, 1000);
  }
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target : null; if (!t || !game) return;
    if (t.closest('#mgOpen')) { AUDIO.play('tap'); return mgOvOpen(); }
    if (t.closest('#mgDone')) { AUDIO.play('tap'); return mgOvClose(); }
    if (t.closest('[data-mgall]')) { AUDIO.play('tap'); game.setOpt('mg', []); mgSave([]); return mgOvSync(); }
    const b = t.closest('#mgOv [data-mg]');
    if (b) {
      AUDIO.play('tap'); const o = game.view().opt, off = (o.mgOff || []).slice(), i = off.indexOf(b.dataset.mg);
      if (i >= 0) off.splice(i, 1);
      else {
        const left = o.mg.filter((m) => m[3] && off.indexOf(m[0]) < 0 && m[0] !== b.dataset.mg).length;
        const isCh = o.mg.some((m) => m[0] === b.dataset.mg && m[3]);
        if (isCh && !left) { const h = document.querySelector('#mgOv .cat-hint'); if (h) h.textContent = 'Barem jedna mini igra mora ostati uključena.'; return; }
        off.push(b.dataset.mg);
      }
      game.setOpt('mg', off); mgSave(off); const h = document.querySelector('#mgOv .cat-hint'); if (h) h.textContent = ''; mgOvSync();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('mgOv')) mgOvClose(); });
  function catOvClose() { const ov = document.getElementById('catOv'); if (ov) ov.remove(); clearInterval(catTimer); catTimer = 0; }
  function catOvSync() {
    const ov = document.getElementById('catOv'); if (!ov) return;
    if (!game || game.view().ph !== 'lobby') return catOvClose();
    const o = game.view().opt, off = o.off || [], n = o.all.length - off.length;
    ov.querySelectorAll('[data-cat]').forEach((b) => { const on = off.indexOf(b.dataset.cat) < 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    ov.querySelector('.cat-cnt').textContent = n + ' od ' + o.all.length + ' uključeno';
    ov.querySelector('.cat-hint').textContent = n < 4 ? 'Uključi barem 4 kategorije da bi igra mogla početi.' : '';
    ov.querySelector('#catDone').disabled = n < 4;
  }
  function catOvOpen() {
    if (!game || document.getElementById('catOv')) return;
    const o = game.view().opt; if (!o || !o.all) return;
    const ov = document.createElement('div'); ov.id = 'catOv'; ov.className = 'inv-modal cat-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Odabir kategorija');
    ov.innerHTML = '<div class="inv-card cat-card"><div class="cat-top"><b>Kategorije</b><span class="cat-cnt"></span></div>' +
      '<div class="cat-bulk"><button class="btn ghost" data-catall="1">Sve</button><button class="btn ghost" data-catall="0">Nijedna</button></div>' +
      '<div class="cat-grid">' + o.all.map((c) => '<button class="cat-chip" data-cat="' + esc(c) + '" aria-pressed="true">' + esc(c) + '</button>').join('') + '</div>' +
      '<div class="cat-hint" role="status"></div><button class="btn lob-cta" id="catDone">Gotovo</button></div>';
    document.body.appendChild(ov); catOvSync();
    catTimer = setInterval(catOvSync, 1000);
  }
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target : null; if (!t || !game) return;
    if (t.closest('#catOpen')) { AUDIO.play('tap'); return catOvOpen(); }
    if (t.closest('#catDone')) { AUDIO.play('tap'); return catOvClose(); }
    const all = t.closest('[data-catall]');
    if (all) { AUDIO.play('tap'); const o = game.view().opt; const off = all.dataset.catall === '1' ? [] : o.all.slice(); game.setOpt('cats', off); catSave(off); return catOvSync(); }
    const b = t.closest('#catOv [data-cat]');
    if (b) { AUDIO.play('tap'); const o = game.view().opt, off = (o.off || []).slice(), i = off.indexOf(b.dataset.cat); if (i >= 0) off.splice(i, 1); else off.push(b.dataset.cat); game.setOpt('cats', off); catSave(off); catOvSync(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('catOv') && game && game.view().opt && game.view().opt.all.length - (game.view().opt.off || []).length >= 4) catOvClose(); });
  function lenPick(d) {
    const cur = (d.opt && d.opt.len) || 'std', U = LEN_UI[cur] || LEN_UI.std;
    if (!game) return '<div class="len-info">' + U[0] + ' ' + U[1] + ' partija · ' + U[2] + ' · ' + rundeW(U[3]) + '</div>';
    return '<div class="lob-len" role="radiogroup" aria-label="Trajanje partije">' + ['brza', 'std', 'duga'].map((k) => { const u = LEN_UI[k];
      return '<button class="len-c' + (k === cur ? ' on' : '') + '" data-len="' + k + '" role="radio" aria-checked="' + (k === cur) + '"><span class="len-n"><span aria-hidden="true">' + u[0] + '</span><span class="len-label">' + u[1] + '</span></span><span class="len-m">' + u[2] + '</span><span class="len-r">' + rundeW(u[3]) + '</span></button>'; }).join('') + '</div>';
  }
  document.addEventListener('click', (e) => { const b = e.target && e.target.closest && e.target.closest('[data-len]'); if (!b || !game) return; AUDIO.play('tap'); game.setOpt('len', b.dataset.len); });
  function pactToggle(d) {
    if (!d.opt) return '';
    if (!game) return d.opt.pacts ? '<div class="lob-info">🍻 Tajni paktovi su uključeni (od 3 prava igrača)</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l">🍻 Tajni paktovi<small>Savezi, zajednička riznica i izdaje (od 3 prava igrača)</small></span><button class="tgl' + (d.opt.pacts ? '' : ' off') + '" data-popt="' + (d.opt.pacts ? 0 : 1) + '">' + (d.opt.pacts ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
  function bindOpt() { document.querySelectorAll('#app [data-popt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('pacts', b.dataset.popt === '1'); } }; });
    document.querySelectorAll('#app [data-rcopt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('rc', b.dataset.rcopt === '1'); } }; });
    document.querySelectorAll('#app [data-bsopt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('bs', b.dataset.bsopt === '1'); } }; });
    document.querySelectorAll('#app [data-tkopt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('tk', b.dataset.tkopt === '1'); } }; }); }
  function botStepper(d) {
    const nb = d.P.filter((p) => p.b).length, room = d.max - d.P.length;
    return '<div class="lob-bots"><span class="lob-bots-l"><img class="tavern-bot" src="ui/bot-medal.webp" alt="" aria-hidden="true"> Botovi<small>Pravi igrači imaju prednost pri odabiru likova</small></span>' +
      '<span class="lob-bots-c"><button class="bstep" data-bots="-1" aria-label="Manje botova"' + (nb < 1 ? ' disabled' : '') + '>−</button>' +
      '<b>' + nb + '</b><button class="bstep" data-bots="1" aria-label="Više botova"' + (room < 1 ? ' disabled' : '') + '>+</button></span></div>';
  }
  function bindBots(d) {
    document.querySelectorAll('#app [data-bots]').forEach((b) => { b.onclick = () => {
      if (!game) return; const nb = d.P.filter((p) => p.b).length;
      AUDIO.play('tap'); game.setBots(nb + +b.dataset.bots);
    }; });
  }
  // ruleta: svjetlo prelazi preko izjednačenih vrata i usporava dok ne stane na odabranima
  function roulette(d) {
    if (d.ph !== 'voteResult' || !d.tb || d.tb.length < 2) return null;
    const R = d.rd || 2600, D = R + 700, steps = [];
    for (let t = 0, gap = 75; t < R - 120; t += gap, gap = Math.min(430, gap * 1.17)) steps.push(t);
    const n = steps.length, tb = d.tb, ci = Math.max(0, tb.indexOf(d.cw));
    const at = (k) => tb[(((ci - (n - 1 - k)) % tb.length) + tb.length) % tb.length];
    const pc = (ms) => (Math.max(0, Math.min(D, ms)) / D * 100).toFixed(2) + '%';
    let css = '';
    for (const j of tb) {
      let kf = '0%{opacity:0}';
      steps.forEach((st, k) => {
        if (at(k) !== j) return;
        const e = k + 1 < n ? steps[k + 1] : R;
        kf += pc(st - 30) + '{opacity:0}' + pc(st) + '{opacity:1}';
        kf += k + 1 < n ? pc(e + 90) + '{opacity:0}' : pc(R + 250) + '{opacity:1}' + '100%{opacity:0}';
      });
      if (!/100%/.test(kf)) kf += '100%{opacity:0}';
      css += '@keyframes rl' + d.s + 'x' + j + '{' + kf + '}';
    }
    return { R, D, steps, css, has: (i) => tb.includes(i), spot: (i) => tb.includes(i) ? '<i class="spot" style="animation:rl' + d.s + 'x' + i + ' ' + D + 'ms linear both;animation-delay:calc(-1 * var(--pel, 0ms))"></i>' : '' };
  }
  let roulStep = -1;
  function rouletteSound(d) {
    const r = roulette(d); if (!r || roulStep === d.s) return; roulStep = d.s;
    r.steps.forEach((t, k) => setTimeout(() => AUDIO.play('tap'), t + (k ? 0 : 10)));
    setTimeout(() => AUDIO.play('step'), r.R + 40);
  }
  let questionFit = null, phaseFit = null;
  // hodači u otkrivanju: početak = položaj istog lika u (nevidljivom) redu likova
  function walkFromRow() {
    const ws = $app.querySelectorAll('.walker[data-pid]'); if (!ws.length) return;
    const z = parseFloat($app.style.zoom || '1') || 1;
    ws.forEach((w) => {
      const b = $app.querySelector('.bar-row .bw[data-pid="' + (window.CSS && CSS.escape ? CSS.escape(w.dataset.pid) : w.dataset.pid) + '"]'); if (!b) return;
      const an = w.style.animation; w.style.animation = 'none';
      const wr = w.getBoundingClientRect(), img = b.querySelector('.av, svg') || b, br = img.getBoundingClientRect();
      w.style.animation = an;
      const dx = (br.left + br.width / 2 - (wr.left + wr.width / 2)) / z, dy = (br.bottom - wr.bottom) / z;
      w.style.setProperty('--wx', Math.round(dx) + 'px'); w.style.setProperty('--wy', Math.round(dy) + 'px'); w.style.setProperty('--wo', '1');
    });
  }
  // Mjeri puni sadržaj prije prilagodbe; kontrole zvuka imaju vlastiti prostor.
  function fitScreen() {
    const A = $app;
    if (!A || !A.firstElementChild) return;

    A.style.zoom = ''; A.style.removeProperty('--fitz');
    A.style.width = '';
    A.style.maxWidth = '';
    const phone = A.classList.contains('phone');
    if (!phone && !A.classList.contains('tv')) return;
    const bodyStyle = getComputedStyle(document.body);
    const width = innerWidth - parseFloat(bodyStyle.paddingLeft) - parseFloat(bodyStyle.paddingRight);
    A.style.width = Math.min(phone ? 520 : 1600, width) + 'px';
    const top = A.getBoundingClientRect().top;
    const controls = document.querySelector('#mute').getBoundingClientRect();
    const available = Math.max(1, controls.top - top - 8);
    const targetWidth = Math.min(phone ? 520 : 1600, width);
    A.style.maxWidth = 'none';
    const measure = (scale) => {
      A.style.zoom = scale.toFixed(4); A.style.setProperty('--fitz', scale.toFixed(4));
      A.style.width = (targetWidth / scale) + 'px';
      // Izvanjski likovi i animacijske putanje ne mijenjaju veličinu rasporeda.
      return A.getBoundingClientRect().height;
    };
    const key = phone && S && S.q ? [S.code, S.q.n, innerWidth, innerHeight].join(':') : null;
    const pk = S ? [S.s, S.ph, S.ph === 'power' ? (L.pw || '') : S.ph === 'lobby' ? (L.lobPanel || '') : '', innerWidth, innerHeight].join(':') : null;
    const finish = (scale) => {
      // ista faza: ne raste natrag, a sitna razlika (do 3 %) ne mijenja mjerilo; jače smanjenje samo ako sadržaj stvarno ne stane
      if (phaseFit && phaseFit.key === pk) scale = scale >= phaseFit.scale * 0.97 ? phaseFit.scale : scale;
      if (phone && S && S.ph === 'reveal' && questionFit && questionFit.key === key) scale = scale >= questionFit.scale * 0.98 ? questionFit.scale : Math.min(scale, questionFit.scale);
      measure(scale);
      if (phone && S && S.ph === 'question') questionFit = { key, scale };
      phaseFit = { key: pk, scale };
    };
    if (phone) {
      if (S && ['sortReveal', 'linkReveal', 'orderReveal'].includes(S.ph)) {
        const solution = A.querySelector(S.ph === 'orderReveal' ? '.mg-list' : S.ph === 'linkReveal' ? '.pairs' : '.sort-cols');
        if (solution) {
          solution.style.maxHeight = ''; solution.classList.remove('solution-scroll');
          const over = measure(1) - available;
          if (over > 1) {
            solution.style.maxHeight = Math.max(88, Math.floor(solution.getBoundingClientRect().height - over - 4)) + 'px';
            solution.classList.add('solution-scroll');
            solution.setAttribute('aria-label', 'Rješenje, pomakni za pregled');
          }
        }
      }
      if (S && S.ph === 'lobby') {
        const players = A.querySelector('.waiting-room .lob-players');
        const panel = A.querySelector('.waiting-room .lob-settings, .waiting-room .av-grid');
        for (const [el, minH, cls] of [[players, 60, 'lob-scroll'], [panel, 96, 'lob-panel-scroll']]) {
          if (!el) continue;
          el.style.maxHeight = ''; el.classList.remove(cls);
          const over = measure(1) - available;
          if (over > 1) {
            el.style.maxHeight = Math.max(minH, Math.floor(el.getBoundingClientRect().height - over - 4)) + 'px';
            el.classList.add(cls);
          }
        }
      }
      // Finalno pitanje: kad je pitanje dulje (širi font), odgovori se skrolaju unutar svog područja umjesto da se smanji cijeli ekran.
      const fqArea = S && S.ph === 'fq' && A.classList.contains('final-question') ? A.querySelector(':scope > .q-area') : null;
      if (fqArea) {
        fqArea.style.maxHeight = '';
        const over = measure(1) - available;
        if (over > 1) fqArea.style.maxHeight = Math.max(112, Math.floor(fqArea.getBoundingClientRect().height - over - 4)) + 'px';
      }
      // Dugačak izbor moći ili igrača skrola se unutar popisa, umjesto da smanji cijeli ekran.
      const choices = S && S.ph === 'power' && A.querySelector(L.pw ? '.targets' : '.pw-cards');
      if (choices) {
        choices.style.maxHeight = ''; choices.classList.remove('fit-scroll');
        const over = measure(1) - available;
        if (over > 1) {
          const minH = L.pw ? 140 : 150;
          const height = Math.max(minH, Math.floor(choices.getBoundingClientRect().height - over - 4));
          choices.style.maxHeight = height + 'px'; choices.classList.add('fit-scroll');
        }
      }
      const mb = A.querySelector('.mboard');
      if (mb) {
        mb.style.maxHeight = ''; mb.classList.remove('mb-scroll');
        const over = measure(1) - available;
        if (over > 1) {
          const row = mb.querySelector('.rank-row'), minH = row ? row.getBoundingClientRect().height * (A.querySelector('.kr-card') ? 1.3 : 2.6) : 100;
          let mh = mb.getBoundingClientRect().height - over - 4;
          for (let k = 0; k < 3; k++) {   // visina popisa tako da sve ostalo stane bez smanjivanja
            mh = Math.max(minH, Math.floor(mh)); mb.style.maxHeight = mh + 'px'; mb.classList.add('mb-scroll');
            const o2 = measure(1) - available; if (o2 <= 0 || mh <= minH) break; mh -= o2 + 2;
          }
          // moj red ostaje vidljiv (dok igrač sam ne pomakne popis)
          if (!mb.__user) { mb.onscroll = () => { if (mb.__auto) { mb.__auto = 0; return; } mb.__user = 1; };
            // poredak se presloži animacijom: moj red (prema stvarnom, vidljivom položaju) ostaje u vidu
            const keep = () => { if (mb.__user || !mb.isConnected) return false; const me = mb.querySelector('.rank-row.me'); if (!me) return false;
              const z = parseFloat(A.style.zoom || '1') || 1, a = mb.getBoundingClientRect(), c = me.getBoundingClientRect();
              const st = Math.max(0, Math.min(mb.scrollHeight - mb.clientHeight, mb.scrollTop + ((c.top + c.height / 2) - (a.top + a.height / 2)) / z));
              if (Math.abs(mb.scrollTop - st) > 2) { mb.__auto = 1; mb.scrollTop = st; } return true; };
            keep(); clearInterval(mb.__kt); let n = 0; mb.__kt = setInterval(() => { if (!keep() || ++n > 30) clearInterval(mb.__kt); }, 300); }
        }
      }
    }
    if (measure(1) <= available) { finish(1); return; }
    let low = 0.1, high = 1;
    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      if (measure(mid) <= available) low = mid; else high = mid;
    }
    finish(low);
  }
  let fitT = 0; addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(() => { fitScreen(); const area = $app.querySelector('.final-question .q-area'); if (area) area.dispatchEvent(new Event('scroll')); }, 120); });
  // kolo sreće za otkrivanje odgovora: vrijeme šetnje, okretanja i otkrivanja (ms od početka faze)
  const WH = { walk: 1300, spin: 2300 };
  WH.end = WH.walk + WH.spin;
  // vremenska crta otkrivanja za ovu fazu (domaćin određuje tempo: obično / napeto / dramatično)
  function whT(d) { const t = d && d.ph === 'reveal' && d.tl; return t ? { walk: +t[0], spin: +t[1], end: +t[0] + +t[1] } : WH; }
  function wheel(d) {
    const T = whT(d), n = d.q.o.length, R = T.spin, D = R + 600, steps = [];
    // dulje kolo = sporije zaustavljanje (veći zadnji razmaci), kraće kolo = brži prolaz kroz početak
    const cap = Math.max(320, Math.min(600, R * 0.17));
    for (let t = 60, gap = 70; t < R - 100; t += gap, gap = Math.min(cap, gap * 1.13)) steps.push(t);
    const k0 = steps.length, at = (k) => ((((d.cor - (k0 - 1 - k)) % n) + n) % n);
    const pc = (ms) => (Math.max(0, Math.min(D, ms)) / D * 100).toFixed(2) + '%';
    let css = '';
    for (let j = 0; j < n; j++) {
      let kf = '0%{opacity:0}';
      steps.forEach((st, k) => {
        if (at(k) !== j) return;
        const e = k + 1 < k0 ? steps[k + 1] : R;
        kf += pc(st - 25) + '{opacity:0}' + pc(st) + '{opacity:1}' + (k + 1 < k0 ? pc(e + 80) + '{opacity:0}' : pc(R + 350) + '{opacity:1}100%{opacity:0}');
      });
      if (!/100%/.test(kf)) kf += '100%{opacity:0}';
      css += '@keyframes wh' + d.s + 'x' + j + '{' + kf + '}';
    }
    return { css, steps, D, spot: (i) => '<i class="spot whs" style="animation:wh' + d.s + 'x' + i + ' ' + D + 'ms linear both;animation-delay:calc(' + T.walk + 'ms - var(--el, 0ms))"></i>' };
  }
  function walkers(d, i, tv) {
    const who = d.P.filter((p) => p.ch === i);
    if (!who.length) return '';
    return '<span class="rv-who">' + who.map((p) => {
      const k = d.P.indexOf(p), wx = Math.round((k - (d.P.length - 1) / 2) * (tv ? 140 : 60));
      return '<span class="walker' + (p.id === PID ? ' me' : '') + '" data-pid="' + esc(p.id) + '" title="' + esc(p.n) + '" style="--wx:' + wx + 'px;--wd:' + (k * 90) + 'ms"><span class="wbob">' + avSvg(p.a, 'idle') + '</span></span>';
    }).join('') + '</span>';
  }
  let wheelStep = -1;
  function wheelSound(d, fin) {
    if (wheelStep === d.s) return; wheelStep = d.s;
    const el = Math.max(0, d.dur - d.ms), w = wheel(d), T = whT(d);
    if (el < 300) AUDIO.play('whoosh');
    w.steps.forEach((t) => { const at = T.walk + t - el; if (at > 0) setTimeout(() => { if (wheelStep === d.s) AUDIO.play('tap'); }, at); });
    const end = T.end - el; setTimeout(() => { if (wheelStep === d.s) fin(); }, Math.max(0, end + 40));
  }
  function rankStat(d, me) {
    const pos = byScore(d.P).findIndex((p) => p.id === PID) + 1;
    const from = me.sc - (me.g || 0) - (me.ub || 0) - (me.br || 0) - (me.xb || 0) - (me.rx || 0) - (me.tb || 0) - (me.kb || 0) - (me.ob || 0);
    return '<div class="statline"><div class="stat"><b data-bk="pos" data-bv="' + pos + '">' + pos + '.</b><span>mjesto</span></div><div class="stat"><b data-ck="mysc" data-cu="' + from + '" data-to="' + me.sc + '" data-cud="500" data-cdur="900">' + me.sc + '</b><span>bodova</span></div></div>';
  }
  function stepMeter(d, me) {
    let bars = '';
    for (let s = 1; s <= d.steps; s++) bars += '<i class="' + ((me.st || 0) >= s ? 'on' : '') + '" style="width:' + (40 + (d.steps - s) * 18) + 'px"></i>';
    return '<div class="step-meter" aria-label="Stepenica ' + (me.st || 0) + ' od ' + d.steps + '">' + bars + '</div><div class="p-sub">Stepenica ' + (me.st || 0) + ' od ' + d.steps + '</div>';
  }

  function powerPhone(d, me) {
    const offers = me.of || [];
    const card = (k, cls, tag) => '<' + tag + ' class="pw-card ' + (POWERS[k].atk ? 'atk' : 'buff') + (cls || '') + '" data-bk="pw' + k + '" data-bv="' + (cls || '') + '"' + (/sel/.test(cls || '') ? ' data-ba="pickIn"' : /dim/.test(cls || '') ? ' data-ba="dimIn"' : '') + (tag === 'button' ? ' data-p="' + k + '"' : '') + '><span class="pw-ico">' + ICON[k] + '</span><span><b>' + POWERS[k].n + '</b><span>' + pwDesc(k, d) + '</span></span></' + tag + '>';
    const headH = (t, sub) => '<i hidden data-bk="pwss" data-bv="' + t + '" data-ba="subIn" data-bt="app"></i><div class="pw-head"><div class="p-title">' + t + '</div><div class="p-sub">' + sub + '</div></div>';
    if (L.sent || me.ok) {
      const k = L.sent && L.sent.p;
      const note = !L.sent ? 'Odabir zaprimljen · čekamo ostale…' : !k ? 'Bez moći u ovom pitanju · čekamo ostale…'
        : L.sent.t ? '<b>' + POWERS[k].n + '</b> → ' + esc(nameOf(d, L.sent.t)) + ' · čekamo ostale…'
        : '<b>' + (k === 'stit' ? 'Štit aktivan' : POWERS[k].n + ' aktivirani') + '</b> · čekamo ostale…';
      return headH('Odaberi moć', 'Odabir je zaprimljen.') + '<div class="pw-cards">' + offers.map((o) => card(o, !L.sent ? '' : o === k ? ' sel' : ' dim', 'div')).join('') + '</div><div class="pw-note">' + note + '</div>';
    }
    if (L.pw) {
      const others = d.P.filter((p) => p.id !== PID && p.c);
      return headH(L.pw === 'oklada' ? 'Na koga se kladiš?' : 'Odaberi metu', L.pw === 'oklada' ? 'Ako oboje točno odgovorite, dobivaš i njegove bodove. Nitko neće znati na koga.' : 'Na koga bacaš ovu moć?') + '<div class="pw-step">' + card(L.pw, ' sel', 'div') + '</div>' +
        '<div class="targets pw-step">' + others.map((p) => '<button class="target" data-t="' + esc(p.id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + '</span></button>').join('') + '</div>' +
        '<button class="btn ghost" id="pwback">Natrag</button>';
    }
    return headH('Odaberi moć', 'Odaberi jednu od tri ponuđene moći.') + '<div class="pw-cards">' + offers.map((k) => card(k, '', 'button')).join('') + '</div><button class="btn ghost" id="nopw">Preskoči</button>';
  }

  function questionPhone(d, me) {
    const answered = L.sent || me.ok;
    const mine = L.sent ? L.sent.c : -1;
    const hide = me.h || [];
    const locked = !answered && !L.fx && Date.now() < (L.lockUntil || 0);
    const buffs = (me.uc ? '<span class="tag">Novčić utjehe</span>' : '') + (me.d ? '<span class="tag">×2 Dupli bodovi</span>' : '') + (me.sh ? '<span class="tag">🛡️ Štit</span>' : '') + (hide.length ? '<span class="tag">✂️ Pola-pola</span>' : '') + (me.bt ? '<span class="tag betag">Ulog ' + me.bt + '</span>' : '') + (PV && PV.okl ? '<span class="tag">🎲 Oklada: ' + esc(nameOf(d, PV.okl)) + '</span>' : '');
    const opts = d.q.o.map((o, i) => {
      const gone = hide.includes(i);
      let cls = 'p-opt o' + i + (gone ? ' gone' : '') + (locked ? ' locked' : '');
      if (answered && !gone) cls += mine === i ? ' picked' : ' dim';
      const st = answered && !gone ? (mine === i ? 'picked' : 'dim') : '';
      return '<button class="' + cls + '" data-c="' + i + '" data-bk="op' + i + '" data-bv="' + st + '"' + (st ? ' data-ba="' + (st === 'picked' ? 'pickIn' : 'dimIn') + '"' : '') + (answered || gone ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span class="otxt">' + optText(o, i) + '</span>' + sfOptX(d, i, answered, gone) + '</button>';
    }).join('');
    const attackers = (d.ev || []).filter((e) => e.t === PID);
    const hit = attackers.length ? '<div class="p-sub">' + attackers.map((e) => esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + (e.cap ? ' (limit napada)' : e.b ? ' (odbijeno štitom)' : '')).join(' · ') + '</div>' : '';
    return timerHtml() + '<div class="p-top"><span class="pill">' + esc(d.q.c) + '</span><span id="tnum">' + (clockDur ? Math.ceil(timerNow().ms / 1000) : '') + '</span></div>' +
      qTextHtml(d, false) + (buffs ? '<div class="buffs">' + buffs + '</div>' : '') + hit +
      '<div class="q-area"><div class="p-opts">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx) + bombLayer()) + '</div>' + boomCover() +
      '<div class="waiting" data-bk="qwait" data-ba="subIn">' + (answered ? 'Odgovor zaprimljen ✔' : L.fx ? '' : locked ? 'Očišćeno! Odgovori se otključavaju…' : L.bombs && L.bombs.some((b) => b.on) ? '💣 Izbjegni bombe!' : 'Brže = više bodova!') + '</div>';
  }

  function revOpts(d, mine, tv) {
    return '<div class="rv-opts' + (tv ? ' opts' : '') + '">' + d.q.o.map((o, i) => {
      const c = i === d.cor ? ' rv-ok' + (mine === i ? ' mine' : '') : mine === i ? ' rv-bad' : ' rv-dim';
      const wh = d.ph === 'reveal';
      return '<div class="' + (tv ? 'opt' : 'p-opt') + ' o' + i + c + '">' + (wh ? wheel(d).spot(i) : '') + '<span class="shape">' + SHAPES[i] + '</span><span class="' + (tv ? 'txt' : 'otxt') + '">' + esc(o) + '</span>' + (wh ? walkers(d, i, tv) : '') + (tv && d.cnt ? '<span class="cnt">' + d.cnt[i] + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function revBoard(d, el) {
    const r = d.P.slice().sort((a, b) => b.sc - a.sc), before = d.P.slice().sort((a, b) => (b.sc - (b.g || 0) - (b.ub || 0) - (b.br || 0) - (b.xb || 0) - (b.rx || 0) - (b.tb || 0) - (b.kb || 0) - (b.ob || 0)) - (a.sc - (a.g || 0) - (a.ub || 0) - (a.br || 0) - (a.xb || 0) - (a.rx || 0) - (a.tb || 0) - (a.kb || 0) - (a.ob || 0)));
    const newLead = r.length > 1 && before[0] && r[0].id !== before[0].id && (r[0].g || r[0].ub) > 0 ? r[0] : null;
    const off = d.ph === 'reveal' ? whT(d).end : 0, done = el > 2550 + off, delay = done ? 'x' : 1950 + off - el;
    return { html: miniBoard(d, done ? true : 2000 + off).replace('<div class="mboard', '<div data-delay="' + delay + '" class="mboard'), lead: newLead };
  }
  // nakon otkrivanja: "+N" se odvoji od broja bodova i odleti u HUD, HUD se kratko "primi"
  // za automatske testove (ne utječe na igru)
  window.__dbg = { get L() { return L; }, makeFx: (k) => makeFx(k), phoneRender: (f) => phoneRender(f) };
  function flyPoints(s0, g, d) {
    setTimeout(() => {
      if (L.s !== s0) return;
      const from = document.querySelector('.rv .rv-pts'), to = document.querySelector('.p-top > span:last-child');
      if (!from || !to) return;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const f = document.createElement('div');
      f.className = 'pts-fly'; f.textContent = '+' + g;
      f.style.left = a.left + a.width / 2 + 'px'; f.style.top = a.top + a.height / 2 + 'px'; f.style.fontSize = getComputedStyle(from).fontSize;
      document.body.appendChild(f);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const done = () => { f.remove(); if (L.s !== s0) return; const h = document.querySelector('.p-top > span:last-child'); if (h) { h.classList.remove('hud-bump'); void h.offsetWidth; h.classList.add('hud-bump'); } AUDIO.play('score'); };
      if (!f.animate || reduceMotion) { done(); return; }
      f.animate([
        { transform: 'translate(-50%, -50%)', opacity: 0 },
        { transform: 'translate(-50%, calc(-50% - 10px))', opacity: 1, offset: 0.25 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.45)', opacity: 0.2 },
      ], { duration: 700, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' }).onfinish = done;
    }, 1500 + whT(d).end);
  }
  function revealPhone(d, me) {
    const el = Math.max(0, d.dur - d.ms), ok = me.ch === d.cor, none = me.ch < 0;
    const pts = '<div class="rv-pts' + ((me.g || me.ub) ? '' : ' zero') + '">+' + ((me.g || 0) + (me.ub || 0)) + ' <small>bodova</small>' + (me.d && me.g ? '<span class="x2">×2</span>' : '') + (me.ub ? '<span class="x2"> Novčić utjehe</span>' : '') + '</div>';
    const b = revBoard(d, el);
    const sum = (none ? 'Vrijeme je isteklo · <b>+0</b>' : ok ? 'Točno! <b>+' + me.g + '</b>' + (me.d ? ' (×2)' : '') : me.ub ? 'Netočno · <b>+' + me.ub + '</b> (Novčić utjehe)' : 'Netočno · <b>+0</b>') + (me.br ? ' · ulog <b>' + (me.br > 0 ? '+' : '−') + Math.abs(me.br) + '</b>' : '');
    const wh = wheel(d);
    return '<div class="timer spent" aria-hidden="true"><div style="width:0"></div></div><div class="p-top"><span class="pill">' + esc(d.q.c) + '</span><span aria-hidden="true">0</span></div><style>' + wh.css + '</style><div class="rv wheel" style="--el:' + el + 'ms;--rvo:' + whT(d).end + 'ms;--rvw:' + whT(d).walk + 'ms">' +
      '<div class="rv-a">' + qTextHtml(d, false) + revOpts(d, me.ch, false) + pts + (me.br ? '<div class="rv-bet' + (me.br < 0 ? ' neg' : '') + '">Ulog: ' + (me.br > 0 ? '+' : '−') + Math.abs(me.br) + '</div>' : '') + secretRevealLine(d, me) + '</div>' +
      '<div class="rv-b">' + (d.th ? throneHtml(d, { mini: 1 }) : '') + '<div class="rv-sum">' + sum + '</div>' + secretPublicLine(d, me) + b.html + rcCard(d) + tkCard(d) + (d.mo ? tdLine(d) : !d.rcr && !d.tkr && b.lead ? '<div class="rv-lead">Novo vodstvo: ' + esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '') + krBox(d, me) + '</div></div>';
  }

  function progress(n, done) { let s = ''; for (let i = 0; i < n; i++) s += '<i class="' + (i < done ? 'done' : '') + '"></i>'; return '<div class="progress">' + s + '</div>'; }

  let lastSort = null;
  function srtCard(d, i, key, place) {
    const fb = key ? (place[i] === key[i] ? ' ok' : ' bad') : '';
    return '<div class="srt-card' + fb + (!key && L.srtSel === i ? ' sel' : '') + '" data-si="' + i + '"' + (key ? '' : ' role="button" tabindex="0"') + '>' + (key ? (fb === ' ok' ? '✓ ' : '✕ ') : '') + esc(d.so.it[i]) + (fb === ' bad' ? ' → ' + esc(key[i] ? d.so.b : d.so.a) : '') + '</div>';
  }
  function sortZonesHtml(d, place, key, extra) {
    const z = (k) => '<div class="srt-zone" data-z="' + k + '"><h4>' + esc(k ? d.so.b : d.so.a) + '</h4><div class="srt-in">' + d.so.it.map((_, i) => (place[i] === k ? srtCard(d, i, key, place) : '')).join('') + '</div></div>';
    return '<div class="srt-zones' + (extra || '') + '">' + z(0) + z(1) + '</div>';
  }
  // ---- Razvrstavanje: jedna velika kartica, swipe ulijevo/udesno (ista logika slanja: niz 0/1) ----
  const SRT_FLY = 260, SRT_COOL = 380;
  const srtCur = () => L.sortP.findIndex((x) => x < 0);
  function sortPhone(d, me) {
    const n = d.so.it.length;
    if (!L.sortP || L.sortP.length !== n) { L.sortP = new Array(n).fill(-1); L.srtH = []; L.srtLock = false; L.srtCool = 0; }
    const sent = !!(L.sent || me.ok), cur = srtCur(), got = n - L.sortP.filter((x) => x < 0).length;
    const head = '<div class="srt-head"><div class="p-title">Razvrstaj pojmove</div><div class="p-sub">' + (sent ? 'Poslano ✔ Čekamo ostale…' : 'Povuci karticu u košaru ili dodirni košaru.') + '</div></div>';
    if (sent) return '<div class="srt sent">' + head + sortZonesHtml(d, L.sortP, null) + '</div>';
    const cnt = (k) => L.sortP.filter((x) => x === k).length;
    const anim = L.srtBack != null ? ' back-' + (L.srtBack ? 'b' : 'a') : (L.srtIn ? ' enter' : '');
    L.srtBack = null; L.srtIn = false;
    const card = cur >= 0 ? '<div class="swp-card' + anim + '" data-si="' + cur + '" tabindex="0" role="group" aria-label="Pojam: ' + esc(d.so.it[cur]) + '"><span>' + esc(d.so.it[cur]) + '</span></div>' : '<div class="swp-card swp-end"><span>Sve razvrstano ✔</span></div>';
    const peek = cur >= 0 && cur < n - 1 ? '<div class="swp-card swp-peek" aria-hidden="true"></div>' : '';
    const side = (k) => '<div class="swp-side ' + (k ? 'b' : 'a') + '" data-z="' + k + '" data-go="' + k + '" role="button" tabindex="0" aria-label="' + esc(k ? d.so.b : d.so.a) + '"><span class="swp-arr">' + (k ? 'udesno ▶' : '◀ ulijevo') + '</span><b>' + esc(k ? d.so.b : d.so.a) + '</b><i>' + cnt(k) + '</i></div>';
    const stage = '<div class="swp-stage"><div class="swp-mid">' + peek + card + '</div><div class="swp-bins">' + side(0) + side(1) + '</div></div>';
    const prog = '<div class="swp-prog"><span class="swp-pt">' + Math.min(n, got + (cur >= 0 ? 1 : 0)) + '/' + n + ' pojmova</span><span class="swp-bar"><span style="width:' + Math.round(got / n * 100) + '%"></span></span></div>';
    const btns = '<div class="swp-btns"><button class="swp-b undo" id="swpUndo"' + (L.srtH.length ? '' : ' disabled') + '>↶ Poništi zadnje</button></div>';
    const left = n - got;
    const done = '<button class="btn' + (left ? ' ghost' : '') + '" id="srtDone"' + (left ? ' disabled' : '') + '>' + (left ? 'Razvrstaj još ' + left : 'Gotovo') + '</button>';
    return '<div class="srt swp">' + head + prog + stage + btns + done + '</div>';
  }
  function bindSort(d, me) {
    const root = $app.querySelector('.srt');
    if (!root || root.classList.contains('sent')) return;
    const LL = L, stage = root.querySelector('.swp-stage'), sides = root.querySelectorAll('.swp-side');
    const card = root.querySelector('.swp-card[data-si]');
    const width = () => (stage && stage.clientWidth) || 320;
    const pointerScale = () => stage && stage.clientWidth ? stage.getBoundingClientRect().width / stage.clientWidth : 1;
    const thr = () => Math.max(64, width() * 0.2);
    const tilt = (dx) => Math.max(-20, Math.min(20, dx / width() * 40));
    const glow = (dx) => { const k = Math.min(1, Math.abs(dx) / thr()); sides[0].style.setProperty('--k', dx < 0 ? k : 0); sides[1].style.setProperty('--k', dx > 0 ? k : 0); if (card) card.dataset.dir = k > 0.4 ? (dx < 0 ? 'a' : 'b') : ''; };
    // jedini put zapisa odgovora: zaključavanje sprječava preskakanje i dvostruko bilježenje
    const commit = (z, dx, dy, viaBtn) => {
      if (LL !== L || L.sent || me.ok || L.srtLock || z !== 0 && z !== 1) return;
      if (viaBtn && performance.now() < L.srtCool) return;
      const i = srtCur(); if (i < 0) return;
      L.srtLock = true; L.srtCool = performance.now() + SRT_COOL;
      const dir = z ? 1 : -1, w = width();
      if (card) {
        card.classList.remove('snap'); card.classList.add('fly');
        card.style.transform = 'translate(' + (Math.max(Math.abs(dx || 0), w * 0.55) * dir + dir * w * 0.7) + 'px,' + ((dy || 0) * 0.35 - 20) + 'px) rotate(' + dir * 26 + 'deg)';
        card.style.opacity = '0';
      }
      AUDIO.play('tap');
      setTimeout(() => {
        if (LL !== L) return;
        if (L.sortP[i] < 0) { L.sortP[i] = z; L.srtH.push(i); L.srtIn = true; }
        L.srtLock = false;
        phoneRender(true);
      }, SRT_FLY);
    };
    if (card) {
      let id = null, x0 = 0, y0 = 0, t0 = 0, dx = 0, dy = 0, moved = false;
      card.onpointerdown = (e) => {
        if (L.srtLock || e.button > 0 || id !== null) return;
        id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); dx = dy = 0; moved = false;
        try { card.setPointerCapture(id); } catch (er) {}
        card.classList.remove('snap'); card.classList.add('drag');
      };
      card.onpointermove = (e) => {
        if (e.pointerId !== id) return;
        const scale = pointerScale();
        dx = (e.clientX - x0) / scale; dy = (e.clientY - y0) / scale;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + tilt(dx) + 'deg)';
        glow(dx);
      };
      const end = (e, cancel) => {
        if (e.pointerId !== id) return;
        id = null; try { card.releasePointerCapture(e.pointerId); } catch (er) {}
        card.classList.remove('drag');
        const bin = [...sides].find((side) => { const r = side.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
        if (!cancel && moved && bin) return commit(+bin.dataset.go, dx, dy);
        const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
        if (!cancel && moved && (Math.abs(dx) > thr() || (v > 0.55 && Math.abs(dx) > 28))) return commit(dx > 0 ? 1 : 0, dx, dy);
        card.classList.add('snap'); card.style.transform = ''; glow(0);
      };
      card.onpointerup = (e) => end(e, false);
      card.onpointercancel = (e) => end(e, true);
      card.onkeydown = (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); commit(0, 0, 0, true); } else if (e.key === 'ArrowRight') { e.preventDefault(); commit(1, 0, 0, true); } };
    }
    root.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => commit(+b.dataset.go, 0, 0, true); });
    bind('swpUndo', () => {
      if (L.srtLock || L.sent || !L.srtH.length) return;
      const i = L.srtH.pop(); L.srtBack = L.sortP[i]; L.sortP[i] = -1; L.srtCool = performance.now() + 200;
      phoneRender(true);
    });
    bind('srtDone', () => {
      if (L.sent || L.srtLock || L.sortP.some((x) => x < 0)) return;
      lastSort = { k: d.so.it.join('|'), p: L.sortP.slice() };
      sendInput({ r: L.sortP.slice() });
    });
  }
  let lastLink = null;
  const LNK_COL = ['#e0563c', '#3f93dc', '#e8b532', '#45b35e', '#a866d8', '#e47ab4', '#3fc4c4', '#e08a3c'];
  function lnkBoard(d, pairs, key, sel) {
    const n = d.li.L.length, rows = Math.max(n, d.li.R.length), ofR = {};
    pairs.forEach((j, i) => { if (j >= 0) ofR[j] = i; });
    let h = '';
    for (let k = 0; k < rows; k++) {
      if (k < n) {
        const j = pairs[k], fb = key && j >= 0 ? (j === key[k] ? ' ok' : ' bad') : '';
        h += '<div class="lnk-card lnk-l' + (j >= 0 ? ' paired' : '') + (sel === k ? ' sel' : '') + fb + '" data-ll="' + k + '" style="grid-row:' + (k + 1) + (j >= 0 ? ';--pc:' + LNK_COL[k % LNK_COL.length] : '') + '"' + (key ? '' : ' role="button" tabindex="0"') + '>' + (key && j >= 0 ? (fb === ' ok' ? '✓ ' : '✕ ') : '') + esc(d.li.L[k]) + (fb === ' bad' ? '<small> → ' + esc(d.li.R[key[k]]) + '</small>' : '') + '</div>';
      }
      if (k < d.li.R.length) {
        const i = ofR[k], fb = key && i !== undefined ? (k === key[i] ? ' ok' : ' bad') : '';
        h += '<div class="lnk-card lnk-r' + (i !== undefined ? ' paired' : '') + fb + '" data-lr="' + k + '" style="grid-row:' + (k + 1) + (i !== undefined ? ';--pc:' + LNK_COL[i % LNK_COL.length] : '') + '"' + (key ? '' : ' role="button" tabindex="0"') + '>' + esc(d.li.R[k]) + '</div>';
      }
    }
    return '<div class="lnk-board"><svg aria-hidden="true"></svg>' + h + '</div>';
  }
  function lnkHtml(d, pairs, key, sent, extra) {
    return lnkBoard(d, pairs, key, sent || key ? null : L.lnkSel).replace('<div class="lnk-board">', '<div class="lnk-board' + (extra || '') + '" data-pairs="' + pairs.join(',') + '">');
  }
  function linkPhone(d, me) {
    const n = d.li.L.length;
    if (!L.linkP || L.linkP.length !== n) L.linkP = new Array(n).fill(-1);
    const sent = !!(L.sent || me.ok), left = L.linkP.filter((x) => x < 0).length;
    const head = '<div class="srt-head"><div class="p-title">Spoji parove</div><div class="p-sub">' + (sent ? 'Poslano ✔ Čekamo ostale…' : 'Povuci konop od pojma do njegova para (ili dodirni oba).') + '</div>' + (d.li.t ? '<div class="p-sub">' + esc(d.li.t) + '</div>' : '') + '</div>';
    const done = sent ? '' : '<button class="btn ghost" id="lnkDone"' + (left ? ' disabled' : '') + '>' + (left ? 'Spoji još ' + left : 'Gotovo') + '</button>';
    return '<div class="lnk' + (sent ? ' sent' : '') + '">' + head + lnkHtml(d, L.linkP, null, sent) + done + '</div>';
  }
  // SPOJI PAROVE 2: konop se povlači prstom od pojma do para (dodir-dodir i dalje radi); svaki par ima svoju boju
  function lnkRope(x1, y1, x2, y2, col, live) {
    const mx = (x1 + x2) / 2, d = 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2;
    return '<g class="rope' + (live ? ' live' : '') + '"><path d="' + d + '" fill="none" stroke="rgba(20,10,4,0.85)" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="rgba(255,240,210,0.55)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="5 6"/>' +
      '<circle cx="' + x1 + '" cy="' + y1 + '" r="6" fill="' + col + '" stroke="rgba(20,10,4,0.9)" stroke-width="2"/>' +
      (live ? '<circle cx="' + x2 + '" cy="' + y2 + '" r="9" fill="' + col + '" fill-opacity="0.5" stroke="#fff3c2" stroke-width="2"/>' : '<circle cx="' + x2 + '" cy="' + y2 + '" r="6" fill="' + col + '" stroke="rgba(20,10,4,0.9)" stroke-width="2"/>') + '</g>';
  }
  function drawLinks() {
    document.querySelectorAll('.lnk-board').forEach((b) => {
      const svg = b.querySelector('svg'); if (!svg) return;
      const br = b.getBoundingClientRect(); let p = '';
      svg.setAttribute('viewBox', '0 0 ' + Math.max(1, br.width) + ' ' + Math.max(1, br.height));
      svg.setAttribute('preserveAspectRatio', 'none');
      b.querySelectorAll('.lnk-l.paired').forEach((l) => {
        const i = +l.dataset.ll, col = getComputedStyle(l).getPropertyValue('--pc').trim();
        const rIdx = (b.dataset.pairs || '').split(',')[i]; const r = b.querySelector('[data-lr="' + rIdx + '"]'); if (!r) return;
        const a = l.getBoundingClientRect(), c = r.getBoundingClientRect();
        p += lnkRope(a.right - br.left, a.top + a.height / 2 - br.top, c.left - br.left, c.top + c.height / 2 - br.top, col, false);
      });
      const lv = L && L.lnkLive && b.closest('.lnk:not(.sent)') ? L.lnkLive : null;
      if (lv) p += lnkRope(lv.x1, lv.y1, lv.x2, lv.y2, lv.col, true);
      svg.innerHTML = p;
    });
  }
  function bindLink(d, me) {
    const root = $app.querySelector('.lnk');
    if (!root || root.classList.contains('sent')) return;
    const board = root.querySelector('.lnk-board'); if (!board) return;
    const re = () => { L.lnkLive = null; phoneRender(true); };
    const pairWith = (i, j) => { const owner = L.linkP.indexOf(j); if (owner >= 0) L.linkP[owner] = -1; L.linkP[i] = j; L.lnkSel = null; L.lnkSelR = null; AUDIO.play('pop'); HAPTIC.tap(); re(); };
    const tapL = (i) => {
      if (L.lnkSelR != null) return pairWith(i, L.lnkSelR);
      if (L.linkP[i] >= 0) { L.linkP[i] = -1; L.lnkSel = i; AUDIO.play('tap'); return re(); }
      L.lnkSel = L.lnkSel === i ? null : i; AUDIO.play('tap'); re();
    };
    const tapR = (j) => {
      if (L.lnkSel != null) return pairWith(L.lnkSel, j);
      const owner = L.linkP.indexOf(j);
      if (owner >= 0) { L.linkP[owner] = -1; L.lnkSelR = j; AUDIO.play('tap'); return re(); }
      L.lnkSelR = L.lnkSelR === j ? null : j; AUDIO.play('tap'); re();
    };
    if (L.lnkSelR != null) { const c = board.querySelector('[data-lr="' + L.lnkSelR + '"]'); if (c) c.classList.add('sel'); }
    const cardOf = (el) => el && el.closest && el.closest('.lnk-card');
    let drag = null;
    board.onpointerdown = (e) => {
      const c = cardOf(e.target); if (!c || (e.button != null && e.button > 0)) return;
      const left = c.dataset.ll !== undefined, idx = +(left ? c.dataset.ll : c.dataset.lr);
      const br = board.getBoundingClientRect(), r = c.getBoundingClientRect();
      drag = { left, idx, c, x0: e.clientX, y0: e.clientY, on: false, br, ax: (left ? r.right : r.left) - br.left, ay: r.top + r.height / 2 - br.top, hov: null,
        col: LNK_COL[(left ? idx : Math.max(0, L.linkP.indexOf(idx) >= 0 ? L.linkP.indexOf(idx) : L.linkP.filter((x) => x >= 0).length)) % LNK_COL.length] };
      try { board.setPointerCapture(e.pointerId); } catch (er) {}
    };
    board.onpointermove = (e) => {
      if (!drag) return;
      if (!drag.on && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
      if (!drag.on) { drag.on = true; drag.c.classList.add('drag'); board.classList.add('dragging'); }
      e.preventDefault();
      const under = cardOf(document.elementFromPoint(e.clientX, e.clientY));
      const ok = under && (drag.left ? under.dataset.lr !== undefined : under.dataset.ll !== undefined) ? under : null;
      if (drag.hov !== ok) { if (drag.hov) drag.hov.classList.remove('hov'); if (ok) ok.classList.add('hov'); drag.hov = ok; }
      let x2 = e.clientX - drag.br.left, y2 = e.clientY - drag.br.top;
      if (ok) { const r = ok.getBoundingClientRect(); x2 = (drag.left ? r.left : r.right) - drag.br.left; y2 = r.top + r.height / 2 - drag.br.top; }
      L.lnkLive = drag.left ? { x1: drag.ax, y1: drag.ay, x2, y2, col: drag.col } : { x1: x2, y1: y2, x2: drag.ax, y2: drag.ay, col: drag.col };
      drawLinks();
    };
    const end = (e, cancel) => {
      if (!drag) return;
      const g = drag; drag = null;
      board.classList.remove('dragging'); g.c.classList.remove('drag'); if (g.hov) g.hov.classList.remove('hov');
      if (!g.on) { if (!cancel) (g.left ? tapL : tapR)(g.idx); return; }
      L.lnkLive = null;
      if (!cancel && g.hov) return g.left ? pairWith(g.idx, +g.hov.dataset.lr) : pairWith(+g.hov.dataset.ll, g.idx);
      drawLinks();
    };
    board.onpointerup = (e) => end(e, false);
    board.onpointercancel = (e) => end(e, true);
    root.querySelectorAll('.lnk-card[tabindex]').forEach((c) => { c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.dataset.ll !== undefined ? tapL(+c.dataset.ll) : tapR(+c.dataset.lr); } }; });
    bind('lnkDone', () => {
      if (L.linkP.some((x) => x < 0)) return;
      lastLink = { k: d.li.L.join('|') + '#' + d.li.R.join('|'), p: L.linkP.slice() };
      sendInput({ r: L.linkP.slice() });
    });
  }
  function finalePhone(d, me) {
    const answered = L.sent || me.ok;
    const mine = L.sent ? L.sent.c : -1;
    const locked = !answered && !L.fx && Date.now() < (L.lockUntil || 0);
    const cr = !!d.crown;
    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + (cr ? i : i === 0 ? 3 : 0) + (locked ? ' locked' : '') + (answered ? (mine === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '>' + (cr ? '<span class="shape">' + SHAPES[i] + '</span>' : '') + '<span class="otxt">' + optText(o, i) + '</span></button>').join('');
    const buffs = (me.uc ? '<span class="tag">Novčić utjehe</span>' : '') + (me.d ? '<span class="tag">×2 Dodatni napredak</span>' : '') + (me.sh ? '<span class="tag">🛡️ Štit</span>' : '');
    const attackers = (d.ev || []).filter((e) => e.t === PID);
    const hit = attackers.length ? '<div class="p-sub">' + attackers.map((e) => esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + (e.cap ? ' (limit napada)' : e.b ? ' (odbijeno štitom)' : '')).join(' · ') + '</div>' : '';
    return timerHtml(3000) +
      (cr ? '<div class="crown-k">' + (me.top ? '👑 Tvoje pitanje za krunu!<small>Točan odgovor osvaja krunu</small>' : '👑 Pitanje za krunu: ' + esc(d.P.filter((p) => p.top).map((p) => p.n).join(' i ')) + '<small>Ako pogriješi, utrka se nastavlja</small>') + '</div>' : '<div class="fin-prog">' + esc(progTxt(d, me)) + '</div>') +
      '<div class="p-q" style="' + (cr ? '' : 'font-size:1.6rem;') + 'text-align:center">' + esc(d.q.t) + '</div>' + (buffs ? '<div class="buffs">' + buffs + '</div>' : '') + hit +
      '<div class="q-area"><div class="p-opts' + (cr ? '' : ' two') + '">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx) + bombLayer()) + '</div>' + boomCover() +
      (!answered && locked ? '<div class="waiting">Očišćeno! Odgovori se otključavaju…</div>' : !answered && !L.fx && L.bombs && L.bombs.some((b) => b.on) ? '<div class="waiting">💣 Izbjegni bombe!</div>' : '') +
      (answered ? '<div class="waiting">Zaprimljeno ✔</div>' : '');
  }

  function bindPhone(d, me) {
    if (d) { bindPact(d); pactToasts(d); }
    bind('toTv', () => { demoView = 'tv'; render(); });
    bind('leave', reset);
    bind('leave2', reset);
    bind('lobAvatar', () => lobbyChange('lobAvatar', () => { L.lobPanel = L.lobPanel === 'avatar' ? null : 'avatar'; phoneRender(true); }, '.av-grid'));
    bind('lobSettings', () => lobbyChange('lobSettings', () => { L.lobPanel = L.lobPanel === 'settings' ? null : 'settings'; phoneRender(true); }, '.lob-settings'));
    bind('dstart', () => game.start());
    if (d && d.ph === 'lobby' && game) { bindBots(d); bindOpt(); }
    bind('dagain', () => { game.restart(); });
    bind('htfull', () => { L.htFull = 1; phoneRender(true); });
    bind('htok', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });
    bindLeg(d);
    $app.querySelectorAll('[data-av]').forEach((b) => { b.onclick = () => { L.popAv = +b.dataset.av; chooseAvatar(+b.dataset.av); }; });
    bind('lobInv', () => lobbyChange('lobInv', () => { L.inv = true; phoneRender(true); }, '.inv-card'));
    bind('invClose', () => { L.inv = false; phoneRender(true); });
    { const m = document.getElementById('invModal'); if (m) m.onclick = (e) => { if (e.target === m) { L.inv = false; phoneRender(true); } }; }
    // predvorje: popis igrača se pomiče sam za sebe; pamti položaj i pokaži da ima još redova
    { const lp = $app.querySelector('.lob-players');
      if (lp) { const upd = () => lp.classList.toggle('more', lp.scrollTop + lp.clientHeight < lp.scrollHeight - 4); lp.scrollTop = L.lobSc || 0; lp.onscroll = () => { L.lobSc = lp.scrollTop; upd(); }; upd(); } }
    $app.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { if (!L.sent) { const o = { v: +b.dataset.v }; if (L.ppOn) o.pp = 1; sendInput(o); } }; });
    { const pb = document.getElementById('ppBtn'); if (pb) pb.onclick = () => { L.ppOn = !L.ppOn; AUDIO.play('tap'); phoneRender(true); }; }
    $app.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.p;
        if (POWERS[k].atk || POWERS[k].tg) { L.pw = k; phoneRender(true); } else sendInput({ p: k });
      };
    });
    $app.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => sendInput({ p: L.pw, t: b.dataset.t }); });
    $app.querySelectorAll('[data-bet]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ b: +b.dataset.bet }); }; });
    $app.querySelectorAll('[data-or]').forEach((b) => { b.onclick = () => {
      if (L.sent) return; const i = +b.dataset.or; L.ord = (L.ord || []).filter((x) => x !== i).concat(i);
      if (L.ord.length === 4) sendInput({ r: [0, 1, 2, 3].map((k) => L.ord.indexOf(k)) }); else phoneRender(true);
    }; });
    bind('ordUndo', () => { if (L.ord && L.ord.length) { L.ord.pop(); phoneRender(true); } });
    $app.querySelectorAll('[data-hl]').forEach((b) => { b.onclick = () => {
      const st = L.hl, list = d.hl && d.hl.list; if (!st || !list || L.sent || st.i >= list.length) return;
      const k = +b.dataset.hl, x = list[st.i], ok = k === x.w;
      st.r.push(k); st.ok = ok ? 1 : 0; st.i++;
      st.fb = (ok ? '✓ ' : '✗ ') + x.a[x.w] + (x.v ? ' (' + x.v[x.w] + ' : ' + x.v[1 - x.w] + ')' : '');
      AUDIO.play(ok ? 'score' : 'wrong'); if (!ok) HAPTIC.error();
      if (!ok || st.i >= list.length) sendInput({ r: st.r.slice() }); else phoneRender(true);
    }; });
    $app.querySelectorAll('[data-bz]').forEach((b) => { b.onclick = () => {
      const st = L.bz, list = d.bz && d.bz.list; if (!st || !list || L.sent || st.i >= list.length) return;
      const v = +b.dataset.bz, ok = v === list[st.i][1];
      st.r.push(v); st.i++; if (ok) st.ok++; else st.bad++; st.last = ok ? 1 : 0; st.fb = ok ? '✓ Točno!' : '✗ Netočno';
      AUDIO.play(ok ? 'tap' : 'wrong');
      if (st.i >= list.length) sendInput({ r: st.r.slice(), f: 1 }); else { sendPartial({ r: st.r.slice() }); phoneRender(true); }
    }; });
    $app.querySelectorAll('[data-ul]').forEach((b) => { b.onclick = () => {
      if (L.sent) return; const i = +b.dataset.ul, a = (L.ulSel || []).slice(), k = a.indexOf(i);
      if (k >= 0) a.splice(k, 1); else { a.push(i); if (a.length > 2) a.shift(); }
      L.ulSel = a; phoneRender(true);
    }; });
    bind('ulOk', () => { if (!L.sent && (L.ulSel || []).length === 2) sendInput({ v: L.ulSel.slice() }); });
    $app.querySelectorAll('[data-ulv]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ v: b.dataset.ulv }); }; });
    $app.querySelectorAll('[data-mj]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ v: +b.dataset.mj }); }; });
    $app.querySelectorAll('[data-sx]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ x: b.dataset.sx }); }; });
    $app.querySelectorAll('[data-sy]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ y: +b.dataset.sy }); }; });
    bind('pwback', () => { L.pw = null; phoneRender(true); });
    bind('nopw', () => sendInput({ p: '' }));
    $app.querySelectorAll('[data-c]').forEach((b) => {
      // odgovor vrijedi samo ako je dodir i počeo na tom gumbu, nakon što je efekt uklonjen
      b.onpointerdown = () => { b.dataset.ok = (!L.fx && Date.now() >= (L.lockUntil || 0)) ? '1' : ''; };
      b.onclick = (e) => {
        if (L.sent || L.fx) return;
        if (Date.now() < (L.lockUntil || 0) || Date.now() < (L.boomUntil || 0)) return;
        if (e && e.detail !== 0 && b.dataset.ok !== '1') return;
        HAPTIC.confirm();
        const w = {};
        sendInput(Object.assign({ c: +b.dataset.c, t: Math.max(0, Math.round(Date.now() - L.start)) }, w));
      };
    });
    if (d.ph === 'sort') bindSort(d, me);
    if (d.ph === 'link') bindLink(d, me);
    if (d.ph === 'trisk') bindRisk();
    if ((d.ph === 'question' || d.ph === 'fq') && L.fx && !(L.sent || (me && me.ok))) bindFx();
    if ((d.ph === 'question' || d.ph === 'fq') && !(L.sent || (me && me.ok))) bindBombs();
  }

  // ---------- odbrojavanje ----------
  function tick() {
    const ms = Math.max(0, clockEnds - Date.now());
    const bar = document.getElementById('tbar'), num = document.getElementById('tnum'), wrap = document.getElementById('timer');
    if (bar && clockDur) { const fr = ms / clockDur; bar.style.width = (fr * 100) + '%'; bar.dataset.lv = fr > 0.5 ? 'g' : fr > 0.2 ? 'a' : 'r'; }
    const ring = document.getElementById('tring'), arc = document.getElementById('tarc');
    if (num) num.textContent = (wrap || ring) && clockDur ? Math.ceil(ms / 1000) : '';
    if (wrap) wrap.classList.toggle('urgent', ms <= +(wrap.dataset.u || 3000));
    if (arc && clockDur) arc.style.strokeDashoffset = (263.9 * (1 - ms / clockDur)).toFixed(1);
    if (ring) ring.classList.toggle('urgent', ms <= 3000);
    const tvShown = mode === 'host' || (mode === 'demo' && demoView === 'tv');
    const ph = tvShown ? (game && game.view().ph) : (S && S.ph);
    const me = !tvShown && S ? meOf(S) : null;
    const waiting = INPUT_PHASES[ph] && (tvShown ? !!ring : !!(wrap && me && !me.ok && !(L && L.sent)));
    const key = (tvShown ? 't' : 'p') + (tvShown ? tvStep : (L && L.s));
    if (waiting && clockDur) {
      const sec = Math.ceil(ms / 1000);
      if (ms > 0 && sec <= 5 && key + ':' + sec !== lastTickSec) { lastTickSec = key + ':' + sec; SFX.play(sec <= 3 ? 'beep' : 'tick', sec); }
      if (ms <= 0 && lastTickSec !== key + ':end') { lastTickSec = key + ':end'; SFX.play('timeup'); }
    }
    MUSIC.want(MUSIC.on && !SFX.muted && (mode === 'host' || mode === 'hostp' || mode === 'demo'));
  }
  setInterval(tick, 100);

  { const hm = (location.hash || '').match(/^#?([A-Za-z]{4})(?:-([A-Za-z0-9_-]{22}))?$/); if (hm) { mode = 'join'; if (hm[2]) rememberRS(hm[1].toUpperCase(), hm[2]); } }
  render();
  try {
    const raw = sessionStorage.getItem('mz_recovery_v1');
    const saved = raw && JSON.parse(raw);
    if (saved && !location.hash && /^[A-Z]{4}$/.test(saved.code) && Array.isArray(saved.keys) && Date.now() - saved.savedAt < 6 * 60 * 60 * 1000 && saved.journal && hasPeer()) {
      mode = saved.noTv ? 'hostp' : 'host';
      openHostPeer(0, { noTv: saved.noTv, recovery: saved });
      render(); keepAwake();
    }
  } catch (e) { try { sessionStorage.removeItem('mz_recovery_v1'); } catch (_) {} }
})();
