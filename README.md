# Trivia Tavern

Party kviz za 2–6 igrača. TV prikazuje igru, a svi igraju s mobitela: biraju lika, glasaju za kategoriju,
šalju moći protivnicima (led, sluz, grickalice, bomba), rješavaju izazove i utrkuju se do vrha piramide.

**Postojeća verzija:** https://mateok51.github.io/mozgalica/

**Cloudflare igra:** https://trivia-tavern.chaos-ballad.workers.dev/
`npm run build` priprema stranicu i serversku igru za Workers + SQLite Durable Objects.
U tom načinu partiju vodi server, a ne domaćinov uređaj. Koraci za besplatni račun,
GitHub povezivanje i prvu objavu: [Cloudflare postavljanje](docs/CLOUDFLARE.md).
Izvorni `runtime-config.js` zadržava stari način rada; cloud build uključuje novi.
APK v83 pakira istu igru s fiksnom Cloudflare adresom. Igrač unosi četveroslovni
kod i ime izravno u APK-u; puna poveznica/QR također rade. Nadogradnja postojećeg
APK-a zahtijeva izvorni ključ za potpisivanje (vidi [Android](android/README.md)).

## Kako igrati
1. Na TV-u (ili računalu) u pregledniku otvori adresu i odaberi **Otvori igru na TV-u**.
2. Igrači skeniraju QR kod mobitelom (ili otvore adresu i upišu kod sobe). Prijava ni instalacija nisu potrebne.
3. Domaćin pritisne **Započni igru**.

Nema TV preglednika? Otvori **Otvori igru na TV-u** na jednom mobitelu i zrcali ga na TV.

Kad igru vodi TV, pitanje se prikazuje samo na TV-u, a na mobitelima su ponuđeni odgovori, pa svi gledaju u isti ekran. Domaćin to može isključiti u „Postavke igre” na TV-u (npr. kad netko ne vidi ekran). U igri koju vodi mobitel pitanje je uvijek i na mobitelima.

## Safari pouzdanost od v85

Sluz provjerava je li njezin sloj još aktivan prije obrade poteza. Zamjena prikaza
tijekom brisanja više ne računa beskonačan broj koraka na uklonjenom elementu;
capture se čisti pri završetku, promjeni faze i odlasku u pozadinu. Nakon lokalnog
isteka pitanja nestaju slojevi koji hvataju dodire, a odgovori ostaju zaključani
do serverskog rezultata. Povratak iste faze usklađuje preostalo vrijeme i prikaz.

Mjerilo uključuje stvarno dostupnu visinu i `visualViewport`, pa se privremeno
smanjenje zbog Safari kontrola ne zadržava u istoj fazi. Fokusirani unos i pinch
ne mijenjaju trajno mjerilo. Postojeće ilustracije, CSS i pravila Piramide ostaju.

Svaki pokušaj WebSocket povezivanja ima rok i prije `onopen`. Povratak u karticu
provjerava i prividno otvorenu vezu; mrežni timeout čuva prethodno potvrđenu
sesiju, a povratak mreže nastavlja s istim ključem igrača. Stvarno odbijena ili
istekla prijava i dalje se odbacuje. Tajna pozivnice ostaje osjetljiva na veličinu
slova; normalizira se samo četveroslovni kod sobe.

Automatizirani testovi u Chromiumu i WebKitu pokrivaju sluz, viewport, QR ulazak,
prekid i povratak iste sesije bez duplikata igrača. CI pokreće i postojeće mobilne
rasporede i proširenu Piramidu. Stvarni iPhone još treba provjeriti: Camera → QR →
Safari, potez kroz sluz tijekom odgovora drugih igrača, tipkovnica/adresna traka,
rotacija te zaključavanje i otključavanje telefona. Sintetski lifecycle događaji
i WebKit na računalu nisu potvrda stvarnog iOS suspendiranja ili BFCachea.

Od v86 razvrstavanje i spajanje prate jedan prst te poništavaju gestu pri
gubitku capturea, zamjeni ploče i odlasku u pozadinu. Zaostali callback ne može
zapisati odgovor u novu ploču ili rundu. Otvaranje druge valjane pozivnice u
istoj kartici osvježava kod i tajnu sobe, uz uredno zatvaranje stare veze.

