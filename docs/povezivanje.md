# Sigurnije povezivanje igrača

## Trenutno stanje

Igra koristi PeerJS za signalizaciju i WebRTC za podatke. Kad izravna veza ne uspije (npr. oba uređaja na mobilnim podacima), koristi se rezervni put preko javnih MQTT posrednika, **šifriran s kraja na kraj**:

- Domaćin pri otvaranju sobe stvara tajni ključ sobe (128 bita). Ključ je samo u QR kodu i poveznici (`#KOD-ključ`); ne šalje se posredniku.
- Iz ključa se (HKDF-SHA-256) izvode ključ za AES-GCM i naziv teme. Posrednik vidi samo šifrirani sadržaj i nasumičnu temu, ne kod sobe, imena ni ključeve igrača.
- Igrač koji kod upiše ručno nema ključ sobe i koristi samo izravnu vezu.
- Ključ sobe sprema se u zapis za obnovu partije, pa obnovljena soba zadržava isti ključ.
- Provjera: automatski test lokalnog MQTT posrednika (`web/relay-test.js`) nije u ovom repozitoriju; šifriranje se za sada provjerava ručno.

Ograničenja: dostupnost javnih posrednika nije zajamčena; tko ima poveznicu sa ključem može ući u sobu kao i dosad. TURN (dolje) ostaje mogućnost za još pouzdanije povezivanje.

## Predloženo rješenje

Koristiti TURN kao rezervni put unutar postojećeg WebRTC povezivanja. Podaci WebRTC kanala šifrirani su DTLS-om i kada prolaze kroz TURN. PeerJS signalizacija ostaje zaseban servis; TURN ne zamjenjuje signalizacijski poslužitelj i ne jamči njegovu dostupnost. TURN sam po sebi također ne provjerava da je uređaj na drugoj strani pravi domaćin niti sprječava neželjeni ulazak u sobu s poznatim kodom.

TURN može biti vlastiti coturn ili upravljana usluga. Za upotrebu treba dostupna usluga, odgovarajuća mrežna konfiguracija i vjerodajnice. Troškovi i dostupnost ovise o odabranom pružatelju. Ne upisivati trajne lozinke u javni repozitorij, statični HTML ili JavaScript. Klijentu izdavati kratkotrajne vjerodajnice putem HTTPS usluge, s ograničenjima zloupotrebe i prometa; to zahtijeva zasebnu poslužiteljsku komponentu ili pružatelja koji podržava takvo izdavanje. Vrijeme valjanosti i obnova moraju pokriti trajanje igre i ponovno povezivanje.

## Koraci prije uključenja

1. Odabrati i postaviti TURN i HTTPS izdavanje kratkotrajnih vjerodajnica. Tajna za njihovo izdavanje ostaje samo na poslužitelju.
2. Pripremiti klijenta da pravodobno pribavi vjerodajnice za domaćina i igrača prije izrade PeerJS veze te ih obnovi po potrebi. Ako izdavanje ne uspije, zadržati izravni način i jasno prikazati ograničenje.
3. Provjeriti mrežne rute, uključujući TURN preko TLS-a gdje je dostupan, uz ograničavanje pristupa i potrošnje. Ne dopustiti otvoreni relej.
4. Testirati dva odvojena uređaja na različitim mrežama, prisiliti TURN u testu i potvrditi preko WebRTC statistike da se promet doista prenosi putem releja. Testirati istek vjerodajnica, prekid i povratak veze, nedostupan TURN i nedostupnu signalizaciju.
5. Zasebno ojačati identitet sobe i zaštitu od neželjenog pridruživanja; ne smatrati TURN rješenjem tog problema. Pregledati ograničavanje poruka, validaciju ulaza i zaštitu igrača od lažnog predstavljanja.

Javni MQTT koristi se samo šifrirano (vidi gore). Dio o TURN-u je prijedlog arhitekture; Predloženi kontrolirani TURN još nije postavljen ni testiran.

## Izvori

- https://webrtc.org/getting-started/turn-server
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels
- https://peerjs.com/client/getting-started
