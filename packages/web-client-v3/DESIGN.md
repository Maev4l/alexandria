# Alexandria v3 — Design System

**The Noir Imprint**, text-block rendition.

This document owns the durable visual decisions for `packages/web-client-v3`. Product truth
lives in `/PRODUCT.md`; the UX, IA and screen specification live in `.claude/ui-v3.md`.

> Written before implementation at the user's request. A design system authored ahead of code
> is a specification, not a description: once v3 is built, reconcile this document against what
> actually shipped rather than defending it.

---

## 1. Direction contract

**THESIS.** Every book and film in the collection is a numbered volume in one imprint. It
refuses the arrangement this category always ships — a grid of cover art on warm paper with
serif titles, a terracotta accent and shelves implied under the rows — which is precisely what
`web-client-v2` already is.

**OWN-WORLD.** Gallimard's *Série Noire*: chrome yellow and black, thick framing rules,
numbered volumes, overprinted stamps. The interface is built on the imprint's **text block**
(cool paper white), not its cover; black and chrome yellow are reserved for framing rules,
volume plates, index letters and stamps. The full black cover treatment belongs to the
item-detail hero alone. No serif anywhere, no rounded corners, no shadows.

**STORY.** The reader opens the app to answer "do I own this?", searches from wherever they
are, and reads circulation state as printed marks rather than coloured chips.

**FIRST VIEWPORT.** Libraries as numbered volumes in the imprint, in two labelled sections —
mine, then shared with me — each volume framed with its item count. Search is pinned in the
header. The account plate sits top-right. No bottom tab bar.

**FORM.** The Noir Imprint; candidate 4 of 7 on the grounded list; seed key `484df7fc`,
re-roll round 2, plain register; text-block rendition chosen by the user.

### Why this world and not the obvious one

*Série Noire* published Chandler, Hammett and Thompson, and those novels became film noir. The
imprint historically spanned both books and films, so a catalogue holding both is not a
compromise here — it is the source's native condition. An imprint is also structurally what a
personal collection is: one identity, many numbered volumes.

### Donated disciplines

Five worlds were weighed against this direction and lost on both judging axes. Each donated one
discipline, and each is binding:

| Donor | Discipline |
|---|---|
| Catalog Sleeve | **Nothing is labelled twice.** Every fact appears exactly once, in one place. Repetition is a defect. |
| Iridescent Edge | **State colour lives on edges and rules only.** The content field stays achromatic so a title never competes with its own status. |
| Crane Sequence | **The record carries its own past.** An item's loan history reads on the item itself, not only behind a separate screen. |
| Signal Bench | **One visible division scale.** Every element is dimensioned against it; nothing is spaced by eye. |
| Pixel Stage | **Palette law.** Each colour means exactly one thing and is never spent decoratively. |

---

## 2. Colour

Strategy: **restrained ground, legislated accents.** A near-achromatic paper field carries all
content; four colours carry meaning and nothing else.

### Palette law

Each colour has exactly one job. A colour used for anything else is a bug.

| Token | Value | Means, and only means |
|---|---|---|
| `--paper` | `#F6F6F3` | The ground. Cool off-white. **Not cream** — warm paper is the category default and v2's actual ground. |
| `--paper-deep` | `#ECECE7` | A recessed field: search surface, sheets, form wells. |
| `--ink` | `#0B0B0B` | Content and structure: text, rules, frames. |
| `--ink-soft` | `#5A5A57` | Secondary content only (metadata lines, counts). Never structure. |
| `--imprint` | `#F2C200` | **The apparatus of finding and acting**: the search field, index letters, the active/selected state, primary actions. Never the inventory itself. |
| `--out` | `#D8412F` | On loan. Nothing else, ever. |
| `--shared` | `#0F6B4F` | Shared — outbound or inbound. Nothing else, ever. |

### Contrast

**Measured** from the built stylesheet by `src/tokens.test.js`, which asserts every one of these on
each run. These are facts, not intentions; earlier drafts of this table carried my estimates, which
were out by up to 0.7.

| Pair | Use | Measured |
|---|---|---|
| `--ink` on `--paper` | all body text | 18.18:1 |
| `--ink-soft` on `--paper` | metadata | 6.39:1, AA body |
| `--ink` on `--imprint` | plate caps, primary action labels | 11.71:1 |
| `--shared` on `--paper` | tags, ribbons | 5.99:1, AA body |
| `--out` on `--paper` | **stamps and rules only** | 4.11:1 — under the 4.5 AA floor, so red stays restricted to ≥18px bold, rules and stamp outlines. Never small red body text. |
| `--cover-body` on `--ink` | summary on the cover | 14.58:1 |
| `--cover-soft` on `--ink` | plate line, durations on the cover | 9.99:1 |
| `--shared` on `--ink` | **never text on the cover** | 3.033:1 — green reads on paper at 5.99 and fails on the cover. So on the inverted surface the sharing mark puts the green on a 4px edge and sets its caps in `--cover-body`, exactly as the stamp puts `--out` on its outline. |
| `--out` on `--ink` | stamp outline on the cover | 4.421:1 — **better than red-on-paper's 4.11**, so the cover is the *less* constrained surface for red, not the more. The stamp still sets its caps in a legible tone rather than in red; that is deliberate conservatism, not a contrast requirement, and it keeps one stamp construction across both surfaces. Recorded so a later pass does not "optimise" the caps to red on the strength of this number. |
| `--imprint` on `--paper` | **never text, never a shape** | ~1.55:1 — yellow on paper is invisible on its own |

**Yellow never carries a shape by itself.** At ~1.55:1 against paper, `--imprint` cannot describe a
form; it can only be a *ground* with ink on top of it, or a *fill* inside an ink outline. That single
fact explains the whole system: the plate works because ink figures sit on yellow (11.71:1), and a
primary action works because its caps are ink. Any future use of yellow that has no ink doing the
describing is unreadable, not subtle.

**The second construction carries a condition.** `-webkit-text-stroke` traces each stroke of a
glyph independently, so the outline collides with itself wherever a counter is narrower than twice
the stroke — a fill inside an outline is only safe where the face's counters are wide enough at the
weight and width in use. The index letter is that construction, verified in real Archivo at 76px /
wght 900 / wdth 62.5% against pixel crops (§4). It is not a licence to use an outline at any size in
any face: measure the counters, do not assume them.

That restriction is not a workaround; it is the Iridescent Edge discipline enforced by
arithmetic. State lives on edges.

### The black cover

Item detail — and only item detail — inverts: `--ink` ground, `--paper` text, `--imprint` for
the title rules. This is the one place the reader is looking at a single thing
rather than scanning a thousand, so the cover earns its impact there and nowhere else.

The inverted surface needs its own secondary tones and **cannot borrow the paper set**:
`--ink-soft` on `--ink` measures about 1.9:1, which is unreadable. Three tokens exist for the
cover alone, and using any of them on paper is a bug:

| Token | Value | Means, and only means |
|---|---|---|
| `--cover-body` | `#DEDED9` | Body copy on the inverted surface (the summary). |
| `--cover-soft` | `#B9B9B4` | Secondary content on the inverted surface (plate line, loan duration). |
| `--cover-rule` | `#3A3A38` | Hairline separators on the inverted surface. **Structure only, never text.** |

They are named for the surface they belong to, not their brightness: a `soft`/`dim` pair invites
exactly the wrong guess, since the body tone is the *brighter* of the two.

