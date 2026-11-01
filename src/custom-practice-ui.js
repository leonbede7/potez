import { Chess } from 'chess.js';
import {
  normalisePracticeConfig,
  eligiblePracticeCourses,
  createPracticePool,
  practiceOptions,
  practiceEdge,
  practicePositionKey,
  practiceReviewKeys,
  choosePracticeReply,
} from './custom-practice.js';
import {
  createMasteryCatalog,
  isMastered,
  masteryStats,
  setMastery,
  pickMasteryVariant,
  initialMasteryCandidates,
  advanceMasteryCandidates,
} from './custom-mastery.js';
import { recordReview } from './model.js';

export function createCustomPractice(context, ui) {
  const {
    esc,
    icon,
    heading,
    footer,
    render,
    renderBoard,
    stopTimer,
    schedule,
    setGame,
    sound,
    animateMove,
    record,
    save,
    toast,
    random = Math.random,
  } = ui;
  let config = normalisePracticeConfig(context().db.customPractice, context().db.courses),
    query = '',
    run = null;
  function ledger() {
    const { db } = context();
    if (
      db.customMastery?.version !== 1 ||
      !db.customMastery.entries ||
      typeof db.customMastery.entries !== 'object' ||
      Array.isArray(db.customMastery.entries)
    )
      db.customMastery = { version: 1, entries: {} };
    return db.customMastery;
  }
  const stats = () => masteryStats(run.variants, ledger());
  function meter(s) {
    return `<div class="mastery-score"><div><span>MASTERED LINES</span><strong>${s.mastered}<small> / ${s.total}</small></strong></div><b>${s.percent}%</b></div><div class="mastery-track" role="progressbar" aria-label="Mastered lines" aria-valuemin="0" aria-valuemax="${s.total || 1}" aria-valuenow="${s.mastered}"><span style="width:${s.percent}%"></span></div><p class="mastery-remaining">${s.won ? 'Every selected line is mastered.' : `Still ${s.remaining} left to master. Each line is worth 1 point.`}</p>`;
  }
  const options = () =>
    run?.round ? practiceOptions(run.pool, run.round.color, run.round.game.fen()) : [];
  const visible = () =>
    eligiblePracticeCourses(context().db.courses, config).filter((c) =>
      c.name.toLocaleLowerCase('en').includes(query.toLocaleLowerCase('en')),
    );
  function refresh() {
    const list = document.querySelector('.custom-course-list'),
      scroll = list?.scrollTop || 0,
      focus = document.activeElement?.id,
      caret = document.activeElement?.selectionStart;
    render();
    const next = document.querySelector('.custom-course-list');
    if (next) next.scrollTop = scroll;
    if (focus) {
      const el = document.getElementById(focus);
      el?.focus({ preventScroll: true });
      if (el?.type === 'search' && caret != null) el.setSelectionRange(caret, caret);
    }
  }
  function persist() {
    context().db.customPractice = { ...config, ids: [...config.ids] };
    save();
  }
  function setup() {
    const courses = visible(),
      eligible = eligiblePracticeCourses(context().db.courses, config),
      selected = eligible.filter((c) => config.ids.includes(c.id)),
      progress = masteryStats(createMasteryCatalog(context().db.courses, config), ledger());
    return (
      heading(
        'MASTERY CHALLENGE',
        'Build a challenge',
        'Choose repertoires and a side. Master every line to reach 100%.',
        'custom-start',
        'Continue challenge',
      ) +
      `<div class="custom-setup"><section class="white-panel custom-config"><h2>1. Choose your side</h2><div class="custom-colors" role="group" aria-label="Challenge side">${[
        ['w', 'White', 'wK'],
        ['b', 'Black', 'bK'],
        ['random', 'Random', 'wN'],
      ]
        .map(
          ([color, label, piece]) =>
            `<button class="${config.color === color ? 'selected' : ''}" data-action="custom-color" data-color="${color}" aria-pressed="${config.color === color}"><img src="pieces/${piece}.svg" alt=""/>${label}</button>`,
        )
        .join(
          '',
        )}</div><p class="help-text">Random chooses between the available sides. Each repertoire uses its saved training side.</p><h2>2. Reach 100%</h2><div class="mastery-rules"><p><strong>+1 point</strong> for a complete line without mistakes or hints.</p><p><strong>−1 point</strong> if you miss, request a hint or skip an already mastered line.</p><p>Most rounds target unfinished lines. Occasional retests check your earned points. After a mistake, finish for practice and retry in a new round.</p></div>${meter(progress)}<div class="custom-selection-summary"><strong>${selected.length}</strong><span>selected repertoires</span></div><button class="btn primary custom-start" data-action="custom-start" ${selected.length ? '' : 'disabled'}>${icon('play')}Continue challenge</button><p class="help-text">Each round starts at the beginning of a recorded PGN line, including its FEN. Identical lines count once. Progress is saved between visits.</p></section><section class="white-panel custom-selection"><div class="section-top"><h2>3. Choose repertoires</h2><span class="small-tag">${selected.length} SELECTED</span></div><div class="search-field">${icon('search')}<input class="input" id="custom-search" type="search" aria-label="Search challenge repertoires" placeholder="Search openings…" value="${esc(query)}"/></div><div class="custom-selection-tools"><button class="text-btn" data-action="custom-all">Select visible</button><button class="text-btn" data-action="custom-clear">Clear selection</button></div><div class="custom-course-list">${courses.length ? courses.map((c, i) => `<label class="custom-course-option"><input type="checkbox" id="custom-course-${i}" data-custom-course="${esc(c.id)}" ${config.ids.includes(c.id) ? 'checked' : ''}/><img src="pieces/${c.color}${c.symbol || 'N'}.svg" alt=""/><span><strong>${esc(c.name)}</strong><small>${c.color === 'w' ? 'White' : 'Black'} · ${c.lines.length} lines${c.part === 2 ? ' · Part 2' : ''}</small></span></label>`).join('') : '<p class="help-text">No matching repertoires. Change the side or search, or import a PGN.</p>'}</div></section></div>` +
      footer()
    );
  }
  function panel() {
    const { state } = context(),
      r = run.round,
      edges = options(),
      done = r.done;
    const text =
      state.status === 'wrong'
        ? 'This move is outside the selected repertoire.'
        : done
          ? 'Line complete'
          : state.busy
            ? 'Opponent to move'
            : 'Your move';
    const status = r.clean
      ? isMastered(ledger(), r.target.id)
        ? 'Retesting a mastered line'
        : 'Playing for a new point'
      : 'Practice round · no point available';
    return `<section class="training-panel custom-panel" aria-label="Mastery trainer"><div class="panel-heading"><div class="panel-kicker">${icon('swords')}MASTERY CHALLENGE<span class="custom-round-number">Round ${run.number}</span></div><div class="opening-title"><h2>${esc(r.source.courseName)}</h2></div><p class="opening-subtitle">Playing ${r.color === 'w' ? 'White' : 'Black'} · full line</p><p class="custom-branch">${esc(r.target.name)}</p>${meter(stats())}<span class="mastery-round-status ${r.clean ? '' : 'dirty'}">${icon(r.clean ? 'shield-check' : 'rotate-ccw')}${status}</span></div><div class="training-body" aria-live="polite"><div class="session-strip"><span>My moves: ${r.own}</span><strong>Round points: ${r.delta > 0 ? '+' : ''}${r.delta}</strong></div><div class="prompt ${state.status === 'wrong' ? 'error' : ''}"><div class="prompt-icon">${icon(done ? 'check' : state.status === 'wrong' ? 'rotate-ccw' : 'move-up-right')}</div><div><h3>${text}</h3><p>${done ? esc(r.reason) : !r.clean ? 'Finish for practice. A new clean round can recover the point.' : 'Play all your moves without a hint to earn the point.'}</p></div></div>${state.hint && !done ? `<div class="coach-comment"><strong>Recorded continuations</strong><p>${edges.map((e) => esc(e.san)).join(' · ')}</p></div>` : ''}${!done && !state.busy ? `<p class="custom-options-note">${edges.length > 1 ? 'Accepted moves: ' + edges.length + '. Choosing another branch switches the active line.' : 'The opponent follows your chosen branch.'}</p>` : ''}${!r.candidates.length ? '<p class="custom-options-note">This path combines different recorded lines. It is accepted for practice; mastery requires one complete PGN line.</p>' : ''}<details class="custom-move-history"><summary>Show moves played</summary><p>${r.history.length ? r.history.map((m, i) => `${m.color === 'w' || i === 0 ? m.before.split(' ')[5] + (m.color === 'w' ? '. ' : '… ') : ''}${esc(m.san)}`).join(' ') : 'No moves played.'}</p></details><div class="panel-actions">${done ? `<button class="btn primary" data-action="custom-next">${icon('arrow-right')}Next random line</button>` : `<button class="btn" data-action="custom-hint" ${state.busy ? 'disabled' : ''}>${icon('lightbulb')}Hint · forfeit point</button><button class="text-btn" data-action="custom-skip" ${state.busy ? 'disabled' : ''}>Skip line</button>`}</div><button class="text-btn custom-finish" data-action="custom-finish">Save and pause</button></div><div class="panel-footer">${icon('brain')}An error, hint or skip removes this line’s earned point.</div></section>`;
  }
  function summary() {
    const s = stats(),
      remaining = run.variants.filter((v) => !isMastered(ledger(), v.id)),
      delta = s.mastered - run.initialMastered;
    return (
      heading(
        'MASTERY CHALLENGE',
        s.won ? 'Challenge complete' : 'Challenge paused',
        s.won
          ? 'Every selected line has been played in full without mistakes or hints.'
          : 'Progress saved. Complete every line to reach 100%.',
        'custom-reset',
        'Change selection',
      ) +
      `<section class="white-panel custom-results"><span class="completion-emblem">${icon(s.won ? 'trophy' : 'pause')}</span>${meter(s)}<div class="completion-stats"><div><strong>${delta > 0 ? '+' : ''}${delta}</strong><small>point change</small></div><div><strong>${run.completed}</strong><small>rounds played</small></div><div><strong>${run.mistakes}</strong><small>missed positions</small></div></div><p>${s.won ? 'Keep retesting if you want. A mistake removes a point and reopens the challenge.' : 'Unfinished lines take priority. Mastered lines return occasionally for a retest.'}</p><button class="btn primary" data-action="${s.won ? 'custom-verify' : 'custom-start'}">${s.won ? 'Keep retesting' : 'Continue challenge'}${icon('play')}</button><button class="text-btn" data-action="custom-reset">Change selection</button>${
        remaining.length
          ? `<details class="mastery-pending"><summary>Remaining lines (${remaining.length})</summary><ul>${remaining
              .slice(0, 50)
              .map(
                (v) => `<li><strong>${esc(v.name)}</strong><span>${esc(v.courseName)}</span></li>`,
              )
              .join(
                '',
              )}</ul>${remaining.length > 50 ? '<p>Showing the first 50. All remaining lines are included in round selection.</p>' : ''}</details>`
          : ''
      }</section>` +
      footer()
    );
  }
  function page() {
    if (!run) return setup();
    if (run.finished) return summary();
    return (
      heading(
        'MASTERY CHALLENGE',
        'Mastery challenge',
        'One clean line, one point. Reach 100% across your selection.',
        'custom-finish',
        'Save and pause',
      ) +
      `<div class="workspace">${renderBoard({ boardGame: run.round.game, boardCourse: { color: run.round.color, eco: 'CUSTOM' }, boardExpected: context().state.hint ? options()[0]?.move || null : null, boardManual: false })}${panel()}</div>` +
      footer()
    );
  }
  function credit(edges, fen, success) {
    const { db } = context(),
      keys = practiceReviewKeys(edges, fen);
    if (!keys.length) return;
    for (const key of keys.slice(1)) db.reviews[key] = recordReview(db.reviews[key], success);
    record(success, keys[0]);
  }
  function fail(reason = 'error') {
    const r = run.round,
      key = practicePositionKey(r.game.fen());
    r.clean = false;
    if (!r.revoked.has(r.target.id)) {
      r.revoked.add(r.target.id);
      const delta = setMastery(ledger(), r.target.id, false, reason);
      r.delta += delta;
      if (delta < 0) toast('−1 point · Replay this line without mistakes to recover it.');
      save();
    }
    if (r.failed.has(key)) return;
    r.failed.add(key);
    run.mistakes++;
    credit(options(), r.game.fen(), false);
  }
  function play(edge) {
    const { state } = context(),
      r = run.round,
      before = r.game.fen(),
      played = r.game.move(edge.san);
    const ply = r.history.length;
    r.candidates = advanceMasteryCandidates(r.candidates, ply, edge.san);
    if (!r.candidates.some((v) => v.id === r.target.id)) {
      const candidates = r.candidates.filter((v) => v.moves.length > ply + 1);
      r.target =
        candidates.find((v) => !isMastered(ledger(), v.id)) ||
        candidates[0] ||
        r.candidates[0] ||
        r.target;
    }
    for (const variant of r.candidates)
      if (variant.moves.length === ply + 1) r.completedVariants.set(variant.id, variant);
    const ref = edge.refs.get(r.source.courseId) || edge.refs.values().next().value;
    r.source = ref;
    if (r.candidates.length)
      r.source = {
        courseId: r.target.courseId,
        courseName: r.target.courseName,
        lineName: r.target.name,
      };
    const move = { ...played, before, after: r.game.fen(), comment: ref.move.comment || '' };
    r.history.push(move);
    state.lastMove = move;
    state.selected = null;
    state.hint = false;
    r.visits.set(
      practicePositionKey(r.game.fen()),
      (r.visits.get(practicePositionKey(r.game.fen())) || 0) + 1,
    );
    return move;
  }
  function finishRound(reason, skipped = false) {
    stopTimer();
    const { state } = context(),
      r = run.round;
    if (r.done) return;
    if (r.clean && !skipped) {
      for (const variant of r.completedVariants.values())
        r.delta += setMastery(ledger(), variant.id, true, 'complete clean line');
      reason = r.completedVariants.size
        ? r.delta > 0
          ? `+${r.delta} point · Complete line played without mistakes.`
          : 'Mastered line confirmed.'
        : 'Mixed path complete. No full PGN line was certified.';
    } else if (!skipped)
      reason =
        'Practice complete. Replay the full line without mistakes or hints to earn its point.';
    r.done = true;
    r.reason = reason;
    run.completed++;
    state.done = true;
    state.busy = false;
    state.hint = false;
    save();
    if (stats().won) {
      finish();
      sound('complete');
      return;
    }
    render();
    sound(r.clean ? 'complete' : 'move');
  }
  function advance() {
    if (!run || run.finished || run.round.done) return;
    const { state, db } = context(),
      r = run.round;
    if (r.completedVariants.has(r.target.id)) return finishRound('Full line complete.');
    if (!r.candidates.length && (r.visits.get(practicePositionKey(r.game.fen())) || 0) >= 3)
      return finishRound('Position repeated. Start another round.');
    if (!options().length) return finishRound('End of recorded continuations.');
    if (r.game.turn() === r.color) {
      state.busy = false;
      render();
      return;
    }
    state.busy = true;
    render();
    const current = run;
    schedule(() => {
      if (run !== current || run.round !== r || run.finished || r.done) return;
      const planned = r.candidates.find((v) => v.id === r.target.id)?.moves[r.history.length];
      const edge =
        (planned && practiceEdge(run.pool, r.color, r.game.fen(), planned.san)) ||
        choosePracticeReply(run.pool, r.color, r.game.fen(), random);
      if (!edge) return finishRound('End of line.');
      const move = play(edge);
      state.busy = false;
      state.status = 'idle';
      render();
      animateMove(move);
      sound(move.captured ? 'capture' : 'move');
      advance();
    }, db.settings.replySpeed);
  }
  function next() {
    stopTimer();
    const { state } = context(),
      target = pickMasteryVariant(run.variants, ledger(), run.round?.target.id, random);
    if (!target) return finish();
    run.number++;
    run.round = {
      target,
      color: target.color,
      game: new Chess(target.startFen),
      source: { courseId: target.courseId, courseName: target.courseName, lineName: target.name },
      own: 0,
      history: [],
      clean: true,
      delta: 0,
      candidates: initialMasteryCandidates(run.variants, target),
      completedVariants: new Map(),
      revoked: new Set(),
      failed: new Set(),
      visits: new Map([[practicePositionKey(target.startFen), 1]]),
      done: false,
    };
    setGame(run.round.game);
    state.view = 'custom';
    state.mode = 'train';
    state.manual = false;
    state.active = true;
    state.done = false;
    state.hint = false;
    state.selected = null;
    state.lastMove = null;
    state.status = 'idle';
    state.flipped = false;
    advance();
  }
  function start(verify = false) {
    stopTimer();
    const { db, state } = context();
    config = normalisePracticeConfig(config, db.courses);
    const variants = createMasteryCatalog(db.courses, config);
    if (!variants.length) {
      toast('Choose at least one repertoire for this side.');
      return;
    }
    const pool = createPracticePool(db.courses, config);
    if (run && !run.finished) finish(false);
    persist();
    run = {
      pool,
      variants,
      initialMastered: masteryStats(variants, ledger()).mastered,
      config: { ...config, ids: pool.groups.map((g) => g.courseId) },
      number: 0,
      completed: 0,
      skipped: 0,
      total: 0,
      correct: 0,
      mistakes: 0,
      startedAt: Date.now(),
      finished: false,
    };
    state.focus = false;
    if (stats().won && !verify) finish();
    else next();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function attempt(candidate) {
    if (!run || run.finished || run.round.done) return;
    const { state } = context(),
      r = run.round;
    if (state.busy || r.game.turn() !== r.color) return;
    const before = r.game.fen(),
      edge = practiceEdge(run.pool, r.color, before, candidate.san);
    if (!edge) {
      fail();
      state.status = 'wrong';
      state.selected = null;
      sound('error');
      render();
      return;
    }
    run.total++;
    r.own++;
    if (!r.failed.has(practicePositionKey(before))) {
      run.correct++;
      credit([edge], before, true);
    }
    const move = play(edge);
    state.status = 'correct';
    state.busy = true;
    render();
    animateMove(move);
    sound(move.captured ? 'capture' : 'move');
    const current = run;
    schedule(() => {
      if (run !== current || run.finished || r.done) return;
      state.busy = false;
      state.status = 'idle';
      advance();
    }, 350);
  }
  function hint() {
    if (!run || run.finished || run.round.done || context().state.busy) return;
    fail('hint');
    context().state.hint = true;
    sound('hint');
    render();
  }
  function finish(show = true) {
    if (!run || run.finished) return;
    stopTimer();
    run.finished = true;
    const { db, state } = context();
    state.active = false;
    state.done = true;
    if (run.total || run.mistakes)
      db.sessions = [
        ...db.sessions,
        {
          kind: 'custom',
          courseId: run.round?.source.courseId,
          courseIds: run.config.ids,
          mode: 'train',
          total: run.total,
          correct: run.correct,
          mistakes: run.mistakes,
          bestCombo: 0,
          rounds: run.completed,
          mastered: stats().mastered,
          variantTotal: stats().total,
          won: stats().won,
          pointsDelta: stats().mastered - run.initialMastered,
          endedAt: Date.now(),
          duration: Date.now() - run.startedAt,
        },
      ].slice(-200);
    save();
    if (show) render();
  }
  function leave() {
    finish(false);
    run = null;
    context().state.done = false;
  }
  function change(el) {
    if (el.dataset.customCourse) {
      const set = new Set(config.ids);
      el.checked ? set.add(el.dataset.customCourse) : set.delete(el.dataset.customCourse);
      config.ids = [...set];
    } else if (el.id === 'custom-rounds') config.rounds = Number(el.value);
    else if (el.id === 'custom-moves') config.moves = Number(el.value);
    else return false;
    persist();
    refresh();
    return true;
  }
  function input(el) {
    if (el.id !== 'custom-search') return false;
    query = el.value;
    refresh();
    return true;
  }
  const actions = {
    'custom-start': () => start(),
    'custom-verify': () => start(true),
    'custom-next': () => {
      if (run?.round.done && !run.finished) next();
    },
    'custom-finish': () => finish(),
    'custom-reset': () => {
      leave();
      config = normalisePracticeConfig(context().db.customPractice, context().db.courses);
      render();
    },
    'custom-color': (el) => {
      config.color = el.dataset.color;
      persist();
      refresh();
    },
    'custom-all': () => {
      config.ids = [...new Set([...config.ids, ...visible().map((c) => c.id)])];
      persist();
      refresh();
    },
    'custom-clear': () => {
      config.ids = [];
      persist();
      refresh();
    },
    'custom-hint': hint,
    'custom-skip': () => {
      if (run && !run.finished && !run.round.done && !context().state.busy) {
        run.skipped++;
        fail('preskakanje');
        finishRound('Line skipped. Replay it to earn mastery.', true);
      }
    },
  };
  return {
    page,
    attempt,
    hint,
    leave,
    change,
    input,
    actions,
    isRunning: () => Boolean(run && !run.finished),
    enter: () => {
      config = normalisePracticeConfig(context().db.customPractice, context().db.courses);
    },
  };
}
