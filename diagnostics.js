// Local, bounded diagnostics. No network, storage, identifiers or game content.
(() => {
  'use strict';
  const allowedEvents = new Set([
    'connection_lost', 'connection_restored', 'join_started', 'join_failed', 'joined',
    'answer_sent', 'answer_confirmed', 'app_resume', 'app_pause', 'export',
  ]);
  const allowedPhases = new Set([
    'lobby', 'intro', 'deal', 'vote', 'voteResult', 'bet', 'power', 'cast',
    'question', 'reveal', 'howto', 'sort', 'sortReveal', 'link', 'linkReveal',
    'order', 'orderReveal', 'hilo', 'hiloReveal', 'blitz', 'blitzReveal',
    'maj', 'majReveal', 'uljez', 'uljezVote', 'uljezReveal', 'secret', 'secret2',
    'fstart', 'fq', 'fr', 'tstart', 'trisk', 'rope', 'moment', 'duelIntro',
    'duel', 'duelResult', 'betray', 'loyal', 'final',
  ]);
  function readClock() {
    try {
      const value = performance.now();
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch (e) { return null; }
  }
  const started = readClock() || 0;
  const events = [];
  let android = false, lastElapsed = 0;
  function elapsed() {
    const now = readClock();
    if (now !== null) lastElapsed = Math.max(lastElapsed,
      Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(now - started))));
    return lastElapsed;
  }
  function add(type, phase) {
    if (!allowedEvents.has(type)) return false;
    const event = { elapsedMs: elapsed(), type };
    if (allowedPhases.has(phase)) event.phase = phase;
    if (events.length === 80) events.shift();
    events.push(event);
    return true;
  }
  function snapshot() {
    let online = true;
    try { if (typeof navigator.onLine === 'boolean') online = navigator.onLine; } catch (e) {}
    return {
      format: 1,
      webVersion: '83',
      environment: android ? 'android' : 'web',
      online,
      events: events.map(event => Object.assign({}, event)),
    };
  }
  globalThis.TAVERN_DIAGNOSTICS = Object.freeze({
    add,
    snapshot,
    setNative() { android = true; },
    exportText() { add('export'); return JSON.stringify(snapshot(), null, 2); },
  });
})();
