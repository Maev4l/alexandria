import { handleMockRequest } from './mock-api.js';
import { mockCoversMiddleware } from './mock-covers.js';

// Serves the API from fixtures so every screen is buildable, reviewable and screenshot-able
// without AWS credentials or a seeded account. Enabled only when VITE_MOCK=1.
//
// A visible, constant latency so loading states are exercised rather than skipped: a screen
// that only ever sees instant data hides its own skeleton.
const LATENCY_MS = 120;

// Connect gives raw chunks, not a parsed body — Vite's dev/preview server runs no body-parser
// ahead of this middleware. A write (LENT/RETURNED, item edits) needs the body to know what to
// apply, so it has to be collected and parsed here rather than assumed away.
const readJsonBody = (req) =>
  new Promise((resolve) => {
    if (req.method !== 'POST' && req.method !== 'PUT') {
      resolve(undefined);
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch {
        resolve(undefined);
      }
    });
  });

// Not `async` itself — an async Connect handler that rejects has nothing to forward the
// rejection to, since Connect never awaits a middleware's return value. `readJsonBody` never
// rejects (its own promise executor only ever resolves), so `.catch(next)` here is a belt for a
// suspenders that should never fail, not a load-bearing recovery path.
const middleware = (req, res, next) => {
  readJsonBody(req)
    .then((body) => {
      const result = handleMockRequest(req.method, req.originalUrl ?? req.url, body);
      if (!result) {
        next();
        return;
      }
      setTimeout(() => {
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result.body ?? {}));
      }, LATENCY_MS);
    })
    .catch(next);
};

export const mockApi = () => ({
  name: 'alexandria-mock-api',
  configureServer(server) {
    server.middlewares.use('/api/v1', middleware);
    // Not mounted under a path prefix: unlike '/api/v1' above, this one matches on the full
    // pathname itself (see mock-covers.js), so it can sit anywhere in the chain.
    server.middlewares.use(mockCoversMiddleware);
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/v1', middleware);
    server.middlewares.use(mockCoversMiddleware);
  },
});
