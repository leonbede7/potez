import fs from 'node:fs';
import { personalRepertoires, studyCoursePgn } from '../src/personal-repertoires.js';
import { advancedRepertoires } from '../src/advanced-repertoires.js';
import { playerAnalysis } from '../src/player-analysis.js';

fs.mkdirSync('public/repertoires', { recursive: true });
for (const course of [...personalRepertoires, ...advancedRepertoires])
  fs.writeFileSync(`public/repertoires/${course.id}.pgn`, studyCoursePgn(course) + '\n');
const courseNotes = (c) =>
  `## ${c.name}\n\n${c.description}\n\n${c.plans.map((p) => '- ' + p).join('\n')}\n\n${c.lessons.map((l) => '- ' + l.title + (l.prompt ? ' — ' + l.prompt : '')).join('\n')}\n\nPGN: ${c.id}.pgn\n\nSources:\n${c.sources.map((s) => '- ' + s).join('\n')}\n`;
fs.writeFileSync(
  'public/repertoires/leonbede-plan.md',
  `# Opening foundations\n\nA personal repertoire prepared for Leon Bede from a public Chess.com snapshot dated ${playerAnalysis.snapshotDate}. The sample contains ${playerAnalysis.totalGames} standard games, including ${playerAnalysis.rapid.count} rapid games. Results do not identify the phase in which a mistake occurred.\n\nWhite starts with 1.d4. Against 1.e4, the Sicilian Dragon and ...e5 are separate alternatives. Against d4, choose ...d5/Albin or a King’s Indian setup.\n\n${personalRepertoires.map(courseNotes).join('\n')}\nFoundation notes illustrate plans and are not all engine-certified. See Part 2 and the verification record for the checked continuations.\n`,
);
fs.writeFileSync(
  'public/repertoires/leonbede-part2-plan.md',
  `# Part 2 — plans and decisions\n\nNine courses with 36 sourced continuations and 18 decision drills. Chapters 01–04 follow full lines; 05–06 start from FEN positions. The app uses full depth for these courses.\n\n${advancedRepertoires.map(courseNotes).join('\n')}\nThe checked continuations use Stockfish 19 with at least 3,000,000 nodes per non-terminal position. After each chosen opening commitment, score loss is bounded to 0.30 pawns against the best move found at that budget. This is not proof of absolute optimality. The raw audit remains in opening-verification.json.\n`,
);
console.log('Exported 18 English PGNs and two study guides.');
