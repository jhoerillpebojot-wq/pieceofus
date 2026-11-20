/* Match-3: engine (pure logic, testable in Node) + game screen controller. */
(function (root) {
  /* ================= ENGINE ================= */
  let nextId = 1;
  const mk = (type, special) => ({ id: nextId++, type, special: special || null });
  const swapCells = (b, i, j) => { const t = b.cells[i]; b.cells[i] = b.cells[j]; b.cells[j] = t; };
  const adjacent = (b, i, j) => Math.abs(Math.floor(i / b.cols) - Math.floor(j / b.cols)) + Math.abs(i % b.cols - j % b.cols) === 1;
  function shuffleArr(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* Board built from a 2D array of piece numbers (used by tests and by createBoard). */
  function fromGrid(grid) {
    const rows = grid.length, cols = grid[0].length;
    const cells = grid.flat().map(t => t === null ? null : mk(t));
    return { rows, cols, types: 1 + Math.max(...grid.flat().filter(t => t !== null)), cells, jelly: new Array(rows * cols).fill(0) };
  }

  function createBoard(cfg, rnd) {
    const { rows, cols, types } = cfg;
    for (let attempt = 0; attempt < 300; attempt++) {
      const t = new Array(rows * cols);
      for (let i = 0; i < t.length; i++) {
        const r = Math.floor(i / cols), c = i % cols; let v;
        do { v = Math.floor(rnd() * types); }
        while ((c >= 2 && t[i - 1] === v && t[i - 2] === v) || (r >= 2 && t[i - cols] === v && t[i - 2 * cols] === v));
        t[i] = v;
      }
      const board = { rows, cols, types, cells: t.map(v => mk(v)), jelly: new Array(rows * cols).fill(0) };
      (cfg.jelly || []).forEach(i => { board.jelly[i] = cfg.jellyLayers || 1; });
      if (hasMoves(board)) return board;
    }
    throw new Error('Could not build a board');
  }

  /* Finds every run of 3+ and decides which special piece (if any) each group earns:
     4 in a line = row/column piece, L or T = ring piece, 5+ in a line = sparkle ball. */
  function findMatches(board, preferred) {
    preferred = preferred || [];
    const { rows, cols, cells } = board, runs = [];
    const ok = i => cells[i] && cells[i].type >= 0;
    for (let r = 0; r < rows; r++) {
      let c = 0;
      while (c < cols) {
        const i = r * cols + c; if (!ok(i)) { c++; continue; }
        const t = cells[i].type; let e = c + 1;
        while (e < cols && ok(r * cols + e) && cells[r * cols + e].type === t) e++;
        if (e - c >= 3) { const idx = []; for (let k = c; k < e; k++) idx.push(r * cols + k); runs.push({ dir: 'h', type: t, idx }); }
        c = e;
      }
    }
    for (let c = 0; c < cols; c++) {
      let r = 0;
      while (r < rows) {
        const i = r * cols + c; if (!ok(i)) { r++; continue; }
        const t = cells[i].type; let e = r + 1;
        while (e < rows && ok(e * cols + c) && cells[e * cols + c].type === t) e++;
        if (e - r >= 3) { const idx = []; for (let k = r; k < e; k++) idx.push(k * cols + c); runs.push({ dir: 'v', type: t, idx }); }
        r = e;
      }
    }
    const set = new Set(); runs.forEach(r => r.idx.forEach(i => set.add(i)));
    const parent = runs.map((_, i) => i), find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
    const owner = new Map();
    runs.forEach((run, ri) => run.idx.forEach(i => { if (owner.has(i)) parent[find(ri)] = find(owner.get(i)); else owner.set(i, ri); }));
    const comps = new Map();
    runs.forEach((run, ri) => { const k = find(ri); if (!comps.has(k)) comps.set(k, []); comps.get(k).push(run); });
    const spawns = [];
    comps.forEach(list => {
      const longest = list.reduce((a, b) => b.idx.length > a.idx.length ? b : a);
      const hasH = list.some(r => r.dir === 'h'), hasV = list.some(r => r.dir === 'v');
      let kind = null, cands = [];
      if (longest.idx.length >= 5) { kind = 'spark'; cands = longest.idx; }
      else if (hasH && hasV) {
        kind = 'bomb';
        const h = new Set(); list.filter(r => r.dir === 'h').forEach(r => r.idx.forEach(i => h.add(i)));
        list.filter(r => r.dir === 'v').forEach(r => r.idx.forEach(i => { if (h.has(i)) cands.push(i); }));
      } else if (longest.idx.length === 4) { kind = longest.dir === 'h' ? 'row' : 'col'; cands = longest.idx; }
      if (!kind) return;
      const plain = cands.filter(i => !cells[i].special);
      const at = plain.find(i => preferred.includes(i)) ?? plain[Math.floor((plain.length - 1) / 2)];
      if (at !== undefined) spawns.push({ idx: at, kind, type: kind === 'spark' ? -1 : longest.type });
    });
    return { cells: set, spawns };
  }

  /* Specials caught in a clear fire their effect (and can chain into other specials). */
  function expandClears(board, set, rnd) {
    const { rows, cols, cells } = board, queue = [...set];
    const add = i => { if (cells[i] && !set.has(i)) { set.add(i); queue.push(i); } };
    while (queue.length) {
      const i = queue.pop(), p = cells[i];
      if (!p || !p.special) continue;
      const r = Math.floor(i / cols), c = i % cols;
      if (p.special === 'row') for (let k = 0; k < cols; k++) add(r * cols + k);
      else if (p.special === 'col') for (let k = 0; k < rows; k++) add(k * cols + c);
      else if (p.special === 'bomb') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < rows && cc < cols) add(rr * cols + cc); } }
      else if (p.special === 'spark') {
        const present = [...new Set(cells.filter(q => q && q.type >= 0).map(q => q.type))];
        if (present.length) { const t = present[Math.floor(rnd() * present.length)]; cells.forEach((q, j) => { if (q && q.type === t) add(j); }); }
      }
    }
  }

  function clearSet(board, set, spawns, chain, rnd) {
    expandClears(board, set, rnd);
    const spawned = [];
    spawns.forEach(sp => {
      const p = board.cells[sp.idx]; if (!p) return;
      set.delete(sp.idx); p.special = sp.kind; if (sp.kind === 'spark') p.type = -1;
      spawned.push({ id: p.id, idx: sp.idx, special: sp.kind, type: p.type });
    });
    const cleared = [], jelly = [];
    set.forEach(i => {
      const p = board.cells[i]; cleared.push({ id: p.id, idx: i, type: p.type, special: p.special });
      board.cells[i] = null;
      if (board.jelly[i] > 0) { board.jelly[i]--; jelly.push({ idx: i, left: board.jelly[i] }); }
    });
    return { kind: 'clear', cleared, spawned, jelly, chain, score: cleared.length * 10 * chain };
  }

  /* Gravity: pieces fall, new ones enter from above. */
  function collapse(board, rnd) {
    const { rows, cols, cells } = board, moves = [], fresh = [];
    for (let c = 0; c < cols; c++) {
      let w = rows - 1;
      for (let r = rows - 1; r >= 0; r--) {
        const p = cells[r * cols + c]; if (!p) continue;
        if (r !== w) { cells[w * cols + c] = p; cells[r * cols + c] = null; moves.push({ id: p.id, from: r * cols + c, to: w * cols + c }); }
        w--;
      }
      for (let r = w; r >= 0; r--) {
        const p = mk(Math.floor(rnd() * board.types)); cells[r * cols + c] = p;
        fresh.push({ id: p.id, type: p.type, idx: r * cols + c, fromRow: r - (w + 1) });
      }
    }
    return { kind: 'fall', moves, fresh };
  }

  function swapWorks(board, a, b) {
    const A = board.cells[a], B = board.cells[b];
    if (A.special === 'spark' || B.special === 'spark') return true;
    swapCells(board, a, b); const ok = findMatches(board, [a, b]).cells.size > 0; swapCells(board, a, b);
    return ok;
  }
  function hasMoves(board) {
    const { rows, cols, cells } = board;
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) continue;
      const r = Math.floor(i / cols), c = i % cols;
      if (c + 1 < cols && cells[i + 1] && swapWorks(board, i, i + 1)) return true;
      if (r + 1 < rows && cells[i + cols] && swapWorks(board, i, i + cols)) return true;
    }
    return false;
  }

  /* No moves left: shuffle the same pieces (new pieces only as a last resort). */
  function reshuffle(board, rnd) {
    const idxs = []; board.cells.forEach((p, i) => { if (p) idxs.push(i); });
    const pieces = idxs.map(i => board.cells[i]);
    const report = () => ({ kind: 'shuffle', positions: idxs.map(i => ({ id: board.cells[i].id, idx: i, type: board.cells[i].type, special: board.cells[i].special })) });
    for (let t = 0; t < 200; t++) {
      const sh = shuffleArr(pieces, rnd); idxs.forEach((i, k) => { board.cells[i] = sh[k]; });
      if (!findMatches(board).cells.size && hasMoves(board)) return report();
    }
    for (let t = 0; t < 200; t++) {
      idxs.forEach((i, k) => { pieces[k].special = null; pieces[k].type = Math.floor(rnd() * board.types); board.cells[i] = pieces[k]; });
      if (!findMatches(board).cells.size && hasMoves(board)) break;
    }
    return report();
  }

  /* Attempts a swap. Invalid swaps leave the board untouched. Returns the animation events. */
  function tryMove(board, a, b, rnd) {
    const A = board.cells[a], B = board.cells[b];
    swapCells(board, a, b);
    const events = [{ kind: 'swap', a, b }];
    let set, spawns;
    if (A.special === 'spark' || B.special === 'spark') {
      set = new Set(); spawns = [];
      if (A.special === 'spark' && B.special === 'spark') board.cells.forEach((p, i) => { if (p) set.add(i); });
      else {
        const sparkIdx = A.special === 'spark' ? b : a, other = A.special === 'spark' ? B : A;
        set.add(sparkIdx);
        board.cells.forEach((p, i) => { if (p && p.type >= 0 && p.type === other.type) set.add(i); });
      }
    } else {
      const m = findMatches(board, [a, b]);
      if (!m.cells.size) { swapCells(board, a, b); return { valid: false }; }
      set = m.cells; spawns = m.spawns;
    }
    let chain = 1;
    while (set.size && chain < 60) {   // safety cap; real play ends long before this
      events.push(clearSet(board, set, spawns, chain, rnd));
      events.push(collapse(board, rnd));
      chain++;
      const m = findMatches(board); set = m.cells; spawns = m.spawns;
    }
    if (!hasMoves(board)) events.push(reshuffle(board, rnd));
    return { valid: true, events };
  }

  /* ----- game state: moves, objectives, win/lose ----- */
  function createGame(cfg, rnd) {
    rnd = rnd || Math.random;
    const board = createBoard(cfg, rnd);
    return { cfg, board, movesLeft: cfg.moves, status: 'playing',
      progress: { score: 0, collected: {}, jellyLeft: board.jelly.reduce((a, b) => a + b, 0) } };
  }
  function applyEvents(progress, events) {
    events.forEach(ev => {
      if (ev.kind !== 'clear') return;
      progress.score += ev.score;
      ev.cleared.forEach(c => { if (c.type >= 0) progress.collected[c.type] = (progress.collected[c.type] || 0) + 1; });
      progress.jellyLeft -= ev.jelly.length;
    });
  }
  function goalDone(o, p) {
    return o.type === 'score' ? p.score >= o.target : o.type === 'collect' ? (p.collected[o.piece] || 0) >= o.count : p.jellyLeft <= 0;
  }
  const isComplete = (cfg, p) => cfg.objectives.every(o => goalDone(o, p));
  const starsFor = (left, total) => left / total >= 0.35 ? 3 : left / total >= 0.15 ? 2 : 1;

  function playMove(game, a, b, rnd) {
    const bd = game.board;
    if (game.status !== 'playing' || a === b || !bd.cells[a] || !bd.cells[b] || !adjacent(bd, a, b)) return { valid: false, events: [] };
    const res = tryMove(bd, a, b, rnd || Math.random);
    if (!res.valid) return { valid: false, events: [] };
    game.movesLeft--; applyEvents(game.progress, res.events);
    game.status = isComplete(game.cfg, game.progress) ? 'won' : game.movesLeft <= 0 ? 'lost' : 'playing';
    return { valid: true, events: res.events };
  }
  function cloneGame(g) {
    return { cfg: g.cfg, movesLeft: g.movesLeft, status: g.status,
      board: { rows: g.board.rows, cols: g.board.cols, types: g.board.types, cells: g.board.cells.map(p => p && { ...p }), jelly: g.board.jelly.slice() },
      progress: { score: g.progress.score, collected: { ...g.progress.collected }, jellyLeft: g.progress.jellyLeft } };
  }

  const Engine = { fromGrid, createBoard, findMatches, expandClears, clearSet, collapse, hasMoves, reshuffle, tryMove,
    createGame, playMove, applyEvents, goalDone, isComplete, starsFor, cloneGame, adjacent, mk };
  if (typeof module !== 'undefined' && module.exports) module.exports = { Engine };
  if (typeof document === 'undefined') return;

  /* ================= GAME SCREEN ================= */
  const D = root.GameData, MD = root.MatchData;
  const $ = s => document.querySelector(s);
  const UI = () => root.AppUI;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.onclick = fn; return b; };
  const reduced = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduced() ? Math.min(ms, 30) : ms));
  const svgUse = (id, cls) => `<svg${cls ? ' class="' + cls + '"' : ''} viewBox="0 0 64 64"><use href="#${id}"/></svg>`;

  const st = { n: 0, cfg: null, game: null, ui: { grid: [], byId: new Map() }, sel: null, busy: false, shown: null, down: null, goalEls: [], jelly: [] };

  function start(n) {
    const cfg = MD.levels[n - 1];
    if (!cfg) { UI().toast('That level is not ready yet'); return; }
    let game;
    try { game = Engine.createGame(cfg, Math.random); } catch (e) { console.error(e); UI().toast('Could not set up this level. Please try again.'); return; }
    Object.assign(st, { n, cfg, game, sel: null, busy: false, down: null });
    build(); Nav.go('match');
  }

  function build() {
    const { cfg, game } = st, board = $('#mt-board');
    board.style.setProperty('--cols', cfg.cols); board.style.setProperty('--rows', cfg.rows);
    board.classList.remove('win');
    board.querySelectorAll('.mt-conf').forEach(n => n.remove());
    $('#mt-title').textContent = 'Level ' + st.n;
    $('#mt-tip').textContent = cfg.tip || '';
    const jel = $('#mt-jelly'); jel.innerHTML = ''; st.jelly = [];
    game.board.jelly.forEach((l, i) => { const d = el('div'); d.dataset.alt = ((Math.floor(i / cfg.cols) + i % cfg.cols) % 2) ? 'a' : 'b'; jel.appendChild(d); st.jelly.push(d); setJelly(i, l); });
    rebuildTiles();
    const goals = $('#mt-goals'); goals.innerHTML = ''; st.goalEls = [];
    cfg.objectives.forEach(o => {
      const g = el('span', 'mt-goal');
      g.innerHTML = o.type === 'collect' ? svgUse('p-' + o.piece) : o.type === 'jelly' ? '<i class="swatch"></i>' : '';
      const t = el('b'); g.appendChild(t); goals.appendChild(g); st.goalEls.push({ o, g, t });
    });
    st.shown = { score: 0, collected: {}, jellyLeft: game.progress.jellyLeft };
    hud();
  }

  function setJelly(i, left) { const d = st.jelly[i]; d.className = 'jc ' + d.dataset.alt + (left > 0 ? ' j' + left : ''); }

  function rebuildTiles() {
    const tiles = $('#mt-tiles'); tiles.innerHTML = '';
    st.ui = { grid: new Array(st.game.board.cells.length).fill(null), byId: new Map() };
    st.game.board.cells.forEach((p, i) => { if (p) addTile(p, i, null); });
  }

  function pos(elm, row, col) { elm.style.transform = 'translate(' + col * 100 + '%,' + row * 100 + '%)'; }
  function posIdx(elm, idx) { pos(elm, Math.floor(idx / st.cfg.cols), idx % st.cfg.cols); }

  function paintTile(elm, p) {
    elm.className = 'mt' + (p.special ? ' sp-' + p.special : '');
    elm.firstChild.innerHTML = svgUse(p.special === 'spark' ? 'p-spark' : 'p-' + p.type) + (p.special && p.special !== 'spark' ? svgUse('m-' + p.special, 'mark') : '');
  }

  function addTile(p, idx, startRow) {
    const elm = el('div', 'mt'); elm.appendChild(el('div', 'mt-in'));
    paintTile(elm, p);
    const tile = { id: p.id, el: elm };
    if (startRow === null) posIdx(elm, idx); else pos(elm, startRow, idx % st.cfg.cols);
    $('#mt-tiles').appendChild(elm);
    if (startRow !== null) { void elm.offsetWidth; posIdx(elm, idx); }
    st.ui.grid[idx] = tile; st.ui.byId.set(p.id, tile);
    return tile;
  }

  function swapTiles(a, b) {
    const A = st.ui.grid[a], B = st.ui.grid[b];
    st.ui.grid[a] = B; st.ui.grid[b] = A;
    if (A) posIdx(A.el, b); if (B) posIdx(B.el, a);
  }

  function hud(bump) {
    const g = st.game, sh = st.shown;
    $('#mt-moves').textContent = g.movesLeft;
    $('#mt-moves').parentNode.classList.toggle('low', g.movesLeft <= 3 && g.status === 'playing');
    $('#mt-score').textContent = sh.score;
    if (bump) { const s = $('#mt-score').parentNode; s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
    st.goalEls.forEach(({ o, g: chip, t }) => {
      t.textContent = o.type === 'score' ? 'Score ' + Math.min(sh.score, o.target) + '/' + o.target
        : o.type === 'collect' ? Math.min(sh.collected[o.piece] || 0, o.count) + '/' + o.count
        : 'Cream left ' + Math.max(0, sh.jellyLeft);
      chip.classList.toggle('done', Engine.goalDone(o, sh));
    });
  }

  function select(i) {
    if (st.sel !== null && st.ui.grid[st.sel]) st.ui.grid[st.sel].el.classList.remove('sel');
    st.sel = i;
    if (i !== null && st.ui.grid[i]) st.ui.grid[i].el.classList.add('sel');
  }

  async function replay(events) {
    for (const ev of events) {
      if (ev.kind === 'swap') { swapTiles(ev.a, ev.b); await wait(200); }
      else if (ev.kind === 'clear') {
        ev.cleared.forEach(c => { const t = st.ui.byId.get(c.id); if (t) t.el.classList.add('clear'); });
        ev.spawned.forEach(s => { const t = st.ui.byId.get(s.id); if (t) { paintTile(t.el, { type: s.type, special: s.special }); t.el.classList.add('born'); } });
        ev.jelly.forEach(j => setJelly(j.idx, j.left));
        Engine.applyEvents(st.shown, [ev]); hud(true);
        UI().Fx.tap(520 + Math.min(ev.chain, 6) * 70);
        await wait(280);
        ev.cleared.forEach(c => {
          const t = st.ui.byId.get(c.id);
          if (t) { t.el.remove(); st.ui.byId.delete(c.id); if (st.ui.grid[c.idx] === t) st.ui.grid[c.idx] = null; }
        });
      } else if (ev.kind === 'fall') {
        const moved = ev.moves.map(m => ({ t: st.ui.byId.get(m.id), to: m.to }));
        ev.moves.forEach(m => { st.ui.grid[m.from] = null; });
        moved.forEach(m => { if (m.t) { st.ui.grid[m.to] = m.t; posIdx(m.t.el, m.to); } });
        ev.fresh.forEach(f => addTile({ id: f.id, type: f.type, special: null }, f.idx, f.fromRow));
        await wait(300);
      } else if (ev.kind === 'shuffle') {
        st.ui.grid.fill(null);
        ev.positions.forEach(p => { const t = st.ui.byId.get(p.id); if (t) { st.ui.grid[p.idx] = t; paintTile(t.el, p); posIdx(t.el, p.idx); } });
        UI().toast('No moves were left, so the board was shuffled');
        await wait(450);
      }
    }
  }

  /* After every move, make sure what is on screen matches the real board. */
  function sync() {
    const cells = st.game.board.cells;
    const ok = cells.every((p, i) => !p || (st.ui.grid[i] && st.ui.grid[i].id === p.id));
    if (!ok || $('#mt-tiles').children.length !== cells.filter(Boolean).length) rebuildTiles();
    cells.forEach((p, i) => { const t = st.ui.grid[i]; if (p && t) { t.el.classList.remove('born', 'sel'); } });
    st.sel = null;
  }

  async function attempt(a, b) {
    if (st.busy || !st.game || st.game.status !== 'playing') return;
    st.busy = true; select(null);
    const res = Engine.playMove(st.game, a, b, Math.random);
    if (!res.valid) {
      swapTiles(a, b); await wait(190); swapTiles(a, b); await wait(190);
      UI().Fx.tap(300); st.busy = false; return;
    }
    hud();
    await replay(res.events);
    sync(); hud();
    const status = st.game.status;
    if (status === 'playing') { st.busy = false; return; }
    await wait(350);
    if (status === 'won') win(); else fail();
  }

  function confetti() {
    const board = $('#mt-board');
    for (let i = 0; i < 18; i++) {
      const c = el('div', 'mt-conf'); c.innerHTML = svgUse('p-' + Math.floor(Math.random() * st.cfg.types));
      c.style.left = (Math.random() * 90) + '%'; c.style.animationDelay = (Math.random() * 0.7) + 's';
      board.appendChild(c); setTimeout(() => c.remove(), 3200);
    }
  }

  function win() {
    const g = st.game, stars = Engine.starsFor(g.movesLeft, st.cfg.moves), lv = D.matchLevels[st.n - 1];
    const gain = SaveStore.completeMatchLevel('L' + st.n, stars);
    const albumMsg = root.Album ? root.Album.rewardText(root.Album.checkUnlocks()) : ''; // album unlock check
    const gardText = root.Garden ? root.Garden.takeGainText() : '';
    $('#mt-board').classList.add('win'); confetti(); UI().Fx.tap(880);
    UI().openSheet(p => {
      p.appendChild(el('h3', '', 'Sweet success'));
      const row = el('div', 'ws-stars');
      for (let i = 0; i < 3; i++) { const s = el('span', i < stars ? 'on' : '', '★'); s.style.animationDelay = (0.15 + i * 0.2) + 's'; row.appendChild(s); }
      p.appendChild(row);
      p.appendChild(el('p', '', (g.movesLeft ? g.movesLeft + ' moves to spare.' : 'Right on the last move.') + (gain ? ' +' + gain + (gain > 1 ? ' stars.' : ' star.') : '')));
      if (albumMsg) p.appendChild(el('p', 'ws-reward', albumMsg));
      else if (gardText) p.appendChild(el('p', 'ws-reward', gardText));
      if (UI().hasNext('match', st.n)) p.appendChild(btn('Next level', 'btn-primary', () => UI().playNext('match', st.n)));
      p.appendChild(btn('Play this level again', 'btn-soft ws-wide', () => { UI().closeSheet(); start(st.n); }));
      p.appendChild(btn('Back to levels', 'btn-soft ws-wide', () => { UI().closeSheet(); Nav.go('play'); }));
    }, 'Look at the board');
  }

  function fail() {
    UI().openSheet(p => {
      p.appendChild(el('h3', '', 'So close'));
      p.appendChild(el('p', '', 'Out of moves this time. Your stars and memories are safe. There are no lives or retry limits, so you can try again as many times as you like.'));
      p.appendChild(btn('Try again', 'btn-primary', () => { UI().closeSheet(); start(st.n); }));
      p.appendChild(btn('Back to levels', 'btn-soft ws-wide', () => { UI().closeSheet(); Nav.go('play'); }));
    }, 'Look at the board');
  }

  function cellFromEvent(e) {
    const r = $('#mt-tiles').getBoundingClientRect(), { rows, cols } = st.cfg;
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || y < 0 || x >= 1 || y >= 1) return -1;
    return Math.floor(y * rows) * cols + Math.floor(x * cols);
  }

  function init() {
    const board = $('#mt-board');
    board.addEventListener('pointerdown', e => {
      if (!st.game || st.busy || st.game.status !== 'playing') return;
      e.preventDefault();
      const i = cellFromEvent(e); if (i < 0) return;
      st.down = { i, x: e.clientX, y: e.clientY, done: false };
      try { board.setPointerCapture(e.pointerId); } catch (_) {}
    });
    board.addEventListener('pointermove', e => {
      const d = st.down; if (!d || d.done || st.busy) return;
      e.preventDefault();
      const size = $('#mt-tiles').getBoundingClientRect().width / st.cfg.cols;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < size * 0.4) return;
      d.done = true;
      const { rows, cols } = st.cfg, r = Math.floor(d.i / cols), c = d.i % cols;
      const tr = r + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0), tc = c + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);
      if (tr < 0 || tc < 0 || tr >= rows || tc >= cols) return;
      attempt(d.i, tr * cols + tc);
    });
    board.addEventListener('pointerup', () => {
      const d = st.down; st.down = null;
      if (!d || d.done || st.busy || st.game.status !== 'playing') return;
      const i = d.i;                                    // a tap: select, deselect, or swap with the selected neighbor
      if (st.sel === null) select(i);
      else if (st.sel === i) select(null);
      else if (Engine.adjacent(st.game.board, st.sel, i)) attempt(st.sel, i);
      else select(i);
    });
    board.addEventListener('pointercancel', () => { st.down = null; });
    board.addEventListener('contextmenu', e => e.preventDefault());

    $('#mt-menu').addEventListener('click', () => UI().openSheet(p => {
      p.appendChild(el('h3', '', 'Taking a break'));
      p.appendChild(el('p', '', 'No timer here. Your board will wait for you.'));
      p.appendChild(btn('Restart this level', 'btn-soft ws-wide', () => { UI().closeSheet(); start(st.n); }));
      p.appendChild(btn('Back to levels', 'btn-soft ws-wide', () => { UI().closeSheet(); Nav.go('play'); }));
    }, 'Keep playing'));

    Nav.onChange(name => { if (name === 'match' && !st.game) Nav.go('play'); });
  }

  init();
  root.MatchThree = { Engine, start };
})(typeof window !== 'undefined' ? window : globalThis);
