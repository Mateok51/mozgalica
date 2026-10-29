# Jednokratno čišćenje 2 (v57): Film i TV, Serije, Videoigre (stara klasika i duplikati → moderni naslovi), emoji zagonetke.
# Uklanjanje po izvornim indeksima (odjednom), nova pitanja na kraj kategorije.
import json, random
SP = '/root/mozgalica'
P = SP + '/v3/data.json'
d = json.load(open(P, encoding='utf-8'))
C = d['cats']
rnd = random.Random(58)

def drop(cat, idx):
    assert len(set(idx)) == len(idx), cat
    C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]

def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert q not in have and len({a, *w}) == 4, q
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a)
        C[cat].append({'q': q, 'o': o, 'a': pos})

# --- Film i TV: 17 uklonjeno (duplikati sa Serijama i vrlo stara klasika), 16 novih
film_rm = [7, 10, 25, 40, 57, 67, 72, 76, 77, 82, 87, 88, 89, 90, 91, 92, 94]
drop('Film i TV', film_rm)
add('Film i TV', [
 ('Koji je film o tvorcu atomske bombe osvojio Oscara za najbolji film 2024.?', 'Oppenheimer', ['Barbie', 'Siromašna stvorenja (Poor Things)', 'Anatomija jednog pada']),
 ('Koji je redatelj snimio film Dina (2021.) i njegov nastavak iz 2024.?', 'Denis Villeneuve', ['Christopher Nolan', 'Ridley Scott', 'Martin Scorsese']),
 ('Koji je film Grete Gerwig, prikazan istodobno s Oppenheimerom u srpnju 2023., stvorio fenomen „Barbenheimer“?', 'Barbie', ['Wonka', 'Mission: Impossible', 'Indiana Jones']),
 ('Koja glumica glumi naslovnu lutku u filmu Barbie iz 2023.?', 'Margot Robbie', ['Emma Stone', 'Zendaya', 'Florence Pugh']),
 ('Koji je film 2023. osvojio sedam Oscara, među njima onaj za najbolji film i za Michelle Yeoh?', 'Sve, svugdje, odjednom', ['Oppenheimer', 'Fabelmanovi', 'Na zapadu ništa novo']),
 ('Koji glumac glumi Paula Atreidesa u filmu Dina?', 'Timothée Chalamet', ['Tom Holland', 'Austin Butler', 'Dev Patel']),
 ('Koji je Marvelov film iz 2019. nakratko postao najuspješniji film svih vremena po zaradi, prestigavši Avatar?', 'Osvetnici: Završnica', ['Osvetnici: Rat beskonačnosti', 'Crna Pantera', 'Spider-Man: Put bez povratka']),
 ('Koji je glumac 2020. osvojio Oscara za glavnu mušku ulogu u filmu Joker?', 'Joaquin Phoenix', ['Leonardo DiCaprio', 'Adam Driver', 'Antonio Banderas']),
 ('Koja je pjesma iz Disneyjeva filma Encanto (2021.) 2022. stigla na vrh ljestvice Billboard Hot 100?', 'We Don’t Talk About Bruno', ['Surface Pressure', 'Dos Oruguitas', 'How Far I’ll Go']),
 ('Koji je Miyazakijev film osvojio Oscara za najbolji animirani film 2024.?', 'Dječak i čaplja', ['Spider-Man: Across the Spider-Verse', 'Elemental', 'Nimona']),
 ('Koji je animirani film iz 2018. o Milesu Moralesu osvojio Oscara za najbolji animirani film?', 'Spider-Man: Into the Spider-Verse', ['Incredibles 2', 'Ralph Breaks the Internet', 'Isle of Dogs']),
 ('Koja je streaming platforma prikazala serije Igra lignje, Wednesday i Stranger Things?', 'Netflix', ['HBO Max', 'Disney+', 'Prime Video']),
 ('Koji glumac glumi Batmana u filmu The Batman iz 2022.?', 'Robert Pattinson', ['Ben Affleck', 'Christian Bale', 'Henry Cavill']),
 ('Koji glumac glumi Deadpoola u Marvelovim filmovima?', 'Ryan Reynolds', ['Hugh Jackman', 'Chris Hemsworth', 'Ryan Gosling']),
 ('Koji glumac glumi Elvisa Presleyja u filmu Baza Luhrmanna iz 2022.?', 'Austin Butler', ['Miles Teller', 'Jacob Elordi', 'Adam Driver']),
 ('Koji je glumac za ulogu Freddieja Mercuryja u filmu Bohemian Rhapsody osvojio Oscara?', 'Rami Malek', ['Christian Bale', 'Bradley Cooper', 'Viggo Mortensen']),
])

