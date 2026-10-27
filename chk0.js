
//#engine-start
// ---------- Mozgalica: logika igre (bez DOM-a; vodi je domaćin) ----------
const QUESTIONS = [{"category":"Geografija","q":"Koji je glavni grad Australije?","options":["Sydney","Melbourne","Canberra","Perth"],"answer":2},{"category":"Geografija","q":"Koja je najduža rijeka u Europi?","options":["Dunav","Volga","Rajna","Dnjepar"],"answer":1},{"category":"Geografija","q":"Koji je najviši vrh u Hrvatskoj?","options":["Sljeme","Dinara","Biokovo","Učka"],"answer":1},{"category":"Geografija","q":"Koji je najmanji kontinent?","options":["Europa","Antarktika","Australija (Oceanija)","Južna Amerika"],"answer":2},{"category":"Geografija","q":"Kroz koji grad teče rijeka Seina?","options":["London","Pariz","Rim","Madrid"],"answer":1},{"category":"Geografija","q":"Koja je država najveća po površini?","options":["Kanada","Kina","SAD","Rusija"],"answer":3},{"category":"Geografija","q":"Koji je najveći ocean na svijetu?","options":["Atlantski","Indijski","Tihi","Arktički"],"answer":2},{"category":"Povijest","q":"Koje je godine Hrvatska postala članica Europske unije?","options":["2004.","2009.","2013.","2019."],"answer":2},{"category":"Povijest","q":"Tko je prvi čovjek koji je hodao po Mjesecu?","options":["Buzz Aldrin","Neil Armstrong","Yuri Gagarin","John Glenn"],"answer":1},{"category":"Povijest","q":"Koje je godine pao Berlinski zid?","options":["1985.","1987.","1989.","1991."],"answer":2},{"category":"Povijest","q":"Koji je hrvatski vladar prvi okrunjen za kralja, oko 925. godine?","options":["Petar Krešimir IV.","Zvonimir","Tomislav","Trpimir"],"answer":2},{"category":"Povijest","q":"Koje je godine potonuo Titanic?","options":["1905.","1912.","1918.","1923."],"answer":1},{"category":"Povijest","q":"Tko je naslikao Mona Lisu?","options":["Michelangelo","Raffaello","Leonardo da Vinci","Botticelli"],"answer":2},{"category":"Povijest","q":"Koje je godine počeo Drugi svjetski rat?","options":["1936.","1939.","1941.","1945."],"answer":1},{"category":"Znanost","q":"Koji je kemijski simbol za zlato?","options":["Ag","Fe","Au","Zn"],"answer":2},{"category":"Znanost","q":"Koji je planet najbliži Suncu?","options":["Venera","Merkur","Mars","Zemlja"],"answer":1},{"category":"Znanost","q":"Koliko kostiju ima odrasli čovjek?","options":["186","206","226","256"],"answer":1},{"category":"Znanost","q":"Koliko iznosi brzina svjetlosti u vakuumu, približno?","options":["30 000 km/s","150 000 km/s","300 000 km/s","3 000 000 km/s"],"answer":2},{"category":"Znanost","q":"U kojem je mjestu rođen Nikola Tesla?","options":["Gospić","Smiljan","Karlovac","Otočac"],"answer":1},{"category":"Znanost","q":"Koji plin biljke upijaju tijekom fotosinteze?","options":["Kisik","Dušik","Ugljikov dioksid","Vodik"],"answer":2},{"category":"Znanost","q":"Koji je najveći planet Sunčevog sustava?","options":["Saturn","Jupiter","Neptun","Uran"],"answer":1},{"category":"Sport","q":"Koliko igrača jedne momčadi istodobno igra na terenu u nogometu?","options":["9","10","11","12"],"answer":2},{"category":"Sport","q":"Koje je mjesto Hrvatska osvojila na Svjetskom prvenstvu 2018. u Rusiji?","options":["Treće","Drugo","Prvo","Četvrto"],"answer":1},{"category":"Sport","q":"Koji je grad bio domaćin Olimpijskih igara 2016.?","options":["London","Peking","Rio de Janeiro","Tokio"],"answer":2},{"category":"Sport","q":"Koliko Grand Slam turnira ima u tenisu tijekom jedne godine?","options":["3","4","5","6"],"answer":1},{"category":"Sport","q":"Tko je 2018. osvojio Zlatnu loptu?","options":["Cristiano Ronaldo","Lionel Messi","Luka Modrić","Kylian Mbappé"],"answer":2},{"category":"Film i glazba","q":"Tko je režirao film Titanic (1997.)?","options":["Steven Spielberg","James Cameron","Ridley Scott","Christopher Nolan"],"answer":1},{"category":"Film i glazba","q":"Koliko žica ima standardna gitara?","options":["4","5","6","8"],"answer":2},{"category":"Film i glazba","q":"Koji je bend izveo pjesmu Bohemian Rhapsody?","options":["The Beatles","Queen","Led Zeppelin","Pink Floyd"],"answer":1},{"category":"Film i glazba","q":"Tko je autor serije romana o Harryju Potteru?","options":["J. R. R. Tolkien","J. K. Rowling","Suzanne Collins","C. S. Lewis"],"answer":1},{"category":"Film i glazba","q":"Koji je hrvatski grad u seriji Igra prijestolja glumio Kraljevu Luku?","options":["Split","Šibenik","Dubrovnik","Pula"],"answer":2},{"category":"Hrana i piće","q":"Od kojeg se mlijeka tradicionalno pravi paški sir?","options":["Kravljeg","Kozjeg","Ovčjeg","Bivoljeg"],"answer":2},{"category":"Hrana i piće","q":"Koji je glavni sastojak guacamolea?","options":["Rajčica","Avokado","Paprika","Krastavac"],"answer":1},{"category":"Hrana i piće","q":"Iz koje zemlje potječe sushi?","options":["Kina","Koreja","Tajland","Japan"],"answer":3},{"category":"Hrana i piće","q":"Od kojeg se mesa tradicionalno pravi pršut?","options":["Govedine","Janjetine","Svinjetine","Puretine"],"answer":2},{"category":"Hrana i piće","q":"Iz kojeg grada potječe pizza Margherita?","options":["Napulj","Milano","Firenca","Venecija"],"answer":0},{"category":"Općenito","q":"Koliko dana ima prijestupna godina?","options":["364","365","366","367"],"answer":2},{"category":"Općenito","q":"Koja je službena valuta Hrvatske od 2023. godine?","options":["Kuna","Euro","Dolar","Funta"],"answer":1},{"category":"Općenito","q":"Koliko boja ima duga?","options":["5","6","7","8"],"answer":2},{"category":"Općenito","q":"Koja je životinja prikazana na hrvatskoj kovanici od 1 eura?","options":["Kuna","Lav","Orao","Delfin"],"answer":0},{"category":"Općenito","q":"Koliko minuta ima jedan sat?","options":["50","60","75","100"],"answer":1}];
const CFG = { perGame: 10, qSeconds: 15, revealSeconds: 7, maxPlayers: 8, nameMax: 14 };
const CODE_LETTERS = 'ABCDEFGHJKLMNPRSTUVZ';

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function makeCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  return s;
}
function rankOf(players) {
  return players.slice().sort((a, b) => b.score - a.score).map((p, i) => Object.assign({}, p, { rank: i + 1 }));
}

