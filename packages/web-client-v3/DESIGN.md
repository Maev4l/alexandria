# Alexandria v3 — Design System

**The Noir Imprint**, text-block rendition.

Durable visual decisions for `packages/web-client-v3`. Product truth lives in `/PRODUCT.md`; UX, IA
and screen specification in `.claude/ui-v3.md`. This document describes what shipped.

---

## 1. Direction contract

**Thesis.** Every book and film in the collection is a numbered volume in one imprint. It refuses
the category default — a grid of cover art on warm paper, serif titles, a terracotta accent,
shelves implied under the rows — which is precisely what `web-client-v2` is.

**Own-world.** Gallimard's *Série Noire*: chrome yellow and black, thick framing rules, numbered
volumes, overprinted stamps. The interface is built on the imprint's **text block** (cool paper
white), not its cover; black and chrome yellow are reserved for framing rules, volume plates, index
letters and stamps. The full black cover treatment belongs to the item-detail hero alone. No serif
anywhere, no rounded corners, no shadows.

**Story.** The reader opens the app to answer "do I own this?", searches from wherever they are,
and reads circulation state as printed marks rather than coloured chips.

**First viewport.** Libraries as numbered volumes in two labelled sections — mine, then shared with
me — each framed with its item count. Search pinned in the header. Account plate top-right. No
bottom tab bar.

*Série Noire* published Chandler, Hammett and Thompson, and those novels became film noir, so an
imprint spanning books and films is the source's native condition rather than a compromise.

### Binding disciplines

| Discipline | Rule |
|---|---|
| Nothing is labelled twice | Every fact appears exactly once, in one place. Repetition is a defect. |
| State on edges | State colour lives on edges and rules only. The content field stays achromatic so a title never competes with its own status. |
| The record carries its past | An item's loan history reads on the item itself, not only behind a separate screen. |
| One division scale | Every element is dimensioned against it; nothing is spaced by eye. |
| Palette law | Each colour means exactly one thing and is never spent decoratively. |

---

## 2. Colour

Strategy: **restrained ground, legislated accents.** A near-achromatic paper field carries all
content; four colours carry meaning and nothing else. A colour spent outside its register is a bug.

| Token | Value | Means, and only means |
|---|---|---|
| `--paper` | `#F6F6F3` | The ground. Cool off-white. **Not cream** — warm paper is the category default and v2's ground. |
| `--paper-deep` | `#ECECE7` | A recessed field: search surface, sheets, form wells. |
| `--ink` | `#0B0B0B` | Content and structure: text, rules, frames. |
| `--ink-soft` | `#5A5A57` | **The quiet register**: secondary content (metadata lines, counts) and the quiet marks and words that serve it — the back Mark on paper, the select chevron, a field's caps label, a hint standing in a control's position. **Structural rules stay `--ink`** at full strength: a frame, a separator, a field's bottom rule, a block's top edge. Rule weight is how this system expresses hierarchy, so a softened rule reads as a lighter weight rather than a quieter one. |
| `--imprint` | `#F2C200` | **The apparatus of finding and acting**: the search field, index letters, the active/selected state, primary actions. Never the inventory itself. |
| `--out` | `#D8412F` | **The alarm register**: on loan, and the treatments that warn — an Error block's rule, the destructive button, a field failing validation, a delete confirmation. **Never content, never a ground, never focus.** |
| `--shared` | `#0F6B4F` | Shared — outbound or inbound. Nothing else, ever. |

### Contrast

**Measured** from the built stylesheet by `src/tokens.test.js`, which asserts every row on each run.

| Pair | Use | Measured |
|---|---|---|
| `--ink` on `--paper` | all body text | 18.18:1 |
| `--ink-soft` on `--paper` | metadata | 6.39:1, AA body |
| `--ink` on `--imprint` | plate caps, primary action labels | 11.71:1 |
| `--shared` on `--paper` | tags, ribbons | 5.99:1, AA body |
| `--out` on `--paper` | **stamps and rules only** | 4.11:1 — under the AA floor, so red stays restricted to ≥18px bold, rules and stamp outlines. Never small red body text. |
| `--cover-body` on `--ink` | summary on the cover | 14.58:1 |
| `--cover-soft` on `--ink` | plate line, durations on the cover | 9.99:1 |
| `--shared` on `--ink` | **never text on the cover** | 3.03:1 — so on the inverted surface the sharing mark puts green on a 4px edge and sets its caps in `--cover-body`. |
| `--out` on `--ink` | stamp outline on the cover | 4.42:1 — better than red on paper. The stamp still sets its caps in a legible tone, deliberately, to keep one construction across both surfaces. |
| `--imprint` on `--ink` | marks, headings and rules on the black cover | 11.71:1 |
| `--imprint` on `--paper` | **never text, never a shape** | ~1.55:1 |

**Yellow never carries a shape by itself — on paper.** At ~1.55:1 it cannot describe a form there;
it can only be a *ground* with ink on top, or a *fill* inside an ink outline. The plate works
because ink figures sit on yellow; a primary action works because its caps are ink.

**The bound is the ground.** On `--ink` the same yellow clears 11.71:1 and describes a form
perfectly well — the inverted header's back Mark, item detail's ledger heading, and the cover's 4px
title rules all rely on that and are correct.

**The fill-inside-an-outline construction carries a condition.** `-webkit-text-stroke` traces each
stroke independently, so the outline collides with itself wherever a counter is narrower than twice
the stroke. Verified in real Archivo at 76px / wght 900 / wdth 62.5% for the index letter. Measure
counters before reusing it at another size or weight; do not assume them.

### The black cover

Item detail — and only item detail — inverts: `--ink` ground, `--paper` text, `--imprint` for the
title rules. `--ink-soft` on `--ink` measures ~1.9:1, so the inverted surface needs its own tones.
Using any of these on paper is a bug:

| Token | Value | Means, and only means |
|---|---|---|
| `--cover-body` | `#DEDED9` | Body copy on the inverted surface (the summary). |
| `--cover-soft` | `#B9B9B4` | Secondary content on the inverted surface (plate line, loan duration). |
| `--cover-rule` | `#3A3A38` | Hairline separators on the inverted surface, and at quarter strength the fill of a skeleton **bar**. **Never text, and never a frame's fill** — a filled rectangle where artwork belongs reads as a failed image. |

The tokens are named for the surface they belong to, not their brightness: the body tone is the
*brighter* of the two.

### Ground and foreground

**A ground's text is coloured at or below it, and never inherited across a surface boundary.** Any
surface that paints its own background answers for the colour of every string it holds — on its own
class, or on each text-bearing element within it. `groundForeground.test.js` enforces this.

