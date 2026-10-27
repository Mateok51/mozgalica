// Skupi stvarna stanja igre (view + priv) kroz sve faze, za napadački test
const fs = require('fs'), path = require('path');
const V3 = path.join(__dirname, '..', 'v3');
const src = fs.readFileSync(V3 + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(V3 + '/data.json', 'utf8'));
const E = new Function(src + '; return { createGame };')();
const out = []; const seen = new Set();
const FAST = { intro: 0.05, vote: 0.15, voteShow: 0.05, roul: 0.05, power: 0.2, cast: 0.05, q: 0.3, reveal: 0.1, betrayShow: 0.1, loyalShow: 0.1, howto: 0.05, howtoMax: 0.05, howtoShort: 0.05, sort: 0.2, link: 0.2, order: 0.2, hilo: 0.2, blitz: 0.2, maj: 0.1, majReveal: 0.05, chReveal: 0.05, fstart: 0.1, fpower: 0.1, fq: 0.15, fqCrown: 0.15, fr: 0.05, bet: 0.1, moment: 0.05, duel: 0.2, duelIntro: 0.05, duelRes: 0.05, secret: 0.2, secret2: 0.2, pactAfter: 1, qv: { who: 1, emoji: 1 }, chal: (process.env.CH || 'sort,link').split(','), betEvents: [1, 1] };
let g;
g = E.createGame({ code: 'ABCD', cfg: FAST, onChange: () => {
  const v = g.view(), key = v.ph + (v.q && v.q.k || '') + (v.bt ? 'bt' : '') + (v.ly ? 'ly' : '') + (v.news ? 'n' : '') + (v.mo ? 'mo' : '');
  if (!seen.has(key) || out.length < 400 && Math.random() < 0.05) { seen.add(key); out.push({ v: JSON.parse(JSON.stringify(v)), pv: JSON.parse(JSON.stringify(g.priv('pid-v') || null)) }); }
} });
g.addPlayer('pid-v', 'Vik', 0, false); g.addPlayer('h2', 'Ana', 1, false); g.addPlayer('h3', 'Iva', 2, false); g.setBots(2);
g.start();
const t0 = Date.now();
const iv = setInterval(() => {
  const G = g._G, s = G.s;
  for (const id of ['pid-v', 'h2', 'h3']) {
    if (G.ph === 'vote') g.setInput(id, { s, v: 0 });
    if (G.ph === 'power') g.setInput(id, { s, p: '' });
    if ((G.ph === 'question' || G.ph === 'fq') && G.q) g.setInput(id, { s, c: G.q.a });
  }
  if (G.qn >= 1 && !g.priv('pid-v').k && !G.pacts.length) { g.pactAction('h2', { k: 'offer', to: 'pid-v' }); }
  if (G.ph === 'question' && g.priv('pid-v').k) { g.pactAction('h2', { k: 'whisper', c: 1 }); if (G.qn === 5 && !process.env.LOYAL) g.pactAction('h2', { k: 'betray', on: true }); }
  if (G.ph === 'final' || Date.now() - t0 > 150000) { clearInterval(iv); g.stop(); fs.writeFileSync(path.join(__dirname, 'views-' + (process.env.CH || 'sort,link') + '.json'), JSON.stringify(out)); console.log('stanja:', out.length, [...new Set(out.map((x) => x.v.ph))].join(',')); process.exit(0); }
}, 20);
// victim accepts the offer
const iv2 = setInterval(() => { const p = g.priv('pid-v'); if (p && p.inv && p.inv.length) g.pactAction('pid-v', { k: 'accept', from: p.inv[0].f }); }, 30);
