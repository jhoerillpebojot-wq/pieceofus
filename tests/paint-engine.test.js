/* Painting engine: node tests/paint-engine.test.js */
const assert = require('assert');
const PE = require('../js/paint-engine.js');

// a synthetic "photo": sky gradient, a green hill, a red house with a yellow door (plus a little noise)
function photo(w, h) {
  const data = new Uint8ClampedArray(w * h * 4); let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = [120 + y * 0.6, 170 + y * 0.4, 235];
    if (y > h * 0.65) c = [70, 150 - (x % 40), 80];
    if (x > w * .3 && x < w * .7 && y > h * .4 && y < h * .8) c = [190, 60, 60];
    if (x > w * .45 && x < w * .55 && y > h * .6 && y < h * .8) c = [240, 210, 80];
    const o = (y * w + x) * 4, n = (rnd() - .5) * 10;
    data[o] = c[0] + n; data[o + 1] = c[1] + n; data[o + 2] = c[2] + n; data[o + 3] = 255;
  }
  return { data, w, h };
}
const img = photo(120, 160);

// levels get harder, up to caps
const a = PE.levelParams(1), b = PE.levelParams(50), c = PE.levelParams(100);
assert(a.regions < b.regions && b.regions < c.regions, 'more sections as levels go up');
assert(a.colors <= b.colors && b.colors <= c.colors, 'more colors as levels go up');
assert(c.regions <= 260 && c.colors <= 16);

for (const [regions, colors] of [[20, 5], [60, 8], [150, 12]]) {
  const e = PE.build(img, { regions, colors, seed: 'x' });
  assert.strictEqual(e.regionCount, regions, 'reaches the target section count: ' + regions);
  assert(e.palette.length >= 3 && e.palette.length <= colors);
  // every pixel belongs to exactly one section and the pixel lists agree with the label map
  let total = 0;
  for (let id = 1; id <= e.regionCount; id++) {
    const n = e.start[id + 1] - e.start[id]; total += n; assert(n > 0, 'no empty sections');
    for (let k = e.start[id]; k < e.start[id + 1]; k++) assert.strictEqual(e.labels[e.order[k]], id);
    assert(e.regionColor[id] < e.palette.length);
    assert(e.labels[Math.round(e.cy[id]) * e.w + Math.round(e.cx[id])] === id, 'number sits inside its section');
  }
  assert.strictEqual(total, e.w * e.h);
  // sections are connected (one piece each)
  const seen = new Uint8Array(e.w * e.h), pieces = new Int32Array(e.regionCount + 1);
  for (let s = 0; s < e.w * e.h; s++) {
    if (seen[s]) continue; const id = e.labels[s]; pieces[id]++; const st = [s]; seen[s] = 1;
    while (st.length) { const p = st.pop(), x = p % e.w, y = (p - x) / e.w;
      [[x > 0, p - 1], [x < e.w - 1, p + 1], [y > 0, p - e.w], [y < e.h - 1, p + e.w]].forEach(([ok, q]) => { if (ok && !seen[q] && e.labels[q] === id) { seen[q] = 1; st.push(q); } }); }
  }
  for (let id = 1; id <= e.regionCount; id++) assert.strictEqual(pieces[id], 1, 'section ' + id + ' is one connected piece');
}

// same photo + same settings = same puzzle (so saved progress stays valid)
const e1 = PE.build(img, { regions: 60, colors: 8, seed: 'same' }), e2 = PE.build(img, { regions: 60, colors: 8, seed: 'same' });
assert.deepStrictEqual(Array.from(e1.labels), Array.from(e2.labels));
assert.deepStrictEqual(e1.palette, e2.palette);

// colorless first, color after painting
const e = PE.build(img, { regions: 30, colors: 6, seed: 'paint' }), out = new Uint8ClampedArray(e.w * e.h * 4);
PE.fillRegion(e, 1, false, out);
for (let k = e.start[1]; k < e.start[2]; k++) { const o = e.order[k] * 4; assert(out[o] === out[o + 1] && out[o + 1] === out[o + 2], 'unpainted is colorless'); }
PE.fillRegion(e, 1, true, out);
const col = e.palette[e.regionColor[1]], o = e.order[e.start[1]] * 4;
assert(Math.abs(out[o] - col[0]) < 60 && out[o + 3] === 255, 'painted uses the palette color');

// a flat single-color image still works (nothing to split by color)
const flat = { data: new Uint8ClampedArray(60 * 60 * 4).fill(200), w: 60, h: 60 };
const f = PE.build(flat, { regions: 12, colors: 6, seed: 'flat' });
assert(f.regionCount >= 2 && f.regionCount <= 12, 'flat image is split into paintable pieces');
console.log('paint-engine tests passed');
