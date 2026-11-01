import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess, DEFAULT_POSITION } from 'chess.js';
import { IDBFactory } from 'fake-indexeddb';
import { advancedRepertoires, ADVANCED_PACK } from '../src/advanced-repertoires.js';
import { personalRepertoires, studyCoursePgn } from '../src/personal-repertoires.js';
import { parseRepertoire, getPositions, positionKey, matchingLines } from '../src/model.js';
import { installStudyPack } from '../src/study-pack.js';
import { courseTrainingSettings, trainingPlyLimit } from '../src/studio.js';
import { studyProgress } from '../src/study-progress.js';
import { createStorage } from '../src/storage.js';

test('all 9 Part 2 courses have 36 legal extensions and 18 playable decision drills', () => {
  let extensions = 0,
    decisions = 0;
  for (const c of advancedRepertoires) {
    assert.equal(c.part, 2);
    assert.equal(c.lessons.length, 6);
    const parent = personalRepertoires.find((p) => p.id === c.parentId);
    assert.ok(parent);
    assert.equal(c.color, parent.color);
    const bases = parseRepertoire(studyCoursePgn(parent));
    const lines = parseRepertoire(studyCoursePgn(c));
    assert.equal(lines.length, 6);
    lines.forEach((line, i) => {
      const chess = new Chess(line.startFen);
      for (const move of line.moves) {
        assert.equal(chess.fen(), move.before);
        chess.move(move.san);
        assert.equal(chess.fen(), move.after);
      }
      assert.ok(line.moves.some((m) => m.comment.includes('Plan:')));
      assert.ok(line.origin);
      if (i < 4) {
        assert.equal(line.kind, 'continuation');
        assert.equal(line.startFen, DEFAULT_POSITION);
        const base = bases[c.lessons[i].baseIndex];
        assert.ok(line.moves.length >= base.moves.length + 8, c.id + ': ' + line.name);
        assert.deepEqual(
          line.moves.slice(0, base.moves.length).map((m) => m.san),
          base.moves.map((m) => m.san),
        );
        extensions++;
      } else {
        assert.equal(line.kind, 'decision');
        assert.ok(line.prompt.endsWith('?'));
        assert.notEqual(line.startFen, DEFAULT_POSITION);
        assert.equal(chess.history().length, line.moves.length);
        assert.equal(line.moves[0].color, c.color);
        assert.ok(line.moves.length >= 4);
        assert.ok(lines.slice(0, 4).some((l) => l.moves.some((m) => m.before === line.startFen)));
        decisions++;
      }
    });
  }
  assert.equal(extensions, 36);
  assert.equal(decisions, 18);
});

test('same SAN from different starting positions cannot switch the active line', () => {
  const chess = new Chess();
  chess.move('Nf3');
  chess.move('Nf6');
  const fen = chess.fen();
  const course = {
    lines: parseRepertoire(
      `[Event "A"]\n\n1. e4 *\n\n[Event "B"]\n[SetUp "1"]\n[FEN "${fen}"]\n\n2. e4 *`,
    ),
  };
  assert.deepEqual(
    matchingLines(course, [], 'e4').map((m) => m.index),
    [0],
  );
  assert.deepEqual(
    matchingLines(course, [], 'e4', fen).map((m) => m.index),
    [1],
  );
});

test('Part 2 reaches the tail even with old short depth and session settings', () => {
  const settings = { depth: 6, sessionLength: 5, replySpeed: 650 };
  const c = advancedRepertoires[0],
    line = parseRepertoire(studyCoursePgn(c))[0];
  const advanced = courseTrainingSettings(c, settings);
  assert.equal(trainingPlyLimit(line, advanced), line.moves.length);
  assert.equal(advanced.sessionLength, 0);
  assert.equal(advanced.replySpeed, 650);
  assert.deepEqual(settings, { depth: 6, sessionLength: 5, replySpeed: 650 });
  assert.equal(courseTrainingSettings(personalRepertoires[0], settings), settings);
});

test('upgrading a saved Part 1 keeps edits, archives and reviews through IndexedDB reload', async () => {
  const data = {
    courses: personalRepertoires.map((c) => ({
      ...c,
      pgn: studyCoursePgn(c),
      lines: parseRepertoire(studyCoursePgn(c)),
    })),
    reviews: { custom: { level: 4 } },
    activity: {},
    notes: { keep: 'bilješka' },
    lastCourse: personalRepertoires[0].id,
    studyPackVersion: 'leonbede-2026-10-v1',
  };
  data.courses[0].name = 'Moj naziv';
  data.courses[0].archivedAt = 100;
  const original = data.courses[0];
  assert.equal(await installStudyPack(data, parseRepertoire), 9);
  assert.equal(data.courses[0], original);
  const storage = createStorage(new IDBFactory(), null);
  await storage.save(data);
  const loaded = await storage.load();
  assert.equal(await installStudyPack(loaded, parseRepertoire), 0);
  assert.equal(loaded.courses.length, 18);
  assert.equal(loaded.courses[0].archivedAt, 100);
  assert.equal(loaded.courses[0].name, 'Moj naziv');
  assert.equal(loaded.lastCourse, data.lastCourse);
  assert.equal(loaded.reviews.custom.level, 4);
  assert.equal(loaded.notes.keep, 'bilješka');
  assert.equal(loaded.studyPackVersion, ADVANCED_PACK);
});

test('Part 1 and Part 2 progress are independent and shared drill positions count once', async () => {
  const data = { courses: [], reviews: {} };
  await installStudyPack(data, parseRepertoire);
  const course = data.courses.find((c) => c.id === advancedRepertoires[0].id),
    drill = course.lines[4];
  const key = positionKey(course.id, drill.moves[0]);
  data.reviews[key] = { level: 1, due: 1 };
  assert.equal(studyProgress(personalRepertoires, data.courses, data.reviews, 10).learned, 0);
  const s = studyProgress(advancedRepertoires, data.courses, data.reviews, 10);
  assert.equal(s.learned, 1);
  assert.equal(s.due, 1);
  assert.equal(
    s.total,
    data.courses.filter((c) => c.part === 2).reduce((n, c) => n + getPositions(c).size, 0),
  );
  assert.equal([...getPositions(course).keys()].filter((k) => k === key).length, 1);
});

test('downloadable Part 2 PGNs exactly match the installed teaching content', () => {
  for (const c of advancedRepertoires) {
    const exported = fs.readFileSync(
      new URL(`../public/repertoires/${c.id}.pgn`, import.meta.url),
      'utf8',
    );
    assert.equal(exported.trim(), studyCoursePgn(c).trim());
  }
});
