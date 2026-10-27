"""Spaja existing.json + sve dijelove (*.json osim existing/merged) u merged.json.
Provjerava format, izbacuje duplikate i ispisuje izvještaj."""
import json, glob, os, re, sys, unicodedata
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, 'merged.json')
base = json.load(open(os.path.join(D, 'existing.json'), encoding='utf-8'))
parts = sorted(p for p in glob.glob(os.path.join(D, '*.json'))
               if os.path.basename(p) not in ('existing.json', 'merged.json') and not os.path.basename(p).startswith('fix'))
# ispravci provjeravatelja: fix*.json = {"remove": [tekst pitanja/tvrdnje/naslova], "fix": [{"q": stari tekst, "new": {...}}]}
removed, fixes = set(), {}
for fp in sorted(glob.glob(os.path.join(D, 'fix*.json'))):
    try:
        fd = json.load(open(fp, encoding='utf-8'))
    except Exception as e:
        print('NEISPRAVNA datoteka ispravaka', fp, e); continue
    removed |= {str(x).strip() for x in fd.get('remove', [])}
    for f in fd.get('fix', []):
        if isinstance(f, dict) and isinstance(f.get('q'), str) and isinstance(f.get('new'), dict):
            fixes[f['q'].strip()] = f['new']

def norm(s):
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

problems = []
cats = {}
seen = set()
def add_q(cat, q, src):
    if not isinstance(q, dict) or not isinstance(q.get('q'), str) or not isinstance(q.get('o'), list):
        problems.append((src, cat, 'loš oblik', str(q)[:60])); return
    o = [str(x).strip() for x in q['o']]
    if len(o) != 4 or len(set(x.lower() for x in o)) != 4 or not isinstance(q.get('a'), int) or not 0 <= q['a'] < 4:
        problems.append((src, cat, 'opcije/odgovor', q['q'][:60])); return
    text = q['q'].strip()
    if text in removed:
        return
    if text in fixes:
        nq = fixes.pop(text)
        if isinstance(nq.get('o'), list) and len(nq['o']) == 4 and isinstance(nq.get('a'), int) and 0 <= nq['a'] < 4 and isinstance(nq.get('q'), str):
            text, o, q = nq['q'].strip(), [str(x).strip() for x in nq['o']], {'a': nq['a']}
            if len(set(x.lower() for x in o)) != 4:
                problems.append((src, cat, 'ispravak ima iste opcije', text[:60])); return
        else:
            problems.append((src, cat, 'neispravan ispravak', text[:60])); return
    k = norm(text)
    if k in seen:
        problems.append((src, cat, 'duplikat', text[:60])); return
    seen.add(k)
    cats.setdefault(cat, []).append({'q': text, 'o': o, 'a': q['a']})

for c, qs in base['cats'].items():
    for q in qs: add_q(c, q, 'existing')
extra = {'sort': list(base['sort']), 'link': list(base['link']), 'tf': list(base['tf']), 'facts': list(base['facts'])}
for p in parts:
    try:
        d = json.load(open(p, encoding='utf-8'))
    except Exception as e:
        problems.append((os.path.basename(p), '-', 'neispravan JSON', str(e)[:80])); continue
    for c, qs in (d.get('cats') or {}).items():
        for q in qs: add_q(c.strip(), q, os.path.basename(p))
    for s in d.get('sort') or []:
        ok = isinstance(s, dict) and len(s.get('A', [])) == 4 and len(s.get('B', [])) == 4 and len(set(map(norm, s['A'] + s['B']))) == 8
        (extra['sort'].append(s) if ok and s.get('a') not in removed else problems.append((os.path.basename(p), 'sort', 'loš izazov', str(s)[:60])))
    for l in d.get('link') or []:
        ok = isinstance(l, dict) and len(l.get('p', [])) == 4 and len({norm(x[1]) for x in l['p']}) == 4 and len({norm(x[0]) for x in l['p']}) == 4
        (extra['link'].append(l) if ok and l.get('t') not in removed else problems.append((os.path.basename(p), 'link', 'loš izazov', str(l)[:60])))
    for t in d.get('tf') or []:
        ok = isinstance(t, list) and len(t) == 2 and isinstance(t[0], str) and isinstance(t[1], bool)
        if ok and t[0].strip() not in removed and norm(t[0]) not in {norm(x[0]) for x in extra['tf']}: extra['tf'].append(t)
        elif not ok: problems.append((os.path.basename(p), 'tf', 'loš oblik', str(t)[:60]))
    for f in d.get('facts') or []:
        if isinstance(f, str) and f.strip() not in removed and norm(f) not in {norm(x) for x in extra['facts']}: extra['facts'].append(f)

# naslovi izazova moraju biti jedinstveni (igra ih koristi za prepoznavanje)
def uniq(lst, key):
    out, ks = [], set()
    for x in lst:
        k = norm(key(x))
        if k in ks: continue
        ks.add(k); out.append(x)
    return out
extra['sort'] = uniq(extra['sort'], lambda s: s['a'] + '|' + s['b'])
extra['link'] = uniq(extra['link'], lambda l: l['t'])

merged = {'cats': cats, **extra}
json.dump(merged, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
total = sum(len(v) for v in cats.values())
print('Ukupno pitanja:', total, 'u', len(cats), 'kategorija')
for c, qs in sorted(cats.items(), key=lambda x: -len(x[1])):
    dist = [sum(1 for q in qs if q['a'] == i) for i in range(4)]
    print('  %-28s %4d  raspodjela A-D %s' % (c, len(qs), dist))
print('Razvrstavanja:', len(extra['sort']), ' Spajanja:', len(extra['link']), ' Tvrdnje:', len(extra['tf']), ' Zanimljivosti:', len(extra['facts']))
print('Neiskorišteni ispravci:', len(fixes))
print('Problemi:', len(problems))
for pr in problems[:40]: print('  ', pr)
