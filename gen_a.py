import json, re, random
# (pitanje, opcije, indeks_tocne, fiksno) - fiksno=True znači da je redoslijed opcija prirodan (brojevi) i ne mijenja se
D = {
"Svemir": [
("Koji je planet poznat kao „Crveni planet“?", ["Venera", "Mars", "Jupiter", "Merkur"], 1),
("Koji planet ima najpoznatije i najizraženije prstenove?", ["Saturn", "Uran", "Neptun", "Mars"], 0),
("Kako se zove galaksija u kojoj se nalazi Sunčev sustav?", ["Andromeda", "Mliječni put", "Sombrero", "Vrtlog"], 1),
("Koliko otprilike treba Sunčevoj svjetlosti da stigne do Zemlje?", ["8 sekundi", "8 minuta", "8 sati", "8 dana"], 1, True),
("Tko je bio prvi čovjek u svemiru?", ["Neil Armstrong", "Jurij Gagarin", "Buzz Aldrin", "John Glenn"], 1),
("Kako se zvao prvi umjetni Zemljin satelit, lansiran 1957.?", ["Explorer 1", "Vostok 1", "Sputnjik 1", "Apollo 1"], 2),
("Koji je planet Sunčeva sustava najudaljeniji od Sunca?", ["Uran", "Saturn", "Neptun", "Jupiter"], 2),
("Koje je godine Pluton svrstan u patuljaste planete?", ["1999.", "2003.", "2006.", "2011."], 2, True),
("Koji planet rotira gotovo „ležeći na boku“, s osi nagnutom za oko 98°?", ["Uran", "Neptun", "Saturn", "Venera"], 0),
("Koji je najveći Jupiterov mjesec, ujedno i najveći u Sunčevu sustavu?", ["Io", "Europa", "Kalisto", "Ganimed"], 3),
("Kako se zove najveći Saturnov mjesec?", ["Enkelad", "Titan", "Mimas", "Rea"], 1),
("Koja je zvijezda najbliža Sunčevu sustavu?", ["Sirius", "Vega", "Betelgeuse", "Proksima Kentaura"], 3),
("Kako se zove svemirski teleskop lansiran 1990. godine?", ["James Webb", "Kepler", "Hubble", "Spitzer"], 2),
("Što je svjetlosna godina?", ["Mjera vremena", "Mjera brzine", "Mjera svjetline", "Mjera udaljenosti"], 3),
("Koji kemijski element čini najveći dio mase Sunca?", ["Helij", "Kisik", "Ugljik", "Vodik"], 3),
("Kako se zove područje s mnoštvom malih tijela između orbita Marsa i Jupitera?", ["Kuiperov pojas", "Oortov oblak", "Asteroidni pojas", "Van Allenov pojas"], 2),
("Koja je misija Apollo 1970. prekinuta zbog eksplozije spremnika kisika?", ["Apollo 11", "Apollo 13", "Apollo 15", "Apollo 17"], 1, True),
("Koliko otprilike traje razdoblje od jednog do sljedećeg punog mjeseca?", ["7 dana", "14 dana", "29,5 dana", "45 dana"], 2, True),
("Tko je bila prva žena u svemiru?", ["Sally Ride", "Valentina Tereškova", "Svetlana Savicka", "Jelena Kondakova"], 1),
("Kako se zove granica oko crne rupe iz koje ništa ne može pobjeći?", ["Singularitet", "Akrecijski disk", "Fotosfera", "Horizont događaja"], 3),
],
"Ljudsko tijelo": [
("Koji je najveći organ ljudskog tijela?", ["Jetra", "Koža", "Pluća", "Mozak"], 1),
("Od koliko se šupljina (klijetki i pretklijetki) sastoji ljudsko srce?", ["2", "3", "4", "6"], 2, True),
("Koja je najmanja kost u ljudskom tijelu?", ["Čekić", "Nakovanj", "Stremen", "Trtica"], 2),
("Koja je najduža kost u ljudskom tijelu?", ["Goljenična kost", "Bedrena kost", "Ramena kost", "Lakatna kost"], 1),
("Koliko zuba ima odrasla osoba s umnjacima?", ["28", "30", "32", "36"], 2, True),
("Koliko mliječnih zuba ima dijete?", ["16", "20", "24", "28"], 1, True),
("Koja je krvna grupa „univerzalni davatelj“ crvenih krvnih zrnaca?", ["AB pozitivna", "0 negativna", "A negativna", "B pozitivna"], 1),
("Koje krvne stanice prenose kisik po tijelu?", ["Leukociti", "Trombociti", "Eritrociti", "Limfociti"], 2),
("Koji organ proizvodi inzulin?", ["Jetra", "Slezena", "Bubreg", "Gušterača"], 3),
("Kako se zove tetiva koja povezuje mišiće lista s petnom kosti?", ["Ahilova", "Hektorova", "Odisejeva", "Herkulova"], 0),
("U kojem se dijelu tijela nalazi rožnica?", ["U uhu", "U oku", "U nosu", "U grlu"], 1),
("Koliko pari rebara obično ima čovjek?", ["10", "11", "12", "14"], 2, True),
("Koji vitamin tijelo stvara u koži pod utjecajem sunčeve svjetlosti?", ["Vitamin A", "Vitamin C", "Vitamin K", "Vitamin D"], 3),
("Koji organi filtriraju krv i stvaraju mokraću?", ["Bubrezi", "Pluća", "Slezena", "Žučni mjehur"], 0),
("Koliko otprilike litara krvi ima odrasla osoba?", ["2", "5", "9", "12"], 1, True),
("Kolika je približno normalna tjelesna temperatura čovjeka?", ["35 °C", "37 °C", "39 °C", "41 °C"], 1, True),
("Koji je dio mozga najzaslužniji za ravnotežu i koordinaciju pokreta?", ["Moždano deblo", "Hipotalamus", "Čeoni režanj", "Mali mozak"], 3),
("Kako se zove obojeni dio oka?", ["Zjenica", "Bjeloočnica", "Šarenica", "Mrežnica"], 2),
("Koliko kromosoma ima uobičajena ljudska tjelesna stanica?", ["23", "44", "46", "48"], 2, True),
("U kojem se organu upija najveći dio hranjivih tvari iz hrane?", ["U tankom crijevu", "U želucu", "U debelom crijevu", "U jednjaku"], 0),
],
"Kemija": [
("Koji je kemijski simbol natrija?", ["N", "Na", "So", "Nt"], 1),
("Koji element ima atomski broj 1?", ["Helij", "Vodik", "Litij", "Kisik"], 1),
("Koja je kemijska formula kuhinjske soli?", ["NaCl", "KCl", "NaOH", "CaCO3"], 0),
("Koji je kemijski simbol kalija?", ["Ka", "P", "K", "Kl"], 2),
("Koji je od ovih metala tekuć na sobnoj temperaturi?", ["Olovo", "Kositar", "Cink", "Živa"], 3),
("Koji se lakši od zraka i nezapaljiv plin koristi za punjenje balona?", ["Vodik", "Helij", "Neon", "Argon"], 1),
("Koliki je pH neutralne otopine pri 25 °C?", ["0", "5", "7", "14"], 2, True),
("Tko je 1869. objavio periodni sustav elemenata?", ["Antoine Lavoisier", "John Dalton", "Marie Curie", "Dmitrij Mendeljejev"], 3),
("Koji je kemijski element najzastupljeniji u Zemljinoj kori?", ["Kisik", "Silicij", "Željezo", "Aluminij"], 0),
("Koji je glavni kemijski sastojak vapnenca i krede?", ["Natrijev klorid", "Kalcijev karbonat", "Silicijev dioksid", "Željezov oksid"], 1),
("Koja se kiselina nalazi u želučanom soku?", ["Sumporna", "Dušična", "Klorovodična", "Octena"], 2),
("Koji plemeniti plin daje crveno-narančasto svjetlo u svjetlećim reklamama?", ["Argon", "Kripton", "Ksenon", "Neon"], 3),
("Koja je kemijska formula ozona?", ["O2", "O3", "O4", "H2O2"], 1, True),
("Koji je element, uz polonij, otkrila Marie Curie sa suprugom Pierreom?", ["Uranij", "Plutonij", "Radij", "Torij"], 2),
("Kojem elementu pripada kemijski simbol W?", ["Volfram", "Vanadij", "Itrij", "Kositar"], 0),
("Koja je kemijska formula metana?", ["C2H6", "CO2", "NH3", "CH4"], 3),
("Dijamant je kristalni oblik kojeg elementa?", ["Silicija", "Ugljika", "Bora", "Sumpora"], 1),
("Koji je kemijski simbol kositra?", ["Ks", "Ti", "Sn", "Co"], 2),
("Koji plin ima miris pokvarenih jaja?", ["Sumporovodik", "Amonijak", "Metan", "Klor"], 0),
("Kako se zove izravan prijelaz tvari iz čvrstog u plinovito stanje?", ["Isparavanje", "Kondenzacija", "Taljenje", "Sublimacija"], 3),
],
"Matematika i brojevi": [
("Koliko je 7 × 8?", ["56", "63", "64", "72"], 0, True),
("Koliki je zbroj unutarnjih kutova trokuta?", ["90°", "180°", "270°", "360°"], 1, True),
("Koliko je drugi korijen iz 144?", ["12", "13", "14", "16"], 0, True),
("Koliko iznosi broj π zaokružen na dvije decimale?", ["3,12", "3,16", "3,41", "3,14"], 3),
("Koliko je 2 na desetu potenciju?", ["512", "1000", "1024", "2048"], 2, True),
("Koji broj slijedi u Fibonaccijevu nizu 1, 1, 2, 3, 5, 8, …?", ["11", "12", "13", "16"], 2, True),
("Koliko bridova ima kocka?", ["6", "8", "10", "12"], 3, True),
("Koliko je 5! (pet faktorijela)?", ["25", "60", "120", "720"], 2, True),
("Koji je jedini paran prost broj?", ["2", "4", "6", "8"], 0, True),
("Kako se zove dužina koja spaja središte kruga s točkom na kružnici?", ["Promjer", "Tetiva", "Tangenta", "Polumjer"], 3),
("Koliko minuta ima jedan dan?", ["960", "1200", "1360", "1440"], 3, True),
("Koliko stupnjeva ima pravi kut?", ["45°", "90°", "180°", "360°"], 1, True),
("Kako se zove broj koji se zapisuje kao jedinica i 100 nula iza nje?", ["Gugol", "Milijarda", "Bilijun", "Beskonačno"], 0),
("Kako se zove najdulja stranica pravokutnog trokuta?", ["Kateta", "Visina", "Hipotenuza", "Težišnica"], 2),
("Koji je starogrčki matematičar dao ime poučku a² + b² = c²?", ["Pitagora", "Euklid", "Arhimed", "Tales"], 0),
("Koliko nula ima jedna milijarda?", ["6", "7", "8", "9"], 3, True),
("Koliko je jedna četvrtina izražena u postocima?", ["25 %", "20 %", "40 %", "75 %"], 0),
("Koliko je 3 na treću potenciju?", ["9", "12", "18", "27"], 3, True),
("Koliki je zbroj točkica na suprotnim stranama standardne kocke za igru?", ["6", "7", "8", "12"], 1, True),
("U kojoj su zemlji izvorno nastale brojke koje zovemo arapskima?", ["Arabiji", "Grčkoj", "Egiptu", "Indiji"], 3),
],
"Znanost": [
("Koja je mjerna jedinica za električni otpor?", ["Volt", "Amper", "Vat", "Om"], 3),
("Tko je formulirao zakon opće gravitacije?", ["Galileo Galilei", "Isaac Newton", "Albert Einstein", "Johannes Kepler"], 1),
("Koji je hrvatski znanstvenik otkrio granicu između Zemljine kore i plašta?", ["Ruđer Bošković", "Nikola Tesla", "Andrija Mohorovičić", "Faust Vrančić"], 2),
("Kolika je približno apsolutna nula u Celzijevim stupnjevima?", ["−100 °C", "−173 °C", "−273 °C", "−373 °C"], 2, True),
("Tko je autor poznate formule E = mc²?", ["Albert Einstein", "Niels Bohr", "Max Planck", "Isaac Newton"], 0),
("Što mjeri Richterova ljestvica?", ["Brzinu vjetra", "Jačinu potresa", "Tlak zraka", "Kiselost tla"], 1),
("Koja se stanična organela naziva „elektranom stanice“?", ["Ribosom", "Jezgra", "Kloroplast", "Mitohondrij"], 3),
("Tko je 1928. otkrio penicilin?", ["Alexander Fleming", "Louis Pasteur", "Robert Koch", "Edward Jenner"], 0),
("Kojim se instrumentom mjeri tlak zraka?", ["Termometrom", "Barometrom", "Higrometrom", "Anemometrom"], 1),
("Koji je hrvatski znanstvenik 1939. dobio Nobelovu nagradu za kemiju?", ["Vladimir Prelog", "Ruđer Bošković", "Lavoslav Ružička", "Andrija Štampar"], 2),
],
}

out = {"cats": {}}
for cat, qs in D.items():
    lst = []
    for t in qs:
        q, o, a = t[0], list(t[1]), t[2]
        lst.append({"q": q, "o": o, "a": a, "fixed": len(t) > 3 and t[3]})
    n = len(lst); cnt = [0]*4
    for x in lst:
        if x["fixed"]: cnt[x["a"]] += 1
    for x in lst:
        if x["fixed"]: continue
        tgt = min(range(4), key=lambda i: (cnt[i], 0 if i == x["a"] else 1, i))
        o = x["o"]; o[x["a"]], o[tgt] = o[tgt], o[x["a"]]; x["a"] = tgt; cnt[tgt] += 1
    for x in lst: del x["fixed"]
    out["cats"][cat] = lst
json.dump(out, open("/root/mozgalica/content/a.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
