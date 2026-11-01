import { chooseLine, getPositions } from './model.js';

export const studioDefaults = {
  sound: true,
  volume: 35,
  soundStyle: 'wood',
  coordinates: true,
  theme: 'sage',
  goal: 20,
  appearance: 'dark',
  depth: 12,
  sessionLength: 10,
  replySpeed: 650,
  lineOrder: 'smart',
};
export function normaliseSettings(settings = {}) {
  const result = { ...studioDefaults, ...settings };
  for (const [key, options] of Object.entries({
    appearance: ['dark', 'light', 'system'],
    soundStyle: ['wood', 'soft', 'arcade'],
    theme: ['sage', 'wood', 'blue'],
    lineOrder: ['smart', 'sequential', 'random'],
  })) {
    if (!options.includes(result[key])) result[key] = studioDefaults[key];
  }
  for (const [key, min, max] of [
    ['volume', 0, 100],
    ['goal', 1, 500],
    ['depth', 0, 100],
    ['sessionLength', 0, 500],
    ['replySpeed', 200, 2000],
  ]) {
    const value = Number(result[key]);
    result[key] = Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : studioDefaults[key];
  }
  return result;
}
export function trainingPlyLimit(line, settings) {
  return settings.depth > 0
    ? Math.min(line.moves.length, Math.floor(settings.depth) * 2)
    : line.moves.length;
}
export function courseTrainingSettings(course, settings) {
  return course?.part === 2 ? { ...settings, depth: 0, sessionLength: 0 } : settings;
}
export function nextTrainingLine(
  course,
  reviews,
  current,
  order,
  random = Math.random,
  mode = 'train',
) {
  const count = course.lines.length;
  if (count < 2) return 0;
  if (order === 'random')
    return (
      (current + 1 + Math.floor(Math.max(0, Math.min(0.999999, random())) * (count - 1))) % count
    );
  if (order === 'sequential') return (current + 1) % count;
  const best = chooseLine(course, reviews, mode);
  return best === current ? (current + 1) % count : best;
}
const searchCache = new WeakMap();
export function searchLineIndexes(course, query = '') {
  if (!query.trim()) return course.lines.map((_, index) => index);
  let index = searchCache.get(course.lines);
  if (!index) {
    index = course.lines.map((l) =>
      (l.name + ' ' + l.moves.map((m) => m.san).join(' ')).toLocaleLowerCase('en'),
    );
    searchCache.set(course.lines, index);
  }
  const tokens = query.toLocaleLowerCase('en').trim().split(/\s+/).filter(Boolean);
  const found = [];
  for (let i = 0; i < index.length; i++)
    if (tokens.every((token) => index[i].includes(token))) found.push(i);
  return found;
}
export function weakPositions(courses, reviews, limit = 6) {
  const results = [];
  for (const course of courses)
    if (!course.archivedAt)
      for (const [key, move] of getPositions(course)) {
        const review = reviews[key];
        if (review?.wrong > 0) results.push({ course, key, move, review });
      }
  return results
    .sort((a, b) => b.review.wrong - a.review.wrong || a.review.due - b.review.due)
    .slice(0, limit);
}
export function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function accuracyPercent(session) {
  return session.total ? Math.round((session.correct / session.total) * 100) : 0;
}
export function archiveCourse(courses, id, archived = true, now = Date.now()) {
  return courses.map((course) =>
    course.id === id ? { ...course, archivedAt: archived ? now : null } : course,
  );
}
