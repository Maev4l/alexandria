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

**Of those two constructions, only the first is safe at display size.** The index letter was
originally the second — an `--imprint` fill inside a 2px `--ink` text-stroke — and that construction
failed, not at some parameter but structurally: `-webkit-text-stroke` traces each stroke of a glyph
independently, so wherever counters are tight the outline collides with itself. It is not tunable
(see §4). The letter is now **solid `--ink`, unstroked**, and yellow moved to the 4px index rule
beneath it, where it marks the finding apparatus on an edge rather than being asked to describe a
letterform. When yellow must appear at display size, give it a ground and set ink on top; do not
reach for an outline.

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

| Role | Size | Weight / width | Case |
|---|---|---|---|
| Index letter | 76 | 900 / wdth 62 | uppercase |
| Volume title (detail hero) | 32 | 800 | as authored |
| Library name | 22 | 700 | as authored |
| Row title | 17 | 600 | as authored |
| Metadata | 14 | 400 | as authored |
| Plate Line | mono 11, `--ink-soft` | 400 | as authored |
| Tag & plate caps | 10 | 800, tracking +0.16em | uppercase |
| Numerals (mono) | 13 | 400 | — |

**The index letter is solid `--ink`, unstroked**, with `--imprint` on the 4px rule beneath it. An
earlier build filled it `--imprint` inside a 2px `--ink` text-stroke; that construction is retired
because the stroke collides with itself in tight counters and no parameter fixes it (§4).

76px survived the change and was **re-picked from rendered output, not kept out of deference to this
table** — the earlier justification for it (that a stroked yellow letter reads larger than its size)
died with the stroke, so the size had to be re-earned and was. Weight 900 and width 62.5% are
unchanged: the whole point of the new construction is that it holds the letterform this table
specifies instead of trading it away.

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
| Index letter | `--imprint` filled, `--ink` stroked | solid `--ink` letter; the yellow moved to its 4px rule. Still finding apparatus — but on an edge, because an outline cannot describe a letterform (§4) |
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

### One treatment, and why there used to be two

**Every label takes the same treatment: solid `--ink`, unstroked, at 76px / wght 900 / wdth 62.5%,
with `--imprint` on the 4px rule beneath.** Letters, digits, ligatures and punctuation alike. There
is no alphanumeric bucket and no symbol carve-out, because solid ink is 18:1 on paper, has no
outline to collide with itself, and holds at any weight or width for any glyph the fold can produce.

That single rule replaces roughly a page of exceptions, and the history is kept because the way it
was got wrong is more instructive than the answer.

The letter was originally an `--imprint` fill inside a 2px `--ink` text-stroke. `-webkit-text-stroke`
traces each stroke of a glyph independently, so wherever two outlines meet they collide — in `#`,
four strokes crossing twice, the character resolved into nine separate yellow quadrilaterals. A
carve-out was written for symbols, on the stated grounds that the collision was invisible "in a
glyph with one closed outline — every letter, every digit."

**That premise was false, and it licensed a shipped defect for two slices.** The collision is
governed by **counter width against stroke width**, not by how many outlines a glyph has. At 76px,
wght 900, wdth 62.5%, a 2px stroke closes the counters of ordinary capitals: rendered crops showed
`P` collapsing into a doubled nested outline, `M` reducing both counters to slivers with a scar at
the centre vertex, and `N` growing a spurious diagonal at the junction, while `A`, `L`, `V`, `Z` and
`1` stayed clean. Nobody looked, because this document said there was nothing to look at.

Three treatments were then rendered through the real app rather than reasoned about, and the two
that lost are recorded so they are not re-proposed:

| Candidate | Outcome |
|---|---|
| Keep the stroke, accept the residual | **Rejected.** The scar on `M` is legible in a native-size crop taken from the raw stream screenshot, not only under magnification, across three independent captures. |
| Retune the stroke (0.85px / wght 400 / wdth 100%) | **Rejected twice over.** `M` and `N` keep a residual at *every* combination down to wght 300 / wdth 125% / 0.3px, so it mitigates rather than fixes — and it abandons the letterform §3 specifies while thinning the stroke below what makes the yellow legible at all. It trades a glyph that renders wrong for one that renders faint, and §2 calls faint unreadable rather than subtle. |
| Ink letter on an `--imprint` plate | **Rejected on palette law, confirmed from the crop.** In the live stream it reads as a tappable chip, because it lands on the same silhouette as `PlateButton`'s primary variant. A passive separator must not wear the active-state treatment. |

Two lessons outlive the letter. **A construction can fail structurally rather than parametrically** —
the sweep across stroke widths was work done inside the wrong one of §2's two licensed uses of
yellow, and no value in it was ever going to be right. And **the free option must be disproved, not
assumed**: "change nothing" was checked hardest of the three, precisely because it was the outcome
that cost nothing, and it was disqualified on evidence rather than waved away.

---

## 5. Component vocabulary

