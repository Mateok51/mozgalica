  // ===================== TAJNI PAKTOVI: sučelje =====================
  // PV = privatno stanje ovog igrača (šalje ga samo domaćin, samo njemu). Javno stanje (d) nikad ne sadrži tuđe paktove.
  const fmtN = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const LET = ['A', 'B', 'C', 'D'];
  const PACT_PH = { vote: 1, voteResult: 1, power: 1, cast: 1, question: 1, reveal: 1, bet: 1, howto: 1, order: 1, hilo: 1, blitz: 1, maj: 1, majReveal: 1, orderReveal: 1, hiloReveal: 1, blitzReveal: 1, sortReveal: 1, linkReveal: 1, sort: 1, link: 1, duelIntro: 1, duel: 1, duelResult: 1, secret: 1, secret2: 1, moment: 1, intro: 1 };
  // traka pakta ide odmah ispod gornje trake (HUD); ne prekriva pitanje, odgovore ni sat
  function pactHead(d, me, head) {
    if (!me || !PV || !PACT_PH[d.ph]) return head;
    const q = d.ph === 'question';
    let h = '';
    // dolazna ponuda: kratka u pitanju, kartica između pitanja
    for (const o of PV.inv || []) {
      const f = pById(d, o.f); if (!f) continue;
      const pct = Math.max(0, Math.min(100, (o.ms / o.dur) * 100));
      h += q
        ? '<div class="pk-inv mini"><span class="mini">' + avSvg(f.a, 'happy') + '</span><span class="pk-t"><b>🍻 ' + esc(f.n) + '</b> nudi pakt</span><button class="pk-b ok" data-pk="accept" data-f="' + esc(o.f) + '">Prihvati</button><button class="pk-b no" data-pk="decline" data-f="' + esc(o.f) + '">✕</button><i class="pk-tm" style="--w:' + pct + '%"></i></div>'
        : '<div class="pk-inv"><div class="pk-inv-h"><span class="mini">' + avSvg(f.a, 'happy') + '</span><b>🍻 ' + esc(f.n) + ' ti nudi tajni pakt!</b></div>' +
          '<div class="pk-inv-s">„Udružite znanje, šapćite odgovore i zajedno punite riznicu. Ali pripazi — tvoj saveznik može te izdati i ukrasti tvoje bodove!”</div>' +
          '<div class="pk-row"><button class="btn pk-acc" data-pk="accept" data-f="' + esc(o.f) + '">Prihvati pakt</button><button class="btn ghost pk-dec" data-pk="decline" data-f="' + esc(o.f) + '">Odbij</button></div><i class="pk-tm" style="--w:' + pct + '%"></i></div>';
    }
    if (PV.k) {
      const m = pById(d, PV.k.m), k = PV.k;
      let act = '';
      if (q && k.can) {
        if (L.whOpen && !k.wsent) act = '<span class="pk-wh-pick">' + d.q.o.map((_, i) => '<button class="pk-l" data-wh="' + i + '">' + LET[i] + '</button>').join('') + '<button class="pk-l x" data-whx="1" aria-label="Zatvori">✕</button></span>';
        else act = (k.wsent ? '<span class="pk-sent">🔮 Šapnuto</span>' : '<button class="pk-b" data-whopen="1">🔮 Šapni</button>') +
          (k.bt ? '<button class="pk-b bt on" data-bt="0">🗡️ Odustani</button>' : '<button class="pk-b bt" data-bt="1" aria-label="Pripremi izdaju">🗡️</button>');
      }
      h += '<div class="pk-bar' + (k.bt && q ? ' armed' : '') + '"><span class="mini">' + (m ? avSvg(m.a, 'idle') : '') + '</span><span class="pk-t"><b>🍻 ' + esc(m ? m.n : '?') + '</b><span class="pk-tre" data-bk="pktre" data-bv="' + k.tre + '">💰 ' + fmtN(k.tre) + '</span></span>' +
        (k.wh !== undefined && q ? '<span class="pk-whin" data-bk="pkwh" data-bv="' + k.wh + '">🔮 ' + esc(m ? m.n : '') + ': <b>' + LET[k.wh] + '</b></span>' : '') + act + '</div>';
      if (q && k.bt) h += '<div class="pk-note">🗡️ Izdaja je pripremljena. Ako ne odustaneš, na kraju pitanja pokušat ćeš ukrasti zajedničku riznicu i ' + Math.round(PACT_STEAL * 100) + ' % partnerovih bodova.</div>';
      else if (!q && (d.ph === 'reveal' || d.ph === 'vote' || d.ph === 'power')) h += '<div class="pk-card-s">Zajednička riznica: <b>' + fmtN(k.tre) + ' bodova</b></div>';
    } else if (PV.out && !q) {
      const t = pById(d, PV.out.t);
      h += '<div class="pk-bar out"><span class="pk-t">🍻 Ponuda poslana: <b>' + esc(t ? t.n : '') + '</b> · ' + Math.ceil(PV.out.ms / 1000) + ' s</span><button class="pk-b" data-pk="cancel">Povuci</button></div>';
    } else if (PV.can && !q && PV.cand && PV.cand.length && !(PV.inv || []).length) {
      h += L.pkOpen
        ? '<div class="pk-pick"><div class="pk-pick-h">🍻 Kome nudiš tajni pakt?<button class="pk-l x" data-pkx="1" aria-label="Zatvori">✕</button></div><div class="pk-cands">' + PV.cand.map((id) => { const p = pById(d, id); return p ? '<button class="pk-cand" data-pk="offer" data-to="' + esc(id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span>' + esc(p.n) + '</button>' : ''; }).join('') + '</div><div class="pk-inv-s">Ostali neće saznati. Svatko može imati samo jedan pakt po partiji.</div></div>'
        : '<button class="pk-open" data-pkopen="1">🍻 Tajni pakt</button>';
    }
    return head + h;
  }
  const PACT_STEAL = 0.25;
  function bindPact(d) {
    const q = (s) => document.querySelectorAll('#app ' + s);
    q('[data-pk]').forEach((b) => { b.onclick = () => { const k = b.dataset.pk; AUDIO.play(k === 'decline' ? 'tap' : 'confirm'); L.pkOpen = false; pactSend({ k, from: b.dataset.f, to: b.dataset.to }); }; });
    q('[data-pkopen]').forEach((b) => { b.onclick = () => { L.pkOpen = true; phoneRender(true); }; });
    q('[data-pkx]').forEach((b) => { b.onclick = () => { L.pkOpen = false; phoneRender(true); }; });
    q('[data-whopen]').forEach((b) => { b.onclick = () => { L.whOpen = true; phoneRender(true); }; });
    q('[data-whx]').forEach((b) => { b.onclick = () => { L.whOpen = false; phoneRender(true); }; });
    q('[data-wh]').forEach((b) => { b.onclick = () => { L.whOpen = false; AUDIO.play('whoosh'); pactSend({ k: 'whisper', c: +b.dataset.wh }); }; });
    q('[data-bt]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.bt === '1' ? 'zap' : 'tap'); pactSend({ k: 'betray', on: b.dataset.bt === '1' }); }; });
  }
  // obavijesti: javne glasine (svi) i privatne poruke (samo ja); ne blokiraju ništa
  const toastSeen = new Set(); let toastHold = [];
  function pactToasts(d) {
    const out = [];
    // tijekom pitanja ništa ne smije prekriti odgovore: obavijesti čekaju kraj pitanja
    const busy = d.ph === 'question' || d.ph === 'fq' || d.ph === 'duel' || d.ph === 'order' || d.ph === 'hilo' || d.ph === 'blitz' || d.ph === 'sort' || d.ph === 'link' || d.ph === 'maj';
    if (d.news && !toastSeen.has('n' + d.news.id)) { toastSeen.add('n' + d.news.id); out.push([d.news.t, 'pub']); }
    if (PV && PV.note && !toastSeen.has('p' + PV.note.id)) { toastSeen.add('p' + PV.note.id); out.push([PV.note.t, PV.note.k || '']); }
    if (busy) { toastHold.push(...out); return; }
    out.unshift(...toastHold.splice(0));
    for (const [t, k] of out) {
      let box = document.getElementById('ptoasts');
      if (!box) { box = document.createElement('div'); box.id = 'ptoasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      const e = document.createElement('div'); e.className = 'ptoast ' + k; e.textContent = t; box.appendChild(e);
      if (k === 'tre') AUDIO.play('score'); else if (k === 'pub') AUDIO.play('stingSmall'); else if (k === 'pact') AUDIO.play('correct');
      setTimeout(() => { e.classList.add('out'); setTimeout(() => e.remove(), 400); }, 3600);
    }
  }
  // ----- veliki javni događaji: izdaja, dvostruka izdaja, odanost (isti na mobitelu i TV-u) -----
  const KRCMAR = '<span class="krc">🍺</span>';
  function betrayHtml(d, tv) {
    const B = d.bt; if (!B) return '';
    const el = Math.max(0, d.dur - d.ms), per = 3000, i = Math.min(B.evs.length - 1, B.evs.length > 1 ? Math.floor(el / per) : 0), e = B.evs[i];
    const off = B.evs.length > 1 ? i * per : 0;
    const fig = (id, pose, cls) => { const p = pById(d, id); return '<div class="bt-fig ' + cls + '"><span class="bt-av">' + (p ? avSvg(p.a, pose) : '') + '</span><b>' + esc(p ? p.n : '?') + '</b></div>'; };
    const num = (k, v, sgn, cud) => '<span data-ck="' + k + '" data-cu="0" data-to="' + v + '" data-pre="' + sgn + '" data-cud="' + cud + '" data-cdur="900">' + sgn + v + '</span>';
    let h;
    if (e.k === 'double') {
      h = '<div class="bt-t dbl">💀 DVOSTRUKA IZDAJA!</div><div class="bt-s"><span class="bt-who">' + esc(nameOf(d, e.a)).toUpperCase() + '</span> <span class="bt-arrow">⚔️</span> <span class="bt-who">' + esc(nameOf(d, e.b)).toUpperCase() + '</span></div>' +
        '<div class="bt-stage dbl">' + fig(e.a, 'attack', 'l') + '<div class="bt-mid"><span class="bt-knife a">🗡️</span><span class="bt-knife b">🗡️</span><span class="bt-chest broken">💰</span></div>' + fig(e.b, 'attack', 'r') + '</div>' +
        '<div class="bt-rows"><div class="bt-row lost">💰 Riznica <b>' + fmtN(e.tre) + '</b> propada</div>' +
        '<div class="bt-row neg">' + esc(nameOf(d, e.a)) + ' ' + num('bta' + i, e.la, '−', 1700) + '</div><div class="bt-row neg">' + esc(nameOf(d, e.b)) + ' ' + num('btb' + i, e.lb, '−', 1900) + '</div></div>';
    } else {
      h = '<div class="bt-t">🗡️ IZDAJA U KRČMI!</div><div class="bt-s"><span class="bt-who t">' + esc(nameOf(d, e.t)).toUpperCase() + '</span> <span class="bt-arrow">🗡️</span> <span class="bt-who v">' + esc(nameOf(d, e.v)).toUpperCase() + '</span></div>' +
        '<div class="bt-stage">' + fig(e.t, 'attack', 'l') + '<div class="bt-mid"><span class="bt-knife">🗡️</span><span class="bt-coins">' + '<i>🪙</i>'.repeat(6) + '</span></div>' + fig(e.v, 'shocked', 'r v') + '</div>' +
        '<div class="bt-rows"><div class="bt-row">💰 Ukradena riznica ' + num('btt' + i, e.tre, '+', 1500) + '</div>' +
        '<div class="bt-row">🗡️ Ukradeni bodovi (' + Math.round(PACT_STEAL * 100) + ' %) ' + num('bts' + i, e.st, '+', 1800) + '</div>' +
        '<div class="bt-row tot">Izdajnik ' + esc(nameOf(d, e.t)) + ' ' + num('btg' + i, e.gain, '+', 2300) + '</div>' +
        '<div class="bt-row neg">Izdan: ' + esc(nameOf(d, e.v)) + ' ' + num('btv' + i, e.st, '−', 2300) + '</div></div>';
    }
    h += '<div class="bt-line">' + KRCMAR + '<span>„' + esc(e.line) + '”</span></div>';
    return '<div class="bt' + (tv ? ' tv-bt' : '') + '" style="--el:' + Math.max(0, el - off) + 'ms" data-bk="bt' + B.id + 'x' + i + '" data-bv="' + i + '">' + h + '</div>';
  }
  function loyalHtml(d, tv) {
    const Y = d.ly; if (!Y) return '';
    const el = Math.max(0, d.dur - d.ms);
    const rows = Y.evs.map((e, i) => {
      const A = pById(d, e.a), Bp = pById(d, e.b);
      return '<div class="ly-pair" style="--i:' + i + '"><span class="bt-av">' + (A ? avSvg(A.a, 'happy') : '') + '</span><span class="ly-heart">❤️</span><span class="bt-av">' + (Bp ? avSvg(Bp.a, 'happy') : '') + '</span>' +
        '<div class="ly-tx"><b>' + esc(A ? A.n : '?') + ' & ' + esc(Bp ? Bp.n : '?') + '</b><span>Riznica ' + fmtN(e.tre) + ' + bonus ' + fmtN(e.bonus) + '</span><span class="ly-each">+' + fmtN(e.each) + ' svakome</span></div></div>';
    }).join('');
    return '<div class="bt ly' + (tv ? ' tv-bt' : '') + '" style="--el:' + el + 'ms"><div class="bt-t ly">❤️ ODANOST DO KRAJA</div><div class="bt-s">Tajni savezi preživjeli su do finala</div>' + rows +
      '<div class="bt-line">' + KRCMAR + '<span>„' + esc(['Izgleda da u ovoj krčmi još postoji čast!', 'Vjernost do kraja! Krčmar časti ovu rundu.', 'Neki savezi traju duže od krigle piva.'][Y.id % 3]) + '”</span></div></div>';
  }
  let btSoundKey = '';
  function betraySound(d) {
    const B = d.ph === 'betray' ? d.bt : d.ly; if (!B) return;
    const key = d.ph + B.id; if (btSoundKey === key) return; btSoundKey = key;
    const el = Math.max(0, d.dur - d.ms), at = (ms, n) => { if (ms - el >= -50) setTimeout(() => { if (btSoundKey === key) AUDIO.play(n); }, Math.max(0, ms - el)); };
    if (d.ph === 'loyal') { at(0, 'stingRise'); at(1400, 'score'); return; }
    B.evs.forEach((e, i) => { const o = B.evs.length > 1 ? i * 3000 : 0; if (e.k === 'double') { at(o, 'stingDuel'); at(o + 900, 'crack'); at(o + 1500, 'wrong'); } else { at(o, 'stingTension'); at(o + 850, 'boom'); at(o + 1500, 'score'); } });
  }