Nakon ponovnog učitavanja vraćaju se prihvaćeni djelomični odgovori u
razvrstavanju, spajanju, poretku, višem/manjem, munjevitom krugu i konopu.
Poslužitelj ih šalje privatno samo tom igraču; noviji lokalni odgovor ne
prepisuje se zakašnjelim stanjem. Potvrde napretka ne prekidaju animaciju karte.
Audio pokušava obnoviti i Safari `interrupted` kontekst, a synth preskače
propuštene note nakon pauze umjesto da ih sve rasporedi odjednom.

Nove regresije provjeravaju stvarne handlere u Chromiumu i WebKitu, uključujući
nastavak šest mini-igara s autentificiranim serverskim fixtureom. Višeprstni i
lifecycle događaji te audio sat/stanje kontrolirano su simulirani. Na fizičkom
iPhoneu još treba provjeriti povlačenje s dva prsta, zaključavanje usred geste,
povratak iz druge aplikacije i zvuk nakon prekida ili poziva.

Od v90 i dvoboj zatvara odgovore nakon lokalnog isteka vremena, uz čekanje
serverskog rezultata i mogućnost nastavka nakon autoritativne obnove iste faze.
Handleri odlazećih scena ne mogu odgovoriti na novu tvrdnju ili zaključati novo
pitanje; namjerni brzi dodiri novih kontrola i dalje rade bez dodatnog čekanja.
Neuspjelo slanje preko prividno otvorenog WebSocketa pokreće obnovu veze i
postojeće ponovno slanje odgovora za isti korak.

Otvaranje iste sesije u drugoj kartici zaustavlja automatsko ponovno povezivanje
prethodne kartice. Ona čuva zajednički zapis sesije i nudi „Nastavi ovdje” za
namjerni prijenos natrag. Za terminalnu obavijest poslužitelj koristi postojeći
protokol koji razumiju i stariji klijenti. Regresije uključuju stvarne browser
WebSockete, produkcijske metode prijave i Workers provjeru prijenosa domaćina;
jednokratna pogreška slanja kontrolirano je injektirana. Ponašanje fizičkog
iPhonea pri gubitku mreže i suspendiranju i dalje zahtijeva provjeru na uređaju.

Otvaranje nove pozivnice zatvara i prethodni dijalog vibracije bez vraćanja
fokusa na stari ekran. Uobičajeno zatvaranje dijaloga i dalje vraća fokus.
Wake Lock ima jedan zahtjev po aktivnom prikazu; odlazak iz igre i skrivanje
kartice oslobađaju zaključavanje, a zakašnjeli rezultat prethodnog zahtjeva
ne zamjenjuje novo zaključavanje. API i njegov raspored događaja simulirani su
u regresijama; stvarno uspavljivanje iPhonea nije mjereno.

Nove odluke o paktu, zadatku i izazovu vođi šalju ID prikazane ponude.
Zakašnjelo prihvaćanje druge ponude odbija se. Stariji APK protokol bez ID-a
ostaje kompatibilan i zadržava izvorno ponašanje; zaštita vezivanjem ID-a
vrijedi za ažurirane klijente. Pravila bodovanja i rokovi ponuda ostaju isti.

Potvrda uspješnog HTTP stvaranja sobe sprema se prije prve WebSocket poruke.
Reload i početni timeout nastavljaju tu istu sobu; ekran greške nudi „Pokušaj
ponovno”, a „Nova igra” izričito napušta prethodnu. Neuspjeli ili otkazani zahtjev
ne stvara zapis obnove, a odbijena autentikacija i dalje ga uklanja. Pri obnovi
TV domaćina briše se i prethodna greška kako ne bi zaklonila obnovljenu sobu.

Potpuno ista QR pozivnica potvrđenog domaćina bez TV-a u drugoj kartici čuva
njegove kontrole. Druge pozivnice zadržavaju prednost, a gosti se ne promiču.
Pravila pakta pripadaju konkretnoj ponudi i koraku: ostaju otvorena pri običnom
osvježavanju istog konteksta, a zatvaraju se na novu pozivnicu, reset i novu
fazu kako ne bi blokirala dodire. Provjere koriste stvarne browser handlere,
mrežni adapter i metode prijave; kontrolirano uskraćena početna poruka nije
mjerenje stvarnog iOS gubitka veze.

