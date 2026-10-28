SP = '/root/mozgalica'
s = open(SP + '/v3/page.html', encoding='utf-8').read()

def rep(s, old, new, count=1):
    assert s.count(old) == count, ('broj pojava', s.count(old), old[:70])
    return s.replace(old, new)
def cut(s, start, end, new):
    i = s.index(start); j = s.index(end, i)
    return s[:i] + new + s[j:]

# fontovi
s = rep(s, 'family=Luckiest+Guy&family=Nunito:wght@500;700;900', 'family=Fredoka:wght@500;600;700&family=Nunito:wght@600;800;900')
# stilovi
i = s.index('<style>') + len('<style>\n'); j = s.index('</style>')
s = s[:i] + open(SP + '/v4/style.css', encoding='utf-8').read() + s[j:]
# platno pozornice, zvuk, gradijent prstena
s = rep(s, '<div id="app" class="screen center"></div>',
  '<canvas id="bg" aria-hidden="true"></canvas>\n<div id="app" class="screen center"></div>\n'
  '<button id="mute" type="button" aria-label="Isključi zvuk"></button>\n'
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c2"/><stop offset="1" stop-color="#ff9d2e"/></linearGradient></defs></svg>')
# slova umjesto oblika, stare ikone van
s = rep(s, "  const SHAPES = ['▲', '◆', '●', '■'];\n", "  const SHAPES = ['A', 'B', 'C', 'D'];\n")
s = rep(s, "  const ICON = { led: '❄️', sluz: '🟢', grick: '🐛', bomba: '💣', dupli: '✖️2', pola: '✂️', stit: '🛡️' };\n", '')
# likovi, ikone, zvuk, konfete, pozornica
s = cut(s, '  // ---------- likovi (originalni) ----------', '  // ---------- stanje stranice ----------', open(SP + '/v4/art.js', encoding='utf-8').read())

# prsten za odbrojavanje na TV-u
s = rep(s, """  function tvTop(d, label) {
    return '<div class="tv-top"><span class="rl">' + esc(d.rl || '') + '</span><span class="tv-sub" style="flex:1">' + (label || '') + '</span><span class="tv-num" id="tnum"></span></div>';
  }""", """  function tvTop(d, label) {
    const ring = INPUT_PHASES[d.ph]
      ? '<span class="ring" id="tring"><svg viewBox="0 0 100 100"><circle class="rbg" cx="50" cy="50" r="42"/><circle class="rfg" id="tarc" cx="50" cy="50" r="42" stroke-dasharray="263.9" stroke-dashoffset="0"/></svg><b id="tnum"></b></span>'
      : '<span class="ring empty"></span>';
    return '<div class="tv-top"><span class="rl">' + esc(d.rl || '') + '</span><span class="tv-sub" style="flex:1">' + (label || '') + '</span>' + ring + '</div>';
  }""")
# TV: svježa faza → animacije i zvuk
s = rep(s, """    clockEnds = Date.now() + d.ms; clockDur = d.dur;
    $app.className = 'screen tv';""", """    clockEnds = Date.now() + d.ms; clockDur = d.dur;
    const fresh = d.s !== tvStep;
    if (fresh) { tvStep = d.s; lastTickSec = -1; tvSound(d); }
    $app.className = 'screen tv' + (fresh ? ' fresh' : '');""")
s = rep(s, "<span class=\"pill\">DEMO · TV prikaz</span>", "<span class=\"pill\">Demo: TV prikaz</span>")
s = rep(s, """'<div class="winner"><div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center">'""", """'<div class="winner"><div class="champ-wrap">'""")
s = rep(s, '<div class="logo" style="font-size:clamp(2rem,5vw,4.4rem)">POBJEDNIK!</div>', '<div class="logo" style="font-size:clamp(2.2rem,5.5vw,4.8rem)">Pobjednik!</div>')
# mobitel: svježa faza
s = rep(s, """  function phoneV() {
    $app.className = 'screen phone';
    const d = S;""", """  function phoneV() {
    const d = S;
    const freshP = !!d && L.s !== phoneStep;
    $app.className = 'screen phone' + (freshP ? ' fresh' : '');""")
s = rep(s, """    $app.innerHTML = demoBar + h;
    bindPhone(d, me);""", """    if (freshP && me) { phoneStep = L.s; phoneSound(d, me); }
    $app.innerHTML = demoBar + h;
    if (freshP) $app.classList.add('fresh');
    bindPhone(d, me);""")
# center() u phoneV mijenja className pa zadrži fresh
s = rep(s, "    const center = (inner) => { $app.className = 'screen phone center'; return inner; };",
           "    const center = (inner) => { $app.className = 'screen phone center' + (freshP ? ' fresh' : ''); return inner; };")
# događaji: moći za sebe zelene
s = rep(s, "      return '<span class=\"ev\"><span class=\"mini\">'", "      return '<span class=\"ev buff\"><span class=\"mini\">'")
# zvuk efekata
s = rep(s, """        fx.hits++;
        if (navigator.vibrate)""", """        fx.hits++;
        SFX.play('crack');
        if (navigator.vibrate)""")
s = rep(s, """          if (fx.cells[i]) { fx.cells[i] = 0; fx.left--; if (cells[i]) cells[i].classList.add('gone'); }""",
           """          if (fx.cells[i]) { fx.cells[i] = 0; fx.left--; if (cells[i]) cells[i].classList.add('gone'); if (fx.left % 7 === 0) SFX.play('splat'); }""")
s = rep(s, """          fx.bugs[+b.dataset.b].on = false; b.remove();""", """          fx.bugs[+b.dataset.b].on = false; b.remove(); SFX.play('squish');""")
s = rep(s, """          f.boom = true; stopFxTimer();""", """          f.boom = true; stopFxTimer(); SFX.play('boom');""")
# odbrojavanje: prsten + otkucaji na TV-u
s = rep(s, """    if (num) num.textContent = wrap && clockDur ? Math.ceil(ms / 1000) : '';
    if (wrap) wrap.classList.toggle('urgent', ms <= +(wrap.dataset.u || 5000));""", """    const ring = document.getElementById('tring'), arc = document.getElementById('tarc');
    if (num) num.textContent = (wrap || ring) && clockDur ? Math.ceil(ms / 1000) : '';
    if (wrap) wrap.classList.toggle('urgent', ms <= +(wrap.dataset.u || 5000));
    if (arc && clockDur) arc.style.strokeDashoffset = (263.9 * (1 - ms / clockDur)).toFixed(1);
    if (ring) {
      ring.classList.toggle('urgent', ms <= 5000);
      const tvShown = mode === 'host' || (mode === 'demo' && demoView === 'tv');
      const sec = Math.ceil(ms / 1000);
      if (tvShown && ms > 0 && sec <= 5 && sec !== lastTickSec) { lastTickSec = sec; SFX.play('tick'); }
    }""")
# tekstovi bez velikih slova
s = rep(s, "MOZGALICA<small>KVIZ · MOĆI · PIRAMIDA</small>", "MOZGALICA<small>Kviz za cijelo društvo</small>")
s = rep(s, "MOZGALICA<small>ODABERITE LIKOVE NA MOBITELIMA</small>", "MOZGALICA<small>Odaberite likove na mobitelima</small>")
# početni ekran resetira brojače faza
s = rep(s, "      if (mode === 'home') return homeV();", "      if (mode === 'home') { tvStep = -1; phoneStep = -1; return homeV(); }")
# ime kartice na TV-u ne treba stari .tv-num
assert 'tv-num' not in s.split('</style>')[1], 'stari tv-num ostao'
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('OK', len(s))

# ---- zaštita od slučajnog odgovora nakon uklanjanja efekta moći ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """    L.fx = makeFx(L.fxq[0]);
    if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
    phoneRender(true);
  }""", """    L.fx = makeFx(L.fxq[0]);
    if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
    // odgovori ostaju zaključani kratko vrijeme da se zadnji dodir ne pretvori u odgovor
    L.lockUntil = Date.now() + 900;
    const s0 = L.s;
    setTimeout(() => { if (L.s === s0) phoneRender(true); }, 920);
    phoneRender(true);
  }""")
s = rep(s, """      let cls = 'p-opt o' + i + (gone ? ' gone' : '');""", """      let cls = 'p-opt o' + i + (gone ? ' gone' : '') + (locked ? ' locked' : '');""")
s = rep(s, """    const answered = L.sent || me.ok;
    const mine = L.sent ? L.sent.c : -1;
    const hide = me.h || [];""", """    const answered = L.sent || me.ok;
    const mine = L.sent ? L.sent.c : -1;
    const hide = me.h || [];
    const locked = !answered && !L.fx && Date.now() < (L.lockUntil || 0);""")
s = rep(s, """'<div class="waiting">' + (answered ? 'Odgovor zaprimljen ✔' : L.fx ? '' : 'Brže = više bodova!') + '</div>';""",
           """'<div class="waiting">' + (answered ? 'Odgovor zaprimljen ✔' : L.fx ? '' : locked ? 'Očišćeno! Odgovori se otključavaju…' : 'Brže = više bodova!') + '</div>';""")
s = rep(s, """      b.onclick = () => {
        if (L.sent || L.fx) return;""", """      // odgovor vrijedi samo ako je dodir i počeo na tom gumbu, nakon što je efekt uklonjen
      b.onpointerdown = () => { b.dataset.ok = (!L.fx && Date.now() >= (L.lockUntil || 0)) ? '1' : ''; };
      b.onclick = (e) => {
        if (L.sent || L.fx) return;
        if (Date.now() < (L.lockUntil || 0)) return;
        if (e && e.detail !== 0 && b.dataset.ok !== '1') return;""")
s = rep(s, "  .p-opt.picked {", "  .p-opt.locked { filter: saturate(0.4) brightness(0.8); transform: scale(0.98); }\n  .p-opt.picked {")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('zaštita OK')

# ---- grafički prikaz glasanja ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """        const doors = d.cats.map((c, i) => {
          const voters = d.P.filter((p) => p.vt === i).map((p) => '<span>' + avSvg(p.a) + '</span>').join('');
          const cls = d.ph === 'voteResult' ? (i === d.cw ? ' win' : ' lose') : '';
          return '<div class="door o' + i + cls + '"><div class="dn">' + esc(c) + '</div><div class="voters">' + voters + '</div><span class="knob"></span></div>';
        }).join('');
        h = tvTop(d, d.ph === 'vote' ? 'Glasajte za kategoriju!' : 'Kategorija: ' + esc(d.cats[d.cw])) +
          (d.ph === 'vote' ? timerHtml() : '') + '<div class="tv-mid"><div class="doors">' + doors + '</div></div>' + lineup(d, { check: d.ph === 'vote' });""",
"""        const counts = d.cats.map((_, i) => d.P.filter((p) => p.vt === i).length);
        const max = Math.max(0, ...counts);
        const doors = d.cats.map((c, i) => {
          const voters = d.P.filter((p) => p.vt === i).map((p) => '<span class="voter"><span style="width:100%">' + avSvg(p.a, 'happy') + '</span><span class="vnm">' + esc(p.n) + '</span></span>').join('');
          const cls = d.ph === 'voteResult' ? (i === d.cw ? ' win' : ' lose') : (max > 0 && counts[i] === max ? ' lead' : '');
          return '<div class="door o' + i + cls + '"><span class="vcount' + (counts[i] ? '' : ' zero') + '">' + counts[i] + '</span><div class="dn">' + esc(c) + '</div><div class="voters">' + voters + '</div><span class="knob"></span></div>';
        }).join('');
        const voted = d.P.filter((p) => p.vt !== undefined).length;
        const label = d.ph === 'vote' ? 'Glasajte za kategoriju! Glasalo ' + voted + ' od ' + d.P.filter((p) => p.c).length
          : 'Kategorija: ' + esc(d.cats[d.cw]);
        h = tvTop(d, label) + (d.ph === 'vote' ? timerHtml() : '') +
          '<div class="tv-mid"><div class="doors">' + doors + '</div>' +
          (d.ph === 'voteResult' && d.tie ? '<div class="tie-note">Neriješeno! Kategoriju je odabrao ždrijeb.</div>' : '') +
          (d.ph === 'voteResult' && !voted ? '<div class="tie-note">Nitko nije glasao, kategoriju je odabrao ždrijeb.</div>' : '') +
          '</div>' + lineup(d, { check: d.ph === 'vote' });""")
s = rep(s, """      case 'vote': {
        const mine = L.sent ? L.sent.v : (me.ok ? -2 : -1);
        h = head + timerHtml() + '<div class="p-title">Glasaj za kategoriju</div><div class="door-btns">' +
          d.cats.map((c, i) => '<button class="door-btn o' + i + (mine === i ? ' picked' : '') + '" data-v="' + i + '"' + (mine !== -1 ? ' disabled' : '') + '>' + esc(c) + '</button>').join('') + '</div>' +
          (mine !== -1 ? '<div class="waiting">Glas zaprimljen ✔</div>' : '');
        break;
      }
      case 'voteResult':
        h = center(head + '<div class="p-sub">Kategorija je</div><div class="p-title" style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</div>');
        break;""", """      case 'vote': case 'voteResult': {
        const res = d.ph === 'voteResult';
        const mine = L.sent ? L.sent.v : (me.vt !== undefined ? me.vt : (me.ok ? -2 : -1));
        const doorBtns = d.cats.map((c, i) => {
          const who = d.P.filter((p) => p.vt === i);
          const faces = who.map((p) => '<span title="' + esc(p.n) + '">' + avSvg(p.a, 'happy') + '</span>').join('');
          const cls = res ? (i === d.cw ? ' win' : ' lose') : (mine === i ? ' picked' : '');
          return '<button class="door-btn o' + i + cls + '" data-v="' + i + '"' + (res || mine !== -1 ? ' disabled' : '') + '>' + esc(c) +
            (who.length ? '<span class="dcount">' + who.length + (who.length === 1 ? ' glas' : who.length < 5 ? ' glasa' : ' glasova') + '</span>' : '') +
            '<span class="dvoters">' + faces + '</span></button>';
        }).join('');
        h = head + (res ? '' : timerHtml()) +
          '<div class="p-title">' + (res ? 'Kategorija: <span style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</span>' : 'Glasaj za kategoriju') + '</div>' +
          '<div class="door-btns">' + doorBtns + '</div>' +
          (res && d.tie ? '<div class="waiting">Neriješeno! Odlučio je ždrijeb.</div>' : '') +
          (!res && mine !== -1 ? '<div class="waiting">Glas zaprimljen ✔ Gledaj kako glasaju ostali</div>' : '');
        break;
      }""")
s = rep(s, """    const roster = (d.ph === 'lobby' || d.ph === 'power' || d.ph === 'final') ? d.P.map((p) => [p.id, p.n, p.a, p.c]) : null;""",
           """    const roster = (d.ph === 'lobby' || d.ph === 'power' || d.ph === 'final') ? d.P.map((p) => [p.id, p.n, p.a, p.c])
      : (d.ph === 'vote' || d.ph === 'voteResult') ? d.P.map((p) => [p.id, p.a, p.vt]) : null;""")
s = rep(s, "    if (ph === 'voteResult') { v.cw = G.cw; v.tie = G.tie; }", "    if (ph === 'voteResult') { v.cw = G.cw; v.tie = G.tie; }") if "v.tie = G.tie" in s else s
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('glasanje OK')

# ---- način bez TV-a: mobiteli prikazuju i ono što bi bilo na TV-u ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "    if (mode === 'player' || (mode === 'demo' && demoView === 'phone')) {", "    if (phoneShown()) {")
s = rep(s, "      if (!(mode === 'player' || (mode === 'demo' && demoView === 'phone'))) return;", "      if (!phoneShown()) return;")
s = rep(s, "      if (mode === 'demo') return demoView === 'tv' ? tvV(game.view()) : phoneRender(true);",
           "      if (mode === 'demo') return demoView === 'tv' ? tvV(game.view()) : phoneRender(true);\n      if (mode === 'hostp') return phoneRender(true);\n      if (mode === 'hostform') return hostFormV();")
# pomoćne funkcije
s = rep(s, "  const meOf = (d) => d && d.P.find((p) => p.id === PID);\n", """  const meOf = (d) => d && d.P.find((p) => p.id === PID);
  const isLocalHost = () => mode === 'demo' || mode === 'hostp';
  const phoneShown = () => mode === 'player' || mode === 'hostp' || (mode === 'demo' && demoView === 'phone');
  function miniBoard(d, gain) {
    const r = d.P.slice().sort((a, b) => b.sc - a.sc);
    return '<div class="mboard">' + r.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a, gain && p.g ? 'happy' : '') + '</span><span class="nm">' + esc(p.n) + '</span>' +
      (gain && p.g ? '<span class="gain">+' + p.g + '</span>' : '') + '<span class="sc">' + p.sc + '</span></div>').join('') + '</div>';
  }
  function phoneEvents(d) {
    if (!d.ev || !d.ev.length) return '';
    return '<div class="p-sub" style="margin-top:4px">Moći u ovom pitanju</div>' + evHtml(d);
  }
