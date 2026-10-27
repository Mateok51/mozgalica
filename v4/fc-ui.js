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
