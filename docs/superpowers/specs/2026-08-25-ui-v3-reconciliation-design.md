# Design — applying the v3 reconciliation

Subject: the 44 live findings in `docs/ui-design/reconciliation-2026-08-25.md`, which is the pass
`DESIGN.md`'s own preamble asks for: *"once v3 is built, reconcile this document against what
actually shipped rather than defending it."* The audit produced the findings and ruled on none of
them. This spec is the ruling.

Targets: `packages/web-client-v3/DESIGN.md`, `.claude/ui-v3.md`, `packages/web-client-v3/src`.

---

## 1. What the audit found, and what the rulings came to

The audit filed three lists — 14 rules the build does not follow, 11 values the build changed, 21
constructions the document never named — plus a per-screen pass over `ui-v3.md` §4. Its List 1
heading assumes the build is the defendant.

Read against the artefact it is the other way round. Of 42 live findings (1.1 and 2.10 closed
before this pass began), **8 need a code change** — across 10 source files plus two guard
widenings — and **34 are the document being the stale half**. Every one of List 3's 21 entries is a construction the build needed and the document
has no category for; none is a defect.

That ratio is the finding behind the findings, and it is what the reconciliation was for: a
specification written ahead of code accumulates claims that the build has already answered better.

### Already closed before this pass

| # | Closed by |
|---|---|
| 1.1 — §7's route transition does not exist | `f3f7323`, which dropped `--press-route` and rewrote §7's row |
| 2.10 — `.field-control` outlined in `--imprint` | `aebdc4d`; `index.css:227` now outlines in `--ink` |

### The four contested rulings

Everything else follows from a stale sentence. These four were genuine design calls and were put
to the owner:

| Finding | Ruling |
|---|---|
| 1.2 — boards are not expandable | **Drop the claim.** §5 loses "expandable in place", §7 loses the expand row. Follows `f3f7323` exactly. A server-grouped board arrives with its members already paid for; there is nothing to defer. |
| 1.4 / 2.2 — the screen-identifying badge | **Ink outline for the state badge.** `PendingApproval` takes `border-2 border-ink`; `Login`/`SignUp` keep the yellow wordmark plate (it is the wordmark, not a state) at §3's published size. |
| 1.5 / 1.6 — yellow's scope | **Scope the law to paper.** §2 gains the missing `--imprint` on `--ink` row; the cover's yellow stands; `Full record` still loses its yellow, on §5's navigation rule rather than on contrast; `Login`'s notice takes an ink rule. |
| 1.7 / 1.12 — two over-strict rules | **Document what is enforced.** The ground rule becomes what the guard checks; `--ink-soft` is redefined as the quiet register. Both changes describe shipped sites rather than condemning them. |

---

## 2. Build changes — 8 findings, 10 source files, 2 guard widenings

Each is a site where the rule is right as written and the build breaks it. §2.9 is not one of the
44: it is one of the audit's two closing notes, and it lands here because it is a stale comment
inside a guard file.

### 2.1 `PendingApproval`'s badge stops wearing the lent stamp *(finding 1.4)*

`src/pages/PendingApproval.jsx:10` renders the screen's identifying badge as
`border-2 border-out … text-ink` — the Overprint Stamp's construction minus the rotation, on an
approval notice. §2 gives `--out` exactly one job: **on loan, nothing else, ever**. No comment
justifies the site; it is the only `--out` use in the app that neither §2 nor §6 sanctions.

**Change:** `border-out` → `border-ink`. Structural, palette-safe, and it stops a screen with no
items reading as a lent one.

**Not:** the yellow wordmark plate `Login` and `SignUp` use. That plate carries the **wordmark**;
this badge carries a **state**, and `--imprint` means finding and acting.

**No guard.** One unsanctioned `--out` site exists and it is being removed. A checker over the 44
`border-out` sites — 43 of which §6 sanctions as Error blocks — would protect a class of one, which
is this project's own no-op-exclusion pattern pointed the other way.

