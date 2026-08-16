#!/usr/bin/env node
// Guards the P1 index-letter stroke-collision fix (IndexLetter.jsx) against silent regression.
//
// jsdom renders no text at all, so nothing about a stroke self-intersecting inside a glyph's
// own counters can be asserted in a unit test — that is exactly why the original defect shipped
// undetected under 184 passing unit tests. This check renders the REAL component through the
// project's own dev server (real font, real Tailwind stylesheet, real DOM) via the
// dev-index-letter.html harness, and inspects actual pixels.
//
// Two layers, because either alone misses a real regression:
//   1. Computed style is PINNED to the calibrated values (weight 400 / stretch 100% / stroke
//      0.85px). Catches any drift in the declared parameters, including a revert to the old
//      2px / 900 / 62.5% that produced the defect.
//   2. Pixel inspection of the actually rendered glyphs, because a declared value surviving the
//      cascade is not the same claim as the glyph rendering cleanly — see
//      scripts/check-browser.mjs's own header for why "the rule is declared" and "the rule
//      survives" are different questions. `P` and `Œ` have a genuine enclosed counter (the bowl,
//      the O), so a collision closes it — measured directly as the largest background-coloured
//      region's share of the glyph's own bounding box. `M` and `N` don't have an enclosed
//      counter (their notches are open to the frame edge); their defect is a self-intersecting
//      stroke painting EXTRA ink pixels inside the fill, so they are checked by ink-pixel share
//      instead — low when the stroke is a clean single contour, elevated when it collides.
//
// Calibrated once against this project's own rendering (see the P1 fix report for the full
// sweep): P's enclosed-area share measured ~0.16 at the shipped values and ~0.038 at the old
// 2px/900/62.5% ones; M/N's ink share measured ~0.17 shipped vs ~0.28-0.32 old. Thresholds below
// sit with margin on the correct side of both measurements.
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { startFixtureServer, stopFixtureServer } from './fixture-server.mjs';

// A dedicated port and env var: 5198 already belongs to profile-stream.mjs's PROFILE_PORT and
// 5199 to check-browser.mjs's CHECK_PORT — sharing either risks a collision if two of these
// checks are ever run together (CI, or a developer with both in a split terminal).
const PORT = Number(process.env.INDEX_LETTER_CHECK_PORT ?? 5197);
const BASE = `http://localhost:${PORT}`;
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const resolveChrome = () => {
  const candidate = process.env.CHROME_PATH || MAC_CHROME;
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(`No Chrome found at ${candidate}. Set CHROME_PATH.`);
};

const failures = [];
const record = (ok, label, detail) => {
  if (ok) console.log(`  ok    ${label}`);
  else {
    console.log(`  FAIL  ${label} — ${detail}`);
    failures.push(`${label}: ${detail}`);
  }
};

// The calibrated parameters. A future change to IndexLetter.jsx's stroke treatment must update
// these deliberately — that is the point of a pin.
const EXPECTED = { fontWeight: '400', fontStretch: '100%', strokeWidth: '0.85px' };

// Color classification by nearest of the three palette tokens actually in play on this element
// (paper ground, ink stroke, imprint fill). Screenshots are PNG (no alpha blending against a
// non-paper backdrop), so nearest-of-three is unambiguous except at antialiased edges, which is
// fine — this measures interior regions, not edges.
const PAPER = [246, 246, 243];
const INK = [11, 11, 11];
const IMPRINT = [242, 194, 0];
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

const classify = (r, g, b) => {
  const px = [r, g, b];
  const dPaper = dist2(px, PAPER);
  const dInk = dist2(px, INK);
  const dImprint = dist2(px, IMPRINT);
  if (dPaper <= dInk && dPaper <= dImprint) return 'paper';
  if (dInk <= dImprint) return 'ink';
  return 'imprint';
};

const readPixels = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const grid = Array.from({ length: height });
  for (let y = 0; y < height; y += 1) {
    const row = Array.from({ length: width });
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      row[x] = classify(data[i], data[i + 1], data[i + 2]);
    }
    grid[y] = row;
  }
  return { grid, width, height };
};

