// Narrow, same-service WebSocket client. Authentication is sent only after TLS opens.
(() => {
  'use strict';
  function origin(value) {
    try {
      const u = new URL(value);
      return !u.username && !u.password && !u.search && !u.hash &&
        (u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)))
        ? u.origin : null;
    } catch (_) { return null; }
  }
  function create(options) {
    const base = origin(options.apiOrigin);
    if (!base) throw Error('Neispravna adresa servera.');
    let socket = null, credentials = null, generation = 0, retry = null, heartbeat = null, login = null, admission = null;
    let retries = 0, stopped = true, admitted = false, received = 0;
    const status = value => { if (options.onStatus) options.onStatus(value); };
    function timers() { clearTimeout(retry); clearTimeout(login); clearTimeout(admission); clearInterval(heartbeat); retry = login = heartbeat = admission = null; }
    function close() {
      stopped = true; generation++; timers(); admitted = false; credentials = null;
      const old = socket; socket = null;
      if (old) try { old.close(1000); } catch (_) {}
    }
    function send(message) {
      if (!admitted || !socket || socket.readyState !== 1) return false;
      try { const text = JSON.stringify(message); if (text.length > 8192) return false; socket.send(text); return true; } catch (_) { return false; }
    }
    function open(expected) {
      if (stopped || expected !== generation) return;
      let ws;
      try { ws = new WebSocket(base.replace(/^http/, 'ws') + '/api/rooms/' + credentials.code); }
      catch (_) { schedule(expected); return; }
      socket = ws; admitted = false;
      const current = () => !stopped && expected === generation && socket === ws;
      const lose = () => {
        if (!current()) return;
        socket = null; admitted = false; clearTimeout(login); clearInterval(heartbeat);
        try { ws.close(); } catch (_) {}
        schedule(expected);
      };
      ws.onopen = () => {
        if (!current()) return;
        received = Date.now();
        ws.send(JSON.stringify({ t: 'hello', pid: credentials.pid, sk: credentials.sk, name: credentials.name,
          av: credentials.av, secret: credentials.secret, role: credentials.role }));
        login = setTimeout(lose, 12000);
        heartbeat = setInterval(() => {
          if (!current()) return;
          if (Date.now() - received > 25000) return lose();
          try { ws.send('{"t":"ping"}'); } catch (_) { lose(); }
        }, 10000);
      };
      ws.onmessage = event => {
        if (!current() || typeof event.data !== 'string' || event.data.length > 1048576) return;
        let value; try { value = JSON.parse(event.data); } catch (_) { return; }
        if (!value || typeof value !== 'object') return;
        received = Date.now();
        if (value.t === 'error') {
          if (['auth', 'full', 'started', 'not_found', 'expired', 'identity', 'invalid'].includes(value.reason)) {
            close(); if (options.onError) options.onError(value); return;
          }
          if (options.onError) options.onError(value);
          return;
        }
        if (value.code !== credentials.code || !Array.isArray(value.P) || value.P.length > 12 ||
            typeof value.ph !== 'string' || !Number.isSafeInteger(value.s) || !Number.isFinite(value.ms) || !Number.isFinite(value.dur) || !value.cloud) return;
        if (credentials.role !== 'host' && !value.P.some(p => p.id === credentials.pid)) return;
        if (!admitted) { admitted = true; retries = 0; clearTimeout(login); clearTimeout(admission); admission = null; status('connected'); }
        if (options.onState) options.onState(value);
      };
      ws.onclose = lose;
      ws.onerror = lose;
    }
    function schedule(expected) {
      if (stopped || expected !== generation || retry) return;
      status('reconnecting');
      const delay = Math.min(10000, 500 * Math.pow(2, Math.min(5, retries++)));
      retry = setTimeout(() => { retry = null; open(expected); }, delay);
    }
    function connect(value) {
      close();
      const hasSecret = value && /^[A-Za-z0-9_-]{22}$/.test(value.secret);
      if (!value || !/^[A-Z]{4}$/.test(value.code) || !['host', 'player'].includes(value.role) ||
          (value.secret != null && !hasSecret) || (value.role === 'host' && !hasSecret))
        throw Error('Provjeri kod sobe ili pozivnicu domaćina.');
      credentials = { ...value }; stopped = false; retries = 0;
      const expected = generation;
      admission = setTimeout(() => {
        if (stopped || generation !== expected || admitted) return;
        close(); if (options.onError) options.onError({ t: 'error', reason: 'unavailable' });
      }, 30000);
      status('connecting'); open(generation);
    }
    async function createRoom(value) {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value), signal: controller.signal, credentials: 'omit', redirect: 'error' });
        const text = await response.text();
        if (text.length > 4096) throw Error('Neispravan odgovor servera.');
        const data = JSON.parse(text);
        if (!response.ok) throw Error(typeof data.message === 'string' ? data.message.slice(0, 180) : 'Server trenutačno ne može otvoriti sobu.');
        if (!/^[A-Z]{4}$/.test(data.code) || !/^[A-Za-z0-9_-]{22}$/.test(data.secret)) throw Error('Neispravan odgovor servera.');
        return { code: data.code, secret: data.secret };
      } finally { clearTimeout(timer); }
    }
    return { createRoom, connect, send, close,
      get connected() { return admitted; },
      check(force = false) {
        if (stopped || (socket && socket.readyState === 0) || (retry && !force)) return;
        if (socket && socket.readyState === 1 && Date.now() - received <= 25000) { try { socket.send('{"t":"ping"}'); } catch (_) {} return; }
        if (retry) { clearTimeout(retry); retry = null; }
        const old = socket; socket = null; if (old) try { old.close(); } catch (_) {}
        clearTimeout(login); clearInterval(heartbeat); open(generation);
      },
    };
  }
  globalThis.TAVERN_CLOUD_TRANSPORT = Object.freeze({ create, origin });
})();