**Anything that sets a ground sets its foreground, in the same rule.** A sheet, a toast, an error
block — any surface that paints its own background must paint its text colour too, never inherit
it. Inheriting is safe on every paper screen and catastrophic on the one inverted screen, which is
precisely why it survives review: it is correct everywhere the author looked.

This shipped. The `Sheet` panel set `bg-paper-deep` and no text colour, and item detail's root sets
`text-paper` on its whole subtree — so a sheet opened from the black cover rendered `--paper` text
on `--paper-deep`, about **1.08:1**. Invisible. The bug is not in the sheet's contents; it is in a
surface that declared half of a pair.

Note which direction the guard missed. The check written for the cover asserts that no paper token
leaks *onto* the cover. Nothing asserted the reverse — a cover token leaking onto a paper surface
rendered *inside* the cover — and the reverse is the one that shipped. **A surface check must run
in both directions**, because the inverted screen contains paper surfaces as well as being one.

### Focus

The focus ring is `--imprint`, which already owns the active and selected state — 3px, 2px offset.
**On any element whose own ground is `--imprint`** (plate buttons, volume plates) the ring is
`--ink` instead, since yellow on yellow would vanish. That single conditional is the whole rule.

`--out` must never be spent on a focus ring: it means on loan and nothing else, and a red ring makes
every focused element momentarily read as lent. Do not fake a double ring with `box-shadow` either —
the no-shadow law in §4 is mechanically checkable, and a shadow-shaped outline defeats the check.

**Where an element already carries an ink rule, focus THICKENS that rule — it never adds a second,
concentric one.** Two parallel ink lines with a strip of ground between them read as misregistered
printing, not as emphasis. The offset ring was specified for a plate: a small solid `--imprint`
rectangle with no rule of its own. Applied to something that is both imprint-grounded *and*
ink-bordered — the search field — it produces exactly that doubled edge. Render the indicator at
`outline-offset: 0` so it merges with the existing border into one heavier rule. State expressed by
rule weight is already this system's language (§4); focus is not an exception to it.

**Focus belongs to the control a reader sees, not to the node that happens to take the caret.** The
search field is one control — ground, rule, input and mark together — so its indicator renders on
that whole box via `:focus-within`, and the inner input carries none. **That construction holds
only while the control has exactly one focusable descendant.** Add a second — a password field's
reveal mark — and `:focus-within` fires for both, so tabbing to the mark lights the whole field as
though the caret were in it, and the mark's own indicator draws inside a box that is already
indicating. Key the control's indicator to the input specifically (`:has(input:focus-visible)`) and
let the second control show its own. One control, one indicator, whichever one the reader is on.
This is the one case where
suppressing an input's own outline is correct rather than the defect it was in slice A, and the
distinction is not a matter of judgement: it holds only while the parent demonstrably shows an
indicator, so a browser check must assert that focusing the input makes the control visibly focused.

---

## 3. Typography

Two families, no serif. A book subject reaching for a serif is the association the direction
exists to refuse; *Série Noire* is a sans-and-rules identity.

| Role | Face | Notes |
|---|---|---|
| Display, plates, index letters, UI | **Archivo** (variable: `wght` 400–900, `wdth` 62–125) | One variable file covers condensed plate lettering and normal-width body. Full Latin Extended-A, so French diacritics are native. |
| Catalogue numerals, ISBN, runtime, dates | **Chivo Mono** | Tabular figures for aligned columns. |

Both are self-hosted `woff2` (subset to Latin + Latin Extended-A), consistent with the project's
existing self-hosted-fonts practice. Neither appears on the calibration list of training-data
default faces, and neither is v2's pairing.

