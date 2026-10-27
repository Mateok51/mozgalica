  // ===================== TAVERN SOCIAL FLOW 2.0: sučelje =====================
  // Tajni kutak (🗝️): jedno mjesto za privatne radnje; Vrijeme za dogovore (faza 'deal'); šapat jednim dodirom.
  // Sve što se vidi dolazi iz PV (privatno, samo ovaj igrač) ili javnog d; domaćin sve provjerava.
  const SF_BUSY_PH = { question: 1, fq: 1, duel: 1, sort: 1, link: 1, order: 1, hilo: 1, blitz: 1, maj: 1, secret: 1, secret2: 1 };
  const SF = { open: false, qi: 0, btAsk: false, rules: false, scn: false, seen: new Set(), told: new Set(), wh: true };
  try { SF.wh = localStorage.getItem('mz_sf_wh') !== '0'; } catch (e) {}
  const sfIntroSeen = () => { try { return localStorage.getItem('mz_sf_intro') === '1'; } catch (e) { return true; } };
  const sfOnPV = () => !!(PV && PV.sf);
  const sfName = (d, id) => { const p = pById(d, id); return p ? esc(p.n) + (p.b ? ' 🤖' : '') : '?'; };
  // odluke koje čekaju (najvažnije prvo): krčmarova ponuda se zaključava najranije, zatim pakt, zatim obračun
  function sfQueue(d) {
    const out = [];
    if (!PV) return out;
    if (PV.tk && PV.tk.st === 'o') out.push({ key: 't' + PV.tk.id, k: 'tk', o: PV.tk });
    for (const o of PV.inv || []) if (pById(d, o.f)) out.push({ key: 'p' + (o.id || o.f), k: 'pk', o });
    for (const o of (PV.rc && PV.rc.inv) || []) if (pById(d, o.f)) out.push({ key: 'r' + (o.id || o.f), k: 'rc', o });
    return out;
  }
  // zauzet sam samo dok odgovaram; dok drugi igraju dvoboj, gledatelji su slobodni
  const sfSpect = (d, me) => !!(d.du && me && me.id !== d.du.a && me.id !== d.du.b && (d.ph === 'duelIntro' || d.ph === 'duel' || d.ph === 'duelResult'));
  const sfBusyMe = (d, me) => !!SF_BUSY_PH[d.ph] && !(d.ph === 'duel' && sfSpect(d, me));
  function sfUnread(d) { return sfQueue(d).filter((x) => !SF.seen.has(x.key)).length; }
  // kratka privatna obavijest + zvuk za NOVU važnu ponudu (tijekom odgovaranja čeka kraj pitanja, kao i ostale obavijesti)
  function sfNotify(d) {
    if (!sfOnPV()) return;
    const me = meOf(d);
    if (d.ph === 'duelIntro' && sfSpect(d, me) && PV.can && PV.cand && PV.cand.length && !SF.told.has('du' + d.s)) { SF.told.add('du' + d.s); toastHold.push(['🍻 Dok traje dvoboj, možeš potajno ponuditi pakt 🗝️', 'pact']); }
    for (const x of sfQueue(d)) {
      if (SF.told.has(x.key)) continue;
      SF.told.add(x.key);
      const t = x.k === 'tk' ? '🍺 Krčmar ima tajnu ponudu za tebe!' : x.k === 'pk' ? '🍻 ' + ((pById(d, x.o.f) || {}).n || '?') + ' ti nudi tajni pakt!' : '⚔️ ' + ((pById(d, x.o.f) || {}).n || '?') + ' te izaziva na obračun!';
      toastHold.push([t + ' 🗝️', 'pact']);
    }
  }
  function sfCard(d, x) {
    if (x.k === 'tk') return tkBar(Object.assign({}, d, { ph: 'vote' }), meOf(d)).replace('<div class="pk-inv tk-inv"', '<div class="pk-inv tk-inv sf-card"');
    if (x.k === 'pk') {
      const f = pById(d, x.o.f);
      return '<div class="pk-inv sf-card"><div class="pk-inv-h"><span class="mini">' + avSvg(f.a, 'happy') + '</span><b>🍻 ' + sfName(d, x.o.f) + ' ti nudi tajni pakt</b></div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-pk="accept" data-f="' + esc(x.o.f) + '">Prihvati</button><button class="btn ghost pk-dec" data-pk="decline" data-f="' + esc(x.o.f) + '">Odbij</button></div></div>';
    }
    const f = pById(d, x.o.f), o = x.o, st = PV.rc ? PV.rc.st : 200;
    const t = o.rev ? '🔥 ' + sfName(d, o.f) + ' traži osvetu!' : o.riv ? '⚔️ Obračun s rivalom: ' + sfName(d, o.f) + ' te izaziva!' : '⚔️ ' + sfName(d, o.f) + ' te izaziva na rivalski obračun!';
    return '<div class="pk-inv rc-inv sf-card"><div class="pk-inv-h"><span class="mini">' + avSvg(f.a, 'attack') + '</span><b>' + t + '</b></div>' +
      '<div class="pk-inv-s">Ulog <b>' + st + '</b> · sljedeće pitanje</div>' +
      '<div class="pk-row"><button class="btn pk-acc" data-rc="rcAccept" data-f="' + esc(o.f) + '">Prihvati</button><button class="btn ghost pk-dec" data-rc="rcDecline" data-f="' + esc(o.f) + '">Odbij</button></div></div>';
  }
  const sfRules = () => '<div class="sf-rules"><div class="sf-h">🍻 Tajni paktovi</div><ol>' +
    '<li><b>1</b>Oboje točno → riznica +75.</li>' +
    '<li><b>2</b>🔮 na odgovoru šapne ga savezniku.</li>' +
    '<li><b>3</b>Odani do finala: riznica +40 %, dijeli se. Izdaja: uzimaš riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova.</li></ol></div>';
  function sfPact(d, me) {
    if (!PV || !PV.k) return '';
    const k = PV.k, m = pById(d, k.m);
    let h = '<div class="sf-sec"><div class="sf-ally"><span class="mini">' + (m ? avSvg(m.a, 'happy') : '') + '</span><span>🍻 <b>' + sfName(d, k.m) + '</b></span>' +
      '<span class="sf-tre">💰 <b>' + fmtN(k.tre) + '</b></span></div>';
    if (k.dl || k.cb) {
      if (k.bt) h += '<div class="sf-row"><span class="sf-bt on">🗡️ Izdaja pripremljena</span><button class="pk-b" data-bt="0">Odustani</button></div>';
      else if (SF.btAsk) h += '<div class="sf-bt">🗡️ Nakon sljedećeg pitanja uzimaš riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova.</div>' +
        '<div class="pk-row"><button class="btn pk-acc" data-bt="1">Potvrdi</button><button class="btn ghost" data-sfbt="0">Odustani</button></div>';
      else h += '<button class="sf-link sf-btask" data-sfbt="1">🗡️ Pripremi izdaju</button>';
    } else if (k.btl) h += '<div class="sf-bt on">🗡️ Izdaja zaključana</div>';
    return h + '</div>';
  }
  function sfSend(d, me) {
    let h = '';
    if (PV.out) h += '<div class="pk-bar out"><span class="pk-t">🍻 Ponuda poslana: <b>' + sfName(d, PV.out.t) + '</b></span><button class="pk-b" data-pk="cancel">Povuci</button></div>';
    else if (PV.can && PV.cand && PV.cand.length) h += '<div class="sf-sec"><div class="sf-h">🍻 Ponudi pakt</div><div class="pk-cands">' + PV.cand.map((id) => { const p = pById(d, id); return p ? '<button class="pk-cand" data-pk="offer" data-to="' + esc(id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span>' + sfName(d, id) + '</button>' : ''; }).join('') + '</div></div>';
    const R0 = PV.rc;
    if (R0 && R0.out) h += '<div class="pk-bar out rc-out"><span class="pk-t">⚔️ Izazov poslan: <b>' + sfName(d, R0.out.t) + '</b></span><button class="pk-b" data-rc="rcCancel">Povuci</button></div>';
    else if (R0 && R0.can && R0.cand && R0.cand.length && !d.rc) h += '<div class="sf-sec"><div class="sf-h">⚔️ Rivalski obračun <small>ulog ' + R0.st + '</small></div><div class="pk-cands">' +
      R0.cand.slice().sort((x, y) => (y.rev + y.riv) - (x.rev + x.riv)).map((c) => { const p = pById(d, c.id); return p ? '<button class="pk-cand" data-rc="rcOffer" data-to="' + esc(c.id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span>' + sfName(d, c.id) + (c.rev ? ' <em>🔥 osveta</em>' : c.riv ? ' <em>⚔️ rival</em>' : '') + '</span></button>' : ''; }).join('') + '</div></div>';
    return h;
  }
  const SCN = [['offer', 'Bot mi šalje ponudu za pakt'], ['accept', 'Bot prihvaća moj pakt'], ['decline', 'Bot odbija moj pakt'], ['whisper', 'Bot mi šapne odgovor'], ['betray', 'Bot priprema izdaju'], ['loyal', 'Bot ostaje odan'], ['double', 'Oba partnera pripremaju izdaju']];
  // skriveni razvojni izbornik: 5 dodira na naslov „Tajni kutak” ili #dev u adresi (samo lokalni domaćin u testnom načinu s botovima)
  const sfDev = () => { if (SF.dev) return true; try { return /dev/.test(location.hash) || sessionStorage.getItem('mz_dev') === '1'; } catch (e) { return false; } };
  function sfScn(d) {
    if (!PV || !PV.bs || !game || !game.sfScenario || mode === 'player' || !sfDev()) return '';
    return '<div class="sf-sec sf-scn"><button class="pk-b" data-sfscnopen="1">🤖 Testni scenariji ' + (SF.scn ? '▴' : '▾') + '</button>' +
      (SF.scn ? '<div class="sf-scn-l">' + SCN.map(([k, t]) => '<button class="pk-cand" data-scn="' + k + '">' + t + '</button>').join('') + '</div>' : '') + '</div>';
  }
  // sadržaj Tajnog kutka: samo ono što je trenutačno relevantno
  function sfBody(d, me) {
    if (!PV) return '<div class="sf-empty">Trenutačno nema tajnih poslova.</div>';
    const pactsIn = PV.can || PV.k || (PV.inv || []).length || PV.out;
    if (pactsIn && SF.rules) return sfRules() + '<div class="pk-row"><button class="btn pk-acc" data-sfintro="1">U redu</button></div>';
    const Q = sfQueue(d);
    let h = '';
    if (Q.length) {
      SF.qi = Math.min(SF.qi, Q.length - 1);
      const x = Q[SF.qi];
      for (const y of Q) SF.seen.add(y.key);
      h += (Q.length > 1 ? '<div class="sf-qn">Odluka ' + (SF.qi + 1) + '/' + Q.length + '<button class="pk-b" data-sfq="1">Sljedeća ›</button></div>' : '') + sfCard(d, x);
    }
    h += sfPact(d, me) + (Q.length ? '' : sfSend(d, me));   // jedna važna odluka u jednom trenutku: slanje ponuda čeka
    if (!h) h = '<div class="sf-empty">Nema tajnih poslova.</div>';
    if (pactsIn) h += '<button class="sf-link" data-sfrules="1">📜 Pravila</button>';
    return h + sfScn(d);
  }
  // gumb 🗝️ Tajne (mirne faze) i kartica kutka; tijekom odgovaranja se zatvara (stanje ponuda ostaje)
  function sfKey(d, me) {
    if (!phoneShown() || !me || !sfOnPV() || d.ph === 'lobby' || d.ph === 'final' || d.ph === 'deal' || sfBusyMe(d, me) || d.fin) { SF.open = false; return ''; }
    const n = sfUnread(d);
    const btn = '<button class="sf-key' + (n ? ' new' : '') + '" data-sfk="1" aria-label="Tajne' + (n ? ', nepročitano ' + n : '') + '"><span class="sf-ki">🗝️</span><span class="sf-kt">Tajne</span>' + (n ? '<span class="sf-badge">' + n + '</span>' : PV.k ? '<span class="sf-ally-dot" title="Savez">🍻</span>' : '') + '</button>';
    if (!SF.open) return btn;
    return btn + '<div class="sf-sheet" role="dialog" aria-label="Tajni kutak"><div class="sf-sheet-in"><div class="sf-top"><b data-sfdev="1">🗝️ Tajni kutak</b><button class="pk-l x" data-sfk="0" aria-label="Zatvori">✕</button></div>' + sfBody(d, me) + '</div></div>';
  }
  // Vrijeme za dogovore (mobitel): kutak je odmah otvoren, bez žurbe u testnom načinu
  function dealPhone(d, me) {
    const dl = d.dl || {}, mine = me && (me.ok || (L && L.sent));
    const ps = d.P.filter((p) => p.c && !p.b), ready = ps.filter((p) => p.ok).length;
    // gumb za spremnost odmah ispod naslova: uvijek vidljiv bez pomicanja i ne ispod okruglih gumba za zvuk
    const go = mine ? '<div class="sf-go"><span class="ht-go">Čekamo ostale…</span><span class="ht-ready">Spremno: <b>' + ready + '/' + ps.length + '</b></span></div>'
      : '<div class="sf-go"><button class="btn win-cta sf-ok" id="sfready">' + (dl.solo ? 'Nastavi kada si spreman ✓' : 'Spreman ✓') + '</button>' + (ps.length > 1 ? '<span class="ht-ready">Spremno: <b>' + ready + '/' + ps.length + '</b></span>' : '') + '</div>';
    return (dl.solo ? '' : timerHtml(5000)) + '<div class="sf-deal"><div class="sf-dt">🍻 VRIJEME ZA DOGOVORE</div><div class="sf-dl">' + esc(dl.t || '') + '</div></div>' +
      go + '<div class="sf-inline">' + sfBody(d, me) + '</div>';
  }
  // TV / javni prikaz: samo najava i koliko je spremno (nikakvi privatni podaci)
  function dealTv(d) {
    const dl = d.dl || {}, ps = d.P.filter((p) => p.c && !p.b), ready = ps.filter((p) => p.ok).length;
    return '<div class="sf-deal tv"><div class="sf-dt">🍻 VRIJEME ZA DOGOVORE</div><div class="sf-dl">' + esc(dl.t || '') + '</div><div class="sf-ds">Igrači sklapaju dogovore na mobitelima…</div>' +
      '<div class="ht-ready" data-bk="sfr" data-bv="' + ready + '">Spremno: <b>' + ready + '/' + ps.length + '</b></div></div>';
  }
  // tijekom pitanja: samo saveznik, riznica, šapat (jedan dodir uz odgovor) i primljeni šapat
  function sfQuestionBar(d, me) {
    if (!PV || !PV.k || d.ph !== 'question') return '';
    const k = PV.k, m = pById(d, k.m);
    const act = k.wsent ? '<span class="pk-sent">🔮 Šapnuto</span>' : '<button class="pk-b sf-whtg' + (SF.wh ? ' on' : '') + '" data-sfwh="1" aria-pressed="' + SF.wh + '">' + (SF.wh ? '🔮 Odgovori i šapni' : '🔮 Bez šapata') + '</button>';
    return '<div class="pk-bar sf-qbar"><span class="mini">' + (m ? avSvg(m.a, 'idle') : '') + '</span><span class="pk-t"><b>🍻 ' + sfName(d, k.m) + '</b><span class="pk-tre" data-bk="pktre" data-bv="' + k.tre + '">💰 ' + fmtN(k.tre) + '</span></span>' +
      (k.wh !== undefined ? '<span class="pk-whin" data-bk="pkwh" data-bv="' + k.wh + '">🔮 <b>' + LET[k.wh] + '</b></span>' : '') + act + '</div>';
  }
  function sfHead(d, me, head) {
    const act = d.rc, mine = act && me && (act.a === me.id || act.b === me.id);
    let tags = '';
    if (mine && (d.ph === 'question' || RC_PH[d.ph])) tags += '<div class="rc-tag" data-bk="rctag" data-bv="1">⚔️ Obračun: <b>' + rcN(d, act.a) + ' vs ' + rcN(d, act.b) + '</b> · ulog ' + act.st + '</div>';
    if (PV && PV.tk && ((PV.tk.st === 'a' && TK_TAG[d.ph]) || (PV.tk.st === 'o' && d.ph === 'vote'))) tags += tkBar(d, me);
    if (sfSpect(d, me) && PV && ((PV.can && PV.cand && PV.cand.length) || sfQueue(d).length)) tags += '<button class="pk-open sf-duelhint" data-sfk="1">🍻 Tajni pakt dok traje dvoboj</button>';
    return head + sfQuestionBar(d, me) + tags + pjChip(d, me);
  }
  function bindSf(d) {
    sfNotify(d);
    // gumb i kartica kutka žive izvan #app (ne sudjeluju u prijelazima ekrana); mijenjaju se samo kad se sadržaj promijeni
    let box = document.getElementById('sfbox');
    if (!box) { box = document.createElement('div'); box.id = 'sfbox'; document.body.appendChild(box); }
    const kh = sfKey(d, meOf(d));
    if (box.__h !== kh) { box.innerHTML = kh; box.__h = kh; }
    const q = (s) => document.querySelectorAll('#app ' + s + ', #sfbox ' + s);
    q('[data-sfk]').forEach((b) => { b.onclick = () => { AUDIO.play('tap'); SF.open = b.dataset.sfk === '1'; SF.btAsk = false; phoneRender(true); }; });
    q('[data-sfq]').forEach((b) => { b.onclick = () => { SF.qi = (SF.qi + 1) % Math.max(1, sfQueue(S).length); phoneRender(true); }; });
    q('[data-sfintro]').forEach((b) => { b.onclick = () => { try { localStorage.setItem('mz_sf_intro', '1'); } catch (e) {} SF.rules = false; AUDIO.play('confirm'); phoneRender(true); }; });
    q('[data-sfrules]').forEach((b) => { b.onclick = () => { SF.rules = true; phoneRender(true); }; });
    q('[data-sfbt]').forEach((b) => { b.onclick = () => { SF.btAsk = b.dataset.sfbt === '1'; AUDIO.play('tap'); phoneRender(true); }; });
    q('[data-sfdev]').forEach((b) => { b.onclick = () => { SF.devN = (SF.devN || 0) + 1; if (SF.devN >= 5) { SF.dev = true; try { sessionStorage.setItem('mz_dev', '1'); } catch (e) {} phoneRender(true); } }; });
    q('[data-sfwh]').forEach((b) => { b.onclick = () => { SF.wh = !SF.wh; try { localStorage.setItem('mz_sf_wh', SF.wh ? '1' : '0'); } catch (e) {} AUDIO.play('tap'); phoneRender(true); }; });
    q('[data-sfscnopen]').forEach((b) => { b.onclick = () => { SF.scn = !SF.scn; phoneRender(true); }; });
    q('[data-scn]').forEach((b) => { b.onclick = () => { if (!game || !game.sfScenario) return; const r = game.sfScenario(PID, b.dataset.scn); toastHold.push([(r.ok ? '🤖 ' : '⚠️ ') + r.msg, r.ok ? 'pact' : 'no']); AUDIO.play(r.ok ? 'confirm' : 'tap'); SF.scn = false; phoneRender(true); pactToasts(S); }; });
    q('[data-bt]').forEach((b) => { const f = b.onclick; b.onclick = () => { SF.btAsk = false; if (f) f(); }; });
    // gumbi paktova i obračuna u kartici kutka (izvan #app) — isti postupci kao u bindPact/bindRc
    document.querySelectorAll('#sfbox [data-pk]').forEach((b) => { b.onclick = () => { const k = b.dataset.pk; AUDIO.play(k === 'decline' ? 'tap' : 'confirm'); pactSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
    document.querySelectorAll('#sfbox [data-rc]').forEach((b) => { b.onclick = () => { const k = b.dataset.rc; AUDIO.play(k === 'rcDecline' || k === 'rcCancel' ? 'tap' : 'confirm'); pactSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
    document.querySelectorAll('#sfbox [data-tk]').forEach((b) => { b.onclick = () => { const k = b.dataset.tk; AUDIO.play(k === 'tkDecline' ? 'tap' : 'confirm'); pactSend({ k, id: +b.dataset.id }); }; });
    document.querySelectorAll('#sfbox [data-bt]').forEach((b) => { b.onclick = () => { SF.btAsk = false; AUDIO.play(b.dataset.bt === '1' ? 'zap' : 'tap'); pactSend({ k: 'betray', on: b.dataset.bt === '1' }); }; });
    bind('sfready', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });
  }
  function bsToggle(d) {
    if (!d.opt) return '';
    if (!game) return d.opt.bs ? '<div class="lob-info">🤖 Testiranje društvenih mehanika s botovima je uključeno</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l">🤖 Testiraj društvene mehanike s botovima<small>Botovi mogu sklapati paktove, šaputati odgovore i pokušavati izdaju. Namijenjeno isprobavanju društvenih funkcionalnosti.</small></span><button class="tgl' + (d.opt.bs ? '' : ' off') + '" data-bsopt="' + (d.opt.bs ? 0 : 1) + '">' + (d.opt.bs ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
  // šapat na kartici odgovora: 🔮 šalje to slovo savezniku (vlastiti odgovor se NE zaključava); primljeni šapat = mali avatar saveznika
  function sfOptX(d, i, answered, gone) {
    if (!PV || !PV.sf || !PV.k || d.ph !== 'question') return '';
    const k = PV.k, m = pById(d, k.m);
    let h = '';
    if (k.wh === i && m) h += '<span class="sf-whav" title="Šapat saveznika">' + avSvg(m.a, 'happy') + '</span>';
    if (k.wc === i) h += '<span class="sf-whi sent" aria-label="Šapnuto">🔮</span>';
    else if (!answered && !gone && !k.wsent) h += '<span class="sf-whi" data-whi="' + i + '" role="button" aria-label="Šapni ' + LET[i] + ' savezniku">🔮</span>';
    return h;
  }
  function bindWhi() {
    document.querySelectorAll('#app [data-whi]').forEach((x) => {
      x.onpointerdown = (e) => { e.stopPropagation(); };
      x.onclick = (e) => { e.stopPropagation(); e.preventDefault(); AUDIO.play('whoosh'); pactSend({ k: 'whisper', c: +x.dataset.whi }); };
    });
  }