The rule runs in **both directions**: no paper token onto the cover, and no cover token onto a paper
surface rendered inside the cover. The second is the one that shipped (a `--paper-deep` sheet
inheriting `--paper` text from item detail's root, 1.09:1).

**Third direction: a surface over a ground the design does not own must paint an opaque ground of
its own.** A caption over a live camera feed has no computable contrast — measured between 1.45:1
and 5.1:1 on one unchanged string depending on where the camera pointed. `CaptureCaption` therefore
paints a printed plate, ink on paper, pinned to the frame's bottom edge. `check-browser.mjs` drives
a fake camera and asserts, in order: the computed background is **not** transparent, it then clears
AA, it sits below the frame's midpoint, and it spans the frame as a strip. **A transparent
background is the defect, not merely a low ratio** — the opacity check comes before the contrast
check, not instead of it.

### Focus

**The focus ring is the structural tone that contrasts with its own ground: `--ink` on `--paper`
and on `--imprint`, `--paper` on the black cover.** 3px, 2px offset.

- **Never `--imprint`.** Yellow on paper cannot describe a form (~1.55:1), and it fails WCAG 2.2
  SC 1.4.11, whose 3:1 floor is a legal requirement rather than a preference. Focus describes
  *where the keyboard is*, which is structure, not the active state.
- **Never `--out`.** Red is the alarm register; a red ring would make every focused element
  momentarily read as lent.
- **Never a faked double ring via `box-shadow`** — shadows are forbidden outright (§4).

**Every `Field` draws the concentric ring at 2px**, accepting a doubled bottom rule. Two parallel
ink lines normally read as misregistered printing, but a reader meets two fields at once and never
meets one field twice, so a difference between neighbours costs more than a doubled edge. The
**search field is the one exception** and its exception is in the data: it carries a full 2px box
rule on all four sides, so a concentric ring would double the entire box, and it has no sibling
control beside it. It renders at `outline-offset: 0`, named `.field-control-merged` in `index.css`.

**Focus belongs to the control a reader sees, not the node that takes the caret** — but keyed to
the input specifically (`:has(input:focus-visible)`), never `:focus-within`, or a second focusable
descendant such as a password reveal mark lights the whole field. One control, one indicator.

**`.on-imprint` is a deliberate no-op**, kept as an anchor across ten class strings; flagged as such
at its site in `index.css`. It must not grow a new rule on the assumption that it still does
something.

---

## 3. Typography

Two families, no serif. A book subject reaching for a serif is the association this direction exists
to refuse.

| Role | Face | Notes |
|---|---|---|
| Display, plates, index letters, UI | **Archivo** (variable: `wght` 400–900, `wdth` 62–125) | One file covers condensed plate lettering and normal-width body. Full Latin Extended-A, so French diacritics are native. |
| Catalogue numerals, ISBN, runtime, dates | **Chivo Mono** | Tabular figures for aligned columns. |

Both self-hosted `woff2`, subset to Latin + Latin Extended-A.

**`fonts.test.js` reads the shipped `woff2`'s own cmap** and asserts it contains every character the
product can produce: printable ASCII, Latin-1 letters, Latin Extended-A, French diacritics, `Œ`/`Æ`,
and every mark the design sets in type. Google serves `latin` and `latin-ext` as separate cuts and
latin-ext is **not** a superset — a build that picks the wrong one ships a face containing almost no
ASCII, and `index.css` declares the faces with no `unicode-range` to reveal the gap.

### Scale

Sizes in px at base 16. Values are the built comp's, `docs/ui-design/ui-v3-mockup.html`, which is
law for the three screens it covers. Derive from the comp itself, never from its type-specimen
legend, which disagrees with it.

**Content and display**

| Role | Size | Weight / width | Family |
|---|---|---|---|
| Index letter | 76 | 900 / wdth 62.5% | sans, uppercase, line-height .82 |
| Detail hero title | 32 | 800 | sans, line-height 1.06 |
| Library row name | 22 | 700 | sans, line-height 1.15 |
| Browse header title | 20 | 800 | sans — a separate role from the row name |
| Row title | 17 | 600 | sans |
| Collection board name | 17 | 700 | sans — the heavier of the two 17s |
| Plate Line | 14 | 400 | sans, `--ink-soft`; its figures take mono 12 |
| Detail summary, `IN <library>` value | 14 | 400 | sans, `--cover-body` |
| Ledger name row, ribbon owner | 13 | 400 | sans; ribbon owner sets `text-transform: none` |

**Mono — numerals only**

| Role | Size | Weight | Notes |
|---|---|---|---|
| Count plate | 12 | 700 | tabular, in a 2px ruled plate |
| Plate Line figures, detail plate line | 12 | 400 | `--cover-soft` on the cover |
| Index letter count, ledger dates, session tally | 11 | 400 | tabular |
| Scanned code at a detection results head | 13 | 400 | tabular — one step above the detail ISBN's 12, deliberately: the head code is an echo to confirm at a glance, the detail ISBN an identifier inside dense metadata |
| Ledger duration | 13 | 400 | tabular; it sits inside the ledger's 13px name line and takes that line's size |
| Section-header count (beside `MINE`, `SHARED WITH ME`) | 11 | 800 | tabular; tracking cancelled outright with `tracking-normal` at the span |
| Collection member order plate | 10 | 400 | tabular, in a **1px** rule — one step lighter than the ordinary plate's 2px, because it sits inside a Volume Frame whose 2px rule it must not out-weigh |

**A figure inside a caps label takes that label's weight.** Only the family and the digit treatment
change when a numeral takes the mono; weight stays whatever the line it sits in is set at. The
column above describes a figure standing alone.

**Which numerals take the mono.** The boundary is a numeral presented as a *value* against a numeral
inside a *sentence*:

- **Mono — a labelled datum.** ISBN, TMDB id, release year, runtime, collection order, a library's
  item count, a collection's member count, an index-letter run count, ledger dates, a loan's day
  count, the session tally.
- **Sans — a numeral in prose the app authored.** `Delete Fiction and its 412 items?` is a sentence;
  the digit is a grammatical constituent, not a datum on display.

The guard is a **manifest, not a digit scan**: `MONO_FIELDS` in `check-browser.mjs` takes the
catalogue fields' values from the fixture, finds them in the rendered DOM, and asserts the computed
`font-family` and size. `monoFieldCoverage.test.js` and `monoRouteCoverage.test.js` are its drift
alarms — an unlisted datum fails the alarm rather than passing the check, and `monoRouteCoverage`
also **rejects a listed route with nothing to cover**, so a stale entry cannot sit there looking
like an entry doing work. Where the table publishes no size for a role, the manifest declares that
absence and reports the measurement rather than asserting one.

**Caps — interface labels. Tracking is per-role.**

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Wordmark | 12 | 800 | +0.20em |
| Plate Button labels — every variant | 12 | 800 | +0.12em |
| Section header (`MINE`, `SHARED WITH ME`) | 11 | 800 | +0.16em |
| Account plate initials | 11 | 800 | +0.08em |
| Ledger head, detail-marks label, ledger date labels | 10 | 800 | +0.16em |
| Shared ribbon caps (detail marks, search row) | 10 | 800 | +0.16em |
| Library row sub-line (shared ribbon on a row) | 11 | 700 | +0.16em |
| Overprint Stamp | 10 | 800 | +0.14em |
| Field label, field counter | 11 | 700 | +0.12em |

The Shared Ribbon renders inside four wrappers and sets neither size nor weight itself: library rows
and the browse provenance line wrap it at 11/700; the detail mark column and a search row wrap it at
10/800. Both pairs are published above. The browser check measures one instance of each pair on all
three properties; the other two instances are asserted here from source, not by a check.

**A blank cell in a spec table is not a value** — it cannot distinguish *zero* from *unspecified*.
Every cell carries a number or the word `none`; where zero is wanted it is declared at the site
(`tracking-normal`) so the intent is visible in the code.

**A caps role not in this table, declaring no tracking of its own, takes the 0.08em baseline from
`.caps`.** A role that declares a value beats the baseline. So the table is a list of deliberate
exceptions to a default, not an inventory of every caps site — an unlisted role is an unchecked one.
`NEW EDITION` on the Update Notice and `FILING INTO` on the filing mark are both +0.16em, published
in the component vocabulary and not here.

**The steps in use are 10, 11, 12, 13, 14, 17, 20, 22, 32, 76.** Anything else is off the scale.

**One exception: every input sets 16px.** `Field`'s input, select and textarea, and the Search
Field's input. Mobile Safari zooms the page when a focused input is under 16px, which on a
phone-first PWA jerks the viewport on every tap into a field. This is load-bearing platform
behaviour, not a typographic choice. `typeScale.test.js` keys its exception to the **input element**
rather than to a filename, so a new input is covered without being named.

`typeScale.test.js` resolves Tailwind's named sizes to pixels — 70 of the app's 114 size classes are
named — and **also asserts that no `--text-*` override exists in the theme block**, so its
`sm→14, xs→12, base→16, xl→20` table stays true by construction rather than by inheritance.

### The caps utility

`.caps` carries **`text-transform` plus a baseline `letter-spacing: 0.08em`, declared in
`@layer components`** so any explicit `tracking-*` utility beats it. **Weight is always set
alongside it, explicitly, at the point of use** — a utility that also owns weight cannot be removed
safely, because taking uppercase off a string would silently take its emphasis with it.

The precedence is the whole mechanism: 25 caps sites declare a tracking value and 26 declare none,
every one of the 26 at 11–12px, so neither deleting the default nor letting it win is acceptable. A
browser assertion computes `letter-spacing`, size and weight for one element per published caps
role.

Corollary: **there is no 15px step.** When a role turns out to be content rather than a label, move
it onto the nearest existing step — a sheet heading naming a library is the Row Title role, 17/600,
the size and weight that name had in the list it was opened from.

### The uppercase rule

Uppercase is for **interface labels only** — tags, plates, section headers, button labels, all of
which are English UI strings. **Content titles are never uppercased.** Long French titles set in
caps lose readability. This rule is the difference between an imprint and a poster.

---

## 4. Division scale

Base unit **4px**; the division is **8px**.

**The division governs layout; the base unit governs typographic interiors.** Block padding, gaps
between blocks, insets, row heights and margins are whole divisions, always. **Inside** a block the
4px base unit applies, and optical adjustments of 1–3px are legitimate where the alternative is
worse.

The base unit's settled use is **one relationship: a caps label and the thing it labels, or a name
and its sub-line** — a field's label above its input, the shared tag under a library's name, a
section heading above its paragraph, a skeleton's sub-line, the source under a candidate's title.

The question that separates the two cases: **is this distance between two things read as separate
blocks, or between a label and its own content?** A gap between blocks never takes 4px, and a label
never needs 8px.

| Name | Value |
|---|---|
| Base unit | 4px |
| Division | 8px |
| Phone margin | 2 divisions (16px) |
| Gutter | 1 division (8px) |
| Phone grid | 4 columns |
| Tablet grid | 8 columns, 3-division margin |
| Column max-width | **56 divisions (448px), centred.** The app is phone-first and gets no second layout; constraining and centring the column is the whole desktop provision. |
| Minimum touch target | 6 divisions (48px) — including the search field and the account plate |
| Row height, with a sub-line | 10 divisions (80px) |
| Row height, without | 8 divisions (64px) — **not 60**, which is off the scale |
| Stream row | 13 divisions (104px), **derived and reserved, not set** — 32px of padding around the 72px row-scale frame, the value `.row-skip` reserves via `auto 104px`. The row sets no explicit height and a wrapping title can render taller. |

### Rule weights

Elevation is rule weight and ground shift. **No shadows anywhere. No rounded corners — every radius
is 0.**

| Weight | Separates |
|---|---|
| 1px | one row from the next inside any list in the app — the item stream, the ledger, item history, the unshare recipient list, search results — and a section header from what follows it |
| 2px | a whole block from what sits below it — a library row's edge, a collection board's head, the app header's bottom edge, the browse provenance edge — plus every artwork frame and field underline |
| 3px | one structural block from the page — block frames, a collection board's outer frame, and every bottom-anchored panel's top edge: sheet, toast, update notice, capture notice panels |
| 4px | the sticky index letter from the stream beneath it, and the item-detail hero's title from its summary |

### The shell, and what scrolls

A screen whose content can exceed the viewport is a **fixed-height flex column**: `flex h-dvh
flex-col`, the header a non-shrinking item at the top, and exactly one **scroll region** below it —
`min-h-0 flex-1 overflow-y-auto`, marked `data-scroll-region`. The header never moves; the content
travels under it. `min-h-0` is load-bearing: without it the column grows past the viewport and the
document scrolls instead.

**Every screen has this but `AddVideo`**, which is fixed-height for a different reason and is the
only page with **no scroll region at all**: its viewfinder yields, shrinking so the manual escape
stays on screen rather than letting the page grow.

To list what is left: `grep -LE 'className="[^"]*\bh-dvh\b[^"]*flex-col' src/pages/*.jsx`. Match
`h-dvh` as a whole word — `grep -l 'h-dvh flex-col'` also matches `min-h-dvh flex-col`, which is a
growing column rather than a fixed one.

Three consequences:

- **A sticky child sticks to the region, not the viewport.** `IndexLetter` and the search field both
  take `top-0` with no offset to compute. A document-scrolling screen would need the header's
  height, which is not a constant — it grows with the safe-area inset and again when it carries the
  search field.
- **The region's bottom edge is the viewport's**, so a bottom-anchored control has no over-scroll to
  save it. A screen ending in its region carries `pb-[max(…,env(safe-area-inset-bottom))]` on the
  region; one ending in a bar below the region (`Libraries`, `UnshareLibrary`) puts `pad-bottom-safe`
  on the bar instead. **`LibraryBrowse` has neither** — the last row of a long stream sits under the
  home indicator on an installed PWA. Open, recorded, nobody's ask.
- **An absolutely-positioned descendant escapes the region unless something anchors it.** `sr-only`
  is `position: absolute`, so with no positioned ancestor its containing block is the initial one and
  it is not clipped — `PlateButton`'s disabled `reason` landed below the viewport, lengthened
  `documentElement.scrollHeight`, and gave the page a slice of document scroll. `PlateButton` sets
  `relative` and that class is load-bearing. **On a shell-shaped screen, anything `absolute` needs a
  positioned ancestor inside the region**, and the check that catches it is *the document itself
  never scrolls*.

**`document.body`'s overflow governs nothing here.** Anything needing to stop the page — today only
`Sheet`'s lock — must freeze the regions themselves. A browser check asserts the converse: any
element whose **computed** overflow scrolls must carry the attribute, and it must **not** also
require the element to be overflowing right now, or it stays quiet until real data grows past the
screen. Two exemptions, neither a page surface: the sheet's own panel, which scrolls internally, and
any native form control (a `<textarea>` computes `overflow-y: auto` by default).

### `.row-skip`

The item stream's row carries `.row-skip`, a containment rule skipping layout and paint for
unscrolled rows. **It is not what keeps a thousand-item list responsive** — the profiler measures it
as inert in both workloads (within 1% of p95 on the stream, 1–3% on a 400-row search list). What
holds the stream up is the page size. It is kept because it costs nothing and its **reserved 104px**
is doing real work: a row claims its real height before it has ever painted.

Two hard constraints:

- **It must never wrap anything containing a sticky index letter.** Containment breaks sticky
  positioning on everything inside it, so `.row-skip` sits on the row itself.
- **Collection boards get none.** A board's height varies with its member count, and a fixed
  placeholder drifts the reader's scroll position at the exact moment a continuation board merges.

### The two capture viewports

Item frames are 2:3 (below). **A viewfinder is not an item**, and the two viewports are not even the
same shape as each other, on purpose:

- **Barcode scanner** — full column width × **192px**, landscape, because an EAN-13 is landscape. A
  portrait window makes the reader back away until the whole code fits, shrinking the barcode within
  the sensor frame by the exact mechanism the window was meant to help. 192px gives a 667px document
  exactly, so the manual escape stays above the fold on every phone.
- **Cover capture** — full column width × **240px**, landscape, aimed at a disc case's printed
  **title** rather than its whole cover, because the artwork the reader eventually sees comes from
  TMDB and never from this photograph. Measured at 390×667: 240 fits exactly, 264 scrolls. At that
  same ceiling a 2:3 frame would be only 160px wide, so the landscape shape is what makes the
  geometry possible rather than a preference. **When a notice is present above it, the frame shrinks
  by the notice's height** rather than pushing the escape off-screen.

Matching a frame to its subject is the same principle behind the single item ratio; applied to a
viewfinder it produces two different, non-upright numbers. **This asymmetry must not be smoothed
into a single viewfinder shape or reconciled with the item ratio.**

The captured image is **exactly the previewed region, at intrinsic sensor resolution** — our own
canvas, source rectangle equal to what `object-cover` displays. `react-webcam`'s `getCanvas` sizes
from `video.clientWidth` unless `minScreenshotWidth`/`forceScreenshotSourceSize` is set, and draws
the *whole* sensor frame, so the default sends a wider scene than the reader framed, small. A
preview that displays one thing while the app sends another is the defect class this project keeps
fixing.

**A title-band crop is refused** — DVD titles sit at the bottom, at the top, and occasionally
vertically on a spine, and `handleVideoDetection` returns early when OCR extracts nothing, so a band
that misses produces an uncorrectable dead end instead of a wrong `extractedTitle` the reader could
fix on the results screen.

### The frame, and how books and films differ

**One ratio for every item: portrait 2:3.** Trade book covers sit near 2:3 and TMDB serves posters
at exactly 2:3, so a single frame crops nothing and the stream keeps one row height.

**Type is not marked.** Books and films take the identical frame; the only place the difference is
legible on a row is the Plate Line — `AUTHOR` against `DIRECTOR · YEAR`.

Libraries here are organised by type (Romans, Films, Bandes dessinées, Polars), so within any one
stream a type marker labelled a distinction that barely varies and charged every row for it. A spine
rule was also drawn *over* the poster's left edge, defacing every film cover to restate what the row
already said.

**The residual is real and accepted: in the sparse-metadata case, type is not recoverable from the
row.** `releaseYear` is nullable, and neither `authors` nor `directors` is required, so a book and a
film with neither print title only above an identical empty frame. Accepted because the dominant job
is answering *do I own this* while holding the object. Anything that closes the gap must close it in
the **Plate Line**; reinstating a frame marker would reintroduce the cost the removal was for.

> A DVD keep case is ~5:7 and a Blu-ray case ~4:5 — both portrait, which is why films were never
> framed landscape. The frame stays 2:3 because TMDB serves posters at exactly that ratio.

### The row carries recognition; detail carries identification

| Field | Row | Detail |
|---|---|---|
| Author, director | yes | yes |
| Film's year | yes — it disambiguates remakes and situates the film | yes |
| ISBN, TMDB id | **no** | yes — an edition matters when you are examining one object |
| Runtime | **no** | yes |

`9780451524935` occupies as much of a line as "George Orwell", sets in mono so the eye goes to it
first, and tells a human nothing. Runtime is for deciding what to watch tonight, which is not what
this product is for. **The test for a row field is whether it helps someone recognise a thing they
already own**, not whether it is true or available.

One exception, on a detection candidate row only: a film candidate's runtime folds into the Plate
Line — `DIRECTOR · YEAR · RUNTIME` — as a **confirmation** field, since the case is in the reader's
hand and prints its runtime. It must not grow a line: on a comparison screen every row's height is
paid five times.

### Where the primary action sits

| Screen | Primary | Where |
|---|---|---|
| Libraries root | New library | bottom bar, in thumb reach |
| Library browse | Add an item | header right slot |

**This is a difference, not an inconsistency awaiting correction.** It has been proposed for
unification twice and refused twice.

- **Density, asymmetric.** A bottom bar costs ~80px plus inset, ~9% of an 844px viewport. On the
  root, where a short list has dead space beneath it, that is free; on the densest surface in the
  app it is expensive.
- **Frequency, counted correctly.** The capture flow loops internally, so Add is pressed once to
  enter a cataloguing session, not once per book.
- **The physical scene.** The one-handed moment is the bookshop, which is lookup. Cataloguing is a
  stack processed at a table with two hands free.

**For a screen not listed: the primary action goes wherever it costs that screen least.** Placement
follows density and real frequency, never a template applied for symmetry.

### What a plate carries

| Surface | Plate carries | Source |
|---|---|---|
| Library row | the library's item count | `totalItems` |
| Collection board | the member count, bare | `itemCount` |
| Collection member | its order in the series, 1–1000 | `order` |
| Standalone item | **no plate** | — |
| Item detail | the collection order when the item is in one, drawn **inside the frame** as on the stream — never a second plate beside it; otherwise no plate | `order` |

There is no item ordinal in the data — no index, no `createdAt`, and listing pages are alphabetical
behind an opaque token — so a per-item sequence number would be invented data wearing the imprint's
clothes, unstable across pagination besides.

**A plate carries a bare figure and no prefix; the container says what the figure is.** Nothing
needs to caption which is which. `⌗` (U+2317) was used once and **does not exist in Archivo at all**
— not missing from our subset, absent upstream. `#` was rejected as a replacement because it reads
as *number*, which is an ordinal where the plate holds a count.

### Where the yellow goes

An earlier draft spent `--imprint` on counts, which inverted the product's first principle: the home
screen's loudest marks all served browsing while search, the dominant job, was quietest.

**`--imprint` marks the apparatus of finding and acting** — the search field, index letters, the
active state, primary actions. Counts are inventory. The plate survives as a structural device; only
its fill changed, from yellow to none. **Yellow is how you find and how you act; ink is what you
own.**

### The index alphabet

The stream's order is the server's, and the server folds it: `NormalizeForSort` in
`internal/persistence/normalize.go` runs NFD → strip combining marks → NFC → lowercase. The client
reproduces the bucket key with the same fold:

```
title.normalize('NFD').replace(/\p{Mn}/gu, '').normalize('NFC').toLowerCase()
```

**The client never sorts.** It renders in the order the API returns and computes bucket labels only.
`localeCompare` is forbidden — it would disagree with the server's paginated order and make the
sticky letters non-monotonic.

**The alphabet is not A–Z.** NFD strips only *combining* marks, so `Œ` and `Æ` survive and sort
after `z`; digits and punctuation sort before `a`.

**Nothing is collapsed.** The label is always the actual folded first character, uppercased —
letters, digits, ligatures, punctuation alike. `1984` files under `1`, `Œuvres complètes` under `Œ`,
`Élan` under `E`. Folding `Œuvres` to a display `O` would be a lie: it sits after Z, and a reader
sent to the Os would not find it. Near-empty head buckets are rare, truthful and cheap.

**A title can fold to nothing** — composed entirely of combining marks — and only then does the
client fall back to the raw un-folded first character. A monumental letter showing nothing is worse
than an odd glyph. Only a genuinely empty title, which the catalogue forbids, produces no label.

### The index letter's stroke

**`--imprint` fill inside a 2px `--ink` text-stroke, at 76px / wght 900 / wdth 62.5%, over a 4px
`--ink` rule.** Verified against pixel-level crops in the real face: `M`, `N`, `P` and `Œ` all keep
open counters. The `wdth` axis narrows glyphs 24–37% (`M` −27.1%, `N` −37.3%, `P` −32.4%, `Œ`
−36.5%, `#` −24.1%, `A` −31.5%). **Parameters are set from rendered output, never from reasoning;
re-verify against crops whenever weight, width or stroke changes**, and note that `font-stretch` is
silently ignored by a face with no width axis.

**There is no symbol carve-out. One treatment covers every glyph the fold can produce.** `#`, the
worst case, measures 96.6% single connected fill.

The rejected alternatives, two of which remain right:

| Candidate | Outcome |
|---|---|
| Retune the stroke (0.85px / wght 400 / wdth 100%) | **Rejected.** Abandons the specified letterform and thins the stroke below what makes yellow legible at all. |
| Ink letter on an `--imprint` plate | **Rejected on palette law.** In the live stream it reads as a tappable chip, landing on `PlateButton`'s primary silhouette. A passive separator must not wear the active-state treatment. |
| Solid `--ink` letter, yellow on the rule | **Beaten on the job.** Genuinely more robust — solid ink cannot collide in any face — but at 76px it is the same colour as the row titles beneath it, so it reads as oversized content rather than as a mark, and it moves `--imprint` off the primary wayfinding device. |

---

## 5. Component vocabulary

| Component | Description |
|---|---|
| **Volume Frame** | The item's artwork frame — a 2px rule, portrait 2:3 for **every** item. Nothing is drawn over the artwork. **Three sizes, one ratio:** `row` 48×72 (browse stream, where words do the work); `hero` 132×198 (item detail, ruled in `--paper` because the ground is black); `candidate` 88×132 (detection results, where the picture is what decides the match and choosing a wrong edition writes a record the reader cannot afterwards detect as wrong). **"Ruled" means the rule and nothing else — the empty frame carries no fill**, on either surface: a filled rectangle where artwork belongs reads as a failed image. A thumbnail that fails to load degrades to that same ruled frame and retries 4s later, **exactly once**, then holds. The bound matters because the address is synthesised from a template without checking storage, so a 404 is the common case and an unbounded poll would re-request every 4s on every visible row. The retry **re-arms when the address changes** — the address carries `?v={updatedAt}`, so a change means the item was genuinely written to. On item detail the frame carries the `Fetch cover` repair control when a `pictureUrl` exists **and** the image failed to load; the control lives on the page, not this component, so stream rows carry no per-row action. It takes the unfilled secondary Plate Button, inset one division horizontally and two vertically. **Its 2px rule is load-bearing and must not be tidied away as a box inside a box** — without it, caps centred in a ruled frame is exactly the *Empty* state, so `FETCH COVER` would read as a caption rather than an action. At 132px the label wraps to two lines, accepted; shortening to `FETCH` would drop the noun. |
| **Volume Plate** | A 2px ruled rectangle with `--ink` mono figures, **no fill**. Carries only a real count or order: `totalItems`, `itemCount`, `order`. Never an invented sequence number. Absent on standalone items. A `filled` variant exists on the component and **no caller passes it** — the yellow branch is unexercised. **The collection member's plate departs twice**, argued in `VolumeFrame.jsx` where it is drawn: a **`--paper` fill**, because it is the one plate with a picture behind it, sitting bottom-right *inside* the frame; and a **1px rule**, because at 10px, 2px of rule around two digits is mud. The order is padded to two digits so `07` and `12` occupy the same width. |
| **Search Field** | A **real text input**, never a link costumed as one: `--imprint` ground, the loudest mark on the screen that carries it. **Pinned on the libraries root and nowhere else** — it searches every library, so on a browse screen the loudest affordance would promise to leave the library being browsed. One field, one screen, no scope modes. Opens the full-screen search surface and returns the reader exactly where they were. `type="search"` gives WebKit a blue clear button in a colour absent from the palette; the browser suite samples the rendered field and fails on any pixel where blue clearly leads. |
| **Plate Line** | The engraved line under a title. Book: `AUTHOR`. Film: `DIRECTOR · 1974`. On detail it gains the edition — `AUTHOR · ISBN`. On a film candidate row it gains the runtime. Fields differ by surface; the line's position does not. Names set in the sans; **only figures take the mono**, so a film's year is mono and a person's name is not. **It never carries the library** — the line is the *work*; a library is where a *copy* is kept. Location belongs to the Detail Marks. `detailLineParts` returns the ISBN, which no row may print, so the candidate construction is written out rather than derived from it. |
| **Detail Marks** | The column beside the item-detail hero, holding everything true of the *copy* rather than the work: `IN <library>` as a link, the Shared Ribbon when the library is shared either way, and the Overprint Stamp when the item is out. Reading order: where it is filed → who else can see it → whether it is here. The first two are facts about the **library** and the stamp about the **item**, so they space as two clusters — at a uniform gap `SHARED · 2` read as though the book itself were shared. **The stamp lives here, not under the title rule.** `IN` is an interface label and takes caps; the library name is content and never does. The link is underlined rather than `--imprint`: it is navigation, not a primary action. The sharing mark's green edge is an absolutely positioned rule hanging into the column's left padding, never a `border-left`. |
| **Search Row Marks** | What a search result adds to a stream row, and nothing else — `SearchRowMarks` fills the `marks` slot `ItemRow` leaves empty, and the search screen is its only caller. Two facts: `IN <library>` (where the copy is filed) and `FROM <owner>` (whose shelf), the latter only on a library shared *to* this reader and delegated to the Shared Ribbon. 13px in the quiet register, one division under the Plate Line, with **the library name alone lifted to `--ink`**. Labels take caps at 10/800/+0.16em; the name and address never do. **It is a tag and not an edge** because a lent item already draws the `--out` rule on that left edge, and a lent book on somebody else's shelf must not have to choose which state to show. Deliberately **not a link**: it renders inside the row's own link, and an anchor inside an anchor would give one row two destinations. |
| **Index Letter** | Monumental sticky letter — `--imprint` filled with a 2px `--ink` stroke — over a 4px `--ink` rule. **A separator, not a heading**: it marks position, it does not title a section. One treatment for every label. **Its count appears only on a closed run**, a run closing the instant a different letter follows; the run at the tail of the loaded stream shows no count and no placeholder, because a number that grows while the reader looks at it is worse than none. The count is items — standalone entries plus each board's `itemCount`, counting a board once and ignoring `partial`. **It is a phrase, not a figure**: `12 volumes`, 11px, quiet register, singular at one. Only the number takes the mono. |
| **Overprint Stamp** | Rotated −4°, a 2px `--out` outline, caps at 10/800/+0.14em. Marks a lent item and **carries words, never colour alone**. **Two variants:** on paper, `opacity-[0.92]` with caps in `--ink` and `px-[6px] py-[2px]`, so it reads as ink pressed over paper; inverted on the black cover, caps in `--paper` at full opacity with `px-[5px] py-px`, because there is no paper ground for the opacity trick to read against. **On a row it reads `OUT` alone; the borrower and duration belong to item detail** (`OUT · MARIE · 6 DAYS`) — `lentTo` permits 50 characters and nothing is ever truncated. A third use: the boxed Ledger Row renders it **bare**, since that row's own two lines already state both. On detail the stamp and the ledger's first row do state the same loan, and that overlap is allowed — the stamp is current *state*, the ledger is the *record*, and the open loan is the one row where they coincide. |
| **Shared Ribbon** | 4px `--shared` left edge rule plus a caps tag: `SHARED · N` outbound, `FROM <owner>` inbound. The owner is a Cognito username, which for a native signup is an email address, so it is content and never uppercased. Its outbound figure is a labelled datum and takes the mono. |
| **Collection Board** | A grouped collection: a 3px frame, the member count in a plate, a 2px rule under the head, members inset by one division. **Members render unconditionally** — there is no expanding and no collapsing, no toggle, no state, no control to press. The board is filed alphabetically under the **collection's** name while members run in `order`, so a board under "S" may legitimately open with *Aliens*. No `SERIES ORDER` label: every member already carries a numbered plate, and a numbered sequence needs no caption saying it is in sequence. **One caps label earns its place: `CONTINUES`**, under the name at 10px in the quiet register, on a board the server flags `partial` **with no predecessor on screen**. Normally a partial board merges into the board already on screen and nothing needs saying; an orphan has nothing to merge into, and without the label reads as a duplicate. A member plate reading `07` does not prove continuation — orders run 1–1000 and a collection need not start at 1. Excluded from `.row-skip`. |
| **Sheet** | Bottom sheet on `--paper-deep` with a 3px `--ink` top rule and square corners, rising 200ms linear — the press, not a spring — and instant under `prefers-reduced-motion`. Constrained to the 448px column and centred, with its own bottom safe-area padding, capped at `max-h-[80dvh]` with internal scroll. Its heading is the content's own name at the Row Title step, 17/600, never uppercased, so it reads as that row expanded. `text-ink` sits beside `bg-paper-deep` on the same element — stricter than the general ground rule and right here, because a sheet's body is caller-supplied. A **`bg-ink/40` scrim** fills the space above and dismisses on click; it is **a plain div, not a button**, having been a 545–657px-tall `<button aria-label="Close">` first in the tab order. The panel is **portalled to `document.body`**, because every page mounts it as a sibling of its own `<main>`. The app root takes **`inert`, not `aria-hidden` alone** — `aria-modal` is a promise that nothing outside is reachable, and the search field and library links behind an open sheet measured as tabbable. A **module-level open-sheet counter** governs the lock, because sheets overlap and per-instance restore would let the first to close release it while another is still open; the body's prior overflow is captured and put back verbatim. **Every `data-scroll-region` is frozen alongside the body**, collected by query at lock time. That freeze is **defence, not a repair**: in Chrome nothing reaches the region behind a sheet anyway, since the scrim is `fixed inset-0` and portalled to `<body>`, but an overlay does not reliably stop a flick from chaining on touch. The **focus trap is re-queried on every keypress**, not captured at open, because a sheet's controls change as its mode does; the panel, which holds focus at open, counts as sitting *before* the first control or Shift+Tab walks out the back. On close **focus returns to the opener**, remembered at open. A **`Close` Mark sits inside the panel** and is the only control carrying that name — Escape closes too, but a phone has no Escape key. |
| **Toast** | The confirmation surface, mounted once for the whole app by `ToastContext` and never per screen. Bottom-anchored on `--paper-deep` under a 3px `--ink` top rule, in the 448px column with its own bottom safe-area padding. Announces **politely**, clears after four seconds, and takes **no pointer events at all**, so it can never intercept a tap meant for the screen it is congratulating. **Confirmations only, and the provider is built so nothing else is reachable**: it exposes exactly one verb, `confirm`, with no failure form to call. A failure is inline and in place; a destructive action confirms *before* it happens. **Its text is never uppercased** although it is an interface sentence — every message embeds content, so caps would shout a French title or somebody's name. Sentence case, sans, 14px/600. |
| **Update Notice** | `UpdateNotice`, the surface for a waiting service worker, raised by `UpdatePrompt` and nothing else. The same printed form as a toast — bottom-anchored, `--paper-deep`, 3px ink top rule, 448px column, safe-area padding — and a different kind of thing. `NEW EDITION` in caps at 10/800/+0.16em, a 14px line saying a newer printing is ready, and a single primary plate reading `Reload`. *Edition* rather than *version* because an imprint issues editions. **It is persistent, which is exactly why it is not a toast**: the offer must survive being ignored. **It carries no dismiss control, deliberately** — a reader who ignores it goes on using the edition they have, without being taught the notice can be made to go away for good. Takes the status role, not alert. Without this surface the app cannot be updated at all. |
| **Plate Button** | Primary: `--imprint` plate, ink caps. Secondary: a 2px ruled outline, no fill, rule and caps both `currentColor`. Destructive: a 2px `--out` outline with caps in **`currentColor`, not `--out`** — red at 4.11:1 would be the least legible text in the app on the control where a misread costs most. `currentColor` rather than a hardcoded `--ink` because the variant paints no ground and must follow the ambient foreground; a hardcoded ink shipped once and was invisible on the black cover. **A disabled primary renders as the ruled outline, never a tinted plate** — a 50% `--imprint` is a new colour meaning "disabled", which palette law forbids, and it drags its label under the contrast floor. Becoming a filled plate when the form is valid is itself the affordance — visually only, so a disabled button also carries a `reason` as `sr-only` text **inside its own label**, joining the accessible name, since `aria-describedby` on a non-focusable control is reachable only in browse mode. Sets `relative`, load-bearing (§4). Its `forwardRef` has exactly one caller: item detail's in-place delete confirmation. |
| **Field** | Form input: no radius, a 2px bottom rule, a caps label above at 11/700/+0.12em in the quiet register, no floating label — a floating label would animate, and print does not. The control sets 16px (§3). **Four surfaces, one component:** a plain input or textarea; a password field; a select; and the note row beneath any of them. **Password** carries a **reveal mark** at its right — a hand-authored eye at 2px stroke, slashed when showing, toggling `type`. A Mark rather than a `SHOW`/`HIDE` label because the state is already legible in the field itself. It **always opens masked, on every mount, and never remembers**: a revealed password surviving a back-navigation onto a screen someone else can see is a real exposure. The bottom rule moves onto the row, since input and mark are one field, and the row indicates only when the **input** is focus-visible so the mark keeps its own ring. **On that row the rule is DRAWN, not bordered** — an absolutely positioned 2px bar — because as `border-b-2` it sat outside a `min-h-12` input and made the field 50px against every other field's 48. The browser suite asserts the painted bar, which a border would never have needed. **Select** keeps the native control — real, focusable, keyboard-operable, with the platform picker — and replaces only its arrow: `appearance-none` plus a hand-drawn `ChevronDown`, `aria-hidden`, out of the tab order. **Textarea** takes `resize-none` and gets height from `rows`; a **number** input refuses its spinner, which takes three declarations (`-moz-appearance: textfield` plus both WebKit spin-button pseudo-elements). **There is no `outline-none` anywhere in this component, deliberately** — Tailwind's utilities sit in a later cascade layer than the focus rule, so suppressing it here would kill the ring on every input in the app while its colour and width still resolved correctly. The **note row** renders when any of `error`, `hint` or `counter` exists: note left, counter right. `counter` prints `<n> LEFT` with the figure inheriting the mono and the caps word reset to the sans, weight stated. `liveHint` is opt-in and marks a hint whose *change* is the information; making every hint a live region would announce unchanging text on each render. `required` sets both `required` and `aria-required`, which works only because every form carries `noValidate`. **The error treatment:** the bottom rule turns `--out`, `aria-invalid` is set, and the note sets at 13px in `--ink` with `role="alert"` — red on the rule, never on the words. |
| **Ledger Row** | One loan pairing over two lines, separated by a hairline. **Line 1: the borrower's name and the duration.** Line 2: `LENT <date> · RETURNED <date>`, or for an open loan **`LENT <date>` alone**. Caps are interface labels in the sans with weight stated; dates are numerals in the mono. **There is no arrow** — `→` is absent from every shipped cut of both faces. An en dash was rejected: a dash states a *range*, and `07 Aug 2026 – still out` is a date beside a state. Labelling both endpoints works for a closed loan and a live one with the same grammar. The name comes from the **`LENT` event only**; the `RETURNED` event's name is ignored, because the returner is the borrower. The name is content and sets in the sans; the word `days` beside the figure stays in the sans too. A 50-character `lentTo` is why the row is two lines and nothing is truncated. An **unresolved** pairing — a `LENT` superseded by another with no `RETURNED` between — takes the open loan's line 2 and reads `no return recorded` in the duration slot. **A boxed row renders a bare Overprint Stamp on an open loan**: the comp marks an open loan by brightening the line, which has somewhere to go only on the cover, and palette law permits no eleventh token to invent a brighter paper tone. Gated on `boxed`, which already means *this is the paper ledger card*. Inside a bordered card the row takes `px-4` with the separator still spanning full width; in a flush text column it takes none. |
| **Row Actions** | The visible duplicate of long-press, at the right of any row with a sheet behind it. **Three 3px ink squares** — not round dots, not a text ellipsis: the world has no radii, and a glyph falls back to junk. 48px target, negative-margined so it does not inflate the row. **Absent on rows with no actions**, which is how a read-only shared library declares itself. |
| **Pull to refresh** | The touch shortcut for reloading a list. **The threshold is measured in finger travel, never in the transformed offset** — resistance is a visual affordance, and dividing the trigger by it silently multiplies the required drag (at 0.4 resistance a 64px offset threshold demands 160px of travel). Trigger at **72px of travel**; let the offset stay damped and capped for feel. Two feedback states in the caps register: nothing before the threshold, where the paper moving is the whole signal, then `RELEASE TO REFRESH`, then `REFRESHING`. Without the middle state a reader cannot learn how far to pull. |
| **Capture Caption** | The one caption construction both camera viewports use, with five instances behind it — a component precisely so measuring one measures all. Caps register, 11px/700, no tracking declared, so it takes the caps baseline. Barcode: `REQUESTING CAMERA ACCESS`, and on an automatic decode `CODE READ · LOOKING IT UP`. Cover: `REQUESTING CAMERA ACCESS`, `LOOKING UP THIS COVER` after the shutter, and `FRAME THE TITLE` while idle. **A viewport must narrate, because the slowest call in the product otherwise hides behind a frame that looks idle.** The scanning case is sharp: nothing was tapped, so without the caption the reader gets no acknowledgement the code was read. **It announces politely** — on that path the caption is the only acknowledgement, so a narration nobody hears is not a narration. The feed keeps running underneath as the proof nothing has died; no spinner, no wash, no progress device. It paints its own opaque ground (§2) as a full-width strip at the frame's bottom edge, so it reads at 18.18:1 whatever the camera sees and cannot occlude the region being aimed at. **`FRAME THE TITLE` is first-use only**, gated on the session tally: an instruction that has been read is furniture. On the film viewport the three conditions are mutually exclusive by construction (`state === 'ready' && !busy`), so stacking is impossible rather than merely avoided — they are **not** a partition of every reachable state, since denied and unsupported carry no caption. |
| **Filing Mark** | `FilingInto`, the `FILING INTO <name>` mark naming the collection the current session files into. Printed, never a toast: it must survive being ignored for a whole session of back-to-back scans. It appears on the four screens a session touches. Label in caps at 11/700/+0.16em in the quiet register; the collection name is content and resets to sentence case at 13px. **Absence is what says standalone**, and it is never a gate on anything — the name is fetched best-effort and a failed lookup is swallowed. **Its rule is where it appears: only on a surface with nothing else stating the destination.** A manual entry form carries a collection control showing the collection, so it takes no mark. |
| **Flow Marks** | `FlowMarks`, the row carrying the filing mark and the session tally together — one thought, and one component because either half can be absent. The row itself is absent when both are. The tally reads `FILED THIS SESSION · N` in the same caps register, neither half outranking the other, and **its figure takes the mono**. It exists because filing was otherwise completely silent: the write succeeded and the app returned to a screen textually identical to a fresh arrival. A toast answers *that one went in*; at item ten the question is *where did I get to*. **A session is defined by where the count lives** — a provider mounted as the layout route above the four add-flow routes, holding for as long as the reader is inside the flow and resetting to zero when they leave. No timer, no storage key. Navigation state was refused because the flow's real inputs travel in the query and probes assert that nothing rides in state on the hop to the candidate list; `sessionStorage` was refused for surviving too much. |
| **Marks** | The few universal affordances left after the no-icons-for-state rule. **Hand-authored SVG at 2px stroke on the division scale; no icon library** — an imported set would arrive at someone else's stroke weights and optical sizes. Nine, all used: back, the select's chevron, search in two cuts (16 for the pinned field, 20 for the header plate), add, close, check, copy, and the reveal pair. Row Actions is not among them; its three squares are boxes. **State is never a mark**; state is a stamp, a ribbon or a rule. **A Mark carries no colour of its own** — stroked in `currentColor` at 2px, no fill, `aria-hidden`, out of the tab order, so the control around it owns both the colour and the accessible name. The shared base sets no `stroke-linecap`, so every mark renders at the SVG default of `butt`. The back Mark is two colours: **`--ink-soft` on paper** and **`--imprint` when the header is inverted**. |

**Three components wear one printed silhouette.** The Sheet, the Toast and the Update Notice are all
bottom-anchored, centred in the 448px column, on `--paper-deep` under a 3px `--ink` top rule, with
their own bottom safe-area padding. What separates them is behaviour:

- **The sheet is modal, and only the sheet is.** It alone lays a scrim over the space above, dismisses
  on a tap outside, portals out of the page, inerts the app root, traps focus and hands it back on
  close, and caps its height to scroll internally. Neither of the others moves focus.
- **The toast is transient and inert.** Four seconds, no pointer events, and it sits *below* both of
  the others.
- **The update notice is persistent and offers exactly one action.** No dismiss.

**The test for anything later reaching for this silhouette: does it block the app, does it leave on
its own, or does it wait?** A surface that blocks needs the sheet's entire apparatus. One that leaves
must carry nothing the reader has to act on. One that waits must not auto-dismiss, must not be
dismissible by accident, and must be worth the space for the whole time it holds it.

---

## 6. State grammar

| State | Expression |
|---|---|
| Default | ink on paper, 2px frame |
| Active / selected | `--imprint` plate or fill; never a colour wash over content |
| On loan | The Overprint Stamp, in three places, with a 4px `--out` left edge rule in one. On an item row: `OUT` alone beside that edge. In the Detail Marks column: borrower and day count, no edge, since there is no row for an edge to run down. On the boxed ledger card: a **bare** stamp, since the row's two lines already say who and how long. |
| Shared out | Shared Ribbon, `SHARED · N`. **Library rows and the Detail Marks column; never on a row in an item stream.** |
| Shared with me | Shared Ribbon, `FROM <owner>`. The same two places. The restriction is against repetition **in a stream**: inside a library provenance is declared once in the header; on item detail once beside the cover. On the cover the green moves to the edge and the caps take `--cover-body`. |
| Read-only | Actions are **absent**, not disabled, and provenance is declared in the header |
| Empty | A ruled frame with a caps invitation, at the same weight as a full block |
| Loading | Ruled skeletons at the shape of what is coming, so the layout does not move when content lands, with the skeleton block `aria-hidden` and `aria-busy` on the `<main>` — the region announces it is working while its contents announce nothing. **A bar is not a frame:** a bar stands in for a line of text and carries a fill; a frame stands in for artwork and carries its rule and nothing else. The fill is the recessed paper tone, and on the cover a **quarter-strength `--cover-rule`**. |
| Appending a page | `Loading more`, 11px caps in `--ink-soft`, centred, `role="status"`, **below the stream rather than in place of it**. **Three shapes share the word *loading*.** A **cold mount** empties the entries first, so skeletons are all there is. An **append** draws no skeleton: the rows stay and one line beneath them says more is coming. A **pull-to-refresh** sets the same loading flag and does not empty the entries, so skeletons draw **above** the rows still on screen and the reader sees both until the response lands — deliberately, rather than blanking a thousand-item stream for a request they trust. When it arrives it replaces the stream outright, since a refresh loads with no token. Pagination itself stays invisible — no page number, no control, no count. |
| End of list | `End of the shelf`, 11px caps in `--ink-soft` under a 2px `--ink` top rule, **left-aligned like every other row in the stream**. Renders only when the stream is complete **and** has something in it, so an empty library is never told it has reached the end of itself. |
| Route chunk pending | `RouteFallback` — a different absence from *Loading*: the content is not late, the **code** is. **Every** screen is lazily imported behind one suspense boundary, sign-in included. It paints the full-height paper ground so nothing jumps, carries `aria-busy`, and renders a **working back control**, because the header lives inside the chunk that has not arrived. No title and no landmark, deliberately: it does not know which route it stands in for, so stepping back is the only honest destination. |
| A viewport narrating a lookup | The caps register in `CaptureCaption`'s printed plate, `aria-live="polite"`, while the feed keeps running underneath. No spinner, no wash, no progress device. Film: `LOOKING UP THIS COVER`, naming the control tapped. Book: `CODE READ · LOOKING IT UP`, two facts where the other carries one, because nothing was tapped. |
| Artwork present but unavailable | `picture` is synthesised from a URL template whenever `pictureUrl` exists, without checking S3, and thumbnails are produced asynchronously — so a fresh item returns a URL that 404s for a while. The frame degrades to the ruled empty frame, **never a broken-image glyph**, and retries once at 4s, then holds; it re-arms only when the address changes. Applies to every frame in the stream. On item detail the same condition raises `Fetch cover`. |
| Error | Inline, in place, always `role="alert"`, never a toast alone. **One state, four constructions, chosen by the ground underneath.** On paper: a 2px `--out` top rule over `--paper-deep` with `text-ink` set in the same rule. Inside a sheet: the same top rule over `--paper`, because the panel is already `--paper-deep` and nothing recesses into the ground it stands on. On the black cover: a full 2px `--out` box with **no ground at all**, text inherited from the cover root — legitimate precisely because nothing here paints a background. On a field: no block, the input's own bottom rule turning `--out` with `aria-invalid`, message beneath at 13px in `--ink`. **Recovery is a control, never an instruction to perform a gesture** — "Pull down to try again" tells a keyboard user to do something they cannot; the block carries a `Try again` action, with pull-to-refresh remaining the touch shortcut rather than the only route. |
| Confirming a destructive action | **Delete confirms in place, and the construction differs by where the trigger lives.** Four of five are in a sheet: the three actions sheets swap their body to a delete mode, and clearing a record opens a dedicated sheet with no modes. All four read alike — one 14px sentence naming precisely what goes, then the destructive variant beside `Keep it`. **Only `Keep it` is common**, because the destructive label names its own outcome: `Delete for good` on a library and an item, `Clear for good` on a record, **`Remove the grouping`** on a collection, where deleting orphans members and a promise to delete for good would promise the opposite of what the endpoint does. Those four inherit the dialog role, focus trap and inert background from the sheet — but **not an announcement**: the sheet moves focus once, at open, so a body swapping to delete mode announces nothing. A known gap. On item detail there is no sheet, so the confirmation authors it: a `role="group"` labelled `Delete <title>?`, expanding **in place of** the Delete trigger in the same action row, its description an `aria-live="assertive"` paragraph that is also the visible text — one node for both audiences. That paragraph takes a 2px `--out` top rule, or at the same size and colour as the summary above it the confirmation reads as one more line of prose. `alertdialog` was tried and withdrawn: it is a variant of `dialog`, and assistive tech expects trapped focus and an Escape route, neither of which inline content has. Focus moves to `Keep it` on reveal, never `Delete for good`, and back to the remounted trigger on cancel. **The two are deliberately not extracted into a shared primitive** — one component would carry both halves and use exactly one per site. |
| Offline | Declared honestly; the app is online-only by decision (see `/PRODUCT.md`) |

**A state derived from a failure is cleared by the success, not by a timer.** The frame's `failed`
flag serves the artwork retry; item detail reads the same flag to raise `Fetch cover`. Cleared on the
4s clock, a **successful** repair left the button on screen looking identical to "that did not work".
The condition must be invalidated by the arriving data. The fix belonged on item detail, **not** in
the shared frame, whose timer serves every row in the stream: **a fix belongs where the new reading
was added, not in the shared thing it read from.**

**The action slot never holds an inert control.** A reserved slot always carries the most useful thing
for the current state, in one of two forms:

- **The reason is visible** — a required field sitting empty directly above. The action renders as the
  ruled outline and fills to a plate when the form is valid; no words needed. **This holds only while
  the disabled primary is the only ruled outline in its row.** A same-colour ruled neighbour makes
  commit and abandon identical at rest. A `--out` destructive outline beside an ink one is already
  distinguishable, so delete confirmations keep this simpler form. A lone submit keeps it too.
- **The reason is not visible** — a limit exceeded, a constraint the reader cannot infer. The slot
  carries the reason *instead of* the control, in the control's own position. **Not in the caps
  register**: unshare's over-limit bar sets a 14px sentence carrying `role="alert"`, because caps means
  interface label and a constraint the reader cannot infer must also be *announced*.

**When a neighbour collides, ask first whether it should be a button at all — the second form is the
last resort.** On `AddBook`, `Enter by hand` is **navigation to another route, not an action on this
screen**, so it takes the underlined-link treatment (§5, Detail Marks) rather than a Plate Button.
The disabled primary is then the only ruled outline in its row and the first form applies. **A
collision between two controls is usually a sign that one of them is the wrong component**, not that
the other needs a caption.

**An edge rule never displaces content.** Draw it as an absolutely positioned pseudo-element, not as
`border-left`: a border adds its width to the box, so a lent or shared row would sit 4px out of
alignment with every unmarked row beside it.

**Plates sit in a fixed-width column.** A count plate is as wide as its number, so `412` and `77`
would start their titles at different x positions. Reserve the column (56px at row scale) and centre
the figure.

**Before tuning two states apart, establish whether they can co-occur.** "Do these read too much
alike" is the second question; the first is whether a reader can ever see both at once. `NO COMPLETE
LOAN` and a row's `no return recorded` are **structurally mutually exclusive** — the caps state
renders only when `loans.length === 0`, and an unresolved loan is still pushed onto that array. A
structural answer holds under every future restyle; a perceptual one has to be re-argued every time
something moves.

**One left edge per element.** The two edge rules cannot collide because they address different
scopes: sharing is a library-level fact in this API — items are never individually shared — so
`--shared` marks library rows and `--out` marks item rows. Inside a shared library an item on loan
takes the `--out` edge while the header carries the provenance. On a search row a shared library is
named with an inline `--shared` tag, keeping the left edge free. Should the two ever meet on one
element, the state the reader can act on wins.

**Unshare's bar holds four states, and the height (80px) is reserved across all of them so nothing
jumps.** Nothing selected → the hint `Select who to remove`. Past the ten addresses the API takes →
the reason replaces the control. Otherwise the action, `Remove <n>`. Confirming → `Remove for good`
beside `Keep access`. A fifth branch renders nothing at all, for a library shared with nobody.

---

## 7. Motion

Print does not ease. Motion is **the press**: short, mechanical, un-sprung.

| Event | Motion |
|---|---|
| State swap | 80ms, linear |
| Sheet | 200ms rise from the bottom edge |
| Stamp appearing | No animation. It is printed. |

No springs, no parallax, no hover flourishes. Under `prefers-reduced-motion` every transition becomes
an instant swap. This austerity is also cheap, which suits a PWA on a phone.

**There is no route transition and no collection expand.** Navigating between screens is an instant
swap, which is the more consistent answer anyway. A Collection Board holds no open state and has
nothing whose height changes.

---

## 8. Accessibility

- Contrast targets per §2, with `--out` restricted to large/bold text, rules and stamp outlines.
- Minimum touch target 6 divisions (48px). Where a control's own box is smaller, a `::before`
  expansion supplies the hit area — **measure the hit area, not the element box.**
- Focus ring per §2, which owns the reasoning and the one control that merges. Not restated here as a
  value: a rule restated in a summary list is a second copy that can go stale.
- Every state carries **words**, not colour alone: stamps and ribbons have visible caps text and an
  `aria-label`.
- **An `aria-label` must never carry fewer facts than the visible text it replaces.** A label
  overrides the content beneath it, so a shorter label is a deletion, and only for the readers who
  cannot see what was deleted. `OUT · MARIE · 8 DAYS` under `aria-label="On loan to Marie"` removed
  the duration from the only readers who could not recover it. Count the facts on each side and make
  them match.
- **An announced outcome must signpost an explanation the reader cannot see.** A `role="status"` does
  not move the reading cursor, so it carries the outcome **plus a pointer** — one clause, not the
  whole paragraph, or a browse-mode reader meets it twice.
- Content titles are never uppercased (§3), preserving French readability.
- Index letters are separators, not headings, and are exposed as such.
- All motion gated by `prefers-reduced-motion`.
- Safe-area padding on the header and any bottom-anchored action:
  `pt-[max(1rem,env(safe-area-inset-top))]`, with `viewport-fit=cover` in the viewport meta. **The
  rule attaches when the layout makes a control bottom-anchored, not when someone edits that
  control's line** — a reviewer reading only changed lines cannot see it.
- Camera capture always has a non-camera path (manual ISBN, manual title search).
- **No orientation lock.** WCAG 2.1 SC 1.3.4 (AA) requires content not to restrict itself to a single
  orientation unless that orientation is essential; a catalogue is not, and the readers the criterion
  exists for are the ones who cannot rotate the device. *Phone-first (portrait, thumb reach)*
  describes a posture, not a constraint to enforce.

---

## 9. What this system refuses

- **Any character the shipped faces do not draw.** `⌗` and `→` both shipped before anyone checked,
  each rendering in a browser-substituted system font inside a line of Archivo or Chivo Mono, in a
  design that names two faces and declares no fallback chain. The cmap assertion in §3 fails the build
  for this now, but the habit is the real guard: **check the font before choosing the glyph.**
- **Native control chrome this world has no vocabulary for.** A `<textarea>` resize grabber is a
  rounded diagonal handle in a system with no radii and no diagonals; suppress it and let `rows` govern
  height. Same for the number spinner and the WebKit search clear button.

  **One exception is permanent: the open state of a `<select>`.** The closed state is fully authored;
  the opened list is drawn by the OS, and on iOS that means rounded corners and a shadow. **This must
  not be closed by building a custom listbox** — a hand-rolled option list forfeits the native picker's
  focus management, type-ahead, VoiceOver rotor behaviour and hardware-keyboard handling, costing more
  accessibility than the two radii it removes. Suppress what the platform draws *where the design has a
  vocabulary for it*; a control's own popup layer does not.
- Warm cream or linen grounds, serif display faces, terracotta accents, wooden or shelf materials —
  the category default, and v2's identity.
- Rounded corners, drop shadows, glassmorphism, gradient fills.
- **Cover-art grids as the primary browse structure.** Not because artwork is unreliable — a very large
  majority of items carry a cover — but because a grid of cover art on paper is the category default
  and v2's actual structure, and it answers *what do I own* far worse than a titled, alphabetically
  indexed list does at a thousand items.
- Colour used to distinguish item *type* (colour is legislated for state).
- Icons standing in for state without text.
- Any UI implying data the API does not have: genres, tags, ratings, due dates, date sorting,
  read/watched status.
