# A Little Piece of Us

An offline-first PWA gift. Vanilla HTML/CSS/JS, no frameworks, no CDNs, no network calls.

## Run it
Service workers need `http://localhost` or HTTPS (opening index.html directly works for a quick look, but without offline install).

    cd A-Little-Piece-of-Us
    python3 -m http.server 8080
    # open http://localhost:8080

## Put it on her phone
1. Host the folder on any free static host (Netlify Drop, GitHub Pages, Cloudflare Pages).
2. Open the link once on her phone while online so everything caches.
3. iPhone (Safari): Share > Add to Home Screen. Android (Chrome): menu > Install app.
4. After that it works with no internet.

## Updating later
Change files, then bump `VERSION` in `sw.js` so phones fetch the new files.
Saved progress lives in localStorage and is never touched by updates.

## Structure
- `js/data.js` content definitions (levels). Garden content lives in `js/data/garden.js` (Stage 6).
- `js/storage.js` the only place that reads/writes saves (`SaveStore`).
- `js/navigation.js` screen routing. `js/app.js` rendering and wiring.
- `css/` theme and tokens (style), UI parts (components), breakpoints (responsive).

## Content notes
- The album includes all 39 distinct bundled photos, with general titles and descriptions. The two exact duplicate image files are kept in the project but not displayed twice. The three bonus memories reuse selected photos from the main chapters.
- Letters, secrets, and story pages use general sample wording and can be personalized later. Garden items use built-in emoji artwork.
- `assets/images` and `assets/sounds` are currently empty; sound effects are generated in code for now.
- IndexedDB is used for optional photos imported from the phone; it is separate from the progress backup.

## The play path (three games in one journey)
The Play screen is ONE path of 300 steps that cycles through three games: Word Search 1, Match-3 1, Painting 1, then Word Search 2, Match-3 2, Painting 2, and so on. Each step opens after the one before it. Pink steps are Word Search, purple steps are Match-3, and the third color marks Painting (each has a small badge). "Next level" on a finished puzzle goes to the next step on the path, whichever game it is. The order is built in `js/data.js` (`journey`), so matching levels from all three games are added automatically. Saves and backups are unchanged (stars are still stored per game), so earlier progress carries over. Test: `node tests/journey.test.js`, `python3 tests/journey-ui.py`.

## Stage 2: Word Search
- `js/games/word-search.js` engine and game screen. `js/games/word-search-levels.js` level data and word lists.
- Change words: edit `POOLS` in the levels file (A-Z letters only), or set `OVERRIDES[levelNumber] = [...]` for one level.
- Add a level: add a row to `TABLE` in the levels file, raise `LEVEL_COUNT` in `js/data.js`, then bump `VERSION` in `sw.js`. Update progression rewards only if you want additional rewards for the new levels.
- Stars: 3 with no hints, 2 with 1-2 hints, 1 with 3+. Time and wrong guesses never matter. Best stars are kept on replay.
- Tests: `node tests/word-search.test.js`

## Stage 3: Match-3
- `js/games/match-three.js` engine (swaps, matches, gravity, cascades, specials, objectives, win/lose) and game screen.
- `js/games/match-levels.js` the 100 levels. `js/games/match-art.js` the piece drawings (inline SVG, no image files).
- Specials: 4 in a line = row/column piece, L or T = ring piece (3x3), 5 in a line = sparkle ball (swap it with any piece to clear all of that kind).
- Stars: 3 with 35%+ of the moves left, 2 with 15%+, otherwise 1. Failing costs nothing; "Try again" restarts instantly.
- Album memories unlock from combined completed-level progress, configured in `js/album-config.js`. Stars from the games add up toward letters.
- Add a level: add a row to `TABLE` in match-levels.js, raise `MATCH_LEVEL_COUNT` in js/data.js (keep it even), bump `VERSION` in sw.js.
- Change an objective: edit the row, e.g. `[22, 5, [C(1, 18), S(1800)]]` = 22 moves, 5 piece types, collect 18 flowers and reach 1800 points.
- Change artwork: edit the SVG strings in match-art.js (and the matching name in `NAMES` in match-levels.js).
- Tests: `node tests/match-three.test.js`, `node tests/word-search.test.js`, difficulty bot `node tests/match-balance.js`, browser touch test `python3 tests/ui-smoke.py` (needs Playwright).

