/* Three-game play path: run node tests/journey.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const w = {}; vm.runInNewContext(fs.readFileSync('js/data.js', 'utf8'), { window: w });
const J = w.GameData.journey;
assert.strictEqual(J.length, 300, '100 Word Search + 100 Match-3 + 100 Coloring = 300 steps');
J.forEach((n, i) => assert.strictEqual(n.game, ['word', 'match', 'paint'][i % 3], 'three-game cycle at step ' + (i + 1)));
['word', 'match', 'paint'].forEach(g => {
  const nums = J.filter(n => n.game === g).map(n => n.number);
  assert.strictEqual(nums.join(','), Array.from({ length: 100 }, (_, i) => i + 1).join(','), g + ' levels appear once each, in order');
});
assert.strictEqual(w.GameData.maxStars, 900, 'three games award up to 900 stars');
console.log('journey OK: 300 steps cycling Word Search / Match-3 / Coloring, each level exactly once');
