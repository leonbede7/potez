import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { personalRepertoires, studyCoursePgn, STUDY_PACK } from '../src/personal-repertoires.js';
import { installStudyPack } from '../src/study-pack.js';
import { parseRepertoire } from '../src/model.js';
import { ADVANCED_PACK } from '../src/advanced-repertoires.js';

test('all 82 annotated chapters replay legally and retain a chapter title and plan', () => {
  let chapters = 0;
  for (const course of personalRepertoires) {
    const lines = parseRepertoire(studyCoursePgn(course));
    assert.equal(lines.length, course.lessons.length, course.id);
    assert.ok(
      course.plans.length >= 3 && course.warnings.length >= 2 && course.sources.length >= 2,
    );
    for (const line of lines) {
      assert.ok(line.name.includes('·'));
      assert.ok(line.moves.length >= 12);
      const chess = new Chess(line.startFen);
      for (const m of line.moves) {
        assert.equal(chess.fen(), m.before);
        chess.move(m.san);
        assert.equal(chess.fen(), m.after);
      }
      assert.ok(line.moves.some((m) => m.comment.includes('Plan:')));
      assert.ok(line.moves.some((m) => m.color === course.color));
      chapters++;
    }
  }
  assert.equal(chapters, 82);
});
test('the Queen gambit, Dragon and e5 alternatives have the correct mutually distinct roots', () => {
  for (const course of personalRepertoires) {
    const lines = parseRepertoire(studyCoursePgn(course));
    if (course.id === 'leon-black-e5')
      assert.ok(lines.every((l) => l.moves[0].san === 'e4' && l.moves[1].san === 'e5'));
    if (course.id === 'leon-black-dragon' || course.id === 'leon-black-anti-sicilian')
      assert.ok(lines.every((l) => l.moves[0].san === 'e4' && l.moves[1].san === 'c5'));
    if (course.color === 'w') assert.ok(lines.every((l) => l.moves[0].san === 'd4'));
  }
});
test('the Lasker motif preserves underpromotion and the legal checking move', () => {
  const course = personalRepertoires.find((c) => c.id === 'leon-black-d5');
  const line = parseRepertoire(studyCoursePgn(course)).at(-1);
  assert.equal(line.moves.at(-1).promotion, 'n');
  assert.equal(line.moves.at(-1).san, 'fxg1=N+');
});
test('pack installation is additive, idempotent and preserves edited or archived courses', async () => {
  const original = { id: 'my-pgn', name: 'Moje bilješke', lines: [] };
  const data = { courses: [original], reviews: { keep: { level: 5 } }, lastCourse: 'my-pgn' };
  assert.equal(await installStudyPack(data, parseRepertoire), 18);
  assert.equal(data.courses[0], original);
  assert.equal(data.lastCourse, 'my-pgn');
  data.courses[1].name = 'Moj uređeni naziv';
  data.courses[1].archivedAt = 1;
  assert.equal(await installStudyPack(data, parseRepertoire), 0);
  assert.equal(data.courses[1].name, 'Moj uređeni naziv');
  assert.equal(data.courses[1].archivedAt, 1);
  assert.equal(data.reviews.keep.level, 5);
  assert.equal(data.studyPackVersion, ADVANCED_PACK);
});
