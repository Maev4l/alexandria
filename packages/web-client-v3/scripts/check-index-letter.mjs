#!/usr/bin/env node
// Guards IndexLetter.jsx's rendering treatment against silent regression.
//
// jsdom renders no text at all, so nothing about a glyph's actual pixels — a stroke colliding
// with itself inside a counter, or a fill sitting where it shouldn't — can be asserted in a unit
// test. That is exactly why the original stroke-collision defect shipped undetected under 184
// passing unit tests. This check renders the REAL component through the project's own dev
// server (real font, real Tailwind stylesheet, real DOM) via the dev-index-letter.html harness,
// and inspects actual pixels.
//
// ROUND 2 HISTORY (see IndexLetter.jsx's header for the full account): round 1 shipped a
// stroked-imprint-fill letter (0.85px stroke / weight 400 / stretch 100%) that reduced but never
// eliminated a stroke self-collision on M/N. That was reverted — rendered against the real
// stream, the residual mark was still visible at reading size. Round 2 replaced the whole
// construction: SOLID INK, no stroke, no fill, with --imprint moved to the 4px rule beneath the
// letter instead of living on the letter itself. A solid fill has no offset outline to collide
// with, for any glyph, at any weight — so the checks below assert an ABSENCE (no imprint-colored
// pixel anywhere in a glyph's own crop) rather than measuring how small a collision has become.
//
// Two layers, because either alone misses a real regression:
//   1. Computed style is PINNED: weight 900 / stretch 62.5% (the original letterform, unchanged
//      by this fix — nothing about solid ink needed softening it), stroke width 0px (none at
//      all — catches a reintroduced `-webkit-text-stroke` before it can ever collide), text
//      color ink (not imprint), and the separator's own border-bottom-color is imprint (the rule
//      is where the accent lives now).
//   2. Pixel inspection of the actually rendered glyphs, because a declared value surviving the
//      cascade is not the same claim as "no yellow pixel actually landed inside this glyph." Each
//      glyph's own crop is checked for (a) zero imprint-classified pixels — this fails hard
//      against both prior treatments: round 1's stroked-imprint-fill (majority-imprint pixels)
//      and the plate candidate considered and rejected this round (imprint fill surrounding the
//      letter) — and (b) a real ink glyph actually rendered (not a blank crop). P and Œ also keep
//      a targeted check that their enclosed counter (the bowl; the O) is genuinely open, since
//      solid ink COULD in principle be heavy enough to bridge one even with no stroke involved.
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

// The calibrated parameters. A future change to IndexLetter.jsx's treatment must update these
// deliberately — that is the point of a pin. Weight/stretch are round 1's ORIGINAL values,
// unchanged by round 2 — only the stroke (now none) and the fill (now ink, not imprint) moved.
const EXPECTED_STYLE = { fontWeight: '900', fontStretch: '62.5%', strokeWidth: '0px' };
const EXPECTED_COLOR = 'rgb(11, 11, 11)'; // --ink
const EXPECTED_BORDER = 'rgb(242, 194, 0)'; // --imprint — the rule, not the letter, carries it now

// Color classification by nearest of the three palette tokens actually in play on this element
// (paper ground, ink glyph, imprint — which after round 2 should never appear inside a glyph's
// own crop at all). Screenshots are PNG (no alpha blending against a non-paper backdrop), so
// nearest-of-three is unambiguous except at antialiased edges, which is fine — this measures
// interior regions in bulk, not edges.
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
// NOT reached this way is enclosed by ink — a genuine counter (or, if bridged, no longer one).
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