### 2.2 `Login`'s success notice becomes visible *(finding 1.5b)*

`src/pages/Login.jsx:53` renders the OAuth-success / account-created notice as
`border-t-2 border-imprint bg-paper-deep`. `--imprint` on `--paper-deep` computes to **~1.42:1**,
and that rule is the notice's only distinguishing mark. It is exactly the failure §2 predicts in
bold and the one place nobody scoped the rule out of.

**Change:** `border-imprint` → `border-ink`, matching `ToastContext.jsx:36` and
`UpdateNotice.jsx:18` — the printed-notice construction this system already has.

### 2.3 `Full record` takes the navigation treatment *(finding 1.6)*

`src/pages/ItemDetail.jsx:477` sets a navigational link in `caps … text-imprint underline`.
`DetailMarks.jsx:119`, sixty lines above on the same screen, obeys §5: *"The link is underlined
rather than set in `--imprint`: it is navigation, not a primary action."* Two links, one screen,
two treatments.

**Change:** `text-imprint` → `text-cover-body`. The underline and the enlarged hit area
(`before:-inset-y-5`, measured) are unchanged.

**Note the reason.** This is **not** a contrast fix — §2 gains a row this pass recording
`--imprint` on `--ink` at 11.71:1, so the yellow was perfectly legible. It loses the yellow because
navigation is underlined and never accented. `ItemDetail.jsx:435`'s `THE RECORD` heading keeps its
yellow: a section heading beside the title rules is not navigation.

### 2.4 The auth wordmarks take §3's published values *(finding 2.2)*

§3 publishes the wordmark at **12px / 800 / +0.20em**. `AppHeader.jsx:47,60` obeys it.
`Login.jsx:44` and `SignUp.jsx:49` render `text-[11px] … tracking-[0.16em]` — the size and tracking
§3 assigns to a **section header**.

**Change:** both to `text-xs font-extrabold tracking-[0.2em]`.

**And the guard that missed it widens.** The caps-tracking manifest at
`scripts/check-browser.mjs:1659` carries one wordmark entry, routed to `/libraries`, so two screens
printing it at another tracking were never in scope. Add `/login` and `/signup` entries.

**The size needs an assertion of its own, and this is why.** `typeScale.test.js` resolves every
size class to pixels and fails anything off §3's scale — and **11px is on the scale**, as the
section-header step. So the size divergence is invisible to the one guard that reads sizes, by
construction, and no amount of widening it would help. A guard that cannot see the defect it is
being widened for is the no-op this project has already paid for twice.

**The fix is not a new guard; it is finishing this one.** `CAPS_ROLES`' own header comment states
the principle exactly — *"nothing computed `letter-spacing`… a class can be present and beaten, and
only the computed value can tell"* — and that reasoning is indifferent to which property is
declared. §3's caps table publishes a **size, a weight and a tracking** for every role. The manifest
computes one of the three.

So each entry gains `px`, the assertion reads computed `fontSize` alongside `letterSpacing`, and the
wordmark gains its two missing routes:

```js
{ role: 'wordmark', route: '/libraries', text: 'ALEXANDRIA', px: 12, em: 0.2 },
{ role: 'wordmark', route: '/login',     text: 'ALEXANDRIA', px: 12, em: 0.2 },
{ role: 'wordmark', route: '/signup',    text: 'ALEXANDRIA', px: 12, em: 0.2 },
```

**Adding `px` immediately surfaces a second role, and the ruling is recorded here rather than
left to the implementer.** `SharedRibbon`'s caps render at **two sizes across four sites**, split
by surface: 11px/700 on `LibraryRow` and on `LibraryBrowse`'s shared-library header; 10px/800 on
`DetailMarks` and `SearchRowMarks`. §3's caps table publishes one row at 10/800, and the manifest's
`shared ribbon caps` entry is routed to `/libraries` — so it measures the **11/700** instance
against the row describing the **10/800** one, and has always been green only because the two
surfaces coincide at +0.16em.

