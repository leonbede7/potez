import { STORAGE_KEY } from './model.js';

// Store repertoires separately from small, frequently updated training records.
// IndexedDB avoids the localStorage quota and rewrites only changed courses.
export function createStorage(
  indexedDb = globalThis.indexedDB,
  legacyStorage = globalThis.localStorage,
) {
  let connection;
  let savedCourses = new Map();
  let queue = Promise.resolve();
  function open() {
    if (!connection)
      connection = new Promise((resolve, reject) => {
        if (!indexedDb) {
          reject(new Error('Browser storage is unavailable.'));
          return;
        }
        const request = indexedDb.open('move-studio', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('courses', { keyPath: 'id' });
          db.createObjectStore('state');
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            connection = null;
          };
          resolve(db);
        };
        request.onerror = () => {
          connection = null;
          reject(request.error);
        };
        request.onblocked = () => {
          connection = null;
          reject(new Error('Close other Potez tabs and try again.'));
        };
      });
    return connection.catch((error) => {
      connection = null;
      throw error;
    });
  }
  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () =>
        reject(tx.error || new Error('Could not save. Check available browser storage.'));
    });
  }
  async function load() {
    let loaded;
    try {
      const db = await open();
      const tx = db.transaction(['courses', 'state'], 'readonly');
      const done = transactionDone(tx);
      const stateRequest = tx.objectStore('state').get('current');
      const coursesRequest = tx.objectStore('courses').getAll();
      await done;
      const meta = stateRequest.result;
      if (meta) {
        const byId = new Map(coursesRequest.result.map((c) => [c.id, c]));
        const courses = meta.courseOrder.map((id) => byId.get(id));
        if (courses.some((c) => !c))
          throw new Error('Part of a saved repertoire is missing. Restore a backup.');
        const { courseOrder, ...rest } = meta;
        loaded = { ...rest, courses };
        savedCourses = new Map(courses.map((c) => [c.id, c]));
      }
    } catch (error) {
      // Preserve the old data if the new storage is unavailable.
      const legacy = legacyStorage?.getItem(STORAGE_KEY);
      if (legacy) return JSON.parse(legacy);
      throw error;
    }
    if (loaded) return loaded;
    const legacy = legacyStorage?.getItem(STORAGE_KEY);
    if (!legacy) return null;
    const data = JSON.parse(legacy);
    // Remove the old copy only after an atomic, successful migration.
    await save(data);
    return data;
  }
  function save(data) {
    const { courses, ...meta } = data;
    const courseSnapshot = [...courses];
    const stateSnapshot = structuredClone({
      ...meta,
      courseOrder: courseSnapshot.map((c) => c.id),
    });
    const work = async () => {
      const db = await open();
      const tx = db.transaction(['courses', 'state'], 'readwrite');
      const done = transactionDone(tx);
      const store = tx.objectStore('courses');
      for (const c of courseSnapshot) if (savedCourses.get(c.id) !== c) store.put(c);
      const ids = new Set(courseSnapshot.map((c) => c.id));
      for (const id of savedCourses.keys()) if (!ids.has(id)) store.delete(id);
      tx.objectStore('state').put(stateSnapshot, 'current');
      await done;
      savedCourses = new Map(courseSnapshot.map((c) => [c.id, c]));
      try {
        legacyStorage?.removeItem(STORAGE_KEY);
      } catch {
        /* IDB is already durable. */
      }
    };
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  }
  async function close() {
    await queue;
    if (connection) (await connection).close();
    connection = null;
    savedCourses = new Map();
  }
  return { load, save, close };
}
