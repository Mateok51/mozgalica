# Dodavanje (ne zamjena!) sadržaja mini-igara iz newq/mini-*.txt u v3/data.json: python3 newq/mini_merge.py [--write]
# sort: a | b || A,A,A,A || B,B,B,B   link: naslov || x = y ; ... (4)   tf: T|N | tvrdnja   facts: redak
# who: kat | trag ; trag ; trag ; trag | točan | kriv | kriv | kriv   emoji: kat | emoji | točan | kriv x3
# order: naslov | lo | hi | A=v ; B=v ; C=v ; D=v (uzlazno)   hilo: pitanje | veći=v | manji=v   maj: pitanje | opcija | opcija ...
import json, sys, re, os, unicodedata
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); NQ = SP + '/newq'
d = json.load(open(SP + '/v3/data.json')); err = []
norm = lambda t: re.sub(r'[^a-z0-9čćđšž]', '', unicodedata.normalize('NFC', str(t).lower()))
def lines(f):
    p = f'{NQ}/mini-{f}.txt'
    return [(n, l.strip()) for n, l in enumerate(open(p, encoding='utf-8'), 1) if l.strip() and not l.startswith('#')] if os.path.exists(p) else []
add = {k: [] for k in ['sort', 'link', 'tf', 'facts', 'who', 'emoji', 'order', 'hilo', 'maj']}
def known(k, f): return {f(x) for x in d[k]}
sk = known('sort', lambda x: norm(x['a'] + x['b']))
for n, l in lines('sort'):
    h, A, B = [x.strip() for x in l.split('||')]; a, b = [x.strip() for x in h.split('|')]
    A = [x.strip() for x in A.split(',')]; B = [x.strip() for x in B.split(',')]
    if len(A) != 4 or len(B) != 4 or len(set(A + B)) != 8: err.append(f'sort:{n}'); continue
    if norm(a + b) in sk: err.append(f'sort:{n} duplikat'); continue
    add['sort'].append({'a': a, 'b': b, 'A': A, 'B': B})
lk = known('link', lambda x: norm(x['t']))
for n, l in lines('link'):
    t, ps = [x.strip() for x in l.split('||')]; p = [[y.strip() for y in x.split(' = ')] for x in ps.split(' ; ')]
    if len(p) != 4 or any(len(x) != 2 for x in p) or len({x[1] for x in p}) != 4 or len({x[0] for x in p}) != 4: err.append(f'link:{n}'); continue
    if norm(t) in lk: err.append(f'link:{n} duplikat'); continue
    add['link'].append({'t': t, 'p': p})
tk = known('tf', lambda x: norm(x[0]))
for n, l in lines('tf'):
    v, t = l.split(' | ', 1)
    if v not in ('T', 'N'): err.append(f'tf:{n}'); continue
    if norm(t) in tk: err.append(f'tf:{n} duplikat'); continue
    tk.add(norm(t)); add['tf'].append([t, v == 'T'])
fk = known('facts', norm)
for n, l in lines('facts'):
    if norm(l) in fk: err.append(f'facts:{n} duplikat'); continue
    add['facts'].append(l)
wk = known('who', lambda x: norm(x['o'][x['a']]))
for n, l in lines('who'):
    p = [x.strip() for x in l.split(' | ')]
    cl = [x.strip() for x in p[1].split(' ; ')] if len(p) == 6 else []
    if len(p) != 6 or len(cl) != 4 or len(set(p[2:])) != 4: err.append(f'who:{n}'); continue
    if norm(p[2]) in wk: err.append(f'who:{n} duplikat'); continue
    add['who'].append({'c': p[0], 'cl': cl, 'o': p[2:], 'a': 0})
ek = known('emoji', lambda x: x['e'].strip())
for n, l in lines('emoji'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) != 6 or len(set(p[2:])) != 4: err.append(f'emoji:{n}'); continue
    if p[1] in ek: err.append(f'emoji:{n} duplikat'); continue
    ek.add(p[1])
    add['emoji'].append({'c': p[0], 'e': p[1], 'o': p[2:], 'a': 0})
ok = known('order', lambda x: norm(x['t']))
for n, l in lines('order'):
    p = [x.strip() for x in l.split(' | ')]
    it = [x.split('=', 1) for x in p[3].split(' ; ')] if len(p) == 4 else []
    if len(p) != 4 or len(it) != 4 or any(len(x) != 2 for x in it): err.append(f'order:{n}'); continue
    if norm(p[0]) in ok: err.append(f'order:{n} duplikat'); continue
    add['order'].append({'t': p[0], 'lo': p[1], 'hi': p[2], 'p': [x[0].strip() for x in it], 'v': [x[1].strip() for x in it]})
hk = known('hilo', lambda x: norm(x['q'] + x['a'] + x['b']))
for n, l in lines('hilo'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) != 3 or '=' not in p[1] or '=' not in p[2]: err.append(f'hilo:{n}'); continue
    a, va = p[1].split('=', 1); b, vb = p[2].split('=', 1)
    if norm(p[0] + a + b) in hk: err.append(f'hilo:{n} duplikat'); continue
    add['hilo'].append({'q': p[0], 'a': a.strip(), 'b': b.strip(), 'va': va.strip(), 'vb': vb.strip()})
mk = known('maj', lambda x: norm(x['q']))
for n, l in lines('maj'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) < 3 or len(p) > 5: err.append(f'maj:{n}'); continue
    if norm(p[0]) in mk: err.append(f'maj:{n} duplikat'); continue
    add['maj'].append({'q': p[0], 'o': p[1:]})
print('greške:', err); print({k: len(v) for k, v in add.items()}, '| T u tf:', sum(1 for x in add['tf'] if x[1]), 'od', len(add['tf']))
if '--write' in sys.argv and not err:
    json.dump(d, open(SP + '/v3/data.backup-mini.json', 'w'), ensure_ascii=False)
    for k, v in add.items(): d[k].extend(v)
    json.dump(d, open(SP + '/v3/data.json', 'w'), ensure_ascii=False); print('ZAPISANO')
