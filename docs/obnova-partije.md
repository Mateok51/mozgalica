# Obnova partije nakon osvježavanja

Domaćin sada sprema zapis partije u `sessionStorage` iste kartice. Zapis sadrži početno sjeme slučajnih izbora, radnje igrača i domaćina te izvedene vremenske događaje. Motor pri obnovi ponovi zapis bez slanja međustanja uređajima, čime obnavlja i unutarnje podatke, botove i zakazane radnje. Propušteno vrijeme dok je stranica bila ugašena ne troši vrijeme pitanja.

Nakon osvježavanja stranica pokušava preuzeti isti kod sobe i obnavlja ključeve postojećih igrača. Kod zauzet nakon više pokušaja ne zamjenjuje se drugim kodom. Neuspjela obnova prikazuje poruku; korisnik može odustati i otvoriti novu sobu. Zapis se uklanja nakon završetka partije ili povratka na početni ekran i vrijedi za automatsku obnovu najviše šest sati.

Podaci ostaju na domaćinovu uređaju. Sadrže imena, radnje i ključeve za povratak postojećih igrača; ne šalju se javnom MQTT posredniku. `sessionStorage` je vezan uz karticu; zatvaranje kartice ili brisanje podataka preglednika može ukloniti zapis. Ako pohrana nije dostupna ili je puna, živa igra nastavlja raditi, ali obnova nije zajamčena. Upozorenje prije napuštanja aktivne partije ostaje uključeno.

Za testove motora pokrenuti `node tests/recovery.test.cjs`. Test simulira cijelu partiju s botovima, više puta obnavlja zapis te uspoređuje prikaz i unutarnje stanje Tavern Directora. `node tests/browser-recovery.cjs` provjerava osvježavanje aktivne partije u Chromiumu uz simuliranu PeerJS signalizaciju (zahtijeva Playwright i Chromium). Taj test ne potvrđuje dostupnost vanjskih poslužitelja ni ponašanje stvarnih mobilnih mreža.

Format zapisa je verzioniran; izmjene ponašanja motora koje nisu kompatibilne s ponavljanjem postojećeg zapisa zahtijevaju novu verziju formata.
