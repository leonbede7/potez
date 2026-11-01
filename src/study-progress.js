import { courseStats } from './model.js';

export function studyProgress(definitions, courses, reviews, now = Date.now()) {
  const result = { learned: 0, total: 0, due: 0, percent: 0 };
  for (const definition of definitions) {
    const course = courses.find((c) => c.id === definition.id);
    if (!course) continue;
    const s = courseStats(course, reviews, now);
    result.learned += s.learned;
    result.total += s.total;
    result.due += s.due;
  }
  result.percent = result.total ? Math.round((result.learned / result.total) * 100) : 0;
  return result;
}
