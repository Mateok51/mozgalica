# Posljednji poziv — projekcija početka piramide (lanac: rc.py → fc.py)
import subprocess, sys
SP = '/tmp/claude-0/-home-claude/d0049d8f-34eb-5d03-b489-fe414f5ca31b/scratchpad'
subprocess.run([sys.executable, SP + '/v3/rc.py'], check=True)
s = open(SP + '/v3/engine.js', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)

rep("  rcStake: 200,", "  // posljednji poziv: koliko zadnjih običnih pitanja prije piramide prikazuje projekciju početka\n  fcLast: 3,\n  rcStake: 200,")
# ---------- 1) jedan izračun početka piramide: čista funkcija za stvarni početak i za projekciju ----------
rep("""  function pyrStart() {
    const ps = list(), n = ps.length, top = Math.max(0, ...ps.map((p) => p.score)), sc = ps.map((p) => p.score);
    for (const p of ps) {
      const better = sc.filter((x) => x > p.score).length, same = sc.filter((x) => x === p.score).length;
      const rn = n > 1 ? 1 - (better + (same - 1) / 2) / (n - 1) : 1, gn = top > 0 ? p.score / top : 0;
      p.fu = top > 0 ? Math.max(0, Math.min(cfg.pyrMaxStart, Math.round((cfg.pyrRankW * rn + (1 - cfg.pyrRankW) * gn) * cfg.pyrMaxStart))) : 0;
      p.fstep""", """  // bodovi svih igrača → početne jedinice napretka (isti redoslijed); koristi je i projekcija "Posljednjeg poziva"
  function pyrUnitsOf(sc) {
    const n = sc.length, top = Math.max(0, ...sc);
    return sc.map((x) => {
      const better = sc.filter((y) => y > x).length, same = sc.filter((y) => y === x).length;
      const rn = n > 1 ? 1 - (better + (same - 1) / 2) / (n - 1) : 1, gn = top > 0 ? x / top : 0;
      return top > 0 ? Math.max(0, Math.min(cfg.pyrMaxStart, Math.round((cfg.pyrRankW * rn + (1 - cfg.pyrRankW) * gn) * cfg.pyrMaxStart))) : 0;
    });
  }
  function pyrStart() {
    const ps = list(), U = pyrUnitsOf(ps.map((p) => p.score));
    for (const [i, p] of ps.entries()) {
      p.fu = U[i];
      p.fstep""")

# ---------- 2) posljednji poziv: aktivan kad ostane fcLast običnih pitanja (iz stvarnog plana) ----------
rep("""  function scoreQuestion() {
    const before = paceSnap();""", """  // koliko običnih pitanja (bitaka) još nije odigrano; projekcija samo ako partija ima piramidu
  const fcTotal = () => plan.filter((it) => it.t === 'battle').length;
  const fcLeft = () => Math.max(0, fcTotal() - (G.bdone || 0));
  const fcOn = () => plan.some((it) => it.t === 'finale') && !G.inFinale && G.ph !== 'lobby' && G.ph !== 'final' && (G.bdone || 0) >= 1 && fcLeft() <= cfg.fcLast && fcLeft() >= 1;   // nakon zadnjeg pitanja nema projekcije: stvarni raspored ostaje iznenađenje piramide
  // projekcija: trenutni javni (već obračunati) bodovi kroz isti izračun kao stvarni početak; bez skrivenih riznica
  function fcProj() {
    const ps = list(), U = pyrUnitsOf(ps.map((p) => p.score)), o = {};
    ps.forEach((p, i) => { const so = stepOf(U[i]); o[p.pid] = [so.s, so.p, so.r, U[i]]; });
    return o;
  }
  function scoreQuestion() {
    G.bdone = (G.bdone || 0) + 1;
    const before = paceSnap();""")
rep("    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null; G.leg = null; G.crownWin = null;\n",
    "    G.pi = -1; G.qn = 0; G.inFinale = false; G.win = null; G.leg = null; G.crownWin = null; G.bdone = 0;\n")
rep("    if (ph === 'reveal' && G.rc && G.rc.res) v.rcr = G.rc.res;", """    if (ph === 'reveal' && G.rc && G.rc.res) v.rcr = G.rc.res;
    // posljednji poziv: projekcija samo između pitanja (nikad tijekom odgovaranja)
    if (FC_PH[ph] && fcOn()) v.pj = { P: fcProj(), left: fcLeft(), max: cfg.pyrReq.length };""")
rep("""  function pactsOn() { return !!G.opt.pacts; }""", """  const FC_PH = { vote: 1, voteResult: 1, power: 1, cast: 1, reveal: 1, bet: 1, betray: 1, intro: 1, howto: 1, sortReveal: 1, linkReveal: 1, orderReveal: 1, hiloReveal: 1, blitzReveal: 1, majReveal: 1, duelResult: 1, moment: 1 };
  function pactsOn() { return !!G.opt.pacts; }""")

