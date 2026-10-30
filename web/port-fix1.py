# Ispravci (v60): sluz se lakše briše, odgovori se prije otključavaju nakon uklanjanja efekta, neutralan tekst na kraju igre.
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, ('port-fix1', s.count(a), a[:90])
    s = s.replace(a, b)
# 1) kraće zaključavanje odgovora nakon efekta (dodir koji je počeo tijekom efekta ionako ne vrijedi kao odgovor)
rep("    L.lockUntil = Date.now() + 1600;\n    const s0 = L.s;\n    setTimeout(() => { if (L.s === s0) phoneRender(true); }, 1620);",
    "    L.lockUntil = Date.now() + 400;\n    const s0 = L.s;\n    setTimeout(() => { if (L.s === s0) phoneRender(true); }, 420);")
# 2) sluz: veća četka (3x3), povezivanje točaka brzog poteza i završetak kad je obrisano ~80 %
a = s.index("      const cells = el.querySelectorAll('.cell');\n      const wipe = (e) => {")
b_marker = "      el.onpointerup = el.onpointercancel = () => { down = false; };"
b = s.index(b_marker, a) + len(b_marker)
s = s[:a] + """      const cells = el.querySelectorAll('.cell');
      let lx = null, ly = null;
      const hit = (px, py) => {
        const cx = Math.floor(px), cy = Math.floor(py);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || x > 5 || y < 0 || y > 7) continue;
          const i = y * 6 + x;
          if (fx.cells[i]) { fx.cells[i] = 0; fx.left--; if (cells[i]) cells[i].classList.add('gone'); if (fx.left % 7 === 0) SFX.play('splat'); }
        }
      };
      const wipe = (e) => {
        const r = el.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 6, py = ((e.clientY - r.top) / r.height) * 8;
        if (lx === null) hit(px, py);
        else { const n = Math.max(1, Math.ceil(Math.hypot(px - lx, py - ly) / 0.5)); for (let k = 1; k <= n; k++) hit(lx + (px - lx) * k / n, ly + (py - ly) * k / n); }
        lx = px; ly = py;
        if (fx.left <= 10) { fx.cells.fill(0); fx.left = 0; cells.forEach((c) => c.classList.add('gone')); fxDone(); }
      };
      let down = false;
      el.onpointerdown = (e) => { e.preventDefault(); down = true; lx = ly = null; try { el.setPointerCapture(e.pointerId); } catch (er) {} wipe(e); };
      el.onpointermove = (e) => { if (down) wipe(e); };
      el.onpointerup = el.onpointercancel = () => { down = false; lx = ly = null; };""" + s[b:]
# 3) kraj igre: rodno neutralan tekst
rep("(w.id === PID ? 'Pobijedio si! Vladar Trivia Taverna!' : esc(w.n) + ' je pobijedio!')", "(w.id === PID ? 'Tvoja je kruna! Vladar Trivia Taverna!' : 'Vladar Trivia Taverna!')")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-fix1 OK')
