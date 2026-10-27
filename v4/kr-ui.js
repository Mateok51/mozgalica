  // ===================== KRČMAR 2.0: sučelje ploče bodova =====================
  // Ispod poretka: privatni dio (samo ovaj igrač) i „Nastavi”. Igra ide dalje kad svi potvrde (domaćin odlučuje).
  function krReadyCount(d) { const ps = d.P.filter((p) => p.c && !p.b); return [ps.filter((p) => p.ok).length, ps.length]; }
  // privatni dio ploče: ponuda pakta (blokira Nastavi dok ne odlučiš), savez + izdaja
  function krPriv(d, me) {
    if (!PV) return '';
    if (PV.ko) {
      const o = PV.ko;
      const t = o.k === 'fav' ? '🗳️ Krčmarova usluga' : '📜 Tajni zadatak';
      const sub = o.k === 'fav' ? esc(o.line) : esc(o.line) + '<br><span class="up">Uspjeh +' + o.win + '</span> · <span class="dn">neuspjeh −' + o.loss + '</span>';
      return { block: 1, html: '<div class="pk-inv kr-card kr-off"><div class="pk-inv-h"><b>🍺 ' + t + '</b></div><div class="pk-inv-s">' + sub + '</div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-kro="1">Prihvati</button><button class="btn ghost pk-dec" data-kro="0">Odbij</button></div></div>' + krMine() };
    }
    const mine = krMine();
    if (PV.kp) {
      const o = PV.kp, m = pById(d, o.m);
      if (o.ans == null) return { block: 1, html: '<div class="pk-inv kr-card"><div class="pk-inv-h"><span class="mini">' + (m ? avSvg(m.a, 'happy') : '') + '</span><b>🍺 Krčmar ti nudi tajni pakt s: ' + esc(o.x) + '</b></div>' +
        '<div class="pk-inv-s">Oboje točno → riznica +100, jedan točno → +40. Pakt nastaje samo ako oboje prihvatite.</div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-krp="1">Prihvati</button><button class="btn ghost pk-dec" data-krp="0">Odbij</button></div></div>' };
      return '<div class="kr-note">🍺 Čekamo krčmarov odgovor…</div>' + mine;
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
      return h + '</div>' + mine;
    }
    return mine;
  }
  // aktivni zadatak / usluga (mala oznaka)
  function krMine() {
    let h = '';
    if (PV.kt) h += '<div class="kr-tag">📜 ' + esc(PV.kt.line) + (PV.kt.kind === 'st3' ? ' <b>' + PV.kt.n + '/3</b>' : '') + '</div>';
    if (PV.kf) h += '<div class="kr-tag">🗳️ Tvoj glas bira sljedeću kategoriju</div>';
    return h;
  }
  function krBox(d, me) {
    if (!d.rw || !me) return '';
    const [r, n] = krReadyCount(d), mine = me.ok || (L && L.sent);
    const priv = krPriv(d, me);
    const go = mine ? '<div class="kr-wait">Čekamo ostale… <b>' + r + '/' + n + '</b></div>'
      : priv.block ? '' : '<button class="btn win-cta kr-go" id="krok">Nastavi</button>' + (n > 1 ? '<div class="kr-wait">Spremno <b>' + r + '/' + n + '</b></div>' : '');
    const ph0 = priv && typeof priv === 'object' ? priv.html || '' : priv || '';
    const dev = PV && PV.bs && game && mode !== 'player' ? (sfDev() ? sfScn(d) : '<button class="kr-dev" data-sfdev="1" aria-label="Testni način">🤖</button>') : '';
    return '<div class="kr-box">' + ph0 + go + dev + '</div>';
  }
  function krTv(d) {
    if (!d.rw) return '';
    const [r, n] = krReadyCount(d);
    return n ? '<div class="kr-wait tv" data-bk="krr" data-bv="' + r + '">Spremno <b>' + r + '/' + n + '</b></div>' : '';
  }
  function bindKr(d) {
    document.querySelectorAll('#app [data-kro]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.kro === '1' ? 'confirm' : 'tap'); pactSend({ k: 'krOff', yes: b.dataset.kro === '1' }); }; });
    document.querySelectorAll('#app [data-krp]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.krp === '1' ? 'confirm' : 'tap'); pactSend({ k: 'krPact', yes: b.dataset.krp === '1' }); }; });
    bind('krok', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });
  }
  // ----- izazov vođi: javni prijedlog na ploči -----
  function krChallenge(d, me) {
    const o = d.lc; if (!o) return '';
    const A = pById(d, o.a), B = pById(d, o.b), mine = me && me.id === o.a;
    const head = '<div class="pk-inv kr-card kr-ch"><div class="pk-inv-h"><span class="mini">' + (A ? avSvg(A.a, 'attack') : '') + '</span><b>⚔️ ' + esc(A ? A.n : '?') + ', izazivaš li vođu ' + esc(B ? B.n : '?') + '?</b></div>' +
      '<div class="pk-inv-s">Nadvlačenje konopa · ulog ' + o.sa + ' protiv ' + o.sb + ' · obrana krune +' + o.g + '</div>';
    if (o.st === 'o') return head + (mine ? '<div class="pk-row"><button class="btn pk-acc" data-krc="1">Izazovi</button><button class="btn ghost pk-dec" data-krc="0">Ne ovaj put</button></div>' : '<div class="kr-note">' + esc(A ? A.n : '?') + ' odlučuje…</div>') + '</div>';
    if (o.st === 'y') return head + '<div class="kr-note">⚔️ Izazov prihvaćen! Dvoboj kreće nakon ploče.</div></div>';
    return head + '<div class="kr-note">🍺 Možda drugi put…</div></div>';
  }
  // ----- nadvlačenje konopa -----
  function ropeBar(d) {
    const r = d.rp || { pa: 0, pb: 0, m: 7 }, du = d.du, A = pById(d, du.a), B = pById(d, du.b);
    const x = Math.max(-1, Math.min(1, (r.pa - r.pb) / r.m));
    return '<div class="rope"><span class="rope-p a"><span class="mini">' + (A ? avSvg(A.a, x > 0 ? 'happy' : 'attack') : '') + '</span><b>' + esc(A ? A.n : '') + '</b><i>' + r.pa + '</i></span>' +
      '<span class="rope-t"><span class="rope-line"></span><span class="rope-k" style="--x:' + (-x * 50).toFixed(1) + '%"></span><span class="rope-mid"></span></span>' +
      '<span class="rope-p b"><i>' + r.pb + '</i><b>' + esc(B ? B.n : '') + '</b><span class="mini">' + (B ? avSvg(B.a, x < 0 ? 'happy' : 'attack') : '') + '</span></span></div>';
  }
  function ropePhone(d, me) {
    const du = d.du, mine = me && (me.id === du.a || me.id === du.b);
    if (!mine) return timerHtml() + '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="waiting">Gledaš dvoboj. Točno vuče, netočno vraća!</div>';
    const list = d.rp.list, st = L.rp || (L.rp = { i: 0, r: [], fb: '', last: 1 });
    const fb = st.fb ? '<div class="mg-fb ' + (st.last ? 'ok' : 'bad') + ' pop">' + esc(st.fb) + '</div>' : '<div class="mg-fb"></div>';
    if (st.i >= list.length) return timerHtml() + '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="waiting">Nema više tvrdnji — čekamo kraj!</div>';
    return timerHtml() + '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="mg-q">' + esc(list[st.i][0]) + '</div><div class="mg-tf"><button class="btn" data-rpv="1">Točno</button><button class="btn ghost" data-rpv="0">Netočno</button></div>' + fb;
  }
  function ropeTv(d) { return '<div class="tv-mid"><div class="du-k">⚔️ Nadvlačenje konopa</div>' + ropeBar(d) + '<div class="du-note">Točan odgovor vuče konop, netočan ga vraća.</div></div>'; }
  function ropeResult(d) {
    const du = d.du, rr = du.rr || {}, W = du.w ? pById(d, du.w) : null, Lp = du.w ? pById(d, du.w === du.a ? du.b : du.a) : null;
    const pose = (id) => (!du.w ? 'idle' : id === du.w ? 'victory' : 'sad');
    const res = !W ? 'Neriješeno — nitko ne gubi bodove.' : du.w === du.a ? '🏆 <b>' + esc(W.n) + '</b> ruši vođu! +' + rr.t + ' od ' + esc(Lp ? Lp.n : '') : '🛡️ <b>' + esc(W.n) + '</b> brani krunu! +' + rr.t + ' od ' + esc(Lp ? Lp.n : '') + ' · obrana krune +' + rr.g;
    return '<div class="du-k">⚔️ Nadvlačenje konopa</div>' + duelVs(d, pose) + '<div class="du-res">' + res + '</div><div class="du-ms">' + (rr.pa || 0) + ' : ' + (rr.pb || 0) + '</div>' + (du.o ? '<div class="du-note">' + esc(du.o) + '</div>' : '');
  }
  function bindRope(d) {
    document.querySelectorAll('#app [data-krc]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.krc === '1' ? 'confirm' : 'tap'); pactSend({ k: 'krCh', yes: b.dataset.krc === '1' }); }; });
    document.querySelectorAll('#app [data-rpv]').forEach((b) => { b.onclick = () => {
      const st = L.rp, list = d.rp && d.rp.list; if (!st || !list || st.i >= list.length) return;
      const v = +b.dataset.rpv, ok = v === list[st.i][1];
      st.r.push(v); st.i++; st.last = ok ? 1 : 0; st.fb = ok ? '✓ Vuci!' : '✗ Konop klizi';
      AUDIO.play(ok ? 'tap' : 'wrong'); sendPartial({ r: st.r.slice() }); phoneRender(true);
    }; });
  }
