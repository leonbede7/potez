import { Chess } from 'chess.js';
import { eligiblePracticeCourses, practicePositionKey } from './custom-practice.js';

const courseCache = new WeakMap();
// Content identity survives renaming/reordering/importing the same line, but a
// changed move, starting board or training side must be earned again.
function fingerprint(text) {
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < text.length; i++) {
    const n = text.charCodeAt(i);
    a = Math.imul(a ^ n, 16777619);
    b = Math.imul(b, 33) ^ n;
  }
  return `v1-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}-${text.length}`;
}
function courseVariants(course) {
  const cached = courseCache.get(course);
  if (cached?.lines === course.lines && cached.color === course.color) return cached.variants;
  const variants = [];
  for (const line of course.lines) {
    if (!line.moves.some((m) => m.color === course.color)) continue;
    const startFen =
      line.startFen.split(' ')[3] === '-' ? line.startFen : new Chess(line.startFen).fen();
    const canonical = JSON.stringify([
      course.color,
      practicePositionKey(startFen),
      line.moves.map((m) => m.san),
    ]);
    variants.push({
      id: fingerprint(canonical),
      canonical,
      color: course.color,
      startFen,
      moves: line.moves,
      name: line.name,
      courseId: course.id,
      courseName: course.name,
    });
  }
  courseCache.set(course, { lines: course.lines, color: course.color, variants });
  return variants;
}
export function createMasteryCatalog(courses, config) {
  const selected = new Set(config.ids),
    byContent = new Map();
  for (const course of eligiblePracticeCourses(courses, config)) {
    if (!selected.has(course.id) || !['w', 'b'].includes(course.color)) continue;
    for (const variant of courseVariants(course)) {
      const found = byContent.get(variant.canonical);
      if (found) {
        found.sources.push(course.id);
        continue;
      }
      byContent.set(variant.canonical, { ...variant, sources: [course.id] });
    }
  }
  return [...byContent.values()];
}
export const isMastered = (ledger, id) => ledger?.entries?.[id]?.mastered === true;
export function masteryStats(variants, ledger) {
  const total = variants.length,
    mastered = variants.reduce((n, v) => n + Number(isMastered(ledger, v.id)), 0);
  return {
    total,
    mastered,
    remaining: total - mastered,
    percent: total ? Math.floor((mastered / total) * 1000) / 10 : 0,
    won: total > 0 && mastered === total,
  };
}
export function setMastery(ledger, id, mastered, reason, now = Date.now()) {
  const previous = ledger.entries[id] || {},
    delta = Number(mastered) - Number(previous.mastered === true);
  ledger.entries[id] = {
    mastered,
    updatedAt: now,
    passes: (previous.passes || 0) + Number(mastered),
    failures: (previous.failures || 0) + Number(!mastered),
    reason,
  };
  return delta;
}
const index = (length, random) => Math.floor(Math.max(0, Math.min(0.999999999, random())) * length);
export function pickMasteryVariant(variants, ledger, previousId, random = Math.random) {
  const missing = variants.filter((v) => !isMastered(ledger, v.id)),
    known = variants.filter((v) => isMastered(ledger, v.id));
  // Three quarters of rounds target unfinished work; one quarter retest points
  // already earned. Never force a repeat while another eligible line exists.
  let choices =
    missing.length && known.length
      ? random() < 0.75
        ? missing
        : known
      : missing.length
        ? missing
        : known;
  const others = choices.filter((v) => v.id !== previousId);
  if (others.length) choices = others;
  if (!choices.length) return null;
  const sides = [...new Set(choices.map((v) => v.color))],
    side = sides[index(sides.length, random)];
  choices = choices.filter((v) => v.color === side);
  const courses = [...new Set(choices.map((v) => v.courseId))],
    courseId = courses[index(courses.length, random)];
  choices = choices.filter((v) => v.courseId === courseId);
  return choices[index(choices.length, random)];
}
export function initialMasteryCandidates(variants, target) {
  const key = practicePositionKey(target.startFen);
  return variants.filter(
    (v) => v.color === target.color && practicePositionKey(v.startFen) === key,
  );
}
// A graph permits transpositions, but only a complete recorded PGN path can
// certify a whole variation. A mixed path never certifies unseen decisions.
export function advanceMasteryCandidates(candidates, ply, san) {
  return candidates.filter((v) => v.moves[ply]?.san === san);
}
