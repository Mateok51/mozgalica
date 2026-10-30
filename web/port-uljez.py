# Mini-igra "Uljez u krčmi": prikaz na mobitelu i TV-u (v61).
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, ('port-uljez', s.count(a), a[:90])
    s = s.replace(a, b)
# zvukovi
rep("case 'order': case 'hilo': case 'blitz': case 'maj': return AUDIO.play('pop');", "case 'order': case 'hilo': case 'blitz': case 'maj': case 'uljez': case 'uljezVote': return AUDIO.play('pop');", 2)
rep("case 'orderReveal': case 'hiloReveal': case 'blitzReveal': case 'majReveal': return AUDIO.play('correct');", "case 'orderReveal': case 'hiloReveal': case 'blitzReveal': case 'majReveal': case 'uljezReveal': return AUDIO.play('correct');")
rep("      case 'majReveal': return AUDIO.play(d.mj && d.mj.win.includes(me.mv) ? 'correct' : 'wrong');", "      case 'majReveal': return AUDIO.play(d.mj && d.mj.win.includes(me.mv) ? 'correct' : 'wrong');\n      case 'uljezReveal': return AUDIO.play(me.g ? 'correct' : 'wrong');")
# potpis stanja i popisi faza
rep("d.bz ? 1 : 0, d.mj, d.rc || 0,", "d.bz ? 1 : 0, d.mj, d.ul, d.rc || 0,")
rep("blitz: 1, maj: 1, majReveal: 1, orderReveal: 1,", "blitz: 1, maj: 1, majReveal: 1, uljez: 1, uljezVote: 1, uljezReveal: 1, orderReveal: 1,")
rep("blitz: 1, maj: 1, secret: 1, secret2: 1 };", "blitz: 1, maj: 1, uljez: 1, uljezVote: 1, secret: 1, secret2: 1 };")
rep("|| d.ph === 'link' || d.ph === 'maj';", "|| d.ph === 'link' || d.ph === 'maj' || d.ph === 'uljez' || d.ph === 'uljezVote';")
rep("sortI: 0, sortR: [], linkI: 0, linkR: [] };", "sortI: 0, sortR: [], linkI: 0, linkR: [], ulSel: [] };")
# TV
rep("      case 'duelIntro': h = tvTop(d, 'Dvoboj')",
"""      case 'uljez': h = tvTop(d, 'Birajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Uljez u krčmi</div><div class="mg-s">Jedna osoba ne zna temu. Svi biraju dva pojma koji najbolje paše uz temu.</div><div class="ul-grid">' + d.ul.t.map((w) => '<div class="ul-t">' + esc(w) + '</div>').join('') + '</div></div></div>' + lineup(d, { check: true }); break;
      case 'uljezVote': h = tvTop(d, 'Glasajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Tko je uljez?</div>' + ulRows(d, false) + '</div></div>' + lineup(d, { check: true }); break;
      case 'uljezReveal': h = tvTop(d, 'Uljez u krčmi') + '<div class="tv-mid"><div class="mg">' + ulReveal(d) + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'duelIntro': h = tvTop(d, 'Dvoboj')""")
# mobitel
rep("      case 'duelIntro': h = center(head + momentHtml(d, duelIntroMo(d))); break;",
"""      case 'uljez': h = head + timerHtml() + ulPick(d, me); break;
      case 'uljezVote': h = head + timerHtml() + ulVote(d, me); break;
      case 'uljezReveal': {
        const u = d.ul, iAm = u.imp === PID, voted = (u.vt || {})[PID];
        const res = iAm ? (u.caught ? 'Ostali su te prozreli' : 'Prošlo je neopaženo!') : voted === u.imp ? 'Pogodak! Uljez je prepoznat' : voted ? 'Ovaj put promašaj' : 'Bez glasa';
        h = head + chalReveal(d, me, 'Uljez u krčmi', ulReveal(d), res, iAm ? (u.caught ? 'Razotkriven: 0' : 'Neotkriven: 400') : voted === u.imp ? 'Ispravan glas: 250' : '0'); break;
      }
      case 'duelIntro': h = center(head + momentHtml(d, duelIntroMo(d))); break;""")
