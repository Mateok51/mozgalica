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
    { n: 'Vila',   spr: 'vila' },
    { n: 'Ovan',   spr: 'ovan' },
  ];
  // naslikani likovi: jedna slika po pozi; prvi se nude pri odabiru
  const PICK_ORDER = [8, 9, 0, 1, 2, 3, 4, 5, 6, 7];
  const SPR_POSES = ['idle', 'happy', 'sad', 'shocked', 'attack', 'victory'];
  AV.forEach((a) => { if (a.spr) SPR_POSES.forEach((p) => { const im = new Image(); im.src = 'chars/' + a.spr + '/' + p + '.webp'; }); });
  const OLD_MOOD = { sad: 'dizzy', shocked: 'dizzy', victory: 'happy', attack: '' };
  const TOP = { round: 22, square: 26, tall: 14, pear: 20 };
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
  }
  const avCache = {};
  function avSvg(i, mood) {
    const A = AV[i] || AV[0];
    if (A.spr) {
      const pose = SPR_POSES.includes(mood) ? mood : mood === 'dizzy' ? 'sad' : 'idle';
      return '<img class="av spr spr-' + A.spr + ' m-' + pose + '" src="chars/' + A.spr + '/' + pose + '.webp" alt="" draggable="false">';
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

  // ---------- pozadina: unutrašnjost krčme (drveni zid, prozor u noć, kamin, svijeće, šank na TV-u) ----------
  (function backdrop() {
    const c = document.getElementById('bg');
    if (!c || !c.getContext) return;
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
    if (!box) return;
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

