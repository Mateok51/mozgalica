# Jednokratno čišćenje 4 (v58): Sport, Nogomet.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(60)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert q not in have and len({a, *w}) == 4, q
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Sport', [0, 5, 1, 4, 94, 95, 34, 35, 36, 2, 9, 32])
add('Sport', [
 ('Koji je španjolski tenisač 2023. i 2024. osvojio Wimbledon?', 'Carlos Alcaraz', ['Rafael Nadal', 'Roberto Bautista Agut', 'Alejandro Davidovich Fokina']),
 ('Koji je tenisač 2023. osvojio svoj 24. Grand Slam naslov u muškoj konkurenciji, rekord svih vremena?', 'Novak Đoković', ['Rafael Nadal', 'Roger Federer', 'Carlos Alcaraz']),
 ('Koji je košarkaš 2023. s Denver Nuggetsima osvojio NBA naslov i nagradu za MVP-ja finala?', 'Nikola Jokić', ['Jimmy Butler', 'Stephen Curry', 'Luka Dončić']),
 ('Za koji je klub Luka Dončić igrao do veljače 2025., kada je zamijenjen u Los Angeles Lakerse?', 'Dallas Mavericks', ['Houston Rockets', 'Boston Celtics', 'Miami Heat']),
 ('Koji je vozač Formule 1 2021. prekinuo Hamiltonovu seriju i postao svjetski prvak?', 'Max Verstappen', ['Charles Leclerc', 'Sebastian Vettel', 'Valtteri Bottas']),
 ('U kojem se sportu natječe Simone Biles, jedna od najuspješnijih sportašica svih vremena?', 'Gimnastika', ['Plivanje', 'Atletika', 'Skokovi u vodu']),
 ('Koji je Kenijac 2019. neslužbeno prvi istrčao maraton ispod dva sata?', 'Eliud Kipchoge', ['Kelvin Kiptum', 'Mo Farah', 'David Rudisha']),
 ('Koji je talijanski tenisač 2024. postao broj jedan na svijetu?', 'Jannik Sinner', ['Matteo Berrettini', 'Lorenzo Musetti', 'Fabio Fognini']),
])
drop('Nogomet', [4, 5, 16, 90, 8, 7, 86])
add('Nogomet', [
 ('Koji je klub 2025. prvi put u povijesti osvojio Ligu prvaka, svladavši Inter 5:0 u finalu?', 'Paris Saint-Germain', ['Arsenal', 'Bayern München', 'Barcelona']),
 ('U koji je saudijski klub 2023. prešao Cristiano Ronaldo?', 'Al-Nassr', ['Al-Hilal', 'Al-Ittihad', 'Al-Ahli']),
 ('U koji je klub Lionel Messi prešao 2023. iz Pariza?', 'Inter Miami', ['LA Galaxy', 'New York City FC', 'Al-Hilal']),
 ('Za koji je klub Kylian Mbappé zaigrao 2024. nakon odlaska iz PSG-a?', 'Real Madrid', ['Liverpool', 'Manchester City', 'Barcelona']),
 ('Koji je španjolski tinejdžer, rođen 2007., bio zvijezda EP-a 2024.?', 'Lamine Yamal', ['Pedri', 'Gavi', 'Nico Williams']),
 ('Koja je reprezentacija 2023. osvojila Svjetsko prvenstvo u nogometu za žene?', 'Španjolska', ['Engleska', 'SAD', 'Švedska']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print(len(C['Sport']), len(C['Nogomet']))
