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
    q('[data-rc]').forEach((b) => { b.onclick = () => { const k = b.dataset.rc; AUDIO.play(k === 'rcDecline' || k === 'rcCancel' ? 'tap' : 'confirm'); L.rcOpen = false; pactSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
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
    if (!d.opt) return '';
    if (!game) return d.opt.rc ? '<div class="lob-info">⚔️ Rivalski obračuni su uključeni</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l">⚔️ Rivalski obračuni<small>Dobrovoljni izazovi s malim ulogom (od 5. pitanja)</small></span><button class="tgl' + (d.opt.rc ? '' : ' off') + '" data-rcopt="' + (d.opt.rc ? 0 : 1) + '">' + (d.opt.rc ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
