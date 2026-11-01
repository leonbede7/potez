import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import legacy from '../src/legacy-bundle-labels.json' with { type: 'json' };
import { starterCourses } from '../src/data.js';
import { personalRepertoires, studyCoursePgn } from '../src/personal-repertoires.js';
import { advancedRepertoires } from '../src/advanced-repertoires.js';
import { parseRepertoire, positionKey, STORAGE_KEY } from '../src/model.js';
import { installStudyPack } from '../src/study-pack.js';
import { createStorage } from '../src/storage.js';
import { createMasteryCatalog } from '../src/custom-mastery.js';

test('English defaults retain legacy storage, review keys, mastery IDs and selected courses across reload', async () => {
  assert.equal(STORAGE_KEY, 'potez-studio-v1');
  const old = legacy.find((c) => c.id === 'italian'),
    course = { ...old, color: 'w', lines: parseRepertoire(old.pgn), archivedAt: 42 };
  const config = { ids: ['italian'], color: 'w' },
    active = { ...course, archivedAt: null };
  const before = createMasteryCatalog([active], config).map((v) => v.id),
    review = positionKey(course.id, course.lines[0].moves[0]);
  const data = {
    courses: [course],
    reviews: { [review]: { level: 4 } },
    notes: { note: 'Moja bilješka' },
    activity: {},
    lastCourse: 'italian',
    customPractice: config,
    customMastery: { version: 1, entries: { [before[0]]: { mastered: true } } },
  };
  await installStudyPack(data, parseRepertoire);
  const translated = data.courses.find((c) => c.id === 'italian');
  assert.equal(translated.name, 'Italian Game');
  assert.equal(translated.pgn, starterCourses[0].pgn);
  assert.equal(translated.archivedAt, 42);
  assert.deepEqual(
    createMasteryCatalog([{ ...translated, archivedAt: null }], config).map((v) => v.id),
    before,
  );
  assert.equal(data.reviews[review].level, 4);
  assert.equal(data.customMastery.entries[before[0]].mastered, true);
  const storage = createStorage(new IDBFactory(), null);
  await storage.save(data);
  const restored = await storage.load();
  await storage.close();
  assert.equal(restored.notes.note, 'Moja bilješka');
  assert.deepEqual(restored.customPractice, config);
  assert.equal(restored.courses.find((c) => c.id === 'italian').name, 'Italian Game');
});

test('language migration preserves edited names, custom PGNs, notes and modified sample comments', async () => {
  const old = legacy.find((c) => c.id === 'italian'),
    pgn = old.pgn.replace('Zauzmi centar', 'Moj komentar');
  const own = {
    id: 'my-import',
    name: 'Moj repertoar',
    color: 'w',
    pgn: '1. d4 {Moja ideja} d5 *',
    lines: parseRepertoire('1. d4 {Moja ideja} d5 *'),
  };
  const data = {
    courses: [{ ...old, name: 'Moj naziv', pgn, lines: parseRepertoire(pgn) }, own],
    reviews: {},
    notes: {},
    activity: {},
  };
  await installStudyPack(data, parseRepertoire);
  assert.equal(data.courses[0].name, 'Moj naziv');
  assert.equal(data.courses[0].pgn, pgn);
  assert.equal(data.courses[1], own);
});

test('bundled lesson titles, plans, prompts and comments are English while all moves remain legal', () => {
  for (const course of [...personalRepertoires, ...advancedRepertoires]) {
    const text = JSON.stringify([
      course.name,
      course.group,
      course.description,
      course.when,
      course.plans,
      course.warnings,
      course.lessons,
    ]);
    assert.doesNotMatch(text, /[čćšđžČĆŠĐŽ]/, course.id);
    assert.equal(parseRepertoire(studyCoursePgn(course)).length, course.lessons.length);
  }
});
