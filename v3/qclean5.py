# Jednokratno čišćenje 5 (v58): Olimpijske igre, Eurosong, Moda, Društvene igre i igračke.
import json, random
P = '/root/mozgalica/v3/data.json'
d = json.load(open(P, encoding='utf-8')); C = d['cats']; rnd = random.Random(61)
def drop(cat, idx): C[cat] = [q for i, q in enumerate(C[cat]) if i not in set(idx)]
def add(cat, items):
    have = {x['q'] for l in C.values() for x in l}
    for q, a, w in items:
        assert q not in have and len({a, *w}) == 4, q
        o = list(w); pos = rnd.randrange(4); o.insert(pos, a); C[cat].append({'q': q, 'o': o, 'a': pos})
drop('Olimpijske igre', [16,17,49,50,52,60,82,6,5,95,96,98,99,110,112,113,109,59,43,92])
add('Olimpijske igre', [
 ('Koji je grad domaćin Ljetnih olimpijskih igara 2028.?', 'Los Angeles', ['Brisbane', 'Toronto', 'Budimpešta']),
 ('Koji je francuski plivač osvojio četiri zlata u Parizu 2024. pred domaćom publikom?', 'Léon Marchand', ['Caeleb Dressel', 'Adam Peaty', 'Thomas Ceccon']),
 ('U kojoj je disciplini Armand Duplantis više puta obarao svjetski rekord i osvojio zlato u Parizu 2024.?', 'Skok s motkom', ['Skok u vis', 'Troskok', 'Bacanje koplja']),
 ('Koji je Amerikanac u fotofinišu osvojio 100 m u Parizu 2024.?', 'Noah Lyles', ['Kishane Thompson', 'Fred Kerley', 'Trayvon Bromell']),
])
drop('Eurosong', [5, 9, 13, 18, 42, 46, 2])
add('Eurosong', [
 ('Kojom je pjesmom Baby Lasagna 2024. u Malmöu osvojio drugo mjesto za Hrvatsku?', 'Rim Tim Tagi Dim', ['Mama ŠČ!', 'Tick-Tock', 'Crazy']),
])
drop('Moda', [3,4,10,11,12,13,14,17,18,22,25,26,27,29,31,36,39,41,42,45,50,51,52,53,58,59,61,62,63,64,65,71,76,77,78,79,80,81,83,84,85,86,87,88,89,90,91])
add('Moda', [
 ('Koja je plastična obuća s rupicama postala hit 2000-ih i ponovno 2020-ih?', 'Crocs', ['Birkenstock', 'Havaianas', 'Converse']),
 ('Koja je njemačka marka sandala s anatomskim uloškom 2023. izašla na burzu?', 'Birkenstock', ['Dr. Scholl’s', 'Clarks', 'Geox']),
 ('Koja je kineska internetska trgovina brze mode poznata po iznimno niskim cijenama?', 'Shein', ['Zalando', 'ASOS', 'Uniqlo']),
 ('Koji je glazbenik od 2023. kreativni direktor muške linije Louis Vuittona?', 'Pharrell Williams', ['Kanye West', 'Drake', 'Travis Scott']),
 ('Tko je osnovao modnu marku Off-White?', 'Virgil Abloh', ['Kanye West', 'Pharrell Williams', 'Tom Ford']),
 ('Koji je španjolski poduzetnik osnivač Zare, jedan od najbogatijih ljudi svijeta?', 'Amancio Ortega', ['Bernard Arnault', 'Ingvar Kamprad', 'Karl Lagerfeld']),
 ('Koji je njemački dizajner bio kreativni direktor Chanela do 2019.?', 'Karl Lagerfeld', ['Yves Saint Laurent', 'Tom Ford', 'Hedi Slimane']),
 ('Koja je pjevačica osnovala kozmetičku marku Fenty Beauty?', 'Rihanna', ['Beyoncé', 'Lady Gaga', 'Ariana Grande']),
 ('Koja je Nikeova linija tenisica nazvana po košarkaškoj legendi?', 'Air Jordan', ['Air Max', 'Air Force 1', 'Dunk']),
])
drop('Društvene igre i igračke', [0,1,2,3,4,14,15,17,24,27,30,32,34,36,38,45,47,55,56,57,59,71,72,73,74,78,79,81,82,87,12,66,68,69])
add('Društvene igre i igračke', [
 ('Koja je društvena igra o pticama, iz 2019., osvojila brojne nagrade?', 'Wingspan', ['Catan', 'Azul', 'Pandemic']),
 ('Koja je kooperativna igra u kojoj igrači zajedno zaustavljaju širenje bolesti?', 'Pandemic', ['Risk', 'Cluedo', 'Carcassonne']),
 ('Koja grupna igra s tajnim ulogama uključuje građane koji traže skrivene mafijaše?', 'Mafija', ['Tabu', 'Activity', 'Jamb']),
 ('Koja je kartaška igra s mačkama i eksplozijama 2015. oborila rekorde na Kickstarteru?', 'Exploding Kittens', ['Uno', 'Dixit', 'Jenga']),
 ('Koja se igračka koja se vrti među prstima proširila 2017.?', 'Fidget spinner', ['Jo-jo', 'Rubikova kocka', 'Tamagotchi']),
 ('Koja je silikonska igračka s mjehurićima koje se utiskuju postala hit 2021.?', 'Pop it', ['Slime', 'Furby', 'Jo-jo']),
 ('Koja je plišana figurica oštrih zubića postala svjetski hit 2025.?', 'Labubu', ['Hello Kitty', 'Furby', 'Pikachu']),
])
open(P, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
for c in ['Olimpijske igre','Eurosong','Moda','Društvene igre i igračke']: print(c, len(C[c]))