Kad pohrana nije dostupna ili nije uspjela spremiti potvrdu, otvorena kartica
može ponovno povezati potvrđenog domaćina iz vlastite memorije. Ručni retry
cilja prikazanu sobu; automatski oporavak ne preskače zapis druge sobe niti
neispravan zapis. Otkazivanje, odbijena prijava i istek ukidaju tu mogućnost.
Bez dostupne pohrane ovaj oporavak ne preživljava potpuno ponovno učitavanje.


Od v91 svaka kartica čuva svoj cilj oporavka u `sessionStorage`; zajednički
`localStorage` ostaje rezervni zapis za novu karticu i istu QR pozivnicu.
Poruka iz druge aktivne sobe zato ne preusmjerava obnovu postojeće kartice ako
preglednik ponovo stvori dokument bez završnog `pagehide` spremanja. Završetak,
odlazak i odbijena prijava jedne sobe ne brišu zajednički zapis druge sobe.
Odjava kartice ostaje zapamćena, pa je povratak mreže ne uvodi u tuđu sobu.
Kopirana kartica može obnoviti drugu sobu samo uz točno podudaranje izričite
QR pozivnice i potvrđenog zajedničkog zapisa. Ako je `sessionStorage` nedostupan,
ostaje prethodni zajednički fallback; živa kartica pamti svoj namjerni izlazak.
Kontrolirani test izostavlja `pagehide`; stvarno iOS gašenje procesa i očuvanje
pohrane ostaju za provjeru na iPhoneu.

Poslužitelj odbija i neispravnu vršnu JSON vrijednost WebSocket poruke
(`null`, broj, niz) urednom greškom i zatvara samo taj kanal. Prijavljeni
`null` ranije je izazivao neobrađeni `TypeError` u handleru; nema dokaza da je
rušio cijelu sobu. Valjane poruke i prijava starijih APK-ova ostaju kompatibilne.


Od v92 soba koju vodi mobitel čuva jedno od šest mjesta za svog domaćina i
prije njegove prve WebSocket prijave te dok je privremeno odspojen u predvorju.
Najviše pet gostiju može zauzeti ostala mjesta; TV domaćin ostaje promatrač i
zadržava šest mjesta za goste. Serverski test reproducira raniji ulazak šestog
gosta i odbijanje vlasnika kao da je soba puna, zatim provjerava povratak,
promjenu postavki i pokretanje igre nakon zakrpe.

Ako svi igrači napuste upute za Uljeza prije sigurnosnog isteka, prazna runda
preskače se bez dodjele bodova. Ranije je odabir uljeza iz praznog popisa bacao
grešku i ostavljao fazu bez daljnjeg timera. Regresije koriste javni API i
kontrolirani sat, uključujući checkpoint/replay i povratak igrača. Uspješne
runde i prethodni zapisi partija zadržavaju postojeće ponašanje.

## Piramida od v84

Piramida ima 12 stepenica do vrha i zasebno pitanje za krunu. Početni raspored je
između podnožja i 6. stepenice. Za najviše šest igrača različiti bodovi daju različite
početne stepenice, a izjednačeni bodovi isto mjesto. Poredak osigurava razmak;
udio bodova prema vodećem daje dodatnu prednost unutar početnog raspona.

Točan odgovor penje jednu stepenicu, dupli dvije, a netočan ili neodgovoren ne
pomiče igrača. Nema dodatnih pomaka za brzinu ili niz točnih odgovora. Dolazak na
vrh ne preskače pitanje za krunu; pri više točnih na vrhu ostaje postojeća prednost
bržeg odgovora. Obnovljene stare sobe zadržavaju stara pravila; nova pravila vrijede
kad se otvori nova soba.

## Instalacija na mobitel
Chrome → izbornik ⋮ → **Dodaj na početni zaslon** (ili gumb *Instaliraj kao aplikaciju* na početnom ekranu igre).

## Tehnički

Sljedeće opisuje postojeći GitHub/P2P način. Cloudflare način koristi HTTP/WebSocket
vezu prema vlastitom Workeru i serversko spremanje sobe, bez PeerJS/MQTT posrednika.

