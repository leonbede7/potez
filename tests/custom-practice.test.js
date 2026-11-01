import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { parseRepertoire, recordReview, positionKey } from '../src/model.js';
import {
  normalisePracticeConfig,
  createPracticePool,
  createPracticeQueue,
  pickPracticeSeed,
  practiceOptions,
  practiceEdge,
  choosePracticeReply,
  practiceReviewKeys,
  practicePositionKey,
} from '../src/custom-practice.js';
import { createCustomPractice } from '../src/custom-practice-ui.js';
import {
  createMasteryCatalog,
  masteryStats,
  isMastered,
  setMastery,
  pickMasteryVariant,
} from '../src/custom-mastery.js';
const course = (id, color, pgn, rest = {}) => ({
  id,
  name: id,
  color,
  lines: parseRepertoire(pgn),
  ...rest,
});
const courses = [
  course('spanish', 'w', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 *'),
  course('italian', 'w', '1. e4 e5 2. Bc4 Nf6 3. d3 Bc5 4. Nf3 Nc6 *'),
  course('black', 'b', '1. d4 d5 2. c4 e6 3. Nc3 Nf6 *'),
];
const config = { ids: courses.map((c) => c.id), color: 'random', rounds: 5, moves: 3 };

test('custom selection excludes archives, deselected openings and the opposite training color', () => {
  const list = [...courses, course('archived', 'w', '1. d4 d5 *', { archivedAt: 1 })];
  const c = normalisePracticeConfig(
    { ...config, color: 'w', ids: ['spanish', 'black', 'archived', 'missing', 'spanish'] },
    list,
  );
  assert.deepEqual(c.ids, ['spanish', 'black']);
  assert.deepEqual(
    createPracticePool(list, c).groups.map((g) => g.courseId),
    ['spanish'],
  );
  assert.equal(createPracticePool(list, { ...c, ids: [] }).groups.length, 0);
});
test('a player can choose an alternative from another selected repertoire and continue along it', () => {
  const pool = createPracticePool(courses, { ...config, color: 'w' }),
    chess = new Chess();
  chess.move('e4');
  chess.move('e5');
  assert.deepEqual(
    practiceOptions(pool, 'w', chess.fen())
      .map((e) => e.san)
      .sort(),
    ['Bc4', 'Nf3'],
  );
  const chosen = practiceEdge(pool, 'w', chess.fen(), 'Bc4');
  assert.ok(chosen);
  assert.deepEqual([...chosen.refs.keys()], ['italian']);
  chess.move(chosen.san);
  assert.equal(choosePracticeReply(pool, 'w', chess.fen(), () => 0).san, 'Nf6');
  chess.move('Nf6');
  assert.ok(practiceEdge(pool, 'w', chess.fen(), 'd3'));
  assert.equal(practiceEdge(pool, 'w', chess.fen(), 'Bb5'), null);
});
test('transpositions merge positions even when the preceding move orders differ', () => {
  const a = course('a', 'w', '1. Nf3 d5 2. d4 Nf6 3. c4 e6 4. Nc3 *'),
    b = course('b', 'w', '1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. g3 *');
  const pool = createPracticePool([a, b], { color: 'w', ids: ['a', 'b'] });
  assert.deepEqual(
    practiceOptions(pool, 'w', a.lines[0].moves[6].before)
      .map((e) => e.san)
      .sort(),
    ['Nc3', 'g3'],
  );
});
test('identical boards with different castling and en-passant rights stay separate', () => {
  const fen = '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    without = fen.replace(' w K ', ' w - ');
  const pgn = (f, m) => `[SetUp "1"]\n[FEN "${f}"]\n\n${m} *`;
  const a = course('castle', 'w', pgn(fen, '1. O-O')),
    b = course('no-castle', 'w', pgn(without, '1. Rh2'));
  const pool = createPracticePool([a, b], { color: 'w', ids: ['castle', 'no-castle'] });
  assert.deepEqual(
    practiceOptions(pool, 'w', fen).map((e) => e.san),
    ['O-O'],
  );
  assert.deepEqual(
    practiceOptions(pool, 'w', without).map((e) => e.san),
    ['Rh2'],
  );
  const chess = new Chess();
  ['e4', 'a6', 'e5', 'd5'].forEach((m) => chess.move(m));
  const ep = chess.fen(),
    noEp = ep.replace(' d6 ', ' - ');
  const c = course('ep', 'w', pgn(ep, '3. exd6')),
    d = course('no-ep', 'w', pgn(noEp, '3. e6'));
  const epPool = createPracticePool([c, d], { color: 'w', ids: ['ep', 'no-ep'] });
  assert.equal(practiceOptions(epPool, 'w', ep)[0].san, 'exd6');
  assert.equal(practiceOptions(epPool, 'w', noEp)[0].san, 'e6');
});
test('random rounds start on the chosen side and do not repeat shared positions before exhaustion', () => {
  const pool = createPracticePool(courses, config),
    queue = createPracticeQueue(pool);
  const unique = new Set(pool.groups.flatMap((g) => g.seeds.map((s) => g.color + '|' + s.key))),
    seen = new Set();
  for (let i = 0; i < unique.size; i++) {
    const seed = pickPracticeSeed(pool, queue, () => 0),
      key = seed.color + '|' + seed.key;
    assert.equal(new Chess(seed.fen).turn(), seed.color);
    assert.equal(seen.has(key), false);
    seen.add(key);
  }
  assert.equal(queue.cycle, 1);
  pickPracticeSeed(pool, queue, () => 0);
  assert.equal(queue.cycle, 2);
  const white = pickPracticeSeed(pool, createPracticeQueue(pool), () => 0),
    black = pickPracticeSeed(pool, createPracticeQueue(pool), () => 0.99);
  assert.equal(white.color, 'w');
  assert.equal(black.color, 'b');
});
test('shared correct moves credit source repertoires once and do not credit deselected courses', () => {
  const pool = createPracticePool(courses, { ...config, color: 'w' }),
    fen = new Chess().fen(),
    edge = practiceEdge(pool, 'w', fen, 'e4');
  assert.deepEqual(
    practiceReviewKeys([edge, edge], fen).sort(),
    courses
      .slice(0, 2)
      .map((c) => positionKey(c.id, c.lines[0].moves[0]))
      .sort(),
  );
  const selected = createPracticePool(courses, { ...config, color: 'w', ids: ['spanish'] });
  assert.equal(practiceReviewKeys([practiceEdge(selected, 'w', fen, 'e4')], fen).length, 1);
});

function harness(settings = {}, trainingCourses = courses, persisted = {}, random = () => 0) {
  const db = {
      courses: trainingCourses,
      reviews: {},
      sessions: [],
      customPractice: { ...config, color: 'w', ...settings },
      settings: { replySpeed: 200 },
      ...persisted,
    },
    state = { view: 'custom' },
    pending = [];
  let board,
    records = 0;
  const trainer = createCustomPractice(() => ({ db, state }), {
    esc: String,
    icon: () => '',
    heading: (...args) => args.join(' '),
    footer: () => '',
    render: () => {},
    renderBoard: () => '',
    stopTimer: () => {
      pending.length = 0;
      state.busy = false;
    },
    schedule: (fn) => pending.push(fn),
    setGame: (b) => {
      board = b;
    },
    sound: () => {},
    animateMove: () => {},
    record: (success, key) => {
      records++;
      db.reviews[key] = recordReview(db.reviews[key], success);
    },
    save: () => {},
    toast: () => {},
    random,
  });
  return {
    db,
    state,
    trainer,
    get board() {
      return board;
    },
    get records() {
      return records;
    },
    pending,
    flush() {
      while (pending.length) pending.shift()();
    },
    move(san) {
      const probe = new Chess(board.fen());
      trainer.attempt(probe.move(san));
    },
  };
}
test('custom controller accepts an alternative branch but requires its whole line, ignoring old move limits', () => {
  globalThis.window = { scrollTo: () => {} };
  const h = harness();
  h.trainer.actions['custom-start']();
  h.move('e4');
  h.flush();
  h.move('Bc4');
  h.flush();
  h.move('d3');
  h.flush();
  assert.equal(h.state.done, false);
  assert.equal(h.board.history().filter((m) => ['e4', 'Bc4', 'd3'].includes(m)).length, 3);
  h.move('Nf3');
  h.flush();
  assert.equal(h.state.done, true);
  const catalog = createMasteryCatalog(courses, h.db.customPractice);
  assert.equal(
    isMastered(h.db.customMastery, catalog.find((v) => v.courseId === 'italian').id),
    true,
  );
  assert.equal(
    isMastered(h.db.customMastery, catalog.find((v) => v.courseId === 'spanish').id),
    false,
  );
  assert.ok(h.trainer.page().includes('Next random line'));
  h.trainer.actions['custom-next']();
  assert.equal(h.state.done, false);
  h.trainer.actions['custom-finish']();
  assert.equal(h.db.sessions.length, 1);
  assert.equal(h.db.sessions[0].kind, 'custom');
  assert.equal(h.db.sessions[0].correct, 4);
  assert.equal(h.db.sessions[0].total, 4);
  assert.equal(h.db.sessions[0].rounds, 1);
  assert.equal(h.records, 4);
  assert.ok(h.db.reviews[positionKey('spanish', courses[0].lines[0].moves[0])]);
  assert.ok(h.db.reviews[positionKey('italian', courses[1].lines[0].moves[0])]);
});
test('a wrong move and repeated hints count once; assisted play is not credited as unaided recall', () => {
  globalThis.window = { scrollTo: () => {} };
  const h = harness();
  h.trainer.actions['custom-start']();
  const fen = h.board.fen();
  h.move('d4');
  assert.equal(h.board.fen(), fen);
  h.trainer.hint();
  h.trainer.hint();
  assert.equal(h.records, 1);
  h.move('e4');
  h.flush();
  h.trainer.actions['custom-finish']();
  assert.equal(h.db.sessions[0].mistakes, 1);
  assert.equal(h.db.sessions[0].correct, 0);
  assert.equal(h.db.sessions[0].total, 1);
  assert.equal(h.db.reviews[positionKey('spanish', courses[0].lines[0].moves[0])].level, 0);
});
test('leaving custom training cancels a queued opponent reply and cannot modify the next screen', () => {
  globalThis.window = { scrollTo: () => {} };
  const h = harness();
  h.trainer.actions['custom-start']();
  h.move('e4');
  const callback = h.pending[0],
    fen = h.board.fen();
  h.trainer.leave();
  callback();
  assert.equal(h.board.fen(), fen);
  assert.equal(h.trainer.isRunning(), false);
  assert.equal(h.state.active, false);
});
test('black automatically receives the recorded white opening move and replays the full variation after a skip', () => {
  globalThis.window = { scrollTo: () => {} };
  const h = harness({ color: 'b' });
  h.trainer.actions['custom-start']();
  h.flush();
  const initial = h.board.fen();
  assert.equal(h.board.turn(), 'b');
  h.move('d5');
  h.flush();
  assert.equal(h.board.history()[2], 'c4');
  h.trainer.actions['custom-skip']();
  h.trainer.actions['custom-next']();
  h.flush();
  assert.equal(h.board.turn(), 'b');
  assert.equal(practicePositionKey(initial), practicePositionKey(h.board.fen()));
  h.trainer.actions['custom-finish']();
  assert.equal(h.db.sessions[0].correct, 1);
});
test('until the end follows a long imported continuation beyond forty full moves', () => {
  globalThis.window = { scrollTo: () => {} };
  const chess = new Chess('4k2r/8/8/8/8/8/8/R3K3 w - - 0 1'),
    seen = new Set([practicePositionKey(chess.fen())]);
  for (let i = 0; i < 100; i++) {
    const candidate = chess
      .moves({ verbose: true })
      .find(
        (m) => !seen.has(practicePositionKey(m.after)) && new Chess(m.after).moves().length > 0,
      );
    assert.ok(candidate);
    chess.move(candidate.san);
    seen.add(practicePositionKey(chess.fen()));
  }
  const long = course('long', 'w', chess.pgn()),
    h = harness({ ids: ['long'], color: 'w', moves: 0 }, [long]);
  h.trainer.actions['custom-start']();
  for (const m of long.lines[0].moves)
    if (m.color === 'w') {
      h.move(m.san);
      h.flush();
    }
  assert.equal(h.state.done, true);
  h.trainer.actions['custom-finish']();
  assert.equal(h.db.sessions[0].total, 50);
});

const shortCourses = [course('king', 'w', '1. e4 e5 *'), course('queen', 'w', '1. d4 d5 *')];
const shortSettings = { ids: ['king', 'queen'], color: 'w' };
const shortCatalog = () => createMasteryCatalog(shortCourses, shortSettings);
const knownLedger = (ids) => ({
  version: 1,
  entries: Object.fromEntries(ids.map((id) => [id, { mastered: true }])),
});

test('victory requires every selected variation; pausing and partial play cannot award it', () => {
  globalThis.window = { scrollTo: () => {} };
  const h = harness(shortSettings, shortCourses);
  h.trainer.actions['custom-start']();
  h.move('e4');
  assert.equal(masteryStats(shortCatalog(), h.db.customMastery).mastered, 0);
  h.flush();
  assert.deepEqual(masteryStats(shortCatalog(), h.db.customMastery), {
    total: 2,
    mastered: 1,
    remaining: 1,
    percent: 50,
    won: false,
  });
  h.trainer.actions['custom-finish']();
  assert.ok(h.trainer.page().includes('Challenge paused'));
  assert.equal(h.db.sessions[0].won, false);
  assert.equal(h.db.sessions[0].pointsDelta, 1);
  h.trainer.actions['custom-start']();
  h.move('d4');
  h.flush();
  assert.equal(h.trainer.isRunning(), false);
  assert.ok(h.trainer.page().includes('Challenge complete'));
  assert.equal(h.db.sessions.at(-1).won, true);
  assert.equal(h.db.sessions.at(-1).mastered, 2);
});

test('failing a previously mastered variation immediately removes exactly one point and survives reload', () => {
  globalThis.window = { scrollTo: () => {} };
  const catalog = shortCatalog();
  const h = harness(shortSettings, shortCourses, {
    customMastery: knownLedger(catalog.map((v) => v.id)),
  });
  h.trainer.actions['custom-verify']();
  h.move('Nf3');
  assert.equal(masteryStats(catalog, h.db.customMastery).mastered, 1);
  h.move('Nf3');
  h.trainer.hint();
  assert.equal(masteryStats(catalog, h.db.customMastery).mastered, 1);
  h.move('e4');
  h.flush();
  assert.equal(isMastered(h.db.customMastery, catalog[0].id), false);
  h.trainer.actions['custom-finish']();
  assert.equal(h.db.sessions[0].pointsDelta, -1);
  assert.equal(h.db.sessions[0].won, false);
  const restored = harness(shortSettings, shortCourses, JSON.parse(JSON.stringify(h.db)));
  restored.trainer.actions['custom-start']();
  restored.move('e4');
  restored.flush();
  assert.equal(masteryStats(catalog, restored.db.customMastery).won, true);
});

test('hint and skip revoke an earned point; completing an assisted round does not return it', () => {
  globalThis.window = { scrollTo: () => {} };
  const only = [shortCourses[0]],
    settings = { ids: ['king'], color: 'w' },
    catalog = createMasteryCatalog(only, settings);
  for (const action of ['custom-hint', 'custom-skip']) {
    const h = harness(settings, only, { customMastery: knownLedger([catalog[0].id]) });
    h.trainer.actions['custom-verify']();
    h.trainer.actions[action]();
    assert.equal(isMastered(h.db.customMastery, catalog[0].id), false);
    if (action === 'custom-hint') {
      h.move('e4');
      h.flush();
      assert.equal(isMastered(h.db.customMastery, catalog[0].id), false);
    }
    h.trainer.actions['custom-next']();
    h.move('e4');
    h.flush();
    assert.equal(masteryStats(catalog, h.db.customMastery).won, true);
  }
});

test('pausing midway through an earned variation retains its point and never double awards it', () => {
  globalThis.window = { scrollTo: () => {} };
  const catalog = shortCatalog(),
    h = harness(shortSettings, shortCourses, {
      customMastery: knownLedger(catalog.map((v) => v.id)),
    });
  h.trainer.actions['custom-verify']();
  h.move('e4');
  h.trainer.actions['custom-finish']();
  h.flush();
  assert.equal(masteryStats(catalog, h.db.customMastery).mastered, 2);
  assert.equal(h.db.sessions[0].pointsDelta, 0);
  h.trainer.actions['custom-verify']();
  h.move('e4');
  h.flush();
  assert.equal(masteryStats(catalog, h.db.customMastery).mastered, 2);
});

test('identical lines share mastery; names, order and clocks do not reset it but changed moves and sides do', () => {
  const a = course('a', 'w', '1. e4 e5 *'),
    b = course('b', 'w', '1. e4 e5 *'),
    c = course('c', 'w', '1. e4 c5 *'),
    black = course('black', 'b', '1. e4 e5 *');
  const catalog = createMasteryCatalog([a, b, c, black], {
    color: 'random',
    ids: ['a', 'b', 'c', 'black'],
  });
  assert.equal(catalog.length, 3);
  assert.deepEqual(catalog[0].sources, ['a', 'b']);
  const renamed = {
    ...a,
    id: 'renamed',
    name: 'A new title',
    lines: [{ ...a.lines[0], name: 'Other', startFen: a.lines[0].startFen.replace('0 1', '7 4') }],
  };
  assert.equal(
    createMasteryCatalog([renamed], { color: 'w', ids: ['renamed'] })[0].id,
    catalog[0].id,
  );
  assert.notEqual(catalog[0].id, catalog[1].id);
  assert.notEqual(catalog[0].id, catalog[2].id);
  const ledger = knownLedger([catalog[0].id]);
  assert.equal(masteryStats(catalog, ledger).mastered, 1);
});

test('mastery drawing prioritizes missing lines, occasionally retests known ones, and avoids repeats', () => {
  const catalog = shortCatalog(),
    ledger = knownLedger([catalog[0].id]);
  assert.equal(pickMasteryVariant(catalog, ledger, null, () => 0).id, catalog[1].id);
  assert.equal(pickMasteryVariant(catalog, ledger, null, () => 0.9).id, catalog[0].id);
  assert.equal(
    pickMasteryVariant(catalog, { entries: {} }, catalog[0].id, () => 0).id,
    catalog[1].id,
  );
  const many = Array.from({ length: 10001 }, (_, i) => ({ id: String(i) })),
    almost = knownLedger(many.slice(1).map((v) => v.id));
  assert.equal(masteryStats(many, almost).won, false);
  assert.equal(masteryStats(many, almost).percent, 99.9);
});

test('a mixed transposition is accepted but cannot certify original decisions that were not played', () => {
  globalThis.window = { scrollTo: () => {} };
  const list = [
    course('a', 'w', '1. Nf3 d5 2. d4 Nf6 3. c4 e6 4. Nc3 *'),
    course('b', 'w', '1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. g3 *'),
  ];
  const settings = { color: 'w', ids: ['a', 'b'] },
    h = harness(settings, list);
  h.trainer.actions['custom-start']();
  for (const san of ['Nf3', 'd4', 'c4', 'g3']) {
    h.move(san);
    h.flush();
  }
  assert.equal(h.state.done, true);
  assert.equal(masteryStats(createMasteryCatalog(list, settings), h.db.customMastery).mastered, 0);
  assert.ok(h.board.history().includes('g3'));
});

test('recorded repeated positions remain finite and the complete PGN is still required', () => {
  globalThis.window = { scrollTo: () => {} };
  const list = [course('repeat', 'w', '1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. e4 e5 *')],
    settings = { ids: ['repeat'], color: 'w' },
    h = harness(settings, list);
  h.trainer.actions['custom-start']();
  for (const san of ['Nf3', 'Ng1', 'Nf3', 'Ng1']) {
    h.move(san);
    h.flush();
  }
  assert.equal(h.state.done, false);
  h.move('e4');
  h.flush();
  assert.equal(masteryStats(createMasteryCatalog(list, settings), h.db.customMastery).won, true);
});

test('subset goals exclude unselected and archived lines without deleting their earned points', () => {
  const catalog = shortCatalog(),
    ledger = knownLedger(catalog.map((v) => v.id));
  const selected = createMasteryCatalog(shortCourses, { ids: ['queen'], color: 'w' });
  assert.equal(masteryStats(selected, ledger).won, true);
  assert.equal(masteryStats(selected, ledger).total, 1);
  const hidden = createMasteryCatalog(
    [{ ...shortCourses[0], archivedAt: 1 }, shortCourses[1]],
    shortSettings,
  );
  assert.equal(hidden.length, 1);
  assert.equal(isMastered(ledger, catalog[0].id), true);
});
