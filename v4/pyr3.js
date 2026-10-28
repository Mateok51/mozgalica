  function pyramidHtml(d, rev, o) {
    o = o || {};
    const el = Math.max(0, d.dur - d.ms), base = o.delay || 0, intro = d.ph === 'fstart';
    // napredak unutar stepenice (isti izračun kao na domaćinu, iz javnog d.req)
    const req = d.req || [];
    const so = (u) => { let st = 0, acc = 0; while (st < req.length && acc + req[st] <= u) { acc += req[st]; st++; } return { s: st, p: u - acc, r: st < req.length ? req[st] : 0 }; };
    const BN = { f: '⚡', d: '✖2', s: '🔥' };
    let rows = '', idx = 0;
    for (let s = d.steps; s >= 0; s--) {
      const w = s === 0 ? 100 : 100 - (s - 1) * (59 / Math.max(1, d.steps - 1));
      const here = d.P.filter((p) => (p.st || 0) === s).map((p) => {
        // uvod: svi kreću iz podnožja i penju se stepenicu po stepenicu kad im završi brojanje bodova
        const mv = intro ? (p.st || 0) : (p.mv || 0), go = (rev || intro) && mv > 0;
        // ishod pitanja piramide: uspon, djelomičan napredak, kruna izmiče, netočno
        const ok = rev && p.ch === d.cor, ug = rev ? (p.ug || 0) : 0;
        const kind = !rev || intro ? '' : p.st >= d.steps && mv ? 'win' : d.crown && p.top && !mv ? 'cmiss' : ok && ug > 0 && mv > 0 ? 'lvl' : ok && ug > 0 ? 'part' : 'miss';
        const cd = intro ? fsEnd(d, p) : rev ? base + (idx++) * 90 : 0;
        const mood = intro ? (el > fsEnd(d, p) + 300 && p.st ? 'happy' : 'idle') : rev ? (kind === 'win' ? 'victory' : kind === 'lvl' || kind === 'part' ? 'happy' : 'sad') : p.top ? 'victory' : '';
        const bn = rev && p.fb ? '<span class="bn">' + p.fb.split('').map((c) => BN[c] || '').join('') + '</span>' : '';
        const badge = !kind ? '' : kind === 'win' ? '<span class="pb pb-win">👑</span>' : kind === 'lvl' ? '<span class="pb pb-lvl">+' + ug + '<i>⬆</i>' + bn + '</span>'
          : kind === 'part' ? '<span class="pb pb-part">+' + ug + bn + '</span>' : kind === 'cmiss' ? '<span class="pb pb-cmiss">👑✗</span>' : '<span class="pb pb-miss">✗</span>';
        // traka napretka do sljedeće stepenice (puni se nakon točnog odgovora)
        const cur = so(p.fu || 0);
        let bar = '';
        if (!intro && !p.top && p.st < d.steps && cur.r > 1 && (cur.p > 0 || kind === 'part')) {
          const from = kind === 'part' ? Math.max(0, cur.p - ug) : kind === 'lvl' ? 0 : cur.p;
          bar = '<span class="pbar' + (kind === 'part' || (kind === 'lvl' && cur.p) ? ' fill' : '') + '" style="--a:' + (from / cur.r).toFixed(3) + ';--b:' + (cur.p / cur.r).toFixed(3) + '"><i></i><b>' + cur.p + '/' + cur.r + '</b></span>';
        }
        const cls = 'climber' + (go ? ' go' + (intro ? ' walk' : mv > 1 ? ' multi m' + Math.min(mv, 8) : '') : '') + (kind ? ' k-' + kind : '') + (p.top ? ' ontop' : '') + (p.id === PID ? ' me' : '');
        return '<span class="' + cls + '" style="--mv:' + (mv || 0) + ';--cd:' + cd + 'ms;--el:' + (rev || intro ? el : 0) + 'ms">' +
          badge + (o.you && p.id === PID && !kind ? '<span class="tag-you">Ti</span>' : '') +
          avSvg(p.a, mood) + bar + '<span class="cn">' + esc(p.n) + '</span></span>';
      }).join('');
      rows += '<div class="pstep' + (s === 0 ? ' base' : '') + (s === d.steps ? ' top crown' : '') + (s === d.steps - 1 ? ' summit' : '') + '" style="width:' + w.toFixed(1) + '%"><span class="lv">' + (s === d.steps ? '👑' : s) + '</span><span class="here">' + here + '</span></div>';
    }
    return '<div class="pyramid' + (intro ? ' intro' : '') + (rev && !intro ? ' res' : '') + '">' + rows + '</div>';
  }
