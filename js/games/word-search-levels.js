/* Word Search LEVEL DATA. No game logic lives here.
   - All words below are generic PLACEHOLDERS. Replace them with your own (A-Z letters only, no spaces).
   - Each level uses its category's pool; the same level always gets the same words.
   - To hand-pick a level's words, add it to OVERRIDES, e.g.  OVERRIDES[3] = ['WORD','ANOTHER'];  */
(function (root) {
  const CATEGORIES = ['Our Nicknames', 'Favorite Things', 'Places', 'Food We Love', 'Special Memories', 'Cute Words', 'Things About Us'];

  const POOLS = {
    'Our Nicknames': ['DARLING', 'HONEY', 'SUNSHINE', 'SWEETIE', 'ANGEL', 'CUTIE', 'PEACHES', 'BUDDY', 'SWEETPEA', 'BUTTON', 'BUBBLES', 'PUMPKIN', 'LOVEBUG', 'SPARROW', 'MOCHI', 'BEAR', 'STAR', 'DEAREST'],
    'Favorite Things': ['MUSIC', 'BOOKS', 'COZY', 'BLANKET', 'FLOWERS', 'MOVIES', 'SUNSET', 'CANDLE', 'PUZZLE', 'RAINBOW', 'STARLIGHT', 'PHOTOS', 'COLORS', 'GAMES', 'SUMMER', 'AUTUMN', 'SWEATER', 'SONGS', 'TEA', 'DRAWING', 'WINDOW'],
    'Places': ['BEACH', 'PARK', 'CAFE', 'CINEMA', 'GARDEN', 'MOUNTAIN', 'LIBRARY', 'HOME', 'LAKE', 'MARKET', 'BRIDGE', 'ISLAND', 'FOREST', 'VILLAGE', 'STATION', 'BALCONY', 'HARBOR', 'MEADOW', 'COTTAGE', 'SQUARE', 'SEASIDE'],
    'Food We Love': ['PIZZA', 'COOKIE', 'NOODLES', 'CAKE', 'PASTA', 'SUSHI', 'CHOCOLATE', 'MANGO', 'ICECREAM', 'WAFFLE', 'TACO', 'SOUP', 'BERRIES', 'DONUT', 'PANCAKE', 'DUMPLING', 'COFFEE', 'CUPCAKE', 'PEACH', 'BREAD', 'SALAD', 'SANDWICH'],
    'Special Memories': ['LAUGHTER', 'ADVENTURE', 'SURPRISE', 'TOGETHER', 'SMILE', 'DANCING', 'PICNIC', 'SUNRISE', 'JOURNEY', 'TRAVEL', 'MOMENT', 'STORY', 'PRESENT', 'EMBRACE', 'CELEBRATE', 'SOUVENIR', 'KEEPSAKE', 'WONDER', 'MEMORY', 'FOREVER', 'SNAPSHOT'],
    'Cute Words': ['FLUFFY', 'BUBBLY', 'SNUGGLE', 'TWINKLE', 'BLOSSOM', 'SPARKLE', 'GIGGLE', 'SWEET', 'PETAL', 'BUNNY', 'CUDDLE', 'WHISKER', 'SNOOZY', 'KITTEN', 'PUPPY', 'BUTTERFLY', 'CLOUDS', 'SPRINKLES', 'DAISY', 'FUZZY', 'PLUSHIE'],
    'Things About Us': ['KIND', 'FUNNY', 'BRAVE', 'GENTLE', 'LOYAL', 'CARING', 'HONEST', 'PLAYFUL', 'WARM', 'CLEVER', 'PATIENT', 'SILLY', 'DREAMER', 'CHEERFUL', 'STRONG', 'CREATIVE', 'GENEROUS', 'CURIOUS', 'LOVING', 'FRIENDLY', 'GRACEFUL', 'SINCERE']
  };

  // Which directions words may run in. E=right W=left S=down N=up, others are diagonals.
  const DIR_SETS = {
    basic: ['E', 'S'],                              // forward only
    back:  ['E', 'S', 'W', 'N'],                    // + backward
    diag:  ['E', 'S', 'W', 'N', 'SE', 'NW'],        // + first diagonals
    all:   ['E', 'S', 'W', 'N', 'SE', 'NW', 'NE', 'SW']
  };

  // One row per level: [gridSize, wordCount, minWordLength, maxWordLength, directionSet]
  // To add a level: add a row here (then see README: also raise LEVEL_COUNT in js/data.js).
  const TABLE = [
    [6, 4, 3, 5, 'diag'], [6, 4, 3, 5, 'diag'], [6, 5, 3, 5, 'diag'], [7, 5, 3, 5, 'back'], [7, 5, 3, 5, 'back'],
    [7, 5, 4, 6, 'diag'], [7, 6, 4, 6, 'diag'], [8, 6, 4, 6, 'diag'], [8, 6, 4, 6, 'diag'], [8, 7, 4, 6, 'diag'],
    [8, 7, 4, 7, 'all'], [8, 7, 4, 7, 'all'], [9, 8, 4, 7, 'all'], [9, 8, 4, 7, 'all'], [9, 8, 4, 8, 'all'],
    [9, 9, 4, 8, 'all'], [10, 9, 4, 8, 'all'], [10, 9, 4, 8, 'all'], [10, 10, 4, 8, 'all'], [10, 10, 4, 8, 'all'],
    [10, 10, 5, 9, 'all'], [10, 10, 5, 9, 'all'], [11, 11, 5, 9, 'all'], [11, 11, 5, 9, 'all'], [11, 12, 5, 9, 'all'],
    [12, 12, 5, 9, 'all'], [12, 12, 5, 9, 'all'], [12, 13, 5, 9, 'all'], [12, 13, 5, 9, 'all'], [12, 14, 5, 9, 'all'],
    // Levels 31-40: larger grids, more words, and longer vocabulary.
    [12, 14, 5, 10, 'all'], [12, 14, 5, 10, 'all'], [13, 14, 5, 10, 'all'], [13, 15, 5, 10, 'all'], [13, 15, 5, 10, 'all'],
    [13, 15, 5, 11, 'all'], [13, 16, 5, 11, 'all'], [13, 16, 5, 11, 'all'], [14, 16, 5, 11, 'all'], [14, 16, 5, 11, 'all'],
    // Levels 41-50: the final stretch. More words and less obvious short entries.
    [14, 17, 6, 11, 'all'], [14, 17, 6, 11, 'all'], [14, 17, 6, 12, 'all'], [14, 18, 6, 12, 'all'], [14, 18, 6, 12, 'all'],
    [14, 18, 6, 12, 'all'], [14, 18, 6, 12, 'all'], [14, 18, 6, 12, 'all'], [14, 18, 6, 12, 'all'], [14, 18, 6, 12, 'all']
  ];

  const OVERRIDES = {};

  // Levels 51-100: advanced boards. All eight directions are enabled, including
  // diagonal and backwards placements; denser grids and longer word lists raise the challenge.
  for (let n = 51; n <= 100; n++) {
    const size = n < 61 ? 12 : n < 76 ? 13 : 14;
    const count = n < 61 ? 15 + (n % 3) : n < 76 ? 17 + (n % 3) : 19 + (n % 3);
    const min = n < 61 ? 5 : n < 76 ? 6 : 6;
    TABLE.push([size, count, min, 12, 'all']);
  }

  const levels = TABLE.map((t, i) => ({
    number: i + 1,
    category: CATEGORIES[i % CATEGORIES.length],
    size: t[0], count: t[1], minLen: t[2], maxLen: t[3],
    dirs: DIR_SETS[t[4]]
  }));

  const data = { categories: CATEGORIES, pools: POOLS, levels, overrides: OVERRIDES };
  if (typeof module !== 'undefined' && module.exports) module.exports = data; else root.WordSearchData = data;
})(typeof window !== 'undefined' ? window : globalThis);
