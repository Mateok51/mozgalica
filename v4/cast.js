  // ---------- prikaz bacanja moći (između odabira moći i pitanja) ----------
  function castHtml(d) {
    const actors = d.P.map((p) => '<div class="cact" data-id="' + esc(p.id) + '"><div class="cfig idle">' + avSvg(p.a, 'idle') + '</div>' +
      '<div class="cshield"></div><div class="cbadges"></div><div class="cnm">' + esc(p.n) + '</div></div>').join('');
    return '<div class="cast" id="castStage"><canvas class="cast-cv"></canvas><div class="cast-banner" id="castBanner"></div>' +
      '<div class="cast-row" style="--n:' + d.P.length + ';--c:' + (d.P.length <= 3 ? d.P.length : Math.ceil(d.P.length / 2)) + '">' + actors + '</div></div>';
  }

  const CAST = (() => {
    let run = 0, fx = [], cv = null, ctx = null, stage = null, W = 1, H = 1, last = 0, looping = false;
    const SND = { led: 'freeze', sluz: 'splat', grick: 'squish', bomba: 'zap', dupli: 'correct', pola: 'pop', stit: 'step' };
    const COL = { led: '#9fe7ff', sluz: '#8be04a', grick: '#e0a86a', bomba: '#ffb347', dupli: '#ffd23c', pola: '#5ee7ff', stit: '#7cf0c8' };
    const S = () => W / 960;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function fit() {
      if (!stage || !cv) return;
      const r = stage.getBoundingClientRect(), dp = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = W * dp; cv.height = H * dp; ctx.setTransform(dp, 0, 0, dp, 0, 0);
    }
    function loop(now) {
      if (!stage || !document.body.contains(stage)) { looping = false; fx = []; return; }
      const dt = Math.min(50, now - last); last = now;
      ctx.clearRect(0, 0, W, H);
      fx = fx.filter((e) => { e.step(dt); e.draw(ctx); return !e.dead; });
      requestAnimationFrame(loop);
    }
    function pt(el, fx_, fy) { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - s.left + r.width * fx_, y: r.top - s.top + r.height * fy }; }

    // ----- čestice -----
    function particle(o) {
      const p = Object.assign({ vx: 0, vy: 0, g: 0, life: 600, t: 0, size: 4, color: '#fff', shape: 'dot', rot: 0, vr: 0 }, o);
      p.step = function (dt) { this.t += dt; this.x += this.vx * dt / 16; this.y += this.vy * dt / 16; this.vy += this.g * dt / 16; this.rot += this.vr * dt / 16; if (this.t > this.life) this.dead = 1; };
      p.draw = function (c) {
        const k = 1 - this.t / this.life, s = this.size * S();
        c.save(); c.globalAlpha = Math.max(0, k); c.translate(this.x, this.y); c.rotate(this.rot);
        c.fillStyle = this.color; c.strokeStyle = this.color;
        if (this.shape === 'flake') { c.lineWidth = 1.6 * S(); for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); } }
        else if (this.shape === 'shard') { c.beginPath(); c.moveTo(s * 1.6, 0); c.lineTo(0, s * 0.5); c.lineTo(-s, 0); c.lineTo(0, -s * 0.5); c.fill(); }
        else if (this.shape === 'spark') c.fillRect(-s * 1.8, -s * 0.25, s * 3.6, s * 0.5);
        else if (this.shape === 'star') { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s * 1.2, a = i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); }
        else { c.beginPath(); c.arc(0, 0, s * (0.4 + 0.6 * k), 0, 7); c.fill(); }
        c.restore();
      };
      fx.push(p);
    }
    function burst(x, y, n, opt) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 7, v = (opt.v || 6) * (0.4 + Math.random());
        particle(Object.assign({ x, y, vx: Math.cos(a) * v * S(), vy: Math.sin(a) * v * S() - (opt.up || 0) * S(), rot: a, vr: (Math.random() - 0.5) * 0.3, life: 400 + Math.random() * 500, size: 3 + Math.random() * 5 }, opt));
      }
    }

    // ----- crtanje projektila -----
    function drawShard(c, x, y, ang) {
      const s = 24 * S(); c.save(); c.translate(x, y); c.rotate(ang); c.shadowColor = '#9fe7ff'; c.shadowBlur = 22;
      const g = c.createLinearGradient(-s, 0, s * 1.4, 0); g.addColorStop(0, '#2f8fd8'); g.addColorStop(0.6, '#9fe7ff'); g.addColorStop(1, '#fff');
      c.fillStyle = g; c.beginPath(); c.moveTo(s * 1.5, 0); c.lineTo(s * 0.3, s * 0.45); c.lineTo(-s, s * 0.25); c.lineTo(-s * 0.7, 0); c.lineTo(-s, -s * 0.25); c.lineTo(s * 0.3, -s * 0.45); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(s * 1.3, 0); c.lineTo(s * 0.2, -s * 0.3); c.lineTo(-s * 0.4, -s * 0.05); c.fill(); c.restore();
    }
    function drawBlob(c, x, y, ang, k) {
      const s = 22 * S(), wob = Math.sin(k * 30) * 0.12; c.save(); c.translate(x, y); c.rotate(ang); c.scale(1.15 + wob, 0.9 - wob);
      c.shadowColor = '#8be04a'; c.shadowBlur = 18;
      const g = c.createRadialGradient(-s * 0.3, -s * 0.35, s * 0.1, 0, 0, s); g.addColorStop(0, '#e2ffb0'); g.addColorStop(0.5, '#7ed63b'); g.addColorStop(1, '#2f8a0c');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s * 0.35, -s * 0.35, s * 0.25, s * 0.15, -0.5, 0, 7); c.fill(); c.restore();
    }
    function drawBug(c, x, y, ang, sc) {
      const s = 9 * S() * (sc || 1); c.save(); c.translate(x, y); c.rotate(ang);
      c.strokeStyle = '#3a2008'; c.lineWidth = 1.6 * S();
      const leg = Math.sin(performance.now() / 40) * 0.25;
      for (const sy of [-1, 1]) for (const lx of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(lx * s, 0); c.lineTo(lx * s + leg * s, sy * s * 1.1); c.stroke(); }
      c.fillStyle = 'rgba(220,240,255,.55)';
      const fl = Math.abs(Math.sin(performance.now() / 25));
      c.beginPath(); c.ellipse(-s * 0.1, -s * 0.6, s * 0.7, s * 0.35 * fl + 1, -0.4, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-s * 0.1, s * 0.6, s * 0.7, s * 0.35 * fl + 1, 0.4, 0, 7); c.fill();
      c.fillStyle = '#8a5424'; c.beginPath(); c.ellipse(-s * 0.2, 0, s * 0.85, s * 0.6, 0, 0, 7); c.fill();
      c.fillStyle = '#4a2b10'; c.beginPath(); c.arc(s * 0.7, 0, s * 0.45, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 0.85, -s * 0.18, s * 0.16, 0, 7); c.arc(s * 0.85, s * 0.18, s * 0.16, 0, 7); c.fill();
      c.restore();
    }
    function drawSwarm(c, x, y, ang, k) {
      for (let i = 0; i < 7; i++) {
        const ph = i * 0.9, r = (10 + i * 3) * S();
        drawBug(c, x + Math.cos(k * 18 + ph) * r - Math.cos(ang) * i * 7 * S(), y + Math.sin(k * 22 + ph) * r - Math.sin(ang) * i * 7 * S(), ang + Math.sin(k * 20 + i) * 0.6, 0.8 + (i % 3) * 0.15);
      }
    }
    function drawBomb(c, x, y, ang, k) {
      const s = 22 * S(); c.save(); c.translate(x, y); c.rotate(k * 9);
      const g = c.createRadialGradient(-s * 0.35, -s * 0.35, s * 0.1, 0, 0, s); g.addColorStop(0, '#70708c'); g.addColorStop(0.55, '#23232f'); g.addColorStop(1, '#08080d');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, 7); c.fill();
      c.fillStyle = '#555'; c.fillRect(s * 0.45, -s * 1.05, s * 0.5, s * 0.45);
      c.strokeStyle = '#d99a35'; c.lineWidth = 2.5 * S(); c.beginPath(); c.moveTo(s * 0.7, -s * 1.05); c.quadraticCurveTo(s * 1.1, -s * 1.6, s * 1.4, -s * 1.3); c.stroke();
      c.restore();
      const a = k * 9, fxp = x + Math.cos(a) * s * 1.4 - Math.sin(a) * -s * 1.3, fyp = y + Math.sin(a) * s * 1.4 + Math.cos(a) * -s * 1.3;
      particle({ x: fxp, y: fyp, vx: (Math.random() - 0.5) * 3 * S(), vy: (Math.random() - 0.5) * 3 * S(), life: 300, size: 2.5, color: Math.random() < 0.5 ? '#ffcf4a' : '#ff7a2e' });
    }
    const TRAIL = {
      led: (x, y) => particle({ x, y, vx: (Math.random() - 0.5) * S(), vy: (Math.random() - 0.5) * S(), life: 450, size: 2 + Math.random() * 3, color: Math.random() < 0.5 ? '#fff' : '#9fe7ff', shape: Math.random() < 0.3 ? 'flake' : 'dot' }),
      sluz: (x, y) => { if (Math.random() < 0.6) particle({ x, y, vx: (Math.random() - 0.5) * S(), vy: 0, g: 0.35 * S(), life: 500, size: 2 + Math.random() * 3, color: Math.random() < 0.5 ? '#7ed63b' : '#b6f070' }); },
      grick: () => {},
      bomba: () => {},
    };
    const DRAW = { led: drawShard, sluz: drawBlob, grick: drawSwarm, bomba: drawBomb };
    const ARC = { led: 70, sluz: 110, grick: 40, bomba: 190 };

    function fly(a, b, ms, k, my) {
      return new Promise((res) => {
        let t = 0;
        fx.push({
          step(dt) { t += dt / ms; if (t >= 1 || my !== run) { this.dead = 1; res(); } },
          draw(c) {
            const q = Math.min(1, t), e = q * q * (3 - 2 * q) * 0.35 + q * 0.65, arc = ARC[k] * S();
            const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e - arc * 4 * e * (1 - e);
            const ang = Math.atan2((b.y - a.y) - arc * 4 * (1 - 2 * e), b.x - a.x);
            TRAIL[k](x, y); DRAW[k](c, x, y, ang, q);
          },
        });
      });
    }
    function flyAway(a, dir, k) {
      let t = 0; const b = { x: a.x - dir * 260 * S(), y: -40 };
      fx.push({
        step(dt) { t += dt / 600; if (t >= 1) this.dead = 1; },
        draw(c) { const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - 60 * S() * 4 * t * (1 - t); c.save(); c.globalAlpha = 1 - t; DRAW[k](c, x, y, Math.PI + t * 6, t); c.restore(); },
      });
    }
    function charge(p, color, ms, my) {
      return new Promise((res) => {
        let t = 0;
        fx.push({
          step(dt) {
            t += dt; if (t > ms || my !== run) { this.dead = 1; res(); }
            if (Math.random() < 0.6) { const a = Math.random() * 7, dd = 46 * S(); particle({ x: p.x + Math.cos(a) * dd, y: p.y + Math.sin(a) * dd, vx: -Math.cos(a) * 2.5 * S(), vy: -Math.sin(a) * 2.5 * S(), life: 300, size: 3, color }); }
          },
          draw(c) { const k = t / ms; c.save(); c.globalAlpha = 0.8; c.fillStyle = color; c.shadowColor = color; c.shadowBlur = 26; c.beginPath(); c.arc(p.x, p.y, (5 + 13 * k) * S(), 0, 7); c.fill(); c.restore(); },
        });
      });
    }

    // ----- trajni učinci na meti -----
    function persist(el, kind) {
      const rnd = (n, f) => Array.from({ length: n }, f);
      const items = kind === 'led' ? rnd(12, () => ({ fx: 0.15 + Math.random() * 0.7, fy: 0.5 + Math.random() * 0.5, h: 0.12 + Math.random() * 0.22, w: 0.04 + Math.random() * 0.05, tilt: (Math.random() - 0.5) * 0.9 }))
        : kind === 'sluz' ? rnd(7, () => ({ fx: 0.2 + Math.random() * 0.6, fy: 0.15 + Math.random() * 0.4, r: 0.05 + Math.random() * 0.06, len: 0.1 + Math.random() * 0.3, sp: 0.6 + Math.random() }))
        : rnd(5, (_, i) => ({ ph: i * 1.26, r: 0.32 + Math.random() * 0.12, sp: 0.0016 + Math.random() * 0.001, fy: 0.35 + Math.random() * 0.3 }));
      let t = 0;
      fx.push({
        step(dt) { t += dt; if (!document.body.contains(el)) this.dead = 1; },
        draw(c) {
          const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(), ox = r.left - s.left, oy = r.top - s.top, grow = Math.min(1, t / 300);
          c.save();
          if (kind === 'led') {
            c.globalAlpha = 0.85; c.shadowColor = '#9fe7ff'; c.shadowBlur = 10;
            for (const k of items) {
              const h = r.height * k.h * grow, w = r.width * k.w;
              c.save(); c.translate(ox + r.width * k.fx, oy + r.height * k.fy); c.rotate(k.tilt);
              const g = c.createLinearGradient(0, 0, 0, -h); g.addColorStop(0, 'rgba(120,200,255,.75)'); g.addColorStop(1, 'rgba(240,252,255,.95)');
              c.fillStyle = g; c.beginPath(); c.moveTo(-w, 0); c.lineTo(0, -h); c.lineTo(w, 0); c.closePath(); c.fill(); c.restore();
            }
          } else if (kind === 'sluz') {
            c.globalAlpha = 0.88; c.fillStyle = '#6cc72f'; c.shadowColor = '#8be04a'; c.shadowBlur = 8;
            for (const k of items) {
              const x = ox + r.width * k.fx, y = oy + r.height * k.fy, rr = r.width * k.r * grow, len = r.height * k.len * Math.min(1, t * k.sp / 1500);
              c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill();
              c.fillRect(x - rr * 0.35, y, rr * 0.7, len); c.beginPath(); c.arc(x, y + len, rr * 0.45, 0, 7); c.fill();
            }
            c.fillStyle = 'rgba(255,255,255,.45)'; for (const k of items) { c.beginPath(); c.arc(ox + r.width * k.fx - r.width * k.r * 0.3, oy + r.height * k.fy - r.width * k.r * 0.3, r.width * k.r * 0.25 * grow, 0, 7); c.fill(); }
          } else {
            for (const k of items) {
              const a = k.ph + t * k.sp * 6, cx = ox + r.width * 0.5, cy = oy + r.height * k.fy;
              const x = cx + Math.cos(a) * r.width * k.r, y = cy + Math.sin(a) * r.width * k.r * 0.45;
              drawBug(c, x, y, a + Math.PI / 2, 0.9 * grow);
            }
          }
          c.restore();
        },
      });
    }
    function badge(act, html, cls) { const b = act.querySelector('.cbadges'); b.insertAdjacentHTML('beforeend', '<span class="cbadge ' + (cls || '') + '">' + html + '</span>'); }

    // ----- likovi -----
    function pose(act, a, p, anim, dir) {
      const fig = act.querySelector('.cfig');
      fig.innerHTML = avSvg(a, p); fig.className = 'cfig'; void fig.offsetWidth; fig.className = 'cfig ' + (anim || 'idle');
      if (dir) fig.style.setProperty('--dir', dir);
    }
    function banner(html) { const b = stage.querySelector('#castBanner'); if (!b) return; b.classList.remove('on'); void b.offsetWidth; b.innerHTML = html; if (html) b.classList.add('on'); }
    function shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

    async function play(d, sound, my) {
      const acts = {}; stage.querySelectorAll('.cact').forEach((el) => { acts[el.dataset.id] = el; });
      const P = {}; d.P.forEach((p) => { P[p.id] = p; });
      const n = d.ev.length, per = Math.max(650, Math.min(1250, (d.ms - 900) / Math.max(1, n)));
      const snd = (k) => { if (sound) SFX.play(k); };
      await sleep(250); if (my !== run) return;
      for (const e of d.ev) {
        const fa = acts[e.f], fp = P[e.f]; if (!fa || !fp) continue;
        const nm = '<b class="pw-' + e.p + '">' + POWERS[e.p].n + '</b>';
        if (!e.t) {
          // pomoć za sebe
          banner(esc(fp.n) + ' <span class="cico">' + ICON[e.p] + '</span> ' + nm);
          pose(fa, fp.a, 'happy', 'cheer');
          const core = pt(fa, 0.5, 0.55);
          await charge(core, COL[e.p], per * 0.35, my); if (my !== run) return;
          snd(SND[e.p]);
          if (e.p === 'stit') { fa.querySelector('.cshield').classList.add('on'); burst(core.x, core.y, 20, { color: COL.stit, v: 6, shape: 'spark' }); }
          if (e.p === 'dupli') { fa.classList.add('gold'); burst(core.x, core.y - 20 * S(), 26, { color: '#ffd23c', v: 6, up: 3, g: 0.12, shape: 'star' }); badge(fa, '×2', 'b-dupli'); }
          if (e.p === 'pola') { burst(core.x, core.y - 30 * S(), 18, { color: '#5ee7ff', v: 5, shape: 'spark' }); badge(fa, '50:50', 'b-pola'); fa.insertAdjacentHTML('beforeend', '<span class="csplit"><i></i><i></i></span>'); }
          await sleep(per * 0.55); if (my !== run) return;
          pose(fa, fp.a, 'idle');
          continue;
        }
        const ta = acts[e.t], tp = P[e.t]; if (!ta || !tp) continue;
        banner(esc(fp.n) + ' <span class="cico">' + ICON[e.p] + '</span> ' + nm + ' <span class="carr">→</span> ' + esc(tp.n));
        const dir = ta.getBoundingClientRect().left >= fa.getBoundingClientRect().left ? 1 : -1;
        pose(fa, fp.a, 'attack', 'lunge', dir);
        const hand = pt(fa, 0.5 + 0.22 * dir, 0.42);
        await charge(hand, COL[e.p], per * 0.2, my); if (my !== run) return;
        snd('whoosh');
        const end = e.b ? pt(ta, 0.5 - 0.5 * dir, 0.45) : pt(ta, 0.5, e.p === 'bomba' ? 0.88 : 0.5);
        await fly(hand, end, per * 0.38, e.p, my); if (my !== run) return;
        if (e.b) {
          const sh = ta.querySelector('.cshield'); sh.classList.remove('hit'); void sh.offsetWidth; sh.classList.add('hit');
          burst(end.x, end.y, 20, { color: '#fff', shape: 'spark', v: 8 }); burst(end.x, end.y, 10, { color: COL.stit, v: 5 });
          flyAway(end, dir, e.p); snd('step');
          banner('<b class="pw-stit">Odbijeno!</b> ' + esc(tp.n) + ' ima štit');
          pose(fa, fp.a, 'shocked', 'jolt'); pose(ta, tp.a, 'victory', 'cheer');
        } else {
          snd(SND[e.p]); shake();
          if (e.p === 'led') { burst(end.x, end.y, 22, { color: '#dff7ff', shape: 'shard', v: 7, g: 0.25 }); burst(end.x, end.y, 10, { color: '#9fe7ff', shape: 'flake', v: 4 }); ta.classList.add('frozen'); persist(ta, 'led'); }
          if (e.p === 'sluz') { burst(end.x, end.y, 26, { color: '#7ed63b', v: 7, g: 0.35 }); ta.classList.add('slimed'); persist(ta, 'sluz'); }
          if (e.p === 'grick') { burst(end.x, end.y, 10, { color: '#e0a86a', v: 4 }); persist(ta, 'grick'); }
          if (e.p === 'bomba') { burst(end.x, end.y, 16, { color: '#c9b9a0', v: 4, up: 2, g: 0.2 }); ta.insertAdjacentHTML('beforeend', '<span class="cbomb">' + bombSvg + '</span>'); }
          pose(ta, tp.a, 'shocked', 'jolt'); pose(fa, fp.a, 'happy', 'cheer');
        }
        await sleep(per * 0.42); if (my !== run) return;
        pose(fa, fp.a, 'idle');
      }
      banner('Spremni? Slijedi pitanje!');
    }

    function start(el, d, sound) {
      if (!el || !d.ev) return;
      const my = ++run;
      stage = el; cv = el.querySelector('canvas'); ctx = cv.getContext('2d'); fx = [];
      fit();
      if (window.ResizeObserver) new ResizeObserver(fit).observe(el);
      last = performance.now();
      if (!looping) { looping = true; requestAnimationFrame(loop); }
      requestAnimationFrame(() => { fit(); play(d, sound, my); });
    }
    return { start };
  })();
