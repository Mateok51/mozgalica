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
    return '<div class="risk"><div class="p-title">Posljednji rizik</div><div class="p-sub">Biraš tajno. Točno: +ulog. Netočno: −ulog.</div>' + throneHtml(d, { mini: 1, noq: 1 }) +
      '<div class="risk-list">' + cards + '</div><div class="waiting">' + (done ? 'Odluka zaključana ✔ Čekamo ostale…' : 'Bez odabira = Sigurno') + '</div></div>';
  }
  function riskTv(d) {
    return '<div class="tv-mid" style="justify-content:center"><div class="tv-title">Posljednji rizik</div><div class="tv-sub">Svatko tajno bira ulog za zadnje pitanje (do 3.000 bodova)</div>' + throneHtml(d) + lineup(d, { check: true }) + '</div>';
  }
  function bindRisk() { document.querySelectorAll('#app [data-trk]').forEach((b) => { b.onclick = () => { if (L.sent) return; AUDIO.play('tap'); sendInput({ r: +b.dataset.trk }); }; }); }
