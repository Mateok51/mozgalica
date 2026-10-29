# Prijenos izmjena s grane main nakon v55 (71ba412, f2d0ede: slike efekata i botova, završni poredak, Novčić utjehe).
import json
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
for i, (old, new) in enumerate(json.load(open(SP + '/web/port-main3.json', encoding='utf-8'))):
    assert s.count(old) == 1, ('port-main3 par', i, s.count(old), old[:100])
    s = s.replace(old, new)
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-main3 OK')
