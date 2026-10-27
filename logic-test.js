'use strict';
// Testira logiku igre u server.js sa zamjenskim (lažnim) express/socket.io/qrcode modulima.
process.env.PORT = '0';
process.env.QUESTION_SECONDS = '2';
process.env.REVEAL_SECONDS = '1';
process.env.QUESTIONS_PER_GAME = '3';

const Module = require('module');
const fs = require('fs');

const lastState = new Map();
const history = new Map();
let connectionHandler = null;

class FakeServer {
  on(ev, cb) { if (ev === 'connection') connectionHandler = cb; }
  to(id) {
    return {
      emit: (e, d) => {
        if (e !== 'state') return;
        // duboka kopija, kao da je prošla kroz mrežu
        const copy = JSON.parse(JSON.stringify(d));
        lastState.set(id, copy);
        if (!history.has(id)) history.set(id, []);
        history.get(id).push(copy);
      },
    };
  }
}
const express = () => ({ use() {}, get() {} });
express.static = () => () => {};

const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'express') return express;
  if (request === 'socket.io') return { Server: FakeServer };
  if (request === 'qrcode') return { toDataURL: async () => 'data:image/png;base64,FAKE' };
  return origLoad.call(this, request, ...rest);
};

const serverPath = '/home/claude/mozgalica/server.js';
require(serverPath);

const QUESTIONS = JSON.parse(fs.readFileSync('/home/claude/mozgalica/questions.json', 'utf8'));
let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log('  ✔ ' + msg);
  else { failures++; console.log('  ✘ ' + msg); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(25); }
  return false;
}

function makeSocket(id) {
  const handlers = {};
  const s = {
    id, data: {},
    on: (e, f) => { handlers[e] = f; },
    send: (e, ...a) => handlers[e] && handlers[e](...a),
    call: (e, payload) => new Promise((res) => handlers[e](payload, res)),
    disconnect: () => handlers.disconnect && handlers.disconnect(),
  };
  connectionHandler(s);
  return s;
}

// Pronađi indeks točnog odgovora u izmiješanim opcijama (iz banke pitanja)
function correctIndexFor(stateQ) {
  const src = QUESTIONS.find((x) => x.q === stateQ.text);
  const correctText = src.options[src.answer];
  return stateQ.options.indexOf(correctText);
}

