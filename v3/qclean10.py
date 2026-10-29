# Jednokratno čišćenje 10 (v58): Matematika i brojevi, Književnost, Umjetnost, Mitologija.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(66)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def keep(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert len({a, *w}) == 4, q
        if q in have: print('preskočeno:', q); continue
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
keep('Matematika i brojevi', [1,2,5,7,8,12,13,14,18,19,24,29,32,35,38,39,40,41,42,47,48,54,56,57,58,59,63,64,69,72,73,74,75,76,77,78,82,90,91,92,95,97,98,99,101,102,103,104])
add('Matematika i brojevi', [
 ('Koja je iranska matematičarka 2014. postala prva žena dobitnica Fieldsove medalje?', 'Maryam Mirzakhani', ['Emmy Noether', 'Sofja Kovaljevska', 'Ada Lovelace']),
 ('Koji je ruski matematičar odbio nagradu od milijun dolara za dokaz Poincaréove slutnje?', 'Grigorij Perelman', ['Andrew Wiles', 'Terence Tao', 'Alan Turing']),
 ('Koji je britanski matematičar dokazao Fermatov posljednji teorem (1994.)?', 'Andrew Wiles', ['Alan Turing', 'Terence Tao', 'John Nash']),
 ('Koji je odgovor na „krajnje pitanje života, svemira i svega“ u Autostoperskom vodiču kroz galaksiju?', '42', ['7', '24', '101']),
 ('Kojeg se datuma slavi Dan broja π?', '14. ožujka', ['22. srpnja', '1. siječnja', '4. prosinca']),
])
drop('Književnost', [95,98,99,100,101,103])
add('Književnost', [
 ('Tko je autor knjiga o Pjesmi leda i vatre, prema kojima je snimljena Igra prijestolja?', 'George R. R. Martin', ['J. R. R. Tolkien', 'Brandon Sanderson', 'Patrick Rothfuss']),
 ('Tko je autorica trilogije Igre gladi?', 'Suzanne Collins', ['Stephenie Meyer', 'Veronica Roth', 'J. K. Rowling']),
 ('Tko je napisao roman Da Vincijev kod?', 'Dan Brown', ['Stephen King', 'John Grisham', 'Umberto Eco']),
 ('Koja je južnokorejska književnica 2024. dobila Nobelovu nagradu za književnost?', 'Han Kang', ['Annie Ernaux', 'Olga Tokarczuk', 'Louise Glück']),
 ('Tko je napisao znanstvenofantastični roman Dina (Dune)?', 'Frank Herbert', ['Isaac Asimov', 'Arthur C. Clarke', 'Philip K. Dick']),
])
drop('Umjetnost', [3,57,58,59,16,75,82,83,84,85,108,109,43,44,45])
add('Umjetnost', [
 ('Koji je britanski ulični umjetnik poznat po anonimnosti i satiričnim muralima?', 'Banksy', ['Shepard Fairey', 'Keith Haring', 'Jean-Michel Basquiat']),
 ('Čije se djelo Djevojčica s balonom 2018. djelomično samouništilo nakon aukcije?', 'Banksyja', ['Jeffa Koonsa', 'Damiena Hirsta', 'Yayoi Kusame']),
 ('Koji je Leonardov „Salvator Mundi“ 2017. prodan za oko 450 milijuna dolara, najviše za neku sliku?', 'Salvator Mundi', ['Mona Lisa', 'Dama s hermelinom', 'Vitruvijev čovjek']),
 ('Čije je djelo Comedian, banana zalijepljena trakom za zid, 2024. prodano za 6,2 milijuna dolara?', 'Maurizia Cattelana', ['Banksyja', 'Jeffa Koonsa', 'Damiena Hirsta']),
 ('Koji je američki umjetnik poznat po velikim blještavim skulpturama balon-pasa od nehrđajućeg čelika?', 'Jeff Koons', ['Andy Warhol', 'Keith Haring', 'Richard Serra']),
])
drop('Mitologija', [27,52,74,85,104,50])
add('Mitologija', [
 ('Koja je videoigra iz 2018. Kratosa preselila u nordijsku mitologiju?', 'God of War', ['Hades', 'Skyrim', 'Elden Ring']),
 ('U kojoj videoigri iz 2020. Zagreus pokušava pobjeći iz grčkog podzemlja?', 'Hades', ['Hollow Knight', 'Celeste', 'Dead Cells']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Matematika i brojevi','Književnost','Umjetnost','Mitologija']: print(c, len(C[c]))
