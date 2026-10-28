# Provjera povezivanja prije objave

Automatski provjereno:

- 14 testova motora, obnove i ponovnog spajanja prolazi (`node --test tests/*.test.cjs`).
- Cijela simulirana partija s botovima više se puta obnavlja i uspoređuje sa stanjem prije obnove.
- `node tests/browser-recovery.cjs`: osvježavanje aktivne partije u Chromiumu uz simulirani PeerJS.
- `node tests/browser-multiplayer.cjs`: dva izolirana preglednička konteksta, pridruživanje, početak igre, prekid kanala, osvježavanje domaćina i ponovna prijava igrača. Prijenos poruka simuliran je u testu; ovo nije test WebRTC/ICE/TURN protokola.

Pokušaj korištenja vanjske PeerJS skripte u ovom izvršnom okruženju nije je uspio učitati. Time nije potvrđena ni opovrgnuta dostupnost servisa za korisnike. Stvarne mobilne mreže i javni TURN poslužitelji nisu provjereni.

Za provjeru na uređajima otvoriti izmijenjenu verziju na HTTPS adresi. Prvo odigrati s domaćinom i dva mobitela na istoj mreži, zatim ponoviti s jednim mobitelom na mobilnim podacima. Tijekom pitanja prekinuti i vratiti mrežu igrača te osvježiti domaćina u istoj kartici. Potvrditi isti kod, rezultat i povratak igrača bez dvostrukog bodovanja. Provjeriti i povratak nakon zaključavanja zaslona. Za provjeru TURN-a potrebna je prisiljena relay veza i potvrda odabranog relay kandidata u WebRTC statistici; sam uspješan ulazak u sobu ne dokazuje da je TURN korišten.

Izmjene nisu objavljene na GitHub Pagesu.
