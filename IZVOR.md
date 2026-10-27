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
- Motor: node v3/engine-test.js, bots-test.js, pact-test.js, pyr-test.js
- Web (pokretati jedan po jedan, port 8766): web/multi-test.js, notv-test.js, bots-web-test.js, net-test.js, relay-test.js, pact-web-test.js (TV=1, RELAY=1, LOYAL=1)
- Cijeli demo u pregledniku: node v3/ui-test.js (~9 min)
- Sigurnost: sec/attack.js, sec/impersonate.js, sec/csp-check.js
- Titranje animacija: node flk/restarts.js v3/out.html 150 (treba ispisati {})
