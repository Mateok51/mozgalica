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
- Jedna statična stranica (`index.html`), bez poslužitelja. Igru vodi uređaj domaćina.
- Uređaji se spajaju izravno (WebRTC) preko [PeerJS](https://peerjs.com) i njegovog besplatnog javnog posrednika.
- Rezervno povezivanje preko javnih MQTT posrednika isključeno je jer izlaže podatke i ključ igrača. Izravni WebRTC zbog mrežnih ograničenja možda neće raditi na svim mrežama; za pouzdan rezervni put potreban je siguran posrednik.
- Pitanja su u objektu `DATA` u `index.html`.

## Oporavak veze i partije
- Mobitel nakon ponovnog povezivanja šalje spremljeni odgovor; odgovor za završeno pitanje se odbija.
- Domaćin u istoj kartici automatski pokušava obnoviti partiju nakon osvježavanja. Zapis ostaje lokalno i briše se nakon završetka ili odustajanja. Ako pohrana preglednika nije dostupna, obnova možda neće biti moguća.
- Detalji i provjere: [obnova partije](docs/obnova-partije.md).
