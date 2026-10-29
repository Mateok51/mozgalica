# Jednokratna dopuna 15 (v59): Reklame, Internet, Slavni parovi, Anime, Vrijeme, Dinosauri, Matematika, Bajke, Moda, Božić, Općenito.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(71)
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
add('Reklame i slogani', [
 ('Koja je tvrtka 1959. u poznatoj kampanji agencije DDB za svoju bubu koristila slogan Think Small?', 'Volkswagen', ['Fiat', 'Renault', 'Ford']),
 ('Koja čokoladna bombonica ima slogan o čokoladi koja se topi u ustima, a ne u ruci?', "M&M's", ['Smarties', 'Toblerone', 'Kinder']),
 ('Koji britanski lanac supermarketa koristi slogan Every little helps?', 'Tesco', ['Sainsbury\'s', 'Asda', 'Waitrose']),
 ('Koji je lik maskota pahuljica Frosties tvrtke Kellogg\'s?', 'Tony the Tiger', ['Chester Cheetah', 'Snap, Crackle i Pop', 'Toucan Sam']),
 ('Kako se zove maskota tvrtke Michelin napravljena od složenih guma?', 'Bibendum', ['Michelinko', 'Pneumatik', 'Roadie']),
 ('Koja odjevna marka ima krokodila na logotipu?', 'Lacoste', ['Ralph Lauren', 'Fred Perry', 'Puma']),
 ('Koji gazirani napitak koristi slogan Obey your thirst?', 'Sprite', ['Fanta', '7 Up', 'Pepsi']),
 ('Koja tvrtka koristi slogan Beanz Meanz...?', 'Heinz', ['Del Monte', 'Knorr', 'Campbell\'s']),
 ('Koji automobilski proizvođač koristi slogan Zoom-Zoom?', 'Mazda', ['Honda', 'Nissan', 'Mitsubishi']),
 ('Koja tvrtka koristi slogan Life\'s Good?', 'LG', ['Samsung', 'Sony', 'Philips']),
 ('Koja njemačka marka koristi slogan Das Beste oder nichts?', 'Mercedes-Benz', ['Audi', 'BMW', 'Porsche']),
])
add('Internet i memovi', [
 ('Što je prikazano u prvom videu na YouTubeu, Me at the zoo, iz 2005.?', 'Slonovi u zoološkom vrtu', ['Pas na plaži', 'Maca na klaviru', 'Skok s bicikla']),
 ('Koje je godine pokrenuta Wikipedija?', '2001.', ['1996.', '2004.', '2007.']),
 ('Koji je emoji Oxfordov rječnik 2015. proglasio riječju godine?', 'Lice sa suzama radosnicama', ['Crveno srce', 'Podignut palac', 'Vatra']),
 ('Koja je kriptovaluta nastala 2013. kao šala prema mem-psu Shiba inu?', 'Dogecoin', ['Litecoin', 'Ripple', 'Monero']),
 ('Koji je glazbeni spot 2012. prvi dosegnuo milijardu pregleda na YouTubeu?', 'Gangnam Style', ['Call Me Maybe', 'Baby', 'Harlem Shake']),
 ('Pod kojim je imenom od 2023. poznata društvena mreža koja se prije zvala Twitter?', 'X', ['Threads', 'Bluesky', 'Meta']),
 ('Pod kojim je imenom od 2021. poznata matična tvrtka Facebooka?', 'Meta', ['Alphabet', 'Oculus', 'Horizon']),
 ('Što znači kratica AMA na Redditu?', 'Pitajte me bilo što', ['Uvijek sam spreman', 'Autor mijenja odgovor', 'Anonimni mem arhiv']),
 ('Koja se računalna igra iz 2007. godinama koristi u šali „Može li na tome raditi...?“', 'Crysis', ['Doom', 'Minecraft', 'Half-Life']),
 ('Što znači kratica ELI5 na Redditu?', 'Objasni kao da imam pet godina', ['Svatko to zna do pete', 'Uživo na internetu', 'Eksperti odgovaraju iznad pet']),
])
add('Slavni parovi i obitelji', [
 ('Koju je titulu imao suprug kraljice Elizabete II., princ Filip?', 'Vojvoda od Edinburgha', ['Vojvoda od Yorka', 'Vojvoda od Cornwalla', 'Vojvoda od Sussexa']),
 ('Koju je ženu 1953. oženio budući američki predsjednik John F. Kennedy?', 'Jacqueline Bouvier', ['Marilyn Monroe', 'Lee Radziwill', 'Ethel Skakel']),
 ('Koja je glumica bila u braku s Tomom Cruiseom od 1990. do 2001.?', 'Nicole Kidman', ['Katie Holmes', 'Mimi Rogers', 'Penélope Cruz']),
 ('Koja je pjevačica bila u braku s Ikeom Turnerom?', 'Tina Turner', ['Aretha Franklin', 'Diana Ross', 'Gladys Knight']),
 ('Koja je manekenka i spisateljica udana za pjevača Johna Legenda?', 'Chrissy Teigen', ['Emily Ratajkowski', 'Gigi Hadid', 'Kendall Jenner']),
 ('Za kojeg je glumca udana Catherine Zeta-Jones?', 'Michaela Douglasa', ['Richarda Gerea', 'Antonija Banderasa', 'Hugha Granta']),
 ('Koju je odvjetnicu 2014. oženio glumac George Clooney?', 'Amal Alamuddin', ['Sandra Bullock', 'Elisabetta Canalis', 'Talia Balsam']),
 ('Kako se zove prvo dijete Beyoncé i Jay-Zja, rođeno 2012.?', 'Blue Ivy', ['Sasha', 'Willow', 'North']),
 ('Koji je plesni par 1930-ih zablistao u filmovima poput Top Hat?', 'Fred Astaire i Ginger Rogers', ['Gene Kelly i Cyd Charisse', 'Clark Gable i Vivien Leigh', 'Humphrey Bogart i Lauren Bacall']),
 ('Koja je tenisačica udana za osnivača Reddita Alexisa Ohaniana?', 'Serena Williams', ['Venus Williams', 'Maria Šarapova', 'Naomi Osaka']),
])
add('Anime', [
 ('Kako se zove glavni junak animea Attack on Titan?', 'Eren Yeager', ['Armin Arlert', 'Levi Ackerman', 'Reiner Braun']),
 ('Kako se zove glavni junak animea Bleach?', 'Ichigo Kurosaki', ['Rukia Kuchiki', 'Kisuke Urahara', 'Renji Abarai']),
 ('Kako se zove glavni junak animea Hunter x Hunter?', 'Gon Freecss', ['Killua Zoldyck', 'Kurapika', 'Leorio Paradinight']),
 ('Kako se zove glavni junak animea Chainsaw Man?', 'Denji', ['Aki Hayakawa', 'Power', 'Makima']),
 ('Kako se zove lebdeći otok iz filma Castle in the Sky Studija Ghibli?', 'Laputa', ['Atlantis', 'Raputa', 'Zeppelin']),
 ('Koji je redatelj anime filma Perfect Blue iz 1997.?', 'Satoshi Kon', ['Mamoru Oshii', 'Mamoru Hosoda', 'Hideaki Anno']),
 ('Kako se zove plavi robot-mačak iz budućnosti koji pomaže dječaku Nobiti?', 'Doraemon', ['Astro Boy', 'Pikachu', 'Totoro']),
 ('Što na japanskom znači kawaii?', 'Slatko', ['Moćno', 'Tajanstveno', 'Brzo']),
 ('Kako se zove žanr u kojem lik biva prenesen u drugi svijet?', 'Isekai', ['Mecha', 'Shojo', 'Seinen']),
 ('Kako se zove žanr mange i animea namijenjen ponajprije dječacima i mladim tinejdžerima?', 'Shonen', ['Shojo', 'Josei', 'Kodomo']),
])
add('Vrijeme i klima', [
 ('Kako se zove instrument za mjerenje brzine vjetra?', 'Anemometar', ['Higrometar', 'Pluviometar', 'Barograf']),
 ('Kako se zove instrument za mjerenje vlažnosti zraka?', 'Higrometar', ['Anemometar', 'Termograf', 'Aneroid']),
 ('Kako se zove instrument za mjerenje količine oborina?', 'Kišomjer', ['Vjetrokaz', 'Barometar', 'Termometar']),
 ('Koja vrsta oblaka donosi grmljavinske oluje?', 'Kumulonimbus', ['Cirus', 'Stratus', 'Altokumulus']),
 ('U kojem se sloju atmosfere događa većina vremenskih pojava?', 'Troposferi', ['Stratosferi', 'Mezosferi', 'Termosferi']),
 ('Što na vremenskoj karti spajaju linije koje zovemo izobare?', 'Točke jednakog tlaka zraka', ['Točke jednake temperature', 'Točke jednake vlažnosti', 'Točke jednake brzine vjetra']),
 ('U kojoj se zemlji nalaze Mawsynram i Cherrapunji, među najkišovitijim mjestima na svijetu?', 'Indiji', ['Brazilu', 'Indoneziji', 'Kolumbiji']),
 ('Što znači 1 milimetar kiše?', 'Jedan litar vode na četvorni metar', ['Jedan decilitar na četvorni metar', 'Deset litara na četvorni metar', 'Jedan litar na hektar']),
])
add('Dinosauri i prapovijest', [
 ('U kojem je razdoblju mezozoika živio Tyrannosaurus rex?', 'U kredi', ['U trijasu', 'U juri', 'U permu']),
 ('Koje je razdoblje mezozoika bilo prvo?', 'Trijas', ['Jura', 'Kreda', 'Perm']),
 ('Koji je američki lovac na fosile 1902. pronašao prvi poznati kostur Tyrannosaurusa rexa?', 'Barnum Brown', ['Othniel Marsh', 'Edward Cope', 'Richard Owen']),
 ('Što je koprolit?', 'Fosilizirani izmet', ['Fosilizirano jaje', 'Fosilizirani trag', 'Fosilizirana kost']),
 ('Kojoj skupini životinja pripadaju izumrli trilobiti?', 'Člankonošcima', ['Mekušcima', 'Ribama', 'Mrežnjacima']),
 ('U kojoj je njemačkoj dolini 1856. pronađen prvi prepoznati fosil neandertalca?', 'Neandertalu', ['Rajni', 'Mosel', 'Altmühl']),
 ('U kojoj su europskoj zemlji špilje Lascaux s paleolitskim crtežima?', 'Francuskoj', ['Španjolskoj', 'Italiji', 'Njemačkoj']),
])
add('Matematika i brojevi', [
 ('Koliko je 0! (nula faktorijela)?', '1', ['0', 'Nedefinirano', '-1']),
 ('Koji je najmanji savršeni broj, jednak zbroju svojih djelitelja manjih od njega samog?', '6', ['4', '8', '12']),
 ('Koji je austrijski logičar dokazao teoreme nepotpunosti?', 'Kurt Gödel', ['Alan Turing', 'David Hilbert', 'Bertrand Russell']),
 ('Koji je matematičar riješio problem sedam mostova u Königsbergu?', 'Leonhard Euler', ['Carl Gauss', 'Blaise Pascal', 'Pierre de Fermat']),
 ('Koliko bridova ima kocka?', '12', ['6', '8', '10']),
 ('Koji je najveći dvoznamenkasti prosti broj?', '97', ['91', '93', '99']),
 ('Kojim se brojem ne smije dijeliti?', 'Nulom', ['Jedinicom', 'Dvojkom', 'Deset']),
 ('Koji je škotski matematičar uveo logaritme početkom 17. stoljeća?', 'John Napier', ['Isaac Newton', 'Blaise Pascal', 'René Descartes']),
 ('Koji je antički učenjak prema predaji uzviknuo „Eureka!“ u kadi?', 'Arhimed', ['Euklid', 'Pitagora', 'Tales']),
 ('Kako se zove geometrijski lik s dvanaest stranica?', 'Dvanaesterokut', ['Deseterokut', 'Osmerokut', 'Šesterokut']),
 ('Kako se zove ploha s jednom stranom, nastala spajanjem uvijene trake?', 'Möbiusova vrpca', ['Kleinova boca', 'Pascalov trokut', 'Cassinijev oval']),
])
add('Bajke i dječje priče', [
 ('Što je Pepeljuga izgubila na stubama dvorca?', 'Cipelicu', ['Rukavicu', 'Tijaru', 'Veo']),
 ('Od čega je treći praščić sagradio kuću koja je izdržala vukove napade?', 'Od opeke', ['Od slame', 'Od drva', 'Od blata']),
 ('Tko u Crvenkapici na kraju spašava baku?', 'Lovac', ['Drvosječa', 'Kralj', 'Otac']),
 ('Što je Rumpelstilzchen pretvarao u zlato?', 'Slamu', ['Pijesak', 'Konce', 'Žito']),
 ('U što se pretvorilo ružno pače u Andersenovoj bajci?', 'U labuda', ['U guske', 'U ždrala', 'U pauna']),
 ('Tko je napisao priče o medvjediću Winnieju Poohu?', 'A. A. Milne', ['Roald Dahl', 'Lewis Carroll', 'J. M. Barrie']),
 ('Tko je autor knjiga o Pipi Dugoj Čarapi?', 'Astrid Lindgren', ['Tove Jansson', 'Selma Lagerlöf', 'Enid Blyton']),
 ('Tko je napisao roman Pinocchio?', 'Carlo Collodi', ['Italo Calvino', 'Gianni Rodari', 'Umberto Eco']),
 ('Tko je napisao Petra Pana?', 'J. M. Barrie', ['Lewis Carroll', 'A. A. Milne', 'Kenneth Grahame']),
 ('Kroz što djeca u Narnijskim kronikama prvi put ulaze u Narniju?', 'Kroz ormar', ['Kroz ogledalo', 'Kroz zdenac', 'Kroz sliku']),
])
add('Moda', [
 ('Koji je dizajner poznat po crvenim potplatima cipela?', 'Christian Louboutin', ['Manolo Blahnik', 'Jimmy Choo', 'Salvatore Ferragamo']),
 ('Koja je modna kuća poznata po torbi Birkin?', 'Hermès', ['Chanel', 'Gucci', 'Dior']),
 ('Koja je američka dizajnerica popularizirala omotnu haljinu 1970-ih?', 'Diane von Fürstenberg', ['Donna Karan', 'Vera Wang', 'Tory Burch']),
 ('Koja je marka odjeće poznata po logotipu igrača polo na konju?', 'Ralph Lauren', ['Lacoste', 'Tommy Hilfiger', 'Burberry']),
 ('Koji je španjolski dizajner osnovao modnu kuću Balenciaga?', 'Cristóbal Balenciaga', ['Paco Rabanne', 'Manolo Blahnik', 'Pedro Almodóvar']),
 ('Koji je dizajner 1966. predstavio ženski smoking Le Smoking?', 'Yves Saint Laurent', ['Pierre Cardin', 'Hubert de Givenchy', 'Christian Dior']),
 ('Koja je glumica u filmu Vrag nosi Pradu glumila urednicu Mirandu Priestly?', 'Meryl Streep', ['Anne Hathaway', 'Emily Blunt', 'Sigourney Weaver']),
 ('Koji je broj na najpoznatijem Chanelovu parfemu?', '5', ['1', '7', '19']),
])
add('Božić i blagdani', [
 ('Na koji se dan, 13. prosinca, u Hrvatskoj tradicionalno sije božićna pšenica?', 'Na Svetu Luciju', ['Na Svetog Nikolu', 'Na Badnjak', 'Na Svetu Barbaru']),
 ('Koliko svijeća ima tradicionalni adventski vijenac?', 'Četiri', ['Tri', 'Pet', 'Sedam']),
 ('Koji se finski grad naziva službenim domom Djeda Božićnjaka?', 'Rovaniemi', ['Helsinki', 'Tampere', 'Oulu']),
 ('Koja se biljka s bijelim bobicama vješa kao povod za poljubac?', 'Imela', ['Božikovina', 'Bršljan', 'Jela']),
 ('Iz koje zemlje potječe božićna zvijezda, crvena biljka poznata i kao poinsettia?', 'Meksika', ['Španjolske', 'Italije', 'Brazila']),
 ('Koji je britanski desert od suhog voća tradicionalno zapaljen i poslužen za Božić?', 'Božićni puding', ['Trifle', 'Scones', 'Crumble']),
 ('Koji se dan u Hrvatskoj slavi 26. prosinca?', 'Sveti Stjepan', ['Sveti Ivan', 'Sveta tri kralja', 'Nevina dječica']),
])
add('Općenito', [
 ('Koji je jezik s najviše materinskih govornika na svijetu?', 'Mandarinski kineski', ['Engleski', 'Španjolski', 'Hindi']),
 ('Koji je kemijski simbol zlata?', 'Au', ['Ag', 'Go', 'Gd']),
 ('Kako se zove 60. godišnjica braka?', 'Dijamantna', ['Zlatna', 'Srebrna', 'Rubinska']),
 ('Kako se zove 40. godišnjica braka?', 'Rubinska', ['Biserna', 'Smaragdna', 'Zlatna']),
 ('Koliko sati ima tjedan?', '168', ['144', '156', '192']),
 ('Koliko minuta ima jedan dan?', '1440', ['1240', '1640', '2400']),
 ('Kako se zove mladunče koze?', 'Jare', ['Janje', 'Tele', 'Ždrijebe']),
 ('Koliko igrača jedne ekipe istodobno je na terenu u odbojci?', 'Šest', ['Pet', 'Sedam', 'Osam']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print('ukupno', sum(len(l) for l in C.values()))
