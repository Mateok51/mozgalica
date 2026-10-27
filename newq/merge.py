# Provjera formata i spajanje novih pitanja/izazova u v3/data.json (s --write); bez toga samo provjera
import json, sys, re, random, os, unicodedata
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); NQ = SP + '/newq'
d = json.load(open(SP + '/v3/data.json'))
norm = lambda t: re.sub(r'[^a-z0-9čćđšž]', '', unicodedata.normalize('NFC', t.lower()))
key = lambda q, o: norm(q) + '#' + '|'.join(sorted(x.strip().lower() for x in o))
seen = {norm(q['q']) for c in d['cats'].values() for q in c}
seenk = set(); dup = 0
err = []; add = {}
FILES = {'sport': 'Sport', 'nogomet': 'Nogomet', 'knjizevnost': 'Književnost', 'jezici': 'Jezici i riječi', 'matematika': 'Matematika i brojevi',
         'hrvatska': 'Hrvatska', 'opcenito': 'Općenito', 'obicaji': 'Hrvatski običaji i baština', 'rekordi': 'Rekordi i superlativi', 'izumi': 'Izumi i otkrića',
         'serije': 'Serije', 'bajke': 'Bajke i dječje priče', 'igre': 'Društvene igre i igračke', 'moda': 'Moda', 'vrijeme': 'Vrijeme i klima', 'brendovi': 'Brendovi i logotipi'}
random.seed(7)
for f, cat in FILES.items():
    out = []
    if not os.path.getsize(f'{NQ}/{f}.txt'): continue
    for n, line in enumerate(open(f'{NQ}/{f}.txt'), 1):
        line = line.strip()
        if not line or line.startswith('#'): continue
        parts = [p.strip() for p in line.split(' | ')]
        if len(parts) != 5: err.append(f'{f}:{n} dijelova {len(parts)}'); continue
        q, opts = parts[0], parts[1:]
        if len(set(o.strip().lower() for o in opts)) != 4: err.append(f'{f}:{n} isti odgovori'); continue
        if '?' in q[:-1] or not q.endswith('?'): err.append(f'{f}:{n} upitnik: {q[:60]}')
        if any(len(o) > 48 for o in opts): err.append(f'{f}:{n} predug odgovor: ' + max(opts, key=len))
        k = key(q, opts)
        if norm(q) in seen or k in seenk: dup += 1; continue
        seenk.add(k)
        o = opts[:]; correct = o[0]; random.shuffle(o)
        out.append({'q': q, 'o': o, 'a': o.index(correct)})
    add[cat] = out
    d['cats'].setdefault(cat, [])
sorts = []
for n, line in enumerate(open(NQ + '/sort.txt'), 1):
    if '||' not in line: continue
    h, A, B = [x.strip() for x in line.split('||')]
    a, b = [x.strip() for x in h.split('|')]
    A = [x.strip() for x in A.split(',')]; B = [x.strip() for x in B.split(',')]
    if len(A) != 4 or len(B) != 4 or len(set(A + B)) != 8: err.append(f'sort:{n} {h}'); continue
    sorts.append({'a': a, 'b': b, 'A': A, 'B': B})
links = []
for n, line in enumerate(open(NQ + '/link.txt'), 1):
    if '||' not in line: continue
    t, ps = [x.strip() for x in line.split('||')]
    p = [[y.strip() for y in x.split(' = ')] for x in ps.split(' ; ')]
    if len(p) != 4 or any(len(x) != 2 for x in p) or len({x[1] for x in p}) != 4: err.append(f'link:{n} {t}'); continue
    links.append({'t': t, 'p': p})
tfs = []; tseen = {norm(x[0]) for x in d['tf']}
for n, line in enumerate(open(NQ + '/tf.txt'), 1):
    line = line.strip()
    if not line: continue
    v, t = line.split(' | ', 1)
    if v not in ('T', 'N'): err.append(f'tf:{n}'); continue
    if norm(t) in tseen: err.append(f'tf:{n} duplikat {t}'); continue
    tseen.add(norm(t)); tfs.append([t, v == 'T'])
facts = [l.strip() for l in open(NQ + '/facts.txt') if l.strip()]
print('greške:', len(err), '| preskočeni duplikati:', dup); print('\n'.join(err))
print({k: len(v) for k, v in add.items()}, 'sort', len(sorts), 'link', len(links), 'tf', len(tfs), 'T', sum(1 for x in tfs if x[1]), 'facts', len(facts))
if '--write' in sys.argv and not err:
    json.dump(d, open(SP + '/v3/data.before-' + str(len(d['cats'])) + '.json', 'w'), ensure_ascii=False)
    for c, qs in add.items(): d['cats'][c].extend(qs)
    d['sort'].extend(sorts); d['link'].extend(links); d['tf'].extend(tfs); d['facts'].extend(facts)
    json.dump(d, open(SP + '/v3/data.json', 'w'), ensure_ascii=False, indent=None)
    print('ZAPISANO')
