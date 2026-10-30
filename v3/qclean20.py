# Jednokratno 20 (v60): dopuna kategorije „Estrada i slavne osobe”.
import json, random, re
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(76)
CAT = 'Estrada i slavne osobe'
def W(t): return set(re.findall(r'\w+', t.lower()))
allq = [(x['q'], x['o'][x['a']]) for l in C.values() for x in l]
def dup(q, a):
    w = W(q)
    for q2, a2 in allq:
        if q2 == q or (a.lower() == a2.lower() and len(w & W(q2)) / max(1, len(w | W(q2))) >= 0.4): return q2
for q, a, w in [
 ('Pod kojim je umjetničkim imenom poznat glumac Dwayne Johnson?', 'The Rock', ['The Mountain', 'The Giant', 'Big Show']),
 ('Koje je pravo ime glumca Vina Diesela?', 'Mark Sinclair', ['Vincent Dieselman', 'Mark Wahlberg', 'Michael Dwyer']),
 ('Koji je britanski komičar stvorio lik Mr. Beana?', 'Rowan Atkinson', ['Hugh Laurie', 'Ricky Gervais', 'Stephen Fry']),
 ('Iz koje je zemlje pjevačica Rihanna?', 'S Barbadosa', ['S Jamajke', 'S Trinidada', 'Iz Haitija']),
 ('Iz koje je zemlje pjevačica Céline Dion?', 'Kanade', ['Francuske', 'Belgije', 'Švicarske']),
 ('Iz koje je zemlje pjevačica Björk?', 'Islanda', ['Norveške', 'Finske', 'Danske']),
 ('Iz koje je zemlje glumac Hugh Jackman, poznat kao Wolverine?', 'Australije', ['Novog Zelanda', 'Velike Britanije', 'Kanade']),
 ('Iz koje je zemlje glumica Gal Gadot, poznata kao Wonder Woman?', 'Izraela', ['Libanona', 'Grčke', 'Italije']),
 ('U kojoj se zemlji rodio glumac Arnold Schwarzenegger?', 'Austriji', ['Njemačkoj', 'Švicarskoj', 'SAD-u']),
 ('Koji je glumac glumio Harryja Pottera u filmovima?', 'Daniel Radcliffe', ['Rupert Grint', 'Tom Felton', 'Eddie Redmayne']),
 ('Koja je glumica glumila Katniss Everdeen u filmovima Igre gladi?', 'Jennifer Lawrence', ['Emma Stone', 'Shailene Woodley', 'Kristen Stewart']),
 ('Koji glumac u filmovima Marvela glumi Thora?', 'Chris Hemsworth', ['Chris Evans', 'Chris Pratt', 'Liam Hemsworth']),
 ('Koja glumica u Marvelovim filmovima glumi Black Widow?', 'Scarlett Johansson', ['Elizabeth Olsen', 'Brie Larson', 'Zoe Saldaña']),
 ('Koji je glumac 2022. glumio Batmana u filmu Batman?', 'Robert Pattinson', ['Ben Affleck', 'Christian Bale', 'Michael Keaton']),
 ('Koji je glumac glumio Maximusa u filmu Gladijator iz 2000.?', 'Russell Crowe', ['Mel Gibson', 'Brad Pitt', 'Gerard Butler']),
 ('Koji glumac glumi Rockyja Balboa?', 'Sylvester Stallone', ['Arnold Schwarzenegger', 'Bruce Willis', 'Jean-Claude Van Damme']),
 ('Koji je pjevač poznat pod nadimkom Old Blue Eyes?', 'Frank Sinatra', ['Dean Martin', 'Bing Crosby', 'Tony Bennett']),
 ('Koji je pjevač izveo hit Livin\' la Vida Loca?', 'Ricky Martin', ['Enrique Iglesias', 'Marc Anthony', 'Luis Fonsi']),
 ('Koji je britanski pjevač izveo hit Shape of You?', 'Ed Sheeran', ['Harry Styles', 'Sam Smith', 'James Blunt']),
 ('Koja je pjevačica izvela hit Bad Guy 2019.?', 'Billie Eilish', ['Dua Lipa', 'Ariana Grande', 'Lorde']),
 ('Koja je pjevačica izvela hit drivers license 2021.?', 'Olivia Rodrigo', ['Billie Eilish', 'Sabrina Carpenter', 'Gracie Abrams']),
 ('Koji je reper izveo hit Old Town Road?', 'Lil Nas X', ['Post Malone', 'Drake', 'Travis Scott']),
 ('Koja je country-pjevačica izvela hit Jolene?', 'Dolly Parton', ['Shania Twain', 'Loretta Lynn', 'Reba McEntire']),
 ('U kojoj je ženskoj grupi Beyoncé započela karijeru?', 'Destiny\'s Child', ['TLC', 'En Vogue', 'Spice Girls']),
 ('Koja je pjevačica izvela hit Rolling in the Deep?', 'Adele', ['Amy Winehouse', 'Duffy', 'Florence Welch']),
 ('Koji je pjevač poznat po plesnom koraku moonwalk?', 'Michael Jackson', ['Prince', 'James Brown', 'Usher']),
]:
    assert len({a, *w}) == 4, q
    s = dup(q, a)
    if s: print('preskočeno:', q[:60], '| slično:', s[:60]); continue
    o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[CAT].append({'q': q, 'o': o, 'a': pos}); allq.append((q, a))
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print(CAT, len(C[CAT]), '| ukupno', sum(len(l) for l in C.values()))
