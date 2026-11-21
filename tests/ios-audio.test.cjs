// Execute the actual audio/lifecycle closures with explicit browser API seams.
// The interrupted state and suspended-JS/running-audio-clock are simulated;
// this is not proof of iPhone speaker output or real iOS background policy.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

const slice = (start, end) => {
  const begin = app.indexOf(start), finish = app.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin, 'Audio implementation seam exists');
  return app.slice(begin, finish);
};

test('a user gesture resumes Safari interrupted audio, not only suspended audio', async () => {
  let resumed = 0;
  class AudioContext {
    constructor() { this.state = 'interrupted'; }
    resume() { resumed++; this.state = 'running'; return Promise.resolve(); }
  }
  const context = vm.createContext({
    store: { get() { return null; }, set() {} },
    window: { AudioContext }, location: { protocol: 'file:' },
  });
  vm.runInContext(slice('  const SFX = (() => {', '  const AUDIO = SFX;') + '\nthis.audio=SFX;', context);
  context.audio.unlock();
  await Promise.resolve();
  assert.equal(resumed, 1, 'Safari interrupted contexts need a resume on the next user gesture');
  assert.equal(context.audio.ctx().state, 'running');
});

test('music resumes from the current audio clock instead of replaying the entire hidden period', () => {
  let nodes = 0, interval = null;
  const starts = [];
  const parameter = () => ({
    value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime() {}, cancelScheduledValues() {},
  });
  const source = () => {
    if (++nodes > 300) throw Error('Controlled catch-up budget exceeded');
    return { type: '', frequency: parameter(), connect() {}, start(t) { starts.push(t); }, stop() {} };
  };
  const clock = {
    state: 'running', currentTime: 0, sampleRate: 100, destination: {},
    createOscillator: source,
    createBufferSource: source,
    createGain: () => ({ gain: parameter(), connect() {} }),
    createBiquadFilter: () => ({ type: '', frequency: parameter(), connect() {} }),
    createBuffer: (channels, frames) => ({ getChannelData: () => new Float32Array(frames) }),
  };
  const context = vm.createContext({
    store: { get() { return null; }, set() {} }, SFX: { ctx: () => clock },
    window: {}, location: { protocol: 'file:' },
    setInterval(fn) { interval = fn; return 1; }, clearInterval() {},
    setTimeout() {},
  });
  vm.runInContext(slice('  const MUSIC = (() => {', "  document.addEventListener('pointerdown'") + '\nthis.music=MUSIC;', context);
  context.music.want(true);
  assert.ok(interval && nodes > 0, 'Fixture must be scheduling the real synthesizer');
  const initial = nodes;
  clock.currentTime = 0.2; interval();
  assert.ok(nodes > initial, 'Normal running music continues scheduling its short look-ahead');
  clock.state = 'interrupted';
  const paused = nodes;
  clock.currentTime = 100; interval();
  assert.equal(nodes, paused, 'Do not create sounds while the audio context is interrupted');
  clock.state = 'running';
  nodes = 0;
  starts.length = 0;
  // Browser JS scheduling resumes after a long pause while the audio clock
  // has advanced. The old loop creates all missed nodes in the past.
  clock.currentTime = 600;
  assert.doesNotThrow(() => interval(), 'Do not replay ten minutes of missed music on resume');
  assert.ok(nodes <= 64, 'Work must stay within the normal short look-ahead window');
  assert.ok(starts.length > 0 && starts.every(t => t >= 600 && t < 600.25), 'Only current look-ahead notes may be started');
  nodes = 0; starts.length = 0;
  clock.currentTime = 600.4; interval();
  assert.ok(nodes <= 64 && starts.every(t => t >= 600.4 && t < 600.65), 'A shorter scheduling delay remains bounded and never starts missed notes');
});

