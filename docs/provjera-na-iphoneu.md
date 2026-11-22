# Provjera na pravom iPhoneu (verzija v93)

Automatski testovi ne mogu potvrditi tri stvari koje su važne na iPhoneu: zvuk uz utišani prekidač, brzo tapkanje i ponašanje pri zaključavanju zaslona. Ovo je kratak popis (oko 10 minuta) za nekoga s iPhoneom. Dovoljna su dva telefona ili jedan telefon i TV/računalo kao domaćin.

## Priprema
- Zapiši model telefona i verziju iOS-a (Postavke → Općenito → Informacije).
- Otvori igru u **Safariju** (ne u instaliranoj aplikaciji) i na početnom zaslonu provjeri oznaku verzije pri dnu. Mora pisati **v93**. Ako piše v92, zatvori karticu, ponovno otvori adresu i provjeri opet.

## 1. Zvuk uz utišani prekidač
1. Bočni prekidač postavi na **tiho** (vidi se narančasta oznaka). Glasnoću pojačaj tipkama sa strane.
2. Uđi u igru, dodirni nekoliko gumba (zvuk se otključava tek nakon dodira) i dođi do pitanja.
3. **Očekujem:** zvukovi se čuju. Ako ne: zabilježi u kojoj fazi i je li pomoglo prebacivanje prekidača.
4. Isključi zvuk gumbom u igri. **Očekujem:** potpuna tišina, bez obzira na prekidač.
5. Ako je u drugoj aplikaciji svirala glazba, može se prekinuti kad igra pusti zvuk. To je očekivano.

## 2. Brzo tapkanje i dugi pritisak
1. Na pitanju brzo tapni dva puta isti odgovor, pa dva puta prazno mjesto na ekranu. **Očekujem:** stranica se ne zumira.
2. Na efektima (sluz, led) brzo tapkaj i briši prstom. **Očekujem:** bez zumiranja i bez trzanja stranice.
3. Dugo drži prst na gumbu i na liku. **Očekujem:** bez izbornika "Kopiraj", "Spremi sliku" ili "Dijeli".
4. U polju za ime i kod sobe dodirni i drži. **Očekujem:** tekst se može označiti i kopirati, a zaslon se ne zumira kad se otvori tipkovnica.

## 3. Zaključavanje zaslona i prebacivanje aplikacije
1. Usred pitanja zaključaj telefon, pričekaj 15 do 20 sekundi, pa ga otključaj. **Očekujem:** igra se nastavlja ili se sama oporavi, soba i ime ostaju.
2. Usred pitanja prebaci se u drugu aplikaciju na 10 sekundi i vrati se. **Očekujem:** isto.
3. Zabilježi ako te igra vrati na početni zaslon, izgubiš mjesto u sobi ili ostaneš bez zvuka nakon povratka.

## 4. Vidljivost bez skrolanja
Na pitanju, ploči bodova i piramidi provjeri da se vidi cijeli sadržaj bez skrolanja stranice, uz adresnu traku Safarija (i kad se ona sakrije pri povlačenju).

## 5. Pridruživanje
Otvori pozivnicu ili skeniraj QR s drugog uređaja. **Očekujem:** upis koda i imena radi, a pridruživanje uspije.

## Što javiti
Za svaku stavku napiši **radi** ili **ne radi**. Ako ne radi, dodaj model, verziju iOS-a, u kojoj fazi igre se dogodilo i, ako možeš, snimku ekrana ili kratak video. Dovoljno je i nekoliko rečenica.
