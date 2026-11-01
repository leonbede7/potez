# Advanced opening verification

## Recorded search

- Engine: [Stockfish 19](https://github.com/official-stockfish/Stockfish/releases/tag/sf_19)
- Nodes: at least 3,000,000 per non-terminal position
- Recorded depth range: 21–52
- Coverage: 36 continuations, 18 decision drills, 1187 unique final positions
- Download SHA-256: `3c8bf1f9ea66a09350a40df4f632288285ac206d99f33ab5842c408fc30b48a7`

Every final move has an actual Stockfish evaluation. Opening commitments are explicit and excluded from a claim of globally optimal opening choice. Outside those commitments, generated best moves or checked alternatives lose at most 30 centipawns under the stated search. This is a finite engine check, not a proof of absolute optimality. Theory prefixes or transposed positions link to a pinned CC0 source. The master database required OAuth and was not used.

## Sources by chapter

### Part 2 · Slav and Semi-Slav

- [01 · Classical Slav: central control](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L226) — D19, depth 23–29
- [02 · Exchange Slav: development and material safety](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L201) — D14, depth 25–37
- [03 · Meran: calculating central play](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L472) — D49, depth 21–29
- [04 · Semi-Slav: development before the central break](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L446) — D46, depth 24–36
- [05 · Decision: Classical Slav: central control](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L226) — D19, depth 26–28
- [06 · Decision: Exchange Slav: development and material safety](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L201) — D14, depth 30–37

### Part 2 · Queen’s Gambit Declined

- [01 · Carlsbad: Nge2 and central preparation](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L380) — D36, depth 24–30
- [02 · Carlsbad: Nf3 and active rooks](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L377) — D36, depth 24–31
- [03 · Tarrasch: blockade and piece activity](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L351) — D34, depth 22–29
- [04 · Semi-Tarrasch: central tension](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L417) — D42, depth 22–30
- [05 · Decision: Carlsbad: Nge2 and central preparation](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L380) — D36, depth 24–27
- [06 · Decision: Carlsbad: Nf3 and active rooks](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L377) — D36, depth 24–28

### Part 2 · Queen’s Gambit: accepted and sidelines

- [01 · Queen’s Gambit Accepted: the central system](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L231) — D20, depth 23–33
- [02 · Against the Albin: a safe fianchetto](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L173) — D09, depth 24–29
- [03 · Against the Albin: the Nbd2 system](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L169) — D08, depth 23–29
- [04 · Chigorin Defence: development under pressure](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L155) — D07, depth 23–29
- [05 · Decision: Queen’s Gambit Accepted: the central system](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L231) — D20, depth 24–29
- [06 · Decision: Against the Albin: a safe fianchetto](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L173) — D09, depth 24–28

### Part 2 · Other defences to 1.d4

- [01 · Englund: development with tactical awareness](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/a.tsv#L514) — A40, depth 22–28
- [02 · Nimzo-Indian: the classical Qc2 system](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/e.tsv#L169) — E32, depth 24–36
- [03 · King’s Indian: the Bayonet system](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/e.tsv#L360) — E97, depth 23–30
- [04 · Grünfeld: supporting an active centre](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L618) — D89, depth 22–33
- [05 · Decision: Englund: development with tactical awareness](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/a.tsv#L514) — A40, depth 24–26
- [06 · Decision: Nimzo-Indian: the classical Qc2 system](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/e.tsv#L169) — E32, depth 24–29

### Part 2 · Sicilian Dragon

- [01 · Soltis: defence and the active c-file](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L722) — B79, depth 23–29
- [02 · Dragon against 9.O-O-O: the central response](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L708) — B76, depth 22–28
- [03 · Topalov Dragon: timely counterplay](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L720) — B78, depth 22–28
- [04 · Classical Dragon: central exchanges](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L697) — B74, depth 23–32
- [05 · Decision: Soltis: defence and the active c-file](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L722) — B79, depth 25–29
- [06 · Decision: Dragon against 9.O-O-O: the central response](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L708) — B76, depth 23–25

### Part 2 · Anti-Sicilians

- [01 · Alapin: central pressure](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L452) — B22, depth 25–30
- [02 · Moscow: development after the bishop exchange](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L638) — B52, depth 23–31
- [03 · Grand Prix: a central response](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L471) — B23, depth 23–28
- [04 · Early Bc4: development without a forced fianchetto](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L377) — B20, depth 24–52
- [05 · Decision: Alapin: central pressure](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L452) — B22, depth 25–28
- [06 · Decision: Moscow: development after the bishop exchange](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/b.tsv#L638) — B52, depth 23–27

### Part 2 · Open games with 1…e5

- [01 · Pianissimo: preparing central breaks](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/c.tsv#L931) — C54, depth 24–30
- [02 · Ruy Lopez: the Chigorin central structure](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/c.tsv#L1251) — C99, depth 24–29
- [03 · Open Italian: concrete defence](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/c.tsv#L952) — C54, depth 25–37
- [04 · Scotch: coordination and king safety](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/c.tsv#L758) — C45, depth 23–29
- [05 · Decision: Pianissimo: preparing central breaks](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/c.tsv#L931) — C54, depth 24–30
- [06 · Decision: Ruy Lopez: the Chigorin central structure](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/c.tsv#L1251) — C99, depth 24–27

### Part 2 · Fianchetto against d4, c4 and Nf3

- [01 · King’s Indian: the closed centre](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/e.tsv#L365) — E98, depth 22–30
- [02 · Fianchetto: central activity](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/e.tsv#L284) — E68, depth 22–30
- [03 · London against a fianchetto: development and counterplay](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/a.tsv#L642) — A48, depth 24–33
- [04 · Symmetrical English: the double fianchetto](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/a.tsv#L491) — A39, depth 24–30
- [05 · Decision: King’s Indian: the closed centre](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/e.tsv#L365) — E98, depth 22–28
- [06 · Decision: Fianchetto: central activity](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/e.tsv#L284) — E68, depth 22–27

### Part 2 · 1…d5: Albin and queen’s pawn systems

- [01 · Albin: development after the accepted gambit](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L173) — D09, depth 24–29
- [02 · Albin: central compensation against Nbd2](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L169) — D08, depth 23–29
- [03 · London against ...d5: active defence](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L96) — D02, depth 24–31
- [04 · Colle: controlling the central break](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L132) — D05, depth 26–32
- [05 · Decision: Albin: development after the accepted gambit](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L173) — D09, depth 24–28
- [06 · Decision: Albin: central compensation against Nbd2](https://github.com/lichess-org/chess-openings/blob/712a58be746c143f4ab935b68acc50f4bac813eb/d.tsv#L169) — D08, depth 23–27

## Scope and limits

The opening commitments select a defence; they are excluded from a claim that each introductory move is the engine’s global first choice. After those commitments, the reported finite search bounds checked score loss to 30 centipawns against the best move found. This is not proof of absolute optimality. Other moves may also be good. The Albin remains an intentionally riskier choice.

The raw JSON retains the original audit labels so the evidence remains traceable. English labels and comments do not change the checked SAN sequences or FENs. No engine runs in the browser. The Lichess master-game API required OAuth and was not used.

## Original correction example

An older Exchange Slav line contained 16.Rc2, allowing ...Bxc2 and losing a rook. The lines were rebuilt and checked rather than merely replayed for legal moves. Historical PGNs are retained in a local backup during content upgrades. User-created repertoires are not replaced.
