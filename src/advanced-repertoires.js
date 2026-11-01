import verified from './verified-opening-data.json' with { type: 'json' };
import { personalRepertoires } from './personal-repertoires.js';

export const ADVANCED_PACK = 'leonbede-part2-2026-10-v3-en';
// Versioned public theory plus actual Stockfish 19 searches. The full evidence,
// opening commitments and finite-search limits ship in opening-verification.json.
export const advancedRepertoires = verified.courses.map((content) => {
  const parent = personalRepertoires.find((c) => c.id === content.parentId);
  return {
    ...parent,
    ...content,
    name: 'Part 2 · ' + parent.name,
    part: 2,
    priority: parent.priority + 20,
    group: `Part 2 · ${parent.color === 'w' ? 'White' : 'Black'} · verified revision 2`,
    description: content.lessons
      .slice(0, 4)
      .map((l) => l.title.replace(/^\d+ · /, ''))
      .join(' · '),
    when: `Advanced continuations linked to ${parent.name}. Four chapters extend sourced theory; two drills start from verified positions.`,
    plans: content.lessons.slice(0, 3).map((l) => l.plan),
    warnings: [
      'The opening choice is a repertoire commitment, not a claim that every introductory move is the engine’s global first choice.',
      'Verification uses a finite Stockfish 19 search. Other moves outside this repertoire may also be good.',
      ...(parent.id === 'leon-black-d5'
        ? ['The Albin is riskier; the engine may prefer ...e6 or ...c6.']
        : []),
    ],
    studyPack: ADVANCED_PACK,
  };
});
