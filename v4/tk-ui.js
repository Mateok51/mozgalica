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
    document.querySelectorAll('#app [data-tk]').forEach((b) => { b.onclick = () => { const k = b.dataset.tk; AUDIO.play(k === 'tkDecline' ? 'tap' : 'confirm'); pactSend({ k, id: +b.dataset.id }); }; });
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
    if (!d.opt) return '';
    if (!game) return d.opt.tk ? '<div class="lob-info">🍺 Krčmarove tajne ponude su uključene</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l">🍺 Krčmarove tajne ponude<small>Krčmar povremeno nudi igračima tajne oklade na uspjeh njihovih protivnika.</small></span><button class="tgl' + (d.opt.tk ? '' : ' off') + '" data-tkopt="' + (d.opt.tk ? 0 : 1) + '">' + (d.opt.tk ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
