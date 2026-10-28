# Sitni popravci sučelja na razini cijele stranice (nakon port-main i relay-e2e):
# isti logo na svim početnim ekranima, bez trake Demo / Pogledaj TV, likovi u otkrivanju kreću iz svog mjesta u redu,
# stalni elementi (traka s bodovima, vrijeme, red likova) ne mijenjaju veličinu kad se ostatak ekrana smanji.
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, ('ui-fixes', s.count(a), a[:90])
    s = s.replace(a, b)
css = r'''
  /* isti logo na početnom ekranu i ekranima za pokretanje / ulazak u igru (mobitel) */
  .phone .logo:has(.lt), .center .logo:has(.lt) { width: min(78vw, 32vh, 400px); margin: 0 auto 0.8em; }
  @media (max-height: 700px) { .phone .logo:has(.lt), .center .logo:has(.lt) { width: min(66vw, 28vh, 340px); } }
  /* stalni elementi zadržavaju veličinu i kad se ostatak ekrana smanji da sve stane */
  #app > .p-top, #app > .timer, #app > .bar-row { zoom: calc(1 / var(--fitz, 1)); }
  /* likovi u otkrivanju kreću s vlastitog mjesta u redu likova (vidljivi od prvog trenutka) */
  @keyframes walkIn { from { transform: translate(var(--wx), var(--wy, 70vh)); opacity: var(--wo, 0); } 12% { opacity: 1; } }
'''
i = s.index('</style>'); s = s[:i] + css + s[i:]
# mjerilo: stalni elementi ga poništavaju (--fitz)
rep("      A.style.zoom = scale.toFixed(4);", "      A.style.zoom = scale.toFixed(4); A.style.setProperty('--fitz', scale.toFixed(4));")
rep("    A.style.zoom = '';\n", "    A.style.zoom = ''; A.style.removeProperty('--fitz');\n")
# bez trake Demo / Pogledaj TV (TV prikaz demoa ostaje dostupan samo za provjere: ?demotv)
rep("""    const demoBar = (mode === 'demo' ? '<div class="demo-bar"><span class="pill">DEMO</span><button class="btn ghost" id="toTv">Pogledaj TV</button></div>' : '') +""",
    """    const demoBar = (mode === 'demo' && /demotv/.test(location.search) ? '<div class="demo-bar"><button class="btn ghost" id="toTv">TV</button></div>' : '') +""")
rep("""    const demoBar = mode === 'demo' ? '<div class="demo-bar"><span class="pill">Demo</span><button class="btn ghost" id="toPhone">Natrag na mobitel</button></div>' : '';""",
    """    const demoBar = mode === 'demo' && /demotv/.test(location.search) ? '<div class="demo-bar"><button class="btn ghost" id="toPhone">Mobitel</button></div>' : '';""")
# likovi: oznaka igrača u redu i kod hodača, pa hodač kreće točno odande
rep("'<div class=\"bw' + (p.id === PID ? ' me' : '') + '\" title=\"' + esc(p.n) + '\"", "'<div class=\"bw' + (p.id === PID ? ' me' : '') + '\" data-pid=\"' + esc(p.id) + '\" title=\"' + esc(p.n) + '\"")
rep("""      return '<span class="walker' + (p.id === PID ? ' me' : '') + '" title="' + esc(p.n) + '" style="--wx:' + wx + 'px;--wd:' + (k * 90) + 'ms">""",
    """      return '<span class="walker' + (p.id === PID ? ' me' : '') + '" data-pid="' + esc(p.id) + '" title="' + esc(p.n) + '" style="--wx:' + wx + 'px;--wd:' + (k * 90) + 'ms">""")
rep("""    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);
    $app.classList.toggle('lobfit', !!d && d.ph === 'lobby');
    fitScreen();""", """    SCENE.swap(demoBar + h, freshP, 'p:' + d.ph);
    $app.classList.toggle('lobfit', !!d && d.ph === 'lobby');
    fitScreen();
    walkFromRow();""")
rep("  let questionFit = null, phaseFit = null;", r"""  let questionFit = null, phaseFit = null;
  // hodači u otkrivanju: početak = položaj istog lika u (nevidljivom) redu likova
  function walkFromRow() {
    const ws = $app.querySelectorAll('.walker[data-pid]'); if (!ws.length) return;
    const z = parseFloat($app.style.zoom || '1') || 1;
    ws.forEach((w) => {
      const b = $app.querySelector('.bar-row .bw[data-pid="' + (window.CSS && CSS.escape ? CSS.escape(w.dataset.pid) : w.dataset.pid) + '"]'); if (!b) return;
      const an = w.style.animation; w.style.animation = 'none';
      const wr = w.getBoundingClientRect(), img = b.querySelector('.av, svg') || b, br = img.getBoundingClientRect();
      w.style.animation = an;
      const dx = (br.left + br.width / 2 - (wr.left + wr.width / 2)) / z, dy = (br.bottom - wr.bottom) / z;
      w.style.setProperty('--wx', Math.round(dx) + 'px'); w.style.setProperty('--wy', Math.round(dy) + 'px'); w.style.setProperty('--wo', '1');
    });
  }""")
