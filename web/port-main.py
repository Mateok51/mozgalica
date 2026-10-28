# Prijenos izmjena napravljenih izravno na grani main (v48: povezivanje i obnova partije, predvorje, odabir mete,
# kontrole mini-igara, prilagodba ekrana). Parovi (stari → novi tekst) primjenjuju se na web/body.html, svaki točno jednom.
import json
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
for i, (old, new) in enumerate(json.load(open(SP + '/web/port-main.json', encoding='utf-8'))):
    assert s.count(old) == 1, ('port-main par', i, s.count(old), old[:100])
    s = s.replace(old, new)
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main OK')

# otkrivanje zadržava mjerilo pitanja kad je razlika mala (inače odgovori poskoče za nekoliko piksela kad istekne vrijeme)
s = open(SP + '/web/body.html', encoding='utf-8').read()
a = "if (phone && S && S.ph === 'reveal' && questionFit && questionFit.key === key) scale = Math.min(scale, questionFit.scale);"
assert s.count(a) == 1
s = s.replace(a, "if (phone && S && S.ph === 'reveal' && questionFit && questionFit.key === key) scale = scale >= questionFit.scale * 0.98 ? questionFit.scale : Math.min(scale, questionFit.scale);")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main: mjerilo otkrivanja OK')

# mjerilo ostaje isto unutar iste faze: pojava ili nestanak elementa ne smiju na trenutak promijeniti veličinu cijelog ekrana
s = open(SP + '/web/body.html', encoding='utf-8').read()
a = "    const finish = (scale) => {\n"
assert s.count(a) == 1
s = s.replace(a, "    const pk = S ? [S.s, S.ph, innerWidth, innerHeight].join(':') : null;\n    const finish = (scale) => {\n"
              "      // ista faza: ne raste natrag, a sitna razlika (do 3 %) ne mijenja mjerilo; jače smanjenje samo ako sadržaj stvarno ne stane\n"
              "      if (phaseFit && phaseFit.key === pk) scale = scale >= phaseFit.scale * 0.97 ? phaseFit.scale : scale;\n")
a = "      if (phone && S && S.ph === 'question') questionFit = { key, scale };\n    };"
assert s.count(a) == 1
s = s.replace(a, "      if (phone && S && S.ph === 'question') questionFit = { key, scale };\n      phaseFit = { key: pk, scale };\n    };")
a = "  let questionFit = null;"
assert s.count(a) == 1
s = s.replace(a, "  let questionFit = null, phaseFit = null;")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main: stalno mjerilo faze OK')
