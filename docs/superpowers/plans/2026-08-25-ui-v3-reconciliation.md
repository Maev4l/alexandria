# v3 Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the 42 live findings of `docs/ui-design/reconciliation-2026-08-25.md` — 8 as code
changes, 34 as corrections to `DESIGN.md` and `.claude/ui-v3.md` — so the specification and the
build stop disagreeing.

**Architecture:** Seven code tasks, each a site where a rule that stays is broken, each with a
failing test written first. Then seven document tasks correcting or extending `DESIGN.md` §2–§8 and
`.claude/ui-v3.md`. Two guards are widened, and each must be *seen to fail* before it is accepted.
No new features and no redesign: the only visible changes are three colour corrections, two empty
states, a skeleton fill, a wordmark size and a 4px gap.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 4, Vitest + Testing Library (unit),
puppeteer-core via `scripts/check-browser.mjs` (computed style and cascade), Oxlint.

**Spec:** `docs/superpowers/specs/2026-08-25-ui-v3-reconciliation-design.md`

## Global Constraints

Every task's requirements implicitly include this section. These are not style preferences; each is
a rule this project has already paid for breaking.

- **The package root is `/Users/jrsue/dev/repos/alexandria/packages/web-client-v3`. Address it by
  absolute path in every command.** A relative `cd` from an already-nested working directory has
  produced two exit-zeros here that looked exactly like two passes. Print `pwd` as part of any chain.
- **`tee` every test run to a file and grep the file, never the pipe.** A grep is the right default
  for a green run and the wrong one for a red run, and you do not know which you have until after
  the output has scrolled.
- **A new or widened guard must be seen to fail.** Break the thing it guards, confirm with
  `git diff` that the mutation actually landed — a no-op `sed` and a robust guard produce identical
  evidence — watch it go red, then restore.
- **Reach every site by an anchor string, asserted to match exactly once before editing.** Zero
  means it moved, more than one means it spread; both are stop conditions rather than things to
  guess through. Use `grep -F`: a Tailwind arbitrary value such as `text-[11px]` is a character
  class to a regex engine. The audit's line numbers are pinned to `7bc45f7` and have drifted.
- **Commit on the checked-out branch (`main`). Never branch, never push.**
- JavaScript only, no TypeScript. `.jsx` for components, PascalCase filenames. Double quotes in JSX
  attributes, single quotes everywhere else.
- Comments say **why**, not how.
- Every authenticated screen keeps its `<main>` and its `<h1>`. Do not remove either while editing a
  screen for something else.
- **Anything that sets a ground sets its foreground.** Any block you touch that paints a background
  must declare its text colour, at or below itself.
- §3's type scale is **10, 11, 12, 13, 14, 17, 20, 22, 32, 76**, plus **16px on form inputs only**
  (Mobile Safari zooms the page below 16px). `typeScale.test.js` enforces this and fails on anything
  else.
- `.caps` sets case plus a 0.08em tracking baseline; **weight is always declared at the point of
  use**, and an explicit `tracking-*` utility beats the baseline.
- On paper, `--imprint` never carries a shape by itself (~1.55:1). On the black cover it is 11.71:1
  and legible.
- 48px minimum touch target. No shadows, no rounded corners anywhere.

**Verification chain, run after every code task:**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
yarn test 2>&1 | tee /tmp/v3-test.log; tail -5 /tmp/v3-test.log
yarn lint 2>&1 | tee /tmp/v3-lint.log; tail -5 /tmp/v3-lint.log
yarn check:browser 2>&1 | tee /tmp/v3-browser.log; grep 'FAIL' /tmp/v3-browser.log || echo 'no browser failures'
```

`yarn check:browser` starts its own fixture server on :5199 and needs Chrome at
`/Applications/Google Chrome.app/…` or `CHROME_PATH` set. It leaves :5173 alone.

**No guard parses `DESIGN.md`** — verified; the suite references it only in comments. Document tasks
therefore cannot break the build, which is also precisely why these divergences accumulated. Each
document task below carries its own grep verification instead.

## Self-review notes

**Spec coverage.** Every section of the spec maps to a task: §2.1→01, §2.2→01, §2.3→01, §2.4→02+03,
§2.5→04, §2.6→05, §2.7→06, §2.8→07, §2.9→07, §3.1→08, §3.2→09, §3.3→09, §3.4→10+11, §3.5→12,
§3.6→12, §3.7→12, §3.8→13, §3.9→14. §4's non-goals (no shared confirmation primitive, no `--out`
guard) are stated as acceptance criteria in Tasks 10 and 01 respectively, where they could otherwise
be violated by a well-meaning implementer.

**Three unknowns were resolved while reviewing rather than left to the implementer**, because each
would have produced a test that fails for the wrong reason. `PlateButton` is always a `<button>` and
takes no `to`, so Task 05 navigates on click — and because the bottom bar already carries the name
`New library`, that test must scope with `within(frame)` or it fails on an ambiguous match rather
than on the frame. Nothing configures a `testIdAttribute`, so Task 04 queries `[data-skeleton]`
directly, matching the `data-edge` / `data-mark` convention the codebase already uses.
`SearchField.test.jsx`'s helper is `renderLauncher`, not `renderField`.

**Two steps still carry a genuine decision**, and both say so: Task 03 branches on a measurement
nobody has taken, and Task 05's unshare test needs the file's module-level mock converted to a
mutable binding, whose shape depends on that file. Neither is a placeholder standing in for work
nobody thought about.

---

### Task 01: Three legislated colours spent on what they do not mean

Findings 1.4, 1.5b, 1.6. Three sites, one law each, one commit — a reviewer would accept or reject
them together.

**Files:**
- Modify: `src/pages/PendingApproval.jsx` (anchor: `border-2 border-out px-2 py-1`)
- Modify: `src/pages/Login.jsx` (anchor: `border-t-2 border-imprint bg-paper-deep`)
- Modify: `src/pages/ItemDetail.jsx` (anchor: `font-extrabold text-imprint underline`)
- Create: `src/pages/PendingApproval.test.jsx`
- Test: `src/pages/Login.test.jsx`, `src/pages/ItemDetail.test.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `src/pages/PendingApproval.test.jsx`, the screen's first test file. Task 12 cites these
  three sites as corrected when it documents §6.

**Acceptance criteria — the spec rules this task can breach:**
- `--out` means **on loan, nothing else, ever** (`DESIGN.md` §2). After this task its only sites are
  the stamp, the destructive button, the field-error class, the two in-place confirmations and the
  ~39 Error blocks §6 sanctions.
- `--imprint` on `--paper-deep` is ~1.42:1 and cannot describe a form.
- Navigation is **underlined, never accented** (§5, Detail Marks). `Full record` loses its yellow on
  *that* rule, **not** on contrast — yellow on the cover is 11.71:1. `ItemDetail`'s `THE RECORD`
  heading keeps its yellow, because a heading is not navigation. **Do not touch it.**
- `PendingApproval` does **not** take the yellow wordmark plate `Login`/`SignUp` use: that plate
  carries the wordmark, and `--imprint` means finding and acting.

- [ ] **Step 1: Confirm all three anchors resolve to exactly one site**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'border-2 border-out px-2 py-1' src/pages/PendingApproval.jsx
grep -cF -- 'border-t-2 border-imprint bg-paper-deep' src/pages/Login.jsx
grep -cF -- 'font-extrabold text-imprint underline' src/pages/ItemDetail.jsx
```

Expected: `1`, `1`, `1`. Any other number: stop and re-locate the site.

- [ ] **Step 2: Write the failing test for `PendingApproval`**

Create `src/pages/PendingApproval.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PendingApproval from './PendingApproval.jsx';