That is this project's signature defect inside the guard itself: a true measurement of the wrong
substrate, passing for a reason unrelated to what it claims. It also makes finding 2.3a larger than
the audit stated — §3 describes the library row's sub-line **twice**, once in the mono table (as
mono/400) and once in the caps table (as 10/800), and neither matches what renders.

**Ruling (owner, at plan time): two roles, both documented.** §3's caps table gains
`shared ribbon caps (detail marks, search row)` at 10/800 and `library row sub-line` at 11/700; the
mono table's "library row sub" row becomes a pointer to the second of those rather than a fourth
description of the same element. `CAPS_ROLES` gains a second entry so both surfaces are measured,
each against the row that describes it. The 11/700 sub-line under a 22px name is left as it renders:
harmonising it to 10/800 would be a redesign arriving inside a reconciliation pass, on no
measurement.

**Weight is deliberately handled differently.** Adding it would close the row completely for one
more line — and it would assert six roles nobody has measured, inside a pass whose scope is
*apply the reconciliation*. A divergence found that way is a new finding arriving through the back
door, which is how §3's caps table grew the problem this section repairs. So weight runs as a
**read-only probe** during implementation: clean, and the assertion lands for free; divergent, and
the divergences go on a list rather than into this pass.

### 2.5 The browse skeleton's frame loses its fill *(finding 1.8)*

`src/pages/LibraryBrowse.jsx:21` renders `h-[72px] w-12 border-2 border-ink bg-paper-deep` — the
48×72 frame carrying precisely the fill §5 removed from `VolumeFrame`, reintroduced in the skeleton
that stands in for it. §5 is explicit: *"'Ruled' means the rule and nothing else."*

**Change:** drop `bg-paper-deep` from the frame.

**The bars keep theirs.** `LibraryBrowse.jsx:23-25` and `Libraries.jsx:29-32` are line skeletons,
not frames — a bar standing in for a line of text is not a filled rectangle where artwork belongs,
which is the failure §5 names. `ItemDetail.jsx:332-343` already draws exactly this distinction: an
unfilled frame, and `bg-cover-rule/25` bars it argues for at `:320-327`. After this change the two
screens agree.

### 2.6 Two empty states adopt §6's construction *(finding 1.9)*

§6: *"Empty | A **ruled frame** with a caps invitation, **at the same weight as a full block**."*
`LibraryBrowse.jsx:143` obeys it. Two screens do not:

- `Libraries.jsx:89` — `caps border-b-2 border-ink p-4 text-xs font-bold text-ink-soft`. No frame,
  and at 12px `--ink-soft` it is **quieter** than the 22px/700 `--ink` rows it replaces, which is
  the opposite of "the same weight as a full block". It is also the app's home screen, so this
  state is the reader's first impression of the product.
- `UnshareLibrary.jsx:73` — `caps p-4 text-xs … text-ink-soft`, no rule at all. A third variant.

**Change:** both take the ruled frame — `m-4 border-2 border-ink p-8 text-center` with a caps line,
matching `LibraryBrowse`.

**They differ in one respect, deliberately.** The home state carries the **new-library Plate
Button**: it is an empty state with an action, and §6's frame exists to hold an invitation. The
unshare state carries **no action** — nothing on that screen can share a library, and offering a
control that navigates away from the task would be inventing an affordance to fill a frame. A frame
with a caps line and no button is still §6's construction; §6 requires an invitation to be at full
weight, not that one exists where there is nothing to invite.

### 2.7 `SHARED · N`'s figure takes the mono *(finding 2.3b)*

`components/imprint/SharedRibbon.jsx:18` renders `Shared · {count}` with no `.num` anywhere.
By §3's boundary — *a labelled datum* against *a numeral in running prose* — a count beside its own
label is a datum and takes Chivo Mono.

