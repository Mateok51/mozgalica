# Jednokratno čišćenje 6 (v58): Crtani filmovi, Superjunaci i stripovi, Anime, Hrana i piće.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(62)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert q not in have and len({a, *w}) == 4, q
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Crtani filmovi', [18,92,93,94,97,98,99,20,21,23,24,89,87,88,42,57,19])
add('Crtani filmovi', [
 ('Kako se zove Elsina mlađa sestra u Disneyjevu Snježnom kraljevstvu?', 'Anna', ['Moana', 'Merida', 'Rapunzel']),
 ('Koja je policajka zec u Disneyjevu filmu Zootropolis?', 'Judy Hopps', ['Nick Wilde', 'Gazelle', 'Clawhauser']),
 ('Tko je u izvornoj verziji posudio glas Mariju u animiranom filmu iz 2023.?', 'Chris Pratt', ['Tom Holland', 'Ryan Reynolds', 'Jack Black']),
 ('Koji studio stoji iza filmova o Minionima?', 'Illumination', ['Pixar', 'DreamWorks', 'Blue Sky']),
 ('Koja je britanska crtana serija o svinjici i njezinoj obitelji?', 'Peppa Pig', ['Bluey', 'Paw Patrol', 'Ben i Holly']),
 ('Tko je dječak koji vodi pse spasioce u crtanoj seriji Šapa Patrola?', 'Ryder', ['Chase', 'Marshall', 'Skye']),
 ('Prema kojoj je videoigri nastala animirana serija Arcane?', 'League of Legends', ['Dota 2', 'Overwatch', 'Fortnite']),
 ('Kako se zove luđak znanstvenik u crtanoj seriji Rick i Morty?', 'Rick Sanchez', ['Professor Farnsworth', 'Dexter', 'Jimmy Neutron']),
])
drop('Superjunaci i stripovi', [7,29,52,54,56,58,59,61,72,87,88,89,90,91,94,96])
add('Superjunaci i stripovi', [
 ('Koji glumac glumi Deadpoola u filmovima?', 'Ryan Reynolds', ['Hugh Jackman', 'Chris Evans', 'Tom Hardy']),
 ('Koji je glumac glumio Jokera u filmu iz 2019. i za to osvojio Oscara?', 'Joaquin Phoenix', ['Jared Leto', 'Jack Nicholson', 'Barry Keoghan']),
 ('Koji je glumac glumio Batmana u filmu iz 2022.?', 'Robert Pattinson', ['Ben Affleck', 'Christian Bale', 'Michael Keaton']),
 ('Koji je glumac u Marvelovim filmovima Kapetan Amerika?', 'Chris Evans', ['Chris Hemsworth', 'Chris Pratt', 'Chris Pine']),
 ('Kako se zove superjunak kojeg glumi Antony Starr u seriji The Boys?', 'Homelander', ['Soldier Boy', 'A-Train', 'Starlight']),
 ('Koji je Marvelov film iz 2021. okupio tri filmska Spider-Mana?', 'Spider-Man: No Way Home', ['Spider-Man: Homecoming', 'Spider-Man: Far From Home', 'The Amazing Spider-Man']),
])
drop('Anime', [37, 40, 41])
add('Anime', [
 ('Kako se zove glavni junak animea Jujutsu Kaisen?', 'Yuji Itadori', ['Satoru Gojo', 'Megumi Fushiguro', 'Nobara Kugisaki']),
 ('Kako se zove djevojčica telepat u animeu Spy x Family?', 'Anya', ['Yor', 'Becky', 'Damian']),
 ('Koji je anime film 2020. postao najgledaniji japanski film svih vremena?', 'Demon Slayer: Mugen Train', ['Your Name', 'Spirited Away', 'Weathering with You']),
 ('Koja je streaming platforma 2023. izdala igranu seriju One Piece?', 'Netflix', ['Disney+', 'HBO Max', 'Amazon Prime']),
])
drop('Hrana i piće', [1,9,11,27,29,41,43,48,60,61,63,90,91])
add('Hrana i piće', [
 ('Iz koje zemlje potječe čaj s mjehurićima (bubble tea)?', 'Tajvana', ['Japana', 'Kine', 'Južne Koreje']),
 ('Koji se ljetni aperitiv narančaste boje pravi od prosecca, Aperola i sode?', 'Aperol Spritz', ['Negroni', 'Mojito', 'Bellini']),
 ('Koji se koktel pravi od tekile, soka od limete i likera triple sec?', 'Margarita', ['Mojito', 'Daiquiri', 'Cosmopolitan']),
 ('Koji se koktel pravi od ruma, mente, limete, šećera i gazirane vode?', 'Mojito', ['Margarita', 'Piña colada', 'Caipirinha']),
 ('Iz koje zemlje potječe koktel caipirinha?', 'Brazila', ['Kube', 'Meksika', 'Perua']),
 ('Koja je viralna čokolada s pistacijama i tankim tijestom kadaif 2024. dobila ime po gradu?', 'Dubai čokolada', ['Istanbul čokolada', 'Beč čokolada', 'Zürich čokolada']),
 ('S kojeg otočja potječe poke bowl?', 'Havaja', ['Japana', 'Filipina', 'Tahitija']),
 ('Što je ramen?', 'Japanska juha s rezancima', ['Korejska juha od kupusa', 'Kineski pirjani rižin kolač', 'Vijetnamski rižin papir']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Crtani filmovi','Superjunaci i stripovi','Anime','Hrana i piće']: print(c, len(C[c]))
