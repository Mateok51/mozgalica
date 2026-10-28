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