The site's own comment already says so. `LibraryRow.jsx:52-55`: *"this used to set the whole
'Shared · N' string — and, worse, the owner's email address — in `.num` … Mono is for the count,
not the word or the address."* The fix removed the mono from the word and the address and did not
put it back on the count.

**Change:** wrap `{count}` in `<span className="num">`. `FROM <owner>` is unaffected — it has no
numeral.

**And it joins the manifest.** Add `SHARED · N` to `MONO_FIELDS` in `scripts/check-browser.mjs`
and to `monoFieldCoverage.test.js`, so the face it resolves to is asserted rather than assumed —
this is the exact gap `MONO_FIELDS` exists to close, and the field was not listed.

### 2.8 The search field's gap returns to the division *(finding 2.8)*

`components/imprint/SearchField.jsx:83` sets `mt-3` — 12px, three base units, **1.5 divisions**.
§4: *"gaps between blocks … are whole divisions, always."* It is the only layout-scale gap in the
app off the division; `RowActions.jsx:14`'s `gap-[3px]` and `PlateLine.jsx:29`'s `mt-[3px]` are
typographic interiors, which §4:518 explicitly permits.

**Change:** `mt-3` → `mt-4`. This moves the loudest mark in the design down 4px. Visible, and §4
says *always*.

### 2.9 A stale comment above a live one

`src/typeScale.test.js:96-120` carries a superseded paragraph — *"Scoped to that one file rather
than to a count… 16px anywhere else is a violation"* — immediately above the block that reverses it
at `:121-131` (*"AN INPUT, not a file"*). Both are present; the later one is what the code does.

**Change:** delete the superseded paragraph. This is the hazard `index.css:173-182` records paying
for, sitting inside a guard file.

---

## 3. Document changes

### 3.1 `DESIGN.md` §2 — Colour

| Change | Finding |
|---|---|
| Add the missing contrast row: `--imprint` on `--ink` = **11.71:1**, the same figure the table already prints for the inverse pair. Its absence is why the yellow law reads as palette-wide. | 1.5 |
| Scope *"yellow never carries a shape by itself"* to **paper grounds**, and say why: the measurement behind it is `--imprint` on `--paper` at ~1.55:1, and the cover is a different surface where the same colour clears 11.71:1. Name the three sites that rely on it — `AppHeader.jsx:36`, `ItemDetail.jsx:435`, `ItemDetail.jsx:477`'s heading sibling — so a later pass does not strip them. | 1.5 |
| Restate the ground/foreground rule as **what is enforced**: *a ground's text is coloured at or below it, and never inherited across a surface boundary.* `groundForeground.test.js:124-131` passes any surface whose text-bearing descendants each declare their own foreground, which is what `UpdateNotice.jsx:18` does, and which demonstrably prevents the 1.08:1 Sheet bug the rule was written for. The document said "in the same rule"; the guard is the load-bearing half. | 1.7 |
| **Add the inverse case, which §2 has never stated.** `CaptureCaption.jsx`'s header comment: *"'anything that sets a ground sets its foreground' was written for a surface painting its own background. Here nothing set a ground at all, which is the same defect arriving from the other side."* A foreground over a ground the design does not own — a live camera feed — measured 1.45:1–5.1:1. This is the single most useful thing in the build that the document lacks. | List 3 #1 |
| Redefine `--ink-soft` as **the quiet register**: secondary content *and* the quiet marks that serve it. Structural rules stay `--ink`. The current wording ("Never structure") is breached by the back Mark (`AppHeader.jsx:36`), the select chevron (`Field.jsx:106`), every quiet caps label in the app, and by §6:896 inside this same document. | 1.12 |
| Record `on-imprint` (`index.css:196-202`) as a **deliberate no-op** kept as an anchor for ~15 call sites after the focus ring stopped needing it. Correctly flagged in code, invisible in the document. | List 3 #19 |

### 3.2 §3 — Typography

