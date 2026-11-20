/* Static content definitions. Replace placeholder text/art with real content in later stages. */
(function () {
  const LEVEL_COUNT = 100;

  const levels = Array.from({ length: LEVEL_COUNT }, (_, i) => {
    const n = i + 1;
    return {
      id: 'L' + n,
      number: n,
      garden: n % 2 === 1 ? 'G' + (n + 1) / 2 : null    // odd levels grow a garden item
    };
  });

  const MATCH_LEVEL_COUNT = 100;
  const matchLevels = Array.from({ length: MATCH_LEVEL_COUNT }, (_, i) => {
    const n = i + 1;
    return { id: 'L' + n, number: n };
  });

  const PAINT_LEVEL_COUNT = 100;
  const paintLevels = Array.from({ length: PAINT_LEVEL_COUNT }, (_, i) => ({ id: 'L' + (i + 1), number: i + 1 }));

  /* Three-game journey: Word Search, Match-3, then a detailed coloring challenge. */
  const journey = [];
  for (let i = 0; i < Math.max(levels.length, matchLevels.length, paintLevels.length); i++) {
    if (levels[i]) journey.push({ game: 'word', number: levels[i].number });
    if (matchLevels[i]) journey.push({ game: 'match', number: matchLevels[i].number });
    if (paintLevels[i]) journey.push({ game: 'paint', number: paintLevels[i].number });
  }

  const gardenItems = [
    ['Tulip', '🌷'], ['Cherry blossom', '🌸'], ['Daisy', '🌼'], ['Sunflower', '🌻'],
    ['Lavender', '🪻'], ['Fern', '🌿'], ['Mushroom', '🍄'], ['Butterfly', '🦋'],
    ['Bee', '🐝'], ['Ladybug', '🐞'], ['Rainbow', '🌈'], ['Potted plant', '🪴'],
    ['Rose', '🌹'], ['Hibiscus', '🌺'], ['Bouquet', '💐']
  ].map(([name, icon], i) => ({ id: 'G' + (i + 1), name, icon }));

  window.GameData = {
    version: '0.9.0',
    maxStarsPerLevel: 3,
    levels, matchLevels, paintLevels, journey, gardenItems,
    maxStars: (LEVEL_COUNT + MATCH_LEVEL_COUNT + PAINT_LEVEL_COUNT) * 3
  };
})();
