#!/usr/bin/env node
// Guards IndexLetter.jsx's rendering treatment against silent regression.
//
// jsdom renders no text at all, so nothing about a glyph's actual pixels — a stroke colliding
// with itself inside a counter, or a fragmented fill — can be asserted in a unit test. This check
// renders the REAL component through the project's own dev server (real font, real Tailwind
// stylesheet, real DOM) via the dev-index-letter.html harness, and inspects actual pixels.
//
// F3 HISTORY: round 2 shipped solid ink (no stroke) after judging the stroked construction
// (Candidate F) to collide on M/N/P at this weight/stretch/size — but every one of those crops
// was rendered in `system-ui` fallback (the shipped Archivo binary held only a space and `A` at
// the time), at a `font-stretch: 62.5%` a width-less fallback face silently ignores. Re-tested in
// the real, fixed Archivo: F does not collide, and the browse-stream comparison (solid ink at
// 76px reads as oversized content, the same colour as row titles, not as a mark) is what actually
// decided the reversion. Candidate F is restored. See IndexLetter.jsx's own header for the full
// account, and .superpowers/sdd/2026-08-13-web-client-v3/f3-report.md for the measurements below.
//
// The alphanumeric/symbol carve-out this file used to check for is GONE — the claim that symbols
// self-collide (specifically: "# resolves into nine separate yellow quadrilaterals") came from
// the same contaminated round and does not hold in real Archivo (measured below: `#`'s fill is
// 96%+ one connected piece). One treatment, one set of checks, for every glyph.
//
// Three layers:
//   1. Computed style is PINNED: weight 900 / stretch 62.5% (unchanged since round 1), stroke
//      width 2px (F's mechanism — an offset ink outline), fill color imprint (not ink), and the
//      separator's own border-bottom-color is ink (the accent moved OFF the rule and back onto
//      the letter itself — the reverse of round 2's move).
//   2. Enclosed-counter openness for M, N, P, Œ — the four glyphs the historical collision claim
//      named. M/N's counters open at the glyph's own cap-height (not a closed loop like P/Œ's),
//      so a naive 4-edge flood-fill wrongly treats them as connected to the exterior regardless
//      of health — this shipped undetected in the F2b round, which could only ever report 0.0 for
//      M/N and correctly flagged that as a known limitation rather than evidence. Fixed by (a)
//      trimming the pixel grid to the ink's own bounding box, and (b) seeding the flood-fill only
//      from the trimmed grid's LEFT/RIGHT columns, not its top/bottom rows — a notch that opens at
//      cap-height can still have paper reaching that same top row (diagonal apexes commonly
//      undershoot flat-topped stems slightly), so seeding the top row lets the flood walk straight
//      across it. Validated against a synthetic stroke-width sweep (2/4/6/8px) before trusting it:
//      the metric drops monotonically as a real collision is manufactured, and the 2px value
//      matches the real-component measurement exactly (see f3-report.md).
//   3. Fill-connectivity for `#` — the one glyph with a specific historical fragmentation claim
//      attached to it. Counts connected components of imprint-classified pixels; a genuinely
//      fragmented fill (the claimed "nine separate quadrilaterals") would show as several
//      similar-sized components, not one dominant one plus antialiasing noise.
//
// NOT automated per-symbol: `&`, `@`, `%` all have real counters and were confirmed open by direct
// visual inspection (crops in f3-report.md) plus the fill-connectivity check above, but the
// enclosed-counter algorithm above proved unreliable on `&`'s more complex, non-convex silhouette
// (its crossbar stroke's sidebearing meant the trim+cols-only heuristic misread real ink near the
// crop edge as exterior background) — an automated check that produces a false reading is worse
// than no automated check, so `&`'s counter-openness rests on the crops, not a pinned number here.
// `%` and `"` are correctly MULTI-piece by design (a percent sign's rings don't touch its slash;
// a double quote is two unconnected wedges) — a blanket "one connected piece" assertion across
// every glyph would be wrong for these, which is why layer 3 targets `#` specifically rather than
// every glyph in the set.
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { startFixtureServer, stopFixtureServer } from './fixture-server.mjs';

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

