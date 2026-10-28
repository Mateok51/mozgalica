// Versioned local journal: replay restores closures, timers and seeded random choices.
function createRecoverableGame(options, saved) {
  if (saved && (saved.version !== 1 || !Number.isInteger(saved.seed) || !Number.isFinite(saved.created) || !Number.isFinite(saved.time) || saved.time < saved.created || !Array.isArray(saved.events) || saved.events.length > 100000)) throw new Error('Neispravan zapis partije');
  const seed = saved ? saved.seed : crypto.getRandomValues(new Uint32Array(1))[0];
  let randomState = seed, replaying = !!saved, logical = saved ? saved.created : Date.now();
  let offset = Date.now() - logical, seq = 0, engine;
  const pending = new Map(), events = saved ? saved.events.slice() : [];
  const created = logical;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const time = () => replaying ? logical : Date.now() - offset;
  const checkpoint = () => { if (!replaying && options.onCheckpoint) options.onCheckpoint({ version: 1, seed, created, time: time(), events }); };
  const arm = (id, task) => { task.handle = setTimeout(() => {
    if (!pending.has(id)) return;
    pending.delete(id); logical = time(); events.push({ timer: id, at: logical });
    task.fn(); checkpoint();
  }, Math.max(0, task.at - time())); };
  const schedule = (fn, ms) => { const id = ++seq, task = { fn, at: time() + Math.max(0, ms), handle: null }; pending.set(id, task); if (!replaying) arm(id, task); return id; };
  const cancel = (id) => { const task = pending.get(id); if (task) clearTimeout(task.handle); pending.delete(id); };
  engine = createGame(Object.assign({}, options, { random, now: time, schedule, cancel, onChange: () => { if (!replaying && options.onChange) options.onChange(); } }));
  const calls = ['refresh', 'addPlayer', 'addBot', 'setBots', 'setAvatar', 'setInput', 'syncPeers', 'start', 'skip', 'restart', 'setOpt', 'pactAction', 'sfScenario'];
  if (saved) {
    for (const event of events) {
      if (!Number.isFinite(event.at) || event.at < logical || event.at > saved.time) throw new Error('Neispravno vrijeme zapisa');
      logical = event.at;
      if (event.timer !== undefined) {
        const task = pending.get(event.timer); if (!task) throw new Error('Nepodudaranje vremenskih događaja');
        pending.delete(event.timer); task.fn();
      } else {
        if (!calls.includes(event.method) || !Array.isArray(event.args)) throw new Error('Neispravna radnja');
        engine[event.method](...event.args);
      }
    }
    logical = saved.time; offset = Date.now() - logical; replaying = false;
    for (const [id, task] of pending) arm(id, task);
  }
  const api = Object.assign({}, engine);
  for (const method of calls) api[method] = (...args) => {
    const copy = JSON.parse(JSON.stringify(args));
    events.push({ method, args: copy, at: time() });
    const result = engine[method](...args); checkpoint(); return result;
  };
  api.checkpoint = () => ({ version: 1, seed, created, time: time(), events: JSON.parse(JSON.stringify(events)) });
  return api;
}

