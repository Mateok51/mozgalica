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
