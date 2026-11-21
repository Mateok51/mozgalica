// Real browser/app/transport and authoritative engine; routed WebSocket server
// fixture. Reload models Safari discarding a tab, not a physical iPhone run.
const pw = require('playwright'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const browserName = process.env.BROWSER || 'chromium', root = path.join(__dirname, '..');
const origin = 'http://127.0.0.1:8787', secret = 'a'.repeat(22), room = 'ABCD';
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.make=createGame;', box);
const game = box.make({ code: room, noTv: true });
game.addPlayer('host', 'Domaćin', 0, false, false);
const keys = new Map(), connections = [], errors = [];
function view(who) { return { ...game.view(), pv: game.priv(who.pid), cloud: { owner: false, noTv: true } }; }
function push() { for (const c of connections) if (c.who) try { c.socket.send(JSON.stringify(view(c.who))); } catch {} }
const wait = async (fn, message) => { const end = Date.now() + 10000; while (Date.now() < end) { if (fn()) return; await new Promise(r => setTimeout(r, 30)); } throw Error(message); };
(async () => {
  const browser = await pw[browserName].launch(browserName === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const u = new URL(route.request().url()); if (u.origin !== origin) return route.abort();
      if (u.pathname === '/runtime-config.js') return route.fulfill({ body: 'globalThis.TAVERN_CLOUD={apiOrigin:location.origin,publicUrl:location.origin+"/"};', contentType: 'application/javascript' });
      if (u.pathname.endsWith('peerjs.min.js')) return route.abort();
      const file = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
      return fs.existsSync(file) && fs.statSync(file).isFile() ? route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'application/javascript' : file.endsWith('.html') ? 'text/html' : undefined }) : route.abort();
    });
    await page.routeWebSocket('**/api/rooms/ABCD', socket => {
      const connection = { socket, who: null }; connections.push(connection);
      socket.onMessage(raw => {
        const m = JSON.parse(raw);
        if (m.t === 'hello') {
          if (m.secret !== secret || (keys.has(m.pid) && keys.get(m.pid) !== m.sk)) return socket.send(JSON.stringify({ t: 'error', reason: 'auth' }));
          if (!game._p(m.pid) && game.view().ph !== 'lobby') return socket.send(JSON.stringify({ t: 'error', reason: 'started' }));
          keys.set(m.pid, m.sk); connection.who = m;
          if (!game._p(m.pid)) game.addPlayer(m.pid, m.name, m.av, false, false);
          socket.send(JSON.stringify(view(m)));
        } else if (m.t === 'ping' && connection.who) socket.send(JSON.stringify(view(connection.who)));
        else if (m.t === 'in' && connection.who) { game.setInput(connection.who.pid, m.in); push(); }
      });
    });
    await page.goto(origin + '/#' + room + '-' + secret);
    await page.locator('#name').fill('Ana');
    await page.locator('#form button[type=submit]').click();
    await page.locator('.lob-row').nth(1).waitFor();
    const pid = await page.evaluate(() => localStorage.getItem('mz_pid'));
    Object.assign(game._G, { ph: 'sort', s: 100, so: { a: 'A', b: 'B', items: ['Prvi', 'Drugi', 'Treći', 'Četvrti'], key: [0, 1, 0, 1] }, dur: 120000, startedAt: Date.now(), endsAt: Date.now() + 120000 });
    push();
    await page.locator('.swp-card:not(.swp-peek)').filter({ hasText: 'Prvi' }).waitFor();
    await page.locator('[data-go="0"]').click();
    await page.locator('.swp-card:not(.swp-peek)').filter({ hasText: 'Drugi' }).waitFor();
    // Sorting deliberately blocks taps for its 380ms animation cooldown.
    await page.waitForTimeout(400);
    await page.locator('[data-go="1"]').click();
    await page.locator('.swp-card:not(.swp-peek)').filter({ hasText: 'Treći' }).waitFor();
    await wait(() => JSON.stringify(game._p(pid).sortA) === '[0,1,-1,-1]', 'Server did not accept both sorting answers');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.ph === 'sort');
    const restored = (await page.locator('.swp-card:not(.swp-peek)').innerText()).trim();
    // Record the destructive follow-up too: before the fix, the reset UI sends
    // [0,-1,-1,-1] and erases the already accepted second answer.
    await page.locator('[data-go="0"]').click();
    await wait(() => JSON.stringify(game._p(pid).sortA) !== '[0,1,-1,-1]', 'The resumed choice was not accepted');
    const serverAnswers = Array.from(game._p(pid).sortA);
    assert.equal(restored, 'Treći', 'Reload must resume the next unanswered item, not restart the mini-game; continued server answers=' + JSON.stringify(serverAnswers));
    assert.deepEqual(serverAnswers, [0, 1, 0, -1], 'Continuing after reload must retain both already accepted answers');
    let step = 100;
    const phase = async (ph, data) => {
      for (const p of game.view().P) game._p(p.id).done = false;
      Object.assign(game._G, { ph, s: ++step, dur: 120000, startedAt: Date.now(), endsAt: Date.now() + 120000 }, data);
      push(); await page.waitForFunction(ph => document.documentElement.dataset.ph === ph, ph);
    };
    const reloadPhase = async ph => { await page.reload(); await page.waitForFunction(ph => document.documentElement.dataset.ph === ph, ph); };
    await phase('link', { li: { t: 'Parovi', L: ['A', 'B', 'C', 'D'], R: ['a', 'b', 'c', 'd'], key: [1, 0, 2, 3] } });
    for (const [l, r] of [[0, 1], [1, 0]]) { await page.locator(`[data-ll="${l}"]`).click(); await page.locator(`[data-lr="${r}"]`).click(); }
    await wait(() => JSON.stringify(game._p(pid).linkA) === '[1,0,-1,-1]', 'Server did not accept both pairs');
    await reloadPhase('link');
    assert.equal(await page.locator('.lnk-l.paired').count(), 2, 'Reload must restore both accepted links');
    await page.locator('[data-ll="2"]').click(); await page.locator('[data-lr="2"]').click();
    await wait(() => JSON.stringify(game._p(pid).linkA) === '[1,0,2,-1]', 'Resumed linking erased earlier pairs');

    await phase('order', { or: { t: 'Redoslijed', lo: 'prvi', hi: 'zadnji', items: ['A', 'B', 'C', 'D'], key: [1, 3, 0, 2] } });
    await page.locator('[data-or="2"]').click(); await page.locator('[data-or="0"]').click();
    await wait(() => JSON.stringify(game._p(pid).ordA) === '[1,-1,0,-1]', 'Server did not accept ordering progress');
    await reloadPhase('order');
    assert.equal(await page.locator('[data-or="2"] .n').innerText(), '1');
    assert.equal(await page.locator('[data-or="0"] .n').innerText(), '2');
    const current = connections.at(-1), stale = JSON.stringify(view(current.who));
    await page.locator('[data-or="3"]').click();
    await wait(() => JSON.stringify(game._p(pid).ordA) === '[1,-1,0,2]', 'Resumed ordering erased earlier choices');
    current.socket.send(stale);
    await page.waitForTimeout(60);
    assert.equal(await page.locator('[data-or="3"] .n').innerText(), '3', 'A delayed same-step private snapshot must not overwrite newer local input');

    const binaryList = ['Prva', 'Druga', 'Treća', 'Četvrta'].map((q, i) => [q, i % 2]);
    for (const [ph, key, attr, field] of [['hilo', 'hl', 'hl', 'hlA'], ['blitz', 'bz', 'bz', 'bzA'], ['rope', 'rp', 'rpv', 'rpA']]) {
      const list = ph === 'hilo' ? binaryList.map(([q, w]) => ({ q, w, a: ['A', 'B'] })) : binaryList;
      await phase(ph, { [key]: { list, pa: 0, pb: 0 }, ...(ph === 'rope' ? { du: { a: pid, b: 'host' } } : {}) });
      await page.locator(`[data-${attr}="0"]`).click(); await page.locator(`[data-${attr}="1"]`).click();
      await wait(() => JSON.stringify(game._p(pid)[field]) === '[0,1]', `${ph} server did not accept two answers`);
      await reloadPhase(ph);
      assert.equal(await page.locator('.mg-q').innerText(), 'Treća', `${ph} must resume the next assertion`);
      await page.locator(`[data-${attr}="0"]`).click();
      await wait(() => JSON.stringify(game._p(pid)[field]) === '[0,1,0]', `${ph} resumed answer must retain accepted progress`);
    }
    assert.equal(game.view().P.filter(p => p.id === pid).length, 1, 'Recovery must reuse player identity');
    assert.equal(errors.length, 0, errors.join('; '));
    console.log(`${browserName}: QR admission, reload/continue preserves sort/link/order/hilo/blitz/rope progress; delayed same-step snapshot preserves newer local input (authenticated engine fixture).`);
  } finally { game.stop(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
