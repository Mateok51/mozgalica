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
