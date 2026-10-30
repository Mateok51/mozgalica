# Odabir mini-igara u predvorju (v61): domaćin isključuje mini-igre koje ne želi; barem jedan izazov mora ostati.
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, ('port-mgpick', s.count(a), a[:90])
    s = s.replace(a, b)
rep("lenPick(d) + endPick(d) + catPick(d)", "lenPick(d) + endPick(d) + catPick(d) + mgPick(d)", 4)
rep("  function catOvClose() {", r"""  // ---------- odabir mini-igara ----------
  let mgGame = null, mgTimer = 0;
  function mgSave(off) { try { localStorage.setItem('tt_mg_off', JSON.stringify(off)); } catch (e) {} }
  function mgLoad() { try { const v = JSON.parse(localStorage.getItem('tt_mg_off') || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch (e) { return []; } }
  function mgPick(d) {
    if (!d.opt || !d.opt.mg) return '';
    const all = d.opt.mg, off = d.opt.mgOff || [], n = all.length - off.length;
    if (!game) return off.length ? '<div class="len-info">🎲 Mini igre: ' + n + ' od ' + all.length + '</div>' : '';
    if (mgGame !== game) {
      mgGame = game; const g = game, saved = mgLoad();
      if (saved.length) setTimeout(() => { if (game === g && g.view().ph === 'lobby') g.setOpt('mg', saved); }, 0);
    }
    return '<button class="btn ghost cat-open" id="mgOpen" aria-haspopup="dialog">🎲 Mini igre · ' + n + ' od ' + all.length + '</button>';
  }
  function mgOvClose() { const ov = document.getElementById('mgOv'); if (ov) ov.remove(); clearInterval(mgTimer); mgTimer = 0; }
  function mgOvSync() {
    const ov = document.getElementById('mgOv'); if (!ov) return;
    if (!game || game.view().ph !== 'lobby') return mgOvClose();
    const o = game.view().opt, off = o.mgOff || [], n = o.mg.length - off.length;
    ov.querySelectorAll('[data-mg]').forEach((b) => { const on = off.indexOf(b.dataset.mg) < 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    ov.querySelector('.cat-cnt').textContent = n + ' od ' + o.mg.length + ' uključeno';
  }
  function mgOvOpen() {
    if (!game || document.getElementById('mgOv')) return;
    const o = game.view().opt; if (!o || !o.mg) return;
    const chip = (m) => '<button class="cat-chip" data-mg="' + esc(m[0]) + '" aria-pressed="true">' + m[1] + ' ' + esc(m[2]) + '</button>';
    const ov = document.createElement('div'); ov.id = 'mgOv'; ov.className = 'inv-modal cat-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Odabir mini igara');
    ov.innerHTML = '<div class="inv-card cat-card"><div class="cat-top"><b>Mini igre</b><span class="cat-cnt"></span></div>' +
      '<div class="cat-bulk"><button class="btn ghost" data-mgall="1">Sve</button></div>' +
      '<div class="cat-grid">' + o.mg.filter((m) => m[3]).map(chip).join('') + '</div>' +
      '<div class="cat-top"><b>Posebna pitanja</b></div><div class="cat-grid mg-var">' + o.mg.filter((m) => !m[3]).map(chip).join('') + '</div>' +
      '<div class="cat-hint" role="status"></div><button class="btn lob-cta" id="mgDone">Gotovo</button></div>';
    document.body.appendChild(ov); mgOvSync();
    mgTimer = setInterval(mgOvSync, 1000);
  }
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target : null; if (!t || !game) return;
    if (t.closest('#mgOpen')) { AUDIO.play('tap'); return mgOvOpen(); }
    if (t.closest('#mgDone')) { AUDIO.play('tap'); return mgOvClose(); }
    if (t.closest('[data-mgall]')) { AUDIO.play('tap'); game.setOpt('mg', []); mgSave([]); return mgOvSync(); }
    const b = t.closest('#mgOv [data-mg]');
    if (b) {
      AUDIO.play('tap'); const o = game.view().opt, off = (o.mgOff || []).slice(), i = off.indexOf(b.dataset.mg);
      if (i >= 0) off.splice(i, 1);
      else {
        const left = o.mg.filter((m) => m[3] && off.indexOf(m[0]) < 0 && m[0] !== b.dataset.mg).length;
        const isCh = o.mg.some((m) => m[0] === b.dataset.mg && m[3]);
        if (isCh && !left) { const h = document.querySelector('#mgOv .cat-hint'); if (h) h.textContent = 'Barem jedna mini igra mora ostati uključena.'; return; }
        off.push(b.dataset.mg);
      }
      game.setOpt('mg', off); mgSave(off); const h = document.querySelector('#mgOv .cat-hint'); if (h) h.textContent = ''; mgOvSync();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('mgOv')) mgOvClose(); });
  function catOvClose() {""")
rep("  .cat-hint {", "  .mg-var { flex: none; }\n  .cat-hint {")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-mgpick OK')