## Stage 4: Our Little Album (the scrapbook)
Everything personal lives in ONE file: `js/album-config.js`. You never need to touch the game code.

### Where to put photographs
    assets/memories/chapter-1/   Our Beginning          assets/memories/chapter-4/   My Favorite Person
    assets/memories/chapter-2/   Little Moments         assets/memories/chapter-5/   Memories I Treasure
    assets/memories/chapter-3/   Our Adventures         assets/memories/chapter-6/   More Memories to Come
    assets/memories/special/     A Special Collection (opens at 30 completed levels)
1. Copy a `.jpg`, `.jpeg`, `.png` or `.webp` into the chapter's folder (simple names like `beach-day.jpg`).
2. In `js/album-config.js`, find the memory and set `photo: 'beach-day.jpg'`.
3. Bump `VERSION` in `sw.js` whenever bundled photos or app files change so installed devices download the updates. Photos are cached for offline use automatically.
Photos are never stretched or cropped in the viewer; thumbnails show the whole photo (set `thumbFit: 'cover'` to fill the frame instead).

### Editing a memory
Each memory is an object with `id`, `unlockAt`, `title`, `date`, `description`, `message`, and `photo` fields.
`date` and `message` are optional (leave `''` to hide them). The included titles and descriptions are general sample copy.

### Adding memories or chapters
- New memory: copy a line inside a chapter's `memories: [ ... ]`, give it a NEW unique `id`, set `unlockAt`.
- New chapter: copy a whole chapter block, give it a new `id`, `title`, `folder` and `unlockAt`, and create `assets/memories/<folder>/`.
- Never change an `id` after she has played; ids are how unlocks are remembered.

### Unlock rules (configurable, progression only, never daily logins)
- `unlockAt` = number of completed levels. Chapters have it too; a memory never opens before its chapter.
- `settings.progressCounts`: `'total'` (Word Search + Match-3 levels together, default), `'word'`, or `'match'`.
- The first memories open at 3 and 5 completed levels; chapter 2 opens at 10, chapter 3 at 20, the special collection at 30, and chapters 4-6 at 40/50/58. All main album photos are unlocked by 60 completed levels in total.
- Unlocked memories stay unlocked forever, even after "Start over".
- Finishing every memory in a chapter shows a special completion screen (once per chapter).

### Optional: photos from her phone
In the viewer, "Add a photo from this device" lets her add or replace a photo (stored in IndexedDB, never localStorage). Turn it off with `allowPhotoImport: false`.

### Tests
`node tests/album.test.js` (unlock rules, saving) and `python3 tests/album-ui.py` (real browser: navigation, photos, locks, persistence, offline, small phones).

## Stage 5: Letters, Secret Messages and Our Story
You write all of this in three plain files under `js/data/` (no game code to touch):

| File | What it holds |
|---|---|
| `js/data/letters.js` | the letters she can open (title, preview, full message, optional date / album chapter, unlock rule) |
| `js/data/secrets.js` | hidden messages she discovers, plus the hidden sparkles she can tap |
| `js/data/story.js` | the chapters and pages of "Our Story" |

Each file starts with a short guide. The included letters and story pages use general sample wording. Personalize them whenever you like, then bump `VERSION` in `sw.js` so installed phones fetch the changes.

### Unlock rules (the same for letters, secrets and story chapters)
Write `unlock: { ... }` on any item (or `null` for "open from the start"). Everything listed must be true.

    { levels: 10 }                 complete 10 levels (Word Search + Match-3 together)
    { wordLevels: 5 } / { matchLevels: 5 }   complete 5 levels of one game
    { wordLevel: 7 } / { matchLevel: 7 }     finish that exact level
    { stars: 40 }                  collect 40 stars
    { chapter: 'chapter-2' }       an album chapter is open        { memory: 'c1m1' }  an album memory is unlocked
    { word: 'HONEY' }              she found that word in a Word Search puzzle
    { collectible: 'home-sparkle' }  she tapped that hidden sparkle
    { secret: 's-word' } / { secrets: 3 }    discovered that secret / three secrets
    { letter: 'l-hello' } / { garden: 5 }    another letter is open / garden items grown
    { levels: 10, stars: 30 }      several rules together: all must be met