**A shipped font is asserted to contain the alphabet the product can produce, by a test that reads
the file.** Not reviewed, not assumed from the build script's intent — read out of the `woff2`'s
own cmap and compared against a required set: printable ASCII, the Latin-1 letters, Latin
Extended-A, French diacritics, `Œ`/`Æ` (the fold's non-A–Z tail, §4), and every mark the design
sets in type.

This rule exists because its absence hid a total failure of the identity for three slices. Google
serves `latin` and `latin-ext` as **separate** cuts, and `fetch-fonts.mjs` selected the block
containing `U+0100` on the assumption that latin-ext is a superset of latin. It is not. The
committed `archivo-var.woff2` contained **262 codepoints, of which exactly two were ASCII: the
space and the letter `A`.** Every other character in the product — every title, every name, every
digit, every date, the middot in every Plate Line — fell back to `system-ui`, silently, because
`index.css` declared the face with no `unicode-range` to reveal the gap.

Three slices, a full design critique and a dedicated typography calibration all passed over it, and
the reason is worth keeping: **the comp fell back too.** `ui-v3-mockup.html` names Archivo with no
`@font-face`, so on a machine without it installed the comp rendered in the same system font as the
app. Reproduction against the comp therefore *succeeded* — both sides were wrong identically, and
matching was mistaken for correct. A reproduction target and its subject must not share a failure
mode; the check that reads the font file is the only thing that separates them.

### Scale

Sizes are in px at base 16. Line-height is expressed in divisions (§4).

Values are the built comp's, `docs/ui-design/ui-v3-mockup.html`, which is law for the three screens
it covers.

**Content and display**

| Role | Size | Weight / width | Family | Notes |
|---|---|---|---|---|
| Index letter | 76 | 900 / wdth 62.5% | sans | uppercase, line-height .82 |
| Detail hero title | 32 | 800 | sans | line-height 1.06 |
| Library row name | 22 | 700 | sans | line-height 1.15 |
| Browse header title | 20 | 800 | sans | **a separate role from the row name** |
| Row title | 17 | 600 | sans | items |
| Collection board name | 17 | 700 | sans | the heavier of the two 17s |
| Plate Line | 14 | 400 | sans | `--ink-soft`; its figures take mono 12 |
| Detail summary, `IN <library>` value | 14 | 400 | sans | `--cover-body` |
| Search field input, ledger name row, ribbon owner | 13 | 400 | sans | ribbon owner sets `text-transform: none` |

**Which numerals, precisely — because the rule was only half enforceable without this.** §3 states the
split in both directions: nothing but numerals may be mono, *and* catalogue numerals must be mono. Only
the first was ever checkable, which is how a candidate ISBN shipped in the sans past two mono guards and
1169 green tests.

The boundary is **a numeral presented as a value against a numeral inside a sentence**:

- **Mono — a labelled datum.** The figure is the content, alone or beside a label: ISBN, TMDB id,
  release year, runtime, collection order, a library's item count, a collection's member count, an
  index-letter run count, ledger dates, a loan's day count. `Field`'s counter is this case and gets it
  right already: the figure inherits `.num` and only the word `left` is sans.
- **Sans — a numeral in running prose the app authored.** `Delete Fiction and its 412 items?` is a
  sentence, and setting its figure in mono would break the line it sits in. The digit is a grammatical
  constituent, not a datum on display.

**And the guard must be a manifest, not a digit scan.** A blanket "any numeral not in mono fails" cannot
tell those two apart — no checker parses sentences — so it would fire on correct confirmation copy, which
is the crying-wolf first act that gets a guard deleted rather than fixed (the type-scale guard failed
three times that way before it worked). Instead enumerate the catalogue data, name the screen and
selector each appears at, and assert the **computed** `font-family` is Chivo Mono there. Positive
per-datum coverage, no false positives, and it must live in the browser suite because the face a node
actually resolves to is a computed-style fact the unit layer cannot see.

The cost is that a numeral on a new screen is uncovered until someone lists it, so **the manifest needs
its own drift alarm**, exactly as `monoRouteCoverage` guards `MONO_ROUTES`. An unlisted datum must fail
the alarm rather than pass the check.

**Mono — numerals only (§3, the mono rule)**

| Role | Size | Weight | Notes |
|---|---|---|---|
| Count plate | 12 | 700 | tabular, in a 2px ruled plate |
| Plate Line figures, detail plate line | 12 | 400 | `--cover-soft` on the cover |
| Index letter count, ledger dates, ledger duration, library row sub | 11 | 400 | tabular |
| **Collection member order plate** | **10** | 400 | tabular, in a **1px** rule — see §5 |

**Caps — interface labels. Tracking is per-role and is not one value.**

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Wordmark | 12 | 800 | +0.20em |
| Plate Button labels — every variant | 12 | 800 | +0.12em |
| Section header (`MINE`, `SHARED WITH ME`) | 11 | 800 | +0.16em |
| Account plate initials | 11 | 800 | — |
| Ledger head, detail-marks label, shared ribbon caps, ledger date labels | 10 | 800 | +0.16em |
| Overprint Stamp | 10 | 800 | +0.14em |

The steps in use are **10, 11, 12, 13, 14, 17, 20, 22, 32, 76**. Anything else is off the scale.

**One exception, and it is not a display size: form inputs set 16px.** `Field`'s input, select and
textarea all take `text-base`. Mobile Safari **zooms the page** when a focused input's font-size is
below 16px, which on a phone-first PWA would jerk the viewport on every tap into a field — so 16px is
load-bearing platform behaviour, not a typographic choice, and it sits outside the display scale
deliberately. **Any guard over the scale must know this exception, or its first act is to fail on
correct code.**

**Ratified on those merits, and the reason was never written down — which was checked, not assumed.**
`Field.jsx` carries no comment at any of the three sites. That absence means something in *this* file,
because it documents nearly everything else: why the reveal state lives only in component state, why the
reveal is `type="button"`, the number spinner's two-pseudo-element suppression, the textarea resize
grabber, `field-control` versus `focus-control`, and why `outline-none` is absent. In a file where every
small decision earned a paragraph, three instances of an off-scale size earned nothing. So this is not
an exception documented in the wrong place: **the value is correct and has been surviving on nobody's
knowledge since it was typed**, and the first guard or reviewer to read §3 without knowing iOS would
have "corrected" it.

**The scale has never been enforceable, and removing 9px has made it more exposed rather than less.**
Nothing anywhere reads this list. There was no guard pinned to 9px either — so the value shipped,
survived a critique that named it the clearest finding of its run, survived the provenance check that
closed it, and the suite stayed green at 1111 tests before and after the change, because it cannot see
it. That is the same shape as `fonts.test.js`, `groundForeground` and the mono split: a §3 rule with
nothing able to report it in either direction.

A guard is the obvious answer, and its scope is the trap. **70 of the app's 114 size classes are
Tailwind-named** (`text-sm` ×47, `text-xs` ×18, `text-base` ×3, `text-xl` ×2) against 44 arbitrary
`text-[Npx]`. A guard matching only the arbitrary form would cover 44 sites, miss 70, report clean, and
be indistinguishable from a guard that works — the CLI detector's blindness to Tailwind, reproduced by
us. It must resolve named sizes to pixels.

Resolved, `sm`→14, `xs`→12 and `xl`→20 are all already on the scale, so the resolving version surfaces
**exactly one** off-scale value: the 16px inputs above. That it produces one known exception rather than
a pile is the evidence that it is the right design and not merely a wider net.

**And the mapping itself must not be hardcoded as though it were ours.** `sm→14, xs→12, base→16, xl→20`
are **Tailwind 4's defaults**; `src/index.css`'s `@theme inline` block declares colours, the two font
families and `--spacing`, and **no `--text-*` overrides at all** — verified. So the table is true today
*by inheritance, not by declaration*, and the day anyone adds `--text-sm: 15px` a guard holding that
table keeps passing while being silently wrong about 47 sites. A true answer about the wrong substrate,
pre-installed in a guard that does not exist yet.

The fix is one extra assertion rather than a resolver, and the precedent is `tokens.test.js`, which
reads `index.css` instead of trusting this document — which is why §2's contrast numbers are facts. **The
guard must assert that no `--text-*` override exists in the theme block**, so its table stays true by
construction and the day that changes it fails saying "derive these now" instead of lying.

**The member plate was 9px and is now 10, and how that was nearly missed is the point.** A critique
called the 9px plate its clearest finding. Checked against the comp, the comp declared 9px — so the
verdict recorded was *documentation drift, the code is right*, and 9px was written into this table as a
legitimate step. That answered **whose fault it was** and silently dropped **whether 9px was correct**.

It was not. 9px was the only sub-10px size in the system and the only small role at weight 400 rather
than 800, and there was no space argument for it: two digits of Chivo Mono at 10px is 12px of advance
plus 6px of padding — 18px inside a 48px frame — and three digits still reach only 24px. The smallest,
lightest text in the product was buying nothing.

**Resolving an attribution question is not resolving the substantive one.** "The comp says so" explains
why a document and the code disagree; it says nothing about whether either is right. Here both were
wrong together, which is exactly the case a provenance check cannot see.

**This table was wrong for four slices, and the mechanism is worth more than the correction.** Its
eight rows were transcribed from the comp's own **type-specimen block** (`.t-index`, `.t-lib`,
`.t-num`, `.t-caps` …) rather than from the phone comps the specimen was supposed to summarise — and
the specimen disagrees with them: it sets the library name at 24 where `.vol-name` is 22, mono
numerals at 13 where every real numeral is 12 or 11, and caps at 10 where a button label is 12. A
later pass corrected the specimen's printed *labels* and left its *CSS* untouched, so that block now
renders one size while claiming another.

So the code was right and this document was wrong in six places at once, and a careful reviewer duly
filed six false violations against correct code. **A summary of a design is not the design.** Derive
from the artefact, never from a legend beside it — and where a legend exists, it is a third thing that
can drift, not a shortcut to the first.

The correction also resolves an internal contradiction: this table used to call the Plate Line `mono
11` while §5 said only its figures take the mono. **§5 was right**, and the code follows §5.

**The index letter is filled `--imprint` with a 2px `--ink` text-stroke**, not solid ink, over a 4px
`--ink` rule. That is what gives the monumental letter its printed weight without turning a quarter
of the viewport black, and it is why it can sit at 76px rather than 96–120: a stroked yellow letter
reads larger than its size.

The treatment was withdrawn for one round on crops rendered in the wrong font, and restored on crops
rendered in the right one — see §4. **76px, wght 900 and wdth 62.5% are now verified against
pixel-level crops in real Archivo**, not inherited from the comp and not derived.

### The caps utility carries case, never weight

A `caps` utility that also sets `font-weight` cannot be removed safely: taking the uppercase off a
string silently takes its emphasis with it, and the element lands at whatever the base weight is —
quieter than it was, for a reason nobody wrote down. That is exactly how a sheet heading dropped
from a readable label to 11px at weight 400 while the only stated intent was "stop shouting a
French name".

