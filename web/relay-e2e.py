# Rezervna veza preko javnih MQTT posrednika, šifrirana s kraja na kraj (AES-GCM).
# Tajni ključ sobe (128 bita) stvara domaćin i on putuje samo u QR kodu / poveznici (#KOD-ključ).
# Posrednik vidi samo šifrirani sadržaj i temu izvedenu iz ključa (ne iz koda sobe). Bez ključa (kod upisan ručno) nema releja, samo izravna veza.
SP = '/root/mozgalica'
s = open(SP + '/web/body.html', encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, ('relay-e2e', s.count(a), a[:90])
    s = s.replace(a, b)

rep("  // Javni MQTT nije autentificiran i izlaže ključ igrača. Ostaje isključen dok se ne uvede siguran relej.\n  const RELAY_ENABLED = false;",
    "  // Javni MQTT nije autentificiran, zato su sve poruke šifrirane tajnim ključem sobe (AES-GCM); bez ključa relej se ne koristi.\n  const RELAY_ENABLED = !!(window.crypto && crypto.subtle);")
rep("  const RELAY_NS = 'mozgalica-kip/v1/';", r"""  const RELAY_NS = 'mozgalica-kip/v2/';
  // ključ sobe: domaćin ga stvara; igrač ga dobiva iz poveznice/QR koda (#KOD-ključ) i pamti za tu sobu
  let HOST_RS = null, PLAYER_RS = null;
  const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const ub64u = (t) => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)), (c) => c.charCodeAt(0));
  const newRoomSecret = () => b64u(crypto.getRandomValues(new Uint8Array(16)));
  const okRS = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{22}$/.test(t);
  const joinHash = (code) => '#' + code + (HOST_RS ? '-' + HOST_RS : '');
  function rememberRS(code, rs) { try { if (okRS(rs)) sessionStorage.setItem('mz_rs_' + code, rs); } catch (e) {} }
  function recallRS(code) { try { const t = sessionStorage.getItem('mz_rs_' + code); return okRS(t) ? t : null; } catch (e) { return null; } }
  const RCTX = new Map();
  async function relayCtx(rs) {
    if (!okRS(rs)) return null;
    if (RCTX.has(rs)) return RCTX.get(rs);
    const raw = ub64u(rs), base = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey', 'deriveBits']);
    const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('mz-relay-key') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const tb = new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode('mz-relay-topic') }, base, 128));
    const ctx = { key, t: Array.from(tb, (b) => b.toString(16).padStart(2, '0')).join('') };
    RCTX.set(rs, ctx); return ctx;
  }
  async function rEnc(ctx, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12)), pt = enc.encode(typeof obj === 'string' ? obj : JSON.stringify(obj));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, ctx.key, pt));
    return JSON.stringify({ v: 2, i: b64u(iv), c: b64u(ct) });
  }
  async function rDec(ctx, m) {
    if (!ctx || !m || m.v !== 2 || typeof m.i !== 'string' || typeof m.c !== 'string') return null;
    try { return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64u(m.i) }, ctx.key, ub64u(m.c)))); } catch (e) { return null; }
  }
  // šifrirano slanje i primanje uz očuvan redoslijed poruka
  function rPub(client, ctx, topic, obj) { client.q2 = (client.q2 || Promise.resolve()).then(() => rEnc(ctx, obj)).then((t) => client.publish(topic, t)).catch(() => {}); }
  function rOn(ctx, fn) { let chain = Promise.resolve(); return (topic, m) => { chain = chain.then(() => rDec(ctx, m)).then((d) => { if (d) fn(topic, d); }).catch(() => {}); }; }""")
rep("          if (n - off <= 300000) {", "          if (n - off <= 700000) {")
rep("  const rTopic = (code, k) => RELAY_NS + code.toLowerCase() + '/' + k;", "  const rTopic = (ctx, k) => RELAY_NS + ctx.t + '/' + k;")
# domaćin
rep("""  function startHostRelay(code) {
    if (!RELAY_ENABLED) return;
    stopHostRelay();
    hostRelays = RELAY_URLS.map((u) => {
      const c = mqttClient(u, (topic, m) => onRelayHost(c, code, m), () => {});
      c.subscribe(rTopic(code, 'h'));
      return c;
    });""", """  let hostCtx = null;
  async function startHostRelay(code) {
    if (!RELAY_ENABLED || !HOST_RS) return;
    stopHostRelay();
    const ctx = await relayCtx(HOST_RS); if (!ctx || !game) return;
    hostCtx = ctx;
    hostRelays = RELAY_URLS.map((u) => {
      const c = mqttClient(u, rOn(ctx, (topic, m) => onRelayHost(c, ctx, m)), () => {});
      c.subscribe(rTopic(ctx, 'h'));
      return c;
    });""")
rep("    hostRelays.forEach((c) => c.close()); hostRelays = [];", "    hostRelays.forEach((c) => c.close()); hostRelays = []; hostCtx = null;")
rep("  function onRelayHost(client, code, m) {", "  function onRelayHost(client, ctx, m) {")
rep("        send(v) { client.publish(rTopic(code, 'p/' + pid + '/' + m.sk.slice(0, 16)), v); }, close() { this.open = false; } };",
    "        send(v) { rPub(client, ctx, rTopic(ctx, 'p/' + pid + '/' + m.sk.slice(0, 16)), v); }, close() { this.open = false; } };")
rep("    if (rel.size) { const js = JSON.stringify(v); rel.forEach((cl) => cl.publish(rTopic(v.code, 'all'), js)); }",
    "    if (rel.size && hostCtx) { const js = JSON.stringify(v), ctx = hostCtx; rel.forEach((cl) => rPub(cl, ctx, rTopic(ctx, 'all'), js)); }")
# igrač
rep("""    if (prelay || mode !== 'player') return;
    const code = pcode;""", """    if (prelay || mode !== 'player') return;
    const code = pcode, ctx = await relayCtx(PLAYER_RS);
    if (!ctx) return;   // kod upisan ručno, bez ključa sobe: samo izravna veza""")
rep("      const c = mqttClient(u, (topic, d) => {\n        if (prelay !== c) return;", "      const c = mqttClient(u, rOn(ctx, (topic, d) => {\n        if (prelay !== c) return;")
rep("        if (d && d.t === 'who') { c.publish(rTopic(code, 'h'), { t: 'hello', pid: PID, sk: SK, name: pname, av: myAv }); return; }",
    "        if (d && d.t === 'who') { rPub(c, ctx, rTopic(ctx, 'h'), { t: 'hello', pid: PID, sk: SK, name: pname, av: myAv }); return; }")
rep("      }, () => { if (prelay === c) { prelay = null;", "      }), () => { if (prelay === c) { prelay = null;")
rep("      c.subscribe(rTopic(code, 'all')); c.subscribe(rTopic(code, 'p/' + PID + '/' + SK.slice(0, 16)));",
    "      c.subscribe(rTopic(ctx, 'all')); c.subscribe(rTopic(ctx, 'p/' + PID + '/' + SK.slice(0, 16)));")
rep("        const hello = () => c.publish(rTopic(code, 'h'), { t: 'hello', pid: PID, sk: SK, name: pname, av: myAv });\n        hello(); if (L.sent) c.publish(rTopic(code, 'h'), { t: 'in', pid: PID, sk: SK, in: L.sent });",
    "        const hello = () => rPub(c, ctx, rTopic(ctx, 'h'), { t: 'hello', pid: PID, sk: SK, name: pname, av: myAv });\n        hello(); if (L.sent) rPub(c, ctx, rTopic(ctx, 'h'), { t: 'in', pid: PID, sk: SK, in: L.sent });")
rep("        clearInterval(prelayPing); prelayPing = setInterval(() => c.publish(rTopic(code, 'h'), { t: 'ping', pid: PID, sk: SK }), 3000);",
    "        clearInterval(prelayPing); prelayPing = setInterval(() => rPub(c, ctx, rTopic(ctx, 'h'), { t: 'ping', pid: PID, sk: SK }), 3000);\n        c.ctx = ctx;")
rep("    if (prelay) { try { prelay.publish(rTopic(pcode, 'h'), { t: 'bye', pid: PID, sk: SK }); } catch (e) {} const c = prelay; prelay = null; setTimeout(() => c.close(), 200); }",
    "    if (prelay) { const c = prelay; prelay = null; try { if (c.ctx) rPub(c, c.ctx, rTopic(c.ctx, 'h'), { t: 'bye', pid: PID, sk: SK }); } catch (e) {} setTimeout(() => c.close(), 300); }")
rep("    if (prelay) prelay.publish(rTopic(pcode, 'h'), Object.assign({}, m, { pid: PID, sk: SK }));",
    "    if (prelay && prelay.ctx) rPub(prelay, prelay.ctx, rTopic(prelay.ctx, 'h'), Object.assign({}, m, { pid: PID, sk: SK }));")
# ključ sobe: stvaranje, obnova, poveznice, QR
rep("  function openRoom(code, opts) {\n", "  function openRoom(code, opts) {\n    HOST_RS = opts && opts.recovery && okRS(opts.recovery.rs) ? opts.recovery.rs : RELAY_ENABLED ? newRoomSecret() : null;\n")
rep("noTv: mode === 'hostp', keys: [...hostKeys], journal }));", "noTv: mode === 'hostp', keys: [...hostKeys], rs: HOST_RS, journal }));")
rep("qrSvg(appUrl() + '#' + d.code)", "qrSvg(appUrl() + joinHash(d.code))", 2)
# igrač: ključ iz poveznice (#KOD-ključ), zapamćen za tu sobu
rep("  if (/^#?[A-Za-z]{4}$/.test(location.hash || '')) mode = 'join';",
    "  { const hm = (location.hash || '').match(/^#?([A-Za-z]{4})(?:-([A-Za-z0-9_-]{22}))?$/); if (hm) { mode = 'join'; if (hm[2]) rememberRS(hm[1].toUpperCase(), hm[2]); } }")
rep("    const m = (location.hash || '').match(/^#?([A-Za-z]{4})$/);", "    const m = (location.hash || '').match(/^#?([A-Za-z]{4})(?:-[A-Za-z0-9_-]{22})?$/);")
rep("    pcode = code; pname = name; perr = ''; netNote = ''; S = null; lastSig = ''; L = freshLocal(-1);\n    store.set('mz_name', name);",
    "    pcode = code; pname = name; perr = ''; netNote = ''; S = null; lastSig = ''; L = freshLocal(-1);\n    PLAYER_RS = recallRS(code);\n    store.set('mz_name', name);")
open(SP + '/web/body.html', 'w', encoding='utf-8').write(s)
print('relay-e2e OK')
