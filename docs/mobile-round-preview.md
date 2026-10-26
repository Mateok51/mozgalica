# Mobilna runda — dorade uz izvorni vizualni identitet

Ova grana zadržava izvornu paletu, drvene ploče, pergament, tipografiju, likove i raspored igre. Raniji prijedlog redizajna uklonjen je. CSS u `index.html` jednak je onome iz početne verzije `e330708`.

Grana nije spojena u `main` niti objavljena na postojećoj adresi igre.

## Pitanje

![Mobilni ekran pitanja u izvornom stilu](previews/mobile-round-question.png)

## Rezultat

![Mobilni ekran rezultata u izvornom stilu](previews/mobile-round-result.png)

Snimke su izrađene u Chromiumu na prikazu širine 390 px, s kontroliranim testnim stanjem igre.

## Zadržane dorade

- Zvuk potvrde odgovora i pristupačna oznaka odabranog odgovora.
- Reakcija vlastitog lika nakon odgovora i ispravan prikaz likova koji nisu pod napadom.
- Imena uz likove i pravovremeno osvježavanje oznaka spremnosti ostalih igrača.
- Kratak tekst ispod rezultata: pomak na ljestvici i bodovna razlika do suparnika.

Izvorni prikaz pitanja, odgovora, moći i rezultata ostao je sačuvan. Pravila bodovanja i mrežni protokol ostali su nepromijenjeni.

## Isprobaj lokalno

Preuzmi ZIP ove grane kroz GitHub **Code → Download ZIP**, raspakiraj ga i pokreni iz mape projekta:

```sh
python3 -m http.server 8000
```

Otvori lokalni poslužitelj u pregledniku i odaberi **Igraj protiv botova**. Grana sama po sebi ne stvara javnu adresu za igranje.

## Provjere ispravka

- Potvrđeno da je izvorni CSS sačuvan bez promjena.
- Prikaz širine 320–430 px i osvježavanje statusa ostalih igrača.
- Razbijanje leda, zaštita od slučajnog odgovora nakon čišćenja i potvrda izbora.
- Rezultat ostaje skriven do završetka otkrivanja; točan/pogrešan odgovor i istek vremena.
- JavaScript sintaksa i provjera pogrešaka u Chromiumu.

Mrežna igra između uređaja nije potvrđena u ovom okruženju zbog ograničenja pristupa vanjskim servisima.
