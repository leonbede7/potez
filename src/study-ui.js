import { createAdvancedUI } from './study-advanced-ui.js';
import { personalRepertoires } from './personal-repertoires.js';
import { playerAnalysis } from './player-analysis.js';

export function createStudyUI({ esc, icon, heading, footer, context }) {
  const advancedUI = createAdvancedUI({ esc, icon, heading, footer, context });
  const links = (sources) =>
    sources
      .map((source) => {
        const url = typeof source === 'string' ? source : source.url;
        const label =
          typeof source === 'object'
            ? source.topic
            : url.includes('github')
              ? 'Lichess opening database'
              : url.includes('api.chess.com')
                ? 'Chess.com public data'
                : 'Opening reference';
        return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${icon('arrow-up-right')}</a>`;
      })
      .join('');
  function banner() {
    return `<section class="study-banner"><div><strong>Included study library</strong><p>18 courses · 136 chapters · foundations and decision drills</p></div><button class="text-btn" data-action="nav" data-view="plan">Browse study guide${icon('arrow-up-right')}</button></section>`;
  }
  function courseInfo(course) {
    return `<p class="dialog-description">${esc(course.group)}</p>${advancedUI.info(course)}<div class="study-note"><strong>When to use it</strong><p>${esc(course.when)}</p></div><h3 class="study-subheading">Plans</h3><ol class="study-notes">${course.plans.map((p) => `<li>${esc(p)}</li>`).join('')}</ol><h3 class="study-subheading">What to watch</h3><ul class="study-notes">${course.warnings.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><details class="study-origin"><summary>Why this repertoire was included</summary><p>${esc(course.personal)}</p></details><p class="help-text">${course.verification ? 'Stockfish was used to prepare these lines. No engine runs during practice; other moves may also be good.' : 'Foundation chapters are teaching notes. Linked introductions were revised with Part 2, but remaining foundation chapters are not all engine-verified.'}</p><div class="study-source-links">${links(course.sources)}</div><div class="dialog-bottom"><button class="text-btn" data-action="export" data-id="${esc(course.id)}">${icon('download')}Download PGN</button><button class="btn primary" data-action="study-course" data-id="${esc(course.id)}">${icon('play')}Practice</button></div>`;
  }
  function page() {
    if (context().state.studyPart === 2) return advancedUI.page();
    const { db } = context();
    const card = (definition) => {
      const c = db.courses.find((x) => x.id === definition.id) || definition;
      return `<article class="study-course"><div class="study-course-icon"><img src="pieces/${c.color}${c.symbol}.svg" alt=""/></div><div class="study-course-copy"><span class="study-course-group">${esc(c.group)}</span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><small>${definition.lessons.length} chapters${c.archivedAt ? ' · archived' : ''}</small>${advancedUI.progress(c)}${advancedUI.related(c)}</div><div class="study-course-actions"><button class="btn primary" data-action="study-course" data-id="${esc(c.id)}">Practice${icon('arrow-right')}</button><button class="text-btn" data-action="study-info" data-id="${esc(c.id)}">Plans and sources</button></div></article>`;
    };
    return (
      heading(
        'STUDY GUIDE',
        'Opening foundations',
        'A 1.d4 repertoire for White, with separate Dragon, ...e5 and closed-opening choices for Black.',
      ) +
      advancedUI.stages(1) +
      `<div class="study-intro"><p>Start with a plan, use Learn to follow the line, then switch to Practice. Choose one main response to 1.e4: the Dragon and 1…e5 are alternatives.</p><details class="study-origin"><summary>About this study collection</summary><p>Originally prepared for Leon Bede from a snapshot of ${playerAnalysis.totalGames.toLocaleString('en-GB')} public Chess.com games on 30 October 2026, including ${playerAnalysis.rapid.count} rapid games. The selection reflects an existing 1.d4, ...c5 and ...d5 repertoire. Results alone do not show where an opening mistake occurred.</p><div class="study-source-links">${links(playerAnalysis.sources)}</div></details></div><div class="section-title"><h2>White · 1.d4 and its sidelines</h2></div><div class="study-course-list">${personalRepertoires
        .filter((c) => c.color === 'w')
        .map(card)
        .join(
          '',
        )}</div><div class="section-title"><h2>Black · choose your main systems</h2></div><div class="study-course-list">${personalRepertoires
        .filter((c) => c.color === 'b')
        .map(card)
        .join(
          '',
        )}</div><a class="text-btn" href="repertoires/leonbede-plan.md" download>Download foundation notes${icon('download')}</a>` +
      footer()
    );
  }
  return { banner, page, courseInfo };
}
