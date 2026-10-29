# Jednokratna dopuna 16 (v59): Kuhinje svijeta, Rekordi, Izumi, Hrvatski običaji, Eurosong.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(72)
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
add('Kuhinje svijeta', [
 ('Od čega se pravi japanska juha miso?', 'Od fermentirane soje', ['Od morskih algi', 'Od riblje kosti', 'Od rižinog octa']),
 ('Kako se zove meksički umak od avokada?', 'Guacamole', ['Salsa', 'Pico de gallo', 'Mole']),
 ('Koji se škotski specijalitet priprema od ovčjih iznutrica i zobenih pahuljica?', 'Haggis', ['Black pudding', 'Shepherd\'s pie', 'Cullen skink']),
 ('Kako se zove indijska plosnata pogača pečena u glinenoj peći tandoor?', 'Naan', ['Tortilla', 'Pita', 'Lavaš']),
 ('Kako se zove korejsko fermentirano ljuto povrće, najčešće kupus?', 'Kimchi', ['Natto', 'Sauerkraut', 'Wasabi']),
 ('Kako se zove vijetnamska juha s rižinim rezancima i govedinom?', 'Pho', ['Ramen', 'Laksa', 'Udon']),
 ('Kako se zove tajlandska ljuta i kisela juha, često s kozicama?', 'Tom yum', ['Pad thai', 'Satay', 'Massaman']),
 ('Od kojeg se glavnog sastojka pravi humus?', 'Slanutka', ['Leće', 'Graha', 'Patlidžana']),
 ('Kako se zove španjolska hladna juha od sirovih rajčica?', 'Gazpacho', ['Paella', 'Sangria', 'Tortilla']),
 ('Kako se zove argentinski roštilj, tradicija pečenja mesa na žaru?', 'Asado', ['Churrasco', 'Barbacoa', 'Ceviche']),
 ('Od kojeg se mlijeka tradicionalno pravi grčka feta?', 'Ovčjeg', ['Kravljeg', 'Bivoljeg', 'Devinog']),
 ('Iz koje španjolske pokrajine potječe paella?', 'Valencije', ['Andaluzije', 'Katalonije', 'Baskije']),
 ('Što je glavni sastojak jela fondue iz Švicarske?', 'Rastopljeni sir', ['Rastopljena čokolada', 'Vrući ulje', 'Pjenasto vrhnje']),
 ('Od čega se pravi tofu?', 'Od soje', ['Od riže', 'Od slanutka', 'Od pšenice']),
])
add('Rekordi i superlativi', [
 ('Koja je najbrža kopnena životinja?', 'Gepard', ['Antilopa', 'Lav', 'Konj']),
 ('Tko drži svjetski rekord u utrci na 100 metara, 9,58 sekundi?', 'Usain Bolt', ['Tyson Gay', 'Yohan Blake', 'Justin Gatlin']),
 ('Koji je najveći kopneni sisavac?', 'Afrički slon', ['Nosorog', 'Žirafa', 'Nilski konj']),
 ('Koja je najmanja ptica na svijetu?', 'Kolibrić pčelac', ['Zeba', 'Carić', 'Vrabac']),
 ('Koji je muzej najposjećeniji na svijetu?', 'Louvre', ['British Museum', 'Prado', 'Ermitaž']),
 ('Koja je Francuskinja dosegnula najdulje dokumentiran ljudski život, 122 godine?', 'Jeanne Calment', ['Marie Curie', 'Édith Piaf', 'Simone de Beauvoir']),
 ('Koji je Amerikanac, visok 272 cm, najviši dokumentirani čovjek u povijesti?', 'Robert Wadlow', ['Andre the Giant', 'Shaquille O\'Neal', 'Gheorghe Mureșan']),
 ('Koji je najviši vrh Afrike?', 'Kilimandžaro', ['Mont Kenya', 'Stanley', 'Toubkal']),
 ('Koji je najviši vrh Antarktike?', 'Vinson', ['Erebus', 'Kosciuszko', 'Elbrus']),
 ('Koji je najveći otok u Sredozemnom moru?', 'Sicilija', ['Sardinija', 'Cipar', 'Kreta']),
])
add('Izumi i otkrića', [
 ('Tko je izumio World Wide Web?', 'Tim Berners-Lee', ['Bill Gates', 'Steve Jobs', 'Vint Cerf']),
 ('Koja se matematičarka smatra prvim programerom na svijetu?', 'Ada Lovelace', ['Grace Hopper', 'Marie Curie', 'Hedy Lamarr']),
 ('Koji je kanadski liječnik 1921. s Charlesom Bestom otkrio inzulin?', 'Frederick Banting', ['Alexander Fleming', 'Jonas Salk', 'Louis Pasteur']),
 ('Tko je 1897. otkrio elektron?', 'J. J. Thomson', ['Ernest Rutherford', 'Niels Bohr', 'James Chadwick']),
 ('Tko je 1896. otkrio radioaktivnost?', 'Henri Becquerel', ['Wilhelm Röntgen', 'Pierre Curie', 'Max Planck']),
 ('Koji je mađarski izumitelj patentirao kemijsku olovku?', 'László Bíró', ['Ottó Bláthy', 'Ányos Jedlik', 'Dennis Gabor']),
 ('Tko je izumio lift sa sigurnosnom kočnicom, koji je pokazao 1854.?', 'Elisha Otis', ['Henry Ford', 'Gustave Eiffel', 'Isambard Brunel']),
 ('Koji je ruskoamerički inženjer razvio prvi praktični helikopter s jednim glavnim rotorom?', 'Igor Sikorsky', ['Wernher von Braun', 'Sergej Koroljov', 'Howard Hughes']),
 ('Tko je 1973. obavio prvi poziv s ručnog mobitela?', 'Martin Cooper', ['Steve Wozniak', 'Alexander Graham Bell', 'Nikola Tesla']),
 ('Po kojem je danskom kralju nazvana tehnologija bežičnog povezivanja Bluetooth?', 'Haraldu Plavozubom', ['Kanutu Velikom', 'Haraldu Dugokosom', 'Olafu Tryggvasonu']),
])
add('Hrvatski običaji i baština', [
 ('Kojeg se datuma u Hrvatskoj slavi Dan državnosti?', '30. svibnja', ['25. lipnja', '8. listopada', '15. siječnja']),
 ('Kojeg se datuma u Hrvatskoj slavi Dan pobjede i domovinske zahvalnosti?', '5. kolovoza', ['22. lipnja', '18. studenoga', '15. kolovoza']),
 ('Kojeg se datuma obilježava Dan kravate?', '18. listopada', ['5. svibnja', '1. prosinca', '25. lipnja']),
 ('Koja se riba u Dalmaciji tradicionalno jede na Badnjak?', 'Bakalar', ['Šaran', 'Pastrva', 'Skuša']),
 ('Što se za Uskrs u hrvatskim crkvama tradicionalno blagoslivlja u košarama?', 'Uskršnja jela', ['Cvijeće', 'Vino i ulje', 'Svijeće']),
])
add('Eurosong', [
 ('Koja je pjesma ABBA-e 1974. pobijedila na Eurosongu u Brightonu?', 'Waterloo', ['Fernando', 'Dancing Queen', 'Mamma Mia']),
 ('Koja je kanadska pjevačica 1988. pobijedila za Švicarsku?', 'Céline Dion', ['Shania Twain', 'Alanis Morissette', 'Avril Lavigne']),
 ('Koja je pjevačica 2012. u Bakuu pobijedila pjesmom Euphoria?', 'Loreen', ['Charlotte Perrelli', 'Carola', 'Zara Larsson']),
 ('Koja je njemačka pjevačica 2010. u Oslu pobijedila pjesmom Satellite?', 'Lena', ['Nena', 'Sandra', 'Helene Fischer']),
 ('Koja je hrvatska pjevačica 1999. u Jeruzalemu s pjesmom Marija Magdalena osvojila četvrto mjesto?', 'Doris Dragović', ['Maja Blagdan', 'Tony Cetinski', 'Ivana Banfić']),
 ('Koja je jugoslavenska skupina 1989. u Lausannei pobijedila pjesmom Rock Me?', 'Riva', ['Novi fosili', 'Magazin', 'Parni valjak']),
 ('U kojem je gradu 1990., nakon jugoslavenske pobjede, održan Eurosong?', 'Zagrebu', ['Beogradu', 'Ljubljani', 'Sarajevu']),
 ('Koja je pjevačica 1956. u Luganu osvojila prvi Eurosong?', 'Lys Assia', ['Nana Mouskouri', 'Vicky Leandros', 'Gigliola Cinquetti']),
 ('Koja je država 1978. dobila nula bodova s pjesmom Mil etter mil?', 'Norveška', ['Finska', 'Švedska', 'Danska']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
print('ukupno', sum(len(l) for l in C.values()))
