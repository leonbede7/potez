# Contributing

Use Node.js 22 or newer. Node.js 24 is used for the demo build.

```sh
npm ci
npm run dev
npm test
npm run build
```

Keep changes focused. Describe the problem, resulting behaviour, and how you checked it. Include screenshots for interface changes and a PGN fixture for parser or branching bugs.

Changes to training or storage must preserve:

- custom PGNs, comments, FENs, underpromotions and nested variations;
- existing IndexedDB data and the `potez-studio-v1` legacy migration;
- content-based mastery identities when only labels or comments change;
- castling and en-passant distinctions when matching positions;
- cancellation of delayed replies when the user leaves a session.

Do not add an artificial expanded-move limit to the importer. The 10 MB UTF-8 file limit bounds the input; repeated source positions share validated move records.

When changing bundled teaching content, regenerate downloads with `npm run export:repertoires`. Do not describe a new line as engine-verified without actual search evidence. English edits must leave SAN sequences and starting positions unchanged unless the change intentionally corrects the chess content.

Keep `docs/screenshots/` limited to real app screenshots. Never commit browser exports, credentials, personal PGN uploads or local training databases.