| Component | Description |
|---|---|
| **Volume Frame** | The item's artwork frame — 2px rule, portrait 2:3 for **every** item, books and films alike (§4). Nothing is drawn over the artwork. With no artwork it stays a ruled empty frame: no number, no placeholder icon, no apology. **"Ruled" means the rule and nothing else — the empty frame carries no fill.** On paper the fill was `--paper-deep`, near-invisible at ~1.05:1 against its ground, so the frame read as a rule. The hero on the cover filled with `--cover-rule` instead, which is 1.73:1 against `--ink` — a mid-grey slab in the largest, most prominent frame in the app, and since `picture` is absent for most items that slab is the *default* appearance of the peak screen. A filled rectangle where artwork belongs reads as a failed image, which §6 forbids outright. It also spent `--cover-rule`, declared structure-only, as a ground. Both frames are now unfilled; the rule alone describes them, on either surface. |
| **Volume Plate** | A 2px ruled rectangle with `--ink` mono figures, **no fill** — counts are inventory, not apparatus (§4, *Where the yellow goes*). Carries only a real count or order — see §4, *What a plate carries*. Absent on standalone items. |
| **Search Field** | A **real text input**, never a link costumed as one: it takes the `--imprint` ground and is the loudest mark on the screen that carries it, because finding is the job this product exists for. **It is pinned on the libraries root and nowhere else.** A browse screen does not carry it — the field searches every library, so on a browse screen the loudest affordance would promise to leave the library being browsed. One field, one screen, no scope modes. It opens the full-screen search surface and returns the reader exactly where they were. |
| **Plate Line** | The engraved line under a title. Book: `AUTHOR`. Film: `DIRECTOR · 1974`. On detail it gains the edition — `AUTHOR · ISBN`. Fields differ by type; the line's position does not. Names are set in the sans; only figures take the mono, so a film's year is mono and a person's name is not — §3 reserves mono for numerals, and a name in mono is a category error that digits beside it used to disguise. **It never carries the library.** The line is the *work*; a library is where a *copy* is kept. An early comp ran them together as `AUTHOR · ISBN · LIBRARY`, three categories in one dot-separated run, which set the shelf in the same tone as the author and made location read as identity. Location belongs to the Detail Marks. |
| **Detail Marks** | The column beside the item-detail hero, holding everything true of the *copy* rather than the work: `IN <library>` as a link to it, the Shared Ribbon when the library is shared either way, and the Overprint Stamp when the item is out. Reading order is where it is filed → who else can see it → whether it is here. The ~210px next to a 132px frame was dead space; these three facts are one block and fill it. **The stamp lives here, not under the title rule** — an overprint stamp belongs on the cover. `IN` is an interface label and takes caps; the library name is content the reader authored and never does (§3), the same construction as `FROM <owner>`. The link is underlined rather than set in `--imprint`: it is navigation, not a primary action, and yellow beside the title rule would read as one. |
| **Index Letter** | Monumental sticky letter — solid `--ink`, unstroked — over a 4px `--imprint` rule, marking the reader's position in the stream. One treatment for every label, letters and symbols alike (§4). Its label comes from the server's fold — see §4, *The index alphabet* — so it is not always A–Z. **Its count appears only on a closed run.** A run closes the instant a different letter appears after it in the stream, at which point the number is final; the run at the tail of the loaded stream shows no count at all, and no placeholder. A number that grows while the reader looks at it is worse than no number. The count is items — standalone entries plus each board's `itemCount`, counting a board once and ignoring its `partial` continuation. |
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
| Artwork present but unavailable | `picture` is synthesised from a URL template whenever `pictureUrl` exists (`handlers/search.go`), without checking S3 — and thumbnails are produced asynchronously, so a freshly added item returns a URL that 404s for a while. The frame degrades to the ruled empty frame, **never a broken-image glyph**, and re-polls once on a delay. This applies to every frame in the stream, not only item detail. |
| Error | Inline, in place, on `--paper-deep` with a 2px `--out` top rule. Never a toast alone for anything destructive or retryable. **Recovery is a control, never an instruction to perform a gesture.** "Pull down to try again" is a sentence telling a keyboard or mouse user to do something they cannot do; the block carries a `Try again` action instead, and pull-to-refresh remains the touch shortcut for the same thing rather than its only route. |
| Offline | Declared honestly; the app is online-only by decision (see `/PRODUCT.md`) |

**The action slot never holds an inert control.** A reserved slot always carries the most useful
thing for the current state, and which of the two forms it takes depends on whether the reader can
already see why:

- **The reason is visible** — a required field sitting empty directly above. The action renders as
  the ruled outline and fills to a plate the moment the form is valid. No words are needed; the
  outline-to-fill change says it.
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
- Warm cream or linen grounds, serif display faces, terracotta accents, wooden or shelf
  materials — the category default, and v2's identity.
- Rounded corners, drop shadows, glassmorphism, gradient fills.
- Cover-art grids as the primary browse structure — artwork is not reliably available.
- Colour used to distinguish item *type* (colour is legislated for state).
- Icons standing in for state without text.
- Any UI implying data the API does not have: genres, tags, ratings, due dates, date sorting,
  read/watched status.
