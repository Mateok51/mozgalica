  // ---------- sve stane na ekran: stranica se nikad ne skrola; ako pravi sadržaj ipak pređe visinu, skrola se samo #app (nikad ne ostaje nedostupan) ----------
  (function fitGuard() {
    const app = document.getElementById('app');
    if (!app) return;
    const SKIP = '.walker, .rv-who, .spot, .cast, [aria-hidden="true"], .pp-tag';
    let tm = 0;
    function measure() {
      tm = 0;
      const lim = app.clientHeight || innerHeight; let mb = 0;
      for (const e of app.querySelectorAll('*')) {
        if (e.closest(SKIP)) continue;
        const r = e.getBoundingClientRect();
        if (r.height < 1 || r.width < 1) continue;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.position === 'fixed' || +cs.opacity < 0.05 || cs.display === 'none') continue;
        if (r.bottom > mb) mb = r.bottom;
      }
      const over = Math.max(0, Math.round(mb + app.scrollTop - app.getBoundingClientRect().top - lim));
      app.dataset.fitover = String(over);
      app.classList.toggle('fit-scroll', over > 2);
    }
    function schedule() { if (!tm) tm = setTimeout(measure, 350); }
    if (window.MutationObserver) new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
    addEventListener('resize', schedule); addEventListener('orientationchange', schedule);
    schedule();
  })();
