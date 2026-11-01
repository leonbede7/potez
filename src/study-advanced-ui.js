import { openingVerificationInfo } from './opening-verification-ui.js';
import { advancedRepertoires } from './advanced-repertoires.js';
import { personalRepertoires } from './personal-repertoires.js';
import { courseStats } from './model.js';
import { studyProgress } from './study-progress.js';

export function createAdvancedUI({ esc, icon, heading, footer, context }) {
  function stages(part) {
    const { db } = context();
    return `<div class="study-stages" role="group" aria-label="Study level">${[
      [1, personalRepertoires, 'Foundations', '82 chapters'],
      [2, advancedRepertoires, 'Plans and decisions', '54 chapters'],
    ]
      .map(([n, defs, title, count]) => {
        const s = studyProgress(defs, db.courses, db.reviews);
        return `<button class="study-stage ${part === n ? 'selected' : ''}" data-action="study-part" data-part="${n}" aria-pressed="${part === n}"><span>PART ${n}<small>${count}</small></span><strong>${title}</strong><span class="study-stage-progress"><span>${s.learned} / ${s.total} positions</span><b>${s.percent}%</b></span><span class="progress-track"><span style="width:${s.percent}%"></span></span></button>`;
      })
      .join('')}</div>`;
  }
  function progress(course) {
    const { db } = context(),
      s = course.lines
        ? courseStats(course, db.reviews)
        : { learned: 0, total: 0, due: 0, percent: 0 };
    return `<div class="study-card-progress"><span>${s.learned} / ${s.total} learned positions</span><strong>${s.percent}%${s.due ? ` · ${s.due} due` : ''}</strong></div><div class="progress-track"><span style="width:${s.percent}%"></span></div>`;
  }
  function related(course) {
    const target =
      course.part === 2
        ? personalRepertoires.find((c) => c.id === course.parentId)
        : advancedRepertoires.find((c) => c.parentId === course.id);
    return target
      ? `<button class="text-btn study-related" data-action="study-course" data-id="${esc(target.id)}">${course.part === 2 ? 'Review foundations' : 'Continue to Part 2'}${icon('arrow-up-right')}</button>`
      : '';
  }
  function info(course) {
    return openingVerificationInfo(course, context().db, { esc, icon }) + related(course);
  }
  function card(definition) {
    const { db } = context(),
      c = db.courses.find((x) => x.id === definition.id) || definition;
    return `<article class="study-course"><div class="study-course-icon"><img src="pieces/${c.color}${c.symbol}.svg" alt=""/></div><div class="study-course-copy"><span class="study-course-group">${esc(c.group)}</span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><small>4 continuations · 2 decision drills${c.archivedAt ? ' · archived' : ''}</small>${progress(c)}${related(c)}</div><div class="study-course-actions"><button class="btn primary" data-action="study-course" data-id="${esc(c.id)}">${c.archivedAt ? 'Restore and practice' : 'Practice'}${icon('arrow-right')}</button><button class="text-btn" data-action="study-info" data-id="${esc(c.id)}">Plans and sources</button></div></article>`;
  }
  function page() {
    const { db } = context(),
      s = studyProgress(advancedRepertoires, db.courses, db.reviews);
    return (
      heading(
        'STUDY GUIDE',
        'Plans and decisions',
        '36 sourced continuations and 18 drills from key positions.',
      ) +
      stages(2) +
      `<div class="study-intro"><p>Each course extends its foundation repertoire. Chapters 01–04 follow a full line; chapters 05–06 start at a decision position. These sessions use full depth.</p><div class="study-evidence-strip"><span>${icon('circle-check')}Stockfish 19 · 3 million nodes per position</span><a href="repertoires/opening-verification.md" target="_blank" rel="noopener">Verification notes${icon('arrow-up-right')}</a><strong>${s.learned}/${s.total} learned</strong></div><details class="study-origin"><summary>What the verification establishes</summary><p>Theory links refer to pinned public Lichess records. After the chosen opening commitment, the checked continuation loses at most 0.30 pawns against the best move found at the recorded search budget. This finite search is not proof of absolute optimality. No engine runs during training.</p></details></div><div class="section-title"><h2>White · central structures</h2></div><div class="study-course-list">${advancedRepertoires
        .filter((c) => c.color === 'w')
        .map(card)
        .join(
          '',
        )}</div><div class="section-title"><h2>Black · activity and counterplay</h2></div><div class="study-course-list">${advancedRepertoires
        .filter((c) => c.color === 'b')
        .map(card)
        .join(
          '',
        )}</div><a class="text-btn" href="repertoires/leonbede-part2-plan.md" download>Download Part 2 notes${icon('download')}</a>` +
      footer()
    );
  }
  return { page, stages, progress, info, related };
}
