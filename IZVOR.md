# Trivia Tavern — izvorni kod i sustav za gradnju

Grana `main` sadrži samo gotovu igru (GitHub Pages). Ova grana (`izvor`) sadrži sve iz čega se igra gradi.

## Postavljanje
    bash setup.sh          # prilagodi putanje (skripte su imale apsolutnu putanju radne mape)
    export NODE_PATH=<globalni node_modules s playwright i ws>

## Gradnja (redom)
    python3 v4/make.py       # v3/page.html + slojevi (CSS/JS) -> v4/page.html (niz rep/cut koraka; novi koraci se dodaju na kraj)
    node v4/build-out.js     # + v3/engine.js + v3/data.json -> v3/out.html (samostalni demo)
    python3 web/transform.py # + web/net-block.js (PeerJS + MQTT relej) -> web/body.html
    python3 web/assemble.py  # -> web/site (VERSION i cache u sw.js, CSP s hashovima)

Objava: sadržaj `web/site` kopira se u korijen grane `main`.

## Važne datoteke
- v3/engine.js — logika igre (domaćin je autoritativan): faze, CFG trajanja, paktovi, piramida, botovi
- v4/make.py — svi koraci izmjene sučelja; v4/*.css i v4/*.js su slojevi (pact-ui.js, pyr-ui.js, keep.js…)
- web/net-block.js — mreža: PeerJS, MQTT relej, privatno stanje, SK ključevi
- web/mini-broker.js — lokalni MQTT broker za testove

## Testovi
- Motor: node v3/engine-test.js, bots-test.js, pact-test.js, pyr-test.js, pace-test.js (tempo otkrivanja), td2-test.js (krčma 2.0), leg-test.js (legende). howto-test.js (upute), rc-test.js (rivalski obračun), fc-test.js (posljednji poziv), sgd-test.js (raspored izazova), tk-test.js (krčmarove tajne ponude), pact2-test.js (balans paktova), kr-web-test.js u webu (Krčmar 2.0: ploča s Nastavi, pakt, izazov vođi; CH=1, OKL=1, SOLO=1), sf-test.js (Social Flow 2.0: Vrijeme za dogovore, izdaja prije pitanja, šapat jednim dodirom, testni način s botovima). Stariji testovi motora rade po pravilima v28 (cfg.sf.on = false)
- Motor se gradi lancem: python3 v3/kr.py (td2.py nad engine.pretd2.js → leg.py → howto.py → rc.py → fc.py → sgd.py → tk.py → sf.py → ux.py → kr.py); nove izmjene motora dodaju se kao novi korak na kraj lanca
- Simulacija rasporeda: MODE=old|new PLAN=std|short|long N=1000 node sim/sgd-sim.js
- Web testovi s pravim tempom: PACE=1 node web/notv-test.js
- Web (pokretati jedan po jedan, port 8766): web/multi-test.js, notv-test.js, bots-web-test.js, net-test.js, relay-test.js, pact-web-test.js (TV=1, RELAY=1, LOYAL=1), tk-web-test.js (TV=1, RELAY=1), sf-web-test.js (SOLO=1 = igrač + 3 bota u testnom načinu; bez toga 3 prava igrača; TV=1, RELAY=1). pact-web-test.js provjerava sučelje v28 (sf isključen)
- Cijeli demo u pregledniku: node v3/ui-test.js (~9 min)
- Sigurnost: sec/attack.js, sec/impersonate.js, sec/csp-check.js
- Titranje animacija: node flk/restarts.js v3/out.html 150 (treba ispisati {})

- Razvrstavanje (mobitel): jedna kartica + swipe (v4/swipe-sort.js/.css, zadnji korak make.py); kratka provjera: node v3/swipe-test.js
- Sve stane na ekran (stranica se ne skrola; v4/fit.js + zaključavanje u make.py; ako pravi sadržaj pređe visinu, skrola se samo #app): provjere node v3/fit-lobby.js i node v3/fit-audit.js <š> <v> <phone|tv> <s> (koriste web/site, pokrenuti nakon web/assemble.py)
- Power pick (jedan po igraču po partiji, bira kategoriju na glasanju; zamijenio Krčmarovu uslugu): motor v3/kr.py (zadnji korak), sučelje v4/make.py + v4/pp.css; provjere: node v3/pick-test.js, node v3/pick-ui-test.js
- Moći: bez faze moći prije prvog pitanja, Oklada se ne nudi dvaput zaredom: node v3/pw-test.js; poruka ždrijeba ne prekriva sadržaj: node v3/tie-test.js
- Ambijent (iskre, prašina, dim iza sučelja; v4/ambient.js, canvas #ambient): node v3/ambient-test.js (nakon web/assemble.py)
- Krčmar kao osobnost (replike, pamćenje pakta/izdaje, završna riječ): v3/kr.py; provjera: node v3/kr-test.js
- Power pick medaljon: ui/pp-medal.webp, v4/pp.css; provjera: node v3/pick-ui-test.js, node v3/pp-icon-shot.js
- Trajanje partije (brza / standardna / duga): LENS + makePlan u v3/kr.py (standardna = dosadašnji PLAN), predvorje v4/make.py + v4/len.css + web/transform.py (TV);
  provjere: node v3/len-test.js (motor, virtualni sat), node v3/len-ui-test.js (predvorje 390/412/360, TV, demo), procjena minuta: node v3/len-time.js 4
- Piramida 3 (vidljiv napredak: +1 i traka 1/2, uspon stepenicu po stepenicu s bljeskom, ✗, 👑✗, bonusi ⚡ ✖2 🔥): v4/pyr3.js (pyramidHtml), v4/pyr3.css, engine p.fb samo za prikaz;
  provjere: node v3/pyr-test.js (motor, botovi), node v3/pyr-ui-test.js (mobitel 390 + TV, snimke v3/shots/pyr-*.png)
- Prijenos izmjena s grane main (v48: obnova partije, sigurnije povezivanje bez MQTT-a, novo predvorje, odabir mete, prilagodba ekrana):
  motor v3/kr.py (zadnji blok) + v3/recover.js; sučelje web/port-main.py + web/port-main.json (parovi stari → novi, primjenjuju se na kraju web/transform.py);
  web/assemble.py piše zaseban engine.js, README iz web/README.main.md i kopira web/main-extra (tests, docs, scripts, src, .github).
  Provjera nakon gradnje: cd web/site && node --test tests/*.test.cjs
- Brzi rad: ./build.sh (cijela izgradnja, jedan redak), ./check.sh (motor + testovi s maina), ./check.sh ui (i kratki preglednik-testovi)
- Šifrirani rezervni relej (MQTT, AES-GCM, ključ sobe u QR/poveznici #KOD-ključ): web/relay-e2e.py (nakon port-main u web/transform.py);
  provjera: node web/relay-test.js (lokalni posrednik web/tools/mini-mqtt.js)
