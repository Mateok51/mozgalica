# Upute bez odbrojavanja: svi ljudi potvrde da su pročitali, botovi automatski (pokreće leg.py, zatim mijenja v3/engine.js)
import subprocess, sys
SP = '/root/mozgalica'
subprocess.run([sys.executable, SP + '/v3/leg.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)
rep("  howto: 7, howtoShort: 3.5,", "  // upute: nema odbrojavanja, kreće kad svi potvrde; howtoMax je samo nevidljiva sigurnosna granica (npr. netko ode od mobitela)\n  howto: 7, howtoShort: 3.5, howtoMax: 180,")
rep("""    switch (G.ph) {
      case 'vote':
        if (!isInt(inp.v)""", """    switch (G.ph) {
      case 'howto':
        if (inp.ok !== 1) return false;
        break;
      case 'vote':
        if (!isInt(inp.v)""")
rep("    if (INPUT_PHASES[G.ph] && allDone()) endPhase(); else onChange();", "    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) endPhase(); else onChange();")
rep("    if (INPUT_PHASES[G.ph] && allDone()) return endPhase();\n    if (changed) onChange();", "    if ((INPUT_PHASES[G.ph] || G.ph === 'howto') && allDone()) return endPhase();\n    if (changed) onChange();")
rep("    setPhase('howto', first ? cfg.howto : cfg.howtoShort);\n  }", """    // igra samo s botovima (npr. gleda se na TV-u): nema koga čekati, upute ostaju vidljive kao prije
    if (!list().some((p) => !p.bot && p.on)) return setPhase('howto', first ? cfg.howto : cfg.howtoShort);
    setPhase('howto', cfg.howtoMax || 180);
    // botovi potvrđuju odmah; ljudi tipkom na mobitelu
    const s0 = G.s;
    for (const p of list()) if (p.bot) p.done = true;
    if (G.s === s0 && allDone()) return endPhase();
    onChange();
  }""")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('UPUTE OK')
