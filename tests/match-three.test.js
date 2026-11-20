const assert = require('assert');
const { Engine: E } = require('../js/games/match-three.js');
const MD = require('../js/games/match-levels.js');

function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cycle = () => { let k = 0; return () => ((k++ % 4) + 0.5) / 4; };               // fresh pieces: 0,1,2,3,0,1...
const at = (b, r, c) => r * b.cols + c;
const game = (grid, objectives, moves) => { const board = E.fromGrid(grid); return { cfg: { objectives, moves, types: board.types }, board, movesLeft: moves, status: 'playing', progress: { score: 0, collected: {}, jellyLeft: 0 } }; };
const countClears = ev => ev.filter(e => e.kind === 'clear').length;

/* 1. matching detection */
let b = E.fromGrid([[0,0,0,1],[1,2,3,2],[2,3,1,3]]);
assert.deepStrictEqual([...E.findMatches(b).cells].sort(), [0,1,2], 'horizontal 3');
b = E.fromGrid([[0,1,2],[0,2,1],[0,3,2]]);
assert.deepStrictEqual([...E.findMatches(b).cells].sort(), [0,3,6], 'vertical 3');
b = E.fromGrid([[0,1,0],[1,0,1],[0,1,0]]);
assert.strictEqual(E.findMatches(b).cells.size, 0, 'no match');
b = E.fromGrid([[0,0,0,1,2,2,2],[1,2,3,0,1,3,0]]);
assert.strictEqual(E.findMatches(b).cells.size, 6, 'two separate matches');

/* 2. special creation: 4 -> row/col, L/T -> bomb, 5 -> spark */
let m = E.findMatches(E.fromGrid([[0,0,0,0],[1,2,3,1]]), [1]);
assert.deepStrictEqual(m.spawns, [{ idx: 1, kind: 'row', type: 0 }], '4 horizontal = row piece at the moved cell');
m = E.findMatches(E.fromGrid([[0,1],[0,2],[0,3],[0,1]]));
assert.strictEqual(m.spawns[0].kind, 'col', '4 vertical = column piece');
m = E.findMatches(E.fromGrid([[0,0,0,0,0],[1,2,3,1,2]]));
assert.strictEqual(m.spawns[0].kind, 'spark'); assert.strictEqual(m.spawns[0].type, -1);
m = E.findMatches(E.fromGrid([[0,1,2],[0,3,1],[0,0,0]]));   // L shape
assert.strictEqual(m.spawns.length, 1); assert.strictEqual(m.spawns[0].kind, 'bomb'); assert.strictEqual(m.spawns[0].idx, 6);
m = E.findMatches(E.fromGrid([[1,0,2],[3,0,1],[0,0,0]]));   // T shape
assert.strictEqual(m.spawns[0].kind, 'bomb');

/* 3. special effects */
const big = () => E.fromGrid(Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (r + 2 * c) % 4)));
b = big(); b.cells[at(b,2,2)].special = 'row';
let s = new Set([at(b,2,2)]); E.expandClears(b, s, Math.random);
assert.deepStrictEqual([...s].sort((x, y) => x - y), [10,11,12,13,14], 'row piece clears its row');
b = big(); b.cells[at(b,2,2)].special = 'col';
s = new Set([at(b,2,2)]); E.expandClears(b, s, Math.random);
assert.deepStrictEqual([...s].sort((x, y) => x - y), [2,7,12,17,22], 'column piece clears its column');
b = big(); b.cells[at(b,2,2)].special = 'bomb';
s = new Set([at(b,2,2)]); E.expandClears(b, s, Math.random);
assert.strictEqual(s.size, 9, 'ring piece clears 3x3');
b = big(); b.cells[at(b,2,2)].special = 'row'; b.cells[at(b,2,4)].special = 'col';
s = new Set([at(b,2,2)]); E.expandClears(b, s, Math.random);
assert(s.has(at(b,0,4)) && s.has(at(b,4,4)), 'specials chain into each other');
// sparkle: swapped with a piece, clears every piece of that kind
b = big(); b.cells[0].special = 'spark'; b.cells[0].type = -1;
const target = b.cells[1].type, expected = b.cells.filter(p => p.type === target).length;
let r = E.tryMove(b, 0, 1, cycle());
assert(r.valid, 'spark swap is always valid');
const first = r.events.find(e => e.kind === 'clear');
assert.strictEqual(first.cleared.filter(c => c.type === target).length, expected, 'all of that kind cleared');
assert(first.cleared.some(c => c.special === 'spark'), 'sparkle is used up');
// 4-match creates a special on the board and keeps it
b = E.fromGrid([[0,0,1,0],[2,3,0,3],[3,2,3,2],[2,3,2,3]]);
r = E.tryMove(b, 2, 6, () => 0.5);
assert(r.valid);
assert(r.events.find(e => e.kind === 'clear').spawned.some(x => x.special === 'row'), 'row piece spawned');

