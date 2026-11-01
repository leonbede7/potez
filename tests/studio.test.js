import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseSettings,
  trainingPlyLimit,
  nextTrainingLine,
  searchLineIndexes,
  weakPositions,
  formatDuration,
  archiveCourse,
} from '../src/studio.js';
import { parseRepertoire, positionKey } from '../src/model.js';
import { createStorage } from '../src/storage.js';
import { IDBFactory } from 'fake-indexeddb';
const course = {
  id: 'c',
  name: 'Otvaranje',
  color: 'w',
  lines: parseRepertoire(
    '[Event "Talijanska"]\n1. e4 e5 2. Nf3 (2. Bc4 Nf6) Nc6 *\n\n[Event "London"]\n1. d4 d5 2. Bf4 Nf6 *',
  ),
};

test('new settings preserve previous preferences and bound invalid input', () => {
  const settings = normaliseSettings({
    sound: false,
    volume: 500,
    depth: -2,
    replySpeed: 50,
    appearance: 'invalid',
    goal: 30,
  });
  assert.equal(settings.sound, false);
  assert.equal(settings.volume, 100);
  assert.equal(settings.depth, 0);
  assert.equal(settings.replySpeed, 200);
  assert.equal(settings.appearance, 'dark');
  assert.equal(settings.goal, 30);
});
test('depth limits preserve full lines and never extend a short variation', () => {
  assert.equal(trainingPlyLimit(course.lines[0], { depth: 0 }), 4);
  assert.equal(trainingPlyLimit(course.lines[0], { depth: 1 }), 2);
  assert.equal(trainingPlyLimit(course.lines[0], { depth: 30 }), 4);
});
test('line search combines chapter names and moves while returning original indexes', () => {
  assert.deepEqual(searchLineIndexes(course, 'talijanska bc4'), [1]);
  assert.deepEqual(searchLineIndexes(course, 'LONDON d4'), [2]);
  assert.deepEqual(searchLineIndexes(course, 'Najdorf'), []);
});
test('random and sequential training move to another line and handle one line', () => {
  assert.equal(nextTrainingLine(course, {}, 0, 'sequential'), 1);
  assert.equal(
    nextTrainingLine(course, {}, 0, 'random', () => 0),
    1,
  );
  assert.equal(
    nextTrainingLine(course, {}, 0, 'random', () => 1),
    2,
  );
  assert.equal(nextTrainingLine({ lines: [course.lines[0]] }, {}, 0, 'random'), 0);
});
test('weak positions are ranked by errors, deduplicated, and exclude archived courses', () => {
  const key = positionKey('c', course.lines[0].moves[0]);
  const other = positionKey('c', course.lines[0].moves[2]);
  const records = { [key]: { wrong: 2, due: 1 }, [other]: { wrong: 4, due: 2 } };
  const weak = weakPositions([course], records);
  assert.equal(weak.length, 2);
  assert.equal(weak[0].key, other);
  assert.deepEqual(weakPositions([{ ...course, archivedAt: 1 }], records), []);
});
test('archiving and restoring retain all course data and survive a reload', async () => {
  const factory = new IDBFactory();
  const storage = createStorage(factory, null);
  const original = {
    courses: [course],
    reviews: {},
    settings: {},
    activity: {},
    sessions: [{ total: 5 }],
    notes: { a: 'Plan' },
  };
  const archived = { ...original, courses: archiveCourse(original.courses, 'c', true, 1234) };
  assert.equal(archived.courses[0].lines, course.lines);
  assert.equal(course.archivedAt, undefined);
  await storage.save(archived);
  await storage.close();
  const second = createStorage(factory, null),
    saved = await second.load();
  assert.equal(saved.courses[0].archivedAt, 1234);
  assert.equal(saved.notes.a, 'Plan');
  assert.equal(saved.sessions[0].total, 5);
  const restored = archiveCourse(saved.courses, 'c', false);
  assert.equal(restored[0].archivedAt, null);
  assert.equal(restored[0].lines.length, 3);
  await second.close();
});
test('session duration handles minutes and invalid negative elapsed time', () => {
  assert.equal(formatDuration(65000), '1:05');
  assert.equal(formatDuration(-20), '0:00');
});
