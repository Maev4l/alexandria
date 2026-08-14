#!/usr/bin/env node
// Conformance checks that can only be answered by a real browser, because they depend on the
// CASCADE rather than on what any one file says.
//
// src/tokens.test.js asserts that a rule is DECLARED. It cannot assert that the rule SURVIVES
// — Tailwind utilities sit in a later layer than our base rules, so a single `outline-none`
// on a component silently defeats the focus ring the token layer defines, and a stylesheet
// test reads both rules and sees nothing wrong. That is exactly how the focus ring died on
// every text input in slice A. This script computes the resolved style instead.
//
// Usage: yarn check:browser
//
// Starts its OWN fixture-backed dev server on a private port and stops only that. It must not
// use the dev server on :5173: that one belongs to whoever is working, may be running against
// the real backend rather than fixtures — in which case every data-dependent check below fails
// for reasons that have nothing to do with the thing being checked — and :5173 is strictPort
// and shared with v2, so borrowing it risks not giving it back.
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { startFixtureServer, stopFixtureServer } from './fixture-server.mjs';

const PORT = Number(process.env.CHECK_PORT ?? 5199);
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

console.log(`starting a fixture dev server on :${PORT} (the one on :5173 is left alone)\n`);
const server = await startFixtureServer({ port: PORT });
const browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // ---- The focus ring must actually paint, on every focusable thing ----
  console.log('focus ring survives the cascade');
  for (const [route, selector, label] of [
    ['/login', 'input[type=email]', 'login email input'],
    ['/login', 'input[type=password]', 'login password input'],
    ['/login', 'button[type=submit]', 'login submit (imprint plate)'],
    ['/libraries/new', 'input', 'new-library name input'],
    ['/libraries/new', 'textarea', 'new-library description textarea'],
    ['/libraries', 'a[href="/search"]', 'pinned search field'],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector(selector, { timeout: 10_000 });
    await page.focus(selector);
    const ring = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const s = getComputedStyle(el);
      return {
        style: s.outlineStyle,
        width: parseFloat(s.outlineWidth),
        color: s.outlineColor,
        focused: document.activeElement === el,
      };
    }, selector);

    record(
      ring.focused && ring.style !== 'none' && ring.width >= 2,
      label,
      `outline-style: ${ring.style}, width: ${ring.width}px, color: ${ring.color}`,
    );
  }

  // ---- Pull to refresh actually fires, at the right amount of finger travel ----
  // A whole class of defect no screenshot and no unit test can see. This one shipped: the
  // trigger was written against the damped offset rather than the travel, so it needed 160px;
  // and on touch the browser claimed the gesture and fired pointercancel after one move, so it
  // never fired at any distance. Both are asserted here, on touch, because touch is the target.
  console.log('pull to refresh');
  {
    const touch = await browser.newPage();
    try {
      await touch.emulate({
        viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });
      await touch.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
      await touch.waitForSelector('[data-stream-scroller]');
      const client = await touch.createCDPSession();

      // Instrumented ONCE. Wrapping window.fetch inside pull() double-wrapped it on the second
      // call, so every request was counted twice and a correct single refresh reported as two —
      // a bug in the harness that looked exactly like a bug in the product.
      await touch.evaluate(() => {
        window.__reqs = 0;
        window.__cancels = 0;
        document
          .querySelector('[data-stream-scroller]')
          .addEventListener('pointercancel', () => {
            window.__cancels += 1;
          });
        const inner = window.fetch;
        window.fetch = (...args) => {
          if (String(args[0]).includes('/libraries')) window.__reqs += 1;
          return inner(...args);
        };
      });

      const pull = async (distance) => {
        await touch.evaluate(() => {
          window.__reqs = 0;
          window.__cancels = 0;
        });
        const x = 195;
        const y0 = 300;
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
        let armed = false;
        for (let i = 1; i <= 12; i += 1) {
          await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y0 + (distance * i) / 12 }],
          });
          await new Promise((r) => setTimeout(r, 16));
          if (await touch.$('[data-ptr-status="armed"]')) armed = true;
        }
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await new Promise((r) => setTimeout(r, 500));
        return {
          ...(await touch.evaluate(() => ({ reqs: window.__reqs, cancels: window.__cancels }))),
          armed,
        };
      };

      const short = await pull(48);
      record(short.reqs === 0, 'a 48px pull does not refresh', `${short.reqs} request(s)`);
      record(!short.armed, 'a 48px pull never shows "release to refresh"', `armed: ${short.armed}`);

      const long = await pull(96);
      record(long.reqs === 1, 'a 96px pull refreshes exactly once', `${long.reqs} request(s)`);
      record(long.armed, 'a 96px pull announces "release to refresh" first', `armed: ${long.armed}`);
      // The browser stealing the gesture is what made this dead on touch at ANY distance.
      record(long.cancels === 0, 'the browser does not steal the gesture', `${long.cancels} pointercancel(s)`);
    } finally {
      await touch.close();
    }
  }

  // ---- The `caps` utility must carry case and tracking, never weight ----
  // It used to set font-weight: 700 as well, so "this is content, stop uppercasing it" also
  // silently removed the emphasis. Asserted as a computed property rather than a pixel value,
  // so restyling the heading cannot break the check and cannot hide the defect either.
  console.log('sheet heading is emphasised without being uppercased');
  await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[aria-label^="Actions for Bandes"]');
  await page.click('[aria-label^="Actions for Bandes"]');
  await page.waitForSelector('[role=dialog] h2');
  const heading = await page.evaluate(() => {
    const el = document.querySelector('[role=dialog] h2');
    const s = getComputedStyle(el);
    return { transform: s.textTransform, weight: parseInt(s.fontWeight, 10), text: el.textContent };
  });
  record(heading.transform === 'none', 'a French library name is not uppercased', heading.transform);
  record(heading.weight > 400, 'the heading still carries emphasis', `font-weight: ${heading.weight}`);
  record(
    heading.text.trim() === 'Bandes dessinées',
    'the accented name renders intact',
    heading.text,
  );

  // ---- Pinch-zoom must not be disabled: WCAG 1.4.4, and this app is used in poor light ----
  console.log('viewport permits zoom');
  await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
  const viewport = await page.evaluate(
    () => document.querySelector('meta[name=viewport]')?.content ?? '',
  );
  record(!/user-scalable\s*=\s*no/.test(viewport), 'user-scalable is not disabled', viewport);
  record(!/maximum-scale\s*=\s*1/.test(viewport), 'maximum-scale is not pinned to 1', viewport);
  record(/viewport-fit=cover/.test(viewport), 'viewport-fit=cover retained', viewport);

  // ---- The column is constrained on desktop rather than running full-bleed ----
  console.log('desktop column is constrained');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
  const column = await page.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.getBoundingClientRect().width : null;
  });
  record(
    column !== null && column <= 448,
    'header column no wider than 448px at 1440px',
    `measured ${column}px`,
  );
} finally {
  await browser.close();
  // Only the child this script spawned — signalled as a group and AWAITED, so the port is
  // provably free before this returns.
  await stopFixtureServer(server);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} browser check(s) failed.`);
  process.exit(1);
}
console.log('\nAll browser checks passed.');
