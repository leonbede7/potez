import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { starterCourses } from '../src/data.js';
import {
  parseRepertoire,
  courseStats,
  positionKey,
  recordReview,
  matchingLines,
  chooseLine,
  intervals,
  MAX_PGN_BYTES,
} from '../src/model.js';
import { largePgnFixture, densePgnFixture } from './large-fixture.js';

test('all bundled repertoires and variations replay legally', () => {
  for (const c of starterCourses) {
    const lines = parseRepertoire(c.pgn);
    assert.ok(lines.length >= 2, c.name);
    for (const l of lines) {
      const game = new Chess(l.startFen);
      for (const m of l.moves) {
        assert.equal(game.fen(), m.before);
        game.move(m.san);
        assert.equal(game.fen(), m.after);
      }
    }
  }
});
test('nested variations replace the immediately preceding move and retain comments', () => {
  const lines = parseRepertoire(
    '1. e4 {Centre} e5 (1... c5 2. Nf3 d6 (2... Nc6 3. Bb5)) 2. Nf3 Nc6 *',
  );
  assert.deepEqual(
    lines.map((l) => l.moves.map((m) => m.san).join(' ')).sort(),
    ['e4 c5 Nf3 Nc6 Bb5', 'e4 c5 Nf3 d6', 'e4 e5 Nf3 Nc6'].sort(),
  );
  assert.ok(lines.every((l) => l.moves[0].comment === 'Centre'));
  assert.equal(lines[0].moves.map((m) => m.san).join(' '), 'e4 e5 Nf3 Nc6');
});
test('multi-game PGN and a black-to-move FEN are retained', () => {
  const lines = parseRepertoire(
    '[Event "First"]\n1. e4 e5 *\n\n[Event "Second"]\n[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n1... c5 2. Nf3 *',
  );
  assert.equal(lines.length, 2);
  assert.ok(lines.some((l) => l.moves[0].color === 'b'));
});
test('malformed, illegal and empty imports fail without silently dropping moves', () => {
  for (const pgn of ['', '1. e4 e5 2. Ke4 *', 'not pgn', '[Event "Empty"]'])
    assert.throws(() => parseRepertoire(pgn));
});
test('shared positions count once and alternatives in repertoire match', () => {
  const c = {
    id: 'test',
    color: 'w',
    lines: parseRepertoire('1. e4 e5 2. Nf3 (2. Bc4 Nf6) Nc6 *'),
  };
  assert.equal(courseStats(c, {}).total, 2);
  const prefix = c.lines[0].moves.slice(0, 2);
  assert.equal(matchingLines(c, prefix, 'Bc4').length, 1);
  assert.equal(matchingLines(c, prefix, 'Nf3').length, 1);
  assert.equal(matchingLines(c, prefix, 'a3').length, 0);
});
test('correct recall grows intervals; failure resets to one minute and remains due', () => {
  const first = recordReview(null, true, 1000);
  assert.equal(first.due, 1000 + intervals[1]);
  const second = recordReview(first, true, 2000);
  assert.equal(second.level, 2);
  assert.equal(second.due, 2000 + intervals[2]);
  const wrong = recordReview(second, false, 3000);
  assert.equal(wrong.level, 0);
  assert.equal(wrong.due, 63000);
  assert.equal(wrong.wrong, 1);
  const c = { id: 't', color: 'w', lines: parseRepertoire('1. e4 e5 *') };
  const key = positionKey('t', c.lines[0].moves[0]);
  assert.equal(courseStats(c, { [key]: first }, 1001).due, 0);
  assert.equal(courseStats(c, { [key]: wrong }, 63001).due, 1);
});
test('review selection prioritizes the line containing a due position', () => {
  const c = {
    id: 't',
    color: 'w',
    lines: parseRepertoire('1. e4 e5 2. Nf3 Nc6 (2... Nf6 3. Nxe5 d6) 3. Bc4 Bc5 *'),
  };
  const target = c.lines.findIndex((l) => l.moves.some((m) => m.san === 'Nxe5'));
  const move = c.lines[target].moves.find((m) => m.san === 'Nxe5');
  assert.equal(
    chooseLine(c, { [positionKey('t', move)]: { due: 0, wrong: 1 } }, 'review', 1000),
    target,
  );
});

