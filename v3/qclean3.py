# Jednokratno čišćenje 3 (v58): Tehnologija i internet, Internet i memovi, Brendovi i logotipi, Reklame i slogani.
# Uklanjanje po izvornim indeksima (odjednom), nova pitanja na kraj kategorije.
import json, random
SP = '/root/mozgalica'
P = SP + '/v3/data.json'
d = json.load(open(P, encoding='utf-8'))
C = d['cats']
rnd = random.Random(59)

def drop(cat, idx):
    assert len(set(idx)) == len(idx), cat
    C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]

def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert q not in have and len({a, *w}) == 4, q
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a)
        C[cat].append({'q': q, 'o': o, 'a': pos})

# --- Tehnologija i internet: 9 pitanja o značenju kratica, ponavljanja (WWW, QR, disketa, Twitch, rickroll) → AI i moderna tehnologija
drop('Tehnologija i internet', [31, 59, 60, 62, 77, 7, 20, 21, 22, 23, 79, 89, 101, 104, 90, 66, 105, 69])
add('Tehnologija i internet', [
 ('Koja je tvrtka razvila ChatGPT?', 'OpenAI', ['Google', 'Meta', 'Amazon']),
 ('Kako se od 2024. zove Googleov chatbot umjetne inteligencije, prije nazvan Bard?', 'Gemini', ['Copilot', 'Alexa', 'Siri']),
 ('Kako se zove Metina društvena mreža nalik Twitteru, pokrenuta 2023.?', 'Threads', ['Bluesky', 'Mastodon', 'Truth Social']),
 ('Koja je tvrtka, poznata po grafičkim karticama GeForce, postala jedan od najvrjednijih svjetskih proizvođača čipova za umjetnu inteligenciju?', 'NVIDIA', ['Intel', 'AMD', 'Qualcomm']),
 ('Tko je 2022. kupio Twitter i 2023. ga preimenovao u X?', 'Elon Musk', ['Jeff Bezos', 'Mark Zuckerberg', 'Bill Gates']),
 ('Koja tvrtka Elona Muska lansira rakete Falcon 9 i svemirski brod Starship?', 'SpaceX', ['Blue Origin', 'Virgin Galactic', 'Rocket Lab']),
 ('Koji je Appleov uređaj nalik naočalama za „prostorno računalstvo“ izašao 2024.?', 'Apple Vision Pro', ['iPhone Air', 'Apple Watch Ultra', 'HomePod']),
 ('Kako se naziva tekstualna uputa kojom se upravlja generativnom umjetnom inteligencijom?', 'Prompt', ['Kolačić', 'Patch', 'Firewall']),
 ('Koja kineska tvrtka stoji iza aplikacije TikTok?', 'ByteDance', ['Tencent', 'Alibaba', 'Huawei']),
 ('Koja je aplikacija za videopozive tijekom pandemije 2020. postala toliko popularna da je njezino ime postalo glagol?', 'Zoom', ['Skype', 'Webex', 'Viber']),
 ('Koja je kriptovaluta, uz Bitcoin najpoznatija, temeljena na pametnim ugovorima?', 'Ethereum', ['Dogecoin', 'Litecoin', 'Ripple']),
 ('Kako se zovu Appleove bežične slušalice predstavljene 2016.?', 'AirPods', ['Galaxy Buds', 'Beats Solo', 'Pixel Buds']),
 ('Koja je tvrtka Elona Muska poznata po električnim automobilima?', 'Tesla', ['Rivian', 'Lucid', 'Polestar']),
])

