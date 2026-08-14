#!/usr/bin/env node
// Measures the browse stream at 1000 items. Two questions, both of which have to be answered
// with numbers rather than expectations:
//
//   1. Does the stream stay responsive while being flung? Gate: no frame over 50ms.
//   2. When a continuation collection board merges into one ABOVE the viewport, does the
//      reader's scroll position move? A board growing above the fold shifts everything below
//      it, and the browser's scroll anchoring is supposed to compensate — but `content-
//      visibility` and `contain-intrinsic-size` change what the browser has measured, so
//      whether anchoring still holds is an empirical question. Boards are deliberately left
//      uncontained; this measures whether that was enough.
//
// Starts its own fixture server on a private port. Never touches :5173.
import fs from 'fs';
import net from 'net';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';

const PORT = Number(process.env.PROFILE_PORT ?? 5198);
const BASE = `http://localhost:${PORT}`;
const ROUTE = '/libraries/lib-huge';
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRAME_BUDGET_MS = 50;

const resolveChrome = () => {
  const candidate = process.env.CHROME_PATH || MAC_CHROME;
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(`No Chrome found at ${candidate}. Set CHROME_PATH.`);
};

const isPortFree = () =>
  new Promise((resolve) => {
    const socket = net
      .connect({ port: PORT, host: '127.0.0.1' })
      .on('connect', () => {
        socket.destroy();
        resolve(false);
      })
      .on('error', () => resolve(true));
  });