Once something unlocks it stays unlocked forever, even after "Start over". She never has to replay a level to re-read a letter.

### Secrets
- Triggers: finding a word, finishing a Match-3 or Word Search level, opening an album chapter, tapping a hidden sparkle, collecting stars, and more.
- She gets a small notice at the top of the screen when one is found, and can reread every secret in **Letters > Secrets**.
- Hidden sparkles are faint little stars placed on a screen. Move or add them in `collectibles` in `js/data/secrets.js` (`screen`, `x`, `y`).
- The first placeholder secret is triggered by the word HONEY, which is in Word Search level 1. Your Word Search words are placeholders too, so when you change the word lists in `js/games/word-search-levels.js`, change the `word:` triggers here to match words that really appear in your puzzles.

### Our Story
Each chapter is a list of pages. She turns pages with the arrow buttons or by swiping, the book remembers her page, and the last page offers "Next chapter". The Story tab sits in the bottom bar and on the home screen.

### Tests
`node tests/stage5.test.js` (rules, config checks, saving) and `python3 tests/stage5-ui.py` (real browser: letters, secrets, story, phone layout, offline).

## Stage 6: Little Garden
Edit **`js/data/garden.js`** (no game code to touch). After changes, bump `VERSION` in `sw.js`.

- **Sign:** set `sign.names` (and optionally `top` / `bottom`). Empty = it just says "Our little garden". Nothing is assumed.
- **Earning:** Word Search levels give seeds, Match-3 levels give decorations, achievements give rare flowers (rose at 12 levels, sunflower at 45 stars, lavender at 8 album memories), secrets give special decorations. Each reward is one line in `rewards` (`when` = the same unlock rules as letters, plus `blooms: N` and `garden: N`; `give` = `{ seed: {...} }` and/or `{ decor: {...} }`). Each is given once and kept forever.
- **Areas:** Beginning (open), Flower (10 levels), Butterfly (20 levels + 3 flowers in bloom), Secret (3 secrets + 6 in bloom). Edit `unlock`, and the `plots` / `spots` positions (x, y in %) of each area.
- **Growing (no timers):** a flower starts as a seed and grows seed, sprout, bud, bloom. She can water it any time (free, instant), and every newly finished level grows all unfinished flowers one stage.
- **Planting:** pick a seed in the tray, tap a plot. Tap a flower to water it or dig it up (the seed comes back). **Decorations:** pick one, tap a free spot. Tap a placed one to move it (to a free spot, or swap with another) or put it away.
- **Saving:** everything is in `garden2` inside the normal save, and is kept by "Start over" (rewards are remembered, so nothing is lost or earned twice).
- The old Stage 1 emoji garden list is no longer used.
- Tests: `node tests/garden.test.js`, `python3 tests/garden-ui.py`.


## Stage 7: Final integration and offline readiness

### Progress backup
- Open **Settings > Progress backup > Export progress** to download a JSON backup of levels, stars, unlocked content, garden progress, and settings.
- Use **Import progress** to restore a compatible backup. Import replaces the current save only after a confirmation prompt. Export the current save first if you want to keep both.
- The backup does not include photos imported from the phone into IndexedDB. Keep the original photo files separately. Photos shipped inside `assets/memories/` remain part of the project folder and its ZIP.

### Offline behavior and updates
- The service worker precaches the app shell, local scripts, styles, icons, manifest, and configured bundled memory photos.
- The app shows a small notice when the device is offline. Previously cached game content and locally saved progress remain available.
- The service worker cache version is currently `v17`. Bump `VERSION` in `sw.js` whenever you change files that need to update on installed devices.
- Install and test from `http://localhost` or an HTTPS host. Opening `index.html` with a `file://` URL does not enable service-worker installation or offline PWA behavior.