(async () => {
  await sleep(100);
  console.log('1) Stvaranje sobe');
  const host = makeSocket('H');
  const created = await host.call('host:create', { origin: 'http://localhost:3000' });
  check(created.ok && /^[A-Z]{4}$/.test(created.code), `soba ${created.code} stvorena (4 slova)`);
  const code = created.code;
  const hs = lastState.get('H');
  check(hs.phase === 'lobby' && hs.qr.startsWith('data:image'), 'host dobiva lobby stanje i QR');
  check(/\/play\?room=[A-Z]{4}$/.test(hs.joinUrl) && !hs.joinUrl.includes('localhost'),
    'adresa za pridruživanje ne ostaje "localhost": ' + hs.joinUrl);

  console.log('2) Pridruživanje igrača');
  const sockets = { Ana: makeSocket('P1'), Marko: makeSocket('P2'), Iva: makeSocket('P3') };
  const ids = {};
  for (const [name, s] of Object.entries(sockets)) {
    const r = await s.call('player:join', { code: code.toLowerCase(), name });
    check(r.ok, `${name} se pridružio (kod je neosjetljiv na velika/mala slova)`);
    ids[name] = r.playerId;
  }
  const dup = await makeSocket('PD').call('player:join', { code, name: 'ana' });
  check(!dup.ok, 'duplikat imena odbijen: ' + dup.error);
  const bad = await makeSocket('PB').call('player:join', { code: 'ZZZZ', name: 'X' });
  check(!bad.ok, 'nepostojeća soba odbijena: ' + bad.error);
  const empty = await makeSocket('PE').call('player:join', { code, name: '   ' });
  check(!empty.ok, 'prazno ime odbijeno');
  check(lastState.get('H').players.length === 3, 'host vidi 3 igrača u lobbyju');

  console.log('3) Pitanje 1 – bodovanje i vrijeme');
  host.send('host:start');
  await waitFor(() => lastState.get('P1').phase === 'question');
  let ps = lastState.get('P1');
  check(ps.phase === 'question' && ps.q.options.length === 4, 'igrači dobivaju pitanje s 4 odgovora');
  check(!JSON.stringify(lastState.get('H')).includes('"correct"') && !JSON.stringify(ps).includes('correctIndex'),
    'točan odgovor se NE šalje prije otkrivanja (nema varanja)');
  const ci = correctIndexFor(ps.q);
  check(ci >= 0, 'pronađen točan odgovor u izmiješanim opcijama');
  sockets.Ana.send('player:answer', { choice: ci });                 // točno, odmah
  sockets.Marko.send('player:answer', { choice: (ci + 1) % 4 });      // krivo
  sockets.Ana.send('player:answer', { choice: (ci + 1) % 4 });        // drugi pokušaj mora biti ignoriran
  await sleep(50);
  check(lastState.get('H').answered === 2, 'host vidi 2 od 3 odgovora');
  const t0 = Date.now();
  await waitFor(() => lastState.get('H').phase === 'reveal', 5000);
  const dt = Date.now() - t0;
  check(dt > 1500, `Iva nije odgovorila pa je pitanje završilo istekom vremena (~${dt} ms)`);
  const rev = lastState.get('H');
  check(rev.reveal.counts.reduce((a, b) => a + b, 0) === 2, 'brojači odgovora: ' + rev.reveal.counts.join(','));
  const a = lastState.get('P1').result, m = lastState.get('P2').result, i = lastState.get('P3').result;
  check(a.correct && a.gained >= 950 && a.gained <= 1000, `Ana točno i brzo: +${a.gained}`);
  check(!m.correct && m.answered && m.gained === 0, 'Marko netočno: +0');
  check(!i.answered && i.gained === 0, 'Iva bez odgovora: +0');
  check(a.rank === 1 && a.score === a.gained, 'Ana je 1. s ' + a.score + ' bodova');

  console.log('4) Kasno pridruživanje i ponovno spajanje');
  const late = await makeSocket('PL').call('player:join', { code, name: 'Kasno' });
  check(!late.ok, 'pridruživanje usred igre odbijeno: ' + late.error);
  sockets.Marko.disconnect();
  const marko2 = makeSocket('P2b');
  const rej = await marko2.call('player:join', { code, name: 'Marko', playerId: ids.Marko });
  check(rej.ok && rej.playerId === ids.Marko, 'Marko se vratio s istim identitetom');
  check(lastState.get('P2b').phase === 'reveal' && lastState.get('P2b').score === 0, 'dobio je trenutno stanje igre');
  sockets.Marko = marko2;
  const sockIdOf = { Ana: 'P1', Marko: 'P2b', Iva: 'P3' };

  console.log('5) Pitanja 2 i 3 – rano završavanje kad svi odgovore');
  for (const qn of [2, 3]) {
    await waitFor(() => lastState.get('P1').phase === 'question' && lastState.get('P1').q.index === qn, 4000);
    const st = lastState.get('P1');
    check(st.phase === 'question' && st.q.index === qn, `pitanje ${qn} je počelo`);
    const c = correctIndexFor(st.q);
    const tq = Date.now();
    sockets.Ana.send('player:answer', { choice: c });
    sockets.Marko.send('player:answer', { choice: c });
    sockets.Iva.send('player:answer', { choice: c });
    await waitFor(() => lastState.get('H').phase === 'reveal' || lastState.get('H').phase === 'final', 3000);
    check(Date.now() - tq < 1000, `pitanje ${qn} završeno odmah nakon zadnjeg odgovora (${Date.now() - tq} ms)`);
  }

  console.log('6) Kraj igre');
  await waitFor(() => lastState.get('H').phase === 'final', 4000);
  const fin = lastState.get('H');
  check(fin.phase === 'final' && fin.ranking.length === 3, 'faza "final" s 3 igrača');
  const sc = fin.ranking.map((r) => r.score);
  check(sc[0] >= sc[1] && sc[1] >= sc[2], 'poredak sortiran: ' + fin.ranking.map((r) => `${r.rank}. ${r.name} ${r.score}`).join(', '));
  check(fin.ranking[0].name === 'Ana', 'Ana (odgovarala je točno u sva 3 kruga) je pobjednica');
  check(lastState.get('P1').final.rank === 1, 'Ana na mobitelu vidi 1. mjesto');

  console.log('7) Nova igra');
  host.send('host:restart');
  await sleep(50);
  const lob = lastState.get('H');
  check(lob.phase === 'lobby' && lob.players.length === 3, 'povratak u lobby s istim igračima');
  host.send('host:start');
  await waitFor(() => lastState.get('H').phase === 'question');
  check(lastState.get('P1').score === 0 && lastState.get('P1').q.index === 1, 'bodovi resetirani, igra kreće od 1. pitanja');

  console.log(failures ? `\n${failures} PROVJERA NIJE PROŠLO ✘` : '\nSVE PROVJERE PROŠLE ✔');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