| Change | Finding |
|---|---|
| The **search field input** row says 13px; the build sets 16px and is right — Mobile Safari zooms the page below 16px, reported from the deployed app. Correct the row, and **widen the exception paragraph** from `Field`'s three controls to *any input*. `typeScale.test.js:121-131` already enforces the wider rule, so the document is the last holdout. | 2.1 |
| The **library row sub** row says mono / 400 / tabular. `LibraryRow` sets a caps tag in the sans at 11px/700/+0.16em, correctly — the sub-line carries sharing, not a datum. §3's "a library's item count" stays a mono datum: that is the **plate**, and `VolumePlate` sets it in `.num`. | 2.3a |
| **The caps table gains a second shared-ribbon role**, per the ruling in §2.4: `shared ribbon caps (detail marks, search row)` at 10/800, and `library row sub-line` at 11/700. One component, two surfaces, two published rows — and the mono table's "library row sub" row becomes a pointer to the caps row rather than a fourth description of one element. | 2.3a / found at plan time |
| Record that **section heads carry counts** — `Libraries.jsx:19-24` sets `MINE` / `SHARED WITH ME` with a `.num tracking-normal text-ink-soft` figure at the right. §3 gives the section header a size and tracking and no figure. | List 3 #14 |

### 3.3 §4 — Division scale

| Change | Finding |
|---|---|
| Add the **stream row** to the row-height table: `ItemRow` sets no height, and `p-4` plus a 72px frame gives **104px** (13 divisions), confirmed by `index.css:278`'s `contain-intrinsic-size: auto 104px`. The app's densest and most repeated element is described by neither existing row. | 2.4 |
| Restate the **rule-weight table by what a rule separates** rather than by "hairline separators inside a block": 1px between rows in a dense stream (`ItemRow.jsx:21`); 2px between blocks, around volume frames and under fields (`LibraryRow.jsx:13`, `CollectionBoard.jsx:21`, `AppHeader.jsx:23`); 3px block frames, boards and bottom-anchored panels; 4px index rules and the hero title rule. Three structural separators currently use 2px for something the table assigns 1px. | 2.7 |
| Record the **index alphabet's empty-fold branch**: `lib/sort.js:27-31` — a title whose first character is a bare combining mark folds to nothing, and the label falls back to the **raw** first character. §4:737 says "always the actual folded first character" with no exception. | List 3 #18 |
| Record that **the two capture viewports are deliberately not 2:3**: `BarcodeScanner.jsx:172` is `h-48 w-full` (192px) and `CoverCapture.jsx:189` is 240px, both landscape. §4's frame law is written about *items*; a viewfinder is a different subject. `ui-v3.md` argues both at length and `DESIGN.md` mentions no capture frame at all — which is exactly the asymmetry a later pass "harmonises" without knowing it was deliberate. | List 3 #10 |
| Record **`.row-skip`** (`index.css:276-279`): `content-visibility: auto` with `contain-intrinsic-size: auto 104px`, a layout-affecting utility carrying a hard constraint — it must never wrap a sticky index letter, and boards are excluded because a wrong intrinsic size drifts the scroll on a continuation merge. §4 legislates the division scale and says nothing about containment. | List 3 #16 |

### 3.4 §5 — Component vocabulary

**Twelve corrections to existing entries:**

