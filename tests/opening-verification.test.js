import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { IDBFactory } from 'fake-indexeddb';
import { advancedRepertoires, ADVANCED_PACK } from '../src/advanced-repertoires.js';
import { studyCoursePgn } from '../src/personal-repertoires.js';
import { parseRepertoire, positionKey } from '../src/model.js';
import { installStudyPack } from '../src/study-pack.js';
import { createStorage } from '../src/storage.js';
const report = JSON.parse(
  fs.readFileSync(
    new URL('../public/repertoires/opening-verification.json', import.meta.url),
    'utf8',
  ),
);
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');

test('all 36 branches link to pinned theory and their source prefix or transposition is reproducible', () => {
  assert.equal(report.checkedBranches, 36);
  assert.equal(report.checkedDrills, 18);
  assert.equal(report.branches.length, 36);
  for (const b of report.branches) {
    assert.match(
      b.theory.source,
      /github\.com\/lichess-org\/chess-openings\/blob\/[a-f0-9]{40}\/[a-e]\.tsv#L\d+$/,
    );
    const c = advancedRepertoires.find((c) => c.id === b.courseId),
      line = parseRepertoire(studyCoursePgn(c))[b.chapter - 1];
    const source = new Chess();
    source.loadPgn(b.theory.pgn);
    assert.equal(key(source.fen()), key(line.moves[b.theory.plies - 1].after), b.title);
    if (b.theory.prefixOnly) {
      const full = new Chess();
      full.loadPgn(b.theory.sourcePgn);
      assert.deepEqual(source.history(), full.history().slice(0, source.history().length));
    }
    assert.equal(c.verification.nodes, 3000000);
    assert.equal(c.verification.revision, 2);
  }
});
test('every exported Part 2 move has real 3-million-node evidence and a bounded post-root score loss', () => {
  for (const b of report.branches) {
    const c = advancedRepertoires.find((c) => c.id === b.courseId),
      line = parseRepertoire(studyCoursePgn(c))[b.chapter - 1];
    assert.equal(b.moves.length, line.moves.length);
    b.moves.forEach((e, i) => {
      assert.equal(e.san, line.moves[i].san);
      assert.equal(key(e.fen), key(line.moves[i].before));
      assert.ok(e.nodes >= 3000000);
      if (!e.committedRoot) assert.ok(e.lossCp <= 30, `${b.title} ${e.san}`);
      if (e.kind === 'engine') assert.equal(e.uci, e.engineBest);
      else if (e.kind === 'engine-alternative') {
        assert.ok(e.restrictedAnalysis.nodes >= 3000000);
        assert.equal(e.uci, e.restrictedAnalysis.best);
        assert.equal(e.lossCp, Math.max(0, e.cp - e.restrictedAnalysis.cp));
      } else {
        assert.ok(e.comparison.afterNodes >= 3000000 || Math.abs(e.comparison.afterCp) >= 99000);
        assert.equal(
          e.lossCp,
          e.uci === e.engineBest ? 0 : Math.max(0, e.cp + e.comparison.afterCp),
        );
      }
    });
  }
});
test('corrected study revision preserves user data, backs up old PGN and resets only changed accepted moves', async () => {
  const id = advancedRepertoires[0].id,
    pgn =
      '[Event "Changed"]\n1. d4 d5 2. c4 c6 3. a3 *\n\n[Event "Retired"]\n1. d4 d5 2. c4 e6 3. Nc3 *',
    lines = parseRepertoire(pgn);
  const old = {
    id,
    name: 'Moj uređeni naziv',
    description: 'Moja bilješka',
    color: 'w',
    studyPack: 'leonbede-part2-2026-10-v1',
    pgn,
    lines,
    archivedAt: 42,
  };
  const good = positionKey(id, lines[0].moves[0]),
    changedKey = positionKey(id, lines[0].moves[4]),
    stale = positionKey(id, lines[1].moves[4]),
    custom = {
      id: 'own',
      name: 'Vlastiti PGN',
      color: 'w',
      pgn: '1. e4 e5 *',
      lines: parseRepertoire('1. e4 e5 *'),
    };
  const data = {
    courses: [old, custom],
    reviews: {
      [good]: { level: 4 },
      [changedKey]: { level: 3 },
      [stale]: { level: 3 },
      unrelated: { level: 5 },
    },
    activity: { keep: 1 },
    notes: { keep: 'tekst' },
    lastCourse: id,
    customPractice: { ids: [id, 'own'] },
  };
  const storage = createStorage(new IDBFactory(), null);
  await storage.save(data);
  await installStudyPack(data, parseRepertoire);
  await storage.save(data);
  const restored = await storage.load(),
    changed = restored.courses.find((c) => c.id === id);
  assert.equal(changed.studyPack, ADVANCED_PACK);
  assert.equal(changed.name, old.name);
  assert.equal(changed.description, old.description);
  assert.equal(changed.archivedAt, 42);
  assert.equal(restored.reviews[good].level, 4);
  assert.equal(restored.reviews[stale], undefined);
  assert.equal(restored.reviews.unrelated.level, 5);
  assert.equal(restored.reviews[changedKey].level, 0);
  assert.ok(restored.reviews[changedKey].due <= Date.now());
  const backup = Object.values(restored.studyContentBackups).find((b) => b.id === id);
  assert.equal(backup.pgn, pgn);
  assert.equal(backup.reviews[stale].level, 3);
  assert.equal(restored.lastCourse, id);
  assert.equal(restored.notes.keep, 'tekst');
  assert.deepEqual(restored.customPractice.ids, [id, 'own']);
  assert.equal(restored.courses.find((c) => c.id === 'own').pgn, custom.pgn);
  const count = Object.keys(restored.studyContentBackups).length;
  assert.equal(await installStudyPack(restored, parseRepertoire), 0);
  assert.equal(Object.keys(restored.studyContentBackups).length, count);
});
test('published correction example identifies the actual old rook loss', () => {
  const e = report.originalScreening.confirmedExample;
  assert.equal(e.san, 'Rc2');
  const chess = new Chess(e.afterFen);
  const capture = chess.move('Bxc2');
  assert.equal(capture.captured, 'r');
});
