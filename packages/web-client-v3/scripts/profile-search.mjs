#!/usr/bin/env node
// Measures the SEARCH result list at 400 results — the one thing this codebase has never
// measured, and the question Task 20 deliberately shipped without answering.
//
// WHY THIS EXISTS SEPARATELY FROM profile-stream.mjs. The design session specified that search
// inherit the browse stream's virtualisation. It has none: the stream is paginated at 30 per page
// plus a CSS containment utility (`.row-skip`), and `profile-stream.mjs` measures that utility
// changing the slowest frame by 1% in both directions, throttled and not. So there was nothing to
// inherit.
//
// And the risk search has is different in kind. The stream commits 30 rows at a time; search
// commits ALL of them in one go, because `POST /search` is unpaginated — `services/search.go:89`
// builds `bluge.NewAllMatches`, no size, no top-N, and each term contributes a prefix wildcard
// across five fields. A three-character query on a half-French catalogue is therefore a prefix
// over title, authors, directors, cast and collection, and a large set is what a short query
// PRODUCES rather than a tail case.
//
// Containment skips layout and paint for offscreen rows. It does not skip reconciliation or the
// DOM construction of 400 rows in a single commit. That commit is what this measures, and it is
// why "is windowing warranted" could not be answered by the stream's numbers.
//
// TWO QUESTIONS, both answered with numbers:
//   1. What does mounting 400 results cost — from the response settling to the rows being on
//      screen, and how long is the longest frame while it happens? A commit that blocks the main
//      thread shows up as one long frame, not as a slow average.
//   2. Do frames stay responsive while flinging that list? Reported with and without `.row-skip`,
//      so containment's contribution HERE is a measurement rather than an inheritance from a
//      screen where it measured nothing.
//
// Starts its own fixture server on a private port. Never touches :5173.
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { startFixtureServer, stopFixtureServer } from './fixture-server.mjs';

const PORT = Number(process.env.PROFILE_PORT ?? 5197);
const BASE = `http://localhost:${PORT}`;
// TERM_LARGE in tools/mock-search.js. 'les' is not a placeholder: it is the realistic shape of the
// worst case, a three-character French article that is a prefix of a great many indexed tokens.
const TERM = 'les';
const EXPECTED_ROWS = 400;
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRAME_BUDGET_MS = 50;

// BASELINE, pinned beside the gates because a percentile is only comparable against the same
// workload: tools/mock-search.js TERM_LARGE (400 results, ~90% carrying artwork, mixed books and
// videos across three libraries), viewport 390x844 at deviceScaleFactor 2, headless Chrome,
// unthrottled unless stated. Gates are set from the observed run and recorded in the plan.
// Set FROM the observed run, not from a comfortable round number: observed 115ms mount and
// 10.3ms p95 unthrottled, gated at roughly 1.5x each. A budget ten times the observation cannot
// fire, and a gate that cannot fire is a comment. These will catch a row growing expensive, or
// windowing being removed if it is ever added.
const MOUNT_BUDGET_MS = Number(process.env.MOUNT_BUDGET_MS ?? 200);
const P95_BUDGET_MS = Number(process.env.SEARCH_P95_BUDGET_MS ?? 16);

const resolveChrome = () => {
  const candidate = process.env.CHROME_PATH || MAC_CHROME;
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(`No Chrome found at ${candidate}. Set CHROME_PATH.`);
};

const summarise = (frames) => {
  const sample = frames.slice(5).sort((a, b) => a - b);
  const at = (q) => sample[Math.floor(sample.length * q)];
  return {
    count: sample.length,
    p50: at(0.5),
    p95: at(0.95),
    max: sample.at(-1),
    over: sample.filter((f) => f > FRAME_BUDGET_MS).length,
  };
};