So `caps` sets **`text-transform` and `letter-spacing` only**. Weight is always set alongside it,
explicitly, at the point of use. Any rule of the form "this is content, stop uppercasing it" must
then be a one-property change with no second-order effect.

Corollary for the type scale: there is no 15px step. When a role turns out to be content rather
than a label, move it onto the nearest **existing** step — a sheet heading naming a library is the
**Row Title** role, 17/600, the same size and weight that name had in the list it was opened from.
Continuity is the argument, not just scale hygiene: the sheet is about that row.

### The uppercase rule

Uppercase is for **interface labels only** — tags, plates, section headers, button labels, all
of which are English UI strings. **Content titles are never uppercased.** Long French titles set
in caps lose readability, and the collection's titles are mixed English and French. This rule is
the difference between an imprint and a poster.

---

## 4. Division scale

One visible scale, per the Signal Bench discipline. Base unit **4px**; the division is **8px**.

**The division governs layout; the base unit and optical adjustment govern typographic interiors.**
Block padding, gaps between blocks, insets, row heights and margins are whole divisions, always.
Inside a plate, a tag or a stamp, the 4px base unit applies, and optical adjustments of 1–3px are
legitimate where the alternative is worse: a plate padded to a full 8px vertically stops reading as
a plate and starts reading as a button. What the rule forbids is spacing by eye at layout scale,
which is where drift is visible and compounding.

| Name | Value |
|---|---|
| Base unit | 4px |
| Division | 8px (2 units) |
| Phone margin | 2 divisions (16px) |
| Gutter | 1 division (8px) |
| Phone grid | 4 columns |
| Tablet grid | 8 columns, 3-division margin |
| Column max-width | **56 divisions (448px), centred.** The app is phone-first and gets no second layout, but a full-bleed phone column stretched across 1440px is not "sane and usable" — it drags a 56px plate and a right-edge affordance to opposite ends of the viewport. Constraining and centring the column is the whole desktop provision. |
| Minimum touch target | 6 divisions (48px) — applies to the search field and the account plate too; both are taps, not labels |
| Row height, with a sub-line | 10 divisions (80px) |
| Row height, without | 8 divisions (64px) — **not 60**, which is 7.5 divisions and off the scale |

### Rule weights

Elevation is expressed by rule weight and ground shift. **There are no shadows anywhere** — print
has none — and **no rounded corners**: every radius is 0.

| Weight | Use |
|---|---|
| 1px | hairline separators inside a block |
| 2px | volume frames, field underlines |
| 3px | block frames, sheet top edge, collection boards |
| 4px | index rules, the detail hero's title rule |

### The frame, and how books and films differ

**One ratio for every item: portrait 2:3.** Both artwork sources are already that shape — trade
book covers sit near 2:3, and TMDB serves posters at exactly 2:3 — so a single frame crops
nothing, and the stream keeps one row height and one grid.

**Type is not marked.** Books and films take the identical frame, and the only place the
difference is legible on a row is the Plate Line — where a film carries a year and a book does
not:

| | Book | Film |
|---|---|---|
| Frame | plain 2:3 frame | plain 2:3 frame — the same one |
| Plate Line | `AUTHOR` | `DIRECTOR · YEAR` |

An earlier draft encoded type three redundant ways: a **spine rule** on the frame (3px vertical,
inset from the left edge, the wrap of a keep case), a `BOOK` / `FILM` **tag** at the row head, and
the Plate Line. The reasoning was that a reader scanning a thousand rows needs to know which is
which, and that redundancy was needed because `picture` is frequently null.

**The argument that holds is the first one. Libraries here are organised by type** — Romans, Films,
Bandes dessinées, Polars — so within any one stream the marker labelled a distinction that barely
varies, and charged every row for it. That is the whole case, and it is enough.

**The second argument, as first written here, was false, and it is corrected rather than deleted
because future work would otherwise reason from it.** It claimed the redundancy was unnecessary
because an item with no artwork still carries its Plate Line, so type could never vanish. The Plate
Line is not guaranteed. `releaseYear` is nullable in `CreateVideoRequest`, so a film entered by hand
without a year prints a bare name — indistinguishable from a book. Neither `authors` nor `directors`
is required, so a book and a film with neither print **title only, above an identical empty frame**:
byte-identical rows. The catalogue is deliberately mixed — `PRODUCT.md` makes one household
collection the point — so those rows sit next to each other.

The residual is therefore real and accepted: **in the sparse-metadata case, type is not
recoverable from the row.** It is accepted because the dominant job is answering *do I own this*
while holding the object, where the reader already knows what they are holding, and because the
alternative was a mark on every row of a stream where the answer barely varies. Anything that
closes the gap must close it in the **Plate Line**, which is where type now lives; reinstating a
frame marker would reintroduce the cost the removal was for.

Removing them also gave the frame back to the artwork. The spine rule was drawn **over** the
poster's left edge, which is where a real case's spine falls but also where a poster's content
is — a 3px bar defacing every film cover in the collection to restate what the row already said.

> A DVD keep case is ~5:7 and a Blu-ray case ~4:5 — both portrait, which is why films were never
> framed landscape even when they were marked. The frame stays 2:3 for the same reason it always
> did: TMDB serves posters at exactly that ratio.

> A DVD keep case is ~5:7 and a Blu-ray case ~4:5 — both portrait. An earlier draft of this
> document framed films landscape at 16:9, which described the medium rather than the object on
> the shelf, and would have forced a crop on every 2:3 poster.

### The row carries recognition; detail carries identification

A row exists to be recognised in a scan, so it earns only the fields that help a reader know what
they are looking at. An identifier does not: `9780451524935` occupies as much of the line as
"George Orwell", sets in mono so the eye goes to it first, and tells a human nothing. Runtime is
the same class of thing on a row — real information, but for deciding what to watch tonight, which
is not what this product is for.

| Field | Row | Detail |
|---|---|---|
| Author, director | yes | yes |
| Film's year | yes — it disambiguates remakes and situates the film | yes |
| ISBN, TMDB id | **no** | yes — an edition matters when you are examining one object |
| Runtime | **no** | yes |

The test for a row field is whether it helps someone recognise a thing they already own, not
whether it is true or available.

### Where the primary action sits

The two list screens place their primary differently, on purpose:

| Screen | Primary | Where |
|---|---|---|
| Libraries root | New library | bottom bar, in thumb reach |
| Library browse | Add an item | header right slot |

**This is a difference, not an inconsistency awaiting correction.** It has been raised twice — once
by a critique as "two primaries, opposite thumb zones", once as a proposal to unify them — and
closed both times. Three reasons, in the order they matter:

**Density, and it is asymmetric.** A bottom bar costs ~80px plus safe-area inset, about 9% of an
844px viewport, permanently. On the root, where a list of three to six libraries already has dead
space beneath it, that bar is free. On the browse stream — the densest surface in the app, holding a
thousand items, whose entire job is showing content — the same bar is expensive. The same component
has very different prices on the two screens.

**Frequency, counted correctly.** The capture flow loops internally: Add → Book or Film → capture →
confirm → *back to capture for the next item*. So Add is pressed **once to enter a cataloguing
session**, not once per book. An earlier draft of this argument put Add in thumb reach because it was
"performed dozens of times back to back" — that was counting the scan, not the button, and it is the
error that made the placement look wrong.

