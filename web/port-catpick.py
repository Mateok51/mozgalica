# Odabir kategorija u predvorju (v59+): domaćin isključuje kategorije koje ne želi; uključene moraju biti barem 4.
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, ('port-catpick', s.count(a), a[:90])
    s = s.replace(a, b)
rep("lenPick(d) + endPick(d)", "lenPick(d) + endPick(d) + catPick(d)", 4)
# početak igre je blokiran dok je uključeno manje od 4 kategorije
rep("'<button class=\"btn lob-cta\" id=\"dstart\"' + (d.P.length < 2 ? ' disabled' : '') + '>Započni igru</button>' + (d.P.length < 2 ? '<div class=\"lob-wait\">Čekamo barem još jednog igrača ili dodaj bota.</div>' : '');",
    "'<button class=\"btn lob-cta\" id=\"dstart\"' + (d.P.length < 2 || catFew(d) ? ' disabled' : '') + '>Započni igru</button>' + (catFew(d) ? '<div class=\"lob-wait\">Uključi barem 4 kategorije.</div>' : d.P.length < 2 ? '<div class=\"lob-wait\">Čekamo barem još jednog igrača ili dodaj bota.</div>' : '');")
rep("'<button class=\"btn lob-cta\" id=\"dstart\"' + (nb < 1 ? ' disabled' : '') + '>Započni igru</button><div class=\"lob-wait\">' + (nb < 1 ? 'Dodaj barem jednog bota.' :",
    "'<button class=\"btn lob-cta\" id=\"dstart\"' + (nb < 1 || catFew(d) ? ' disabled' : '') + '>Započni igru</button><div class=\"lob-wait\">' + (catFew(d) ? 'Uključi barem 4 kategorije.' : nb < 1 ? 'Dodaj barem jednog bota.' :")