test('a realistic PGN above 2.51 MB, 2,000 lines and 25,000 moves imports completely', () => {
  const pgn = largePgnFixture();
  assert.ok(new TextEncoder().encode(pgn).byteLength > 2_510_000);
  const lines = parseRepertoire(pgn);
  assert.equal(lines.length, 2200);
  assert.ok(lines.reduce((sum, l) => sum + l.moves.length, 0) > 25000);
  assert.ok(lines.every((l) => l.moves.length > 0));
});

test('the 10 MB boundary uses UTF-8 bytes and accepts an exact-limit PGN', () => {
  const prefix = '1. e4 {';
  const suffix = '} e5 *';
  const exact = prefix + 'x'.repeat(MAX_PGN_BYTES - prefix.length - suffix.length) + suffix;
  assert.equal(parseRepertoire(exact).length, 1);
  assert.throws(() => parseRepertoire(exact + ' '), /10 MB/);
  const multibyte = prefix + 'š'.repeat(5_000_000) + suffix;
  assert.ok(multibyte.length < MAX_PGN_BYTES);
  assert.throws(() => parseRepertoire(multibyte), /10 MB/);
});

test('more than 250,000 source moves import, report progress and deduplicate identical lines', () => {
  const events = [];
  const pgn = densePgnFixture();
  assert.ok(Buffer.byteLength(pgn) > 2_510_000);
  assert.ok(Buffer.byteLength(pgn) < MAX_PGN_BYTES);
  const lines = parseRepertoire(pgn, { onProgress: (event) => events.push(event) });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].moves.length, 96);
  assert.equal(events.at(-1).processed, 316800);
  assert.equal(events.at(-1).stage, 'complete');
  assert.ok(events.some((event) => event.stage === 'validate' && event.processed > 0));
  assert.equal(lines[0].moves.at(-1).san, 'Ng8');
});

test('a valid file can contain more than 20,000 distinct lines', () => {
  const initial = new Chess().fen().split(' ').slice(0, 5).join(' ');
  const pgn = Array.from(
    { length: 20001 },
    (_, i) => `[Event "Linija ${i + 1}"]\n[SetUp "1"]\n[FEN "${initial} ${i + 1}"]\n${i + 1}. e4 *`,
  ).join('\n\n');
  const lines = parseRepertoire(pgn);
  assert.equal(lines.length, 20001);
  assert.equal(lines.at(-1).moves[0].after.split(' ')[5], '20001');
});

test('a long shared prefix can expand past one million moves without duplicating records', () => {
  const prefix = Array.from(
    { length: 25 },
    (_, i) => `${2 * i + 1}. Nf3 Nf6 ${2 * i + 2}. Ng1 Ng8`,
  ).join(' ');
  const branches = new Chess()
    .moves()
    .slice(0, 10)
    .map((san) => `(51. ${san} e5)`)
    .join(' ');
  const initial = new Chess().fen().split(' ').slice(0, 5).join(' ');
  const pgn = Array.from(
    { length: 1001 },
    (_, i) =>
      `[Event "Grananje ${i}"]\n[SetUp "1"]\n[FEN "${initial} ${i + 1}"]\n${prefix} 51. e4 ${branches} e5 *`,
  ).join('\n\n');
  const lines = parseRepertoire(pgn);
  assert.equal(lines.length, 10010);
  assert.ok(lines.reduce((sum, l) => sum + l.moves.length, 0) > 1000000);
  assert.equal(lines[0].moves[50], lines[1].moves[50]);
  assert.equal(lines[0].moves.at(-1).san, 'e5');
  assert.ok(lines.every((line) => line.moves.at(-1).color === 'b'));
});

test('validation caching preserves different comments and rejects an illegal move after a cache hit', () => {
  const lines = parseRepertoire('1. e4 {Prvi plan} e5 *\n\n1. e4 {Drugi plan} c5 *');
  assert.equal(lines[0].moves[0].comment, 'Prvi plan');
  assert.equal(lines[1].moves[0].comment, 'Drugi plan');
  assert.throws(() => parseRepertoire('1. e4 e5 *\n\n1. e4 Ke4 *'), /illegal/);
});