# --- Serije: 6 uklonjeno (osam pitanja o Prijateljima je previše, duplikati), 7 novih
drop('Serije', [1, 10, 13, 41, 61, 86])
add('Serije', [
 ('Koja serija prati mladog kuhara koji preuzima obiteljsku sendvičarnicu u Chicagu?', 'The Bear', ['Ted Lasso', 'Nasljeđe (Succession)', 'Ozark']),
 ('Koja serija prati američkog nogometnog trenera koji vodi engleski nogometni klub?', 'Ted Lasso', ['The Bear', 'Emily u Parizu', 'Bridgerton']),
 ('Koja serija prati zaposlenike tvrtke Lumon kojima su radna i privatna svijest odvojene operacijom?', 'Severance', ['Westworld', 'Mračno (Dark)', 'Mr. Robot']),
 ('Koja je Disneyjeva serija o osamljenom lovcu na glave i malom zelenom štićeniku Groguu pokrenula platformu Disney+ 2019.?', 'The Mandalorian', ['Andor', 'Ahsoka', 'Obi-Wan Kenobi']),
 ('Koja serija prati skupinu običnih ljudi koji se bore protiv korumpiranih superheroja korporacije Vought?', 'The Boys', ['Osvetnici', 'Umbrella Academy', 'Peacemaker']),
 ('Koja britanska Netflixova miniserija iz 2025., snimljena u epizodama od jednog neprekinutog kadra, prati trinaestogodišnjaka optuženog za ubojstvo?', 'Adolescence', ['Bijeli lotos', 'Sluge naroda', 'Bodyguard']),
 ('Koja je serija Amazona iz 2024. nastala prema postapokaliptičnoj videoigri o skloništima Vault-Tec?', 'Fallout', ['The Last of Us', 'Silo', 'Arcane']),
])

# --- Videoigre: 14 uklonjeno (sitnice o bojama i kraticama, ponavljanja), 14 novih
drop('Videoigre', [44, 106, 53, 109, 18, 102, 125, 64, 111, 110, 69, 70, 45, 9])
add('Videoigre', [
 ('Koji je nastavak igre Breath of the Wild izašao 2023. za Nintendo Switch?', 'The Legend of Zelda: Tears of the Kingdom', ['Link’s Awakening', 'Twilight Princess', 'Skyward Sword']),
 ('Koja je igra studija Larian 2023. osvojila igru godine na The Game Awards?', 'Baldur’s Gate 3', ['Elden Ring', 'Starfield', 'Alan Wake 2']),
 ('Koja je igra 2024. osvojila igru godine na The Game Awards?', 'Astro Bot', ['Black Myth: Wukong', 'Balatro', 'Elden Ring: Shadow of the Erdtree']),
 ('Koja je kineska akcijska igra iz 2024. nastala prema klasičnom romanu „Putovanje na Zapad“?', 'Black Myth: Wukong', ['Sekiro: Shadows Die Twice', 'Ghost of Tsushima', 'Wo Long: Fallen Dynasty']),
 ('Koja je Sonyjeva konzola izašla u studenom 2020.?', 'PlayStation 5', ['PlayStation 4 Pro', 'PlayStation Vita', 'PlayStation 3 Slim']),
 ('Koja je Nintendova konzola izašla 2025. kao nasljednica konzole Switch?', 'Nintendo Switch 2', ['Nintendo Wii U', 'Nintendo Switch Lite', 'Nintendo 3DS']),
 ('Koji je film iz 2023. s Chrisom Prattom kao glasom Maria zaradio više od milijardu dolara?', 'The Super Mario Bros. Movie', ['Detective Pikachu', 'Sonic the Hedgehog 2', 'Ralph Breaks the Internet']),
 ('Kako se zove glavni junak igre Red Dead Redemption 2 iz 2018.?', 'Arthur Morgan', ['John Marston', 'Dutch van der Linde', 'Micah Bell']),
 ('Na kojoj platformi tvrtke Amazon gledatelji uživo prate igrače i streamere?', 'Twitch', ['Discord', 'Steam', 'Kick']),
 ('Koja je igra iz 2023. smještena u svijet Harryja Pottera u 19. stoljeću?', 'Hogwarts Legacy', ['Harry Potter: Magic Awakened', 'Fantastic Beasts: Cursed Creatures', 'LEGO Harry Potter']),
 ('Koja je igra iz 2020. s uređivanjem otoka postala hit tijekom pandemije?', 'Animal Crossing: New Horizons', ['Stardew Valley', 'Minecraft', 'The Sims 4']),
 ('Kako se zove sin glavnog junaka u igri God of War iz 2018.?', 'Atreus', ['Deimos', 'Mimir', 'Fenrir']),
 ('Koji glumac glumi Johnnyja Silverhanda u igri Cyberpunk 2077?', 'Keanu Reeves', ['Tom Hardy', 'Ryan Reynolds', 'Idris Elba']),
 ('Koji je samostalni programer sam stvorio igru Stardew Valley (2016.)?', 'Eric Barone', ['Markus Persson', 'Toby Fox', 'Jonathan Blow']),
])

