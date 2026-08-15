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
  // The password input is deliberately absent from this list, for the same reason the search
  // input already was: both suppress their OWN ring in favour of their parent control's, and
  // that suppression is only legitimate while a dedicated check proves the parent actually
  // indicates instead — see "the password reveal mark carries its own ring" below.
  console.log('focus ring survives the cascade');
  for (const [route, selector, label] of [
    ['/login', 'input[type=email]', 'login email input'],
    ['/login', 'button[type=submit]', 'login submit (imprint plate)'],
    ['/libraries/new', 'input', 'new-library name input'],
    ['/libraries/new', 'textarea', 'new-library description textarea'],
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

  // ---- The search CONTROL shows focus, even though its input does not ----
  // Required, not optional. Ruling 2 in DESIGN.md §2 re-permits suppressing an inner outline,
  // which is exactly what killed the focus ring in slice A: an `outline-none` in a later cascade
  // layer beat the base :focus-visible, and no stylesheet test could see it because both rules
  // read as correct on their own. The suppression is only defensible while the parent
  // DEMONSTRABLY shows an indicator, so that is asserted here, computed, in real Chrome. If this
  // check fails, the ruling is wrong and the rule goes — it is not to be adjusted into passing.
  console.log('focus renders on the control, not the caret node');
  {
    await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[type=search]', { timeout: 10_000 });
    await page.focus('input[type=search]');
    const focus = await page.evaluate(() => {
      const input = document.querySelector('input[type=search]');
      const control = input.closest('form[role=search]');
      const read = (el) => {
        const s = getComputedStyle(el);
        return {
          style: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
          color: s.outlineColor,
          offset: s.outlineOffset,
        };
      };
      return { control: read(control), input: read(input), focused: document.activeElement === input };
    });

    record(
      focus.focused && focus.control.style !== 'none' && focus.control.width >= 3,
      'focusing the input makes the CONTROL visibly focused',
      `control outline: ${focus.control.style} ${focus.control.width}px ${focus.control.color}`,
    );
    // The merge, not a concentric second ring: offset 0 puts the outline flush against the
    // control's own 2px rule so they read as one heavier edge rather than misregistered print.
    record(
      focus.control.offset === '0px',
      'the control ring merges with its own rule rather than doubling it',
      `outline-offset: ${focus.control.offset}`,
    );
    // Only legitimate BECAUSE the two records above hold.
    record(
      focus.input.style === 'none',
      'the inner input draws no competing ring',
      `input outline-style: ${focus.input.style}`,
    );
  }

  // ---- The password reveal mark carries its own ring; the field never doubles it ----
  // A password field with a reveal button has TWO focusable descendants that mean DIFFERENT
  // things — caret in the field vs. attention on the reveal toggle — unlike the search field
  // above, whose input and submit button both mean "I am using this field". Reusing
  // .focus-control's :focus-within here would suppress the mark's own ring whenever EITHER
  // descendant is focused and then light the whole field as though the caret were in the
  // input — the doubled/misattributed indicator the previous check exists to prevent,
  // reintroduced in a new place. index.css keys the field's own indicator to
  // :has(input:focus-visible) instead. Proven by hand: reverting that selector to
  // :focus-within makes the second record() below fail (the field lights up while the mark,
  // not the input, holds focus) — restored afterwards; see the task report for the transcript.
  console.log("the password reveal mark carries its own ring, never doubled with the field's");
  {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[type=password]', { timeout: 10_000 });

    const readTriad = () => {
      const input = document.querySelector('input[type=password]');
      const control = input.closest('.field-control');
      const mark = control.querySelector('button');
      const read = (el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: s.outlineOffset };
      };
      return { control: read(control), input: read(input), mark: read(mark) };
    };

    await page.focus('input[type=password]');
    const onInput = await page.evaluate(readTriad);

    record(
      onInput.control.style !== 'none' && onInput.control.width >= 3,
      'focusing the password input makes the FIELD visibly focused',
      `field outline: ${onInput.control.style} ${onInput.control.width}px`,
    );
    record(
      onInput.control.offset === '0px',
      'the field ring merges with its own rule rather than doubling it',
      `outline-offset: ${onInput.control.offset}`,
    );
    record(
      onInput.input.style === 'none',
      'the input draws no competing ring while the field indicates on its behalf',
      `input outline-style: ${onInput.input.style}`,
    );
    record(
      onInput.mark.style === 'none',
      'the reveal mark shows no ring while the input, not the mark, has focus',
      `mark outline-style: ${onInput.mark.style}`,
    );

    await page.focus('button[aria-label="Show password"]');
    const onMark = await page.evaluate(readTriad);

    record(
      onMark.mark.style !== 'none' && onMark.mark.width >= 2,
      "focusing the reveal mark shows the MARK's own ring",
      `mark outline: ${onMark.mark.style} ${onMark.mark.width}px`,
    );
    // This is the record a reverted-to-:focus-within selector fails: with :focus-within, the
    // field's :has(...)-scoped rule is replaced by one that fires for ANY focused descendant, so
    // the field lights up here too — doubled with the mark's own ring just asserted above.
    record(
      onMark.control.style === 'none',
      'the field does NOT also indicate while focus is on the mark, not the input',
      `field outline-style: ${onMark.control.style}`,
    );
  }

  // ---- Focus is really trapped in a sheet, in a real browser's focus model ----
  // jsdom cannot be trusted for this: it reports offsetParent as null for every element, which
  // silently emptied the focusable list and made the unit trap tests pass through a degenerate
  // branch that never exercised the wrapping. Real Chrome, real Tab keys.
  console.log('sheet traps focus');
  {
    await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[aria-label^="Actions for Bandes"]', { timeout: 10_000 });
    await page.click('[aria-label^="Actions for Bandes"]');
    await page.waitForSelector('[role=dialog]', { timeout: 10_000 });

    const walk = async (shift) => {
      const inside = [];
      for (let i = 0; i < 8; i += 1) {
        await page.keyboard.down('Shift').catch(() => {});
        if (!shift) await page.keyboard.up('Shift').catch(() => {});
        await page.keyboard.press('Tab');
        if (shift) await page.keyboard.up('Shift').catch(() => {});
        inside.push(
          await page.evaluate(() =>
            document.querySelector('[role=dialog]').contains(document.activeElement),
          ),
        );
      }
      return inside;
    };

    const forward = await walk(false);
    record(forward.every(Boolean), 'Tab never leaves the sheet', `${forward.filter(Boolean).length}/8 inside`);
    const back = await walk(true);
    record(back.every(Boolean), 'Shift+Tab never leaves the sheet', `${back.filter(Boolean).length}/8 inside`);
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

  // ---- The inverted cover never borrows the paper surface's secondary tokens ----
  // DESIGN.md §2 is explicit that --ink-soft and --paper-deep belong to the PAPER surface only:
  // --ink-soft on --ink measures ~1.9:1, unreadable, which is exactly why the cover has its own
  // --cover-body/--cover-soft/--cover-rule tokens. Reaching for the familiar `text-ink-soft` out
  // of habit while styling a component that also appears on paper is invisible in source review —
  // both classes exist, both are "correct" in isolation — and only shows up as low-contrast grey
  // on black once it actually paints. A stylesheet test cannot catch this either: it would have
  // to know which literal elements land on the inverted route, which is exactly what jsdom cannot
  // resolve. Only a computed style in a real browser, on the real route, catches it.
  console.log('cover surface never resolves to a paper-surface secondary colour');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, { waitUntil: 'networkidle0' });
  // Specific to this fixture item (lentTo: 'Marie') rather than a generic selector, so the check
  // waits for the fully-loaded detail body rather than racing the loading placeholder.
  await page.waitForSelector('[aria-label="On loan to Marie"]', { timeout: 10_000 });
  const INK_SOFT = 'rgb(90, 90, 87)';
  const PAPER_DEEP = 'rgb(236, 236, 231)';
  const offenders = await page.evaluate(
    (inkSoft, paperDeep) =>
      [...document.querySelectorAll('body *')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return [s.color, s.backgroundColor].some((v) => v === inkSoft || v === paperDeep);
        })
        .map((el) => el.tagName.toLowerCase() + (el.className ? `.${String(el.className).trim().replace(/\s+/g, '.')}` : '')),
    INK_SOFT,
    PAPER_DEEP,
  );
  record(
    offenders.length === 0,
    'no element on the cover resolves to --ink-soft or --paper-deep',
    offenders.join(', '),
  );

  // ---- The REVERSE direction: a paper surface rendered INSIDE the cover declares its own
  // foreground rather than inheriting the cover's ----
  // The check just above asserts a PAPER token never leaks ONTO the bare cover. It never
  // asserted the opposite, and the opposite is what shipped: Sheet.jsx set `bg-paper-deep` with
  // no text colour of its own, so when it opened INSIDE item detail's inverted `text-paper`
  // ancestor, a plain <p> and a `text-current` secondary button inherited paper text straight
  // through the sheet's own recessed ground — ~1.08:1, "grey on white, hardly readable". The
  // check above alone could never have caught this: the sheet's OWN ground is correctly
  // paper-deep, so nothing there resolves to a forbidden background. The defect was in the
  // FOREGROUND its children resolved to once mounted on this one inverted route — the other
  // half of the same "sets a ground, not its foreground" shape.
  console.log('a sheet opened INSIDE the cover declares its own foreground, not the cover\'s');
  {
    // item-1984 is not on loan, so the primary action reads "Lend" and opens the one sheet
    // item detail still has — "Mark returned" now acts directly, with no dialog to inspect.
    await page.goto(`${BASE}/libraries/lib-fiction/items/item-1984`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('main button')].find((el) =>
        /^lend$/i.test(el.textContent.trim()),
      );
      btn?.click();
    });
    await page.waitForSelector('[role=dialog]', { timeout: 10_000 });

    const PAPER = 'rgb(246, 246, 243)';
    const COVER_BODY = 'rgb(222, 222, 217)';
    const COVER_SOFT = 'rgb(185, 185, 180)';
    const inheritedCoverFg = await page.evaluate(
      (paper, coverBody, coverSoft) =>
        [...document.querySelectorAll('[role=dialog] *')]
          // Leaf nodes only — a wrapping container repeats the same defect its text child
          // already reports, so this keeps one offender per actual piece of unreadable text.
          .filter((el) => el.children.length === 0 && el.textContent.trim().length > 0)
          .filter((el) => [paper, coverBody, coverSoft].includes(getComputedStyle(el).color))
          .map((el) => `${el.tagName.toLowerCase()}:"${el.textContent.trim().slice(0, 24)}"`),
      PAPER,
      COVER_BODY,
      COVER_SOFT,
    );
    record(
      inheritedCoverFg.length === 0,
      'no text inside a sheet opened on the cover resolves to a cover-surface foreground token',
      inheritedCoverFg.join(', '),
    );

    // Later checks below assume the page already loaded above (`item-lent`, which has loans and
    // a sharing mark); this block borrowed the page for a different fixture item and must hand
    // it back exactly as it found it rather than leaving a later, unrelated check to fail for a
    // reason that has nothing to do with what it is testing.
    await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[aria-label="On loan to Marie"]', { timeout: 10_000 });
  }

  // ---- --shared and --out must never resolve as TEXT colour on the cover either ----
  // Round 2 (the item-detail marks column): DESIGN.md §2 measures --shared on --ink at ~3.03:1
  // and --out on --ink at ~4.42:1 — both sound for a rule or an outline, both short of AA for
  // small text. Both ALSO have a legitimate use as a background/border colour on this exact
  // route: the sharing mark's edge is `bg-shared`, the Overprint Stamp's outline is `border-out`.
  // So only the resolved TEXT colour is checked — checking background/border too would flag
  // those legitimate marks as if they were the defect they exist to prevent.
  console.log('--shared and --out never resolve as text colour on the cover');
  const SHARED = 'rgb(15, 107, 79)';
  const OUT = 'rgb(216, 65, 47)';
  const textOffenders = await page.evaluate(
    (shared, out) =>
      [...document.querySelectorAll('body *')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.color === shared || s.color === out;
        })
        .map(
          (el) =>
            el.tagName.toLowerCase() +
            (el.className ? `.${String(el.className).trim().replace(/\s+/g, '.')}` : ''),
        ),
    SHARED,
    OUT,
  );
  record(
    textOffenders.length === 0,
    '--shared and --out never resolve as a text colour on the cover',
    textOffenders.join(', '),
  );

  // ---- The sharing mark's green edge does not displace its own text ----
  // Round 1 shipped the stamp fix with no automated regression coverage; this closes that gap
  // for the mark that replaces it. The design session's OWN first attempt at this edge used
  // `border-left`, which adds to the box and pushed the SHARED line 12px right of IN <library>
  // directly above it (DESIGN.md §6: an edge rule never displaces content). The fix hangs the
  // edge into the column's own padding-left as an absolutely positioned sibling instead, so the
  // IN line and the SHARED line's own flow boxes should share the same left edge, in real
  // Chrome's layout — a stylesheet test can assert the rule exists, not that the cascade leaves
  // the text where the rule intends.
  console.log('the sharing mark edge does not displace its own text');
  const marks = await page.evaluate(() => {
    const left = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.getBoundingClientRect().left : null;
    };
    return { in: left('[data-mark="in"]'), shared: left('[data-mark="shared"]') };
  });
  record(
    marks.in !== null && marks.shared !== null && Math.abs(marks.in - marks.shared) < 1,
    'IN <library> and the SHARED mark share one left edge — the edge hangs into padding',
    `IN left: ${marks.in}, SHARED left: ${marks.shared}`,
  );

  // ---- `caps` elements on the cover keep an explicit weight through the cascade ----
  // `.caps` sets ONLY text-transform and letter-spacing, by deliberate design (DESIGN.md §3):
  // weight is always stated separately, at the point of use, because a `caps` utility that also
  // set font-weight once let "stop uppercasing this, it's content" silently drop the emphasis
  // too — the exact regression this checks for. Every other `caps` usage in the package pairs it
  // with font-bold/font-extrabold; a stylesheet test can only confirm the class NAME is present,
  // not that the cascade actually resolves it to a weight above ambient, so this is a computed
  // check in real Chrome, same page already loaded above.
  console.log('caps elements on the cover keep their weight, not just their case');
  {
    const weights = await page.evaluate(() => {
      const byText = (selector, text) =>
        [...document.querySelectorAll(selector)].find((el) => el.textContent.trim() === text);
      const weightOf = (el) => (el ? parseInt(getComputedStyle(el).fontWeight, 10) : null);
      return {
        heading: weightOf(byText('h2', 'The record')),
        link: weightOf(byText('a', 'Full record')),
        // Round 2's two newest `caps` usages, added by the Detail Marks column. `IN` is the
        // direct caps span inside the `data-mark="in"` line; the sharing mark's caps class sits
        // on the PARENT of `data-mark="shared"` (the inner node is only the text/edge wrapper),
        // so this reaches it structurally rather than by a class-name guess that would break the
        // moment the classes on that span get reordered or renamed.
        inLabel: weightOf(document.querySelector('[data-mark="in"] .caps')),
        sharedMark: weightOf(document.querySelector('[data-mark="shared"]')?.parentElement),
      };
    });
    record(
      weights.heading !== null && weights.heading > 400,
      '"The record" heading resolves above ambient weight',
      `font-weight: ${weights.heading}`,
    );
    record(
      weights.link !== null && weights.link > 400,
      '"Full record" link resolves above ambient weight',
      `font-weight: ${weights.link}`,
    );
    record(
      weights.inLabel !== null && weights.inLabel > 400,
      'the "IN" label resolves above ambient weight',
      `font-weight: ${weights.inLabel}`,
    );
    record(
      weights.sharedMark !== null && weights.sharedMark > 400,
      'the sharing mark resolves above ambient weight',
      `font-weight: ${weights.sharedMark}`,
    );
  }

  // ---- The item-detail action row reflows on the narrowest phones, never overflows ----
  // Delete moved onto the same line as Mark returned/Lend and Edit (DESIGN.md, "all three on
  // one line" — a lone Delete below the ledger used to read as though it deleted the RECORD,
  // not the item). The three labels total ~319px, which fits a 390px viewport with margins and
  // does not fit a 320px one, so the row relies on `flex-wrap` rather than a second layout.
  // Measured by hand: at 390px the row spans ~329px inside 358px of available width (29px
  // slack) and stays on one line; at 320px (288px available) Delete drops to its own line. Both
  // are asserted here in a REAL browser — jsdom does no layout at all, so a green unit test
  // would be evidence about jsdom, not about whether this row actually wraps. Proven to catch a
  // regression by hand: reverting `flex-wrap` to `flex` on `.cover-actions`'s React equivalent
  // (the `div` around the three PlateButtons in ItemDetail.jsx) makes the 320px checks below
  // FAIL — Delete overflows past the viewport edge instead of dropping to a second line — then
  // restored; see the task report for the transcript.
  console.log('item-detail action row reflows instead of overflowing');
  {
    const actionRects = async (width) => {
      await page.setViewport({ width, height: 844 });
      await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main h1');
      return page.evaluate(() =>
        [...document.querySelectorAll('main button')]
          .filter((el) => /^(mark returned|lend|edit|delete)$/i.test(el.textContent.trim()))
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { text: el.textContent.trim(), top: r.top, right: r.left + r.width };
          }),
      );
    };

    const wide = await actionRects(390);
    const wideTops = new Set(wide.map((r) => Math.round(r.top)));
    const wideMaxRight = Math.max(...wide.map((r) => r.right));
    record(
      wideTops.size === 1,
      'at 390px the three actions stay on one line',
      `tops: ${[...wideTops].join(', ')}`,
    );
    record(
      wideMaxRight <= 390,
      'at 390px the row does not overflow the viewport',
      `rightmost edge: ${wideMaxRight.toFixed(1)}px`,
    );

    const narrow = await actionRects(320);
    const deleteRect = narrow.find((r) => /^delete$/i.test(r.text));
    const editRect = narrow.find((r) => /^edit$/i.test(r.text));
    record(
      Boolean(deleteRect) && Boolean(editRect) && Math.round(deleteRect.top) > Math.round(editRect.top),
      'at 320px Delete wraps to its own line rather than overflowing',
      `Delete top: ${deleteRect?.top}, Edit top: ${editRect?.top}`,
    );
    const narrowMaxRight = Math.max(...narrow.map((r) => r.right));
    record(
      narrowMaxRight <= 320,
      'at 320px the row does not overflow the viewport (reflow, not overflow)',
      `rightmost edge: ${narrowMaxRight.toFixed(1)}px`,
    );
  }
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
