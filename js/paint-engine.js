/* Paint engine: turns a photo into a numbered "paint by number" puzzle.
   Pure logic (no DOM) so Node can test it. The same photo + the same settings always gives the same puzzle.
   Steps: soften the photo -> pick N paint colors (k-means) -> tidy -> cut into regions -> merge tiny regions
   until the target number of regions is reached -> find a good spot for each region's number. */
(function (root) {
  const WT = [3, 4, 2];                     // perceptual-ish channel weights for color distance

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const cdist = (r1, g1, b1, r2, g2, b2) => WT[0] * (r1 - r2) * (r1 - r2) + WT[1] * (g1 - g2) * (g1 - g2) + WT[2] * (b1 - b2) * (b1 - b2);

  /* How hard is paint level n (1-100)? More sections and more colors as she goes. */
  function levelParams(n) {
    n = Math.max(1, Math.floor(n) || 1);
    return { regions: Math.min(260, Math.round(36 + (n - 1) * 2.3)), colors: Math.min(16, 6 + Math.floor((n - 1) / 9)) };
  }
  const DIFFICULTY = {
    relaxed: { regions: 48, colors: 7 },
    detailed: { regions: 120, colors: 11 },
    masterpiece: { regions: 240, colors: 15 }
  };

  /* 3-tap blur on both axes: flattens skin texture and noise so regions come out calm and paintable. */
  function soften(data, w, h) {
    const n = w * h; let a = new Float32Array(n * 3), b = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = data[i * 4]; a[i * 3 + 1] = data[i * 4 + 1]; a[i * 3 + 2] = data[i * 4 + 2]; }
    for (let pass = 0; pass < 1; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x, l = x > 0 ? p - 1 : p, r = x < w - 1 ? p + 1 : p;
        for (let c = 0; c < 3; c++) b[p * 3 + c] = (a[l * 3 + c] + a[p * 3 + c] + a[r * 3 + c]) / 3;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x, u = y > 0 ? p - w : p, d = y < h - 1 ? p + w : p;
        for (let c = 0; c < 3; c++) a[p * 3 + c] = (b[u * 3 + c] + b[p * 3 + c] + b[d * 3 + c]) / 3;
      }
    }
    return a;
  }

  /* k-means with a seeded k-means++ start. Returns a label per pixel and the palette (dark to light). */
  function quantize(px, n, K, rng) {
    const step = Math.max(1, Math.floor(n / 24000)), idx = [];
    for (let i = 0; i < n; i += step) idx.push(i);
    const m = idx.length, cen = new Float64Array(K * 3), d2 = new Float64Array(m).fill(Infinity);
    const setC = (k, p) => { cen[k * 3] = px[p * 3]; cen[k * 3 + 1] = px[p * 3 + 1]; cen[k * 3 + 2] = px[p * 3 + 2]; };
    setC(0, idx[Math.floor(rng() * m)]);
    for (let k = 1; k < K; k++) {
      let sum = 0;
      for (let j = 0; j < m; j++) {
        const p = idx[j], d = cdist(px[p * 3], px[p * 3 + 1], px[p * 3 + 2], cen[(k - 1) * 3], cen[(k - 1) * 3 + 1], cen[(k - 1) * 3 + 2]);
        if (d < d2[j]) d2[j] = d; sum += d2[j];
      }
      let r = rng() * sum, pick = m - 1;
      for (let j = 0; j < m; j++) { r -= d2[j]; if (r <= 0) { pick = j; break; } }
      setC(k, idx[pick]);
    }
    const nearest = p => {
      let best = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const d = cdist(px[p * 3], px[p * 3 + 1], px[p * 3 + 2], cen[k * 3], cen[k * 3 + 1], cen[k * 3 + 2]);
        if (d < bd) { bd = d; best = k; }
      }
      return best;
    };
    const sums = new Float64Array(K * 3), cnt = new Int32Array(K);
    for (let it = 0; it < 10; it++) {
      sums.fill(0); cnt.fill(0);
      for (let j = 0; j < m; j++) { const p = idx[j], k = nearest(p); cnt[k]++; sums[k * 3] += px[p * 3]; sums[k * 3 + 1] += px[p * 3 + 1]; sums[k * 3 + 2] += px[p * 3 + 2]; }
      for (let k = 0; k < K; k++) {
        if (cnt[k]) { cen[k * 3] = sums[k * 3] / cnt[k]; cen[k * 3 + 1] = sums[k * 3 + 1] / cnt[k]; cen[k * 3 + 2] = sums[k * 3 + 2] / cnt[k]; }
        else setC(k, idx[Math.floor(rng() * m)]);
      }
    }
    const lab = new Uint8Array(n), used = new Uint8Array(K);
    for (let p = 0; p < n; p++) { lab[p] = nearest(p); used[lab[p]] = 1; }
    // keep only colors that are really used, ordered dark -> light so the numbers feel natural
    const order = [];
    for (let k = 0; k < K; k++) if (used[k]) order.push(k);
    const lumK = k => 0.299 * cen[k * 3] + 0.587 * cen[k * 3 + 1] + 0.114 * cen[k * 3 + 2];
    order.sort((a, b) => lumK(a) - lumK(b));
    const remap = new Uint8Array(K), palette = [];
    order.forEach((k, i) => { remap[k] = i; palette.push([Math.round(cen[k * 3]), Math.round(cen[k * 3 + 1]), Math.round(cen[k * 3 + 2])]); });
    for (let p = 0; p < n; p++) lab[p] = remap[lab[p]];
    palette.forEach(c => { const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; for (let i = 0; i < 3; i++) c[i] = Math.max(0, Math.min(255, Math.round(l + (c[i] - l) * 1.18))); });
    return { lab, palette };
  }

  /* Majority filter: removes lonely speckles so regions are smooth blobs. */
  function modeFilter(lab, w, h, K) {
    const out = new Uint8Array(lab.length), cnt = new Uint8Array(K), l = new Uint8Array(9);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; l[c++] = lab[yy * w + xx]; }
      }
      for (let i = 0; i < c; i++) cnt[l[i]]++;
      const center = lab[y * w + x]; let best = center, bc = cnt[center];
      for (let i = 0; i < c; i++) if (cnt[l[i]] > bc) { bc = cnt[l[i]]; best = l[i]; }
      for (let i = 0; i < c; i++) cnt[l[i]] = 0;
      out[y * w + x] = best;
    }
    return out;
  }

  /* Cut into connected same-color pieces. */
  function components(lab, w, h) {
    const n = w * h, comp = new Int32Array(n).fill(-1), stack = new Int32Array(n), area = [], pal = [], first = [];
    let nc = 0;
    for (let s = 0; s < n; s++) {
      if (comp[s] >= 0) continue;
      const L = lab[s]; let sp = 0, a = 0; stack[sp++] = s; comp[s] = nc;
      while (sp) {
        const p = stack[--sp]; a++;
        const x = p % w, y = (p - x) / w;
        if (x > 0 && comp[p - 1] < 0 && lab[p - 1] === L) { comp[p - 1] = nc; stack[sp++] = p - 1; }
        if (x < w - 1 && comp[p + 1] < 0 && lab[p + 1] === L) { comp[p + 1] = nc; stack[sp++] = p + 1; }
        if (y > 0 && comp[p - w] < 0 && lab[p - w] === L) { comp[p - w] = nc; stack[sp++] = p - w; }
        if (y < h - 1 && comp[p + w] < 0 && lab[p + w] === L) { comp[p + w] = nc; stack[sp++] = p + w; }
      }
      area.push(a); pal.push(L); first.push(s); nc++;
    }
    return { comp, nc, area, pal, first };
  }

  /* Big flat areas (a wall, a sweater) would otherwise be one giant section. Cut the biggest pieces in half
     along their longest direction until there are enough pieces to reach the level's target. */
  function splitBig(cc, w, h, want, minPiece) {
    const n = w * h, comp = Int32Array.from(cc.comp), area = cc.area.slice(), members = [];
    for (let i = 0; i < cc.nc; i++) members.push([]);
    for (let p = 0; p < n; p++) members[comp[p]].push(p);
    let count = cc.nc;
    while (count < want) {
      let c = -1, ma = 0;
      for (let i = 0; i < count; i++) if (area[i] > ma) { ma = area[i]; c = i; }
      if (c < 0 || ma < minPiece * 2) break;
      const pts = members[c]; let mx = 0, my = 0;
      for (const p of pts) { mx += p % w; my += Math.floor(p / w); }
      mx /= pts.length; my /= pts.length;
      let sxx = 0, sxy = 0, syy = 0;
      for (const p of pts) { const dx = p % w - mx, dy = Math.floor(p / w) - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
      const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(ang), uy = Math.sin(ang);
      const proj = new Float32Array(pts.length);
      for (let i = 0; i < pts.length; i++) proj[i] = (pts[i] % w - mx) * ux + (Math.floor(pts[i] / w) - my) * uy;
      const med = Float32Array.from(proj).sort()[pts.length >> 1];
      const a = [], b = [];
      for (let i = 0; i < pts.length; i++) (proj[i] < med ? a : b).push(pts[i]);
      if (!a.length || !b.length) { area[c] = 0; continue; }       // cannot split (all identical): skip it
      members[c] = a; area[c] = a.length;
      members.push(b); area.push(b.length);
      for (const p of b) comp[p] = count;
      count++;
    }
    return comp;
  }

  /* Distance (x3) from each pixel to the nearest region border: the best place for a number is the deepest pixel. */
  function borderDistance(labels, w, h) {
    const n = w * h, INF = 1e9, d = new Int32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, l = labels[p];
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || labels[p - 1] !== l || labels[p + 1] !== l || labels[p - w] !== l || labels[p + w] !== l;
      d[p] = edge ? 0 : INF;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x; let v = d[p]; if (!v) continue;
      if (x > 0 && d[p - 1] + 3 < v) v = d[p - 1] + 3;
      if (y > 0) {
        if (d[p - w] + 3 < v) v = d[p - w] + 3;
        if (x > 0 && d[p - w - 1] + 4 < v) v = d[p - w - 1] + 4;
        if (x < w - 1 && d[p - w + 1] + 4 < v) v = d[p - w + 1] + 4;
      }
      d[p] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x; let v = d[p]; if (!v) continue;
      if (x < w - 1 && d[p + 1] + 3 < v) v = d[p + 1] + 3;
      if (y < h - 1) {
        if (d[p + w] + 3 < v) v = d[p + w] + 3;
        if (x < w - 1 && d[p + w + 1] + 4 < v) v = d[p + w + 1] + 4;
        if (x > 0 && d[p + w - 1] + 4 < v) v = d[p + w - 1] + 4;
      }
      d[p] = v;
    }
    return d;
  }

  /* image: { data: RGBA bytes, w, h }.  opts: { regions, colors, seed }.  */
  function build(image, opts) {
    const w = image.w, h = image.h, n = w * h, data = image.data;
    const target = Math.max(4, Math.floor(opts.regions || 60));
    const K = Math.max(3, Math.min(24, Math.floor(opts.colors || 8)));
    const rng = mulberry32(hashStr(String(opts.seed || 'seed') + '|' + K + '|' + target));

    const px = soften(data, w, h);
    const q = quantize(px, n, K, rng);
    let lab = q.lab;
    lab = modeFilter(lab, w, h, q.palette.length);

    const minArea = Math.max(20, Math.floor(n / (target * 8)));
    let cc = components(lab, w, h);
    if (cc.nc < target * 1.5) {
      const split = components(splitBig(cc, w, h, Math.ceil(target * 1.5), minArea), w, h);
      split.pal = split.first.map(p => lab[p]);                     // paint color of each piece = color it was cut from
      cc = split;
    }
    const nc = cc.nc, comp = cc.comp, area = cc.area.slice(), pal = cc.pal;
    const sr = new Float64Array(nc), sg = new Float64Array(nc), sb = new Float64Array(nc);
    for (let p = 0; p < n; p++) { const c = comp[p]; sr[c] += px[p * 3]; sg[c] += px[p * 3 + 1]; sb[c] += px[p * 3 + 2]; }
    const adj = Array.from({ length: nc }, () => new Map());
    const link = (a, b) => { if (a === b) return; adj[a].set(b, (adj[a].get(b) || 0) + 1); adj[b].set(a, (adj[b].get(a) || 0) + 1); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x + 1 < w) link(comp[p], comp[p + 1]);
      if (y + 1 < h) link(comp[p], comp[p + w]);
    }
    const alive = new Uint8Array(nc).fill(1), parent = new Int32Array(nc);
    for (let i = 0; i < nc; i++) parent[i] = i;
    let nAlive = nc;

    function bestNeighbor(a) {
      let tot = 0; for (const c of adj[a].values()) tot += c;
      const ar = area[a], mr = sr[a] / ar, mg = sg[a] / ar, mb = sb[a] / ar;
      let best = -1, bs = Infinity;
      for (const [c, cnt] of adj[a]) {
        const d = cdist(mr, mg, mb, sr[c] / area[c], sg[c] / area[c], sb[c] / area[c]);
        const s = d * (1.6 - cnt / tot);        // prefer a similar color that shares a long border
        if (s < bs) { bs = s; best = c; }
      }
      return best;
    }
    function mergeInto(a, b) {
      for (const [c, cnt] of adj[a]) {
        if (c === b) continue;
        adj[c].delete(a); adj[c].set(b, (adj[c].get(b) || 0) + cnt); adj[b].set(c, (adj[b].get(c) || 0) + cnt);
      }
      adj[b].delete(a); adj[a] = new Map();
      area[b] += area[a]; sr[b] += sr[a]; sg[b] += sg[a]; sb[b] += sb[a];
      alive[a] = 0; parent[a] = b; nAlive--;
    }

    // 1) swallow slivers and specks that would be impossible to tap
    const bySize = Array.from({ length: nc }, (_, i) => i).sort((a, b) => area[a] - area[b]);
    for (const id of bySize) {
      if (nAlive <= target) break;                                  // never merge below the wanted count
      if (!alive[id] || area[id] >= minArea) continue;
      const b = bestNeighbor(id); if (b >= 0) mergeInto(id, b);
    }
    // 2) keep merging the smallest piece until we reach the wanted number of sections
    while (nAlive > target) {
      let a = -1, ma = Infinity;
      for (let i = 0; i < nc; i++) if (alive[i] && area[i] < ma) { ma = area[i]; a = i; }
      const b = a >= 0 ? bestNeighbor(a) : -1;
      if (b < 0) break;
      mergeInto(a, b);
    }

    // relabel to 1..R in reading order
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const idMap = new Int32Array(nc), labels = new Int32Array(n), colorOf = [0];
    let R = 0;
    for (let p = 0; p < n; p++) {
      const r = find(comp[p]);
      if (!idMap[r]) { idMap[r] = ++R; colorOf.push(pal[r]); }
      labels[p] = idMap[r];
    }
    const regionColor = Uint8Array.from(colorOf);

    // per-region pixel lists (counting sort), brightness, number position
    const lum = new Float32Array(n), cntR = new Int32Array(R + 2);
    for (let p = 0; p < n; p++) { lum[p] = 0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2]; cntR[labels[p] + 1]++; }
    const start = new Int32Array(R + 2);
    for (let i = 1; i <= R + 1; i++) start[i] = start[i - 1] + cntR[i];
    // start[id] .. start[id+1] holds region id (ids are 1-based, so shift by one)
    const fill = new Int32Array(R + 2), order = new Int32Array(n);
    for (let p = 0; p < n; p++) { const id = labels[p]; order[start[id] + fill[id]++] = p; }
    const meanLum = new Float32Array(R + 1), areaR = new Int32Array(R + 1);
    for (let id = 1; id <= R; id++) {
      let s = 0; const a = start[id + 1] - start[id];
      for (let k = start[id]; k < start[id + 1]; k++) s += lum[order[k]];
      meanLum[id] = a ? s / a : 0; areaR[id] = a;
    }
    const dist = borderDistance(labels, w, h);
    const cx = new Float32Array(R + 1), cy = new Float32Array(R + 1), cr = new Float32Array(R + 1), bestD = new Int32Array(R + 1).fill(-1);
    for (let p = 0; p < n; p++) {
      const id = labels[p];
      if (dist[p] > bestD[id]) { bestD[id] = dist[p]; cx[id] = p % w; cy[id] = (p - (p % w)) / w; cr[id] = dist[p] / 3; }
    }
    return { w, h, labels, regionCount: R, palette: q.palette, regionColor, start, order, lum, meanLum, area: areaR, cx, cy, cr };
  }

  /* Paint one region into an RGBA buffer. Unpainted = soft colorless ghost of the photo; painted = real color
     with a little of the photo's own light and shade so it reads like a painted portrait of the memory. */
  function fillRegion(eng, id, painted, out) {
    const ml = eng.meanLum[id], col = eng.palette[eng.regionColor[id]];
    for (let k = eng.start[id]; k < eng.start[id + 1]; k++) {
      const p = eng.order[k], o = p * 4, dl = eng.lum[p] - ml;
      if (painted) {
        const grain = ((Math.imul(p, 2654435761) >>> 24) - 128) / 128 * 3, d = dl * 0.55 + grain;
        out[o] = col[0] + d; out[o + 1] = col[1] + d; out[o + 2] = col[2] + d;
      } else {
        const v = 244 - (255 - (ml + dl * 0.7)) * 0.5;
        out[o] = v; out[o + 1] = v; out[o + 2] = v;
      }
      out[o + 3] = 255;
    }
  }

  const api = { build, fillRegion, levelParams, DIFFICULTY, hashStr };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PaintEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
