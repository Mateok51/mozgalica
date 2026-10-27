# UX popravci nakon igranja (lanac: sf.py → ux.py)
# 1) Bez projekcije piramide tijekom regularnog dijela: početne stepenice otkrivaju se tek na početku piramide.
#    Ostaje najava približavanja finala ("Posljednji poziv") i "Posljednja prilika" prije zadnjeg pitanja.
import subprocess, sys
SP = '/root/mozgalica'
subprocess.run([sys.executable, SP + '/v3/sf.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---------- 1) projekcija piramide ----------
rep("    if (FC_PH[ph] && fcOn()) v.pj = { P: fcProj(), left: fcLeft(), max: cfg.pyrReq.length };\n", "")
a = s.index("      if (!prev) return;\n      const ids = Object.keys(pj).filter((id) => prev[id]);")
b = s.index("      if (left === 1) { const c = cand('PJ_LAST'")
s = s[:a] + "      // bez komentara o projiciranim stepenicama (početne pozicije su iznenađenje piramide)\n" + s[b:]
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('UX 1 (bez projekcije) OK')
