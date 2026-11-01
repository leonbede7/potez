export function parseInBackground(pgn, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pgn.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.progress) {
        onProgress?.(data.progress);
        return;
      }
      worker.terminate();
      if (data.error) reject(new Error(data.error));
      else resolve(data.lines);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(
        new Error(
          'PGN nije moguće obraditi. Pokušaj ponovno ili podijeli datoteku po poglavljima.',
        ),
      );
    };
    worker.postMessage({ pgn });
  });
}
