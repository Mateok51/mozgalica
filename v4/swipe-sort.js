  // ---- Razvrstavanje: jedna velika kartica, swipe ulijevo/udesno (ista logika slanja: niz 0/1) ----
  const SRT_FLY = 260, SRT_COOL = 380;
  const srtCur = () => L.sortP.findIndex((x) => x < 0);
  function sortPhone(d, me) {
    const n = d.so.it.length;
    if (!L.sortP || L.sortP.length !== n) { L.sortP = new Array(n).fill(-1); L.srtH = []; L.srtLock = false; L.srtCool = 0; }
    const sent = !!(L.sent || me.ok), cur = srtCur(), got = n - L.sortP.filter((x) => x < 0).length;
    const head = '<div class="srt-head"><div class="p-title">Razvrstaj pojmove</div><div class="p-sub">' + (sent ? 'Poslano ✔ Čekamo ostale…' : 'Prevuci karticu ulijevo ili udesno.') + '</div></div>';
    if (sent) return '<div class="srt sent">' + head + sortZonesHtml(d, L.sortP, null) + '</div>';
    const cnt = (k) => L.sortP.filter((x) => x === k).length;
    const anim = L.srtBack != null ? ' back-' + (L.srtBack ? 'b' : 'a') : (L.srtIn ? ' enter' : '');
    L.srtBack = null; L.srtIn = false;
    const card = cur >= 0 ? '<div class="swp-card' + anim + '" data-si="' + cur + '" tabindex="0" role="group" aria-label="Pojam: ' + esc(d.so.it[cur]) + '"><span>' + esc(d.so.it[cur]) + '</span></div>' : '<div class="swp-card swp-end"><span>Sve razvrstano ✔</span></div>';
    const peek = cur >= 0 && cur < n - 1 ? '<div class="swp-card swp-peek" aria-hidden="true"></div>' : '';
    const side = (k) => '<div class="swp-side ' + (k ? 'b' : 'a') + '" data-z="' + k + '"><span class="swp-arr">' + (k ? '▶' : '◀') + '</span><b>' + esc(k ? d.so.b : d.so.a) + '</b><i>' + cnt(k) + '</i></div>';
    const stage = '<div class="swp-stage">' + side(0) + '<div class="swp-mid">' + peek + card + '</div>' + side(1) + '</div>';
    const prog = '<div class="swp-prog"><span class="swp-pt">' + Math.min(n, got + (cur >= 0 ? 1 : 0)) + '/' + n + ' pojmova</span><span class="swp-bar"><span style="width:' + Math.round(got / n * 100) + '%"></span></span></div>';
    const btns = '<div class="swp-btns"><button class="swp-b" data-go="0" aria-label="Lijevo: ' + esc(d.so.a) + '"' + (cur < 0 ? ' disabled' : '') + '>◀</button>' +
      '<button class="swp-b undo" id="swpUndo"' + (L.srtH.length ? '' : ' disabled') + '>↶ Poništi</button>' +
      '<button class="swp-b" data-go="1" aria-label="Desno: ' + esc(d.so.b) + '"' + (cur < 0 ? ' disabled' : '') + '>▶</button></div>';
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
        dx = e.clientX - x0; dy = e.clientY - y0;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        card.style.transform = 'translate(' + dx + 'px,' + dy * 0.35 + 'px) rotate(' + tilt(dx) + 'deg)';
        glow(dx);
      };
      const end = (e, cancel) => {
        if (e.pointerId !== id) return;
        id = null; try { card.releasePointerCapture(e.pointerId); } catch (er) {}
        card.classList.remove('drag');
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
