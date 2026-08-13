import { handleMockRequest } from './mock-api.js';

// Serves the API from fixtures so every screen is buildable, reviewable and screenshot-able
// without AWS credentials or a seeded account. Enabled only when VITE_MOCK=1.
//
// A visible, constant latency so loading states are exercised rather than skipped: a screen
// that only ever sees instant data hides its own skeleton.
const LATENCY_MS = 120;

const middleware = (req, res, next) => {
  const result = handleMockRequest(req.method, req.originalUrl ?? req.url);
  if (!result) {
    next();
    return;
  }
  setTimeout(() => {
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.body ?? {}));
  }, LATENCY_MS);
};

export const mockApi = () => ({
  name: 'alexandria-mock-api',
  configureServer(server) {
    server.middlewares.use('/api/v1', middleware);
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/v1', middleware);
  },
});
