import './styles.css';
import './studio.css';
import './study.css';
import './custom-practice.css';
import './app.css';
import { Chess } from 'chess.js';
import {
  createIcons,
  Grid2x2,
  LibraryBig,
  Repeat2,
  ChartNoAxesCombined,
  Sun,
  CircleHelp,
  ChevronsUpDown,
  ChevronRight,
  Settings2,
  Plus,
  CircleCheck,
  Flame,
  Target,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  RefreshCw,
  Volume2,
  VolumeX,
  MousePointer2,
  ChevronDown,
  Sprout,
  BookOpen,
  Swords,
  GitBranch,
  RotateCcw,
  Check,
  MoveUpRight,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Lightbulb,
  Square,
  Play,
  NotebookPen,
  PartyPopper,
  Search,
  PencilLine,
  Download,
  Upload,
  Leaf,
  HardDrive,
  X,
  Undo2,
} from 'lucide';
import { starterCourses, pieceNames } from './data.js';
import {
  MAX_PGN_BYTES,
  MAX_PGN_LABEL,
  parseRepertoire,
  positionKey,
  getPositions,
  courseStats,
  recordReview,
  chooseLine,
  matchingLines,
  dateKey,
  streakCount,
} from './model.js';

import { createStorage } from './storage.js';
import { parseInBackground } from './import-pgn.js';
import {
  normaliseSettings,
  trainingPlyLimit,
  nextTrainingLine,
  archiveCourse,
  courseTrainingSettings,
} from './studio.js';
import { createStudioUI } from './studio-ui.js';
import { createSoundPlayer } from './sounds.js';
import { installStudyPack } from './study-pack.js';
import { createStudyUI } from './study-ui.js';
import { createCustomPractice } from './custom-practice-ui.js';
import {
  Maximize2,
  Minimize2,
  Moon,
  SlidersHorizontal,
  Palette,
  Headphones,
  Trophy,
  Archive,
  History,
  Crosshair,
  MoreHorizontal,
  Keyboard,
  Timer,
  PanelLeftClose,
  Pause,
  ShieldCheck,
  Github,
} from 'lucide';

