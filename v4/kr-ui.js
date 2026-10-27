  // ===================== KRČMAR 2.0: sučelje ploče bodova =====================
  // Ispod poretka: privatni dio (samo ovaj igrač) i „Nastavi”. Igra ide dalje kad svi potvrde (domaćin odlučuje).
  function krReadyCount(d) { const ps = d.P.filter((p) => p.c && !p.b); return [ps.filter((p) => p.ok).length, ps.length]; }
  // privatni dio ploče: ponuda pakta (blokira Nastavi dok ne odlučiš), savez + izdaja
  function krPriv(d, me) {
    if (!PV) return '';
    if (PV.kp) {
      const o = PV.kp, m = pById(d, o.m);
      if (o.ans == null) return { block: 1, html: '<div class="pk-inv kr-card"><div class="pk-inv-h"><span class="mini">' + (m ? avSvg(m.a, 'happy') : '') + '</span><b>🍺 Krčmar ti nudi tajni pakt s: ' + esc(o.x) + '</b></div>' +
        '<div class="pk-inv-s">Oboje točno → riznica +100, jedan točno → +40. Pakt nastaje samo ako oboje prihvatite.</div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-krp="1">Prihvati</button><button class="btn ghost pk-dec" data-krp="0">Odbij</button></div></div>' };
      return '<div class="kr-note">🍺 Čekamo krčmarov odgovor…</div>';
    }
    if (PV.k) {
      const k = PV.k, m = pById(d, k.m);
      let h = '<div class="sf-sec kr-ally"><div class="sf-ally"><span class="mini">' + (m ? avSvg(m.a, 'happy') : '') + '</span><span>🍻 <b>' + esc(m ? m.n : '?') + '</b></span><span class="sf-tre">💰 <b>' + fmtN(k.tre) + '</b></span></div>';
      if (k.wait) h += '<div class="sf-note">Izdaja je moguća za ' + k.wait + (k.wait === 1 ? ' pitanje' : ' pitanja') + '.</div>';
      else if (k.cb) {
        if (k.bt) h += '<div class="sf-row"><span class="sf-bt on">🗡️ Izdaja pripremljena</span><button class="pk-b" data-bt="0">Odustani</button></div>';
        else if (SF.btAsk) h += '<div class="sf-bt">🗡️ Nakon sljedećeg pitanja uzimaš riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova (najviše 300).</div><div class="pk-row"><button class="btn pk-acc" data-bt="1">Potvrdi</button><button class="btn ghost" data-sfbt="0">Odustani</button></div>';
        else h += '<button class="sf-link sf-btask" data-sfbt="1">🗡️ Pripremi izdaju</button>';
      }
      return h + '</div>';
    }
    return '';
  }
  function krBox(d, me) {
    if (!d.rw || !me) return '';
    const [r, n] = krReadyCount(d), mine = me.ok || (L && L.sent);
    const priv = krPriv(d, me);
    const go = mine ? '<div class="kr-wait">Čekamo ostale… <b>' + r + '/' + n + '</b></div>'
      : priv.block ? '' : '<button class="btn win-cta kr-go" id="krok">Nastavi</button>' + (n > 1 ? '<div class="kr-wait">Spremno <b>' + r + '/' + n + '</b></div>' : '');
    return '<div class="kr-box">' + (priv.html || priv || '') + go + '</div>';
  }
  function krTv(d) {
    if (!d.rw) return '';
    const [r, n] = krReadyCount(d);
    return n ? '<div class="kr-wait tv" data-bk="krr" data-bv="' + r + '">Spremno <b>' + r + '/' + n + '</b></div>' : '';
  }
  function bindKr(d) {
    document.querySelectorAll('#app [data-krp]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.krp === '1' ? 'confirm' : 'tap'); pactSend({ k: 'krPact', yes: b.dataset.krp === '1' }); }; });
    bind('krok', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });
  }
