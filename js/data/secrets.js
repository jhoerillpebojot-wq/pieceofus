/* ======================================================================
   SECRET MESSAGES: hidden notes she discovers while playing. Edit this file to write them.
   All text below is PLACEHOLDER. Replace it with your own words.

   Each secret:
     id       unique and permanent
     title    shown once discovered
     message  the hidden message (backticks allowed, blank line = new paragraph)
     hint     optional nudge shown while it is still hidden ('' = no hint)
     unlock   what discovers it. Same rules as letters (see js/unlocks.js), for example:
                { word: 'HONEY' }            find that word in any Word Search puzzle
                { matchLevel: 5 }            finish Match-3 level 5      { wordLevel: 8 } for Word Search
                { chapter: 'chapter-2' }     open that album chapter
                { collectible: 'home-sparkle' }  tap a hidden sparkle (defined below)
                { stars: 50 }  { levels: 25 }  { secrets: 5 }  ...and more
   She gets a small notification the moment one is found, and can re-read it any time in
   Letters > Secrets. Once found, a secret stays found.

   COLLECTIBLES (hidden sparkles she can tap): a faint little star sitting on a screen.
     screen   'home' | 'play' | 'album' | 'letters' | 'garden' | 'story' | 'settings'
     x, y     position on that screen, as percentages ('80%', '12%')
   ====================================================================== */
(function (root) {
  const CONFIG = {
    secrets: [
      { id: 's-word', title: 'A hidden word', hint: 'Some of the words in the puzzles are worth finding.', unlock: { word: 'HONEY' },
        message: `You found a word I was hoping you would.

Hello again, you.` },
      { id: 's-sparkle', title: 'A tiny sparkle', hint: 'Something small is hiding on the home screen.', unlock: { collectible: 'home-sparkle' },
        message: `You spotted the sparkle.

You notice the little things, and I love that about you.` },
      { id: 's-garden', title: 'Something in the garden', hint: 'Take a look around the Little Garden.', unlock: { collectible: 'garden-sparkle' },
        message: `Another sparkle, tucked away in the garden.

I hope you're taking the time to enjoy the quiet corners of this place.` },
      { id: 's-match', title: 'Sweet streak', hint: 'Keep going with Match-3.', unlock: { matchLevel: 5 },
        message: `Match-3 level five, done.

I hope that felt as satisfying as it looked.` },
      { id: 's-chapter', title: 'A new page', hint: 'A new part of the album might hold something.', unlock: { chapter: 'chapter-2' },
        message: `A new chapter of the album just opened.

Take a look whenever you're ready.` },
      { id: 's-words', title: 'Sharp eyes', hint: '', unlock: { wordLevel: 10 },
        message: `Ten Word Search puzzles finished. Your eyes are sharper than mine.` },
      { id: 's-stars', title: 'So many stars', hint: '', unlock: { stars: 50 },
        message: `Fifty stars collected.

I hope you're proud of yourself. You should be.` },
      { id: 's-five', title: 'Secret finder', hint: '', unlock: { secrets: 5 },
        message: `Five secrets found.

I hid them for you, and you found them anyway.` }
    ],
    collectibles: [
      { id: 'home-sparkle', screen: 'home', x: '84%', y: '12%', label: 'A tiny hidden sparkle' },
      { id: 'garden-sparkle', screen: 'garden', x: '10%', y: '52%', label: 'A tiny hidden sparkle' }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG; else root.SecretsConfig = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
