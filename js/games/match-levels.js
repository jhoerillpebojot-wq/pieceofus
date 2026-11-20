/* Match-3 LEVEL DATA. No game logic here.
   Pieces: 0 strawberry, 1 flower, 2 star, 3 candy, 4 heart, 5 bow  (art lives in match-art.js).
   Objectives:  S(n) reach score n  |  C(piece, n) collect n of a piece  |  J clear all cream tiles.
   Each TABLE row: [moves, pieceTypesInPlay (4-6), [objectives...], creamPattern, creamLayers]
   Cream patterns: bottom, center, half, frame, checker, full. Layers 2 = needs two clears. */
(function (root) {
  const NAMES = ['strawberries', 'flowers', 'stars', 'candies', 'hearts', 'bows'];
  const S = target => ({ type: 'score', target });
  const C = (piece, count) => ({ type: 'collect', piece, count });
  const J = { type: 'jelly' };

  const PATTERNS = {
    bottom:  (R, K) => cells(R, K, (r) => r === R - 1),
    center:  (R, K) => cells(R, K, (r, c) => Math.abs(r - (R - 1) / 2) <= 1.01 && Math.abs(c - (K - 1) / 2) <= 1.01),
    half:    (R, K) => cells(R, K, (r) => r >= Math.floor(R / 2)),
    frame:   (R, K) => cells(R, K, (r, c) => r === 0 || c === 0 || r === R - 1 || c === K - 1),
    checker: (R, K) => cells(R, K, (r, c) => (r + c) % 2 === 0 && r >= 2 && r < R - 2),
    full:    (R, K) => cells(R, K, () => true)
  };
  function cells(R, K, test) {
    const out = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < K; c++) if (test(r, c)) out.push(r * K + c);
    return out;
  }

  const TABLE = [
    [25, 4, [S(600)]], [25, 4, [S(800)]], [24, 4, [S(1000)]], [24, 4, [S(1200)]], [24, 4, [C(0, 12)]],
    [24, 4, [C(1, 14)]], [22, 5, [C(2, 14)]], [22, 5, [S(1500)]], [22, 5, [C(3, 15)]], [22, 5, [C(4, 15), S(1200)]],
    [30, 5, [J], 'bottom'], [22, 5, [S(1800)]], [22, 5, [J], 'center'], [22, 5, [C(1, 18)]], [28, 5, [J], 'checker'],
    [22, 5, [C(0, 16), S(1800)]], [28, 5, [J], 'center'], [22, 5, [C(2, 18)]], [40, 5, [J], 'bottom'], [24, 6, [C(4, 18), S(2000)]],
    [24, 5, [J, C(0, 12)], 'center'], [26, 6, [S(2600)]], [26, 6, [J], 'center', 2], [24, 6, [C(5, 20)]], [38, 6, [J, C(1, 8)], 'center'],
    [26, 6, [S(2700)]], [37, 5, [J], 'bottom'], [24, 6, [C(0, 20), C(2, 20)]], [40, 6, [J, S(2200)], 'center'], [44, 6, [J, C(0, 10), C(3, 10)], 'center'],
    // Levels 31-40: tighter move budgets, cream-clearing boards, and combined objectives.
    [29, 6, [J, C(0, 12)], 'center', 1], [26, 6, [C(1, 21), S(2300)]], [29, 6, [J, C(2, 14)], 'checker', 1],
    [25, 6, [C(3, 21), C(4, 16)]], [31, 6, [J, S(2500)], 'center', 1], [25, 6, [C(5, 21), S(2400)]],
    [30, 6, [J, C(1, 15)], 'center', 1], [24, 6, [C(0, 20), C(2, 20)]], [28, 6, [J, S(2700)], 'center', 1],
    [27, 6, [J, C(3, 17)], 'checker', 1],
    // Levels 41-50: final challenge. Harder combinations, but retrying is always free.
    [28, 6, [J, C(4, 18)], 'center', 1], [27, 6, [C(0, 22), S(2600)]], [28, 6, [J, C(5, 18)], 'center', 1],
    [26, 6, [C(1, 22), C(3, 18)]], [28, 6, [J, S(2900)], 'checker', 1], [26, 6, [J, C(2, 20)], 'center', 1],
    [27, 6, [C(0, 20), C(4, 20), S(2500)]], [27, 6, [J, C(1, 20)], 'center', 1],
    [27, 6, [J, C(3, 20), S(2800)], 'center', 1], [26, 6, [J, C(5, 20), C(2, 17)], 'center', 1]
  ];

  const TIPS = {
    1: 'Swap two neighbors to line up 3 or more of the same piece.',
    2: 'Line up 4 to make a piece that clears a whole row or column.',
    3: 'Line up 5 for a sparkle ball. Swap it with any piece to clear all of that kind.',
    5: 'Goals are shown above the board. Collect what they ask for before the moves run out.',
    11: 'Match pieces sitting on lavender cream tiles to clear them.',
    13: 'An L or T shape makes a ring piece that clears everything around it.'
  };

  // Levels 51-100: rotating multi-objective challenge patterns with fewer moves,
  // layered blockers, larger collection targets, and mixed goals.
  for (let n = 51; n <= 100; n++) {
    const k = n - 51;
    const pieceA = k % 6, pieceB = (k + 3) % 6;
    const pattern = ['checker', 'center', 'bottom'][k % 3];
    const objectives = k % 4 === 0 ? [J, C(pieceA, 13 + (k % 5))]
      : k % 4 === 1 ? [C(pieceA, 15 + (k % 4)), C(pieceB, 12 + (k % 4))]
      : k % 4 === 2 ? [J, S(2600 + (k % 8) * 90)] : [J, C(pieceB, 14 + (k % 4))];
    TABLE.push([36 + (k % 6), 6, objectives, pattern, 1]);
  }

  const levels = TABLE.map((t, i) => {
    const n = i + 1, size = n <= 10 ? 7 : 8;
    return {
      number: n, rows: size, cols: size, moves: t[0], types: t[1], objectives: t[2],
      jelly: t[3] ? PATTERNS[t[3]](size, size) : [], jellyLayers: t[4] || 1,
      tip: TIPS[n] || ''
    };
  });

  function describe(o) {
    if (o.type === 'score') return 'Reach ' + o.target + ' points';
    if (o.type === 'collect') return 'Collect ' + o.count + ' ' + NAMES[o.piece];
    return 'Clear all the cream tiles';
  }

  const data = { NAMES, levels, describe, PATTERNS };
  if (typeof module !== 'undefined' && module.exports) module.exports = data; else root.MatchData = data;
})(typeof window !== 'undefined' ? window : globalThis);
