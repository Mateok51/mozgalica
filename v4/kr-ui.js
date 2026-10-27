  // ===================== KRČMAR 2.0: sučelje ploče bodova =====================
  // Ispod poretka: privatni dio (samo ovaj igrač) i „Nastavi”. Igra ide dalje kad svi potvrde (domaćin odlučuje).
  function krReadyCount(d) { const ps = d.P.filter((p) => p.c && !p.b); return [ps.filter((p) => p.ok).length, ps.length]; }
  function krPriv(d, me) { return ''; }
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
    bind('krok', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });
  }