/* 4. invalid swap leaves everything untouched */
let g = game([[0,1,0,1],[1,0,1,0],[0,1,0,1],[1,0,1,0]], [{ type: 'score', target: 999 }], 5);
const snap = JSON.stringify(g.board.cells);
r = E.playMove(g, 0, 1, Math.random);
assert.strictEqual(r.valid, false); assert.strictEqual(g.movesLeft, 5, 'invalid swap costs no move');
assert.strictEqual(JSON.stringify(g.board.cells), snap, 'board unchanged');
assert.strictEqual(E.playMove(g, 0, 5, Math.random).valid, false, 'diagonal swap rejected');
assert.strictEqual(E.playMove(g, 0, 3, Math.random).valid, false, 'distant swap rejected');

/* 5. cascades + gravity: hand-built board where the first clear drops a second match into place */
g = game([[2,3,2,3,2],[3,2,1,2,3],[2,3,0,1,1],[0,0,3,3,2]], [{ type: 'score', target: 99999 }], 5);
g.board.cells[at(g.board,2,2)].type = 0;   // piece that will swap down
g.board.cells[at(g.board,3,2)].type = 3;
r = E.playMove(g, at(g.board,2,2), at(g.board,3,2), cycle());
assert(r.valid, 'cascade move valid');
assert(countClears(r.events) >= 2, 'cascade: more than one clear step (' + countClears(r.events) + ')');
const clears = r.events.filter(e => e.kind === 'clear'); assert(clears[1].chain === 2 && clears[1].score === clears[1].cleared.length * 20, 'chain multiplier');
assert(g.board.cells.every(Boolean), 'no holes after falling');
assert.strictEqual(E.findMatches(g.board).cells.size, 0, 'board is settled');
assert.strictEqual(g.movesLeft, 4, 'one move used for the whole cascade');
const fall = r.events.find(e => e.kind === 'fall'); assert(fall.fresh.length >= 3, 'new pieces enter from the top');
assert(fall.fresh.every(f => f.fromRow < 0 || f.fromRow <= f.idx / 5), 'fresh pieces start above the board');

/* 6. completion, failure, stars, move counting */
g = game([[0,0,1,2],[3,2,0,1],[1,3,2,3],[2,1,3,0]], [{ type: 'score', target: 30 }], 3);
r = E.playMove(g, 2, 6, cycle());     // 0 down into row 0 -> 0,0,0
assert(r.valid && g.progress.score >= 30 && g.status === 'won', 'level completes at target (status ' + g.status + ')');
assert.strictEqual(E.playMove(g, 0, 1).valid, false, 'no moves after the level ends');
g = game([[0,0,1,2],[3,2,0,1],[1,3,2,3],[2,1,3,0]], [{ type: 'score', target: 99999 }], 1);
E.playMove(g, 2, 6, cycle());
assert.strictEqual(g.status, 'lost', 'out of moves = lost'); assert.strictEqual(g.movesLeft, 0);
assert.deepStrictEqual([25, 8, 5, 0].map(l => E.starsFor(l, 25)), [3, 2, 2, 1]);
const cfgC = { objectives: [{ type: 'collect', piece: 1, count: 2 }, { type: 'jelly' }] };
assert.strictEqual(E.isComplete(cfgC, { score: 0, collected: { 1: 2 }, jellyLeft: 1 }), false, 'all objectives are required');
assert.strictEqual(E.isComplete(cfgC, { score: 0, collected: { 1: 2 }, jellyLeft: 0 }), true);