// Candidate F's calibrated parameters. Weight/stretch/size are unchanged since round 1; stroke
// width, fill color and border color are F's own (the reverse of round 2's ink-fill/imprint-rule
// pairing).
const EXPECTED_STYLE = { fontWeight: '900', fontStretch: '62.5%', strokeWidth: '2px' };
const EXPECTED_COLOR = 'rgb(242, 194, 0)'; // --imprint — the fill, restored to the letter itself
const EXPECTED_BORDER = 'rgb(11, 11, 11)'; // --ink — the rule, no longer carrying the accent

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

// Trims the grid to the bounding box of ink-classified pixels — needed so a counter that opens
// at the glyph's own cap-height isn't falsely connected to line-box padding above it.
const trimToInkBBox = ({ grid, width, height }) => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y][x] === 'ink') {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const trimmed = [];
  for (let y = minY; y <= maxY; y += 1) trimmed.push(grid[y].slice(minX, maxX + 1));
  return { grid: trimmed, width: maxX - minX + 1, height: maxY - minY + 1 };
};

// Flood-fill seeded ONLY from the left/right columns (not top/bottom rows) — see file header for
// why. This is the corrected, general-purpose version of the check; it produces identical results
// to a standard 4-edge flood for P/Œ (true closed loops) and correctly stops false-connecting M/N's
// open-topped notches to the exterior.
const largestEnclosedPaperRatio = ({ grid, width, height }) => {
  const outside = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const queue = [];
  const enqueue = (x, y) => {
    if (grid[y][x] === 'paper' && !outside[y][x]) {
      outside[y][x] = true;
      queue.push([x, y]);
    }
  };
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

// Connected components of a single color class — used for the `#` fragmentation check.
const connectedComponentSizes = (grid, width, height, colorKey) => {
  const seen = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const sizes = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y][x] === colorKey && !seen[y][x]) {
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
              grid[ny][nx] === colorKey &&
              !seen[ny][nx]
            ) {
              seen[ny][nx] = true;
              stack.push([nx, ny]);
            }
          }
        }
        sizes.push(area);
      }
    }
  }
  return sizes;
};

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

// Looks a glyph's wrapper up by dataset comparison in-page rather than building a CSS attribute
// selector string — several test glyphs (`"`, `'`) cannot be safely interpolated into a CSS
// selector's quoted value at all without escaping, and `CSS.escape` on `"` still produced a
// selector Puppeteer's own query-handler rejected. Comparing `dataset.glyph` in JS sidesteps CSS
// quoting entirely, for any character the fold could ever produce.
const glyphSpan = async (page, letter) => {
  const handle = await page.evaluateHandle((glyph) => {
    const wrapper = [...document.querySelectorAll('[data-glyph]')].find((w) => w.dataset.glyph === glyph);
    return wrapper ? wrapper.querySelector('[aria-hidden="true"]') : null;
  }, letter);
  return handle.asElement();
};

