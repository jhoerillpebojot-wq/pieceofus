/* Offline app shell and same-origin asset cache.
   Bump VERSION whenever a shipped file changes. Saved game data is never cached here. */
try { importScripts('js/album-config.js'); } catch (e) { /* Photo precache is optional. */ }

const VERSION = 'v20';
const PREFIX = 'alpou-static-';
const CACHE = PREFIX + VERSION;
const ASSETS = [
  './', 'index.html', 'manifest.json',
  'css/style.css', 'css/components.css', 'css/responsive.css',
  'css/word-search.css', 'css/match-three.css', 'css/album.css',
  'css/letters.css', 'css/garden.css',
  'js/data.js', 'js/storage.js', 'js/navigation.js',
  'js/games/word-search-levels.js', 'js/games/word-search.js',
  'js/games/match-art.js', 'js/games/match-levels.js', 'js/games/match-three.js',
  'js/album-db.js', 'js/album-config.js', 'js/album.js', 'js/unlocks.js',
  'js/data/letters.js', 'js/data/secrets.js', 'js/data/story.js',
  'js/letters.js', 'js/story.js', 'js/garden-art.js', 'js/data/garden.js',
  'js/garden.js', 'js/renovation.js', 'js/app.js', 'js/paint-engine.js', 'js/painting.js',
  'assets/icons/icon.svg', 'assets/icons/icon-180.png',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  const photos = self.AlbumConfig && typeof self.AlbumConfig.allPhotoPaths === 'function'
    ? self.AlbumConfig.allPhotoPaths() : [];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Core files are required: fail installation rather than leave a partly cached app.
    await cache.addAll(ASSETS);
    // A missing optional memory photo must not prevent installation.
    await Promise.all(photos.map(path => cache.add(path).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        return (await cache.match('index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
