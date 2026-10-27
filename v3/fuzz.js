const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame };')();
const FAST = { howto: 0.05, howtoShort: 0.05, order: 0.3, hilo: 0.3, blitz: 0.3, maj: 0.3, majReveal: 0.05, intro: 0.05, vote: 0.3, voteShow: 0.05, power: 0.3, bet: 0.3, fpower: 0.3, fstart: 0.05, cast: 0.02, q: 0.4, reveal: 0.05, sort: 0.3, link: 0.3, chReveal: 0.05, fq: 0.3, fr: 0.05, duel: 0.4, duelIntro: 0.05, duelReveal: 0.05, moment: 0.05, secret: 0.3, secretReveal: 0.05 };
let errs = [];
process.on('uncaughtException', (e) => { errs.push(e.stack.split('\n').slice(0, 4).join(' | ')); });
const runOne = (kind, i) => new Promise((res) => {
  let g; const phs = new Set();
  g = E.createGame({ code: 'F' + i, cfg: Object.assign({}, FAST, { qv: { [kind]: 6 } }), onChange: () => { try { const v = g.view(); phs.add(v.ph); JSON.stringify(v); if (v.ph === 'final') { g.stop(); res(phs); } } catch (e) { errs.push('view ' + e.stack.split('\n').slice(0, 3).join(' | ')); } } });
  g.setBots(3 + (i % 4));
  // pretvori sve u botove da sami igraju: koristimo samo botove
  g.start();
  setTimeout(() => { g.stop(); res(phs); }, 60000);
});
(async () => {
  for (const kind of ['emoji', 'who']) for (let i = 0; i < 4; i++) {
    const phs = await runOne(kind, i);
    console.log(kind, i, phs.has('final') ? 'kraj' : 'NIJE DOŠLO DO KRAJA', [...phs].join(','));
  }
  console.log('greške:', errs.length, errs.slice(0, 5));
  process.exit(0);
})();
