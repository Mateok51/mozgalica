# Upute za pisanje pitanja (Mozgalica, party kviz na hrvatskom)

Igra: party kviz za 2–6 prijatelja u Hrvatskoj (odrasli i mladi), pitanja se čitaju na TV-u i mobitelu.
Postojeća banka pitanja je u `existing.json` u ovoj mapi – NE ponavljaj ta pitanja (ni ista činjenica drugim riječima).

## Format (strogo)
Spremi JSON datoteku točno ovog oblika (UTF-8, bez komentara):
```json
{ "cats": { "Ime kategorije": [ { "q": "Pitanje?", "o": ["A", "B", "C", "D"], "a": 2 } ] } }
```
- `o` ima TOČNO 4 različite opcije, `a` je indeks točne (0–3).
- Rasporedi točne odgovore ravnomjerno: otprilike četvrtina pitanja ima a=0, četvrtina a=1, itd. Nemoj da je točan uvijek isti položaj.
- Pitanje najviše ~110 znakova, svaka opcija najviše ~30 znakova.

## Kvaliteta – najvažnije
1. **Točnost iznad svega.** Samo činjenice u koje si potpuno siguran i koje su široko prihvaćene. Ako postoji i najmanja sumnja ili izvori se razilaze, izostavi pitanje. Možeš koristiti WebSearch za provjeru, ali bolje je izostaviti nego nagađati.
2. **Jedan jedini točan odgovor.** Netočne opcije moraju biti uvjerljive (isti tip odgovora), ali nesporno netočne.
3. **Bez stvari koje se mijenjaju.** Izbjegavaj "trenutno", "danas", aktualne prvake, cijene, broj stanovnika koji se mijenja, aktualne rekorde u sportu, "najnoviji" model i sl. Povijesni ishodi (npr. tko je osvojio SP 2018.) su u redu.
4. **Pravilan hrvatski standardni jezik**, ispravna dijakritika (č, ć, đ, š, ž), hrvatski nazivi (npr. "Sjedinjene Američke Države", "Ženeva", "Kopenhagen"), godine s točkom ("1912.").
5. **Težina:** oko 40 % lakih, 40 % srednjih, 20 % težih. Zabavno i razumljivo za društvo, ne usko stručno.
6. Ne kopiraj pitanja iz postojećih kvizova ili TV emisija; piši vlastita.

## Kad završiš
Vrati kratko: putanju datoteke, broj pitanja po kategoriji i popis svega što si izostavio zbog sumnje. Ne vraćaj sadržaj pitanja u odgovoru.