# --- Internet i memovi: dvostruki unosi (kolačić, phishing, CAPTCHA, @), definicije → današnji žargon
drop('Internet i memovi', [40, 11, 12, 25, 26, 27, 43, 44])
add('Internet i memovi', [
 ('Koju je riječ Oxfordov rječnik 2023. proglasio riječju godine, a označava šarm u flertu?', 'Rizz', ['Slay', 'Cringe', 'Vibe']),
 ('Koji je izraz Oxfordov rječnik 2024. proglasio riječju godine za propadanje mentalne budnosti zbog beskrajnog gledanja besmislenog sadržaja?', 'Brain rot', ['Doomscrolling', 'Gaslighting', 'Ghosting']),
 ('Što u internetskom žargonu znači kratica GOAT?', 'Najbolji svih vremena', ['Najgori svih vremena', 'Veliki sretnik', 'Opasan igrač']),
 ('Što znači internetska fraza „OK boomer“?', 'Odbacivanje mišljenja starije generacije', ['Pozdrav omiljenom igraču', 'Pohvala djedu', 'Naziv glazbenog žanra']),
 ('Kako se zove nagli prekid kontakta s osobom bez ikakva objašnjenja, osobito na društvenim mrežama?', 'Ghosting', ['Trolanje', 'Spamanje', 'Blokiranje']),
])

# --- Brendovi i logotipi: previše automobilskih logotipa i pitanja „iz koje je zemlje“; dodani današnji brendovi
drop('Brendovi i logotipi', [12, 14, 15, 16, 18, 19, 20, 24, 77, 79, 82, 85, 71, 41, 64, 39, 68, 34, 62, 63])
add('Brendovi i logotipi', [
 ('Kako se od 2021. zove matična tvrtka koja posjeduje Facebook, Instagram i WhatsApp?', 'Meta', ['Alphabet', 'Oracle', 'ByteDance']),
 ('Koja je tvrtka od 2015. matična tvrtka Googlea?', 'Alphabet', ['Meta', 'Oracle', 'Intel']),
 ('Koja marka električnih automobila ima logotip stiliziranog slova T?', 'Tesla', ['Toyota', 'Tata', 'Tesco']),
 ('Koja je kineska marka u zadnjem tromjesečju 2023. prvi put prestigla Teslu po prodaji potpuno električnih automobila?', 'BYD', ['Geely', 'NIO', 'Xiaomi']),
 ('Koja sportska marka ima logotip s tri paralelne pruge?', 'Adidas', ['Puma', 'Reebok', 'Fila']),
 ('Koja je platforma za iznajmljivanje privatnog smještaja osnovana 2008. u San Franciscu?', 'Airbnb', ['Booking.com', 'Expedia', 'Tripadvisor']),
 ('Koja je aplikacija za naručivanje vožnje nastala 2009. u San Franciscu?', 'Uber', ['Bolt', 'Lyft', 'Grab']),
 ('Koja je španjolska tvrtka vlasnik modnog lanca Zara?', 'Inditex', ['Mango', 'Desigual', 'Massimo Dutti']),
 ('Iz koje je zemlje aplikacija za vožnju Bolt?', 'Estonije', ['Finske', 'Latvije', 'Švedske']),
 ('Iz koje je zemlje aplikacija za dostavu hrane Wolt?', 'Finske', ['Estonije', 'Norveške', 'Danske']),
])

# --- Reklame i slogani: definicije iz marketinga i vrlo stare američke kampanje → slogani koje svi poznaju
drop('Reklame i slogani', [4, 7, 11, 12, 13, 16, 17, 18, 19, 26, 27, 37, 42])
add('Reklame i slogani', [
 ('Koja sportska marka koristi slogan Just Do It?', 'Nike', ['Adidas', 'Puma', 'Under Armour']),
 ('Koja je marka 2016. pokrenula globalnu kampanju sa sloganom Taste the Feeling?', 'Coca-Cola', ['Pepsi', 'Fanta', 'Sprite']),
 ('Koji energetski napitak ima slogan „daje ti krila“?', 'Red Bull', ['Monster', 'Guarana', 'Burn']),
 ('Koji je lanac brze hrane poznat po sloganu Have It Your Way?', 'Burger King', ['McDonald’s', 'Wendy’s', 'KFC']),
])

open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Tehnologija i internet', 'Internet i memovi', 'Brendovi i logotipi', 'Reklame i slogani']: print(c, len(C[c]))
print('ukupno', sum(len(l) for l in C.values()))
