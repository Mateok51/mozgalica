# Jednokratno čišćenje 13 (v58): More i oceani, Biljke i priroda, Vrijeme i klima, Bajke i dječje priče.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(69)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
C['Životinje'] = [x for x in C['Životinje'] if not x['q'].startswith('Kod koje morske životinje mužjak nosi mladunce')]
drop('More i oceani', [0,4,12,14,18,19,21,22,28,29,33,35,36,56,72,74,86,87,88,89,32,23])
add('More i oceani', [
 ('Kako se zove golemo područje plutajuće plastike i smeća u Tihom oceanu?', 'Veliko pacifičko smetlište', ['Sargaško more', 'Vatreni prsten', 'Marijanska brazda']),
 ('Koji je najveći grabežljivi morski pas na svijetu?', 'Veliki bijeli morski pas', ['Tigrasti morski pas', 'Čekićar', 'Mako']),
])
drop('Biljke i priroda', [0,1,4,5,10,12,18,23,33,34,72,75,76,77,94,95,16,69,20,21])
add('Biljke i priroda', [
 ('U kojem se mjestu na Pagu nalazi maslinik sa stoljetnim stablima starim i preko tisuću godina?', 'Lunu', ['Novalji', 'Kolanu', 'Povljani']),
])
drop('Vrijeme i klima', [0,1,2,3,5,13,15,16,23,24,25,26,27,28,29,30,31,32,35,37,40,41,43,50,51,57,58,59,60,63,64,65,69,70,72,74,75,76,77,78,79,80,81,82,89])
add('Vrijeme i klima', [
 ('Koja je godina prema Copernicusu bila prva kalendarska godina s prosjekom iznad 1,5 °C u odnosu na predindustrijsko razdoblje?', '2024.', ['2016.', '2020.', '2023.']),
 ('U kojem je gradu 2025. održan UN-ov klimatski samit COP30?', 'Belému', ['Rio de Janeiru', 'São Paulu', 'Brasílii']),
])
drop('Bajke i dječje priče', [1,2,6,8,11,12,21,22,23,25,31,32,33,36,38,39,40,43,44,45,47,48,50,53,54,59,60,63,65,66,68,69,72,73,74,75,76,86,87,92,9])
add('Bajke i dječje priče', [
 ('U kojoj je kući Hogwartsa završio Harry Potter?', 'Gryffindor', ['Slytherin', 'Ravenclaw', 'Hufflepuff']),
 ('Kako se zove čudovište s ljubičastim bodljama iz slikovnice Julije Donaldson?', 'Gruffalo', ['Grinch', 'Zmaj Tamo', 'Čudovište iz ormara']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['More i oceani','Biljke i priroda','Vrijeme i klima','Bajke i dječje priče','Životinje']: print(c, len(C[c]))
