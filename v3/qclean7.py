# Jednokratno čišćenje 7 (v58): Općenito, Rekordi i superlativi, Izumi i otkrića, Slavni parovi i obitelji.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(63)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert q not in have and len({a, *w}) == 4, q
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Općenito', [0,1,2,3,5,8,9,10,12,13,14,18,19,20,21,22,23,25,30,31,32,33,35,43,44,52,56,57,58,60,61,72,73,84,87,89,88,17,16,26])
add('Općenito', [
 ('Koja je država 1. siječnja 2023. postala dvadeseta članica eurozone?', 'Hrvatska', ['Bugarska', 'Rumunjska', 'Poljska']),
 ('Koliko nula ima broj googol?', '100', ['10', '1000', '1 000 000']),
 ('Koji je najmanji prosti broj?', '2', ['0', '1', '3']),
 ('Koja havajska riječ znači i pozdrav i ljubav?', 'Aloha', ['Mahalo', 'Ohana', 'Kokua']),
])
drop('Rekordi i superlativi', [5,11,38,39,10,35,63,72,73,15,12,62,64,50])
add('Rekordi i superlativi', [
 ('Koji je najgledaniji videozapis na YouTubeu svih vremena?', 'Baby Shark Dance', ['Despacito', 'Shape of You', 'See You Again']),
 ('Koja je tvrtka prva dosegla tržišnu vrijednost od 3 bilijuna dolara?', 'Apple', ['Microsoft', 'Amazon', 'Saudi Aramco']),
 ('Koji je najprodavaniji automobilski model svih vremena?', 'Toyota Corolla', ['Volkswagen Golf', 'Ford Model T', 'Honda Civic']),
 ('Čija je koncertna turneja Eras Tour postala najuspješnija u povijesti po zaradi?', 'Taylor Swift', ['Beyoncé', 'Coldplay', 'Ed Sheeran']),
 ('Koji nogometaš ima najviše pratitelja na Instagramu?', 'Cristiano Ronaldo', ['Lionel Messi', 'Neymar', 'Kylian Mbappé']),
])
drop('Izumi i otkrića', [50,51,74,57,61,65,7,28,66,44,45,46,59,54])
add('Izumi i otkrića', [
 ('Tko je 1928. slučajno otkrio penicilin?', 'Alexander Fleming', ['Joseph Lister', 'Paul Ehrlich', 'Jonas Salk']),
 ('Po kojem je znanstveniku nazvan bozon otkriven 2012. u CERN-u?', 'Peteru Higgsu', ['Stephenu Hawkingu', 'Nielsu Bohru', 'Albertu Einsteinu']),
 ('Koje su dvije znanstvenice 2020. dobile Nobelovu nagradu za kemiju za alat za uređivanje gena CRISPR?', 'Jennifer Doudna i Emmanuelle Charpentier', ['Katalin Karikó i Drew Weissman', 'Rosalind Franklin i Dorothy Hodgkin', 'Marie Curie i Irène Joliot-Curie']),
 ('Za razvoj kojih su cjepiva Katalin Karikó i Drew Weissman dobili Nobelovu nagradu 2023.?', 'mRNA cjepiva', ['Cjepiva s oslabljenim virusom', 'Cjepiva od inaktiviranog virusa', 'DNA cjepiva']),
 ('Što je 2015. prvi put izravno otkriveno detektorom LIGO?', 'Gravitacijski valovi', ['Higgsov bozon', 'Tamna tvar', 'Neutrini']),
 ('Koje je godine tvrtka OpenAI predstavila ChatGPT?', '2022.', ['2019.', '2020.', '2023.']),
])
drop('Slavni parovi i obitelji', [4, 6, 24, 27, 29, 36])
add('Slavni parovi i obitelji', [
 ('Koji je glumac suprug glumice Blake Lively?', 'Ryan Reynolds', ['Chris Evans', 'Ben Affleck', 'Bradley Cooper']),
 ('Koji je nogometaš partner Georgine Rodríguez?', 'Cristiano Ronaldo', ['Lionel Messi', 'Neymar', 'Kylian Mbappé']),
 ('S kojim je reperom Kim Kardashian bila udana?', 'Kanyeom Westom', ['Jay-Zjem', 'Drakeom', 'Travisom Scottom']),
 ('Koja je pjevačica kći pjevača Billyja Raya Cyrusa?', 'Miley Cyrus', ['Selena Gomez', 'Demi Lovato', 'Ariana Grande']),
 ('Tko je 2022. naslijedio kraljicu Elizabetu II. na britanskom prijestolju?', 'Charles III.', ['William', 'Harry', 'Andrew']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Općenito','Rekordi i superlativi','Izumi i otkrića','Slavni parovi i obitelji']: print(c, len(C[c]))