rep("<button class=\"btn lob-cta\" id=\"start\"' + (on < 1 ? ' disabled' : '') + '>Započni igru</button>", "<button class=\"btn lob-cta\" id=\"start\"' + (on < 1 || catFew(d) ? ' disabled' : '') + '>Započni igru</button>")
rep("  function lenPick(d) {", r"""  // ---------- odabir kategorija ----------
  function catFew(d) { return !!(game && d.opt && d.opt.all && d.opt.all.length - (d.opt.off || []).length < 4); }
  let catGame = null, catTimer = 0;
  function catSave(off) { try { localStorage.setItem('tt_cats_off', JSON.stringify(off)); } catch (e) {} }
  function catLoad() { try { const v = JSON.parse(localStorage.getItem('tt_cats_off') || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch (e) { return []; } }
  function catPick(d) {
    if (!d.opt || !d.opt.all) return '';
    const all = d.opt.all, off = d.opt.off || [], n = all.length - off.length;
    if (!game) return off.length ? '<div class="len-info">🗂️ Kategorije: ' + n + ' od ' + all.length + '</div>' : '';
    if (catGame !== game) { // zapamćeni odabir s prošle igre primijeni jednom po sobi
      catGame = game; const g = game, saved = catLoad();
      if (saved.length) setTimeout(() => { if (game === g && g.view().ph === 'lobby') g.setOpt('cats', saved); }, 0);
    }
    return '<button class="btn ghost cat-open' + (n < 4 ? ' cat-bad' : '') + '" id="catOpen" aria-haspopup="dialog">🗂️ Kategorije · ' + n + ' od ' + all.length + '</button>';
  }
  function catOvClose() { const ov = document.getElementById('catOv'); if (ov) ov.remove(); clearInterval(catTimer); catTimer = 0; }
  function catOvSync() {
    const ov = document.getElementById('catOv'); if (!ov) return;
    if (!game || game.view().ph !== 'lobby') return catOvClose();
    const o = game.view().opt, off = o.off || [], n = o.all.length - off.length;
    ov.querySelectorAll('[data-cat]').forEach((b) => { const on = off.indexOf(b.dataset.cat) < 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    ov.querySelector('.cat-cnt').textContent = n + ' od ' + o.all.length + ' uključeno';
    ov.querySelector('.cat-hint').textContent = n < 4 ? 'Uključi barem 4 kategorije da bi igra mogla početi.' : '';
    ov.querySelector('#catDone').disabled = n < 4;
  }
  function catOvOpen() {
    if (!game || document.getElementById('catOv')) return;
    const o = game.view().opt; if (!o || !o.all) return;
    const ov = document.createElement('div'); ov.id = 'catOv'; ov.className = 'inv-modal cat-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Odabir kategorija');
    ov.innerHTML = '<div class="inv-card cat-card"><div class="cat-top"><b>Kategorije</b><span class="cat-cnt"></span></div>' +
      '<div class="cat-bulk"><button class="btn ghost" data-catall="1">Sve</button><button class="btn ghost" data-catall="0">Nijedna</button></div>' +
      '<div class="cat-grid">' + o.all.map((c) => '<button class="cat-chip" data-cat="' + esc(c) + '" aria-pressed="true">' + esc(c) + '</button>').join('') + '</div>' +
      '<div class="cat-hint" role="status"></div><button class="btn lob-cta" id="catDone">Gotovo</button></div>';
    document.body.appendChild(ov); catOvSync();
    catTimer = setInterval(catOvSync, 1000);
  }
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target : null; if (!t || !game) return;
    if (t.closest('#catOpen')) { AUDIO.play('tap'); return catOvOpen(); }
    if (t.closest('#catDone')) { AUDIO.play('tap'); return catOvClose(); }
    const all = t.closest('[data-catall]');
    if (all) { AUDIO.play('tap'); const o = game.view().opt; const off = all.dataset.catall === '1' ? [] : o.all.slice(); game.setOpt('cats', off); catSave(off); return catOvSync(); }
    const b = t.closest('#catOv [data-cat]');
    if (b) { AUDIO.play('tap'); const o = game.view().opt, off = (o.off || []).slice(), i = off.indexOf(b.dataset.cat); if (i >= 0) off.splice(i, 1); else off.push(b.dataset.cat); game.setOpt('cats', off); catSave(off); catOvSync(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('catOv') && game && game.view().opt && game.view().opt.all.length - (game.view().opt.off || []).length >= 4) catOvClose(); });
  function lenPick(d) {""")
rep("  .len-info {", """  .cat-open { flex: none; }
  .cat-open.cat-bad { box-shadow: inset 0 0 0 2px #e0644a; }
  .cat-card { width: min(100%, 560px); max-height: calc(100dvh - 32px); align-items: stretch; }
  .cat-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-family: var(--font-body); color: #ffe2a6; }
  .cat-top b { font-size: 1.15rem; } .cat-cnt { font-size: 0.82rem; font-weight: 800; }
  .cat-bulk { display: flex; gap: 8px; } .cat-bulk .btn { flex: 1; min-height: 38px; }
  .cat-grid { display: flex; flex-wrap: wrap; gap: 6px; overflow-y: auto; min-height: 0; flex: 1 1 auto; padding: 2px; -webkit-overflow-scrolling: touch; }
  .cat-chip { min-height: 36px; padding: 0 12px; border-radius: 999px; font-family: var(--font-body); font-weight: 800; font-size: 0.82rem; color: #f3e3c4; background: rgba(255, 255, 255, 0.08); box-shadow: inset 0 0 0 1px rgba(243, 227, 196, 0.3); text-decoration: line-through; opacity: 0.7; }
  .cat-chip.on { color: #2a1606; background: linear-gradient(180deg, #f0c66e, #c4892f); box-shadow: 0 2px 0 #7a4f17; text-decoration: none; opacity: 1; }
  .cat-hint { min-height: 1.1em; font-family: var(--font-body); font-size: 0.8rem; font-weight: 800; color: #ff9a80; text-align: center; }
  .cat-card .lob-cta:disabled { opacity: 0.5; }
  .len-info {""")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('port-catpick OK')
