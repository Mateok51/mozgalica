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

# ---------- 5) novi balans paktova, bez šaputanja ----------
# riznica: oboje točno +100, jedan točno +40; izdaja tek nakon 2 zajednička pitanja; krađa 8 % (najviše 300);
# dvostruka izdaja: riznica propada, nitko nikome ne krade; odanost +40 % (nepromijenjeno), dijeli se prije piramide
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
rep("pactBonus: 75, pactSteal: 0.25, pactDouble: 0.2,", "pactBonus: 100, pactOne: 40, pactMinQ: 2, pactSteal: 0.08, pactStealMax: 300, pactDouble: 0,")
rep("""      const both = a.ans === G.q.a && b.ans === G.q.a;
      if (both) { k.tre += cfg.pactBonus; k.grew = G.s; note(a, '💰 +' + cfg.pactBonus + ' u riznicu!', 'tre'); note(b, '💰 +' + cfg.pactBonus + ' u riznicu!', 'tre'); }""",
"""      const ra = a.ans === G.q.a, rb = b.ans === G.q.a, add = ra && rb ? cfg.pactBonus : ra || rb ? (cfg.pactOne || 0) : 0;
      k.n = (k.n || 0) + 1;   // zajednički odigrana pitanja (za pravilo najmanje pactMinQ prije izdaje)
      if (add) { k.tre += add; k.grew = G.s; note(a, '💰 +' + add + ' u riznicu!', 'tre'); note(b, '💰 +' + add + ' u riznicu!', 'tre'); }""")
# krađa: 8 % partnerovih trenutačnih bodova, najviše 300, nikad ispod nule
rep("        const st = Math.max(0, Math.round(V.score * cfg.pactSteal));",
    "        const st = Math.max(0, Math.min(V.score, Math.round(V.score * cfg.pactSteal), cfg.pactStealMax != null ? cfg.pactStealMax : Infinity));")
# izdaja tek nakon pactMinQ zajedničkih pitanja
rep("        if (!pactOf(p) || (sfOn() ? sfBusy(p) ||", "        if (!pactOf(p) || (a.on && (pactOf(p).n || 0) < (cfg.pactMinQ || 0)) || (sfOn() ? sfBusy(p) ||")
rep("      if (sfOn() && !sfBusy(p) && !G.inFinale) { o.k.cb = 1; o.k.bt = p.betray ? 1 : 0; }",
    "      if (sfOn() && !sfBusy(p) && !G.inFinale && (k.n || 0) >= (cfg.pactMinQ || 0)) { o.k.cb = 1; o.k.bt = p.betray ? 1 : 0; }\n"
    "      if ((k.n || 0) < (cfg.pactMinQ || 0)) o.k.wait = (cfg.pactMinQ || 0) - (k.n || 0);")
# botovi: scenarij izdaje čeka dok izdaja ne postane dopuštena
rep("        if (sc && sc !== 'loyal') G.scn = null;\n        botPact(b, { k: 'betray', on: bt });",
    "        const okBt = botPact(b, { k: 'betray', on: bt });\n        if (sc && sc !== 'loyal' && okBt) G.scn = null;")
rep("        if (G.ph === 'deal') { mate.sfLoyal = 0; botPact(mate, { k: 'betray', on: true }); G.scn = null; }",
    "        if (G.ph === 'deal') { mate.sfLoyal = 0; if (botPact(mate, { k: 'betray', on: true })) G.scn = null; }")
# šaputanje uklonjeno u potpunosti (akcija, odgovor+šapat, botovi, scenarij)
rep("      case 'whisper': {\n", "      case 'whisper': {\n        break;   // šaputanje je uklonjeno\n")
rep("        if (inp.w === 1 && G.ph === 'question') sfWhisper(p, c);   // odgovori i šapni: ista poruka, isti odgovor\n", "")
rep("        if (G.ph === 'question' && b.wh && b.wh.s === G.s && opts.includes(b.wh.c) && Math.random() < 0.6) return { s, c: b.wh.c, t: now() - G.startedAt };\n", "")
rep("        if (accept(b, botInput(b))) { if (G.ph === 'question') sfBotWhisper(b); if (allDone()) endPhase(); else onChange(); }",
    "        if (accept(b, botInput(b))) { if (allDone()) endPhase(); else onChange(); }")
rep("      case 'whisper':\n        if (!botMate)", "      case 'whisper':\n        return { ok: 0, msg: 'Šaputanje je uklonjeno iz igre.' };\n        if (!botMate)")
rep("      if (G.ph === 'question') { o.k.wsent = p.whS === G.s ? 1 : 0; o.k.bt = p.betray ? 1 : 0; o.k.can = 1; if (mate.wh && mate.wh.from === pid && mate.wh.s === G.s) o.k.wc = mate.wh.c; }",
    "      if (G.ph === 'question') o.k.bt = p.betray ? 1 : 0;")
rep("      if (p.wh && p.wh.s === G.s) o.k.wh = p.wh.c;\n", "")
# legende: dvostruka izdaja bez krađe
rep("'Oboje vade noževe u istom trenutku!', 'Gubici: −' + fmtN(e.la) + ' i −' + bodN(e.lb)", "'Oboje vade noževe u istom trenutku!', 'Riznica ' + bodN(e.tre) + ' propada'")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('UX 5 (balans paktova, bez šaputanja) OK')
