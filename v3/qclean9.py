# Jednokratno čišćenje 9 (v58): Životinje, Svemir, Ljudsko tijelo, Kemija (+ uklanjanje duplikata dodanih u Znanost).
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(65)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
# duplikati iz prošlog koraka (već postoje u Svemiru)
C['Znanost'] = [x for x in C['Znanost'] if not (x['q'].startswith('Koji je NASA-in rover 2021.') or x['q'].startswith('Koja je država 2023. prva sletjela'))]
drop('Životinje', [0,1,3,4,5,6,7,17,28,36,85,96,98,100])
add('Životinje', [
 ('Koja je životinja Moo Deng, viralni hit s tajlandskog zoološkog vrta iz 2024.?', 'Patuljasti vodenkonj', ['Patuljasta svinja', 'Kapibara', 'Panda']),
 ('Koliko sati dnevno spava koala?', 'Oko 20', ['Oko 8', 'Oko 12', 'Oko 14']),
 ('Kod koje morske životinje mužjak nosi mladunce i rađa ih?', 'Morski konjic', ['Morski pas', 'Dupin', 'Hobotnica']),
 ('Koja se meduza može vraćati u mladi stadij pa se naziva besmrtnom?', 'Turritopsis dohrnii', ['Morska osa', 'Mjesečeva meduza', 'Portugalski ratni brod']),
 ('Koja životinja ima najjači ugriz?', 'Morski krokodil', ['Lav', 'Bijeli morski pas', 'Hijena']),
])
drop('Svemir', [0,2,6,20,13,17,38,48,57,113])
add('Svemir', [
 ('U kojoj je galaksiji 2019. snimljena prva slika sjene crne rupe?', 'M87', ['Mliječni put', 'Andromeda', 'Vrtlog']),
 ('Koji je glumac Zvjezdanih staza 2021. otputovao u svemir raketom New Shepard?', 'William Shatner', ['Leonard Nimoy', 'Patrick Stewart', 'George Takei']),
 ('Kako se zove prvi poznati međuzvjezdani objekt koji je 2017. prošao kroz Sunčev sustav?', 'ʻOumuamua', ['Halleyev komet', 'Ceres', 'Eris']),
 ('Približno koliko je egzoplaneta potvrđeno do 2023.?', 'Više od 5000', ['Oko 50', 'Oko 500', 'Više od 50 000']),
 ('Koja je NASA-ina sonda 2021. prvi put „dotaknula“ Sunce ušavši u njegovu koronu?', 'Parker Solar Probe', ['Voyager 1', 'Juno', 'New Horizons']),
])
drop('Ljudsko tijelo', [1,5,11,15,17,36,48,60,68,81,82,88,89,92,97,98,95,10,69])
add('Ljudsko tijelo', [
 ('Koliko sline otprilike proizvodi čovjek dnevno?', 'Oko 1 – 1,5 litre', ['Oko 0,1 litre', 'Oko 5 litara', 'Oko 10 litara']),
 ('Koji unutarnji organ ima iznimnu sposobnost regeneracije?', 'Jetra', ['Srce', 'Mozak', 'Bubreg']),
 ('Koliko se otprilike puta dnevno otkuca srce odrasle osobe?', 'Oko 100 000', ['Oko 10 000', 'Oko 1 000 000', 'Oko 10 000 000']),
 ('Koji virus uzrokuje bolest COVID-19?', 'SARS-CoV-2', ['HIV', 'Influenca A', 'Ebola']),
 ('Koliko sati sna preporučuju liječnici odraslima?', '7 – 9', ['4 – 5', '5 – 6', '10 – 12']),
])
drop('Kemija', [20,21,22,23,24,25,26,27,28,29,13,71,89,50,43,44,38,39])
add('Kemija', [
 ('Koji je najteži poznati element u periodnom sustavu?', 'Oganeson', ['Uran', 'Plutonij', 'Kalifornij']),
 ('Koji je metal ključan sastojak baterija u mobitelima i električnim automobilima?', 'Litij', ['Olovo', 'Živa', 'Cink']),
 ('Od kojeg se elementa sastoji grafen, jednoatomni sloj poznat po čvrstoći?', 'Ugljika', ['Silicija', 'Bora', 'Titana']),
 ('Koja se vrsta plastike najčešće koristi za boce za vodu?', 'PET', ['PVC', 'Teflon (PTFE)', 'Polistiren']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Životinje','Svemir','Ljudsko tijelo','Kemija','Znanost']: print(c, len(C[c]))
