# Smjernice za rad na Trivia Tavernu

Prije izmjena provjeri stanje repozitorija i korisnikove najnovije upute; izričite upute imaju prednost. Ne zamjenjuj noviju verziju starim lokalnim izmjenama.

## Igra i prikaz

- Piramida ostaje završnica. Različiti bodovi daju različite početne stepenice, jednaki isti položaj. Jedan točan odgovor = jedna stepenica, dupli = dvije, netočno = bez pomaka; bez skrivenih pomaka za brzinu ili niz. Cijela mora biti vidljiva na mobitelu.
- Korisnik je odustao od 3D likova. Zadrži 2D likove i vizualni identitet; ne generiraj nove ilustracije bez novog zahtjeva. Ne rastezi ni ne deformiraj cijele slike za disanje ili animaciju; koristi postojeće poze i zasebne efekte oko lika.
- Cijela stranica tijekom igre stane na ekran bez skrolanja, uz sigurne rubove i kontrole zvuka. Skrolanje unutar elementa dopušteno je samo ako bi sadržaj inače zauzeo previše prostora (npr. dug popis igrača); važne kontrole ostaju vidljive.
- Jednaki ponavljajući elementi zadržavaju jednaku veličinu između ekrana; prilagodba sadržaja ne smije nepotrebno smanjiti cijeli prikaz. Manjak visine rješavaj sabijanjem razmaka, ne smanjivanjem cijelog ekrana ni fonta.
- Provjeri čitljivost dugih naziva, dodirne površine i dostupnost svih igrača i kontrola. Ne skrivaj važne informacije zbog manjka prostora.
- Posebno provjeri prijelaze pitanja, isteka vremena, otkrivanja odgovora i bodova, uključujući slučaj kad igrač nije odgovorio. Bez trzanja, neočekivanog smanjivanja i dvostrukog prikaza likova. Poštuj smanjeno kretanje.
- Izgled mora biti dobar u pregledniku na iPhoneu, Samsungu i Xiaomiju. Vidljiva visina (adresna traka oduzima prostor): oko 664 px iPhone 13–15 Safari, 668 px Samsung Chrome, 740 px Xiaomi, 553 px iPhone SE. Za promjene prikaza provjeri te veličine (`tests/browser-phones.cjs`, na CI-ju i u WebKitu). Simbole koji su i emoji (▶ ◀ ✔ ⬆ ✖) piši s U+FE0E; fontove deklariraj po pojedinačnim debljinama (`tests/phones.test.cjs`).
- Upute su kratke i jasne same po sebi: najviše tri kratka retka po mini igri, opis moći u jednom retku, iz kuta igrača (što radim i što dobivam). Kraćenje ne smije izbaciti posljedicu koju igrač mora znati (izdaja u paktu, trajanje bombe), uvjet aktivacije, trajanje ni posljedicu odluke. Svaka odluka mora imati dovoljno vremena da je netko tko igra prvi put pročita i odabere (oko 2 riječi u sekundi plus vrijeme za odluku); faze završavaju čim svi odaberu, pa je dulji rok jeftin. Čuva `tests/clarity.test.cjs`. Pri isteku vremena priznaje se primljeni djelomični napredak u razvrstavanju, spajanju, poretku i nizu.
- Kad igru vodi TV, pitanje je samo na TV-u, a mobiteli pokazuju ponuđene odgovore (opcija „Pitanje samo na TV-u”, zadano uključena). Odlučuje samo domaćin na TV-u; igrači je ne mogu mijenjati, a u igri koju vodi mobitel opcije nema. TV pokazuje tko je odgovorio i na koga se čeka, bez otkrivanja ičijeg odgovora.

## Sigurnost i pouzdanost

- Pri izmjenama povezivanja, pohrane i razmjene podataka provjeri zaštitu podataka, provjeru ulaza i ponašanje pri prekidu veze. Ne uvodi i ne objavljuj tajne ni vjerodajnice u repozitorij.
- Ne dodavaj domaćinovo prihvaćanje ili izbacivanje igrača kao uvjet pridruživanja: dijeljenje koda već podrazumijeva da domaćin zna koga poziva. Ostale sigurnosne mjere razmatraj neovisno.

## Način rada

- Kad korisnik odobri cjelinu posla, odradi korake samostalno i riješi probleme na koje naiđeš; ne traži potvrdu za svaki mali korak.
- Veće zadatke razdijeli na neovisne dijelove (podagenti ako su dostupni) i na kraju provjeri rezultat kao cjelinu.
- Nakon završene cjeline sažeto navedi što je promijenjeno, kako je provjereno i što predlažeš dalje. Jasno razlikuj automatske provjere od provjere na stvarnom uređaju.
- Prije objave provjeri korisnikove upute i stanje udaljene grane. Ne objavljuj kad korisnik kaže da se promjene zasad ne objavljuju.
- Korisnik je trajno dopustio samostalno spajanje u `main` (otvori PR i spoji ga) kad je CI zelen na zadnjem commitu, bez sukoba i otvorenih komentara. Crven CI nikad ne zaobilazi. Spajanje u `main` je produkcijska objava (GitHub Pages i Cloudflare objavljuju automatski); postupak i provjere vidi u `CLAUDE.md`.
- Sitne izmjene grupiraj: skupljaj ih na jednoj grani i otvori jedan PR kad se nakupi smislena cjelina ili kad korisnik traži objavu. Tijekom rada pokreći samo testove vezane uz izmjenu, a cijeli skup jednom prije PR-a. Svako spajanje je produkcijska objava i pun CI, pa ne otvaraj PR za svaku sitnicu. Iznimka su hitni ispravci grešaka koje pogađaju igrače.
- Ako korisnik izrazi novu trajnu preferenciju za projekt, ažuriraj ove smjernice u skladu s time, konkretno i bez privremenih pravila.

## Provjera

- Pokreni provjere primjerene izmjeni. Za promjene prikaza provjeri različite veličine ekrana, prijelaze i prelijevanje; testovi ne pokrivaju sve faze ni stvarne uređaje.
- JavaScript drži u zasebnim datotekama (`app.js`, `engine.js`, `sw-register.js`); ugrađene skripte nisu dopuštene (`script-src 'self'`, provjerava `tests/csp.test.cjs`).
- Nove datoteke koje stranica treba dodaj u `sw.js`: u `CORE` ako su nužne za pokretanje, inače u `EXTRA` (provjerava `tests/offline.test.cjs`). Podigni verziju u `sw.js` i oznaku `home-ver` u `app.js` (`tests/version.test.cjs`).
