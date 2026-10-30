import re, sys
SP = '/root/mozgalica'
s = open(SP + '/v4/page.html', encoding='utf-8').read()

def cut(s, start, end, new):
    i = s.index(start)
    j = s.index(end, i)
    return s[:i] + new + s[j:]

def rep(s, old, new):
    assert s.count(old) == 1, ('nije jedinstveno', old[:60])
    return s.replace(old, new)

s = rep(s, "  const JOIN_URL = '__JOIN_URL__';\n", '')
s = rep(s, "  const use = (n) => (window.claude && window.claude.use ? window.claude.use(n) : Promise.resolve(null)).catch(() => null);\n", '')
s = cut(s, '  // ---------- stanje stranice ----------', '  const meOf = (d) =>', open(SP + '/web/net-block.js', encoding='utf-8').read())

home = r'''  function homeV() {
    $app.className = 'screen center home-screen';
    const standalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    const status = hasPeer() ? '' : '<div class="home-status">Povezivanje uređaja nije dostupno. Igra protiv botova i dalje radi.</div>';
    const install = standalone || !installEvt ? '' : '<button class="home-link" id="install">Instaliraj kao aplikaciju</button>';
    $app.innerHTML =
      '<div class="home">' +
        '<div class="home-logo"><div class="logo">MOZGALICA</div></div>' +
        '<div class="home-actions">' +
          '<button class="btn home-cta" id="hostp"><span class="hb-t">Igraj bez TV-a</span><span class="hb-s">Svi na mobitelima</span></button>' +
          '<div class="home-sec"><button class="btn ghost" id="host">Otvori na TV-u</button><button class="btn ghost" id="join">Pridruži se igri</button></div>' +
          '<div class="home-try"><span class="home-sep">Isprobaj igru</span><button class="home-link" id="demo">Igraj protiv botova</button>' + install + '</div>' +
        '</div>' +
        '<div class="home-foot">' + status + '<span class="home-ver">__VER__</span></div>' +
      '</div>';
    bind('host', startHost); bind('join', () => { mode = 'join'; render(); }); bind('demo', startDemo);
    bind('hostp', () => { hostErr = ''; mode = 'hostform'; render(); });
    bind('install', async () => {
      if (!installEvt) return;
      installEvt.prompt();
      try { await installEvt.userChoice; } catch (e) {}
      installEvt = null; render();
    });
  }

'''
s = cut(s, '  function homeV() {', '  function joinV() {', home)