| Entry | Correction | Finding |
|---|---|---|
| Volume Frame | Three sizes, all exactly 2:3: `row` 48×72, `candidate` 88×132, `hero` 132×198. Only the hero is named today, and only in `ui-v3.md`. The candidate size exists because on the results screen the picture is what decides the match (`VolumeFrame.jsx:23-30`). | 2.9 |
| Volume Plate | The **member order plate** departs twice, both justified at `VolumeFrame.jsx:81-94`: a `--paper` fill "so it reads over artwork", and `border` (1px) because "2px around a figure this small is mud". §3:296 records the 1px; §5 records neither. | 1.13 / 2.5 |
| Collection Board | Drop **"expandable in place"** — `CollectionBoard.jsx:33-40` maps members unconditionally and no expand state exists anywhere in `src/`. Add **`CONTINUES`** (`CollectionBoard.jsx:26-27`), the one label on an orphaned partial board, which `ui-v3.md` §4 specifies and §5 does not. | 1.2 / List 3 #15 |
| Overprint Stamp | Name **both variants**. The paper stamp is `opacity-[0.92] text-ink px-[6px] py-[2px]`; the inverted one is `px-[5px] py-px text-paper` at full opacity, because (`OverprintStamp.jsx:10-14`) "there is no paper ground on the cover for the opacity trick to read against". | 2.6 |
| Ledger Row | It **renders an Overprint Stamp** on an open loan when boxed (`LedgerRow.jsx:108`). Reasoned at `:96-107`: on the paper ledger card an open loan had no mark at all, since the comp's "brighten the line" treatment has nowhere to go where `--ink` is already the top tone, and palette law permits no eleventh token. | 1.11 |
| Plate Button | The destructive variant's caps are **`currentColor`, not `--out`** (`PlateButton.jsx:22`). The reason is at `:11-21` and §2:90 already agrees with it: `--out` is 4.11:1 on paper, so a red label would be the least legible text in the app on the one control where a misread costs most. §5 is the stale half and contradicts §2 inside one document. | 1.3 |
| Field | Name the real surface: the `select` variant with a hand-drawn `ChevronDown` and `appearance-none` (`:85-108`), number-spinner suppression (`:130-131`), textarea `resize-none` (`:126`), the `counter` / `hint` / `liveHint` / `required` props, and the **inline field-error treatment** — `border-out` on the bottom rule plus a 13px `--ink` note with `role="alert"` (`:37,141-144`). | List 3 #12 |
| Sheet | §5 is one sentence; the component is 193 lines. Record the mechanism: a `bg-ink/40` scrim (`:141`), a portal to `document.body` (`:133`), `inert` on `#root` with a module-level open-sheet counter (`:23-51`), a re-queried focus trap (`:79-116`), focus restoration to the opener, a `Close` Mark inside the panel (`:177`), `max-h-[80dvh]` with internal scroll. | List 3 #11 |
| Index Letter | Its count is **a phrase, not a figure**: `IndexLetter.jsx:47-49` renders `<span class="num">{count}</span> volume(s)`, with the noun in the sans. | List 3 #13 |
| Detail Marks | Note the **second, non-link variant** — `SearchRowMarks.jsx:29` sets `IN <library>` inline on a search row without a link. | List 3 #3 |
| Marks | The back Mark's tone is `--ink-soft` on paper and `--imprint` when inverted (`AppHeader.jsx:36`), which §2's redefinition above now permits. | 1.12 / 1.5 |
| Delete confirmation | Record the construction: a `role="group"` with an `aria-live="assertive"` description carrying a `border-t-2 border-out` rule, expanding **in place of** the trigger inside the same action row, with focus moved to the safe option (`ItemDetail.jsx:533-574`). §7 requires "confirm in place" and nothing describes the form it takes. | List 3 #21 |

**Six new entries:**

1. **`CaptureCaption`** — the caps status strip pinned to the bottom edge of both camera viewports
   (`FRAME THE TITLE`, `CODE READ · LOOKING IT UP`). Carries §2's new inverse case.
2. **`FilingInto`** — the `FILING INTO <name>` mark, a printed mark rather than a toast precisely
   so it survives a session of back-to-back scans. `ui-v3.md` names it; §5 does not.
3. **`FlowMarks`** — the `FILED THIS SESSION · N` tally, same reasoning.
4. **`SearchRowMarks`** — the inline `IN <library> · FROM <owner>` tag a search row adds. §6:963
   sanctions the `--shared` half in one clause; the `IN` half is named nowhere.
5. **`Toast`** (`state/ToastContext.jsx:36`) — §6 mentions toasts twice as a *policy*
   ("confirmations only") and never as a component.
