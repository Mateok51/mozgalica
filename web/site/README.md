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
- Pitanja su u objektu `DATA` u `index.html`.
