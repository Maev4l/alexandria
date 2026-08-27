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
import sharp from 'sharp';
import { startFixtureServer, stopFixtureServer } from './fixture-server.mjs';
import { contrastRatio } from '../src/lib/contrast.js';
// Fixtures + the app's own loan-pairing logic, imported rather than re-typed, so the FIELD
// MANIFEST below (see "catalogue fields render in mono wherever their fixture VALUE appears")
// can never hand-drift from the data it is actually checking against.
import { fictionItems, itemsByLibrary } from '../src/test/fixtures/items.js';
import { libraries as fixtureLibraries } from '../src/test/fixtures/libraries.js';
import { eventsByItem } from '../src/test/fixtures/events.js';
import { pairLoanEvents } from '../src/lib/loans.js';
import { indexLetterFor } from '../src/lib/sort.js';
// The search fixture's own term constants, imported for the same reason: a literal 'roman' here
// would fall through tools/mock-search.js's "any other term" branch the day that constant moves,
// and this script would go on checking a state it no longer names.
import { TERM_MIXED } from '../tools/mock-search.js';
// The icon set's single source of truth (tools/pwa-icons.js), imported for the same reason as
// the fixtures above: a list of files retyped here could pass while the manifest advertises a
// different set entirely.
import { RASTER_ICONS, FAVICON_ICO, ICON_SOURCES } from '../tools/pwa-icons.js';

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
// A FAKE CAMERA, granted up front. Until this, neither capture screen could be checked here at
// all: `getUserMedia` was refused, both viewports fell straight to their denied state and
// rendered nothing, so of 90 checks not one visited /add/book or /add/video. That is precisely
// why five unreadable captions over a live feed shipped — nothing in this suite had ever seen
// the surface they sit on.
//
// `--use-fake-device-for-media-stream` supplies a synthetic 640x480 stream and
// `--use-fake-ui-for-media-stream` auto-grants the permission prompt. The feed's CONTENT is a
// test pattern rather than a barcode, so this makes the viewports' layout, states and computed
// styles checkable — never the decode itself, which stays a device-verified thing.
const browser = await puppeteer.launch({
  executablePath: resolveChrome(),
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});

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
    // The wordmark became a real <Link> (P2 exit-mechanism fix) so it needs a ring like any
    // other control now. It sets no colour of its own — it inherits the header's own
    // ground+foreground pairing (`bg-paper text-ink` here) — so the base :focus-visible rule is
    // the only thing that has to survive the cascade, exactly as for the other plain controls
    // in this list.
    ['/libraries', 'header a[href="/libraries"]', 'wordmark home link (libraries root, paper header)'],
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
  // Required, not optional. This is the one case where suppressing an inner outline is
  // permitted, which is exactly what killed the focus ring in slice A: an `outline-none` in a
  // later cascade layer beat the base :focus-visible, and no stylesheet test could see it because both rules
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

  // ---- A sheet actually isolates the page behind it, in a real browser ----
  // jsdom cannot answer any part of this: it does no layout, does not implement `inert`, and
  // reports offsetParent as null for every element, so "can this background element actually
  // receive focus" is not a question jsdom can be asked. This is exactly what the critique
  // measured directly on the shipped page: document.body overflow was `visible` (the list
  // scrolled behind the sheet), the background was neither `inert` nor `aria-hidden` (the search
  // input and every library link reported tabbable: true), and the scrim was a 545–657px
  // `<button aria-label="Close">` — the first stop in tab order, duplicating the header's own
  // "Close".
  console.log('a sheet isolates the page behind it');
  {
    await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[aria-label^="Actions for Bandes"]', { timeout: 10_000 });

    // Captured rather than assumed: the fix must restore whatever was really there, not reset
    // to a hardcoded 'visible'.
    const bodyOverflowBefore = await page.evaluate(() => getComputedStyle(document.body).overflow);

    await page.click('[aria-label^="Actions for Bandes"]');
    await page.waitForSelector('[role=dialog]', { timeout: 10_000 });

    const locked = await page.evaluate(() => getComputedStyle(document.body).overflow);
    record(locked === 'hidden', 'body scroll is locked while the sheet is open', locked);

    const rootInertWhileOpen = await page.evaluate(
      () => document.getElementById('root')?.hasAttribute('inert') ?? false,
    );
    record(rootInertWhileOpen, 'the app root carries `inert` while the sheet is open', String(rootInertWhileOpen));

    // The direct version of "tabbable: true/false": actually attempt to move focus there. A
    // real browser refuses focus() on anything inside an inert subtree and leaves the active
    // element where it was — which is the platform keeping the aria-modal promise rather than
    // the app merely asserting it.
    const bg = await page.evaluate(() => {
      const attempt = (el) => {
        if (!el) return null;
        el.focus();
        return document.activeElement === el;
      };
      return {
        search: attempt(document.querySelector('input[aria-label="Search every library"]')),
        libraryLink: attempt(document.querySelector('a[href^="/libraries/"]')),
      };
    });
    record(
      bg.search === false,
      'the background search input cannot be focused with the sheet open',
      String(bg.search),
    );
    record(
      bg.libraryLink === false,
      'a background library link cannot be focused with the sheet open',
      String(bg.libraryLink),
    );

    const closeControls = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-label]')]
        .filter((el) => /close/i.test(el.getAttribute('aria-label')))
        .map((el) => el.tagName),
    );
    record(
      closeControls.length === 1,
      'exactly one control on the page is announced "Close"',
      JSON.stringify(closeControls),
    );

    const scrimFocusable = await page.evaluate(() => {
      const scrim = document.querySelector('[data-testid=sheet-scrim]');
      scrim.focus();
      return document.activeElement === scrim;
    });
    record(!scrimFocusable, 'the scrim itself cannot receive focus', String(scrimFocusable));

    // The two hard-won behaviours this fix must not cost, proven here in the same browser the
    // critique used rather than only in jsdom: Escape closes, and focus returns to the opener.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'));

    const restoredOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    record(
      restoredOverflow === bodyOverflowBefore,
      'body scroll is restored once the sheet is fully closed',
      `${restoredOverflow} (was ${bodyOverflowBefore})`,
    );

    const rootInertAfterClose = await page.evaluate(
      () => document.getElementById('root')?.hasAttribute('inert') ?? false,
    );
    record(
      !rootInertAfterClose,
      '`inert` is removed from the app root once the sheet is closed',
      String(rootInertAfterClose),
    );

    const focusReturned = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    record(
      focusReturned?.startsWith('Actions for Bandes') ?? false,
      'focus returns to the opener after Escape',
      String(focusReturned),
    );
  }

  // ---- Item detail's delete confirmation is announced and keeps focus, in a real browser ----
  // Measured by the critique, in a real browser, not jsdom: `document.activeElement` was BODY
  // after clicking Delete. jsdom cannot be evidence here for the same structural reason the
  // sheet's own trap above needs Chrome — but there is a second, sharper reason specific to this
  // control: the confirmation REPLACES the trigger in the same commit (a ternary swap, not an
  // overlay), so whether the browser actually settles focus on "Keep it" rather than reverting it
  // to <body> mid-swap is exactly the kind of real-DOM timing fact a simulated environment cannot
  // stand in for.
  //
  // NOT `[role=alertdialog]`: round 1 shipped that role with neither of the modal behaviours AT
  // expects from it (a focus trap, Escape-to-dismiss) — announcing a modal that does not act like
  // one, in the same direction as the original "announces nothing" defect. This is inline page
  // content, so it is named as a labelled `group`, and the announcement travels on a live region
  // (the description paragraph itself) plus the focus move, not on the role.
  console.log('item detail: the delete confirmation is announced and keeps focus');
  {
    await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');

    const clickButtonByText = (text) =>
      page.evaluate((label) => {
        const btn = [...document.querySelectorAll('main button')].find(
          (el) => el.textContent.trim().toLowerCase() === label,
        );
        btn?.click();
      }, text.toLowerCase());

    await clickButtonByText('Delete');
    await page.waitForSelector('[role=group]', { timeout: 10_000 });

    const reveal = await page.evaluate(() => {
      const group = document.querySelector('[role=group]');
      const active = document.activeElement;
      const live = group?.querySelector('[aria-live]');
      return {
        hasGroup: Boolean(group),
        hasAccessibleName: Boolean(group?.getAttribute('aria-label')?.trim()),
        // The description is carried by a live region INSIDE the group, not a dialog's implicit
        // one — `aria-live="assertive"` with `aria-atomic="true"` on the same node that already
        // holds the visible text, so nothing is written twice.
        hasLiveDescription:
          Boolean(live) &&
          live.getAttribute('aria-live') === 'assertive' &&
          live.getAttribute('aria-atomic') === 'true' &&
          live.textContent.trim().length > 0,
        focusedText: active === document.body ? null : active?.textContent?.trim(),
        focusedIsBody: active === document.body,
      };
    });

    record(reveal.hasGroup, 'the confirmation exposes role="group"', JSON.stringify(reveal));
    record(reveal.hasAccessibleName, 'the group carries an accessible name', JSON.stringify(reveal));
    record(
      reveal.hasLiveDescription,
      'the confirmation text is an assertive, atomic live region — the announcement, not a dialog role',
      JSON.stringify(reveal),
    );
    record(
      !reveal.focusedIsBody && reveal.focusedText?.toLowerCase() === 'keep it',
      'focus moves to "Keep it" on reveal — the safe default, never "Delete for good"',
      `focusedText: ${JSON.stringify(reveal.focusedText)}, focusedIsBody: ${reveal.focusedIsBody}`,
    );

    // The honest half of dropping `alertdialog`: this genuinely is not a dialog, so Tab must be
    // FREE to leave it — unlike the sheet's real trap checked above. Proving this is what makes
    // "group, not alertdialog" more than a label swap.
    await page.keyboard.press('Tab');
    const afterTab = await page.evaluate(
      () => !document.querySelector('[role=group]')?.contains(document.activeElement),
    );
    record(afterTab, 'Tab is free to leave the confirmation — a group, not a trapped dialog', String(afterTab));

    // Cancel, then confirm focus RETURNS to the trigger — a fresh "Delete" button, remounted the
    // instant the confirmation closes — rather than falling back to <body>.
    await clickButtonByText('Keep it');
    await page.waitForFunction(
      () => !document.querySelector('[role=group]'),
      { timeout: 10_000 },
    );
    const afterCancel = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        focusedText: active === document.body ? null : active?.textContent?.trim(),
        focusedIsBody: active === document.body,
      };
    });
    record(
      !afterCancel.focusedIsBody && afterCancel.focusedText?.toLowerCase() === 'delete',
      'focus returns to the Delete trigger on cancel, not <body>',
      `focusedText: ${JSON.stringify(afterCancel.focusedText)}, focusedIsBody: ${afterCancel.focusedIsBody}`,
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

  // ---- The `FILING INTO` mark's collection name must not inherit the label's caps ----
  // Fix round 1, finding 1: `<p className="caps ...">Filing into {collectionName}</p>` set
  // `text-transform: uppercase` on the WHOLE element, so "Blake et Mortimer" rendered as
  // "BLAKE ET MORTIMER" — a content title, and content titles are never uppercased. jsdom's
  // `textContent` cannot see this at all (it ignores CSS), which is exactly why `yarn test`
  // passed on the broken markup and this check exists: the unit suite asserts the class is
  // DECLARED (`.className` contains `normal-case`), this asserts it SURVIVES the cascade as an
  // actually-resolved computed style, the same division as the sheet-heading check above.
  console.log("the FILING INTO mark's collection name is not uppercased");
  // ISBN_MIXED_ARTWORK from tools/mock-detections.js — a real match, not a miss, so the
  // candidate list (and the collection name mark beside it) actually renders. 'coll-melville' /
  // 'Melville' come from src/test/fixtures/items.js, already the fixture library this file uses
  // elsewhere in this script.
  await page.goto(
    `${BASE}/libraries/lib-fiction/add/book/results?isbn=9782070408504&collectionId=coll-melville`,
    { waitUntil: 'networkidle0' },
  );
  await page.waitForSelector('[data-mark="filing-into-name"]');
  const filingInto = await page.evaluate(() => {
    const el = document.querySelector('[data-mark="filing-into-name"]');
    const s = getComputedStyle(el);
    return { transform: s.textTransform, text: el.textContent };
  });
  record(
    filingInto.transform !== 'uppercase',
    'the collection name is not uppercased',
    filingInto.transform,
  );
  record(filingInto.text.trim() === 'Melville', 'the collection name renders intact', filingInto.text);

  // ---- The looked-up code renders in the mono, once, at the head ----
  // Fix round 2, finding 2: the scanned ISBN used to print on every candidate row (the reader's
  // own code echoed back three times, differentiating nothing); it now lives once at the head of
  // the list, in Chivo Mono. `.num`'s declaration is asserted by the unit suite; whether it
  // actually RESOLVES to the mono face is a computed-style fact jsdom cannot see, same division
  // as the two checks above. Reuses the page already loaded for the FILING INTO check.
  console.log('the looked-up code renders in the mono at the head of the list');
  await page.waitForSelector('[data-mark="lookup-code"]');
  const lookupCode = await page.evaluate(() => {
    const el = document.querySelector('[data-mark="lookup-code"]');
    return { fontFamily: getComputedStyle(el).fontFamily, text: el.textContent.trim() };
  });
  record(
    lookupCode.fontFamily.includes('Chivo Mono'),
    'the head code resolves to Chivo Mono',
    lookupCode.fontFamily,
  );
  record(lookupCode.text === '9782070408504', 'the head code is the scanned ISBN', lookupCode.text);

  // ---- Shared by the two capture-flow checks below ----
  //
  // Wait on the DESTINATION SCREEN's own name, never on a selector the previous screen also has.
  // The capture routes are lazy chunks, so after a save the URL changes while React keeps the
  // results screen up until the chunk arrives — and the results screen renders the session tally
  // too. `waitForSelector('[data-mark="session-tally"]')` therefore matched immediately, on the
  // page the reader had just left, and every assertion after it described the wrong screen.
  // Found by probing, not by the check failing: it PASSED that way.
  const waitForScreen = (name) =>
    page.waitForFunction(
      (text) => document.querySelector('main h1')?.textContent?.trim() === text,
      { timeout: 10_000 },
      name,
    );

  // Waits for its own target before clicking, and REPORTS whether it clicked. The results
  // screen renders its <h1> while still loading, so "the screen is here" and "a candidate is
  // here" are different moments — clicking on the first one is a no-op that leaves the next
  // wait to time out ten seconds later, blaming the wrong step. A helper that can silently
  // click nothing is the same shape as a mutation that silently does not land.
  const useFirstCandidate = async () => {
    await page.waitForFunction(
      () => [...document.querySelectorAll('main button')].some((el) =>
        el.textContent.trim().toLowerCase().startsWith('use this'),
      ),
      { timeout: 10_000 },
    );
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('main button')].find(
        (el) => el.textContent.trim().toLowerCase().startsWith('use this'),
      );
      btn?.click();
      return Boolean(btn);
    });
    if (!clicked) throw new Error('no "Use this" control to press on the results screen');
  };

  // ---- Filing an item says so, and the session tally accumulates ----
  // The P0 from slice D's critique: `USE THIS` posted the item, replaced back to the capture
  // screen, and produced a DOM textually identical to a fresh arrival. Saved-and-looping and
  // bounced-back-by-an-error were indistinguishable, which is a defect with no reporter — the
  // reader assumes the scan failed, re-scans, and never mentions it.
  //
  // Belongs in THIS suite, not the unit one: what makes the defect a defect is that the screen
  // after a save looks unchanged, and only a real navigation through a real save can show that
  // it no longer does. The unit suite asserts the toast is requested; this asserts a reader
  // would see it, and that the tally survives the replace that follows.
  console.log('filing an item confirms it, and the session tally accumulates across the loop');
  {
    await page.goto(`${BASE}/libraries/lib-fiction/add/book/results?isbn=9782070408504`, {
      waitUntil: 'networkidle0',
    });


    await useFirstCandidate();
    // The toast is rendered by ToastProvider OUTSIDE <main>, so it is waited on by its own hook.
    await page.waitForSelector('[data-toast]', { timeout: 10_000 });
    const toastText = await page.evaluate(() => document.querySelector('[data-toast]')?.textContent?.trim());
    record(
      Boolean(toastText) && toastText.length > 0,
      'a save confirms with a printed toast naming the item',
      String(toastText),
    );

    await waitForScreen('Add a book');
    const afterFirst = await page.evaluate(() => ({
      tally: document.querySelector('[data-mark="session-tally"]')?.textContent?.trim(),
      path: window.location.pathname,
    }));
    record(afterFirst.tally === '1', 'the tally reads 1 on the capture screen after one save', String(afterFirst.tally));
    record(
      afterFirst.path === '/libraries/lib-fiction/add/book',
      'the save loops back to the capture screen',
      afterFirst.path,
    );

    // The whole point of the tally rather than a second toast: it ACCUMULATES. A count that
    // resets to 1 on every item answers "did that one save?" and never "where did I get to?".
    //
    // The second item is reached the way a reader reaches it — typing the code and pressing the
    // screen's own control — NOT by a second `page.goto`. A `goto` is a full document load, which
    // tears down the whole app and with it the layout route holding the session, so the tally
    // would correctly read 1 again and this check would fail on correct code. (It did, on the
    // first run: the mistake was mine, and the guard was right.) A hard reload genuinely IS a new
    // session; only an in-app navigation continues this one, which is exactly the property under
    // test.
    await page.type('main input', '9782070408504');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('main button')].find(
        (el) => el.textContent.trim().toLowerCase().startsWith('look it up'),
      );
      btn?.click();
    });
    await waitForScreen('Book results');
    await useFirstCandidate();
    await waitForScreen('Add a book');
    const afterSecond = await page.evaluate(
      () => document.querySelector('[data-mark="session-tally"]')?.textContent?.trim(),
    );
    record(afterSecond === '2', 'the tally accumulates rather than resetting per item', String(afterSecond));

    // And it is scoped to the flow, not to the app: leaving for the library and coming back is a
    // NEW cataloguing session, which is exactly what the layout-route provider defines. A tally
    // that survived this would be lying about the word "session".
    await page.goto(`${BASE}/libraries/lib-fiction`, { waitUntil: 'networkidle0' });
    await page.goto(`${BASE}/libraries/lib-fiction/add/book`, { waitUntil: 'networkidle0' });
    await waitForScreen('Add a book');
    const afterLeaving = await page.evaluate(() => document.querySelector('[data-mark="session-tally"]'));
    record(afterLeaving === null, 'the tally is absent again after leaving and re-entering the flow', 'still present');
  }

  // ---- The capture captions are readable over a live feed, and do not cover their own target ----
  // Slice D's P1. Five byte-identical instances set `--ink-soft` on nothing at all, `absolute
  // inset-0` over the <video>: measured between 1.45:1 and 5.1:1 against the SAME string
  // depending on what the lens was pointing at. This is the first check in this suite that has
  // ever loaded a capture screen — see the fake-camera flags on the launch above for why the
  // whole surface was unobserved until now.
  //
  // The reachable caption is the film screen's idle guidance. The busy captions cannot be held
  // still here (they exist only while a lookup is in flight), but all five go through ONE
  // component now, so a measurement of any one of them is a measurement of the construction.
  console.log('capture captions print on their own ground, at the frame\'s bottom edge');
  {
    await page.goto(`${BASE}/libraries/lib-films/add/video`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(
      () => document.querySelector('main video')?.readyState === 4,
      { timeout: 15_000 },
    );

    const caption = await page.evaluate(() => {
      const video = document.querySelector('main video');
      const el = [...document.querySelectorAll('main p')].find(
        (p) => p.textContent.trim().toLowerCase() === 'frame the title',
      );
      if (!el) return null;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const frame = video.parentElement.getBoundingClientRect();
      return {
        color: style.color,
        background: style.backgroundColor,
        // Pinned to the bottom edge: its top must sit BELOW the frame's midpoint, so the
        // aiming region stays clear. `inset-0` put it dead centre, over the title itself.
        topWithinFrame: box.top - frame.top,
        frameHeight: frame.height,
        // Full-width strip, not a floating pill: it spans the frame it belongs to.
        spansFrame: Math.abs(box.width - frame.width) <= 4,
        videoLive: video.readyState === 4,
        videoSize: `${video.videoWidth}x${video.videoHeight}`,
      };
    });

    record(caption !== null, 'the film capture screen renders its idle caption over a live feed', 'no caption found');
    if (caption) {
      console.log(`    feed ${caption.videoSize}, readyState 4; caption color ${caption.color} on ${caption.background}`);
      const toHex = (rgb) => {
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
      };
      // A transparent background is the DEFECT, not merely a low ratio: with nothing painted, the
      // ratio is whatever the camera is looking at, and contrastRatio has nothing to compute.
      const opaque = !/rgba\(0,\s*0,\s*0,\s*0\)/.test(caption.background);
      record(opaque, 'the caption paints its own ground rather than sitting on the feed', caption.background);
      if (opaque) {
        const ratio = contrastRatio(toHex(caption.color), toHex(caption.background));
        record(ratio >= 4.5, `the caption clears AA on its own ground (${ratio.toFixed(2)}:1)`, `${ratio.toFixed(2)}:1`);
      }
      record(
        caption.topWithinFrame > caption.frameHeight / 2,
        'the caption sits below the frame\'s midpoint, clear of the aiming region',
        `top ${Math.round(caption.topWithinFrame)}px of ${Math.round(caption.frameHeight)}px`,
      );
      record(caption.spansFrame, 'the caption spans the frame as a strip, not a floating block', 'width mismatch');
    }

    // FIRST USE ONLY. "Frame the title" is an instruction, and an instruction that has been read
    // is furniture — by film ten it is a permanent strip on the frame restating what the reader
    // learned at film one. Filing one item is what retires it, which also proves the wiring:
    // the caption is driven by the same session tally, not by a second notion of "seen it".
    await page.goto(`${BASE}/libraries/lib-films/add/video/results?title=Les%20Tontons%20flingueurs`, {
      waitUntil: 'networkidle0',
    });
    await useFirstCandidate();
    await waitForScreen('Add a film');
    await page.waitForFunction(
      () => document.querySelector('main video')?.readyState === 4,
      { timeout: 15_000 },
    );
    const guidanceAfterFiling = await page.evaluate(() =>
      [...document.querySelectorAll('main p')].some(
        (p) => p.textContent.trim().toLowerCase() === 'frame the title',
      ),
    );
    record(
      guidanceAfterFiling === false,
      'the idle guidance retires once the session has filed something',
      'still printed on the frame',
    );
  }

  // ---- The camera survives the loop instead of restarting on every item ----
  // Slice D's other P1. Each save `replace`s back to the capture screen, which is a fresh mount,
  // and the mount-only effect used to tear the stream down and call `getUserMedia` again — ten
  // items, ten device-open-and-refocus cycles, each showing a black frame first. This design
  // accepts a harder reach for Add BECAUSE the flow loops; the loop's per-item cost is therefore
  // the thing most worth engineering.
  //
  // Counted rather than timed. A wall-clock assertion on camera warmup would be flaky on any
  // machine and meaningless on a fake device; the number of times the app asks the browser for a
  // camera is exact, and it is the thing that actually changed.
  console.log('the camera is opened once per cataloguing session, not once per item');
  {
    // Counts `getUserMedia` calls from inside the page, installed before any app code runs so a
    // reload cannot slip a call past it.
    await page.evaluateOnNewDocument(() => {
      // Two counters, both installed before any app code runs so nothing can slip past them:
      // how many times the app asked the browser for a camera, and how many tracks it stopped.
      // The second is what makes "leaving released it" observable rather than assumed.
      window.__cameraOpens = 0;
      window.__trackStops = 0;
      const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (...args) => {
        window.__cameraOpens += 1;
        return real(...args).then((stream) => {
          for (const track of stream.getTracks()) {
            const realStop = track.stop.bind(track);
            track.stop = () => {
              window.__trackStops += 1;
              return realStop();
            };
          }
          return stream;
        });
      };
    });

    await page.goto(`${BASE}/libraries/lib-fiction/add/book/results?isbn=9782070408504`, {
      waitUntil: 'networkidle0',
    });
    await useFirstCandidate();
    await waitForScreen('Add a book');
    await page.waitForFunction(() => document.querySelector('main video')?.readyState === 4, {
      timeout: 15_000,
    });

    // A second item, reached the way a reader reaches it.
    await page.type('main input', '9782070408504');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('main button')].find(
        (el) => el.textContent.trim().toLowerCase().startsWith('look it up'),
      );
      btn?.click();
    });
    await waitForScreen('Book results');
    await useFirstCandidate();
    await waitForScreen('Add a book');
    await page.waitForFunction(() => document.querySelector('main video')?.readyState === 4, {
      timeout: 15_000,
    });

    const opensWithinSession = await page.evaluate(() => window.__cameraOpens);
    record(
      opensWithinSession === 1,
      'two items filed, the camera opened once',
      `opened ${opensWithinSession} times`,
    );
    // And the feed is genuinely live on the second item, not merely un-reopened: a lease that
    // handed back a dead stream would also count 1.
    const liveOnSecondItem = await page.evaluate(() => {
      const video = document.querySelector('main video');
      return Boolean(video?.srcObject) && video.readyState === 4 && video.videoWidth > 0;
    });
    record(liveOnSecondItem, 'the feed is still live after the second save', 'feed not live');

    // Leaving the flow releases it: the layout route unmounts, the tracks stop, and coming back
    // opens the device again.
    //
    // IN-APP navigation, not `page.goto`. A full document load resets these counters along with
    // everything else, so it can say nothing about whether the previous document released
    // anything — the first draft of this assertion did exactly that, and was measuring a fresh
    // page rather than a release.
    //
    // `goBack`, not `goForward`: the capture screen's own back control is an explicit
    // `navigate(library)` PUSH rather than a history step (it has two possible predecessors and a
    // relative step is wrong for one of them), so leaving adds an entry rather than consuming
    // one — there is no forward entry to go to.
    await page.evaluate(() => {
      document.querySelector('header button')?.click();
    });
    await waitForScreen('Fiction');

    // WAIT FOR THE RELEASE, do not assume it. The release is deferred by one macrotask so a
    // StrictMode remount can cancel it, which means a re-entry issued inside that same tick
    // legitimately keeps the camera — and puppeteer can issue one that fast where a reader
    // cannot. Racing it made this assertion pass or fail on how many CDP round trips happened to
    // sit in between, which is the definition of a flaky check. Waiting on the stop counter
    // asserts the release as its own fact AND removes the race.
    await page.waitForFunction(() => window.__trackStops >= 1, { timeout: 10_000 });
    const stopsAfterLeaving = await page.evaluate(() => window.__trackStops);
    record(stopsAfterLeaving >= 1, 'leaving the flow stops the camera track', `${stopsAfterLeaving} stops`);

    await page.goBack();
    await waitForScreen('Add a book');
    await page.waitForFunction(() => document.querySelector('main video')?.readyState === 4, {
      timeout: 15_000,
    });
    const opensAfterReentry = await page.evaluate(() => window.__cameraOpens);
    record(
      opensAfterReentry === 2,
      're-entering the flow opens the camera again, so the release was real and not a leak',
      `counter read ${opensAfterReentry} in one document`,
    );
  }

  // ---- The capture screens fit a 667px phone in EVERY state, notice included ----
  // The spec measured the plain state, found 240px fitted exactly, and generalised — which is
  // ruling for all states from one. Reached via the bare-results redirect, which prints a notice
  // above the frame, the film screen measured 739px tall with `Enter by hand` at y≈723: below the
  // fold, on the one control PRODUCT.md says must always be in reach.
  //
  // The constraint stands and the FRAME yields, down to a 120px floor. Both states are asserted,
  // because asserting one is how this was got wrong the first time.
  console.log('the capture screens fit a 667px viewport, in the plain state and with a notice');
  {
    const previousViewport = page.viewport();
    await page.setViewport({ width: 390, height: 667 });

    const measureFit = async (url, screenName) => {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle0' });
      await waitForScreen(screenName);
      await page.waitForFunction(() => document.querySelector('main video')?.readyState === 4, {
        timeout: 15_000,
      });
      return page.evaluate(() => {
        const escape = [...document.querySelectorAll('main a')].find((el) =>
          /enter by hand/i.test(el.textContent),
        );
        const frame = document.querySelector('main video')?.parentElement;
        return {
          documentHeight: document.documentElement.scrollHeight,
          escapeBottom: escape
            ? Math.round(escape.getBoundingClientRect().bottom + window.scrollY)
            : null,
          frameHeight: frame ? Math.round(frame.getBoundingClientRect().height) : null,
        };
      });
    };

    for (const [label, url, screenName] of [
      ['film, plain', '/libraries/lib-films/add/video', 'Add a film'],
      // The redirect prints the no-input notice above the frame — the state the original ruling
      // never measured.
      ['film, with the notice', '/libraries/lib-films/add/video/results', 'Add a film'],
      ['book, plain', '/libraries/lib-fiction/add/book', 'Add a book'],
      ['book, with the notice', '/libraries/lib-fiction/add/book/results', 'Add a book'],
    ]) {
      const fit = await measureFit(url, screenName);
      console.log(
        `    ${label}: document ${fit.documentHeight}px, escape ends at ${fit.escapeBottom}, frame ${fit.frameHeight}px`,
      );
      record(
        fit.documentHeight <= 667,
        `${label}: the page fits a 667px viewport without scrolling`,
        `${fit.documentHeight}px`,
      );
      record(
        fit.escapeBottom !== null && fit.escapeBottom <= 667,
        `${label}: the manual escape is above the fold`,
        `ends at ${fit.escapeBottom}`,
      );
      // A frame that has yielded to nothing is still a camera. Asserting the floor here is what
      // stops a future "just shrink it more" from buying the fit with a viewfinder nobody can aim.
      record(
        fit.frameHeight >= 120,
        `${label}: the capture frame is still usable (>= 120px)`,
        `${fit.frameHeight}px`,
      );
    }

    await page.setViewport(previousViewport);
  }

  // ---- The candidate screens are where the picture decides, so the picture gets room ----
  // On this one screen "the picture is what decides the match". It shipped at
  // the browse row's 48x72 — smaller than a stream row's job needs, on the screen with the most
  // vertical space to spare — and truncated the title as well, on the surface whose entire job is
  // telling two editions of one book apart. A mis-selection here writes a record the reader
  // cannot detect as wrong later.
  console.log('candidate rows give the artwork room and never cut the title');
  for (const [label, url, screenName] of [
    ['book', '/libraries/lib-fiction/add/book/results?isbn=9782070408504', 'Book results'],
    ['film', '/libraries/lib-films/add/video/results?title=Les%20Tontons%20flingueurs', 'Film results'],
  ]) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle0' });
    await waitForScreen(screenName);
    await page.waitForSelector('main li');

    const rows = await page.evaluate(() => {
      const lineHeight = 21; // 17px at leading-tight
      return [...document.querySelectorAll('main li')].map((li) => {
        const frame = li.querySelector('div.border-2');
        const title = li.querySelector('p');
        const box = frame?.getBoundingClientRect();
        return {
          frame: box ? { w: Math.round(box.width), h: Math.round(box.height) } : null,
          truncated: title ? title.className.includes('truncate') : null,
          // A wrapped title is taller than one line AND is not clipped: `scrollWidth` equal to
          // `clientWidth` means nothing overflowed horizontally, which is what truncation causes.
          lines: title ? Math.round(title.getBoundingClientRect().height / lineHeight) : 0,
          clipped: title ? title.scrollWidth > title.clientWidth : null,
        };
      });
    });

    record(rows.length >= 3, `${label}: the fixture serves several candidates to compare`, `${rows.length} rows`);
    record(
      rows.every((r) => r.frame?.w === 88 && r.frame?.h === 132),
      `${label}: every candidate frame is 88x132, larger than a browse row's 48x72`,
      JSON.stringify(rows.map((r) => r.frame)),
    );
    record(
      rows.every((r) => r.truncated === false && r.clipped === false),
      `${label}: no candidate title is truncated or clipped`,
      JSON.stringify(rows.map((r) => ({ truncated: r.truncated, clipped: r.clipped }))),
    );
    // Without this the assertion above passes vacuously on a fixture where nothing is long enough
    // to wrap — the third time this project has caught a check passing for the wrong reason, so
    // the fixture carries a genuinely long title and the guard insists on seeing it wrap.
    record(
      rows.some((r) => r.lines >= 2),
      `${label}: at least one candidate title actually wraps, so the check is not vacuous`,
      JSON.stringify(rows.map((r) => r.lines)),
    );
  }

  // ---- Three tab stops in one control must be distinguishable ----
  // The whole-box `:focus-within` construction "holds only while the control has
  // exactly one focusable descendant". The search field had THREE — the input, the submit mark and
  // the clear mark — and under `focus-within` the box lit for all of them while each mark's own
  // ring was suppressed. Pixel-diffed by the critique: `Clear the search` and `Search` were
  // IDENTICAL when focused, 0 pixels differing, with one of the two destroying the query.
  //
  // It went to two when the submit mark was dropped — on a field that searched as it was typed,
  // submitting did nothing, and the action slot must never hold an inert control — and it is THREE
  // again now that the field only searches on submit. So the exact adjacency the critique found is
  // back on the screen, and what makes it safe is the selector rather than the removal.
  //
  // That is worth asserting rather than assuming: all three focused states are diffed against each
  // other, including the `Search`/`Clear the search` pair that was once 0 bytes apart. A guard
  // narrowed to the pair that happened to survive would have gone on passing while the original
  // defect returned.
  //
  // Diffed rather than read from a computed style, because what failed was not a property — every
  // rule was correct in isolation — it was which ELEMENT the indicator landed on.
  console.log('the search field distinguishes its tab stops when focused');
  {
    // `?q=` rather than typing: the surface no longer searches as it is typed, so typing alone
    // would wait for rows that are never coming.
    await page.goto(`${BASE}/search?q=roman`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main input');
    await page.waitForSelector('main li', { timeout: 10_000 });

    // ONE KEYBOARD EVENT, and without it this whole section measures nothing. Every indicator here
    // is `:focus-visible`, which Chrome grants to a PROGRAMMATICALLY focused element only when the
    // reader's last interaction was via the keyboard — so `el.focus()` from `page.evaluate` draws
    // no ring at all on a page that has only been navigated to. The probe used to satisfy this by
    // accident, because it typed the query in; seeding the query through `?q=` removed the typing
    // and every one of the three diffs went to 0 bytes — three passes turning into three failures
    // that were about the harness rather than the app.
    await page.keyboard.press('Tab');

    const shootFocused = async (label) => {
      await page.evaluate((name) => {
        const form = document.querySelector('form[role=search]');
        const el = name === 'input'
          ? form.querySelector('input')
          : [...form.querySelectorAll('button')].find((b) => new RegExp(name, 'i').test(b.getAttribute('aria-label') ?? ''));
        el.focus();
      }, label);
      return (await page.$('form[role=search]')).screenshot();
    };

    const diff = async (a, b) => {
      const [x, y] = await Promise.all([sharp(a).raw().toBuffer(), sharp(b).raw().toBuffer()]);
      let differing = 0;
      for (let i = 0; i < Math.min(x.length, y.length); i += 1) if (x[i] !== y[i]) differing += 1;
      return differing;
    };

    const onInput = await shootFocused('input');
    const onClear = await shootFocused('clear');
    const onSubmit = await shootFocused('^search$');

    for (const [label, a, b] of [
      ['input vs clear', onInput, onClear],
      ['input vs submit', onInput, onSubmit],
      // THE ORIGINAL DEFECT. These two were pixel-identical when focused, and one of them wipes
      // the query while the other runs it.
      ['clear vs submit', onClear, onSubmit],
    ]) {
      const differing = await diff(a, b);
      console.log(`    ${label}: ${differing} bytes differ`);
      record(differing > 0, `focus is distinguishable: ${label}`, `${differing} bytes differ`);
    }

    // And the submit mark is PRESENT, because on this surface it is now the control that runs the
    // lookup — the visible duplicate of the phone keyboard's action key, and the only route for a
    // reader with a pointer and no Enter.
    const submitMarks = await page.evaluate(() =>
      [...document.querySelectorAll('form[role=search] button')].filter((b) => b.type === 'submit').length,
    );
    record(submitMarks === 1, 'the surface carries its submit control', `${submitMarks} found`);
  }

  // ---- The surface focuses the field it IS ----
  // `SearchField`'s own comment says a reader arriving mid-lookup "must land on the thing they
  // were typing into", and none of them did — `activeElement` was `body` on a cold load, on
  // arrival from the pinned field, and after Back. Another description that outlived its
  // behaviour, which is the same shape as the stale enumeration in index.css that let the focus
  // rule break in the first place.
  console.log('the search surface focuses its own field on arrival');
  {
    await page.goto(`${BASE}/search`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main input');
    const focused = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    record(focused === 'input', 'the field has focus on a cold load', String(focused));

    // And the launcher on the libraries root must NOT steal it: that is a browse screen, and
    // raising the keyboard over the list on every visit to the app's home would be worse than
    // the problem this fixes.
    await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('header input, main input');
    const rootFocus = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    record(rootFocus !== 'input', 'the pinned launcher does not steal focus on the root', String(rootFocus));
  }

  // ---- The search field does not make Mobile Safari zoom, and its keyboard can act ----
  // Both reported from the deployed app by the owner, on the most-tapped control in the product:
  // "when I click on search there is somehow a zoom", and having to type, press Done to dismiss
  // the keyboard, then reach for the magnifier — three steps for one intent.
  //
  // The zoom is the 16px rule. `Field.jsx` has set `text-base` for exactly this reason since it
  // was written, and the type-scale guard's exception was recorded as a property of that FILE —
  // so 13px on a different input was on the scale and passed. Nothing here could have caught it
  // either, which is why this check exists now rather than the guard alone.
  console.log('the search field is 16px, so Mobile Safari does not zoom on focus');
  {
    for (const [label, route] of [['pinned launcher', '/libraries'], ['search surface', '/search']]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('input[type=search]');
      const field = await page.evaluate(() => {
        const input = document.querySelector('input[type=search]');
        return {
          fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
          enterKeyHint: input.getAttribute('enterkeyhint'),
        };
      });
      // 16 is the floor, not the value: anything below it zooms, anything at or above does not.
      record(
        field.fontSize >= 16,
        `${label}: the input is at least 16px, the size below which iOS zooms`,
        `${field.fontSize}px`,
      );
      // Without this the virtual keyboard offers "Done", which only dismisses — so the reader has
      // to find another control to act. The LABEL comes from the OS in the reader's own language,
      // which is why this is a hint and not a string we write.
      record(
        field.enterKeyHint === 'search',
        `${label}: the keyboard offers a search action rather than "Done"`,
        String(field.enterKeyHint),
      );
    }
  }

  // ---- Typing is not asking: a request costs a round trip, and only a submit spends one ----
  // The surface used to query on a 300ms debounce, so a term typed at a reader's pace spent a
  // request per pause to answer the one lookup they meant — on the poor signal PRODUCT.md names as
  // the dominant scene. Counted here rather than in the unit suite because what is being asserted
  // is real network traffic from real keystrokes, and the unit suite's `fetch` is a stub.
  console.log('the search surface fires no request until the reader submits');
  {
    await page.goto(`${BASE}/search`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main input');

    const searchRequests = [];
    const onRequest = (req) => {
      if (req.url().endsWith('/search')) searchRequests.push(req.url());
    };
    page.on('request', onRequest);

    // A whole term, one character at a time, with a pause between each that is longer than the
    // debounce that used to be here. Anything shorter would pass against a reinstated debounce.
    await page.type('main input', 'roman', { delay: 120 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    record(searchRequests.length === 0, 'typing five characters fires no search', `${searchRequests.length} requests`);

    // And then the action key spends exactly one.
    await page.keyboard.press('Enter');
    await page.waitForSelector('main li', { timeout: 10_000 });
    record(searchRequests.length === 1, 'submitting fires exactly one', `${searchRequests.length} requests`);

    // The submitted query reaches the URL, which is what makes this surface refresh-safe: the
    // address bar and the results cannot disagree, because there is only one of them.
    record(
      new URL(page.url()).searchParams.get('q') === 'roman',
      'the submitted query is written to ?q=',
      page.url(),
    );

    page.off('request', onRequest);
  }

  // ---- The search field draws its own controls, and none of the browser's ----
  // `type="search"` gives WebKit a clear button of its own, in BLUE — a colour that appears
  // nowhere in the palette — on the loudest mark in the design. It had been there since the field
  // was built and was invisible until the search surface became real, because on the libraries
  // root typing navigates away before the field ever holds text.
  //
  // Asserted on the PSEUDO-ELEMENT, which is the only place this fact lives: no authored node
  // exists to inspect, and a screenshot is how it was found rather than how it should be caught.
  console.log('the search field suppresses the browser\'s own clear button and draws its own');
  {
    // `?q=` rather than typing: the surface no longer searches as it is typed, so typing alone
    // would wait for rows that are never coming.
    await page.goto(`${BASE}/search?q=roman`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main input');
    await page.waitForSelector('main li', { timeout: 10_000 });

    // ONE KEYBOARD EVENT, and without it this whole section measures nothing. Every indicator here
    // is `:focus-visible`, which Chrome grants to a PROGRAMMATICALLY focused element only when the
    // reader's last interaction was via the keyboard — so `el.focus()` from `page.evaluate` draws
    // no ring at all on a page that has only been navigated to. The probe used to satisfy this by
    // accident, because it typed the query in; seeding the query through `?q=` removed the typing
    // and every one of the three diffs went to 0 bytes — three passes turning into three failures
    // that were about the harness rather than the app.
    await page.keyboard.press('Tab');

    const field = await page.evaluate(() => {
      const input = document.querySelector('main input');
      const clear = [...input.closest('form').querySelectorAll('button')].find(
        (el) => /clear/i.test(el.getAttribute('aria-label') ?? ''),
      );
      const box = clear?.getBoundingClientRect();
      return {
        hasAuthoredClear: Boolean(clear),
        clearColor: clear ? getComputedStyle(clear).color : null,
        clearTarget: box ? { w: Math.round(box.width), h: Math.round(box.height) } : null,
      };
    });

    // SAMPLED FROM THE RENDER, not from a computed style. The first version of this asserted
    // `getComputedStyle(input, '::-webkit-search-cancel-button').appearance === 'none'` and read
    // `auto` on correct code: Chrome does not reflect UA shadow pseudo-elements through
    // getComputedStyle, so the probe was measuring a property the browser does not expose there
    // — a true answer about the wrong substrate, in the check written to catch one.
    //
    // The field's whole palette is yellow, ink and paper; every one of those has b <= r. The
    // native control is blue. So "any pixel where blue clearly leads" is exactly the condition,
    // and it cannot be satisfied by anything the design itself draws.
    const fieldShot = await (await page.$('form[role=search]')).screenshot();
    const fieldPixels = await sharp(fieldShot).raw().toBuffer({ resolveWithObject: true });
    let bluePixels = 0;
    for (let i = 0; i < fieldPixels.data.length; i += fieldPixels.info.channels) {
      const [r, g, b] = [fieldPixels.data[i], fieldPixels.data[i + 1], fieldPixels.data[i + 2]];
      if (b > r + 30 && b > g + 30) bluePixels += 1;
    }
    record(
      bluePixels === 0,
      'no pixel in the field is blue — the browser\'s own clear button is suppressed',
      `${bluePixels} blue pixels`,
    );
    // Suppressing it removes a real affordance, so the replacement is asserted too — otherwise
    // this check would be satisfied by deleting the control and leaving nothing.
    record(field.hasAuthoredClear, 'the field draws its own clear mark instead', 'no authored clear control');
    record(
      field.clearColor === 'rgb(11, 11, 11)',
      'the clear mark is ink, not a colour from outside the palette',
      String(field.clearColor),
    );
    record(
      field.clearTarget?.w >= 48 && field.clearTarget?.h >= 48,
      'the clear mark clears the 48px touch floor',
      JSON.stringify(field.clearTarget),
    );
  }

  // ---- The accent marks the commit, and the flow's longest list is where that is tested ----
  // At rest no chrome-yellow plate existed anywhere in the add flow: every `Use this`, both
  // shutters, both manual escapes and the re-search were `secondary`, and the two `primary`
  // submits are disabled at rest and therefore render AS the secondary outline. So `--imprint`,
  // which the palette law reserves for the apparatus of ACTING, marked only the fallback path.
  // Filing a candidate is this flow's only write.
  //
  // Asserted on the five-candidate fixtures rather than the three: five is the most either
  // resolver can serve (TMDB slices to 5 at tmdb.go:161; the book side reaches five when Google
  // returns three volume records for one ISBN alongside Babelio and Goodreads), so this renders
  // the worst case for "is that a wall of accent" rather than the comfortable one.
  console.log('the commit control is the plate, and the redo control is not');
  for (const [label, url, screenName, expectedRows] of [
    ['book', '/libraries/lib-fiction/add/book/results?isbn=9782070368228', 'Book results', 5],
    ['film', '/libraries/lib-films/add/video/results?title=Le%20Samoura%C3%AF', 'Film results', 5],
  ]) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle0' });
    await waitForScreen(screenName);
    await page.waitForSelector('main li button');

    const controls = await page.evaluate(() => {
      const read = (el) => {
        const style = getComputedStyle(el);
        return { bg: style.backgroundColor, color: style.color, label: el.textContent.trim() };
      };
      return {
        commits: [...document.querySelectorAll('main li button')].map(read),
        // The film screen's re-search sits in the head form; the book screen has no such control,
        // which the assertion below accounts for rather than assuming one exists.
        redo: [...document.querySelectorAll('main form button')].map(read),
      };
    });

    record(
      controls.commits.length === expectedRows,
      `${label}: the fixture renders ${expectedRows} candidates — the resolver's own maximum`,
      `${controls.commits.length} rows`,
    );
    // `--imprint` is #F2C200. Read as a resolved colour rather than a class, because a class says
    // what was declared and this asserts what the cascade actually painted.
    record(
      controls.commits.every((c) => c.bg === 'rgb(242, 194, 0)' && c.color === 'rgb(11, 11, 11)'),
      `${label}: every commit control is the imprint plate with ink caps`,
      JSON.stringify(controls.commits.map((c) => c.bg)),
    );
    record(
      controls.redo.every((c) => c.bg === 'rgba(0, 0, 0, 0)'),
      `${label}: the redo control is NOT a plate, so commit and redo stop looking identical`,
      JSON.stringify(controls.redo.map((c) => ({ label: c.label, bg: c.bg }))),
    );
  }

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
  // The palette is explicit that --ink-soft and --paper-deep belong to the PAPER surface only:
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
  // waits for the fully-loaded detail body rather than racing the loading placeholder. `^=`, not
  // `=`: round 5 gave the stamp's aria-label duration parity with its visible text (", N days"),
  // and N is derived from the real clock against the fixture's fixed LENT date, so it drifts by
  // a day every time this script runs on a later date. The prefix is stable; the day count is not.
  await page.waitForSelector('[aria-label^="On loan to Marie"]', { timeout: 10_000 });
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
  // through the sheet's own recessed ground — 1.09:1, "grey on white, hardly readable". The
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
    await page.waitForSelector('[aria-label^="On loan to Marie"]', { timeout: 10_000 });
  }

  // ---- --shared and --out must never resolve as TEXT colour on the cover either ----
  // Round 2 (the item-detail marks column): the contrast table measures --shared on --ink at ~3.03:1
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
  // directly above it (an edge rule must never displace content). The fix hangs the
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

  // ---- Signing out works, on a route this suite had never visited ----
  // `grep -c "'/settings'"` in this file returned 0: the settings screens had no browser coverage
  // at all, and `Settings.test.jsx` stubs `signOut` green — so the SUCCESS PATH had never been
  // rendered. Meanwhile `signOut` called Cognito unconditionally while sign-IN guards on
  // `config.isMock` in two places, so every review of this screen saw "Signing out did not go
  // through."
  //
  // The second cost is the one that matters: a permanent failure message trains everyone to
  // ignore a real one. Same shape as the federated branch — a state covered by a stub and by
  // nothing that renders.
  console.log('signing out lands on the sign-in screen');
  {
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');

    const before = await page.evaluate(() => document.body.textContent);
    record(!/did not go through/i.test(before), 'the screen does not open on a failure message', 'failure shown at rest');

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('main button')].find(
        (el) => /sign out/i.test(el.textContent.trim()),
      );
      btn?.click();
    });
    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 10_000 }).catch(() => {});

    const after = await page.evaluate(() => ({
      path: window.location.pathname,
      failed: /did not go through/i.test(document.body.textContent),
    }));
    record(after.path === '/login', 'sign out reaches the sign-in screen', `landed on ${after.path}`);
    record(!after.failed, 'and reports no failure on the way', 'a failure message was shown');
  }

  // ---- The wdth axis actually engages, which is the claim the index letter rests on ----
  // The letter is `--imprint` filled inside a 2px ink stroke at 76px / wght 900 / wdth 62.5%, and
  // that treatment was WITHDRAWN FOR A ROUND on crops rendered in `system-ui`: the committed
  // Archivo held a space and the letter `A`, and `font-stretch` is SILENTLY IGNORED by a face with
  // no width axis. A condensed treatment was judged on glyphs that were never condensed.
  //
  // THIS IS THE ONLY LAYER THAT CATCHES THAT. `fonts.test.js` asserts the axis exists in the
  // binary and the site assertion below asserts the declaration reaches the node — and BOTH CAN
  // PASS while the render is unchanged, which is exactly what happened. A declaration and a
  // computed value both looked right for two months.
  //
  // Threshold set FROM the measurement, not from the document: the design system's stated range was 27-44% and the
  // measured range is 24-37%, so a guard written against the documented floor would have failed on
  // correct code — and on `#` specifically, the glyph whose rendering was most doubted. That is
  // the crying-wolf opening that gets a guard deleted rather than fixed. 15% is ~1.6x below the
  // observed minimum and infinitely above the defect, which produces exactly 0%.
  console.log('the wdth axis engages — the index letter is genuinely condensed');
  {
    await page.goto(`${BASE}/libraries/lib-fiction`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[role=separator]');

    // SITE: the declaration reaches the real node. A refactor dropping `[font-stretch:62.5%]`
    // from IndexLetter.jsx fails here.
    // The SPAN that carries the letter, not the separator wrapper around it. My first selector
    // was `'[role=separator] span, [role=separator]'`, and a comma-separated `querySelector`
    // returns the first match in DOCUMENT ORDER — which is the wrapper, whose font-stretch is
    // 100% and always was. It reported a defect against correct code, and a fallback branch in a
    // selector is how a guard ends up measuring whatever it happens to hit.
    const declared = await page.evaluate(() => {
      const letter = document.querySelector('[role=separator] span[aria-hidden="true"]');
      if (!letter) return null;
      const style = getComputedStyle(letter);
      return { stretch: style.fontStretch, weight: style.fontWeight, text: letter.textContent.trim() };
    });
    record(declared !== null, 'the index letter span is on screen to measure', 'no letter span found');
    record(
      declared?.stretch === '62.5%',
      'the index letter computes font-stretch: 62.5%',
      String(declared?.stretch),
    );
    record(declared?.weight === '900', 'and wght 900, the other axis the treatment names', String(declared?.weight));

    // RENDER: advance widths, measured in the loaded face. `Œ` is the fold's non-A-Z tail and `#`
    // is both the widest-counter worst case and the glyph the retired carve-out was invented for.
    const widths = await page.evaluate(async () => {
      await document.fonts.ready;
      const loaded = document.fonts.check('76px Archivo');
      const measure = (glyph, stretch) => {
        const el = document.createElement('span');
        el.textContent = glyph;
        el.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:Archivo;font-size:76px;font-weight:900;font-stretch:${stretch}`;
        document.body.append(el);
        const w = el.getBoundingClientRect().width;
        el.remove();
        return w;
      };
      return {
        loaded,
        glyphs: ['M', 'N', 'P', 'Œ', '#'].map((g) => {
          const wide = measure(g, '100%');
          const narrow = measure(g, '62.5%');
          return { g, wide, narrow, narrowed: wide > 0 ? (wide - narrow) / wide : 0 };
        }),
      };
    });

    // The face has to BE Archivo, or every number below is about a fallback — which is precisely
    // how the original crops lied.
    record(widths.loaded, 'Archivo is the face being measured, not a fallback', 'font not loaded');

    const notCondensed = widths.glyphs.filter((g) => g.narrowed < 0.15);
    for (const g of widths.glyphs) {
      console.log(
        `    ${g.g}  ${g.wide.toFixed(2)} -> ${g.narrow.toFixed(2)}  (${(g.narrowed * 100).toFixed(1)}% narrower)`,
      );
    }
    record(
      notCondensed.length === 0,
      'every tested glyph is at least 15% narrower at wdth 62.5% than at 100%',
      notCondensed.map((g) => `${g.g}: ${(g.narrowed * 100).toFixed(1)}%`).join(', '),
    );
  }

  // ---- Every caps role renders the tracking the design system publishes for it ----
  // `.caps` used to set `letter-spacing: 0.08em`, and because it sits later in `@layer utilities`
  // at equal specificity it BEAT every `tracking-[Nem]` class in the app. Measured:
  // `caps tracking-[0.16em]` computed 1.28px where the class alone computes 2.56px. So not one of
  // the five published values had ever reached a screen, across 26 call sites — the wordmark
  // declared 0.20em and rendered 0.96px.
  //
  // It survived because NOTHING COMPUTED `letter-spacing`. The type-scale guard reads declared
  // classes, the mono guards read font-family; a class can be present and beaten, and only the
  // computed value can tell. Same gap that hid the missing font cmap and the 9px plate.
  //
  // So this reads the COMPUTED value, one element per role in the caps table, and it belongs in
  // the browser suite for exactly that reason.
  console.log('every caps role computes the size, weight and tracking assigned to it');
  {
    // em -> px at the role's own font-size, since `letter-spacing` computes to px.
    // Selectors verified against the live DOM rather than guessed: the first draft named an
    // `h2` and a bare `button` that matched nothing, and a role that cannot be found is a role
    // that is not checked.
    //
    // `em: null` means the caps table assigns the role NO tracking, which is a real published
    // value and the one the old utility was silently overriding (see the account plate initials
    // entry below, whose own ruling on this changed).
    const CAPS_ROLES = [
      { role: 'wordmark', route: '/libraries', text: 'ALEXANDRIA', px: 12, em: 0.2, weight: 800 },
      // The wordmark is published at one size and weight — 12px, 800 — for every screen it
      // appears on. Two auth screens printed it at the section-header step (11px)
      // and nothing could see it: `typeScale.test.js` resolves sizes and 11 is ON the scale, so
      // the only guard that reads sizes is blind to this defect by construction. Hence the routes,
      // and hence `px` — the loop below already computes fontSize as the em divisor and threw it
      // away, so the number that catches this was being measured and discarded.
      { role: 'wordmark (login)', route: '/login', text: 'ALEXANDRIA', px: 12, em: 0.2, weight: 800 },
      { role: 'wordmark (signup)', route: '/signup', text: 'ALEXANDRIA', px: 12, em: 0.2, weight: 800 },
      { role: 'plate button label', route: '/libraries', text: 'NEW LIBRARY', px: 12, em: 0.12, weight: 800 },
      // TWO shared-ribbon roles, not one. The same component renders at 11/700 on a library row
      // and at 10/800 in a mark column, and this entry measured the first against the caps
      // table's published row for the second — green only because the two surfaces coincide at
      // +0.16em. A true measurement of the wrong substrate, inside the guard. Both surfaces are
      // now measured: the library row's own instance, and the item-detail DetailMarks instance —
      // lib-fiction carries sharedTo in the fixtures, so its SharedRibbon renders there at the
      // mark-column size.
      // Weight 700 here, not 800: this is the "library row sub-line" role the owner ruled into
      // the caps table at 11px/700, distinct from the mark-column instance below which keeps the
      // table's published 800.
      { role: 'shared ribbon caps (library row)', route: '/libraries', text: 'SHARED', px: 11, em: 0.16, weight: 700 },
      { role: 'shared ribbon caps (detail marks)', route: '/libraries/lib-fiction/items/item-lent', text: 'SHARED', px: 10, em: 0.16, weight: 800 },
      // 0.08em, the BASELINE — not "none". The caps table leaves this row's tracking cell empty,
      // and the two rulings read that blank differently: the first said the initials carry no
      // tracking, the second restored a baseline for every site that declares none. A site that
      // declares nothing is exactly what this is, so it takes the baseline.
      // Recorded rather than silently chosen: if the initials are meant to sit at zero, that has
      // to be DECLARED at the site (`tracking-normal`), because a blank cell cannot distinguish
      // "no tracking wanted" from "nothing specified" — and the second is what every other
      // undeclared caps label in the product means by it. Referred to the design session.
      { role: 'account plate initials', route: '/libraries', text: 'JR', px: 11, em: 0.08, weight: 800 },
      { role: 'field label', route: '/settings/account', text: 'CURRENT PASSWORD', px: 11, em: 0.12, weight: 700 },
      { role: 'ledger head', route: '/libraries/lib-fiction/items/item-lent', text: 'THE RECORD', px: 10, em: 0.16, weight: 800 },
      { role: 'detail marks label', route: '/libraries/lib-fiction/items/item-lent', text: 'IN', px: 10, em: 0.16, weight: 800 },
    ];

    const trackingViolations = [];
    for (const { role, route, text, px, em, weight } of CAPS_ROLES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main');
      const measured = await page.evaluate((wanted) => {
        const el = [...document.querySelectorAll('*')].find(
          (n) =>
            typeof n.className === 'string' &&
            n.className.split(' ').includes('caps') &&
            n.textContent.trim().toUpperCase().startsWith(wanted),
        );
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          // Evaluated IN THE PAGE, because NaN does not survive the CDP boundary — it arrives as
          // `null`, and a check comparing `Number.isNaN(null)` reports a violation against
          // correct code. Exactly the substrate class this suite exists for, one layer down.
          hasTracking: style.letterSpacing !== 'normal',
          letterSpacing: style.letterSpacing === 'normal' ? 0 : Number.parseFloat(style.letterSpacing),
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseInt(style.fontWeight, 10),
        };
      }, text);
      if (!measured) {
        trackingViolations.push(`${role}: no caps element starting "${text}" on ${route}`);
        continue;
      }
      // The size, asserted separately from the tracking, because a role can carry its published
      // tracking at the wrong size — which is exactly what two wordmarks did. Exact equality: these
      // are declared px values, not a float multiplication.
      if (measured.fontSize !== px) {
        trackingViolations.push(`${role}: ${measured.fontSize}px, expected ${px}px`);
      }
      // Probed rather than assumed: each caps role has a published weight and nothing has ever
      // computed one. If this is clean it stays; if it is not, the divergences are findings for
      // their own pass, and this assertion comes back out.
      if (measured.fontWeight !== weight) {
        trackingViolations.push(`${role}: weight ${measured.fontWeight}, expected ${weight}`);
      }
      if (em === null) {
        console.log(`    ${role.padEnd(24)} no tracking (want none)`);
        // `normal` parses to NaN. `Number.isNaN` is the test; `!x` would also fire on a genuine
        // 0px, which is a different (and also wrong) state.
        if (measured.hasTracking) {
          trackingViolations.push(`${role}: ${measured.letterSpacing}px, expected none`);
        }
        continue;
      }
      const expected = measured.fontSize * em;
      console.log(
        `    ${role.padEnd(24)} ${measured.letterSpacing.toFixed(2)}px at ${measured.fontSize}px (want ${expected.toFixed(2)}px, ${em}em)`,
      );
      // A tenth of a pixel of tolerance: the value is a float multiplication, and the defect this
      // catches is 0.08em against 0.20em — less than half, not a rounding step.
      if (Math.abs(measured.letterSpacing - expected) > 0.1) {
        trackingViolations.push(
          `${role}: ${measured.letterSpacing.toFixed(2)}px, expected ${expected.toFixed(2)}px (${em}em)`,
        );
      }
    }
    record(
      trackingViolations.length === 0,
      'each caps role computes its published tracking, not a utility default that beat it',
      trackingViolations.join('; '),
    );

    // THE OTHER DIRECTION, AND IT IS THE ONE THAT WOULD HAVE CAUGHT THE FIRST FIX. The roles above
    // are the six the design system names, so an unlisted role is an unchecked role — and when `.caps` lost its
    // `letter-spacing` entirely, 26 sites dropped to `normal` with nothing going red. Every one of
    // them uppercase at 11-12px, which is precisely what the baseline exists to prevent.
    //
    // So: any caps element that declares NO tracking class of its own must compute the 0.08em
    // baseline. Same both-directions shape as MONO_ROUTES — a manifest of named cases cannot see
    // the unnamed ones, and the unnamed ones are the majority here (26 of 51).
    const baselineViolations = [];
    for (const route of ['/libraries', '/libraries/lib-fiction', '/settings/account', '/settings/about']) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main');
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter(
            (n) =>
              typeof n.className === 'string' &&
              n.className.split(' ').includes('caps') &&
              !/tracking-/.test(n.className),
          )
          .map((n) => {
            const style = getComputedStyle(n);
            return {
              text: n.textContent.trim().slice(0, 20),
              // Strings, never numbers: `letter-spacing: normal` parses to NaN, and NaN does not
              // survive the CDP boundary — it arrives as `null` and a numeric check then reports a
              // violation against correct code. This suite's own substrate class, one layer down.
              letterSpacing: style.letterSpacing,
              fontSize: style.fontSize,
              expected: `${(Number.parseFloat(style.fontSize) * 0.08).toFixed(2)}px`,
            };
          })
          .filter((n) => n.letterSpacing !== n.expected),
      );
      for (const o of offenders) {
        baselineViolations.push(`${route} "${o.text}": ${o.letterSpacing}, expected ${o.expected}`);
      }
    }
    record(
      baselineViolations.length === 0,
      'every caps site declaring no tracking of its own still computes the 0.08em baseline',
      baselineViolations.slice(0, 4).join('; '),
    );
  }

  // ---- The copy Mark does not crowd a long address at the narrow floor ----
  // The design session flagged this as unmeasured: the email row is `break-all` at 17px, and a
  // 48px Mark beside it could squeeze a long address at 320px. Measured instead of assumed — the
  // address WRAPS and the row grows taller, so the Mark keeps its full target and nothing
  // overflows. Asserted here so a later change to the row's layout cannot quietly trade the
  // target away for a tidier line.
  console.log('the account email row holds a 48px copy Mark at 320px with a long address');
  {
    const previousViewport = page.viewport();
    await page.setViewport({ width: 320, height: 844 });
    await page.goto(`${BASE}/settings/account`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main button[aria-label^="Copy"]');
    const row = await page.evaluate(() => {
      // A long but realistic address, set on the rendered node so this measures the ROW rather
      // than the auth fixture.
      const email = [...document.querySelectorAll('main span')].find((n) => n.textContent.includes('@'));
      email.textContent = 'jean-raymond.sue@a-rather-long-domain-name.example.com';
      const mark = document.querySelector('main button[aria-label^="Copy"]');
      const m = mark.getBoundingClientRect();
      const e = email.getBoundingClientRect();
      return {
        mark: { w: Math.round(m.width), h: Math.round(m.height) },
        overlaps: e.right > m.left + 1,
        overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    record(
      row.mark.w >= 48 && row.mark.h >= 48,
      'the copy Mark keeps its 48px target beside a wrapped address',
      JSON.stringify(row.mark),
    );
    record(!row.overlaps, 'the address does not run under the Mark', 'they overlap');
    record(!row.overflows, 'the row does not push the page sideways at 320px', 'horizontal overflow');
    await page.setViewport(previousViewport);
  }

  // ---- The federated account state, which had never been rendered ----
  // Account hides the password form for a Google sign-in, because a Google account has no
  // password in this pool — an absence, not a disabled control, the same way a shared library
  // declares itself by having no Row Actions.
  //
  // It was covered by a unit test and by nothing that looks at a screen: mock mode signs in a
  // native reader, so every browser check and every screenshot saw only the password form. That
  // matters more here than it usually would, because this is the ONE decision in the slice
  // resting on a contract — Cognito's `google_<sub>` username — rather than on a measurement, so
  // the least-verified state was also the least looked at. `?as=google` selects a federated mock
  // reader; it costs nothing when absent.
  //
  // The detection is the PREFIX, never an `identities` claim: a native reader who later signed in
  // with Google gains that identity AND keeps their password, so gating on `identities` would hide
  // the form from someone who has one.
  console.log('a federated account offers no password form, and says why');
  {
    await page.goto(`${BASE}/settings/account?as=google`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');
    const federated = await page.evaluate(() => ({
      inputs: document.querySelectorAll('main input').length,
      text: document.querySelector('main').textContent,
    }));
    record(federated.inputs === 0, 'no password fields are rendered', `${federated.inputs} inputs`);
    // ABSENT is not enough on its own here. A shared row's missing actions are explained by the
    // FROM tag beside them; nothing on this screen would otherwise say why the form is gone.
    record(/managed by Google/i.test(federated.text), 'the absence is explained', 'no explanation found');

    // And the default reader must still get the form — an over-broad prefix test would remove it
    // for everyone, which is the failure this check exists to make visible.
    await page.goto(`${BASE}/settings/account`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');
    const native = await page.evaluate(() => document.querySelectorAll('main input').length);
    record(native >= 2, 'a native account still gets its password form', `${native} inputs`);
  }

  // ---- The other two controls a critique measured as failing, which measure as passing ----
  // Slice E's critique reported `Full record` at 90.8x15.4 and four `/libraries` rows at
  // 44.7-47.5px against the 48px minimum touch target. Those are the ELEMENT BOXES, and both controls carry a
  // `::before` expansion — so the box understates the target by design, exactly as the
  // `IN <library>` check below already establishes for its own case.
  //
  // Measured as a hit area, both clear the floor comfortably. Guarded rather than "fixed":
  // changing geometry that already passes would have been a change made to satisfy a number
  // nobody re-measured. What was genuinely missing is this check — the `IN <library>` link had
  // one from an earlier round and these two did not, which is why only they could be reported
  // as failing without anything going red.
  //
  // WALKED FROM THE CENTRE with `elementFromPoint`, never read off a class. A class can be
  // present while its expansion resolves to nothing — `before:inset-x-0` gives no horizontal
  // expansion at all, which is the precise bug the `IN <library>` fix exists for — so the only
  // honest measurement is asking the document what is actually at each point.
  console.log('the controls a box measurement called too small clear the floor as hit areas');
  {
    const hitArea = (selector, text) =>
      page.evaluate(
        ([sel, wanted]) => {
          const el = [...document.querySelectorAll(sel)].find((n) =>
            new RegExp(wanted, 'i').test(n.textContent.trim()),
          );
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const owns = (x, y) => {
            const t = document.elementFromPoint(x, y);
            return t === el || el.contains(t);
          };
          let up = 0;
          while (up < 60 && owns(cx, cy - up - 1)) up += 1;
          let down = 0;
          while (down < 60 && owns(cx, cy + down + 1)) down += 1;
          let left = 0;
          while (left < 80 && owns(cx - left - 1, cy)) left += 1;
          let right = 0;
          while (right < 80 && owns(cx + right + 1, cy)) right += 1;
          return { box: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`, w: left + right, h: up + down };
        },
        [selector, text],
      );

    await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');
    const fullRecord = await hitArea('main a', 'full record');
    console.log(`    Full record: box ${fullRecord?.box}, hit ${fullRecord?.w}x${fullRecord?.h}`);
    record(
      fullRecord !== null && fullRecord.w >= 48 && fullRecord.h >= 48,
      'Full record clears the 48px floor as a hit area, though its box is 15px tall',
      JSON.stringify(fullRecord),
    );

    await page.goto(`${BASE}/libraries`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main a');
    // The SHORTEST row, which is the one that fails first — a library with no sharing mark and a
    // short name has the least text to stand on.
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('main a')].map((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const owns = (x, y) => {
          const t = document.elementFromPoint(x, y);
          return t === el || el.contains(t);
        };
        let up = 0;
        while (up < 60 && owns(cx, cy - up - 1)) up += 1;
        let down = 0;
        while (down < 60 && owns(cx, cy + down + 1)) down += 1;
        return { box: r.height.toFixed(1), h: up + down, text: el.textContent.trim().slice(0, 18) };
      }),
    );
    const shortest = rows.reduce((a, b) => (a.h <= b.h ? a : b), rows[0]);
    console.log(`    shortest library row: box ${shortest?.box}px tall, hit ${shortest?.h}px ("${shortest?.text}")`);
    record(rows.length >= 3, 'the libraries root renders several rows to measure', `${rows.length} rows`);
    record(
      shortest !== undefined && shortest.h >= 48,
      'every library row clears the 48px floor as a hit area, on the screen a cold open lands on',
      JSON.stringify(shortest),
    );
  }

  // ---- The IN <library> link clears the 48px floor in BOTH dimensions ----
  // DetailMarks' own `::before` hit-box comment reasoned at length about the VERTICAL axis
  // (-top-[30px]/-bottom-[8px]) and never mentioned the horizontal one, because `before:inset-x-0`
  // just matches the pseudo to the Link's own box — the library name's rendered text width. A
  // stylesheet test cannot see this: jsdom reports zero for every dimension (p2 batch 2's own
  // global constraint), so this floor can only be pinned by asking a real browser for the
  // COMPUTED `::before` box, which is the actual tappable region (there is no way to
  // `getBoundingClientRect()` a pseudo-element directly).
  //
  // Measured against "Films" — lib-films/item-chinatown — deliberately not "Fiction" or "Bandes
  // dessinées", which are long enough to clear 48px on text width ALONE and would prove nothing
  // about the fix. "Films" is the shortest library name any fixture item actually belongs to, so
  // it is the narrowest REALISTIC case, not a synthetic one.
  console.log('the IN <library> link clears the 48px floor in both dimensions, on the narrowest realistic name');
  await page.goto(`${BASE}/libraries/lib-films/items/item-chinatown`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-mark="in"] a', { timeout: 10_000 });
  const inHitBox = await page.evaluate(() => {
    const el = document.querySelector('[data-mark="in"] a');
    const before = getComputedStyle(el, '::before');
    return {
      text: el.textContent.trim(),
      linkWidth: el.getBoundingClientRect().width,
      hitWidth: parseFloat(before.width),
      hitHeight: parseFloat(before.height),
    };
  });
  record(
    inHitBox.text === 'Films' && inHitBox.linkWidth < 48,
    'sanity: "Films" itself is narrower than 48px, so this is a real test of the expansion',
    `link text width: ${inHitBox.linkWidth}px`,
  );
  record(
    inHitBox.hitWidth >= 48,
    'IN <library> hit-box is at least 48px WIDE, even when the name is not',
    `hit-box width: ${inHitBox.hitWidth}px (text alone: ${inHitBox.linkWidth}px)`,
  );
  record(
    inHitBox.hitHeight >= 48,
    'IN <library> hit-box is at least 48px TALL',
    `hit-box height: ${inHitBox.hitHeight}px`,
  );
  // Hands the page back to item-lent (lib-fiction), which every check below this point assumes.
  await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[aria-label^="On loan to Marie"]', { timeout: 10_000 });

  // ---- The IN <library> link survives wrapping, at 320px — the width this suite tests against ----
  // Round 6 review: the centring fix above (`left-1/2` + `w-[max(50px,100%)]`) resolves `100%`
  // against the containing block the Link's own box establishes — well-defined for a SINGLE
  // fragment, and NOT well-defined for a plain inline element that wraps across two lines (each
  // line is its own fragment, and which fragment the percentage resolves against is not
  // something this code should be leaning on). `inline-block` on the Link fixes this: it is
  // always exactly one generated box, so the containing-block computation stays the single
  // well-defined case even when its own content wraps inside that one box.
  //
  // No fixture library has a name long enough to force an ACTUAL wrap, though the review's own
  // arithmetic said the risk was real: at 320px, px-4 leaves 288px, the hero spends 132px + a
  // 16px gap, `flex-1` gets 140px, `pl-2` leaves 132px for this whole line. "Bandes dessinées"
  // (16 chars, the longest real fixture name) was measured here first and lands at 130.03px —
  // it fits, by less than 2px, with zero pixels to spare — so it is genuinely the worst REAL
  // case and still does not wrap. A check built on it could never fail, with or without the fix,
  // which is not a check at all. So this uses a second, synthetic name for the one thing a real
  // fixture cannot exercise: "Bandes dessinées BD" (19 chars, under the API's 20-char cap, an
  // unrealistic but not-impossible library name) DOES wrap onto two lines at 320px. Reverting
  // this check's own fix and running it against that name was how the fix was verified in the
  // first place — see the two `record()`s below and the fixture-name one above them, which is
  // the real-content half of this coverage and is not itself expected to ever go red.
  console.log('the IN <library> link survives wrapping at the 320px floor, with the longest real name AND a synthetic worst case');
  {
    const wrapPage = await browser.newPage();
    try {
      await wrapPage.setViewport({ width: 320, height: 844 });
      let injectedName = 'Bandes dessinées';
      await wrapPage.setRequestInterception(true);
      wrapPage.on('request', async (request) => {
        if (!request.url().endsWith('/api/v1/libraries')) {
          request.continue();
          return;
        }
        // Fetches the REAL fixture response and renames just one library, rather than
        // hand-writing a whole libraries array here — everything else about the fixture
        // (item counts, sharing, the other three libraries) stays exactly what the mock
        // server would have returned, so only the one fact under test changes.
        const real = await fetch(`${BASE}/api/v1/libraries`).then((response) => response.json());
        const libraries = real.libraries.map((lib) =>
          lib.id === 'lib-fiction' ? { ...lib, name: injectedName } : lib,
        );
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ libraries }),
        });
      });

      const measure = async () => {
        await wrapPage.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, {
          waitUntil: 'networkidle0',
        });
        await wrapPage.waitForSelector('[data-mark="in"] a', { timeout: 10_000 });
        return wrapPage.evaluate(() => {
          const el = document.querySelector('[data-mark="in"] a');
          const before = getComputedStyle(el, '::before');
          return {
            text: el.textContent.trim(),
            // The Link's OWN rendered height. This is the wrap signal that works regardless of
            // `display` — a genuine two-line wrap roughly doubles it, whether the two lines are
            // one `inline-block` box (the fix) or two separate fragments (broken). It cannot be
            // used to tell fixed from broken; `fragmentCount` below does that.
            linkHeight: el.getBoundingClientRect().height,
            // The number of CSS boxes the Link generates: with `inline-block`, always 1, whether
            // or not its own content wraps (that is exactly what the fix buys — see the
            // sanity-with-a-caveat note below). A PLAIN inline element that wraps generates one
            // fragment per line, so on broken code this goes to 2 for the same wrapped input.
            // This is the direct signal for the property under test, not a pixel measurement
            // that could pass by coincidence.
            fragmentCount: el.getClientRects().length,
            hitWidth: parseFloat(before.width),
            hitHeight: parseFloat(before.height),
          };
        });
      };

      const realName = await measure();
      record(
        realName.text === 'Bandes dessinées' &&
          realName.fragmentCount === 1 &&
          realName.hitWidth >= 48 &&
          realName.hitHeight >= 48,
        'the longest REAL fixture library name clears the 48px floor at 320px (single fragment)',
        `fragments: ${realName.fragmentCount}, hit-box: ${realName.hitWidth}x${realName.hitHeight}px`,
      );

      injectedName = 'Bandes dessinées BD';
      const wrapped = await measure();
      // `linkHeight`, not `fragmentCount`, proves the wrap: `inline-block` (already applied
      // above) makes fragmentCount 1 EVEN WHEN the content genuinely wraps, which is the fix
      // working, not the input failing to wrap. A near-doubled height is the only signal here
      // that is true regardless of which of the two constructions rendered it.
      record(
        wrapped.text === 'Bandes dessinées BD' && wrapped.linkHeight > realName.linkHeight * 1.5,
        'sanity: the synthetic worst-case name genuinely wraps to two lines at 320px',
        `height: ${wrapped.linkHeight}px vs single-line ${realName.linkHeight}px`,
      );
      record(
        wrapped.fragmentCount === 1 && wrapped.hitWidth >= 48 && wrapped.hitHeight >= 48,
        'IN <library> stays ONE fragment even wrapped, and its hit-box still clears 48px both ways',
        `fragments: ${wrapped.fragmentCount}, hit-box: ${wrapped.hitWidth}x${wrapped.hitHeight}px`,
      );
    } finally {
      await wrapPage.close();
    }
  }

  // ---- `caps` elements on the cover keep an explicit weight through the cascade ----
  // `.caps` sets ONLY text-transform and letter-spacing, by deliberate design:
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

  // "Full record" used to be gated on "genuinely more history than the inline preview shows",
  // and item-lent's own fixture (src/test/fixtures/events.js) pairs to exactly LEDGER_PREVIEW
  // loans with no nextToken — so this check used to need a SEPARATE intercepted page just to
  // make the link appear at all. p2 batch 2 finding 2 removed that gate entirely: "Full record"
  // is the only route to /history, so it renders whenever the item has any lending history,
  // which item-lent already does. `page` is still on item-lent's real, unintercepted fixture
  // from the block above (line ~643), so this now checks the link right there — no second page,
  // no request interception, and it is exercising the actual boundary case (3 loans, no
  // nextToken) the finding was about, not a synthetic 4-loan one.
  console.log('"Full record" keeps its weight, not just its case, on the boundary case it must not skip');
  {
    await page.waitForSelector('a[href$="/history"]', { timeout: 10_000 });
    const weight = await page.evaluate(() => {
      const link = [...document.querySelectorAll('a')].find(
        (el) => el.textContent.trim() === 'Full record',
      );
      return link ? parseInt(getComputedStyle(link).fontWeight, 10) : null;
    });
    record(
      weight !== null && weight > 400,
      '"Full record" link resolves above ambient weight',
      `font-weight: ${weight}`,
    );
  }

  // ---- The item-detail action row reflows on the narrowest phones, never overflows ----
  // Delete moved onto the same line as Mark returned/Lend and Edit ("all three on
  // one line" — a lone Delete below the ledger used to read as though it deleted the RECORD,
  // not the item). The three labels total ~319px, which fits a 390px viewport with margins and
  // does not fit a 320px one, so the row relies on `flex-wrap` rather than a second layout.
  // Measured by hand: at 390px the row spans ~329px inside 358px of available width (29px
  // slack) and stays on one line; at 320px (288px available) Delete drops to its own line. Both
  // are asserted here in a REAL browser — jsdom does no layout at all, so a green unit test
  // would be evidence about jsdom, not about whether this row actually wraps.
  //
  // This block used to carry a SECOND 320px record, "the row does not overflow the viewport",
  // which cannot fail in the direction its name promises. Reverting `flex-wrap` to `flex` on
  // the div below and re-running proved it: only the "Delete wraps to its own line" record
  // failed; the overflow record stayed green throughout, because a flex row's items default to
  // `min-width: auto` and do not shrink below their own content width — removing `flex-wrap`
  // does not make them compress, it would only make the ROW overflow once the buttons'
  // combined content width exceeds the available space. For this fixture (Mark
  // returned/Edit/Delete) the combined width already fits inside 288px, wrapped or not, so the
  // overflow record was true regardless of the very regression it sat beside.
  //
  // A replacement was tried next — every button >=48px in its smaller dimension, label not
  // clipped — and measured the same way: reverting `flex-wrap` left every button at height 52px
  // (min-h-12's 48px floor is a min-height, set by the component and independent of the
  // surrounding flex layout — PlateButton.test.jsx already asserts the class) with
  // `scrollWidth === clientWidth` on all three labels, i.e. it ALSO stayed green under the
  // regression. Per the task brief: when a floor check turns out to hold either way, the honest
  // outcome is to delete the record rather than keep a second one that cannot fail either. Only
  // the wrap record — proven above to actually catch the regression — remains.
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
  }

  // ---- Ledger Row: the borrower's name resolves in the sans, and item detail's inline ledger
  // (flush) stays aligned with the title above it ----
  // LedgerRow.test.jsx already asserts the CLASSES (no `.num` on the name, `.num` on the dates
  // and the day count, no `px-4` when unboxed) — but jsdom does no layout, so it cannot tell
  // whether `.num` actually resolves to the mono typeface in the cascade, nor whether an unboxed
  // row's left edge actually lines up with the title's, which is the whole point of "flush".
  console.log("ledger row: the borrower reads in the sans, and item detail's ledger stays flush");
  {
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent`, { waitUntil: 'networkidle0' });
    // item-lent's most recent event is a LENT to Marie with no matching RETURNED (the fixtures'
    // comment), so the first (most recent) ledger row is that open loan.
    await page.waitForSelector('[aria-label^="On loan to Marie"]', { timeout: 10_000 });

    const facts = await page.evaluate(() => {
      const h1 = document.querySelector('main h1');
      const heading = [...document.querySelectorAll('main h2')].find((el) =>
        /the record/i.test(el.textContent),
      );
      const ledger = heading?.nextElementSibling;
      const firstRow = ledger?.firstElementChild;
      const rowSpans = firstRow ? [...firstRow.querySelectorAll('span')] : [];
      const nameEl = rowSpans.find((el) => el.textContent.trim() === 'Marie');
      // The duration slot is now MIXED too — "6 days" is a figure (mono) plus a unit word
      // (sans), not one numeral, so its own font isn't checked as one span either: the wrapper
      // (native `textContent` is recursive, unlike a single leaf span) proves the full text,
      // and its `.num` child proves only the figure is mono.
      const durationEl = rowSpans.find((el) => /^\d+ days$/.test(el.textContent.trim()));
      const durationFigureEl = durationEl?.querySelector('.num');
      // Line 2 (the date range) is the row's second direct child. It is now MIXED — `LENT` is
      // an interface label in the sans, only the date value itself is mono — so its own font
      // isn't checked as one span; the label and the date value are checked separately.
      const dateLine = firstRow?.children[1];
      const dateLabelEl = dateLine?.querySelector('.caps');
      const dateValueEl = dateLine?.querySelector('.num');
      return {
        found: Boolean(
          h1 && firstRow && nameEl && durationEl && durationFigureEl && dateLine && dateLabelEl && dateValueEl,
        ),
        lineCount: firstRow?.children.length,
        dateLineText: dateLine?.textContent,
        h1Left: h1?.getBoundingClientRect().left,
        rowLeft: firstRow?.getBoundingClientRect().left,
        rowPaddingLeft: firstRow ? getComputedStyle(firstRow).paddingLeft : null,
        nameFont: nameEl ? getComputedStyle(nameEl).fontFamily : null,
        durationWrapperFont: durationEl ? getComputedStyle(durationEl).fontFamily : null,
        durationFigureFont: durationFigureEl ? getComputedStyle(durationFigureEl).fontFamily : null,
        dateLabelFont: dateLabelEl ? getComputedStyle(dateLabelEl).fontFamily : null,
        dateValueFont: dateValueEl ? getComputedStyle(dateValueEl).fontFamily : null,
      };
    });

    record(facts.found, 'the open loan\'s row, its borrower and its duration are all on screen', JSON.stringify(facts));
    record(
      facts.lineCount === 2,
      'the row lays out as two lines (borrower+duration, then the date range)',
      `${facts.lineCount} line(s)`,
    );
    record(
      Boolean(facts.nameFont) && !facts.nameFont.includes('Chivo Mono'),
      "the borrower's name resolves in the sans, not the mono",
      facts.nameFont,
    );
    record(
      Boolean(facts.durationWrapperFont) && !facts.durationWrapperFont.includes('Chivo Mono'),
      'the duration WRAPPER (figure + "days") does not resolve wholesale to the mono',
      facts.durationWrapperFont,
    );
    record(
      Boolean(facts.durationFigureFont?.includes('Chivo Mono')),
      "the duration's FIGURE resolves in the mono — only the number, not the unit word",
      facts.durationFigureFont,
    );
    record(
      Boolean(facts.dateLabelFont) && !facts.dateLabelFont.includes('Chivo Mono'),
      'the LENT/RETURNED labels resolve in the sans, not the mono',
      facts.dateLabelFont,
    );
    record(
      Boolean(facts.dateValueFont?.includes('Chivo Mono')),
      'the date value itself resolves in the mono',
      facts.dateValueFont,
    );
    record(
      facts.dateLineText === 'Lent 07 Aug 2026',
      'an open loan states LENT <date> alone — no "still out", no connector, no second half',
      facts.dateLineText,
    );
    record(
      facts.rowPaddingLeft === '0px',
      "item detail's inline ledger carries no padding of its own (it is a flush text column)",
      facts.rowPaddingLeft,
    );
    record(
      Math.round(facts.rowLeft) === Math.round(facts.h1Left),
      'the flush ledger row aligns with the title above it',
      `row left ${facts.rowLeft}px, h1 left ${facts.h1Left}px`,
    );
  }

  // ---- Ledger Row: an unresolved loan shares the open loan's line-2 grammar ----
  // Round 2 of the ruling: a `RETURNED —` on an unresolved loan restated, in a weaker form,
  // exactly what the duration slot already states plainly ("no return recorded") — the same
  // "labelled twice" defect the ruling's own stamp/still-out reasoning was written to avoid.
  // item-lent's third loan (Léa) is unresolved (src/test/fixtures/events.js); this asserts its
  // line 2 reads identically in SHAPE to the open loan above (`LENT <date>` alone) and that the
  // real distinction lives in the duration slot instead, entirely in the sans (no numeral).
  console.log('ledger row: an unresolved loan reads LENT <date> alone, distinguished on line 1');
  {
    const facts = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('main h2')].find((el) =>
        /the record/i.test(el.textContent),
      );
      const ledger = heading?.nextElementSibling;
      // Marie (open) is row 0, Paul (closed) is row 1, Léa (unresolved) is row 2 — the pairing
      // order asserted already by loans.test.js and visible in the fixture's own comment.
      const leaRow = ledger?.children[2];
      const nameEl = leaRow ? [...leaRow.querySelectorAll('span')].find((el) => el.textContent.trim() === 'Léa') : null;
      // leaRow.children[0] is the whole flex LINE 1 (name + duration side by side); the
      // duration itself is that line's SECOND child.
      const durationLine = leaRow?.children[0]?.children[1];
      const dateLine = leaRow?.children[1];
      return {
        found: Boolean(leaRow && nameEl && durationLine && dateLine),
        durationText: durationLine?.textContent,
        durationHasMono: Boolean(durationLine?.querySelector('.num')),
        dateLineText: dateLine?.textContent,
      };
    });

    record(facts.found, "Léa's unresolved row is on screen", JSON.stringify(facts));
    record(
      facts.durationText === 'no return recorded',
      'the duration slot states "no return recorded" in words',
      facts.durationText,
    );
    record(
      facts.durationHasMono === false,
      '"no return recorded" has no numeral in it, so none of it sits in the mono',
      facts.durationHasMono,
    );
    record(
      facts.dateLineText === 'Lent 11 Mar 2026',
      'line 2 reads LENT <date> alone — the SAME shape as the open loan above, no RETURNED, no em dash',
      facts.dateLineText,
    );
  }

  // ---- Ledger Row: item history's boxed rows do not sit flush against the card's own rule ----
  // Defect 2 was exactly this, invisible in source: `border-[3px] border-ink` on the card plus
  // `py-2` with no horizontal padding on the row, so the text touched the border. The fix put
  // `px-4` on the ROW (not the card) so the row's own `border-b` hairline still reaches the
  // card's edge — padding the card instead would leave that hairline stopping short of the rule.
  console.log("ledger row: item history insets its rows so they never touch the card's border");
  {
    await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent/history`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');

    const facts = await page.evaluate(() => {
      const card = [...document.querySelectorAll('main div')].find((el) =>
        el.className.includes('border-[3px]'),
      );
      const row = card?.firstElementChild;
      const rowSpans = row ? [...row.querySelectorAll('span')] : [];
      const nameEl = rowSpans.find((el) => el.textContent.trim() === 'Marie');
      const cardBox = card?.getBoundingClientRect();
      const rowBox = row?.getBoundingClientRect();
      const nameBox = nameEl?.getBoundingClientRect();
      // The card's OWN border sits between cardBox.left and its content: `clientLeft` is the
      // resolved width of that left border in px, so cardBox.left + card.clientLeft is the
      // border's INNER edge — the line the row and its own border-b must reach exactly for the
      // hairline not to stop short of the card rule.
      const cardInnerLeft = card ? cardBox.left + card.clientLeft : null;
      return {
        found: Boolean(card && row && nameEl),
        rowPaddingLeft: row ? getComputedStyle(row).paddingLeft : null,
        cardPaddingLeft: card ? getComputedStyle(card).paddingLeft : null,
        cardInnerLeft,
        rowLeft: rowBox?.left,
        nameLeft: nameBox?.left,
      };
    });

    record(facts.found, 'the boxed card and its first row are both on screen', JSON.stringify(facts));
    record(
      facts.rowPaddingLeft === '16px',
      'a boxed row insets by one division (px-4, 16px)',
      facts.rowPaddingLeft,
    );
    record(
      facts.cardPaddingLeft === '0px',
      'the padding lives on the ROW, not the card — the card itself carries none',
      facts.cardPaddingLeft,
    );
    record(
      Math.round(facts.rowLeft) === Math.round(facts.cardInnerLeft),
      "the row's own box still reaches the card's border exactly — its border-b does not stop short",
      `row left ${facts.rowLeft}px, card's border inner edge ${facts.cardInnerLeft}px`,
    );
    record(
      facts.nameLeft - facts.cardInnerLeft >= 15,
      "the borrower's name sits inset from the card rule, not flush against it",
      `name left ${facts.nameLeft}px, card border inner edge ${facts.cardInnerLeft}px`,
    );
  }

  // ---- Ledger Row: the last row does not double the card's own bottom rule (MINOR 5) ----
  // Every row carries its own 1px `border-b`, and the card wrapping them carries a 3px
  // `border-[3px]`. Stacked, the last row's hairline sat directly on the card's own bottom
  // edge — a 1px + 3px composite the rule-weight scale (1/2/3/4px, and
  // nothing else) does not contain. jsdom can see the `border-b-0` utility string on a
  // className, but only a real cascade can confirm the browser actually resolves it to 0 at
  // that specific element while every row before it keeps its own hairline.
  console.log("ledger row: the last row does not double the card's own bottom rule");
  {
    // item-lent's fixture events (src/test/fixtures/events.js) pair into three loans — Marie
    // (open), Paul (closed), Léa (unresolved, no matching RETURNED) — so this card has a real
    // "last child" distinct from its first, unlike the single-loan case above.
    await page.goto(`${BASE}/libraries/lib-fiction/items/item-lent/history`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');

    const facts = await page.evaluate(() => {
      const card = [...document.querySelectorAll('main div')].find((el) =>
        el.className.includes('border-[3px]'),
      );
      const rows = card ? [...card.children] : [];
      return {
        rowCount: rows.length,
        // Every row's OWN resolved border-bottom-width, so a fix that stripped the border from
        // every row (not just the last) would be caught here too, not only the passing case.
        borderBottoms: rows.map((row) => getComputedStyle(row).borderBottomWidth),
      };
    });

    record(facts.rowCount >= 2, 'the card renders more than one ledger row', JSON.stringify(facts));
    const last = facts.borderBottoms.at(-1);
    const rest = facts.borderBottoms.slice(0, -1);
    record(
      last === '0px',
      "the LAST row's own border-bottom resolves to 0 — the card's 3px rule is the only edge left",
      `border-bottoms: ${JSON.stringify(facts.borderBottoms)}`,
    );
    record(
      rest.length > 0 && rest.every((w) => w === '1px'),
      'every OTHER row keeps its 1px hairline — only the last one is suppressed',
      `border-bottoms: ${JSON.stringify(facts.borderBottoms)}`,
    );
  }

  // ---- Round 5, item 1: the empty hero frame is unfilled — the rule alone describes it ----
  // An empty Volume Frame is a designed state, never a placeholder. The hero size
  // used to fill with `--cover-rule` at full strength — 1.73:1 against `--ink` — a mid-grey slab
  // that read as a failed image. At the time this was written `picture` was absent for most
  // fixture items, which made that slab look like the DEFAULT appearance of the peak screen —
  // PRODUCT.md has since corrected the record: artwork present is the normal case, and this is
  // the rare exception, not the common one. The unfilled rule stays correct for both readings:
  // a real cover still renders inside it (below), and the rare coverless item still needs a
  // designed empty state rather than a placeholder. An intermediate fix tried tuning the SAME
  // token down with opacity (~1.09:1, matching
  // the row frame's own quiet `bg-paper-deep`), but the ruling was "unfill both", not "tint
  // both": a fill — at any opacity — is still a fill where the direction calls for a rule and
  // nothing else. So this now asserts the frame's interior matches the page ground EXACTLY
  // (ratio ~1.000), which is what "no fill" means in pixels: nothing painted over `--ink` inside
  // the border, full stop.
  //
  // `getComputedStyle` cannot be used to prove a NEGATIVE ("this has no background") the way it
  // can assert a positive value — an element with no background rule still resolves to
  // `rgba(0, 0, 0, 0)` via the cascade, which is correct but tells this check nothing about what
  // a viewer actually SEES through it (the page ground behind it). This reads the ACTUAL
  // rendered pixels via `sharp` (already a dependency, already used the same way by
  // check-index-letter.mjs) on a small screenshot clipped well inside the frame's own border —
  // guaranteed correct because it is the literal sRGB the display would show, with no colour-
  // space translation left for this script to get wrong.
  console.log('the empty hero frame is unfilled — its interior matches the page ground exactly');
  {
    // item-1984 (src/test/fixtures/items.js) has no `picture` at all and no lending events — the
    // hero frame renders genuinely empty. This is now the RARE case (PRODUCT.md), pinned here
    // deliberately because this specific check needs a genuinely coverless item to sample, not
    // a 404ing one (item-broken) — a failed load and no `picture` at all render identically
    // empty, but they are different facts, and this check is about the empty-frame FILL, which
    // either state exercises equally. item-1984 stays the one fixture item with no cover field.
    await page.goto(`${BASE}/libraries/lib-fiction/items/item-1984`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main h1');

    // The frame has no fill class to select by now, so it is found structurally: inside the
    // hero row (`.mb-6.flex`), VolumeFrame is always the first child — DetailMarks is the
    // second and only ever renders text/marks, never an element this size.
    const frameHandle = await page.$('main div.mb-6 > div:first-child');
    const box = await frameHandle.boundingBox();
    // Inset well clear of the 2px `border-paper` rule and its antialiased edge, so only the
    // fill itself is sampled.
    const inset = 16;
    const clip = {
      x: box.x + inset,
      y: box.y + inset,
      width: Math.max(1, box.width - inset * 2),
      height: Math.max(1, box.height - inset * 2),
    };
    const frameShot = await page.screenshot({ clip });
    const framePixels = await sharp(frameShot).raw().toBuffer({ resolveWithObject: true });
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    const channels = framePixels.info.channels;
    const pixelCount = framePixels.data.length / channels;
    for (let i = 0; i < framePixels.data.length; i += channels) {
      rSum += framePixels.data[i];
      gSum += framePixels.data[i + 1];
      bSum += framePixels.data[i + 2];
    }
    const frameAvg = { r: rSum / pixelCount, g: gSum / pixelCount, b: bSum / pixelCount };

    // The page ground is a solid, fully-opaque colour, so it needs none of the above — a plain
    // computed style already resolves correctly for it (proven by the earlier "cover surface"
    // checks in this same script, which pass on comparing this exact background as text).
    const groundRgb = await page.evaluate(
      () => getComputedStyle(document.querySelector('.bg-ink')).backgroundColor,
    );
    const groundMatch = groundRgb.match(/rgba?\(([^)]+)\)/);
    const [gr, gg, gb] = groundMatch[1].split(',').map((v) => parseFloat(v));

    const toHex = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
    const frameHex = `#${toHex(frameAvg.r)}${toHex(frameAvg.g)}${toHex(frameAvg.b)}`;
    const groundHex = `#${toHex(gr)}${toHex(gg)}${toHex(gb)}`;
    const ratio = contrastRatio(frameHex, groundHex);

    console.log(
      `    sampled frame fill: ${frameHex} (${JSON.stringify(frameAvg)}), page ground: ${groundHex}, measured contrast: ${ratio.toFixed(3)}:1`,
    );

    // 1.000 is the ONLY value "unfilled" can mean: the frame's interior painting nothing over
    // the page ground it sits on. 1.02 leaves headroom for PNG/JPEG rounding in the screenshot
    // pipeline without accepting the old 1.73:1 slab or even the intermediate ~1.09:1 tint —
    // both fail this ceiling by a wide margin, so this catches either regression.
    record(
      ratio <= 1.02,
      'the empty hero frame matches the page ground exactly — no fill, just the rule',
      `measured contrast: ${ratio.toFixed(3)}:1`,
    );
  }
  // ---- Mono is for numerals only: everything that resolves to Chivo Mono is digit-dominant ----
  // The mono is for numerals only... a person's name set in the mono is a
  // category error." src/monoText.test.js guards this STATICALLY, by scanning source for a
  // literal word written directly under a `.num`-classed element — but it discloses two blind
  // spots it cannot close by construction: a word arriving as a runtime value through a prop
  // (UnshareLibrary.jsx's email, f6) rather than a JSX literal, and a literal passed as a CHILD
  // into a wrapper that applies `.num` to its own element (Field.jsx's counter, VolumePlate.jsx).
  // Both gaps have the same shape: the source doesn't show the word beside the class, only the
  // RENDERED page does. So this check reads the rendered page instead of the source.
  //
  // The rule that makes this checkable without drowning in false positives is not "no letters" —
  // `07 Aug 2026` is a legitimate mono string that contains a word (it is a tabular date, one of
  // the four things this system licenses: catalogue numerals, ISBN, runtime, dates). The rule is DIGIT
  // PROPORTION: every legitimate mono string this app renders is digit-dominant, and every
  // violation found so far (an email, a director's name) has no digits in it at all. So: walk
  // every element whose OWN direct text (its immediate Text-node children only, not a
  // descendant's — the same reason `collectLiterals` stops at a `font-sans` override or a
  // component boundary, but computed from the live DOM instead of the AST) is non-empty and
  // whose resolved `font-family` includes Chivo Mono; require that text, once its whitespace is
  // stripped, to be at least 50% digits — or, if it is punctuation only. The latter carve-out
  // exists for a future ledger placeholder mark and is not exercised by anything on screen today
  // (recorded here so nobody "optimises" it away as dead code without reading this).
  //
  // "Own direct text" — not `.textContent`, which is recursive — is what makes the wrapper gap
  // closeable at runtime where the static scan cannot close it: `Field`'s counter renders
  // `<span class="num">{n} <span class="font-sans">left</span></span>`, and only the OUTER
  // span's own text node (the figure) is checked against ITS OWN resolved font (mono, correct);
  // the inner "left" span is checked separately against ITS OWN resolved font (sans, because
  // `font-sans` overrides — so it is invisible to `family.includes('Chivo Mono')` and never
  // becomes a candidate in the first place, no special-casing required).
  //
  // Routes were chosen to cover every `.num` call site found by `grep -rl '\bnum\b' src`:
  // Libraries (library counts), LibraryBrowse (VolumePlate order/counts, PlateLine year,
  // IndexLetter counts), two ItemDetail routes — a book (ISBN) and a collection-member film
  // (releaseYear + duration identifiers) — ItemHistory (ledger dates/durations, boxed),
  // UnshareLibrary (the fixed email), and one of each form (NewBook's counters, EditLibrary's).
  //
  // MEASURED MARGIN (the point of stating one, per the index-letter guard's own convention of
  // recording a counter's margin rather than letting a reader trust the number blind): across
  // every one of these real screens, the worst LEGITIMATE ratio found was 0.667 (`07 Aug 2026`,
  // stripped to `07Aug2026`, 6/9 digits) and the runtime-typical figure/date/runtime strings
  // otherwise sit at 0.75–1.0. The worst VIOLATION on record (the email, reintroduced below to
  // prove this) is 0.0 — zero digits. That is not a threshold balanced on a knife edge; 0.5 sits
  // in a gap between two clearly separated distributions, nowhere near either one.
  console.log('mono text is digit-dominant everywhere it renders');
  {
    const MONO_ROUTES = [
      '/login',
      '/libraries',
      '/libraries/lib-fiction',
      '/libraries/lib-fiction/items/item-1984',
      '/libraries/lib-fiction/items/item-lent',
      '/libraries/lib-fiction/items/item-samourai',
      '/libraries/lib-fiction/items/item-lent/history',
      // `/libraries/lib-fiction/unshare` was here and is NOT any more. It carried `.num` until an
      // earlier round correctly removed it — a recipient's name is not a numeral — and the
      // manifest entry stayed behind, contributing nothing and looking exactly like an entry that
      // was doing work. Found on the first run of monoRouteCoverage's new no-vacuous-entries
      // assertion, on code nobody had touched that day, which is the whole argument for asserting
      // both directions of a coverage manifest rather than one.
      '/libraries/lib-fiction/items/new/book',
      '/libraries/lib-fiction/edit',
      // Task 18, fix round 1 finding 3: a candidate's ISBN now sets `.num`. Added here rather
      // than left to slip past monoRouteCoverage.test.js's import-graph guard.
      '/libraries/lib-fiction/add/book/results',
      // Task 19: a video candidate's runtime (and, via the reused PlateLine, its year) now set
      // `.num` on this route too. Same reason as the book results route above.
      '/libraries/lib-fiction/add/video/results',
      // Task 20: the search surface reuses ItemRow, so a film result's year reaches this route
      // through the same PlateLine. Listed even though the component was already covered
      // elsewhere — this check is per (site, ROUTE), and the search row is the one place a
      // library NAME sits beside those figures, which is exactly the collision worth watching.
      '/search',
      // About prints the app version in `.num`. Account is NOT here: it printed the reader's
      // `custom:Id` until that section was removed — sharing is by email, so the screen offers
      // the address instead and nothing on it is a numeral any more. A route listed with nothing
      // to cover is a vacuous entry, and `monoRouteCoverage.test.js` now rejects one rather than
      // passing it, so this had to go rather than merely stop mattering.
      '/settings/about',
    ];

    // monoRouteCoverage.test.js extracts MONO_ROUTES as bare route PATHS and matches them
    // segment-by-segment against routes.jsx — a literal query string appended there would fail
    // that match (`results?isbn=...` is not the literal segment `results`). The query this one
    // route needs to render anything at all lives here instead, keyed by the same path, and is
    // consulted only by the navigation below — it never touches the array that guard reads.
    const ROUTE_QUERY = {
      '/libraries/lib-fiction/add/book/results': '?isbn=9782070408504&collectionId=coll-melville',
      // TITLE_MIXED_ARTWORK from tools/mock-detections.js — several TMDB candidates, most
      // carrying artwork, one without, so this route renders a real duration/year rather than
      // the true-miss shape.
      '/libraries/lib-fiction/add/video/results': '?title=Les%20Tontons%20flingueurs',
      // TERM_MIXED from tools/mock-search.js — results spanning two owned libraries and one
      // shared, including films, so the year figures this route is listed for actually render.
      '/search': `?q=${TERM_MIXED}`,
    };

    const collectMonoTexts = async (route) => {
      await page.goto(`${BASE}${route}${ROUTE_QUERY[route] ?? ''}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main', { timeout: 10_000 });
      return page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          // OWN text only: concatenate this element's direct Text-node children, never a
          // descendant's — the same boundary `collectLiterals` draws at a component or a
          // font-override child, computed from the live DOM instead of the AST.
          let direct = '';
          for (const child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) direct += child.textContent;
          }
          direct = direct.trim();
          if (!direct) continue;
          if (!getComputedStyle(el).fontFamily.includes('Chivo Mono')) continue;
          out.push(direct);
        }
        return out;
      });
    };

    const PUNCTUATION_ONLY = /^[^0-9a-zA-Z]+$/u;
    const violations = [];
    let worstPassingRatio = 1;
    let worstPassingText = null;

    for (const route of MONO_ROUTES) {
      const texts = await collectMonoTexts(route);
      for (const text of texts) {
        const stripped = text.replace(/\s+/gu, '');
        if (PUNCTUATION_ONLY.test(stripped)) continue; // e.g. a bare ledger separator mark
        const digits = (stripped.match(/[0-9]/gu) ?? []).length;
        const ratio = digits / stripped.length;
        if (ratio < 0.5) {
          violations.push(`${route}: "${text}" (${(ratio * 100).toFixed(1)}% digits)`);
        } else if (ratio < worstPassingRatio) {
          worstPassingRatio = ratio;
          worstPassingText = `${route}: "${text}"`;
        }
      }
    }

    console.log(
      `    worst passing ratio observed: ${(worstPassingRatio * 100).toFixed(1)}% (${worstPassingText})`,
    );
    record(
      violations.length === 0,
      'every element resolving to Chivo Mono is at least 50% digits once stripped',
      violations.join('; '),
    );
  }

  // ---- Field-driven manifest: the OTHER direction of the mono rule ----
  //
  // The check above proves "nothing but numerals may be mono" — every element that RESOLVES to
  // Chivo Mono is digit-dominant. It has a blind spot with a name and a history: it can only
  // fail on a `.num` class that exists. A candidate's ISBN once rendered in the SANS on
  // BookDetectionResults — no `.num` anywhere near it — and both this check and
  // monoText.test.js/monoRouteCoverage.test.js passed cleanly, because there was no mono site
  // to be wrong about. A human reading a screenshot caught it.
  //
  // A SITE manifest (visit a hand-picked list of places `.num` is supposed to be, assert it is)
  // was the first design for this and was rejected: it still needs someone to have REGISTERED
  // the site, which is exactly the step that failed the first time. This is a FIELD manifest
  // instead — it inverts the direction of the check entirely. Rather than asking "is this
  // known site mono", it takes each catalogue field's real VALUE straight from the fixtures
  // (imported above, never re-typed, so the expected string cannot drift from what the app is
  // actually fed) and asks "wherever that exact value renders on the page, is it mono" — over
  // the WHOLE DOM, not a pre-picked selector. A brand-new component added to an already-checked
  // route that renders `releaseYear` in the sans is caught with zero new registration, because
  // the search is for the VALUE, not for a site that renders it.
  //
  // WHAT THIS STILL CANNOT SEE (stated once, precisely, per this project's convention of not
  // implying coverage a guard lacks):
  //
  // 1. A field rendered on a ROUTE this manifest does not visit. Coverage is per (field, route)
  //    pair, not "this value anywhere in the app" — a route not listed here is not searched.
  //    monoFieldCoverage.test.js (src/) is the drift alarm for the FILE side of this gap (every
  //    file that declares `.num` must be named as a `sourceFile` somewhere below); it cannot
  //    close the ROUTE side, because a field can be under-covered (checked on one route, wrong
  //    on a second) without any file ever being un-named.
  // 2. A wholly new catalogue field this manifest was never told about (e.g. a hypothetical
  //    `publisher`) rendered in the sans on its very first appearance. Nothing here watches for
  //    a field that does not yet have an entry — the same shape as the original gap, just moved
  //    up one level from "site" to "field". Closing THAT would need a schema-driven sweep of
  //    every response field against a rendered page, which is well past this guard's bound.
  // 3. Coincidental collision: an unrelated element whose OWN text happens to equal the expected
  //    value by chance would be silently asserted as mono alongside the real one (or would mask
  //    a real regression if IT were mono while the real site were not, since a match list must
  //    be non-empty and ALL-mono, not "at least one"). Mitigated, not eliminated, by preferring
  //    distinctive values (a 13-digit ISBN, a formatted date) and route-scoping every field to
  //    where it is actually expected — verified by hand for each entry below, not assumed.
  console.log('catalogue fields render in mono wherever their fixture VALUE appears (field-driven)');
  {
    // Mirrors LedgerRow.jsx's own private `stamp` formatter exactly (not imported: it is an
    // unexported const inside a component file), so an expected ledger date can never hand-drift
    // from what the app actually renders. Both this script and the browser run on the same
    // machine, so `toLocaleDateString`'s default (system) timezone/locale resolution is shared —
    // the same assumption LedgerRow itself relies on.
    const stamp = (iso) =>
      new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const item1984 = fictionItems.find((item) => item.id === 'item-1984');
    const melville = fictionItems.find((item) => item.id === 'coll-melville');
    const itemBob = melville.items.find((item) => item.id === 'item-bob');
    const itemSamourai = melville.items.find((item) => item.id === 'item-samourai');
    const itemChinatown = itemsByLibrary['lib-films'].find((item) => item.id === 'item-chinatown');
    const libFiction = fixtureLibraries.find((library) => library.id === 'lib-fiction');
    // The only CLOSED loan in item-lent's history: `Léa`'s pairing is `unresolved` (no return
    // recorded — its rendered day count depends on `now` and can never be a stable expectation)
    // and `Marie`'s is still OPEN (same problem). Paul's is the one loan in this fixture whose
    // rendered day count is deterministic, because both its dates are fixed.
    const paulLoan = pairLoanEvents(eventsByItem['item-lent']).find(
      (loan) => loan.name === 'Paul' && !loan.open && !loan.unresolved,
    );
    const sharedWithMeCount = fixtureLibraries.filter((library) => library.sharedFrom).length;
    // Same source vite.config.js injects into `config.appVersion`, so About's expected value is
    // read rather than transcribed.
    const appVersion = JSON.parse(
      fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ).version;

    // Each entry names the FILE that literally declares the `.num` class this field renders
    // through — not the page/component that merely calls it — because that is what
    // monoFieldCoverage.test.js's drift alarm matches against when it asks "does every
    // `.num`-declaring file have a reason to be here."
    const MONO_FIELDS = [
      {
        field: 'isbn',
        sourceFile: 'src/pages/ItemDetail.jsx',
        route: `/libraries/lib-fiction/items/${item1984.id}`,
        expected: item1984.isbn,
        px: 12,
      },
      // The exact regression this whole manifest exists for: a candidate's scanned ISBN on the
      // detection-results screen, reached via a query string rather than a fixture item id.
      //
      // The ONE literal `expected` in this manifest, and deliberately so: every other entry reads
      // a fixture field, which cannot rot. This value is not a field — it is the request INPUT the
      // reader typed, echoed back by the mock, so there is no fixture object to read it from. It
      // matches the literal the pre-existing site check above already uses for the same route.
      {
        field: 'isbn (detection results)',
        sourceFile: 'src/pages/BookDetectionResults.jsx',
        route: '/libraries/lib-fiction/add/book/results',
        query: '?isbn=9782070408504&collectionId=coll-melville',
        expected: '9782070408504',
        // No published size: the mono table names no role for the scanned code echoed at the head
        // of a results screen. Measured and reported rather than asserted — see `px: null` below.
        px: null,
      },
      // The video-side twin of the ISBN entry above. Not the searched title (that mark deliberately renders in the
      // SANS — a film title is content, not a numeral, and the mono is reserved for numerals; the
      // book side's ISBN echo is mono only because an ISBN IS a numeral). Runtime is the new
      // numeral this screen introduces, so it is what the manifest checks. Literal, like the isbn
      // entry above, because this value comes from TITLE_MIXED_ARTWORK's first candidate in
      // tools/mock-detections.js (duration: 105) rather than from a fixture object this script
      // already imports.
      {
        field: 'duration (video candidate)',
        sourceFile: 'src/pages/VideoDetectionResults.jsx',
        route: '/libraries/lib-fiction/add/video/results',
        query: '?title=Les%20Tontons%20flingueurs',
        expected: '105′',
        px: 12,
      },
      // The session tally. A count on display beside its own label is a labelled datum, exactly
      // like a library's item count, so it belongs in the mono. It is the first manifest entry
      // that has to ACT to exist: `reach` files one item, which is what produces the mark.
      {
        field: 'filed-this-session tally',
        sourceFile: 'src/components/imprint/FlowMarks.jsx',
        route: '/libraries/lib-fiction/add/book/results',
        query: '?isbn=9782070408504',
        reach: async () => {
          await page.evaluate(() => {
            const btn = [...document.querySelectorAll('main button')].find(
              (el) => el.textContent.trim().toLowerCase().startsWith('use this'),
            );
            btn?.click();
          });
          await page.waitForSelector('[data-mark="session-tally"]', { timeout: 10_000 });
        },
        expected: '1',
        // No published size: the mono table names no role for a session tally.
        px: null,
      },
      {
        field: 'releaseYear (row)',
        sourceFile: 'src/components/imprint/PlateLine.jsx',
        route: '/libraries/lib-films',
        expected: String(itemChinatown.releaseYear),
        px: 12,
      },
      {
        // The SAME source file as the row entry above, on a different route, and that is the
        // point rather than a duplicate: this manifest's coverage is per (field, ROUTE) pair —
        // its own blind-spot note says a field can be checked on one route and wrong on a
        // second. The search surface is a second route rendering PlateLine, and the one where a
        // library name sits inline beside the figures.
        field: 'releaseYear (search row)',
        sourceFile: 'src/components/imprint/PlateLine.jsx',
        route: '/search',
        query: `?q=${TERM_MIXED}`,
        expected: String(itemChinatown.releaseYear),
        px: 12,
      },
      {
        field: 'releaseYear (detail)',
        sourceFile: 'src/pages/ItemDetail.jsx',
        route: `/libraries/lib-fiction/items/${itemSamourai.id}`,
        expected: String(itemSamourai.releaseYear),
        px: 12,
      },
      {
        field: 'duration',
        sourceFile: 'src/pages/ItemDetail.jsx',
        route: `/libraries/lib-fiction/items/${itemSamourai.id}`,
        // The prime mark is the catalogue's own runtime convention (lib/format.js).
        expected: `${itemSamourai.duration}′`,
        px: 12,
      },
      {
        field: 'order',
        sourceFile: 'src/components/imprint/VolumePlate.jsx',
        route: '/libraries/lib-fiction',
        expected: String(itemBob.order).padStart(2, '0'),
        px: 10,
      },
      {
        field: 'totalItems',
        sourceFile: 'src/components/imprint/VolumePlate.jsx',
        route: '/libraries',
        expected: String(libFiction.totalItems),
        px: 12,
      },
      {
        field: 'itemCount',
        sourceFile: 'src/components/imprint/VolumePlate.jsx',
        route: '/libraries/lib-fiction',
        expected: String(melville.itemCount),
        px: 12,
        // Scoped to the board it belongs to, and only because asserting the SIZE made the
        // value ambiguous where asserting the face never could. `4` renders twice on this
        // route: here in the board's count plate at 12, and in the M index letter's run count
        // at 11 — both correct at their own published sizes. The two can never be separated by
        // a fixture edit: a run holding exactly one board and nothing else always equals that
        // board's count. Every mono role shares one face, so a collision between two of them is
        // invisible to a family check and fatal to a size check.
        closest: '[data-board]',
      },
      {
        // Pointed at the A run, NOT at the run holding the Melville board, and the reason is not
        // cosmetic. A review found this entry and `itemCount` above both expecting 4 and proposed
        // "a future fixture tweak" to separate them. That fix is impossible: the index letter's
        // own count rule defines a run's count as standalone entries plus each board's `itemCount`, and
        // stream.js's `entryItemCount` implements exactly that — so a run holding one board and
        // nothing else ALWAYS equals that board's count, whatever number the fixture carries.
        // Changing the fixture moves both together, forever. Only re-pointing at a run with a
        // different COMPOSITION separates them, which is what this is: the A run (Amérique,
        // Aurore) closes at 2, arithmetically distinct from any board's count, so a bug swapping
        // these two elements' font logic can no longer hide behind a shared value.
        //
        // Derived through the client's own `indexLetterFor`, and summed the same way,
        // so it stays correct if a board is ever filed under A.
        field: 'indexLetterCount',
        sourceFile: 'src/components/imprint/IndexLetter.jsx',
        route: '/libraries/lib-fiction',
        expected: String(
          fictionItems
            .filter((entry) => indexLetterFor(entry.title) === 'A')
            .reduce((sum, entry) => sum + (entry.type === 2 ? entry.itemCount : 1), 0),
        ),
        px: 11,
      },
      {
        field: 'ledgerDate',
        sourceFile: 'src/components/imprint/LedgerRow.jsx',
        route: '/libraries/lib-fiction/items/item-lent',
        expected: stamp(paulLoan.lentAt),
        px: 11,
      },
      {
        field: 'loanDays',
        sourceFile: 'src/components/imprint/LedgerRow.jsx',
        route: '/libraries/lib-fiction/items/item-lent',
        expected: String(paulLoan.days),
        px: 13,
      },
      {
        // NewLibrary.jsx's own `NAME_MAX` (20, matching openapi.yaml's `CreateLibraryRequest.name
        // maxLength`) is a private, unexported const, so it is restated here rather than
        // imported — the field itself is "20 minus zero typed characters" on first mount, which
        // is stable regardless of the constant's own value drifting, as long as the field opens
        // empty (it does: `useState('')`).
        field: 'remainingCount',
        sourceFile: 'src/components/imprint/Field.jsx',
        route: '/libraries/new',
        expected: '20',
        px: 11,
      },
      {
        field: 'sectionCount',
        sourceFile: 'src/pages/Libraries.jsx',
        route: '/libraries',
        expected: String(sharedWithMeCount),
        px: 11,
      },
      // The outbound share count. Read from the fixture, never retyped: a literal here forks the
      // substrate the day the fixture moves. The anchor is a SINGLE DIGIT, which is the shortest
      // possible one — safe today because every other own-text match for it on /libraries is
      // itself a count in the mono (the section-head tallies), so a collision cannot produce a
      // false failure. Recorded because that is a property of the route, not of the entry.
      {
        field: 'shared-out count',
        sourceFile: 'src/components/imprint/SharedRibbon.jsx',
        route: '/libraries',
        expected: String(
          fixtureLibraries.find((library) => library.name === 'Fiction').sharedTo.length,
        ),
        px: 11,
      },
      {
        // READ from package.json, never retyped: the version About prints comes from the same
        // file, so this expectation cannot hand-drift from it. The commit hash beside it is
        // deliberately NOT here — a short hash is hexadecimal rather than a numeral, and setting
        // it in the mono would make the digit-dominance check above depend on which commit is
        // checked out (about one hash in six is under half digits).
        field: 'app version',
        sourceFile: 'src/pages/About.jsx',
        route: '/settings/about',
        expected: appVersion,
        // No published size: the mono table names no role for the app version.
        px: null,
      },
    ];

    // Own text only, exact match — same "direct Text-node children" boundary the digit-dominant
    // check above draws, but equality instead of a digit ratio: a field's rendered value is
    // either exactly this string somewhere on the page, or the manifest and the app have drifted
    // apart (caught as "not found" below, not silently skipped).
    // `reach` (optional) runs after the navigation and before the search: some catalogue values
    // do not exist on a cold route at all. The session tally is the first — it is produced BY a
    // save, so a plain `goto` would find nothing and the loop would correctly report the fixture
    // and the route as drifted apart. Without this the only alternatives were to leave a `.num`
    // site uncovered or to weaken the drift alarm, both of which trade a real guard for a
    // convenience.
    const findOwnTextMatches = async (route, expectedText, reach, closest) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main', { timeout: 10_000 });
      if (reach) await reach();
      return page.evaluate(({ text, closest: scope }) => {
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          if (scope && !el.closest(scope)) continue;
          let direct = '';
          for (const child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) direct += child.textContent;
          }
          if (direct.trim() === text) {
            const style = getComputedStyle(el);
            // The COMPUTED size, not a class string. A numeral whose span declares no size of its
            // own — `<span className="num">{days}</span>` inside a line sized by its parent —
            // carries no size class for a source-parsing guard to read, so the size the design
            // publishes for that role is unverifiable anywhere but here.
            out.push({ family: style.fontFamily, fontSize: Number.parseFloat(style.fontSize) });
          }
        }
        return out;
      }, { text: expectedText, closest: closest ?? null });
    };

    const fieldViolations = [];
    // The size violations are recorded SEPARATELY from the face ones, because they answer two
    // different questions about the same node and a merged report cannot say which one broke.
    const sizeViolations = [];
    for (const { field, route, query, expected, reach, px, closest } of MONO_FIELDS) {
      const matches = await findOwnTextMatches(`${route}${query ?? ''}`, expected, reach, closest);
      const families = matches.map((match) => match.family);
      if (matches.length === 0) {
        // Not a pass: a value the manifest expects to find rendered nowhere means the fixture
        // and the route have drifted apart, which is worth failing loudly on rather than
        // silently treating as "nothing to check" (monoRouteCoverage.test.js's own convention).
        fieldViolations.push(
          `${field}: expected value ${JSON.stringify(expected)} was not found anywhere on ` +
            `${route}${query ?? ''} — the fixture and the route have drifted apart`,
        );
        continue;
      }
      const wrongFace = families.find((family) => !family.includes('Chivo Mono'));
      if (wrongFace) {
        fieldViolations.push(
          `${field}: ${JSON.stringify(expected)} on ${route}${query ?? ''} rendered in ` +
            `"${wrongFace}", not Chivo Mono`,
        );
      }
      const sizes = [...new Set(matches.map((match) => match.fontSize))];
      console.log(
        `    ${field.padEnd(28)} ${sizes.join('/')}px (want ${px === null ? 'unpublished' : `${px}px`})`,
      );
      // `px: null` is a DECLARED absence, not a forgotten key: the mono table publishes no size
      // for that role, so there is nothing to assert and the measurement is reported instead. An
      // entry that simply omitted the property could not be told apart from one nobody filled in.
      if (px !== null) {
        const wrongSize = sizes.find((size) => size !== px);
        if (wrongSize !== undefined) {
          sizeViolations.push(
            `${field}: ${JSON.stringify(expected)} on ${route}${query ?? ''} rendered at ` +
              `${wrongSize}px, expected ${px}px`,
          );
        }
      }
    }

    record(MONO_FIELDS.length > 0, 'found more than zero catalogue fields in the manifest', '');
    record(
      fieldViolations.length === 0,
      'every catalogue field is mono wherever its fixture value renders',
      fieldViolations.join('; '),
    );
    record(
      sizeViolations.length === 0,
      'every catalogue field renders at the size its role publishes',
      sizeViolations.join('; '),
    );
  }
  // ---- Every PWA icon rasterised, decoded and painted ----
  // Measured as `naturalWidth` on a real decode, never as "the manifest lists it" or "the page
  // shows an <img>". A malformed SVG serves HTTP 200 and renders nowhere, and the accessibility
  // tree happily reports images that never painted a pixel - which is exactly how the first
  // draft of `public/icon-source.svg` passed review while being invalid XML (a double hyphen
  // inside its own comment; see the note in that file). A rasteriser handed that file emits a
  // PNG-shaped nothing, and every listing-based check agrees it is present.
  //
  // So two questions per file, and the second is the one a listing can never answer: did it
  // decode at the size the manifest promises, and does it contain both of the two colours the
  // mark is made of? A flat black square decodes perfectly.
  console.log('PWA icons decode at their declared size and carry the mark');
  {
    const INK = '#0B0B0B';
    const IMPRINT = '#F2C200';
    const targets = [
      // Expected width is the manifest's own declared size, so an icon generated at the wrong
      // scale fails here rather than being silently resampled by whatever consumes it.
      ...RASTER_ICONS.map(({ file, size }) => ({ url: `/${file}`, expected: size, sample: true })),
      // The .ico is a CONTAINER of frames and the browser chooses one, so its decoded width is a
      // real number this list cannot predict. `expected: null` asserts only that a frame decoded
      // — which is the whole failure mode for a hand-assembled ICO, whose directory offsets are
      // easy to get wrong in a way that produces a file, not an error.
      { url: `/${FAVICON_ICO.file}`, expected: null, sample: true },
      // The committed sources themselves, because they ship to `dist/` and one of them is the
      // tab's own `image/svg+xml` icon. Not sampled: the canvas questions above are about the
      // rasteriser's output, and these are its input.
      ...Object.values(ICON_SOURCES).map((file) => ({ url: `/${file}`, expected: 512, sample: false })),
    ];

    const measured = await page.evaluate(
      async (items, ink, imprint) => {
        const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
        const near = (r, g, b, [tr, tg, tb], tolerance) =>
          Math.abs(r - tr) <= tolerance && Math.abs(g - tg) <= tolerance && Math.abs(b - tb) <= tolerance;
        const inkRgb = hex(ink);
        const imprintRgb = hex(imprint);

        const load = (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
          });

        const out = [];
        for (const item of items) {
          const img = await load(item.url);
          const result = {
            url: item.url,
            width: img ? img.naturalWidth : 0,
            height: img ? img.naturalHeight : 0,
            inkShare: null,
            imprintShare: null,
          };
          if (img && item.sample && result.width > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = result.width;
            canvas.height = result.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let inkPixels = 0;
            let imprintPixels = 0;
            // A generous tolerance, because every one of these pixels has been through a resize:
            // the question is "is the mark here at all", not "is this hex exact".
            for (let i = 0; i < data.length; i += 4) {
              const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
              if (near(r, g, b, inkRgb, 24)) inkPixels += 1;
              else if (near(r, g, b, imprintRgb, 40)) imprintPixels += 1;
            }
            const total = data.length / 4;
            result.inkShare = inkPixels / total;
            result.imprintShare = imprintPixels / total;
          }
          out.push(result);
        }
        return out;
      },
      targets,
      INK,
      IMPRINT,
    );

    for (const target of targets) {
      const found = measured.find((m) => m.url === target.url);
      const sizeOk = target.expected === null ? found.width > 0 : found.width === target.expected;
      record(
        sizeOk && found.height > 0,
        `${target.url} decodes${target.expected === null ? '' : ` at ${target.expected}px`}`,
        `naturalWidth ${found.width}, naturalHeight ${found.height}` +
          (found.width === 0 ? ' — the file is missing, or it is not a decodable image' : ''),
      );
      if (!target.sample || found.width === 0) continue;
      // Both colours, both directions. Ink alone is a blank plate; imprint alone would mean the
      // ground never painted. The floors are deliberately low — at 16px the letter is a handful
      // of pixels and everything else is antialiasing — because this asserts "the mark is here",
      // not a composition.
      record(
        found.imprintShare > 0.02 && found.inkShare > 0.2,
        `${target.url} carries the mark (chrome yellow on ink)`,
        `imprint ${(found.imprintShare * 100).toFixed(1)}%, ink ${(found.inkShare * 100).toFixed(1)}% ` +
          '— a raster made of one flat colour decodes perfectly and shows nothing',
      );
    }
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
