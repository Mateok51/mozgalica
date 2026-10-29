# Prijenos izmjena napravljenih izravno na grani main nakon v54 (78477b3, 98dee1a: mobilni prikaz, moći, upute,
# društvene odluke). Parovi (stari → novi tekst) primjenjuju se na web/body.html, svaki točno jednom.
import json
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
for i, (old, new) in enumerate(json.load(open(SP + '/web/port-main2.json', encoding='utf-8'))):
    assert s.count(old) == 1, ('port-main2 par', i, s.count(old), old[:100])
    s = s.replace(old, new)
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main2 OK')

# objašnjenje power picka uvijek zauzima dva retka: duži tekst prije korištenja i kraći poslije ne mijenjaju mjerilo ekrana
s = open(SP + '/web/body.html', encoding='utf-8').read()
a = "  .pp-bar .pp-txt { display: flex; flex-direction: column; min-width: 0; line-height: 1.15; }"
assert s.count(a) == 1
s = s.replace(a, a + "\n  .pp-bar .pp-txt small { min-height: 2.3em; }")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main2: stalna visina power picka OK')