6. **`UpdateNotice`** (`pwa/UpdateNotice.jsx:18`) — the `NEW EDITION` notice. `ui-v3.md` §7
   specifies it in detail; `DESIGN.md` does not mention it.

**And one note across three of them.** Sheet, Toast and UpdateNotice are all `mx-auto max-w-md`,
bottom-anchored, `border-t-[3px] border-ink bg-paper-deep p-4` — a modal, an auto-dismissing
confirmation and a persistent offer wearing one printed form. Record what distinguishes them
(scrim and focus trap; auto-dismissal; survives being ignored), because nothing in §5 does.

### 3.5 §6 — State grammar

| Change | Finding |
|---|---|
| **On loan** widens past "item rows only" to include the boxed Ledger Row's open loan. | 1.11 |
| **Error** gains its full set: on paper `border-t-2 border-out bg-paper-deep` (30 sites, counted, exactly as written); **inside a Sheet** the same rule on `bg-paper`, because the sheet's own ground is already `--paper-deep` (5 sites); **on the black cover** a full `border-2 border-out` box with no ground, text inherited from the cover root, argued at `ItemDetail.jsx:502-505` (4 sites); and the **inline field error** (§3.4 above). One state, four treatments, one documented. Counted against the tree rather than taken from the audit: 45 `border-out` sites, not 44 — one has landed since — splitting 30 / 5 / 4, with the remainder being the stamp, the destructive button, the field-error class, the two in-place confirmations and `PendingApproval`'s badge. | 1.14 / List 3 #12 |
| The **unshare bar has four states**, not three: nothing-to-unshare → `null`; nothing selected → hint; over the API's 10-per-request limit → reason; **confirming** → a named `Remove for good` / `Keep access` pair; otherwise → action. The confirmation is required by §7 and the document counted before it existed. `min-h-20` reserves the height correctly and no control is ever greyed. | 1.10 |
| Four new rows: **End of list** (`LibraryBrowse.jsx:195`); **Appending** (`:188`, `role="status"`, distinct from the cold skeleton); **In-flight capture lookup** (`CaptureCaption`'s busy strings — §6 has no row for a viewport narrating a request); **Route-chunk pending** (`routes.jsx:44-51`, a `RouteFallback` rendering the full paper ground plus a working back control — §6's *Loading* covers content, not code-splitting). | List 3 #6–9 |
| Permit a **tint of a structure token as a skeleton ground**: `ItemDetail.jsx:334-343` uses `bg-cover-rule/25` for line bars, argued at `:325-327` as "the same token `OverprintStamp`'s row variant already tunes with opacity, not a new one". §2 declares `--cover-rule` structure-only and never rules on a tint. | 2.11 |
| Record that a **line skeleton is not a frame skeleton**: bars may carry a fill, frames may not. This is the distinction §2.5 above applies to `LibraryBrowse`. | 1.8 |

### 3.6 §7 — Motion

Drop the **collection expand** row (160ms height change). Nothing implements it, and §5's
"expandable in place" goes with it. §7 then describes three motions, all of which exist: state swap
80ms linear, sheet 200ms rise, stamp unanimated.

### 3.7 §8 — Accessibility

`DESIGN.md` §8 still reads *"Focus ring per §2, Focus: 3px `--imprint` at 2px offset, switching to
`--ink` on yellow grounds"* — the pre-rewrite rule, contradicting §2 and the build.

The audit filed this as out of scope. It lands here: it is a live contradiction inside one
document, and it is the version a reader skimming the accessibility section would apply. Correct it
to §2's ruling — `--ink` on paper and on `--imprint`, `--paper` on the black cover, 3px at 2px
offset, 0 offset where an ink rule already exists.

### 3.8 `.claude/ui-v3.md`