### Suggested release checklist
1. Run `node tests/word-search.test.js`, `node tests/match-three.test.js`, `node tests/album.test.js`, `node tests/stage5.test.js`, `node tests/garden.test.js`, and `node tests/stage7.test.js`.
2. Run `python3 -m http.server 8080` and open `http://localhost:8080`.
3. In browser developer tools, confirm the manifest and service worker install without errors.
4. Play a level, export a backup, change progress, then import the backup and confirm the earlier progress returns.
5. Load the app once while online, then switch DevTools to Offline and reload. Confirm the home screen and cached features still open.
6. Test on the actual target phone: Android Chrome install flow, or iPhone Safari **Share > Add to Home Screen**. Browser support and installation prompts differ by platform.
7. Test a small phone viewport and both puzzle touch controls.

### Verification limits
The automated JavaScript logic tests can run with Node.js. The Python UI tests require a Playwright browser binary; install it with `python -m playwright install chromium` before running them. A successful logic test does not replace testing on the girlfriend's actual phone.


## Stage 8: Our Little Home (Matchington-style renovation)
- The home renovation board is in `js/renovation.js`; room visuals and task costs are configured in the `ROOMS` list.
- Word Search and Match-3 both award stars. Spend those stars on visible room improvements: Living Room, Bedroom, Kitchen, and Memory Corner.
- Lifetime earned stars remain the basis for existing unlock rules. Renovation spending is tracked separately, so spending stars does not remove previously unlocked letters, memories, or rewards.
- Rooms unlock after 0, 8, 18, and 30 completed puzzle levels. Each room has three improvements.
- Renovation progress is saved in `home` and included in progress backups. Completed room improvements remain after "Start over".
- Tests: `node tests/renovation.test.js`.

## Stage 9: Puzzle feel and balance improvements
- Word Search now uses a seeded layout per level, so a replay is consistent and reproducible.
- Drag selection uses projected distance when snapping to a diagonal, and the matcher rejects bent or non-adjacent paths.
- Word Search hints are more forgiving: up to two hints still earn three stars; three to four earn two; five or more earn one.
- Match-3 levels 11, 15, 17, 19, 22, 25, 26, 27, 29, 30, and later selected levels have more moves and lighter cream-tile patterns to soften later difficulty spikes.
- Tests: `node tests/word-search.test.js`, `node tests/match-three.test.js`, `node tests/match-balance.js 20`.


### Coloring illustration update

The coloring canvas now renders at 256×256 internal resolution for smoother contours, with softened rounded silhouettes and refined outline weights. Color numbers remain hidden at normal zoom and appear at 145% zoom. The service-worker cache version was advanced to v19.

## Painting Our Memories (replaces the animal coloring studio)
Her album photos become colorless paint-by-number pictures that she brings to life one section at a time.
- `js/paint-engine.js` turns a photo into numbered sections: it picks N paint colors from the photo itself, cuts the picture into sections, merges slivers, splits big flat areas, and finds a spot for each number. Same photo + same settings always gives the same puzzle (so saved progress stays valid). Test: `node tests/paint-engine.test.js`.
- `js/painting.js` is the screen: pick a color swatch, tap every section with that number. Unpainted sections are a soft gray ghost of the photo; painted ones get real color plus a little of the photo's own light and shade. "Show where it goes" softly glows every section of the chosen color. Swatches count down how many sections are left and finished colors get a check. When a color is used up it jumps to the next one.
- Her place is saved on the device as she paints (`alpou.paint.s1.*` in localStorage), so a big painting can be finished over several sittings. Finishing clears that save.
- Play path: painting level N uses photo N of the album (in album order, round and round, about 2.5 times over 100 levels) and gets harder: 36 sections / 6 colors at level 1 up to 260 sections / 16 colors at level 100 (`PaintEngine.levelParams`). Levels count as done the moment the last section is painted; "Save picture" downloads a PNG.
- Free painting: the Play screen's "Paint Our Memories" card lists the memories she has unlocked, with three detail settings (Relaxed 48 / Detailed 120 / Masterpiece 240 sections).
- If she imported her own version of a photo into the album, the painting uses that one.
- Change the difficulty curve: edit `levelParams` and `DIFFICULTY` at the top of `js/paint-engine.js`. Bump `VERSION` in `sw.js` after any change.