# ---------- 3) krčma: najava i stvarne promjene projekcije (ne svaki mali pomak) ----------
rep("""      PJ_NONE: null,""" if "PJ_NONE" in s else """      RIVAL_AGAIN: [['⚔️ Opet njih dvoje', '{A} → {B}'], ['⚔️ Stari računi', '{A} opet cilja: {B}']],""", """      RIVAL_AGAIN: [['⚔️ Opet njih dvoje', '{A} → {B}'], ['⚔️ Stari računi', '{A} opet cilja: {B}']],
      FINAL_CALL: [['🏆 Posljednji poziv!', 'Još {K} do piramide! Svaki bod može promijeniti početni položaj!']],
      PJ_LEAD: [['🏆 {X} preuzima prednost!', 'Prema trenutačnim bodovima: najbolji početak na piramidi'], ['🏆 Nova prednost za piramidu', 'Najbolja projicirana početna pozicija: {X}']],
      PJ_UP: [['🔥 {X} se penje!', 'Prema trenutačnim bodovima: {K}. stepenica na piramidi'], ['🔥 Važan korak prema vrhu', '{X} sada kreće s {K}. stepenice — zasad']],
      PJ_TIE: [['⚔️ Borba za prednost!', '{A} i {B} krenuli bi s iste stepenice'], ['⚔️ {A} i {B} su izjednačeni!', 'Ista projicirana početna pozicija na piramidi']],
      PJ_LAST: [['⚔️ Posljednja prilika!', 'Još jedno pitanje prije završnog uspona!']],""")
rep("""      powerCands(cands);
      updateRanks(cands);""", """      powerCands(cands);
      updateRanks(cands);
      fcCands(cands);""")
rep("""    // javna izdaja (podaci postaju javni tek s izdajom)""", """    // posljednji poziv: najava pri aktivaciji, zatim samo stvarne promjene projicirane stepenice
    const numW = (n) => (n === 1 ? 'jedno pitanje' : n === 2 ? 'dva pitanja' : n === 3 ? 'tri pitanja' : n + ' pitanja');
    function fcCands(cands) {
      if (!fcOn()) { T.pjPrev = null; return; }
      const pj = fcProj(), prev = T.pjPrev, left = fcLeft();
      T.pjPrev = pj;
      if (!T.fcAnn) {
        // najava se ponavlja dok se stvarno ne prikaže (može je nadjačati samo veći događaj)
        const c = cand('FINAL_CALL', 9.2, 'fc', { K: numW(left) }, list().slice().sort((a, b) => b.score - a.score).slice(0, 2).map((p) => p.pid), ['idle', 'idle'], { snd: 'stingLeader', vs: 0, onShow: () => { T.fcAnn = 1; } });
        if (c) cands.push(c);
        return;
      }
      if (!prev) return;
      const ids = Object.keys(pj).filter((id) => prev[id]);
      const top = (m) => { const mx = Math.max(...ids.map((id) => m[id][3])); const t = ids.filter((id) => m[id][3] === mx); return t.length === 1 ? t[0] : null; };
      const t0 = top(prev), t1 = top(pj);
      if (t1 && t1 !== t0) { const c = cand('PJ_LEAD', 7, 'pjl:' + t1 + ':' + T.turn, { X: nm(t1) }, [t1], ['happy'], { snd: 'stingLeader' }); if (c) cands.push(c); }
      // najveći stvarni skok stepenice (ne napredak unutar iste stepenice)
      const up = ids.filter((id) => pj[id][0] > prev[id][0] && id !== t1).sort((a, b) => (pj[b][0] - prev[b][0]) - (pj[a][0] - prev[a][0]) || (a < b ? -1 : 1))[0];
      if (up) { const c = cand('PJ_UP', 6, 'pju:' + up + ':' + T.turn, { X: nm(up), K: pj[up][0] }, [up], ['happy'], { snd: 'stingUp' }); if (c) cands.push(c); }
      // dvoje na vrhu projekcije postaju izjednačeni
      const mx = Math.max(...ids.map((id) => pj[id][3])), tied = ids.filter((id) => pj[id][3] === mx);
      if (mx > 0 && tied.length === 2 && !(prev[tied[0]][3] === prev[tied[1]][3])) { const c = cand('PJ_TIE', 5, 'pjt:' + tied.join('|') + ':' + T.turn, { A: nm(tied[0]), B: nm(tied[1]) }, tied, ['idle', 'idle'], { vs: 1, snd: 'stingRival' }); if (c) cands.push(c); }
      if (left === 1) { const c = cand('PJ_LAST', 4.5, 'pjlast', {}, [], [], { snd: 'stingSmall' }); if (c) cands.push(c); }
    }
    // javna izdaja (podaci postaju javni tek s izdajom)""")
# krčma u mini-igrama (afterScores) također osvježava projekciju, ali bez najave
rep("""      updateRanks(cands);
      rivalryCands(cands);
      finalizePend(pickMoment(cands.filter((c) => c.type !== 'DUEL')));""", """      updateRanks(cands);
      rivalryCands(cands);
      if (T.fcAnn) fcCands(cands);
      finalizePend(pickMoment(cands.filter((c) => c.type !== 'DUEL')));""")
rep("""        pairs: {}, worst: {}, leadTurns: {}, chase: {}, betr: [],""", """        pjPrev: null, fcAnn: 0,
        pairs: {}, worst: {}, leadTurns: {}, chase: {}, betr: [],""")
# tempo: najava ne produljuje otkrivanje (samo stvarna važnost)
rep("""    const lv = G.pend && G.pend.mo ? G.pend.mo.lv || 0 : 0;""", """    const lv = G.pend && G.pend.mo && G.pend.mo.k !== 'FINAL_CALL' ? G.pend.mo.lv || 0 : 0;""")
# testna kuka: čista funkcija izračuna
rep("_tdf: () => TD, _p: (pid) => R.get(pid), _G: G };", "_tdf: () => TD, _p: (pid) => R.get(pid), _pyrUnits: (sc) => pyrUnitsOf(sc), _G: G };")
open(SP + '/v3/engine.js', 'w', encoding='utf-8').write(s)
print('POSLJEDNJI POZIV OK')
