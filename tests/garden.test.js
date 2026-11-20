/* Little Garden rules. Run: node tests/garden.test.js */
const assert = require('assert'), { Logic } = require('../js/garden.js'), C = require('../js/data/garden.js');
const base = () => ({ levels: {}, match: { levels: {} }, stars: 0, memories: [], garden: [], album: { chapters: [] }, secrets: { found: [], words: [], collected: [] }, letters: { unlocked: [] },
  garden2: { seeds: {}, decor: {}, claimed: [], areas: ['beginning'], plots: {}, spots: {}, seen: 0, progress: 0 } });
const lv = (st, w, m) => { for (let n = 1; n <= w; n++) st.levels['L' + n] = { stars: 3 }; for (let n = 1; n <= m; n++) st.match.levels['L' + n] = { stars: 3 }; st.stars = (w + m) * 3; };
assert.deepStrictEqual(Logic.problems(), [], 'config problems');
let st = base(); Logic.sync(st);
assert.deepStrictEqual(st.garden2.areas, ['beginning']); assert.strictEqual(Object.keys(st.garden2.seeds).length, 0);
lv(st, 3, 0); let o = Logic.sync(st);
assert.deepStrictEqual(st.garden2.seeds, { tulip: 2, daisy: 1 }); assert.ok(o.items.length === 3); assert.strictEqual(st.garden2.seen, 3);
Logic.sync(st); assert.deepStrictEqual(st.garden2.seeds, { tulip: 2, daisy: 1 }, 'rewards are only given once');
lv(st, 3, 3); Logic.sync(st); assert.deepStrictEqual(st.garden2.decor, { stone: 1, fence: 1, bush: 1 });
// planting
assert.ok(Logic.plant(st, 'beginning', 0, 'tulip')); assert.ok(!Logic.plant(st, 'beginning', 0, 'tulip'), 'plot taken');
assert.ok(!Logic.plant(st, 'beginning', 5, 'tulip'), 'no such plot in the first area'); assert.ok(!Logic.plant(st, 'flower', 0, 'tulip'), 'locked area');
assert.ok(!Logic.plant(st, 'beginning', 1, 'sunflower'), 'no seed'); assert.strictEqual(st.garden2.seeds.tulip, 1);
// growth by water and by playing (water needs five minutes between uses)
let fakeNow = 1000000; const realNow = Date.now; Date.now = () => fakeNow; const waterWithRest = (a, i) => { fakeNow += 5 * 60 * 1000; return Logic.water(st, a, i); };
assert.strictEqual(st.garden2.plots.beginning[0].s, 0);
Logic.water(st, 'beginning', 0); assert.strictEqual(st.garden2.plots.beginning[0].s, 1);
lv(st, 6, 3); Logic.sync(st); assert.strictEqual(st.garden2.plots.beginning[0].s, 2, 'a finished level grows flowers');
waterWithRest('beginning', 0); assert.ok(!Logic.water(st, 'beginning', 0), 'already in bloom'); assert.strictEqual(st.garden2.plots.beginning[0].s, 3);
// dig up returns the seed
assert.ok(Logic.dig(st, 'beginning', 0)); assert.strictEqual(st.garden2.seeds.tulip, 3); assert.ok(!st.garden2.plots.beginning[0]);
// decorations: place, limits, move, swap, put away
assert.ok(Logic.place(st, 'beginning', 0, 'stone')); assert.ok(!Logic.place(st, 'beginning', 1, 'stone'), 'only one stone owned'); assert.ok(!Logic.place(st, 'beginning', 0, 'bush'), 'spot taken');
assert.ok(Logic.place(st, 'beginning', 1, 'bush')); assert.ok(Logic.move(st, 'beginning', 0, 3)); assert.strictEqual(st.garden2.spots.beginning[3], 'stone'); assert.ok(!st.garden2.spots.beginning[0]);
Logic.move(st, 'beginning', 3, 1); assert.deepStrictEqual([st.garden2.spots.beginning[1], st.garden2.spots.beginning[3]], ['stone', 'bush'], 'swap');
assert.ok(Logic.putAway(st, 'beginning', 1)); assert.strictEqual(Logic.left(st.garden2, 'stone'), 1);
// areas unlock from progress and stay unlocked
lv(st, 10, 0); Logic.sync(st); assert.ok(st.garden2.areas.includes('flower'));
lv(st, 0, 0); st.levels = {}; st.match.levels = {}; Logic.sync(st); assert.ok(st.garden2.areas.includes('flower'), 'never locks again');
st = base(); lv(st, 12, 20); st.secrets.found = ['s-word', 's-sparkle', 's-garden']; Logic.sync(st);
assert.ok(st.garden2.seeds.rose === 2 && st.garden2.decor.lantern === 1 && st.garden2.decor.birdbath === 1 && st.garden2.decor.mushroom >= 1, 'achievement + secret rewards');
assert.ok(!st.garden2.areas.includes('butterfly')); Logic.plant(st, 'flower', 0, 'tulip');
['tulip', 'daisy'].forEach((t, i) => { Logic.plant(st, 'beginning', i, t); }); [0, 1].forEach(i => { for (let k = 0; k < 3; k++) waterWithRest('beginning', i); });
assert.strictEqual(Logic.stats(st).blooms, 2); Logic.plant(st, 'beginning', 2, 'rose'); for (let k = 0; k < 3; k++) waterWithRest('beginning', 2);
lv(st, 20, 20); Logic.sync(st); assert.ok(st.garden2.areas.includes('butterfly'), 'butterfly area needs 20 levels and 3 blooms');
// storage round trip + normalisation
global.window = global; const mem = {}; global.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
require('../js/storage.js'); SaveStore.gardenEdit(s => { s.garden2.seeds.rose = 2; s.garden2.plots.beginning = { 0: { t: 'rose', s: 2 } }; s.garden2.spots.beginning = { 2: 'bench' }; s.garden2.areas.push('flower'); });
const raw = JSON.parse(mem['alpou.save.v1']); raw.garden2.seeds.bad = -3; raw.garden2.plots.beginning[1] = { t: 5 }; mem['alpou.save.v1'] = JSON.stringify(raw);
delete require.cache[require.resolve('../js/storage.js')]; require('../js/storage.js'); const g = SaveStore.get().garden2;
assert.deepStrictEqual([g.seeds, g.plots.beginning, g.spots.beginning, g.areas], [{ rose: 2 }, { 0: { t: 'rose', s: 2, lastWaterAt: 0 } }, { 2: 'bench' }, ['beginning', 'flower']], 'saved garden survives reload; junk is dropped');
SaveStore.resetProgress(); assert.strictEqual(SaveStore.get().garden2.plots.beginning[0].t, 'rose', 'Start over keeps the garden');
Date.now = realNow;
console.log('garden logic OK (' + C.rewards.length + ' rewards)');