**The physical scene.** `PRODUCT.md`'s one-handed moment is the bookshop, answering *do I own this*
— which is lookup. Cataloguing is "a stack of new arrivals processed back-to-back" at a table, with
two hands free. So the harder reach falls on the task least likely to be performed one-handed.

The rule for a screen not listed here: **the primary action goes wherever it costs that screen
least.** A short list can afford a bar; a dense stream cannot. Placement follows the screen's density
and the action's real frequency — never a template applied for symmetry.

### What a plate carries

The plate is the imprint's mark, and it carries **only quantities the API actually returns**.
There is no item ordinal anywhere in the data — no index, no `createdAt`, and listing pages are
alphabetical behind an opaque token — so a per-item sequence number would be invented data
wearing the imprint's clothes, and unstable across pagination besides.

| Surface | Plate carries | Source |
|---|---|---|
| Library row | the library's item count | `totalItems` |
| Collection board | the member count, bare | `itemCount` |
| Collection member | its order in the series, 1–1000 | `order` |
| Standalone item | **no plate** | — |
| Item detail | the collection order when the item is in one, drawn **inside the frame** exactly as on the stream — never as a second plate beside it; otherwise no plate | `order` |

An item's real catalogue identity is its ISBN or TMDB id, and that already reads in the Plate
Line, so detail needs no invented number either. A standalone item's frame is unnumbered, and an
empty frame carries nothing but its rules.

**A plate carries a bare figure and no prefix; the container says what the figure is.** The board
head's plate belongs to the collection, so its number is that collection's size; a member's plate
belongs to that member's frame, so its number is that member's place. Nothing needs to caption
which is which — it is read off what the plate is attached to, exactly as a library row's plate is
read off the library.

The board's count was prefixed `⌗` (U+2317) until that character turned out **not to exist in
Archivo at all** — not missing from our subset, absent from the upstream typeface — so it had been
rendering in whatever the browser substituted, in a design that names two faces and declares no
fallback chain. Nobody had ever seen the intended version.

Three replacements were rejected, and the reasons matter more than the outcome. `#` is in the face
and reads as *number*, which is the wrong meaning: `# 12` states an ordinal where the plate holds a
count. A second face is a stated constraint broken for one glyph. And hand-authoring it as a
**Mark** would stretch that category past its definition — §5 admits Marks as *universal
affordances* (back, add, search, close), and a decorative prefix attached to data is ornament, not
an affordance; growing the Marks set to carry ornament is precisely the drift §5 exists to prevent.

This is the second mark in this system to turn out to be doing less work than it appeared, after
the type markers. Both were removed by discovering the layout already carried the fact.

Fewer plates on the browse stream is the correct outcome, not a loss: a number that means
something is worth more than a number on everything. Chrome yellow still carries the index
letters, the active state, collection boards, library rows and primary actions.

### Where the yellow goes, and why it moved

An earlier draft spent `--imprint` on counts — every library row and collection board carried a
chrome-yellow plate. Rendered, that inverted the product's first principle: the home screen's
loudest marks all served *browsing*, while search, the dominant job, was the quietest element on
the page. Placement is not prominence, and pinning the field satisfied the IA while the visual
hierarchy said the opposite.

So the yellow moved. **`--imprint` marks the apparatus of finding and acting** — the search field,
the index letters, the active state, primary actions. Counts are inventory, not apparatus:

| Element | Was | Now |
|---|---|---|
| Search field | recessed `--paper-deep`, `--ink-soft` placeholder | `--imprint`, the loudest mark on the home screen, and a **real input** that accepts keystrokes |
| Library row plate | `--imprint` fill | `--ink` figures in a 2px ruled plate, no fill |
| Collection board count | `--imprint` fill | same ruled treatment |
| Collection member order | `--imprint` fill | same ruled treatment |
| Index letter | `--imprint` filled, `--ink` stroked | unchanged — finding apparatus, and the loudest yellow in the stream |
| Primary action | `--imprint` plate | unchanged |

The plate survives as a structural device; only its fill changes. And the rule now reads as one
sentence rather than a list: yellow is how you find and how you act, ink is what you own.

### The index alphabet

The stream's order is the server's, and the server folds it: `NormalizeForSort` in
`internal/persistence/normalize.go` runs NFD → strip combining marks → NFC → lowercase before the
title becomes a sort key. So the order is diacritic- and case-folded, and the client reproduces the
bucket key exactly with the same fold:

```
title.normalize('NFD').replace(/\p{Mn}/gu, '').normalize('NFC').toLowerCase()
```

**The client never sorts.** It renders in the order the API returns and computes bucket labels only.
`localeCompare` is forbidden here: it would disagree with the server's paginated order and make the
sticky letters non-monotonic, which is worse than an odd-looking bucket.

The alphabet is therefore **not A–Z**, because NFD only strips *combining* marks. `Œ` and `Æ` have
no canonical decomposition, so they survive the fold and sort after `z`; ASCII digits and
punctuation sort before `a`. The label is derived from the folded first character by position:

**Nothing is collapsed.** The label is always the actual folded first character, uppercased —
letters, digits, ligatures, punctuation alike. `1984` files under `1`, `Œuvres complètes` under `Œ`,
`Élan` under `E`. An earlier draft collapsed digits and ASCII punctuation into a single `#` bucket to
avoid near-empty headers; that bought a handful of saved rows and cost the one thing the letter is
for, which is telling the reader exactly where they are. Near-empty head buckets are rare, truthful,
and cheap.

Folding `Œuvres complètes` to a display "O" would be a lie: it sits after Z, not among the Os, and a
reader sent to the Os would not find it. Rendered, the honest `Œ` also turned out to be the best
piece of lettering in the set.

### The stroke, and the two months it was wrongly withdrawn

**The index letter is an `--imprint` fill inside a 2px `--ink` text-stroke, at 76px / wght 900 /
wdth 62.5%, over a 4px `--ink` rule.** Verified against pixel-level crops in the real face: at the
`M`'s centre vertex the counter is fully open, paper running clean to the point. `M`, `N`, `P` and
`Œ` are all clean.

This treatment was **withdrawn and then restored**, and the round trip is the most instructive thing
in this document.

`-webkit-text-stroke` traces each stroke of a glyph independently, so the outline collides with
itself wherever a counter is narrower than twice the stroke. That is a real mechanism and it still
governs — but whether it *bites* depends on the face. Crops appeared to show `P` collapsing into a
doubled outline, `M` scarring at the vertex, `N` growing a spurious diagonal, and the treatment was
replaced with a solid-ink letter.

**Every one of those crops was rendered in `system-ui`,** because the shipped Archivo contained a
space and the letter `A` and nothing else (§3). And `font-stretch: 62.5%` is **silently ignored by a
face with no width axis** — so a *condensed* treatment was judged on glyphs that were never
condensed. In real Archivo the `wdth` axis engages, narrowing glyphs by 27–44%, and the counters
stay open. The one glyph in that test set judged clean, `A`, was the only one Archivo actually drew.

So the withdrawal was correct on the evidence available and wrong about the world. Restoring it cost
nothing but the willingness to re-measure, which is why the ruling that replaced it was written to
expire: *parameters are set from rendered output and never from reasoning; re-verify against crops
whenever weight, width or stroke changes.*

**The rejected alternatives are kept, because two of them are still right:**

