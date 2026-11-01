// Snapshot of public Chess.com data; no engine evaluation.
export const playerAnalysis = {
  username: 'leonbede',
  snapshotDate: '2026-10-30',
  totalGames: 1106,
  period: {
    from: '2026-05-03',
    to: '2026-10-29',
  },
  rapid: {
    count: 130,
    white: 65,
    black: 65,
    whiteD4: 65,
    blackE4C5: 34,
    blackD4D5: 20,
    dragon: {
      count: 7,
      win: 0,
      draw: 1,
      loss: 6,
    },
    englund: {
      count: 4,
      win: 1,
      draw: 0,
      loss: 3,
    },
  },
  ratings: {
    rapid: 1928,
    blitz: 1805,
    bullet: 1540,
  },
  examples: [
    {
      url: 'https://www.chess.com/game/live/169179800014',
      topic: 'Englund: Qh4+',
    },
    {
      url: 'https://www.chess.com/game/live/185998822092',
      topic: 'Dragon: razvoj prije h6',
    },
    {
      url: 'https://www.chess.com/game/live/186168076010',
      topic: 'Trokut i brzi e4',
    },
  ],
  sources: [
    'https://api.chess.com/pub/player/leonbede/stats',
    'https://api.chess.com/pub/player/leonbede/games/archives',
    'https://www.chess.com/openings/Queens-Gambit',
    'https://www.chess.com/openings/Sicilian-Defense-Open-Dragon-Variation',
    'https://www.chess.com/openings/Kings-Indian-Defense',
    'https://github.com/lichess-org/chess-openings',
  ],
};
