/* ======================================================================
   LETTERS FROM ME: edit this file to write her letters. No other file needs to change.
   Everything below is PLACEHOLDER text. Replace it with your own words.

   Each letter:
     id       unique and permanent (never change it after she has started playing)
     title    shown on the envelope once it is open
     preview  one short line shown under the title
     body     the full letter. Put it between backticks ` ` and use blank lines between paragraphs
     date     optional, any text you like ('March 2025'), or '' to hide it
     chapter  optional, the id of an album chapter ('chapter-1'). Shows a small "from the chapter" tag
     unlock   when it opens. Leave it null for "open from the start".
              Examples: { levels: 10 }   { stars: 40 }   { chapter: 'chapter-2' }   { secret: 's-heart' }
              (see the list of rules at the top of js/unlocks.js). Several rules together all have to be met.
   To add a letter, copy a block, give it a new id, and put it where you want it in the list.
   ====================================================================== */
(function (root) {
  const CONFIG = {
    settings: {
      showLockedTitles: false,   // true = locked envelopes show their real titles
      signoff: ''                // optional line at the bottom of every letter, e.g. 'Always yours'
    },
    letters: [
      { id: 'l-hello', title: 'A little hello', preview: 'For whenever you open this.', date: '', chapter: '', unlock: null,
        body: `Hi, you.

I made this little place for you, and I hope it feels like a quiet corner you can come back to whenever you like.

There's no rush here and nothing you have to get right. Play, rest, and read whenever you want.` },
      { id: 'l-beside', title: 'Right beside you', preview: 'Something for a quiet moment.', date: '', chapter: '', unlock: { levels: 3 },
        body: `I wish I could be there beside you right now.

Since I can't be, I hope this letter keeps you company for a little while.

Take a breath, get comfortable, and know you're on my mind.` },
      { id: 'l-time', title: 'Take your time', preview: 'You never have to hurry.', date: '', chapter: '', unlock: { levels: 6 },
        body: `Take your time. You don't have to rush anything.

Not the puzzles, not the days, not the things you're still figuring out.

I'll be here, cheering you on at whatever pace feels right.` },
      { id: 'l-apart', title: 'Even when we are apart', preview: 'A thought for the in-between days.', date: '', chapter: 'chapter-2', unlock: { chapter: 'chapter-2' },
        body: `Even when we're apart, you're still someone I think about every day.

Distance changes a lot of things, but not that.

Whenever the day feels long, I hope you remember someone is thinking of you.` },
      { id: 'l-reminder', title: 'A little reminder', preview: 'Just in case you needed to hear it.', date: '', chapter: '', unlock: { stars: 20 },
        body: `Here's a little reminder that you're loved.

On the easy days and on the harder ones.

You don't have to earn it or prove anything. It's simply true.` },
      { id: 'l-found', title: 'You found it', preview: 'A letter for a secret finder.', date: '', chapter: '', unlock: { secret: 's-sparkle' },
        body: `You found the sparkle I hid. I hoped you would.

Thank you for looking closely, and for being someone who notices the small things.

I hope this made you smile.` },
      { id: 'l-quiet', title: 'On a quiet day', preview: 'For when things feel slow.', date: '', chapter: '', unlock: { levels: 15 },
        body: `If today is a quiet one, that's okay.

You're allowed to have slow days. You're allowed to rest.

Put the kettle on, or the music, or nothing at all, and just be for a while.` },
      { id: 'l-words', title: 'Hidden in the words', preview: 'For a good word hunter.', date: '', chapter: '', unlock: { wordLevel: 10 },
        body: `Ten Word Search puzzles in, and you're still finding every word.

I hope the little hunt gave you a calm moment today.

I'm glad you're here.` },
      { id: 'l-sweet', title: 'A little sweetness', preview: 'For a good match-maker.', date: '', chapter: '', unlock: { matchLevel: 10 },
        body: `Ten Match-3 levels done. I hope those little candies and flowers made your day a bit brighter.

Whatever else is going on, I hope you get to enjoy small, sweet things like this.` },
      { id: 'l-whenever', title: 'Whenever you need it', preview: 'To keep for later.', date: '', chapter: '', unlock: { levels: 30 },
        body: `This one is for whenever you need it.

Open it on a tired day, a loud day, or a day you just miss me.

You're doing better than you think, and I'm proud of you.` }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG; else root.LettersConfig = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
