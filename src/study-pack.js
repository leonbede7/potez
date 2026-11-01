import { personalRepertoires, studyCoursePgn, STUDY_PACK } from './personal-repertoires.js';
import { advancedRepertoires, ADVANCED_PACK } from './advanced-repertoires.js';
import { starterCourses } from './data.js';
import legacyLabels from './legacy-bundle-labels.json' with { type: 'json' };

function acceptedMoves(course) {
  const map = new Map();
  for (const line of course.lines)
    for (const move of line.moves)
      if (move.color === course.color) {
        const key = course.id + '|' + move.before.split(' ').slice(0, 4).join(' ');
        if (!map.has(key)) map.set(key, new Set());
        map.get(key).add(move.san);
      }
  return map;
}
const sameMoves = (a, b) => a && b && a.size === b.size && [...a].every((san) => b.has(san));

export async function installStudyPack(data, parse) {
  const ids = new Set(data.courses.map((c) => c.id));
  let added = 0,
    updated = 0,
    reset = 0;
  for (const definition of [...personalRepertoires, ...advancedRepertoires]) {
    const existing = data.courses.find((c) => c.id === definition.id);
    const version = definition.part === 2 ? ADVANCED_PACK : STUDY_PACK;
    if (existing && (!existing.studyPack || existing.studyPack === version)) continue;
    const { lessons, ...info } = definition;
    const pgn = studyCoursePgn(definition);
    const lines = await parse(pgn);
    if (existing) {
      const replacement = {
        ...info,
        ...existing,
        pgn,
        lines,
        studyPack: version,
        part: definition.part || 1,
        verification: definition.verification,
        chapterSources: definition.chapterSources,
        plans: definition.plans,
        warnings: definition.warnings,
        when: definition.when,
        sources: definition.sources,
      };
      const before = acceptedMoves(existing),
        after = acceptedMoves(replacement),
        reviews = {};
      for (const [key, review] of Object.entries(data.reviews || {}))
        if (key.startsWith(existing.id + '|') && !sameMoves(before.get(key), after.get(key))) {
          reviews[key] = review;
          if (after.has(key))
            data.reviews[key] = { ...review, level: 0, due: Date.now(), correct: 0 };
          else delete data.reviews[key];
          reset++;
        }
      data.studyContentBackups ||= {};
      const backupKey = existing.id + '@' + existing.studyPack;
      data.studyContentBackups[backupKey] ||= {
        id: existing.id,
        name: existing.name,
        color: existing.color,
        pgn: existing.pgn,
        studyPack: existing.studyPack,
        retiredAt: Date.now(),
        reviews,
      };
      data.courses = data.courses.map((c) => (c.id === existing.id ? replacement : c));
      updated++;
      continue;
    }
    data.courses.push({
      ...info,
      part: definition.part || 1,
      subtitle: definition.group,
      pgn,
      lines,
      studyPack: version,
      studyPriority: definition.priority,
    });
    ids.add(definition.id);
    added++;
  }
  data.studyPackVersion = ADVANCED_PACK;
  // Translate bundled defaults once, without overwriting user edits, imported
  // PGNs, review keys or content-based mastery identities.
  if (data.bundleLanguage !== 'en-v1') {
    const defaults = new Map(
      [...starterCourses, ...personalRepertoires, ...advancedRepertoires].map((c) => [c.id, c]),
    );
    const translated = [];
    for (const course of data.courses) {
      const old = legacyLabels.find((c) => c.id === course.id),
        english = defaults.get(course.id);
      if (!old || !english) {
        translated.push(course);
        continue;
      }
      const changes = {};
      for (const field of ['name', 'description', 'subtitle', 'group'])
        if (old[field] && course[field] === old[field])
          changes[field] = english[field] || english.group;
      // Only untouched sample PGNs are replaced. User modifications survive.
      if (old.pgn && english.pgn && course.pgn === old.pgn) {
        changes.pgn = english.pgn;
        changes.lines = await parse(english.pgn);
      }
      translated.push(Object.keys(changes).length ? { ...course, ...changes } : course);
    }
    data.courses = translated;
    data.bundleLanguage = 'en-v1';
  }
  if (updated)
    data.studyRevisionNotice = {
      revision: ADVANCED_PACK,
      updatedCourses: updated,
      resetPositions: reset,
      updatedAt: Date.now(),
    };
  return added;
}