""")
# predvorje: domaćin na mobitelu vidi kod sobe, QR i gumb za početak
s = rep(s, """          (mode === 'demo'
            ? '<button class="btn" id="dstart">Započni igru</button><div class="p-sub">Igraš protiv tri bota. Bacat će moći i na tebe!</div>'""",
"""          (mode === 'hostp'
            ? '<div class="card join-card" style="width:100%"><div class="p-sub">Neka ostali skeniraju QR ili otvore ' + esc(location.host + location.pathname.replace(/index\\.html$/, '')) + ' i upišu kod</div>' +
              (qrSvg(appUrl() + '#' + d.code) ? '<div class="qr" style="width:min(70%,240px)">' + qrSvg(appUrl() + '#' + d.code) + '</div>' : '') +
              '<div class="room-code" style="font-size:3.4rem">' + esc(d.code) + '</div><div class="p-sub">' + d.P.length + ' od ' + d.max + ' igrača u sobi</div></div>' +
              '<button class="btn" id="dstart"' + (d.P.length < 2 ? ' disabled' : '') + '>Započni igru</button>' + (d.P.length < 2 ? '<div class="p-sub">Čekamo barem još jednog igrača.</div>' : '')
            : mode === 'demo'
            ? '<button class="btn" id="dstart">Započni igru</button><div class="p-sub">Igraš protiv tri bota. Bacat će moći i na tebe!</div>'""")
s = rep(s, """          (mode === 'demo' ? '<button class="btn" id="dagain">Igraj opet</button>' : '<div class="p-sub">Domaćin može pokrenuti novu igru.</div>') + '<button class="btn ghost" id="leave">Izađi</button>');""",
"""          (d.ntv ? '<div class="p-sub">Konačni poredak</div><div class="mboard">' + ranked.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a, p.id === d.win ? 'happy' : '') + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + ' b · ' + (p.st || 0) + '/' + d.steps + '</span></div>').join('') + '</div>' +
            (won ? '' : '<div class="scroll"><b>Nagrada za pobjednika: zanimljivost</b>' + esc(d.fact) + '</div>') : '') +
          (isLocalHost() ? '<button class="btn" id="dagain">Igraj opet</button>' : '<div class="p-sub">Domaćin može pokrenuti novu igru.</div>') + '<button class="btn ghost" id="leave">Izađi</button>');""")
# otkrivanje: poredak svih i bačene moći
s = rep(s, """      (ok ? '<div class="pts">+' + me.g + (me.d ? ' (×2)' : '') + '</div>' : '<div class="p-sub">Točan odgovor: <b>' + SHAPES[d.cor] + ' ' + esc(d.q.o[d.cor]) + '</b></div>') + '</div>' + rankStat(d, me);""",
"""      (ok ? '<div class="pts">+' + me.g + (me.d ? ' (×2)' : '') + '</div>' : '<div class="p-sub">Točan odgovor: <b>' + SHAPES[d.cor] + ' ' + esc(d.q.o[d.cor]) + '</b></div>') + '</div>' +
      (d.ntv ? phoneEvents(d) + miniBoard(d, true) : rankStat(d, me));""")
# izazovi: rješenje i poredak
s = rep(s, """        h = center(head + '<div class="result ' + (me.k ? 'ok' : 'none') + '"><div class="p-title">Točno ' + me.k + ' od ' + tot + '</div><div class="pts">+' + (me.g || 0) + '</div></div>' + rankStat(d, me));""",
"""        let sol = '';
        if (d.ntv && d.ph === 'sortReveal') sol = '<div class="sort-cols" style="width:100%">' + [0, 1].map((k) => '<div class="sort-col ' + (k ? 'b' : 'a') + '" style="padding:10px"><h3 style="font-size:1.1rem">' + esc(k ? d.so.b : d.so.a) + '</h3><div class="chips">' + d.so.it.filter((_, i) => d.so.key[i] === k).map((x) => '<span class="chip" style="font-size:.9rem">' + esc(x) + '</span>').join('') + '</div></div>').join('') + '</div>';
        if (d.ntv && d.ph === 'linkReveal') sol = '<div class="pairs" style="width:100%">' + d.li.L.map((l, i) => '<div class="pair" style="font-size:1rem"><span>' + esc(l) + '</span><span class="arrow">→</span><span>' + esc(d.li.R[d.li.key[i]]) + '</span></div>').join('') + '</div>';
        h = (d.ntv ? '' : '') + head + '<div class="result ' + (me.k ? 'ok' : 'none') + '"><div class="p-title">Točno ' + me.k + ' od ' + tot + '</div><div class="pts">+' + (me.g || 0) + '</div></div>' +
          (d.ntv ? sol + miniBoard(d, true) : rankStat(d, me));
        if (!d.ntv) h = center(h);""")
# finale: piramida svih igrača
s = rep(s, """          '<div class="p-sub">Bilo je: <b>' + esc(d.q.o[d.cor]) + '</b></div></div>' + stepMeter(d, me));""",
"""          '<div class="p-sub">Bilo je: <b>' + esc(d.q.o[d.cor]) + '</b></div></div>' + (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, true) + '</div>' : stepMeter(d, me)));""")
s = rep(s, """      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div><div class="p-opts two">' + opts + '</div>' +
      (answered ? '<div class="waiting">Zaprimljeno ✔</div>' : '');""", """      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div><div class="p-opts two">' + opts + '</div>' +
      (answered ? '<div class="waiting">Zaprimljeno ✔</div>' : '') + (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, false) + '</div>' : '');""")
s = rep(s, "  .p-opt.locked {", """  .mboard { display: grid; gap: 6px; width: 100%; }
  .mboard .rank-row { font-size: 1rem; padding: 4px 10px; }
  .mboard .rank-row .mini { width: 30px; }
  .mboard .rank-row.me { border-color: var(--cyan); box-shadow: 0 0 18px rgba(94, 231, 255, 0.3); }
  .mboard .gain { color: var(--good); font-weight: 900; }
  .phone-pyr { width: 100%; height: 230px; display: flex; }
  .phone-pyr .pyramid { width: 100%; }
  .phone-pyr .pstep { height: 24px; }
  .phone-pyr .pstep .climber { width: 26px; }
  .phone-pyr .pstep .lv { font-size: 0.8rem; }
  .phone .events .ev { font-size: 0.85rem; }
  .phone .sort-cols { flex: none; }
  .mboard .rank-row { text-align: left; }
  .phone { padding-bottom: 64px; }
  .p-opt.locked {""")
s = rep(s, "game = createGame({ code: 'DEMO', onChange:", "game = createGame({ code: 'DEMO', noTv: true, onChange:")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('bez TV-a OK')

# ---- naslikani likovi: poze po događaju u igri ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  if (!(myAv >= 0 && myAv < 8)) myAv = Math.floor(Math.random() * 8);", "  if (!(myAv >= 0 && myAv < 10)) myAv = 8 + Math.floor(Math.random() * 2);")
s = rep(s, "    const botAvs = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i !== game.view().P[0].a);", "    const botAvs = [8, 9, 0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i !== game.view().P[0].a);")
s = rep(s, "      const mood = opts.mood ? opts.mood(p) : (p.fx && opts.fx ? 'dizzy' : '');", "      const mood = opts.mood ? opts.mood(p) : (p.fx && opts.fx ? 'shocked' : '');")
s = rep(s, "lineup(d, rev ? { gain: true, mood: (p) => (p.ch === d.cor ? 'happy' : 'dizzy') } : { check: true, fx: true });",
           "lineup(d, rev ? { gain: true, mood: (p) => (p.ch === d.cor ? 'happy' : 'sad') } : { check: true, fx: true });")
s = rep(s, "<div class=\"champ\">' + avSvg(w.a, 'happy') + '</div>", "<div class=\"champ\">' + avSvg(w.a, 'victory') + '</div>")
s = rep(s, "avSvg(p.a, rev ? (p.mv ? 'happy' : 'dizzy') : '')", "avSvg(p.a, rev ? (p.mv ? 'happy' : 'sad') : '')")
s = rep(s, "h = center('<div style=\"width:150px\">' + avSvg(me.a, won ? 'happy' : '') + '</div>", "h = center('<div style=\"width:150px\">' + avSvg(me.a, won ? 'victory' : 'sad') + '</div>")
s = rep(s, "avSvg(me.a, ok ? 'happy' : 'dizzy')", "avSvg(me.a, ok ? 'happy' : 'sad')")
s = rep(s, "    const faces = [0, 3, 6, 4].map((i) => '<span style=\"width:64px\" class=\"bob\">' + avSvg(i, 'happy') + '</span>').join('');",
           "    const faces = [8, 3, 9, 6].map((i) => '<span style=\"width:' + (i > 7 ? 92 : 64) + 'px\" class=\"bob\">' + avSvg(i, i > 7 ? 'idle' : 'happy') + '</span>').join('');")
# odabir lika: naslikani likovi prvi
s = rep(s, "        const grid = AV.map((a, i) => '<button class=\"av-pick'", "        const grid = PICK_ORDER.map((i) => { const a = AV[i]; return '<button class=\"av-pick'")
s = rep(s, "avSvg(i, me.a === i ? 'happy' : '') + '<span>' + esc(taken[i] !== undefined ? taken[i] : a.n) + '</span></button>').join('');",
           "avSvg(i, me.a === i ? 'happy' : '') + '<span>' + esc(taken[i] !== undefined ? taken[i] : a.n) + '</span></button>'; }).join('');")
# napadač u popisu moći zamahne
s = rep(s, "if (e.t) return '<span class=\"ev' + (e.b ? ' blocked' : '') + '\"><span class=\"mini\">' + avSvg(avOf(d, e.f)) + '</span>'",
           "if (e.t) return '<span class=\"ev' + (e.b ? ' blocked' : '') + '\"><span class=\"mini\">' + avSvg(avOf(d, e.f), 'attack') + '</span>'")
# mobitel: nakon odabira napadačke moći lik zamahne
s = rep(s, """      return '<div class="result none"><div class="p-title">' + (k ? ICON[k] + ' ' + POWERS[k].n : 'Bez moći') + '</div>' +""",
           """      return '<div class="result none"><div style="width:120px">' + avSvg(me.a, k && POWERS[k].atk ? 'attack' : 'idle') + '</div><div class="p-title">' + (k ? ICON[k] + ' ' + POWERS[k].n : 'Bez moći') + '</div>' +""")
# mobitel: pogođen moći → šokiran lik u zaglavlju pitanja
s = rep(s, """    const head = me ? '<div class="p-top"><span class="p-me"><span class="mini">' + avSvg(me.a) + '</span>""",
           """    const head = me ? '<div class="p-top"><span class="p-me"><span class="mini">' + avSvg(me.a, d.ph === 'question' && me.fx ? 'shocked' : '') + '</span>""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('likovi OK')

# ---- prikaz bacanja moći prije pitanja ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  // ---------- glavni prikaz ----------\n", open(SP + '/v4/cast.js', encoding='utf-8').read() + "\n  // ---------- glavni prikaz ----------\n")
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/cast.css', encoding='utf-8').read() + s[i:]
s = rep(s, "    const fresh = d.s !== tvStep;\n", "    if (d.ph === 'cast' && d.s === tvStep && document.getElementById('castStage')) return;\n    const fresh = d.s !== tvStep;\n")
s = rep(s, "      case 'power': {\n        const legend", """      case 'cast':
        h = tvTop(d, 'Bacanje moći!') + '<div class="tv-mid cast-mid">' + castHtml(d) + '</div>';
        break;
      case 'power': {
        const legend""")
s = rep(s, "    $app.innerHTML = demoBar + h;\n    bind('skip', () => game.skip());", "    $app.innerHTML = demoBar + h;\n    if (d.ph === 'cast') CAST.start(document.getElementById('castStage'), d, true);\n    bind('skip', () => game.skip());")
s = rep(s, "    const freshP = !!d && L.s !== phoneStep;\n", "    const freshP = !!d && L.s !== phoneStep;\n    if (d && d.ph === 'cast' && d.ntv && !freshP && document.getElementById('castStage')) return;\n")
s = rep(s, "      case 'power': h = head + timerHtml() + powerPhone(d, me); break;", """      case 'cast': {
        if (d.ntv) { h = head + '<div class="p-title">Bacanje moći!</div>' + castHtml(d); break; }
        const hits = d.ev.filter((e) => e.t === PID);
        h = center(head + '<div class="p-title" style="color:var(--gold)">Gledaj TV!</div><div class="p-cast-me bob">' + avSvg(me.a, hits.some((e) => !e.b) ? 'shocked' : 'idle') + '</div>' +
          (hits.length ? '<div class="p-sub">' + hits.map((e) => esc(nameOf(d, e.f)) + ' ti šalje: ' + POWERS[e.p].n + (e.b ? ' (štit ga odbija)' : '')).join('<br>') + '</div>' : '<div class="p-sub">Moći lete po pozornici…</div>'));
        break;
      }
      case 'power': h = head + timerHtml() + powerPhone(d, me); break;""")
s = rep(s, "    $app.innerHTML = demoBar + h;\n    if (freshP) $app.classList.add('fresh');", "    $app.innerHTML = demoBar + h;\n    if (freshP) $app.classList.add('fresh');\n    if (d.ph === 'cast' && d.ntv) CAST.start(document.getElementById('castStage'), d, true);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('bacanje moći OK')

# ---- finale: početak prema bodovima i moći prije svakog pitanja ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  const meOf = (d) => d && d.P.find((p) => p.id === PID);\n", """  const meOf = (d) => d && d.P.find((p) => p.id === PID);
  const pwDesc = (k, d) => (d && d.fin && k === 'dupli' ? 'Točan odgovor u finalu vrijedi stepenicu više.' : POWERS[k].d);
  const stepTxt = (n) => (n ? n + '. stepenice' : 'dna piramide');
""")
s = rep(s, """        const legend = Object.keys(POWERS).map((k) => '<div class="pw-mini"><span class="pw-ico">' + ICON[k] + '</span><div><b>' + POWERS[k].n + '</b><span>' + POWERS[k].d + '</span></div></div>').join('');
        h = tvTop(d, 'Odaberite moć na mobitelu') + timerHtml() +
          '<div class="tv-mid"><div class="tv-title">Vrijeme je za moći!</div><div class="powers-legend">' + legend + '</div></div>' + lineup(d, { check: true });""",
"""        const legend = Object.keys(POWERS).filter((k) => !(d.fin && k === 'pola')).map((k) => '<div class="pw-mini"><span class="pw-ico">' + ICON[k] + '</span><div><b>' + POWERS[k].n + '</b><span>' + pwDesc(k, d) + '</span></div></div>').join('');
        if (d.fin) {
          h = tvTop(d, 'Finale · odaberite moć na mobitelu') + timerHtml() +
            '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="tv-title">Moći prije pitanja!</div><div class="powers-legend">' + legend + '</div>' + lineup(d, { check: true }) + '</div>' + pyramidHtml(d, false) + '</div>';
          break;
        }
        h = tvTop(d, 'Odaberite moć na mobitelu') + timerHtml() +
          '<div class="tv-mid"><div class="tv-title">Vrijeme je za moći!</div><div class="powers-legend">' + legend + '</div></div>' + lineup(d, { check: true });""")
s = rep(s, "<span><b>' + POWERS[k].n + '</b><span>' + POWERS[k].d + '</span></span></button>'", "<span><b>' + POWERS[k].n + '</b><span>' + pwDesc(k, d) + '</span></span></button>'")
# početne stepenice: TV
s = rep(s, "      case 'fq': case 'fr': {\n        const rev = d.ph === 'fr';", """      case 'fstart': {
        const rows = d.P.slice().sort((a, b) => b.fs - a.fs || b.sc - a.sc).map((p) => '<div class="rank-row"><span class="mini">' + avSvg(p.a, p.fs ? 'happy' : 'idle') + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + ' b → ' + (p.fs ? p.fs + '. stepenica' : 'dno') + '</span></div>').join('');
        h = tvTop(d, 'Početne stepenice prema bodovima') +
          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="tv-title">Tko kreće odakle?</div><div style="display:flex;flex-direction:column;gap:10px">' + rows + '</div>' +
          '<div class="tie-note">Što više bodova, to viša početna stepenica, ali najviše ' + Math.min(3, d.steps) + '. Do vrha ih je ' + d.steps + '.</div>' +
          '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div></div>' + pyramidHtml(d, false) + '</div>';
        break;
      }
      case 'fq': case 'fr': {
        const rev = d.ph === 'fr';""")
s = rep(s, """          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="q-text">' + esc(d.q.t) + '</div><div class="tf-row">' + tf + '</div></div>' +""",
           """          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="q-text">' + esc(d.q.t) + '</div><div class="tf-row">' + tf + '</div>' + (rev ? '' : evHtml(d)) + '</div>' +""")
s = rep(s, "      case 'intro': return SFX.play('whoosh');\n      case 'vote': case 'sort':", "      case 'intro': case 'fstart': return SFX.play('whoosh');\n      case 'vote': case 'sort':")
# početne stepenice: mobitel
s = rep(s, "      case 'fq': h = head + finalePhone(d, me); break;", """      case 'fstart': {
        const ahead = d.P.filter((p) => p.fs > me.fs).length;
        h = center(head + '<div style="width:130px" class="bob">' + avSvg(me.a, me.fs ? 'happy' : 'idle') + '</div>' +
          '<div class="p-title">Krećeš s ' + stepTxt(me.fs) + '</div>' +
          '<div class="p-sub">' + (ahead ? 'Ispred tebe ' + (ahead === 1 ? 'je 1 igrač' : 'su ' + ahead + ' igrača') + '. Moći i brzi odgovori mogu sve promijeniti!' : 'Najviše si na piramidi. Pazi na napade!') + '</div>' +
          (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, false) + '</div>' : ''));
        break;
      }
      case 'fq': h = head + finalePhone(d, me); break;""")
# efekti moći i u finalu
s = rep(s, "      if (d.ph === 'question' && me && me.fx) { L.fxq = me.fx.slice(); L.fx = makeFx(L.fxq[0]); }", "      if ((d.ph === 'question' || d.ph === 'fq') && me && me.fx) { L.fxq = me.fx.slice(); L.fx = makeFx(L.fxq[0]); }")
s = rep(s, "    if (d.ph === 'question' && L.fx && !(L.sent || (me && me.ok))) bindFx();", "    if ((d.ph === 'question' || d.ph === 'fq') && L.fx && !(L.sent || (me && me.ok))) bindFx();")
s = rep(s, "      case 'question': if (L.fx) SFX.play(FX_SOUND[L.fx.k] || 'zap'); return;", "      case 'question': case 'fq': if (L.fx) SFX.play(FX_SOUND[L.fx.k] || 'zap'); return;")
s = rep(s, """    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + (i === 0 ? 3 : 0) + (answered ? (mine === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '>' + esc(o) + '</button>').join('');
    return timerHtml(3000) + '<div class="p-top"><span class="pill">Finale · stepenica ' + (me.st || 0) + '/' + d.steps + '</span><span id="tnum"></span></div>' +
      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div><div class="p-opts two">' + opts + '</div>' +""",
"""    const locked = !answered && !L.fx && Date.now() < (L.lockUntil || 0);
    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + (i === 0 ? 3 : 0) + (locked ? ' locked' : '') + (answered ? (mine === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '>' + esc(o) + '</button>').join('');
    const buffs = (me.d ? '<span class="tag" style="background:var(--gold);color:#2b1a00">✖️2 Stepenica više</span>' : '') + (me.sh ? '<span class="tag">🛡️ Štit</span>' : '');
    const attackers = (d.ev || []).filter((e) => e.t === PID);
    const hit = attackers.length ? '<div class="p-sub">' + attackers.map((e) => esc(nameOf(d, e.f)) + ' ' + ICON[e.p] + (e.b ? ' (odbijeno)' : '')).join(' · ') + '</div>' : '';
    return timerHtml(3000) + '<div class="p-top"><span class="pill">Finale · stepenica ' + (me.st || 0) + '/' + d.steps + '</span><span id="tnum"></span></div>' +
      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div>' + (buffs ? '<div class="buffs">' + buffs + '</div>' : '') + hit +
      '<div class="q-area"><div class="p-opts two">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx)) + '</div>' +
      (!answered && locked ? '<div class="waiting">Očišćeno! Odgovori se otključavaju…</div>' : '') +""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('finale OK')

# ---- nove grickalice (jedu slova) i bombe (lete preko odgovora) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      if ((d.ph === 'question' || d.ph === 'fq') && me && me.fx) { L.fxq = me.fx.slice(); L.fx = makeFx(L.fxq[0]); }",
"""      if ((d.ph === 'question' || d.ph === 'fq') && me && me.fx) {
        L.fxq = me.fx.filter((k) => k === 'led' || k === 'sluz'); L.fx = makeFx(L.fxq[0]);
        L.eat = me.fx.filter((k) => k === 'grick').length;
        const nb = me.fx.filter((k) => k === 'bomba').length * 3;
        L.bombs = Array.from({ length: nb }, (_, i) => ({ x: 12 + Math.random() * 76, y: 15 + Math.random() * 70, vx: (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 14), vy: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 12), on: true }));
      }""")
s = rep(s, "  function fxHtml(fx) {\n", """  // grickalice: dio slova u odgovorima je pojeden (isti za cijelo pitanje)
  function optText(o, i) {
    if (!L.eat) return esc(o);
    let seed = (L.s * 97 + i * 131 + 7) >>> 0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) / 16777216; };
    const chars = Array.from(o), idx = chars.map((c, j) => (/\\S/.test(c) ? j : -1)).filter((j) => j >= 0);
    const frac = Math.min(0.7, 0.4 + 0.15 * (L.eat - 1));
    const n = Math.max(1, Math.round(idx.length * frac));
    const gone = new Set();
    while (gone.size < Math.min(n, idx.length)) gone.add(idx[Math.floor(rnd() * idx.length)]);
    let k = 0;
    return chars.map((c, j) => (gone.has(j) ? '<span class="bite" style="animation-delay:' + (0.15 + (k++) * 0.06).toFixed(2) + 's">' + esc(c) + '</span>' : esc(c))).join('') +
      '<span class="eater" aria-hidden="true">' + bugSvg + '</span>';
  }
  function bombLayer() {
    if (!L.bombs || !L.bombs.some((b) => b.on) || L.fx) return '';
    return '<div class="bomb-layer" id="bombs">' + L.bombs.map((b, i) => (b.on ? '<button class="fly-bomb" data-bi="' + i + '" style="left:' + b.x + '%;top:' + b.y + '%" aria-label="Bomba, ne diraj!">' + bombSvg + '</button>' : '')).join('') + '</div>';
  }
  function boomCover() { return Date.now() < (L.boomUntil || 0) ? '<div class="boom-cover"><b>BUM!</b></div>' : ''; }
  function bindBombs() {
    const layer = document.getElementById('bombs');
    if (!layer) return;
    layer.querySelectorAll('[data-bi]').forEach((b) => {
      b.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation();
        const bomb = L.bombs[+b.dataset.bi]; if (!bomb || !bomb.on) return;
        bomb.on = false; L.boomUntil = Date.now() + 2000;
        SFX.play('boom'); if (navigator.vibrate) { try { navigator.vibrate([80, 40, 120]); } catch (er) {} }
        const s0 = L.s; setTimeout(() => { if (L.s === s0) phoneRender(true); }, 2050);
        phoneRender(true);
      };
    });
    if (L.bombRaf) return;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const lay = document.getElementById('bombs');
      if (!lay || !L.bombs) { L.bombRaf = 0; return; }
      for (const el of lay.querySelectorAll('[data-bi]')) {
        const b = L.bombs[+el.dataset.bi];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 8 || b.x > 92) { b.vx *= -1; b.x = Math.max(8, Math.min(92, b.x)); }
        if (b.y < 10 || b.y > 90) { b.vy *= -1; b.y = Math.max(10, Math.min(90, b.y)); }
        el.style.left = b.x + '%'; el.style.top = b.y + '%';
      }
      L.bombRaf = requestAnimationFrame(step);
    };
    L.bombRaf = requestAnimationFrame(step);
  }
  function fxHtml(fx) {
""")
# pitanje u rundama
s = rep(s, """      return '<button class="' + cls + '" data-c="' + i + '"' + (answered || gone ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span>' + esc(o) + '</span></button>';""",
           """      return '<button class="' + cls + '" data-c="' + i + '"' + (answered || gone ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span class="otxt">' + optText(o, i) + '</span></button>';""")
s = rep(s, """      '<div class="q-area"><div class="p-opts">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx)) + '</div>' +""",
           """      '<div class="q-area"><div class="p-opts">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx) + bombLayer()) + '</div>' + boomCover() +""")
# finale
s = rep(s, """'" data-c="' + i + '"' + (answered ? ' disabled' : '') + '>' + esc(o) + '</button>').join('');
    const buffs = (me.d ? '<span class="tag" style="background:var(--gold);color:#2b1a00">✖️2 Stepenica više</span>'""",
           """'" data-c="' + i + '"' + (answered ? ' disabled' : '') + '><span class="otxt">' + optText(o, i) + '</span></button>').join('');
    const buffs = (me.d ? '<span class="tag" style="background:var(--gold);color:#2b1a00">✖️2 Stepenica više</span>'""")
s = rep(s, """      '<div class="q-area"><div class="p-opts two">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx)) + '</div>' +""",
           """      '<div class="q-area"><div class="p-opts two">' + opts + '</div>' + (answered ? '' : fxHtml(L.fx) + bombLayer()) + '</div>' + boomCover() +""")
# odgovor je blokiran dok traje eksplozija
s = rep(s, "        if (Date.now() < (L.lockUntil || 0)) return;\n", "        if (Date.now() < (L.lockUntil || 0) || Date.now() < (L.boomUntil || 0)) return;\n")
s = rep(s, "    if ((d.ph === 'question' || d.ph === 'fq') && L.fx && !(L.sent || (me && me.ok))) bindFx();",
           "    if ((d.ph === 'question' || d.ph === 'fq') && L.fx && !(L.sent || (me && me.ok))) bindFx();\n    if ((d.ph === 'question' || d.ph === 'fq') && !(L.sent || (me && me.ok))) bindBombs();")
s = rep(s, "      case 'question': case 'fq': if (L.fx) SFX.play(FX_SOUND[L.fx.k] || 'zap'); return;",
           "      case 'question': case 'fq': if (L.fx) SFX.play(FX_SOUND[L.fx.k] || 'zap'); else if (L.bombs && L.bombs.length) SFX.play('zap'); else if (L.eat) SFX.play('squish'); return;")
s = rep(s, "  const FX_LABEL = { led: 'Zaleđen si! Tapkaj da razbiješ led', sluz: 'Sluz! Obriši je prstom', grick: 'Grickalice! Zgnječi sve bubice', bomba: 'Bomba! Tapni je da je odbaciš' };",
           "  const FX_LABEL = { led: 'Zaleđen si! Tapkaj da razbiješ led', sluz: 'Sluz! Obriši je prstom' };")
i = s.index('</style>'); s = s[:i] + """  /* grickalice: pojedena slova */
  .otxt { position: relative; }
  .bite { color: transparent !important; text-shadow: none !important; position: relative; animation: biteIn 0.25s both; }
  .bite::after { content: ''; position: absolute; left: 8%; right: 8%; top: 30%; bottom: 20%; border-radius: 45%; background: radial-gradient(circle at 50% 40%, rgba(0,0,0,.35), rgba(0,0,0,.12) 60%, transparent 70%); }
  @keyframes biteIn { from { color: inherit; transform: scale(1.3); } }
  .eater { display: inline-block; width: 1.3em; height: 1.3em; vertical-align: middle; margin-left: 0.3em; animation: wiggle 0.25s ease-in-out infinite alternate; }
  .eater svg { width: 100%; height: 100%; }
  /* bombe koje lete preko odgovora */
  .bomb-layer { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
  .fly-bomb { position: absolute; width: 58px; height: 58px; margin: -29px 0 0 -29px; padding: 0; border: 0; background: none; pointer-events: auto; filter: drop-shadow(0 6px 8px rgba(0,0,0,.5)); animation: pulse 0.45s infinite alternate; touch-action: none; }
  .fly-bomb svg { width: 100%; height: 100%; }
  .boom-cover { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; pointer-events: auto;
    background: radial-gradient(circle at 50% 50%, #fff 0%, #ffe066 18%, #ff7a1f 38%, #c4162b 58%, #2a0610 85%); animation: boomIn 2s ease-out forwards; }
  .boom-cover b { font-family: var(--font-display); font-weight: 700; font-size: 5rem; color: #fff; text-shadow: 0 0 30px #ff7a1f, 0 6px 0 #7a0e1b; animation: shake 0.12s 6; }
  @keyframes boomIn { 0% { opacity: 0; transform: scale(0.6); } 8% { opacity: 1; transform: scale(1.05); } 15% { transform: none; } 80% { opacity: 1; } 100% { opacity: 0.2; } }
""" + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('grickalice i bombe OK')

# ---- odbrojavanje zvukom i glazba u pozadini ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      tick: () => tone(1250, 0, 0.05, 'square', 0.05),\n", """      tick: () => tone(1250, 0, 0.05, 'square', 0.05),
      beep: (n) => { const f = [0, 1568, 1319, 1175, 988, 880][n] || 880; tone(f, 0, 0.16, 'square', 0.09); tone(f / 2, 0, 0.16, 'triangle', 0.08); },
      timeup: () => { tone(220, 0, 0.5, 'sawtooth', 0.12, 150); tone(233, 0, 0.5, 'square', 0.06, 160); noise(0, 0.3, 0.1, 600, 'lowpass'); },
""")
s = rep(s, "      play(n) { try { if (P[n]) P[n](); } catch (e) {} },", "      play(n, a) { try { if (P[n]) P[n](a); } catch (e) {} },\n      ctx() { return ac(); },")
s = rep(s, "  document.addEventListener('pointerdown', (e) => {\n    SFX.unlock();", """  // ---------- glazba u pozadini (sintetizirana petlja, A-mol: Am F C G) ----------
  const MUSIC = (() => {
    let on = store.get('mz_music') !== '0', gain = null, timer = null, next = 0, step = 0, playing = false;
    const BPM = 108, S16 = 60 / BPM / 4;
    const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const CH = [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]], BASS = [45, 41, 48, 43];
    const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
    function out(c) {
      if (!gain) {
        gain = c.createGain(); gain.gain.value = 0;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
        gain.connect(lp); lp.connect(c.destination);
      }
      return gain;
    }
    function note(c, f, t, dur, type, vol, f2) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out(c)); o.start(t); o.stop(t + dur + 0.05);
    }
    let nbuf = null;
    function hat(c, t, vol, dur) {
      if (!nbuf) { const len = Math.floor(c.sampleRate * 0.3); nbuf = c.createBuffer(1, len, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = nbuf; f.type = dur > 0.08 ? 'bandpass' : 'highpass'; f.frequency.value = dur > 0.08 ? 1800 : 7000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(out(c)); src.start(t); src.stop(t + dur);
    }
    function schedule() {
      const c = SFX.ctx(); if (!c) return;
      while (next < c.currentTime + 0.25) {
        const bar = Math.floor(step / 16) % 4, st = step % 16, t = next, ch = CH[bar];
        if (st === 0) ch.forEach((m) => note(c, mf(m), t, S16 * 15, 'triangle', 0.035));
        if (st === 0 || st === 6 || st === 8 || st === 14) note(c, mf(BASS[bar]), t, S16 * 1.8, 'sine', 0.16);
        if (st % 2 === 0) note(c, mf(ch[ARP[(st / 2) % 8]] + 12), t, S16 * 1.6, 'square', 0.018);
        if (st === 0 || st === 8) note(c, 120, t, 0.18, 'sine', 0.22, 42);
        if (st === 4 || st === 12) hat(c, t, 0.06, 0.12);
        if (st % 4 === 2) hat(c, t, 0.035, 0.04);
        next += S16; step++;
      }
    }
    function want(play) {
      const c = play ? SFX.ctx() : null;
      if (play && c && c.state === 'running' && !playing) {
        playing = true; out(c); next = c.currentTime + 0.05; step = 0;
        gain.gain.cancelScheduledValues(c.currentTime); gain.gain.setTargetAtTime(0.5, c.currentTime, 0.4);
        timer = setInterval(schedule, 90); schedule();
      } else if (!play && playing) {
        playing = false; clearInterval(timer); timer = null;
        const cc = SFX.ctx(); if (cc && gain) gain.gain.setTargetAtTime(0, cc.currentTime, 0.15);
      }
    }
    return { want, get on() { return on; }, toggle() { on = !on; store.set('mz_music', on ? '1' : '0'); } };
  })();
  document.addEventListener('pointerdown', (e) => {
    SFX.unlock();""")
# gumb za glazbu
s = rep(s, '<button id="mute" type="button" aria-label="Isključi zvuk"></button>\n', '<button id="mute" type="button" aria-label="Isključi zvuk"></button>\n<button id="music" type="button" aria-label="Isključi glazbu"></button>\n')
s = rep(s, "  (function () { const b = document.getElementById('mute'); if (b) { b.onclick = () => { SFX.toggle(); updMute(); }; updMute(); } })();", """  (function () { const b = document.getElementById('mute'); if (b) { b.onclick = () => { SFX.toggle(); updMute(); }; updMute(); } })();
  const NOTE_ON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17V5l11-2v12" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="2.8" fill="#fff"/><circle cx="17.5" cy="15.5" r="2.8" fill="#fff"/></svg>';
  const NOTE_OFF = NOTE_ON.replace('</svg>', '<path d="M3 3l18 18" stroke="#ff3d81" stroke-width="2.4" stroke-linecap="round"/></svg>');
  function updMusic() {
    const b = document.getElementById('music'); if (!b) return;
    b.innerHTML = MUSIC.on ? NOTE_ON : NOTE_OFF;
    b.setAttribute('aria-label', MUSIC.on ? 'Isključi glazbu' : 'Uključi glazbu');
    b.classList.toggle('off', !MUSIC.on);
  }
  (function () { const b = document.getElementById('music'); if (b) { b.onclick = () => { MUSIC.toggle(); updMusic(); }; updMusic(); } })();""")
i = s.index('</style>'); s = s[:i] + """  #music { position: fixed; z-index: 60; right: calc(max(14px, env(safe-area-inset-right, 0px)) + 56px); bottom: max(14px, env(safe-area-inset-bottom, 0px)); width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: rgba(10, 8, 30, 0.7); border: 1px solid var(--edge); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); }
  #music .ic { width: 22px; height: 22px; }
""" + s[i:]
# odbrojavanje: zadnjih 5 sekundi tiktak, zadnje 3 jači pisak, na kraju zujalica; na TV-u i na mobitelu koji još nije odgovorio
s = rep(s, """    if (ring) {
      ring.classList.toggle('urgent', ms <= 5000);
      const tvShown = mode === 'host' || (mode === 'demo' && demoView === 'tv');
      const sec = Math.ceil(ms / 1000);
      if (tvShown && ms > 0 && sec <= 5 && sec !== lastTickSec) { lastTickSec = sec; SFX.play('tick'); }
    }
  }""", """    if (ring) ring.classList.toggle('urgent', ms <= 5000);
    const tvShown = mode === 'host' || (mode === 'demo' && demoView === 'tv');
    const ph = tvShown ? (game && game.view().ph) : (S && S.ph);
    const me = !tvShown && S ? meOf(S) : null;
    const waiting = INPUT_PHASES[ph] && (tvShown ? !!ring : !!(wrap && me && !me.ok && !(L && L.sent)));
    const key = (tvShown ? 't' : 'p') + (tvShown ? tvStep : (L && L.s));
    if (waiting && clockDur) {
      const sec = Math.ceil(ms / 1000);
      if (ms > 0 && sec <= 5 && key + ':' + sec !== lastTickSec) { lastTickSec = key + ':' + sec; SFX.play(sec <= 3 ? 'beep' : 'tick', sec); }
      if (ms <= 0 && lastTickSec !== key + ':end') { lastTickSec = key + ':end'; SFX.play('timeup'); }
    }
    MUSIC.want(MUSIC.on && !SFX.muted && (mode === 'host' || mode === 'hostp' || mode === 'demo'));
  }""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('zvuk OK')

# ---- bajkoviti izgled ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, 'family=Fredoka:wght@500;600;700&family=Nunito:wght@600;800;900', 'family=Fredoka:wght@500;600;700&family=Titan+One&family=Nunito:wght@600;800;900')
s = rep(s, '<canvas id="bg" aria-hidden="true"></canvas>\n', '<canvas id="bg" aria-hidden="true"></canvas>\n<div id="deco" aria-hidden="true"></div>\n')
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/bajka.css', encoding='utf-8').read() + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('bajka OK')

# ---- krčma: Trivia Tavern ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/taverna.css', encoding='utf-8').read() + s[i:]
# šank s likovima na dnu mobitela (glasanje, moći, pitanje, finale)
s = rep(s, "  function rankStat(d, me) {", """  function barRow(d) {
    const mood = (p) => (d.ph === 'question' || d.ph === 'fq') && p.fx ? 'shocked' : p.ok ? 'happy' : 'idle';
    return '<div class="bar-row">' + d.P.map((p) => '<div class="bw' + (p.id === PID ? ' me' : '') + '"><span class="glow"></span>' + avSvg(p.a, mood(p)) + (p.ok ? '<span class="ok">✓</span>' : '') + '<span class="nm">' + esc(p.n) + '</span></div>').join('') + '</div>';
  }
  function rankStat(d, me) {""")
s = rep(s, "    if (freshP && me) { phoneStep = L.s; phoneSound(d, me); }\n    $app.innerHTML = demoBar + h;",
           "    if (freshP && me) { phoneStep = L.s; phoneSound(d, me); }\n    if (me && (!d.ntv || d.ph !== 'fq') && (d.ph === 'vote' || d.ph === 'power' || d.ph === 'question' || d.ph === 'fq')) h += barRow(d);\n    $app.innerHTML = demoBar + h;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('krčma OK')

# ---- naslikani elementi (ui/*.webp) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/ui.css', encoding='utf-8').read() + s[i:]
s = rep(s, '<canvas id="bg" aria-hidden="true"></canvas>\n<div id="deco" aria-hidden="true"></div>\n', '')
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('ui OK')

# ---- naslikane ikone moći ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  const bugSvg = ", "  for (const k in ICON) ICON[k] = '<img class=\"ic pw-img\" src=\"ui/pw-' + k + '.webp\" alt=\"\" draggable=\"false\">';\n  const bugSvg = ")
i = s.index('</style>'); s = s[:i] + """  .pw-img { object-fit: contain; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.45)); }
  .pw-ico .pw-img { width: 78%; height: 78%; }
  .pw-card .pw-ico, .pw-mini .pw-ico { background: radial-gradient(circle, rgba(255, 220, 150, 0.35), transparent 70%); }
  .pw-card .pw-ico { width: 70px; height: 70px; }
  .cast-banner .cico { width: 1.6em; height: 1.6em; }
  .ev .ic, .fxrow .ic { width: 1.5em; height: 1.5em; }
""" + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('ikone OK')

# ---- pitanje: tekst se smanjuje (u razumnom rasponu) umjesto da panel raste ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  // ---------- glavni prikaz ----------\n", """  function fitQuestions() {
    document.querySelectorAll('.p-q, .q-text').forEach((el) => {
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize), min = base * 0.68;
      let f = base;
      while (el.scrollHeight > el.clientHeight + 1 && f > min) { f -= 1; el.style.fontSize = f + 'px'; }
    });
  }
  (function () {
    const app = document.getElementById('app');
    if (app && window.MutationObserver) new MutationObserver(() => requestAnimationFrame(fitQuestions)).observe(app, { childList: true });
    addEventListener('resize', () => requestAnimationFrame(fitQuestions));
  })();

  // ---------- glavni prikaz ----------
""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('fit OK')

# ---- boja punjenja vremenske trake prema preostalom vremenu ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "    if (bar && clockDur) bar.style.width = (ms / clockDur * 100) + '%';",
           "    if (bar && clockDur) { const fr = ms / clockDur; bar.style.width = (fr * 100) + '%'; bar.dataset.lv = fr > 0.5 ? 'g' : fr > 0.2 ? 'a' : 'r'; }")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('timer OK')

# ---- vrata: naziv kategorije u zasebnom elementu, automatsko smanjivanje dugih naziva ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """'" data-v="' + i + '"' + (res || mine !== -1 ? ' disabled' : '') + '>' + esc(c) +""", """'" data-v="' + i + '"' + (res || mine !== -1 ? ' disabled' : '') + '><span class="dname"><span>' + esc(c) + '</span></span>' +""")
s = rep(s, "<div class=\"dn\">' + esc(c) + '</div>", "<div class=\"dn\"><span>' + esc(c) + '</span></div>")
s = rep(s, """    document.querySelectorAll('.p-q, .q-text').forEach((el) => {""", """    document.querySelectorAll('.door .dn, .door-btn .dname').forEach((el) => {
      el.style.fontSize = '';
      const inner = el.firstElementChild || el, base = parseFloat(getComputedStyle(el).fontSize), lh = 1.08;
      let f = base;
      const tooBig = () => inner.scrollWidth > el.clientWidth + 1 || inner.offsetHeight > el.clientHeight + 1 || inner.offsetHeight > f * lh * 3 + 2;
      while (tooBig() && f > base * 0.55) { f -= 1; el.style.fontSize = f + 'px'; }
    });
    document.querySelectorAll('.p-q, .q-text').forEach((el) => {""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('vrata OK')

# ---- legenda moći na TV-u: oznaka napad/pomoć za mali naglasak ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = s.replace("'<div class=\"pw-mini\"><span class=\"pw-ico\">' + ICON[k]", "'<div class=\"pw-mini ' + (POWERS[k].atk ? 'atk' : 'buff') + '\"><span class=\"pw-ico\">' + ICON[k]")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('legenda OK')

# ---- jednostavni HUD na mobitelu ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/hud.css', encoding='utf-8').read() + s[i:]
s = rep(s, "'</span><span>' + esc(me.n) + '</span></span><span>' + esc(d.rl || '') + '</span><span>' + me.sc + ' b</span></div>' : '';",
           "'</span><span>Ti</span></span><span>' + esc(hudRound(d.rl)) + '</span><span>' + me.sc + ' b</span></div>' : '';")
s = rep(s, "  function rankStat(d, me) {", "  function hudRound(rl) { const m = /^Runda (\\d+)$/.exec(rl || ''); return m ? 'Runda ' + m[1] + '/3' : (rl || ''); }\n  function rankStat(d, me) {")
s = rep(s, "<span class=\"pill\">Demo: TV prikaz</span>", "<span class=\"pill\">Demo</span>")
s = rep(s, "📱 Natrag na mobitel</button>", "Natrag na mobitel</button>")
s = rep(s, "📺 Pogledaj TV</button>", "Pogledaj TV</button>")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('hud OK')

# ---- poredak: jedan panel, redovi, animirani pomak pozicija ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/board.css', encoding='utf-8').read() + s[i:]
s = rep(s, """    const r = d.P.slice().sort((a, b) => b.sc - a.sc);
    return '<div class="mboard">' + r.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a, gain && p.g ? 'happy' : '') + '</span><span class="nm">' + esc(p.n) + '</span>' +
      (gain && p.g ? '<span class="gain">+' + p.g + '</span>' : '') + '<span class="sc">' + p.sc + '</span></div>').join('') + '</div>';""",
"""    const r = d.P.slice().sort((a, b) => b.sc - a.sc);
    const before = gain ? d.P.slice().sort((a, b) => (b.sc - (b.g || 0)) - (a.sc - (a.g || 0))).map((p) => p.id) : [];
    return '<div class="mboard' + (gain ? '' : ' wide') + '">' + r.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '" data-id="' + esc(p.id) + '" data-prev="' + (gain ? before.indexOf(p.id) : i) + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a, gain && p.g ? 'happy' : '') + '</span><span class="nm">' + esc(p.n) + (p.id === PID ? '<span class="you">Ti</span>' : '') + '</span>' +
      (gain ? '<span class="gain' + (p.g ? '' : ' zero') + '">' + (p.g ? '+' + p.g : '+0') + '</span>' : '') + '<span class="sc">' + p.sc + '</span></div>').join('') + '</div>';""")
# glatki pomak redova na novu poziciju
s = rep(s, "  function fitQuestions() {\n", """  function flipBoards() {
    document.querySelectorAll('.mboard:not([data-flipped])').forEach((b) => {
      b.dataset.flipped = '1';
      const rows = [...b.querySelectorAll('.rank-row[data-prev]')]; if (!rows.length || reduceMotion) return;
      const h = rows[0].getBoundingClientRect().height;
      rows.forEach((r, i) => {
        const dy = (+r.dataset.prev - i) * h; if (!dy) return;
        r.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 650, delay: 350, easing: 'cubic-bezier(.3,.9,.3,1)', fill: 'backwards' });
      });
    });
  }
  function fitQuestions() {
    flipBoards();
""")
# TV kraj i "Tko kreće odakle?" koriste isti panel
s = rep(s, """          ranked.map((p, i) => '<div class="rank-row"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a) + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + ' b · ' + (p.st || 0) + '/' + d.steps + '</span></div>').join('') +""",
           """          '<div class="mboard wide">' + ranked.map((p, i) => '<div class="rank-row"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a) + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + ' b · ' + (p.st || 0) + '/' + d.steps + '</span></div>').join('') + '</div>' +""")
s = rep(s, """<div class="tv-title">Tko kreće odakle?</div><div style="display:flex;flex-direction:column;gap:10px">' + rows + '</div>'""",
           """<div class="tv-title">Tko kreće odakle?</div><div class="mboard nopos">' + rows + '</div>'""")
# bez konfeta kod običnog pitanja
s = rep(s, "      case 'reveal': if (me.ch === d.cor) { SFX.play('correct'); confetti(70); } else SFX.play('wrong'); return;",
           "      case 'reveal': if (me.ch === d.cor) SFX.play('correct'); else SFX.play('wrong'); return;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('poredak OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, 'Konačni poredak</div><div class="mboard">', 'Konačni poredak</div><div class="mboard wide">')
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)

# ---- piramida od modularnih stepenica ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/pyr.css', encoding='utf-8').read() + s[i:]
s = cut(s, '  function pyramidHtml(d, rev) {', '\n  function tvLobby', """  function pyramidHtml(d, rev) {
    let rows = '';
    for (let s = d.steps; s >= 0; s--) {
      const w = s === 0 ? 100 : 100 - (s - 1) * (59 / Math.max(1, d.steps - 1));
      const here = d.P.filter((p) => (p.st || 0) === s).map((p) => '<span class="climber' + (rev && p.mv ? ' go' : '') + '"' + (rev && p.mv ? ' style="--mv:' + p.mv + '"' : '') + '>' +
        (rev && p.mv ? '<span class="up">+' + p.mv + '</span>' : '') + avSvg(p.a, rev ? (p.mv ? 'happy' : 'sad') : '') + '</span>').join('');
      rows += '<div class="pstep' + (s === 0 ? ' base' : '') + (s === d.steps ? ' top' : '') + '" style="width:' + w.toFixed(1) + '%"><span class="lv">' + s + '</span><span class="here">' + here + '</span></div>';
    }
    return '<div class="pyramid">' + rows + '</div>';
  }
""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('piramida OK')

# ---- izazov razvrstavanja: povlačenje kartica u dvije zone ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/sort.css', encoding='utf-8').read() + s[i:]
s = cut(s, '  function sortPhone(d, me) {', '  function linkPhone(d, me) {', r"""  let lastSort = null;
  function srtCard(d, i, key, place) {
    const fb = key ? (place[i] === key[i] ? ' ok' : ' bad') : '';
    return '<div class="srt-card' + fb + (!key && L.srtSel === i ? ' sel' : '') + '" data-si="' + i + '"' + (key ? '' : ' role="button" tabindex="0"') + '>' + esc(d.so.it[i]) + '</div>';
  }
  function sortZonesHtml(d, place, key, extra) {
    const z = (k) => '<div class="srt-zone" data-z="' + k + '"><h4>' + esc(k ? d.so.b : d.so.a) + '</h4><div class="srt-in">' + d.so.it.map((_, i) => (place[i] === k ? srtCard(d, i, key, place) : '')).join('') + '</div></div>';
    return '<div class="srt-zones' + (extra || '') + '">' + z(0) + z(1) + '</div>';
  }
  function sortPhone(d, me) {
    const n = d.so.it.length;
    if (!L.sortP || L.sortP.length !== n) L.sortP = new Array(n).fill(-1);
    const sent = !!(L.sent || me.ok), left = L.sortP.filter((x) => x < 0).length;
    const head = '<div class="srt-head"><div class="p-title">Razvrstaj pojmove</div><div class="p-sub">' + (sent ? 'Poslano ✔ Čekamo ostale…' : 'Povuci svaki pojam u odgovarajuću skupinu.') + '</div></div>';
    const pool = sent ? '' : '<div class="srt-pool" data-z="-1">' + d.so.it.map((_, i) => (L.sortP[i] < 0 ? srtCard(d, i, null, L.sortP) : '')).join('') + (left ? '' : '<span class="srt-empty">Svi pojmovi su razvrstani</span>') + '</div>';
    const done = sent ? '' : '<button class="btn ghost" id="srtDone"' + (left ? ' disabled' : '') + '>' + (left ? 'Razvrstaj još ' + left : 'Gotovo') + '</button>';
    return '<div class="srt' + (sent ? ' sent' : '') + '">' + head + sortZonesHtml(d, L.sortP, null) + pool + done + '</div>';
  }
  function bindSort(d, me) {
    const root = $app.querySelector('.srt');
    if (!root || root.classList.contains('sent')) return;
    const place = (i, z) => { L.sortP[i] = z; L.srtSel = null; phoneRender(true); };
    root.querySelectorAll('.srt-card').forEach((c) => {
      const i = +c.dataset.si;
      c.onclick = (e) => { e.stopPropagation(); if (c.dataset.dragged) return; L.srtSel = L.srtSel === i ? null : i; phoneRender(true); };
      c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onclick(e); } };
      c.onpointerdown = (e) => {
        if (e.button > 0) return;
        const x0 = e.clientX, y0 = e.clientY; let moved = false, over = null;
        try { c.setPointerCapture(e.pointerId); } catch (er) {}
        c.onpointermove = (ev) => {
          const dx = ev.clientX - x0, dy = ev.clientY - y0;
          if (!moved && Math.hypot(dx, dy) < 6) return;
          if (!moved) { moved = true; c.classList.add('drag'); }
          c.style.setProperty('--x', dx + 'px'); c.style.setProperty('--y', dy + 'px');
          c.style.visibility = 'hidden';
          const hit = document.elementFromPoint(ev.clientX, ev.clientY);
          c.style.visibility = '';
          const z = hit && hit.closest && hit.closest('.srt [data-z]');
          if (z !== over) { if (over) over.classList.remove('over'); over = z || null; if (over) over.classList.add('over'); }
        };
        c.onpointerup = c.onpointercancel = () => {
          c.onpointermove = c.onpointerup = c.onpointercancel = null;
          if (!moved) return;
          c.dataset.dragged = '1';
          if (over) place(i, +over.dataset.z); else { L.srtSel = null; phoneRender(true); }
        };
      };
    });
    root.querySelectorAll('.srt [data-z]').forEach((z) => { z.onclick = () => { if (L.srtSel == null) return; place(L.srtSel, +z.dataset.z); }; });
    bind('srtDone', () => {
      if (L.sortP.some((x) => x < 0)) return;
      lastSort = { k: d.so.it.join('|'), p: L.sortP.slice() };
      sendInput({ r: L.sortP.slice() });
    });
  }
