# Trivia Tavern na Cloudflareu

Cilj: GitHub ostaje izvor koda, a Cloudflare poslužuje stranicu i vodi partije.
Ovo nije premještanje stare P2P stranice: u cloud izgradnji svaka soba ima svoj
Durable Object koji izvršava postojeća pravila igre, odbrojavanje i bodovanje.
Mobitel domaćina šalje administratorske naredbe; njegov izlazak ne zaustavlja server.

## Prva objava s mobitela

1. Prijavi se u Cloudflare Dashboard. Koristi besplatni Workers plan; ako panel
   traži plaćeni plan ili karticu za ovu konfiguraciju, zaustavi postavljanje i
   provjeri poruku. Nemoj uključivati naplatu radi ove igre.
2. Otvori **Workers & Pages**, zatim **Create application / Create Worker** i
   opciju za uvoz Git repozitorija (**Import a repository / Connect to Git**).
   Nazivi mogu varirati ovisno o verziji panela. Odaberi **Workers**, ne statični
   Pages upload: potreban je Worker s Durable Objects vezama.
3. Poveži GitHub kroz Cloudflareov ekran za autorizaciju i dopusti pristup samo
   repozitoriju `Mateok51/mozgalica`. Ne dijeli lozinke ili API tokene u razgovoru.
4. Odaberi granu `codex/cloudflare-server` na kojoj se nalaze `wrangler.jsonc`, `package.json`, `server/` i
   `tools/build-cloud.mjs`. Nemoj objaviti staru granu bez ovih datoteka.
5. Postavi:
   - naziv Workera: `trivia-tavern`
   - korijenski direktorij: korijen repozitorija (zadano)
   - build naredba: `npm run build`
   - deploy naredba: `npx wrangler deploy`
   - Node: 22.12 ili noviji (preporučeno 22 ili 24, aktualna podržana verzija)
6. Pokreni **Deploy**. Wrangler konfiguracija deklarira dvije SQLite Durable
   Object klase i njihove veze; ne treba ih ručno stvarati. Za ovu verziju nisu
   potrebni vanjski MQTT, PeerJS, baza, tajne ni plaćeni servisi.
7. Kopiraj HTTPS adresu iz završenog deploymenta, oblika
   `https://trivia-tavern.TVOJ-PODDOMEN.workers.dev/`.
8. Otvori adresu u pregledniku, napravi sobu i podijeli cijelu pozivnicu. Zatim
   testiraj pridruživanje s drugog mobitela, zaključavanje domaćinova ekrana i
   ponovno povezivanje. Manualni četveroslovni kod bez tajnog dijela pozivnice
   nije dovoljan za cloud sobu; koristi cijelu poveznicu/QR.

Promjene na odabranoj produkcijskoj Git grani mogu pokretati nove Cloudflare
izgradnje. Ako želiš pregled prije objave, produkciju veži uz `main`, a izmjene
prvo pregledaj i testiraj u zasebnoj grani. Sam račun još ne znači da je išta
objavljeno; konačan uspjeh potvrđuje završeni Cloudflare deploy i provjera uživo.

## APK i stare pozivnice

Postojeći APK v81 sadrži lokalni web sadržaj i stare GitHub/P2P adrese. Ne prelazi
sam na novi server. Nakon dobivanja stvarne Cloudflare adrese treba pripremiti
novi APK s točno tom dopuštenom adresom za mrežu, pozivnice i Android linkove.
Stare i nove sobe nisu ista mreža. Za početnu provjeru svi koriste novu web adresu;
potom novi APK i preglednik mogu koristiti isti server i iste sobe.

## Lokalni razvoj i provjera

```sh
npm ci
npm run build
npm run dev
```

Uz pokrenuti lokalni server, `npm run test:cloud-browser` provjerava šest
odvojenih preglednika preko stvarnog HTTP/WebSocket prometa (potrebni su
Playwright i Chromium). `npm run test:server` provjerava stvarni lokalni
Workers runtime, spremanje i ponovno pokretanje soba, ograničenja i prava pristupa.

`npm run dev` koristi lokalni Workers/Durable Objects runtime. Pripremljena
web stranica nalazi se u `dist/`, serverski ulaz u `server/worker.mjs`.
`server/generated/engine.mjs` nastaje iz postojećih pravila i podataka, bez
prepisivanja igre. `runtime-config.js` u izvornom repozitoriju isključuje cloud
put radi kompatibilnosti starih browser testova; cloud build ga zamjenjuje
javno dostupnim adresama vlastitog origina, nikakvim tajnim ključevima.

## Besplatni plan i ograničenja

Konfiguracija koristi SQLite Durable Objects namijenjene i besplatnom Workers
planu. Besplatna usluga ima dnevne kvote i nema obećanje neograničenog kapaciteta
ili neprekidne dostupnosti. Aktivno odbrojavanje drži sobu aktivnom i troši
trajanje čak i kada nitko ne šalje odgovore. Sobe imaju ograničen vijek i server
ograničava broj soba, veličinu poruka i učestalost zahtjeva.

Prije prve objave provjeri aktualne kvote u svom panelu i dokumentaciji:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/

Pri razvoju u ovom okruženju pristup navedenim dokumentacijskim stranicama bio
je blokiran s HTTP 403. Točan aktualni besplatni kapacitet i uvjeti računa stoga
nisu potvrđeni prijavom u korisnikov račun. Ne uključuj plaćeni plan automatski.


Početne zaštitne granice: najviše 12 novih soba u pomična 24 sata za ovu instalaciju,
2 sata života pojedine sobe, najviše 6 igrača i gašenje nakon 30 minuta bez ijedne
veze. To su konzervativne granice ove verzije, ne potvrda aktualnih Cloudflare kvota.
Neispravni unosi ne ulaze u zapis partije, dodatna nedokumentirana polja odbacuju se,
a pristup postavkama ima samo vlasnik sobe. Stanje privatnih društvenih odluka šalje
se samo pripadajućem igraču. Sadržaj igre u javnom repozitoriju nije tajna, pa ovo
nije zaštita od igrača koji unaprijed pregledava pitanja u izvornom kodu.