async function boot() {
  const persistence = createStorage();
  let importBusy = false;
  const icons = {
    Github,
    Maximize2,
    Minimize2,
    Moon,
    SlidersHorizontal,
    Palette,
    Headphones,
    Trophy,
    Archive,
    History,
    Crosshair,
    MoreHorizontal,
    Keyboard,
    Timer,
    PanelLeftClose,
    Pause,
    ShieldCheck,
    Grid2x2,
    LibraryBig,
    Repeat2,
    ChartNoAxesCombined,
    Sun,
    CircleHelp,
    ChevronsUpDown,
    ChevronRight,
    Settings2,
    Plus,
    CircleCheck,
    Flame,
    Target,
    ChevronsLeft,
    ChevronLeft,
    ChevronsRight,
    RefreshCw,
    Volume2,
    VolumeX,
    MousePointer2,
    ChevronDown,
    Sprout,
    BookOpen,
    Swords,
    GitBranch,
    RotateCcw,
    Check,
    MoveUpRight,
    ArrowRight,
    ArrowUpRight,
    Brain,
    Lightbulb,
    Square,
    Play,
    NotebookPen,
    PartyPopper,
    Search,
    PencilLine,
    Download,
    Upload,
    Leaf,
    HardDrive,
    X,
    Undo2,
  };

  const $ = (s) => document.querySelector(s);
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const variants = (n) => `${n} ${n === 1 ? 'line' : 'lines'}`;
  const positions = (n) => `${n} ${n === 1 ? 'position' : 'positions'}`;
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  let db;
  let storageIssue = false;
  try {
    db = await persistence.load();
  } catch {
    storageIssue = true;
  }
  if (!db || !Array.isArray(db.courses) || !db.reviews || !db.activity)
    db = {
      courses: starterCourses.map((c) => ({ ...c, lines: parseRepertoire(c.pgn) })),
      reviews: {},
      activity: {},
      notes: {},
      settings: normaliseSettings(),
      lastCourse: 'italian',
    };
  db.settings = normaliseSettings(db.settings);
  db.notes ||= {};
  if (!Array.isArray(db.sessions)) db.sessions = [];
  if (!db.studyPackVersion)
    $('#app').innerHTML =
      '<div class="boot-status"><img src="favicon.svg" alt=""/><p>Loading study library…</p></div>';
  await installStudyPack(db, parseInBackground);
  const state = {
    focus: false,
    libraryArchived: false,
    lineSearch: '',
    view: 'studio',
    studyPart: db.studyViewPart || 2,
    courseId: db.lastCourse || db.courses[0]?.id,
    mode: 'train',
    lineIndex: 0,
    ply: 4,
    selected: null,
    flipped: false,
    active: false,
    busy: false,
    done: false,
    hint: false,
    status: 'idle',
    message: '',
    lastMove: null,
    wrongSquare: null,
    filter: 'all',
    search: '',
    session: {
      correct: 0,
      total: 0,
      mistakes: 0,
      failed: new Set(),
      assisted: new Set(),
      reviewKeys: null,
    },
    manual: false,
    manualColor: 'w',
    manualName: '',
    manualGame: null,
  };
  let game = new Chess();
  let autoTimer, toastTimer;
  const audio = createSoundPlayer(() => db.settings);
  const activeCourses = () =>
    db.courses
      .filter((c) => !c.archivedAt)
      .sort((a, b) => (a.studyPriority || 999) - (b.studyPriority || 999));
  const course = () => activeCourses().find((c) => c.id === state.courseId) || activeCourses()[0];
  const line = () => course()?.lines[state.lineIndex] || course()?.lines[0];
  const activeSettings = () =>
    state.active || state.done
      ? state.session.settings || courseTrainingSettings(course(), db.settings)
      : courseTrainingSettings(course(), db.settings);
  const expected = () =>
    state.active && state.ply >= trainingPlyLimit(line(), activeSettings())
      ? undefined
      : line()?.moves[state.ply];
  const studyUI = createStudyUI({ esc, icon, heading, footer, context: () => ({ db, state }) });
  const studioUI = createStudioUI(
    () => ({
      db,
      state,
      course: course(),
      line: line(),
      activeCourses: activeCourses(),
      studyBanner: studyUI.banner,
    }),
    { icon, esc, heading, footer, renderCourse },
  );
  const customUI = createCustomPractice(() => ({ db, state }), {
    icon,
    esc,
    heading,
    footer,
    render,
    renderBoard,
    stopTimer,
    schedule: (fn, ms) => {
      autoTimer = setTimeout(fn, ms);
    },
    setGame: (b) => {
      game = b;
    },
    sound,
    animateMove,
    record,
    save,
    toast,
  });
  async function save() {
    try {
      await persistence.save(db);
      storageIssue = false;
      return true;
    } catch {
      storageIssue = true;
      const indicator = $('.save-indicator');
      if (indicator) indicator.textContent = 'Save failed';
      toast('Could not save. Check browser storage or export a backup.');
      return false;
    }
  }
  function stopTimer() {
    clearTimeout(autoTimer);
    state.busy = false;
  }
  function resetPosition(ply = 0) {
    stopTimer();
    const l = line();
    if (!l) return;
    game = new Chess(l.startFen);
    state.ply = Math.min(ply, l.moves.length);
    for (const m of l.moves.slice(0, state.ply)) game.move(m.san);
    state.selected = null;
    state.hint = false;
    state.lastMove = state.ply ? l.moves[state.ply - 1] : null;
    state.status = 'idle';
    state.message = '';
  }
  resetPosition(4);
  function sound(event = true) {
    audio.play(typeof event === 'string' ? event : event ? 'move' : 'error');
  }
  function animateMove(move) {
    if (!move || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = $('[data-square="' + move.from + '"]'),
      to = $('[data-square="' + move.to + '"]');
    const piece = to?.querySelector('img');
    if (!piece || !from) return;
    const a = from.getBoundingClientRect(),
      b = to.getBoundingClientRect();
    piece.animate(
      [
        { transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px)' },
        { transform: 'translate(0,0)' },
      ],
      { duration: 190, easing: 'cubic-bezier(.2,.7,.3,1)' },
    );
  }
  function toast(message, undoId) {
    $('.toast')?.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span>' +
      esc(message) +
      '</span>' +
      (undoId
        ? '<button data-action="restore-course" data-id="' + esc(undoId) + '">Restore</button>'
        : '');
    document.body.append(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), undoId ? 6500 : 4200);
  }
  function totals() {
    return activeCourses().reduce(
      (a, c) => {
        const s = courseStats(c, db.reviews);
        a.total += s.total;
        a.learned += s.learned;
        a.due += s.due;
        return a;
      },
      { total: 0, learned: 0, due: 0 },
    );
  }
  function activity() {
    return db.activity[dateKey()] || { correct: 0, total: 0 };
  }
  function navItem(view, name, i, badge = '') {
    return `<button class="nav-item ${state.view === view ? 'active' : ''}" data-action="nav" data-view="${view}" ${state.view === view ? 'aria-current="page"' : ''}>${icon(i)}<span>${name}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ''}</button>`;
  }
  function render() {
    const focusedSquare = document.activeElement?.dataset?.square;
    const t = totals(),
      a = activity();
    const titles = {
      studio: 'Opening practice',
      library: 'Repertoires',
      review: 'Review',
      progress: 'Progress',
      plan: 'Study guide',
      custom: 'Mastery challenge',
    };
    $('#app').innerHTML =
      `<div class="app-shell view-${state.view} ${state.active ? 'session-active' : ''} ${state.focus ? 'is-focused' : ''}">
    <aside class="sidebar" aria-label="Main navigation"><a class="brand" href="#" data-action="nav" data-view="studio"><img src="favicon.svg" alt=""/><span class="brand-word">potez<span>.</span></span></a><div class="brand-sub">OPENING TRAINER</div><div class="nav-caption">WORKSPACE</div><nav class="nav-list">${navItem('studio', 'Practice', 'grid-2x2')}${navItem('custom', 'Challenge', 'swords')}${navItem('library', 'Repertoires', 'library-big')}${navItem('plan', 'Study guide', 'book-open')}${navItem('review', 'Review', 'repeat-2', t.due || '')}${navItem('progress', 'Progress', 'chart-no-axes-combined')}</nav><div class="sidebar-lower"><div class="sidebar-shortcuts"><span>SHORTCUTS</span><p><kbd>F</kbd> Flip board <kbd>H</kbd> Hint</p></div><button class="sidebar-help" data-action="help">${icon('circle-help')}<span>How to use Potez</span></button><a class="project-credit" href="https://github.com/leonbede7/potez" target="_blank" rel="noopener"><span class="author-monogram">LB</span><span><strong>Leon Bede</strong><small>View project on GitHub</small></span>${icon('arrow-up-right')}</a></div></aside>
    <a class="skip-link" href="#main-content">Skip to content</a><main class="main" id="main-content"><header class="topbar"><div class="mobile-brand"><img src="favicon.svg" alt=""/>potez.</div><div class="breadcrumbs"><span>Potez</span> ${icon('chevron-right')}<span>${titles[state.view]}</span></div><div class="topbar-right"><button class="btn focus-button ${state.focus ? 'selected' : ''}" data-action="focus">${icon(state.focus ? 'minimize-2' : 'maximize-2')}${state.focus ? 'Exit focus' : 'Focus'}</button><button class="icon-btn" data-action="appearance" aria-label="Toggle light or dark appearance">${icon(db.settings.appearance === 'light' ? 'moon' : 'sun')}</button><span class="save-indicator"><span class="status-dot"></span>${storageIssue ? 'Storage unavailable' : 'Saved locally'}</span><button class="icon-btn" data-action="settings" aria-label="Settings">${icon('settings-2')}</button><a class="source-link icon-btn" href="https://github.com/leonbede7/potez" target="_blank" rel="noopener" aria-label="Source code on GitHub">${icon('github')}</a></div></header>
    <div class="content">${state.view === 'custom' ? customUI.page() : state.view === 'plan' ? studyUI.page() : state.view === 'library' ? renderLibrary() : state.view === 'progress' ? renderProgress() : renderStudio(t, a)}</div></main></div>`;
    applyTheme();
    document.body.classList.toggle('focus-active', state.focus);
    createIcons({ icons });
    if (focusedSquare) $(`[data-square="${focusedSquare}"]`)?.focus({ preventScroll: true });
  }
  function heading(kicker, title, description, action = 'import', label = 'Import PGN') {
    return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div><button class="btn" data-action="${action}">${icon('plus')}${label}</button></div>`;
  }
  function statsMarkup(t, a) {
    return studioUI.stats(t, a);
  }
  function renderStudio(t, a) {
    const c = course();
    return (
      heading(
        state.view === 'review' ? 'REVIEW' : 'PRACTICE',
        state.view === 'review' ? 'Review due positions' : 'Opening practice',
        state.view === 'review'
          ? `${t.due} positions are due for review.`
          : 'Play your repertoire. Recall the moves. Understand the position.',
      ) +
      `<div class="practice-status"><span>${t.due ? `${t.due} positions due` : 'No reviews due'}</span><button class="text-btn" data-action="training-settings">Today ${a.total}/${db.settings.goal} moves${icon('sliders-horizontal')}</button></div>` +
      (c
        ? `<div class="workspace">${renderBoard()}${renderPanel()}</div><div class="section-title"><h2>Repertoires <span>Recently opened</span></h2><button class="text-btn" data-action="nav" data-view="library">All openings ${icon('arrow-up-right')}</button></div><div class="course-grid">${[
            c,
            ...activeCourses().filter((item) => item.id !== c.id),
          ]
            .slice(0, 3)
            .map((c) => renderCourse(c))
            .join('')}</div>`
        : `<div class="empty-state">${icon('library-big')}<h2>No repertoires yet</h2><p>Import a PGN or build a line on the board.</p><button class="btn primary" data-action="import">Import PGN</button></div>`) +
      footer()
    );
  }
  function renderBoard({
    boardGame = game,
    boardCourse = course(),
    boardExpected = expected(),
    boardManual = state.manual,
  } = {}) {
    const c = boardCourse,
      manual = boardManual,
      b = manual ? state.manualGame : boardGame;
    const isBlack = ((manual ? state.manualColor : c?.color) === 'b') !== state.flipped;
    const files = isBlack ? 'hgfedcba' : 'abcdefgh',
      ranks = isBlack ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const legal = state.selected ? b.moves({ square: state.selected, verbose: true }) : [];
    const e = boardExpected;
    let squares = '';
    for (const [ri, rank] of ranks.entries())
      for (const [fi, file] of [...files].entries()) {
        const sq = file + rank,
          p = b.get(sq),
          dark = (file.charCodeAt(0) - 97 + rank) % 2 === 0,
          isLegal = legal.some((m) => m.to === sq);
        const pn = p ? `${p.color === 'w' ? 'white' : 'black'} ${pieceNames[p.type]}` : 'empty';
        squares += `<button class="square ${dark ? 'dark' : ''} ${state.lastMove && (sq === state.lastMove.from || sq === state.lastMove.to) ? 'last' : ''} ${state.selected === sq ? 'selected' : ''} ${state.hint && e?.from === sq ? 'hint' : ''} ${state.wrongSquare === sq ? 'wrong' : ''}" data-square="${sq}" aria-label="${sq}, ${pn}" ${p ? 'draggable="true"' : ''}>${db.settings.coordinates && fi === 0 ? `<span class="rank">${rank}</span>` : ''}${db.settings.coordinates && ri === 7 ? `<span class="file">${file}</span>` : ''}${p ? `<img src="pieces/${p.color}${p.type.toUpperCase()}.svg" alt="" draggable="false"/>` : ''}${isLegal ? `<span class="legal-dot ${p ? 'capture' : ''}"></span>` : ''}</button>`;
      }
    let arrow = '';
    if (!manual && e && (state.hint || (state.mode === 'learn' && state.active))) {
      const coord = (s) => [
        ([...files].indexOf(s[0]) + 0.5) * 100,
        (ranks.indexOf(Number(s[1])) + 0.5) * 100,
      ];
      const [x1, y1] = coord(e.from),
        [x2, y2] = coord(e.to);
      arrow = `<svg class="board-arrow" viewBox="0 0 800 800" aria-hidden="true"><defs><marker id="arrowhead" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 Z" fill="#d9e993"/></marker></defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d9e993" stroke-width="13" opacity=".9" marker-end="url(#arrowhead)" stroke-linecap="round"/></svg>`;
    }
    return `<section class="board-section" aria-label="Interactive chessboard"><div class="board-topline"><span class="player-label"><span class="side-disc ${isBlack ? 'white' : ''}"></span>${isBlack ? 'White pieces' : 'Black pieces'}</span><span class="small-tag">${manual ? 'YOUR LINE' : esc(c?.eco || 'PGN')} · ${manual ? 'EDITING' : state.active ? 'PRACTICING' : 'OPENING'}</span></div><div class="board-frame"><div class="board" aria-label="Chessboard">${squares}</div>${arrow}</div><div class="board-footer"><span class="player-label"><span class="side-disc ${isBlack ? '' : 'white'}"></span>${isBlack ? 'Black pieces' : 'White pieces'} <span class="small-tag">${manual ? 'EDITOR' : 'YOU'}</span></span><div class="board-controls"><button class="icon-btn" data-action="${manual ? 'manual-undo' : 'first'}" aria-label="Starting position" ${state.active ? 'disabled' : ''}>${icon('chevrons-left')}</button><button class="icon-btn" data-action="${manual ? 'manual-undo' : 'prev'}" aria-label="Previous move" ${state.active ? 'disabled' : ''}>${icon('chevron-left')}</button><button class="icon-btn" data-action="next" aria-label="Next move" ${state.active || manual ? 'disabled' : ''}>${icon('chevron-right')}</button><button class="icon-btn" data-action="last" aria-label="Final position" ${state.active || manual ? 'disabled' : ''}>${icon('chevrons-right')}</button><button class="icon-btn" data-action="flip" aria-label="Flip board">${icon('refresh-cw')}</button><button class="icon-btn" data-action="sound" aria-label="${db.settings.sound ? 'Mute' : 'Enable'} sound" aria-pressed="${db.settings.sound}">${icon(db.settings.sound ? 'volume-2' : 'volume-x')}</button></div></div><div class="board-bottom-tip">${icon('mouse-pointer-2')}Click two squares or drag a piece.</div></section>`;
  }
  function renderPanel() {
    const c = course(),
      l = line(),
      e = expected(),
      s = courseStats(c, db.reviews);
    const currentNote = db.notes[`${c.id}|${game.fen().split(' ').slice(0, 4).join(' ')}`] || '';
    let title =
      state.mode === 'explore'
        ? 'Explore this line'
        : state.active
          ? 'Your move'
          : 'Ready to practice';
    let subtitle = state.active
      ? `Playing ${c.color === 'w' ? 'White' : 'Black'} pieces. ${state.mode === 'learn' ? 'Follow the arrow and read the PGN notes.' : 'Find a move from your repertoire.'}`
      : 'Choose a mode, then start.';
    let comment = state.mode === 'learn' && state.active ? e?.comment : state.lastMove?.comment;
    if (state.status === 'wrong') {
      title = 'Try again';
      subtitle = 'This move is outside the selected repertoire.';
    }
    if (state.status === 'correct') {
      title = 'Correct';
      subtitle = 'Continuing the line…';
    }
    if (state.busy) {
      title = 'Opponent to move';
      subtitle = 'Watch the reply.';
    }
    if (state.hint) {
      title = `Try ${e?.san || ''}`;
      subtitle = 'The hint is shown on the board.';
      comment = e?.comment;
    }
    const panelLimit =
      state.active || state.done ? trainingPlyLimit(l, activeSettings()) : l.moves.length;
    const allProgress = Math.min(100, Math.round((state.ply / panelLimit) * 100));
    const body = state.done
      ? renderCompletion()
      : `<div class="line-position"><span>${state.active ? 'Line progress' : state.mode === 'explore' ? 'Position in line' : 'Ready to start'}</span><strong>${state.ply} / ${panelLimit} moves</strong></div><div class="progress-track"><span style="width:${allProgress}%"></span></div><div class="prompt ${state.status === 'wrong' ? 'error' : state.status === 'correct' ? 'success' : ''}"><div class="prompt-icon">${icon(state.status === 'wrong' ? 'rotate-ccw' : state.status === 'correct' ? 'check' : 'move-up-right')}</div><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div></div>${comment || !state.active ? `<div class="coach-comment">${comment ? `<strong>Position notes</strong><br>${esc(comment)}` : esc(c.description)}</div>` : ''}<div class="move-caption">${state.active && state.mode !== 'learn' ? 'MOVES PLAYED' : 'YOUR LINE'}</div>${renderMoves(l.moves, state.active && state.mode !== 'learn' ? state.ply : Math.max(state.ply, 6))}${
          state.mode === 'explore'
            ? `<div class="var-choices">${availableMoves()
                .map(
                  (m) =>
                    `<button data-action="explore-move" data-san="${esc(m)}">${esc(m)}</button>`,
                )
                .join(
                  '',
                )}</div><div class="note-area"><label class="move-caption" for="position-note">POSITION NOTE</label><textarea id="position-note" class="input" placeholder="e.g. Prepare d4 after castling…">${esc(currentNote)}</textarea></div>`
            : ''
        }<div class="panel-actions">${state.active ? `<button class="btn" data-action="hint" ${state.busy ? 'disabled' : ''}>${icon('lightbulb')}Hint</button><button class="text-btn" data-action="end">End session ${icon('square')}</button>` : state.mode === 'explore' ? `<button class="btn primary" data-action="start">Practice line ${icon('arrow-right')}</button><button class="text-btn" data-action="save-note">${icon('notebook-pen')}Save note</button>` : `<button class="btn primary" data-action="start">${icon('play')}Start ${state.mode === 'review' ? 'review' : 'practice'}</button><button class="text-btn" data-action="select-line">${variants(l ? c.lines.length : 0)} ${icon('chevron-down')}</button>`}</div>${!state.active && state.mode === 'review' && !s.due ? '<p class="start-info">No positions due. You can still practice any line.</p>' : ''}`;
    return `<section class="training-panel" aria-label="Opening trainer"><div class="panel-heading"><div class="panel-kicker">${icon('sprout')}REPERTOIRE${c.studyPack ? `<button class="text-btn study-inline-link" data-action="study-info" data-id="${esc(c.id)}">Plans and sources${icon('arrow-up-right')}</button>` : ''}</div><div class="opening-title"><h2>${esc(c.name)}</h2><button class="course-switch" data-action="nav" data-view="library" aria-label="Choose opening">${icon('chevron-down')}</button></div><p class="opening-subtitle">${c.color === 'w' ? 'White repertoire' : 'Black repertoire'} <span aria-hidden="true">·</span> ${variants(c.lines.length)} <span aria-hidden="true">·</span> ${positions(s.total)}</p><div class="mode-tabs" role="group" aria-label="Training mode">${[
      ['learn', 'Learn', 'book-open'],
      ['train', 'Practice', 'swords'],
      ['review', 'Review', 'repeat-2'],
      ['explore', 'Explore', 'git-branch'],
    ]
      .map(
        ([mode, label, i]) =>
          `<button class="${state.mode === mode ? 'active' : ''}" data-action="mode" data-mode="${mode}" aria-pressed="${state.mode === mode}">${icon(i)}${label}</button>`,
      )
      .join(
        '',
      )}</div></div><div class="training-body" aria-live="polite">${state.done ? '' : studioUI.sessionStrip()}${!state.done && l.prompt ? `<div class="study-decision"><span class="eyebrow">DECISION DRILL</span><strong>${esc(l.prompt)}</strong><small>Start: ${esc(l.origin)} · practice a recorded continuation.</small></div>` : ''}${body}</div><div class="panel-footer">${icon('brain')}Missed positions return sooner.</div></section>`;
  }
  function renderMoves(moves, visible = moves.length) {
    let html = '<div class="move-list">';
    for (let i = 0; i < visible && i < moves.length; i++) {
      const m = moves[i];
      const fullmove = m.before.split(' ')[5];
      if (m.color === 'w' || i === 0)
        html += `<span class="number">${fullmove}${m.color === 'b' ? '…' : '.'}</span>`;
      html += `<button data-action="goto" data-ply="${i + 1}" class="${i === state.ply - 1 ? 'current' : ''} ${i >= state.ply ? 'future' : ''}" ${state.active || state.manual ? 'disabled' : ''}>${esc(m.san)}</button>`;
    }
    if (!visible)
      html += '<span style="color:#99a28d;font-size:11px">Moves will appear here.</span>';
    return html + '</div>';
  }
  function renderCompletion() {
    return studioUI.completion();
  }
  function renderCourse(c, full = false) {
    const s = courseStats(c, db.reviews);
    return `<${full ? 'article' : 'button'} class="course-card ${c.id === state.courseId ? 'chosen' : ''}" ${full ? '' : `data-action="course" data-id="${esc(c.id)}"`}><div class="course-card-top"><div class="course-art ${esc(c.tone || 'sage')}"><img src="pieces/${c.color}${c.symbol || 'N'}.svg" alt=""/></div><span class="course-side"><span class="side-disc ${c.color === 'w' ? 'white' : ''}"></span>${c.color === 'w' ? 'White pieces' : 'Black pieces'}</span></div><h3>${esc(c.name)}</h3><p>${full ? esc(c.description) : `${variants(c.lines.length)} <span aria-hidden="true">·</span> ${positions(s.total)}`}</p><div class="progress-track"><span style="width:${s.percent}%"></span></div><div class="course-meta"><span>${s.learned ? 'Learned positions' : 'Not started'}</span><strong>${s.percent}% ${s.due ? `· ${s.due} due` : ''}</strong></div>${full ? `<div class="card-tools"><button class="text-btn" data-action="${c.archivedAt ? 'restore-course' : 'course'}" data-id="${esc(c.id)}">${icon(c.archivedAt ? 'undo-2' : 'play')}${c.archivedAt ? 'Restore opening' : 'Practice'}</button><button class="text-btn" data-action="export" data-id="${esc(c.id)}" aria-label="Export ${esc(c.name)}">${icon('download')}PGN</button><button class="icon-btn" data-action="edit-course" data-id="${esc(c.id)}" aria-label="Edit ${esc(c.name)}">${icon('pencil-line')}</button>${c.archivedAt ? '' : `<button class="icon-btn" data-action="archive-course" data-id="${esc(c.id)}" aria-label="Archive ${esc(c.name)}">${icon('archive')}</button>`}</div>` : ''}</${full ? 'article' : 'button'}>`;
  }
  function renderLibrary() {
    return studioUI.library();
  }
  function renderProgress() {
    const t = totals();
    let correct = 0,
      total = 0,
      guided = 0;
    Object.values(db.activity).forEach((a) => {
      correct += a.correct;
      total += a.total;
      guided += a.guided || 0;
    });
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      return {
        label: d.toLocaleDateString('hr', { weekday: 'short' }),
        data: db.activity[dateKey(d)]?.total || 0,
        today: i === 6,
      };
    });
    const max = Math.max(...days.map((d) => d.data), db.settings.goal);
    return (
      heading('PROGRESS', 'Practice history', 'Accuracy, review schedule and recent sessions.') +
      statsMarkup(t, activity()) +
      `<div class="progress-page"><section class="white-panel"><h2>Last seven days</h2><p style="color:#8b9980;font-size:11px">Moves practiced per day</p><div class="activity-bars">${days.map((d) => `<div class="activity-col ${d.today ? 'today' : ''}"><span>${d.data}</span><div class="activity-bar" style="height:${Math.max(3, (d.data / max) * 115)}px"></div><span>${esc(d.label)}</span></div>`).join('')}</div></section><section class="white-panel"><h2>Practice totals</h2><div class="progress-row">Total attempts <strong>${total}</strong></div><div class="progress-row">Unaided accuracy <strong>${total - guided > 0 ? Math.round((correct / (total - guided)) * 100) : 0}%</strong></div><div class="progress-row">Learned positions <strong>${t.learned} / ${t.total}</strong></div><div class="progress-row">Due now <strong>${t.due}</strong></div></section><section class="white-panel" style="grid-column:1/-1"><h2>Progress by opening</h2>${activeCourses()
        .map((c) => {
          const s = courseStats(c, db.reviews);
          return `<div class="progress-row"><div><strong>${esc(c.name)}</strong><br><small>${s.learned} of ${positions(s.total)} · ${s.newCount} new · ${s.due} due</small></div><button class="text-btn" data-action="course" data-id="${esc(c.id)}">${s.percent}% ${icon('arrow-up-right')}</button></div>`;
        })
        .join('')}</section></div>` +
      studioUI.progress() +
      footer()
    );
  }
  function footer() {
    return `<footer class="footer-note"><span>Potez · built by <a href="https://github.com/leonbede7" target="_blank" rel="noopener">Leon Bede</a></span><span>Local data · <a href="https://github.com/leonbede7/potez" target="_blank" rel="noopener">Source code</a> · <button class="text-btn" data-action="help">Help & credits</button></span></footer>`;
  }
  function applyTheme() {
    const themes = {
      sage: ['#eceddc', '#86a08b'],
      wood: ['#eddfc5', '#b59777'],
      blue: ['#e5e9e8', '#85a3ad'],
    };
    const colors = themes[db.settings.theme] || themes.sage;
    document.documentElement.style.setProperty('--board-light', colors[0]);
    document.documentElement.style.setProperty('--board-dark', colors[1]);
    const appearance =
      db.settings.appearance === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : db.settings.appearance;
    document.documentElement.dataset.appearance = appearance;
    document.querySelector('meta[name="theme-color"]').content =
      appearance === 'dark' ? '#131e1b' : '#f3f4ed';
  }

  function setCourse(id) {
    if (state.view === 'custom') customUI.leave();
    if (!activeCourses().some((c) => c.id === id)) return;
    stopTimer();
    state.manual = false;
    state.courseId = id;
    state.lineIndex = 0;
    state.lineSearch = '';
    state.active = false;
    state.done = false;
    state.flipped = false;
    state.view = 'studio';
    db.lastCourse = id;
    save();
    resetPosition(Math.min(4, line().moves.length));
    render();
    window.scrollTo({
      top: 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
  function availableMoves() {
    const prefix = line().moves.slice(0, state.ply);
    return [
      ...new Set(
        course()
          .lines.filter(
            (l) =>
              l.startFen === line().startFen && prefix.every((m, i) => l.moves[i]?.san === m.san),
          )
          .map((l) => l.moves[state.ply]?.san)
          .filter(Boolean),
      ),
    ];
  }
  function startSession({ choose = false, onlyKeys = null } = {}) {
    if (!course()) return;
    stopTimer();
    if (choose) state.lineIndex = chooseLine(course(), db.reviews, state.mode);
    const reviewKeys =
      onlyKeys ||
      (state.mode === 'review' && courseStats(course(), db.reviews).due
        ? new Set(
            [...getPositions(course()).keys()].filter(
              (k) => db.reviews[k] && db.reviews[k].due <= Date.now(),
            ),
          )
        : null);
    state.active = true;
    state.done = false;
    state.session = {
      correct: 0,
      total: 0,
      mistakes: 0,
      combo: 0,
      bestCombo: 0,
      startedAt: Date.now(),
      failed: new Set(),
      assisted: new Set(),
      reviewKeys,
      settings: {
        ...courseTrainingSettings(course(), db.settings),
        ...(state.mode === 'review' || onlyKeys ? { depth: 0 } : {}),
      },
    };
    resetPosition(0);
    render();
    autoAdvance();
  }
  function autoAdvance() {
    if (!state.active) return;
    const e = expected();
    if (
      !e ||
      state.session.reviewKeys?.size === 0 ||
      (activeSettings().sessionLength > 0 && state.session.total >= activeSettings().sessionLength)
    ) {
      finish();
      return;
    }
    const skipReview =
      state.session.reviewKeys && !state.session.reviewKeys.has(positionKey(course().id, e));
    if (e.color !== course().color || skipReview) {
      state.busy = true;
      render();
      autoTimer = setTimeout(
        () => {
          if (!state.active) return;
          const played = game.move(e.san);
          state.lastMove = e;
          state.ply++;
          state.selected = null;
          state.hint = false;
          state.status = 'idle';
          state.busy = false;
          render();
          animateMove(e);
          if (!skipReview) sound(played.captured ? 'capture' : 'move');
          autoAdvance();
        },
        skipReview ? 100 : activeSettings().replySpeed,
      );
    } else {
      state.busy = false;
      render();
    }
  }
  function finish() {
    if (state.done) return;
    stopTimer();
    state.active = false;
    state.done = true;
    state.selected = null;
    state.session.endedAt = Date.now();
    if (state.session.total)
      db.sessions = [
        ...db.sessions,
        {
          courseId: course().id,
          mode: state.mode,
          total: state.session.total,
          correct: state.session.correct,
          mistakes: state.session.mistakes,
          bestCombo: state.session.bestCombo,
          endedAt: state.session.endedAt,
          duration: state.session.endedAt - state.session.startedAt,
        },
      ].slice(-200);
    save();
    render();
    sound('complete');
  }
  function record(success, key) {
    db.reviews[key] = recordReview(db.reviews[key], success);
    const day = dateKey();
    db.activity[day] ||= { correct: 0, total: 0 };
    db.activity[day].total++;
    if (state.mode === 'learn') db.activity[day].guided = (db.activity[day].guided || 0) + 1;
    else if (success) db.activity[day].correct++;
    if (db.activity[day].total >= db.settings.goal && !db.activity[day].goalCelebrated) {
      db.activity[day].goalCelebrated = true;
      sound('goal');
      toast('Daily target reached.');
    }
    save();
  }
  function markFailure(key) {
    state.session.combo = 0;
    if (!state.session.failed.has(key)) {
      state.session.failed.add(key);
      state.session.mistakes++;
      record(false, key);
    }
  }
  function tryMove(from, to, promotion) {
    const b = state.manual ? state.manualGame : game;
    let candidate;
    try {
      const probe = new Chess(b.fen());
      candidate = probe.move({ from, to, promotion: promotion || 'q' });
    } catch {
      state.selected = null;
      render();
      return;
    }
    if (
      !promotion &&
      b.moves({ square: from, verbose: true }).some((m) => m.to === to && m.promotion)
    ) {
      showPromotion(from, to);
      return;
    }
    if (state.manual) {
      b.move(candidate.san);
      state.lastMove = candidate;
      state.selected = null;
      renderManual();
      animateMove(candidate);
      sound(candidate.captured ? 'capture' : 'move');
      return;
    }
    if (state.view === 'custom') {
      customUI.attempt(candidate);
      return;
    }
    if (!state.active && state.mode !== 'explore') {
      toast('Start a session or choose Explore to browse lines.');
      state.selected = null;
      render();
      return;
    }
    const matches = matchingLines(
      course(),
      line().moves.slice(0, state.ply),
      candidate.san,
      line().startFen,
    );
    if (!matches.length) {
      if (!state.active) {
        toast('Move not in repertoire. Add it using the board editor.');
        state.selected = null;
        render();
        return;
      }
      markFailure(positionKey(course().id, expected()));
      state.status = 'wrong';
      state.hint = false;
      state.selected = null;
      state.wrongSquare = to;
      render();
      sound(false);
      state.wrongSquare = null;
      return;
    }
    if (!matches.some((m) => m.index === state.lineIndex)) state.lineIndex = matches[0].index;
    const e = expected();
    if (state.active) {
      const key = positionKey(course().id, e);
      state.session.total++;
      if (!state.session.failed.has(key) && !state.session.assisted.has(key)) {
        if (state.mode !== 'learn') {
          state.session.correct++;
          state.session.combo++;
          state.session.bestCombo = Math.max(state.session.bestCombo, state.session.combo);
        }
        record(true, key);
      }
      state.session.reviewKeys?.delete(key);
      state.status = 'correct';
    }
    b.move(candidate.san);
    state.lastMove = e;
    state.ply++;
    state.selected = null;
    state.hint = false;
    render();
    animateMove(candidate);
    sound(candidate.captured ? 'capture' : 'move');
    if (state.active) {
      state.busy = true;
      autoTimer = setTimeout(() => {
        state.busy = false;
        state.status = 'idle';
        autoAdvance();
      }, 400);
    }
  }
  function clickSquare(sq) {
    if (state.busy || state.done) return;
    const b = state.manual ? state.manualGame : game,
      p = b.get(sq);
    if (state.selected === sq) {
      state.selected = null;
      state.manual ? renderManual() : render();
      return;
    }
    if (
      state.selected &&
      b.moves({ square: state.selected, verbose: true }).some((m) => m.to === sq)
    ) {
      tryMove(state.selected, sq);
      return;
    }
    if (p && p.color === b.turn()) {
      state.selected = sq;
      state.manual ? renderManual() : render();
    }
  }
  function showPromotion(from, to) {
    const color = (state.manual ? state.manualGame : game).turn();
    showDialog(
      'Choose a piece',
      `<p class="dialog-description">Choose a promotion piece.</p><div class="promotion-options">${['q', 'r', 'b', 'n'].map((p) => `<button data-action="promote" data-from="${from}" data-to="${to}" data-piece="${p}" aria-label="${pieceNames[p]}"><img src="pieces/${color}${p.toUpperCase()}.svg" alt="${pieceNames[p]}"/></button>`).join('')}</div>`,
    );
  }

  let dialogReturnFocus;
  function showDialog(title, body) {
    $('.dialog-overlay')?.remove();
    dialogReturnFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title">${title}</h2><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>${body}</section>`;
    document.body.append(overlay);
    createIcons({ icons });
    setTimeout(() => overlay.querySelector('input:not([type=file]),textarea,button')?.focus(), 0);
  }
  function closeDialog() {
    $('.dialog-overlay')?.remove();
    dialogReturnFocus?.focus();
  }
  function showImport() {
    showDialog(
      'Import a repertoire',
      `<p class="dialog-description">Upload a PGN or paste notation. Variations, comments and starting positions are preserved.</p><form id="import-form"><div class="two-col"><div class="field"><label for="import-name">Repertoire name</label><input id="import-name" class="input" placeholder="e.g. My 1.e4 repertoire" maxlength="80"/></div><div class="field"><label for="import-color">Training side</label><select id="import-color" class="input"><option value="w">White</option><option value="b">Black</option></select></div></div><label class="upload-area" id="upload-area" for="pgn-file">${icon('upload')}<strong>Choose a PGN file</strong> or drop it here<br><span id="file-name">.pgn or .txt · up to ${MAX_PGN_LABEL}</span></label><input id="pgn-file" type="file" accept=".pgn,.txt" class="sr-only"/><div class="field"><label for="pgn-text">Or paste PGN / move notation</label><textarea id="pgn-text" class="input" placeholder="[Event &quot;My opening&quot;]&#10;&#10;1. e4 e5 2. Nf3 Nc6 3. Bc4 (3. Bb5 a6) Bc5 *" required></textarea><p class="help-text">Supports multiple games, nested variations, comments and starting FENs. You can export a Lichess study as PGN.</p></div><div id="import-error" class="error-text" role="alert"></div><div class="dialog-bottom"><button type="button" class="text-btn" data-action="manual">${icon('pencil-line')}Use the board editor</button><button type="submit" class="btn primary">${icon('plus')}Add repertoire</button></div></form>`,
    );
  }
  async function addCourse(pgn, name, color) {
    let processedMoves = 0;
    const lines = await parseInBackground(pgn, (progress) => {
      processedMoves = progress.processed;
      const status = $('#import-error');
      if (!status) return;
      status.textContent =
        progress.stage === 'parse'
          ? 'Reading PGN…'
          : progress.stage === 'complete'
            ? 'Saving repertoire…'
            : progress.processed
              ? 'Validated ' + progress.processed.toLocaleString('en-GB') + ' moves…'
              : 'Validating moves and variations…';
    });
    const own = lines.some((l) => l.moves.some((m) => m.color === color));
    if (!own) throw new Error('No moves for the selected side. Choose another side or add moves.');
    const id = crypto.randomUUID();
    const c = {
      id,
      name: name.trim() || lines[0].name || 'My opening',
      color,
      eco: 'PGN',
      tone: 'sage',
      symbol: 'N',
      description: 'Imported PGN repertoire.',
      pgn,
      lines,
    };
    db.courses.push(c);
    if (!(await save())) {
      db.courses = db.courses.filter((item) => item.id !== id);
      throw new Error('PGN parsed but not saved. Free browser storage and try again.');
    }
    closeDialog();
    setCourse(id);
    toast(
      `Added: ${c.name} · ${variants(lines.length)} · ${processedMoves.toLocaleString('en-GB')} validated moves.`,
    );
  }
  async function readPgnFile(file) {
    if (!file) return;
    if (file.size > MAX_PGN_BYTES) {
      $('#pgn-text').value = '';
      $('#import-error').textContent = `File too large. Maximum size: ${MAX_PGN_LABEL}.`;
      return;
    }
    try {
      $('#pgn-text').value = await file.text();
      $('#file-name').textContent = file.name;
      const match = $('#pgn-text').value.match(/\[(?:Opening|Event)\s+"([^\"]+)"\]/);
      if (!$('#import-name').value)
        $('#import-name').value = match?.[1] || file.name.replace(/\.(pgn|txt)$/i, '');
      $('#import-error').textContent = '';
    } catch {
      $('#import-error').textContent = 'Could not read the file. Try again.';
    }
  }
  function showLines(page = 0) {
    showDialog('Choose a line', studioUI.lines(page));
  }
  function updateLineResults(page = 0) {
    const target = $('#line-results');
    if (target) {
      target.innerHTML = studioUI.lineResults(page);
      createIcons({ icons });
    }
  }

  function showSettings() {
    showDialog('Settings', studioUI.preferences());
  }
  function showTrainingSettings() {
    showDialog(
      'Session settings',
      studioUI.trainingControls() +
        '<div class="preference-section">' +
        studioUI.dailyGoal() +
        '</div><div class="dialog-bottom"><span class="help-text">Changes apply to the next session.</span><button class="btn primary" data-action="close">Done</button></div>',
    );
  }

  function showHelp() {
    showDialog(
      'How Potez works',
      `<div class="help-content"><h3>1. Add a repertoire</h3><p>Upload a PGN, paste notation, or use the board editor. Four sample repertoires are included.</p><h3>2. Learn the line</h3><p>Learn shows an arrow and PGN comments. Explore lets you browse moves, choose branches and write position notes.</p><h3>3. Test your recall</h3><p>In Practice, play moves without an arrow. Opponent replies are automatic. Any recorded continuation is accepted. An unrecorded move is not necessarily a bad chess move.</p><h3>4. Review due positions</h3><p>Correct recall schedules reviews after 4 hours, then 1, 3, 7, 14 and 30 days. An error or hint makes the position due in one minute. This is a simple interval schedule, not FSRS.</p><h3>Keyboard and storage</h3><p>Tab and Enter select squares. Left/right browse moves outside a session. F flips the board, H requests a hint, Escape exits focus, and ? opens this guide. Settings control sound, depth and session length. PGNs stay in your browser. No engine runs during practice.</p><h3>References</h3><p><a href="https://www.chesstempo.com/manual/en/manual.html" target="_blank" rel="noopener">Chess Tempo</a> · <a href="https://wiki.chessbook.com/spaced-repetition" target="_blank" rel="noopener">Chessbook</a> · <a href="https://support.chess.com/en/articles/10319267-when-will-the-variations-be-ready-for-my-review" target="_blank" rel="noopener">Chessable MoveTrainer</a></p><p>Pieces: Cburnett / Lichess, GPL-2.0-or-later.</p></div>`,
    );
  }
  function download(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openManual() {
    closeDialog();
    stopTimer();
    state.active = false;
    state.done = false;
    state.manual = true;
    state.selected = null;
    state.lastMove = null;
    state.manualGame = new Chess();
    state.manualName = '';
    state.manualColor = 'w';
    renderManual();
  }
  function renderManual() {
    render();
    $('.content').innerHTML =
      heading(
        'BOARD EDITOR',
        'Build a line',
        'Play both sides, then save the line for training.',
        'import',
        'Import PGN',
      ) +
      `<div class="workspace">${renderBoard()}<section class="white-panel manual-side"><h2>New line</h2><p>Play moves for both sides. Choose your training side before saving.</p><div class="field"><label for="manual-name">Repertoire name</label><input id="manual-name" class="input" value="${esc(state.manualName)}" placeholder="My new opening" maxlength="80"/></div><div class="field"><label for="manual-color">Training side</label><select id="manual-color" class="input"><option value="w" ${state.manualColor === 'w' ? 'selected' : ''}>White pieces</option><option value="b" ${state.manualColor === 'b' ? 'selected' : ''}>Black pieces</option></select></div><div class="move-caption">MOVES PLAYED</div><p>${esc(state.manualGame.pgn()) || 'Play the first move.'}</p><div class="manual-tools"><button class="btn" data-action="manual-undo" ${state.manualGame.history().length ? '' : 'disabled'}>${icon('undo-2')}Undo move</button><button class="btn primary" data-action="manual-save" ${state.manualGame.history().length ? '' : 'disabled'}>${icon('check')}Save</button></div><button class="text-btn" data-action="cancel-manual">Cancel and return</button></section></div>` +
      footer();
    createIcons({ icons });
  }

  const actions = {
    ...customUI.actions,
    nav: (el) => {
      stopTimer();
      if (state.view === 'custom') {
        customUI.leave();
        resetPosition(0);
      }
      state.focus = false;
      state.manual = false;
      state.active = false;
      state.done = false;
      state.view = el.dataset.view;
      if (state.view === 'custom') customUI.enter();
      if (state.view === 'review') {
        const dueCourse = activeCourses().find((c) => courseStats(c, db.reviews).due);
        if (dueCourse) {
          state.courseId = dueCourse.id;
          state.lineIndex = chooseLine(dueCourse, db.reviews, 'review');
        }
        state.mode = 'review';
        resetPosition(0);
      }
      render();
      window.scrollTo({
        top: 0,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    },
    focus: () => {
      if (!course()) {
        toast('Add a repertoire first.');
        return;
      }
      if (!['studio', 'review', 'custom'].includes(state.view)) {
        state.view = 'studio';
        state.manual = false;
      }
      state.focus = !state.focus;
      render();
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    appearance: () => {
      db.settings.appearance =
        document.documentElement.dataset.appearance === 'dark' ? 'light' : 'dark';
      save();
      state.manual ? renderManual() : render();
    },
    'training-settings': showTrainingSettings,
    'test-sound': () => {
      audio.play('move', true);
      setTimeout(() => audio.play('capture', true), 200);
      setTimeout(() => audio.play('complete', true), 430);
    },
    'toggle-archive': () => {
      state.libraryArchived = !state.libraryArchived;
      render();
    },
    'edit-course': (el) => {
      const c = db.courses.find((c) => c.id === el.dataset.id);
      if (c) showDialog('Edit repertoire', studioUI.editCourse(c));
    },
    'archive-course': async (el) => {
      const previous = db.courses;
      db.courses = archiveCourse(db.courses, el.dataset.id, true);
      if (!(await save())) {
        db.courses = previous;
        return;
      }
      if (state.courseId === el.dataset.id) {
        stopTimer();
        state.active = false;
        state.done = false;
        state.courseId = activeCourses()[0]?.id;
        state.lineIndex = 0;
        db.lastCourse = state.courseId;
        resetPosition(0);
        save();
      }
      render();
      toast('Repertoire archived.', el.dataset.id);
    },
    'restore-course': async (el) => {
      const wasEmpty = !activeCourses().length;
      const previous = db.courses;
      db.courses = archiveCourse(db.courses, el.dataset.id, false);
      if (!(await save())) {
        db.courses = previous;
        return;
      }
      if (wasEmpty) setCourse(el.dataset.id);
      else render();
      toast('Repertoire restored.');
    },
    'practice-position': (el) => {
      const c = db.courses.find((c) => c.id === el.dataset.id);
      if (!c) return;
      setCourse(c.id);
      state.mode = 'review';
      const index = c.lines.findIndex((l) =>
        l.moves.some((m) => positionKey(c.id, m) === el.dataset.key),
      );
      if (index >= 0) state.lineIndex = index;
      startSession({ onlyKeys: new Set([el.dataset.key]) });
    },
    'study-part': (el) => {
      state.studyPart = Number(el.dataset.part) === 1 ? 1 : 2;
      db.studyViewPart = state.studyPart;
      save();
      render();
    },
    'export-study-previous': (el) => {
      const copy = Object.values(db.studyContentBackups || {})
        .filter((b) => b.id === el.dataset.id)
        .at(-1);
      if (copy) download(copy.pgn, copy.name + ' - before revision.pgn', 'application/x-chess-pgn');
    },
    'study-info': (el) => {
      const c = db.courses.find((c) => c.id === el.dataset.id);
      if (c?.studyPack) showDialog(esc(c.name), studyUI.courseInfo(c));
    },
    'study-course': async (el) => {
      let c = db.courses.find((c) => c.id === el.dataset.id);
      if (!c) return;
      if (c.archivedAt) {
        const previous = db.courses;
        db.courses = archiveCourse(db.courses, c.id, false);
        if (!(await save())) {
          db.courses = previous;
          return;
        }
      }
      closeDialog();
      state.mode = 'learn';
      setCourse(c.id);
    },
    import: showImport,
    close: closeDialog,
    help: showHelp,
    settings: showSettings,
    course: (el) => setCourse(el.dataset.id),
    mode: (el) => {
      stopTimer();
      state.active = false;
      state.done = false;
      state.mode = el.dataset.mode;
      state.status = 'idle';
      state.hint = false;
      render();
    },
    start: () => {
      if (state.mode === 'explore') state.mode = 'train';
      startSession({ choose: state.mode === 'review' });
    },
    end: () => {
      stopTimer();
      state.active = false;
      state.done = false;
      state.status = 'idle';
      state.hint = false;
      render();
      toast('Session saved.');
    },
    hint: () => {
      if (state.view === 'custom') {
        customUI.hint();
        return;
      }
      if (!state.active || !expected() || state.busy) return;
      const key = positionKey(course().id, expected());
      state.session.assisted.add(key);
      markFailure(key);
      state.hint = true;
      render();
      sound('hint');
    },
    flip: () => {
      state.flipped = !state.flipped;
      state.manual ? renderManual() : render();
    },
    sound: () => {
      db.settings.sound = !db.settings.sound;
      save();
      sound();
      state.manual ? renderManual() : render();
    },
    first: () => {
      if (!state.active) {
        resetPosition(0);
        render();
      }
    },
    prev: () => {
      if (!state.active) {
        resetPosition(Math.max(0, state.ply - 1));
        render();
      }
    },
    next: () => {
      if (!state.active && !state.manual) {
        resetPosition(state.ply + 1);
        render();
      }
    },
    last: () => {
      if (!state.active) {
        resetPosition(line().moves.length);
        render();
      }
    },
    goto: (el) => {
      if (!state.active) {
        resetPosition(Number(el.dataset.ply));
        render();
      }
    },
    'select-line': () => showLines(),
    'line-page': (el) => updateLineResults(Number(el.dataset.page)),
    line: (el) => {
      state.lineIndex = Number(el.dataset.index);
      state.active = false;
      state.done = false;
      resetPosition(0);
      closeDialog();
      render();
    },
    'next-line': () => {
      state.lineIndex = nextTrainingLine(
        course(),
        db.reviews,
        state.lineIndex,
        db.settings.lineOrder,
        Math.random,
        state.mode,
      );
      startSession();
    },
    restart: () => startSession(),
    'retry-mistakes': () => {
      const keys = new Set(state.session.failed);
      startSession({ onlyKeys: keys });
    },
    'explore-move': (el) => {
      const m = game.moves({ verbose: true }).find((m) => m.san === el.dataset.san);
      if (m) tryMove(m.from, m.to, m.promotion);
    },
    'save-note': () => {
      db.notes[`${course().id}|${game.fen().split(' ').slice(0, 4).join(' ')}`] =
        $('#position-note').value;
      save();
      toast('Position note saved.');
    },
    filter: (el) => {
      state.filter = el.dataset.filter;
      render();
    },
    export: (el) => {
      const c = db.courses.find((c) => c.id === el.dataset.id);
      download(c.pgn, `${c.name}.pgn`, 'application/x-chess-pgn');
    },
    backup: () =>
      download(
        JSON.stringify(
          { ...db, courses: db.courses.map(({ lines, ...entry }) => entry), backupVersion: 1 },
          null,
          2,
        ),
        'potez-backup.json',
        'application/json',
      ),
    manual: openManual,
    'cancel-manual': () => {
      state.manual = false;
      resetPosition(0);
      render();
    },
    'manual-undo': () => {
      if (!state.manual) return;
      state.manualGame.undo();
      state.lastMove = null;
      state.selected = null;
      renderManual();
    },
    'manual-save': async () => {
      if (importBusy) return;
      importBusy = true;
      try {
        toast('Parsing and saving line…');
        await addCourse(
          state.manualGame.pgn(),
          state.manualName || 'My opening',
          state.manualColor,
        );
      } catch (e) {
        toast(e.message);
      } finally {
        importBusy = false;
      }
    },
    promote: (el) => {
      const { from, to, piece } = el.dataset;
      closeDialog();
      tryMove(from, to, piece);
    },
  };
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (action) {
      if (action.disabled) return;
      event.preventDefault();
      actions[action.dataset.action]?.(action);
      return;
    }
    const sq = event.target.closest('[data-square]');
    if (sq) {
      clickSquare(sq.dataset.square);
      return;
    }
    if (event.target.classList.contains('dialog-overlay')) closeDialog();
  });
  document.addEventListener('submit', async (event) => {
    if (event.target.id === 'edit-course-form') {
      event.preventDefault();
      const form = event.target,
        id = form.dataset.id,
        c = db.courses.find((c) => c.id === id),
        name = form.querySelector('#edit-name').value.trim(),
        color = form.querySelector('#edit-color').value;
      if (!name) {
        form.querySelector('#edit-error').textContent = 'Enter a repertoire name.';
        return;
      }
      if (!c.lines.some((l) => l.moves.some((m) => m.color === color))) {
        form.querySelector('#edit-error').textContent = 'No moves for the selected side.';
        return;
      }
      const previous = db.courses;
      db.courses = db.courses.map((item) =>
        item.id === id
          ? {
              ...item,
              name,
              color,
              description: form.querySelector('#edit-description').value.trim(),
            }
          : item,
      );
      if (!(await save())) {
        db.courses = previous;
        return;
      }
      closeDialog();
      if (state.courseId === id) {
        stopTimer();
        state.active = false;
        state.done = false;
        resetPosition(0);
      }
      render();
      toast('Changes saved.');
      return;
    }
    if (event.target.id !== 'import-form') return;
    event.preventDefault();
    if (importBusy) return;
    importBusy = true;
    const form = event.target;
    const submit = form.querySelector('[type=submit]');
    const error = form.querySelector('#import-error');
    submit.disabled = true;
    submit.textContent = 'Processing PGN…';
    error.textContent = 'Validating moves. Large files may take a moment.';
    error.className = 'success-text';
    try {
      await addCourse(
        form.querySelector('#pgn-text').value,
        form.querySelector('#import-name').value,
        form.querySelector('#import-color').value,
      );
    } catch (e) {
      error.className = 'error-text';
      error.textContent = e.message;
    } finally {
      importBusy = false;
      submit.disabled = false;
      submit.textContent = 'Add repertoire';
    }
  });
  document.addEventListener('input', (event) => {
    const el = event.target;
    if (customUI.input(el)) return;
    if (el.id === 'course-search') {
      state.search = el.value;
      render();
      $('#course-search').focus();
    }
    if (el.id === 'manual-name') state.manualName = el.value;
    if (el.id === 'line-search') {
      state.lineSearch = el.value;
      updateLineResults(0);
    }
    if (el.id === 'setting-volume') {
      db.settings.volume = Number(el.value);
      $('#volume-value').textContent = el.value + '%';
    }
  });
  document.addEventListener('change', async (event) => {
    const el = event.target;
    if (customUI.change(el)) return;
    if (el.id === 'pgn-file') await readPgnFile(el.files[0]);
    if (el.id === 'manual-color') state.manualColor = el.value;
    if (el.id.startsWith('setting-')) {
      const key = el.id.replace('setting-', '');
      db.settings[key] =
        el.type === 'checkbox'
          ? el.checked
          : ['goal', 'volume', 'depth', 'sessionLength', 'replySpeed'].includes(key)
            ? Number(el.value)
            : el.value;
      save();
      state.manual ? renderManual() : render();
    }
    if (el.id === 'restore-file' && el.files[0]) {
      try {
        if (el.files[0].size > 250000000) throw new Error('Backup too large.');
        const restored = JSON.parse(await el.files[0].text());
        if (
          restored.backupVersion !== 1 ||
          !Array.isArray(restored.courses) ||
          !restored.reviews ||
          !restored.activity
        )
          throw new Error('This file is not a Potez backup.');
        for (const c of restored.courses) c.lines = await parseInBackground(c.pgn);
        showDialog(
          'Restore backup',
          `<p class="dialog-description">This backup contains ${restored.courses.length} repertoires. Restoring replaces current repertoires and progress. Export your current backup first if you want to keep it.</p><div class="dialog-bottom"><button class="btn" data-action="close">Cancel</button><button class="btn primary" id="confirm-restore">Restore this backup</button></div>`,
        );
        $('#confirm-restore').onclick = async () => {
          const previous = db;
          db = restored;
          db.notes ||= {};
          db.settings = normaliseSettings(db.settings);
          if (!Array.isArray(db.sessions)) db.sessions = [];
          await installStudyPack(db, parseInBackground);
          if (!(await save())) {
            db = previous;
            return;
          }
          closeDialog();
          if (activeCourses().length)
            setCourse(
              activeCourses().find((c) => c.id === db.lastCourse)?.id || activeCourses()[0].id,
            );
          else {
            state.view = 'library';
            render();
          }
          toast('Repertoires and progress restored.');
        };
      } catch (e) {
        toast(e.message || 'Could not read the backup.');
      }
    }
  });
  let dragFrom = null;
  document.addEventListener('dragstart', (event) => {
    const sq = event.target.closest('[data-square]');
    if (!sq || state.busy) {
      event.preventDefault();
      return;
    }
    const b = state.manual ? state.manualGame : game;
    if (b.get(sq.dataset.square)?.color !== b.turn()) {
      event.preventDefault();
      return;
    }
    dragFrom = sq.dataset.square;
    event.dataTransfer.setData('text/plain', dragFrom);
    event.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', (event) => {
    if (event.target.closest('[data-square],#upload-area')) event.preventDefault();
  });
  document.addEventListener('drop', async (event) => {
    const upload = event.target.closest('#upload-area');
    if (upload) {
      event.preventDefault();
      await readPgnFile(event.dataTransfer.files[0]);
      return;
    }
    const sq = event.target.closest('[data-square]');
    if (sq && dragFrom) {
      event.preventDefault();
      tryMove(dragFrom, sq.dataset.square);
      dragFrom = null;
    }
  });
  document.addEventListener('keydown', (event) => {
    const dialog = $('.dialog');
    if (dialog) {
      if (event.key === 'Escape') {
        closeDialog();
        event.preventDefault();
      }
      if (event.key === 'Tab') {
        const nodes = [
          ...dialog.querySelectorAll(
            'button:not(:disabled),input:not([type=file]),select,textarea,a[href]',
          ),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    const boardSquare = event.target.closest('[data-square]');
    if (boardSquare && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const cells = [...document.querySelectorAll('[data-square]')];
      const index = cells.indexOf(boardSquare);
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[event.key];
      cells[Math.max(0, Math.min(63, index + delta))]?.focus();
      return;
    }
    if (event.key === 'Escape' && state.focus) {
      state.focus = false;
      render();
      return;
    }
    if (event.key === '?') {
      showHelp();
      return;
    }
    if (event.key.toLowerCase() === 'h' && state.active) {
      event.preventDefault();
      actions.hint();
      return;
    }
    if (event.key.toLowerCase() === 'f') actions.flip();
    if (!state.active && !state.manual) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        actions.prev();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        actions.next();
      }
    }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (db.settings.appearance === 'system') applyTheme();
  });
  render();
  if (storageIssue) toast('Storage unavailable. Export your PGN or a backup to keep your work.');
  else await save();
}
boot().catch(() => {
  document.querySelector('#app').textContent = 'Could not start Potez. Refresh and try again.';
});
