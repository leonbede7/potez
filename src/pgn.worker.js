import { parseRepertoire } from './model.js';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      lines: parseRepertoire(data.pgn, {
        onProgress: (progress) => self.postMessage({ progress }),
      }),
    });
  } catch (error) {
    self.postMessage({ error: error.message || 'Could not read PGN.' });
  }
};
