# Provjera i spajanje JEDNE kategorije pitanja: python3 newq/qmerge.py <datoteka bez .txt> "<Kategorija>" [--write]
# Format retka: pitanje | točan | krivi | krivi | krivi (točan se miješa na nasumično mjesto). Duplikate (isto pitanje) preskače.
import json, sys, re, random, os, unicodedata
SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
f, cat = sys.argv[1], sys.argv[2]
d = json.load(open(SP + '/v3/data.json'))
norm = lambda t: re.sub(r'[^a-z0-9čćđšž]', '', unicodedata.normalize('NFC', t.lower()))
seen = {norm(q['q']) for c in d['cats'].values() for q in c}
random.seed(sum(map(ord, f)) * 31 + len(d['cats'].get(cat, [])))
err, out, dup = [], [], 0
pos = []  # uravnotežen položaj točnog odgovora
for n, line in enumerate(open(f'{SP}/newq/{f}.txt', encoding='utf-8'), 1):
    line = line.strip()
    if not line or line.startswith('#'): continue
    p = [x.strip() for x in line.split(' | ')]
    if len(p) != 5: err.append(f'{n}: dijelova {len(p)}'); continue
    q, o = p[0], p[1:]
    if len({x.lower() for x in o}) != 4: err.append(f'{n}: isti odgovori'); continue
    if not q.endswith('?') or '?' in q[:-1]: err.append(f'{n}: upitnik: {q[:50]}')
    if any(len(x) > 48 for x in o): err.append(f'{n}: predug odgovor')
    if len(q) > 150: err.append(f'{n}: predugo pitanje ({len(q)})')
    if norm(q) in seen: dup += 1; print('duplikat:', q); continue
    seen.add(norm(q))
    if not pos: pos = [0, 1, 2, 3]; random.shuffle(pos)
    a = pos.pop(); c = o[0]; rest = o[1:]; random.shuffle(rest); rest.insert(a, c); out.append({'q': q, 'o': rest, 'a': a})
print('greške:', len(err), '| duplikata:', dup, '| novih:', len(out), '| prije:', len(d['cats'].get(cat, [])))
print('\n'.join(err))
from collections import Counter
print('položaj točnog:', sorted(Counter(x['a'] for x in out).items()), '| prosj. duljina pitanja:', round(sum(len(x['q']) for x in out) / max(1, len(out))))
if '--write' in sys.argv and not err:
    json.dump(d, open(SP + '/v3/data.backup.json', 'w'), ensure_ascii=False)
    d['cats'].setdefault(cat, []).extend(out)
    json.dump(d, open(SP + '/v3/data.json', 'w'), ensure_ascii=False)
    print('ZAPISANO; ukupno u kategoriji:', len(d['cats'][cat]))
