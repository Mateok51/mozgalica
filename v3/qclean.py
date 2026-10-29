# Jednokratno čišćenje baze pitanja (v57): duplikati među kategorijama, pitanja koja odaju odgovor, moderna glazba.
# Uklanjanje ide po izvornim indeksima (svi odjednom), a nova pitanja dodaju se na kraj kategorije.
import json, random
SP = '/root/mozgalica'
P = SP + '/v3/data.json'
d = json.load(open(P, encoding='utf-8'))
C = d['cats']

# 1) isto pitanje u dvije kategorije: ostaje ono u užoj kategoriji
RM = {
 'Općenito': [90, 89, 97, 62, 102, 81, 80, 35, 46, 92, 93, 95, 63],
 'Rekordi i superlativi': [26, 16, 19, 55, 54, 47, 48, 11],
 'More i oceani': [0, 90, 25, 66, 89, 94, 93, 39],
 'Europa': [34, 32, 31, 113, 95, 38, 70, 37, 106, 46],
 'Biljke i priroda': [70, 39],
 'Vrijeme i klima': [16, 4, 0, 52, 9],
 'Znanost': [49],
 'Hrvatska': [46, 61, 90, 91, 54, 89],
 'Izumi i otkrića': [18, 14, 70, 85, 41, 42, 24, 48, 50, 51, 13, 66, 53, 56, 58, 59],
 'Kemija': [92, 54, 94],
 'Olimpijske igre': [95],
 'Bajke i dječje priče': [58, 31, 7],
 'Serije': [36],
 'Automobili i promet': [45, 93],
 'Hrvatski gradovi i otoci': [75, 3],
 'Hrvatski običaji i baština': [50, 45, 28, 94, 46, 2],
 'Hrana i piće': [],
 'Ljudsko tijelo': [57],
 'Matematika i brojevi': [40],
 'Drevne civilizacije': [93, 91],
 'Brendovi i logotipi': [69, 70],
 'Anime': [12],
 'Internet i memovi': [33],
 'Zastave i glavni gradovi': [105],
}
# 2) glazba: klasična teorija i školske sitnice odlaze, dolazi moderna glazba
RM['Glazba'] = [0, 2, 5, 10, 17, 28, 29, 30, 31, 34, 35, 99, 12, 22, 23, 24, 25, 26, 27, 33, 21, 86, 87, 94, 55, 93, 92, 89, 90, 32, 69]
removed = {}
for c, idx in RM.items():
    assert len(set(idx)) == len(idx), c
    removed[c] = len(idx)
    C[c] = [q for i, q in enumerate(C[c]) if i not in set(idx)]

# 3) pitanja koja u tekstu odaju odgovor
def fix(cat, old, q, o=None):
    for x in C[cat]:
        if x['q'] == old:
            x['q'] = q
            if o: x['o'] = o
            return
    raise SystemExit('nema: ' + old)
fix('Hrvatski običaji i baština', 'Kako se zove nijemo kolo iz Dalmatinske zagore, upisano na UNESCO popis?',
    'Kako se zove tradicionalni ples iz Dalmatinske zagore koji se pleše bez glazbe, upisan na UNESCO popis?')
fix('Hrvatski običaji i baština', 'Kako se zove drvo ili cjepanica koja se pali na Badnjak?',
    'Kako se zove cjepanica koja se u Hrvatskoj tradicionalno loži uoči Božića?')
fix('Serije', 'Koja serija prati školsku glee grupu „New Directions“?', 'Koja serija prati školski pjevački zbor „New Directions“?')
fix('Reklame i slogani', 'Koja je tvrtka 1970-ih pokrenula kampanju Pepsi Challenge sa slijepim testiranjem okusa?',
    'Koja je tvrtka 1970-ih pokrenula kampanju slijepog testiranja okusa protiv Coca-Cole?')
