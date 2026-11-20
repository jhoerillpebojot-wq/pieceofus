/* Optional: photos she imports from her own phone are stored as Blobs in IndexedDB (never in localStorage). */
(function (root) {
  const NAME = 'alpou-album', STORE = 'photos';
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const req = root.indexedDB.open(NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbp.catch(() => { dbp = null; });
    return dbp;
  }
  const run = (mode, fn) => open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = t.onabort = () => reject(t.error);
  }));
  root.AlbumDB = {
    available: !!root.indexedDB,
    put: (id, blob) => run('readwrite', s => s.put({ id, blob, added: Date.now() })),
    remove: id => run('readwrite', s => s.delete(id)),
    all: () => run('readonly', s => s.getAll())
  };
})(typeof window !== 'undefined' ? window : globalThis);