""")
s = rep(s, """    $app.querySelectorAll('[data-s]').forEach((b) => {
      b.onclick = () => {
        L.sortR.push(+b.dataset.s); L.sortI++;
        if (L.sortI >= d.so.it.length) sendInput({ r: L.sortR.slice() }); else phoneRender(true);
      };
    });
""", "    if (d.ph === 'sort') bindSort(d, me);\n")
s = rep(s, "        let sol = '';\n        if (d.ntv && d.ph === 'sortReveal') sol =",
           "        let sol = '';\n        if (d.ph === 'sortReveal' && lastSort && lastSort.k === d.so.it.join('|')) sol = sortZonesHtml(d, lastSort.p, d.so.key, ' sort-cols');\n        if (!sol && d.ntv && d.ph === 'sortReveal') sol =")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('razvrstavanje OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "(d.ntv ? sol + miniBoard(d, true) : rankStat(d, me));", "(d.ntv ? sol + miniBoard(d, true) : sol + rankStat(d, me));")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)

# ---- izazov spajanja parova: tap -> tap, tanke linije ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/link.css', encoding='utf-8').read() + s[i:]
s = cut(s, '  function linkPhone(d, me) {', '  function finalePhone(d, me) {', r"""  let lastLink = null;
  const LNK_COL = ['#b5713a', '#5f8a8b', '#8a6aa8', '#c49a3c', '#5a7aa8', '#9a6a6a', '#7a8a5a', '#a07a9a'];
  function lnkBoard(d, pairs, key, sel) {
    const n = d.li.L.length, rows = Math.max(n, d.li.R.length), ofR = {};
    pairs.forEach((j, i) => { if (j >= 0) ofR[j] = i; });
    let h = '';
    for (let k = 0; k < rows; k++) {
      if (k < n) {
        const j = pairs[k], fb = key && j >= 0 ? (j === key[k] ? ' ok' : ' bad') : '';
        h += '<div class="lnk-card lnk-l' + (j >= 0 ? ' paired' : '') + (sel === k ? ' sel' : '') + fb + '" data-ll="' + k + '" style="grid-row:' + (k + 1) + (j >= 0 ? ';--pc:' + LNK_COL[k % LNK_COL.length] : '') + '"' + (key ? '' : ' role="button" tabindex="0"') + '>' + esc(d.li.L[k]) + '</div>';
      }
      if (k < d.li.R.length) {
        const i = ofR[k], fb = key && i !== undefined ? (k === key[i] ? ' ok' : ' bad') : '';
        h += '<div class="lnk-card lnk-r' + (i !== undefined ? ' paired' : '') + fb + '" data-lr="' + k + '" style="grid-row:' + (k + 1) + (i !== undefined ? ';--pc:' + LNK_COL[i % LNK_COL.length] : '') + '"' + (key ? '' : ' role="button" tabindex="0"') + '>' + esc(d.li.R[k]) + '</div>';
      }
    }
    return '<div class="lnk-board"><svg aria-hidden="true"></svg>' + h + '</div>';
  }
  function drawLinks() {
    document.querySelectorAll('.lnk-board').forEach((b) => {
      const svg = b.querySelector('svg'); if (!svg) return;
      const br = b.getBoundingClientRect(); let p = '';
      b.querySelectorAll('.lnk-l.paired').forEach((l) => {
        const i = +l.dataset.ll, col = getComputedStyle(l).getPropertyValue('--pc').trim();
        const rIdx = (b.dataset.pairs || '').split(',')[i]; const r = b.querySelector('[data-lr="' + rIdx + '"]'); if (!r) return;
        const a = l.getBoundingClientRect(), c = r.getBoundingClientRect();
        const x1 = a.right - br.left, y1 = a.top + a.height / 2 - br.top, x2 = c.left - br.left, y2 = c.top + c.height / 2 - br.top, mx = (x1 + x2) / 2;
        p += '<path d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linecap="round"/>' +
          '<circle cx="' + x1 + '" cy="' + y1 + '" r="3" fill="' + col + '"/><circle cx="' + x2 + '" cy="' + y2 + '" r="3" fill="' + col + '"/>';
      });
      svg.innerHTML = p;
    });
  }
  function lnkHtml(d, pairs, key, sent, extra) {
    return lnkBoard(d, pairs, key, sent || key ? null : L.lnkSel).replace('<div class="lnk-board">', '<div class="lnk-board' + (extra || '') + '" data-pairs="' + pairs.join(',') + '">');
  }
  function linkPhone(d, me) {
    const n = d.li.L.length;
    if (!L.linkP || L.linkP.length !== n) L.linkP = new Array(n).fill(-1);
    const sent = !!(L.sent || me.ok), left = L.linkP.filter((x) => x < 0).length;
    const head = '<div class="srt-head"><div class="p-title">Spoji parove</div><div class="p-sub">' + (sent ? 'Poslano ✔ Čekamo ostale…' : 'Odaberi pojam s lijeve strane, zatim njegov par.') + '</div>' + (d.li.t ? '<div class="p-sub">' + esc(d.li.t) + '</div>' : '') + '</div>';
    const done = sent ? '' : '<button class="btn ghost" id="lnkDone"' + (left ? ' disabled' : '') + '>' + (left ? 'Spoji još ' + left : 'Gotovo') + '</button>';
    return '<div class="lnk' + (sent ? ' sent' : '') + '">' + head + lnkHtml(d, L.linkP, null, sent) + done + '</div>';
  }
  function bindLink(d, me) {
    const root = $app.querySelector('.lnk');
    if (!root || root.classList.contains('sent')) return;
    const re = () => phoneRender(true);
    root.querySelectorAll('[data-ll]').forEach((c) => {
      c.onclick = () => {
        const i = +c.dataset.ll;
        if (L.linkP[i] >= 0) { L.linkP[i] = -1; L.lnkSel = i; return re(); }
        L.lnkSel = L.lnkSel === i ? null : i; re();
      };
    });
    root.querySelectorAll('[data-lr]').forEach((c) => {
      c.onclick = () => {
        const j = +c.dataset.lr, owner = L.linkP.indexOf(j);
        if (L.lnkSel == null) { if (owner >= 0) { L.linkP[owner] = -1; re(); } return; }
        if (owner >= 0) L.linkP[owner] = -1;
        L.linkP[L.lnkSel] = j; L.lnkSel = null; re();
      };
    });
    root.querySelectorAll('.lnk-card[tabindex]').forEach((c) => { c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onclick(); } }; });
    bind('lnkDone', () => {
      if (L.linkP.some((x) => x < 0)) return;
      lastLink = { k: d.li.L.join('|') + '#' + d.li.R.join('|'), p: L.linkP.slice() };
      sendInput({ r: L.linkP.slice() });
    });
  }
""")
s = rep(s, """    $app.querySelectorAll('[data-l]').forEach((b) => {
      b.onclick = () => {
        L.linkR.push(+b.dataset.l); L.linkI++;
        if (L.linkI >= d.li.L.length) sendInput({ r: L.linkR.slice() }); else phoneRender(true);
      };
    });
""", "    if (d.ph === 'link') bindLink(d, me);\n")
s = rep(s, "        if (d.ntv && d.ph === 'linkReveal') sol =",
           "        if (d.ph === 'linkReveal' && lastLink && lastLink.k === d.li.L.join('|') + '#' + d.li.R.join('|')) sol = '<div class=\"lnk rev pairs\">' + lnkHtml(d, lastLink.p, d.li.key, true) + '</div>';\n        if (!sol && d.ntv && d.ph === 'linkReveal') sol =")
s = rep(s, "  function fitQuestions() {\n    flipBoards();\n", "  function fitQuestions() {\n    flipBoards();\n    drawLinks();\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('spajanje OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/home.css', encoding='utf-8').read() + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('home css OK')

# ---- predvorje / odabir lika ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/lobby.css', encoding='utf-8').read() + s[i:]
s = cut(s, "      case 'lobby': {\n        const taken", "      case 'intro':", r"""      case 'lobby': {
        const taken = {}; d.P.forEach((p) => { if (p.id !== PID) taken[p.a] = p.n; });
        const grid = PICK_ORDER.map((i) => { const a = AV[i], tk = taken[i] !== undefined;
          return '<button class="av-pick' + (me.a === i ? ' me' : '') + (L.popAv === i ? ' pop' : '') + '" data-av="' + i + '"' + (tk ? ' disabled' : '') + ' aria-label="' + esc(a.n) + (tk ? ', zauzeto' : '') + '">' +
            '<span class="pick-img">' + avSvg(i, me.a === i ? 'happy' : 'idle') + '</span><span class="pick-nm">' + esc(a.n) + '</span>' + (tk ? '<span class="pick-tk">Zauzeto</span>' : '') + '</button>'; }).join('');
        L.popAv = null;
        const hostId = d.ntv && d.P.length ? d.P[0].id : null;
        const rows = d.P.map((p) => '<div class="lob-row"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span class="nm">' + esc(p.n) + (p.id === hostId ? '<span class="crown" title="Domaćin">♛</span>' : '') + (p.id === PID ? '<span class="you">Ti</span>' : '') + '</span>' +
          '<span class="st' + (p.c ? '' : ' off') + '">' + (p.c ? '✓ U sobi' : 'Nije povezan') + '</span></div>').join('');
        let invite = '', cta = '';
        if (mode === 'hostp') {
          const open = L.inv !== undefined ? L.inv : d.P.length < 2, qr = qrSvg(appUrl() + '#' + d.code);
          invite = '<button class="btn ghost lob-toggle" id="lobInv" aria-expanded="' + open + '">' + (open ? 'Sakrij pozivnicu' : 'Pozovi igrače') + '</button>' +
            (open ? '<div class="lob-invite"><span class="lob-code-l">Kod sobe</span><span class="lob-code">' + esc(d.code) + '</span>' + (qr ? '<div class="lob-qr">' + qr + '</div>' : '') +
              '<span class="lob-addr">Skeniraj QR ili otvori ' + esc(location.host + location.pathname.replace(/index\.html$/, '')) + ' i upiši kod.</span></div>' : '');
          cta = '<button class="btn lob-cta" id="dstart"' + (d.P.length < 2 ? ' disabled' : '') + '>Započni igru</button>' + (d.P.length < 2 ? '<div class="lob-wait">Čekamo barem još jednog igrača.</div>' : '');
        } else if (mode === 'demo') {
          cta = '<button class="btn lob-cta" id="dstart">Započni igru</button><div class="lob-wait">Igraš protiv tri bota. Bacat će moći i na tebe!</div>';
        } else {
          cta = '<div class="lob-wait">Soba ' + esc(d.code) + ' · igra počinje kad domaćin pritisne „Započni igru“.</div>';
        }
        h = '<div class="lob"><div class="p-title lob-title">Odaberi lika</div><div class="av-grid">' + grid + '</div>' +
          '<div class="lob-players">' + rows + '</div>' + invite + cta + '<button class="home-link" id="leave">Izađi</button></div>';
        break;
      }