vi.mock('@/auth/AuthContext.jsx', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

describe('PendingApproval', () => {
  // --out means on loan and nothing else, ever (DESIGN.md section 2). This badge wore the
  // Overprint Stamp's own construction on a screen that holds no items at all, so the one
  // colour the palette reserves for circulation was marking an account state.
  it('marks the state with an ink rule, never with the lent colour', () => {
    render(
      <MemoryRouter>
        <PendingApproval />
      </MemoryRouter>,
    );
    const badge = screen.getByText(/pending approval/i);
    expect(badge.className).toContain('border-ink');
    expect(badge.className).not.toContain('border-out');
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/pages/PendingApproval.test.jsx 2>&1 | tee /tmp/t01a.log; tail -20 /tmp/t01a.log
```

Expected: FAIL — the className contains `border-out` and not `border-ink`.

- [ ] **Step 4: Add the failing test for `Login`'s notice**

Append inside the existing `describe('Login', …)` block in `src/pages/Login.test.jsx`:

```jsx
  // --imprint on --paper-deep computes to ~1.42:1, and that rule was the notice's only
  // distinguishing mark — the exact failure section 2 predicts in bold, in the one place
  // nobody had scoped the rule out of.
  it('prints the OAuth success notice with an ink rule, not an invisible yellow one', () => {
    auth.oauthMessage = { type: 'success', text: 'Your Google account has been linked.' };
    renderPage();
    const notice = screen.getByRole('status');
    expect(notice.className).toContain('border-ink');
    expect(notice.className).not.toContain('border-imprint');
  });
```

- [ ] **Step 5: Add the failing test for `Full record`**

Append inside the existing `describe('ItemDetail', …)` block in `src/pages/ItemDetail.test.jsx`:

```jsx
  // Navigation is underlined, never accented (section 5, Detail Marks) — and DetailMarks'
  // own `IN <library>` link, sixty lines above on this same screen, already obeys it.
  // Not a contrast fix: yellow on the cover measures 11.71:1.
  it('sets the full-record link in the cover body tone, like every other link on the cover', async () => {
    renderPage('item-lent');
    const link = await screen.findByRole('link', { name: /full record/i });
    expect(link.className).toContain('text-cover-body');
    expect(link.className).not.toContain('text-imprint');
  });
```

- [ ] **Step 6: Run both and watch them fail**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/pages/Login.test.jsx src/pages/ItemDetail.test.jsx 2>&1 | tee /tmp/t01b.log; grep -nE 'FAIL|×|✕' /tmp/t01b.log | head -20
```

Expected: exactly the two new tests fail; everything else in both files passes.

- [ ] **Step 7: Make the three changes**

`src/pages/PendingApproval.jsx` — on the badge `<span>`, `border-out` → `border-ink`, with the
reason above it:

```jsx
      {/* Ink, not `--out`. This badge used to wear the Overprint Stamp's own construction — a
          2px `--out` outline — on a screen that holds no items at all, so the one colour the
          palette reserves for circulation was marking an account state (DESIGN.md §2: on loan,
          nothing else, ever). It is not the yellow wordmark plate either: that plate carries the
          wordmark, and `--imprint` means finding and acting. */}
      <span className="caps mt-8 inline-block self-start border-2 border-ink px-2 py-1 text-[11px] font-extrabold tracking-[0.14em] text-ink">
        Pending approval
      </span>
```

`src/pages/Login.jsx` — on the `role="status"` notice, `border-imprint` → `border-ink`, with:

```jsx
        {/* An ink rule: the same printed-notice construction Toast and UpdateNotice use.
            `--imprint` on `--paper-deep` is ~1.42:1 and this rule is the notice's only mark, so
            the yellow described nothing at all — yellow cannot carry a shape on paper (§2). */}
```

`src/pages/ItemDetail.jsx` — on the `Full record` link, `text-imprint` → `text-cover-body`. Leave
the `before:` hit-area classes and the `underline` untouched, and leave the `THE RECORD` heading
above it in `text-imprint`. Add above the `className`:

```jsx
                // `--cover-body`, matching DetailMarks' `IN <library>`: navigation is underlined
                // and never accented (§5), because yellow beside the title rule reads as a primary
                // action. NOT a contrast fix — yellow on the cover measures 11.71:1, which is why
                // the ledger heading above keeps its own.
```

- [ ] **Step 8: Run the three test files and watch them pass**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/pages/PendingApproval.test.jsx src/pages/Login.test.jsx src/pages/ItemDetail.test.jsx 2>&1 | tee /tmp/t01c.log; tail -10 /tmp/t01c.log
```

Expected: PASS, all three files.

- [ ] **Step 9: Confirm `THE RECORD` still carries its yellow**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && grep -cF -- 'tracking-[0.16em] text-imprint' src/pages/ItemDetail.jsx
```

Expected: `1`. A `0` means the heading was changed too, which this task forbids.

- [ ] **Step 10: Run the full verification chain, then commit**

Run the chain from Global Constraints; all three green. Commit message:

```
fix(web-client-v3): three legislated colours spent on what they do not mean

`--out` means on loan and nothing else, ever, and PendingApproval's badge
wore the Overprint Stamp's own construction on a screen holding no items —
the one colour reserved for circulation marking an account state.

Login's OAuth notice put a 2px `--imprint` rule on `--paper-deep`: ~1.42:1,
and it was the notice's only distinguishing mark. §2 predicts exactly this
in bold, and this was the one place nobody scoped the rule out of.

And `Full record` took the yellow §5 refuses for navigation, sixty lines
below `IN <library>`, which obeys it. It loses the accent on that rule and
not on contrast: yellow on the cover is 11.71:1, which is why the ledger
heading beside it keeps its own.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 02: The wordmark's size, and the guard that could not see it

Finding 2.2, plus the guard work the spec's §2.4 requires.

**Files:**
- Modify: `src/pages/Login.jsx` (anchor: `bg-imprint px-2 py-1 text-[11px]`)
- Modify: `src/pages/SignUp.jsx` (anchor: `bg-imprint px-2 py-1 text-[11px]`)
- Modify: `scripts/check-browser.mjs` (anchor: `role: 'wordmark'`)

**Interfaces:**
- Consumes: nothing.
- Produces: `CAPS_ROLES` entries now carry a `px` property alongside `em`. Task 03 reads that same
  manifest to probe weight. Task 09 documents the two shared-ribbon roles this task measures.

**Acceptance criteria:**
- §3 publishes the wordmark at **12px / 800 / +0.20em**. `AppHeader` already obeys it.
- **11px is on §3's scale** (the section-header step), so `typeScale.test.js` is blind to this
  defect by construction and no amount of widening it would help. The browser assertion must read
  the **computed `font-size`**.
- `CAPS_ROLES` gains a second shared-ribbon entry. `SharedRibbon` renders at 11/700 on `LibraryRow`
  and `LibraryBrowse`'s shared header, and at 10/800 on `DetailMarks` and `SearchRowMarks`; the
  existing entry is routed to `/libraries` and so measures the 11/700 instance against a §3 row
  describing the 10/800 one. It has only ever been green because both surfaces sit at +0.16em.
  **Do not change either rendered size** — Task 09 documents both as published roles.
- `em: null` in this manifest means "§3 assigns this role no tracking". Do not repurpose it.

- [ ] **Step 1: Confirm the anchors**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'bg-imprint px-2 py-1 text-[11px]' src/pages/Login.jsx
grep -cF -- 'bg-imprint px-2 py-1 text-[11px]' src/pages/SignUp.jsx
grep -cF -- "role: 'wordmark'" scripts/check-browser.mjs
```

Expected: `1`, `1`, `1`.

- [ ] **Step 2: Widen the guard first, so it fails on the code as it stands**

In `scripts/check-browser.mjs`, in the `CAPS_ROLES` array, replace the single wordmark entry with
three, add `px` to **every** entry, and add the second shared-ribbon role:

```js
      { role: 'wordmark', route: '/libraries', text: 'ALEXANDRIA', px: 12, em: 0.2 },
      // §3 publishes ONE wordmark. Two auth screens printed it at the section-header step (11px)
      // and nothing could see it: `typeScale.test.js` resolves sizes and 11 is ON the scale, so
      // the only guard that reads sizes is blind to this defect by construction. Hence the routes,
      // and hence `px` — the loop below already computes fontSize as the em divisor and threw it
      // away, so the number that catches this was being measured and discarded.
      { role: 'wordmark (login)', route: '/login', text: 'ALEXANDRIA', px: 12, em: 0.2 },
      { role: 'wordmark (signup)', route: '/signup', text: 'ALEXANDRIA', px: 12, em: 0.2 },
      { role: 'plate button label', route: '/libraries', text: 'NEW LIBRARY', px: 12, em: 0.12 },
      // TWO shared-ribbon roles, not one. The same component renders at 11/700 on a library row
      // and at 10/800 in a mark column, and this entry measured the first against §3's row for the
      // second — green only because the two surfaces coincide at +0.16em. A true measurement of the
      // wrong substrate, inside the guard.
      { role: 'shared ribbon caps (library row)', route: '/libraries', text: 'SHARED', px: 11, em: 0.16 },
      { role: 'account plate initials', route: '/libraries', text: 'JR', px: 11, em: 0.08 },
      { role: 'field label', route: '/settings/account', text: 'CURRENT PASSWORD', px: 11, em: 0.12 },
      { role: 'ledger head', route: '/libraries/lib-fiction/items/item-lent', text: 'THE RECORD', px: 10, em: 0.16 },
      { role: 'detail marks label', route: '/libraries/lib-fiction/items/item-lent', text: 'IN', px: 10, em: 0.16 },
```

Then destructure `px` in the loop header and assert it. Change:

```js
    for (const { role, route, text, em } of CAPS_ROLES) {
```

to:

```js
    for (const { role, route, text, px, em } of CAPS_ROLES) {
```

and immediately after the `if (!measured) { … continue; }` block, before the `em === null` branch,
insert:

```js
      // The size, asserted separately from the tracking, because a role can carry its published
      // tracking at the wrong size — which is exactly what two wordmarks did. Exact equality: these
      // are declared px values, not a float multiplication.
      if (measured.fontSize !== px) {
        trackingViolations.push(`${role}: ${measured.fontSize}px, expected ${px}px`);
      }
```

- [ ] **Step 3: Run the browser check and watch it go red on the real defect**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn check:browser 2>&1 | tee /tmp/t02a.log; grep -F 'FAIL' /tmp/t02a.log
```

Expected: a failure naming `wordmark (login): 11px, expected 12px` and the same for `(signup)`.
Every other role reports its published size. **If any role other than the two wordmarks fails on
size, stop and report it** — that is a finding outside this pass's 42, and it goes on a list rather
than getting silently "fixed" here.

- [ ] **Step 4: Correct the two wordmarks**

In `src/pages/Login.jsx` and `src/pages/SignUp.jsx`, the badge span becomes:

```jsx
      <span className="caps on-imprint mt-8 inline-block bg-imprint px-2 py-1 text-xs font-extrabold tracking-[0.2em] text-ink">
        Alexandria
      </span>
```

`text-xs` resolves to 12px in Tailwind 4's defaults, which `typeScale.test.js` already asserts are
undisturbed by any `--text-*` override. Add above it, in `Login.jsx` only (SignUp cites it):

```jsx
      {/* §3's published wordmark: 12/800/+0.20em, the same values AppHeader carries. These two
          screens printed it at the SECTION HEADER step, and no guard could see it — 11px is on the
          scale, so the size guard is blind to it by construction. check-browser's caps manifest now
          asserts the computed size here as well as on /libraries. */}
```

- [ ] **Step 5: Re-run the browser check and watch it pass**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn check:browser 2>&1 | tee /tmp/t02b.log; grep -F 'FAIL' /tmp/t02b.log || echo 'no browser failures'
```

Expected: no failures.

- [ ] **Step 6: Prove the guard is not a no-op — break it and confirm the mutation landed**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3
sed -i '' 's/tracking-\[0.2em\] text-ink">$/tracking-[0.2em] text-ink" data-broken="1">/' src/pages/SignUp.jsx
sed -i '' 's/caps on-imprint mt-8 inline-block bg-imprint px-2 py-1 text-xs/caps on-imprint mt-8 inline-block bg-imprint px-2 py-1 text-[11px]/' src/pages/SignUp.jsx
git diff --stat src/pages/SignUp.jsx
```

Expected: `git diff --stat` shows `SignUp.jsx` modified. **A no-op `sed` and a robust guard produce
identical evidence, so this confirmation is not optional.** Then:

```bash
yarn check:browser 2>&1 | tee /tmp/t02c.log; grep -F 'FAIL' /tmp/t02c.log
```

Expected: FAIL naming `wordmark (signup): 11px, expected 12px`. Then restore:

```bash
git checkout -- src/pages/SignUp.jsx && git diff --stat src/pages/SignUp.jsx
```

Expected: no output — the file is clean again.

- [ ] **Step 7: Run the full verification chain, then commit**

Commit message:

```
fix(web-client-v3): the wordmark at the section-header step, and a guard blind to it

§3 publishes one wordmark at 12/800/+0.20em. Two auth screens printed it at
11px, and nothing in the suite could report it: 11 is ON §3's scale, so the
one guard that reads sizes is blind to this by construction, and no amount
of widening it would have helped.

The fix is not a new guard, it is finishing the one that exists. The caps
manifest already computed fontSize — as the divisor turning em into px —
and threw it away. Asserting it costs a line, and the wordmark gains the
two routes it was never checked on.

That immediately surfaced a second role. SharedRibbon renders at 11/700 on
a library row and 10/800 in a mark column, and the manifest measured the
first against §3's row for the second: green only because both surfaces sit
at +0.16em. A true measurement of the wrong substrate, inside the guard
written to prevent exactly that. Both roles are now measured; §3 gains both.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 03: The weight probe, and its two branches

The spec's deliberate decision: `px` is asserted because the defect requires it; **weight is probed
first**, so six unmeasured roles cannot pull new findings into a pass scoped to applying old ones.

**Files:**
- Modify (possibly reverted): `scripts/check-browser.mjs` (anchor: `role: 'wordmark'`)
- Create (only on the divergent branch): `docs/ui-design/caps-weight-findings-2026-08-25.md`

**Interfaces:**
- Consumes: `CAPS_ROLES` entries with `px`, from Task 02.
- Produces: either a `weight` property on every `CAPS_ROLES` entry (clean branch), or a findings
  file (divergent branch). Task 09 must know which: on the clean branch §3's caps table is fully
  asserted and can say so; on the divergent branch it must not claim that.

**Acceptance criteria:**
- §3's published weights: wordmark 800; plate button label 800; section header 800; account plate
  initials 800; ledger head / detail-marks label / shared ribbon caps / ledger date labels 800;
  Overprint Stamp 800; field label and field counter 700.
- **Do not change any rendered weight in this task.** A divergence found here is a finding, not a
  defect to fix in passing — that is the exact mechanism the spec exists to stop.

- [ ] **Step 1: Add the weight assertion**

Add `weight: 800` to every `CAPS_ROLES` entry except `field label`, which takes `weight: 700`.
Destructure it in the loop header and assert beside the size:

```js
      // Probed rather than assumed: §3 publishes a weight per role and nothing has ever computed
      // one. If this is clean it stays; if it is not, the divergences are findings for their own
      // pass, and this assertion comes back out.
      if (measured.fontWeight !== weight) {
        trackingViolations.push(`${role}: weight ${measured.fontWeight}, expected ${weight}`);
      }
```

and add `fontWeight: Number.parseInt(style.fontWeight, 10),` to the object returned by the
in-page `page.evaluate`, beside `fontSize`.

- [ ] **Step 2: Run it and read the result**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn check:browser 2>&1 | tee /tmp/t03.log; grep -F 'weight' /tmp/t03.log
```

- [ ] **Step 3a: CLEAN BRANCH — no weight violations**

Keep the assertion. Prove it is not a no-op: change `font-extrabold` to `font-bold` on
`src/pages/Login.jsx`'s wordmark, `git diff --stat` to confirm the mutation landed, re-run, watch
it report `weight 700, expected 800`, then `git checkout -- src/pages/Login.jsx`.

Run the full verification chain. Commit message:

```
test(web-client-v3): the caps manifest computes all three published values

§3 publishes a size, a weight and a tracking per caps role; the manifest
computed one. Probed rather than assumed, weight came back clean across
every role, so the assertion stays and §3's caps table is now checked in
full rather than in third.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

- [ ] **Step 3b: DIVERGENT BRANCH — one or more roles report the wrong weight**

Revert the weight half only, leaving Task 02's `px` assertion in place:

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && git checkout -- scripts/check-browser.mjs
```

**Do not adjust any rendered weight.** Create
`docs/ui-design/caps-weight-findings-2026-08-25.md` recording, for each divergent role: the role
name, the route measured, §3's published weight, the computed weight, and the source site with its
anchor string. State at the top that these were found by a probe run during the reconciliation pass,
that they are outside its 42 findings, and that the assertion was withdrawn rather than the code
changed — because a divergence discovered while applying old findings is a new finding, and folding
it in silently is how §3's caps table grew the problem the pass repairs.

Run the full verification chain. Commit message:

```
docs(ui-design): §3 publishes weights nothing has ever computed

A probe added the weight assertion the caps manifest lacks and found N
roles rendering a weight §3 does not publish for them. The assertion is
withdrawn rather than the code changed: these are outside the 42 findings
this pass applies, and folding them in silently is how the caps table grew
the problem the pass exists to repair.

Recorded so the next pass starts from a measurement rather than a guess.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 04: The skeleton frame that reintroduced the fill §5 removed

Finding 1.8.

**Files:**
- Modify: `src/pages/LibraryBrowse.jsx` (anchor: `h-[72px] w-12 border-2 border-ink bg-paper-deep`)
- Test: `src/pages/LibraryBrowse.test.jsx`

**Interfaces:**
- Consumes: `renderApp`, `stubFetch` from `@/test/appHarness.jsx` (already used by that test file).
- Produces: a `data-skeleton="frame"` attribute on the skeleton's frame element, matching the
  codebase's existing `data-edge` / `data-mark` convention. Task 12 documents the bar/frame
  distinction in §6.

**Acceptance criteria:**
- §5: *"'Ruled' means the rule and nothing else — the empty frame carries no fill."*
- **Only the frame changes.** The line skeletons keep `bg-paper-deep`: a bar standing in for a line
  of text is not a filled rectangle where artwork belongs, which is the failure §5 names.
  `ItemDetail` already draws exactly this distinction — an unfilled frame with `bg-cover-rule/25`
  bars — and after this change the two screens agree.
- **The probe must hold the loading state open.** A pending fetch that resolves inside a tick makes
  the test pass or fail on scheduling rather than on behaviour; the window is the whole subject.

- [ ] **Step 1: Confirm the anchor**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && grep -cF -- 'h-[72px] w-12 border-2 border-ink bg-paper-deep' src/pages/LibraryBrowse.jsx
```

Expected: `1`.

- [ ] **Step 2: Write the failing test**

Append to `src/pages/LibraryBrowse.test.jsx`:

```jsx
describe('LibraryBrowse loading skeleton', () => {
  afterEach(() => vi.unstubAllGlobals());

  // The fetch is held PENDING for the whole test rather than resolved: the skeleton is a
  // transient state, and a probe that races the resolution asserts scheduling rather than
  // behaviour. The window is the whole subject.
  it('rules the skeleton frame and does not fill it', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderApp('/libraries/lib-fiction');

    // `data-skeleton`, queried directly, rather than `data-testid`: this codebase marks nodes for
    // machines with `data-edge` / `data-mark`, and nothing configures a testIdAttribute
    // (verified — the default `data-testid` is in force but unused here). Follow the convention.
    let frame;
    await waitFor(() => {
      frame = document.querySelector('[data-skeleton="frame"]');
      expect(frame).not.toBeNull();
    });
    // DESIGN.md §5: "'Ruled' means the rule and nothing else — the empty frame carries no fill."
    // The bars beside it keep theirs; a bar is not a frame.
    expect(frame.className).toContain('border-2');
    expect(frame.className).not.toContain('bg-paper-deep');
  });
});
```

`waitFor` and `screen` are already imported by this file; add `waitFor` to the import if the
skeleton block is placed before the existing one.

- [ ] **Step 3: Run it and watch it fail**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/pages/LibraryBrowse.test.jsx 2>&1 | tee /tmp/t04a.log; tail -25 /tmp/t04a.log
```

Expected: FAIL. If it fails because the element is not found at all, the skeleton is not reached —
fix the harness before touching the source, or the next step will make a red test green for the
wrong reason.

- [ ] **Step 4: Remove the fill and give the frame its anchor**

In `src/pages/LibraryBrowse.jsx`'s `SkeletonRow`:

```jsx
    {/* Ruled and NOT filled: §5's empty frame carries the rule and nothing else, and this
        skeleton stands in for exactly that frame. The bars below keep their fill — a bar
        stands in for a line of text, not for artwork, which is the case §5 names. ItemDetail's
        skeleton already draws this distinction; the two screens now agree. */}
    <span data-skeleton="frame" className="h-[72px] w-12 border-2 border-ink" />
```

- [ ] **Step 5: Run it and watch it pass**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/pages/LibraryBrowse.test.jsx 2>&1 | tee /tmp/t04b.log; tail -10 /tmp/t04b.log
```

- [ ] **Step 6: Confirm the bars were not touched**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && grep -cF -- 'bg-paper-deep' src/pages/LibraryBrowse.jsx
```

Expected: `5` (three skeleton bars plus two error blocks) — one fewer than before. If it is `2`, the
bars were removed too, which this task forbids.

- [ ] **Step 7: Run the full verification chain, then commit**

```
fix(web-client-v3): the skeleton reintroduced the fill the frame had removed

§5 says a ruled frame carries the rule and nothing else, and the browse
skeleton stood in for that frame with precisely the `bg-paper-deep` fill
VolumeFrame had shed — a filled rectangle where artwork belongs, which §6
forbids outright.

The bars keep their fill: a bar stands in for a line of text, not for
artwork. ItemDetail's skeleton already made that distinction, arguing for
it in place; the two screens now agree instead of contradicting.

The probe holds the fetch pending for its whole life. A skeleton is a
transient state, and a test that races the resolution asserts scheduling
rather than behaviour.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 05: Two empty states that are not §6's empty state

Finding 1.9.

**Files:**
- Modify: `src/pages/Libraries.jsx` (anchor: `caps border-b-2 border-ink p-4 text-xs`)
- Modify: `src/pages/UnshareLibrary.jsx` (anchor: `caps p-4 text-xs font-bold text-ink-soft`)
- Test: `src/pages/Libraries.test.jsx`, `src/pages/UnshareLibrary.test.jsx`

**Interfaces:**
- Consumes: `PlateButton` from `@/components/imprint/PlateButton.jsx` (already imported by
  `Libraries.jsx` for its bottom-bar primary — check before adding an import).
- Produces: nothing later tasks rely on.

**Acceptance criteria:**
- §6: *"Empty | A **ruled frame** with a caps invitation, **at the same weight as a full block**."*
  `LibraryBrowse` is the reference construction: `m-4 border-2 border-ink p-8 text-center`.
- **The two differ deliberately.** The home state carries the new-library `PlateButton` — it is an
  empty state with an action, and §6's frame exists to hold an invitation. The unshare state carries
  **no** action: nothing on that screen can share a library, and adding a control that navigates
  away from the task would be inventing an affordance to fill a frame.
- §6 also requires *recovery is a control, never an instruction to perform a gesture* — so the home
  state's copy must not point at the bar below it.
- Both screens keep their `<main>` and `<h1>`.

- [ ] **Step 1: Confirm the anchors**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'caps border-b-2 border-ink p-4 text-xs' src/pages/Libraries.jsx
grep -cF -- 'caps p-4 text-xs font-bold text-ink-soft' src/pages/UnshareLibrary.jsx
grep -n 'PlateButton' src/pages/Libraries.jsx | head -3
```

Expected: `1`, `1`, and at least one `PlateButton` line (so no new import is needed).

- [ ] **Step 2: Write the failing test for the home empty state**

Append inside `describe('Libraries', …)` in `src/pages/Libraries.test.jsx`:

```jsx
  // §6: an empty state is a RULED FRAME with a caps invitation, at the same weight as a full
  // block. This one was a 12px `--ink-soft` line under a rule — quieter than the 22px/700 rows
  // it replaces, which is the opposite of the rule — on the app's home screen, so it is the
  // reader's first impression of the product.
  it('gives the empty home screen a ruled frame and its own control', async () => {
    respondWith({ libraries: [] });
    renderPage();

    const invitation = await screen.findByText(/no libraries yet/i);
    const frame = invitation.closest('div');
    expect(frame.className).toContain('border-2');
    expect(frame.className).toContain('border-ink');
    // §6: recovery is a control, never an instruction to perform a gesture elsewhere.
    // SCOPED to the frame with `within`, because the bottom bar's primary carries the same name.
    // That duplication is intended and has a precedent stated in LibraryBrowse: the empty state's
    // control duplicates the existing one rather than replacing it, reached a different way.
    expect(within(frame).getByRole('button', { name: /new library/i })).toBeInTheDocument();
    expect(screen.queryByText(/below/i)).toBeNull();
  });
```

`PlateButton` is **always a `<button>`** — verified: it renders `<button type="button">` and takes
no `to`. So this is `getByRole('button', …)`, and `within` must be added to this file's
`@testing-library/react` import.

- [ ] **Step 3: Write the failing test for the unshare empty state**

Append inside the existing `describe` in `src/pages/UnshareLibrary.test.jsx`:

```jsx
  it('frames the not-shared state, and offers no action, because this screen cannot share', async () => {
    // The mocked library above carries two recipients; this case needs none.
    const { rerender } = renderPage();
    rerender(<div />);
    // Re-mock with an unshared library and render again.
  });
```

**Replace that stub before running it** — the mock is module-level, so the honest form is a second
`vi.mock` factory keyed on a mutable object. Change the existing mock at the top of the file to read
from a mutable `library` binding, then in this test set `library.sharedTo = []` before
`renderPage()`, and assert:

```jsx
    const notice = await screen.findByText(/not shared with anyone/i);
    const frame = notice.closest('div');
    expect(frame.className).toContain('border-2');
    expect(frame.className).toContain('border-ink');
    expect(screen.queryByRole('button', { name: /share/i })).toBeNull();
```

- [ ] **Step 4: Run both and watch them fail**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/pages/Libraries.test.jsx src/pages/UnshareLibrary.test.jsx 2>&1 | tee /tmp/t05a.log; grep -nE 'FAIL|×|✕' /tmp/t05a.log | head
```

- [ ] **Step 5: Rebuild both empty states**

`src/pages/Libraries.jsx`:

```jsx
              {owned.length === 0 && (
                {/* §6's empty state: a ruled frame with a caps invitation at the same weight as a
                    full block. This was a 12px `--ink-soft` line — quieter than the rows it stands
                    in for — on the screen a cold open lands on. The control is IN the frame rather
                    than pointed at from it (§6: recovery is a control, never an instruction). */}
                <div className="m-4 border-2 border-ink p-8 text-center">
                  <p className="caps text-xs font-bold text-ink-soft">No libraries yet</p>
                  <PlateButton className="mt-4" onClick={() => navigate('/libraries/new')}>
                    New library
                  </PlateButton>
                </div>
              )}
```

`navigate` is already in scope in this file — the bottom bar's primary uses exactly this
construction. `PlateButton` renders a `<button>` and has no `to` prop.

`src/pages/UnshareLibrary.jsx`:

```jsx
        {recipients.length === 0 && (
          {/* The same §6 frame as the home screen, and deliberately WITHOUT an action: nothing on
              this screen can share a library, and a control that navigates away from the task would
              be an affordance invented to fill a frame. §6 requires an invitation at full weight,
              not that one exists where there is nothing to invite. */}
          <div className="m-4 border-2 border-ink p-8 text-center">
            <p className="caps text-xs font-bold text-ink-soft">This library is not shared with anyone</p>
          </div>
        )}
```

- [ ] **Step 6: Run both and watch them pass**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/pages/Libraries.test.jsx src/pages/UnshareLibrary.test.jsx 2>&1 | tee /tmp/t05b.log; tail -10 /tmp/t05b.log
```

- [ ] **Step 7: Run the full verification chain, then commit**

```
fix(web-client-v3): the home screen's empty state was quieter than the rows it replaced

§6 asks an empty state to be a ruled frame carrying a caps invitation at
the same weight as a full block. The libraries root printed a 12px
`--ink-soft` line under a rule — lighter than the 22px/700 rows it stands
in for, which is the rule inverted — and it is the first thing a reader
with no libraries ever sees. UnshareLibrary had a third variant with no
rule at all.

Both take LibraryBrowse's construction now, and they differ in one respect
on purpose: the home frame carries the new-library control, because §6's
frame exists to hold an invitation; the unshare frame carries none, because
nothing on that screen can share a library and a control that leaves the
task would be an affordance invented to fill a frame.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 06: The shared count in the sans, past a manifest that never listed it

Finding 2.3b.

**Files:**
- Modify: `src/components/imprint/SharedRibbon.jsx` (anchor: `Shared · {count}`)
- Modify: `scripts/check-browser.mjs` (anchor: `const MONO_FIELDS = [`)
- Create: `src/components/imprint/SharedRibbon.test.jsx`

**Interfaces:**
- Consumes: `fixtureLibraries` — already imported in `check-browser.mjs` as
  `import { libraries as fixtureLibraries } from '../src/test/fixtures/libraries.js'`.
- Produces: `SharedRibbon` renders its count inside `<span className="num">`.
  `monoFieldCoverage.test.js` reads the new manifest entry and asserts its `sourceFile` contains a
  `.num` — which this change satisfies.

**Acceptance criteria:**
- §3's boundary: a **labelled datum** takes the mono; a numeral in running prose does not. A count
  beside its own label is a datum.
- The site's own comment already says so — *"Mono is for the count, not the word or the address"* —
  and the fix that removed the mono from the word and the address never put it back on the count.
- **`FROM <owner>` is unaffected.** An address is content, never mono.
- The manifest's convention is to read `expected` **from the fixture**, never to retype it: a
  retyped literal forks the substrate.

- [ ] **Step 1: Confirm the anchors**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'Shared · {count}' src/components/imprint/SharedRibbon.jsx
grep -cF -- 'const MONO_FIELDS = [' scripts/check-browser.mjs
grep -n 'sharedTo' src/test/fixtures/libraries.js
```

Expected: `1`, `1`, and Fiction carrying two recipients.

- [ ] **Step 2: Write the failing unit test**

Create `src/components/imprint/SharedRibbon.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SharedRibbon from './SharedRibbon.jsx';

describe('SharedRibbon', () => {
  // A count beside its own label is a labelled datum, which §3 puts in the mono. This
  // component's own comment said so — "Mono is for the count, not the word or the address" —
  // and the change that took the mono off the word and the address never put it on the count.
  it('sets the outbound count in the mono and the word in the sans', () => {
    render(<SharedRibbon direction="out" count={3} />);
    const figure = screen.getByText('3');
    expect(figure.className).toContain('num');
    expect(screen.getByText(/shared/i).className).not.toContain('num');
  });

  // An address is content, never a numeral. This is the regression the mono guard caught once.
  it('never sets the owner address in the mono', () => {
    render(<SharedRibbon direction="in" owner="marie@example.com" />);
    expect(screen.getByText('marie@example.com').className).not.toContain('num');
  });
});
```

- [ ] **Step 3: Run it and watch the first case fail**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/components/imprint/SharedRibbon.test.jsx 2>&1 | tee /tmp/t06a.log; tail -25 /tmp/t06a.log
```

Expected: the mono case fails (`getByText('3')` finds the whole `Shared · 3` node, whose className
has no `num`); the address case passes.

- [ ] **Step 4: Put the count in the mono**

In `src/components/imprint/SharedRibbon.jsx`:

```jsx
  if (direction === 'out') {
    // The COUNT is a labelled datum and takes the mono (§3); the word beside it does not. This
    // component's comment has always said so, and the change that correctly took the mono off
    // the word — and off the owner's address — did not put it back on the figure.
    return (
      <span className={tone}>
        Shared · <span className="num">{count}</span>
      </span>
    );
  }
```

- [ ] **Step 5: Run it and watch both pass**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/components/imprint/SharedRibbon.test.jsx 2>&1 | tee /tmp/t06b.log; tail -10 /tmp/t06b.log
```

- [ ] **Step 6: Add the manifest entry, reading the value from the fixture**

In `scripts/check-browser.mjs`, inside `MONO_FIELDS`:

```js
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
      },
```

- [ ] **Step 7: Run the browser check and the coverage alarm**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3
yarn test src/monoFieldCoverage.test.js 2>&1 | tee /tmp/t06c.log; tail -8 /tmp/t06c.log
yarn check:browser 2>&1 | tee /tmp/t06d.log; grep -F 'FAIL' /tmp/t06d.log || echo 'no browser failures'
```

Expected: both green.

- [ ] **Step 8: Run the full verification chain, then COMMIT — before demonstrating the guard**

The order matters and it is not the obvious one. The demonstration below restores with
`git checkout --`, which reverts to the last **committed** state. Run it while the fix is still
uncommitted and the checkout discards the fix along with the deliberate break. Task 02's
implementer hit exactly that and caught it only because a later verification run went red.

So: chain green, commit, and only then break something that is safely in git.

- [ ] **Step 9: Prove the manifest entry is not a no-op**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3
sed -i '' 's|Shared · <span className="num">{count}</span>|Shared · {count}|' src/components/imprint/SharedRibbon.jsx
git diff --stat src/components/imprint/SharedRibbon.jsx
```

Expected: the file shows as modified. **Confirm this before continuing** — a no-op `sed` and a
robust guard produce identical evidence. Then `yarn check:browser` must FAIL naming `shared-out
count … not Chivo Mono`. Restore with `git checkout -- src/components/imprint/SharedRibbon.jsx`,
confirm `git diff --stat` is empty, and re-run `yarn check:browser` once to confirm the restore
put the fix back rather than merely removing the break.

```
fix(web-client-v3): the shared count in the sans, past a manifest that never listed it

A count beside its own label is a labelled datum, and §3 puts those in the
mono. SharedRibbon's own comment says exactly that — "Mono is for the
count, not the word or the address" — and the change that correctly took
the mono off the word and off the owner's address never put it back on the
figure it was describing.

MONO_FIELDS exists so a field like this fails with zero registration, and
it could not: the field was not in it. It is now, reading its value from
the fixture rather than a literal, and the entry was demonstrated to go
red on the sans before being accepted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 07: A gap off the division, and a stale comment above a live one

Findings 2.8 and 2.9. Small, unrelated to each other, and both too small to justify their own
review gate.

**Files:**
- Modify: `src/components/imprint/SearchField.jsx` (anchor: `field-control mt-3`)
- Modify: `src/typeScale.test.js` (anchor: `16px anywhere else is a violation`)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

**Acceptance criteria:**
- §4: *"gaps between blocks … are whole divisions, always."* The division is 8px. `mt-3` is 12px —
  three base units, 1.5 divisions.
- `RowActions`' `gap-[3px]` and `PlateLine`'s `mt-[3px]` are **typographic interiors**, which §4
  explicitly permits. Do not touch them.
- This moves the loudest mark in the design down 4px. That is the intended, visible consequence.
- The `typeScale.test.js` paragraph being deleted is superseded by the block directly beneath it
  (*"AN INPUT, not a file"*), which is what the code does. Delete the stale one only; leave the
  live one intact.

- [ ] **Step 1: Confirm the anchors and that no other layout gap is off the division**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'field-control mt-3' src/components/imprint/SearchField.jsx
grep -cF -- '16px anywhere else is a violation' src/typeScale.test.js
grep -rnE '\b(m|p|gap)(t|b|l|r|x|y)?-(3|5|7|9|11)\b' --include='*.jsx' src | grep -v '\.test\.'
```

The third command lists every odd-numbered spacing utility. Expected: the `SearchField` line, plus
any typographic interiors. **If it lists a layout-scale gap other than `SearchField`'s, report it
rather than fixing it** — it is outside this pass's 42.

- [ ] **Step 2: Write the failing test**

Append to `src/components/imprint/SearchField.test.jsx`:

```jsx
  // §4: gaps between blocks are whole divisions, always. The division is 8px, and `mt-3` is
  // 12px — 1.5 divisions. The only layout-scale gap in the app that was off the scale, on the
  // loudest mark in the design.
  it('sits a whole division from the block above it', () => {
    const { container } = renderLauncher();
    expect(container.querySelector('.field-control').className).toContain('mt-4');
  });
```

`renderLauncher` is the helper this file already defines — verified. Do not invent a second one.

- [ ] **Step 3: Run it and watch it fail**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && yarn test src/components/imprint/SearchField.test.jsx 2>&1 | tee /tmp/t07a.log; tail -20 /tmp/t07a.log
```

- [ ] **Step 4: Make both changes**

In `src/components/imprint/SearchField.jsx`, `mt-3` → `mt-4`, with:

```jsx
      // A whole division (§4). This sat at `mt-3` — 12px, 1.5 divisions — the only layout-scale
      // gap in the app off the scale, on the one mark the product's first principle is about.
```

In `src/typeScale.test.js`, delete the superseded paragraph ending *"16px anywhere else is a
violation"*, leaving the block beneath it that begins *"AN INPUT, not a file"*. A stale comment
sitting above the live one is the hazard `index.css` records paying for, and it was inside a guard.

- [ ] **Step 5: Run the full verification chain, then commit**

```
fix(web-client-v3): a gap at 1.5 divisions on the loudest mark in the design

§4 says layout gaps are whole divisions, always. The search field sat at
`mt-3` — 12px against an 8px division — and it was the only layout-scale
gap in the app off the scale. The field moves down 4px, which is the point.

Also drops a superseded paragraph in typeScale.test.js that sat directly
above the block reversing it. Both were present and only the later one
described the code — a stale comment above a live one, inside a guard, which
is the exact hazard index.css records paying for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 08: `DESIGN.md` §2 — the palette's four corrections

Findings 1.5a, 1.7, 1.12, and List 3 #1 and #19.

**Files:**
- Modify: `packages/web-client-v3/DESIGN.md` (§2 only)

**Interfaces:**
- Consumes: Task 01's corrected sites (this section describes them as they now are).
- Produces: the scoped yellow law that Task 10's §5 entries and Task 12's §6 rows rely on.

**Acceptance criteria:**
- Do not edit §3–§8 in this task; each has its own.
- Every contrast figure written here must be one `tokens.test.js` already asserts, or be labelled as
  computed and where from. This table's numbers are facts, not estimates.

- [ ] **Step 1: Add the missing contrast row**

In §2's contrast table, add a row for `--imprint` on `--ink` at **11.71:1**, used for *marks and
headings on the black cover*. Note in the cell that this is the same figure the table already prints
for the inverse pair, and that **its absence is why the yellow law below reads as palette-wide**.

- [ ] **Step 2: Scope the yellow law to paper**

Rewrite *"Yellow never carries a shape by itself"* so the claim is bounded to **paper grounds**, and
say why: the measurement behind it is `--imprint` on `--paper` at ~1.55:1, and the cover is a
different surface where the same colour clears 11.71:1. Name the three sites that rely on the cover
case so a later pass does not strip them — the back Mark when inverted (`AppHeader`), the
`THE RECORD` ledger heading, and the title rules. Record that `Login`'s notice was the one paper
site relying on the unscoped reading, that it measured ~1.42:1 on `--paper-deep`, and that it is
fixed rather than exempted.

- [ ] **Step 3: Restate the ground/foreground rule as what is enforced**

Replace *"in the same rule"* with: **a ground's text is coloured at or below it, and never inherited
across a surface boundary.** State that `groundForeground.test.js` passes any surface whose
text-bearing descendants each declare their own foreground — which is what `UpdateNotice` does — and
that this weaker rule is what actually prevents the 1.08:1 Sheet bug the section was written for.
Keep the account of that bug; only the rule sentence changes.

- [ ] **Step 4: Add the inverse case**

Add a paragraph recording the case §2 has never stated: **a foreground over a ground the design does
not own.** Cite `CaptureCaption` and its measured range against a live camera feed (1.45:1–5.1:1),
and its own framing — *"here nothing set a ground at all, which is the same defect arriving from the
other side"*. Say what the remedy is: the caption paints its own ground rather than trusting the
feed.

- [ ] **Step 5: Redefine `--ink-soft`, and record `on-imprint`**

Change the palette-law row for `--ink-soft` from *"Secondary content only … Never structure"* to
**the quiet register: secondary content and the quiet marks that serve it**, with structural rules
staying `--ink`. Name the sites this describes — the back Mark on paper, the select chevron, every
quiet caps label — and note that §6 itself already breached the old wording. Then add a short note
that `on-imprint` is a **deliberate no-op** kept as an anchor for ~15 call sites after the focus ring
stopped needing it, flagged in `index.css` and invisible here until now.

- [ ] **Step 6: Verify the section says what it should, and no longer says what it should not**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- '11.71:1' DESIGN.md            # expect 3 or more: the two existing uses plus the new row
grep -cF -- 'in the same rule' DESIGN.md   # expect 0
# Expect 0, NOT 1. `--cover-rule`'s row reads "Structure only, never text" — a different string —
# so this counter goes 1 -> 0. Expecting 1 would fail on correct work, which is the crying-wolf
# opening that gets a check deleted rather than fixed.
grep -cF -- 'Never structure' DESIGN.md    # expect 0
grep -cF -- 'Structure only, never text' DESIGN.md  # expect 1 — --cover-rule keeps its own, unchanged
grep -cF -- 'CaptureCaption' DESIGN.md     # expect 1 or more
grep -cF -- 'on-imprint' DESIGN.md         # expect 1 or more
```

- [ ] **Step 7: Run `yarn test` and `yarn lint`, then commit**

No guard reads `DESIGN.md`, so this is a regression check rather than a verification of the edit.

```
docs(design): §2 legislated against three things the build does correctly

The yellow law was written palette-wide and measured on paper only, so it
condemned three cover sites that clear 11.71:1 — a figure the contrast
table prints for the inverse pair and never carried for this one. Scoped to
paper, with the missing row added, and the one paper site that relied on the
unscoped reading fixed rather than exempted.

"Anything that sets a ground sets its foreground, in the same rule" is
stricter than the guard that enforces it and stricter than it needs to be:
what prevents the 1.08:1 Sheet bug is that no text inherits across a surface
boundary. The document now says that.

`--ink-soft` said "never structure" while the back Mark, the select chevron
and every quiet caps label in the app used it, and §6 breached the wording
one section later. It means the quiet register.

And §2 gains the inverse case it never had, which CaptureCaption found
against a live camera feed: a foreground over a ground the design does not
own is the same defect arriving from the other side.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 09: `DESIGN.md` §3 and §4 — the tables that describe the wrong element

Findings 2.1, 2.3a, 2.4, 2.7, plus List 3 #10, #14, #16, #18, and the shared-ribbon ruling from the
spec's §2.4.

**Files:**
- Modify: `packages/web-client-v3/DESIGN.md` (§3 and §4 only)

**Interfaces:**
- Consumes: Task 02's `CAPS_ROLES` entries — §3's caps table must publish exactly the roles and
  values that manifest now asserts, or the two drift apart immediately.
- Consumes: Task 03's outcome. On the clean branch §3 may state that its caps table is computed in
  full; on the divergent branch it must **not** claim that, and should point at the findings file.
- Produces: the two shared-ribbon roles Task 10's §5 entry cross-references.

**Acceptance criteria:**
- §3's caps table is a **manifest**, and an unlisted role is an unchecked role. Every row must match
  what `CAPS_ROLES` asserts.
- A blank cell in a spec table is not a value. Every cell carries a number or the explicit word
  `none`.
- The type scale steps are 10, 11, 12, 13, 14, 17, 20, 22, 32, 76 — do not add one.

- [ ] **Step 1: Correct §3's two wrong rows**

The **search field input** row says 13px; the build sets 16px and is right (Mobile Safari zooms
below 16). Correct it, and widen the exception paragraph from `Field`'s three controls to **any
input** — `typeScale.test.js` already enforces the wider rule, so the document is the last holdout.

The **library row sub** row in the mono table says mono / 400 / tabular. Replace it with a pointer to
the new caps row added in Step 2: the sub-line is a caps tag in the sans, not a datum. Keep *"a
library's item count"* in the mono list — that is the **plate**, which does set `.num`.

- [ ] **Step 2: Split the shared-ribbon caps role in two**

Replace §3's single row covering `shared ribbon caps` with two:

- `shared ribbon caps (detail marks, search row)` — **10 / 800 / +0.16em**
- `library row sub-line (shared ribbon on a row)` — **11 / 700 / +0.16em**

Record why both exist: one component, two surfaces, and the values differ by surface class rather
than by accident. Record that the manifest measured the first against the second's row and stayed
green because the tracking coincides — a true measurement of the wrong substrate inside the guard —
and that both are now asserted.

- [ ] **Step 3: Add the section-head count to §3**

`Libraries.jsx`'s `StreamHead` sets a `.num tracking-normal text-ink-soft` figure at the right of
`MINE` and `SHARED WITH ME`. §3 gives the section header a size and a tracking and no figure. Add
it, and note that `tracking-normal` is a **declared** zero, which is what a blank cell cannot express.

- [ ] **Step 4: Add §4's stream row and restate the rule weights**

Add the **stream row** to §4's row-height table: `ItemRow` sets no height, and `p-4` plus a 72px
frame gives **104px** — 13 divisions — confirmed by `index.css`'s `contain-intrinsic-size: auto
104px`. Note that the app's densest and most repeated element was described by neither existing row.

Restate the rule-weight table by **what a rule separates** rather than by "hairline separators inside
a block": 1px between rows in a dense stream (`ItemRow`); 2px between blocks, around volume frames
and under fields (`LibraryRow`, `CollectionBoard`'s head, `AppHeader`'s bottom edge); 3px block
frames, boards and bottom-anchored panels; 4px index rules and the hero title rule.

- [ ] **Step 5: Add §4's three missing facts**

**The empty-fold branch:** `lib/sort.js` falls back to the **raw** first character when a title's
first character is a bare combining mark and the fold yields nothing. §4 currently says "always the
actual folded first character", with no exception.

**The two capture viewports are deliberately not 2:3:** `BarcodeScanner` is full-width × 192px and
`CoverCapture` full-width × 240px, both landscape. §4's frame law is written about *items*; a
viewfinder is a different subject, and `ui-v3.md` argues both at length while `DESIGN.md` mentions
no capture frame at all. Say explicitly that this asymmetry is deliberate and must not be
harmonised.

**`.row-skip`:** `content-visibility: auto` with `contain-intrinsic-size: auto 104px`, carrying a
hard constraint — it must never wrap a sticky index letter, and boards are excluded because a wrong
intrinsic size drifts the scroll on a continuation merge.

- [ ] **Step 6: Verify**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'library row sub' DESIGN.md          # the mono row is now a pointer, not a spec
grep -cF -- 'shared ribbon caps (detail marks' DESIGN.md   # expect 1
grep -cF -- 'library row sub-line' DESIGN.md     # expect 1 or more
grep -cF -- '104px' DESIGN.md                    # expect 2 or more
grep -cF -- 'row-skip' DESIGN.md                 # expect 1 or more
# The real row text. `| Search field input | 13 |` was checked and is 0 BEFORE the change too —
# a grep that reads the same on both sides of an edit cannot report anything.
grep -cF -- 'Search field input, ledger name row' DESIGN.md   # expect 0 (it is 1 today)
```

Then cross-check the caps table against the guard, which is the point of the task:

```bash
grep -A 12 "const CAPS_ROLES" scripts/check-browser.mjs | grep -oE "role: '[^']+'"
```

Every role listed must appear in §3's caps table with the same px and em.

- [ ] **Step 7: Run `yarn test` and `yarn lint`, then commit**

```
docs(design): §3 and §4 described elements the build does not have

§3's caps table published one shared-ribbon role for a component that
renders at two sizes on two surface classes, and the browser manifest
measured the row instance against the mark-column's row — green only
because both sit at +0.16em. Two roles now, both published and both
asserted.

The search-field row still said 13px against a 16px input that is
load-bearing platform behaviour, and the mono table described the library
row's sub-line a second time, as mono/400, which it has never been.

§4 gained the stream row — 104px, the app's densest and most repeated
element, described by neither existing height — and its rule weights are
restated by what a rule separates rather than by a single "hairline inside
a block" line three structural separators contradict.

Plus three facts §4 never carried: the index fold's raw-character fallback,
the two capture viewports being deliberately not 2:3, and `.row-skip`'s
containment with the sticky constraint that governs it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 10: `DESIGN.md` §5 — twelve entries that describe the wrong build

Findings 1.2, 1.3, 1.11, 1.13, 2.5, 2.6, 2.9, and List 3 #3, #11, #12, #13, #21.

**Files:**
- Modify: `packages/web-client-v3/DESIGN.md` (§5's existing rows only; new rows are Task 11)

**Interfaces:**
- Consumes: Task 08's scoped yellow law (the Detail Marks entry cites it) and Task 09's two
  shared-ribbon roles.
- Produces: the corrected §5 that Task 12's §6 rows reference for the Error constructions.

**Acceptance criteria:**
- Where the code carries a reasoned comment, the document records **the reason**, not just the
  value. A value without its reason gets reverted by the next reader.
- Do not add new component rows here — Task 11 owns those.

- [ ] **Step 1: Correct the twelve entries**

**Volume Frame** — three sizes, all exactly 2:3: `row` 48×72, `candidate` 88×132, `hero` 132×198.
The candidate size exists because on the results screen the picture is what decides the match.

**Volume Plate** — the member order plate departs twice, both justified in `VolumeFrame.jsx`: a
`--paper` fill so it reads over artwork, and a 1px rule because 2px around a figure that small is
mud. §3 records the 1px; §5 records neither.

**Collection Board** — drop **"expandable in place"**: members render unconditionally and no expand
state exists anywhere in `src/`. Add **`CONTINUES`**, the one label on an orphaned partial board,
which `ui-v3.md` §4 specifies and §5 does not.

**Overprint Stamp** — name both variants. Paper: `opacity-[0.92]`, caps in `--ink`, `px-[6px]
py-[2px]`. Inverted: `px-[5px] py-px`, caps in `--paper`, full opacity, because there is no paper
ground on the cover for the opacity trick to read against.

**Ledger Row** — it renders an Overprint Stamp on an open loan when boxed. Record the reason: on the
paper ledger card an open loan had no mark at all, since the comp's "brighten the line" treatment
has nowhere to go where `--ink` is already the top tone, and palette law permits no eleventh token.

**Plate Button** — the destructive variant's caps are **`currentColor`, not `--out`**. `--out` is
4.11:1 on paper, so a red label would be the least legible text in the app on the one control where
a misread costs most. §2 already agrees; §5 was the stale half and contradicted it inside one
document.

**Field** — name the real surface: the `select` variant with a hand-drawn `ChevronDown` and
`appearance-none`, number-spinner suppression, textarea `resize-none`, the `counter` / `hint` /
`liveHint` / `required` props, and the **inline field-error treatment** (`border-out` on the bottom
rule plus a 13px `--ink` note with `role="alert"`), which is a fourth Error construction.

**Sheet** — one sentence becomes the real mechanism: a `bg-ink/40` scrim, a portal to
`document.body`, `inert` on `#root` with a module-level open-sheet counter, a re-queried focus trap,
focus restoration to the opener, a `Close` Mark inside the panel, and `max-h-[80dvh]` with internal
scroll.

**Index Letter** — its count is a **phrase, not a figure**: the number sets in `.num` and the noun
beside it in the sans.

**Detail Marks** — note the second, non-link variant: `SearchRowMarks` sets `IN <library>` inline on
a search row without a link.

**Marks** — the back Mark is `--ink-soft` on paper and `--imprint` when inverted, which §2's
redefinition (Task 08) now permits on both counts.

**Delete confirmation** — record the construction: a `role="group"` with an `aria-live="assertive"`
description carrying a `border-t-2 border-out` rule, expanding **in place of** the trigger inside the
same action row, with focus moved to the safe option. Record explicitly that it is **not** extracted
into a shared primitive, and why: the two sites differ in surface, in `aria` plumbing and in what
they destroy, so one component would have two mutually exclusive halves.

- [ ] **Step 2: Verify**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'expandable in place' DESIGN.md   # expect 0
grep -cF -- 'CONTINUES' DESIGN.md             # expect 1 or more
grep -cF -- 'currentColor' DESIGN.md          # expect 1 or more
grep -cF -- '80dvh' DESIGN.md                 # expect 1 or more
grep -cF -- '88×132' DESIGN.md                # expect 1 or more
```

- [ ] **Step 3: Run `yarn test` and `yarn lint`, then commit**

```
docs(design): §5 described a build that has moved under it

Twelve entries corrected against the artefact. The board is not expandable
and never has been; the destructive button's caps are currentColor, which
§2 argued for two sections earlier while §5 contradicted it; the stamp has
two variants; the ledger row carries one; the member plate has a fill and a
1px rule; the frame has three sizes.

And four entries were a sentence standing in for a mechanism. Sheet is 193
lines of scrim, portal, inert, focus trap and restoration described in
nine words. Field grew a select, a spinner suppression, four props and a
fourth Error construction. The delete confirmation had no description at
all, including of the reason it is not shared.

Where the code carried a reason, the reason is what got recorded: a value
without one gets reverted by the next reader.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 11: `DESIGN.md` §5 — six components the vocabulary never had

List 3 #1, #2, #4, #5, and the shared-silhouette note.

**Files:**
- Modify: `packages/web-client-v3/DESIGN.md` (§5, new rows)

**Interfaces:**
- Consumes: Task 08's inverse-ground case, which the `CaptureCaption` row cites.
- Produces: nothing later tasks depend on.

**Acceptance criteria:**
- Each entry says what the component is, where it appears, and **the rule it carries** — a §5 entry
  is a rule, not an inventory line.
- `Toast` and `UpdateNotice` are components here; §6 keeps the *policy* about when a toast may be
  used, and the two must not restate each other.

- [ ] **Step 1: Add the six entries**

1. **`CaptureCaption`** — the caps status strip pinned to the bottom edge of both camera viewports
   (`FRAME THE TITLE`, `CODE READ · LOOKING IT UP`). It carries §2's inverse case: it paints its own
   ground because the camera feed is a ground the design does not own. Its rule: **a viewport
   narrates its own lookup, in the caps register, with the feed still running underneath** — no
   spinner, no overlay wash.
2. **`FilingInto`** — the `FILING INTO <name>` mark on the capture and candidate screens. A printed
   mark rather than a toast, so it survives a session of back-to-back scans. Its rule: it appears
   only where nothing else on the screen states the destination — a manual form has a collection
   control and takes no mark.
3. **`FlowMarks`** — the `FILED THIS SESSION · N` tally, same reasoning, with the count in the mono
   as a labelled datum.
4. **`SearchRowMarks`** — the inline `IN <library> · FROM <owner>` tag a search row adds. Its rule:
   the left edge stays free for the Overprint Stamp's `--out` rule, so a shared library is named by
   an inline tag rather than an edge.
5. **`Toast`** — bottom-anchored, `border-t-[3px] border-ink bg-paper-deep`, auto-dismissing.
   Confirmations only; never the sole report of a failure.
6. **`UpdateNotice`** — the `NEW EDITION` notice, the same printed form, **persistent**: it must
   survive being ignored, which is why it is not a toast.

- [ ] **Step 2: Add the shared-silhouette note**

Record that Sheet, Toast and UpdateNotice are all `mx-auto max-w-md`, bottom-anchored,
`border-t-[3px] border-ink bg-paper-deep p-4` — a modal, an auto-dismissing confirmation and a
persistent offer wearing one printed form. State what distinguishes them (a scrim and a focus trap;
auto-dismissal; surviving being ignored), because nothing in §5 does, and a reader meeting the third
one has no way to tell it from the second.

- [ ] **Step 3: Verify**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
for name in CaptureCaption FilingInto FlowMarks SearchRowMarks Toast UpdateNotice; do
  printf '%-16s %s\n' "$name" "$(grep -cF -- "$name" DESIGN.md)"
done
```

Expected: every count ≥ 1.

- [ ] **Step 4: Run `yarn test` and `yarn lint`, then commit**

```
docs(design): six components in the imprint's own language, absent from §5

The vocabulary section had no entry for the strip that narrates a camera
lookup, either mark a cataloguing session prints, the tag a search row
adds, the toast, or the update notice — five of the six carrying rules
stated nowhere else.

CaptureCaption is the one worth the space: it found the case §2 had never
stated, that a foreground over a ground the design does not own is the same
defect arriving from the other side, measured against a live feed.

And the last three share one silhouette — bottom-anchored, max-w-md, 3px
ink top rule on paper-deep — as a modal, an auto-dismissing confirmation
and a persistent offer. Nothing said what distinguished them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 12: `DESIGN.md` §6, §7, §8 — states, a motion that never existed, and a live contradiction

Findings 1.8, 1.10, 1.11, 1.14, 2.11, 1.2's motion half, plus List 3 #6–#9 and the §8 note.

**Files:**
- Modify: `packages/web-client-v3/DESIGN.md` (§6, §7, §8)

**Interfaces:**
- Consumes: Task 10's §5 Error and Field entries, which §6's Error row cross-references.
- Produces: nothing later tasks depend on.

**Acceptance criteria:**
- §8's focus sentence must end up matching §2 exactly. It currently states the **pre-rewrite** rule
  and is the version a reader skimming the accessibility section would apply.
- §7 ends with three motion rows, all of which exist.
- Do not invent a state row for something the build does not render.

- [ ] **Step 1: Correct §6's existing rows**

**On loan** widens past *"item rows only"* to include the boxed Ledger Row's open loan.

**Error** gains its full set: on paper, `border-t-2 border-out bg-paper-deep` (30 sites, exactly as
written); **inside a Sheet**, the same rule on `bg-paper`, because the sheet's own ground is already
`--paper-deep` (5 sites); **on the black cover**, a full `border-2 border-out` box with no ground,
text inherited from the cover root, which is legitimate precisely because no ground is set (4 sites);
and the **inline field error** from §5's `Field` entry. One state, four treatments, one documented.
Record the measured total: 45 `border-out` sites, splitting 30 / 5 / 4, the remainder being the
stamp, the destructive button, the field-error class and the two in-place confirmations.

**The unshare bar has four states, not three**: nothing to unshare → nothing rendered; nothing
selected → hint; over the API's 10-per-request limit → reason; **confirming** → a named
`Remove for good` / `Keep access` pair; otherwise → action. The confirmation is required by §7 and
the document counted before it existed. The height is reserved and no control is ever greyed.

**Permit a tint of a structure token as a skeleton ground** — `bg-cover-rule/25` for line bars, on
the same argument the stamp's row variant already uses: tune the token with opacity rather than mint
an eleventh one.

**Record that a line skeleton is not a frame skeleton**: bars may carry a fill, frames may not. This
is the distinction Task 04 applied.

- [ ] **Step 2: Add §6's four new rows**

**End of list** — `End of the shelf`, a caps line above a top rule in `--ink-soft`.
**Appending** — `Loading more`, `role="status"`, distinct from *Loading*, which is the cold skeleton.
**In-flight capture lookup** — `CaptureCaption`'s busy strings; §6 had no row for a viewport
narrating a request.
**Route-chunk pending** — the `RouteFallback`, which renders the full paper ground plus a working
back control; §6's *Loading* covers content, not code-splitting.

- [ ] **Step 3: Drop §7's collection-expand row**

Remove it, the way the route transition was removed, and say so in the same register: nothing
implements it, and §5's "expandable in place" went with it (Task 10). §7 then describes three
motions, all of which exist.

- [ ] **Step 4: Correct §8's focus sentence**

Replace *"3px `--imprint` at 2px offset, switching to `--ink` on yellow grounds"* with §2's ruling:
`--ink` on paper and on `--imprint`, `--paper` on the black cover, 3px at 2px offset, and offset 0
where an ink rule already exists so focus thickens it rather than drawing a concentric second one.

- [ ] **Step 5: Verify**

```bash
cd /Users/jrsue/dev/repos/alexandria/packages/web-client-v3 && pwd
grep -cF -- 'Collection expand' DESIGN.md        # expect 0
grep -cF -- 'Item rows only' DESIGN.md           # expect 0
grep -cF -- 'at 2px offset, switching to' DESIGN.md   # expect 0 (it is 1 today)
grep -cF -- 'End of the shelf' DESIGN.md         # expect 1 or more
grep -cF -- 'RouteFallback' DESIGN.md            # expect 1 or more
grep -cF -- 'exactly three states' DESIGN.md     # expect 0
```

- [ ] **Step 6: Run `yarn test` and `yarn lint`, then commit**

```
docs(design): §6 named one Error, §7 named a motion nobody built, §8 kept the old ruling

Error has four constructions in the build — on paper, inside a sheet where
the ground is already paper-deep, on the cover where no ground is set at
all, and inline on a field — and §6 described the first. Counted rather
than carried over from the audit: 45 border-out sites, splitting 30/5/4.

The unshare bar grew a confirmation §7 requires, so "exactly three states"
had been false since it was written. And §6 had no row for four states the
reader meets routinely, including a viewport narrating the slowest call in
the product.

§7 loses the collection expand, the same way it lost the route transition:
nothing implements it.

§8 still carried the pre-rewrite focus ring — 3px --imprint at 2px offset —
contradicting §2 in the same document, and it is the version a reader
skimming the accessibility section would apply. That made it worth fixing
here rather than filing as out of scope.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 13: `.claude/ui-v3.md`

List 3 #17, #20, finding 1.2's screen half, and the progress record.

**Files:**
- Modify: `.claude/ui-v3.md` (§3, §4, §7, §8)

**Interfaces:**
- Consumes: Tasks 08–12's corrected `DESIGN.md`; this file cites it and must not contradict it.
- Produces: nothing.

**Acceptance criteria:**
- `ui-v3.md` §4's screen descriptions were the most accurate part of the corpus — the audit found
  four divergences across 21 screens. Do not rewrite what is right.
- §8's progress entry records what was ruled, not what was attempted.

- [ ] **Step 1: §3 — record `AddFlowLayout`**

§3 says *"Sheets, which are not routes"* and has no category for a **route that is not a screen**.
`AddFlowLayout` is a layout route owning the filing session's identity *and* the camera lease for its
whole span — which is why the lease is released on `visibilitychange` rather than per item. Add it.

- [ ] **Step 2: §4 — boards are not expandable**

In LibraryBrowse's entry, remove any implication that a board expands. Members arrive with the
header and render unconditionally.

- [ ] **Step 3: §7 — `AddItemSheet`'s `Back`**

§7 legislates carefully which options that sheet may hold, and `Back` is not among them — because it
is not an option. It is the return path of a nested sheet, present only when the sheet was opened
from another, and unlike `Enter by hand` it does not require the type its siblings supply. Record the
distinction: **an option is scoped by the flow's premise; a return path is not an option.**

- [ ] **Step 4: §8 — record the pass**

Add a progress entry: the reconciliation `DESIGN.md` asks for in its own preamble, applied. 42 live
findings; 8 code changes, 34 document corrections; the build was the stale half 8 times out of 42
and the document 34. Name the two guards widened and what each was blind to. Name the finding that
arrived during planning — `SharedRibbon`'s two caps sizes measured against one published row, green
only because the surfaces coincide at +0.16em.

- [ ] **Step 5: Verify**

```bash
cd /Users/jrsue/dev/repos/alexandria && pwd
grep -cF -- 'AddFlowLayout' .claude/ui-v3.md   # expect 1 or more
grep -cF -- 'expandable' .claude/ui-v3.md      # expect 0
grep -cF -- 'AddItemSheet' .claude/ui-v3.md    # expect 1 or more
```

- [ ] **Step 6: Run `yarn test` and `yarn lint` from the package, then commit**

```
docs(ui-v3): a route that is not a screen, a sheet entry that is not an option

§3 divides the world into routes and sheets and has no category for
AddFlowLayout, which is a layout route owning a filing session's identity
and its camera lease — the reason the lease releases on visibilitychange
rather than per item.

§7 legislates which options AddItemSheet may hold and does not mention
Back, because Back is not an option: it is the return path of a nested
sheet, and unlike `Enter by hand` it needs nothing its siblings supply. An
option is scoped by the flow's premise; a return path is not.

Plus the browse entry drops an expandability the build has never had, and
§8 records what the pass ruled.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Task 14: The reconciliation record stops reading as an open question

**Files:**
- Modify: `docs/ui-design/reconciliation-2026-08-25.md`

**Interfaces:**
- Consumes: every preceding task's outcome, including Task 03's branch.
- Produces: the closed record.

**Acceptance criteria:**
- The file's preamble currently reads *"IT HAS NOT BEEN APPLIED… Each finding is a question for
  whoever next owns those documents."* After this pass that is false, and a document asserting it
  is the stale-comment defect this project keeps paying for.
- **The findings themselves are not rewritten.** They are the evidence; only their status changes.
- The line numbers throughout are pinned to `7bc45f7` and have drifted. Say so in the preamble
  rather than updating 60 citations, and name the two known drifts as examples.

- [ ] **Step 1: Rewrite the preamble**

Record: the pass that ruled on it, its spec path, its date, and the outcome — 42 live findings, 8
code changes, 34 document corrections, 2 already closed before it began. Record that the audit's
List 1 heading assumes the build is the defendant and that the artefact reversed that 34 times.
Record that the line numbers are pinned to `7bc45f7`, with `CollectionBoard`'s member render
(`:33` → `:50`) and the caps manifest (`:1596` → `:1659`) as the known drifts.

- [ ] **Step 2: Add a status column or per-finding status line**

For each of the 46 findings give one of: **code** (with the commit), **document** (with the section),
or **already closed** (with the commit that closed it). Add the finding that arrived during planning
— `SharedRibbon`'s two caps sizes — as an entry marked *found while planning*, and Task 03's outcome
as either *probed clean, asserted* or *probed divergent, filed separately*.

- [ ] **Step 3: Verify**

```bash
cd /Users/jrsue/dev/repos/alexandria && pwd
grep -cF -- 'IT HAS NOT BEEN APPLIED' docs/ui-design/reconciliation-2026-08-25.md   # expect 0
grep -cF -- '7bc45f7' docs/ui-design/reconciliation-2026-08-25.md                   # expect 1 or more
```

- [ ] **Step 4: Final full verification chain, then commit**

Run `yarn test`, `yarn lint` and `yarn check:browser` one last time, all `tee`'d, and record the
final test and check counts in the commit message from the log files rather than from memory.

```
docs(ui-design): the reconciliation is ruled, and the record says so

The file opened by declaring itself unapplied and every finding an open
question for whoever next owned the documents. Both are now false, and a
document asserting a stale fact is the defect this project keeps paying
for — so the preamble records the outcome instead: 42 live findings, 8
code changes, 34 document corrections, 2 closed before the pass began.

The findings are untouched. They are the evidence; only their status
changed.

Its line numbers are pinned to 7bc45f7 and have drifted — CollectionBoard's
member render moved from :33 to :50, the caps manifest from :1596 to :1659
— so the preamble says that rather than pretending 60 citations were
re-resolved.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

