# Jednokratno čišćenje 14 (v58): Božić i blagdani, Kuhinje svijeta, Dinosauri i prapovijest.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(70)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Božić i blagdani', [18,35,38,25,43])
add('Božić i blagdani', [
 ('Koja je životinja kineskog zodijaka obilježila 2026. godinu?', 'Konj', ['Zmija', 'Zmaj', 'Majmun']),
 ('Koji glumac glumi Buddyja u božićnoj komediji Elf iz 2003.?', 'Will Ferrell', ['Jim Carrey', 'Adam Sandler', 'Steve Carell']),
])
drop('Kuhinje svijeta', [15,51,33,46,45,44,54,20])
add('Kuhinje svijeta', [
 ('Kako se zove korejsko jelo od rižinih štapića u ljutom umaku, često viđeno u K-dramama?', 'Tteokbokki', ['Bibimbap', 'Bulgogi', 'Japchae']),
 ('Kako se zovu japanske pržene kuglice s komadićem hobotnice?', 'Takoyaki', ['Okonomiyaki', 'Onigiri', 'Gyoza']),
 ('Kako se zove islandsko jelo od fermentiranog grenlandskog morskog psa?', 'Hákarl', ['Skyr', 'Lutefisk', 'Gravlax']),
])
drop('Dinosauri i prapovijest', [18,21,27,28,38,39,51])
add('Dinosauri i prapovijest', [
 ('U kojoj je državi 2013. u špilji Rising Star otkriven Homo naledi?', 'Južnoj Africi', ['Etiopiji', 'Keniji', 'Tanzaniji']),
 ('Prije otprilike koliko se godina pojavio Homo sapiens?', 'Oko 300 000', ['Oko 30 000', 'Oko 3 milijuna', 'Oko 30 milijuna']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Božić i blagdani','Kuhinje svijeta','Dinosauri i prapovijest']: print(c, len(C[c]))
print('ukupno', sum(len(l) for l in C.values()))
