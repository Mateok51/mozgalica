  // ===================== LEGENDE OVE KRČME: prikaz =====================
  // Pregled je osobni (svaki uređaj ga sam otvara i zatvara) i ne blokira domaćina; sadržaj dolazi gotov od domaćina (d.lg).
  const LEGV = { open: -1, done: -1, png: null, pngId: -1, busy: false, note: '' };
  const legP = (d, id) => d.P.find((p) => p.id === id);
  const legRank = (d) => d.P.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || b.sc - a.sc);
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
    return '<div class="lg-wrap' + (tv ? ' tv-lg' : '') + instant + '" id="legWrap"><div class="lg-book" id="legBook">' +
      '<div class="lg-head"><div class="lg-t">📜 Legende ove krčme</div><div class="lg-sub">Svaka večer u krčmi stvara nove legende…</div></div>' +
      '<div class="lg-story">' + esc(L0.story || '') + '</div>' +
      '<div class="lg-list">' + crown + cards + '</div>' +
      '<div class="lg-act">' + share + '<div class="lg-note" role="status">' + esc(LEGV.note) + '</div><button class="btn ghost" id="legClose">Natrag na poredak</button></div>' +
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
      c.textAlign = 'right'; c.fillStyle = '#ffe2a6'; c.font = '900 36px ' + BODY; c.fillText(d.steps ? (p.st || 0) + '/' + d.steps : String(p.sc), W - 110, ry + 44);
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
