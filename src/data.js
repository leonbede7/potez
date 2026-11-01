export const starterCourses = [
  {
    id: 'italian',
    name: 'Italian Game',
    subtitle:
      'Develop towards f7 and prepare a central break. Includes Giuoco Pianissimo and Two Knights branches.',
    color: 'w',
    eco: 'C50',
    tone: 'sage',
    symbol: 'N',
    description:
      'Develop towards f7 and prepare a central break. Includes Giuoco Pianissimo and Two Knights branches.',
    pgn: '[Event "Italian Game"]\n[Opening "Italian Game"]\n\n1. e4 {Take central space and open lines for the bishop and queen.} e5 2. Nf3 {Develop the knight while attacking e5.} Nc6 3. Bc4 {The bishop targets f7, defining the Italian Game.} Bc5 (3... Nf6 {Two Knights Defence.} 4. d3 {Support the centre before continuing development.} Bc5 5. O-O {Secure the king and connect the rooks.} d6 6. c3 O-O 7. Re1 a6 8. Bb3 Ba7) 4. c3 {Prepare d4 to build a strong centre.} Nf6 (4... d6 5. d4 {Take the opportunity for a central break.} exd4 6. cxd4 Bb6 7. O-O Nf6 8. Nc3 O-O) 5. d3 {Defend e4 and release the c1-bishop.} d6 6. O-O {With the king safe, complete development.} O-O 7. Re1 a6 8. Bb3 {Preserve the active bishop.} Ba7 9. Nbd2 h6 10. Nf1 {The knight can continue to g3 to support an attack.} *',
  },
  {
    id: 'caro',
    name: 'Caro-Kann Defence',
    subtitle:
      'Challenge 1.e4 with ...c6 and ...d5, developing the light-squared bishop before ...e6.',
    color: 'b',
    eco: 'B12',
    tone: 'sand',
    symbol: 'B',
    description:
      'Challenge 1.e4 with ...c6 and ...d5, developing the light-squared bishop before ...e6.',
    pgn: '[Event "Caro-Kann Defence"]\n1. e4 c6 {Prepare d5 without blocking the c8-bishop.} 2. d4 d5 {Challenge White’s centre immediately.} 3. e5 (3. exd5 cxd5 {Recapture while maintaining a solid centre.} 4. Bd3 Nc6 5. c3 Nf6 6. Bf4 Bg4 7. Qb3 Qd7) (3. Nc3 dxe4 4. Nxe4 Bf5 {Develop the bishop with tempo against the knight.} 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7) Bf5 {Develop the bishop before playing e6.} 4. Nf3 e6 5. Be2 c5 {Attack the base of White’s centre on d4.} 6. O-O Nc6 7. Be3 cxd4 8. Nxd4 Nge7 *',
  },
  {
    id: 'london',
    name: 'London System',
    subtitle:
      'Build a d4–e3–c3 structure with the bishop on f4. Adapt development to Black’s moves.',
    color: 'w',
    eco: 'D02',
    tone: 'lavender',
    symbol: 'K',
    description:
      'Build a d4–e3–c3 structure with the bishop on f4. Adapt development to Black’s moves.',
    pgn: '[Event "London System"]\n1. d4 {Take space in the centre.} d5 2. Bf4 {Develop the bishop before e3 closes its diagonal.} Nf6 (2... c5 3. e3 Nc6 4. c3 {Support d4 and maintain a solid centre.} Nf6 5. Nd2 e6 6. Ngf3 Bd6 7. Bg3 O-O) 3. e3 {Support d4 and open a path for the other bishop.} e6 4. Nf3 Bd6 5. Bg3 {Preserve the bishop and its diagonal.} O-O 6. Bd3 c5 7. c3 Nc6 8. Nbd2 b6 9. O-O Bb7 *',
  },
  {
    id: 'sicilian',
    name: 'Sicilian Defence',
    subtitle:
      'Create an asymmetrical centre after 1.e4 c5. Includes an Open Sicilian and an Alapin response.',
    color: 'b',
    eco: 'B90',
    tone: 'clay',
    symbol: 'R',
    description:
      'Create an asymmetrical centre after 1.e4 c5. Includes an Open Sicilian and an Alapin response.',
    pgn: '[Event "Sicilian Defence"]\n1. e4 c5 {Control d4 and create an asymmetrical position.} 2. Nf3 (2. c3 Nf6 {Attack e4 while White prepares d4.} 3. e5 Nd5 4. d4 cxd4 5. Nf3 Nc6) d6 3. d4 cxd4 {Exchange a flank pawn for a central pawn.} 4. Nxd4 Nf6 {Develop a piece and attack e4.} 5. Nc3 a6 {The Najdorf move controls b5.} 6. Be3 e5 {Take the centre with tempo against the knight.} 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O *',
  },
];

export const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
