  // ---------- ambijent krčme: vrlo suptilne iskre iz kamina, prašina u svjetlu i lagani dim; canvas #ambient je iza sučelja (#app ima z-index 1) ----------
  (function ambient() {
    const c = document.getElementById('ambient');
    if (!c || !c.getContext) return;
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq && mq.matches) { c.remove(); return; }
    const weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;
    const g = c.getContext('2d');
    let W = 0, H = 0, dust = [], embers = [], haze = [], last = 0, acc = 0, slow = 0, frames = 0, lvl = weak ? 1 : 2, raf = 0, t0 = 0;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const land = () => W > H;   // kamin postoji samo na pozadini u landscapeu (TV); u portretu je drvena stijena
    const hearth = () => ({ x: W * 0.09, y: H * 0.6 });   // otvor kamina na slici pozadine
    function mkDust(init) { return { x: rnd(0, W), y: init ? rnd(0, H) : H + 6, r: rnd(0.9, 2.1), vy: rnd(4, 11), ph: rnd(0, 6.28), sw: rnd(5, 16), a: rnd(0.22, 0.55), tw: rnd(0.4, 1.2) }; }
    function mkEmber() { const h = hearth(); return { x: h.x + rnd(-W * 0.03, W * 0.03), y: h.y + rnd(-H * 0.02, H * 0.04), r: rnd(1.3, 2.6), vy: rnd(16, 34), ph: rnd(0, 6.28), sw: rnd(6, 16), life: 0, max: rnd(3, 5.5) }; }
    function seed() {
      const k = (W > H ? 60 : 36) * (lvl === 1 ? 0.45 : 1);
      dust = Array.from({ length: Math.round(k) }, () => mkDust(true));
      embers = [];
      haze = lvl >= 2 ? Array.from({ length: 3 }, (_, i) => ({ x: rnd(0, W), y: H * (0.55 + 0.18 * i), r: Math.max(W, H) * rnd(0.3, 0.5), vx: rnd(2, 5) * (i % 2 ? -1 : 1), a: rnd(0.045, 0.075) })) : [];
    }
    function size() {
      const cw = innerWidth || 360, ch = innerHeight || 640, s = Math.min(1, 900 / Math.max(cw, ch));
      W = Math.max(2, Math.round(cw * s)); H = Math.max(2, Math.round(ch * s));
      c.width = W; c.height = H; seed();
    }
    function draw(dt, t) {
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      // dim: tri vrlo blijeda, spora oblaka pri dnu
      for (const z of haze) {
        z.x += z.vx * dt; if (z.x < -z.r * 0.5) z.x = W + z.r * 0.5; else if (z.x > W + z.r * 0.5) z.x = -z.r * 0.5;
        const gr = g.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
        gr.addColorStop(0, 'rgba(255,196,130,' + z.a + ')'); gr.addColorStop(1, 'rgba(255,196,130,0)');
        g.fillStyle = gr; g.fillRect(z.x - z.r, z.y - z.r, z.r * 2, z.r * 2);
      }
      // titranje svjetla kamina (nepravilno, vrlo blago)
      if (land()) { const h = hearth(), fl = 0.5 + 0.5 * Math.sin(t * 1.9) * Math.sin(t * 0.7 + 1) + 0.15 * Math.sin(t * 7.3), a = 0.06 + 0.07 * Math.max(0, Math.min(1, fl)), R = H * 0.55;
        const gr = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, R); gr.addColorStop(0, 'rgba(255,150,60,' + a + ')'); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.fillRect(h.x - R, h.y - R, R * 2, R * 2); }
      // prašina
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i]; p.y -= p.vy * dt; p.ph += dt * p.tw;
        if (p.y < -6) { dust[i] = mkDust(false); continue; }
        const x = p.x + Math.sin(p.ph) * p.sw, a = p.a * (0.55 + 0.45 * Math.sin(p.ph * 1.7));
        g.fillStyle = 'rgba(255,222,170,' + a.toFixed(3) + ')'; g.beginPath(); g.arc(x, p.y, p.r, 0, 6.2832); g.fill();
      }
      // iskre iz kamina
      if (lvl >= 2 && land() && embers.length < 14 && Math.random() < dt * 2.2) embers.push(mkEmber());
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.life += dt; e.y -= e.vy * dt; e.ph += dt * 2.2;
        if (e.life > e.max || e.y < -6) { embers.splice(i, 1); continue; }
        const k = e.life / e.max, a = 0.9 * Math.sin(Math.min(1, k * 1.15) * 3.1416), x = e.x + Math.sin(e.ph) * e.sw * (0.4 + k);
        const rr = e.r * (1 - 0.4 * k); g.fillStyle = 'rgba(255,120,40,' + (Math.max(0, a) * 0.22).toFixed(3) + ')'; g.beginPath(); g.arc(x, e.y, rr * 3.2, 0, 6.2832); g.fill();   // mekani sjaj oko iskre
        g.fillStyle = 'rgba(255,' + Math.round(190 - 70 * k) + ',80,' + Math.max(0, a).toFixed(3) + ')'; g.beginPath(); g.arc(x, e.y, rr, 0, 6.2832); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!t0) t0 = ts;
      const dtm = ts - last; if (dtm < 33) return;   // najviše ~30 sličica u sekundi
      last = ts; const dt = Math.min(0.1, dtm / 1000);
      const t = performance.now();
      draw(dt, (ts - t0) / 1000);
      // ako uređaj kasni, smanji sloj (i na kraju ugasi) — igra ima prednost
      if (++frames > 20) { const cost = performance.now() - t; slow = cost > 9 ? slow + 1 : Math.max(0, slow - 1); if (slow > 25) { slow = 0; frames = 0; if (lvl > 1) { lvl = 1; seed(); } else { stop(); c.remove(); } } }
    }
    function start() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    window.addEventListener('resize', () => { size(); });
    if (mq && mq.addEventListener) mq.addEventListener('change', (e) => { if (e.matches) { stop(); c.remove(); } });
    size(); start();
  })();
