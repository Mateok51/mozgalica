# Jednokratno čišćenje 11 (v58): Jezici i riječi, Drevne civilizacije, Automobili i promet, Hrvatska.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(67)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Jezici i riječi', [2,3,17,30,31,32,35,36,37,43,38,39,40,56,74,73,102,106,105,89,90,98])
add('Jezici i riječi', [
 ('Što znači internetska kratica YOLO?', 'Živiš samo jednom', ['Vidimo se uskoro', 'Voli svaki dan', 'Uvijek na mreži']),
 ('Koji je emoji Oxfordov rječnik 2015. proglasio „riječju godine“?', 'Lice sa suzama radosnicama', ['Crveno srce', 'Palac gore', 'Plamen']),
])
drop('Drevne civilizacije', [12,20,22,23,29,36,40,49,56,63,91,105,84,21,70,81,38])
add('Drevne civilizacije', [
 ('U kojoj se državi nalazi Göbekli Tepe, jedno od najstarijih poznatih svetišta, staro oko 11 000 godina?', 'Turskoj', ['Iraku', 'Egiptu', 'Grčkoj']),
 ('U blizini kojih se piramida nalazi Veliki egipatski muzej, otvoren 2025.?', 'Gize', ['Sakare', 'Dahšura', 'Meduma']),
])
drop('Automobili i promet', [0,1,2,3,4,5,9,10,15,17,18,19,20,21,22,23,24,27,28,29,31,33,35,38,45,57,64,65,66,70,71,88,89,90,95,108,109,110,111,112,100,87,13,16,83,97])
add('Automobili i promet', [
 ('Kako se zove Teslin električni pickup oštrih linija, isporučivan od 2023.?', 'Cybertruck', ['Model Y', 'Roadster', 'Semi']),
 ('Kako Tesla naziva svoj sustav poluautonomne vožnje?', 'Autopilot', ['Copilot', 'Waymo', 'Cruise']),
 ('Koji je njemački proizvođač 2018. postao dioničar Rimac Automobila, a 2021. suosnivač tvrtke Bugatti Rimac?', 'Porsche', ['BMW', 'Mercedes-Benz', 'Audi']),
 ('Tko je 2024. postao svjetski prvak u Formuli 1?', 'Max Verstappen', ['Lando Norris', 'Charles Leclerc', 'Lewis Hamilton']),
])
drop('Hrvatska', [18,39,40,46,48,88,89,59,41,42,3,9])
add('Hrvatska', [
 ('Koji je hrvatski grad 2020. bio europska prijestolnica kulture?', 'Rijeka', ['Split', 'Osijek', 'Zadar']),
 ('Tko je od 2020. predsjednik Republike Hrvatske?', 'Zoran Milanović', ['Kolinda Grabar-Kitarović', 'Andrej Plenković', 'Ivo Josipović']),
 ('Tko je od listopada 2016. predsjednik Vlade Republike Hrvatske?', 'Andrej Plenković', ['Tihomir Orešković', 'Zoran Milanović', 'Ivo Sanader']),
 ('Koje je godine snažan potres pogodio Zagreb i oštetio katedralu?', '2020.', ['2017.', '2019.', '2022.']),
 ('Koju je hrvatsku aplikaciju za rješavanje matematičkih zadataka fotografiranjem Google kupio 2022.?', 'Photomath', ['Duolingo', 'Kahoot', 'Mathway']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Jezici i riječi','Drevne civilizacije','Automobili i promet','Hrvatska']: print(c, len(C[c]))