| Candidate | Outcome |
|---|---|
| Retune the stroke (0.85px / wght 400 / wdth 100%) | **Still rejected, on grounds the font fix does not touch.** It abandons the letterform §3 specifies and thins the stroke below what makes yellow legible at all — §2 calls that unreadable rather than subtle. It traded a glyph that rendered wrong for one that renders faint. |
| Ink letter on an `--imprint` plate | **Still rejected on palette law.** In the live stream it reads as a tappable chip, landing on the same silhouette as `PlateButton`'s primary variant. A passive separator must not wear the active-state treatment. |
| Solid `--ink` letter, yellow on the rule | **Correct, and shipped for one round, but beaten on the job.** Solid ink cannot collide in any face — genuinely more robust. But at 76px it is the same colour as the row titles beneath it, so it reads as oversized content rather than as a mark, and it moves `--imprint` off the primary wayfinding device in a thousand-item stream. §4's *Where the yellow goes* exists precisely to stop that. Robustness lost to legibility of purpose, on the stream shot rather than the crop. |

Three lessons outlive the letter. **A construction can fail structurally rather than
parametrically**, so a parameter sweep inside the wrong construction is wasted work. **The free
option must be disproved, not assumed** — "change nothing" was checked hardest precisely because it
cost nothing. And **evidence has a substrate**: every crop in the first round was true about what
was on screen and false about the product, because nothing asserted that the font under the test
was the font that ships.

**There is no symbol carve-out. One treatment covers every glyph the fold can produce** — letters,
digits, ligatures, punctuation alike. `#`, `&`, `@`, `*`, `"`, `'`, `(`, `)` and `%` all render
clean under the stroke in real Archivo; `#`, the worst case, measures **96.6% single connected
fill**, the remainder antialiasing rather than the nine similarly-sized fragments the old claim
predicted.

The carve-out existed because `#` was seen to shatter into nine quadrilaterals. **That observation
was real and the artefact still exists — it was simply made in the wrong typeface**, like every
other measurement from that round. Its second justification, that the bucket "is not a letter and
reads as structurally different", was true and was doing no work: it had been recruited to defend a
conclusion reached on other grounds, and once those grounds failed it could not hold the position
alone. An argument kept because it is *also* true is not the same as an argument the decision rests
on, and the difference only shows when the load-bearing one collapses.

---

## 5. Component vocabulary

| Component | Description |
|---|---|
| **Volume Frame** | The item's artwork frame — 2px rule, portrait 2:3 for **every** item, books and films alike (§4). Nothing is drawn over the artwork. With no artwork it stays a ruled empty frame: no number, no placeholder icon, no apology. **"Ruled" means the rule and nothing else — the empty frame carries no fill.** On paper the fill was `--paper-deep`, near-invisible at ~1.05:1 against its ground, so the frame read as a rule. The hero on the cover filled with `--cover-rule` instead, which is 1.73:1 against `--ink` — a mid-grey slab in the largest, most prominent frame in the app. A filled rectangle where artwork belongs reads as a failed image, which §6 forbids outright. It also spent `--cover-rule`, declared structure-only, as a ground. Both frames are now unfilled; the rule alone describes them, on either surface. On item detail the frame carries the `Fetch cover` repair control when — and only when — a `pictureUrl` exists **and** the image failed to load; it takes the unfilled secondary Plate Button, inset two divisions, so no ground is painted inside the frame. **Its 2px rule is load-bearing and must not be tidied away as a box inside a box.** Without it, caps centred in a ruled frame is precisely §6's *Empty* state — "a ruled frame with a caps invitation" — so `FETCH COVER` would read as a label describing the frame rather than an action on it. The rule is the whole difference between a control and a caption, and at 132px the label wraps to two centred lines, which is accepted: a wrapped caps plate still reads as printed, and shortening it to `FETCH` would drop the noun that says what is fetched. |
| **Volume Plate** | A 2px ruled rectangle with `--ink` mono figures, **no fill** — counts are inventory, not apparatus (§4, *Where the yellow goes*). Carries only a real count or order — see §4, *What a plate carries*. Absent on standalone items. |
| **Search Field** | A **real text input**, never a link costumed as one: it takes the `--imprint` ground and is the loudest mark on the screen that carries it, because finding is the job this product exists for. **It is pinned on the libraries root and nowhere else.** A browse screen does not carry it — the field searches every library, so on a browse screen the loudest affordance would promise to leave the library being browsed. One field, one screen, no scope modes. It opens the full-screen search surface and returns the reader exactly where they were. |
| **Plate Line** | The engraved line under a title. Book: `AUTHOR`. Film: `DIRECTOR · 1974`. On detail it gains the edition — `AUTHOR · ISBN`. Fields differ by type; the line's position does not. Names are set in the sans; only figures take the mono, so a film's year is mono and a person's name is not — §3 reserves mono for numerals, and a name in mono is a category error that digits beside it used to disguise. **It never carries the library.** The line is the *work*; a library is where a *copy* is kept. An early comp ran them together as `AUTHOR · ISBN · LIBRARY`, three categories in one dot-separated run, which set the shelf in the same tone as the author and made location read as identity. Location belongs to the Detail Marks. |
| **Detail Marks** | The column beside the item-detail hero, holding everything true of the *copy* rather than the work: `IN <library>` as a link to it, the Shared Ribbon when the library is shared either way, and the Overprint Stamp when the item is out. Reading order is where it is filed → who else can see it → whether it is here. The ~210px next to a 132px frame was dead space; these three facts are one block and fill it. **The stamp lives here, not under the title rule** — an overprint stamp belongs on the cover. `IN` is an interface label and takes caps; the library name is content the reader authored and never does (§3), the same construction as `FROM <owner>`. The link is underlined rather than set in `--imprint`: it is navigation, not a primary action, and yellow beside the title rule would read as one. |
| **Index Letter** | Monumental sticky letter — `--imprint` filled with a 2px `--ink` stroke — over a 4px `--ink` rule, marking the reader's position in the stream. **One treatment for every label**, letters and symbols alike (§4). Its label comes from the server's fold — see §4, *The index alphabet* — so it is not always A–Z. **Its count appears only on a closed run.** A run closes the instant a different letter appears after it in the stream, at which point the number is final; the run at the tail of the loaded stream shows no count at all, and no placeholder. A number that grows while the reader looks at it is worse than no number. The count is items — standalone entries plus each board's `itemCount`, counting a board once and ignoring its `partial` continuation. |
| **Overprint Stamp** | Rotated −4°, 0.9 opacity to read as ink over paper. **Outline 2px `--out`; caps set in `--ink`.** Red measures ~3.9:1 on paper — sound for rules and outlines, short of AA for small text — so the stamp's colour lives on its edge and its words stay in ink. Marks a lent item, and carries words, never colour alone. **On a row it reads `OUT` alone; the borrower and duration belong to item detail** (`OUT · MARIE · 6 DAYS`). `lentTo` permits 50 characters, which no row can hold, and the split follows the labelled-twice rule — the row answers *is it out*, the detail answers *who has it and how long*. Nothing is ever truncated. On detail the stamp and the ledger's first row **do** state the same loan, and that overlap is allowed: the stamp is current *state*, read beside the cover without looking for it; the ledger is the *record*, read only if you go down for it. The open loan is the single row where state and history coincide, and that coincidence is in the data, not in the design. Suppressing it either way would make one surface lie by omission — a stamp with no borrower, or a history missing its most recent loan — and `PRODUCT.md` requires lent-to-whom to be legible wherever the item appears, not a scroll away. |
| **Shared Ribbon** | 4px `--shared` left edge rule plus a caps tag: `SHARED · N` outbound, `FROM <owner>` inbound. |
| **Collection Board** | A grouped collection: 3px frame, member count in a plate, members inset by one division. Server-grouped, expandable in place. The board is filed alphabetically under the **collection's** name while its members run in `order`, not by title — so a board under "S" may legitimately open with *Aliens*. An earlier draft printed a `SERIES ORDER` caps label at the head to explain that, on the theory it would otherwise read as a sorting bug. It would not: **every member already carries a numbered plate**, and a numbered sequence needs no caption saying it is in sequence. The label restated what the numbers state — labelled twice, by the rule's plainest reading. The board's own name at the head is what files it; a named container filed under its name surprises nobody. |
| **Sheet** | Bottom sheet on `--paper-deep` with a 3px top rule. Square corners. |
| **Plate Button** | Primary action: `--imprint` plate, black caps. Secondary: 2px ruled outline, no fill. Destructive: 2px `--out` outline, `--out` caps. **A disabled primary renders as the ruled outline, never as a tinted plate** — a 50% `--imprint` is a new colour meaning "disabled", which palette law forbids, and it drags its own label under the contrast floor. Becoming a filled plate the moment the form is valid is itself the affordance saying so. |
| **Field** | Form input: no radius, 2px bottom rule, caps label above, no floating label. A password field carries a **reveal mark** at its right: a hand-authored eye at 2px stroke, slashed when the password is showing, toggling `type` between `password` and `text`. It is a Mark rather than a `SHOW` / `HIDE` caps label because the state it reflects is already legible in the field itself — the reader can see whether their password is showing by looking at it — so this is not an icon standing in for state with nothing to read. It always opens hidden, on every mount, and never remembers. Its 48px target is negative-margined so it does not inflate the field, and it takes its own focus indicator, not the field's (§2). |
| **Ledger Row** | One loan pairing, over two lines. **Line 1: the borrower's name, and the duration.** Line 2: `LENT <date> · RETURNED <date>`, and for an open loan **`LENT <date>` alone** — no second half, because there is no second date and the stamp already says it is out. The caps are interface labels and the dates are mono (§3). There is **no arrow**: `→` (U+2192) is absent from both faces, so it rendered in `ui-monospace` inside a line of Chivo Mono. An en dash was the obvious replacement and fails on the case that matters most — a dash states a *range*, and `07 Aug 2026 – still out` is not a range, it is a date beside a state. Labelling both endpoints works for a closed loan and a live one with the same grammar, which a connector cannot. The name is the reason the row exists — a ledger that records when a thing left but not who took it does not answer the question the product is for — and it comes from the **`LENT` event only**. The `RETURNED` event also carries a name; it is ignored, because the returner is the borrower and printing it again states one fact twice. The name is **content and sets in the sans**; only the dates and the day count take the mono (§3) — a 50-character `lentTo` is why the row is two lines and not one, and nothing is truncated. Inside a bordered card the row takes `px-4` so it does not sit flush against the rule, with the separator still spanning the full width; in a flush text column (item detail's inline ledger) it takes none, so it aligns with the prose above it. |
| **Row Actions** | The visible duplicate of long-press, at the right of any row that has a sheet behind it. **Three 3px ink squares** — not round dots, not a text ellipsis: the world has no radii, and a glyph falls back to junk. 48px target, negative-margined so it does not inflate the row. Absent on rows with no actions, which is how a read-only shared library declares itself. |
| **Pull to refresh** | The touch shortcut for reloading a list. **The threshold is measured in finger travel, never in the transformed offset**: resistance is a visual affordance, and dividing the trigger by it silently multiplies the required drag — at 0.4 resistance a 64px offset threshold demands 160px of travel, roughly 2.5× the conventional 60–80px, so an ordinary pull does nothing at all. Trigger at **72px of travel**; let the offset stay damped and capped for feel. Two feedback states, both in the caps register: nothing before the threshold, where the paper moving is the whole signal, then `RELEASE TO REFRESH` once past it, then `REFRESHING` after release. Without the middle state a reader cannot learn how far to pull, which turns a mis-tuned threshold from an annoyance into an apparently dead gesture. |
| **Marks** | The few universal affordances left after the no-icons-for-state rule — back, add, search, close and the like. **Hand-authored SVG at 2px stroke on the division scale; no icon library.** An imported set would arrive at someone else's stroke weights and optical sizes and quietly break the rule system, to carry perhaps eight marks. State is never a mark; state is a stamp, a ribbon or a rule. |

