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

# ---------- 3) šapat: igrač vidi koje je slovo šapnuo (za oznaku na kartici odgovora) ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("      if (G.ph === 'question') { o.k.wsent = p.whS === G.s ? 1 : 0; o.k.bt = p.betray ? 1 : 0; o.k.can = 1; }",
    "      if (G.ph === 'question') { o.k.wsent = p.whS === G.s ? 1 : 0; o.k.bt = p.betray ? 1 : 0; o.k.can = 1; if (mate.wh && mate.wh.from === pid && mate.wh.s === G.s) o.k.wc = mate.wh.c; }")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('UX 3 (šapat: poslano slovo) OK')

# ---------- 4) paktovi bez obaveznih faza: prirodni trenuci (mirne faze, dvoboj drugih), ponude traju 2 pitanja ----------
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
# bez Vremena za dogovore u običnim partijama (ostaje samo u testnom načinu s botovima, gdje ne čeka nikoga osim tebe)
rep("  sf: { on: true, at: [3, 6, 8], atBot: [3, 5, 7, 8], dur: 20, soloMax: 600, inMax: 2,",
    "  // offerQ: koliko odigranih običnih pitanja ponuda (pakt, obračun) čeka odgovor — dovoljno mirnog vremena između pitanja\n"
    "  sf: { on: true, at: [], atBot: [3, 5, 7], dur: 20, soloMax: 600, inMax: 2, offerQ: 2,")
# tko je zauzet: dok traje dvoboj, zauzeta su samo dva dvobojaša — ostali mogu tajno pregovarati
rep("  const sfPeople = () => list().filter((p) => !p.bot || bsOn());",
    "  const sfPeople = () => list().filter((p) => !p.bot || bsOn());\n"
    "  const sfBusy = (p) => (G.ph === 'duel' ? !!(G.du && p && (p.pid === G.du.a || p.pid === G.du.b)) : !!SF_BUSY[G.ph]);")
rep("(!sfOn() || !SF_BUSY[G.ph]);", "(!sfOn() || !SF_BUSY[G.ph] || G.ph === 'duel');")
rep("    if (a.k === 'tkAccept' || a.k === 'tkDecline') {",
    "    if (sfOn() && sfBusy(p) && a.k !== 'whisper' && a.k.slice(0, 2) !== 'tk') return false;   // nitko ne odlučuje dok odgovara\n"
    "    if (a.k === 'tkAccept' || a.k === 'tkDecline') {")
# izdaja: priprema u bilo kojoj mirnoj fazi, zaključava se kad pitanje počne (izvršava se nakon prvog sljedećeg običnog pitanja)
rep("        if (!pactOf(p) || G.ph !== (sfOn() ? 'deal' : 'question')) break;",
    "        if (!pactOf(p) || (sfOn() ? sfBusy(p) || G.inFinale || G.ph === 'lobby' || G.ph === 'final' : G.ph !== 'question')) break;")
rep("      if (sfOn() && p.betray && G.ph !== 'deal') o.k.btl = 1;",
    "      if (sfOn() && !sfBusy(p) && !G.inFinale) { o.k.cb = 1; o.k.bt = p.betray ? 1 : 0; }\n"
    "      if (sfOn() && p.betray && sfBusy(p)) o.k.btl = 1;")
# ponude: istječu nakon offerQ odigranih običnih pitanja (i dalje i na kraju Vremena za dogovore u testnom načinu)
rep("born: G.dealN || 0, ghost }", "born: G.dealN || 0, bq: G.bdone || 0, ghost }")
rep("until: sfOn() ? Infinity : now() + cfg.rcOffer * 1000, born: G.dealN || 0,", "until: sfOn() ? Infinity : now() + cfg.rcOffer * 1000, born: G.dealN || 0, bq: G.bdone || 0,")
rep("    pactAfterQuestion();\n", "    pactAfterQuestion();\n    sfExpireQ();\n")
rep("  // kraj faze: istječu ponude", """  function sfExpireQ() {
    if (!sfOn()) return;
    const n = G.bdone || 0, q = cfg.sf.offerQ || 2;
    let any = false;
    for (const o of G.offers) if (n - (o.bq || 0) >= q) { o.until = 0; any = true; }
    for (const o of G.rc.offers) if (n - (o.bq || 0) >= q) { o.until = 0; any = true; }
    if (any) { cleanOffers(); rcClean(); }
  }
  // kraj faze: istječu ponude""")
# botovi (testni način): odgovaraju i dok traje tuđi dvoboj
rep("  function sfBotSoon() { if (bsOn() && !SF_BUSY[G.ph]) {", "  function sfBotSoon() { if (bsOn() && (!SF_BUSY[G.ph] || G.ph === 'duel')) {")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('UX 4 (paktovi u prirodnim trenucima) OK')
