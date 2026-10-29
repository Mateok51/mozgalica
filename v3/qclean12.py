# Jednokratno čišćenje 12 (v58): Hrvatski gradovi i otoci, Hrvatski običaji, Europa, Zastave i glavni gradovi.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(68)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Hrvatski gradovi i otoci', [7,11,16,21,24,59,60,99,47,45,52,102])
add('Hrvatski gradovi i otoci', [
 ('Koji je hrvatski grad glumio Kraljevu Luku u seriji Igra prijestolja?', 'Dubrovnik', ['Split', 'Šibenik', 'Trogir']),
 ('Na kojem je hrvatskom otoku snimljen film Mamma Mia! Opet to radimo?', 'Visu', ['Hvaru', 'Braču', 'Korčuli']),
])
drop('Hrvatski običaji i baština', [15,16,19,20,21,22,36,41,42,43,44,48,56,67,69,70,72,73,74])
add('Hrvatski običaji i baština', [
 ('Kako se u Dalmaciji zove ugodno lijenčarenje i „ne raditi ništa“?', 'Fjaka', ['Bura', 'Kantun', 'Fešta']),
])
drop('Europa', [0,5,9,16,11,19,41,43,47,61,66,67,72,73,81,82,108,109,107,12,21,22,23,24,26,27,28,86,92,83])
add('Europa', [
 ('Koja je država 2023. postala članica NATO-a, napustivši desetljeća vojne neutralnosti?', 'Finska', ['Švedska', 'Švicarska', 'Austrija']),
 ('Koja je država 2024. postala 32. članica NATO-a?', 'Švedska', ['Finska', 'Irska', 'Norveška']),
 ('Koja je država 1. siječnja 2026. uvela euro kao dvadeset prva članica eurozone?', 'Bugarska', ['Rumunjska', 'Poljska', 'Mađarska']),
 ('Koji je glavni grad Kosova?', 'Priština', ['Skoplje', 'Tirana', 'Podgorica']),
])
drop('Zastave i glavni gradovi', [11,15,17,18,19,68,69,70,71,73,75,76,83,84,85,95,96,97,86,88,89,90,66,104,103,101,100])
add('Zastave i glavni gradovi', [
 ('Koji je glavni grad Mjanmara?', 'Naypyidaw', ['Yangon', 'Mandalay', 'Bangkok']),
 ('Koji je glavni grad Kanade?', 'Ottawa', ['Toronto', 'Montréal', 'Vancouver']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Hrvatski gradovi i otoci','Hrvatski običaji i baština','Europa','Zastave i glavni gradovi']: print(c, len(C[c]))
