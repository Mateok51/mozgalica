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

# zaključani odgovori (nakon razbijanja leda ili brisanja sluzi) ne reagiraju na dodir ni vizualno:
# prije se gumb "utisnuo" iako odabir nije zaprimljen
s = open(SP + '/web/body.html', encoding='utf-8').read()
a = "  .p-opt.locked { filter: saturate(0.4) brightness(0.8); transform: scale(0.98); }"
assert s.count(a) == 1
s = s.replace(a, a + "\n  html .p-opt.locked { pointer-events: none; cursor: default; transition: filter 0.25s, transform 0.25s; }")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main2: zaključani odgovori bez dodira OK')
