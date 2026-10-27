  // ===================== PIRAMIDA: prikaz =====================
  // početni raspored je izračunat na domaćinu; ovdje se samo otkriva: bodovi rastu od nule, završavaju redom (najmanje prvi), lik se zatim penje
  function fsEnd(d, p) {
    const order = d.P.slice().sort((a, b) => (a.fsc || 0) - (b.fsc || 0) || (a.n < b.n ? -1 : 1));
    return 1100 + order.findIndex((x) => x.id === p.id) * 650;
  }
  const fsLabel = (p) => (p.st ? p.st + '. stepenica' : 'podnožje') + (p.fr > 1 && p.fp ? ' · ' + p.fp + '/' + p.fr : '');
  function fsRows(d) {
    const el = Math.max(0, d.dur - d.ms);
    return '<div class="fs-rows" style="--el:' + el + 'ms">' + d.P.slice().sort((a, b) => (b.fsc || 0) - (a.fsc || 0) || (a.n < b.n ? -1 : 1)).map((p) => {
      const end = fsEnd(d, p);
      return '<div class="fs-row' + (p.id === PID ? ' me' : '') + '" style="--fe:' + end + 'ms"><span class="mini">' + avSvg(p.a, 'idle') + '</span><span class="nm">' + esc(p.n) + '</span>' +
        '<span class="fs-sc" data-ck="fs' + esc(p.id) + '" data-cu="0" data-to="' + (p.fsc || 0) + '" data-cud="' + Math.round(150 - el) + '" data-cdur="' + (end - 150) + '">' + (p.fsc || 0) + '</span><span class="fs-go">→ ' + esc(fsLabel(p)) + '</span></div>';
    }).join('') + '</div>';
  }
  let fsSoundKey = '';
  function fstartSound(d) {
    if (fsSoundKey === d.s) return; fsSoundKey = d.s;
    const el = Math.max(0, d.dur - d.ms), ends = d.P.map((p) => fsEnd(d, p)), last = Math.max(...ends);
    for (let t = 200; t < last; t += 170) if (t > el) setTimeout(() => { if (fsSoundKey === d.s) AUDIO.play('tick'); }, t - el);
    ends.forEach((t) => { if (t > el) setTimeout(() => { if (fsSoundKey === d.s) AUDIO.play('step'); }, t - el); });
    if (last + 900 > el) setTimeout(() => { if (fsSoundKey === d.s) AUDIO.play('stingUp'); }, last + 900 - el);
  }
  // napredak za igrača: jasna jedna rečenica
  function progTxt(d, me) {
    if (me.st >= d.steps) return '👑 Kruna je tvoja!';
    if (me.top) return '👑 Na vrhu si! Točan odgovor na pitanje za krunu = pobjeda.';
    const need = (me.fr || 1) - (me.fp || 0);
    return 'Napredak ' + (me.fp || 0) + '/' + (me.fr || 1) + ' · još ' + need + (need === 1 ? ' točan' : ' točna') + ' do ' + ((me.st || 0) + 1 === d.steps - 1 ? 'vrha' : ((me.st || 0) + 1) + '. stepenice');
  }
  function progMeter(d, me) {
    const steps = d.steps - 1; let bars = '';
    for (let s = 1; s <= steps; s++) bars += '<i class="' + ((me.st || 0) >= s ? 'on' : (me.st || 0) + 1 === s && me.fp ? 'half' : '') + '" style="width:' + (40 + (steps - s) * 18) + 'px"></i>';
    return '<div class="step-meter" aria-label="Stepenica ' + (me.st || 0) + ' od ' + steps + '"><i class="crown' + (me.st >= d.steps ? ' on' : '') + '">👑</i>' + bars + '</div><div class="p-sub">' + esc(progTxt(d, me)) + '</div>';
  }