---

## 6. State grammar

| State | Expression |
|---|---|
| Default | ink on paper, 2px frame |
| Active / selected | `--imprint` plate or fill; never a colour wash over content |
| On loan | Overprint Stamp + `--out` left edge rule. **Item rows only.** |
| Shared out | Shared Ribbon, `SHARED · N`. **Library rows and the Detail Marks column; never on a row in an item stream.** |
| Shared with me | Shared Ribbon, `FROM <owner>`. The same two places. The restriction is against repetition **in a stream**, not against detail: inside a library, provenance is declared once in the header and never on every row; on item detail it is declared once beside the cover, which is the only place that screen has to say it. On the cover the green moves to the edge and the caps take `--cover-body` — see §2. |
| Read-only | Actions are **absent**, not disabled, and provenance is declared in the header |
| Empty | A ruled frame with a caps invitation, at the same weight as a full block |
| Loading | Ruled skeleton frames at correct ratio — the layout does not move when content lands |
| Artwork present but unavailable | `picture` is synthesised from a URL template whenever `pictureUrl` exists (`handlers/search.go`), without checking S3 — and thumbnails are produced asynchronously, so a freshly added item returns a URL that 404s for a while. The frame degrades to the ruled empty frame, **never a broken-image glyph**, and re-polls once on a delay. This applies to every frame in the stream, not only item detail. On item detail the same condition also raises the `Fetch cover` control — a *repair*, distinct from the cover field on the forms, which is for a wrong or missing address (`.claude/ui-v3.md`, EditItem). |
| Error | Inline, in place, on `--paper-deep` with a 2px `--out` top rule. Never a toast alone for anything destructive or retryable. **Recovery is a control, never an instruction to perform a gesture.** "Pull down to try again" is a sentence telling a keyboard or mouse user to do something they cannot do; the block carries a `Try again` action instead, and pull-to-refresh remains the touch shortcut for the same thing rather than its only route. |
| Offline | Declared honestly; the app is online-only by decision (see `/PRODUCT.md`) |

**A state derived from a failure is cleared by the success, not by a timer.** The frame's `failed`
flag exists to serve §6's one delayed re-poll, and it clears on that component's own 4s clock. Item
detail then read the same flag to raise `Fetch cover` — so a **successful** repair left the button on
screen for up to four seconds, re-offering an action that had already worked and looking identical to
"that did not work". The condition must be invalidated by the arriving data, not by whichever clock
happens to own the flag; and the test for it must not wait on that clock either, or it pins the bug
instead of the fix.

The fix belonged on item detail, **not** in the shared frame: that timer serves every row in the
stream, and changing it would have altered a thousand rows to correct one button. **A fix belongs
where the new reading was added, not in the shared thing it read from** — the mirror of §7's rule
that an action belongs where its problem is visible.

**The action slot never holds an inert control.** A reserved slot always carries the most useful
thing for the current state, and which of the two forms it takes depends on whether the reader can
already see why:

