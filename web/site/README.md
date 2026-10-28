# Trivia Tavern

Party kviz za 2–6 igrača. TV prikazuje igru, a svi igraju s mobitela: biraju lika, glasaju za kategoriju,
šalju moći protivnicima (led, sluz, grickalice, bomba), rješavaju izazove i utrkuju se do vrha piramide.

**Igraj:** https://mateok51.github.io/mozgalica/

## Kako igrati
1. Na TV-u (ili računalu) u pregledniku otvori adresu i odaberi **Otvori igru na TV-u**.
2. Igrači skeniraju QR kod mobitelom (ili otvore adresu i upišu kod sobe). Prijava ni instalacija nisu potrebne.
3. Domaćin pritisne **Započni igru**.

Nema TV preglednika? Otvori **Otvori igru na TV-u** na jednom mobitelu i zrcali ga na TV.

## Instalacija na mobitel
Chrome → izbornik ⋮ → **Dodaj na početni zaslon** (ili gumb *Instaliraj kao aplikaciju* na početnom ekranu igre).

## Tehnički
- Statička stranica (`index.html` i `engine.js`), bez poslužitelja. Igru vodi uređaj domaćina.
- Uređaji se spajaju izravno (WebRTC) preko [PeerJS](https://peerjs.com) i njegovog besplatnog javnog posrednika.
- Rezervni put kad izravni WebRTC ne uspije: javni MQTT posrednici, ali sve poruke su šifrirane (AES-GCM) tajnim ključem sobe. Ključ putuje samo u QR kodu i poveznici (`#KOD-ključ`); posrednik vidi samo šifrirani sadržaj i temu izvedenu iz ključa. Igrači koji kod upišu ručno nemaju ključ i koriste samo izravnu vezu. Detalji: [povezivanje](docs/povezivanje.md).
- Pitanja su u objektu `DATA` u `engine.js`; ondje se nalaze i pravila igre.

## Oporavak veze i partije
- Mobitel nakon ponovnog povezivanja šalje spremljeni odgovor; odgovor za završeno pitanje se odbija.
- Domaćin u istoj kartici automatski pokušava obnoviti partiju nakon osvježavanja. Zapis ostaje lokalno i briše se nakon završetka ili odustajanja. Ako pohrana preglednika nije dostupna, obnova možda neće biti moguća.
- Detalji i provjere: [obnova partije](docs/obnova-partije.md).

## Razvoj i provjera
Automatske provjere pokreni naredbom `node --test tests/*.test.cjs` (Node.js 22 ili noviji). Pokreću se i na GitHubu pri svakoj promjeni. Nakon izmjene ugrađenog JavaScripta pokreni `python3 scripts/update-csp.py`, a zatim ponovi testove: sigurnosna politika inače može blokirati pokretanje igre.
