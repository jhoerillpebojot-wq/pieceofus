/* ======================================================================
   LITTLE GARDEN: edit this file to customise the garden. No game code needs to change.

   SIGN   Words on the little garden sign. Leave them empty and it simply says "Our little garden".
          names    the line she sees big on the sign, e.g. your nicknames (max ~24 letters)
          top      small line above (optional)      bottom   small line below (optional)

   REWARDS  Each reward is given once, the first time its rule is met, and is kept forever.
          when   an unlock rule (same format as letters, see js/unlocks.js). Extra rules for the garden:
                   { blooms: 5 }  five flowers fully grown     { garden: 3 }  three flowers planted
          give   { seed: { tulip: 1 } }  and/or  { decor: { bench: 1 } }
   AREAS  unlock rule + how many plots/spots. Plots hold flowers, spots hold decorations (x, y in %).
   Seeds: tulip, rose, daisy, sunflower, lavender.
   Decorations: stone, fence, bush, tree, bench, pond, lantern, birdbath, mushroom, arch.
   Never change an id after she has started playing. Bump VERSION in sw.js after editing.
   ====================================================================== */
(function (root) {
  const P = [[28, 62], [52, 62], [76, 62], [52, 80], [28, 80], [76, 80]];
  const S = [[91, 52], [8, 88], [92, 88], [30, 91], [70, 91], [7, 68]];
  const CONFIG = {
    sign: { top: '', names: '', bottom: '' },
    flowers: [
      { id: 'tulip', name: 'Pink tulip' }, { id: 'daisy', name: 'Daisy' }, { id: 'rose', name: 'Rose' },
      { id: 'sunflower', name: 'Sunflower' }, { id: 'lavender', name: 'Lavender' }
    ],
    decor: [
      { id: 'stone', name: 'Garden stones' }, { id: 'fence', name: 'Little fence' }, { id: 'bush', name: 'Round bush' },
      { id: 'tree', name: 'Blossom tree' }, { id: 'bench', name: 'Small bench' }, { id: 'pond', name: 'Tiny pond' },
      { id: 'lantern', name: 'Lantern' }, { id: 'birdbath', name: 'Bird bath' }, { id: 'mushroom', name: 'Mushrooms' }, { id: 'arch', name: 'Rose arch' }
    ],
    areas: [
      { id: 'beginning', title: 'Beginning Garden', blurb: 'A quiet little patch to start with.', theme: 'dawn', unlock: null, plots: P.slice(0, 4), spots: S },
      { id: 'flower', title: 'Flower Garden', blurb: 'More room for flowers.', theme: 'bloom', unlock: { levels: 10 }, plots: P, spots: S },
      { id: 'butterfly', title: 'Butterfly Garden', blurb: 'Butterflies drift through here.', theme: 'butterfly', unlock: { levels: 20, blooms: 3 }, plots: P, spots: S },
      { id: 'secret', title: 'Secret Garden', blurb: 'A hidden corner, just for you.', theme: 'secret', unlock: { secrets: 3, blooms: 6 }, plots: P, spots: S }
    ],
    rewards: []
  };
  const R = CONFIG.rewards;
  // Word Search: every level gives a seed (tulip, daisy, tulip, daisy...)
  for (let n = 1; n <= 100; n++) R.push({ id: 'w-L' + n, when: { wordLevel: n }, give: { seed: { [n % 2 ? 'tulip' : 'daisy']: 1 } } });
  // Match-3: every level gives a decoration
  (() => { const decor = 'stone fence bush fence stone bench bush tree fence stone bush stone pond fence tree bush mushroom bush stone bench fence tree stone bush fence pond tree stone bush bench'.split(' ');
    for (let n = 1; n <= 100; n++) { const d = decor[(n - 1) % decor.length]; R.push({ id: 'm-L' + n, when: { matchLevel: n }, give: { decor: { [d]: 1 } } }); }
  })();
  // Achievements: rare flowers
  R.push({ id: 'a-rose', when: { levels: 12 }, give: { seed: { rose: 2 } } },
         { id: 'a-sunflower', when: { stars: 45 }, give: { seed: { sunflower: 2 } } },
         { id: 'a-lavender', when: { memories: 8 }, give: { seed: { lavender: 2 } } },
         { id: 'a-bloom', when: { blooms: 3 }, give: { decor: { bench: 1 } } });
  // Secrets: special decorations
  R.push({ id: 'x-word', when: { secret: 's-word' }, give: { decor: { lantern: 1 } } },
         { id: 'x-sparkle', when: { secret: 's-sparkle' }, give: { decor: { birdbath: 1 } } },
         { id: 'x-garden', when: { secret: 's-garden' }, give: { decor: { mushroom: 1 } } },
         { id: 'x-five', when: { secrets: 5 }, give: { decor: { arch: 1 } } });
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG; else root.GardenConfig = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
