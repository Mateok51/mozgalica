# Sigurnije povezivanje igrača

## Trenutno stanje

Igra koristi PeerJS za signalizaciju i WebRTC za podatke. Javni MQTT rezervni put je isključen: slao je identifikator i ključ igrača javnom posredniku. Sam kod sobe nije tajna dovoljno visoke entropije. Klijent već navodi javne TURN poslužitelje sa zajedničkim vjerodajnicama; njihova dostupnost, uvjeti korištenja i učinkovitost nisu provjereni. Povezivanje može zakazati na ograničenim mrežama.

## Predloženo rješenje

Koristiti TURN kao rezervni put unutar postojećeg WebRTC povezivanja. Podaci WebRTC kanala šifrirani su DTLS-om i kada prolaze kroz TURN. PeerJS signalizacija ostaje zaseban servis; TURN ne zamjenjuje signalizacijski poslužitelj i ne jamči njegovu dostupnost. TURN sam po sebi također ne provjerava da je uređaj na drugoj strani pravi domaćin niti sprječava neželjeni ulazak u sobu s poznatim kodom.

TURN može biti vlastiti coturn ili upravljana usluga. Za upotrebu treba dostupna usluga, odgovarajuća mrežna konfiguracija i vjerodajnice. Troškovi i dostupnost ovise o odabranom pružatelju. Ne upisivati trajne lozinke u javni repozitorij, statični HTML ili JavaScript. Klijentu izdavati kratkotrajne vjerodajnice putem HTTPS usluge, s ograničenjima zloupotrebe i prometa; to zahtijeva zasebnu poslužiteljsku komponentu ili pružatelja koji podržava takvo izdavanje. Vrijeme valjanosti i obnova moraju pokriti trajanje igre i ponovno povezivanje.

## Koraci prije uključenja

1. Odabrati i postaviti TURN i HTTPS izdavanje kratkotrajnih vjerodajnica. Tajna za njihovo izdavanje ostaje samo na poslužitelju.
2. Pripremiti klijenta da pravodobno pribavi vjerodajnice za domaćina i igrača prije izrade PeerJS veze te ih obnovi po potrebi. Ako izdavanje ne uspije, zadržati izravni način i jasno prikazati ograničenje.
3. Provjeriti mrežne rute, uključujući TURN preko TLS-a gdje je dostupan, uz ograničavanje pristupa i potrošnje. Ne dopustiti otvoreni relej.
4. Testirati dva odvojena uređaja na različitim mrežama, prisiliti TURN u testu i potvrditi preko WebRTC statistike da se promet doista prenosi putem releja. Testirati istek vjerodajnica, prekid i povratak veze, nedostupan TURN i nedostupnu signalizaciju.
5. Zasebno ojačati identitet sobe i zaštitu od neželjenog pridruživanja; ne smatrati TURN rješenjem tog problema. Pregledati ograničavanje poruka, validaciju ulaza i zaštitu igrača od lažnog predstavljanja.

Javni MQTT ostaje isključen. Ovaj dokument je prijedlog arhitekture; Predloženi kontrolirani TURN još nije postavljen ni testiran.

## Izvori

- https://webrtc.org/getting-started/turn-server
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
- https://peerjs.com/client/getting-started
