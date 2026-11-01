import { Chess } from 'chess.js';

export function largePgnFixture() {
  const games = [];
  let seed = 314159;
  for (let i = 0; i < 2200; i++) {
    const chess = new Chess();
    for (let ply = 0; ply < 12 && !chess.isGameOver(); ply++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const legal = chess.moves();
      chess.move(legal[seed % legal.length]);
    }
    const movetext = chess
      .pgn()
      .replace(/\[[^\n]*\]\s*/g, '')
      .trim()
      .replace(/\s+(1-0|0-1|1\/2-1\/2|\*)$/, '');
    games.push(
      `[Event "Poglavlje ${i + 1}"]\n{${'Plan razvoja figura. '.repeat(58)}}\n${movetext} *`,
    );
  }
  return games.join('\n\n');
}

export function densePgnFixture() {
  const moves = Array.from(
    { length: 24 },
    (_, i) => `${2 * i + 1}. Nf3 Nf6 ${2 * i + 2}. Ng1 Ng8`,
  ).join(' ');
  return Array.from(
    { length: 3300 },
    (_, i) => `[Event "Gusta zbirka ${i + 1}"]\n{${'Plan. '.repeat(30)}}\n${moves} *`,
  ).join('\n\n');
}
