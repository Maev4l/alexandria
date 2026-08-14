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
// Usage: yarn check:browser            (expects a dev server already on :5173)
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.CHECK_BASE_URL ?? 'http://localhost:5173';
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
}

if (failures.length > 0) {
  console.error(`\n${failures.length} browser check(s) failed.`);
  process.exit(1);
}
console.log('\nAll browser checks passed.');
