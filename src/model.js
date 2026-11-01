import { Chess, DEFAULT_POSITION } from 'chess.js';
import { parse } from '@mliebelt/pgn-parser';

export const STORAGE_KEY = 'potez-studio-v1';
export const MAX_PGN_BYTES = 10_000_000;
export const MAX_PGN_LABEL = '10 MB';
const positionCache = new WeakMap();
export const intervals = [
  0,
  4 * 3600000,
  86400000,
  3 * 86400000,
  7 * 86400000,
  14 * 86400000,
  30 * 86400000,
];
export function cleanComment(comment = '') {
  return comment.replace(/\[%[^\]]*\]/g, '').trim();
}

export function parseRepertoire(pgn, { onProgress } = {}) {
  if (new TextEncoder().encode(pgn).byteLength > MAX_PGN_BYTES)
    throw new Error(`PGN too large. Maximum size: ${MAX_PGN_LABEL}.`);
  onProgress?.({ stage: 'parse', processed: 0 });
  let games;
  try {
    games = parse(pgn.trim(), { startRule: 'games' });
  } catch {
    throw new Error(
      'Could not parse PGN. Check notation, variation brackets and headers. Example: 1. e4 e5 2. Nf3 Nc6 *',
    );
  }
  const lines = [];
  const seen = new Set();
  // PGN collections repeat opening positions across games and branches. Validate
  // each (full FEN, SAN) once and share the immutable move record. The file-size
  // limit bounds the input; counting repeated moves must not reject a valid file.
  const validated = new Map();
  const validator = new Chess();
  let moveCount = 0;
  let lastProgress = 0;
  onProgress?.({ stage: 'validate', processed: 0 });
  for (const [gi, game] of games.entries()) {
    const startFen = game.tags?.FEN || DEFAULT_POSITION;
    try {
      new Chess(startFen);
    } catch {
      throw new Error(`Game ${gi + 1}: invalid starting FEN.`);
    }
    const title = game.tags?.Opening || game.tags?.Event || `Line ${gi + 1}`;
    function walk(nodes, prefix) {
      let before = prefix.at(-1)?.after || startFen;
      const path = [...prefix];
      const pendingBranches = [];
      for (const node of nodes) {
        for (const branch of node.variations || [])
          pendingBranches.push({ branch, prefix: [...path] });
        const san = node.notation.notation;
        const key = before + '|' + san;
        let record = validated.get(key);
        if (!record) {
          let move;
          try {
            validator.load(before);
            move = validator.move(san);
          } catch {
            throw new Error(
              `Game ${gi + 1}: move ${san} is illegal in this position. Check the PGN.`,
            );
          }
          record = {
            san: move.san,
            from: move.from,
            to: move.to,
            promotion: move.promotion,
            color: move.color,
            before,
            after: validator.fen(),
            comment: '',
          };
          validated.set(key, record);
        }
        const comment = cleanComment(node.commentAfter || node.commentDiag?.comment || '');
        path.push(comment ? { ...record, comment } : record);
        before = record.after;
        moveCount++;
        if (onProgress && moveCount % 4096 === 0 && Date.now() - lastProgress > 200) {
          onProgress({ stage: 'validate', processed: moveCount });
          lastProgress = Date.now();
        }
      }
      const key = startFen + '|' + path.map((m) => m.san).join(' ');
      if (path.length && !seen.has(key)) {
        seen.add(key);
        lines.push({
          name: title,
          startFen,
          moves: path,
          prompt: game.tags?.PotezPrompt || '',
          kind: game.tags?.PotezKind || '',
          origin: game.tags?.PotezOrigin || '',
        });
      }
      for (const next of pendingBranches) walk(next.branch, next.prefix);
    }
    walk(game.moves || [], []);
  }
  if (!lines.length)
    throw new Error('PGN contains no moves. Paste a line, e.g. 1. e4 e5 2. Nf3 Nc6 *');
  onProgress?.({ stage: 'complete', processed: moveCount, lines: lines.length });
  return lines;
}

export function positionKey(courseId, move) {
  return `${courseId}|${move.before.split(' ').slice(0, 4).join(' ')}`;
}
export function getPositions(course) {
  const cached = positionCache.get(course);
  if (cached?.lines === course.lines && cached.color === course.color) return cached.positions;
  const positions = new Map();
  for (const line of course.lines)
    for (const m of line.moves)
      if (m.color === course.color) positions.set(positionKey(course.id, m), m);
  positionCache.set(course, { lines: course.lines, color: course.color, positions });
  return positions;
}
export function courseStats(course, reviews, now = Date.now()) {
  const positions = getPositions(course);
  let learned = 0,
    due = 0,
    newCount = 0;
  for (const key of positions.keys()) {
    const review = reviews[key];
    if (!review) newCount++;
    else {
      if (review.level > 0) learned++;
      if (review.due <= now) due++;
    }
  }
  return {
    total: positions.size,
    learned,
    due,
    newCount,
    percent: positions.size ? Math.round((learned / positions.size) * 100) : 0,
  };
}
export function recordReview(previous, success, now = Date.now()) {
  const level = success ? Math.min((previous?.level || 0) + 1, intervals.length - 1) : 0;
  return {
    level,
    due: now + (success ? intervals[level] : 60000),
    correct: (previous?.correct || 0) + Number(success),
    wrong: (previous?.wrong || 0) + Number(!success),
    last: now,
  };
}
export function chooseLine(course, reviews, mode = 'train', now = Date.now()) {
  let bestIndex = 0,
    bestScore = -1;
  for (const [index, line] of course.lines.entries()) {
    let score = 0;
    for (const m of line.moves)
      if (m.color === course.color) {
        const r = reviews[positionKey(course.id, m)];
        if (mode === 'review') score += r && r.due <= now ? 100 + (r.wrong || 0) : 0;
        else score += !r ? 10 : r.due <= now ? 20 + (r.wrong || 0) : 0;
      }
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex;
}
export function matchingLines(course, prefix, san, startFen = DEFAULT_POSITION) {
  const matches = [];
  for (const [index, line] of course.lines.entries()) {
    if (
      line.startFen === startFen &&
      line.moves[prefix.length]?.san === san &&
      prefix.every((m, i) => line.moves[i]?.san === m.san)
    )
      matches.push({ line, index });
  }
  return matches;
}
export function exportCourse(course) {
  return course.pgn;
}
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function streakCount(activity) {
  let streak = 0;
  const date = new Date();
  if (!activity[dateKey(date)]) date.setDate(date.getDate() - 1);
  for (let i = 0; i < 3660; i++) {
    if (!activity[dateKey(date)]) break;
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}
