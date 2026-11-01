import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createStorage } from '../src/storage.js';
import { STORAGE_KEY } from '../src/model.js';

function legacyStorage(initial) {
  const items = new Map(initial ? [[STORAGE_KEY, JSON.stringify(initial)]] : []);
  return {
    getItem: (key) => items.get(key) || null,
    removeItem: (key) => items.delete(key),
    items,
  };
}
function sample() {
  return {
    courses: [{ id: 'old', name: 'Moje otvaranje', pgn: '1. e4 e5 *', lines: [] }],
    reviews: { e4: { level: 3 } },
    activity: { today: { correct: 8, total: 10 } },
    notes: { note: 'Sačuvaj' },
    settings: { goal: 30 },
    lastCourse: 'old',
  };
}

test('migrates old repertoires, settings, notes and progress without losing data', async () => {
  const factory = new IDBFactory(),
    data = sample(),
    legacy = legacyStorage(data);
  const first = createStorage(factory, legacy);
  assert.deepEqual(await first.load(), data);
  assert.equal(legacy.getItem(STORAGE_KEY), null);
  await first.close();
  const second = createStorage(factory, legacy);
  assert.deepEqual(await second.load(), data);
  await second.close();
});

test('large courses exceed localStorage capacity and survive a reload with progress', async () => {
  const factory = new IDBFactory(),
    legacy = legacyStorage();
  const first = createStorage(factory, legacy);
  assert.equal(await first.load(), null);
  const data = sample();
  data.courses.push({ id: 'big', pgn: 'x'.repeat(8_000_000), lines: [] });
  await first.save(data);
  data.reviews.e4.level = 4;
  // Updates state without duplicating or reserializing the large course.
  await first.save(data);
  await first.close();
  const second = createStorage(factory, legacy);
  const restored = await second.load();
  assert.equal(restored.courses[1].pgn.length, 8_000_000);
  assert.equal(restored.reviews.e4.level, 4);
  await second.close();
});

test('failed migration keeps the original data; failed saves reject', async () => {
  const data = sample(),
    legacy = legacyStorage(data);
  const storage = createStorage(null, legacy);
  assert.deepEqual(await storage.load(), data);
  await assert.rejects(storage.save(data));
  assert.deepEqual(JSON.parse(legacy.getItem(STORAGE_KEY)), data);
});

test('queued saves and a backup restore retain course order and the latest state', async () => {
  const factory = new IDBFactory(),
    legacy = legacyStorage(),
    storage = createStorage(factory, legacy);
  await storage.load();
  const data = sample();
  const a = storage.save(data);
  data.settings.goal = 50;
  const b = storage.save(data);
  await Promise.all([a, b]);
  const restored = { ...sample(), courses: [{ id: 'new', pgn: '1. d4 d5 *', lines: [] }] };
  await storage.save(restored);
  await storage.close();
  const next = createStorage(factory, legacy);
  assert.deepEqual(await next.load(), restored);
  await next.close();
});
