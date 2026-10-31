# Smjernice za rad na Trivia Tavernu

Ove smjernice vrijede za cijeli projekt. Prije izmjena provjeri aktualno stanje repozitorija i korisnikove najnovije upute; njegove izričite upute imaju prednost. Ne zamjenjuj noviju verziju starim lokalnim izmjenama bez prethodne usporedbe.

## Igračko iskustvo i prikaz

- Cijela stranica tijekom igre mora stati na ekran i ne smije zahtijevati skrolanje. Uzimaj u obzir male mobitele, sigurne rubove ekrana i kontrole zvuka.
- Skrolanje unutar pojedinog elementa dopušteno je kada bi sadržaj inače zauzeo previše prostora (primjerice dug popis igrača). Ostale važne kontrole trebaju ostati vidljive i dostupne.
- Ponavljajući jednaki elementi trebaju zadržati jednaku vidljivu veličinu između ekrana. Teži i stabilnom položaju kako promjena faze ne bi izgledala kao promjena rezolucije. Prilagodba sadržaja ne smije nepotrebno smanjiti cijeli prikaz.
- Provjeri čitljivost dugih naziva i tekstova, veličinu dodirnih površina te dostupnost svih igrača i kontrola. Ne rješavaj manjak prostora skrivanjem važnih informacija.
- Posebno provjeri prijelaze pitanja, isteka vremena, otkrivanja odgovora i bodova, uključujući slučaj kad igrač nije odgovorio. Izbjegavaj trzanje, neočekivano smanjivanje i dvostruki prikaz likova.
- Animacije trebaju biti dosljedne i jasne, bez ometanja igranja; poštuj postavku smanjenog kretanja.

## Sigurnost i pouzdanost

- Sigurnost korisnika važan je uvjet. Pri izmjenama povezivanja, pohrane i razmjene podataka provjeri zaštitu podataka, provjeru ulaza i ponašanje pri prekidu veze. Ne uvodi ili objavljuj tajne i vjerodajnice u repozitorij.
- Nemoj dodavati domaćinovo prihvaćanje ili izbacivanje igrača kao preduvjet pridruživanja: korisnik je rekao da dijeljenje koda već podrazumijeva da domaćin zna koga poziva. Druge sigurnosne mjere razmatraj neovisno o tome.

## Način rada

- Kad korisnik odobri cjelinu posla, odradi potrebne korake samostalno i riješi probleme na koje naiđeš; ne traži potvrdu za svaki mali korak.
- Kod većih zadataka koristi podagente, ako su dostupni, za neovisne manje cjeline; uskladi njihove izmjene i provjeri rezultat kao cjelinu.
- Nakon dovršene cjeline sažeto navedi što je promijenjeno, kako je provjereno i što predlažeš dalje. Jasno razlikuj automatizirane provjere od provjere na stvarnom uređaju.
- Prije objave na GitHub provjeri aktualne korisnikove upute i stanje udaljene grane. Nemoj objavljivati kad je korisnik rekao da se promjene zasad ne objavljuju.
- Ako korisnik izrazi novu trajnu preferenciju za projekt, ažuriraj ove smjernice tako da budu konkretne i u skladu s njegovim riječima. Ne pretvaraj privremene upute u trajna pravila bez osnove.

## Provjera

- Pokreni provjere primjerene izmjenama. Za promjene prikaza provjeri različite veličine ekrana, prijelaze i prelijevanje; postojanje testova ne znači da obuhvaćaju sve faze ili stvarne uređaje.
- JavaScript drži u zasebnim datotekama (`app.js`, `engine.js`, `sw-register.js`); ugrađene skripte nisu dopuštene jer politika glasi `script-src 'self'` (provjerava `tests/csp.test.cjs`). Nove datoteke koje stranica treba dodaj i u `CORE` popis u `sw.js` te podigni verziju predmemorije.
