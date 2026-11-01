import { courseStats, dateKey, streakCount } from './model.js';
import {
  searchLineIndexes,
  weakPositions,
  formatDuration,
  accuracyPercent,
  courseTrainingSettings,
} from './studio.js';

export function createStudioUI(context, { icon, esc, heading, footer, renderCourse }) {
  const select = (id, label, value, options) =>
    `<label class="preference-select" for="${id}"><span>${label}</span><select id="${id}">${options.map(([v, text]) => `<option value="${v}" ${String(value) === String(v) ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
  function trainingControls() {
    const { db } = context(),
      s = db.settings;
    return `<div class="preferences-grid">${select(
      'setting-sessionLength',
      'Session length',
      s.sessionLength,
      [
        [5, '5 of my moves'],
        [10, '10 of my moves'],
        [20, '20 of my moves'],
        [0, 'Full line'],
      ],
    )}${select('setting-depth', 'Opening depth', s.depth, [
      [6, 'First 6 moves'],
      [12, 'First 12 moves'],
      [20, 'First 20 moves'],
      [0, 'All moves'],
    ])}${select('setting-replySpeed', 'Reply speed', s.replySpeed, [
      [300, 'Fast'],
      [650, 'Normal'],
      [1100, 'Slow'],
    ])}${select('setting-lineOrder', 'Next line', s.lineOrder, [
      ['smart', 'Prioritize reviews'],
      ['sequential', 'Sequential'],
      ['random', 'Random'],
    ])}</div><p class="help-text">These limits affect practice sessions, not your imported PGN.</p>`;
  }
  function stats(t, a) {
    const { db, activeCourses } = context(),
      goal = db.settings.goal,
      percent = Math.min(100, Math.round((a.total / goal) * 100));
    return `<div class="stats-strip"><div class="stat"><span class="stat-icon">${icon('library-big')}</span><div><span class="stat-label">Repertoires</span><div class="stat-value">${activeCourses.length}<small>openings</small></div></div></div><div class="stat"><span class="stat-icon">${icon('circle-check')}</span><div><span class="stat-label">Learned positions</span><div class="stat-value">${t.learned.toLocaleString('en-GB')}<small>of ${t.total.toLocaleString('en-GB')}</small></div></div></div><div class="stat"><span class="stat-icon sand">${icon('flame')}</span><div><span class="stat-label">Day streak</span><div class="stat-value">${streakCount(db.activity)}<small>${streakCount(db.activity) === 1 ? 'day' : 'days'} active</small></div></div></div><button class="stat goal-stat" data-action="training-settings" aria-label="Set daily target"><span class="goal-ring" style="--goal:${percent}%"><span>${percent === 100 ? icon('check') : icon('target')}</span></span><div><span class="stat-label">Daily target</span><div class="stat-value">${a.total}<small>/ ${goal} moves</small></div></div></button></div>`;
  }
  function sessionStrip() {
    const { state, db, course } = context(),
      s = state.session,
      settings = courseTrainingSettings(course, db.settings);
    if (state.active)
      return `<div class="session-strip"><span class="live-indicator"></span><span>Current session</span><strong>${s.correct} correct</strong><span class="session-combo">${icon('flame')}${state.mode === 'learn' ? 'Guided' : (s.combo || 0) + ' in a row'}</span></div>`;
    return `<button class="training-recipe" data-action="training-settings"><span>${icon('sliders-horizontal')}Session settings</span><strong>${settings.sessionLength || 'All'} ${settings.sessionLength ? 'moves' : 'in line'}<span>·</span>${settings.depth ? `depth ${settings.depth}` : 'full depth'}</strong>${icon('chevron-right')}</button>`;
  }
  function completion() {
    const { state } = context(),
      s = state.session;
    return `<div class="completion"><div class="completion-emblem">${icon(s.mistakes ? 'sprout' : 'trophy')}</div><span class="eyebrow">SESSION COMPLETE</span><h3>Session complete</h3><p>${s.mistakes ? 'Missed positions are scheduled for review.' : 'Progress saved. Reviews scheduled.'}</p><div class="completion-stats"><div><strong>${state.mode === 'learn' ? 'Learning' : accuracyPercent(s) + '%'}</strong><small>${state.mode === 'learn' ? 'guided practice' : 'unaided accuracy'}</small></div><div><strong>${s.total}</strong><small>moves played</small></div><div><strong>${formatDuration((s.endedAt || Date.now()) - s.startedAt)}</strong><small>duration</small></div></div><div class="completion-best">${icon('flame')}${state.mode === 'learn' ? 'Guided session complete.' : `Best streak <strong>${s.bestCombo || 0}</strong>`}</div>${s.failed.size ? `<button class="btn primary" data-action="retry-mistakes">${icon('repeat-2')}Retry missed positions</button>` : ''}<button class="btn ${s.failed.size ? '' : 'primary'}" data-action="next-line">Next line ${icon('arrow-right')}</button><button class="text-btn" data-action="restart">${icon('rotate-ccw')}Repeat line</button></div>`;
  }
  function library() {
    const { db, state } = context(),
      archived = db.courses.filter((c) => c.archivedAt).length;
    const filtered = [...db.courses]
      .sort((a, b) => (a.studyPriority || 999) - (b.studyPriority || 999))
      .filter(
        (c) =>
          Boolean(c.archivedAt) === state.libraryArchived &&
          (state.filter === 'all' || c.color === state.filter) &&
          c.name.toLocaleLowerCase('en').includes(state.search.toLocaleLowerCase('en')),
      );
    return (
      heading(
        'REPERTOIRES',
        state.libraryArchived ? 'Archive' : 'Repertoires',
        'Import, edit and organize your opening files.',
      ) +
      (context().studyBanner?.() || '') +
      `<div class="library-header"><div class="search-field">${icon('search')}<input id="course-search" class="input" type="search" aria-label="Search repertoires" placeholder="Search openings…" value="${esc(state.search)}"/></div><button class="btn" data-action="manual">${icon('pencil-line')}Board editor</button><button class="btn subtle ${state.libraryArchived ? 'selected' : ''}" data-action="toggle-archive">${icon('archive')}${state.libraryArchived ? 'Active repertoires' : `Archive${archived ? ' · ' + archived : ''}`}</button></div><div class="filter-tabs" role="group" aria-label="Repertoire side">${[
        ['all', 'All openings'],
        ['w', 'White pieces'],
        ['b', 'Black pieces'],
      ]
        .map(
          ([v, label]) =>
            `<button data-action="filter" data-filter="${v}" class="${state.filter === v ? 'active' : ''}">${label}</button>`,
        )
        .join(
          '',
        )}<span>${filtered.length} openings</span></div><div class="course-grid library-grid">${filtered.length ? filtered.map((c) => renderCourse(c, true)).join('') : `<div class="empty-state">${icon(state.libraryArchived ? 'archive' : 'search')}<h2>${state.libraryArchived ? 'No archived repertoires' : 'No matching repertoires'}</h2><p>${state.libraryArchived ? 'Archived repertoires keep their lines and progress.' : 'Change your search or import a PGN.'}</p></div>`}</div>` +
      footer()
    );
  }
  function lineResults(page = 0) {
    const { state, course } = context(),
      found = searchLineIndexes(course, state.lineSearch),
      size = 40;
    page = Math.max(0, Math.min(page, Math.max(0, Math.ceil(found.length / size) - 1)));
    const from = page * size,
      to = Math.min(from + size, found.length);
    return `<div class="line-result-count">${found.length ? `${from + 1}–${to} of ${found.length.toLocaleString('en-GB')} lines` : 'No matching lines'}</div><div class="line-browser-list">${found
      .slice(from, to)
      .map((i) => {
        const l = course.lines[i];
        return `<button class="line-option ${state.lineIndex === i ? 'selected' : ''}" data-action="line" data-index="${i}"><span class="line-ordinal">${String(i + 1).padStart(2, '0')}</span><span><strong>${esc(l.name)}</strong><small>${esc(
          l.moves
            .slice(0, 20)
            .map((m) => m.san)
            .join(' '),
        )}${l.moves.length > 20 ? ' …' : ''}</small></span>${icon(state.lineIndex === i ? 'circle-check' : 'chevron-right')}</button>`;
      })
      .join(
        '',
      )}</div>${found.length > size ? `<div class="dialog-bottom"><button class="btn" data-action="line-page" data-page="${page - 1}" ${!page ? 'disabled' : ''}>${icon('chevron-left')}Previous</button><span>${page + 1} / ${Math.ceil(found.length / size)}</span><button class="btn" data-action="line-page" data-page="${page + 1}" ${to === found.length ? 'disabled' : ''}>Next${icon('chevron-right')}</button></div>` : ''}`;
  }
  function lines(page = 0) {
    const { state } = context();
    return `<p class="dialog-description">Search chapter titles or moves, e.g. Nf3 Bc4.</p><div class="search-field line-search">${icon('search')}<input id="line-search" class="input" type="search" placeholder="Chapter title or moves…" aria-label="Search lines" value="${esc(state.lineSearch)}"/></div><div id="line-results">${lineResults(page)}</div>`;
  }
  function preferences() {
    const { db } = context(),
      s = db.settings;
    return `<p class="dialog-description">Changes are saved automatically.</p><div class="preference-section"><div class="preference-title">${icon('palette')}Workspace</div><div class="preferences-grid">${select(
      'setting-appearance',
      'Appearance',
      s.appearance,
      [
        ['dark', 'Dark'],
        ['light', 'Light'],
        ['system', 'System'],
      ],
    )}${select('setting-theme', 'Board theme', s.theme, [
      ['sage', 'Sage'],
      ['wood', 'Walnut'],
      ['blue', 'Slate'],
    ])}</div><label class="settings-row" for="setting-coordinates"><span><strong>Board coordinates</strong><small>Square labels a–h and 1–8</small></span><input type="checkbox" id="setting-coordinates" ${s.coordinates ? 'checked' : ''}/></label></div><div class="preference-section"><div class="preference-title">${icon('headphones')}Sound</div><label class="settings-row" for="setting-sound"><span><strong>Training sounds</strong><small>Moves, captures, hints and completed sessions</small></span><input type="checkbox" id="setting-sound" ${s.sound ? 'checked' : ''}/></label><div class="preferences-grid">${select(
      'setting-soundStyle',
      'Sound style',
      s.soundStyle,
      [
        ['wood', 'Wood'],
        ['soft', 'Soft tones'],
        ['arcade', 'Retro'],
      ],
    )}<label class="preference-select" for="setting-volume"><span>Volume <output id="volume-value">${s.volume}%</output></span><input id="setting-volume" type="range" min="0" max="100" value="${s.volume}"/></label></div><button class="text-btn" data-action="test-sound">${icon('volume-2')}Preview sounds</button></div><div class="preference-section"><div class="preference-title">${icon('sliders-horizontal')}Practice settings</div>${trainingControls()}${select(
      'setting-goal',
      'Daily target',
      s.goal,
      [
        [10, '10 moves'],
        [20, '20 moves'],
        [30, '30 moves'],
        [50, '50 moves'],
      ],
    )}</div><div class="preference-section"><div class="preference-title">${icon('hard-drive')}Local data</div><p class="help-text">Data is stored in this browser. Export a backup to transfer it to another device.</p><div class="dialog-bottom"><button class="btn" data-action="backup">${icon('download')}Export backup</button><label class="btn" for="restore-file">${icon('upload')}Restore backup</label><input id="restore-file" type="file" accept=".json" class="sr-only"/></div></div>`;
  }
  function progress() {
    const { db, activeCourses } = context();
    const days = Array.from({ length: 28 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - 27 + i);
      return {
        date: dateKey(day),
        label: day.toLocaleDateString('en-GB'),
        count: db.activity[dateKey(day)]?.total || 0,
      };
    });
    const weak = weakPositions(activeCourses, db.reviews);
    const sessions = (db.sessions || []).slice(-5).reverse();
    return `<div class="progress-extras"><section class="white-panel"><div class="section-top"><h2>Activity</h2><span class="small-tag">LAST 28 DAYS</span></div><div class="heatmap">${days.map((d) => `<div title="${esc(d.label)}: ${d.count} moves" aria-label="${esc(d.label)}, ${d.count} moves" class="heat-cell level-${d.count === 0 ? 0 : d.count < 10 ? 1 : d.count < 20 ? 2 : 3}">${d.count ? '<span>' + d.count + '</span>' : ''}</div>`).join('')}</div><div class="heatmap-legend"><span>Moves practiced per day</span><span>Less <i></i><i></i><i></i> More</span></div></section><section class="white-panel"><div class="section-top"><h2>Positions to revisit</h2>${icon('crosshair')}</div>${weak.length ? weak.map(({ course, key, move, review }) => `<div class="progress-row"><div><strong>${esc(course.name)}</strong><small>${esc(move.san)} · ${review.wrong} ${review.wrong === 1 ? 'error' : 'errors'}</small></div><button class="btn small" data-action="practice-position" data-id="${esc(course.id)}" data-key="${esc(key)}">Practice${icon('arrow-up-right')}</button></div>`).join('') : `<div class="quiet-empty">${icon('sprout')}Missed positions will appear here after practice.</div>`}</section><section class="white-panel"><h2>Recent sessions</h2>${
      sessions.length
        ? sessions
            .map((s) => {
              const c = db.courses.find((c) => c.id === s.courseId);
              return `<div class="progress-row"><div><strong>${esc(s.kind === 'custom' ? (s.variantTotal ? 'Custom · ' + s.mastered + '/' + s.variantTotal + ' lines' : 'Custom miks · ' + (s.rounds || 0) + ' rundi') : c?.name || 'Saved repertoire')}</strong><small>${new Date(s.endedAt).toLocaleDateString('en-GB')} · ${s.total} moves · ${formatDuration(s.duration)}</small></div><span class="session-score">${s.variantTotal ? (s.pointsDelta > 0 ? '+' : '') + s.pointsDelta + ' pts' : s.mode === 'learn' ? 'Learn' : accuracyPercent(s) + '%'}</span></div>`;
            })
            .join('')
        : `<div class="quiet-empty">${icon('history')}No sessions yet.</div>`
    }</section></div>`;
  }
  function editCourse(c) {
    return `<p class="dialog-description">Edit the name, description and training side.</p><form id="edit-course-form" data-id="${esc(c.id)}"><div class="field"><label for="edit-name">Repertoire name</label><input id="edit-name" class="input" value="${esc(c.name)}" maxlength="80" required/></div><div class="field"><label for="edit-description">Description</label><textarea id="edit-description" class="input" maxlength="400">${esc(c.description)}</textarea></div><div class="field"><label for="edit-color">Training side</label><select id="edit-color" class="input"><option value="w" ${c.color === 'w' ? 'selected' : ''}>White</option><option value="b" ${c.color === 'b' ? 'selected' : ''}>Black</option></select></div><p id="edit-error" class="error-text" role="alert"></p><div class="dialog-bottom"><button type="button" class="text-btn" data-action="close">Cancel</button><button class="btn primary" type="submit">${icon('check')}Save changes</button></div></form>`;
  }
  function dailyGoal() {
    return select('setting-goal', 'Daily target', context().db.settings.goal, [
      [10, '10 moves'],
      [20, '20 moves'],
      [30, '30 moves'],
      [50, '50 moves'],
    ]);
  }
  return {
    stats,
    sessionStrip,
    completion,
    library,
    lineResults,
    lines,
    preferences,
    trainingControls,
    progress,
    editCourse,
    dailyGoal,
  };
}