# logo: ekrani za otvaranje sobe i ulazak koriste isti oblik kao početni ekran
rep("""    $app.innerHTML = '<div class="logo" style="font-size:2.6rem;text-align:center">MOZGALICA</div>' +""", """    $app.innerHTML = '<div class="logo">MOZGALICA</div>' +""")
rep("""      '<div class="logo" style="font-size:2.4rem;text-align:center">MOZGALICA</div>' +""", """      '<div class="logo">MOZGALICA</div>' +""")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('ui-fixes OK')

# ---- Početni ekran: glavna tipka „Igraj”, TV način u drugom planu ----
s = open(SP + '/web/body.html', encoding='utf-8').read()
rep("""          '<button class="btn home-cta" id="hostp"><span class="hb-t">Igraj bez TV-a</span><span class="hb-s">Svi na mobitelima</span></button>' +
          '<div class="home-sec"><button class="btn ghost" id="host">Otvori na TV-u</button><button class="btn ghost" id="join">Pridruži se igri</button></div>' +
          '<div class="home-try"><span class="home-sep">Isprobaj igru</span><button class="home-link" id="demo">Igraj protiv botova</button>' + install + '</div>' +""",
    """          '<button class="btn home-cta" id="hostp"><span class="hb-t">Igraj</span><span class="hb-s">Otvori sobu i pozovi društvo</span></button>' +
          '<div class="home-sec"><button class="btn ghost" id="join">Pridruži se igri</button></div>' +
          '<div class="home-try"><span class="home-sep">Još</span><button class="home-link" id="demo">Igraj protiv botova</button><button class="home-link" id="host">Prikaži igru na TV-u</button>' + install + '</div>' +""")
rep("""      '<div class="p-title" style="font-size:1.5rem">Igra bez TV-a</div>' +""", """      '<div class="p-title" style="font-size:1.5rem">Nova igra</div>' +""")
# ---- Ploča bodova s puno igrača: skrola se samo popis, ostatak ostaje iste veličine ----
rep("    if (measure(1) <= available) { finish(1); return; }", r"""    if (phone) {
      const mb = A.querySelector('.mboard');
      if (mb) {
        mb.style.maxHeight = ''; mb.classList.remove('mb-scroll');
        const over = measure(1) - available;
        if (over > 1) {
          const row = mb.querySelector('.rank-row'), minH = row ? row.getBoundingClientRect().height * 2.6 : 100;
          let mh = mb.getBoundingClientRect().height - over - 4;
          for (let k = 0; k < 3; k++) {   // visina popisa tako da sve ostalo stane bez smanjivanja
            mh = Math.max(minH, Math.floor(mh)); mb.style.maxHeight = mh + 'px'; mb.classList.add('mb-scroll');
            const o2 = measure(1) - available; if (o2 <= 0 || mh <= minH) break; mh -= o2 + 2;
          }
          // moj red ostaje vidljiv (dok igrač sam ne pomakne popis)
          if (!mb.__user) { mb.onscroll = () => { if (mb.__auto) { mb.__auto = 0; return; } mb.__user = 1; };
            // poredak se presloži animacijom: moj red (prema stvarnom, vidljivom položaju) ostaje u vidu
            const keep = () => { if (mb.__user || !mb.isConnected) return false; const me = mb.querySelector('.rank-row.me'); if (!me) return false;
              const z = parseFloat(A.style.zoom || '1') || 1, a = mb.getBoundingClientRect(), c = me.getBoundingClientRect();
              const st = Math.max(0, Math.min(mb.scrollHeight - mb.clientHeight, mb.scrollTop + ((c.top + c.height / 2) - (a.top + a.height / 2)) / z));
              if (Math.abs(mb.scrollTop - st) > 2) { mb.__auto = 1; mb.scrollTop = st; } return true; };
            keep(); clearInterval(mb.__kt); let n = 0; mb.__kt = setInterval(() => { if (!keep() || ++n > 30) clearInterval(mb.__kt); }, 300); }
        }
      }
    }
    if (measure(1) <= available) { finish(1); return; }""")
i = s.index('</style>'); s = s[:i] + "  .mboard.mb-scroll { overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding-right: 2px; mask-image: linear-gradient(180deg, transparent 0, #000 10px, #000 calc(100% - 14px), transparent 100%); }\n" + s[i:]
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('ui-fixes 2 OK')
