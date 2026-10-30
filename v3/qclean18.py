# Jednokratna dopuna 18 (v60): raznovrsna pitanja u različitim kategorijama; preskače točne i bliske duplikate.
import json, random, re
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(74)
def W(t): return set(re.findall(r'\w+', t.lower()))
allq = [(x['q'], x['o'][x['a']]) for l in C.values() for x in l]
def dup(q, a):
    w = W(q)
    for q2, a2 in allq:
        if q2 == q: return q2
        w2 = W(q2)
        if len(w & w2) / max(1, len(w | w2)) >= 0.6 and a.lower() == a2.lower(): return q2
    return None
def add(cat, items):
    n = 0
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        s = dup(q, a)
        if s: print('preskočeno:', q, '| slično:', s[:60]); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos}); allq.append((q, a)); n += 1
    print(cat, '+', n)
add('Geografija', [
 ('Koja je jedina država na svijetu koja zauzima cijeli kontinent?', 'Australija', ['Island', 'Grenland', 'Novi Zeland']),
 ('U kojem se londonskom predgrađu nalazi nulti meridijan?', 'Greenwichu', ['Wimbledonu', 'Kensingtonu', 'Camdenu']),
 ('Koji je najveći otok u Indijskom oceanu?', 'Madagaskar', ['Sri Lanka', 'Sumatra', 'Mauricijus']),
 ('Što na španjolskom znači naziv države Ekvador?', 'Ekvator', ['Planina', 'Zlato', 'Sunce']),
 ('Po kojem je vođi osamostaljenja nazvana država Bolivija?', 'Simónu Bolívaru', ['Josému San Martínu', 'Fidelu Castru', 'Benitu Juárezu']),
 ('Po kojem je španjolskom kralju nazvana država Filipini?', 'Filipu II.', ['Ferdinandu II.', 'Karlu V.', 'Filipu IV.']),
 ('Po kojem je istraživaču nazvana država Kolumbija?', 'Kristoforu Kolumbu', ['Amerigu Vespucciju', 'Ferdinandu Magellanu', 'Vasco da Gami']),
])
add('Povijest', [
 ('Koja je bitka 1066. odlučila o engleskom prijestolju u korist Normana?', 'Bitka kod Hastingsa', ['Bitka kod Agincourta', 'Bitka kod Crécyja', 'Bitka kod Bosworth Fielda']),
 ('Koji ugovor 1648. okončao je Tridesetogodišnji rat?', 'Vestfalski mir', ['Versailleski ugovor', 'Utrechtski mir', 'Bečki kongres']),
 ('Koji je francuski kralj bio poznat kao Kralj Sunce?', 'Luj XIV.', ['Luj XVI.', 'Franjo I.', 'Henrik IV.']),
 ('Koja je pandemija sredinom 14. stoljeća ubila trećinu stanovništva Europe?', 'Crna smrt', ['Španjolska gripa', 'Kolera', 'Velike boginje']),
 ('Koji je događaj 14. srpnja 1789. obilježio početak Francuske revolucije?', 'Oluja na Bastilju', ['Pogubljenje Luja XVI.', 'Zakletva u dvorani za loptu', 'Marš na Versailles']),
 ('Tko je bio zadnji ruski car?', 'Nikola II.', ['Aleksandar III.', 'Petar III.', 'Ivan IV.']),
 ('Koji je rimski car 27. g. pr. Kr. postao prvi car Rimskog Carstva?', 'Oktavijan August', ['Julije Cezar', 'Neron', 'Trajan']),
])
add('Znanost', [
 ('Što proučava entomologija?', 'Kukce', ['Ptice', 'Biljke', 'Stijene']),
 ('Što proučava ornitologija?', 'Ptice', ['Kukce', 'Ribe', 'Gmazove']),
 ('Što proučava speleologija?', 'Špilje', ['Potrese', 'Planine', 'Vulkane']),
 ('Što proučava seizmologija?', 'Potrese', ['Vulkane', 'Oluje', 'Zvijezde']),
 ('U kojoj je grani znanosti poznat misaoni pokus sa Schrödingerovom mačkom?', 'U kvantnoj fizici', ['U genetici', 'U termodinamici', 'U astronomiji']),
 ('Kako se popularno naziva Higgsov bozon?', 'Božja čestica', ['Crna čestica', 'Svjetlosna čestica', 'Prva čestica']),
])
add('Sport', [
 ('Na kojoj se podlozi igra teniski turnir Roland Garros?', 'Na zemljanoj', ['Na travi', 'Na tvrdoj podlozi', 'U dvorani na tepihu']),
 ('U kojem se sportu postiže birdie?', 'U golfu', ['U tenisu', 'U kriketu', 'U baseballu']),
 ('Koliko igrača jedne ekipe istodobno je u vodi u vaterpolu, uključujući vratara?', 'Sedam', ['Pet', 'Šest', 'Osam']),
 ('Što igrači u curlingu kližu po ledu?', 'Kamen', ['Pak', 'Kuglu', 'Disk']),
 ('Što je hat-trick u nogometu?', 'Tri gola istog igrača u utakmici', ['Tri uzastopne pobjede', 'Tri crvena kartona', 'Tri asistencije']),
 ('Koliko igrača ima ekipa u odbojci na pijesku?', 'Dva', ['Tri', 'Četiri', 'Šest']),
 ('Iz koje zemlje potječe judo?', 'Japana', ['Kine', 'Koreje', 'Tajlanda']),
])
add('Film i TV', [
 ('Koliko je Oscara osvojio film Titanic 1998.?', '11', ['9', '13', '7']),
 ('U kojem se filmu pojavljuje replika „Here\'s Johnny!“?', 'Isijavanje (The Shining)', ['Psiho', 'Egzorcist', 'Mizerija']),
 ('Kako se zove kafić u kojem se druže likovi serije Friends?', 'Central Perk', ['MacLaren\'s', 'Cheers', 'Luke\'s Diner']),
 ('Kako se zove izmišljeni gradić u seriji Stranger Things?', 'Hawkins', ['Derry', 'Sunnydale', 'Twin Peaks']),
 ('Kako se zove djevojčica s telekinetičkim moćima u seriji Stranger Things?', 'Eleven', ['Max', 'Nancy', 'Robin']),
 ('Koje su boje kombinezoni lopova u seriji Kuća od papira?', 'Crveni', ['Narančasti', 'Crni', 'Zeleni']),
 ('Čije lice prikazuju maske lopova u seriji Kuća od papira?', 'Salvadora Dalíja', ['Pabla Picassa', 'Fride Kahlo', 'Che Guevare']),
 ('Koja se dječja igra igra u prvoj igri serije Squid Game?', 'Crveno svjetlo, zeleno svjetlo', ['Skrivača', 'Lastavica', 'Žmirke']),
 ('Koji je bio prvi film koji je zaradio milijardu dolara u kinima?', 'Titanic', ['Avatar', 'Jurski park', 'Krava lav']),
])
add('Glazba', [
 ('Koji je bend objavio album The Dark Side of the Moon?', 'Pink Floyd', ['Led Zeppelin', 'The Who', 'Genesis']),
 ('Koji se američki rock glazbenik naziva The Boss?', 'Bruce Springsteen', ['Bon Jovi', 'Bob Dylan', 'Billy Joel']),
 ('Koliko je simfonija napisao Ludwig van Beethoven?', 'Devet', ['Pet', 'Dvanaest', 'Četrdeset jedna']),
 ('Koji je skladatelj napisao Četiri godišnja doba?', 'Antonio Vivaldi', ['Johann Sebastian Bach', 'Georg Friedrich Händel', 'Claudio Monteverdi']),
 ('Koji je bend snimio pjesmu Stairway to Heaven?', 'Led Zeppelin', ['Deep Purple', 'Black Sabbath', 'Pink Floyd']),
])
add('Hrana i piće', [
 ('Koje se voće u jugoistočnoj Aziji naziva kraljem voća, a poznato je po jakom mirisu?', 'Durian', ['Mangostan', 'Rambutan', 'Jackfruit']),
 ('Koji je najskuplji začin na svijetu po težini?', 'Šafran', ['Vanilija', 'Kardamom', 'Cimet']),
 ('Iz koje se biljke dobiva vanilija?', 'Iz orhideje', ['Iz palme', 'Iz grma kave', 'Iz paprike']),
 ('Koja je država najveći proizvođač kave na svijetu?', 'Brazil', ['Kolumbija', 'Vijetnam', 'Etiopija']),
 ('Koja je država najveći proizvođač maslinova ulja na svijetu?', 'Španjolska', ['Italija', 'Grčka', 'Turska']),
 ('Što je kombucha?', 'Fermentirani čaj', ['Fermentirano mlijeko', 'Rižin napitak', 'Sok od kupusa']),
 ('Koji je alkohol glavni sastojak koktela mojito?', 'Rum', ['Votka', 'Tekila', 'Gin']),
 ('Koji je alkohol glavni sastojak koktela margarita?', 'Tekila', ['Rum', 'Votka', 'Viski']),
 ('Koji je alkohol glavni sastojak koktela cosmopolitan?', 'Votka', ['Gin', 'Rum', 'Konjak']),
])
add('Životinje', [
 ('Koliko srca ima hobotnica?', 'Tri', ['Jedno', 'Dva', 'Osam']),
 ('Koji sisavac živi najdulje, i do dvjestotinjak godina?', 'Grenlandski kit', ['Slon', 'Plavi kit', 'Dupin']),
 ('Koja se meksička vodozemka ističe sposobnošću da regenerira izgubljene udove?', 'Aksolotl', ['Daždevnjak', 'Čovječja ribica', 'Ropac']),
 ('Koliko odjeljaka ima želudac krave?', 'Četiri', ['Jedan', 'Dva', 'Šest']),
 ('Koja ptica nosi najveće jaje?', 'Noj', ['Emu', 'Albatros', 'Pelikan']),
 ('Koja ptica može letjeti i unatrag?', 'Kolibrić', ['Lastavica', 'Sokol', 'Čaplja']),
 ('Koliko vratnih kralježaka ima žirafa?', 'Sedam', ['Dvanaest', 'Dvadeset', 'Tri']),
])
add('Hrvatska', [
 ('Koji se hrvatski otok naziva otokom lavande?', 'Hvar', ['Brač', 'Vis', 'Korčula']),
 ('Koji se hrvatski grad naziva Biserom Jadrana?', 'Dubrovnik', ['Split', 'Rovinj', 'Zadar']),
 ('Kod kojeg se grada nalazi park prirode Kopački rit?', 'Osijeka', ['Vukovara', 'Slavonskog Broda', 'Vinkovaca']),
 ('Na kojem se otoku nalazi Modra špilja?', 'Biševu', ['Visu', 'Hvaru', 'Lastovu']),
])
add('Svemir', [
 ('Što vrijedi za dan na Veneri u odnosu na njezinu godinu?', 'Dan je duži od godine', ['Dan je kraći od sata', 'Jednaki su', 'Godina traje jedan dan']),
 ('Koji Saturnov mjesec ima gustu atmosferu i jezera tekućeg metana?', 'Titan', ['Enkelad', 'Mimas', 'Rea']),
 ('Koji Jupiterov mjesec ima ocean ispod leda i cilj je misije Europa Clipper?', 'Europa', ['Io', 'Ganimed', 'Kalisto']),
 ('Što je Oortov oblak?', 'Ledeni oblak na rubu Sunčeva sustava', ['Pojas asteroida između Marsa i Jupitera', 'Prsten oko Saturna', 'Nebula u Orionu']),
 ('Koja je bila prva žena u svemiru?', 'Valentina Terješkova', ['Sally Ride', 'Svetlana Savickaja', 'Mae Jemison']),
 ('Kako se zvala prva životinja u Zemljinoj orbiti, pas poslan 1957.?', 'Lajka', ['Belka', 'Strelka', 'Čerepaha']),
 ('Koja je NASA-ina misija 2022. namjerno udarila u asteroid radi promjene njegove putanje?', 'DART', ['Artemis', 'Juno', 'Osiris-REx']),
 ('Kako se zove granica crne rupe iza koje ništa ne može pobjeći?', 'Horizont događaja', ['Singularitet', 'Akrecijski disk', 'Fotonska sfera']),
])
add('Ljudsko tijelo', [
 ('Koji je najveći mišić u ljudskom tijelu?', 'Veliki sjedalni mišić', ['Četveroglavi mišić', 'Trbušni mišić', 'Bicepsi']),
 ('Koja je krvna skupina univerzalni davatelj?', '0 negativna', ['AB pozitivna', 'A negativna', 'B pozitivna']),
 ('Koja je krvna skupina univerzalni primatelj?', 'AB pozitivna', ['0 negativna', 'A pozitivna', 'B negativna']),
 ('Koji hormon gušterače regulira razinu šećera u krvi?', 'Inzulin', ['Adrenalin', 'Kortizol', 'Tiroksin']),
 ('Koji vitamin tijelo proizvodi na koži uz pomoć sunca?', 'Vitamin D', ['Vitamin C', 'Vitamin A', 'Vitamin K']),
 ('Koliko zubi ima odrasla osoba s potpunom denticijom?', '32', ['28', '30', '36']),
 ('Koji organ proizvodi žuč?', 'Jetra', ['Gušterača', 'Slezena', 'Bubreg']),
 ('Koliko pari rebara ima čovjek?', '12', ['10', '14', '8']),
])
add('Književnost', [
 ('Tko je napisao roman 1984?', 'George Orwell', ['Aldous Huxley', 'Ray Bradbury', 'Franz Kafka']),
 ('Tko je napisao roman Zločin i kazna?', 'Fjodor Dostojevski', ['Lav Tolstoj', 'Anton Čehov', 'Nikolaj Gogolj']),
 ('Koji je pisac napisao Na Drini ćuprija?', 'Ivo Andrić', ['Meša Selimović', 'Miroslav Krleža', 'Danilo Kiš']),
 ('Koji je hrvatski pisac napisao dramu Gospoda Glembajevi?', 'Miroslav Krleža', ['Ivo Vojnović', 'Marin Držić', 'August Šenoa']),
 ('Tko je napisao roman Ubiti pticu rugalicu?', 'Harper Lee', ['Truman Capote', 'John Steinbeck', 'Margaret Mitchell']),
 ('Koja je spisateljica stvorila detektiva Hercula Poirota?', 'Agatha Christie', ['Patricia Highsmith', 'Dorothy Sayers', 'P. D. James']),
 ('Tko je napisao Sto godina samoće?', 'Gabriel García Márquez', ['Mario Vargas Llosa', 'Jorge Luis Borges', 'Isabel Allende']),
])
add('Umjetnost', [
 ('Tko je naslikao djelo Guernica?', 'Pablo Picasso', ['Salvador Dalí', 'Joan Miró', 'Francisco Goya']),
 ('Tko je naslikao Krik?', 'Edvard Munch', ['Gustav Klimt', 'Egon Schiele', 'Vincent van Gogh']),
 ('Tko je naslikao Poljubac sa zlatnom pozadinom?', 'Gustav Klimt', ['Egon Schiele', 'Claude Monet', 'Henri Matisse']),
 ('Koji je američki umjetnik poznat po slikama konzervi juhe Campbell\'s?', 'Andy Warhol', ['Roy Lichtenstein', 'Jackson Pollock', 'Jeff Koons']),
 ('Kojem umjetničkom pokretu pripada Salvador Dalí?', 'Nadrealizmu', ['Impresionizmu', 'Kubizmu', 'Ekspresionizmu']),
 ('Kojem umjetničkom pokretu pripada Claude Monet?', 'Impresionizmu', ['Nadrealizmu', 'Kubizmu', 'Dadaizmu']),
 ('Koji su umjetnici osnovali kubizam?', 'Picasso i Braque', ['Monet i Renoir', 'Dalí i Miró', 'Matisse i Derain']),
])
add('Mitologija', [
 ('Kako se zove slavenski bog groma?', 'Perun', ['Veles', 'Svarog', 'Dažbog']),
 ('Kako se zove dvorana palih ratnika u nordijskoj mitologiji?', 'Valhalla', ['Asgard', 'Midgard', 'Helheim']),
 ('Koji egipatski bog ima glavu šakala i povezan je s mumificiranjem?', 'Anubis', ['Horus', 'Set', 'Toth']),
 ('Koje je biće bilo napola čovjek, napola bik, zatvoreno u labirintu?', 'Minotaur', ['Kentaur', 'Satir', 'Hidra']),
 ('Koji je grčki junak imao ranjivu petu?', 'Ahilej', ['Heraklo', 'Odisej', 'Perzej']),
 ('Koji je grčki bog mora?', 'Posejdon', ['Hades', 'Zeus', 'Apolon']),
])
add('Tehnologija i internet', [
 ('Što znači kratica USB?', 'Universal Serial Bus', ['Ultra Speed Boost', 'Unified System Board', 'Universal Storage Block']),
 ('Što znači kratica HTML?', 'HyperText Markup Language', ['High Text Machine Language', 'Hyper Transfer Mode Link', 'Home Tool Markup Language']),
 ('Koliko bitova ima jedan bajt?', 'Osam', ['Četiri', 'Šesnaest', 'Deset']),
 ('Što znači kratica QR u QR kodu?', 'Quick Response', ['Quality Rating', 'Quantum Reader', 'Quick Resolution']),
 ('Što znači kratica GPS?', 'Global Positioning System', ['General Phone Signal', 'Global Planet Scanner', 'Ground Position Sensor']),
])
add('Videoigre', [
 ('Kako se zove junak serije igara The Legend of Zelda?', 'Link', ['Zelda', 'Ganon', 'Epona']),
 ('Kako se zove Marijev mlađi brat u igrama Super Mario?', 'Luigi', ['Wario', 'Toad', 'Yoshi']),
 ('Koju princezu Bowser najčešće otima u igrama Super Mario?', 'Peach', ['Daisy', 'Rosalina', 'Zelda']),
 ('Kako se zove izmišljeni grad u igri Grand Theft Auto V?', 'Los Santos', ['Vice City', 'Liberty City', 'San Fierro']),
 ('Kako se zove glavni lik serije igara Halo?', 'Master Chief', ['Marcus Fenix', 'Doomguy', 'Gordon Freeman']),
 ('Iz koje je mitologije Kratos u originalnoj trilogiji God of War?', 'Grčke', ['Nordijske', 'Egipatske', 'Rimske']),
 ('Koja je igra tvrtke Epic Games iz 2017. popularizirala battle royale s gradnjom?', 'Fortnite', ['PUBG', 'Apex Legends', 'Warzone']),
])
add('Crtani filmovi', [
 ('Koji crtani lik često pita „Što ima, doktore?“', 'Bugs Bunny', ['Daffy Duck', 'Tom', 'Elmer Fudd']),
 ('Koji crtani prati dječaka Finna i psa Jakea?', 'Adventure Time', ['Gumball', 'Steven Universe', 'Regular Show']),
 ('Kako se zove plava ribica s lošim kratkoročnim pamćenjem iz filma Potraga za Nemom?', 'Dory', ['Marlin', 'Gill', 'Bruce']),
 ('Koji je Pixarov film o malom robotu koji sprema otpad na napuštenoj Zemlji?', 'WALL-E', ['Cars', 'Up', 'Soul']),
 ('Koji je Pixarov film o štakoru koji želi postati kuhar u Parizu?', 'Ratatouille', ['Rio', 'Zootropolis', 'Madagaskar']),
 ('Kako se zove snjegović u filmu Snježno kraljevstvo (Frozen)?', 'Olaf', ['Kristoff', 'Sven', 'Hans']),
])
add('Superjunaci i stripovi', [
 ('Kako se zove rodni planet Supermana?', 'Krypton', ['Mars', 'Asgard', 'Apokolips']),
 ('Kako se zove grad u kojem djeluje Batman?', 'Gotham', ['Metropolis', 'Central City', 'Star City']),
 ('Kako se zove afrička zemlja iz filma Black Panther?', 'Wakanda', ['Zamunda', 'Genosha', 'Latveria']),
 ('Što skuplja Thanos u filmu Avengers: Infinity War?', 'Kamenje beskonačnosti', ['Zmajeve kugle', 'Vibranijum', 'Svjetlosne kristale']),
 ('Kako se zove znanstvenik koji se pretvara u Hulka?', 'Bruce Banner', ['Peter Parker', 'Tony Stark', 'Reed Richards']),
])
add('Drevne civilizacije', [
 ('Koji je kamen omogućio dešifriranje egipatskih hijeroglifa?', 'Kamen iz Rosette', ['Kamen iz Gize', 'Kamen iz Karnaka', 'Kamen iz Babilona']),
 ('Kako se zvao glavni grad Asteka?', 'Tenochtitlan', ['Cusco', 'Tikal', 'Teotihuacan']),
 ('Tko je osnovao Perzijsko Carstvo?', 'Kir Veliki', ['Darije I.', 'Kserkso I.', 'Aleksandar Veliki']),
 ('Koji je narod u Mezopotamiji izumio klinasto pismo?', 'Sumerani', ['Egipćani', 'Feničani', 'Hetiti']),
 ('Koje je jedino od sedam svjetskih čuda antike sačuvano do danas?', 'Velika piramida u Gizi', ['Rodoski kolos', 'Viseći vrtovi', 'Artemidin hram']),
 ('Koji je rimski grad 79. godine zatrpao pepeo Vezuva?', 'Pompeji', ['Rim', 'Napulj', 'Capua']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print('ukupno', sum(len(l) for l in C.values()))
# naknadno: uklonjene značenjske duplikate postojećih pitanja (različito formulirana ista pitanja)
_rm = ['Koji je francuski kralj bio poznat kao Kralj Sunce?', 'Kako se zove izmišljeni gradić u seriji Stranger Things?', 'Koje se voće u jugoistočnoj Aziji naziva kraljem voća, a poznato je po jakom mirisu?',
 'Koji se hrvatski otok naziva otokom lavande?', 'Koji se hrvatski grad naziva Biserom Jadrana?', 'Kako se zvala prva životinja u Zemljinoj orbiti, pas poslan 1957.?', 'Koja je krvna skupina univerzalni davatelj?',
 'Koliko zubi ima odrasla osoba s potpunom denticijom?', 'Koji je pisac napisao Na Drini ćuprija?', 'Koji je američki umjetnik poznat po slikama konzervi juhe Campbell\'s?', 'Kako se zove dvorana palih ratnika u nordijskoj mitologiji?',
 'Koji egipatski bog ima glavu šakala i povezan je s mumificiranjem?', 'Koji je grčki bog mora?', 'Kako se zvao glavni grad Asteka?', 'Koji je narod u Mezopotamiji izumio klinasto pismo?', 'Koji je rimski grad 79. godine zatrpao pepeo Vezuva?',
 'Kako se zove izmišljeni grad u igri Grand Theft Auto V?', 'Kako se zove glavni lik serije igara Halo?', 'Kako se zove snjegović u filmu Snježno kraljevstvo (Frozen)?', 'Kako se zove grad u kojem djeluje Batman?', 'Kako se zove afrička zemlja iz filma Black Panther?']
_n = 0
for _c in C:
    _k = [x for x in C[_c] if x['q'] not in _rm]; _n += len(C[_c]) - len(_k); C[_c] = _k
assert _n == len(_rm), _n
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print('uklonjeno duplikata', _n, '| ukupno', sum(len(l) for l in C.values()))
