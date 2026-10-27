import json,sys,collections
d=json.load(open(sys.argv[1]))
ex=json.load(open(sys.argv[2]))
exq={x['q'].lower() for v in ex['cats'].values() for x in v}
ok=True
for c,v in d['cats'].items():
    cnt=collections.Counter()
    for x in v:
        o=x['o']
        if len(o)!=4 or len(set(o))!=4 or x['a'] not in range(4): print('BAD',x);ok=False
        if len(x['q'])>110: print('LONGQ',len(x['q']),x['q'])
        for y in o:
            if len(y)>30: print('LONGO',y)
        if x['q'].lower() in exq: print('DUP',x['q'])
        cnt[x['a']]+=1
    qs=[x['q'] for x in v]
    if len(set(qs))!=len(qs): print('DUP in cat',c)
    print(c,len(v),dict(sorted(cnt.items())))
print('OK' if ok else 'FAIL')