# --- emoji zagonetke: moderni naslovi, pjesme, igre
def em(c, e, a, w):
    o = list(w); pos = rnd.randrange(4); o.insert(pos, a)
    assert len(set(o)) == 4 and all(x['e'] != e for x in d['emoji'])
    d['emoji'].append({'c': c, 'e': e, 'o': o, 'a': pos})
em('Film', '👱‍♀️💗🎀', 'Barbie', ['Hannah Montana', 'Mean Girls', 'Pretty Woman'])
em('Film', '⚛️💥🧑‍🔬', 'Oppenheimer', ['Tenet', 'Dunkirk', 'Interstellar'])
em('Film', '🏜️🪱🧂', 'Dina', ['Mad Max', 'Blade Runner 2049', 'Ratovi zvijezda'])
em('Serija', '🍄👧🌲', 'The Last of Us', ['Dark', 'Fallout', 'Lost'])
em('Serija', '👶🟢🚀', 'The Mandalorian', ['Andor', 'Obi-Wan Kenobi', 'Ahsoka'])
em('Pjesma ili bend', '🦈👶🎶', 'Baby Shark', ['Under the Sea', 'Let It Go', 'Happy Birthday'])
em('Pjesma ili bend', '🐴🕺🇰🇷', 'Gangnam Style', ['Macarena', 'Harlem Shake', 'Despacito'])
em('Pjesma ili bend', '🐌🕺🇵🇷', 'Despacito', ['Gasolina', 'Macarena', 'Havana'])
em('Pjesma ili bend', '💃👑🇸🇪', 'Dancing Queen', ['Waterloo', 'Mamma Mia', 'Fernando'])
em('Igra', '🧑‍🚀🔪🔴', 'Among Us', ['Fall Guys', 'Fortnite', 'Roblox'])
em('Igra', '🪂🔫🏝️', 'Fortnite', ['PUBG', 'Apex Legends', 'Call of Duty'])
em('Igra', '🗡️🧝🛡️', 'The Legend of Zelda', ['Skyrim', 'Dark Souls', 'Final Fantasy'])
em('Brend', '🎵📱🕺', 'TikTok', ['Instagram', 'Snapchat', 'Pinterest'])
em('Anime', '🐉🔮🟠', 'Dragon Ball', ['Naruto', 'Bleach', 'Pokémon'])

open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print('film', len(C['Film i TV']), 'serije', len(C['Serije']), 'igre', len(C['Videoigre']), 'emoji', len(d['emoji']), 'ukupno', sum(len(l) for l in C.values()))
