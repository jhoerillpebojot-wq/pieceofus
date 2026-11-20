/* OUR STORY: a short, general-purpose story book. Personal details can be added later. */
(function (root) {
  const CONFIG = {
    cover: { title: 'Our Story', subtitle: 'a little book, one chapter at a time' },
    chapters: [
      { id: 'st-1', title: 'How It Started', unlock: null,
        pages: [
          `Every story begins somewhere. Sometimes it starts with a hello, a small conversation, or an ordinary day that becomes important later.`,
          `Looking back, it is often the little details that stay with us: the first smiles, the unexpected laughs, and the moments that made a day feel different.`,
          `This is the first page of a story that keeps growing, one memory at a time.`
        ] },
      { id: 'st-2', title: 'The Little Things', unlock: { levels: 8 },
        pages: [
          `Not every favorite memory has to be a big adventure. Some of the best ones are simple, familiar, and easy to overlook while they are happening.`,
          `A shared laugh, a favorite place, a silly picture, or a quiet moment can become something worth remembering.`,
          `The little things have a way of becoming the things we miss and treasure most.`
        ] },
      { id: 'st-3', title: 'My Favorite Memories', unlock: { levels: 16 },
        pages: [
          `Photos keep a moment still, even while everything around it keeps moving. Each one holds a small piece of a day that once passed by.`,
          `Some pictures make us laugh. Others bring back a feeling before we can even remember the details.`,
          `These pages are a place to revisit those moments whenever you feel like looking back.`
        ] },
      { id: 'st-4', title: 'Things I Want Us to Experience', unlock: { levels: 28 },
        pages: [
          `There are still places to see, food to try, and new memories waiting to happen. There is no need to plan every detail right now.`,
          `The best part is having more little experiences ahead: familiar days, unexpected detours, and stories that have not been told yet.`,
          `May there always be something new to look forward to.`
        ] },
      { id: 'st-5', title: 'Our Next Chapter', unlock: { levels: 45 },
        pages: [
          `A story does not end just because one chapter is finished. There is always room for another page, another photograph, and another reason to smile.`,
          `Whatever the next days bring, I hope they leave us with more moments worth keeping and more memories to look back on.`,
          { title: 'To be continued', text: `The next chapter is still being written. There is so much more ahead.` }
        ] }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG; else root.StoryConfig = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