// Runs in the page. Starts a frame recorder, types nothing (the caller does), and resolves once
// the expected row count is in the DOM — reporting when the RESPONSE settled and when the rows
// appeared, so the gap between them is the commit rather than the network.
const watchMount = (expected) =>
  new Promise((resolve) => {
    window.__responseAt = null;
    const innerFetch = window.fetch;
    window.fetch = (...args) => {
      const isSearch = String(args[0]).includes('/search');
      const p = innerFetch(...args);
      // The moment the BODY is available, not the moment headers arrive: the app cannot begin
      // rendering until it has parsed JSON, so anything earlier would credit the commit with time
      // the network was still working.
      return isSearch ? p.then((r) => r.clone().json().then(() => { window.__responseAt = performance.now(); return r; })) : p;
    };

    const frames = [];
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;
      const rows = document.querySelectorAll('main li').length;
      if (window.__responseAt != null && rows >= expected) {
        window.fetch = innerFetch;
        resolve({
          mountMs: performance.now() - window.__responseAt,
          // The commit blocks the main thread, so it shows up as ONE long frame rather than as a
          // slow average. Reporting the mean here would hide exactly the thing being measured.
          longestFrame: Math.max(...frames.slice(-30)),
          rows,
        });
        return;
      }
      if (frames.length > 900) {
        window.fetch = innerFetch;
        resolve({ mountMs: -1, longestFrame: Math.max(...frames), rows });
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

// Flings the DOCUMENT — search has no scroller element of its own, unlike the browse stream.
const flingDocument = (stepPx) =>
  new Promise((resolve) => {
    const frames = [];
    let last = performance.now();
    let idle = 0;
    const step = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;
      const before = window.scrollY;
      window.scrollBy(0, stepPx);
      if (window.scrollY === before) idle += 1;
      else idle = 0;
      if (idle > 60 || frames.length > 1200) {
        resolve({ frames, rows: document.querySelectorAll('main li').length, height: document.documentElement.scrollHeight });
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

const server = await startFixtureServer({ port: PORT });
const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });
const failures = [];

try {
  // ---- 1. The mount: one commit of 400 rows ----
  console.log(`\nmounting ${EXPECTED_ROWS} results in one commit, fresh load per condition`);
  const mount = async (throttle) => {
    const tab = await browser.newPage();
    try {
      await tab.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
      const client = await tab.createCDPSession();
      await client.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      await tab.goto(`${BASE}/search`, { waitUntil: 'networkidle0' });
      await tab.waitForSelector('main input');
      const watching = tab.evaluate(watchMount, EXPECTED_ROWS);
      await tab.type('main input', TERM);
      return await watching;
    } finally {
      await tab.close();
    }
  };

  const mount1x = await mount(1);
  const mount4x = await mount(4);
  const mountLine = (label, m) =>
    `  ${label.padEnd(18)}rows ${String(m.rows).padStart(4)}  response -> rows ${m.mountMs.toFixed(0)}ms  longest frame ${m.longestFrame.toFixed(1)}ms`;
  console.log(mountLine('1x', mount1x));
  console.log(mountLine('4x throttled', mount4x));

  // ---- 2. Frame times flinging the result list ----
  console.log('\nframe times flinging the result list, fresh load per condition');
  const fling = async ({ disableSkip, throttle }) => {
    const tab = await browser.newPage();
    try {
      await tab.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
      const client = await tab.createCDPSession();
      await client.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      await tab.goto(`${BASE}/search`, { waitUntil: 'networkidle0' });
      await tab.waitForSelector('main input');
      await tab.type('main input', TERM);
      await tab.waitForFunction((n) => document.querySelectorAll('main li').length >= n, { timeout: 30_000 }, EXPECTED_ROWS);
      if (disableSkip) {
        await tab.addStyleTag({ content: '.row-skip { content-visibility: visible !important; }' });
      }
      const result = await tab.evaluate(flingDocument, 600);
      return { ...summarise(result.frames), rows: result.rows, height: result.height };
    } finally {
      await tab.close();
    }
  };

  const line = (label, s) =>
    `  ${label.padEnd(28)}rows ${String(s.rows).padStart(4)}  p50 ${s.p50.toFixed(1)}ms  p95 ${s.p95.toFixed(1)}ms  ` +
    `max ${s.max.toFixed(1)}ms  over ${FRAME_BUDGET_MS}ms: ${s.over}`;

  const fast = await fling({ disableSkip: false, throttle: 1 });
  const fastNoSkip = await fling({ disableSkip: true, throttle: 1 });
  const slow = await fling({ disableSkip: false, throttle: 4 });
  const slowNoSkip = await fling({ disableSkip: true, throttle: 4 });

  console.log(line('1x, with row-skip', fast));
  console.log(line('1x, without row-skip', fastNoSkip));
  console.log(line('4x throttled, with row-skip', slow));
  console.log(line('4x throttled, without', slowNoSkip));

  const delta = (a, b) => `${(((a.max - b.max) / b.max) * 100).toFixed(0)}%`;
  console.log(`\n  unthrottled: containment changes the slowest frame by ${delta(fast, fastNoSkip)}`);
  console.log(`  4x throttled: containment changes the slowest frame by ${delta(slow, slowNoSkip)}`);

  // Gated on the unthrottled runs: they are the ones reproducible across machines. 4x is reported
  // as information about a slower device, not as pass/fail — it is a synthetic model.
  if (mount1x.mountMs < 0) failures.push('the 400 rows never appeared');
  if (mount1x.mountMs > MOUNT_BUDGET_MS) {
    failures.push(`mount ${mount1x.mountMs.toFixed(0)}ms exceeds the ${MOUNT_BUDGET_MS}ms budget`);
  }
  if (fast.p95 > P95_BUDGET_MS) {
    failures.push(`p95 ${fast.p95.toFixed(1)}ms exceeds the ${P95_BUDGET_MS}ms budget`);
  }
} finally {
  await browser.close();
  await stopFixtureServer(server);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} search profile check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nSearch profile within budget.');