""")
s = rep(s, "    $app.querySelectorAll('[data-av]').forEach((b) => { b.onclick = () => chooseAvatar(+b.dataset.av); });",
           "    $app.querySelectorAll('[data-av]').forEach((b) => { b.onclick = () => { L.popAv = +b.dataset.av; chooseAvatar(+b.dataset.av); }; });\n    bind('lobInv', () => { L.inv = !(L.inv !== undefined ? L.inv : d.P.length < 2); phoneRender(true); });")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('predvorje OK')

# ---- najava runde ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/ann.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  function rankStat(d, me) {", r"""  const ANN_SUB = { 'Runda 1': 'Avantura počinje.', 'Runda 2': 'Vrijeme je za novu rundu.', 'Runda 3': 'Još samo jedna runda.', 'Veliko finale': 'Sve se odlučuje sada.' };
  function annHtml(d) {
    const t = d.it.t || '', fin = /finale/i.test(t);
    return '<div class="ann' + (fin ? ' fin' : '') + '" style="--dur:' + Math.max(800, d.dur) + 'ms;--el:' + Math.max(0, d.dur - d.ms) + 'ms"><div class="ann-t">' + esc(t) + '</div><div class="ann-s">' + esc(ANN_SUB[t] || d.it.sub || '') + '</div></div>';
  }
  function rankStat(d, me) {""")
s = rep(s, """        h = '<div class="intro-card"><div class="big">' + esc(d.it.t) + '</div><div class="sub">' + esc(d.it.sub) + '</div></div>' + lineup(d);""", "        h = annHtml(d);")
s = rep(s, """        h = center('<div class="p-title" style="font-size:3rem;color:var(--gold)">' + esc(d.it.t) + '</div><div class="p-sub">' + esc(d.it.sub) + '</div><div style="width:130px" class="bob">' + avSvg(me.a, 'happy') + '</div>');""", "        h = annHtml(d);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('najava OK')

# ---- glasanje za kategoriju ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/vote.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  function rankStat(d, me) {", """  function voterFaces(list, maxN) {
    const show = list.length > maxN ? list.slice(0, maxN - 1) : list;
    return show.map((p) => '<span class="vface" title="' + esc(p.n) + '">' + avSvg(p.a, 'idle') + '</span>').join('') + (list.length > show.length ? '<span class="vface more">+' + (list.length - show.length) + '</span>' : '');
  }
  function rankStat(d, me) {""")
s = rep(s, """          const voters = d.P.filter((p) => p.vt === i).map((p) => '<span class="voter"><span style="width:100%">' + avSvg(p.a, 'happy') + '</span><span class="vnm">' + esc(p.n) + '</span></span>').join('');""",
           """          const voters = voterFaces(d.P.filter((p) => p.vt === i), 5);""")
s = rep(s, """          const faces = who.map((p) => '<span title="' + esc(p.n) + '">' + avSvg(p.a, 'happy') + '</span>').join('');""",
           """          const faces = voterFaces(who, 4);""")
s = rep(s, """            (who.length ? '<span class="dcount">' + who.length + (who.length === 1 ? ' glas' : who.length < 5 ? ' glasa' : ' glasova') + '</span>' : '') +\n""", "")
s = rep(s, """        h = head + (res ? '' : timerHtml()) +
          '<div class="p-title">' + (res ? 'Kategorija: <span style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</span>' : 'Glasaj za kategoriju') + '</div>' +""",
           """        h = head + '<div class="vote-head"><div class="p-title">' + (res ? 'Kategorija: <span style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</span>' : 'Odaberi kategoriju') + '</div>' +
          (res ? '' : '<div class="p-sub">' + (mine !== -1 ? 'Glas zaprimljen ✔' : 'Glasaj za pitanje koje želiš.') + '</div>') + '</div>' + (res ? '' : timerHtml()) +""")
s = rep(s, """          (!res && mine !== -1 ? '<div class="waiting">Glas zaprimljen ✔ Gledaj kako glasaju ostali</div>' : '');""", "          '';")
s = rep(s, "(d.ph === 'vote' || d.ph === 'power' || d.ph === 'question' || d.ph === 'fq')) h += barRow(d);", "(d.ph === 'power' || d.ph === 'question' || d.ph === 'fq')) h += barRow(d);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('glasanje OK')

# ---- odabir moći i mete ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/power.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const pwDesc = (k, d) => (d && d.fin && k === 'dupli' ? 'Točan odgovor u finalu vrijedi stepenicu više.' : POWERS[k].d);",
           """  const PW_SHORT = { led: 'Zamrzni protivnikove odgovore.', sluz: 'Prekrij protivniku ekran sluzi.', grick: 'Bube pojedu slova u odgovorima.', bomba: 'Bombe lete preko protivnikovih odgovora.', dupli: 'Udvostruči bodove za ovo pitanje.', pola: 'Ukloni dva netočna odgovora.', stit: 'Odbij sve napade u ovom pitanju.' };
  const pwDesc = (k, d) => (d && d.fin && k === 'dupli' ? 'Točan odgovor: stepenica više.' : PW_SHORT[k] || POWERS[k].d);""")
s = cut(s, '  function powerPhone(d, me) {', '  function questionPhone(d, me) {', r"""  function powerPhone(d, me) {
    const offers = me.of || [];
    const card = (k, cls, tag) => '<' + tag + ' class="pw-card ' + (POWERS[k].atk ? 'atk' : 'buff') + (cls || '') + '"' + (tag === 'button' ? ' data-p="' + k + '"' : '') + '><span class="pw-ico">' + ICON[k] + '</span><span><b>' + POWERS[k].n + '</b><span>' + pwDesc(k, d) + '</span></span></' + tag + '>';
    const headH = (t, sub) => '<div class="pw-head"><div class="p-title">' + t + '</div><div class="p-sub">' + sub + '</div></div>';
    if (L.sent || me.ok) {
      const k = L.sent && L.sent.p;
      const note = !k ? 'Bez moći u ovom pitanju · čekamo ostale…'
        : L.sent.t ? '<b>' + POWERS[k].n + '</b> → ' + esc(nameOf(d, L.sent.t)) + ' · čekamo ostale…'
        : '<b>' + (k === 'stit' ? 'Štit aktivan' : POWERS[k].n + ' aktivirani') + '</b> · čekamo ostale…';
      return headH('Odaberi moć', 'Moć je odabrana.') + '<div class="pw-cards">' + offers.map((o) => card(o, o === k ? ' sel' : ' dim', 'div')).join('') + '</div><div class="pw-note">' + note + '</div>';
    }
    if (L.pw) {
      const others = d.P.filter((p) => p.id !== PID && p.c);
      return headH('Odaberi metu', 'Na koga bacaš ovu moć?') + '<div class="pw-step">' + card(L.pw, ' sel', 'div') + '</div>' +
        '<div class="targets pw-step">' + others.map((p) => '<button class="target" data-t="' + esc(p.id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span class="nm">' + esc(p.n) + '</span><span class="sc">' + p.sc + '</span></button>').join('') + '</div>' +
        '<button class="btn ghost" id="pwback">Natrag</button>';
    }
    return headH('Odaberi moć', 'Odaberi jednu od tri ponuđene moći.') + '<div class="pw-cards">' + offers.map((k) => card(k, '', 'button')).join('') + '</div><button class="btn ghost" id="nopw">Preskoči</button>';
  }

""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('moći OK')

# ---- otkrivanje odgovora: odgovor -> bodovi -> poredak ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/reveal.css', encoding='utf-8').read() + s[i:]
s = cut(s, '  function revealPhone(d, me) {', '  function progress(n, done) {', r"""  function revOpts(d, mine, tv) {
    return '<div class="rv-opts' + (tv ? ' opts' : '') + '">' + d.q.o.map((o, i) => {
      const c = i === d.cor ? ' rv-ok' + (mine === i ? ' mine' : '') : mine === i ? ' rv-bad' : ' rv-dim';
      return '<div class="' + (tv ? 'opt' : 'p-opt') + ' o' + i + c + '"><span class="shape">' + SHAPES[i] + '</span><span class="' + (tv ? 'txt' : 'otxt') + '">' + esc(o) + '</span>' + (tv && d.cnt ? '<span class="cnt">' + d.cnt[i] + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function revBoard(d, el) {
    const r = d.P.slice().sort((a, b) => b.sc - a.sc), before = d.P.slice().sort((a, b) => (b.sc - (b.g || 0)) - (a.sc - (a.g || 0)));
    const newLead = r.length > 1 && before[0] && r[0].id !== before[0].id && r[0].g > 0 ? r[0] : null;
    const delay = el > 2400 ? -1 : Math.max(0, 1950 - el);
    return { html: miniBoard(d, true).replace('<div class="mboard', '<div data-delay="' + delay + '" class="mboard'), lead: newLead };
  }
  function revealPhone(d, me) {
    const el = Math.max(0, d.dur - d.ms), ok = me.ch === d.cor, none = me.ch < 0;
    const pts = '<div class="rv-pts' + (me.g ? '' : ' zero') + '">+' + (me.g || 0) + ' <small>bodova</small>' + (me.d && me.g ? '<span class="x2">×2</span>' : '') + '</div>';
    const b = revBoard(d, el);
    const sum = none ? 'Vrijeme je isteklo · <b>+0</b>' : ok ? 'Točno! <b>+' + me.g + '</b>' + (me.d ? ' (×2)' : '') : 'Netočno · <b>+0</b>';
    return '<div class="rv" style="--el:' + el + 'ms">' +
      '<div class="rv-a"><div class="p-q">' + esc(d.q.t) + '</div>' + (none ? '<div class="rv-sum">Vrijeme je isteklo</div>' : '') + revOpts(d, me.ch, false) + pts + '</div>' +
      '<div class="rv-b"><div class="rv-sum">' + sum + '</div>' + b.html + (b.lead ? '<div class="rv-lead">Novo vodstvo: ' + esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '') + '</div></div>';
  }

""")
s = rep(s, """        h = tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + (rev ? '' : timerHtml()) +
          '<div class="tv-mid"><div class="q-text">' + esc(d.q.t) + '</div><div class="opts">' + opts + '</div>' + evHtml(d) + '</div>' +
          lineup(d, rev ? { gain: true, mood: (p) => (p.ch === d.cor ? 'happy' : 'sad') } : { check: true, fx: true });""",
"""        if (rev) {
          const el = Math.max(0, d.dur - d.ms), b = revBoard(d, el);
          h = tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + '<div class="tv-mid"><div class="rv" style="--el:' + el + 'ms">' +
            '<div class="rv-a"><div class="q-text">' + esc(d.q.t) + '</div>' + revOpts(d, -1, true) + '</div>' +
            '<div class="rv-b"><div class="rv-title">Poredak</div>' + b.html + (b.lead ? '<div class="rv-lead">Novo vodstvo: ' + esc(b.lead.n) + '!</div>' : '') + '</div></div></div>';
          h += '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>';
          break;
        }
        h = tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + timerHtml() +
          '<div class="tv-mid"><div class="q-text">' + esc(d.q.t) + '</div><div class="opts">' + opts + '</div>' + evHtml(d) + '</div>' +
          lineup(d, { check: true, fx: true });""")
# FLIP: odgoda iz data-delay (-1 = bez animacije)
s = rep(s, """      const h = rows[0].getBoundingClientRect().height;""", """      const h = rows[0].getBoundingClientRect().height, dl = b.dataset.delay !== undefined ? +b.dataset.delay : 350;
      if (dl < 0) return;""")
s = rep(s, "{ duration: 650, delay: 350, easing:", "{ duration: 600, delay: dl, easing:")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('otkrivanje OK')

# ---- veliko finale: faze, ulaz, penjanje nakon reveala ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/finale.css', encoding='utf-8').read() + s[i:]
s = cut(s, '  function pyramidHtml(d, rev) {', '\n  function tvLobby', r"""  function pyramidHtml(d, rev, o) {
    o = o || {};
    const el = Math.max(0, d.dur - d.ms), enter = d.ph === 'fstart' && el < 1500, base = o.delay || 0;
    let rows = '', k = 0, mvIdx = 0;
    for (let s = d.steps; s >= 0; s--) {
      const w = s === 0 ? 100 : 100 - (s - 1) * (59 / Math.max(1, d.steps - 1));
      const here = d.P.filter((p) => (p.st || 0) === s).map((p) => {
        const go = rev && p.mv, cd = go ? base + (mvIdx++) * 90 : enter ? 150 + (k++) * 90 : 0;
        return '<span class="climber' + (go ? ' go' : '') + (enter ? ' enter' : '') + (p.id === PID ? ' me' : '') + '" style="' + (go ? '--mv:' + p.mv + ';' : '') + '--cd:' + cd + 'ms;--el:' + (go ? el : 0) + 'ms">' +
          (go ? '<span class="up">+' + p.mv + '</span>' : '') + (o.you && p.id === PID && !go ? '<span class="tag-you">Ti</span>' : '') +
          avSvg(p.a, rev ? (p.mv ? 'happy' : 'sad') : '') + '<span class="cn">' + esc(p.n) + '</span></span>';
      }).join('');
      rows += '<div class="pstep' + (s === 0 ? ' base' : '') + (s === d.steps ? ' top' : '') + '" style="width:' + w.toFixed(1) + '%"><span class="lv">' + s + '</span><span class="here">' + here + '</span></div>';
    }
    return '<div class="pyramid">' + rows + '</div>';
  }
""")
# TV: penjanje kreće nakon kratkog prikaza točnog odgovora
s = rep(s, """          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="q-text">' + esc(d.q.t) + '</div><div class="tf-row">' + tf + '</div>' + (rev ? '' : evHtml(d)) + '</div>' +
          pyramidHtml(d, rev) + '</div>';""", """          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="q-text">' + esc(d.q.t) + '</div><div class="tf-row">' + tf + '</div>' + (rev ? '' : evHtml(d)) + '</div>' +
          pyramidHtml(d, rev, { delay: 1000 }) + '</div>';""")
# mobitel: pitanje s kompaktnom piramidom gore
s = rep(s, """    return timerHtml(3000) + '<div class="p-top"><span class="pill">Finale · stepenica ' + (me.st || 0) + '/' + d.steps + '</span><span id="tnum"></span></div>' +
      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div>'""", """    return timerHtml(3000) + (d.ntv ? '<div class="phone-pyr compact">' + pyramidHtml(d, false, { you: true }) + '</div>' : '') +
      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div>'""")
s = rep(s, """      (answered ? '<div class="waiting">Zaprimljeno ✔</div>' : '') + (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, false) + '</div>' : '');""",
           """      (answered ? '<div class="waiting">Zaprimljeno ✔</div>' : '');""")
# mobitel: reveal tvrdnje -> veća piramida s penjanjem
s = rep(s, """        h = center(head + '<div class="result ' + (ok ? 'ok' : me.ch >= 0 ? 'bad' : 'none') + '"><div class="p-title">' + (ok ? (me.mv === 2 ? 'Najbrži! +2 stepenice' : 'Točno! +1 stepenica') : me.ch >= 0 ? 'Netočno, ostaješ' : 'Prespor!') + '</div>' +
          '<div class="p-sub">Bilo je: <b>' + esc(d.q.o[d.cor]) + '</b></div></div>' + (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, true) + '</div>' : stepMeter(d, me)));""",
"""        const el = Math.max(0, d.dur - d.ms), mine = me.ch;
        const tf = '<div class="rv-opts two">' + d.q.o.map((o, i) => '<div class="p-opt o' + (i === 0 ? 3 : 0) + (i === d.cor ? ' rv-ok' + (mine === i ? ' mine' : '') : mine === i ? ' rv-bad' : ' rv-dim') + '"><span class="otxt">' + esc(o) + '</span></div>').join('') + '</div>';
        const note = ok ? (me.mv > 1 ? 'Točno! +' + me.mv + ' stepenice' : 'Točno! +1 stepenica') : mine >= 0 ? 'Netočno · ostaješ na mjestu' : 'Vrijeme je isteklo';
        h = head + '<div class="rv" style="--el:' + el + 'ms"><div class="rv-a"><div class="p-q">' + esc(d.q.t) + '</div>' + tf + '<div class="fin-note' + (ok ? '' : ' zero') + '">' + note + '</div></div>' +
          '<div class="rv-b"><div class="fin-note' + (ok ? '' : ' zero') + '">' + note + '</div>' + (d.ntv ? '<div class="phone-pyr big">' + pyramidHtml(d, true, { delay: 2000, you: true }) + '</div>' : stepMeter(d, me)) + '</div></div>';""")
# početne pozicije: veća piramida s oznakom "Ti"
s = rep(s, """          (d.ntv ? '<div class="phone-pyr">' + pyramidHtml(d, false) + '</div>' : ''));""", """          (d.ntv ? '<div class="phone-pyr big">' + pyramidHtml(d, false, { you: true }) + '</div>' : ''));""")
# HUD u finalu: korak umjesto bodova
s = rep(s, "'</span><span>Ti</span></span><span>' + esc(hudRound(d.rl)) + '</span><span>' + me.sc + ' b</span></div>' : '';",
           "'</span><span>Ti</span></span><span>' + esc(hudRound(d.rl)) + '</span><span>' + (d.fin ? 'Korak ' + (me.st || 0) + '/' + d.steps : me.sc + ' b') + '</span></div>' : '';")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('finale OK')

# ---- proglašenje pobjednika ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/win.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  function rankStat(d, me) {", r"""  function winHtml(d, tv) {
    const ranked = d.P.slice().sort((a, b) => (b.st || 0) - (a.st || 0) || b.sc - a.sc);
    const w = d.P.find((p) => p.id === d.win) || ranked[0];
    const others = ranked.filter((p) => p !== w);
    const fig = (p, cls, pose, lab) => p ? '<div class="win-fig ' + cls + '" data-pose="' + pose + '"><span class="pic">' + avSvg(p.a, pose) + '</span>' + (lab ? '<span class="pl">' + lab + '</span>' : '') + '</div>' : '<div class="win-fig ' + cls + '"></div>';
    const hero = '<div class="win-hero">' + fig(others[0], 'side', 'idle', others[0] ? '2. ' + esc(others[0].n) : '') + fig(w, 'main', 'victory', '') + fig(others[1], 'side', 'idle', others[1] ? '3. ' + esc(others[1].n) : '') + '</div>';
    const me = d.P.find((p) => p.id === PID);
    const sub = !tv && me ? (w.id === PID ? 'Pobijedio si! Vladar Trivia Taverna!' : esc(w.n) + ' je pobijedio!') : 'Vladar Trivia Taverna!';
    const board = '<div class="mboard wide">' + ranked.map((p, i) => '<div class="rank-row' + (p.id === PID ? ' me' : '') + '"><span class="pos">' + (i + 1) + '.</span><span class="mini">' + avSvg(p.a) + '</span><span class="nm">' + esc(p.n) + (!tv && p.id === PID ? '<span class="you">Ti</span>' : '') + '</span><span class="sc">' + (p.st || 0) + '/' + d.steps + '</span></div>').join('') + '</div>';
    const fact = d.fact && (tv || (me && w.id === PID)) ? '<div class="win-fact"><b>Nagrada za pobjednika:</b> ' + esc(d.fact) + '</div>' : '';
    const act = tv ? '<div class="win-act"><button class="btn win-cta" id="again">Igraj ponovno</button><button class="btn ghost" id="quit">Početni ekran</button></div>'
      : '<div class="win-act">' + (isLocalHost() ? '<button class="btn win-cta" id="dagain">Igraj ponovno</button>' : '<div class="win-wait">Domaćin može pokrenuti novu igru.</div>') + '<button class="btn ghost" id="leave">Početni ekran</button></div>';
    const name = '<div class="win-name">' + esc(w.n) + '</div><div class="win-sub">' + sub + '</div>';
    if (tv) return '<div class="winscr"><div class="win-t">Pobjednik!</div><div class="win-left">' + hero + name + '</div><div class="win-right">' + board + fact + '</div>' + act + '</div>';
    return '<div class="winscr"><div class="win-t">Pobjednik!</div>' + hero + name + board + fact + act + '</div>';
  }
  function rankStat(d, me) {""")
s = cut(s, "      case 'final': {\n        const w = d.P.find", "    $app.innerHTML = demoBar + h;\n    if (d.ph === 'cast')", "      case 'final':\n        h = winHtml(d, true);\n        break;\n    }\n")
s = cut(s, "      case 'final': {\n        const won = d.win === PID;", "    if (freshP && me) { phoneStep", "      case 'final':\n        h = winHtml(d, false);\n        break;\n    }\n")
# konfeti: kratki topli prasak za sve (i kad pobijedi bot), pobjednička fanfara
s = rep(s, "      case 'final': if (d.win === PID) { SFX.play('fanfare'); confetti(200); } else SFX.play('step'); return;",
           "      case 'final': SFX.play('fanfare'); setTimeout(() => confetti(110), 350); return;")
s = rep(s, "    const cols = ['#ffcf4a', '#ff3d81', '#5ee7ff', '#5dffa8', '#ffffff', '#a98bff'];", "    const cols = ['#f2c35b', '#e2ac54', '#c9783a', '#fbefd6', '#8fae5a', '#b5543c'];")
s = rep(s, "      g.globalAlpha = Math.max(0, 1 - e / 3800);", "      g.globalAlpha = Math.max(0, 1 - Math.max(0, e - 1500) / 1300);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('pobjednik OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      case 'final': SFX.play('fanfare'); return confetti(240);", "      case 'final': SFX.play('fanfare'); setTimeout(() => confetti(150), 350); return;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)

# ---- kladionica ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/bet.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  function rankStat(d, me) {", r"""  function betPhone(d, me) {
    const cat = d.cats && d.cw >= 0 ? esc(d.cats[d.cw]) : '';
    const top = '<div class="bet"><div class="bet-t">Kladionica</div><div class="bet-sub">' + (cat ? 'Kategorija: <b>' + cat + '</b> · ' : '') + 'Uloži na sebe!</div>' + timerHtml();
    if (L.sent || me.ok) {
      const b = me.bt !== undefined ? me.bt : L.sent && L.sent.b === -1 ? me.sc : Math.min(L.sent ? L.sent.b : 0, me.sc);
      return top + '<div class="bet-done">' + (b > 0 ? 'Uložio si <b>' + b + '</b> bodova' : 'Bez uloga ovaj put') + '</div><div class="bet-rule">Čekamo ostale…</div></div>';
    }
    const opt = (v, lab, cls) => { const dis = v > 0 && v > me.sc || (v === -1 && me.sc <= 0); return '<button class="btn ghost' + (cls ? ' ' + cls : '') + '" data-bet="' + v + '"' + (dis ? ' disabled' : '') + '>' + lab + '</button>'; };
    return top + '<div class="bet-have">Imaš <b>' + me.sc + '</b> bodova</div><div class="bet-opts">' + opt(100, '100') + opt(300, '300') + opt(500, '500') + opt(-1, 'Sve<small>' + me.sc + '</small>', 'all') + opt(0, 'Bez uloga', 'none') + '</div>' +
      '<div class="bet-rule">Točan odgovor: <b>dobivaš ulog</b>. Netočan ili bez odgovora: gubiš ulog.' + (me.bm > 1 ? '<br>Zadnji si: dobitak vrijedi <b>×1.5</b>!' : '') + '</div></div>';
  }
  function rankStat(d, me) {""")
s = rep(s, "      case 'power': h = head + timerHtml() + powerPhone(d, me); break;", "      case 'bet': h = head + betPhone(d, me); break;\n      case 'power': h = head + timerHtml() + powerPhone(d, me); break;")
s = rep(s, "    $app.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => sendInput({ p: L.pw, t: b.dataset.t }); });",
           "    $app.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => sendInput({ p: L.pw, t: b.dataset.t }); });\n    $app.querySelectorAll('[data-bet]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ b: +b.dataset.bet }); }; });")
# TV
s = rep(s, "      case 'cast':\n        h = tvTop(d, 'Bacanje moći!')", """      case 'bet':
        h = tvTop(d, 'Kladionica je otvorena!') + timerHtml() + '<div class="tv-mid bet-mid"><div class="bet-t">Kladionica</div><div class="bet-sub">' + (d.cats && d.cw >= 0 ? 'Kategorija: <b>' + esc(d.cats[d.cw]) + '</b> · ' : '') + 'ulažite na sebe na mobitelima</div></div>' + lineup(d, { check: true });
        break;
      case 'cast':
        h = tvTop(d, 'Bacanje moći!')""")
# zvuk
s = rep(s, "      case 'power': return SFX.play('zap');", "      case 'power': return SFX.play('zap');\n      case 'bet': return SFX.play('whoosh');")
s = rep(s, "      case 'intro': return SFX.play('whoosh');\n      case 'question': case 'fq':", "      case 'intro': return SFX.play('whoosh');\n      case 'bet': return SFX.play('pop');\n      case 'question': case 'fq':")
# ulog vidljiv u pitanju
s = rep(s, """(hide.length ? '<span class="tag">✂️ Pola-pola</span>' : '');""", """(hide.length ? '<span class="tag">✂️ Pola-pola</span>' : '') + (me.bt ? '<span class="tag betag">Ulog ' + me.bt + '</span>' : '');""")
# otkrivanje: linija s ulogom
s = rep(s, """'<div class="rv-a"><div class="p-q">' + esc(d.q.t) + '</div>' + (none ? '<div class="rv-sum">Vrijeme je isteklo</div>' : '') + revOpts(d, me.ch, false) + pts + '</div>' +""",
           """'<div class="rv-a"><div class="p-q">' + esc(d.q.t) + '</div>' + (none ? '<div class="rv-sum">Vrijeme je isteklo</div>' : '') + revOpts(d, me.ch, false) + pts + (me.br ? '<div class="rv-bet' + (me.br < 0 ? ' neg' : '') + '">Ulog: ' + (me.br > 0 ? '+' : '−') + Math.abs(me.br) + '</div>' : '') + '</div>' +""")
s = rep(s, """    const sum = none ? 'Vrijeme je isteklo · <b>+0</b>' : ok ? 'Točno! <b>+' + me.g + '</b>' + (me.d ? ' (×2)' : '') : 'Netočno · <b>+0</b>';""",
           """    const sum = (none ? 'Vrijeme je isteklo · <b>+0</b>' : ok ? 'Točno! <b>+' + me.g + '</b>' + (me.d ? ' (×2)' : '') : 'Netočno · <b>+0</b>') + (me.br ? ' · ulog <b>' + (me.br > 0 ? '+' : '−') + Math.abs(me.br) + '</b>' : '');""")
# poredak: prethodni poredak bez uloga, oznaka uloga uz ime
s = rep(s, "d.P.slice().sort((a, b) => (b.sc - (b.g || 0)) - (a.sc - (a.g || 0))).map((p) => p.id) : [];", "d.P.slice().sort((a, b) => (b.sc - (b.g || 0) - (b.br || 0)) - (a.sc - (a.g || 0) - (a.br || 0))).map((p) => p.id) : [];")
s = rep(s, "esc(p.n) + (p.id === PID ? '<span class=\"you\">Ti</span>' : '') + '</span>' +\n      (gain ?", "esc(p.n) + (p.id === PID ? '<span class=\"you\">Ti</span>' : '') + (gain && p.br ? '<span class=\"betb' + (p.br < 0 ? ' neg' : '') + '\">ulog ' + (p.br > 0 ? '+' : '−') + Math.abs(p.br) + '</span>' : '') + '</span>' +\n      (gain ?")
s = rep(s, "before = d.P.slice().sort((a, b) => (b.sc - (b.g || 0)) - (a.sc - (a.g || 0)));", "before = d.P.slice().sort((a, b) => (b.sc - (b.g || 0) - (b.br || 0)) - (a.sc - (a.g || 0) - (a.br || 0)));")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('kladionica OK')

# ---- polish A: prijelazi scena + motion ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/motion.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  // ---------- TV ----------\n", r"""  // ---------- prijelazi scena ----------
  // Jedan sustav za sve faze: kad se faza promijeni, stari sadržaj se premjesti u sloj koji izblijedi (150 ms),
  // a novi se iscrta odmah (nema praznog ekrana ni čekanja). --pel = ms od početka faze, za jednokratne animacije.
  const SCENE = (() => {
    let ph0 = null, t0 = 0, tIn = -1e9, cls0 = '';
    function swap(html, fresh, ph) {
      const now = performance.now();
      const changed = fresh && ph0 !== null && ph !== ph0 && !!$app.firstElementChild;
      if (fresh) t0 = now;
      if (changed) {
        const r = $app.getBoundingClientRect();
        const g = document.createElement('div');
        g.className = cls0.replace(/\b(fresh|scene-in)\b/g, '') + ' scene-ghost';
        g.setAttribute('aria-hidden', 'true');
        g.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;box-sizing:border-box;z-index:5;pointer-events:none;overflow:hidden';
        while ($app.firstChild) g.appendChild($app.firstChild);
        g.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
        // traka na vrhu (HUD, demo) ostaje mirna: ne blijedi ako postoji i u novoj sceni
        ['demo-bar', 'p-top'].forEach((c) => { if (html.indexOf('class="' + c) >= 0) g.querySelectorAll(':scope > .' + c).forEach((e) => { e.style.visibility = 'hidden'; }); });
        document.body.appendChild(g);
        setTimeout(() => g.remove(), 260);
        tIn = now;
      }
      $app.innerHTML = html;
      $app.style.setProperty('--pel', Math.round(now - t0) + 'ms');
      if (now - tIn < 300) $app.classList.add('scene-in');
      ph0 = ph; cls0 = $app.className;
    }
    function reset() { ph0 = null; }
    return { swap, reset };
  })();

  // ---------- TV ----------
""")
s = rep(s, "    $app.innerHTML = demoBar + h;\n    if (d.ph === 'cast') CAST.start(", "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);\n    if (d.ph === 'cast') CAST.start(")
s = rep(s, "    $app.innerHTML = demoBar + h;\n    if (freshP) $app.classList.add('fresh');", "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);\n    if (freshP) $app.classList.add('fresh');")
s = rep(s, "      if (mode === 'home') { tvStep = -1; phoneStep = -1; return homeV(); }", "      if (mode === 'home') { tvStep = -1; phoneStep = -1; SCENE.reset(); return homeV(); }")
# timer: hitni prikaz tek zadnje 3 sekunde
s = rep(s, "data-u=\"' + (urgentAt || 5000) + '\"", "data-u=\"' + (urgentAt || 3000) + '\"")
s = rep(s, "wrap.classList.toggle('urgent', ms <= +(wrap.dataset.u || 5000));", "wrap.classList.toggle('urgent', ms <= +(wrap.dataset.u || 3000));")
s = rep(s, "if (ring) ring.classList.toggle('urgent', ms <= 5000);", "if (ring) ring.classList.toggle('urgent', ms <= 3000);")
s = s.replace('timerHtml(8000)', 'timerHtml()')
s = rep(s, "    S = d;\n    if (phoneShown()) {", "    S = d; document.documentElement.dataset.ph = d.ph;\n    if (phoneShown()) {")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('polish A OK')

# ---- polish B: dizajn tokeni ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/tokens.css', encoding='utf-8').read() + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('polish B OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = s.replace("stroke=\"#ff3d81\"", "stroke=\"#c0533c\"")
s = rep(s, "const COL = { led: '#9fe7ff', sluz: '#8be04a', grick: '#e0a86a', bomba: '#ffb347', dupli: '#ffd23c', pola: '#5ee7ff', stit: '#7cf0c8' };", "const COL = { led: '#bcdbe6', sluz: '#a8c46a', grick: '#e0b07a', bomba: '#e8a55a', dupli: '#f0c66a', pola: '#f1dcb0', stit: '#9cc7a4' };")
s = rep(s, "burst(core.x, core.y - 30 * S(), 18, { color: '#5ee7ff'", "burst(core.x, core.y - 30 * S(), 18, { color: '#f1dcb0'")
s = rep(s, '<stop offset=".5" stop-color="#5ee7ff"/>', '<stop offset=".5" stop-color="#e2c891"/>')
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)

# ---- polish C: AUDIO manager (pravi audio -> sintetizirani fallback) + HAPTIC ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
# nove sintetizirane boje zvuka: tihi drveni klik, potvrda, bodovi, kratki "stingovi" za trenutke u krčmi
s = rep(s, "      tap: () => tone(700, 0, 0.06, 'triangle', 0.12),", """      tap: () => { noise(0, 0.035, 0.05, 1400, 'bandpass'); tone(330, 0, 0.05, 'triangle', 0.045, 220); },
      confirm: () => { noise(0, 0.05, 0.08, 900, 'bandpass'); tone(523, 0, 0.09, 'triangle', 0.11); tone(784, 0.05, 0.12, 'triangle', 0.08); },
      score: () => { tone(880, 0, 0.08, 'triangle', 0.08); tone(1175, 0.06, 0.12, 'triangle', 0.07); },
      stingUp: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.12)),
      stingRise: () => { tone(262, 0, 0.5, 'triangle', 0.1, 523); [523, 659, 784].forEach((f, i) => tone(f, 0.32 + i * 0.07, 0.25, 'triangle', 0.12)); },
      stingTension: () => { tone(147, 0, 0.45, 'sawtooth', 0.05); tone(156, 0, 0.45, 'sawtooth', 0.04); tone(220, 0.22, 0.4, 'triangle', 0.08, 208); },
      stingDuel: () => { noise(0, 0.12, 0.12, 2200); tone(330, 0.02, 0.16, 'square', 0.06); tone(494, 0.18, 0.28, 'square', 0.06); },
      stingSmall: () => { tone(659, 0, 0.12, 'triangle', 0.08); tone(988, 0.08, 0.16, 'triangle', 0.07); },""")
s = rep(s, """    return {
      play(n, a) { try { if (P[n]) P[n](a); } catch (e) {} },
      ctx() { return ac(); },""", """    // Zvučni assetovi: kad postoji datoteka u audio/<ime>.mp3, upiši ime u AUDIO_FILES i igra je koristi umjesto sintetiziranog zvuka.
    // Dok datoteka ne postoji (ili se ne uspije učitati), svira postojeći sintetizirani zvuk.
    const AUDIO_FILES = [];
    const ALIAS = { powerIce: 'freeze', powerSlime: 'splat', powerBug: 'squish', powerBomb: 'boom', powerZap: 'zap', victory: 'fanfare',
      stingLeader: 'stingUp', stingComeback: 'stingRise', stingRival: 'stingTension', stingStreak: 'stingSmall' };
    const VOL = { tap: 0.35, tick: 0.5, confirm: 0.7, score: 0.7, correct: 0.85, wrong: 0.7, step: 0.8, victory: 1, fanfare: 1 };
    const bufs = {}, loading = {};
    function load(n) {
      if (loading[n] || AUDIO_FILES.indexOf(n) < 0) return;
      loading[n] = 1;
      const c = ac(); if (!c || !window.fetch) return;
      fetch('audio/' + n + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
        .then((b) => { bufs[n] = b; }).catch(() => { bufs[n] = null; });
    }
    function playBuf(n) {
      const c = ac(), b = bufs[n]; if (!c || !b || muted) return false;
      const src = c.createBufferSource(), g = c.createGain(); src.buffer = b; g.gain.value = VOL[n] != null ? VOL[n] : 0.8;
      src.connect(g); g.connect(c.destination); src.start(); return true;
    }
    return {
      play(n, a) {
        try {
          if (muted) return;
          if (bufs[n] && playBuf(n)) return;
          load(n);
          const k = P[n] ? n : ALIAS[n];
          if (k && P[k]) P[k](a);
        } catch (e) {}
      },
      preload() { AUDIO_FILES.forEach(load); },
      ctx() { return ac(); },""")
s = rep(s, "  // ---------- glazba u pozadini", """  const AUDIO = SFX;
  // ---------- vibracija: jedno mjesto za sve obrasce; tiho ne radi ništa gdje vibracija nije podržana ----------
  const HAPTIC = (() => {
    function v(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
    return {
      tap: () => v(12), confirm: () => v(20), error: () => v([25, 60, 25]), impact: () => v(50),
      bomb: () => v([80, 40, 120]), step: () => v(15), victory: () => v([30, 70, 30, 70, 110]),
    };
  })();
  // ---------- glazba u pozadini""")
s = rep(s, "    if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }", "    HAPTIC.impact();")
s = rep(s, "SFX.play('boom'); if (navigator.vibrate) { try { navigator.vibrate([80, 40, 120]); } catch (er) {} }", "AUDIO.play('powerBomb'); HAPTIC.bomb();")
s = rep(s, "        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (er) {} }", "        HAPTIC.tap();")
s = rep(s, "          if (navigator.vibrate) { try { navigator.vibrate(20); } catch (er) {} }", "          HAPTIC.confirm();")
s = rep(s, "          f.boom = true; stopFxTimer(); SFX.play('boom');\n          if (navigator.vibrate) { try { navigator.vibrate([80, 40, 120]); } catch (er) {} }", "          f.boom = true; stopFxTimer(); AUDIO.play('powerBomb');\n          HAPTIC.bomb();")
s = rep(s, "        if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) {} }", "        HAPTIC.confirm();")
assert 'navigator.vibrate(' not in s.replace("if (navigator.vibrate) navigator.vibrate(p)", "")
# zaključavanje odgovora / glasa / uloga: malo jači "confirm"
s = rep(s, "  function sendInput(inp) {\n    inp.s = L.s;", "  function sendInput(inp) {\n    AUDIO.play('confirm');\n    inp.s = L.s;")
# semantička imena + vibracija na ključnim trenucima na mobitelu
s = rep(s, "  const FX_SOUND = { led: 'freeze', sluz: 'splat', grick: 'squish', bomba: 'zap' };", "  const FX_SOUND = { led: 'powerIce', sluz: 'powerSlime', grick: 'powerBug', bomba: 'powerZap' };")
s = rep(s, "      case 'question': case 'fq': if (L.fx) SFX.play(FX_SOUND[L.fx.k] || 'zap'); else if (L.bombs && L.bombs.length) SFX.play('zap'); else if (L.eat) SFX.play('squish'); return;\n      case 'reveal': if (me.ch === d.cor) SFX.play('correct'); else SFX.play('wrong'); return;\n      case 'sortReveal': case 'linkReveal': return SFX.play(me.k ? 'correct' : 'wrong');\n      case 'fr': return SFX.play(me.mv ? 'step' : 'wrong');\n      case 'final': SFX.play('fanfare'); setTimeout(() => confetti(110), 350); return;",
"      case 'question': case 'fq': if (L.fx || (L.bombs && L.bombs.length) || L.eat) HAPTIC.impact(); if (L.fx) AUDIO.play(FX_SOUND[L.fx.k] || 'powerZap'); else if (L.bombs && L.bombs.length) AUDIO.play('powerZap'); else if (L.eat) AUDIO.play('powerBug'); return;\n      case 'reveal': if (me.ch === d.cor) { AUDIO.play('correct'); HAPTIC.confirm(); } else { AUDIO.play('wrong'); HAPTIC.error(); } return;\n      case 'sortReveal': case 'linkReveal': return AUDIO.play(me.k ? 'correct' : 'wrong');\n      case 'fr': if (me.mv) { AUDIO.play('step'); HAPTIC.step(); } else AUDIO.play('wrong'); return;\n      case 'final': AUDIO.play('victory'); if (d.win === PID) HAPTIC.victory(); setTimeout(() => confetti(110), 350); return;")
s = rep(s, "      case 'final': SFX.play('fanfare'); setTimeout(() => confetti(150), 350); return;", "      case 'final': AUDIO.play('victory'); setTimeout(() => confetti(150), 350); return;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('polish C OK')

# ---- polish D: preload asseta u 4 faze + fallback slika ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  AV.forEach((a) => { if (a.spr) SPR_POSES.forEach((p) => { const im = new Image(); im.src = 'chars/' + a.spr + '/' + p + '.webp'; }); });", r"""  // Preload u fazama: start (odmah), predvorje (likovi), početak igre (ploče, vrata, moći), finale (stepenice).
  // Sve ide tiho u pozadini; prethodna faza uvijek daje dovoljno vremena da slike budu spremne prije svoje scene.
  const PRELOAD = (() => {
    const W = (n) => 'ui/' + n + '.webp';
    const SETS = {
      start: [innerWidth > innerHeight ? 'bg-l' : 'bg-mobile', 'logo', 'btn-neutral', 'btn-green', 'btn-blue', 'round', 'panel'].map(W),
      lobby: [].concat(...AV.filter((a) => a.spr).map((a) => SPR_POSES.map((p) => 'chars/' + a.spr + '/' + p + '.webp'))).concat([W(innerWidth > innerHeight ? 'bg-mobile' : 'bg-l')]),
      game: ['q-panel', 'ans2-red', 'ans2-blue', 'ans2-gold', 'ans2-green', 'door2-red', 'door2-blue', 'door2-gold', 'door2-green', 'timer2', 'pw-card', 'btn-wood', 'btn-purple',
        'pw-led', 'pw-sluz', 'pw-grick', 'pw-bomba', 'pw-dupli', 'pw-pola', 'pw-stit'].map(W),
      finale: ['step', 'token'].map(W),
    };
    const done = {}, keep = [];
    const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 900 }) : setTimeout(fn, 120));
    function img(u) {
      return new Promise((res) => {
        const i = new Image(); keep.push(i);
        i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(res);
        i.onerror = res; i.src = u;
      });
    }
    function stage(k) {
      if (!done[k]) done[k] = new Promise((r) => { const go = () => Promise.all(SETS[k].map(img)).then(r); if (k === 'start') go(); else idle(go); });
      return done[k];
    }
    // ph = 't:lobby' / 'p:question' …; lobby i odabir lika pripremaju likove, a odmah iza toga i igru; igra priprema finale
    function on(ph) {
      const p = String(ph || '').replace(/^[tp]:/, '');
      if (!p || p === 'home') return;
      stage('lobby').then(() => stage('game')).then(() => { if (p !== 'lobby') stage('finale'); });
    }
    stage('start');
    return { stage, on };
  })();
  // slika se ne učita: poza lika pada na idle, ostalo se samo sakrije (nikad ikona slomljene slike)
  document.addEventListener('error', (e) => {
    const t = e.target; if (!t || t.tagName !== 'IMG') return;
    const m = (t.getAttribute('src') || '').match(/^chars\/([^/]+)\/(\w+)\.webp$/);
    if (m && m[2] !== 'idle') { t.src = 'chars/' + m[1] + '/idle.webp'; return; }
    t.classList.add('img-fail');
  }, true);""")
s = rep(s, "      ph0 = ph; cls0 = $app.className;\n", "      ph0 = ph; cls0 = $app.className;\n      PRELOAD.on(ph);\n")
s = rep(s, "</style>", "  img.img-fail { visibility: hidden; }\n</style>")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('polish D OK')

# ---- polish E: viewport, mikrointerakcije, bodovi, moći, performanse ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/e.css', encoding='utf-8').read() + s[i:]
# bube: kašnjenje ugriza vezano uz početak faze (ponovno iscrtavanje ne ponavlja ugrize)
s = rep(s, """'<span class="bite" style="animation-delay:' + (0.15 + (k++) * 0.06).toFixed(2) + 's">'""", """'<span class="bite" style="animation-delay:calc(' + (150 + (k++) * 60) + 'ms - var(--pel, 0ms))">'""")
# led: ulazni udar samo prvi put, nova pukotina se iscrta
s = rep(s, """        lines += '<path d="M' + x + ' ' + y + 'l' + (8 + i) + ' ' + (10 - i) + 'l-6 ' + (12 + i) + 'M' + x + ' ' + y + 'l-' + (10 + i) + ' 6" stroke="#fff" stroke-width="1.4" fill="none"/>';""",
           """        lines += '<path' + (i === fx.hits - 1 ? ' class="new"' : '') + ' d="M' + x + ' ' + y + 'l' + (8 + i) + ' ' + (10 - i) + 'l-6 ' + (12 + i) + 'M' + x + ' ' + y + 'l-' + (10 + i) + ' 6" stroke="#fff" stroke-width="1.4" fill="none"/>';""")
s = rep(s, """      return '<div class="fx fx-led" id="fx" style="opacity:'""", """      return '<div class="fx fx-led' + (fx.hits ? '' : ' in') + '" id="fx" style="opacity:'""")
# bomba: animacija čađe/praska teče od trenutka eksplozije (--bel), ne od zadnjeg iscrtavanja
s = rep(s, """  function boomCover() { return Date.now() < (L.boomUntil || 0) ? '<div class="boom-cover"><b>BUM!</b></div>' : ''; }""",
           """  function boomCover() { const left = (L.boomUntil || 0) - Date.now(); return left > 0 ? '<div class="boom-cover" style="--bel:' + Math.round(2000 - left) + 'ms"><b>BUM!</b></div>' : ''; }""")
# bombe plutaju preko transforma (GPU) umjesto left/top; pogodak i dalje prati stvarni položaj
s = rep(s, """'<button class="fly-bomb" data-bi="' + i + '" style="left:' + b.x + '%;top:' + b.y + '%" aria-label""", """'<button class="fly-bomb" data-bi="' + i + '" style="transform:translate(' + b.x + 'cqw,' + b.y + 'cqh)" aria-label""")
s = rep(s, "        el.style.left = b.x + '%'; el.style.top = b.y + '%';", "        el.style.transform = 'translate(' + b.x.toFixed(2) + 'cqw,' + b.y.toFixed(2) + 'cqh)';")
s = rep(s, "</style>", "  .bomb-layer { container-type: size; }\n</style>")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('polish E1 OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "    bindPhone(d, me);\n    tick();", r"""    bindPhone(d, me);
    if (freshP && me && d.ph === 'reveal' && me.g > 0) flyPoints(L.s, me.g);
    tick();""")
s = rep(s, "  function revealPhone(d, me) {", r"""  // nakon otkrivanja: "+N" se odvoji od broja bodova i odleti u HUD, HUD se kratko "primi"
  function flyPoints(s0, g) {
    setTimeout(() => {
      if (L.s !== s0) return;
      const from = document.querySelector('.rv .rv-pts'), to = document.querySelector('.p-top > span:last-child');
      if (!from || !to) return;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const f = document.createElement('div');
      f.className = 'pts-fly'; f.textContent = '+' + g;
      f.style.left = a.left + a.width / 2 + 'px'; f.style.top = a.top + a.height / 2 + 'px'; f.style.fontSize = getComputedStyle(from).fontSize;
      document.body.appendChild(f);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const done = () => { f.remove(); if (L.s !== s0) return; const h = document.querySelector('.p-top > span:last-child'); if (h) { h.classList.remove('hud-bump'); void h.offsetWidth; h.classList.add('hud-bump'); } AUDIO.play('score'); };
      if (!f.animate || reduceMotion) { done(); return; }
      f.animate([
        { transform: 'translate(-50%, -50%)', opacity: 0 },
        { transform: 'translate(-50%, calc(-50% - 10px))', opacity: 1, offset: 0.25 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.45)', opacity: 0.2 },
      ], { duration: 700, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' }).onfinish = done;
    }, 1500);
  }
  function revealPhone(d, me) {""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('polish E2 OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  function flyPoints(s0, g) {", "  // za automatske testove (ne utječe na igru)\n  window.__dbg = { get L() { return L; }, makeFx: (k) => makeFx(k), phoneRender: (f) => phoneRender(f) };\n  function flyPoints(s0, g) {")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)

# ---- Tavern Director: prikaz trenutaka, dvoboja i tajnih događaja ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/td.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  function betPhone(d, me) {", r"""  // ---------- Tavern Director ----------
  const pById = (d, id) => d.P.find((p) => p.id === id);
  function tmFig(d, id, pose, cls) {
    const p = pById(d, id); if (!p) return '';
    return '<div class="tm-fig' + (cls || '') + '"><div class="pic">' + avSvg(p.a, pose || 'idle') + '</div><span class="tm-nm">' + esc(p.n) + (p.id === PID ? ' (ti)' : '') + '</span></div>';
  }
  function momentHtml(d, m) {
    const ids = m.a || [], poses = m.pose || [];
    const figs = ids.length === 2 && m.vs ? tmFig(d, ids[0], poses[0]) + '<span class="tm-vs">VS</span>' + tmFig(d, ids[1], poses[1]) : ids.map((id, i) => tmFig(d, id, poses[i])).join('');
    const mem = m.t === 'Krčma pamti';
    return '<div class="tm' + (mem ? ' mem' : '') + '" style="--dur:' + Math.max(800, d.dur) + 'ms;--el:' + Math.max(0, d.dur - d.ms) + 'ms"><div class="tm-figs">' + figs + '</div><div class="tm-t">' + esc(m.t) + '</div><div class="tm-s">' + esc(m.s || '') + '</div></div>';
  }
  function duelIntroMo(d) { return { t: 'Dvoboj!', s: 'Brži točan odgovor osvaja +' + d.du.bonus, a: [d.du.a, d.du.b], pose: ['attack', 'attack'], vs: 1 }; }
  function duelVs(d, pose) {
    const du = d.du, st = (id) => (pById(d, id) || {}).ok ? ' ok' : '';
    return '<div class="du-vs">' + tmFig(d, du.a, pose ? pose(du.a) : 'idle', d.ph === 'duel' ? st(du.a) : '') + '<span class="tm-vs">VS</span>' + tmFig(d, du.b, pose ? pose(du.b) : 'idle', d.ph === 'duel' ? st(du.b) : '') + '</div>';
  }
  function duelPhone(d, me) {
    const du = d.du, mine = me && (me.id === du.a || me.id === du.b);
    if (!mine) return timerHtml() + '<div class="du-k">Dvoboj u tijeku</div>' + duelVs(d) + '<div class="p-q">' + esc(d.q.t) + '</div><div class="waiting">Gledaš dvoboj. Brži točan odgovor osvaja +' + du.bonus + '.</div>';
    const answered = L.sent || me.ok, pick = L.sent ? L.sent.c : -1;
    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + i + (answered ? (pick === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '><span class="shape">' + SHAPES[i] + '</span><span class="otxt">' + esc(o) + '</span></button>').join('');
    return timerHtml() + '<div class="du-k">Dvoboj!</div>' + duelVs(d) + '<div class="p-q">' + esc(d.q.t) + '</div><div class="q-area"><div class="p-opts">' + opts + '</div></div>' +
      '<div class="waiting">' + (answered ? 'Odgovor zaprimljen ✔' : 'Brži točan odgovor pobjeđuje!') + '</div>';
  }
  function duelResultHtml(d, tv) {
    const du = d.du, w = du.w ? pById(d, du.w) : null;
    const pose = (id) => (!du.w ? 'sad' : id === du.w ? 'happy' : 'sad');
    const me = pById(d, PID), mine = me && (me.id === du.a || me.id === du.b) ? me.ch : -1;
    const sec = (ms) => (ms >= 0 ? (ms / 1000).toFixed(1).replace('.', ',') + ' s' : '—');
    return '<div class="du-k">Dvoboj</div>' + duelVs(d, pose) +
      '<div class="du-res">' + (w ? 'Pobjeđuje <b>' + esc(w.n) + '</b> · +' + du.bonus : 'Nema pobjednika. Nitko ne gubi bodove.') + '</div>' +
      (du.ms ? '<div class="du-ms">' + esc((pById(d, du.a) || {}).n || '') + ' ' + sec(du.ms[0]) + ' · ' + esc((pById(d, du.b) || {}).n || '') + ' ' + sec(du.ms[1]) + '</div>' : '') +
      (tv ? '<div class="q-text">' + esc(d.q.t) + '</div>' : '<div class="p-q">' + esc(d.q.t) + '</div>') + revOpts(d, mine, tv);
  }
  const SE_TXT = {
    target: { k: 'Tajna meta', d: (b) => 'Odaberi igrača. Ako on sljedeće pitanje odgovori <b>netočno</b>, dobivaš <b>+' + b + '</b>.' },
    help: { k: 'Tajna pomoć', d: (b) => 'Odaberi saveznika. Ako oboje točno odgovorite na sljedeće pitanje, oboje dobivate <b>+' + b + '</b>.' },
  };
  function secretWait(d) { return '<div class="se-wait"><div class="tm-t">Netko u krčmi nešto planira…</div>' + (d ? '' : '') + '</div>'; }
  function secretPhone(d, me) {
    const se = d.se;
    if (d.ph === 'secret' && me && se.p === me.id) {
      const T = SE_TXT[se.k] || SE_TXT.target;
      if (L.sent || me.ok) return '<div class="se"><div class="se-k">' + T.k + '</div><div class="se-d">Odabrano. Pst! 🤫</div><div class="se-note">Nitko ne vidi tvoj izbor.</div></div>';
      const opts = d.P.filter((p) => p.id !== me.id && p.c).map((p) => '<button class="btn ghost" data-sx="' + esc(p.id) + '"><span class="mini">' + avSvg(p.a, 'idle') + '</span>' + esc(p.n) + '</button>').join('');
      return timerHtml() + '<div class="se"><div class="se-k">' + T.k + '</div><div class="se-d">' + T.d(se.bonus) + '</div><div class="se-list">' + opts + '</div><div class="se-note">Samo ti vidiš ovaj ekran. Nema kazne.</div></div>';
    }
    if (d.ph === 'secret2' && me && se.x === me.id) {
      const by = pById(d, se.by);
      if (L.sent || me.ok) return '<div class="se"><div class="se-k">Tajna pomoć</div><div class="se-d">Odgovor poslan. Pst! 🤫</div></div>';
      return timerHtml() + '<div class="se"><div class="se-k">Tajna pomoć</div><div class="se-d"><b>' + esc(by ? by.n : '?') + '</b> traži tvoju pomoć. Ako oboje točno odgovorite na sljedeće pitanje, oboje dobivate <b>+' + se.bonus + '</b>. Bez kazne.</div>' +
        '<div class="se-list"><button class="btn" data-sy="1">Prihvati</button><button class="btn ghost" data-sy="0">Odbij</button></div></div>';
    }
    return secretWait();
  }
  function secretRevealLine(d, me) {
    const x = d.sxr; if (!x || !me) return '';
    if (x.k === 'target' && x.p === me.id) return '<div class="rv-sx' + (x.res ? '' : ' none') + '">' + (x.res ? 'Tajna meta je pogriješila: +' + (me.xb || 0) : 'Tajna meta je odgovorila točno · bez bonusa') + '</div>';
    if (x.k === 'help' && (x.p === me.id || x.x === me.id) && x.ok) return '<div class="rv-sx' + (x.res ? '' : ' none') + '">' + (x.res ? 'Tajni savez: +' + (me.xb || 0) : 'Tajni savez · ovaj put bez bonusa') + '</div>';
    return '';
  }
  function betPhone(d, me) {""")
# mobitel: faze
s = rep(s, "      case 'bet': h = head + betPhone(d, me); break;\n", """      case 'bet': h = head + betPhone(d, me); break;
      case 'moment': h = center(head + momentHtml(d, d.mo)); break;
      case 'duelIntro': h = center(head + momentHtml(d, duelIntroMo(d))); break;
      case 'duel': h = head + duelPhone(d, me); break;
      case 'duelResult': h = head + duelResultHtml(d, false); break;
      case 'secret': case 'secret2': h = head + secretPhone(d, me); break;
""")
# TV: faze
s = rep(s, "      case 'bet':\n        h = tvTop(d, 'Kladionica je otvorena!')", """      case 'moment': h = tvTop(d, '') + momentHtml(d, d.mo); break;
      case 'duelIntro': h = tvTop(d, '') + momentHtml(d, duelIntroMo(d)); break;
      case 'duel':
        h = tvTop(d, 'Dvoboj') + timerHtml() + '<div class="tv-mid">' + duelVs(d) + '<div class="q-text">' + esc(d.q.t) + '</div><div class="opts">' +
          d.q.o.map((o, i) => '<div class="opt o' + i + '"><span class="shape">' + SHAPES[i] + '</span><span class="txt">' + esc(o) + '</span></div>').join('') + '</div></div>';
        break;
      case 'duelResult': h = tvTop(d, 'Dvoboj') + '<div class="tv-mid">' + duelResultHtml(d, true) + '</div>'; break;
      case 'secret': case 'secret2': h = tvTop(d, '') + secretWait(d); break;
      case 'bet':
        h = tvTop(d, 'Kladionica je otvorena!')""")
# unosi
s = rep(s, "    $app.querySelectorAll('[data-bet]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ b: +b.dataset.bet }); }; });",
           "    $app.querySelectorAll('[data-bet]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ b: +b.dataset.bet }); }; });\n    $app.querySelectorAll('[data-sx]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ x: b.dataset.sx }); }; });\n    $app.querySelectorAll('[data-sy]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ y: +b.dataset.sy }); }; });")
# potpis za ponovno iscrtavanje
s = rep(s, "      : (d.ph === 'vote' || d.ph === 'voteResult') ? d.P.map((p) => [p.id, p.a, p.vt]) : null;\n    return JSON.stringify([d.ph, d.s, me, d.cats, d.cw, d.q, d.so, d.li, d.cor, d.win, d.it, d.ev, roster]);",
           "      : (d.ph === 'vote' || d.ph === 'voteResult') ? d.P.map((p) => [p.id, p.a, p.vt]) : d.ph === 'duel' ? d.P.map((p) => [p.id, p.ok]) : null;\n    return JSON.stringify([d.ph, d.s, me, d.cats, d.cw, d.q, d.so, d.li, d.cor, d.win, d.it, d.ev, roster, d.mo, d.du, d.se, d.sxr]);")
# otkrivanje: tajni rezultat + poredak uključuje tajni bonus
s = rep(s, "+ (me.br ? '<div class=\"rv-bet' + (me.br < 0 ? ' neg' : '') + '\">Ulog: ' + (me.br > 0 ? '+' : '−') + Math.abs(me.br) + '</div>' : '') + '</div>' +",
           "+ (me.br ? '<div class=\"rv-bet' + (me.br < 0 ? ' neg' : '') + '\">Ulog: ' + (me.br > 0 ? '+' : '−') + Math.abs(me.br) + '</div>' : '') + secretRevealLine(d, me) + '</div>' +")
s = s.replace("(b.sc - (b.g || 0) - (b.br || 0)) - (a.sc - (a.g || 0) - (a.br || 0))", "(b.sc - (b.g || 0) - (b.br || 0) - (b.xb || 0)) - (a.sc - (a.g || 0) - (a.br || 0) - (a.xb || 0))")
# zvuk i vibracija
s = rep(s, "      case 'bet': return SFX.play('whoosh');\n", "      case 'bet': return SFX.play('whoosh');\n      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');\n      case 'duelIntro': return AUDIO.play('stingDuel');\n      case 'duelResult': return AUDIO.play(d.du && d.du.w ? 'correct' : 'wrong');\n      case 'secret': return AUDIO.play('pop');\n")
s = rep(s, "      case 'bet': return SFX.play('pop');\n", """      case 'bet': return SFX.play('pop');
      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');
      case 'duelIntro': AUDIO.play('stingDuel'); if (d.du && (d.du.a === me.id || d.du.b === me.id)) HAPTIC.impact(); return;
      case 'duelResult': if (d.du && d.du.w === me.id) { AUDIO.play('correct'); HAPTIC.confirm(); } else if (d.du && (d.du.a === me.id || d.du.b === me.id)) AUDIO.play('wrong'); return;
      case 'secret': case 'secret2': if (d.se && (d.se.p === me.id || d.se.x === me.id)) { AUDIO.play('pop'); HAPTIC.tap(); } return;
""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('TD UI OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "esc(p.n) + (p.id === PID ? ' (ti)' : '') + '</span></div>';", "esc(p.n) + '</span></div>';")
s = rep(s, "      (tv ? '<div class=\"q-text\">' + esc(d.q.t) + '</div>' : '<div class=\"p-q\">' + esc(d.q.t) + '</div>') + revOpts(d, mine, tv);", "      (tv ? '' : '<div class=\"p-q\">' + esc(d.q.t) + '</div>') + revOpts(d, mine, tv);")
s = rep(s, "      case 'moment': h = tvTop(d, '') + momentHtml(d, d.mo); break;\n      case 'duelIntro': h = tvTop(d, '') + momentHtml(d, duelIntroMo(d)); break;", "      case 'moment': h = tvTop(d, 'Krčma pamti') + momentHtml(d, d.mo); break;\n      case 'duelIntro': h = tvTop(d, 'Dvoboj') + momentHtml(d, duelIntroMo(d)); break;")
s = rep(s, "      case 'secret': case 'secret2': h = tvTop(d, '') + secretWait(d); break;", "      case 'secret': case 'secret2': h = tvTop(d, 'Pst…') + secretWait(d); break;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  function duelIntroMo(d) {", r"""  // trenutak ispod poretka (ne poseban ekran); el = ms od početka faze
  function tdLine(d) {
    const m = d.mo; if (!m) return '';
    const el = Math.max(0, d.dur - d.ms), ids = m.a || [], poses = m.pose || [];
    const figs = ids.map((id, i) => { const p = pById(d, id); return p ? '<span class="mini">' + avSvg(p.a, poses[i] || 'idle') + '</span>' : ''; }).join('');
    return '<div class="tdl' + (m.t === 'Krčma pamti' ? ' mem' : '') + '" style="--el:' + el + 'ms"><span class="figs">' + figs + '</span><span class="tx"><b>' + esc(m.t) + '</b><span>' + esc(m.s || '') + '</span></span></div>';
  }
  function tdSting(d) { if (!d.mo) return; const s0 = d.s, wait = Math.max(0, 2700 - Math.max(0, d.dur - d.ms)); setTimeout(() => { if (S && S.s === s0) AUDIO.play(d.mo.snd || 'stingSmall'); }, wait); }
  function duelIntroMo(d) {""")
# TV otkrivanje
s = rep(s, "            '<div class=\"rv-b\"><div class=\"rv-title\">Poredak</div>' + b.html + (b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.n) + '!</div>' : '') + '</div></div></div>';",
           "            '<div class=\"rv-b\"><div class=\"rv-title\">Poredak</div>' + b.html + (d.mo ? tdLine(d) : b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.n) + '!</div>' : '') + '</div></div></div>';")
# mobitel otkrivanje
s = rep(s, "      '<div class=\"rv-b\"><div class=\"rv-sum\">' + sum + '</div>' + b.html + (b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '') + '</div></div>';",
           "      '<div class=\"rv-b\"><div class=\"rv-sum\">' + sum + '</div>' + b.html + (d.mo ? tdLine(d) : b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '') + '</div></div>';")
# razvrstavanje / spajanje: mobitel i TV
s = rep(s, "          (d.ntv ? sol + miniBoard(d, true) : sol + rankStat(d, me));", "          (d.ntv ? sol + miniBoard(d, true) : sol + rankStat(d, me)) + tdLine(d);")
s = s.replace("          lineup(d, rev ? { gain: true } : { check: true });\n        if (rev) h += '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>';",
              "          lineup(d, rev ? { gain: true } : { check: true }) + (rev ? tdLine(d) : '');\n        if (rev) h += '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>';")
# finale: ispod piramide / koraka
s = rep(s, "'<div class=\"rv-b\"><div class=\"fin-note' + (ok ? '' : ' zero') + '\">' + note + '</div>' + (d.ntv ? '<div class=\"phone-pyr big\">' + pyramidHtml(d, true, { delay: 2000, you: true }) + '</div>' : stepMeter(d, me)) + '</div></div>';",
           "'<div class=\"rv-b\"><div class=\"fin-note' + (ok ? '' : ' zero') + '\">' + note + '</div>' + (d.ntv ? '<div class=\"phone-pyr big\">' + pyramidHtml(d, true, { delay: 2000, you: true }) + '</div>' : stepMeter(d, me)) + tdLine(d) + '</div></div>';")
s = rep(s, "<div class=\"tf-row\">' + tf + '</div>' + (rev ? '' : evHtml(d)) + '</div>' +", "<div class=\"tf-row\">' + tf + '</div>' + (rev ? tdLine(d) : evHtml(d)) + '</div>' +")
# zvuk trenutka kad se pojavi
s = rep(s, "  function phoneSound(d, me) {\n    if (!me) return;", "  function phoneSound(d, me) {\n    if (!me) return;\n    if (d.mo && d.ph !== 'moment') tdSting(d);")
s = rep(s, "  function tvSound(d) {\n", "  function tvSound(d) {\n    if (d.mo && d.ph !== 'moment') tdSting(d);\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('tdLine OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "setTimeout(() => { if (S && S.s === s0) AUDIO.play(d.mo.snd || 'stingSmall'); }, wait); }", "setTimeout(() => { if (s0 === d.s) AUDIO.play(d.mo.snd || 'stingSmall'); }, wait); }")
s = rep(s, "'ulažite na sebe na mobitelima</div></div>'", "'odaberite ulog na mobitelu</div><div class=\"bet-sub\">Točan odgovor na sljedeće pitanje osvaja ulog, netočan ga gubi.</div></div>'")
s = rep(s, "'<div class=\"bet\"><div class=\"bet-t\">Kladionica</div><div class=\"bet-sub\">' + (cat ? 'Kategorija: <b>' + cat + '</b> · ' : '') + 'Uloži na sebe!</div>' + timerHtml();",
           "'<div class=\"bet\"><div class=\"bet-t\">Kladionica</div><div class=\"bet-sub\">Koliko bodova ulažeš da ćeš <b>točno</b> odgovoriti na sljedeće pitanje' + (cat ? ' (' + cat + ')' : '') + '?</div>' + timerHtml();")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)

# ---- novi naslikani likovi: svih 8 likova ima 6 poza (stari SVG likovi više se ne nude) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = cut(s, "  const AV = [\n", "  ];\n", """  const AV = [
    { n: 'Vila',   spr: 'vila' },
    { n: 'Ovan',   spr: 'ovan' },
    { n: 'Zlata',  spr: 'zlata' },
    { n: 'Kovač',  spr: 'kovac' },
    { n: 'Žar',    spr: 'zar' },
    { n: 'Sova',   spr: 'sova' },
    { n: 'Sjena',  spr: 'sjena' },
    { n: 'Njuško', spr: 'njusko' },
""")
s = rep(s, "  const PICK_ORDER = [8, 9, 0, 1, 2, 3, 4, 5, 6, 7];", "  const PICK_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];")
s = rep(s, "  if (!(myAv >= 0 && myAv < 10)) myAv = 8 + Math.floor(Math.random() * 2);", "  if (!(myAv >= 0 && myAv < AV.length)) myAv = Math.floor(Math.random() * AV.length);")
s = rep(s, "    const botAvs = [8, 9, 0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i !== game.view().P[0].a);", "    const botAvs = shuffle(AV.map((_, i) => i)).filter((i) => i !== game.view().P[0].a);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('likovi OK')

# ---- mini-igre: prikaz ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/games.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  function betPhone(d, me) {", r"""  // ---------- mini-igre ----------
  function qTextHtml(d, tv) {
    const q = d.q;
    if (q.k === 'who') {
      const step = Math.round(d.dur / 5), all = d.ph !== 'question';
      return '<div class="whoq' + (all ? ' all' : '') + '"><div class="whoq-k">Tko sam ja? · ' + esc(q.t) + '</div><ol>' +
        (q.cl || []).map((t, i) => '<li style="--cd:' + (i * step) + 'ms"><i>' + (i + 1) + '.</i>' + esc(t) + '</li>').join('') + '</ol></div>';
    }
    if (q.k === 'emoji') return '<div class="emo">' + esc(q.t) + '</div>';
    return '<div class="' + (tv ? 'q-text' : 'p-q') + '">' + esc(q.t) + '</div>';
  }
  function howtoHtml(d) {
    const h = d.ht;
    return '<div class="ht"><div class="ht-i">' + esc(h.i) + '</div><div class="ht-k">' + (h.chal ? 'Izazov' : 'Posebna bitka') + '</div><div class="ht-t">' + esc(h.n) + '</div>' +
      (h.first ? '<ol>' + h.r.map((r, i) => '<li style="--cd:' + (350 + i * 500) + 'ms"><b>' + (i + 1) + '</b>' + esc(r) + '</li>').join('') + '</ol>' : '<div class="mg-s">' + esc(h.r[0]) + '</div>') +
      '<div class="ht-go">Kreće za nekoliko sekundi…</div></div>';
  }
  function sendPartial(inp) {
    inp.s = L.s;
    if (mode === 'demo') game.setInput(PID, inp);
    else if (proom) proom.presence({ in: inp }).catch(() => {});
  }
  function orderRanks(o) { return [0, 1, 2, 3].map((r) => o.key.indexOf(r)); }
  function orderPhone(d, me) {
    const o = d.or, sent = !!(L.sent || me.ok), picks = L.ord || [];
    const btn = (x, i) => {
      const pos = L.sent && L.sent.r ? L.sent.r[i] : picks.indexOf(i);
      return '<button class="mg-btn' + (pos >= 0 ? ' set' : '') + '" data-or="' + i + '"' + (sent || pos >= 0 ? ' disabled' : '') + '><span class="n">' + (pos >= 0 ? pos + 1 : '') + '</span>' + esc(x) + '</button>';
    };
    return '<div class="mg"><div class="mg-t">' + esc(o.t) + '</div><div class="mg-s">Dodiruj redom: <b>1 = ' + esc(o.lo) + '</b> … <b>4 = ' + esc(o.hi) + '</b></div><div class="mg-list">' + o.it.map(btn).join('') + '</div>' +
      (sent ? '<div class="waiting">Poslano ✔ Čekamo ostale…</div>' : '<div class="mg-row"><button class="btn ghost" id="ordUndo"' + (picks.length ? '' : ' disabled') + '>Poništi</button></div>') + '</div>';
  }
  function orderSolution(d) {
    const o = d.or;
    return '<div class="mg-list">' + orderRanks(o).map((i, r) => '<div class="mg-btn set"><span class="n">' + (r + 1) + '</span>' + esc(o.it[i]) + (o.v ? '<span class="val">' + esc(o.v[i]) + '</span>' : '') + '</div>').join('') + '</div>';
  }
  function hiloPhone(d, me) {
    const list = d.hl.list, st = L.hl || (L.hl = { i: 0, r: [], fb: '', ok: 1 });
    const fb = st.fb ? '<div class="mg-fb ' + (st.ok ? 'ok' : 'bad') + ' pop">' + esc(st.fb) + '</div>' : '<div class="mg-fb"></div>';
    let n = 0; while (n < st.r.length && st.r[n] === list[n].w) n++;
    if (L.sent || me.ok || st.i >= list.length) {
      return '<div class="mg"><div class="mg-t">Više ili manje</div>' + fb + '<div class="mg-big">' + n + '</div><div class="mg-s">' + (n === list.length ? 'Savršen niz! Bonus +200' : 'točnih zaredom') + '</div><div class="waiting">Čekamo ostale…</div></div>';
    }
    const x = list[st.i];
    return '<div class="mg"><div class="mg-t">Više ili manje</div><div class="mg-s">Niz: <b>' + n + '</b> · ' + (st.i + 1) + '/' + list.length + '</div><div class="mg-q">' + esc(x.q) + '</div>' +
      '<div class="mg-two">' + x.a.map((a, k) => '<button class="mg-btn" data-hl="' + k + '">' + esc(a) + '</button>').join('') + '</div>' + fb + '</div>';
  }
  function blitzPhone(d, me) {
    const list = d.bz.list, st = L.bz || (L.bz = { i: 0, r: [], ok: 0, bad: 0, fb: '', last: 1 });
    const fb = st.fb ? '<div class="mg-fb ' + (st.last ? 'ok' : 'bad') + ' pop">' + esc(st.fb) + '</div>' : '<div class="mg-fb"></div>';
    const cnt = '<div class="mg-s">✓ <b>' + st.ok + '</b> · ✗ <b>' + st.bad + '</b> · bodovi <b>' + Math.max(0, st.ok * 100 - st.bad * 50) + '</b></div>';
    if (L.sent || me.ok || st.i >= list.length) return '<div class="mg"><div class="mg-t">Munjeviti krug</div>' + cnt + '<div class="waiting">Gotovo! Čekamo kraj kruga…</div></div>';
    return '<div class="mg"><div class="mg-t">Munjeviti krug</div>' + cnt + '<div class="mg-q">' + esc(list[st.i][0]) + '</div><div class="mg-tf"><button class="btn" data-bz="1">Točno</button><button class="btn ghost" data-bz="0">Netočno</button></div>' + fb + '</div>';
  }
  function majPhone(d, me) {
    const m = d.mj, sent = !!(L.sent || me.ok);
    return '<div class="mg"><div class="mg-t">Što misli većina?</div><div class="mg-s">Pitanje ' + (m.i + 1) + '/' + m.n + ' · bodove dobiva većina</div><div class="mg-q">' + esc(m.q.q) + '</div><div class="mg-list">' +
      m.q.o.map((o, i) => '<button class="mg-btn' + (L.sent && L.sent.v === i ? ' set' : '') + '" data-mj="' + i + '"' + (sent ? ' disabled' : '') + '><span class="n">' + String.fromCharCode(65 + i) + '</span>' + esc(o) + '</button>').join('') + '</div>' +
      (sent ? '<div class="waiting">Glas poslan ✔</div>' : '') + '</div>';
  }
  function majBars(d, meV) {
    const m = d.mj, tot = m.cnt.reduce((a, b) => a + b, 0) || 1;
    return '<div class="mj-bars">' + m.q.o.map((o, i) => '<div class="mj-bar' + (m.win.includes(i) ? ' win' : '') + (meV === i ? ' me' : '') + '" style="--w:' + Math.round((m.cnt[i] / tot) * 100) + '%"><i></i><span>' + esc(o) + '</span><b>' + m.cnt[i] + '</b></div>').join('') + '</div>';
  }
  function chalReveal(d, me, title, sol, res) {
    return '<div class="mg"><div class="mg-t">' + title + '</div>' + (sol || '') + '<div class="result ' + (me.g ? 'ok' : 'none') + '"><div class="p-title">' + res + '</div><div class="pts">+' + (me.g || 0) + '</div></div></div>' +
      (d.ntv ? miniBoard(d, true) : rankStat(d, me)) + tdLine(d);
  }
  function betPhone(d, me) {""")
# mobitel: faze
s = rep(s, "      case 'moment': h = center(head + momentHtml(d, d.mo)); break;\n", """      case 'moment': h = center(head + momentHtml(d, d.mo)); break;
      case 'howto': h = center(head + timerHtml() + howtoHtml(d)); break;
      case 'order': h = head + timerHtml() + orderPhone(d, me); break;
      case 'hilo': h = head + timerHtml() + hiloPhone(d, me); break;
      case 'blitz': h = head + timerHtml() + blitzPhone(d, me); break;
      case 'maj': h = head + timerHtml() + majPhone(d, me); break;
      case 'orderReveal': h = head + chalReveal(d, me, 'Točan poredak', orderSolution(d), 'Točno ' + (me.k || 0) + ' od 4'); break;
      case 'hiloReveal': h = head + chalReveal(d, me, 'Više ili manje', '', 'Niz: ' + (me.k || 0) + ' točnih'); break;
      case 'blitzReveal': h = head + chalReveal(d, me, 'Munjeviti krug', '', '✓ ' + (me.k || 0) + ' · ✗ ' + (me.x || 0)); break;
      case 'majReveal': {
        const inW = d.mj.win.includes(me.mv), none = !d.mj.win.length;
        h = head + '<div class="mg"><div class="mg-t">Što misli većina?</div><div class="mg-q">' + esc(d.mj.q.q) + '</div>' + majBars(d, me.mv) +
          '<div class="mg-fb ' + (inW ? 'ok' : 'bad') + '">' + (none ? 'Nema većine – svatko je za sebe!' : inW ? 'S većinom si! +300' : me.mv >= 0 ? 'Ovaj put nisi s većinom.' : 'Nisi glasao.') + '</div></div>' +
          (d.mj.last ? '<div class="result ' + (me.g ? 'ok' : 'none') + '"><div class="p-title">Ukupno</div><div class="pts">+' + (me.g || 0) + '</div></div>' + (d.ntv ? miniBoard(d, true) : rankStat(d, me)) + tdLine(d) : '');
        break;
      }
""")
# TV: faze
s = rep(s, "      case 'moment': h = tvTop(d, 'Krčma pamti') + momentHtml(d, d.mo); break;\n", """      case 'moment': h = tvTop(d, 'Krčma pamti') + momentHtml(d, d.mo); break;
      case 'howto': h = tvTop(d, 'Kako se igra') + timerHtml() + howtoHtml(d) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'order': h = tvTop(d, 'Poredajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">' + esc(d.or.t) + '</div><div class="mg-s">od <b>' + esc(d.or.lo) + '</b> do <b>' + esc(d.or.hi) + '</b></div><div class="chips">' + d.or.it.map((x) => '<span class="chip">' + esc(x) + '</span>').join('') + '</div></div></div>' + lineup(d, { check: true }); break;
      case 'orderReveal': h = tvTop(d, 'Točan poredak') + '<div class="tv-mid"><div class="mg"><div class="mg-t">' + esc(d.or.t) + '</div>' + orderSolution(d) + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'hilo': h = tvTop(d, 'Igrajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Više ili manje</div><div class="mg-s">Prva greška prekida niz. Tko će imati najdulji niz?</div></div></div>' + lineup(d, { check: true }); break;
      case 'hiloReveal': h = tvTop(d, 'Rezultati') + '<div class="tv-mid"><div class="mg"><div class="mg-t">Više ili manje</div><div class="mg-list">' + d.hl.list.slice(0, 4).map((x) => '<div class="mg-q">' + esc(x.q) + ' <b>' + esc(x.a[x.w]) + '</b>' + (x.v ? ' (' + esc(x.v[x.w]) + ')' : '') + '</div>').join('') + '</div>' + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'blitz': h = tvTop(d, 'Igrajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Munjeviti krug</div><div class="mg-s">Točno ili netočno – što brže! Točno +100, netočno −50.</div></div></div>' + lineup(d, { check: true }); break;
      case 'blitzReveal': h = tvTop(d, 'Rezultati') + '<div class="tv-mid"><div class="mg"><div class="mg-t">Munjeviti krug</div>' + tdLine(d) + '</div></div>' + lineup(d, { gain: true }) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
      case 'maj': h = tvTop(d, 'Glasajte na mobitelu!') + timerHtml() + '<div class="tv-mid"><div class="mg"><div class="mg-t">Što misli većina?</div><div class="mg-q">' + esc(d.mj.q.q) + '</div><div class="mg-list">' + d.mj.q.o.map((o, i) => '<div class="mg-btn"><span class="n">' + String.fromCharCode(65 + i) + '</span>' + esc(o) + '</div>').join('') + '</div></div></div>' + lineup(d, { check: true }); break;
      case 'majReveal': h = tvTop(d, 'Što misli većina?') + '<div class="tv-mid"><div class="mg"><div class="mg-q">' + esc(d.mj.q.q) + '</div>' + majBars(d, -1) + (d.mj.last ? tdLine(d) : '') + '</div></div>' + lineup(d, d.mj.last ? { gain: true } : {}) + '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div>'; break;
""")
# pitanje: tko sam ja / emoji
s = rep(s, "            '<div class=\"rv-a\"><div class=\"q-text\">' + esc(d.q.t) + '</div>' + revOpts(d, -1, true) + '</div>' +", "            '<div class=\"rv-a\">' + qTextHtml(d, true) + revOpts(d, -1, true) + '</div>' +")
s = rep(s, "          '<div class=\"tv-mid\"><div class=\"q-text\">' + esc(d.q.t) + '</div><div class=\"opts\">' + opts + '</div>' + evHtml(d) + '</div>' +", "          '<div class=\"tv-mid\">' + qTextHtml(d, true) + '<div class=\"opts\">' + opts + '</div>' + evHtml(d) + '</div>' +")
s = rep(s, "      '<div class=\"p-q\">' + esc(d.q.t) + '</div>' + (buffs ? '<div class=\"buffs\">' + buffs + '</div>' : '') + hit +\n      '<div class=\"q-area\">", "      qTextHtml(d, false) + (buffs ? '<div class=\"buffs\">' + buffs + '</div>' : '') + hit +\n      '<div class=\"q-area\">")
s = rep(s, "      '<div class=\"rv-a\"><div class=\"p-q\">' + esc(d.q.t) + '</div>' + (none ?", "      '<div class=\"rv-a\">' + qTextHtml(d, false) + (none ?")
# unosi
s = rep(s, "    $app.querySelectorAll('[data-sx]').forEach(", """    $app.querySelectorAll('[data-or]').forEach((b) => { b.onclick = () => {
      if (L.sent) return; const i = +b.dataset.or; L.ord = (L.ord || []).filter((x) => x !== i).concat(i);
      if (L.ord.length === 4) sendInput({ r: [0, 1, 2, 3].map((k) => L.ord.indexOf(k)) }); else phoneRender(true);
    }; });
    bind('ordUndo', () => { if (L.ord && L.ord.length) { L.ord.pop(); phoneRender(true); } });
    $app.querySelectorAll('[data-hl]').forEach((b) => { b.onclick = () => {
      const st = L.hl, list = d.hl && d.hl.list; if (!st || !list || L.sent || st.i >= list.length) return;
      const k = +b.dataset.hl, x = list[st.i], ok = k === x.w;
      st.r.push(k); st.ok = ok ? 1 : 0; st.i++;
      st.fb = (ok ? '✓ ' : '✗ ') + x.a[x.w] + (x.v ? ' (' + x.v[x.w] + ' : ' + x.v[1 - x.w] + ')' : '');
      AUDIO.play(ok ? 'score' : 'wrong'); if (!ok) HAPTIC.error();
      if (!ok || st.i >= list.length) sendInput({ r: st.r.slice() }); else phoneRender(true);
    }; });
    $app.querySelectorAll('[data-bz]').forEach((b) => { b.onclick = () => {
      const st = L.bz, list = d.bz && d.bz.list; if (!st || !list || L.sent || st.i >= list.length) return;
      const v = +b.dataset.bz, ok = v === list[st.i][1];
      st.r.push(v); st.i++; if (ok) st.ok++; else st.bad++; st.last = ok ? 1 : 0; st.fb = ok ? '✓ Točno!' : '✗ Netočno';
      AUDIO.play(ok ? 'tap' : 'wrong');
      if (st.i >= list.length) sendInput({ r: st.r.slice(), f: 1 }); else { sendPartial({ r: st.r.slice() }); phoneRender(true); }
    }; });
    $app.querySelectorAll('[data-mj]').forEach((b) => { b.onclick = () => { if (!L.sent) sendInput({ v: +b.dataset.mj }); }; });
    $app.querySelectorAll('[data-sx]').forEach(""")
# potpis i zvuk
s = rep(s, "roster, d.mo, d.du, d.se, d.sxr]);", "roster, d.mo, d.du, d.se, d.sxr, d.ht, d.or, d.hl ? 1 : 0, d.bz ? 1 : 0, d.mj]);")
s = rep(s, "      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');\n      case 'duelIntro': AUDIO.play('stingDuel');", """      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');
      case 'howto': return AUDIO.play('whoosh');
      case 'order': case 'hilo': case 'blitz': case 'maj': return AUDIO.play('pop');
      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': return AUDIO.play(me.g ? 'correct' : 'wrong');
      case 'majReveal': return AUDIO.play(d.mj && d.mj.win.includes(me.mv) ? 'correct' : 'wrong');
      case 'duelIntro': AUDIO.play('stingDuel');""")
s = rep(s, "      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');\n      case 'duelIntro': return AUDIO.play('stingDuel');", """      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');
      case 'howto': return AUDIO.play('whoosh');
      case 'order': case 'hilo': case 'blitz': case 'maj': return AUDIO.play('pop');
      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': case 'majReveal': return AUDIO.play('correct');
      case 'duelIntro': return AUDIO.play('stingDuel');""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('mini-igre UI OK')

# ---- botovi u predvorju ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/bots.css', encoding='utf-8').read() + s[i:]
s = rep(s, "        const taken = {}; d.P.forEach((p) => { if (p.id !== PID) taken[p.a] = p.n; });\n        const grid = PICK_ORDER",
           "        const taken = {}; d.P.forEach((p) => { if (p.id !== PID && !p.b) taken[p.a] = p.n; });\n        const grid = PICK_ORDER")
s = rep(s, "(p.id === PID ? '<span class=\"you\">Ti</span>' : '') + '</span>' +\n          '<span class=\"st' + (p.c ? '' : ' off') + '\">' + (p.c ? '✓ U sobi' : 'Nije povezan') + '</span></div>').join('');",
           "(p.id === PID ? '<span class=\"you\">Ti</span>' : '') + '</span>' +\n          (p.b ? '<span class=\"st bot\">🤖 Bot</span></div>' : '<span class=\"st' + (p.c ? '' : ' off') + '\">' + (p.c ? '✓ U sobi' : 'Nije povezan') + '</span></div>')).join('');")
s = rep(s, "          cta = '<button class=\"btn lob-cta\" id=\"dstart\"' + (d.P.length < 2 ? ' disabled' : '') + '>Započni igru</button>' + (d.P.length < 2 ? '<div class=\"lob-wait\">Čekamo barem još jednog igrača.</div>' : '');\n        } else if (mode === 'demo') {\n          cta = '<button class=\"btn lob-cta\" id=\"dstart\">Započni igru</button><div class=\"lob-wait\">Igraš protiv tri bota. Bacat će moći i na tebe!</div>';",
           "          cta = botStepper(d) + '<button class=\"btn lob-cta\" id=\"dstart\"' + (d.P.length < 2 ? ' disabled' : '') + '>Započni igru</button>' + (d.P.length < 2 ? '<div class=\"lob-wait\">Čekamo barem još jednog igrača ili dodaj bota.</div>' : '');\n        } else if (mode === 'demo') {\n          const nb = d.P.filter((p) => p.b).length;\n          cta = botStepper(d) + '<button class=\"btn lob-cta\" id=\"dstart\"' + (nb < 1 ? ' disabled' : '') + '>Započni igru</button><div class=\"lob-wait\">' + (nb < 1 ? 'Dodaj barem jednog bota.' : 'Igraš protiv ' + botWord(nb) + '. Bacat će moći i na tebe!') + '</div>';")
s = rep(s, "const rows = d.P.map((p) => '<div class=\"lob-row\">", "const rows = d.P.map((p) => '<div class=\"lob-row\" data-a=\"' + p.a + '\"' + (p.b ? ' data-bot=\"1\"' : '') + '>")
s = rep(s, "  function rankStat(d, me) {", r"""  function botWord(n) { return n + (n < 5 ? ' bota' : ' botova'); }
  // samo domaćin (igra je lokalna): − broj +
  function botStepper(d) {
    const nb = d.P.filter((p) => p.b).length, room = d.max - d.P.length;
    return '<div class="lob-bots"><span class="lob-bots-l">🤖 Botovi<small>Pravi igrači imaju prednost pri odabiru likova</small></span>' +
      '<span class="lob-bots-c"><button class="bstep" data-bots="-1" aria-label="Manje botova"' + (nb < 1 ? ' disabled' : '') + '>−</button>' +
      '<b>' + nb + '</b><button class="bstep" data-bots="1" aria-label="Više botova"' + (room < 1 ? ' disabled' : '') + '>+</button></span></div>';
  }
  function bindBots(d) {
    document.querySelectorAll('#app [data-bots]').forEach((b) => { b.onclick = () => {
      if (!game) return; const nb = d.P.filter((p) => p.b).length;
      AUDIO.play('tap'); game.setBots(nb + +b.dataset.bots);
    }; });
  }
  function rankStat(d, me) {""")
s = rep(s, "    bind('dstart', () => game.start());\n    bind('dagain'", "    bind('dstart', () => game.start());\n    if (d && d.ph === 'lobby' && game) bindBots(d);\n    bind('dagain'")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('botovi OK')

# ---- memorija: predučitavanje bez držanja dekodiranih slika ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """    const done = {}, keep = [];""", """    const done = {};""")
s = rep(s, """      return new Promise((res) => {
        const i = new Image(); keep.push(i);
        i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(res);
        i.onerror = res; i.src = u;
      });""", """      // samo u priručnu memoriju preglednika (HTTP/SW); ne držimo dekodirane slike (Android ruši karticu)
      if (window.fetch && location.protocol !== 'file:') return fetch(u).then((r) => r.blob()).then(() => {}, () => {});
      return new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = u; });""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('predučitavanje OK')

# ---- skrivena pozadina na platnu ne smije se crtati u petlji ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """    const c = document.getElementById('bg');
    if (!c || !c.getContext) return;""", """    const c = document.getElementById('bg');
    if (!c || !c.getContext || getComputedStyle(c).display === 'none') { if (c) { c.width = c.height = 0; } return; }""")
s = rep(s, """    const box = document.getElementById('deco');
    if (!box) return;""", """    const box = document.getElementById('deco');
    if (!box || getComputedStyle(box).display === 'none') return;""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('pozadina OK')

# ---- finale: legenda bez grickalica ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "const legend = Object.keys(POWERS).filter((k) => !(d.fin && k === 'pola'))", "const legend = Object.keys(POWERS).filter((k) => !(d.fin && (k === 'pola' || k === 'grick')))")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('finale moći OK')

# ---- vrata: glatki prijelaz glasanje → odabir, ruleta kod neriješenog ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/vote2.css', encoding='utf-8').read() + s[i:]
# kontinuirani prijelaz: ista vrata ostaju na mjestu, bez pretapanja scene i bez ulaznog skoka
s = rep(s, "      const changed = fresh && ph0 !== null && ph !== ph0 && !!$app.firstElementChild;",
           "      const cont = fresh && ph0 !== null && !!CONT[ph0 + '>' + ph];\n      const changed = !cont && fresh && ph0 !== null && ph !== ph0 && !!$app.firstElementChild;")
s = rep(s, "      $app.innerHTML = html;\n      $app.style.setProperty('--pel'", "      $app.innerHTML = html;\n      if (cont) $app.classList.remove('fresh');\n      $app.style.setProperty('--pel'")
s = rep(s, "  const SCENE = (() => {", "  const CONT = { 't:vote>t:voteResult': 1, 'p:vote>p:voteResult': 1 };\n  const SCENE = (() => {")
s = rep(s, "  function rankStat(d, me) {", r"""  // ruleta: svjetlo prelazi preko izjednačenih vrata i usporava dok ne stane na odabranima
  function roulette(d) {
    if (d.ph !== 'voteResult' || !d.tb || d.tb.length < 2) return null;
    const R = d.rd || 2600, D = R + 700, steps = [];
    for (let t = 0, gap = 75; t < R - 120; t += gap, gap = Math.min(430, gap * 1.17)) steps.push(t);
    const n = steps.length, tb = d.tb, ci = Math.max(0, tb.indexOf(d.cw));
    const at = (k) => tb[(((ci - (n - 1 - k)) % tb.length) + tb.length) % tb.length];
    const pc = (ms) => (Math.max(0, Math.min(D, ms)) / D * 100).toFixed(2) + '%';
    let css = '';
    for (const j of tb) {
      let kf = '0%{opacity:0}';
      steps.forEach((st, k) => {
        if (at(k) !== j) return;
        const e = k + 1 < n ? steps[k + 1] : R;
        kf += pc(st - 30) + '{opacity:0}' + pc(st) + '{opacity:1}';
        kf += k + 1 < n ? pc(e + 90) + '{opacity:0}' : pc(R + 250) + '{opacity:1}' + '100%{opacity:0}';
      });
      if (!/100%/.test(kf)) kf += '100%{opacity:0}';
      css += '@keyframes rl' + d.s + 'x' + j + '{' + kf + '}';
    }
    return { R, D, steps, css, has: (i) => tb.includes(i), spot: (i) => tb.includes(i) ? '<i class="spot" style="animation:rl' + d.s + 'x' + i + ' ' + D + 'ms linear both;animation-delay:calc(-1 * var(--pel, 0ms))"></i>' : '' };
  }
  let roulStep = -1;
  function rouletteSound(d) {
    const r = roulette(d); if (!r || roulStep === d.s) return; roulStep = d.s;
    r.steps.forEach((t, k) => setTimeout(() => AUDIO.play('tap'), t + (k ? 0 : 10)));
    setTimeout(() => AUDIO.play('step'), r.R + 40);
  }
  function rankStat(d, me) {""")
# TV
s = rep(s, """          const cls = d.ph === 'voteResult' ? (i === d.cw ? ' win' : ' lose') : (max > 0 && counts[i] === max ? ' lead' : '');
          return '<div class="door o' + i + cls + '"><span class="vcount""",
"""          const cls = d.ph === 'voteResult' ? (i === d.cw ? ' win' : ' lose') : (max > 0 && counts[i] === max ? ' lead' : '');
          return '<div class="door o' + i + cls + '"' + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + '>' + (rl ? rl.spot(i) : '') + '<span class="vcount""")
s = rep(s, """        const doors = d.cats.map((c, i) => {
          const voters = voterFaces(d.P.filter((p) => p.vt === i), 5);""", """        const rl = roulette(d);
        const doors = d.cats.map((c, i) => {
          const voters = voterFaces(d.P.filter((p) => p.vt === i), 5);""")
s = rep(s, """          : 'Kategorija: ' + esc(d.cats[d.cw]);
        h = tvTop(d, label)""", """          : rl ? '<span class="rl-pre" style="--rd:' + rl.R + 'ms">Neriješeno! Ždrijeb bira kategoriju…</span><span class="rl-post" style="--rd:' + rl.R + 'ms">Kategorija: ' + esc(d.cats[d.cw]) + '</span>' : 'Kategorija: ' + esc(d.cats[d.cw]);
        h = (rl ? '<style>' + rl.css + '</style>' : '') + tvTop(d, label)""")
s = rep(s, """          (d.ph === 'voteResult' && d.tie ? '<div class="tie-note">Neriješeno! Kategoriju je odabrao ždrijeb.</div>' : '') +
          (d.ph === 'voteResult' && !voted ? '<div class="tie-note">Nitko nije glasao, kategoriju je odabrao ždrijeb.</div>' : '') +""",
"""          (d.ph === 'voteResult' && d.tie ? '<div class="tie-note' + (rl ? ' rl-post' : '') + '"' + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + '>' + (voted ? 'Neriješeno! Kategoriju je odabrao ždrijeb.' : 'Nitko nije glasao, kategoriju je odabrao ždrijeb.') + '</div>' : '') +""")
# mobitel
s = rep(s, """        const res = d.ph === 'voteResult';
        const mine =""", """        const res = d.ph === 'voteResult', rl = roulette(d);
        const mine =""")
s = rep(s, """          return '<button class="door-btn o' + i + cls + '" data-v="' + i + '"' + (res || mine !== -1 ? ' disabled' : '') + '><span class="dname">""",
"""          return '<button class="door-btn o' + i + cls + '" data-v="' + i + '"' + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + (res || mine !== -1 ? ' disabled' : '') + '>' + (rl ? rl.spot(i) : '') + '<span class="dname">""")
s = rep(s, """        h = head + '<div class="vote-head"><div class="p-title">' + (res ? 'Kategorija: <span style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</span>' : 'Odaberi kategoriju') + '</div>' +""",
"""        const resT = 'Kategorija: <span style="color:var(--gold)">' + esc(d.cats[d.cw]) + '</span>';
        h = (rl ? '<style>' + rl.css + '</style>' : '') + head + '<div class="vote-head"><div class="p-title">' + (res ? (rl ? '<span class="rl-pre" style="--rd:' + rl.R + 'ms">Ždrijeb bira…</span><span class="rl-post" style="--rd:' + rl.R + 'ms">' + resT + '</span>' : resT) : 'Odaberi kategoriju') + '</div>' +""")
s = rep(s, """          (res && d.tie ? '<div class="waiting">Neriješeno! Odlučio je ždrijeb.</div>' : '') +""",
"""          (res && d.tie ? '<div class="waiting' + (rl ? ' rl-post' : '') + '"' + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + '>Neriješeno! Odlučio je ždrijeb.</div>' : '') +""")
# zvuk
s = rep(s, "      case 'voteResult': case 'fr': return SFX.play('step');", "      case 'voteResult': if (d.tb) return rouletteSound(d); return SFX.play('step');\n      case 'fr': return SFX.play('step');")
s = rep(s, "      case 'bet': return SFX.play('pop');\n      case 'moment':", "      case 'bet': return SFX.play('pop');\n      case 'voteResult': if (d.ntv && d.tb) rouletteSound(d); return;\n      case 'moment':")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('vrata OK')

# ---- traka igrača na mobitelu: bez imena (ionako se skraćuju) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """d.P.map((p) => '<div class="bw' + (p.id === PID ? ' me' : '') + '"><span class="glow"></span>' + avSvg(p.a, mood(p)) + (p.ok ? '<span class="ok">✓</span>' : '') + '<span class="nm">' + esc(p.n) + '</span>""",
           """d.P.map((p) => '<div class="bw' + (p.id === PID ? ' me' : '') + '" title="' + esc(p.n) + '" aria-label="' + esc(p.n) + '"><span class="glow"></span>' + avSvg(p.a, mood(p)) + (p.ok ? '<span class="ok">✓</span>' : '') + '""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('traka OK')

# ---- kartica rezultata ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/result.css', encoding='utf-8').read() + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('rezultat OK')

# ---- predvorje: promjenjiv popis igrača na dno; sve uvijek stane na ekran ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """          '<div class="lob-players">' + rows + '</div>' + invite + cta + '<button class="home-link" id="leave">Izađi</button></div>';""",
           """          invite + cta + '<button class="home-link" id="leave">Izađi</button><div class="lob-players">' + rows + '</div></div>';""")
s = rep(s, "  function rankStat(d, me) {", r"""  // ekran mora stati bez skrolanja: ako sadržaj prelije, cijela scena se smanji (najviše na 60 %)
  function fitScreen() {
    const A = $app, se = document.scrollingElement || document.documentElement;
    if (!A || !A.firstElementChild) return;
    const ih = innerHeight;
    A.style.zoom = '';
    let sh = se.scrollHeight;
    if (sh <= ih + 1) return;
    let f = Math.max(0.6, ih / sh);
    for (let k = 0; k < 4; k++) {
      A.style.zoom = f.toFixed(3);
      sh = se.scrollHeight;
      if (sh <= ih + 1 || f <= 0.6) break;
      f = Math.max(0.6, f * ih / sh - 0.006);
    }
  }
  let fitT = 0; addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitScreen, 120); });
  function rankStat(d, me) {""")
s = rep(s, "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);", "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);\n    fitScreen();")
s = rep(s, "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);", "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);\n    fitScreen();")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('stane na ekran OK')

# ---- MOTION: brojanje bodova i "poskok" promjena (otporno na ponovno iscrtavanje) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/motion2.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const CONT = {", r"""  const MOTION = (() => {
    let ph0 = '', prev = new Map(), starts = new Map(), live = new Map(), raf = 0;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    function tick() {
      raf = 0; const now = performance.now(); let more = false;
      document.querySelectorAll('#app [data-cu]').forEach((e) => {
        const st = starts.get(e.dataset.ck); if (st === undefined) return;
        const to = +e.dataset.to, from = +e.dataset.cu, dur = +(e.dataset.cdur || 800);
        const x = Math.max(0, Math.min(1, (now - st) / dur));
        e.textContent = (e.dataset.pre || '') + Math.round(from + (to - from) * ease(x)) + (e.dataset.suf || '');
        if (x < 1) more = true; else if (!e.dataset.cdone) { e.dataset.cdone = '1'; e.classList.add('bump'); }
      });
      if (more) raf = requestAnimationFrame(tick);
    }
    function after(ph) {
      const now = performance.now(), same = ph === ph0;
      if (!same) { starts = new Map(); live = new Map(); }
      // brojanje: početak se pamti po fazi i ključu, pa novo iscrtavanje nastavlja gdje je stalo
      document.querySelectorAll('#app [data-cu]').forEach((e, k) => {
        const key = e.dataset.ck || (e.dataset.ck = 'c' + k);
        if (reduceMotion || +e.dataset.cu === +e.dataset.to) { starts.delete(key); return; }
        if (!starts.has(key)) starts.set(key, now + (+(e.dataset.cud || 0)));
      });
      if (!raf) raf = requestAnimationFrame(tick);
      if (starts.size) tick();
      // poskok: vrijednost se promijenila (ili se element pojavio) unutar iste faze
      const cur = new Map();
      document.querySelectorAll('#app [data-bk]').forEach((e) => {
        const k = e.dataset.bk, v = e.dataset.bv !== undefined ? e.dataset.bv : e.textContent;
        cur.set(k, v);
        if (reduceMotion) return;
        if (same && ph0 && prev.get(k) !== v) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
      });
      prev = cur; ph0 = ph;
    }
    return { after };
  })();
  const CONT = {""")
s = rep(s, "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);\n    fitScreen();", "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);\n    fitScreen();\n    MOTION.after('p:' + d.ph + ':' + d.s);")
s = rep(s, "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);\n    fitScreen();", "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);\n    fitScreen();\n    MOTION.after('t:' + d.ph + ':' + d.s);")
# ljestvica: bodovi se odbroje od starih do novih (nakon što redovi kliznu)
s = rep(s, """      (gain ? '<span class="gain' + (p.g ? '' : ' zero') + '">' + (p.g ? '+' + p.g : '+0') + '</span>' : '') + '<span class="sc">' + p.sc + '</span></div>').join('') + '</div>';""",
           """      (gain ? '<span class="gain' + (p.g ? '' : ' zero') + '">' + (p.g ? '+' + p.g : '+0') + '</span>' : '') + '<span class="sc"' + (gain ? ' data-ck="mb' + esc(p.id) + '" data-cu="' + (p.sc - (p.g || 0) - (p.br || 0) - (p.xb || 0)) + '" data-to="' + p.sc + '" data-cud="' + (gain === true ? 450 : gain) + '" data-cdur="900"' : '') + '>' + p.sc + '</span></div>').join('') + '</div>';""")
s = rep(s, """    return { html: miniBoard(d, true).replace('<div class="mboard', '<div data-delay="' + delay + '" class="mboard'), lead: newLead };""",
           """    return { html: miniBoard(d, delay < 0 ? true : 2000).replace('<div class="mboard', '<div data-delay="' + delay + '" class="mboard'), lead: newLead };""")
# moja statistika: bodovi se odbroje
s = rep(s, """    return '<div class="statline"><div class="stat"><b>' + pos + '.</b><span>mjesto</span></div><div class="stat"><b>' + me.sc + '</b><span>bodova</span></div></div>';""",
           """    const from = me.sc - (me.g || 0) - (me.br || 0) - (me.xb || 0);
    return '<div class="statline"><div class="stat"><b data-bk="pos" data-bv="' + pos + '">' + pos + '.</b><span>mjesto</span></div><div class="stat"><b data-ck="mysc" data-cu="' + from + '" data-to="' + me.sc + '" data-cud="500" data-cdur="900">' + me.sc + '</b><span>bodova</span></div></div>';""")
# TV: igrači u liniji — kvačica i bodovi
s = rep(s, """      if (opts.check && p.ok) badge = '<span class="badge">✓</span>';
      if (opts.gain && p.g) badge = '<span class="badge gain">+' + p.g + '</span>';""",
           """      if (opts.check && p.ok) badge = '<span class="badge" data-bk="ok' + esc(p.id) + '" data-bv="1">✓</span>';
      if (opts.gain && p.g) badge = '<span class="badge gain">+' + p.g + '</span>';""")
s = rep(s, """        '<div class="nm">' + esc(p.n) + '</div><div class="sc">' + p.sc + '</div></div>';""",
           """        '<div class="nm">' + esc(p.n) + '</div><div class="sc"' + (opts.gain && p.g ? ' data-ck="lu' + esc(p.id) + '" data-cu="' + (p.sc - p.g) + '" data-to="' + p.sc + '" data-cud="700" data-cdur="900"' : '') + '>' + p.sc + '</div></div>';""")
# TV vrata: broj glasova poskoči
s = rep(s, """'<span class="vcount' + (counts[i] ? '' : ' zero') + '">' + counts[i] + '</span>""", """'<span class="vcount' + (counts[i] ? '' : ' zero') + '" data-bk="vc' + i + '">' + counts[i] + '</span>""")
# mobitel: traka igrača — tko je odgovorio poskoči
s = rep(s, """(p.ok ? '<span class="ok">✓</span>' : '')""", """(p.ok ? '<span class="ok" data-bk="bw' + esc(p.id) + '" data-bv="1">✓</span>' : '')""")
# HUD bodovi
s = rep(s, """'</span><span>' + (d.fin ? 'Korak ' + (me.st || 0) + '/' + d.steps : me.sc + ' b') + '</span></div>' : '';""",
           """'</span><span data-bk="hud">' + (d.fin ? 'Korak ' + (me.st || 0) + '/' + d.steps : me.sc + ' b') + '</span></div>' : '';""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('motion OK')

# ---- MOTION 2: promjene stanja unutar iste faze (odabir, zatamnjenje, novi korak) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "        if (same && ph0 && prev.get(k) !== v) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }",
           """        if (same && ph0 && prev.has(k) && prev.get(k) !== v || same && ph0 && !prev.has(k) && !e.dataset.ba) live.set(k, { c: e.dataset.ba || 'bump', t: now, v });
        const a = live.get(k);
        if (a && (a.v !== v || now - a.t > 600)) { live.delete(k); return; }
        if (a) {
          // animacija traje dalje i kad se ekran u međuvremenu ponovno iscrta
          const tg = e.dataset.bt === 'app' ? [...$app.children].filter((x) => !/\\b(demo-bar|p-top|bar-row)\\b/.test(x.className) && x.tagName !== 'I') : [e];
          tg.forEach((x) => { x.classList.add(a.c); x.style.animationDelay = -(now - a.t) + 'ms'; });
        }""")
# odgovori na mobitelu
s = rep(s, """      return '<button class="' + cls + '" data-c="' + i + '"' + (answered || gone ? ' disabled' : '') + '><span class="shape">'""",
           """      const st = answered && !gone ? (mine === i ? 'picked' : 'dim') : '';
      return '<button class="' + cls + '" data-c="' + i + '" data-bk="op' + i + '" data-bv="' + st + '"' + (st ? ' data-ba="' + (st === 'picked' ? 'pickIn' : 'dimIn') + '"' : '') + (answered || gone ? ' disabled' : '') + '><span class="shape">'""")
# vrata na mobitelu
s = rep(s, """          return '<button class="door-btn o' + i + cls + '" data-v="' + i + '"'""",
           """          const dst = !res && mine !== -1 ? (mine === i ? 'picked' : 'dim') : '';
          return '<button class="door-btn o' + i + cls + '" data-v="' + i + '" data-bk="dv' + i + '" data-bv="' + dst + '"' + (dst ? ' data-ba="' + (dst === 'picked' ? 'pickIn' : 'dimIn') + '"' : '')""")
# kartice moći
s = rep(s, """    const card = (k, cls, tag) => '<' + tag + ' class="pw-card ' + (POWERS[k].atk ? 'atk' : 'buff') + (cls || '') + '"'""",
           """    const card = (k, cls, tag) => '<' + tag + ' class="pw-card ' + (POWERS[k].atk ? 'atk' : 'buff') + (cls || '') + '" data-bk="pw' + k + '" data-bv="' + (cls || '') + '"' + (/sel/.test(cls || '') ? ' data-ba="pickIn"' : /dim/.test(cls || '') ? ' data-ba="dimIn"' : '')""")
# novi korak unutar faze: lagani ulaz sadržaja
s = rep(s, """    const headH = (t, sub) => '<div class="pw-head"><div class="p-title">' + t + '</div>""",
           """    const headH = (t, sub) => '<i hidden data-bk="pwss" data-bv="' + t + '" data-ba="subIn" data-bt="app"></i><div class="pw-head"><div class="p-title">' + t + '</div>""")
s = rep(s, """    const top = '<div class="bet">""", """    const top = '<i hidden data-bk="betss" data-bv="' + (L.sent || me.ok ? 'done' : 'pick') + '" data-ba="subIn" data-bt="app"></i><div class="bet">""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('motion 2 OK')

# ---- HUD: bodovi se odbroje kad "+N" doleti ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """'</span><span data-bk="hud">' + (d.fin""", """'</span><span data-bk="hud"' + (d.ph === 'reveal' && me.g > 0 ? ' data-ck="hud" data-cu="' + (me.sc - me.g - (me.br || 0)) + '" data-to="' + me.sc + '" data-suf=" b" data-cud="2150" data-cdur="500"' : '') + '>' + (d.fin""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('hud OK')

# ---- poruke stanja ulaze glatko ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
assert s.count("""      '<div class="waiting">' + (answered ? 'Odgovor zaprimljen ✔'""") == 2
s = s.replace("""      '<div class="waiting">' + (answered ? 'Odgovor zaprimljen ✔'""", """      '<div class="waiting" data-bk="qwait" data-ba="subIn">' + (answered ? 'Odgovor zaprimljen ✔'""")
s = rep(s, """(res ? '' : '<div class="p-sub">' + (mine !== -1 ? 'Glas zaprimljen ✔'""", """(res ? '' : '<div class="p-sub" data-bk="vwait" data-ba="subIn">' + (mine !== -1 ? 'Glas zaprimljen ✔'""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('poruke OK')

# ---- zvukovi krčme (prave datoteke) i glazba ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
import os as _os
_names = sorted(f[:-4] for f in _os.listdir(SP + '/audio') if f.endswith('.mp3') and f != 'music.mp3')
s = rep(s, "    const AUDIO_FILES = [];", "    const AUDIO_FILES = " + repr(_names).replace("'", '"') + ";")
s = rep(s, "    const VOL = { tap: 0.35, tick: 0.5, confirm: 0.7, score: 0.7, correct: 0.85, wrong: 0.7, step: 0.8, victory: 1, fanfare: 1 };",
           "    // datoteke su već ujednačene po glasnoći; ovdje samo fino podešavanje\n    const VOL = { tap: 0.7, tick: 0.6, pop: 0.8, whoosh: 0.7 };\n    const fileOf = (n) => (AUDIO_FILES.indexOf(n) >= 0 ? n : ALIAS[n] && AUDIO_FILES.indexOf(ALIAS[n]) >= 0 ? ALIAS[n] : null);\n    let preloaded = false;")
s = rep(s, """          if (bufs[n] && playBuf(n)) return;
          load(n);""", """          const f = fileOf(n);
          if (f && bufs[f] && playBuf(f)) return;
          if (f) load(f);""")
s = rep(s, "      unlock() { ac(); },", "      unlock() { const c = ac(); if (c && !preloaded) { preloaded = true; AUDIO_FILES.forEach(load); } },")
# glazba: petlja iz datoteke (lutnja, blokflauta, bodhran); sintetizirana samo dok se ne učita
s = rep(s, "    function want(play) {\n      const c = play ? SFX.ctx() : null;", r"""    let mbuf = null, mload = false, msrc = null, mgain = null;
    function loadMusic(c) {
      if (mload || !window.fetch || location.protocol === 'file:') return; mload = true;
      fetch('audio/music.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
        .then((b) => { mbuf = b; if (playing) { stopSynth(); startBuf(c); } }).catch(() => {});
    }
    function stopSynth() { clearInterval(timer); timer = null; if (gain) { const c = SFX.ctx(); gain.gain.setTargetAtTime(0, c.currentTime, 0.3); } }
    function startBuf(c) {
      if (!mgain) { mgain = c.createGain(); mgain.gain.value = 0; mgain.connect(c.destination); }
      if (msrc) { try { msrc.stop(); } catch (e) {} }
      msrc = c.createBufferSource(); msrc.buffer = mbuf; msrc.loop = true; msrc.connect(mgain); msrc.start();
      mgain.gain.cancelScheduledValues(c.currentTime); mgain.gain.setTargetAtTime(0.34, c.currentTime, 0.6);
    }
    function want(play) {
      const c = play ? SFX.ctx() : null;
      if (c) loadMusic(c);
      if (play && c && c.state === 'running' && !playing && mbuf) { playing = true; startBuf(c); return; }
      if (!play && playing && msrc) {
        playing = false; const cc = SFX.ctx(); const src = msrc; msrc = null;
        if (cc && mgain) mgain.gain.setTargetAtTime(0, cc.currentTime, 0.2);
        setTimeout(() => { try { src.stop(); } catch (e) {} }, 900);
        return;
      }""")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('zvukovi OK')

# ---- glasanje → odabir: sat i podnaslov ostaju na mjestu (ništa se ne pomiče) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, """(res ? '' : '<div class="p-sub" data-bk="vwait" data-ba="subIn">' + (mine !== -1 ? 'Glas zaprimljen ✔' : 'Glasaj za pitanje koje želiš.') + '</div>') + '</div>' + (res ? '' : timerHtml()) +""",
           """'<div class="p-sub" data-bk="vwait" data-ba="subIn">' + (res ? (d.tie ? '<span' + (rl ? ' class="rl-post" style="--rd:' + rl.R + 'ms"' : '') + '>Neriješeno! Odlučio je ždrijeb.</span>' : 'Kreće pitanje…') : mine !== -1 ? 'Glas zaprimljen ✔' : 'Glasaj za pitanje koje želiš.') + '</div></div>' + (res ? '<div class="timer spent" aria-hidden="true"><div></div></div>' : timerHtml()) +""")
s = rep(s, """          (res && d.tie ? '<div class="waiting' + (rl ? ' rl-post' : '') + '"' + (rl ? ' style="--rd:' + rl.R + 'ms"' : '') + '>Neriješeno! Odlučio je ždrijeb.</div>' : '') +""", "")
s = rep(s, "tvTop(d, label) + (d.ph === 'vote' ? timerHtml() : '')", "tvTop(d, label) + (d.ph === 'vote' ? timerHtml() : '<div class=\"timer spent\" aria-hidden=\"true\"><div></div></div>')")
i = s.index('</style>'); s = s[:i] + "  .timer.spent > div { width: 0 !important; }\n" + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('vrata bez pomaka OK')

# ---- otkrivanje: likovi odšeću do odabranog odgovora, svjetlo se vrti (kolo sreće) i stane na točnom ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/wheel.css', encoding='utf-8').read() + s[i:]
# sve kasnije animacije otkrivanja pomaknute za trajanje šetnje i kola (--rvo)
for a in ["animation-delay: calc(1650ms - var(--el)); }", "animation-delay: calc(1800ms - var(--el)); align-items: stretch; }",
          "animation-delay: calc(700ms - var(--el)); }", "animation-delay: calc(2500ms - var(--el)); }", "animation-delay: calc(950ms - var(--el)); }",
          "animation-delay: calc(1100ms - var(--el)); }"]:
    s = rep(s, a, a.replace(" - var(--el))", " + var(--rvo, 0ms) - var(--el))"))
assert s.count("animation: rvPop 0.45s ease-out both; animation-delay: calc(250ms - var(--el)); }") == 2
s = s.replace("animation: rvPop 0.45s ease-out both; animation-delay: calc(250ms - var(--el)); }", "animation: rvPop 0.45s ease-out both; animation-delay: calc(250ms + var(--rvo, 0ms) - var(--el)); }")
s = rep(s, "  function rankStat(d, me) {", r"""  // kolo sreće za otkrivanje odgovora: vrijeme šetnje, okretanja i otkrivanja (ms od početka faze)
  const WH = { walk: 1300, spin: 2300 };
  WH.end = WH.walk + WH.spin;
  function wheel(d) {
    const n = d.q.o.length, R = WH.spin, D = R + 600, steps = [];
    for (let t = 60, gap = 70; t < R - 100; t += gap, gap = Math.min(420, gap * 1.13)) steps.push(t);
    const k0 = steps.length, at = (k) => ((((d.cor - (k0 - 1 - k)) % n) + n) % n);
    const pc = (ms) => (Math.max(0, Math.min(D, ms)) / D * 100).toFixed(2) + '%';
    let css = '';
    for (let j = 0; j < n; j++) {
      let kf = '0%{opacity:0}';
      steps.forEach((st, k) => {
        if (at(k) !== j) return;
        const e = k + 1 < k0 ? steps[k + 1] : R;
        kf += pc(st - 25) + '{opacity:0}' + pc(st) + '{opacity:1}' + (k + 1 < k0 ? pc(e + 80) + '{opacity:0}' : pc(R + 350) + '{opacity:1}100%{opacity:0}');
      });
      if (!/100%/.test(kf)) kf += '100%{opacity:0}';
      css += '@keyframes wh' + d.s + 'x' + j + '{' + kf + '}';
    }
    return { css, steps, D, spot: (i) => '<i class="spot whs" style="animation:wh' + d.s + 'x' + i + ' ' + D + 'ms linear both;animation-delay:calc(' + WH.walk + 'ms - var(--el, 0ms))"></i>' };
  }
  function walkers(d, i, tv) {
    const who = d.P.filter((p) => p.ch === i);
    if (!who.length) return '';
    return '<span class="rv-who">' + who.map((p) => {
      const k = d.P.indexOf(p), wx = Math.round((k - (d.P.length - 1) / 2) * (tv ? 140 : 60));
      return '<span class="walker' + (p.id === PID ? ' me' : '') + '" title="' + esc(p.n) + '" style="--wx:' + wx + 'px;--wd:' + (k * 90) + 'ms"><span class="wbob">' + avSvg(p.a, 'idle') + '</span></span>';
    }).join('') + '</span>';
  }
  let wheelStep = -1;
  function wheelSound(d, fin) {
    if (wheelStep === d.s) return; wheelStep = d.s;
    const el = Math.max(0, d.dur - d.ms), w = wheel(d);
    if (el < 300) AUDIO.play('whoosh');
    w.steps.forEach((t) => { const at = WH.walk + t - el; if (at > 0) setTimeout(() => { if (wheelStep === d.s) AUDIO.play('tap'); }, at); });
    const end = WH.end - el; setTimeout(() => { if (wheelStep === d.s) fin(); }, Math.max(0, end + 40));
  }
  function rankStat(d, me) {""")
# kontejner otkrivanja dobiva pomak i stil kola
s = rep(s, """    return '<div class="rv" style="--el:' + el + 'ms">' +
      '<div class="rv-a">' + qTextHtml(d, false)""", """    const wh = wheel(d);
    return '<style>' + wh.css + '</style><div class="rv wheel" style="--el:' + el + 'ms;--rvo:' + WH.end + 'ms;--rvw:' + WH.walk + 'ms">' +
      '<div class="rv-a">' + qTextHtml(d, false)""")
s = rep(s, """          h = tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + '<div class="tv-mid"><div class="rv" style="--el:' + el + 'ms">' +""",
           """          h = '<style>' + wheel(d).css + '</style>' + tvTop(d, '<span class="pill">' + esc(d.q.c) + '</span>') + '<div class="tv-mid"><div class="rv wheel" style="--el:' + el + 'ms;--rvo:' + WH.end + 'ms;--rvw:' + WH.walk + 'ms">' +""")
# opcije: svjetlo i likovi
s = rep(s, """      return '<div class="' + (tv ? 'opt' : 'p-opt') + ' o' + i + c + '"><span class="shape">' + SHAPES[i] + '</span><span class="' + (tv ? 'txt' : 'otxt') + '">' + esc(o) + '</span>'""",
           """      const wh = d.ph === 'reveal';
      return '<div class="' + (tv ? 'opt' : 'p-opt') + ' o' + i + c + '">' + (wh ? wheel(d).spot(i) : '') + '<span class="shape">' + SHAPES[i] + '</span><span class="' + (tv ? 'txt' : 'otxt') + '">' + esc(o) + '</span>' + (wh ? walkers(d, i, tv) : '')""")
# bodovi, ljestvica i let bodova kreću nakon kola
s = rep(s, "    const delay = el > 2400 ? -1 : Math.max(0, 1950 - el);", "    const off = d.ph === 'reveal' ? WH.end : 0, delay = el > 2400 + off ? -1 : Math.max(0, 1950 + off - el);")
s = rep(s, "    return { html: miniBoard(d, delay < 0 ? true : 2000)", "    return { html: miniBoard(d, delay < 0 ? true : 2000 + off)")
s = rep(s, "    }, 1500);\n", "    }, 1500 + WH.end);\n")
s = rep(s, """data-suf=" b" data-cud="2150" data-cdur="500\"""", """data-suf=" b" data-cud="' + (2150 + WH.end) + '" data-cdur="500\"""")
# zvuk: kucanje kola, zatim točno / netočno
s = rep(s, "      case 'reveal': case 'sortReveal': case 'linkReveal': return SFX.play('correct');", "      case 'reveal': return wheelSound(d, () => SFX.play('correct'));\n      case 'sortReveal': case 'linkReveal': return SFX.play('correct');")
s = rep(s, "      case 'reveal': if (me.ch === d.cor) { AUDIO.play('correct'); HAPTIC.confirm(); } else { AUDIO.play('wrong'); HAPTIC.error(); } return;",
           "      case 'reveal': return wheelSound(d, () => { if (me.ch === d.cor) { AUDIO.play('correct'); HAPTIC.confirm(); } else { AUDIO.play('wrong'); HAPTIC.error(); } });")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('kolo OK')

# ---- zvučne datoteke se ne dohvaćaju s file:// (lokalni test) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      const c = ac(); if (!c || !window.fetch) return;\n      fetch('audio/' + n + '.mp3')", "      const c = ac(); if (!c || !window.fetch || location.protocol === 'file:') return;\n      fetch('audio/' + n + '.mp3')")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('audio file OK')

# ---- raspored: bez globalnog smanjivanja; predvorje s vlastitim pomicanjem popisa; pozivnica kao zaseban prozor ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/layout2.css', encoding='utf-8').read() + s[i:]
# fitScreen više ništa ne smanjuje (samo uklanja eventualni stari zoom)
s = rep(s, """    A.style.zoom = '';
    let sh = se.scrollHeight;
    if (sh <= ih + 1) return;""", """    A.style.zoom = '';
    return; // namjerno: više sadržaja = pomicanje, ne smanjivanje cijelog sučelja
    let sh = se.scrollHeight;
    if (sh <= ih + 1) return;""")
# pozivnica: gumb s kodom sobe + zaseban prozor s velikim QR-om
s = rep(s, """          const open = L.inv !== undefined ? L.inv : d.P.length < 2, qr = qrSvg(appUrl() + '#' + d.code);
          invite = '<button class="btn ghost lob-toggle" id="lobInv" aria-expanded="' + open + '">' + (open ? 'Sakrij pozivnicu' : 'Pozovi igrače') + '</button>' +
            (open ? '<div class="lob-invite"><span class="lob-code-l">Kod sobe</span><span class="lob-code">' + esc(d.code) + '</span>' + (qr ? '<div class="lob-qr">' + qr + '</div>' : '') +
              '<span class="lob-addr">Skeniraj QR ili otvori ' + esc(location.host + location.pathname.replace(/index\\.html$/, '')) + ' i upiši kod.</span></div>' : '');""",
"""          const open = !!L.inv, qr = open ? qrSvg(appUrl() + '#' + d.code) : '';
          invite = '<button class="btn ghost lob-toggle" id="lobInv" aria-haspopup="dialog" aria-expanded="' + open + '">Pozovi igrače <span class="lob-chip">Kod <b class="lob-code">' + esc(d.code) + '</b></span></button>' +
            (open ? '<div class="inv-modal" id="invModal" role="dialog" aria-modal="true" aria-label="Pozivnica"><div class="inv-card"><span class="lob-code-l">Kod sobe</span><span class="inv-code">' + esc(d.code) + '</span>' + (qr ? '<div class="lob-qr inv-qr">' + qr + '</div>' : '') +
              '<span class="lob-addr">Skeniraj QR ili otvori ' + esc(location.host + location.pathname.replace(/index\\.html$/, '')) + ' i upiši kod.</span><button class="btn lob-cta" id="invClose">Zatvori</button></div></div>' : '');""")
s = rep(s, "    bind('lobInv', () => { L.inv = !(L.inv !== undefined ? L.inv : d.P.length < 2); phoneRender(true); });",
           """    bind('lobInv', () => { L.inv = true; phoneRender(true); });
    bind('invClose', () => { L.inv = false; phoneRender(true); });
    { const m = document.getElementById('invModal'); if (m) m.onclick = (e) => { if (e.target === m) { L.inv = false; phoneRender(true); } }; }
    // predvorje: popis igrača se pomiče sam za sebe; pamti položaj i pokaži da ima još redova
    { const lp = $app.querySelector('.lob-players');
      if (lp) { const upd = () => lp.classList.toggle('more', lp.scrollTop + lp.clientHeight < lp.scrollHeight - 4); lp.scrollTop = L.lobSc || 0; lp.onscroll = () => { L.lobSc = lp.scrollTop; upd(); }; upd(); } }""")
s = rep(s, "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);\n    fitScreen();", "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);\n    $app.classList.toggle('lobfit', !!d && d.ph === 'lobby');\n    fitScreen();")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('raspored OK')

# ---- tajni paktovi: sučelje (privatna traka, ponude, šapat, izdaja, javni događaji) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/pact.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const CONT = {", "  let PV = null;\n" + open(SP + '/v4/pact-ui.js', encoding='utf-8').read() + "  const CONT = {")
import re as _re
_m = _re.search(r"\n    const head = me \? '<div class=\"p-top\">[^\n]*\+ '</span></div>' : '';\n", s)
assert _m, 'head'
_line = _m.group(0)
s = s.replace(_line, _line.replace("const head = me ?", "const head = pactHead(d, me, me ?").replace("+ '</span></div>' : '';\n", "+ '</span></div>' : '');\n"))
s = rep(s, "  function applyState(d) {\n", "  function applyState(d) {\n    if (d && 'pv' in d) PV = d.pv || null;\n")
s = rep(s, "    return JSON.stringify([d.ph, d.s, me, d.cats,", "    return JSON.stringify([PV ? JSON.stringify(PV, (k, v) => (k === 'ms' ? Math.ceil(v / 1000) : v)) : 0, d.news ? d.news.id : 0, d.bt ? d.bt.id : 0, d.ph, d.s, me, d.cats,")
s = rep(s, "  function bindPhone(d, me) {\n", "  function bindPhone(d, me) {\n    if (d) { bindPact(d); pactToasts(d); }\n")
# događaji: mobitel i TV
s = rep(s, "      case 'moment': h = center(head + momentHtml(d, d.mo)); break;", "      case 'moment': h = center(head + momentHtml(d, d.mo)); break;\n      case 'betray': h = head + betrayHtml(d, false); break;\n      case 'loyal': h = head + loyalHtml(d, false); break;")
s = rep(s, "      case 'moment': h = tvTop(d, 'Krčma pamti') + momentHtml(d, d.mo); break;", "      case 'moment': h = tvTop(d, 'Krčma pamti') + momentHtml(d, d.mo); break;\n      case 'betray': h = tvTop(d, 'Krčma je vidjela sve') + betrayHtml(d, true) + '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>'; if (d.news) pactToasts(d); break;\n      case 'loyal': h = tvTop(d, 'Prije finala') + loyalHtml(d, true) + '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>'; break;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('paktovi UI OK')

# ---- paktovi: zvuk događaja, glasine na TV-u, prekidač u predvorju ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');\n      case 'howto': return AUDIO.play('whoosh');\n      case 'order': case 'hilo': case 'blitz': case 'maj': return AUDIO.play('pop');\n      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': return AUDIO.play(me.g",
           "      case 'betray': case 'loyal': return betraySound(d);\n      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');\n      case 'howto': return AUDIO.play('whoosh');\n      case 'order': case 'hilo': case 'blitz': case 'maj': return AUDIO.play('pop');\n      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': return AUDIO.play(me.g")
s = rep(s, "      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');\n      case 'howto': return AUDIO.play('whoosh');\n      case 'order': case 'hilo': case 'blitz': case 'maj': return AUDIO.play('pop');\n      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': case 'majReveal': return AUDIO.play('correct');",
           "      case 'betray': case 'loyal': return betraySound(d);\n      case 'moment': return AUDIO.play((d.mo && d.mo.snd) || 'stingSmall');\n      case 'howto': return AUDIO.play('whoosh');\n      case 'order': case 'hilo': case 'blitz': case 'maj': return AUDIO.play('pop');\n      case 'orderReveal': case 'hiloReveal': case 'blitzReveal': case 'majReveal': return AUDIO.play('correct');")
s = rep(s, "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);\n    fitScreen();", "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);\n    fitScreen();\n    pactToasts(d);")
s = s.replace("+ '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>'; if (d.news) pactToasts(d); break;", "+ '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>'; break;")
# predvorje (mobitel): prekidač za domaćina, informacija za ostale
s = rep(s, "  function botStepper(d) {", """  function pactToggle(d) {
    if (!d.opt) return '';
    if (!game) return d.opt.pacts ? '<div class="lob-info">🍻 Tajni paktovi su uključeni (od 3 prava igrača)</div>' : '';
    return '<div class="lob-opt"><span class="lob-opt-l">🍻 Tajni paktovi<small>Savezi, šaputanje i izdaje (od 3 prava igrača)</small></span><button class="tgl' + (d.opt.pacts ? '' : ' off') + '" data-popt="' + (d.opt.pacts ? 0 : 1) + '">' + (d.opt.pacts ? 'Uključeno' : 'Isključeno') + '</button></div>';
  }
  function bindOpt() { document.querySelectorAll('#app [data-popt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('pacts', b.dataset.popt === '1'); } }; }); }
  function botStepper(d) {""")
s = rep(s, "          cta = botStepper(d) + '<button class=\"btn lob-cta\" id=\"dstart\"' + (d.P.length < 2", "          cta = botStepper(d) + pactToggle(d) + '<button class=\"btn lob-cta\" id=\"dstart\"' + (d.P.length < 2")
s = rep(s, "          cta = '<div class=\"lob-wait\">Soba ' + esc(d.code)", "          cta = pactToggle(d) + '<div class=\"lob-wait\">Soba ' + esc(d.code)")
s = rep(s, "    if (d && d.ph === 'lobby' && game) bindBots(d);", "    if (d && d.ph === 'lobby' && game) { bindBots(d); bindOpt(); }")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('paktovi 2 OK')

# ---- piramida: uvodna animacija, napredak, pitanje za krunu ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/pyr2.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const CONT = {", open(SP + '/v4/pyr-ui.js', encoding='utf-8').read() + "  const CONT = {")
s = cut(s, "  function pyramidHtml(d, rev, o) {", "  function tvLobby(d, demoBar) {", r"""  function pyramidHtml(d, rev, o) {
    o = o || {};
    const el = Math.max(0, d.dur - d.ms), base = o.delay || 0, intro = d.ph === 'fstart';
    let rows = '', mvIdx = 0;
    for (let s = d.steps; s >= 0; s--) {
      const w = s === 0 ? 100 : 100 - (s - 1) * (59 / Math.max(1, d.steps - 1));
      const here = d.P.filter((p) => (p.st || 0) === s).map((p) => {
        // uvod: svi kreću iz podnožja i penju se stepenicu po stepenicu kad im završi brojanje bodova
        const mv = intro ? (p.st || 0) : p.mv, go = (rev || intro) && mv;
        const cd = intro ? fsEnd(d, p) : go ? base + (mvIdx++) * 90 : 0;
        const mood = intro ? (el > fsEnd(d, p) + 300 && p.st ? 'happy' : 'idle') : rev ? (p.mv ? (s >= d.steps ? 'victory' : 'happy') : 'sad') : p.top ? 'victory' : '';
        const prg = p.fr > 1 && p.fp > 0 && !p.top ? '<span class="prg">' + p.fp + '/' + p.fr + '</span>' : '';
        return '<span class="climber' + (go ? ' go' + (intro ? ' walk' : '') : '') + (p.top ? ' ontop' : '') + (p.id === PID ? ' me' : '') + '" style="--mv:' + (mv || 0) + ';--cd:' + cd + 'ms;--el:' + (go ? el : 0) + 'ms">' +
          (go && !intro ? '<span class="up">' + (s >= d.steps ? '👑' : '+' + p.mv) + '</span>' : '') + (o.you && p.id === PID && !go ? '<span class="tag-you">Ti</span>' : '') +
          avSvg(p.a, mood) + prg + '<span class="cn">' + esc(p.n) + '</span></span>';
      }).join('');
      rows += '<div class="pstep' + (s === 0 ? ' base' : '') + (s === d.steps ? ' top crown' : '') + (s === d.steps - 1 ? ' summit' : '') + '" style="width:' + w.toFixed(1) + '%"><span class="lv">' + (s === d.steps ? '👑' : s) + '</span><span class="here">' + here + '</span></div>';
    }
    return '<div class="pyramid' + (intro ? ' intro' : '') + '">' + rows + '</div>';
  }

""")
# TV: uvod
s = cut(s, "      case 'fstart': {\n        const rows = d.P.slice().sort((a, b) => b.fs - a.fs", "      case 'fq': case 'fr': {", r"""      case 'fstart': {
        h = tvTop(d, 'Bodovi iz kviza određuju početak') +
          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="tv-title">Tko kreće odakle?</div>' + fsRows(d) +
          '<div class="tie-note">Start: poredak + razlika u bodovima (najviše 4 koraka napretka). Gore je teže: od 4. stepenice svaka traži 2 točna. Na vrhu čeka pitanje za krunu.</div>' +
          '<div class="actions"><button class="btn ghost" id="skip">Dalje ▶</button></div></div>' + pyramidHtml(d, false) + '</div>';
        break;
      }
""")
# TV: pitanje (točno/netočno ili za krunu)
s = rep(s, """        const tf = d.q.o.map((o, i) => '<div class="opt o' + (i === 0 ? 3 : 0) + (rev ? (i === d.cor ? ' correct' : ' dim') : '') + '" style="justify-content:center"><span class="txt" style="text-align:center">' + esc(o) + '</span></div>').join('');
        h = tvTop(d, 'Točno ili netočno? Točan odgovor = stepenica više, najbrži = dvije!') + (rev ? '' : timerHtml(3000)) +
          '<div class="finale-q"><div class="tv-mid" style="justify-content:center"><div class="q-text">' + esc(d.q.t) + '</div><div class="tf-row">' + tf + '</div>'""",
"""        const cr = !!d.crown;
        const tf = d.q.o.map((o, i) => '<div class="opt o' + (cr ? i : i === 0 ? 3 : 0) + (rev ? (i === d.cor ? ' correct' : ' dim') : '') + '"' + (cr ? '' : ' style="justify-content:center"') + '>' + (cr ? '<span class="shape">' + SHAPES[i] + '</span>' : '') + '<span class="txt"' + (cr ? '' : ' style="text-align:center"') + '>' + esc(o) + '</span></div>').join('');
        const tops = d.P.filter((p) => p.top).map((p) => p.n);
        h = tvTop(d, cr ? '👑 Pitanje za krunu! ' + esc(tops.join(' i ')) + (tops.length > 1 ? ' — točan i brži pobjeđuje' : ' — točan odgovor = pobjeda') : 'Točno ili netočno? Točan = napredak, najbrži +1, svaki 3. zaredom +1') + (rev ? '' : timerHtml(3000)) +
          '<div class="finale-q' + (cr ? ' crownq' : '') + '"><div class="tv-mid" style="justify-content:center">' + (cr ? '<div class="crown-k">' + esc(d.q.c) + '</div>' : '') + '<div class="q-text">' + esc(d.q.t) + '</div><div class="' + (cr ? 'opts' : 'tf-row') + '">' + tf + '</div>'""")
# mobitel: uvod
s = cut(s, "      case 'fstart': {\n        const ahead = d.P.filter((p) => p.fs > me.fs).length;", "      case 'fq': h = head + finalePhone(d, me); break;", r"""      case 'fstart': {
        const el = Math.max(0, d.dur - d.ms);
        h = head + '<div class="fs" style="--el:' + el + 'ms;--fe:' + fsEnd(d, me) + 'ms"><div class="p-title">Tko kreće odakle?</div>' + fsRows(d) +
          '<div class="fs-me">Krećeš s: <b>' + esc(fsLabel(me)) + '</b></div><div class="phone-pyr big">' + pyramidHtml(d, false, { you: true }) + '</div></div>';
        break;
      }
""")
# mobitel: pitanje u finalu
s = rep(s, """    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + (i === 0 ? 3 : 0) + (locked ? ' locked' : '') + (answered ? (mine === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '><span class="otxt">' + optText""",
           """    const cr = !!d.crown;
    const opts = d.q.o.map((o, i) => '<button class="p-opt o' + (cr ? i : i === 0 ? 3 : 0) + (locked ? ' locked' : '') + (answered ? (mine === i ? ' picked' : ' dim') : '') + '" data-c="' + i + '"' + (answered ? ' disabled' : '') + '>' + (cr ? '<span class="shape">' + SHAPES[i] + '</span>' : '') + '<span class="otxt">' + optText""")
s = rep(s, """    return timerHtml(3000) + (d.ntv ? '<div class="phone-pyr compact">' + pyramidHtml(d, false, { you: true }) + '</div>' : '') +
      '<div class="p-q" style="font-size:1.6rem;text-align:center">' + esc(d.q.t) + '</div>' + (buffs ? '<div class="buffs">' + buffs + '</div>' : '') + hit +
      '<div class="q-area"><div class="p-opts two">' + opts + '</div>'""", """    return timerHtml(3000) + (d.ntv && !cr ? '<div class="phone-pyr compact">' + pyramidHtml(d, false, { you: true }) + '</div>' : '') +
      (cr ? '<div class="crown-k">' + (me.top ? '👑 Tvoje pitanje za krunu!' : '👑 Netko je na vrhu — pitanje za krunu') + '</div>' : '<div class="fin-prog">' + esc(progTxt(d, me)) + '</div>') +
      '<div class="p-q" style="' + (cr ? '' : 'font-size:1.6rem;') + 'text-align:center">' + esc(d.q.t) + '</div>' + (buffs ? '<div class="buffs">' + buffs + '</div>' : '') + hit +
      '<div class="q-area"><div class="p-opts' + (cr ? '' : ' two') + '">' + opts + '</div>'""")
s = rep(s, "✖️2 Stepenica više<", "✖️2 Dodatni napredak<")
# mobitel: rezultat pitanja u finalu
s = rep(s, """        const tf = '<div class="rv-opts two">' + d.q.o.map((o, i) => '<div class="p-opt o' + (i === 0 ? 3 : 0) +""", """        const tf = '<div class="rv-opts' + (d.crown ? '' : ' two') + '">' + d.q.o.map((o, i) => '<div class="p-opt o' + (d.crown ? i : i === 0 ? 3 : 0) +""")
s = rep(s, """        const note = ok ? (me.mv > 1 ? 'Točno! +' + me.mv + ' stepenice' : 'Točno! +1 stepenica') : mine >= 0 ? 'Netočno · ostaješ na mjestu' : 'Vrijeme je isteklo';""",
           """        const wasTop = d.crown && (me.top || me.st >= d.steps);
        const note = me.st >= d.steps ? '👑 KRUNA JE TVOJA!' : wasTop ? (mine >= 0 ? 'Kruna izmiče! Ostaješ na vrhu — nova prilika u sljedećem pitanju.' : 'Vrijeme je isteklo · ostaješ na vrhu') :
          ok ? 'Točno! +' + (me.ug || 1) + ' napretka' + (me.sk ? ' (niz od 3!)' : '') + (me.mv ? ' · stepenica ' + me.st : '') + (me.top ? ' · 👑 na vrhu!' : '') : mine >= 0 ? 'Netočno · napredak ostaje' : 'Vrijeme je isteklo';""")
s = s.replace("pyramidHtml(d, true, { delay: 2000, you: true }) + '</div>' : stepMeter(d, me))", "pyramidHtml(d, true, { delay: 2000, you: true }) + '</div>' + '<div class=\"p-sub\">' + esc(progTxt(d, me)) + '</div>' : progMeter(d, me))")
s = rep(s, "'Korak ' + (me.st || 0) + '/' + d.steps", "(me.top ? '👑 Vrh' : 'Stepenica ' + (me.st || 0) + '/' + (d.steps - 1))")
# zvuk uvoda
s = rep(s, "      case 'intro': case 'fstart': return SFX.play('whoosh');", "      case 'intro': return SFX.play('whoosh');\n      case 'fstart': return fstartSound(d);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('piramida UI OK')

# ---- piramida: zvuk uvoda i na mobitelu bez TV-a ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      case 'bet': return SFX.play('pop');\n      case 'voteResult': if (d.ntv && d.tb) rouletteSound(d); return;", "      case 'bet': return SFX.play('pop');\n      case 'fstart': if (d.ntv) fstartSound(d); return;\n      case 'voteResult': if (d.ntv && d.tb) rouletteSound(d); return;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('fstart zvuk OK')

# ---- mobitel: osvježi i tijekom pitanja kad drugi odgovore (iz Codex grane) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, ": d.ph === 'duel' ? d.P.map((p) => [p.id, p.ok]) : null;", ": ['duel', 'question', 'fq'].includes(d.ph) ? d.P.map((p) => [p.id, p.a, p.ok]) : null;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('phoneSig roster OK')

# ---- KEEP: bez titranja animacija pri ponovnom iscrtavanju iste faze ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  const SCENE = (() => {\n", open(SP + '/v4/keep.js', encoding='utf-8').read() + "  const SCENE = (() => {\n")
s = rep(s, "    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);", "    KEEP.grab(fresh);\n    SCENE.swap(demoBar + h, fresh, 't:' + d.ph);")
s = rep(s, "    MOTION.after('t:' + d.ph + ':' + d.s);\n", "    MOTION.after('t:' + d.ph + ':' + d.s);\n    KEEP.put();\n")
s = rep(s, "    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);", "    KEEP.grab(freshP);\n    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);")
s = rep(s, "    MOTION.after('p:' + d.ph + ':' + d.s);\n", "    MOTION.after('p:' + d.ph + ':' + d.s);\n    KEEP.put();\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KEEP OK')

# ---- izrazi lica: animacija kreće kad se izraz pojavi (ne od početka faze); nastavak čuva KEEP ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + "  /* izrazi likova */\n  .spr.m-happy, .spr.m-sad, .spr.m-shocked, .spr.m-attack, .spr.m-victory { animation-delay: 0ms; }\n" + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('mood delay OK')

# ---- tempo otkrivanja: vremenske točke šalje domaćin (d.tl = [šetnja, kolo]); bez njih vrijedi WH ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  WH.end = WH.walk + WH.spin;\n", "  WH.end = WH.walk + WH.spin;\n  // vremenska crta otkrivanja za ovu fazu (domaćin određuje tempo: obično / napeto / dramatično)\n  function whT(d) { const t = d && d.ph === 'reveal' && d.tl; return t ? { walk: +t[0], spin: +t[1], end: +t[0] + +t[1] } : WH; }\n")
s = rep(s, "    const n = d.q.o.length, R = WH.spin, D = R + 600, steps = [];\n    for (let t = 60, gap = 70; t < R - 100; t += gap, gap = Math.min(420, gap * 1.13)) steps.push(t);",
           "    const T = whT(d), n = d.q.o.length, R = T.spin, D = R + 600, steps = [];\n    // dulje kolo = sporije zaustavljanje (veći zadnji razmaci), kraće kolo = brži prolaz kroz početak\n    const cap = Math.max(320, Math.min(600, R * 0.17));\n    for (let t = 60, gap = 70; t < R - 100; t += gap, gap = Math.min(cap, gap * 1.13)) steps.push(t);")
s = rep(s, "animation-delay:calc(' + WH.walk + 'ms - var(--el, 0ms))\"></i>' };", "animation-delay:calc(' + T.walk + 'ms - var(--el, 0ms))\"></i>' };")
s = rep(s, "    const el = Math.max(0, d.dur - d.ms), w = wheel(d);\n", "    const el = Math.max(0, d.dur - d.ms), w = wheel(d), T = whT(d);\n")
s = rep(s, "const at = WH.walk + t - el;", "const at = T.walk + t - el;")
s = rep(s, "    const end = WH.end - el; setTimeout(", "    const end = T.end - el; setTimeout(")
# poredak: animacija premještanja se nastavlja (negativno kašnjenje) umjesto da krene ispočetka pri osvježavanju
s = rep(s, "    const off = d.ph === 'reveal' ? WH.end : 0, delay = el > 2400 + off ? -1 : Math.max(0, 1950 + off - el);\n    return { html: miniBoard(d, delay < 0 ? true : 2000 + off).replace('<div class=\"mboard', '<div data-delay=\"' + delay + '\" class=\"mboard'), lead: newLead };",
           "    const off = d.ph === 'reveal' ? whT(d).end : 0, done = el > 2550 + off, delay = done ? 'x' : 1950 + off - el;\n    return { html: miniBoard(d, done ? true : 2000 + off).replace('<div class=\"mboard', '<div data-delay=\"' + delay + '\" class=\"mboard'), lead: newLead };")
s = rep(s, "      if (dl < 0) return;\n", "      if (b.dataset.delay === 'x' || isNaN(dl)) return;\n")
s = rep(s, "  function flyPoints(s0, g) {", "  function flyPoints(s0, g, d) {")
s = rep(s, "    }, 1500 + WH.end);", "    }, 1500 + whT(d).end);")
s = rep(s, "flyPoints(L.s, me.g);", "flyPoints(L.s, me.g, d);")
s = s.replace("--rvo:' + WH.end + 'ms;--rvw:' + WH.walk + 'ms", "--rvo:' + whT(d).end + 'ms;--rvw:' + whT(d).walk + 'ms")
s = rep(s, "data-cud=\"' + (2150 + WH.end) + '\"", "data-cud=\"' + (2150 + whT(d).end) + '\"")
assert 'WH.walk + t' not in s and s.count('WH.') == 3, s.count('WH.')
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('tempo UI OK')

# ---- krčma 2.0: jačine prikaza, usklađen zvuk i kartica s kolom, napomene dvoboja ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/td2.css', encoding='utf-8').read() + s[i:]
s = rep(s, "    return '<div class=\"tdl' + (m.t === 'Krčma pamti' ? ' mem' : '') + '\" style=\"--el:' + el + 'ms\">",
           "    const lv = m.lv === 3 ? ' lv3' : m.lv === 2 ? ' lv2' : '';\n    return '<div class=\"tdl' + (m.t === 'Krčma pamti' ? ' mem' : '') + lv + '\" data-mo=\"' + (+m.id || 0) + '\" style=\"--el:' + el + 'ms\">")
# zvuk trenutka svira kad se kartica pojavi (kod kola: nakon poretka), a ne dok se kolo još vrti
s = rep(s, "  function tdSting(d) { if (!d.mo) return; const s0 = d.s, wait = Math.max(0, 2700 - Math.max(0, d.dur - d.ms));",
           "  function tdSting(d) { if (!d.mo) return; const s0 = d.s, wait = Math.max(0, 2700 + (d.ph === 'reveal' ? whT(d).end : 0) - Math.max(0, d.dur - d.ms));")
s = rep(s, "  function duelIntroMo(d) { return { t: 'Dvoboj!', s: 'Brži točan odgovor osvaja +' + d.du.bonus,",
           "  function duelIntroMo(d) { return { t: 'Dvoboj!', s: (d.du.n ? d.du.n + ' ' : '') + 'Brži točan odgovor osvaja +' + d.du.bonus,")
s = rep(s, "      '<div class=\"du-res\">' + (w ? 'Pobjeđuje <b>' + esc(w.n) + '</b> · +' + du.bonus : 'Nema pobjednika. Nitko ne gubi bodove.') + '</div>' +",
           "      '<div class=\"du-res\">' + (w ? 'Pobjeđuje <b>' + esc(w.n) + '</b> · +' + du.bonus : 'Nema pobjednika. Nitko ne gubi bodove.') + '</div>' + (du.o ? '<div class=\"du-note\">' + esc(du.o) + '</div>' : '') +")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('krcma 2.0 UI OK')

# ---- krčma 2.0: nakon ponovnog spajanja zvuk trenutka se ne ponavlja ako je kartica već prikazana ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  function tdSting(d) { if (!d.mo) return; const s0 = d.s, wait = Math.max(0, 2700 + (d.ph === 'reveal' ? whT(d).end : 0) - Math.max(0, d.dur - d.ms));",
           "  function tdSting(d) { if (!d.mo) return; const at = 2700 + (d.ph === 'reveal' ? whT(d).end : 0), el0 = Math.max(0, d.dur - d.ms); if (el0 > at + 800) return; const s0 = d.s, wait = Math.max(0, at - el0);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('tdSting reconnect OK')

# ---- Legende ove krčme: pregled na završnom ekranu (mobitel i TV) + kartica za dijeljenje ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/leg.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const CONT = {", open(SP + '/v4/leg-ui.js', encoding='utf-8').read() + "  const CONT = {")
s = rep(s, "  function winHtml(d, tv) {\n", "  function winHtml(d, tv) {\n    const legBtn = d.lg ? '<button class=\"btn lg-open\" id=\"legOpen\">📜 Legende ove krčme</button>' : '';\n")
s = rep(s, "    const act = tv ? '<div class=\"win-act\"><button class=\"btn win-cta\" id=\"again\">Igraj ponovno</button>",
           "    const act = tv ? '<div class=\"win-act\">' + legBtn + '<button class=\"btn win-cta\" id=\"again\">Igraj ponovno</button>")
s = rep(s, "      : '<div class=\"win-act\">' + (isLocalHost() ?", "      : '<div class=\"win-act\">' + legBtn + (isLocalHost() ?")
# otvoreni pregled crta se iznad završnog ekrana (završni ekran ostaje ispod, isti kao prije)
s = rep(s, "    if (tv) return '<div class=\"winscr\"><div class=\"win-t\">Pobjednik!</div><div class=\"win-left\">' + hero + name + '</div><div class=\"win-right\">' + board + fact + '</div>' + act + '</div>';\n    return '<div class=\"winscr\"><div class=\"win-t\">Pobjednik!</div>' + hero + name + board + fact + act + '</div>';",
           "    const lgo = d.lg && LEGV.open === d.lg.id ? legHtml(d, tv) : '';\n    if (tv) return '<div class=\"winscr\"><div class=\"win-t\">Pobjednik!</div><div class=\"win-left\">' + hero + name + '</div><div class=\"win-right\">' + board + fact + '</div>' + act + '</div>' + lgo;\n    return '<div class=\"winscr\"><div class=\"win-t\">Pobjednik!</div>' + hero + name + board + fact + act + '</div>' + lgo;")
s = rep(s, "    bind('again', () => { game.restart(); });\n", "    bind('again', () => { game.restart(); });\n    bindLeg(d);\n")
s = rep(s, "    bind('dagain', () => { game.restart(); });\n", "    bind('dagain', () => { game.restart(); });\n    bindLeg(d);\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('legende UI OK')

# ---- traka/krug vremena: novo iscrtavanje kreće od točnog stanja (bez skoka na 100 % i praznog broja) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  function timerHtml(urgentAt) { return '<div class=\"timer\" id=\"timer\" data-u=\"' + (urgentAt || 3000) + '\"><div id=\"tbar\"></div></div>'; }",
           "  function timerNow() { const ms = Math.max(0, clockEnds - Date.now()); return { ms, fr: clockDur ? Math.max(0, Math.min(1, ms / clockDur)) : 1 }; }\n"
           "  function timerHtml(urgentAt) { const t = timerNow(), u = urgentAt || 3000; return '<div class=\"timer' + (clockDur && t.ms <= u ? ' urgent' : '') + '\" id=\"timer\" data-u=\"' + u + '\"><div id=\"tbar\" data-lv=\"' + (t.fr > 0.5 ? 'g' : t.fr > 0.2 ? 'a' : 'r') + '\" style=\"width:' + (t.fr * 100).toFixed(2) + '%\"></div></div>'; }")
s = rep(s, "<span id=\"tnum\"></span></div>' +\n      qTextHtml(d, false)", "<span id=\"tnum\">' + (clockDur ? Math.ceil(timerNow().ms / 1000) : '') + '</span></div>' +\n      qTextHtml(d, false)")
s = rep(s, "stroke-dasharray=\"263.9\" stroke-dashoffset=\"0\"/></svg><b id=\"tnum\"></b></span>'",
           "stroke-dasharray=\"263.9\" stroke-dashoffset=\"' + (clockDur ? (263.9 * (1 - timerNow().fr)).toFixed(1) : 0) + '\"/></svg><b id=\"tnum\">' + (clockDur ? Math.ceil(timerNow().ms / 1000) : '') + '</b></span>'")
# KEEP: igrači u traci likova razlikuju se po imenu (title), pa izraz lica ne "preskače" na drugog lika
s = rep(s, "      let s = e.id ? '#' + e.id : '';\n      for (const k of IDS)", "      let s = e.id ? '#' + e.id : '';\n      if (e.getAttribute && e.getAttribute('title')) s += '[t=' + e.getAttribute('title') + ']';\n      for (const k of IDS)")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('timer bez skoka OK')

# ---- upute: bez odbrojavanja, svatko potvrdi da je pročitao (botovi automatski) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      '<div class=\"ht-go\">Kreće za nekoliko sekundi…</div></div>';\n  }",
           "      howtoReady(d) + '</div>';\n  }\n"
           "  // tko je pročitao: mobitel ima tipku, TV i svi vide koliko je spremno\n"
           "  function howtoReady(d) {\n"
           "    const ps = d.P.filter((p) => p.c), ready = ps.filter((p) => p.ok).length;\n"
           "    const me = phoneShown() ? meOf(d) : null, mine = me && (me.ok || (L && L.sent));\n"
           "    const count = '<div class=\"ht-ready\" data-bk=\"htr\" data-bv=\"' + ready + '\">Spremno: <b>' + ready + '/' + ps.length + '</b></div>';\n"
           "    if (me && !mine) return '<button class=\"btn win-cta ht-ok\" id=\"htok\">✔ Razumijem, idemo!</button>' + count;\n"
           "    if (!me) return '<div class=\"ht-ready\" data-bk=\"htr\" data-bv=\"' + ready + '\">Spremno: <b>' + ready + '/' + ps.length + '</b> · igra kreće kad svi potvrde</div>';\n"
           "    return '<div class=\"ht-go\">Čekamo ostale…</div>' + count;\n"
           "  }")
s = rep(s, "      case 'howto': h = tvTop(d, 'Kako se igra') + timerHtml() + howtoHtml(d) + '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>'; break;",
           "      case 'howto': h = tvTop(d, 'Kako se igra') + howtoHtml(d) + '<div class=\"actions\"><button class=\"btn ghost\" id=\"skip\">Dalje ▶</button></div>'; break;")
s = rep(s, "      case 'howto': h = center(head + timerHtml() + howtoHtml(d)); break;", "      case 'howto': h = center(head + howtoHtml(d)); break;")
s = rep(s, "    bind('dagain', () => { game.restart(); });\n", "    bind('dagain', () => { game.restart(); });\n    bind('htok', () => { if (L.sent) return; L.sent = { ok: 1 }; sendInput({ ok: 1 }); phoneRender(false); });\n")
i = s.index('</style>'); s = s[:i] + "  /* upute: potvrda čitanja */\n  .ht-ok { min-height: 56px; width: 100%; max-width: 420px; margin: 14px auto 0; display: block; }\n  .ht-ready { margin-top: 8px; text-align: center; font-weight: 800; font-size: 0.95rem; color: var(--amber-hi, #ffe2a6); }\n  .tv .ht-ready { font-size: 1.3rem; }\n" + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('upute UI OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, ": ['duel', 'question', 'fq'].includes(d.ph) ? d.P.map((p) => [p.id, p.a, p.ok]) : null;", ": ['duel', 'question', 'fq', 'howto'].includes(d.ph) ? d.P.map((p) => [p.id, p.a, p.ok, p.c]) : null;")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('upute osvježavanje OK')

# ---- rivalski obračun: izazovi u traci ispod HUD-a, ishod na otkrivanju, oznaka u traci likova ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/rc.css', encoding='utf-8').read() + s[i:]
s = rep(s, "    return head + h;\n  }\n  const PACT_STEAL", "    return head + h + rcBar(d, me);\n  }\n  const PACT_STEAL")
s = rep(s, "  const PACT_STEAL = 0.25;", open(SP + '/v4/rc-ui.js', encoding='utf-8').read() + "  const PACT_STEAL = 0.25;")
s = rep(s, "    if (!me || !PV || !PACT_PH[d.ph]) return head;", "    if (!me || !PACT_PH[d.ph]) return head;\n    if (!PV) return head + rcBar(d, me);")
s = rep(s, "  function bindPact(d) {\n", "  function bindPact(d) {\n    bindRc();\n")
# prije otkrivanja: u izračunu "prije" oduzmi i obračun (poredak se animira ispravno)
for a in ["- (b.xb || 0))", "- (a.xb || 0))", "- (p.xb || 0))", "- (me.xb || 0);"]:
    n = s.count(a); assert n >= 1, a
    s = s.replace(a, a.replace('.xb || 0)', '.xb || 0) - (' + a[3:a.index('.')] + '.rx || 0)'))
s = rep(s, "(gain && p.br ? '<span class=\"betb' + (p.br < 0 ? ' neg' : '')", "(gain && p.rx ? '<span class=\"betb rcb' + (p.rx < 0 ? ' neg' : '') + '\">⚔️ ' + (p.rx > 0 ? '+' : '−') + Math.abs(p.rx) + '</span>' : '') + (gain && p.br ? '<span class=\"betb' + (p.br < 0 ? ' neg' : '')")
s = rep(s, "data-cu=\"' + (me.sc - me.g - (me.br || 0)) + '\"", "data-cu=\"' + (me.sc - me.g - (me.br || 0) - (me.rx || 0)) + '\"")
# otkrivanje: kartica obračuna (mobitel i TV); "novo vodstvo" samo kad nema drugih kartica
s = rep(s, "(d.mo ? tdLine(d) : b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.n) + '!</div>' : '')", "rcCard(d) + (d.mo ? tdLine(d) : !d.rcr && b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.n) + '!</div>' : '')")
s = rep(s, "(d.mo ? tdLine(d) : b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '')", "rcCard(d) + (d.mo ? tdLine(d) : !d.rcr && b.lead ? '<div class=\"rv-lead\">Novo vodstvo: ' + esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '')")
s = rep(s, "  function tdSting(d) { if (!d.mo) return;", "  function tdSting(d) { if (!d.mo && !d.rcr) return;")
s = rep(s, "if (s0 === d.s) AUDIO.play(d.mo.snd || 'stingSmall'); }, wait); }", "if (s0 === d.s) AUDIO.play(d.mo ? d.mo.snd || 'stingSmall' : 'stingRival'); }, wait); }")
s = rep(s, "    if (d.mo && d.ph !== 'moment') tdSting(d);", "    if ((d.mo || d.rcr) && d.ph !== 'moment') tdSting(d);", 2)
# oznaka sudionika obračuna u traci likova tijekom pitanja
s = rep(s, "<span class=\"glow\"></span>' + avSvg(p.a, mood(p)) +", "<span class=\"glow\"></span>' + avSvg(p.a, mood(p)) + (d.rc && (d.rc.a === p.id || d.rc.b === p.id) ? '<span class=\"rc-mk\" title=\"Rivalski obračun\">⚔️</span>' : '') +")
# predvorje: uključivanje/isključivanje (samo domaćin)
s = rep(s, "botStepper(d) + pactToggle(d) +", "botStepper(d) + pactToggle(d) + rcToggle(d) +")
s = rep(s, "          cta = pactToggle(d) + '<div class=\"lob-wait\">", "          cta = pactToggle(d) + rcToggle(d) + '<div class=\"lob-wait\">")
s = rep(s, "  function bindOpt() { document.querySelectorAll('#app [data-popt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('pacts', b.dataset.popt === '1'); } }; }); }",
           "  function bindOpt() { document.querySelectorAll('#app [data-popt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('pacts', b.dataset.popt === '1'); } }; });\n    document.querySelectorAll('#app [data-rcopt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('rc', b.dataset.rcopt === '1'); } }; }); }")
# osvježavanje: aktivan obračun i ishod dio su potpisa ekrana
s = rep(s, "d.hl ? 1 : 0, d.bz ? 1 : 0, d.mj]);", "d.hl ? 1 : 0, d.bz ? 1 : 0, d.mj, d.rc || 0, d.rcr ? d.rcr.id : 0, d.opt || 0]);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('obračun UI OK')

# ---- posljednji poziv: oznaka projekcije u poretku, osobna oznaka + pregled piramide na mobitelu, natpis na TV-u ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/fc.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const PACT_STEAL = 0.25;", open(SP + '/v4/fc-ui.js', encoding='utf-8').read() + "  const PACT_STEAL = 0.25;")
s = rep(s, "    return head + h + rcBar(d, me);\n  }\n", "    return head + h + rcBar(d, me) + pjChip(d, me);\n  }\n")
s = rep(s, "    if (!PV) return head + rcBar(d, me);", "    if (!PV) return head + rcBar(d, me) + pjChip(d, me);")
s = rep(s, "  function bindPact(d) {\n    bindRc();\n", "  function bindPact(d) {\n    bindRc();\n    bindPj();\n")
s = rep(s, "(p.id === PID ? '<span class=\"you\">Ti</span>' : '') + (gain && p.rx ?", "(p.id === PID ? '<span class=\"you\">Ti</span>' : '') + pjBadge(d, p.id) + (gain && p.rx ?")
s = rep(s, "'<div class=\"rv-b\"><div class=\"rv-title\">Poredak</div>' + b.html + rcCard(d)", "'<div class=\"rv-b\"><div class=\"rv-title\">Poredak</div>' + b.html + (d.pj ? '<div class=\"pj-cap\">🏆 Utrka prema piramidi · 🪜 projekcija prema trenutačnim bodovima</div>' : '') + rcCard(d)")
s = rep(s, "d.mj, d.rc || 0, d.rcr ? d.rcr.id : 0, d.opt || 0]);", "d.mj, d.rc || 0, d.rcr ? d.rcr.id : 0, d.opt || 0, d.pj || 0]);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('posljednji poziv UI OK')

# ---- Smart Game Director: kratka najava vrste izazova; ponovljene upute kraće, s gumbom za cijele ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      (h.first ? '<ol>' + h.r.map((r, i) => '<li style=\"--cd:' + (350 + i * 500) + 'ms\"><b>' + (i + 1) + '</b>' + esc(r) + '</li>').join('') + '</ol>' : '<div class=\"mg-s\">' + esc(h.r[0]) + '</div>') +",
           "      (HT_KICK[h.kd] ? '<div class=\"ht-kick\">' + HT_KICK[h.kd] + '</div>' : '') +\n"
           "      (h.first || L.htFull ? '<ol>' + h.r.map((r, i) => '<li style=\"--cd:' + (h.first ? 350 + i * 500 : 0) + 'ms\"><b>' + (i + 1) + '</b>' + esc(r) + '</li>').join('') + '</ol>' : '<div class=\"mg-s\">Podsjetnik: ' + esc(h.r[0]) + '</div>' + (phoneShown() ? '<button class=\"pk-b ht-full\" id=\"htfull\">📜 Cijele upute</button>' : '')) +")
s = rep(s, "  function howtoHtml(d) {", "  const HT_KICK = { fast: '⚡ Vrijeme je da vidimo tko najbrže razmišlja!', social: '🍻 Koliko se zapravo poznajete?', logic: '🧠 Malo logike — bez žurbe, ali i bez greške!', assoc: '🔎 Tko će prvi prepoznati?' };\n  function howtoHtml(d) {")
s = rep(s, "    bind('htok', () => {", "    bind('htfull', () => { L.htFull = 1; phoneRender(true); });\n    bind('htok', () => {")
i = s.index('</style>'); s = s[:i] + "  .ht-kick { margin: 2px 0 6px; font-weight: 800; font-size: 0.95rem; color: var(--amber-hi, #ffe2a6); text-align: center; }\n  .tv .ht-kick { font-size: 1.4rem; }\n  .ht-full { display: block; margin: 8px auto 0; }\n" + s[i:]
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('upute SGD UI OK')

# ---- krčmarove tajne ponude: privatni panel u glasanju, oznaka zaključane oklade, kartica ishoda, oznaka u poretku, opcija u predvorju ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/tk.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const PACT_STEAL = 0.25;", open(SP + '/v4/tk-ui.js', encoding='utf-8').read() + "  const PACT_STEAL = 0.25;")
s = rep(s, "rcBar(d, me) + pjChip(d, me)", "rcBar(d, me) + tkBar(d, me) + pjChip(d, me)", 2)
s = rep(s, "  function bindPact(d) {\n    bindRc();\n", "  function bindPact(d) {\n    bindRc();\n    bindTk();\n")
# prije otkrivanja: oduzmi i tajnu okladu (poredak i brojači se animiraju ispravno)
for v in ['a', 'b', 'me', 'p']:
    a = '(' + v + '.rx || 0)'
    assert s.count(a) >= 1, a
    s = s.replace(a, a + ' - (' + v + '.tb || 0)')
s = rep(s, "(gain && p.rx ? '<span class=\"betb rcb'", "(gain && p.tb ? '<span class=\"betb tkb' + (p.tb < 0 ? ' neg' : '') + '\">🍺 ' + (p.tb > 0 ? '+' : '−') + Math.abs(p.tb) + '</span>' : '') + (gain && p.rx ? '<span class=\"betb rcb'")
s = rep(s, "rcCard(d) + (d.mo ? tdLine(d) : !d.rcr && b.lead", "rcCard(d) + tkCard(d) + (d.mo ? tdLine(d) : !d.rcr && !d.tkr && b.lead", 2)
s = rep(s, "  function tdSting(d) { if (!d.mo && !d.rcr) return;", "  function tdSting(d) { if (!d.mo && !d.rcr && !d.tkr) return;")
s = rep(s, "AUDIO.play(d.mo ? d.mo.snd || 'stingSmall' : 'stingRival'); }, wait); }", "AUDIO.play(d.mo ? d.mo.snd || 'stingSmall' : d.rcr ? 'stingRival' : d.tkr.k === 'win' ? 'stingUp' : 'stingSmall'); }, wait); }")
s = rep(s, "    if ((d.mo || d.rcr) && d.ph !== 'moment') tdSting(d);", "    if ((d.mo || d.rcr || d.tkr) && d.ph !== 'moment') tdSting(d);", 2)
s = rep(s, "pactToggle(d) + rcToggle(d) +", "pactToggle(d) + rcToggle(d) + tkToggle(d) +", 2)
s = rep(s, "game.setOpt('rc', b.dataset.rcopt === '1'); } }; }); }", "game.setOpt('rc', b.dataset.rcopt === '1'); } }; });\n    document.querySelectorAll('#app [data-tkopt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('tk', b.dataset.tkopt === '1'); } }; }); }")
s = rep(s, "d.rcr ? d.rcr.id : 0,", "d.rcr ? d.rcr.id : 0, d.tkr ? d.tkr.id : 0,")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('tajne ponude UI OK')
# TV predvorje: tajne ponude su isključene po zadanom, pa ih domaćin s TV-a mora moći uključiti (ostale opcije su ondje uključene po zadanom)
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "(d.P.length ? lineup(d) : '<div class=\"tv-sub\">Čekamo prve igrače…</div>') +\n      '<div class=\"actions\"><button class=\"btn\" id=\"start\"", "(d.P.length ? lineup(d) : '<div class=\"tv-sub\">Čekamo prve igrače…</div>') + tkToggle(d) +\n      '<div class=\"actions\"><button class=\"btn\" id=\"start\"")
s = rep(s, "    bind('start', () => game.start());\n", "    bind('start', () => game.start());\n    if (d && d.ph === 'lobby' && game) bindOpt();\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('tajne ponude TV predvorje OK')

# ---- Tavern Social Flow 2.0: Tajni kutak, Vrijeme za dogovore, šapat jednim dodirom, testni način s botovima ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/sf.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const PACT_STEAL = 0.25;", open(SP + '/v4/sf-ui.js', encoding='utf-8').read() + "  const PACT_STEAL = 0.25;")
# traka ispod HUD-a: u Social Flowu samo saveznik/šapat tijekom pitanja i male oznake; sve ostalo je u Tajnom kutku
s = rep(s, "  function pactHead(d, me, head) {\n", "  function pactHead(d, me, head) {\n    if (sfOnPV() && me && d.ph !== 'lobby' && d.ph !== 'final') return sfHead(d, me, head);\n    return pactHeadOld(d, me, head);\n  }\n  function pactHeadOld(d, me, head) {\n")
s = rep(s, "    q('[data-bt]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.bt === '1' ? 'zap' : 'tap'); pactSend({ k: 'betray', on: b.dataset.bt === '1' }); }; });\n  }",
           "    q('[data-bt]').forEach((b) => { b.onclick = () => { AUDIO.play(b.dataset.bt === '1' ? 'zap' : 'tap'); pactSend({ k: 'betray', on: b.dataset.bt === '1' }); }; });\n    bindSf(d);\n  }")
# faza Vrijeme za dogovore: mobitel i TV
s = rep(s, "      case 'howto': h = center(head + howtoHtml(d)); break;", "      case 'deal': h = head + dealPhone(d, me); break;\n      case 'howto': h = center(head + howtoHtml(d)); break;")
s = rep(s, "      case 'howto': h = tvTop(d, 'Kako se igra') + howtoHtml(d) +", "      case 'deal': h = tvTop(d, 'Vrijeme za dogovore') + dealTv(d); break;\n      case 'howto': h = tvTop(d, 'Kako se igra') + howtoHtml(d) +")
s = rep(s, "      case 'howto': return AUDIO.play('whoosh');", "      case 'deal': case 'howto': return AUDIO.play('whoosh');", 2)
# odgovori i šapni: ista ulazna poruka (w: 1) kad imaš saveznika i šapat je uključen
s = rep(s, "        sendInput({ c: +b.dataset.c, t: Math.max(0, Math.round(Date.now() - L.start)) });",
           "        const w = S && S.ph === 'question' && PV && PV.sf && PV.k && SF.wh && !PV.k.wsent ? { w: 1 } : {};\n        sendInput(Object.assign({ c: +b.dataset.c, t: Math.max(0, Math.round(Date.now() - L.start)) }, w));")
# predvorje: testni način (domaćin s mobitela i demo)
s = rep(s, "pactToggle(d) + rcToggle(d) + tkToggle(d) + '<button class=\"btn lob-cta\" id=\"dstart\"", "pactToggle(d) + rcToggle(d) + tkToggle(d) + bsToggle(d) + '<button class=\"btn lob-cta\" id=\"dstart\"")
s = rep(s, "          cta = pactToggle(d) + rcToggle(d) + tkToggle(d) + '<div class=\"lob-wait\">", "          cta = pactToggle(d) + rcToggle(d) + tkToggle(d) + bsToggle(d) + '<div class=\"lob-wait\">")
s = rep(s, "          cta = botStepper(d) + '<button class=\"btn lob-cta\" id=\"dstart\"' + (nb < 1", "          cta = botStepper(d) + bsToggle(d) + '<button class=\"btn lob-cta\" id=\"dstart\"' + (nb < 1")
s = rep(s, "    document.querySelectorAll('#app [data-tkopt]').forEach(", "    document.querySelectorAll('#app [data-bsopt]').forEach((b) => { b.onclick = () => { if (game) { AUDIO.play('tap'); game.setOpt('bs', b.dataset.bsopt === '1'); } }; });\n    document.querySelectorAll('#app [data-tkopt]').forEach(")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('social flow UI OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  function tvV(d) {\n", "  function tvV(d) {\n    { const sb = document.getElementById('sfbox'); if (sb && sb.__h) { sb.innerHTML = ''; sb.__h = ''; } }\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('social flow TV OK')
# ---- UX 3: šapat na kartici odgovora (bez trake saveznika iznad pitanja) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "<span class=\"otxt\">' + optText(o, i) + '</span></button>';", "<span class=\"otxt\">' + optText(o, i) + '</span>' + sfOptX(d, i, answered, gone) + '</button>';")
s = rep(s, "        const w = S && S.ph === 'question' && PV && PV.sf && PV.k && SF.wh && !PV.k.wsent ? { w: 1 } : {};\n", "        const w = {};\n")
s = rep(s, "    return head + sfQuestionBar(d, me) + tags + pjChip(d, me);", "    return head + tags + pjChip(d, me);")
s = rep(s, "    bind('sfready', () => {", "    bindWhi();\n    bind('sfready', () => {")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('UX 3 UI OK')
# ---- UX 5: novi balans paktova (krađa 8 %, najviše 300; dvostruka izdaja bez krađe) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  const PACT_STEAL = 0.25;", "  const PACT_STEAL = 0.08;")
s = rep(s, "'<div class=\"bt-row\">🗡️ Ukradeni bodovi (' + Math.round(PACT_STEAL * 100) + ' %) '", "'<div class=\"bt-row\">🗡️ Ukradeno partneru (' + Math.round(PACT_STEAL * 100) + ' %, najviše 300) '")
s = rep(s, "        '<div class=\"bt-row neg\">' + esc(nameOf(d, e.a)) + ' ' + num('bta' + i, e.la, '−', 1700) + '</div><div class=\"bt-row neg\">' + esc(nameOf(d, e.b)) + ' ' + num('btb' + i, e.lb, '−', 1900) + '</div></div>';",
           "        (e.la || e.lb ? '<div class=\"bt-row neg\">' + esc(nameOf(d, e.a)) + ' ' + num('bta' + i, e.la, '−', 1700) + '</div><div class=\"bt-row neg\">' + esc(nameOf(d, e.b)) + ' ' + num('btb' + i, e.lb, '−', 1900) + '</div>' : '<div class=\"bt-row\">Nitko nikome ne krade bodove</div>') + '</div>';")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('UX 5 UI OK')
# ---- Krčmar 2.0, korak 1: bez opcija rivalskog obračuna i krčmarovih tajnih oklada u predvorju ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  function rcToggle(d) {\n", "  function rcToggle(d) {\n    return '';   // rivalski obračun je uklonjen\n")
s = rep(s, "  function tkToggle(d) {\n", "  function tkToggle(d) {\n    return '';   // krčmarove tajne oklade su uklonjene (oklada je sada moć)\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR 1 UI OK')
# ---- Krčmar 2.0, korak 2: Nastavi na ploči bodova (mobitel), stanje spremnosti (TV) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/kr.css', encoding='utf-8').read() + s[i:]
s = rep(s, "  const PACT_STEAL = 0.08;", open(SP + '/v4/kr-ui.js', encoding='utf-8').read() + "  const PACT_STEAL = 0.08;")
s = rep(s, "esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '') + '</div></div>';", "esc(b.lead.id === PID ? 'ti' : b.lead.n) + '!</div>' : '') + krBox(d, me) + '</div></div>';")
s = rep(s, "esc(b.lead.n) + '!</div>' : '') + '</div></div></div>';", "esc(b.lead.n) + '!</div>' : '') + krTv(d) + '</div></div></div>';")
s = rep(s, "    bindWhi();\n", "    bindWhi();\n    bindKr(d);\n")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR 2 UI OK')
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "d.rcr ? d.rcr.id : 0, d.tkr ? d.tkr.id : 0,", "d.rcr ? d.rcr.id : 0, d.tkr ? d.tkr.id : 0, d.rw || 0,")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR 2 potpis OK')
# ---- Krčmar 2.0, korak 4: zadatak u poretku (oznaka), prije-bodovi uključuju zadatak ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
for v in ['a', 'b', 'me', 'p']:
    a = '(' + v + '.tb || 0)'
    assert s.count(a) >= 1, a
    s = s.replace(a, a + ' - (' + v + '.kb || 0)')
s = rep(s, "(gain && p.tb ? '<span class=\"betb tkb'", "(gain && p.kb ? '<span class=\"betb krb' + (p.kb < 0 ? ' neg' : '') + '\">📜 ' + (p.kb > 0 ? '+' : '−') + Math.abs(p.kb) + '</span>' : '') + (gain && p.tb ? '<span class=\"betb tkb'")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR 4 UI OK')
# ---- Krčmar 2.0, korak 5: izazov vođi na ploči, nadvlačenje konopa (mobitel, TV), rezultat ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "    return '<div class=\"kr-box\">' + ph0 + go + dev + '</div>';", "    return '<div class=\"kr-box\">' + krChallenge(d, me) + ph0 + go + dev + '</div>';")
s = rep(s, "    const go = mine ? '<div class=\"kr-wait\">", "    if (d.lc && d.lc.st === 'o' && d.lc.a === me.id && !priv.block) priv = { block: 1, html: priv && typeof priv === 'object' ? priv.html || '' : priv || '' };\n    const go = mine ? '<div class=\"kr-wait\">")
s = rep(s, "    const priv = krPriv(d, me);\n", "    let priv = krPriv(d, me);\n")
s = rep(s, "    return n ? '<div class=\"kr-wait tv\"", "    return krChallenge(d, null) + (n ? '<div class=\"kr-wait tv\"")
s = rep(s, "'\">Spremno <b>' + r + '/' + n + '</b></div>' : '';\n  }\n  function bindKr(d) {", "'\">Spremno <b>' + r + '/' + n + '</b></div>' : '');\n  }\n  function bindKr(d) {")
s = rep(s, "  function duelIntroMo(d) { return { t: 'Dvoboj!', s: (d.du.n ? d.du.n + ' ' : '') + 'Brži točan odgovor osvaja +' + d.du.bonus,",
           "  function duelIntroMo(d) { if (d.du.rope) return { t: '⚔️ Izazov vođi!', s: 'Nadvlačenje konopa: točno vuče, netočno vraća · ulog ' + d.du.sa + ' protiv ' + d.du.sb, a: [d.du.a, d.du.b], pose: ['attack', 'attack'], vs: 1 };\n    return { t: 'Dvoboj!', s: (d.du.n ? d.du.n + ' ' : '') + 'Brži točan odgovor osvaja +' + d.du.bonus,")
s = rep(s, "      case 'duelResult': h = tvTop(d, 'Dvoboj') + '<div class=\"tv-mid\">' + duelResultHtml(d, true) + '</div>'; break;",
           "      case 'rope': h = tvTop(d, 'Izazov vođi') + timerHtml() + ropeTv(d); break;\n      case 'duelResult': h = tvTop(d, 'Dvoboj') + '<div class=\"tv-mid\">' + (d.du && d.du.rope ? ropeResult(d) : duelResultHtml(d, true)) + '</div>'; break;")
s = rep(s, "      case 'duelResult': h = head + duelResultHtml(d, false); break;",
           "      case 'rope': h = head + ropePhone(d, me); break;\n      case 'duelResult': h = head + (d.du && d.du.rope ? ropeResult(d) : duelResultHtml(d, false)); break;")
s = rep(s, "    bindKr(d);\n", "    bindKr(d);\n    bindRope(d);\n")
s = rep(s, "d.rcr ? d.rcr.id : 0, d.tkr ? d.tkr.id : 0, d.rw || 0,", "d.rcr ? d.rcr.id : 0, d.tkr ? d.tkr.id : 0, d.rw || 0, d.lc || 0, d.rp ? [d.rp.pa, d.rp.pb] : 0,")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR 5 UI OK')
# ---- Krčmar 2.0, korak 6: moć Oklada (ikona, odabir mete, oznaka tijekom pitanja, dobitak u poretku) ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "  for (const k in ICON) ICON[k] = '<img class=\"ic pw-img\" src=\"ui/pw-' + k + '.webp\" alt=\"\" draggable=\"false\">';", "  ICON.oklada = '';\n  for (const k in ICON) ICON[k] = '<img class=\"ic pw-img\" src=\"ui/pw-' + k + '.webp\" alt=\"\" draggable=\"false\">';")
s = rep(s, "    const COL = { led: '#bcdbe6',", "    const COL = { oklada: '#f0c66a', led: '#bcdbe6',")
s = rep(s, "    const SND = { led: 'freeze',", "    const SND = { oklada: 'correct', led: 'freeze',")
s = rep(s, "        if (POWERS[k].atk) { L.pw = k; phoneRender(true); } else sendInput({ p: k });", "        if (POWERS[k].atk || POWERS[k].tg) { L.pw = k; phoneRender(true); } else sendInput({ p: k });")
s = rep(s, "      return headH('Odaberi metu', 'Na koga bacaš ovu moć?')", "      return headH(L.pw === 'oklada' ? 'Na koga se kladiš?' : 'Odaberi metu', L.pw === 'oklada' ? 'Ako oboje točno odgovorite, dobivaš i njegove bodove. Nitko neće znati na koga.' : 'Na koga bacaš ovu moć?')")
s = rep(s, "(me.bt ? '<span class=\"tag betag\">Ulog ' + me.bt + '</span>' : '');", "(me.bt ? '<span class=\"tag betag\">Ulog ' + me.bt + '</span>' : '') + (PV && PV.okl ? '<span class=\"tag\">🎲 Oklada: ' + esc(nameOf(d, PV.okl)) + '</span>' : '');")
for v in ['a', 'b', 'me', 'p']:
    a = '(' + v + '.kb || 0)'
    assert s.count(a) >= 1, a
    s = s.replace(a, a + ' - (' + v + '.ob || 0)')
s = rep(s, "(gain && p.kb ? '<span class=\"betb krb'", "(gain && p.ob ? '<span class=\"betb krb\">🎲 +' + p.ob + '</span>' : '') + (gain && p.kb ? '<span class=\"betb krb'")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR 6 UI OK')
# ---- popravak: broj spremnih na ploči se osvježava bez ponovnog crtanja ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "      if (sig !== lastSig) { lastSig = sig; phoneRender(false); }", "      if (sig !== lastSig) { lastSig = sig; phoneRender(false); } else krLive(d);")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR popravak broja OK')
# ---- popravak: obavijesti ne prekrivaju kontrole tijekom nadvlačenja konopa ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = rep(s, "const busy = d.ph === 'question' || d.ph === 'fq' || d.ph === 'duel' ||", "const busy = d.ph === 'question' || d.ph === 'fq' || d.ph === 'duel' || d.ph === 'rope' ||")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR popravak obavijesti OK')
# ---- popravak: samostalni demo nema mrežni sloj (pactSend) — sve društvene akcije idu kroz krSend ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
s = s.replace("typeof pactSend === 'function' ? pactSend(a)", "typeof pactSend === 'function' ? pactSend__(a)")
n = s.count("pactSend(")
s = s.replace("pactSend(", "krSend(").replace("pactSend__(a)", "pactSend(a)")
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('KR krSend OK', n)
# ---- razvrstavanje: jedna kartica, swipe ulijevo/udesno (v4/swipe-sort.js, swipe-sort.css); slanje i bodovanje nepromijenjeni ----
s = open(SP + '/v4/page.html', encoding='utf-8').read()
i = s.index('</style>'); s = s[:i] + open(SP + '/v4/swipe-sort.css', encoding='utf-8').read() + s[i:]
s = cut(s, '  function sortPhone(d, me) {', '  let lastLink = null;', open(SP + '/v4/swipe-sort.js', encoding='utf-8').read())
open(SP + '/v4/page.html', 'w', encoding='utf-8').write(s)
print('razvrstavanje swipe OK')
