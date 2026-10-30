# Jednokratno: dodaje podatke za mini-igru "Uljez u krčmi" (ključ 'ulj'). Ne pokretati ponovno.
import json
P = '/root/mozgalica/v3/data.json'
D = json.load(open(P, encoding='utf-8'))
assert 'ulj' not in D
T = [
 ('Voće', 'jabuka kruška šljiva trešnja', 'mrkva luk krumpir kupus'),
 ('Hrvatski otoci', 'Krk Hvar Brač Vis', 'Capri Mallorca Krf Santorini'),
 ('Alati', 'čekić kliješta odvijač pila', 'kist škare olovka ravnalo'),
 ('Na plaži', 'ručnik suncobran kupaći krema', 'šal kišobran rukavice kaput'),
 ('Domaće životinje', 'krava ovca koza kokoš', 'lav slon žirafa zebra'),
 ('Žičani instrumenti', 'gitara violina harfa tamburica', 'truba flauta saksofon bubanj'),
 ('Hrvatske planine', 'Velebit Biokovo Dinara Učka', 'Triglav Olimp Etna Alpe'),
 ('Zimski sportovi', 'skijanje sanjkanje hokej klizanje', 'plivanje jedrenje veslanje ronjenje'),
 ('Timski sportovi', 'nogomet košarka odbojka rukomet', 'tenis boks golf skijanje'),
 ('Hitne službe', 'vatrogasac policajac hitna;pomoć gorska;služba', 'pekar frizer kuhar mehaničar'),
 ('Dijelovi bicikla', 'lanac pedala zvono spice', 'volan branik auspuh akumulator'),
 ('Šahovska ploča', 'kralj kraljica lovac skakač', 'žeton kocka domino ruleta'),
 ('U pernici', 'olovka gumica šiljilo ravnalo', 'četkica češalj sapun ogledalo'),
 ('Zimska odjeća', 'kaput šal rukavice kapa', 'majica sandale kupaći kratke;hlače'),
 ('Slatkiši', 'čokolada bomboni lizalica torta', 'čips kikiriki štapići kokice'),
 ('Bezalkoholna pića', 'sok voda čaj limunada', 'pivo vino rakija whisky'),
 ('Plodovi mora', 'losos tuna lignje školjke', 'piletina junetina svinjetina janjetina'),
 ('Filmski žanrovi', 'horor western triler komedija', 'sonet basna novela ep'),
 ('Planeti', 'Mars Venera Saturn Jupiter', 'Mjesec Sunce Sirius Halleyev;komet'),
 ('Kućanski aparati', 'perilica usisavač pećnica hladnjak', 'televizor mobitel laptop konzola'),
 ('Divlje životinje u Hrvatskoj', 'medvjed vuk ris jelen', 'kenguru panda pingvin nilski;konj'),
 ('Dijelovi glave', 'oko uho nos obrva', 'koljeno lakat rame gležanj'),
 ('Hrvatski pjevači', 'Severina Gibonni Oliver Tony;Cetinski', 'Shakira Adele Rihanna Madonna'),
 ('Gradovi na moru', 'Split Zadar Rijeka Pula', 'Osijek Varaždin Karlovac Slavonski;Brod'),
 ('Dalmatinska jela', 'pašticada brudet crni;rižot rozata', 'sarma čobanac kulen fiš;paprikaš'),
 ('Namještaj', 'stol stolica ormar krevet', 'krov zid prozor dimnjak'),
 ('Vozila na dva kotača', 'bicikl motor skuter romobil', 'autobus kamion vlak tramvaj'),
 ('Na pizzi', 'sir šunka gljive masline', 'šlag med karamel vanilija'),
 ('Na roštilju', 'ćevapi kobasice ražnjići pleskavica', 'sladoled palačinke torta puding'),
 ('Za pisanje', 'olovka kemijska flomaster marker', 'tipkovnica miš monitor printer'),
 ('Kontinenti', 'Europa Azija Afrika Australija', 'Atlantik Pacifik Sredozemlje Jadran'),
 ('Rodbina', 'baka djed teta stric', 'šef susjed kolega prijatelj'),
 ('Obroci', 'doručak ručak večera marenda', 'kava sok čaj voda'),
 ('Na nogama', 'tenisice sandale čizme japanke', 'šešir rukavice naočale šal'),
 ('Kišni dan', 'kišobran kabanica lokva gumene;čizme', 'suncobran sunčane;naočale ležaljka krema'),
 ('Društvene igre', 'Monopoly Tabu Jenga Čovječe;ne;ljuti;se', 'Fortnite Minecraft FIFA Tetris'),
 ('Mediteranske biljke', 'maslina lavanda ružmarin smokva', 'bukva jela smreka breza'),
 ('Hrvatski nogometaši', 'Modrić Rakitić Perišić Kovačić', 'Messi Ronaldo Mbappé Haaland'),
 ('Mliječni proizvodi', 'jogurt sir vrhnje maslac', 'kruh kifla pereca lepinja'),
 ('Društvene mreže', 'Instagram TikTok Facebook Snapchat', 'Google Wikipedia Netflix Amazon'),
 ('Nogometni pojmovi', 'gol korner ofsajd jedanaesterac', 'smeč ace bunker zakucavanje'),
 ('Hrvatske robne marke', 'Kraš Podravka Vindija Franck', 'Milka Nutella Nestlé Haribo'),
 ('Uredski pribor', 'spajalica klamerica fascikl bušilica', 'tipkovnica miš monitor printer'),
 ('Morske životinje', 'dupin hobotnica meduza morska;zvijezda', 'šaran štuka som pastrva'),
 ('Ptice', 'roda vrabac golub sova', 'šišmiš leptir pčela osa'),
 ('Božićni ukrasi', 'kuglice lampice jaslice vijenac', 'pisanice zečići košarica uskršnji;jaja'),
 ('U kupaonici', 'sapun šampon ručnik četkica;za;zube', 'tava lonac kuhača tanjur'),
 ('Glavni gradovi', 'Pariz Rim Madrid Berlin', 'Barcelona Milano Hamburg Marseille'),
 ('Bajke', 'Pepeljuga Snjeguljica Trnoružica Crvenkapica', 'Batman Spiderman Superman Hulk'),
 ('Zelene stvari', 'trava žaba list krastavac', 'rajčica jagoda krv mak'),
 ('Hladne stvari', 'led snijeg sladoled iglu', 'vatra žar lava sauna'),
 ('Brze stvari', 'gepard raketa zrakoplov munja', 'puž kornjača lijenac glečer'),
]
out = []
for t, y, n in T:
    yy = [w.replace(';', ' ') for w in y.split()]
    nn = [w.replace(';', ' ') for w in n.split()]
    assert len(yy) == 4 and len(nn) == 4, (t, yy, nn)
    out.append({'t': t, 'y': yy, 'n': nn})
D['ulj'] = out
json.dump(D, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ulj', len(out))
