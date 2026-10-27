# Each entry: (question, correct, [wrong1, wrong2, wrong3]); correct is placed at rotating index.
import json, sys

C = {}
C["More i oceani"] = [
("Kako se zove najdublje poznato mjesto u svjetskim oceanima?", "Marijanska brazda", ["Portorikanska brazda", "Tongaška brazda", "Javanska brazda"]),
("Koliko ukupno krakova (zajedno s dvije lovke) ima lignja?", "10", ["8", "6", "12"]),
("Približno koliko je dubok Jadran na svom najdubljem mjestu?", "Oko 1200 m", ["Oko 300 m", "Oko 3000 m", "Oko 5000 m"]),
("Koji tjesnac povezuje Jadransko i Jonsko more?", "Otrantska vrata", ["Gibraltarska vrata", "Bospor", "Mesinski tjesnac"]),
("Koja je najveća riba na svijetu?", "Kitopsina", ["Bijela psina", "Golema psina", "Sunčanica"]),
("Koji je najmanji ocean na svijetu?", "Sjeverni ledeni ocean", ["Indijski ocean", "Južni ocean", "Atlantski ocean"]),
("Uz obalu koje se države nalazi Veliki koraljni greben?", "Australije", ["Indonezije", "Filipina", "Novog Zelanda"]),
("Plemenita periska, najveća školjka Sredozemlja, pripada kojoj skupini?", "Školjkašima", ["Puževima", "Rakovima", "Bodljikašima"]),
("Kojoj skupini životinja pripada morska zvijezda?", "Bodljikašima", ["Mekušcima", "Ribama", "Žarnjacima"]),
("Kako se zove hladan i mahovit sjeveroistočni vjetar na Jadranu?", "Bura", ["Jugo", "Maestral", "Lebić"]),
("Koja je vrsta dupina najčešća u Jadranu?", "Dobri dupin", ["Prugasti dupin", "Glavati dupin", "Obični dupin"]),
("Sredozemna medvjedica, rijetko viđena u Jadranu, vrsta je koje životinje?", "Tuljana", ["Morskog psa", "Dupina", "Kornjače"]),
("Koje je more poznato po tome što nema kopnenu obalu?", "Sargaško more", ["Karipsko more", "Crveno more", "Baltičko more"]),
("Otprilike koliki dio Zemljine površine prekriva voda mora i oceana?", "Oko 71 %", ["Oko 51 %", "Oko 61 %", "Oko 81 %"]),
("Koja je morska kornjača najčešća u Jadranu?", "Glavata želva", ["Zelena želva", "Sedmopruga usminjača", "Karetna želva"]),
("Koje nebesko tijelo najviše utječe na plimu i oseku?", "Mjesec", ["Sunce", "Mars", "Jupiter"]),
("Koja se riba u opasnosti napuhne poput kugle?", "Napuhača", ["Iglica", "Raža", "Murina"]),
("Kako se hobotnica najčešće brani kad bježi od napadača?", "Ispušta crnilo", ["Pušta električni udar", "Napuhuje se", "Izbacuje bodlje"]),
("Koja riba iz Jadrana može napadača omamiti električnim udarom?", "Drhtulja", ["Šnjur", "Kirnja", "Ugor"]),
("Kod koje morske životinje mužjak nosi jaja i „rađa“ mlade?", "Morskog konjica", ["Hobotnice", "Murine", "Raka samca"]),
]
C["Biljke i priroda"] = [
("Kako se zove zeleni pigment u listovima biljaka?", "Klorofil", ["Hemoglobin", "Melanin", "Karoten"]),
("Koji dio biljke upija vodu i hranjive tvari iz tla?", "Korijen", ["List", "Cvijet", "Plod"]),
("Koji se cvijet najčešće povezuje s Nizozemskom i njezinim poljima?", "Tulipan", ["Ruža", "Orhideja", "Ljiljan"]),
("Koja se biljka okreće prema Suncu, a iz sjemenki joj se dobiva ulje?", "Suncokret", ["Maslačak", "Kamilica", "Neven"]),
("Koje drvo daje žir?", "Hrast", ["Bukva", "Bor", "Lipa"]),
("Kako zovemo drveće koje tijekom cijele godine zadržava lišće?", "Zimzeleno", ["Listopadno", "Jednogodišnje", "Mesojedno"]),
("Koja je od ovih biljaka mesožderka?", "Venerina muholovka", ["Paprat", "Bršljan", "Mahovina"]),
("Koja se biljka smatra neslužbenim nacionalnim cvijetom Hrvatske?", "Hrvatska perunika", ["Lavanda", "Ruža", "Ljubičica"]),
("Koja endemska biljka u divljini raste samo na Velebitu?", "Velebitska degenija", ["Runolist", "Lavanda", "Mažuran"]),
("Koja je biljka poznata kao najbrže rastuća na svijetu?", "Bambus", ["Hrast", "Kaktus", "Bršljan"]),
("Kako se zove znanost o biljkama?", "Botanika", ["Zoologija", "Geologija", "Ekologija"]),
("Kojem carstvu živih bića pripadaju gljive?", "Zasebnom carstvu gljiva", ["Biljkama", "Životinjama", "Bakterijama"]),
("Koji dio cvijeta proizvodi pelud?", "Prašnici", ["Tučak", "Latice", "Čašica"]),
("Od kore kojeg se drveta dobiva pluto?", "Hrasta plutnjaka", ["Bora", "Bukve", "Breze"]),
("Što su zapravo bodlje kaktusa?", "Preobraženi listovi", ["Preobraženo korijenje", "Osušeni cvjetovi", "Komadići kore"]),
("Kako se zove najpoznatiji slap u Nacionalnom parku Krka?", "Skradinski buk", ["Veliki slap", "Gubavica", "Slap Kozjak"]),
("Kako se zove pojas crnogoričnih šuma u hladnim sjevernim krajevima?", "Tajga", ["Tundra", "Savana", "Prašuma"]),
("Koji je hrvatski otok osobito poznat po poljima lavande?", "Hvar", ["Krk", "Lošinj", "Pag"]),
("Što se broji kako bi se odredila starost posječenog stabla?", "Godovi", ["Grane", "Listovi", "Korijenje"]),
("Koja biljka peče kožu kad je dodirnemo?", "Kopriva", ["Kamilica", "Djetelina", "Maslačak"]),
]
C["Rekordi i superlativi"] = [
("Koja je najveća pustinja na svijetu ako se računaju i hladne pustinje?", "Antarktika", ["Sahara", "Gobi", "Kalahari"]),
("Koji je najveći otok na svijetu?", "Grenland", ["Nova Gvineja", "Borneo", "Madagaskar"]),
("Koje je jezero najveće na svijetu po površini?", "Kaspijsko jezero", ["Gornje jezero", "Viktorijino jezero", "Bajkalsko jezero"]),
("Koje je jezero najdublje na svijetu?", "Bajkalsko jezero", ["Tanganjika", "Kaspijsko jezero", "Gornje jezero"]),
("Koji je najviši vodopad na svijetu?", "Anđeoski slap", ["Nijagarini slapovi", "Viktorijini slapovi", "Slapovi Iguazú"]),
("Koja rijeka nosi najviše vode, tj. ima najveći protok na svijetu?", "Amazona", ["Nil", "Kongo", "Jangce"]),
("Koji je kontinent najveći po površini?", "Azija", ["Afrika", "Sjeverna Amerika", "Antarktika"]),
("Koja je najmanja država na svijetu?", "Vatikan", ["Monako", "San Marino", "Lihtenštajn"]),
("Koja je afrička država najveća po površini?", "Alžir", ["Egipat", "Nigerija", "Etiopija"]),
("Koji je najviši vrh Afrike?", "Kilimandžaro", ["Kenija", "Atlas", "Ruwenzori"]),
("Koji je najviši vrh Južne Amerike?", "Aconcagua", ["Chimborazo", "Huascarán", "Cotopaxi"]),
("Koja vrsta drveća doseže najveću visinu na svijetu?", "Obalna sekvoja", ["Eukaliptus", "Baobab", "Cedar"]),
("Koja je najviša životinja na svijetu?", "Žirafa", ["Slon", "Noj", "Deva"]),
("Koji je najveći mjesec u Sunčevu sustavu?", "Ganimed", ["Titan", "Europa", "Io"]),
("Koja je zvijezda najbliža Zemlji?", "Sunce", ["Proxima Centauri", "Sirius", "Sjevernjača"]),
("Koji je najveći poluotok na svijetu?", "Arapski poluotok", ["Pirenejski poluotok", "Indokina", "Skandinavski poluotok"]),
("Koji je najtvrđi prirodni mineral?", "Dijamant", ["Kvarc", "Rubin", "Granit"]),
("Koje je najveće prirodno jezero u Hrvatskoj?", "Vransko jezero", ["Prokošćansko jezero", "Jezero Kozjak", "Peruća"]),
("Koji je najdulji planinski lanac na kopnu?", "Ande", ["Himalaja", "Stjenjak", "Alpe"]),
("Koji je najveći organ ljudskog tijela?", "Koža", ["Jetra", "Pluća", "Mozak"]),
]
C["Izumi i otkrića"] = [
("Tko je 1876. patentirao telefon?", "Alexander Graham Bell", ["Thomas Edison", "Guglielmo Marconi", "Samuel Morse"]),
("Tko je 1928. otkrio penicilin?", "Alexander Fleming", ["Louis Pasteur", "Robert Koch", "Edward Jenner"]),
("Tko je u Europi izumio tisak s pomičnim slovima?", "Johannes Gutenberg", ["Leonardo da Vinci", "Galileo Galilei", "Martin Luther"]),
("Tko je autor teorije relativnosti?", "Albert Einstein", ["Isaac Newton", "Niels Bohr", "Max Planck"]),
("Koja su braća 1903. izvela prvi let motornim zrakoplovom?", "Braća Wright", ["Braća Lumière", "Braća Montgolfier", "Braća Grimm"]),
("Tko je otkrio kemijske elemente polonij i radij?", "Marie i Pierre Curie", ["Dmitrij Mendeljejev", "Ernest Rutherford", "Alfred Nobel"]),
("Tko je razvio prvo cjepivo protiv bjesnoće?", "Louis Pasteur", ["Alexander Fleming", "Edward Jenner", "Robert Koch"]),
("Tko je 1877. izumio fonograf, uređaj za snimanje zvuka?", "Thomas Edison", ["Nikola Tesla", "Alexander Graham Bell", "James Watt"]),
("Nikola Tesla poznat je po razvoju sustava koje vrste struje?", "Izmjenične struje", ["Istosmjerne struje", "Statičkog elektriciteta", "Nuklearne energije"]),
("Koji je znanstvenik postavio zakon opće gravitacije?", "Isaac Newton", ["Galileo Galilei", "Johannes Kepler", "Albert Einstein"]),
("Koji su znanstvenici 1953. opisali dvostruku uzvojnicu DNK?", "Watson i Crick", ["Curie i Curie", "Darwin i Wallace", "Bohr i Planck"]),
("Tko je predložio da se Zemlja okreće oko Sunca, a ne obrnuto?", "Nikola Kopernik", ["Klaudije Ptolemej", "Aristotel", "Tycho Brahe"]),
("Tko je 1610. otkrio četiri najveća Jupiterova mjeseca?", "Galileo Galilei", ["Nikola Kopernik", "Isaac Newton", "Johannes Kepler"]),
("Tko je izumio dinamit?", "Alfred Nobel", ["Thomas Edison", "James Watt", "Nikola Tesla"]),
("Tko je izumio World Wide Web?", "Tim Berners-Lee", ["Bill Gates", "Steve Jobs", "Mark Zuckerberg"]),
("Tko je osmislio periodni sustav kemijskih elemenata?", "Dmitrij Mendeljejev", ["Antoine Lavoisier", "John Dalton", "Marie Curie"]),
("Koji je znanstvenik rođen u Vukovaru dobio Nobelovu nagradu za kemiju 1939.?", "Lavoslav Ružička", ["Vladimir Prelog", "Ruđer Bošković", "Andrija Mohorovičić"]),
("Hrvat Ivan Vučetić u Argentini je razvio identifikaciju pomoću čega?", "Otisaka prstiju", ["Uzoraka DNK", "Fotografija lica", "Rukopisa"]),
("Koji je starogrčki znanstvenik uzviknuo „Heureka!“ otkrivši zakon uzgona?", "Arhimed", ["Pitagora", "Euklid", "Aristotel"]),
("U kojem je gradu razvijen prvi samohodni torpedo?", "Rijeci", ["Puli", "Splitu", "Trstu"]),
]
C["Životinje"] = [
("Koji je najveći kopneni sisavac?", "Afrički slon", ["Nosorog", "Vodenkonj", "Žirafa"]),
("Koja životinja danju spava viseći naglavačke?", "Šišmiš", ["Sova", "Lenjivac", "Vjeverica"]),
("Koja ptica ima najveći raspon krila?", "Lutajući albatros", ["Kondor", "Suri orao", "Pelikan"]),
("Koji sisavac nese jaja?", "Čudnovati kljunaš", ["Klokan", "Koala", "Vombat"]),
("Čime se gotovo isključivo hrani koala?", "Lišćem eukaliptusa", ["Bambusom", "Kukcima", "Travom"]),
("Kako se zove deva s dvije grbe?", "Baktrijska deva", ["Dromedar", "Lama", "Alpaka"]),
("Koji gušter mijenja boju kože?", "Kameleon", ["Gekon", "Iguana", "Varan"]),
("Koja je ptica najbrža u obrušavanju?", "Sokol selac", ["Suri orao", "Lastavica", "Albatros"]),
("Koja je pasmina psa s točkicama dobila ime po hrvatskoj regiji?", "Dalmatinac", ["Bigl", "Doberman", "Pudl"]),
("Koja je najveća zvijer (mesojed) u hrvatskim šumama?", "Smeđi medvjed", ["Vuk", "Ris", "Divlja svinja"]),
]
C["Hrana i piće"] = [
("Iz koje zemlje potječe gulaš?", "Mađarska", ["Austrija", "Češka", "Poljska"]),
("Od čega se pravi tofu?", "Od soje", ["Od riže", "Od slanutka", "Od kukuruza"]),
("Od kojeg se voća radi zadarski liker maraschino?", "Od višnje maraske", ["Od šljive", "Od smokve", "Od limuna"]),
("S kojim se nadjevom tradicionalno rade zagorski štrukli?", "Sa svježim sirom", ["S mljevenim mesom", "S jabukama", "S makom"]),
("Koji je glavni sastojak pesta alla genovese?", "Bosiljak", ["Peršin", "Špinat", "Rukola"]),
("Koja se žitarica najčešće koristi za proizvodnju piva?", "Ječam", ["Kukuruz", "Riža", "Zob"]),
("Što je wasabi?", "Japanski hren", ["Morska alga", "Sojin umak", "Ukiseljeni đumbir"]),
("Kako se zove talijanski desert s kavom, piškotama i mascarponeom?", "Tiramisu", ["Panna cotta", "Cannoli", "Gelato"]),
("Od kojeg se mesa tradicionalno priprema bečki odrezak?", "Od teletine", ["Od svinjetine", "Od piletine", "Od janjetine"]),
("Po uzgoju kojih je školjaka poznat Malostonski zaljev?", "Kamenica", ["Jakovljevih kapica", "Kunjki", "Prstaca"]),
]
C["Općenito"] = [
("Koliko minuta ima jedan dan?", "1440", ["1240", "1400", "1640"]),
("Koliko ploha ima kocka?", "6", ["4", "8", "12"]),
("Koju godinu označava rimski zapis MMXX?", "2020.", ["2010.", "1020.", "2200."]),
("Koliko nula ima broj milijun?", "6", ["5", "7", "9"]),
("Koliko stupnjeva ima pravi kut?", "90", ["45", "180", "360"]),
("Koliko polja ima šahovska ploča?", "64", ["48", "81", "100"]),
("Koja boja nastaje miješanjem plave i žute?", "Zelena", ["Ljubičasta", "Narančasta", "Smeđa"]),
("Kako se naziva 25. godišnjica braka?", "Srebrni pir", ["Zlatni pir", "Dijamantni pir", "Biserni pir"]),
("Koji je najveći prosti broj manji od 20?", "19", ["17", "18", "15"]),
("Koliko slova ima hrvatska abeceda?", "30", ["26", "28", "32"]),
]

out = {"cats": {}}
k = 0
for cat, items in C.items():
    lst = []
    for q, corr, wrong in items:
        pos = (k * 3 + k // 4) % 4  # rotating, non-trivial pattern
        k += 1
        opts = list(wrong)
        opts.insert(pos, corr)
        lst.append({"q": q, "o": opts, "a": pos})
    out["cats"][cat] = lst
json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
