# Jednokratno čišćenje 8 (v58): Geografija, Povijest, Znanost.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(64)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno (već postoji):', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Geografija', [3,4,5,7,9,10,11,13,16,20,28,40,72,76,79,83,84,85,86,88,89,93,94])
add('Geografija', [
 ('Koja je najmlađa država na svijetu, nastala 2011.?', 'Južni Sudan', ['Kosovo', 'Istočni Timor', 'Eritreja']),
 ('Kako se od 2022. u međunarodnoj uporabi službeno piše ime Turske?', 'Türkiye', ['Turkiyya', 'Turkistan', 'Anatolia']),
 ('Koji je glavni grad Kazahstana?', 'Astana', ['Almaty', 'Biškek', 'Taškent']),
 ('Koji grad treba zamijeniti Jakartu kao glavni grad Indonezije?', 'Nusantara', ['Surabaya', 'Bandung', 'Bali']),
 ('Koji je najveći grad Švicarske?', 'Zürich', ['Bern', 'Ženeva', 'Basel']),
 ('Koji je glavni grad Turske?', 'Ankara', ['Istanbul', 'Izmir', 'Bursa']),
 ('Koji je glavni grad Brazila?', 'Brasília', ['Rio de Janeiro', 'São Paulo', 'Salvador']),
])
drop('Povijest', [1,4,7,72,74])
add('Povijest', [
 ('Što su Britanci odlučili na referendumu 2016.?', 'Izlazak iz Europske unije', ['Ostanak u Europskoj uniji', 'Uvođenje eura', 'Neovisnost Škotske']),
 ('Koje je godine Ujedinjeno Kraljevstvo formalno napustilo Europsku uniju?', '2020.', ['2016.', '2018.', '2022.']),
 ('Koje je godine Rusija započela punu invaziju na Ukrajinu?', '2022.', ['2014.', '2020.', '2023.']),
 ('Koje je godine Svjetska zdravstvena organizacija proglasila pandemiju bolesti COVID-19?', '2020.', ['2018.', '2019.', '2021.']),
 ('Tko je 2021. postala prva žena potpredsjednica SAD-a?', 'Kamala Harris', ['Hillary Clinton', 'Condoleezza Rice', 'Nancy Pelosi']),
 ('Koji je papa 2025. postao prvi papa iz SAD-a?', 'Lav XIV.', ['Franjo', 'Benedikt XVI.', 'Ivan Pavao II.']),
 ('Tko je pobijedio na američkim predsjedničkim izborima 2024.?', 'Donald Trump', ['Joe Biden', 'Kamala Harris', 'Ron DeSantis']),
])
drop('Znanost', [1,6,7,8,9,18,74,38,46,47,79,80,107,108,109,12,66,77,10,11,21,22,23,24,25,27,28,95,96,106,53,54,82,83,84])
add('Znanost', [
 ('Koji je NASA-in rover 2021. sletio na Mars u krater Jezero?', 'Perseverance', ['Curiosity', 'Opportunity', 'Sojourner']),
 ('Koja je NASA-ina misija 2022. namjerno udarila u asteroid Dimorphos radi skretanja njegove putanje?', 'DART', ['OSIRIS-REx', 'Voyager', 'Juno']),
 ('Kako se zove NASA-in program povratka ljudi na Mjesec?', 'Artemis', ['Apollo', 'Gemini', 'Mercury']),
 ('Kako se zove malena letjelica koja je 2021. prva poletjela na drugom planetu?', 'Ingenuity', ['Curiosity', 'Sojourner', 'Pathfinder']),
 ('Koja je država 2019. prva sletjela na skrivenu stranu Mjeseca?', 'Kina', ['SAD', 'Rusija', 'Indija']),
 ('Koja je država 2023. prva sletjela u blizinu južnog pola Mjeseca?', 'Indija', ['Kina', 'SAD', 'Japan']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Geografija','Povijest','Znanost']: print(c, len(C[c]))