| Section | Change | Finding |
|---|---|---|
| §3 | Record **`AddFlowLayout`** (`routes.jsx:86-91`) — a layout route owning the filing session's identity *and* the camera lease for its whole span. §3 says "Sheets, which are not routes"; a route that is not a screen has no place in either document. | List 3 #17 |
| §4 | LibraryBrowse: boards are **not** expandable. | 1.2 |
| §7 | `AddItemSheet` carries a **`Back`** entry when it is reached from another sheet (`AddItemSheet.jsx:53-57`). §7 legislates which options the sheet may hold and `Back` is not among them — because it is not an option: it is the return path of a nested sheet, and it does not require the type its siblings supply. | List 3 #20 |
| §8 | Record this pass. | — |

### 3.9 The reconciliation file itself

`docs/ui-design/reconciliation-2026-08-25.md` opens *"IT HAS NOT BEEN APPLIED… Each finding is a
question for whoever next owns those documents."* After this pass it is no longer a question list.
Rewrite the preamble to record the outcome per finding — code, document, or already closed — so the
file becomes the record of what was ruled rather than an open item that reads as outstanding.

---

## 4. What is deliberately not done

**No shared `ConfirmInPlace` primitive.** The audit notes the in-place delete confirmation is
"reproduced by hand in `UnshareLibrary.jsx:120-140` rather than shared", and this project's own rule
says that where a class is small enough, close the door rather than watch it. It does not apply
here: the two sites differ in surface (the black cover against paper), in `aria` plumbing, and in
what they destroy. Extracting them would produce one component with two mutually exclusive halves,
which is worse than two honest sites. The construction is documented in §5 instead.

**No `--out` palette guard.** See §2.1.

**No new windowing, no motion added, no visual redesign.** This pass changes 12 sites, and every
one of them is a site where a rule the document keeps is broken. Nothing here is a new decision
about how the product should look.

---

## 5. Sequence and verification

Five code commits on `main`, then the documents:

1. Palette defects — `PendingApproval`'s badge, `Login`'s notice, `Full record` (§2.1–2.3).
2. The auth wordmarks, plus widening `check-browser.mjs` past `/libraries` (§2.4).
3. The skeleton fill and the two empty states (§2.5–2.6).
4. `SHARED · N` in the mono, plus `MONO_FIELDS` and its coverage manifest (§2.7).
5. The search field's division, and the stale `typeScale.test.js` comment (§2.8–2.9).

Then `DESIGN.md` §2–§4, `DESIGN.md` §5–§8, `.claude/ui-v3.md`, and the reconciliation record.

**Verification, per this project's own hard-won rules.** Every run is issued from
`packages/web-client-v3` by **absolute path** — a relative `cd` from an already-nested working
directory has produced two exit-zeros that looked exactly like two passes. Every run is `tee`'d to
a file and the file is grepped, never the pipe: a suite has been seen red once for unknown reasons,
and grepping at the moment of observation is what discarded the evidence.

`yarn test`, `yarn check:browser`, `yarn lint` — all three, after each code commit.

**Every site is reached by an anchor string, never by a line number, and the anchor is asserted to
resolve to exactly one match before the edit.** Zero means the site moved; more than one means it
spread; both are stop conditions rather than things to guess through. The audit's line numbers are
pinned to `7bc45f7` and have already drifted — `CollectionBoard`'s member render is at `:50`, not
the `:33` the audit cites, and the caps manifest moved from `:1596` to `:1659`. All 13 anchors in
this spec were resolved against the working tree and each matches exactly one site.

Two details, both learned by running it. Match **fixed strings** (`grep -F`): a Tailwind arbitrary
value like `text-[11px]` is a character class to a regex engine, and the first run of this check
reported three false zeros for that reason — a checker failing on its own substrate, which is the
defect this project keeps finding. And pick an anchor that is unique *as written*: `board.items`
matches twice (the map and a length test), `(board.items ?? []).map` matches once.

**Both widened guards must be seen to fail.** Break the wordmark size on `/login`, confirm with
`git diff` that the mutation actually landed — a no-op `sed` and a robust guard produce identical
evidence — watch it go red, then restore. Same for `SHARED · N` in the sans. A guard that has only
ever been green is indistinguishable from a comment.
