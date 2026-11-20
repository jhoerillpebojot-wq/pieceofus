const assert = require('assert');
const { Engine } = require('../js/games/word-search.js');
const WSD = require('../js/games/word-search-levels.js');

let runs = 0; const dirsSeen = {};
WSD.levels.forEach(cfg => {
  for (let i = 0; i < 40; i++) {
    const words = Engine.pickWords(cfg, WSD.pools, WSD.overrides[cfg.number]);
    assert.strictEqual(words.length, cfg.count, 'level ' + cfg.number + ' word count');
    assert.strictEqual(new Set(words).size, words.length, 'duplicate words in level ' + cfg.number);
    words.forEach(w => assert(w.length >= cfg.minLen && w.length <= cfg.maxLen && /^[A-Z]+$/.test(w)));
    const p = Engine.generate(words, cfg.size, cfg.dirs);
    Engine.verify(p); runs++;
    p.placements.forEach(pl => { assert(cfg.dirs.includes(pl.dir), 'direction not allowed'); dirsSeen[pl.dir] = (dirsSeen[pl.dir] || 0) + 1; });
    p.grid.forEach(row => row.forEach(ch => assert(/^[A-Z]$/.test(ch), 'unfilled cell')));
  }
});
// determinism of word lists
const a = Engine.pickWords(WSD.levels[9], WSD.pools), b = Engine.pickWords(WSD.levels[9], WSD.pools);
assert.deepStrictEqual(a, b);
// selection helpers
assert.strictEqual(Engine.pathCells(2, 2, 2, 5, 8).length, 4);
assert.deepStrictEqual(Engine.pathCells(2, 2, 5, 5, 8).slice(-1)[0], [5, 5]);
assert.deepStrictEqual(Engine.pathCells(5, 5, 2, 2, 8).slice(-1)[0], [2, 2]);
assert.strictEqual(Engine.pathCells(0, 0, 3, 1, 8).length, 4);       // snaps to vertical
assert.strictEqual(Engine.pathCells(0, 0, 0, 20, 6).length, 6);      // clamps to grid
assert.strictEqual(Engine.pathCells(0, 0, 3, 5, 8).length, 5);       // diagonal snap uses projected distance
const g = [['C','A','T'],['X','X','X'],['X','X','X']];
assert.strictEqual(Engine.match([[0,0],[0,1],[1,2]], g, ['CAT']), null); // bent selection rejected
assert.strictEqual(Engine.match([[0,0],[0,2],[0,1]], g, ['CAT']), null); // non-adjacent selection rejected
const seedA = Engine.generate(['CAT','DOG'], 6, ['E','S'], Engine.seededRandom(42));
const seedB = Engine.generate(['CAT','DOG'], 6, ['E','S'], Engine.seededRandom(42));
assert.deepStrictEqual(seedA, seedB, 'seeded puzzles are reproducible');
assert.strictEqual(Engine.match([[0,0],[0,1],[0,2]], g, ['CAT']), 'CAT');
assert.strictEqual(Engine.match([[0,2],[0,1],[0,0]], g, ['CAT']), 'CAT');  // backward
assert.strictEqual(Engine.match([[0,0],[0,1]], g, ['CAT']), null);
assert.deepStrictEqual([0,1,2,3,4,5,9].map(Engine.starsFor), [3,3,3,2,2,1,1]);
assert.throws(() => Engine.generate(['TOOLONGWORD'], 5, ['E']));
console.log('OK', runs, 'puzzles across', WSD.levels.length, 'levels; placements by direction:', JSON.stringify(dirsSeen));