- **The reason is visible** — a required field sitting empty directly above. The action renders as
  the ruled outline and fills to a plate the moment the form is valid. No words are needed; the
  outline-to-fill change says it. **This form holds only while the disabled primary is the only ruled
  outline in its row.** Put a secondary beside it and the two are identical at rest — commit and
  abandon, same shape, same colour, adjacent — which is how the lend sheet came to offer `RECORD THE
  LOAN` and `CANCEL` as indistinguishable twins in the one flow the product says takes seconds at a
  door. The test is **shape *and* colour together**: a `--out` destructive outline beside an ink one
  is already distinguishable at rest, which is why the delete confirmations were never part of that
  defect and still use this simpler form correctly. A lone submit button also keeps it. Only a
  same-colour ruled neighbour forces the second form.
- **The reason is not visible** — a limit exceeded, a constraint the reader cannot infer. The slot
  carries the reason in `--ink-soft` caps *instead of* the control, in the control's own position,
  which is the best possible place for the explanation.

So a disabled destructive action has no treatment, because the case does not exist: a destructive
button is already an outline and has nowhere to go. Unshare's bar therefore has exactly three
states — hint, action, reason — and never a greyed control. Reserve the slot's height across all
three so nothing jumps.

**An edge rule never displaces content.** Draw it as an absolutely positioned pseudo-element, not
as `border-left`: a border adds its own width to the box, so a lent or shared row sits 4px out of
alignment with every unmarked row beside it. This is invisible in source and obvious in a
screenshot — it was caught by shooting the comp, not by reading it.

**Plates sit in a fixed-width column.** A count plate is as wide as its number, so `412` and `77`
would start their titles at different x positions and rag the whole list. Reserve the column
(56px at row scale) and centre the figure in it.

**Before tuning two states apart, establish whether they can co-occur.** "Do these read too much
alike" is a question about typography, and it is the second question. The first is whether a reader
can ever see both at once — because if they cannot, there is nothing to distinguish and any rewording
is invented work. `NO COMPLETE LOAN` and a row's `no return recorded` looked like siblings and were
worth worrying about; the answer came from `loans.js`, not from the type. The caps state renders only
when `loans.length === 0`, and an unresolved loan is still pushed onto that array, so the two are
**structurally mutually exclusive**. Not "distinct enough" — unable to co-occur.

This is the same move as the Overprint Stamp and the ledger's first row stating one loan (§5): the
question was settled by what the data can produce, not by adjusting the design until it felt
resolved. A structural answer holds under every future restyle. A perceptual one has to be re-argued
every time something moves.

**One left edge per element.** The two edge rules cannot collide, because they address different
scopes: sharing is a library-level fact in this API — items are never individually shared — so
`--shared` marks library rows and `--out` marks item rows. Inside a shared library an item on loan
takes the `--out` edge while the header carries the provenance. On a search row, where the library
name genuinely is new information, a shared library is named with an inline `--shared` tag, which
keeps the left edge free for on-loan. Should the two ever meet on one element, the state the reader
can act on wins.

---

## 7. Motion

Print does not ease. Motion is **the press**: short, mechanical, un-sprung.

| Event | Motion |
|---|---|
| State swap | 80ms, linear |
| Route transition | 160ms single horizontal shift — the next volume slid onto the table |
| Sheet | 200ms rise from the bottom edge |
| Stamp appearing | No animation. It is printed. |
| Collection expand | 160ms height change, no bounce |

No springs, no parallax, no hover flourishes. Under `prefers-reduced-motion` every transition
becomes an instant swap. This austerity is also cheap, which suits a PWA on a phone.

---

## 8. Accessibility

- Contrast targets per §2, with `--out` restricted to large/bold text, rules and stamp outlines.
- Minimum touch target 6 divisions (48px).
- Focus ring per §2, *Focus*: 3px `--imprint` at 2px offset, switching to `--ink` on yellow grounds.
- Every state carries **words**, not colour alone: stamps and ribbons have visible caps text and
  an `aria-label`.
- **An `aria-label` must never carry fewer facts than the visible text it replaces.** A label
  overrides the content beneath it, so a shorter label is not a summary — it is a deletion, and
  only for the readers who cannot see what was deleted. The Overprint Stamp shipped reading
  `OUT · MARIE · 8 DAYS` under `aria-label="On loan to Marie"`, so a screen reader got the
  borrower and never the duration: the one number saying how long a favour has been outstanding,
  removed from the only readers who could not recover it. The label exists to turn middot-separated
  caps into a sentence, not to shorten it — *"On loan to Marie for 8 days"*. When in doubt, count
  the facts on each side and make them match.
- Content titles are never uppercased (§3), preserving French readability.
- Index letters are separators, not headings, and are exposed as such.
- All motion gated by `prefers-reduced-motion`.
- Safe-area padding on header and any bottom-anchored action:
  `pt-[max(1rem,env(safe-area-inset-top))]`, with `viewport-fit=cover` in the viewport meta.
- Camera capture always has a non-camera path (manual ISBN, manual title search).

---

## 9. What this system refuses

Recorded so later work does not quietly reintroduce it:

- **Any character the shipped faces do not draw.** Two shipped before anyone checked — `⌗` in the
  collection plate and `→` in every ledger row — each rendering in a browser-substituted system
  font inside a line of Archivo or Chivo Mono, in a design that names two faces and declares no
  fallback chain. Both were chosen for meaning without confirming the typeface contained them. The
  cmap assertion in §3 now fails the build for this, but the habit is the real guard: **check the
  font before choosing the glyph, not after shipping it.**
- **Native control chrome this world has no vocabulary for.** A `<textarea>` resize grabber is a
  rounded diagonal handle drawn by the browser, in a system with no radii and no diagonals; suppress
  it and let `rows` govern height. The same applies to any default the platform draws that the
  design never authored.

  **One exception is permanent and is recorded so it is not "fixed": the open state of a
  `<select>`.** The collection field's closed state is fully authored — 48px, a hand-drawn chevron,
  2px bottom rule — but the opened list is drawn by the OS, and on iOS that means rounded corners and
  a shadow, both of which §9 otherwise refuses. **This is not a defect and must not be closed by
  building a custom listbox.** A hand-rolled option list forfeits the native picker's focus
  management, type-ahead, VoiceOver rotor behaviour and hardware-keyboard handling, and would cost
  more accessibility than the two radii it removes. The rule that survives is the one §9 already
  states — suppress what the platform draws *where the design has a vocabulary for it* — and the
  boundary is that a control's own popup layer does not.
- Warm cream or linen grounds, serif display faces, terracotta accents, wooden or shelf
  materials — the category default, and v2's identity.
- Rounded corners, drop shadows, glassmorphism, gradient fills.
- Cover-art grids as the primary browse structure. **The original reason was that artwork is not
  reliably available, and that reason is now retired**: the owner confirms a very large majority of
  items carry a cover. The refusal stands on the grounds that survive — a grid of cover art on paper
  is the category default and v2's actual structure, and a grid answers *what do I own* far worse than
  a titled, alphabetically indexed list does at a thousand items. Recorded rather than deleted so
  nobody reinstates a grid by noticing only that the first argument fell.
- Colour used to distinguish item *type* (colour is legislated for state).
- Icons standing in for state without text.
- Any UI implying data the API does not have: genres, tags, ratings, due dates, date sorting,
  read/watched status.
