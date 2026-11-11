# Trivia Tavern

Party kviz za 2–6 igrača. TV prikazuje igru, a svi igraju s mobitela: biraju lika, glasaju za kategoriju,
šalju moći protivnicima (led, sluz, grickalice, bomba), rješavaju izazove i utrkuju se do vrha piramide.

**Igraj:** https://mateok51.github.io/mozgalica/

## Kako igrati
1. Na TV-u (ili računalu) u pregledniku otvori adresu i odaberi **Otvori igru na TV-u**.
2. Igrači skeniraju QR kod mobitelom (ili otvore adresu i upišu kod sobe). Prijava ni instalacija nisu potrebne.
3. Domaćin pritisne **Započni igru**.

Nema TV preglednika? Otvori **Otvori igru na TV-u** na jednom mobitelu i zrcali ga na TV.

Kad igru vodi TV, pitanje se prikazuje samo na TV-u, a na mobitelima su ponuđeni odgovori, pa svi gledaju u isti ekran. Domaćin to može isključiti u „Postavke igre” na TV-u (npr. kad netko ne vidi ekran). U igri koju vodi mobitel pitanje je uvijek i na mobitelima.

## Instalacija na mobitel
Chrome → izbornik ⋮ → **Dodaj na početni zaslon** (ili gumb *Instaliraj kao aplikaciju* na početnom ekranu igre).

## Tehnički
- Statička stranica bez poslužitelja: `index.html` (kostur), `styles.css`, `app.js` (sučelje i povezivanje), `engine.js` (pravila) i `sw-register.js`. Nema ugrađenih skripti, pa sigurnosna politika dopušta samo `script-src 'self'`. Fontovi (Cinzel i Nunito, SIL OFL) su u mapi `fonts/`, pa stranica ne šalje zahtjeve prema Google Fontsu. Igru vodi uređaj domaćina.
- Uređaji se spajaju izravno (WebRTC) preko [PeerJS](https://peerjs.com) (lokalna kopija u `vendor/`) i njegovog besplatnog javnog posrednika.
- Rezervni put kad izravni WebRTC ne uspije: javni MQTT posrednici, ali sve poruke su šifrirane (AES-GCM) tajnim ključem sobe. Ključ putuje samo u QR kodu i poveznici (`#KOD-ključ`); posrednik vidi samo šifrirani sadržaj i temu izvedenu iz ključa. Igrači koji kod upišu ručno nemaju ključ i koriste samo izravnu vezu. Detalji: [povezivanje](docs/povezivanje.md).
- Pravila igre su u `engine.js`, a pitanja i sadržaj mini igara u `data/questions.js` (objekt `DATA`, jedan zapis po retku). Pitanja učitava samo uređaj domaćina kad otvori sobu ili demo; igrači ih ne preuzimaju. Testovi spajaju oba dijela preko `tests/engine-source.cjs`.

## Rad bez mreže
- Service worker pri instalaciji sprema ono što je nužno za pokretanje (`CORE` u `sw.js`), a nakon učitavanja stranice u pozadini i sve likove, grafiku i zvukove (`EXTRA`, oko 6,7 MB). Nakon toga demo protiv botova radi i bez interneta; za igru s drugima i dalje treba mreža.
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
