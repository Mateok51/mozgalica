  // ---------- KEEP: isti ekran iscrtan ponovno -> animacije se nastavljaju gdje su stale ----------
  // (bez ovoga svako osvježavanje unutar iste faze ponovno pokrene ulazne animacije pa elementi "zatitraju")
  const KEEP = (() => {
    let saved = null, t0 = 0;
    const IDS = ['bk', 'v', 'c', 't', 'p', 'av', 'pk', 'bet', 'k'];
    function idOf(e) {
      let s = e.id ? '#' + e.id : '';
      for (const k of IDS) if (e.dataset && e.dataset[k] !== undefined) s += '[' + k + '=' + e.dataset[k] + ']';
      return s;
    }
    function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }
    function keyOf(e) {
      const own = idOf(e);
      let k = e.tagName + '.' + (e.classList[0] || '') + own + (own ? '' : ':' + hash(e.innerHTML));
      for (let p = e.parentElement; p && p !== $app; p = p.parentElement) k = (p.tagName + '.' + (p.classList[0] || '') + idOf(p)) + '>' + k;
      return k;
    }
    function list() {
      const out = [], seen = new Map();
      let anims = [];
      try { anims = $app.getAnimations({ subtree: true }); } catch (e) { return out; }
      for (const a of anims) {
        const el = a.effect && a.effect.target;
        if (!el || !a.animationName || !el.isConnected) continue;
        let k = keyOf(el) + '|' + a.animationName;
        const n = seen.get(k) || 0; seen.set(k, n + 1); k += '#' + n;
        out.push([k, a]);
      }
      return out;
    }
    function grab(fresh) {
      saved = null;
      if (fresh || reduceMotion || !$app.firstElementChild) return;
      saved = new Map();
      t0 = performance.now();
      for (const [k, a] of list()) {
        const ct = a.currentTime;
        if (ct === null) continue;
        saved.set(k, { ct, fin: a.playState === 'finished' });
      }
    }
    function put() {
      if (!saved || !saved.size) { saved = null; return; }
      const dt = performance.now() - t0;
      for (const [k, a] of list()) {
        const o = saved.get(k); if (!o) continue;
        try {
          if (o.fin) a.finish();
          else a.currentTime = o.ct + dt;
        } catch (e) {}
      }
      saved = null;
    }
    return { grab, put };
  })();