fix('Anime', 'Koje je stvorenje iz filma Moj susjed Totoro postalo logotip Studija Ghibli?',
    'Koji je veliki, krznen šumski duh iz filma o dvije sestre na selu postao logotip Studija Ghibli?')

# 4) nova glazbena pitanja: (pitanje, točan odgovor, tri netočna)
NEW = [
 ('Koja je pjevačica 2023. objavila svjetski hit „Flowers“?', 'Miley Cyrus', ['Dua Lipa', 'Selena Gomez', 'Olivia Rodrigo']),
 ('Koji je kanadski pjevač poznat po hitovima „Blinding Lights“ i „Starboy“?', 'The Weeknd', ['Drake', 'Justin Bieber', 'Shawn Mendes']),
 ('Koja je koncertna turneja Taylor Swift prva u povijesti premašila milijardu dolara zarade?', 'The Eras Tour', ['Reputation Stadium Tour', '1989 World Tour', 'Fearless Tour']),
 ('Koja je pjevačica 2016. objavila vizualni album „Lemonade“?', 'Beyoncé', ['Rihanna', 'Lady Gaga', 'Alicia Keys']),
 ('Koji je kanadski reper objavio hit „Hotline Bling“?', 'Drake', ['Kendrick Lamar', 'Travis Scott', 'Post Malone']),
 ('Koji se glumac i glazbenik pod pseudonimom Childish Gambino proslavio pjesmom „This Is America“?', 'Donald Glover', ['Kanye West', 'Frank Ocean', 'A$AP Rocky']),
 ('S kojim je glumcem Lady Gaga 2018. otpjevala pjesmu „Shallow“ u filmu Rođena zvijezda?', 'Bradley Cooper', ['Ryan Gosling', 'Adam Levine', 'Leonardo DiCaprio']),
 ('Koja je pjevačica objavila album „Future Nostalgia“ s hitom „Levitating“?', 'Dua Lipa', ['Ariana Grande', 'Doja Cat', 'Selena Gomez']),
 ('Koja je pjevačica 2021. objavila debitantski album „Sour“ i hit „drivers license“?', 'Olivia Rodrigo', ['Billie Eilish', 'Tate McRae', 'Gracie Abrams']),
 ('Koji je portorikanski izvođač reggaetona i trapa objavio album „Un Verano Sin Ti“ 2022.?', 'Bad Bunny', ['J Balvin', 'Daddy Yankee', 'Maluma']),
 ('Koja je pjesma Luisa Fonsija i Daddyja Yankeeja 2017. postala jedan od najgledanijih videospotova na YouTubeu?', 'Despacito', ['Gasolina', 'Mi Gente', 'Havana']),
 ('Koji je britanski pjevač 2017. objavio hit „Shape of You“?', 'Ed Sheeran', ['Sam Smith', 'Harry Styles', 'Calvin Harris']),
 ('Koja je južnokorejska grupa 2020. pjesmom „Dynamite“ prva južnokorejska skupina na vrhu ljestvice Billboard Hot 100?', 'BTS', ['BLACKPINK', 'EXO', 'Stray Kids']),
 ('Koja je pjevačica 2020. s 18 godina osvojila Grammy u sve četiri glavne kategorije?', 'Billie Eilish', ['Lizzo', 'Ariana Grande', 'Lorde']),
 ('Koji je reper 2018. za album „DAMN.“ dobio Pulitzerovu nagradu za glazbu?', 'Kendrick Lamar', ['J. Cole', 'Jay-Z', 'Kanye West']),
 ('Koji je švedski servis za streaming glazbe pokrenut 2008. godine?', 'Spotify', ['Deezer', 'Tidal', 'Pandora']),
 ('Koji je reper 2019. pjesmom „Old Town Road“ postao hit nakon što se pjesma proširila aplikacijom TikTok?', 'Lil Nas X', ['Post Malone', 'Roddy Ricch', 'Travis Scott']),
 ('Koja je pjevačica 2024. objavila album „Brat“ po kojem je nazvano „brat ljeto“?', 'Charli XCX', ['Chappell Roan', 'Lorde', 'Doja Cat']),
 ('Koja je pjevačica 2024. objavila hit „Espresso“?', 'Sabrina Carpenter', ['Chappell Roan', 'Tate McRae', 'Gracie Abrams']),
 ('Koji je pjevač nakon One Directiona 2022. objavio hit „As It Was“?', 'Harry Styles', ['Niall Horan', 'Zayn', 'Louis Tomlinson']),
 ('Koja je pjevačica 2023. nastupila na poluvremenu Super Bowla?', 'Rihanna', ['Beyoncé', 'Lady Gaga', 'Dua Lipa']),
 ('Koji je pjevač kao tinejdžer otkriven preko videozapisa na YouTubeu i postao svjetska zvijezda?', 'Justin Bieber', ['Shawn Mendes', 'Charlie Puth', 'Ed Sheeran']),
 ('Čija je pjesma „Running Up That Hill“ iz 1985. 2022. ponovno postala svjetski hit zahvaljujući seriji Stranger Things?', 'Kate Bush', ['Madonna', 'Cyndi Lauper', 'Tina Turner']),
 ('Koja se pjevačica svake godine pred Božić vraća na vrh ljestvica pjesmom „All I Want for Christmas Is You“?', 'Mariah Carey', ['Ariana Grande', 'Céline Dion', 'Whitney Houston']),
 ('Koji je britanski televizijski show 2010. spojio Harryja Stylesa i još četvoricu pjevača u grupu One Direction?', 'The X Factor', ['Britain’s Got Talent', 'The Voice', 'Pop Idol']),
 ('Kako se zove najpoznatija američka glazbena nagrada čiji je kip zlatni gramofon?', 'Grammy', ['Oscar', 'Emmy', 'Tony']),
 ('Iz koje je grupe svoju karijeru započela hrvatska pjevačica Jelena Rozga?', 'Magazin', ['Colonia', 'Divas', 'Cacadou']),
 ('Koji se veliki festival elektroničke glazbe od 2013. održavao u Splitu, uglavnom na stadionu Poljud?', 'Ultra Europe', ['Exit', 'Tomorrowland', 'Sónar']),
 ('Koji se glazbeni festival održava na zagrebačkom Jarunu?', 'INmusic festival', ['Exit', 'Sziget', 'Outlook']),
 ('Tko je pjevač zagrebačkog punk-rock sastava Hladno pivo?', 'Mile Kekin', ['Aki Rahimovski', 'Jura Stublić', 'Branimir Štulić']),
 ('Koji je pjevač 2013. objavio hit „Happy“ iz filma Ja, zlikovac 2?', 'Pharrell Williams', ['Bruno Mars', 'John Legend', 'Justin Timberlake']),
]
assert len(NEW) == len(RM['Glazba']) == 31, (len(NEW), len(RM['Glazba']))
rnd = random.Random(57)
have = {x['q'] for l in C.values() for x in l}
for q, a, w in NEW:
    assert q not in have and len({a, *w}) == 4, q
    o = w[:]; pos = rnd.randrange(4); o.insert(pos, a)
    C['Glazba'].append({'q': q, 'o': o, 'a': pos})
# 5) mini-igre: ponovljeni unosi (isti sadržaj dvaput)
for key, idx in {'tf': [154], 'facts': [79, 41, 39], 'emoji': [109, 111]}.items():
    d[key] = [x for i, x in enumerate(d[key]) if i not in set(idx)]
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print('uklonjeno', sum(removed.values()), '| nova pitanja', len(NEW), '| ukupno', sum(len(l) for l in C.values()))
for c in ['Rekordi i superlativi', 'Izumi i otkrića', 'Glazba', 'Općenito', 'More i oceani']: print(c, len(C[c]))
