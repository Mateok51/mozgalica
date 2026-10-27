# Sadržaj mini-igara -> v3/data.json (who, emoji, order, hilo, maj); zamjenjuje postojeće liste
import json, os, sys
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); NQ = SP + '/newq'
d = json.load(open(SP + '/v3/data.json')); err = []
def lines(f): return [(n, l.strip()) for n, l in enumerate(open(f'{NQ}/{f}.txt'), 1) if l.strip() and not l.startswith('#')]
who = []
for n, l in lines('who'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) != 6: err.append(f'who:{n}'); continue
    cl = [x.strip() for x in p[1].split(' ; ')]
    if len(cl) != 4 or len(set(p[2:])) != 4: err.append(f'who:{n} tragovi/odgovori'); continue
    who.append({'c': p[0], 'cl': cl, 'o': p[2:], 'a': 0})
emoji = []
for n, l in lines('emoji'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) != 6 or len(set(p[2:])) != 4: err.append(f'emoji:{n}'); continue
    emoji.append({'c': p[0], 'e': p[1], 'o': p[2:], 'a': 0})
order = []
for n, l in lines('order'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) != 4: err.append(f'order:{n}'); continue
    it = [x.split('=', 1) for x in p[3].split(' ; ')]
    if len(it) != 4 or any(len(x) != 2 for x in it): err.append(f'order:{n} stavke'); continue
    order.append({'t': p[0], 'lo': p[1], 'hi': p[2], 'p': [x[0].strip() for x in it], 'v': [x[1].strip() for x in it]})
hilo = []
for n, l in lines('hilo'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) != 3 or '=' not in p[1] or '=' not in p[2]: err.append(f'hilo:{n}'); continue
    a, va = p[1].split('=', 1); b, vb = p[2].split('=', 1)
    if '?' in va + vb: err.append(f'hilo:{n} ?'); continue
    hilo.append({'q': p[0], 'a': a.strip(), 'b': b.strip(), 'va': va.strip(), 'vb': vb.strip()})
maj = []
for n, l in lines('maj'):
    p = [x.strip() for x in l.split(' | ')]
    if len(p) < 3 or len(p) > 5: err.append(f'maj:{n}'); continue
    maj.append({'q': p[0], 'o': p[1:]})
for k in ['who','emoji']:
    for x in locals()[k]:
        if any(len(o) > 44 for o in x['o']): err.append(f'{k} predugo: ' + max(x['o'], key=len))
print('greške', err); print('who', len(who), 'emoji', len(emoji), 'order', len(order), 'hilo', len(hilo), 'maj', len(maj))
if '--write' in sys.argv and not err:
    d.update({'who': who, 'emoji': emoji, 'order': order, 'hilo': hilo, 'maj': maj})
    json.dump(d, open(SP + '/v3/data.json', 'w'), ensure_ascii=False); print('ZAPISANO')
