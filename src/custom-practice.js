import { Chess } from 'chess.js';

export const practicePositionKey = (fen) => fen.split(' ').slice(0, 4).join(' ');
export function normalisePracticeConfig(config = {}, courses = []) {
  const ids = new Set(courses.filter((c) => !c.archivedAt).map((c) => c.id));
  return {
    color: ['w', 'b', 'random'].includes(config.color) ? config.color : 'random',
    ids: [...new Set(Array.isArray(config.ids) ? config.ids : [])].filter((id) => ids.has(id)),
    rounds: [0, 5, 10, 20].includes(Number(config.rounds)) ? Number(config.rounds) : 10,
    moves: [0, 3, 5, 10].includes(Number(config.moves)) ? Number(config.moves) : 5,
  };
}
export function eligiblePracticeCourses(courses, config) {
  return courses.filter(
    (c) => !c.archivedAt && (config.color === 'random' || c.color === config.color),
  );
}
// A position graph accepts every recorded move from the same board, side,
// castling rights and en-passant state, including transposed move orders.
export function createPracticePool(courses, config) {
  const selected = new Set(config.ids),
    graphs = { w: new Map(), b: new Map() },
    groups = [];
  for (const course of eligiblePracticeCourses(courses, config)) {
    if (!selected.has(course.id) || !['w', 'b'].includes(course.color)) continue;
    const graph = graphs[course.color],
      seeds = new Map();
    for (const line of course.lines) {
      const firstFen =
        line.startFen.split(' ')[3] === '-' ? line.startFen : new Chess(line.startFen).fen();
      for (let i = 0; i < line.moves.length; i++) {
        const move = line.moves[i],
          fen = i === 0 ? firstFen : move.before,
          key = practicePositionKey(fen);
        let node = graph.get(key);
        if (!node) {
          node = { fen, edges: new Map() };
          graph.set(key, node);
        }
        let edge = node.edges.get(move.san);
        if (!edge) {
          edge = { san: move.san, move, refs: new Map() };
          node.edges.set(move.san, edge);
        }
        if (!edge.refs.has(course.id))
          edge.refs.set(course.id, {
            courseId: course.id,
            courseName: course.name,
            lineName: line.name,
            move,
          });
        if (move.color === course.color && !seeds.has(key))
          seeds.set(key, {
            key,
            fen,
            courseId: course.id,
            courseName: course.name,
            color: course.color,
            lineName: line.name,
          });
      }
    }
    if (seeds.size)
      groups.push({ courseId: course.id, color: course.color, seeds: [...seeds.values()] });
  }
  return { graphs, groups, count: { w: graphs.w.size, b: graphs.b.size } };
}
const pickIndex = (length, random) =>
  Math.floor(Math.max(0, Math.min(0.999999999, random())) * length);
export function createPracticeQueue(pool) {
  return {
    bags: pool.groups.map((g) => ({ group: g, seeds: [...g.seeds] })),
    seen: new Set(),
    cycle: 1,
  };
}
export function pickPracticeSeed(pool, queue, random = Math.random) {
  if (!pool.groups.length) return null;
  for (;;) {
    const bags = queue.bags.filter((b) => b.seeds.length);
    if (!bags.length) {
      queue.bags = pool.groups.map((g) => ({ group: g, seeds: [...g.seeds] }));
      queue.seen.clear();
      queue.cycle++;
      continue;
    }
    const sides = [...new Set(bags.map((b) => b.group.color))],
      side = sides[pickIndex(sides.length, random)];
    const sameSide = bags.filter((b) => b.group.color === side),
      bag = sameSide[pickIndex(sameSide.length, random)];
    const index = pickIndex(bag.seeds.length, random),
      seed = bag.seeds[index];
    bag.seeds[index] = bag.seeds.at(-1);
    bag.seeds.pop();
    const key = side + '|' + seed.key;
    if (queue.seen.has(key)) continue;
    queue.seen.add(key);
    return seed;
  }
}
export function practiceOptions(pool, color, fen) {
  return [...(pool.graphs[color]?.get(practicePositionKey(fen))?.edges.values() || [])];
}
export function practiceEdge(pool, color, fen, san) {
  return pool.graphs[color]?.get(practicePositionKey(fen))?.edges.get(san) || null;
}
export function practiceReviewKeys(edges, fen) {
  const keys = new Set();
  for (const edge of edges)
    for (const [id, ref] of edge.refs) keys.add(id + '|' + practicePositionKey(ref.move.before));
  return [...keys];
}
export function choosePracticeReply(pool, color, fen, random = Math.random) {
  const edges = practiceOptions(pool, color, fen);
  return edges.length ? edges[pickIndex(edges.length, random)] : null;
}