lobby = r'''  function tvLobby(d, demoBar) {
    const addr = esc(location.host + location.pathname.replace(/index\.html$/, ''));
    const svg = mode === 'demo' ? '' : qrSvg(appUrl() + '#' + d.code);
    const inv = mode === 'demo'
      ? '<div class="tvlob-inv"><span class="lob-code-l">Demo</span><span class="lob-addr">Botovi igraju s tobom. U pravoj igri ovdje su kod sobe i QR kod.</span></div>'
      : '<div class="tvlob-inv"><span class="lob-code-l">Pozovi igrače</span><span class="lob-code">' + esc(d.code) + '</span>' + (svg ? '<div class="lob-qr">' + svg + '</div>' : '') +
        '<span class="lob-addr">Skeniraj QR kod ili otvori <b>' + addr + '</b> i upiši kod sobe.</span>' + (netNote ? '<span class="lob-addr" style="color:#f0b070">' + esc(netNote) + '</span>' : '') + '</div>';
    const on = d.P.filter((p) => p.c && !p.b).length;
    let slots = d.P.map((p) => '<div class="tvlob-slot' + (p.c ? '' : ' off') + '" data-a="' + p.a + '"' + (p.b ? ' data-bot="1"' : '') + '><span class="pick-img">' + avSvg(p.a, 'idle') + '</span><span class="pick-nm">' + esc(p.n) + '</span>' + (p.b ? '<span class="pick-bot">BOT</span>' : '') + '</div>').join('');
    for (let k = d.P.length; k < d.max; k++) slots += '<div class="tvlob-slot empty"><span class="pick-nm">Slobodno mjesto</span></div>';
    const fsBtn = mode !== 'demo' && document.fullscreenEnabled && !document.fullscreenElement ? '<button class="btn ghost" id="fs">Cijeli zaslon</button>' : '';
    $app.innerHTML = demoBar +
      '<div class="tvlob"><div class="tvlob-side">' + inv + (game ? botStepper(d) + lenPick(d) + pactToggle(d) + tkToggle(d) + bsToggle(d).replace('class="lob-opt"', 'class="lob-opt bs-tv"') : '') + '</div>' + '<div class="tvlob-cast"><h2>Odaberite likove na mobitelima<span>' + d.P.length + '/' + d.max + '</span></h2>' +
      '<div class="tvlob-grid">' + slots + '</div>' +
      '<div class="tvlob-act"><button class="btn lob-cta" id="start"' + (on < 1 ? ' disabled' : '') + '>Započni igru</button>' + fsBtn + '<button class="home-link" id="quit">Odustani</button></div></div></div>';
    bind('start', () => game.start());
    if (game) { bindBots(d); bindOpt(); }
    bind('quit', reset);
    bind('toPhone', () => { demoView = 'phone'; lastSig = ''; render(); });
    bind('fs', () => { try { const p = document.documentElement.requestFullscreen(); if (p && p.then) p.then(render, () => {}); } catch (e) {} });
  }

'''
s = cut(s, '  function tvLobby(d, demoBar) {', '  // ---------- mobitel ----------', lobby)

old_bar = """    const demoBar = mode === 'demo' ? '<div class="demo-bar"><span class="pill">DEMO</span><button class="btn ghost" id="toTv">Pogledaj TV</button></div>' : '';"""
new_bar = """    const demoBar = (mode === 'demo' ? '<div class="demo-bar"><span class="pill">DEMO</span><button class="btn ghost" id="toTv">Pogledaj TV</button></div>' : '') +
      (netNote ? '<div class="err" style="display:flex;justify-content:space-between;align-items:center;gap:8px">' + esc(netNote) + '<button class="btn ghost" id="leave2">Izađi</button></div>' : '');"""
s = rep(s, old_bar, new_bar)
s = rep(s, "    bind('leave', reset);\n    bind('dstart'", "    bind('leave', reset);\n    bind('leave2', reset);\n    bind('dstart'")

# ostaci Claude verzije ne smiju ostati
s = rep(s, "    if (mode === 'demo') game.setInput(PID, inp);\n    else if (proom) proom.presence({ in: inp }).catch(() => {});\n  }\n  function orderRanks", "    if (isLocalHost()) game.setInput(PID, inp);\n    else netSend({ t: 'in', in: inp });\n  }\n  function orderRanks")
for bad in ['claude.use', 'roomNs', 'roomReady', 'JOIN_URL', 'mz_base', 'baseUrl', 'hostRoom', 'proom']:
    assert bad not in s, 'ostatak: ' + bad
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('OK', len(s))
# izmjene napravljene izravno na grani main (v48)
import subprocess, sys
subprocess.run([sys.executable, SP + '/web/port-main.py'], check=True)
subprocess.run([sys.executable, SP + '/web/relay-e2e.py'], check=True)
subprocess.run([sys.executable, SP + '/web/ui-fixes.py'], check=True)
subprocess.run([sys.executable, SP + '/web/port-main2.py'], check=True)
subprocess.run([sys.executable, SP + '/web/port-main3.py'], check=True)
subprocess.run([sys.executable, SP + '/web/port-main4.py'], check=True)
subprocess.run([sys.executable, SP + '/web/port-catpick.py'], check=True)
subprocess.run([sys.executable, SP + '/web/port-mgpick.py'], check=True)
subprocess.run([sys.executable, SP + '/web/port-uljez.py'], check=True)
subprocess.run([sys.executable, SP + '/web/port-fix1.py'], check=True)