console.log(`starting a plain dev server on :${PORT} for the IndexLetter harness\n`);
const server = await startFixtureServer({ port: PORT, readyPath: '/dev-index-letter.html' });
const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 2200, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/dev-index-letter.html`, { waitUntil: 'networkidle0', timeout: 30_000 });
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
    'the glyph fill is imprint, not ink',
    `expected ${EXPECTED_COLOR}, got ${style.color}`,
  );

  console.log('\nthe accent lives on the letter again (the stroke IS the yellow-on-paper contrast mechanism)');
  const borderColor = await page.evaluate(() => {
    const el = document.querySelector('[data-glyph="A"] [role="separator"]');
    return getComputedStyle(el).borderBottomColor;
  });
  record(
    borderColor === EXPECTED_BORDER,
    "the separator's border-bottom-color is --ink",
    `expected ${EXPECTED_BORDER}, got ${borderColor}`,
  );

  console.log('\nM, N, P, Œ: the counter is genuinely open (stroke does not bridge it)');
  // RE-DERIVED (F3), against real Archivo, real component, real F treatment. Each threshold sits
  // at roughly half its own real worst-case-clean measurement — comfortably below the healthy
  // value, comfortably above 0 (what an actual bridge produces). Full separation figures (worst
  // clean / best synthetic-failing / margin) are recorded in f3-report.md; summarized here:
  //   M: real clean 0.0428 (synthetic collision sweep: 4px stroke→0.0249, 6px→0.0125, 8px→0.0049)
  //   N: real clean 0.0250 (synthetic: 3px→0.0170, 4px→0.0107)
  //   P: real clean 0.0231 (synthetic: 3px→0.0149, 4px→0.0071)
  //   Œ: real clean 0.0657 (synthetic: 4px→0.0710, 6px→0.0498 — a different rendering context
  //      than the harness measurement, see f3-report.md; direction still monotonic-down)
  const ENCLOSED_MIN = { M: 0.02, N: 0.012, P: 0.011, Œ: 0.03 };
  for (const [letter, min] of Object.entries(ENCLOSED_MIN)) {
    const el = await glyphSpan(page, letter);
    const buffer = await el.screenshot();
    const trimmed = trimToInkBBox(await readPixels(buffer));
    const ratio = trimmed ? largestEnclosedPaperRatio(trimmed) : 0;
    record(
      ratio >= min,
      `${letter}'s largest enclosed counter is at least ${min} of its (trimmed) frame`,
      `measured ${ratio.toFixed(4)}`,
    );
  }

  console.log("\n# : the fill is one connected piece, not fragmented (the historical claim, now checked)");
  // Real measured: 96.6% in one component, rest is antialiasing noise (1-53px specks) — see
  // f3-report.md's connected-components dump. Floor set well below that and well above where a
  // genuine 9-way fragmentation would land (~11% each).
  const HASH_LARGEST_COMPONENT_MIN = 0.85;
  {
    const el = await glyphSpan(page, '#');
    const buffer = await el.screenshot();
    const { grid, width, height } = await readPixels(buffer);
    const components = connectedComponentSizes(grid, width, height, 'imprint').sort((a, b) => b - a);
    const total = components.reduce((a, b) => a + b, 0);
    const largestShare = total ? components[0] / total : 0;
    record(
      largestShare >= HASH_LARGEST_COMPONENT_MIN,
      `# 's fill is at least ${HASH_LARGEST_COMPONENT_MIN * 100}% one connected piece`,
      `measured ${(largestShare * 100).toFixed(1)}% in the largest of ${components.length} components`,
    );
  }

  console.log('\nevery glyph shows both colors (stroke and fill both actually render)');
  // Lightweight regression net, not a shape assertion: catches the stroke or the fill vanishing
  // wholesale (e.g., stroke width reverting to 0, or fill color reverting to ink) for ANY glyph
  // the fold can produce, including the newly-tested symbol set. Floors are well below every
  // glyph's own measured ratio (thinnest glyphs — quotes — still clear 0.10/0.17).
  const INK_MIN = 0.05;
  const IMPRINT_MIN = 0.1;
  const ALL_GLYPHS = ['M', 'N', 'P', 'Œ', 'A', 'L', 'V', 'Z', '1', '#', '&', '@', '*', '"', "'", '(', ')', '%'];
  for (const letter of ALL_GLYPHS) {
    const el = await glyphSpan(page, letter);
    const buffer = await el.screenshot();
    const { inkRatio, imprintRatio } = colorRatios(await readPixels(buffer));
    record(
      inkRatio >= INK_MIN && imprintRatio >= IMPRINT_MIN,
      `${letter} shows both stroke (ink) and fill (imprint)`,
      `ink ratio ${inkRatio.toFixed(3)} (want ≥ ${INK_MIN}), imprint ratio ${imprintRatio.toFixed(3)} (want ≥ ${IMPRINT_MIN})`,
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
