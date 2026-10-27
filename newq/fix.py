import sys
def fix(f, rules):
    L = open(f).read().split('\n'); out = []
    used = set()
    for l in L:
        hit = None
        for k, v in rules.items():
            if l.startswith(k): hit = (k, v); break
        if hit:
            used.add(hit[0])
            if hit[1] != 'DELETE': out.append(hit[1])
        else: out.append(l)
    miss = [k for k in rules if k not in used]
    if miss: print(f, 'NIJE NAĐENO:', miss)
    open(f, 'w').write('\n'.join(out))