function createGame(opts) {
  const cfg = Object.assign({}, CFG, opts.cfg || {});
  const now = opts.now || (() => Date.now());
  const onChange = opts.onChange || (() => {});
  const bank = opts.questions || QUESTIONS;
  const g = { code: opts.code, phase: 'lobby', roster: new Map(), qs: [], qi: -1, cur: null, revealEnds: 0 };
  let qTimer = null, rTimer = null, botTimers = [];

  const players = () => [...g.roster.values()];
  const connected = () => players().filter((p) => p.connected);
  const allAnswered = () => { const c = connected(); return c.length > 0 && c.every((p) => p.answer !== null); };
  const clearTimers = () => { clearTimeout(qTimer); clearTimeout(rTimer); botTimers.forEach(clearTimeout); botTimers = []; };

  function cleanName(raw) { return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, cfg.nameMax); }
  function uniqueName(name, pid) {
    let n = name, i = 2;
    const taken = () => players().some((p) => p.pid !== pid && p.name.toLowerCase() === n.toLowerCase());
    while (taken()) { const suf = ' (' + i + ')'; n = name.slice(0, cfg.nameMax - suf.length) + suf; i++; }
    return n;
  }

  // peers: [{pid, name, a}] svi igrači koji su trenutno spojeni
  function syncPeers(peers) {
    const seen = new Set();
    let changed = false;
    for (const x of peers) {
      if (!x || typeof x.pid !== 'string' || x.pid.length > 40) continue;
      seen.add(x.pid);
      let p = g.roster.get(x.pid);
      if (!p) {
        if (g.phase !== 'lobby' || g.roster.size >= cfg.maxPlayers) continue;
        const nm = cleanName(x.name);
        if (!nm) continue;
        p = { pid: x.pid, name: uniqueName(nm, x.pid), score: 0, gained: 0, connected: true, answer: null, answerMs: 0 };
        g.roster.set(x.pid, p);
        changed = true;
      } else if (!p.connected) { p.connected = true; changed = true; }
      const a = x.a;
      if (g.phase === 'question' && g.cur && p.answer === null && a && a.q === g.qi + 1 &&
          Number.isInteger(a.c) && a.c >= 0 && a.c <= 3) {
        const elapsed = now() - g.cur.startedAt;
        const claimed = Number.isFinite(a.t) ? a.t : elapsed;
        p.answer = a.c;
        p.answerMs = Math.max(0, Math.min(claimed, elapsed));
        changed = true;
      }
    }
    for (const p of players()) {
      if (!p.isBot && p.connected && !seen.has(p.pid)) { p.connected = false; changed = true; }
    }
    if (g.phase === 'lobby') {
      for (const [id, p] of g.roster) if (!p.connected) { g.roster.delete(id); changed = true; }
    }
    if (g.phase === 'question' && allAnswered()) return endQuestion();
    if (changed) onChange();
  }

  function addBot(name) {
    const pid = 'bot-' + name;
    g.roster.set(pid, { pid, name, score: 0, gained: 0, connected: true, answer: null, answerMs: 0, isBot: true });
    onChange();
  }

  function startGame() {
    if (g.phase !== 'lobby' || connected().length < 1) return;
    g.qs = shuffle(bank).slice(0, cfg.perGame);
    g.qi = -1;
    for (const p of players()) { p.score = 0; p.gained = 0; p.answer = null; }
    nextQuestion();
  }

  function nextQuestion() {
    clearTimers();
    g.qi += 1;
    if (g.qi >= g.qs.length) { g.phase = 'final'; g.cur = null; onChange(); return; }
    const q = g.qs[g.qi];
    const order = shuffle([0, 1, 2, 3]);
    const cur = {
      text: q.q, category: q.category,
      options: order.map((i) => q.options[i]),
      correct: order.indexOf(q.answer),
      counts: [0, 0, 0, 0],
      startedAt: now(),
    };
    g.cur = cur;
    for (const p of players()) { p.answer = null; p.answerMs = 0; p.gained = 0; }
    g.phase = 'question';
    qTimer = setTimeout(endQuestion, cfg.qSeconds * 1000 + 400);
    for (const b of players().filter((p) => p.isBot)) {
      botTimers.push(setTimeout(() => {
        if (g.phase !== 'question' || g.cur !== cur || b.answer !== null) return;
        const right = Math.random() < 0.65;
        b.answer = right ? cur.correct : (cur.correct + 1 + Math.floor(Math.random() * 3)) % 4;
        b.answerMs = now() - cur.startedAt;
        if (allAnswered()) endQuestion(); else onChange();
      }, 1500 + Math.random() * cfg.qSeconds * 600));
    }
    onChange();
  }

  function endQuestion() {
    if (g.phase !== 'question') return;
    clearTimers();
    const c = g.cur;
    for (const p of players()) {
      if (p.answer !== null) c.counts[p.answer] += 1;
      if (p.answer === c.correct) {
        const ratio = Math.min(1, Math.max(0, 1 - p.answerMs / (cfg.qSeconds * 1000)));
        p.gained = Math.round(500 + 500 * ratio);
        p.score += p.gained;
      } else p.gained = 0;
    }
    g.phase = 'reveal';
    g.revealEnds = now() + cfg.revealSeconds * 1000;
    rTimer = setTimeout(nextQuestion, cfg.revealSeconds * 1000);
    onChange();
  }

  function skipReveal() { if (g.phase === 'reveal') nextQuestion(); }

  function restart() {
    if (g.phase !== 'final') return;
    clearTimers();
    for (const [id, p] of g.roster) {
      if (!p.connected) g.roster.delete(id);
      else { p.score = 0; p.gained = 0; p.answer = null; }
    }
    g.phase = 'lobby'; g.cur = null; g.qi = -1;
    onChange();
  }

  function view() {
    const ps = players();
    const s = {
      v: 2, code: g.code, phase: g.phase, max: cfg.maxPlayers,
      players: ps.map((p) => {
        const o = { pid: p.pid, name: p.name, score: p.score, gained: p.gained, connected: p.connected, answered: p.answer !== null };
        if (g.phase === 'reveal') o.choice = p.answer;
        return o;
      }),
    };
    if (g.cur && (g.phase === 'question' || g.phase === 'reveal')) {
      s.q = { index: g.qi + 1, total: g.qs.length, text: g.cur.text, category: g.cur.category, options: g.cur.options };
      s.duration = cfg.qSeconds * 1000;
      s.remainingMs = g.phase === 'question' ? Math.max(0, g.cur.startedAt + s.duration - now()) : 0;
      s.connectedCount = connected().length;
      s.answered = ps.filter((p) => p.connected && p.answer !== null).length;
    }
    if (g.phase === 'reveal') {
      s.reveal = { correct: g.cur.correct, counts: g.cur.counts };
      s.revealMs = Math.max(0, g.revealEnds - now());
    }
    return s;
  }

  return { syncPeers, addBot, startGame, skipReveal, restart, view, stop: clearTimers };
}
//#engine-end
