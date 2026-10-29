# Prijenos izmjena s grane main nakon v58 (Njuško: poze, značke odgovora, avatari u predvorju).
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
P = [
("    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }\n  }",
 "    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }\n    /* Ne stvaraj prijelaz za zoom/širinu: fitScreen ih mjeri odmah nakon promjene. */\n    #app { transition-property: none !important; }\n  }"),
("  .bar-row .bw { width: min(19%, 78px); display: flex; flex-direction: column; align-items: center; position: relative; }",
 "  /* Stalno mjesto za status čuva položaj i veličinu lika prije i nakon odgovora. */\n  .bar-row .bw { width: min(19%, 78px); display: flex; flex-direction: column; align-items: center; position: relative; padding-bottom: 20px; }"),
(".bar-row .bw .ok { position: absolute; top: -4px; right: 0; width: 18px; height: 18px;",
 ".bar-row .bw .ok { position: absolute; bottom: 1px; left: calc(50% - 8px); width: 16px; height: 16px;"),
(".bar-row .bw .glow { position: absolute; left: 10%; right: 10%; bottom: 6px;",
 ".bar-row .bw .glow { position: absolute; left: 10%; right: 10%; bottom: 26px;"),
("@media (max-height: 800px) { .av-pick .pick-img { height: 56px; } .av-pick { min-height: 0; }",
 "@media (max-height: 800px) { .av-pick .pick-img { height: 56px; } .lob .av-pick .pick-img { width: min(100%, 56px); height: auto; align-self: center; flex: none; } .av-pick { min-height: 0; }"),
]
for i, (a, b) in enumerate(P):
    assert s.count(a) == 1, ('port-main4', i, s.count(a))
    s = s.replace(a, b)
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main4 OK')