- Statička stranica bez poslužitelja: `index.html` (kostur), `styles.css`, `app.js` (sučelje i povezivanje), `engine.js` (pravila) i `sw-register.js`. Nema ugrađenih skripti, pa sigurnosna politika dopušta samo `script-src 'self'`. Fontovi (Cinzel i Nunito, SIL OFL) su u mapi `fonts/`, pa stranica ne šalje zahtjeve prema Google Fontsu. Igru vodi uređaj domaćina.
- Uređaji se spajaju izravno (WebRTC) preko [PeerJS](https://peerjs.com) (lokalna kopija u `vendor/`) i njegovog besplatnog javnog posrednika.
- Rezervni put kad izravni WebRTC ne uspije: javni MQTT posrednici, ali sve poruke su šifrirane (AES-GCM) tajnim ključem sobe. Ključ putuje samo u QR kodu i poveznici (`#KOD-ključ`); posrednik vidi samo šifrirani sadržaj i temu izvedenu iz ključa. Igrači koji kod upišu ručno nemaju ključ i koriste samo izravnu vezu. Detalji: [povezivanje](docs/povezivanje.md).
- Pravila igre su u `engine.js`, a pitanja i sadržaj mini igara u `data/questions.js` (objekt `DATA`, jedan zapis po retku). Pitanja učitava samo uređaj domaćina kad otvori sobu ili demo; igrači ih ne preuzimaju. Testovi spajaju oba dijela preko `tests/engine-source.cjs`.

## Rad bez mreže
- Service worker pri instalaciji sprema ono što je nužno za pokretanje (`CORE` u `sw.js`), a nakon učitavanja stranice u pozadini i sve likove, grafiku i zvukove (`EXTRA`, oko 6,3 MB). Pitanja (`LAZY`, 705 KB) treba samo uređaj koji vodi igru ili demo, pa se ne preuzimaju za goste; spremaju se pri prvom pokretanju demoa ili vođenja igre. Nakon toga demo protiv botova radi i bez interneta (prije toga demo traži mrežu); za igru s drugima i dalje treba mreža. Slike, zvukovi i fontovi poslužuju se iz predmemorije odmah, a tiho se osvježavaju u pozadini; kod igre uvijek ide preko mreže.
- Pozadinsko spremanje preskače se uz uključenu štednju podataka ili na vrlo sporoj vezi; tada se datoteke spremaju tek kad se prvi put prikažu.

## Poštenost
- Štit se nikad ne nudi dva puta zaredom. U piramidi vodeći (i tko je pri vrhu) ne dobiva dupli bodove, pa bi mu štit inače bio u svakoj ponudi; zato mu se nudi samo u oko 35 % ponuda (`pyrShieldTop` u `engine.js`), a ostale su bez osobne moći.
- Mobitel javlja vrijeme odgovora, ali domaćin ga prihvaća samo ako je najviše 3 s kraće od trenutka kad je odgovor stigao (`ansGrace` u `engine.js`). Lažno „0 ms” zato ne donosi puni bonus za brzinu. Posljedica: odgovor poslan nakon duljeg prekida veze vrijedi kao da je dan najviše 3 s prije ponovnog spajanja.
- Poruke s unosom veće od 4000 znakova (`inMax`) odbacuju se prije obrade; stvarni unosi imaju do nekoliko stotina znakova.

## Oporavak veze i partije
- Mobitel nakon ponovnog povezivanja šalje spremljeni odgovor; odgovor za završeno pitanje se odbija.
- Domaćin u istoj kartici automatski pokušava obnoviti partiju nakon osvježavanja. Zapis ostaje lokalno i briše se nakon završetka ili odustajanja. Ako pohrana preglednika nije dostupna, obnova možda neće biti moguća.
- Detalji i provjere: [obnova partije](docs/obnova-partije.md).

## Razvoj i provjera
Automatske provjere pokreni naredbom `node --test tests/*.test.cjs` (Node.js 22 ili noviji). Testovi prikaza u pregledniku (`tests/browser-*.cjs`) traže Playwright s Chromiumom; po potrebi postavi `CHROMIUM_PATH`. Oboje se pokreće i na GitHubu pri svakoj promjeni.
