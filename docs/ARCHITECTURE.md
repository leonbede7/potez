# Architecture

Potez is a browser app built with JavaScript, Vite and native CSS. There is no application server, account system, telemetry, or runtime chess engine.

## Import pipeline

`import-pgn.js` sends PGN text to `pgn.worker.js`. The worker uses `@mliebelt/pgn-parser` for syntax and `chess.js` for legal replay. The input limit is 10 MB of UTF-8 text. There is no extra limit on expanded variation count or repeated source moves.

Validation caches `(full FEN, SAN)` pairs. Lines share immutable move records while preserving branch-specific comments. Exact duplicate lines are removed. Imports retain multiple games, nested variations, initial FENs and promotions.

## Training

`main.js` coordinates the standard trainer, board interactions, import dialogs and navigation. `model.js` provides pure PGN and review functions. `studio.js` handles settings, searches and session helpers; `studio-ui.js` renders those controls.

Standard training follows compatible PGN prefixes, including the starting FEN. Opponent moves are scheduled and cancelled on navigation. Learn provides arrows, Practice tests recall, Review prioritizes due positions, and Explore supports browsing and notes.

The interval schedule is 4 hours, then 1, 3, 7, 14 and 30 days. An error or hint resets the position and schedules it one minute later. This deliberately simple scheduler is not FSRS.

## Mastery challenge

`custom-practice.js` builds one position graph per training side. Graph keys include piece placement, side to move, castling rights and en-passant state. Every recorded continuation at the current position is accepted, including transpositions.

`custom-mastery.js` identifies complete lines by their training side, starting position and SAN sequence. Names, comments, import order and move clocks do not affect the identity. Exact duplicate lines share one mastery point.

`custom-practice-ui.js` runs full-line rounds. A complete clean path earns one point. An error, hint or skip revokes the active line’s existing point; later correct moves in the same assisted round cannot restore it. A new clean round can. Pausing retains earned mastery. Completion requires every selected unique line to be mastered. Missing lines receive 75% of draws when both missing and mastered lines exist; the remaining draws retest earned points.

Graph acceptance and certification are separate: a combined transposition path is playable, but cannot certify unplayed decisions from an original PGN line. Prefix candidates track which complete recorded lines have actually been followed.

## Persistence and migrations

`storage.js` stores repertoires and small training metadata separately in IndexedDB. Unchanged course objects are not rewritten for every move. Saves are queued. The legacy `potez-studio-v1` localStorage value is removed only after successful migration.

`study-pack.js` installs bundled courses additively. Content upgrades back up old PGNs and reset only review keys whose accepted moves change. The English migration replaces bundled default labels and untouched samples, preserving user edits, custom PGNs, notes, archives and mastery identities.

JSON backups contain the original PGNs rather than expanded move arrays. Restoration reparses them. Different origins, browsers and devices have separate stores; the app does not synchronize them.

## Study content

`personal-opening-data.json` contains 82 foundation chapters. `verified-opening-data.json` contains 36 advanced continuations, 18 FEN decision drills, pinned theory sources and search metadata. `public/repertoires/opening-verification.json` retains the detailed audit.

Stockfish 19 was used offline at a budget of at least 3 million nodes per non-terminal position. The report distinguishes chosen opening commitments from subsequent checked moves. It does not claim proof of optimality. Scripts for the original research expect a separate local `../opening-research` directory and a Stockfish executable; those inputs and binaries are not shipped. The application and its test suite run without them.

`npm run export:repertoires` regenerates the downloadable English PGNs and study notes from the checked-in definitions.