// BFS from the border inward over paper-classified pixels only. Anything paper-classified but
// NOT reached this way is enclosed by ink/imprint — a genuine counter (or, if collapsed, no
// longer one).
const largestEnclosedPaperRatio = ({ grid, width, height }) => {
  const outside = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const queue = [];
  const enqueue = (x, y) => {
    if (grid[y][x] === 'paper' && !outside[y][x]) {
      outside[y][x] = true;
      queue.push([x, y]);
    }
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) enqueue(nx, ny);
    }
  }
  const seen = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  let best = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y][x] === 'paper' && !outside[y][x] && !seen[y][x]) {
        let area = 0;
        const stack = [[x, y]];
        seen[y][x] = true;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          area += 1;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (
              nx >= 0 &&
              nx < width &&
              ny >= 0 &&
              ny < height &&
              grid[ny][nx] === 'paper' &&
              !outside[ny][nx] &&
              !seen[ny][nx]
            ) {
              seen[ny][nx] = true;
              stack.push([nx, ny]);
            }
          }
        }
        best = Math.max(best, area);
      }
    }
  }
  return best / (width * height);
};

const inkRatio = ({ grid, width, height }) => {
  let ink = 0;
  let glyph = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y][x] === 'ink') {
        ink += 1;
        glyph += 1;
      } else if (grid[y][x] === 'imprint') {
        glyph += 1;
      }
    }
  }
  return glyph === 0 ? 0 : ink / glyph;
};

console.log(`starting a plain dev server on :${PORT} for the IndexLetter harness\n`);
const server = await startFixtureServer({ port: PORT, readyPath: '/dev-index-letter.html' });
const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 2200, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/dev-index-letter.html`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-glyph]', { timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);

  console.log('parameters are pinned against drift');
  const style = await page.evaluate(() => {
    const el = document.querySelector('[data-glyph="A"] [aria-hidden="true"]');
    const s = getComputedStyle(el);
    return { fontWeight: s.fontWeight, fontStretch: s.fontStretch, strokeWidth: s.webkitTextStrokeWidth };
  });
  for (const key of Object.keys(EXPECTED)) {
    record(
      style[key] === EXPECTED[key],
      `computed ${key} is the calibrated value`,
      `expected ${EXPECTED[key]}, got ${style[key]}`,
    );
  }

  console.log('\nP and Œ: the enclosed counter is genuinely open, not collapsed by a collision');
  const ENCLOSED_MIN = { P: 0.1, Œ: 0.15 };
  for (const [letter, min] of Object.entries(ENCLOSED_MIN)) {
    const el = await page.$(`[data-glyph="${letter}"] [aria-hidden="true"]`);
    const buffer = await el.screenshot();
    const ratio = largestEnclosedPaperRatio(await readPixels(buffer));
    record(
      ratio >= min,
      `${letter}'s largest enclosed counter is at least ${min} of its frame`,
      `measured ${ratio.toFixed(3)} — a collision collapses this toward the old ~0.04`,
    );
  }

  console.log('\nM and N: no self-intersecting stroke inflating the ink share');
  const INK_MAX = { M: 0.24, N: 0.24 };
  for (const [letter, max] of Object.entries(INK_MAX)) {
    const el = await page.$(`[data-glyph="${letter}"] [aria-hidden="true"]`);
    const buffer = await el.screenshot();
    const ratio = inkRatio(await readPixels(buffer));
    record(
      ratio <= max,
      `${letter}'s ink share stays at most ${max} of its own glyph area`,
      `measured ${ratio.toFixed(3)} — a collision paints extra ink and pushed this to ~0.28-0.32 at the old parameters`,
    );
  }

  console.log('\nthe clean set is unaffected by the retune');
  for (const letter of ['A', 'L', 'V', 'Z', '1']) {
    const className = await page.evaluate(
      (l) => document.querySelector(`[data-glyph="${l}"] [aria-hidden="true"]`).className,
      letter,
    );
    record(
      className.includes('text-imprint') && className.includes('-webkit-text-stroke'),
      `${letter} keeps the stroked-imprint treatment`,
      className,
    );
  }

  console.log('\nthe symbol carve-out is untouched by this fix');
  const hashClassName = await page.evaluate(
    () => document.querySelector('[data-glyph="#"] [aria-hidden="true"]').className,
  );
  record(
    hashClassName.includes('text-ink') && !hashClassName.includes('-webkit-text-stroke'),
    '# still renders solid ink, unstroked',
    hashClassName,
  );
} finally {
  await browser.close();
  await stopFixtureServer(server);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll index-letter checks passed.');
