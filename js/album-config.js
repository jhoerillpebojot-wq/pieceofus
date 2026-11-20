/* Our Little Album: photo memories and unlock schedule. IDs are permanent; keep them stable after release. */
(function (root) {
  const CONFIG = {
  "settings": {
    "progressCounts": "total",
    "allowPhotoImport": true,
    "thumbFit": "contain",
    "showLockedTitles": false
  },
  "cover": {
    "title": "Our Little Album",
    "subtitle": "a little piece of us"
  },
  "completionMessage": "You found every memory in this chapter. Take a moment to enjoy them all.",
  "chapters": [
    {
      "id": "chapter-1",
      "folder": "chapter-1",
      "title": "Our Beginning",
      "unlockAt": 0,
      "blurb": "A collection of early snapshots and the moments that started it all.",
      "completionMessage": "",
      "memories": [
        {
          "id": "c1m1",
          "unlockAt": 3,
          "title": "The First Photo Together",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "first-meet-couple-photo.jpg"
        },
        {
          "id": "c1m2",
          "unlockAt": 5,
          "title": "A First Day",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "first-meet-her-photo.jpg"
        },
        {
          "id": "c1m3",
          "unlockAt": 8,
          "title": "A Favorite Snapshot",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "her-first-photo-in-gallery.jpg"
        },
        {
          "id": "c1m4",
          "unlockAt": 15,
          "title": "Ready for the Ride",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "her-helmet-selfie-01.jpg"
        },
        {
          "id": "c1m5",
          "unlockAt": 18,
          "title": "A Beautiful Portrait",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "her-portrait-01.jpg"
        }
      ]
    },
    {
      "id": "chapter-2",
      "folder": "chapter-2",
      "title": "Little Moments",
      "unlockAt": 10,
      "blurb": "Everyday smiles, silly faces, and little moments worth keeping.",
      "completionMessage": "",
      "memories": [
        {
          "id": "c2m1",
          "unlockAt": 10,
          "title": "A Close-Up Moment",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "close-up-couple-selfie-01.jpg"
        },
        {
          "id": "c2m2",
          "unlockAt": 13,
          "title": "A Moment with Our Cat",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "couple-and-cat-selfie-01.jpg"
        },
        {
          "id": "c2m5",
          "unlockAt": 18,
          "title": "Another Moment with Our Cat",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "couple-and-cat-selfie-02.jpg"
        },
        {
          "id": "c2m6",
          "unlockAt": 24,
          "title": "One More Cat Moment",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "couple-and-cat-selfie-03.jpg"
        },
        {
          "id": "c2m3",
          "unlockAt": 18,
          "title": "A Silly Selfie",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "couple-funny-selfie-01.jpg"
        },
        {
          "id": "c2m7",
          "unlockAt": 28,
          "title": "A Funny Little Moment",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "couple-funny-selfie-02.jpg"
        },
        {
          "id": "c2m8",
          "unlockAt": 30,
          "title": "A Playful Snapshot",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "couple-funny-selfie-03.jpg"
        },
        {
          "id": "c2m4",
          "unlockAt": 24,
          "title": "A Cozy Moment",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "couple-lying-down-selfie-01.jpg"
        },
        {
          "id": "c2m9",
          "unlockAt": 34,
          "title": "A Bright Smile",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "couple-smiling-selfie-01.jpg"
        }
      ]
    },
    {
      "id": "chapter-3",
      "folder": "chapter-3",
      "title": "Our Adventures",
      "unlockAt": 20,
      "blurb": "Days out, favorite stops, shared treats, and small adventures.",
      "completionMessage": "",
      "memories": [
        {
          "id": "c3m1",
          "unlockAt": 20,
          "title": "An Arcade Day",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "couple-at-arcade-01.jpg"
        },
        {
          "id": "c3m2",
          "unlockAt": 25,
          "title": "A Day at the Mall",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "couple-at-mall-selfie-01.jpg"
        },
        {
          "id": "c3m3",
          "unlockAt": 35,
          "title": "A Food Date",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "jollibee-date-photo.jpg"
        },
        {
          "id": "c3m5",
          "unlockAt": 40,
          "title": "A Shared Meal",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "jollibee-meal-memory-01.jpg"
        },
        {
          "id": "c3m6",
          "unlockAt": 42,
          "title": "A Casual Food Stop",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "mcdonalds-date-photo.jpg"
        },
        {
          "id": "c3m4",
          "unlockAt": 40,
          "title": "An Evening Out",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "night-market-couple-photo-01.jpg"
        },
        {
          "id": "c3m7",
          "unlockAt": 46,
          "title": "Another Night Market Moment",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "night-market-couple-photo-02.jpg"
        },
        {
          "id": "c3m8",
          "unlockAt": 48,
          "title": "A Little Treat",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "night-market-food-memory.jpg"
        },
        {
          "id": "c3m9",
          "unlockAt": 49,
          "title": "Drinks by the Seawall",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "panabo-seawall-drinks-memory.jpg"
        }
      ]
    },
    {
      "id": "chapter-4",
      "folder": "chapter-4",
      "title": "My Favorite Person",
      "unlockAt": 40,
      "blurb": "Colorful snapshots, thoughtful details, and moments to look back on.",
      "completionMessage": "",
      "memories": [
        {
          "id": "c4m1",
          "unlockAt": 40,
          "title": "A Colorful Studio Moment",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "colorful-studio-couple-photo-01.jpg"
        },
        {
          "id": "c4m2",
          "unlockAt": 42,
          "title": "Matching Hats",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "matching-hats-photo-01.jpg"
        },
        {
          "id": "c4m3",
          "unlockAt": 45,
          "title": "Flowers and Smiles",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "pink-studio-flower-photo-01.jpg"
        },
        {
          "id": "c4m4",
          "unlockAt": 48,
          "title": "A Warm Hug",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "pink-studio-hug-photo-01.jpg"
        },
        {
          "id": "c4m5",
          "unlockAt": 49,
          "title": "A Pink Studio Snapshot",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "pink-studio-photo-01.jpg"
        }
      ]
    },
    {
      "id": "chapter-5",
      "folder": "chapter-5",
      "title": "Memories I Treasure",
      "unlockAt": 50,
      "blurb": "Candid photos and familiar moments that feel like home.",
      "completionMessage": "",
      "memories": [
        {
          "id": "c5m2",
          "unlockAt": 52,
          "title": "A Mirror Snapshot",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "couple-mirror-photo-01.jpg"
        },
        {
          "id": "c5m5",
          "unlockAt": 52,
          "title": "Another Mirror Snapshot",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "couple-mirror-photo-02.jpg"
        },
        {
          "id": "c5m3",
          "unlockAt": 54,
          "title": "A Snapshot on the Go",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "couple-photo-in-car-01.jpg"
        },
        {
          "id": "c5m1",
          "unlockAt": 50,
          "title": "A Quick Selfie",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "couple-selfie-02.jpg"
        },
        {
          "id": "c5m6",
          "unlockAt": 57,
          "title": "A Candid Selfie",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "couple-selfie-03.jpg"
        },
        {
          "id": "c5m7",
          "unlockAt": 58,
          "title": "A Playful Selfie",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "couple-selfie-04.jpg"
        },
        {
          "id": "c5m4",
          "unlockAt": 56,
          "title": "A Small Detail",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "hands-and-ring-detail-01.jpg"
        },
        {
          "id": "c5m8",
          "unlockAt": 60,
          "title": "An Evening Selfie",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "nighttime-couple-selfie-01.jpg"
        }
      ]
    },
    {
      "id": "chapter-6",
      "folder": "chapter-6",
      "title": "More Memories to Come",
      "unlockAt": 58,
      "blurb": "A few saved snapshots, with plenty of room for new memories.",
      "completionMessage": "",
      "memories": [
        {
          "id": "c6m1",
          "unlockAt": 58,
          "title": "A Saved Moment",
          "date": "",
          "description": "A little moment worth keeping, just as it was.",
          "message": "",
          "photo": "couple-photo-screenshot-01.jpg"
        },
        {
          "id": "c6m2",
          "unlockAt": 60,
          "title": "A Screenshot to Keep",
          "date": "",
          "description": "One more snapshot to look back on and smile.",
          "message": "",
          "photo": "couple-photo-screenshot-02.jpg"
        },
        {
          "id": "c6m3",
          "unlockAt": 60,
          "title": "Another Moment to Keep",
          "date": "",
          "description": "A simple reminder of time spent together.",
          "message": "",
          "photo": "couple-photo-screenshot-03.jpg"
        }
      ]
    },
    {
      "id": "special",
      "folder": "special",
      "title": "A Special Collection",
      "unlockAt": 30,
      "special": true,
      "blurb": "A small bonus collection of favorite snapshots.",
      "completionMessage": "",
      "memories": [
        {
          "id": "sp1",
          "unlockAt": 30,
          "title": "A Little Extra",
          "date": "",
          "description": "A favorite snapshot, saved here as a little bonus.",
          "message": "",
          "photo": "assets/memories/chapter-1/first-meet-her-photo.jpg"
        },
        {
          "id": "sp2",
          "unlockAt": 32,
          "title": "One to Remember",
          "date": "",
          "description": "A small detail that makes this collection feel special.",
          "message": "",
          "photo": "assets/memories/chapter-4/pink-studio-photo-01.jpg"
        },
        {
          "id": "sp3",
          "unlockAt": 34,
          "title": "A Favorite Detail",
          "date": "",
          "description": "Another moment worth keeping close.",
          "message": "",
          "photo": "assets/memories/chapter-5/hands-and-ring-detail-01.jpg"
        }
      ]
    }
  ]
};

  /* A bare filename belongs to the current chapter; assets/... paths are already complete. */
  CONFIG.photoPath = function (ch, m) {
    const p = String(m.photo || '').trim();
    if (!p || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(p)) return '';
    if (p.startsWith('assets/')) return p;
    if (p.includes('/')) return 'assets/memories/' + p;
    return 'assets/memories/' + (ch.folder || ch.id) + '/' + p;
  };
  CONFIG.allPhotoPaths = function () {
    return CONFIG.chapters.flatMap(ch => ch.memories.map(m => CONFIG.photoPath(ch, m))).filter(Boolean);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG; else root.AlbumConfig = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
