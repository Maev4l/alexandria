import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Serves the tiny placeholder cover images from tools/fixture-covers/ at a fixed, well-known
// path — so a fixture's `picture` can be a real, same-origin URL that actually loads, exercising
// `pictureSrc`'s `?v={updatedAt}` cache-bust exactly as the real CDN URL does, instead of a
// `data:` URI (which cannot carry a query string without corrupting the payload).
//
// Registered unconditionally by the mock-api plugin, which itself is only wired into `vite.config
// .js` when VITE_MOCK=1 — so this middleware, and the covers it reads, never run in a production
// build and add nothing to the shipped bundle. The images live under tools/, not public/, for the
// same reason: public/ is copied into dist/ verbatim regardless of mock mode.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVERS_DIR = path.resolve(__dirname, 'fixture-covers');
const PREFIX = '/mock-thumbnails/';

export const mockCoversMiddleware = (req, res, next) => {
  const url = req.originalUrl ?? req.url ?? '';
  const [pathname] = url.split('?');
  if (!pathname.startsWith(PREFIX)) {
    next();
    return;
  }

  const name = pathname.slice(PREFIX.length);
  // Reject anything that could escape COVERS_DIR before it ever reaches the filesystem — this
  // path is built from a request URL, and the six real filenames never contain "..".
  if (!/^[\w-]+\.webp$/.test(name)) {
    res.statusCode = 404;
    res.end();
    return;
  }

  fs.readFile(path.join(COVERS_DIR, name), (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/webp');
    res.end(data);
  });
};