const startServer = async () => {
  if (!(await isPortFree())) {
    throw new Error(`port ${PORT} is in use. Set PROFILE_PORT — this script will not touch a
server it did not start.`);
  }
  const child = spawn(
    'node',
    ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'],
    { env: { ...process.env, VITE_MOCK: '1' }, stdio: 'ignore' },
  );
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}${ROUTE}`)).ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill('SIGTERM');
  throw new Error('profile server did not start');
};

// Scrolls the stream to the bottom in rAF steps, appending pages as the sentinel comes into
// view, and records every frame interval on the way.
const flingToBottom = (stepPx) =>
  new Promise((resolve) => {
    const scroller = document.querySelector('[data-stream-scroller]');
    const frames = [];
    let last = performance.now();
    let idleFrames = 0;

    const step = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;

      const before = scroller.scrollTop;
      scroller.scrollTop += stepPx;
      // Stop once the scroller stops moving for a while: everything is loaded and we are at
      // the bottom. Bounded so a stall cannot hang the run.
      if (scroller.scrollTop === before) idleFrames += 1;
      else idleFrames = 0;

      if (idleFrames > 90 || frames.length > 1200) {
        resolve({
          frames,
          rows: document.querySelectorAll('.row-skip').length,
          height: scroller.scrollHeight,
        });
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

const summarise = (frames) => {
  // Drop the first few: the initial paint is not a scrolling frame.
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

const server = await startServer();
const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });
const failures = [];

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[role=separator]');

  // ---- 2. Scroll drift on a merging continuation board ----
  // Measured CONTINUOUSLY, not as a before/after pair. The first version of this snapshotted
  // an anchor, then tried to provoke the merge — but the sentinel's 400px rootMargin had
  // already pulled page 2 while the board was being scrolled past, so both snapshots were
  // taken after the merge and the test reported "no merge" while the merge worked fine. This
  // version watches every frame and captures the anchor's movement across the exact frame the
  // member count changes.
  console.log('scroll drift when a continuation board merges above the viewport');
  const drift = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const scroller = document.querySelector('[data-stream-scroller]');
        const boardOf = () => document.querySelector('[data-board="huge-coll"]');
        const membersOf = () => boardOf()?.querySelectorAll('.row-skip').length ?? 0;

        let anchor = null;
        let anchorText = null;
        let lastTop = null;
        let lastMembers = membersOf();
        let observed = null;
        let frames = 0;

        const step = () => {
          frames += 1;
          const members = membersOf();
          const board = boardOf();

          // Once the board is above the fold, hold a reference row below it.
          if (!anchor && board && board.getBoundingClientRect().bottom < 0) {
            anchor = [...document.querySelectorAll('.row-skip')].find(
              (el) => el.getBoundingClientRect().top > 100,
            );
            anchorText = anchor?.textContent?.trim().slice(0, 34) ?? null;
            lastTop = anchor?.getBoundingClientRect().top ?? null;
          }

          if (anchor && members !== lastMembers) {
            // The frame the merge landed on: how far did the reference row move?
            const top = anchor.getBoundingClientRect().top;
            observed = {
              membersBefore: lastMembers,
              membersAfter: members,
              shift: Math.abs(top - lastTop),
              anchorText,
            };
            resolve(observed);
            return;
          }

          if (anchor) lastTop = anchor.getBoundingClientRect().top;
          lastMembers = members;

          if (frames > 900) {
            resolve(observed ?? { membersBefore: lastMembers, membersAfter: lastMembers, shift: 0, anchorText, never: true });
            return;
          }
          scroller.scrollTop += 60;
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );

  console.log(
    `  board members ${drift.membersBefore} -> ${drift.membersAfter}` +
      `${drift.never ? '  (merge not observed in window)' : '  (merged)'}`,
  );
  console.log(`  reference row below it: "${drift.anchorText}"`);
  console.log(`  its movement across the merge frame: ${drift.shift.toFixed(1)}px`);
  if (drift.never) {
    failures.push('the continuation merge was never observed, so drift is unmeasured');
  } else if (drift.shift > 4) {
    failures.push(`scroll drifted ${drift.shift.toFixed(1)}px when the board merged`);
  }

  // ---- 1. Frame times under a fling ----
  // Each condition gets a FRESH LOAD. The first version measured with-skip on a cold page and
  // then without-skip on the same page, by which point all 1000 rows were already laid out and
  // painted — so it was comparing a cold render against a warm one and reporting the
  // difference as the cost of containment. That number would have been worse than no number.
  console.log('\nframe times flinging 1000 items to the bottom, fresh load per condition');
  // CPU throttling is not optional here. This is a phone-first app and the profile runs on a
  // desktop: unthrottled, rows are so cheap that containment cannot show a difference either
  // way, and "inert on this machine" would be reported as "inert". 4x approximates a mid-range
  // phone, which is the device the product record actually describes.
  // A fresh page per condition. Reusing one and re-navigating between conditions raced the
  // previous run's rAF loop against the navigation and destroyed the execution context.
  const fling = async ({ disableSkip, throttle }) => {
    const tab = await browser.newPage();
    try {
      await tab.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
      const client = await tab.createCDPSession();
      await client.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      await tab.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle0' });
      await tab.waitForSelector('[role=separator]');
      if (disableSkip) {
        await tab.addStyleTag({ content: '.row-skip { content-visibility: visible !important; }' });
      }
      const result = await tab.evaluate(flingToBottom, 600);
      return { ...summarise(result.frames), rows: result.rows };
    } finally {
      await tab.close();
    }
  };

  const line = (label, s) =>
    `  ${label.padEnd(28)}rows ${String(s.rows).padStart(4)}  p50 ${s.p50.toFixed(1)}ms  ` +
    `p95 ${s.p95.toFixed(1)}ms  max ${s.max.toFixed(1)}ms  over ${FRAME_BUDGET_MS}ms: ${s.over}`;

  const fast = await fling({ disableSkip: false, throttle: 1 });
  const fastNoSkip = await fling({ disableSkip: true, throttle: 1 });
  const slow = await fling({ disableSkip: false, throttle: 4 });
  const slowNoSkip = await fling({ disableSkip: true, throttle: 4 });

  console.log(line('1x, with row-skip', fast));
  console.log(line('1x, without row-skip', fastNoSkip));
  console.log(line('4x throttled, with row-skip', slow));
  console.log(line('4x throttled, without', slowNoSkip));

  // The gate is the unthrottled run: it is the one that is reproducible across machines.
  if (fast.max > FRAME_BUDGET_MS) {
    failures.push(
      `slowest unthrottled frame ${fast.max.toFixed(1)}ms exceeds the ${FRAME_BUDGET_MS}ms gate`,
    );
  }
  // Report, do not gate: whether containment earns its place is a judgement about the target
  // device, not a pass/fail.
  const verdict = (a, b, label) => {
    const delta = ((b.max - a.max) / b.max) * 100;
    console.log(
      `\n  ${label}: containment changes the slowest frame by ${delta > 0 ? '-' : '+'}` +
        `${Math.abs(delta).toFixed(0)}% (${a.max.toFixed(1)}ms vs ${b.max.toFixed(1)}ms without)`,
    );
  };
  verdict(fast, fastNoSkip, 'unthrottled');
  verdict(slow, slowNoSkip, '4x throttled');

  // ---- Sticky letters must still pin at depth ----
  console.log('\nsticky index letter at depth');
  const sticky = await page.evaluate(() => {
    const scroller = document.querySelector('[data-stream-scroller]');
    const rect = scroller.getBoundingClientRect();
    const pinned = [...document.querySelectorAll('[role=separator]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return Math.abs(r.top - rect.top) < 2 && r.bottom > rect.top;
    });
    return { pinned: pinned.length, label: pinned[0]?.getAttribute('aria-label') ?? null };
  });
  console.log(`  pinned separators: ${sticky.pinned}  ${sticky.label ?? ''}`);
  if (sticky.pinned !== 1) {
    failures.push(`expected exactly one pinned index letter, found ${sticky.pinned}`);
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

if (failures.length > 0) {
  console.error(`\n${failures.length} finding(s):`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('\nProfile within budget.');
