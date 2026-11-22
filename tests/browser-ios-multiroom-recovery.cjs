// Actual browser/app/transport with native HTTP and WebSocket connections.
// A normal state heartbeat from another room is delivered deterministically;
// this is not a physical iPhone run or an injected transport failure.
const pw = require('playwright'), fs = require('node:fs'), path = require('node:path'), http = require('node:http'), vm = require('node:vm'), assert = require('node:assert/strict');
const { WebSocketServer } = require('ws');
const { execFileSync } = require('node:child_process');
const browserName = process.env.BROWSER || 'chromium', root = path.join(__dirname, '..');
const baselineApp = process.env.AUDIT_APP_REF ? execFileSync('git', ['show', process.env.AUDIT_APP_REF + ':app.js'], { cwd: root }) : null;
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.make=createGame;', box);
const rooms = new Map(), admissions = [], errors = []; let origin, creates = 0;
const ids = [['ABCD', 'a'.repeat(22)], ['WXYZ', 'b'.repeat(22)]];
(async () => {
  const policy = await import('../server/policy.mjs'), worker = fs.readFileSync(path.join(root, 'server/worker.mjs'), 'utf8');
  const method = (from, to) => worker.slice(worker.indexOf('  ' + from), worker.indexOf('  ' + to));
  const Protocol = vm.runInNewContext('(class {' + method('async hello(', 'async webSocketMessage(') + method('error(', 'queue(') + method('sendState(', 'broadcast(') + '})', { validSecret: policy.validSecret, validIdentity: policy.validIdentity, Date });
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
  const server = http.createServer(async (request, response) => {
    const u = new URL(request.url, origin || 'http://127.0.0.1');
    if (u.pathname === '/api/rooms' && request.method === 'POST') {
      let body = ''; for await (const chunk of request) body += chunk;
      const owner = JSON.parse(body); assert(policy.validIdentity(owner));
      const [code, secret] = ids[creates++], game = box.make({ code, noTv: owner.noTv });
      if (owner.noTv) game.addPlayer(owner.pid, owner.name, owner.av, false, false);
      const protocol = new Protocol();
      Object.assign(protocol, { game, keys: new Map([[owner.pid, owner.sk]]), sockets: new Map(), meta: { code, secret, owner, expires: Date.now() + 3600000 },
        ctx: { storage: { setAlarm: async () => {} } }, sync() {}, commit: async () => {}, startHeartbeat() {} });
      rooms.set(code, protocol);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return response.end(JSON.stringify({ code, secret }));
    }
    if (u.pathname === '/runtime-config.js') { response.writeHead(200, { 'Content-Type': 'application/javascript' }); return response.end('globalThis.TAVERN_CLOUD={apiOrigin:location.origin,publicUrl:location.origin+"/"};'); }
    if (u.pathname === '/app.js' && baselineApp) { response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' }); return response.end(baselineApp); }
    const file = path.resolve(root, '.' + (u.pathname === '/' ? '/index.html' : u.pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); return response.end(); }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' }); fs.createReadStream(file).pipe(response);
  });
  const sockets = new WebSocketServer({ server });
  sockets.on('connection', (socket, request) => {
    const code = new URL(request.url, origin).pathname.split('/').at(-1), protocol = rooms.get(code);
    if (!protocol) return socket.close();
    const info = { authenticated: false }; socket.serializeAttachment = () => {}; protocol.sockets.set(socket, info);
    socket.on('close', () => protocol.sockets.delete(socket));
    socket.on('message', async raw => {
      const packet = JSON.parse(raw.toString());
      if (packet.t === 'hello') { admissions.push({ code, pid: packet.pid, role: packet.role }); await protocol.hello(socket, info, packet); }
      // State heartbeats are explicitly ordered by this test. Admission still
      // executes the production owner/identity validation and tab replacement.
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await pw[browserName].launch(browserName === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
    const context = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, serviceWorkers: 'block' });
    const first = await context.newPage(), second = await context.newPage();
    for (const page of [first, second]) {
      page.on('pageerror', error => errors.push(error.message));
      // A discarded mobile process need not run pagehide. Suppress only that
      // lifecycle handler for the explicitly marked reload below; unlike the
      // ordinary reload check, this intentionally models a missing callback.
      await page.addInitScript(() => window.addEventListener('pagehide', event => { if (window.__simulateDiscard) event.stopImmediatePropagation(); }, true));
    }
    // Both tabs initially display the homepage. Creating a room in one tab
    // must not change which room a subsequently used second tab can restore.
    await first.goto(origin); await second.goto(origin);
    for (const page of [first, second]) {
      await page.locator('#hostp').click(); await page.locator('#hname').fill('Ana');
      await page.locator('#hform button[type=submit]').click(); await page.locator('#dstart').waitFor();
    }
    assert.equal(creates, 2);
    assert.equal(await second.evaluate(() => location.hash), '');
    assert.equal((await second.evaluate(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')))).code, 'WXYZ');
    const heartbeat = code => { const room = rooms.get(code); for (const [socket, info] of room.sockets) room.sendState(socket, info); };
    const recordCode = () => second.evaluate(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1'))?.code || null);
    const selected = process.env.MULTIROOM_SCENARIO;
    if (!selected || selected === 'opener') {
      await context.addInitScript(() => { window.__initialCloudRecovery = sessionStorage.getItem('mz_cloud_resume_v1'); });
      const childPromise = context.waitForEvent('page');
      await first.evaluate(url => window.open(url), origin + '/#WXYZ-' + ids[1][1]);
      const child = await childPromise; child.on('pageerror', error => errors.push(error.message));
      await child.waitForLoadState('networkidle');
      const initial = await child.evaluate(() => { const raw = window.__initialCloudRecovery; return raw && JSON.parse(raw).code; });
      assert.equal(await child.locator('#dstart').count(), 1, 'An explicit matching QR must preserve the WXYZ owner even when the new tab inherits another room’s sessionStorage; inherited=' + initial);
      assert.equal(admissions.at(-1).code, 'WXYZ');
      if (!selected) {
        await second.locator('#resumeHere').click(); await second.locator('#dstart').waitFor();
        await child.locator('#resumeHere').waitFor(); await child.close();
      }
    }
    for (const discard of [false, true]) {
      const label = discard ? 'discard' : 'normal'; if (selected && selected !== label) continue;
      heartbeat('ABCD');
      await first.waitForFunction(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')).code === 'ABCD');
      await second.waitForLoadState('networkidle');
      if (discard) await second.evaluate(() => { window.__simulateDiscard = true; });
      const beforeReload = admissions.length;
      await second.reload(); await second.locator('#dstart').waitFor();
      assert(admissions.length > beforeReload, 'Reload must perform authenticated admission');
      const restored = admissions.at(-1).code, firstSuperseded = await first.locator('#resumeHere').count();
      assert.equal(restored, 'WXYZ', `Other-room heartbeat cannot redirect ${label} recovery; restored=${restored}, firstTabSuperseded=${firstSuperseded}, creates=${creates}`);
      assert.equal(firstSuperseded, 0, 'Restoring the other room cannot displace the first tab');
    }
    if (!selected || selected === 'final') {
      heartbeat('WXYZ'); await second.waitForFunction(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')).code === 'WXYZ');
      const room = rooms.get('ABCD');
      Object.assign(room.game._G, { ph: 'final', s: 100, dur: 0, endsAt: Date.now(), finalRank: [room.meta.owner.pid], win: room.meta.owner.pid, fact: '' });
      heartbeat('ABCD'); await first.waitForFunction(() => document.documentElement.dataset.ph === 'final');
      assert.equal(await recordCode(), 'WXYZ', 'Finishing room ABCD must not erase the active WXYZ recovery record');
    }
    if (!selected || selected === 'leave') {
      heartbeat('WXYZ'); await second.waitForFunction(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')).code === 'WXYZ');
      await first.locator('#leave').click(); await first.locator('#hostp').waitFor();
      assert.equal(await recordCode(), 'WXYZ', 'Leaving room ABCD must not erase the active WXYZ recovery record');
      const beforeResume = admissions.length;
      await first.evaluate(() => { window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('pageshow')); document.dispatchEvent(new Event('visibilitychange')); });
      await first.waitForTimeout(300);
      assert.equal(await first.locator('#hostp').count(), 1, 'Leaving a room must stay on the homepage when lifecycle recovery runs');
      assert.equal(admissions.length, beforeResume, 'The dismissed tab cannot silently join the other room’s shared fallback');
    }
    assert.equal(creates, 2, 'Recovery cannot create another room');
    assert.equal(errors.length, 0, errors.join('; '));
    console.log(`${browserName}: ${selected || 'opener/normal/discard/final/leave'} multi-room recovery preserves each tab and scoped cleanup (native HTTP/WS; discard deliberately omits pagehide).`);
  } finally { for (const room of rooms.values()) room.game.stop(); if (browser) await browser.close(); await new Promise(resolve => sockets.close(resolve)); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
