# Objava Trivia Taverna (provjeren postupak)

Dopunjuje `AGENTS.md`. Provjereno 22. 11. 2026. (v92) Wranglerom prijavljenim kao vlasnik računa; nije ispravno pretpostavljati ništa što ovdje nije navedeno kao provjereno.

## Što je provjereno

- **Worker postoji i dostupan je:** `trivia-tavern`, javna adresa `https://trivia-tavern.chaos-ballad.workers.dev/`. `npx wrangler deployments list --name trivia-tavern` prikazuje njegove objave.
- **Spajanje u `main` automatski objavljuje produkciju.** Za sva četiri spajanja (#18, #19, #20, #21) Cloudflare je 22 do 39 sekundi nakon spajanja objavio verziju bez poruke. Drugi alat je uz neke od njih ručno objavio isti commit s porukom; to nije bilo potrebno.
- **Grane PR-ova objavljuju samo preglede:** za njih nastaju verzije (`versions list`) bez produkcijske objave (`deployments list`).
- **Provjeravaju se tri stvari:** `/api/health` vraća `{"ok":true,"protocol":1}`; `app.js` sadrži oznaku `home-ver">vNN`; `sw.js` sadrži `mozgalica-vNN`. Iste oznake poslužuje i GitHub Pages (`https://mateok51.github.io/mozgalica/`), koji se također objavljuje iz `main`, ali s malim zakašnjenjem.

## Što NIJE provjereno

- **Na koju je granu Git build izričito vezan.** Prava prijave (`account:read`, `user:read`, `workers_scripts:write`) ne dopuštaju čitanje postavki Workers Builds. Da je to `main` zaključuje se iz vremena objava i korisnik je to potvrdio, ali ovdje nije očitano.
- **Broj aktivnih soba.** `/api/health` ga ne javlja, pa se prije objave ne može znati prekida li ona partiju koja je u tijeku. Nova verzija Workera može prekinuti žive sobe.
- **Povratak na prethodnu verziju** (`npx wrangler rollback`) nije isproban.

## Prijava (jednom po okruženju; ne ostaje između sesija)

1. `npx wrangler whoami`. Ako piše da nisi prijavljen:
2. `npx wrangler login --device --browser=false --scopes account:read user:read workers_scripts:write`
3. Korisnik u 5 minuta otvori `https://dash.cloudflare.com/oauth2/device/verify` i upiše ispisani kod. Nikad ne traži lozinku ni token u razgovoru.
4. Wrangler uvijek dodaje i `offline_access` (trajni token). Zapis je u `~/.config/.wrangler/`, izvan repozitorija; ne kopiraj ga u Git ni u razgovor. Opoziv: `npx wrangler logout`.

## Postupak kad korisnik izričito zatraži objavu

1. **Provjeri prijavu** (gore).
2. **Testovi lokalno:** `node --test tests/*.test.cjs`, `npm run build`, `npm run test:server`, a za promjene prikaza i browser testove iz `AGENTS.md`.
3. **Verzija:** `CACHE` u `sw.js` i oznaka `home-ver` u `app.js` podignuti i jednaki (`tests/version.test.cjs`).
4. **Pull request i zelen CI** na zadnjem commitu: `test`, `browser`, `webkit`, `cloud`. Crven CI se ne zaobilazi.
5. **Spoji u `main`.** Time počinje automatska objava; ne pokreći `wrangler deploy` ispod toga.
6. **Pričekaj automatsku objavu:** `npx wrangler deployments list --name trivia-tavern` mora pokazati novu objavu oko 30 sekundi nakon spajanja (`git log -1 --format=%cI` daje vrijeme spajanja; Git ispisuje lokalno vrijeme, Cloudflare UTC). Ako je nema nakon 3 minute, build nije automatski: tek tada, i samo uz izričit zahtjev, iz čistog `origin/main` na točnom commitu: `npm ci && npm run build && npx wrangler deploy --message "Trivia Tavern vNN: <opis> (<sha>)"`.
7. **Potvrdi aktivnu verziju:** `curl https://trivia-tavern.chaos-ballad.workers.dev/api/health`, zatim `home-ver` u `app.js` i `mozgalica-v` u `sw.js` na toj adresi i na GitHub Pages. Sve mora biti nova verzija; Pages može kasniti nekoliko minuta.
8. **Sažetak:** što je spojeno, što je objavljeno i gdje, koje provjere prolaze i što nije provjereno na stvarnim uređajima.

## Ograničenja

- Ne stvaraj novi Worker, ne mijenjaj hosting, ne briši Durable Objects ni spremljene sobe.
- Ne mijenjaj `migrations` ni `durable_objects` u `wrangler.jsonc` bez izričitog zahtjeva: pogrešna migracija može obrisati klase i sobe.
- Vjerodajnice se ne spremaju u Git, a ni u dokumentaciju.

## Odluka korisnika o samostalnom spajanju (22. 11. 2026.)

Korisnik je potvrdio da sesija i dalje smije sama spajati u `main` kad je CI zelen (pravilo u `AGENTS.md`), znajući da svako spajanje objavljuje produkciju, uključujući promjene samo dokumentacije (nova verzija Workera s istim sadržajem igre). Nakon svakog spajanja provjeri objavu (koraci 6 i 7) i u sažetku jasno navedi da je objavljeno. Spajanje i objava mogu prekinuti partiju koja je u tijeku, a to se ne može unaprijed provjeriti.

## Koji model za koji posao (štedi tokene)

Pokreni sesiju s modelom koji odgovara zadatku (`/model` u Claude Code-u). Prije početka posla Claude kaže koji model preporučuje.

| Posao | Model |
|---|---|
| Čitanje CI rezultata, spajanje zelenih PR-ova, opisi PR-ova, podizanje oznake verzije, pregled logova | Haiku |
| Redovita izmjena s testom (tekst, ekran, CSS, stavka u popisu pitanja) | Sonnet |
| Pravila igre, ravnoteža, poštenost, server, Cloudflare objava, protokol | Opus ili Fable |
| Vizualni pregled na više veličina mobitela | Sonnet ili jači |

Velike datoteke ne čitaj cijele: `app.js` (~4400 redaka), `styles.css` (~2800), `engine.js`, `data/questions.js` (709 KB). Traži `grep`-om i čitaj raspone. `dist/` i `node_modules/` su isključeni čitanju (`.claude/settings.json`). Browser testove pokreći po dijelovima tijekom rada, a cijeli skup prije PR-a. Nakon završenog zadatka pokreni novu sesiju (`/clear`) umjesto da nastavljaš dugi razgovor.
