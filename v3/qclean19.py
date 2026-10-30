# Jednokratno 19 (v60): nova kategorija „Estrada i slavne osobe” (hrvatska i svjetska estrada).
import json, random, re
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(75)
assert 'Estrada i slavne osobe' not in C
CAT = 'Estrada i slavne osobe'; C[CAT] = []
def W(t): return set(re.findall(r'\w+', t.lower()))
allq = [(x['q'], x['o'][x['a']]) for l in C.values() for x in l]
def dup(q, a):
    w = W(q)
    for q2, a2 in allq:
        if q2 == q or (a.lower() == a2.lower() and len(w & W(q2)) / max(1, len(w | W(q2))) >= 0.4): return q2
for q, a, w in [
 # ---- hrvatska estrada ----
 ('Koji je dalmatinski pjevač izveo hit Cesarica?', 'Oliver Dragojević', ['Toše Proeski', 'Gibonni', 'Tedi Spalato']),
 ('Kojom je pjesmom Severina 2006. predstavljala Hrvatsku na Eurosongu u Ateni?', 'Moja štikla', ['Dalmatinka', 'Virujem u ljubav', 'Italiana']),
 ('Koju je zemlju Tajči 1990. predstavljala na Eurosongu pjesmom Hajde da ludujemo?', 'Jugoslaviju', ['Hrvatsku', 'Sloveniju', 'Austriju']),
 ('Koji je dugogodišnji pjevač grupe Parni valjak?', 'Aki Rahimovski', ['Zoran Predin', 'Davor Gobac', 'Mladen Bodalec']),
 ('Koji je crtani film Dušana Vukotića 1962. osvojio Oscara za najbolji animirani kratki film?', 'Surogat', ['Ersatz', 'Profesor Baltazar', 'Igra']),
 ('Koji je hrvatski glumac glumio dr. Luku Kovača u seriji Hitna služba (ER)?', 'Goran Višnjić', ['Rade Šerbedžija', 'Ivo Gregurević', 'Filip Šovagović']),
 ('Koju je lik u seriji Lost glumila hrvatska glumica Mira Furlan?', 'Danielle Rousseau', ['Kate Austen', 'Juliet Burke', 'Ana Lucia Cortez']),
 ('Kako se zove glavna hrvatska glazbena nagrada koja se dodjeljuje od 1994.?', 'Porin', ['Zlatna ploča', 'Orlando', 'Indexi']),
 ('Na kojem se zagrebačkom jezeru održava glazbeni festival INmusic?', 'Jarunu', ['Bundeku', 'Maksimiru', 'Savi']),
 ('Koji se međunarodni festival elektroničke glazbe održavao u Splitu na stadionu Poljud?', 'Ultra Europe', ['Tomorrowland', 'Exit', 'Sziget']),
 ('Tko je domaćin hrvatske verzije kviza Tko želi biti milijunaš?', 'Tarik Filipović', ['Zoran Šprajc', 'Aleksandar Stanković', 'Mislav Bago']),
 # ---- svjetska estrada ----
 ('Koje je pravo ime pjevača Eltona Johna?', 'Reginald Dwight', ['Edward Sheeran', 'Gordon Sumner', 'Peter Hernandez']),
 ('Koje je pravo ime pjevačice Lady Gage?', 'Stefani Germanotta', ['Katheryn Hudson', 'Alecia Moore', 'Robyn Fenty']),
 ('Koje je pravo ime repera Eminema?', 'Marshall Mathers', ['Curtis Jackson', 'Calvin Broadus', 'Shawn Carter']),
 ('Koje je pravo ime pjevača Brune Marsa?', 'Peter Gene Hernandez', ['Bruno Mars', 'Abel Tesfaye', 'Austin Post']),
 ('Koje je pravo ime pjevača Freddieja Mercuryja?', 'Farrokh Bulsara', ['Frederick Mercer', 'Brian May', 'Robert Plant']),
 ('Koje je pravo ime pjevača The Weeknda?', 'Abel Tesfaye', ['Aubrey Graham', 'Shawn Mendes', 'Austin Post']),
 ('Koje je pravo ime pjevača Snoop Dogga?', 'Calvin Broadus', ['Marshall Mathers', 'Curtis Jackson', 'Andre Young']),
 ('Što je pjevačica Lady Gaga odjenula na dodjeli MTV VMA nagrada 2010.?', 'Haljinu od mesa', ['Haljinu od leda', 'Haljinu od papira', 'Haljinu od balona']),
 ('Koji je glazbenik 2016. dobio Nobelovu nagradu za književnost?', 'Bob Dylan', ['Leonard Cohen', 'Paul McCartney', 'Bruce Springsteen']),
 ('Koja je pop-grupa objavila hit Wannabe 1996.?', 'Spice Girls', ['All Saints', 'Destiny\'s Child', 'Atomic Kitten']),
 ('Koja je južnokorejska grupa objavila hit Dynamite 2020.?', 'BTS', ['Blackpink', 'Twice', 'Exo']),
 ('Koja je pjevačica izvela hit Hips Don\'t Lie?', 'Shakira', ['Jennifer Lopez', 'Beyoncé', 'Rihanna']),
 ('Tko je prvi pobjednik showa American Idol, 2002.?', 'Kelly Clarkson', ['Carrie Underwood', 'Jennifer Hudson', 'Fantasia Barrino']),
 ('U kojem je bendu Harry Styles postao poznat prije solo karijere?', 'One Direction', ['The Wanted', 'Jonas Brothers', 'Take That']),
 ('Koji je glumac glumio Doma Toretta u filmovima Brzi i žestoki?', 'Vin Diesel', ['Dwayne Johnson', 'Paul Walker', 'Jason Statham']),
 ('Koja je glumica glumila naslovnu ulogu u filmu Barbie iz 2023.?', 'Margot Robbie', ['Emma Stone', 'Anne Hathaway', 'Zendaya']),
 ('Koji je glumac glumio Oppenheimera u istoimenom filmu i osvojio Oscara 2024.?', 'Cillian Murphy', ['Robert Downey Jr.', 'Matt Damon', 'Christian Bale']),
 ('Koja je glumica 2023. osvojila Oscara za film Sve, svugdje, odjednom?', 'Michelle Yeoh', ['Cate Blanchett', 'Ana de Armas', 'Michelle Williams']),
 ('Koja glumica ima rekordnih 21 nominaciju za Oscara?', 'Meryl Streep', ['Katharine Hepburn', 'Cate Blanchett', 'Judi Dench']),
 ('Koji je glumac jedini osvojio tri Oscara za glavnu mušku ulogu?', 'Daniel Day-Lewis', ['Jack Nicholson', 'Tom Hanks', 'Marlon Brando']),
 ('Koja pjevačica drži rekord po broju osvojenih Grammyja u povijesti?', 'Beyoncé', ['Taylor Swift', 'Adele', 'Aretha Franklin']),
 ('Što dodjeljuje filmski festival u Cannesu kao najvišu nagradu?', 'Zlatnu palmu', ['Zlatnog lava', 'Zlatnog medvjeda', 'Zlatni globus']),
 ('Koji filmski festival dodjeljuje Zlatnog lava?', 'Venecijanski', ['Cannesski', 'Berlinski', 'Sundance']),
 ('Koji filmski festival dodjeljuje Zlatnog medvjeda?', 'Berlinski', ['Venecijanski', 'Cannesski', 'Locarno']),
 ('Za što se dodjeljuje američka nagrada Tony?', 'Za kazalište', ['Za glazbu', 'Za televiziju', 'Za film']),
 ('Za što se dodjeljuje američka nagrada Emmy?', 'Za televiziju', ['Za film', 'Za kazalište', 'Za glazbu']),
 ('Koji kipić dobivaju pobjednici nagrade Grammy?', 'Zlatni gramofon', ['Zlatni mikrofon', 'Zlatnu ploču', 'Zlatnu notu']),
 ('Koja se poznata ulica u Los Angelesu uz zvijezde na pločniku zove Walk of Fame?', 'Hollywood Boulevard', ['Sunset Boulevard', 'Rodeo Drive', 'Melrose Avenue']),
 ('Koji je reality show od 2002. pratio život obitelji rock-glazbenika Ozzyja Osbournea?', 'The Osbournes', ['Keeping Up with the Kardashians', 'The Simple Life', 'Jersey Shore']),
]:
    assert len({a, *w}) == 4, q
    s = dup(q, a)
    if s: print('preskočeno:', q[:60], '| slično:', s[:60]); continue
    o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[CAT].append({'q': q, 'o': o, 'a': pos}); allq.append((q, a))
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print(CAT, len(C[CAT]), '| kategorija', len(C), '| ukupno', sum(len(l) for l in C.values()))