rep("  function majPhone(d, me) {",
"""  function ulRole() {
    const u = PV && PV.ul;
    if (!u) return '';
    return u.imp ? '<div class="ul-role imp">🕵️ Tvoja uloga: uljez<small>Ne znaš temu. Pokušaj se uklopiti!</small></div>' : '<div class="ul-role"><small>Tema</small><b>' + esc(u.th) + '</b></div>';
  }
  function ulPick(d, me) {
    const sent = !!(L.sent || me.ok), sel = L.ulSel || [];
    return '<div class="mg"><div class="mg-t">Uljez u krčmi</div><div class="mg-s">Odaberi dva pojma koji najbolje paše uz temu.</div>' + ulRole() +
      '<div class="ul-grid">' + d.ul.t.map((w, i) => '<button class="ul-t' + (sel.includes(i) ? ' on' : '') + '" data-ul="' + i + '"' + (sent ? ' disabled' : '') + '>' + esc(w) + '</button>').join('') + '</div>' +
      (sent ? '<div class="waiting">Izbor poslan ✔</div>' : '<button class="btn" id="ulOk"' + (sel.length === 2 ? '' : ' disabled') + '>Potvrdi izbor (' + sel.length + '/2)</button>') + '</div>';
  }
  function ulChips(u, pk, mark) {
    if (!pk || !pk.length) return '<span class="ul-chip none">bez izbora</span>';
    return pk.map((i) => '<span class="ul-chip' + (mark ? (u.ok[i] ? ' ok' : ' bad') : '') + '">' + esc(u.t[i]) + '</span>').join('');
  }
  function ulRows(d, vote) {
    const u = d.ul;
    return '<div class="ul-rows">' + d.P.filter((p) => p.c && !(vote && p.id === PID)).map((p) => {
      const inner = '<span class="mini">' + avSvg(p.a) + '</span><span class="ul-nm">' + esc(p.n) + '</span><span class="ul-ch">' + ulChips(u, (u.pk || {})[p.id], false) + '</span>';
      return vote ? '<button class="ul-row' + (L.sent && L.sent.v === p.id ? ' set' : '') + '" data-ulv="' + esc(p.id) + '"' + (L.sent || (meOf(d) || {}).ok ? ' disabled' : '') + '>' + inner + '</button>' : '<div class="ul-row">' + inner + '</div>';
    }).join('') + '</div>';
  }
  function ulVote(d, me) {
    const sent = !!(L.sent || me.ok), mine = (d.ul.pk || {})[PID];
    return '<div class="mg"><div class="mg-t">Tko je uljez?</div><div class="mg-s">Dodirni osobu koju najviše sumnjičiš.</div>' + ulRole() +
      (mine ? '<div class="mg-s">Tvoj izbor: ' + ulChips(d.ul, mine, false) + '</div>' : '') + ulRows(d, true) + (sent ? '<div class="waiting">Glas poslan ✔</div>' : '') + '</div>';
  }
  function ulReveal(d) {
    const u = d.ul, im = d.P.find((p) => p.id === u.imp);
    return '<div class="ul-theme">Tema: <b>' + esc(u.th) + '</b></div><div class="ul-who">Uljez: <b>' + esc(im ? im.n : '?') + '</b> · ' + (u.caught ? 'razotkriven' : 'neotkriven') + '</div><div class="ul-rows">' +
      d.P.map((p) => '<div class="ul-row' + (p.id === u.imp ? ' imp' : '') + '"><span class="mini">' + avSvg(p.a) + '</span><span class="ul-nm">' + esc(p.n) + (p.id === u.imp ? ' 🕵️' : '') + '</span><span class="ul-ch">' + ulChips(u, (u.pk || {})[p.id], true) + '</span><b class="ul-v" title="glasova">🗳️ ' + ((u.cnt || {})[p.id] || 0) + '</b></div>').join('') + '</div>';
  }
  function majPhone(d, me) {""")
# dodiri
rep("    $app.querySelectorAll('[data-mj]').forEach(",
"""    $app.querySelectorAll('[data-ul]').forEach((b) => { b.onclick = () => {
      if (L.sent) return; const i = +b.dataset.ul, a = (L.ulSel || []).slice(), k = a.indexOf(i);
      if (k >= 0) a.splice(k, 1); else { a.push(i); if (a.length > 2) a.shift(); }
      L.ulSel = a; phoneRender(true);
    }; });
    bind('ulOk', () => { if (!L.sent && (L.ulSel || []).length === 2) sendInput({ v: L.ulSel.slice() }); });
    $app.querySelectorAll('[data-ulv]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ v: b.dataset.ulv }); }; });
    $app.querySelectorAll('[data-mj]').forEach(""")
