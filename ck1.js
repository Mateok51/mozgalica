
(function () {
  'use strict';
  const JOIN_URL = 'https://claude.ai/artifact/2EJ9htojyFMcNo46Ye13xx';
  const $app = document.getElementById('app');
  const SHAPES = ['A', 'B', 'C', 'D'];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const use = (n) => (window.claude && window.claude.use ? window.claude.use(n) : Promise.resolve(null)).catch(() => null);

  // ---------- likovi (originalni, sjenčani) ----------
  const AV = [
    { n: 'Bubi',   c: '#ff5e6e', s: 'round',  e: 2, x: 'antena' },
    { n: 'Brko',   c: '#4aa3ff', s: 'square', e: 2, x: 'brkovi' },
    { n: 'Zvrk',   c: '#ffd23f', s: 'tall',   e: 1, x: 'sesir' },
    { n: 'Lila',   c: '#a98bff', s: 'round',  e: 2, x: 'masna' },
    { n: 'Tikvan', c: '#ff8f2e', s: 'pear',   e: 3, x: 'list' },
    { n: 'Mrki',   c: '#4fd97a', s: 'square', e: 2, x: 'rogovi' },
    { n: 'Pipi',   c: '#ff6fb0', s: 'tall',   e: 2, x: 'naocale' },
    { n: 'Ćiro',   c: '#2fd6c4', s: 'pear',   e: 1, x: 'kruna' },
  ];
  const TOP = { round: 22, square: 26, tall: 14, pear: 20 };
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
  }
  const avCache = {};
  function avSvg(i, mood) {
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
    pola: svgIc('<defs><linearGradient id="icp" x1="0" x2="1"><stop offset=".5" stop-color="#ffffff"/><stop offset=".5" stop-color="#5ee7ff"/></linearGradient></defs><circle cx="24" cy="24" r="21" fill="url(#icp)" stroke="#1a6f8a" stroke-width="2"/><path d="M24 3v42" stroke="#1a6f8a" stroke-width="2" stroke-dasharray="4 3"/><text x="13.5" y="30" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, sans-serif" font-weight="700" font-size="15" fill="#1a1530">50</text><text x="34.5" y="30" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, sans-serif" font-weight="700" font-size="15" fill="#06344a">50</text>'),
    stit: svgIc('<defs><linearGradient id="ict" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8f4ff"/><stop offset=".5" stop-color="#4a8dff"/><stop offset="1" stop-color="#1b3fa8"/></linearGradient></defs><path d="M24 3l17 6v12c0 11-7.5 20-17 24C14.5 41 7 32 7 21V9z" fill="url(#ict)" stroke="#e8f4ff" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 24l6 6 11-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  };
  const bugSvg = '<svg viewBox="0 0 60 60" aria-hidden="true"><defs><radialGradient id="bgb" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#e0a86a"/><stop offset="1" stop-color="#6b3f17"/></radialGradient></defs><path d="M12 30l-9-4M12 38l-10 2M48 30l9-4M48 38l10 2M14 45l-6 6M46 45l6 6" stroke="#4a2b10" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="30" cy="36" rx="20" ry="16" fill="url(#bgb)"/><path d="M30 22v30" stroke="#4a2b10" stroke-width="1.6" opacity=".5"/><circle cx="22" cy="34" r="3" fill="#f2c48d" opacity=".6"/><circle cx="30" cy="20" r="11" fill="#5a3412"/><circle cx="25" cy="18" r="4.2" fill="#fff"/><circle cx="35" cy="18" r="4.2" fill="#fff"/><circle cx="26" cy="19" r="2" fill="#000"/><circle cx="36" cy="19" r="2" fill="#000"/><path d="M24 26q6 5 12 0" stroke="#fff" stroke-width="2" fill="none"/><path d="M26 27v3M34 27v3" stroke="#fff" stroke-width="2"/></svg>';
  const bombSvg = '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="bbg" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#70708c"/><stop offset=".55" stop-color="#23232f"/><stop offset="1" stop-color="#08080d"/></radialGradient></defs><circle cx="46" cy="60" r="34" fill="url(#bbg)"/><ellipse cx="33" cy="46" rx="9" ry="6" fill="#fff" opacity=".3"/><rect x="58" y="16" width="18" height="16" rx="3" fill="#555" transform="rotate(35 67 24)"/><path d="M72 18q10-13 19-6" stroke="#d99a35" stroke-width="4.5" fill="none"/><path d="M91 3l2.6 6.4L100 12l-6.4 2.6L91 21l-2.6-6.4L82 12l6.4-2.6z" fill="#ffcf4a"><animateTransform attributeName="transform" type="rotate" from="0 91 12" to="360 91 12" dur=".6s" repeatCount="indefinite"/></path></svg>';

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
      tap: () => tone(700, 0, 0.06, 'triangle', 0.12),
      tick: () => tone(1250, 0, 0.05, 'square', 0.05),
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
    return {
      play(n) { try { if (P[n]) P[n](); } catch (e) {} },
      unlock() { ac(); },
      get muted() { return muted; },
      toggle() { muted = !muted; store.set('mz_mute', muted ? '1' : '0'); },
    };
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
    const cols = ['#ffcf4a', '#ff3d81', '#5ee7ff', '#5dffa8', '#ffffff', '#a98bff'];
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
      g.globalAlpha = Math.max(0, 1 - e / 3800);
      for (const p of P) {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 1);
        g.restore();
      }
      if (e < 3800) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  // ---------- pozornica u pozadini ----------
  (function backdrop() {
    const c = document.getElementById('bg');
    if (!c || !c.getContext) return;
    const g = c.getContext('2d');
    let W = 0, H = 0;
    const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.8, v: 0.0002 + Math.random() * 0.0006, p: Math.random() * 6.28 }));
    function size() {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener('resize', size);
    function draw(t) {
      const time = t / 1000;
      g.clearRect(0, 0, W, H);
      // zlatna piramida u daljini
      const pw = Math.min(W * 0.95, H * 1.35), ph = pw * 0.45, px = W / 2, py = H + 4, steps = 8;
      g.save();
      g.globalAlpha = W > 700 ? 0.75 : 0.5;
      for (let k = 0; k < steps; k++) {
        const w = pw * (1 - k / steps), y = py - ph * (k + 1) / steps, h = ph / steps - 3;
        const lg = g.createLinearGradient(0, y, 0, y + h);
        lg.addColorStop(0, 'rgba(40,22,80,0.85)'); lg.addColorStop(1, 'rgba(8,6,24,0.9)');
        g.fillStyle = lg; g.fillRect(px - w / 2, y, w, h);
        const edge = g.createLinearGradient(px - w / 2, 0, px + w / 2, 0);
        edge.addColorStop(0, 'rgba(255,207,74,0)'); edge.addColorStop(0.5, 'rgba(255,220,130,0.9)'); edge.addColorStop(1, 'rgba(255,207,74,0)');
        g.fillStyle = edge; g.fillRect(px - w / 2, y, w, 2);
      }
      const tipY = py - ph, glow = g.createRadialGradient(px, tipY, 0, px, tipY, pw * 0.25);
      glow.addColorStop(0, 'rgba(255,207,74,' + (0.35 + 0.1 * Math.sin(time * 1.4)).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(255,207,74,0)');
      g.fillStyle = glow; g.fillRect(px - pw * 0.25, tipY - pw * 0.25, pw * 0.5, pw * 0.5);
      g.restore();
      // reflektori
      for (let b = 0; b < 3; b++) {
        const ang = Math.sin(time * 0.22 + b * 2.1) * 0.3 + (b - 1) * 0.5;
        g.save();
        g.translate(W * (0.18 + 0.32 * b), -30); g.rotate(ang);
        const len = H * 1.35, wid = Math.max(140, W * 0.16);
        const lg = g.createLinearGradient(0, 0, 0, len);
        lg.addColorStop(0, b === 1 ? 'rgba(255,224,150,0.20)' : 'rgba(150,170,255,0.15)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg;
        g.beginPath(); g.moveTo(-wid * 0.07, 0); g.lineTo(wid * 0.07, 0); g.lineTo(wid / 2, len); g.lineTo(-wid / 2, len); g.closePath(); g.fill();
        g.restore();
      }
      // čestice prašine u svjetlu
      for (const d of dust) {
        if (!reduceMotion) { d.y -= d.v; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); } }
        const a = 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.6 + d.p));
        g.fillStyle = 'rgba(255,238,200,' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(d.x * W, d.y * H, d.s, 0, 6.283); g.fill();
      }
    }
    let last = 0;
    function loop(t) {
      if (document.visibilityState === 'visible' && t - last > 33) { last = t; draw(t); }
      requestAnimationFrame(loop);
    }
    if (reduceMotion) draw(0); else requestAnimationFrame(loop);
  })();

  // ---------- zvuk faza ----------
  let tvStep = -1, phoneStep = -1, lastTickSec = -1;
  function tvSound(d) {
    switch (d.ph) {
      case 'intro': return SFX.play('whoosh');
      case 'vote': case 'sort': case 'link': case 'fq': return SFX.play('pop');
      case 'voteResult': case 'fr': return SFX.play('step');
      case 'power': return SFX.play('zap');
      case 'question': return SFX.play(d.ev && d.ev.some((e) => e.t) ? 'zap' : 'pop');
      case 'reveal': case 'sortReveal': case 'linkReveal': return SFX.play('correct');
      case 'final': SFX.play('fanfare'); return confetti(240);
    }
  }
  const FX_SOUND = { led: 'freeze', sluz: 'splat', grick: 'squish', bomba: 'zap' };
  function phoneSound(d, me) {
    if (!me) return;
    switch (d.ph) {
      case 'intro': return SFX.play('whoosh');
      case 'question': if (L.fx) SFX.play(FX_SOUND[L.fx.k] || 'zap'); return;
      case 'reveal': if (me.ch === d.cor) { SFX.play('correct'); confetti(70); } else SFX.play('wrong'); return;
      case 'sortReveal': case 'linkReveal': return SFX.play(me.k ? 'correct' : 'wrong');
      case 'fr': return SFX.play(me.mv ? 'step' : 'wrong');
      case 'final': if (d.win === PID) { SFX.play('fanfare'); confetti(200); } else SFX.play('step'); return;
    }
  }
  const MUTE_ON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const MUTE_OFF = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 9l6 6M22 9l-6 6" stroke="#ff3d81" stroke-width="2.2" stroke-linecap="round"/></svg>';
  function updMute() {
    const b = document.getElementById('mute');
    if (!b) return;
    b.innerHTML = SFX.muted ? MUTE_OFF : MUTE_ON;
    b.setAttribute('aria-label', SFX.muted ? 'Uključi zvuk' : 'Isključi zvuk');
  }
  (function () { const b = document.getElementById('mute'); if (b) { b.onclick = () => { SFX.toggle(); updMute(); }; updMute(); } })();

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
    game = createGame({ code: 'DEMO', noTv: true, onChange: () => { applyState(game.view()); if (demoView === 'tv') render(); } });
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
  const isLocalHost = () => mode === 'demo' || mode === 'hostp';
  const phoneShown = () => mode === 'player' || mode === 'hostp' || (mode === 'demo' && demoView === 'phone');
  function miniBoard(d, gain) {
    const r = d.P.slice().sort((a, b) => b.sc - a.sc);
    return '<div class="mboard">' + r.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a, gain && p.g ? 'happy' : '') + '</span><span class="nm">' + esc(p.n) + '</span>' +
      (gain && p.g ? '<span class="gain">+' + p.g + '</span>' : '') + '<span class="sc">' + p.sc + '</span></div>').join('') + '</div>';
  }
  function phoneEvents(d) {
    if (!d.ev || !d.ev.length) return '';
    return '<div class="p-sub" style="margin-top:4px">Moći u ovom pitanju</div>' + evHtml(d);
  }

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
    if (phoneShown()) {
      const sig = phoneSig(d);
      if (sig !== lastSig) { lastSig = sig; phoneRender(false); }
    }
  }
  function phoneSig(d) {
    const me = meOf(d) || null;
    const roster = (d.ph === 'lobby' || d.ph === 'power' || d.ph === 'final') ? d.P.map((p) => [p.id, p.n, p.a, p.c])
      : (d.ph === 'vote' || d.ph === 'voteResult') ? d.P.map((p) => [p.id, p.a, p.vt]) : null;
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
    // odgovori ostaju zaključani kratko vrijeme da se zadnji dodir ne pretvori u odgovor
    L.lockUntil = Date.now() + 900;
    const s0 = L.s;
    setTimeout(() => { if (L.s === s0) phoneRender(true); }, 920);
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
        SFX.play('crack');
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
          if (fx.cells[i]) { fx.cells[i] = 0; fx.left--; if (cells[i]) cells[i].classList.add('gone'); if (fx.left % 7 === 0) SFX.play('splat'); }
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
          fx.bugs[+b.dataset.b].on = false; b.remove(); SFX.play('squish');
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
          f.boom = true; stopFxTimer(); SFX.play('boom');
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
      return '<span class="ev buff"><span class="mini">' + avSvg(avOf(d, e.f)) + '</span>' + esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + '</span>';
    }).join('') + '</div>';
  }

  // ---------- glavni prikaz ----------
  function render() {
    try {
      if (mode === 'home') { tvStep = -1; phoneStep = -1; return homeV(); }
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
    $app.className = 'screen center';
    const hint = roomChecked && !roomNs ? '<div class="err">Povezivanje uređaja ne radi u ovom prikazu. Demo i dalje radi.</div>' : '';
    const faces = [0, 3, 6, 4].map((i) => '<span style="width:64px" class="bob">' + avSvg(i, 'happy') + '</span>').join('');
    $app.innerHTML =
      '<div class="logo">MOZGALICA<small>Kviz za cijelo društvo</small></div>' +
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
    const ring = INPUT_PHASES[d.ph]
      ? '<span class="ring" id="tring"><svg viewBox="0 0 100 100"><circle class="rbg" cx="50" cy="50" r="42"/><circle class="rfg" id="tarc" cx="50" cy="50" r="42" stroke-dasharray="263.9" stroke-dashoffset="0"/></svg><b id="tnum"></b></span>'
      : '<span class="ring empty"></span>';
    return '<div class="tv-top"><span class="rl">' + esc(d.rl || '') + '</span><span class="tv-sub" style="flex:1">' + (label || '') + '</span>' + ring + '</div>';
  }
  function tvV(d) {
    clockEnds = Date.now() + d.ms; clockDur = d.dur;
    const fresh = d.s !== tvStep;
    if (fresh) { tvStep = d.s; lastTickSec = -1; tvSound(d); }
    $app.className = 'screen tv' + (fresh ? ' fresh' : '');
    let h = '';
    const demoBar = mode === 'demo' ? '<div class="demo-bar"><span class="pill">Demo: TV prikaz</span><button class="btn ghost" id="toPhone">📱 Natrag na mobitel</button></div>' : '';
    switch (d.ph) {
      case 'lobby': return tvLobby(d, demoBar);
      case 'intro':
        h = '<div class="intro-card"><div class="big">' + esc(d.it.t) + '</div><div class="sub">' + esc(d.it.sub) + '</div></div>' + lineup(d);
        break;
      case 'vote': case 'voteResult': {
        const counts = d.cats.map((_, i) => d.P.filter((p) => p.vt === i).length);
        const max = Math.max(0, ...counts);
        const doors = d.cats.map((c, i) => {
          const voters = d.P.filter((p) => p.vt === i).map((p) => '<span class="voter"><span style="width:100%">' + avSvg(p.a, 'happy') + '</span><span class="vnm">' + esc(p.n) + '</span></span>').join('');
          const cls = d.ph === 'voteResult' ? (i === d.cw ? ' win' : ' lose') : (max > 0 && counts[i] === max ? ' lead' : '');
          return '<div class="door o' + i + cls + '"><span class="vcount' + (counts[i] ? '' : ' zero') + '">' + counts[i] + '</span><div class="dn">' + esc(c) + '</div><div class="voters">' + voters + '</div><span class="knob"></span></div>';
        }).join('');
        const voted = d.P.filter((p) => p.vt !== undefined).length;
        const label = d.ph === 'vote' ? 'Glasajte za kategoriju! Glasalo ' + voted + ' od ' + d.P.filter((p) => p.c).length
          : 'Kategorija: ' + esc(d.cats[d.cw]);
        h = tvTop(d, label) + (d.ph === 'vote' ? timerHtml() : '') +
          '<div class="tv-mid"><div class="doors">' + doors + '</div>' +
          (d.ph === 'voteResult' && d.tie ? '<div class="tie-note">Neriješeno! Kategoriju je odabrao ždrijeb.</div>' : '') +
          (d.ph === 'voteResult' && !voted ? '<div class="tie-note">Nitko nije glasao, kategoriju je odabrao ždrijeb.</div>' : '') +
          '</div>' + lineup(d, { check: d.ph === 'vote' });
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
        h = '<div class="winner"><div class="champ-wrap">' +
          '<div class="logo" style="font-size:clamp(2.2rem,5.5vw,4.8rem)">Pobjednik!</div><div class="champ">' + avSvg(w.a, 'happy') + '</div>' +
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
      '<div class="logo" style="text-align:center">MOZGALICA<small>Odaberite likove na mobitelima</small></div>' +
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
      if (!phoneShown()) return;
      if (force && S) lastSig = phoneSig(S);
      phoneV();
    } catch (e) { crash(e); }
  }
  function phoneV() {
    const d = S;
    const freshP = !!d && L.s !== phoneStep;
    $app.className = 'screen phone' + (freshP ? ' fresh' : '');
    if (!d) { $app.className = 'screen phone center'; $app.innerHTML = '<div class="logo" style="font-size:2.4rem">MOZGALICA</div><div class="p-title">Spajam se…</div><div class="p-sub">Soba ' + esc(pcode) + '</div>'; return; }
    const me = meOf(d);
    const demoBar = mode === 'demo' ? '<div class="demo-bar"><span class="pill">DEMO</span><button class="btn ghost" id="toTv">📺 Pogledaj TV</button></div>' : '';
    const head = me ? '<div class="p-top"><span class="p-me"><span class="mini">' + avSvg(me.a) + '</span><span>' + esc(me.n) + '</span></span><span>' + esc(d.rl || '') + '</span><span>' + me.sc + ' b</span></div>' : '';
    const center = (inner) => { $app.className = 'screen phone center' + (freshP ? ' fresh' : ''); return inner; };
    let h = '';
    if (!me) {
      h = center(d.ph === 'lobby' ? '<div class="p-title">Prijavljujem te…</div>' : '<div class="p-title">Igra je u tijeku</div><div class="p-sub">Pričekaj kraj pa uđi u sljedeću igru.</div>');
    } else switch (d.ph) {
      case 'lobby': {
        const taken = {}; d.P.forEach((p) => { if (p.id !== PID) taken[p.a] = p.n; });
        const grid = AV.map((a, i) => '<button class="av-pick' + (me.a === i ? ' me' : '') + '" data-av="' + i + '"' + (taken[i] !== undefined ? ' disabled' : '') + '>' + avSvg(i, me.a === i ? 'happy' : '') + '<span>' + esc(taken[i] !== undefined ? taken[i] : a.n) + '</span></button>').join('');
        h = '<div class="p-title">Bok, ' + esc(me.n) + '!</div><div class="p-sub">Odaberi svog lika</div><div class="av-grid">' + grid + '</div>' +
          (mode === 'hostp'
            ? '<div class="card join-card" style="width:100%"><div class="p-sub">Neka ostali skeniraju QR ili otvore ' + esc(location.host + location.pathname.replace(/index\.html$/, '')) + ' i upišu kod</div>' +
              (qrSvg(appUrl() + '#' + d.code) ? '<div class="qr" style="width:min(70%,240px)">' + qrSvg(appUrl() + '#' + d.code) + '</div>' : '') +
              '<div class="room-code" style="font-size:3.4rem">' + esc(d.code) + '</div><div class="p-sub">' + d.P.length + ' od ' + d.max + ' igrača u sobi</div></div>' +
              '<button class="btn" id="dstart"' + (d.P.length < 2 ? ' disabled' : '') + '>Započni igru</button>' + (d.P.length < 2 ? '<div class="p-sub">Čekamo barem još jednog igrača.</div>' : '')
            : mode === 'demo'
            ? '<button class="btn" id="dstart">Započni igru</button><div class="p-sub">Igraš protiv tri bota. Bacat će moći i na tebe!</div>'
            : '<div class="waiting">U sobi ' + esc(d.code) + ' · ' + d.P.length + ' igrača. Igra počinje kad domaćin pritisne „Započni“.</div>') +
          '<button class="btn ghost" id="leave">Izađi</button>';
        break;
      }
      case 'intro':
        h = center('<div class="p-title" style="font-size:3rem;color:var(--gold)">' + esc(d.it.t) + '</div><div class="p-sub">' + esc(d.it.sub) + '</div><div style="width:130px" class="bob">' + avSvg(me.a, 'happy') + '</div>');
        break;
      case 'vote': case 'voteResult': {
        const res = d.ph === 'voteResult';
        const mine = L.sent ? L.sent.v : (me.vt !== undefined ? me.vt : (me.ok ? -2 : -1));
        const doorBtns = d.cats.map((c, i) => {
          const who = d.P.filter((p) => p.vt === i);
          const faces = who.map((p) => '<span title="' + esc(p.n) + '">' + avSvg(p.a, 'happy') + '</span>').join('');
          const cls = res ? (i === d.cw ? ' win' : ' lose') : (mine === i ? ' picked' : '');
          return '<button class="door-btn o' + i + cls + '" data-v="' + i + '"' + (res || mine !== -1 ? ' disabled' : '') + '>' + esc(c) +
            (who.length ? '<span class="dcount">' + who.length + (who.length === 1 ? ' glas' : who.length < 5 ? ' glasa' : ' glasova') + '</span>' : '') +
            '<span class="dvoters">' + faces + '</span></button>';
        }).join('');
        h = head + (res ? '' : timerHtml()) +
          '<div class="p-title">' + (res ? 'Kategorija: <span style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</span>' : 'Glasaj za kategoriju') + '</div>' +
          '<div class="door-btns">' + doorBtns + '</div>' +
          (res && d.tie ? '<div class="waiting">Neriješeno! Odlučio je ždrijeb.</div>' : '') +
          (!res && mine !== -1 ? '<div class="waiting">Glas zaprimljen ✔ Gledaj kako glasaju ostali</div>' : '');
        break;
      }
      case 'power': h = head + timerHtml() + powerPhone(d, me); break;
      case 'question': h = head + questionPhone(d, me); break;
      case 'reveal': h = head + revealPhone(d, me); break;
      case 'sort': h = head + timerHtml(8000) + sortPhone(d, me); break;
      case 'link': h = head + timerHtml(8000) + linkPhone(d, me); break;
      case 'sortReveal': case 'linkReveal': {
        const tot = d.ph === 'sortReveal' ? d.so.it.length : d.li.L.length;
        let sol = '';
        if (d.ntv && d.ph === 'sortReveal') sol = '<div class="sort-cols" style="width:100%">' + [0, 1].map((k) => '<div class="sort-col ' + (k ? 'b' : 'a') + '" style="padding:10px"><h3 style="font-size:1.1rem">' + esc(k ? d.so.b : d.so.a) + '</h3><div class="chips">' + d.so.it.filter((_, i) => d.so.key[i] === k).map((x) => '<span class="chip" style="font-size:.9rem">' + esc(x) + '</span>').join('') + '</div></div>').join('') + '</div>';
        if (d.ntv && d.ph === 'linkReveal') sol = '<div class="pairs" style="width:100%">' + d.li.L.map((l, i) => '<div class="pair" style="font-size:1rem"><span>' + esc(l) + '</span><span class="arrow">→</span><span>' + esc(d.li.R[d.li.key[i]]) + '</span></div>').join('') + '</div>';
        h = (d.ntv ? '' : '') + head + '<div class="result ' + (me.k ? 'ok' : 'none') + '"><div class="p-title">Točno ' + me.k + ' od ' + tot + '</div><div class="pts">+' + (me.g || 0) + '</div></div>' +
          (d.ntv ? sol + miniBoard(d, true) : rankStat(d, me));
        if (!d.ntv) h = center(h);
        break;
      }
      case 'fq': h = head + finalePhone(d, me); break;
      case 'fr': {
        const ok = me.ch === d.cor;
        h = center(head + '<div class="result ' + (ok ? 'ok' : me.ch >= 0 ? 'bad' : 'none') + '"><div class="p-title">' + (ok ? (me.mv === 2 ? 'Najbrži! +2 stepenice' : 'Točno! +1 stepenica') : me.ch >= 0 ? 'Netočno, ostaješ' : 'Prespor!') + '</div>' +
          '<div class="p-sub">Bilo je: <b>' + esc(d.q.o[d.cor]) + '</b></div></div>' + (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, true) + '</div>' : stepMeter(d, me)));
        break;
      }
      case 'final': {
        const won = d.win === PID;
        const ranked = d.P.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || b.sc - a.sc);
        const pos = ranked.findIndex((p) => p.id === PID) + 1;
        h = center('<div style="width:150px">' + avSvg(me.a, won ? 'happy' : '') + '</div><div class="p-title" style="font-size:2.4rem;color:var(--gold)">' + (won ? 'Pobijedio si!' : pos + '. mjesto') + '</div>' +
          (won ? '<div class="scroll"><b>Tvoja nagrada: zanimljivost</b>' + esc(d.fact) + '</div>' : '<div class="p-sub">Pobjednik je ' + esc(nameOf(d, d.win)) + '.</div>') +
          '<div class="statline"><div class="stat"><b>' + me.sc + '</b><span>bodova</span></div><div class="stat"><b>' + (me.st || 0) + '/' + d.steps + '</b><span>piramida</span></div></div>' +
          (d.ntv ? '<div class="p-sub">Konačni poredak</div><div class="mboard">' + ranked.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a, p.id === d.win ? 'happy' : '') + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + ' b · ' + (p.st || 0) + '/' + d.steps + '</span></div>').join('') + '</div>' +
            (won ? '' : '<div class="scroll"><b>Nagrada za pobjednika: zanimljivost</b>' + esc(d.fact) + '</div>') : '') +
          (isLocalHost() ? '<button class="btn" id="dagain">Igraj opet</button>' : '<div class="p-sub">Domaćin može pokrenuti novu igru.</div>') + '<button class="btn ghost" id="leave">Izađi</button>');
        break;
      }
    }
    if (freshP && me) { phoneStep = L.s; phoneSound(d, me); }
    $app.innerHTML = demoBar + h;
    if (freshP) $app.classList.add('fresh');
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
    const locked = !answered && !L.fx && Date.now() < (L.lockUntil || 0);
    const buffs = (me.d ? '<span class="tag" style="background:var(--gold);color:#2b1a00">✖️2 Dupli bodovi</span>' : '') + (me.sh ? '<span class="tag">🛡️ Štit</span>' : '') + (hide.length ? '<span class="tag">✂️ Pola-pola</span>' : '');
    const opts = d.q.o.map((o, i) => {
      const gone = hide.includes(i);
      let cls = 'p-opt o' + i + (gone ? ' gone' : '') + (locked ? ' locked' : '');
      if (answered && !gone) cls += mine === i ? ' picked' : ' dim';
      return '<button class="' + cls + '" data-c="' + i + '"' + (answered || gone ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');
    const attackers = (d.ev || []).filter((e) => e.t === PID);
    const hit = attackers.length ? '<div class="p-sub">' + attackers.map((e) => esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + (e.b ? ' (odbijeno)' : '')).join(' · ') + '</div>' : '';
    return timerHtml() + '<div class="p-top"><span class="pill">' + esc(d.q.c) + '</span><span id="tnum"></span></div>' +
      '<div class="p-q">' + esc(d.q.t) + '</div>' + (buffs ? '<div class="buffs">' + buffs + '</div>' : '') + hit +
      '<div class="q-area"><div class="p-opts">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx)) + '</div>' +
      '<div class="waiting">' + (answered ? 'Odgovor zaprimljen ✔' : L.fx ? '' : locked ? 'Očišćeno! Odgovori se otključavaju…' : 'Brže = više bodova!') + '</div>';
  }

  function revealPhone(d, me) {
    const ok = me.ch === d.cor;
    const cls = ok ? 'ok' : me.ch >= 0 ? 'bad' : 'none';
    const title = ok ? 'Točno!' : me.ch >= 0 ? 'Netočno' : 'Vrijeme je isteklo';
    return '<div class="result ' + cls + '"><div style="width:110px">' + avSvg(me.a, ok ? 'happy' : 'dizzy') + '</div><div class="p-title">' + title + '</div>' +
      (ok ? '<div class="pts">+' + me.g + (me.d ? ' (×2)' : '') + '</div>' : '<div class="p-sub">Točan odgovor: <b>' + SHAPES[d.cor] + ' ' + esc(d.q.o[d.cor]) + '</b></div>') + '</div>' +
      (d.ntv ? phoneEvents(d) + miniBoard(d, true) : rankStat(d, me));
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
      (answered ? '<div class="waiting">Zaprimljeno ✔</div>' : '') + (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, false) + '</div>' : '');
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
      // odgovor vrijedi samo ako je dodir i počeo na tom gumbu, nakon što je efekt uklonjen
      b.onpointerdown = () => { b.dataset.ok = (!L.fx && Date.now() >= (L.lockUntil || 0)) ? '1' : ''; };
      b.onclick = (e) => {
        if (L.sent || L.fx) return;
        if (Date.now() < (L.lockUntil || 0)) return;
        if (e && e.detail !== 0 && b.dataset.ok !== '1') return;
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
    const ring = document.getElementById('tring'), arc = document.getElementById('tarc');
    if (num) num.textContent = (wrap || ring) && clockDur ? Math.ceil(ms / 1000) : '';
    if (wrap) wrap.classList.toggle('urgent', ms <= +(wrap.dataset.u || 5000));
    if (arc && clockDur) arc.style.strokeDashoffset = (263.9 * (1 - ms / clockDur)).toFixed(1);
    if (ring) {
      ring.classList.toggle('urgent', ms <= 5000);
      const tvShown = mode === 'host' || (mode === 'demo' && demoView === 'tv');
      const sec = Math.ceil(ms / 1000);
      if (tvShown && ms > 0 && sec <= 5 && sec !== lastTickSec) { lastTickSec = sec; SFX.play('tick'); }
    }
  }
  setInterval(tick, 100);

  if (/^#?[A-Za-z]{4}$/.test(location.hash || '')) mode = 'join';
  render();
})();
