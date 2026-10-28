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