/* 7. jelly (cream tiles): cleared when a piece on them is cleared, two layers need two clears */
g = game([[0,0,1,2],[3,2,0,1],[1,3,2,3],[2,1,3,0]], [{ type: 'jelly' }], 3);
g.board.jelly[0] = 2; g.board.jelly[1] = 1; g.progress.jellyLeft = 3;
E.playMove(g, 2, 6, cycle());
assert.strictEqual(g.board.jelly[0], 1, 'two-layer tile loses one layer'); assert.strictEqual(g.board.jelly[1], 0);
assert.strictEqual(g.progress.jellyLeft, 1);

/* 8. reshuffle when no moves exist */
b = E.fromGrid([[0,1,2,3],[2,3,0,1],[0,1,2,3],[2,3,0,1]]);
assert.strictEqual(E.hasMoves(b), false, 'fixture has no moves');
const ev = E.reshuffle(b, prng(7));
assert(ev.kind === 'shuffle' && E.hasMoves(b) && E.findMatches(b).cells.size === 0, 'reshuffle leaves a playable settled board');

/* 9. fuzz: thousands of random moves on real levels keep every invariant */
let moves = 0, cascades = 0;
MD.levels.forEach(cfg => {
  for (let k = 0; k < 4; k++) {
    const rnd = prng(cfg.number * 100 + k), game = E.createGame(cfg, rnd);
    assert.strictEqual(E.findMatches(game.board).cells.size, 0, 'fresh board has no matches');
    assert(E.hasMoves(game.board), 'fresh board is playable');
    while (game.status === 'playing') {
      const pairs = [];
      game.board.cells.forEach((_, i) => { if (i % cfg.cols + 1 < cfg.cols) pairs.push([i, i + 1]); if (i + cfg.cols < game.board.cells.length) pairs.push([i, i + cfg.cols]); });
      const [a2, b2] = pairs[Math.floor(rnd() * pairs.length)];
      const res = E.playMove(game, a2, b2, rnd); if (!res.valid) continue;
      moves++; if (countClears(res.events) > 1) cascades++;
      assert(game.board.cells.every(Boolean), 'holes'); assert(E.findMatches(game.board).cells.size === 0, 'unsettled');
      assert(E.hasMoves(game.board), 'dead board'); assert(game.board.jelly.every(j => j >= 0));
      assert.strictEqual(new Set(game.board.cells.map(p => p.id)).size, game.board.cells.length, 'duplicate ids');
    }
  }
});
console.log('engine OK:', moves, 'random moves,', cascades, 'with cascades');

/* 10. level data sanity */
MD.levels.forEach(c => {
  assert(c.types >= 4 && c.types <= 6 && c.moves >= 15);
  c.objectives.forEach(o => { if (o.type === 'collect') assert(o.piece < c.types, 'level ' + c.number + ' collects a piece not in play'); });
  if (c.objectives.some(o => o.type === 'jelly')) assert(c.jelly.length > 0, 'level ' + c.number + ' needs cream tiles');
});
assert.strictEqual(MD.levels.length, 100);

/* 11. saving progression (fake localStorage) */
const mem = {}; global.window = global;
global.localStorage = { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const load = () => { delete require.cache[require.resolve('../js/storage.js')]; delete global.SaveStore; require('../js/storage.js'); return global.SaveStore; };
let S = load();
assert.strictEqual(S.completeMatchLevel('L1', 2), 2); assert.strictEqual(S.completeMatchLevel('L1', 1), 0, 'best stars kept');
assert.strictEqual(S.completeMatchLevel('L1', 3), 1); S.completeLevel('L1', 3); S.unlock('memories', 'M16');
S = load();
assert.deepStrictEqual(S.get().match.levels.L1, { stars: 3 }); assert.strictEqual(S.get().stars, 6, 'stars add up across both games');
assert.deepStrictEqual(S.get().levels.L1, { stars: 3 }); assert(S.get().memories.includes('M16'));
mem['alpou.save.v1'] = JSON.stringify({ levels: { L2: { stars: 2 } }, memories: ['M1'], stars: 2 });       // a Stage 2 save
S = load();
assert.deepStrictEqual(S.get().levels.L2, { stars: 2 }); assert.deepStrictEqual(S.get().match.levels, {}, 'old saves gain empty Match-3 progress');
S.resetProgress(); assert.deepStrictEqual(S.get().match.levels, {});
console.log('save OK');
