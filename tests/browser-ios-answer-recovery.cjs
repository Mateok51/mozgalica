// Real browser/app/transport/engine, authenticated WebSocket server fixture.
// One native send failure is injected; this is not a physical iPhone run.
const pw = require('playwright'), fs = require('node:fs'), path = require('node:path'), http = require('node:http'), vm = require('node:vm'), assert = require('node:assert/strict');
const { WebSocketServer } = require('ws');
const browserName = process.env.BROWSER || 'chromium', root = path.join(__dirname, '..'), secret = 'a'.repeat(22), room = 'ABCD';
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.make=createGame;', box);
const game = box.make({ code: room, noTv: true });
game.addPlayer('host', 'Domaćin', 0, false, false);
const connections = [], keys = new Map(), inputTrace = [], errors = [];
let origin;
const view = who => ({ ...game.view(), pv: game.priv(who.pid), cloud: { owner: false, noTv: true } });
const push = () => { for (const c of connections) if (c.who && !c.closed) try { c.socket.send(JSON.stringify(view(c.who))); } catch {} };
const wait = async (fn, message, ms = 10000) => { const until = Date.now() + ms; while (Date.now() < until) { if (fn()) return; await new Promise(r => setTimeout(r, 30)); } throw Error(message + '; inputs=' + JSON.stringify(inputTrace)); };
(async () => {
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
  const server = http.createServer((request, response) => {
    const u = new URL(request.url, origin || 'http://127.0.0.1');
    if (u.pathname === '/runtime-config.js') { response.writeHead(200, { 'Content-Type': 'application/javascript' }); return response.end('globalThis.TAVERN_CLOUD={apiOrigin:location.origin,publicUrl:location.origin+"/"};'); }
    const file = path.resolve(root, '.' + (u.pathname === '/' ? '/index.html' : u.pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); return response.end(); }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' }); fs.createReadStream(file).pipe(response);
  });
  // Execute the production room admission/replacement methods so the two-tab
  // regression does not duplicate (and accidentally hide) its server policy.
  const policy = await import('../server/policy.mjs');
  const worker = fs.readFileSync(path.join(root, 'server/worker.mjs'), 'utf8');
  const method = (from, to) => worker.slice(worker.indexOf('  ' + from), worker.indexOf('  ' + to));
  const Protocol = vm.runInNewContext('(class {' + method('async hello(', 'async webSocketMessage(') + method('error(', 'queue(') + method('sendState(', 'broadcast(') + '})', { validSecret: policy.validSecret, validIdentity: policy.validIdentity, Date });
  const protocol = new Protocol();
  Object.assign(protocol, { game, keys, sockets: new Map(), meta: { owner: { pid: 'host', noTv: true }, expires: Date.now() + 3600000 },
    ctx: { storage: { setAlarm: async () => {} } }, sync() {}, commit: async () => {}, startHeartbeat() {} });
  const sockets = new WebSocketServer({ server, path: '/api/rooms/ABCD' });
  sockets.on('connection', socket => {
    const c = { socket, who: null, closed: false }; connections.push(c);
    socket.serializeAttachment = () => {};
    protocol.sockets.set(socket, c);
    socket.on('close', () => { c.closed = true; protocol.sockets.delete(socket); });
    socket.on('message', async raw => {
      const m = JSON.parse(raw.toString());
      if (m.t === 'hello') {
        protocol.meta.secret = secret;
        await protocol.hello(socket, c, m);
        if (c.authenticated) c.who = m;
      } else if (m.t === 'ping' && c.who) socket.send(JSON.stringify(view(c.who)));
      else if (m.t === 'in' && c.who) { inputTrace.push({ s: m.in.s, r: m.in.r, f: m.in.f, accepted: game.setInput(c.who.pid, m.in) }); push(); }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await pw[browserName].launch(browserName === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
    const context = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const nativeSend = WebSocket.prototype.send;
      window.__injectedFailures = 0;
      WebSocket.prototype.send = function (data) {
        const packet = typeof data === 'string' && data.startsWith('{') ? JSON.parse(data) : null;
        if (window.__failNextFinalAnswer && packet?.t === 'in' && packet.in?.f === 1) {
          window.__failNextFinalAnswer = false; window.__injectedFailures++;
          throw new DOMException('Injected one-shot native socket send failure', 'NetworkError');
        }
        return nativeSend.call(this, data);
      };
    });
    await page.goto(origin + '/#' + room + '-' + secret);
    await page.locator('#name').fill('Ana'); await page.locator('#form button[type=submit]').click(); await page.locator('.lob-row').nth(1).waitFor();
    const pid = await page.evaluate(() => localStorage.getItem('mz_pid'));
    const exerciseTwoTabs = async () => {
      const baseline = connections.length, ph = game._G.ph;
      const second = await context.newPage();
      second.on('pageerror', error => errors.push(error.message));
      await second.goto(origin + '/#' + room + '-' + secret);
      await second.waitForFunction(ph => document.documentElement.dataset.ph === ph, ph);
      assert.equal(await second.evaluate(() => localStorage.getItem('mz_pid')), pid, 'Both tabs must use the existing device identity');
      await page.getByRole('button', { name: 'Nastavi ovdje', exact: true }).waitFor();
      const record = await second.evaluate(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')));
      assert(record && record.pid === pid && record.code === room, 'The displaced tab must preserve the new tab’s shared recovery record');
      await page.evaluate(() => { window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('pageshow')); document.dispatchEvent(new Event('visibilitychange')); });
      await new Promise(resolve => setTimeout(resolve, 2200));
      assert.equal(connections.length, baseline + 1, 'Opening a second QR tab must not make both tabs repeatedly evict and reconnect each other');
      await page.setViewportSize({ width: 375, height: 553 });
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const resumeBox = await page.getByRole('button', { name: 'Nastavi ovdje', exact: true }).boundingBox();
      assert(resumeBox && resumeBox.x >= 0 && resumeBox.y >= 0 && resumeBox.x + resumeBox.width <= 375 && resumeBox.y + resumeBox.height <= 553, 'Explicit transfer control must fit an iPhone SE Safari viewport');
      await page.getByRole('button', { name: 'Nastavi ovdje', exact: true }).click();
      await page.waitForFunction(ph => document.documentElement.dataset.ph === ph, ph);
      await second.getByRole('button', { name: 'Nastavi ovdje', exact: true }).waitFor();
      await new Promise(resolve => setTimeout(resolve, 2200));
      assert.equal(connections.length, baseline + 2, 'Explicit resume must transfer the session exactly once, then remain stable');
      const transferred = await page.evaluate(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')));
      assert(transferred && transferred.pid === pid && transferred.code === room, 'Explicit transfer must preserve the current recovery target');
      assert.equal(game.view().P.filter(p => p.id === pid).length, 1, 'Tab transfer cannot add another player');
      assert.equal(errors.length, 0, errors.join('; '));
      console.log(`${browserName}: QR in a second tab remains quiet, preserves shared recovery, and explicit resume transfers the same identity once (production room admission methods).`);
    };
    if (process.env.RECOVERY_SCENARIO === 'two-tabs') {
      await exerciseTwoTabs();
      return;
    }
    Object.assign(game._G, { ph: 'blitz', s: 100, bz: { list: [['Prva', 0], ['Druga', 1], ['Treća', 0], ['Četvrta', 1]] }, dur: 30000, startedAt: Date.now(), endsAt: Date.now() + 30000 });
    push(); await page.waitForFunction(() => document.documentElement.dataset.ph === 'blitz');
    await page.waitForLoadState('networkidle'); await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
    for (const answer of [0, 1, 0]) await page.locator(`[data-bz="${answer}"]`).click();
    await wait(() => JSON.stringify(game._p(pid).bzA) === '[0,1,0]', 'The first three answers must reach the authoritative engine');
    await page.evaluate(() => { window.__failNextFinalAnswer = true; });
    await page.locator('[data-bz="1"]').click();
    assert.equal(await page.evaluate(() => window.__injectedFailures), 1, 'Exactly one final answer send must fail');
    assert.match(await page.locator('#app').innerText(), /Gotovo!/);
    // Healthy checks can still exchange state. A failed send must trigger
    // recovery/resend instead of silently leaving the final answer unsent.
    const heartbeat = setInterval(push, 1000);
    try { await wait(() => JSON.stringify(game._p(pid).bzA) === '[0,1,0,1]' && game._p(pid).done, 'A one-shot failed final answer must be retried, not silently lose its last answer'); }
    finally { clearInterval(heartbeat); }
    assert.equal(game.view().P.filter(p => p.id === pid).length, 1);
    assert.equal(errors.length, 0, errors.join('; '));
    console.log(`${browserName}: one-shot final answer send failure recovers all four Blitz answers without duplicate identity (injected native failure, authenticated engine fixture).`);
    await exerciseTwoTabs();
  } finally { game.stop(); if (browser) await browser.close(); await new Promise(resolve => sockets.close(resolve)); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
