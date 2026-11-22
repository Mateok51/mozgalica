// Actual app/transport/engine plus production room admission methods. This
// exercises shared-origin tabs; it does not claim physical iPhone QR coverage.
const pw = require('playwright'), fs = require('node:fs'), path = require('node:path'), http = require('node:http'), vm = require('node:vm'), assert = require('node:assert/strict');
const { WebSocketServer } = require('ws');
const browserName = process.env.BROWSER || 'chromium', root = path.join(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app.js'));
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.make=createGame;', box);
const rooms = new Map(), connections = [], errors = [], controls = [];
let origin, created = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const policy = await import('../server/policy.mjs');
  const worker = fs.readFileSync(path.join(root, 'server/worker.mjs'), 'utf8');
  const method = (from, to) => worker.slice(worker.indexOf('  ' + from), worker.indexOf('  ' + to));
  const Protocol = vm.runInNewContext('(class {' + method('async hello(', 'async webSocketMessage(') + method('error(', 'queue(') + method('sendState(', 'broadcast(') + '})', { validSecret: policy.validSecret, validIdentity: policy.validIdentity, Date });
  const push = room => { for (const [socket, info] of room.protocol.sockets) room.protocol.sendState(socket, info); };
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
  const server = http.createServer(async (request, response) => {
    const u = new URL(request.url, origin || 'http://127.0.0.1');
    if (u.pathname === '/runtime-config.js') { response.writeHead(200, { 'Content-Type': 'application/javascript' }); return response.end('globalThis.TAVERN_CLOUD={apiOrigin:location.origin,publicUrl:location.origin+"/"};'); }
    if (u.pathname === '/api/rooms' && request.method === 'POST') {
      let text = ''; for await (const chunk of request) text += chunk;
      const owner = JSON.parse(text);
      assert(policy.validIdentity(owner)); assert.equal(owner.noTv, true);
      const code = ['ABCD', 'EFGH'][created++], secret = (code === 'ABCD' ? 'a' : 'b').repeat(22);
      assert(code, 'The browser must not create extra rooms during invitation recovery');
      const game = box.make({ code, noTv: true });
      game.addPlayer(owner.pid, owner.name, owner.av, false, false);
      const protocol = new Protocol(), room = { code, secret, owner, game, protocol };
      Object.assign(protocol, { game, keys: new Map([[owner.pid, owner.sk]]), sockets: new Map(), meta: { owner, secret, expires: Date.now() + 3600000 },
        ctx: { storage: { setAlarm: async () => {} } }, sync() {}, commit: async () => push(room), startHeartbeat() {} });
      rooms.set(code, room);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return response.end(JSON.stringify({ code, secret }));
    }
    const file = path.resolve(root, '.' + (u.pathname === '/' ? '/index.html' : u.pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); return response.end(); }
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (u.pathname === '/app.js') return response.end(appSource);
    fs.createReadStream(file).pipe(response);
  });
  const sockets = new WebSocketServer({ server });
  sockets.on('connection', (socket, request) => {
    const room = rooms.get(request.url.split('/').at(-1));
    if (!room) return socket.close(1008, 'Unknown room');
    const info = {}, connection = { room, socket, info }; connections.push(connection);
    socket.serializeAttachment = () => {};
    room.protocol.sockets.set(socket, info);
    socket.on('close', () => room.protocol.sockets.delete(socket));
    socket.on('message', async raw => {
      const message = JSON.parse(raw.toString());
      if (message.t === 'hello') { await room.protocol.hello(socket, info, message); return; }
      if (!info.authenticated) return;
      if (message.t === 'ping') return room.protocol.sendState(socket, info);
      if (message.t === 'control') {
        assert.equal(info.pid, room.owner.pid, 'Only the authenticated owner may control the room');
        assert(policy.controlAllowed(message.method, message.args));
        controls.push({ code: room.code, pid: info.pid, method: message.method });
        room.game[message.method](...message.args); push(room);
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await pw[browserName].launch(browserName === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
    const makeContext = () => browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, serviceWorkers: 'block' });
    const context = await makeContext(), guestContext = await makeContext();
    const makePage = async context => {
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        const save = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          const result = save.call(this, key, value);
          if (this === localStorage && key === 'mz_cloud_resume_v1') window.__ownRecoveryWrite = JSON.parse(value);
          return result;
        };
      });
      return page;
    };
    const host = await makePage(context);
    await host.goto(origin); await host.locator('#hostp').click(); await host.locator('#hname').fill('Ana');
    await host.locator('#hform button[type=submit]').click(); await host.locator('#dstart').waitFor();
    const saved = await host.evaluate(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')));
    assert.equal(saved.role, 'host'); assert.equal(saved.noTv, true); assert(saved.secret);
    const room = rooms.get(saved.code), invitation = origin + '/#' + saved.code + '-' + saved.secret;
    const guest = await makePage(guestContext);
    await guest.goto(invitation); await guest.locator('#name').fill('Gost'); await guest.locator('#form button[type=submit]').click();
    await guest.locator('.lob-row').nth(1).waitFor();
    assert.equal(await guest.locator('#dstart').count(), 0, 'An ordinary invited guest must never gain host controls');
    const before = connections.length, qr = await makePage(context);
    await qr.goto(invitation);
    // Record the unfixed behavior completely before failing the regression:
    // manual join uses the owner's identity but loses the host UI/recovery role.
    await qr.locator('#dstart, #form').first().waitFor();
    if (await qr.locator('#form').count()) {
      await qr.locator('#name').fill('Ana'); await qr.locator('#form button[type=submit]').click();
      await qr.locator('.lob-row').nth(1).waitFor();
      await host.getByRole('button', { name: 'Nastavi ovdje', exact: true }).waitFor();
      const overwritten = await qr.evaluate(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')));
      await qr.screenshot({ path: `/tmp/trivia-host-invitation-${browserName}-before.png` });
      console.log(`${browserName}: reproduced same-QR owner downgrade: server owner=${room.owner.pid === overwritten.pid}, saved role=${overwritten.role}, start controls=${await qr.locator('#dstart').count()}, create POSTs=${created}.`);
    }
    await qr.locator('#dstart').waitFor({ timeout: 3000 });
    await host.getByRole('button', { name: 'Nastavi ovdje', exact: true }).waitFor();
    const recovered = await qr.evaluate(() => JSON.parse(localStorage.getItem('mz_cloud_resume_v1')));
    assert.equal(recovered.pid, saved.pid); assert.equal(recovered.role, 'host'); assert.equal(recovered.secret, saved.secret);
    assert.equal(created, 1, 'The same QR must recover the original room rather than creating another');
    await wait(2200);
    assert.equal(connections.length, before + 1, 'The displaced host tab must remain quiet until explicitly resumed');
    await qr.locator('#dstart:not([disabled])').click();
    await qr.waitForFunction(() => document.documentElement.dataset.ph === 'intro');
    assert(controls.some(c => c.pid === saved.pid && c.method === 'start'), 'The recovered host must retain working authoritative controls');
    assert.equal(room.game.view().P.filter(p => p.id === saved.pid).length, 1);
    // A different secret must win over stored host recovery without connecting
    // to that stored room or silently claiming host privileges.
    const wrong = await makePage(context), count = connections.length;
    await wrong.goto(origin + '/#' + saved.code + '-' + 'z'.repeat(22));
    await wrong.locator('#form').waitFor(); await wait(200);
    assert.equal(await wrong.locator('#dstart').count(), 0); assert.equal(connections.length, count);
    assert.equal(await wrong.locator('#code').inputValue(), saved.code);
    // A full invitation for another room must also remain the selected target.
    const secondContext = await makeContext(), otherHost = await makePage(secondContext);
    await otherHost.goto(origin); await otherHost.locator('#hostp').click(); await otherHost.locator('#hname').fill('Drugi');
    await otherHost.locator('#hform button[type=submit]').click(); await otherHost.locator('#dstart').waitFor();
    const other = rooms.get('EFGH'), different = await makePage(context), previous = connections.length;
    await different.goto(origin + '/#' + other.code + '-' + other.secret);
    await different.locator('#form').waitFor(); await wait(200);
    assert.equal(connections.length, previous); assert.equal(await different.locator('#code').inputValue(), other.code);
    await different.locator('#name').fill('Ana'); await different.locator('#form button[type=submit]').click();
    await different.locator('.lob-row').nth(1).waitFor();
    assert.equal(await different.locator('#dstart').count(), 0, 'The owner of the previous room is only a guest in another room');
    // Other active rooms share this origin's single recovery key. Verify what
    // this authenticated tab writes, rather than racing another room's heartbeat.
    const otherRecord = await different.evaluate(() => window.__ownRecoveryWrite);
    assert.equal(otherRecord.code, other.code); assert.equal(otherRecord.role, 'player');
    assert.equal(errors.length, 0, errors.join('; '));
    console.log(`${browserName}: matching full QR preserves the confirmed phone host, working start control and one identity; different room/secret wins, guests retain no host privileges.`);
  } finally {
    for (const room of rooms.values()) room.game.stop();
    if (browser) await browser.close();
    await new Promise(resolve => sockets.close(resolve)); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