# stil
rep("  .mg-list { display: flex; flex-direction: column; gap: 10px; }",
"""  .mg-list { display: flex; flex-direction: column; gap: 10px; }
  .ul-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ul-t { min-height: 56px; padding: 8px 10px; border-radius: var(--radius-medium); text-align: center; font-weight: 900; font-size: 1.05rem; color: var(--parchment-ink); overflow-wrap: anywhere;
    background: linear-gradient(#f6e7c4, #e2c891); box-shadow: inset 0 0 0 2px rgba(176, 122, 58, 0.8), 0 3px 0 rgba(90, 50, 20, 0.8); display: grid; place-items: center; }
  .ul-t.on { background: linear-gradient(#f0c66e, #c4892f); box-shadow: inset 0 0 0 3px #7a4f17, 0 3px 0 rgba(90, 50, 20, 0.8); }
  .ul-t:disabled { opacity: 0.85; }
  .ul-role { text-align: center; padding: 8px 12px; border-radius: 12px; background: rgba(42, 23, 11, 0.85); box-shadow: inset 0 0 0 1px rgba(176, 122, 58, 0.6); color: var(--text-main); font-weight: 900; font-size: 1.1rem; }
  .ul-role small { display: block; font-size: 0.78rem; font-weight: 800; color: var(--text-muted); } .ul-role b { color: var(--amber-hi); font-family: var(--font-display); font-size: 1.4rem; text-transform: uppercase; }
  .ul-role.imp { box-shadow: inset 0 0 0 2px #e0644a; }
  .ul-rows { display: flex; flex-direction: column; gap: 8px; }
  .ul-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; text-align: left; color: var(--text-main); background: rgba(42, 23, 11, 0.85); box-shadow: inset 0 0 0 1px rgba(176, 122, 58, 0.5); }
  button.ul-row { color: var(--parchment-ink); background: linear-gradient(#f6e7c4, #e2c891); box-shadow: inset 0 0 0 2px rgba(176, 122, 58, 0.8), 0 3px 0 rgba(90, 50, 20, 0.8); }
  button.ul-row.set { filter: brightness(0.8) saturate(0.7); box-shadow: inset 0 0 0 3px #7a4f17; }
  .ul-row.imp { box-shadow: inset 0 0 0 2px #e0644a; }
  .ul-row .mini { flex: none; width: 36px; height: 36px; } .ul-nm { font-weight: 900; flex: none; max-width: 38%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ul-ch { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; margin-left: auto; }
  .ul-chip { padding: 2px 8px; border-radius: 999px; font-size: 0.82rem; font-weight: 800; background: rgba(243, 227, 196, 0.18); color: inherit; }
  button.ul-row .ul-chip { background: rgba(59, 38, 16, 0.15); }
  .ul-chip.ok { background: rgba(127, 174, 84, 0.9); color: #10250a; } .ul-chip.bad { background: rgba(192, 83, 60, 0.95); color: #fff; } .ul-chip.none { opacity: 0.7; font-style: italic; }
  .ul-v { flex: none; font-size: 0.85rem; }
  .ul-theme, .ul-who { text-align: center; font-weight: 800; color: var(--text-main); } .ul-theme b { color: var(--amber-hi); font-size: 1.2rem; } .ul-who b { color: var(--amber-hi); }
  .tv .ul-t { font-size: 1.8rem; min-height: 90px; } .tv .ul-grid { max-width: 1000px; margin: 0 auto; width: 100%; } .tv .ul-rows { max-width: 1000px; margin: 0 auto; width: 100%; }
  .tv .ul-row { font-size: 1.5rem; padding: 12px 16px; } .tv .ul-row .mini { width: 52px; height: 52px; } .tv .ul-chip { font-size: 1.3rem; padding: 4px 14px; } .tv .ul-theme, .tv .ul-who { font-size: 1.6rem; }""")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-uljez OK')
