# Jednokratna dopuna 17 (v59): druga runda za najtanje kategorije.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(73)
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
add('Reklame i slogani', [
 ('Koji lanac brze hrane koristi slogan Think outside the bun?', 'Taco Bell', ['Subway', 'Wendy\'s', 'Arby\'s']),
 ('Koji lanac sendviča koristi slogan Eat Fresh?', 'Subway', ['Quiznos', 'Burger King', 'Pret a Manger']),
 ('Koja čokoladica koristi slogan Have a break, have a ...?', 'KitKat', ['Twix', 'Mars', 'Bounty']),
 ('Koja kozmetička marka koristi slogan Maybe she\'s born with it. Maybe it\'s ...?', 'Maybelline', ['Revlon', 'Avon', 'Max Factor']),
 ('Koja tvrtka koristi slogan A diamond is forever?', 'De Beers', ['Tiffany', 'Cartier', 'Bulgari']),
 ('Koja je tehnološka tvrtka dugo imala neslužbeni moto Don\'t be evil?', 'Google', ['Microsoft', 'Apple', 'Yahoo']),
 ('Koje pivo koristi slogan Good things come to those who wait?', 'Guinness', ['Heineken', 'Budweiser', 'Stella Artois']),
 ('Koji grad koristi kampanju What happens here, stays here?', 'Las Vegas', ['Miami', 'New Orleans', 'Los Angeles']),
 ('Koja je životinja maskota osiguravajuće kuće Geico?', 'Gekon', ['Kameleon', 'Žaba', 'Iguana']),
 ('Koja je životinja maskota čokolade Milka?', 'Ljubičasta krava', ['Ljubičasti zec', 'Plava ovca', 'Ružičasta svinja']),
])
add('Internet i memovi', [
 ('Kako se zove stvaranje lažnog internetskog identiteta radi prevare u romantičnim vezama?', 'Catfishing', ['Trolling', 'Phishing', 'Doxxing']),
 ('Kako se zovu osobe koje na internetu namjerno izazivaju svađe?', 'Trolovi', ['Botovi', 'Hakeri', 'Influenceri']),
 ('Kako se zove slanje lažnih poruka radi krađe lozinki i podataka?', 'Phishing', ['Spamming', 'Streaming', 'Hashtagging']),
 ('Koja je tvrtka vlasnik aplikacije TikTok?', 'ByteDance', ['Tencent', 'Alibaba', 'Huawei']),
 ('Koje je godine osnovan YouTube?', '2005.', ['2002.', '2008.', '2010.']),
 ('Što znači kratica BRB u internetskoj komunikaciji?', 'Odmah se vraćam', ['Bez razloga ljutnja', 'Bolje rano nego kasno', 'Bravo, odlično']),
 ('Što znači kratica IRL?', 'U stvarnom životu', ['U posljednjem trenutku', 'Isto, ali drukčije', 'Ipak ne želim']),
 ('Što znači kratica ICYMI?', 'U slučaju da ste propustili', ['Ja to mogu učiniti', 'Ako to uopće vrijedi', 'Ipak, čekaj malo']),
 ('Što znači kratica SMH?', 'Odmahujem glavom', ['Sve mi je dobro', 'Smijem se do suza', 'Tiho se smijem']),
 ('Koja je Metina aplikacija 2023. pokrenuta kao konkurencija Twitteru?', 'Threads', ['Bluesky', 'Mastodon', 'Clubhouse']),
 ('Koja tvrtka razvija AI asistenta Claude?', 'Anthropic', ['OpenAI', 'Google', 'Mistral']),
 ('Koja tvrtka razvija umjetnointeligentni model Gemini?', 'Google', ['Meta', 'Microsoft', 'Apple']),
])
add('Božić i blagdani', [
 ('Kako se zove sob s crvenim nosom iz poznate božićne pjesme?', 'Rudolph', ['Dasher', 'Blitzen', 'Vixen']),
 ('Kako se zove bolešljivi dječak, sin Boba Cratchita, iz Dickensove Božićne priče?', 'Tiny Tim', ['Oliver', 'Pip', 'David']),
 ('Tko je skladao melodiju pjesme Tiha noć?', 'Franz Xaver Gruber', ['Johann Sebastian Bach', 'Joseph Haydn', 'Franz Schubert']),
 ('Koliko zlatnih prstenova dolazi u pjesmi The Twelve Days of Christmas?', 'Pet', ['Tri', 'Sedam', 'Dvanaest']),
 ('Što slovo X predstavlja u kratici Xmas?', 'Grčko slovo hi, početak riječi Krist', ['Križ', 'Nepoznanicu', 'Broj deset']),
 ('Kako se u Finskoj zove Djed Božićnjak?', 'Joulupukki', ['Père Noël', 'Babbo Natale', 'Julenisse']),
 ('Kako Francuzi zovu Djeda Božićnjaka?', 'Père Noël', ['Papa Noel', 'Santa Claus', 'Sinterklaas']),
 ('Koja dobra vještica u Italiji za Bogojavljenje donosi darove djeci?', 'Befana', ['Lucia', 'Strega', 'Madonna']),
 ('Kako se zove prikaz Isusova rođenja s figuricama u staji?', 'Jaslice', ['Oltar', 'Betlehem-zvijezda', 'Kolijevka']),
 ('Koji je svetac 1223. u Greccu postavio prve žive jaslice?', 'Franjo Asiški', ['Toma Akvinski', 'Antun Padovanski', 'Ivan Krstitelj']),
 ('Koliko dana traje židovski blagdan Hanuka?', 'Osam', ['Tri', 'Sedam', 'Dvanaest']),
])
add('Slavni parovi i obitelji', [
 ('Koja je glumica bila u braku s Benom Affleckom od 2005. do 2018.?', 'Jennifer Garner', ['Jennifer Lopez', 'Reese Witherspoon', 'Sandra Bullock']),
 ('Koji je tenisač oženio Steffi Graf?', 'Andre Agassi', ['Boris Becker', 'Pete Sampras', 'Michael Stich']),
 ('Koja je glumica bila u braku s Paulom Newmanom pedesetak godina?', 'Joanne Woodward', ['Grace Kelly', 'Natalie Wood', 'Audrey Hepburn']),
 ('Za kojeg je pjevača udana indijska glumica Priyanka Chopra?', 'Nicka Jonasa', ['Justina Biebera', 'Shawna Mendesa', 'Harryja Stylesa']),
 ('Koji je pjevač oženjen manekenkom Hailey Bieber?', 'Justin Bieber', ['Shawn Mendes', 'Harry Styles', 'Zayn Malik']),
 ('Koga je Elvis Presley oženio 1967.?', 'Priscillu Beaulieu', ['Ann-Margret', 'Nancy Sinatra', 'Natalie Wood']),
 ('Kako se zove kći Elvisa i Priscille Presley?', 'Lisa Marie', ['Priscilla Ann', 'Marilyn', 'Gladys']),
 ('Koji glumac glumi Spider-Mana i partner je glumice Zendaye?', 'Tom Holland', ['Tobey Maguire', 'Andrew Garfield', 'Timothée Chalamet']),
 ('Koja je bivša novinarka od 2014. španjolska kraljica?', 'Letizia', ['Sofía', 'Mathilde', 'Máxima']),
 ('Iz koje zemlje potječe nizozemska kraljica Máxima?', 'Argentine', ['Španjolske', 'Brazila', 'Čilea']),
 ('Tko je najmlađa od sestara Kardashian–Jenner?', 'Kylie Jenner', ['Kendall Jenner', 'Khloé Kardashian', 'Kourtney Kardashian']),
])
add('Dinosauri i prapovijest', [
 ('Što znači ime dinosaura Triceratops?', 'Lice s tri roga', ['Tri kandže', 'Trostruki rep', 'Tri oka']),
 ('Koji je mali dinosaur veličine kokoši živio u razdoblju jure?', 'Compsognathus', ['Giganotosaurus', 'Brachiosaurus', 'Ankylosaurus']),
 ('Koliko je prstiju imala prednja noga Tyrannosaurusa rexa?', 'Dva', ['Jedan', 'Tri', 'Pet']),
 ('Kako se zove izmišljeni otok Jurskog parka?', 'Isla Nublar', ['Isla Sorna', 'Isla Fortuna', 'Isla Bonita']),
 ('Tko je režirao film Jurski park iz 1993.?', 'Steven Spielberg', ['James Cameron', 'George Lucas', 'Ridley Scott']),
 ('Koji je glumac u prvom Jurskom parku glumio paleontologa dr. Alana Granta?', 'Sam Neill', ['Jeff Goldblum', 'Richard Attenborough', 'Bob Peck']),
 ('S kojeg je otoka u Indijskom oceanu izumrla ptica dodo?', 'S Mauricijusa', ['S Madagaskara', 'S Sejšela', 'S Cejlona']),
 ('Koje je geološko doba prethodilo mezozoiku?', 'Paleozoik', ['Kenozoik', 'Holocen', 'Neogen']),
 ('U kojoj se geološkoj epohi nalazimo?', 'U holocenu', ['U pleistocenu', 'U miocenu', 'U eocenu']),
 ('Koja je domaća životinja prema analizi proteina među najbližim živim rođacima T. rexa?', 'Kokoš', ['Svinja', 'Krava', 'Pas']),
])
add('Vrijeme i klima', [
 ('Kako se zovu visoki, tanki, pernati oblaci?', 'Cirusi', ['Kumulusi', 'Stratusi', 'Nimbusi']),
 ('Kako se zove pojava kada se vodena para pretvara u kapljice vode?', 'Kondenzacija', ['Isparavanje', 'Sublimacija', 'Taloženje']),
 ('Kako se zove suprotna pojava El Niñu, s hladnijom površinom Tihog oceana?', 'La Niña', ['El Sol', 'La Luna', 'Monsun']),
 ('Kako se zove oluja s jakim snijegom i vjetrom?', 'Mećava', ['Oluja s tučom', 'Tornado', 'Pješčana oluja']),
 ('Kako se zove sezonski vjetar koji u južnoj Aziji donosi obilne kiše?', 'Monsun', ['Bura', 'Pasat', 'Fen']),
 ('Što je smog?', 'Mješavina dima i magle', ['Vrsta oblaka', 'Oluja s gromovima', 'Sloj leda']),
 ('Kako se zove mjerna jedinica kojom se često izražava tlak zraka u prognozi?', 'Hektopaskal', ['Kelvin', 'Joule', 'Newton']),
 ('Koji je kontinent najsuši?', 'Antarktika', ['Afrika', 'Australija', 'Azija']),
])
add('Anime', [
 ('Kako se zove glavni junak animea Death Note?', 'Light Yagami', ['Ryuk', 'Near', 'Misa Amane']),
 ('Kako se zove Narutov rival i prijatelj iz klana Uchiha?', 'Sasuke', ['Kakashi', 'Itachi', 'Gaara']),
 ('Tko je autor mange One Piece?', 'Eiichiro Oda', ['Masashi Kishimoto', 'Akira Toriyama', 'Tite Kubo']),
 ('Tko je autor mange Naruto?', 'Masashi Kishimoto', ['Eiichiro Oda', 'Hajime Isayama', 'Kohei Horikoshi']),
 ('Kako se zove princ Saiyana, Gokuov rival u Dragon Ballu?', 'Vegeta', ['Piccolo', 'Trunks', 'Gohan']),
 ('Kako se zove tajanstveni duh s maskom u filmu Spirited Away?', 'Bezlični (No-Face)', ['Haku', 'Calcifer', 'Totoro']),
 ('Kako se zove vještica koja vodi kupalište u filmu Spirited Away?', 'Yubaba', ['Sophie', 'Eboshi', 'Kiki']),
 ('Kako se zove glavni junak animea Sword Art Online?', 'Kirito', ['Asuna', 'Eren', 'Natsu']),
 ('Kako se zove najveći japanski sajam amaterskih mangi i animea koji se održava u Tokiju?', 'Comiket', ['Akihabara Expo', 'Anime Tokyo', 'Otaku Fest']),
 ('Kako se zovu glasovni glumci u animeu?', 'Seiyuu', ['Mangaka', 'Cosplayeri', 'Sensei']),
 ('Kako se zove glavni junak animea Cowboy Bebop?', 'Spike Spiegel', ['Jet Black', 'Faye Valentine', 'Vicious']),
 ('Kako se zove mladi pilot u animeu Neon Genesis Evangelion?', 'Shinji Ikari', ['Rei Ayanami', 'Misato Katsuragi', 'Asuka Langley']),
 ('Koji junak jednim udarcem pobjeđuje svakog protivnika u animeu One Punch Man?', 'Saitama', ['Genos', 'Garou', 'Tatsumaki']),
])
add('Općenito', [
 ('Koliko je osnovnih okusa koje prepoznaje ljudski jezik?', 'Pet', ['Tri', 'Četiri', 'Sedam']),
 ('Koje je boje crna kutija (snimač leta) u zrakoplovu?', 'Narančaste', ['Crne', 'Crvene', 'Žute']),
 ('Kojeg se datuma pojavljuje prijestupni dan?', '29. veljače', ['28. veljače', '1. ožujka', '31. prosinca']),
 ('Koliko igrača jedne momčadi istodobno igra u ragbiju (rugby union)?', '15', ['11', '13', '18']),
 ('Koliko igrača jedne ekipe istodobno je na terenu u rukometu, s vratarom?', 'Sedam', ['Pet', 'Šest', 'Osam']),
 ('Koliko igrača jedne momčadi istodobno igra u košarci?', 'Pet', ['Četiri', 'Šest', 'Sedam']),
 ('Kako se zove 30. godišnjica braka?', 'Biserna', ['Rubinska', 'Srebrna', 'Zlatna']),
 ('Koliko polja ima šahovska ploča?', '64', ['48', '72', '81']),
 ('Koliko žica ima standardna violina?', 'Četiri', ['Tri', 'Pet', 'Šest']),
 ('Koliko mjeseci u godini ima 28 dana?', 'Svih dvanaest', ['Jedan', 'Dva', 'Šest']),
])
add('Matematika i brojevi', [
 ('Koliko iznosi π zaokruženo na dvije decimale?', '3,14', ['3,12', '3,16', '3,41']),
 ('Kako se zove četverokut s četiri jednake stranice i kosim kutovima?', 'Romb', ['Trapez', 'Pravokutnik', 'Deltoid']),
 ('Kako se zove četverokut s točno jednim parom paralelnih stranica?', 'Trapez', ['Romb', 'Paralelogram', 'Deltoid']),
 ('Koliko stupnjeva ima puni kut?', '360', ['180', '270', '400']),
 ('Što je medijan niza brojeva?', 'Srednja vrijednost poredanog niza', ['Zbroj svih brojeva', 'Najčešći broj', 'Razlika najvećeg i najmanjeg']),
 ('Kako se zove rezultat množenja?', 'Umnožak', ['Zbroj', 'Količnik', 'Razlika']),
 ('Koliko je 15 × 15?', '225', ['215', '235', '255']),
 ('Koliko je 2 na desetu potenciju?', '1024', ['512', '1000', '2048']),
 ('Koliki je drugi korijen iz 169?', '13', ['12', '14', '17']),
 ('Koliko je 1/2 + 1/3?', '5/6', ['2/5', '3/5', '1/6']),
 ('Koja formula daje obujam kugle polumjera r?', '4/3 · π · r³', ['π · r²', '4 · π · r²', '2 · π · r']),
 ('Koliko je i², gdje je i imaginarna jedinica?', '−1', ['1', '0', 'i']),
])
add('Bajke i dječje priče', [
 ('Tko je napisao Alisu u zemlji čudesa?', 'Lewis Carroll', ['J. M. Barrie', 'A. A. Milne', 'Roald Dahl']),
 ('Koja životinja odvodi Alisu u zemlju čudesa?', 'Bijeli zec', ['Cerigradski mačak', 'Plavi leptir', 'Sivi miš']),
 ('Koja kraljica u Alisi viče „Odrubite joj glavu!“?', 'Srcokraljica', ['Snježna kraljica', 'Zla kraljica', 'Crvena vila']),
 ('Koliko je kozlića u bajci Vuk i sedam kozlića?', 'Sedam', ['Pet', 'Šest', 'Devet']),
 ('Kako se zove zla vila u Disneyjevoj Trnoružici?', 'Maleficent', ['Ursula', 'Cruella', 'Lady Tremaine']),
 ('Koji je Disneyjev film iz 1937. prvi dugometražni animirani film?', 'Snjeguljica i sedam patuljaka', ['Pinokio', 'Pepeljuga', 'Bambi']),
 ('Što od Čarobnjaka traži Kukavički lav u priči o Čarobnjaku iz Oza?', 'Hrabrost', ['Mozak', 'Srce', 'Dom']),
 ('Što od Čarobnjaka traži Limeni drvosječa?', 'Srce', ['Mozak', 'Hrabrost', 'Novac']),
 ('Tko je napisao Malog princa?', 'Antoine de Saint-Exupéry', ['Jules Verne', 'Victor Hugo', 'Albert Camus']),
 ('Tko je napisao Čarobnjaka iz Oza?', 'L. Frank Baum', ['C. S. Lewis', 'Lewis Carroll', 'Roald Dahl']),
 ('Koji je medvjed Mowglijev prijatelj u Knjizi o džungli?', 'Baloo', ['Kaa', 'Bagheera', 'Shere Khan']),
 ('Tko je napisao Čudnovate zgode šegrta Hlapića?', 'Ivana Brlić-Mažuranić', ['Branko Ćopić', 'Grigor Vitez', 'Dragutin Tadijanović']),
 ('Tko je napisao Ježevu kućicu?', 'Branko Ćopić', ['Ivana Brlić-Mažuranić', 'Mato Lovrak', 'Zvonimir Balog']),
])
add('Kuhinje svijeta', [
 ('Što na talijanskom znači naziv deserta tiramisu?', 'Podigni me', ['Slatki oblak', 'Kava s mlijekom', 'Meka noć']),
 ('Kako se zove japanski alkoholni napitak od riže?', 'Sake', ['Soju', 'Baijiu', 'Shochu']),
 ('Kako se zovu japanske rolice od riže i nori morske alge?', 'Maki', ['Nigiri', 'Gyoza', 'Dango']),
 ('Po kojoj je savojskoj kraljici nazvana pizza Margherita?', 'Margheriti', ['Elizabeti', 'Mariji', 'Viktoriji']),
 ('Kako se zove indijski umak od jogurta s krastavcima?', 'Raita', ['Chutney', 'Dal', 'Ghee']),
 ('Kako se zove meksička tortilja punjena mesom i povrćem, smotana i prelivena umakom?', 'Enchilada', ['Taco', 'Nachos', 'Quesadilla']),
 ('Kako se zove grčki umak od jogurta, krastavaca i češnjaka?', 'Tzatziki', ['Ajvar', 'Hummus', 'Skordalia']),
 ('Kako se zove slastica od lisnatog tijesta s orasima i sirupom, popularna na Bliskom istoku i Balkanu?', 'Baklava', ['Tulumba', 'Kadaif', 'Halva']),
 ('Kako se zove švicarsko jelo od ribanog i pečenog krumpira?', 'Rösti', ['Gnocchi', 'Latkes', 'Pommes duchesse']),
 ('Kako se zove irsko varivo od janjetine i krumpira?', 'Irish stew', ['Goulash', 'Cassoulet', 'Ratatouille']),
 ('Kako se zovu kineski mali punjeni zalogaji kuhani na pari?', 'Dim sum', ['Sushi', 'Tempura', 'Ramen']),
])
add('Moda', [
 ('Po kojem je otoku nazvan model kratkih hlača bermude?', 'Bermudima', ['Barbadosu', 'Majorci', 'Havajima']),
 ('Kako se zove uzorak velikih točkica na tkanini?', 'Polka', ['Argyle', 'Paisley', 'Houndstooth']),
 ('Kako se zove klasična majica s vodoravnim plavim prugama, povezana s Bretanjom?', 'Breton', ['Oxford', 'Henley', 'Polo']),
 ('Koja je draguljarnica poznata po svijetloplavoj kutiji?', 'Tiffany & Co.', ['Cartier', 'Bulgari', 'Harry Winston']),
 ('Koja je marka poznata po sunčanim naočalama modela Aviator i Wayfarer?', 'Ray-Ban', ['Oakley', 'Persol', 'Police']),
 ('Koja švicarska marka satova ima krunu kao logotip?', 'Rolex', ['Omega', 'Tag Heuer', 'Swatch']),
 ('U kojem je gradu ulica Savile Row, poznata po krojačima?', 'Londonu', ['Parizu', 'Milanu', 'New Yorku']),
 ('Koja modna kuća ima monogram LV?', 'Louis Vuitton', ['Lacoste', 'Longchamp', 'Loewe']),
 ('Za koju je pjevačicu Jean Paul Gaultier 1990. dizajnirao poznati steznik stožastih grudnjaka?', 'Madonnu', ['Cher', 'Lady Gaga', 'Whitney Houston']),
 ('Kako se zovu hlače koje se od koljena šire prema dolje, popularne 1970-ih?', 'Zvonaste hlače', ['Bermude', 'Capri hlače', 'Cargo hlače']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print('ukupno', sum(len(l) for l in C.values()))
