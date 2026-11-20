/* Balance helper: a simple "greedy" bot plays each level so you can see how hard it is.
   Usage: node tests/match-balance.js [gamesPerLevel]   (humans are usually weaker than the bot). */
const { Engine: E } = require('../js/games/match-three.js');
const MD = require('../js/games/match-levels.js');
const prng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

function value(game, before) {
  const p = game.progress, v = (p.score - before.score);
  let bonus = 0;
  game.cfg.objectives.forEach(o => {
    if (o.type === 'collect') bonus += 25 * ((p.collected[o.piece] || 0) - (before.collected[o.piece] || 0));
    if (o.type === 'jelly') bonus += 40 * (before.jellyLeft - p.jellyLeft);
  });
  return v + bonus;
}
function bestMove(game, rnd) {
  const n = game.board.cells.length, cols = game.board.cols; let best = null, bv = -1;
  for (let i = 0; i < n; i++) for (const j of [i % cols + 1 < cols ? i + 1 : -1, i + cols < n ? i + cols : -1]) {
    if (j < 0) continue;
    const g = E.cloneGame(game), before = { score: g.progress.score, collected: { ...g.progress.collected }, jellyLeft: g.progress.jellyLeft };
    if (!E.playMove(g, i, j, prng(i * 131 + j)).valid) continue;
    const v = value(g, before) + rnd() * 5;
    if (v > bv) { bv = v; best = [i, j]; }
  }
  return best;
}
function play(cfg, seed) {
  const rnd = prng(seed), game = E.createGame(cfg, rnd);
  while (game.status === 'playing') { const m = bestMove(game, rnd); if (!m) break; E.playMove(game, m[0], m[1], rnd); }
  return game;
}
if (require.main === module) {
  const N = +process.argv[2] || 8;
  console.log('lvl moves goals                                   win%  medianScore  stars(avg)');
  MD.levels.forEach(cfg => {
    let wins = 0, stars = 0; const scores = [];
    for (let k = 0; k < N; k++) { const g = play(cfg, cfg.number * 1000 + k); scores.push(g.progress.score); if (g.status === 'won') { wins++; stars += E.starsFor(g.movesLeft, cfg.moves); } }
    scores.sort((a, b) => a - b);
    console.log(String(cfg.number).padStart(3), String(cfg.moves).padStart(5), cfg.objectives.map(MD.describe).join(' + ').padEnd(40).slice(0, 40), String(Math.round(wins / N * 100)).padStart(4), String(scores[N >> 1]).padStart(11), wins ? (stars / wins).toFixed(1).padStart(8) : '       -');
  });
}
module.exports = { play };