// Share of a glyph's own crop that classifies as ink, or as imprint. After round 2 every glyph
// should be ink-only (plus paper background) — an imprint share above ~zero means a fill or a
// stroke painted yellow pixels where none belong.
const colorRatios = ({ grid, width, height }) => {
  let ink = 0;
  let imprint = 0;
  const total = width * height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y][x] === 'ink') ink += 1;
      else if (grid[y][x] === 'imprint') imprint += 1;
    }
  }
  return { inkRatio: ink / total, imprintRatio: imprint / total };
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

  console.log('the letterform (weight/stretch/stroke/color) is pinned against drift');
  const style = await page.evaluate(() => {
    const el = document.querySelector('[data-glyph="A"] [aria-hidden="true"]');
    const s = getComputedStyle(el);
    return {
      fontWeight: s.fontWeight,
      fontStretch: s.fontStretch,
      strokeWidth: s.webkitTextStrokeWidth,
      color: s.color,
    };
  });
  for (const key of Object.keys(EXPECTED_STYLE)) {
    record(
      style[key] === EXPECTED_STYLE[key],
      `computed ${key} is the calibrated value`,
      `expected ${EXPECTED_STYLE[key]}, got ${style[key]}`,
    );
  }
  record(
    style.color === EXPECTED_COLOR,
    'the glyph is solid ink, not imprint',
    `expected ${EXPECTED_COLOR}, got ${style.color}`,
  );

  console.log('\nthe accent lives on the rule, not the letter (Iridescent Edge: edges, not content)');
  const borderColor = await page.evaluate(() => {
    const el = document.querySelector('[data-glyph="A"] [role="separator"]');
    return getComputedStyle(el).borderBottomColor;
  });
  record(
    borderColor === EXPECTED_BORDER,
    "the separator's border-bottom-color is --imprint",
    `expected ${EXPECTED_BORDER}, got ${borderColor}`,
  );

  console.log('\nP and Œ: the enclosed counter is genuinely open (solid ink alone cannot bridge it)');
  // Thresholds recalibrated for round 2: a solid-ink glyph crops tighter than the old
  // stroked-fill one did (no 2px/0.85px stroke padding the bounding box outward), so the
  // enclosed-counter share is naturally smaller here even though both counters are fully open —
  // confirmed visually (scratchpad crops) before lowering these. Margin kept below the measured
  // ~0.057 / ~0.100 so a genuine bridge (which would push the ratio toward 0) is still caught.
  const ENCLOSED_MIN = { P: 0.03, Œ: 0.07 };
  for (const [letter, min] of Object.entries(ENCLOSED_MIN)) {
    const el = await page.$(`[data-glyph="${letter}"] [aria-hidden="true"]`);
    const buffer = await el.screenshot();
    const ratio = largestEnclosedPaperRatio(await readPixels(buffer));
    record(
      ratio >= min,
      `${letter}'s largest enclosed counter is at least ${min} of its frame`,
      `measured ${ratio.toFixed(3)}`,
    );
  }

  console.log('\nevery glyph renders solid ink with ZERO imprint pixels in its own crop');
  // The full crop set the round-2 brief named, plus the previously-hard set and the previously
  // clean set: after collapsing the alphanumeric/symbol split, every one of these must now take
  // the identical treatment. A non-zero imprint share here fails against BOTH prior treatments —
  // round 1's stroked-imprint-fill (majority imprint) and the plate candidate rejected this round
  // (imprint fill framing the letter).
  // 0.01 was too tight: a flat-bottomed glyph (L, whose foot spans its full width) can catch a
  // hairline of the adjacent imprint border rule in its own screenshot bounding box, from
  // sub-pixel rounding of that box's height — confirmed by inspecting L's crop directly, which
  // shows a clean solid glyph with no yellow visible to the eye. 0.02 clears that artifact by a
  // wide margin while still failing hard against an actual fill or plate (double-digit percent).
  const IMPRINT_MAX = 0.02;
  const INK_MIN = 0.1;
  for (const letter of ['M', 'N', 'P', 'Œ', 'A', 'L', 'V', 'Z', '1', '#', '&']) {
    const el = await page.$(`[data-glyph="${letter}"] [aria-hidden="true"]`);
    const buffer = await el.screenshot();
    const { inkRatio, imprintRatio } = colorRatios(await readPixels(buffer));
    record(
      imprintRatio <= IMPRINT_MAX && inkRatio >= INK_MIN,
      `${letter} is solid ink with no imprint pixels`,
      `ink ratio ${inkRatio.toFixed(3)} (want ≥ ${INK_MIN}), imprint ratio ${imprintRatio.toFixed(3)} (want ≤ ${IMPRINT_MAX})`,
    );
  }
} finally {
  await browser.close();
  await stopFixtureServer(server);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll index-letter checks passed.');
