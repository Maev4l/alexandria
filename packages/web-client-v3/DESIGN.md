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

Each colour has exactly one job — a single named register of related uses, not necessarily one
literal use. A colour spent outside its register is a bug.

| Token | Value | Means, and only means |
|---|---|---|
| `--paper` | `#F6F6F3` | The ground. Cool off-white. **Not cream** — warm paper is the category default and v2's actual ground. |
| `--paper-deep` | `#ECECE7` | A recessed field: search surface, sheets, form wells. |
| `--ink` | `#0B0B0B` | Content and structure: text, rules, frames. |
| `--ink-soft` | `#5A5A57` | **The quiet register**: secondary content (metadata lines, counts) and the quiet marks that serve it — the back Mark on paper, the select chevron, a field's caps label. Structural rules stay `--ink`. |
| `--imprint` | `#F2C200` | **The apparatus of finding and acting**: the search field, index letters, the active/selected state, primary actions. Never the inventory itself. |
| `--out` | `#D8412F` | **The alarm register**: on loan, and the treatments that warn — an Error block's rule, the destructive button, a field failing validation, a delete confirmation. Never content, never a ground, never focus. |
| `--shared` | `#0F6B4F` | Shared — outbound or inbound. Nothing else, ever. |

**`--ink-soft` is the quiet register, and the wording it replaces — *secondary content only, never
structure* — was false against the app on the day it was written.** The back Mark on paper, the select
chevron in `Field`, and every quiet caps label in the product are `--ink-soft`, and not one of them is
a metadata line or a count. The state grammar breaches the old wording on its own account, spending
`--ink-soft` caps on the **hint** that stands in a control's position — `Select who to remove`, on
unshare's bar, which is neither a metadata line nor a count. Not the *reason* branch, which the
same section later rules out of the caps register entirely: the over-limit state sets a 14px
sentence carrying `role="alert"`, because a constraint the reader cannot infer has to be
announced. An earlier draft of this paragraph named the reason, and the section it cited had
already ruled the other way in the same pass. A rule that the document's own
next section cannot keep is not being disobeyed; it is describing something other than the system.

What the token still refuses is the thing that wording was protecting. **Structural rules stay
`--ink`, at full strength.** A volume frame, a hairline separator, a field's bottom rule, a block's top
edge — anything drawing the 1–4px lines of §4 — takes the structural tone, because rule weight is how
this system expresses hierarchy, and a softened 2px rule reads as a lighter weight rather than as a
quieter one. So the register is for marks and words that *accompany* content; it is never for the
lines that build the page, and a frame set in `--ink-soft` is as much a bug under the new wording as
under the old.

**`--out` is the alarm register, and *on loan, nothing else, ever* was never true of the build
either.** The state grammar sanctions red on an Error block's top rule, on the destructive Plate
Button, on a field failing validation and on a delete confirmation — and the build agrees: of the 43
`border-out` sites the state grammar counts, roughly four are the Overprint Stamp and every one of
the rest is one of those four constructions. That is the identical defect to the row above, in the
row beside it, and both wordings were rewritten in the same pass. What the token still refuses is
what the old wording was protecting. **Red never carries content, never fills a ground, and never
marks focus**: it measures 4.11:1 on paper, sound for a 2px edge and short of AA for text, and a red
focus ring would make every focused element momentarily read as lent.

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
| `--imprint` on `--ink` | marks, headings and rules on the black cover | 11.71:1 — **the same figure this table already prints for `--ink` on `--imprint`**, contrast being symmetric. Its absence is why the yellow law below reads as palette-wide: with no row for the cover case, the only measured yellow in the table was the paper one, and a law derived from it silently inherited a scope nobody had checked. |
| `--imprint` on `--paper` | **never text, never a shape** | ~1.55:1 — yellow on paper is invisible on its own |

**Yellow never carries a shape by itself — on paper.** At ~1.55:1 against `--paper`, `--imprint`
cannot describe a form there; it can only be a *ground* with ink on top of it, or a *fill* inside an
ink outline. That single fact explains most of the system: the plate works because ink figures sit on
yellow (11.71:1), and a primary action works because its caps are ink. Any use of yellow **on paper**
that has no ink doing the describing is unreadable, not subtle.

**The bound is the ground, and it went unwritten because the row above went unwritten.** The
measurement behind the law is `--imprint` on `--paper`. The cover is a different surface, where the
same yellow on `--ink` clears 11.71:1 and describes a form perfectly well. Stated palette-wide, the
law condemned three sites the build gets right, and a later pass reading only the rule would have
stripped them: **the back Mark when the header is inverted** (`AppHeader`), **the `The record` ledger
heading** on item detail, and **the 4px title rules** the cover is specified to carry (see *The black
cover* below). None of the three has ink doing the describing, and on `--ink` none of them needs it.

**One paper site did rely on the unscoped reading, and it is fixed rather than exempted.** `Login`'s
notice drew a yellow top rule on `--paper-deep` — ~1.42:1, and that rule was the notice's only mark,
so the yellow described nothing at all. It now takes the ink rule the other printed notices use. The
distinction worth keeping: the law was over-broad *and* right about the one site it caught, so
narrowing it is not a licence to keep the case it was right about. Scoping a rule and honouring it are
separate acts, and doing only the first is how an exemption gets written as a correction.

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
| `--cover-rule` | `#3A3A38` | Hairline separators on the inverted surface, and — at quarter strength — the fill of a skeleton **bar** there, a structure token tuned with opacity rather than an eleventh token minted to hold one tint. **Never text, and never a frame's fill**: a filled rectangle where artwork belongs reads as a failed image. |

They are named for the surface they belong to, not their brightness: a `soft`/`dim` pair invites
exactly the wrong guess, since the body tone is the *brighter* of the two.

**A ground's text is coloured at or below it, and never inherited across a surface boundary.** A
sheet, a toast, an error block — any surface that paints its own background answers for the colour of
every string it holds, either on its own class or on each text-bearing element within it. Inheriting
*across* the boundary is safe on every paper screen and catastrophic on the one inverted screen, which
is precisely why it survives review: it is correct everywhere the author looked.

**This used to demand that a ground and its foreground be declared together on one class, which is
stricter than the guard enforcing it and stricter than it needs to be.** `groundForeground.test.js`
passes any surface whose text-bearing descendants each declare their own foreground — and that is the
correct pass, not a hole in it. `UpdateNotice` paints `--paper-deep` and sets no text colour on the
notice itself, then sets `--ink-soft` on its caps label and `--ink` on its line, so no string in it can
inherit from anything outside. It shipped correct and in breach of the written rule at the same time,
which means the document was asking for something nobody could apply and nothing could report.

What actually prevents the bug below is not same-class declaration; it is that **no string crosses a
surface boundary carrying a colour from the other side.** That is the weaker rule, and it is the one
doing the work.

This shipped. The `Sheet` panel set `bg-paper-deep` and no text colour, and item detail's root sets
`text-paper` on its whole subtree — so a sheet opened from the black cover rendered `--paper` text
on `--paper-deep`, **1.09:1**. Invisible. The bug is not in the sheet's contents; it is in a
surface that declared half of a pair.

Note which direction the guard missed. The check written for the cover asserts that no paper token
leaks *onto* the cover. Nothing asserted the reverse — a cover token leaking onto a paper surface
rendered *inside* the cover — and the reverse is the one that shipped. **A surface check must run
in both directions**, because the inverted screen contains paper surfaces as well as being one.

**And there is a third direction this section has never stated: a foreground over a ground the design
does not own.** Both rules above assume a surface painting its own background. `CaptureCaption` found
the other case — every caption in both capture viewports set `--ink-soft` caps, transparent,
`absolute inset-0`, over a live camera feed. Measured against a real feed, one unchanged string ran
between **1.45:1 and 5.1:1** depending on where the camera happened to be pointing: legible and
illegible within one render, at a contrast the design cannot predict because it does not own the
pixels underneath. In the component's own words, *"here nothing set a ground at all, which is the same
defect arriving from the other side"*.

It was invisible to the mechanisms that existed when it shipped. The injected contrast detector
reported nothing, because transparency over a `<video>` gives it no ground to compute against, and
`groundForeground.test.js` scans for a ground with no foreground rather than a foreground with no
ground. **The remedy is that the caption paints its own ground** — a printed plate, ink on paper,
pinned to the frame's bottom edge as a full-width strip — so it reads at 18.18:1 whatever the camera
sees, and cannot occlude the region the reader is aiming at.

**But this direction is enforced, not merely discovered, and the guard states the rule better than the
defect does.** `check-browser.mjs` drives a fake camera to a real feed and asserts, in order, that the
caption's computed background is **not** `rgba(0, 0, 0, 0)`, that it then clears AA against that
ground, that it sits below the frame's midpoint, and that it spans the frame as a strip. The first of
those carries the generalisation: **a transparent background is the defect, not merely a low ratio** —
with nothing painted there is no ratio to compute, so the opacity check must come before the contrast
check rather than instead of it. It measures the film screen's idle caption, all five captions having
been routed through one component precisely so that measuring one measures the construction.

So the rule a later capture surface inherits is assertable rather than advisory: **a surface over a
ground the design does not own must paint an opaque ground of its own.** Borrowing a ground is not
owning one, and a surface whose contrast the app cannot compute is a surface it must not write on.

### Focus

**The focus ring is the structural tone that contrasts with its own ground: `--ink` on `--paper`
and on `--imprint`, `--paper` on the black cover.** 3px, 2px offset. One conditional, keyed on the
ground, and it passes everywhere.

**It used to be `--imprint`, and that was refuted by this section's own arithmetic.** Yellow on
paper measures ~1.55:1, and §2 states in bold two paragraphs above that at that ratio yellow
**cannot describe a form** — it can only be a ground with ink on top or a fill inside an ink
outline. A focus ring is a form described by nothing else. So the rule that governs the whole
palette condemned the indicator specified directly beneath it, and the contradiction sat in one
section for five slices.

It also fails WCAG 2.2 SC 1.4.11, whose floor for a focus indicator is 3:1 — the one contrast
requirement in this document that is a legal floor rather than a preference, missed by more than
half.

**Focus is not the active state, which is what made yellow look correct.** `--imprint` owns
*acting and finding*, and a filled plate or a yellow ground is legible precisely because ink sits
on top of it. Focus describes **where the keyboard is**, which is structure — the same category as
a rule or a frame — so it takes the structural tone. Nothing is lost from the palette's meaning,
because the meaning was never readable.

**Two constructions are refused.** A yellow fill inside an ink outline is the index letter's move
and cannot be drawn here: the offset gap is ground, not a paintable band, so it would need a
second concentric pseudo-element — which the misregistration rule below forbids. And `box-shadow`
is forbidden outright (§4), which rules out faking a double ring.

The reason to record all of this rather than just changing a colour: **a palette law and an
indicator spec can contradict each other while both read as deliberate**, and the one that is
arithmetically impossible is the one to move.

`--out` must never be spent on a focus ring: red is the alarm register — on loan, and the warning
treatments the state grammar sanctions — so a red ring would make every focused element momentarily
read as one of them. Do not fake a double ring with `box-shadow` either —
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

**One class in the token layer is now a deliberate no-op, and nothing here had ever said so.**
`.on-imprint` existed to flip the focus ring to ink on a yellow ground. Since the ruling above made
the ring ink everywhere on paper, a yellow ground needs no flip, and the rule sets the colour the ring
already has. It is kept as an **anchor** rather than as behaviour: `index.css` flags it as such at the
site, **ten class strings** across ten components and pages name it, and deleting it would be a
rename across the app for no change on screen. (`index.css`'s own comment says `~15`. Ten real uses plus its
definition, a test assertion and two comment mentions is **14**, which is exactly what
`grep -rn "on-imprint" src` returns; neither figure changes the argument, but this section opens by
calling its numbers facts.)

Recorded because an unrecorded no-op is the shape this document has already been caught by twice —
`--press-route` declared, themed and motion-gated with no consumer (§7), and §3's tracking values
declared and silently beaten. **A declaration standing in for a behaviour reads as more finished than
an unused constant does**, and the only difference here is that this one is labelled at its site and,
now, in the palette that owns it. It must not grow a new rule on the assumption that it still does
something.

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
| Ledger name row, ribbon owner | 13 | 400 | sans | ribbon owner sets `text-transform: none` |

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

**The same manifest asserts the computed SIZE, and that is the only thing that can.** A numeral whose
span declares no size of its own — the ledger duration, the index letter's run count — takes its size
from the line it sits inside, so it carries no size class for a source-parsing guard to read, and the
size published for its role is unverifiable anywhere else. The table below was found publishing one
such figure at 11 against a rendered 13 by a person reading the two side by side, which is not a
mechanism. Where the table publishes no size for a role, the manifest declares that absence and
reports the measurement instead of asserting one: filling the number in from what the component
renders would make the guard agree with the code by construction.

The cost is that a numeral on a new screen is uncovered until someone lists it, so **the manifest needs
its own drift alarm**, exactly as `monoRouteCoverage` guards `MONO_ROUTES`. An unlisted datum must fail
the alarm rather than pass the check.

**Mono — numerals only (§3, the mono rule)**

| Role | Size | Weight | Notes |
|---|---|---|---|
| Count plate | 12 | 700 | tabular, in a 2px ruled plate |
| Plate Line figures, detail plate line | 12 | 400 | `--cover-soft` on the cover |
| Index letter count, ledger dates | 11 | 400 | tabular |
| Ledger duration | 13 | 400 | tabular; it sits **inside** the ledger's name line, which the content table above publishes at 13, and takes that line's size rather than the row's own 11 — published at 11 here until somebody read the component |
| Section-header count (the figure beside `MINE` and `SHARED WITH ME`) | 11 | 800 | tabular; the weight is inherited from the caps label beside it rather than set here, and its tracking is cancelled outright rather than left blank — explained below |
| **Collection member order plate** | **10** | 400 | tabular, in a **1px** rule — one step lighter than the ordinary plate's 2px, because this plate sits inside a Volume Frame whose own 2px rule it must not out-weigh |

**The library row's own sub-line used to sit in this table, and it never should have.** An earlier
draft listed it here as a mono numeral at 11px, weight 400, alongside ledger dates and durations. It
never was one: the sub-line under a shared library's name is a caps tag reading `Shared · N` or
`From <owner>`, and only the `N` inside it is a numeral — and not at the count plate's 12/700
either: it renders at the ribbon's own 11/700, which is where it is now accounted for. The tag itself is an interface label, sized and tracked like the rest of the
caps roles below, not a datum on display; it is now named there as its own row instead — see
`library row sub-line (shared ribbon on a row)`.

**Caps — interface labels. Tracking is per-role and is not one value.**

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Wordmark | 12 | 800 | +0.20em |
| Plate Button labels — every variant | 12 | 800 | +0.12em |
| Section header (`MINE`, `SHARED WITH ME`) | 11 | 800 | +0.16em |
| Account plate initials | 11 | 800 | +0.08em |
| Ledger head, detail-marks label, ledger date labels | 10 | 800 | +0.16em |
| `shared ribbon caps (detail marks, search row)` | 10 | 800 | +0.16em |
| `library row sub-line (shared ribbon on a row)` | 11 | 700 | +0.16em |
| Overprint Stamp | 10 | 800 | +0.14em |
| Field label, field counter | 11 | 700 | +0.12em |

**Shared ribbon caps is two published value pairs, not one, because the same tag renders inside
four different wrappers that each set their own size and weight — the tag itself sets neither.** A
library row wraps it at 11px, weight 700, on the row's own sub-line, and the library-browse
screen's own provenance line — shown once, when the whole library being browsed is shared — wraps
the identical tag at that same 11px, weight 700. The mark column beside an item's cover, and the
inline tag on a search result, both wrap the tag at 10px, weight 800. Four rendered instances, two
value pairs, and +0.16em tracking is the one value all four happen to share.

That shared tracking value is exactly what let one published row stand in for both pairs,
unnoticed, for a long time. A browser check measuring only the library row's own tracking passed
cleanly against a row published at the mark column's size and weight, because both pairs sit at the
same +0.16em and tracking was the only property being measured — a correct reading of the wrong
instance, sitting inside the very guard meant to catch this kind of drift.

Both value pairs are now published above by name — `shared ribbon caps (detail marks, search row)`
and `library row sub-line (shared ribbon on a row)`. **What is actually measured is narrower than
either name suggests.** It checks one instance of each pair — the mark column beside an item's
cover, and the library row's own sub-line — on all three properties: size, weight and tracking. The
other two rendered instances, the inline tag on a search result and the library-browse screen's own
provenance line, are not measured by anything; they are asserted here to share their pair's
published value because they were checked against source for this reconciliation, not because a
check runs against them.

**The account plate's cell used to be blank, and that blank cost a round.** Read as intent it says
*no tracking*, which is how I first read it — and the comp settles it the other way: `.acct` in
`docs/ui-design/ui-v3-mockup.html:138-140` declares `letter-spacing: .08em` outright. So the blank
was a transcription gap, the initials have always carried the baseline, and the value is now printed
rather than inferred from the cascade happening to supply it.

**This is the third time this table has disagreed with the comp** — after the six sizes taken from
the specimen legend instead of the phone comps. Same cause each time: a summary of the design read
in place of the design.

**So a blank cell in a spec table is not a value.** It cannot distinguish *zero* from *unspecified*,
both readings are actionable, and they point opposite ways — which is exactly the ambiguity that
produced two contradictory rulings from me on one row. Every cell carries a number or the explicit
word `none`; and where zero is genuinely wanted, it is **declared at the site** (`tracking-normal`)
so the intent is visible in the code rather than deduced from an empty table cell.

**The section-header count is the concrete case that rule was written for.** The label — `MINE`,
`SHARED WITH ME` — sits in the caps row above; the figure beside it is a mono, non-tracked span
that inherits the label's own extra-bold weight (a numeral changes only the family and the digit
shapes, never the weight) but explicitly cancels the label's own tracking with a normal-tracking
utility set right at that span. That is the declared zero the previous paragraph asks for — a value
written into the code, not an absent cell — and it is why the mono table lists that count with its
tracking already accounted for, rather than leaving the question for someone to guess at.

Any caps role **not** in this table **and declaring no tracking of its own** takes the 0.08em
baseline from `.caps`. A role that does declare a value beats the baseline whether or not it is
listed here — that is the whole point of the layer ordering above — and two published roles are in
exactly that position: `NEW EDITION` on the Update Notice and `FILING INTO` on the filing mark, both
at +0.16em, both named in the component vocabulary and neither listed here. The table is therefore a
list of deliberate exceptions to a default, not an inventory of every caps site, and an unlisted role
is still an unchecked one.

The field label is listed at **+0.12em against the section header's +0.16em**, and the difference is
doing work: a critique measured the two at 11px/700 and 11px/800 in the same tone and found nothing
marked where a section ended and its fields began. Separating them by tracking as well as weight
uses the register itself rather than adding a rule or a size — and it is the reason a field label
needs naming here at all, since without a row it would silently inherit the baseline.

The steps in use are **10, 11, 12, 13, 14, 17, 20, 22, 32, 76**. Anything else is off the scale.

**One exception, and it is not a display size: every input sets 16px, not only `Field`'s three.**
`Field`'s own input, select and textarea take `text-base`, and so does the Search Field's `<input>`
— the same platform reason, not a fourth carve-out. The content table above used to list the search
field input at 13px, grouped with the ledger name row and the ribbon owner's address, whose rendered
text really is that size; the search field's own `<input>` was the one row in that group describing
a text box rather than rendered text, and it was wrong. The size guard had the matching gap in the
opposite direction and has since closed it: its exception used to be keyed to one file, and the
search field's input sat at 13px — on the allowed scale, so the check passed it — while being the
one control in the product that actually triggers the zoom, and the most-tapped one in it. The check
is now keyed to the input element itself, so a third input is covered without anyone having to add
it by name; this document was the last place still describing the narrower version. Mobile Safari
**zooms the page** when a focused input's font-size is below 16px, which on a phone-first PWA would
jerk the viewport on every tap into a field — so 16px is load-bearing platform behaviour, not a
typographic choice, and it sits outside the display scale deliberately. **Any guard over the scale
must know this exception, or its first act is to fail on correct code.**

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

**The narrowing figure was 27–44% here and is measured at 24–37%.** Advance widths at 76px / wght
900, `100%` against `62.5%`: `M` 73.88 → 53.86 (−27.1%), `N` 63.31 → 39.69 (−37.3%), `P` 54.88 →
37.11 (−32.4%), `Œ` 91.73 → 58.22 (−36.5%), `#` 50.17 → 38.09 (−24.1%), `A` 59.14 → 40.53 (−31.5%).

Worth correcting rather than rounding, because **a guard written against the old figure would have
failed on correct code**: `#` narrows 24.1%, under the stated floor of 27%, so the first thing that
range would have done is report a defect in the glyph the treatment was most doubted on. That is the
crying-wolf opening that gets a guard deleted instead of fixed. A threshold belongs at a margin
below the *measured* minimum, not at a remembered one.

### The caps utility carries case, and nothing else

A `caps` utility that also sets `font-weight` cannot be removed safely: taking the uppercase off a
string silently takes its emphasis with it, and the element lands at whatever the base weight is —
quieter than it was, for a reason nobody wrote down. That is exactly how a sheet heading dropped
from a readable label to 11px at weight 400 while the only stated intent was "stop shouting a
French name".

So `caps` sets **`text-transform`, plus a baseline `letter-spacing: 0.08em` declared in
`@layer components` so that any explicit `tracking-*` utility beats it.** Weight is always set
alongside it, explicitly, at the point of use.

**That precedence is the whole fix, and my first ruling deleted the default instead — which broke
half the caps in the app in the opposite direction.** Counted after the change shipped: **25** caps
sites declare a tracking value and **26 declare none**, every one of the 26 at 11–12px. Deleting
the default gave the 25 their published values and silently took every unlisted small-caps label in
the product — form labels, the field counter, index-letter counts, detection notes — from 0.08em to
`letter-spacing: normal`. Uppercase at 11px with no tracking is exactly what the default existed to
prevent, so the deletion reintroduced the original problem for the larger half of the sites.

Verified rather than reasoned, because Tailwind 4's layer order is a fact about the build and not
about this document: the page declares `theme, base, components, utilities`, and a probe of
`letter-spacing: 0.08em` in `components` measures **0.88px** alone and **1.76px** when
`tracking-[0.16em]` is added. Both halves hold at once.

**The general rule: resolving a conflict by deleting one side changes every case that depended on
it, and those cases are invisible in the diff.** The defect was *precedence* — a default beating an
explicit declaration — so the fix is precedence. I asked which sites the utility was overriding and
never asked which sites it was serving, and only the second question finds the 26. Neither the
critique that found the collision nor the guard written to close it covered them: the guard checks
the six roles named in §3's table, so **an unlisted role is an unchecked role**, the same shape as
`MONO_FIELDS` needing its own drift alarm.

That makes §3's caps table a manifest, and it must say what governs a role it does not list — the
0.08em baseline — rather than leaving the answer to whichever way the cascade happens to fall. Any rule of the form "this is content, stop uppercasing it" must
then be a one-property change with no second-order effect.

**This rule was written for weight and stopped one property short, and the property it left behind
had the same defect in a worse form.** The earlier draft of this paragraph read "`text-transform`
and `letter-spacing` only" — so the utility owned tracking while §3's caps table assigned five
distinct values per role. Both statements were in this document at once, and they cannot both hold.

The build implemented both faithfully: `letter-spacing: 0.08em` in `.caps`, and
`tracking-[0.20em]` / `[0.16em]` / `[0.14em]` / `[0.12em]` at 26 call sites. `.caps` sits later in
`@layer utilities` at equal specificity, so **the utility silently won every one of them**.
Measured: `caps tracking-[0.16em]` computes **1.28px** where `tracking-[0.16em]` alone computes
**2.56px**. Live, every caps role in the app rendered 0.08em — the wordmark declares 0.20em and
rendered 0.96px.

So **not one of §3's five published tracking values had ever appeared on screen**, across every
button label, the wordmark, every section header, ribbon, ledger head and stamp. The caps register
is what §3 calls the difference between an imprint and a poster, and it had never been seen as
designed.

Three things make this worth the space. It is the **same failure mode the weight rule names** — a
utility that also owns a per-role property cannot be overridden safely — so the fix was already
written down and simply not applied to the second property. It was **invisible to every guard**:
`typeScale` resolves sizes, `monoText` and `monoFieldCoverage` resolve faces, `fonts` reads the
cmap, and nothing computes `letter-spacing`. And a later commit **reaffirmed the collision in
prose** ("carries case and tracking") without measuring it, which is how a contradiction survives
a review that was looking straight at it.

A browser assertion now computes `letter-spacing` for one element per published caps role — and,
since the shared-ribbon roles above were reconciled against their two real instances, it computes
**size and weight alongside it**, not tracking alone. A check run against every role that already had
an entry came back clean on both added properties, so the widening shipped as an extension of what
the existing entries check rather than a fix to them. **The two entries the widening added did not
come back clean.** Both auth screens printed the wordmark at the section-header step — 11px against
a published 12 — and nothing could report it, because `typeScale` resolves declared sizes and 11 is
*on* the scale; `Login.jsx` and `SignUp.jsx` were corrected in the same pass. Roles the check does not yet
reach at all — the section header's own label text, the Overprint Stamp, ledger date labels, the
field counter — remain published rules with nobody computing them, the same shape of gap a role
missing from the check leaves open. The general form, and the question worth asking of this
document repeatedly: **a spec that publishes N values for a property nothing computes is
publishing a preference, not a rule.**

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
| Stream row (the item list's own row) | 13 divisions (104px), **derived and reserved, not set** — 32px of padding around the row-scale artwork frame's 72px, the sum the row's containment rule reserves as its pre-first-render estimate via `auto 104px`. The row itself sets no explicit height, and a long, wrapping title can render taller than this. Neither of the two rows above describes it: this is the app's densest, most repeated element, and it had never had its own line |

### Rule weights

Elevation is expressed by rule weight and ground shift. **There are no shadows anywhere** — print
has none — and **no rounded corners**: every radius is 0.

| Weight | Separates |
|---|---|
| 1px | one row from the next inside any list in the app — the item stream, the ledger, item history, the unshare recipient list, search results — and a section header from what follows it |
| 2px | a whole block from what sits below it — a library row's own edge, a collection board's head, the app header's bottom edge, the browse screen's own provenance edge — plus every artwork frame and field underline |
| 3px | one structural block from the page around it — block frames, a collection board's own outer frame, and every bottom-anchored panel's top edge: a sheet, the toast, the update notice, the capture screens' notice panels |
| 4px | the sticky index letter from the stream beneath it, and the item-detail hero's title from its summary |

Restated by what each rule separates rather than by a single example each. The lightest weight's
old description — a hairline "inside a block" — undersold its own range: 1px is the rule between
every row in every list in the product, not only inside one. The 2px row's old description —
"volume frames, field underlines" — had a gap of its own at that same weight: a library row's own
edge, a collection board's head and the app header's bottom edge are all 2px too, and none of them
is "inside" anything — each is a whole block meeting whatever comes after it. Naming what a rule
does, rather than reciting examples of where it happens to sit, is the description that survives
the next component that reaches for either weight.

### `.row-skip`, and the one thing it must never wrap

The item stream's row carries `.row-skip`, a containment rule that skips layout and paint for
whatever the browser has not scrolled to yet. **It is not what keeps a thousand-item list
responsive**, and the screen specification records why: the project's own profiler measures this
containment as inert in both workloads it was pointed at — within 1% of p95 on the stream, 1–3% on a
400-row search list — and what holds the stream up is the page size. It is kept because it costs
nothing and because its reserved height is doing real work.
Its reserved placeholder height is not a guess — it is the same 104px the row-height table above
derives from the padding around the row-scale artwork frame, so a row claims its real height before
it has ever painted and the page does not jump as rows scroll into view.

`.row-skip` carries one hard constraint, worth stating here even though it is also stated at the
point of use: it must never wrap anything that also contains a sticky index letter. Containment
breaks sticky positioning on everything inside it, and the letters are load-bearing wayfinding
rather than decoration, so `.row-skip` sits on the row itself and never on a container that also
holds the letter above it.

Collection boards are deliberately given no `.row-skip` at all. A board's height varies with its
member count, and reserving a fixed placeholder height for a variable-height element drifts the
reader's scroll position the moment a continuation board on a later page merges into the one
already on screen — the same merge that is supposed to leave the reader looking at one board
rather than two. Reserving a wrong guess would fight the very thing this rule exists to hold still.

### The two capture viewports are not the item frame's ratio, and that is deliberate

Every item frame described below is a plain upright rectangle in a 2:3 ratio — book covers and
film posters both arrive in that shape, so one frame serves both kinds of artwork. A camera
viewfinder is not an item, and stating its own shape has been missing from this document until now.

The two viewports are not even the same shape as each other, on purpose. The barcode scanner's
viewfinder spans the full column width at 192px, landscape, because an EAN-13 barcode is itself
landscape — a tall, narrow window would make the reader back away until the whole code fit inside
it, shrinking the barcode within the camera's own sensor frame by the exact mechanism the window
was meant to help. The cover-capture viewfinder spans the full column width at 240px, also
landscape, aimed at a disc case's printed title rather than its whole cover, because the artwork
the reader eventually sees comes from a lookup service and never from this photograph.

Neither takes the item frame's upright ratio, and neither should. Matching a frame to its subject
is the same principle behind the single item ratio below — one shape, because book covers and
posters share it — applied honestly a second time: a viewfinder's subject is a barcode or a title,
not a cover, so the same principle produces two different, non-upright numbers instead of one. This
asymmetry — two viewfinders, two different landscape heights, chosen for two different subjects —
must not be smoothed into a single viewfinder shape, or reconciled with the item frame's ratio; it
was never describing the same thing.

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

**A title can fold to nothing, and that needs its own fallback — though not for the reason a
leading accent alone would suggest.** Stripping combining marks removes any mark that combines with
a preceding letter; a title whose first character is a combining mark but is followed by ordinary
letters still folds down to those letters; the strip removes the accent, not what comes after it.
The fallback fires only when the **whole** fold comes out empty, which happens when a title is
composed entirely of combining marks and nothing is left once they are stripped. In that one case
the client falls back to the title's raw, un-folded first character: a monumental letter showing
nothing would be worse than an odd glyph, even though it means showing a character the server's own
fold did **not** sort the title on. Only a genuinely empty title — which the catalogue's own rules
forbid — produces no label at all.

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
condensed. In real Archivo the `wdth` axis engages, narrowing glyphs by 24–37%, and the counters
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
| **Volume Frame** | The item's artwork frame — a 2px rule, portrait 2:3 for **every** item, books and films alike. Nothing is drawn over the artwork. **Three sizes, one ratio.** `row` is 48×72, the browse stream, where a reader is scanning a thousand titles and the words do the work. `hero` is 132×198 on item detail, ruled in `--paper` rather than `--ink` because the ground there is black. `candidate` is 88×132 on the detection-results screens, and it is not a middle value picked for balance: on that one screen the picture is what decides the match, and choosing the wrong edition writes a record the reader cannot afterwards detect as wrong. It shipped at the stream row's 48×72 — the smallest frame in the app, on the screen with the most vertical room to spare, measured at 284px unused at an 844px viewport. With no artwork the frame stays ruled and empty: no number, no placeholder icon, no apology. **"Ruled" means the rule and nothing else — the empty frame carries no fill.** On paper the fill was `--paper-deep`, near-invisible at 1.09:1 against its ground, so the frame read as a rule anyway. The hero on the cover filled with `--cover-rule` instead, which is 1.73:1 against `--ink` — a mid-grey slab in the largest, most prominent frame in the app, and, since `picture` is absent for a real share of items, the default appearance of the peak screen. A filled rectangle where artwork belongs reads as a failed image, which the state grammar forbids outright, and it spent the cover's hairline tone at full strength as a large ground — a different thing from the quarter-strength fill the state grammar gives a skeleton *bar*, which stands in for a line of text rather than for artwork. Both frames are unfilled; the rule alone describes them, on either surface. A thumbnail that fails to load degrades to that same ruled frame and retries 4s later, **exactly once**, and then holds the empty frame. **The bound is the whole of it, and it was missing for five slices while five documents including this one asserted it.** Without something counting attempts the timer is armed whenever the failure flag is set, clearing it remounts the image, and that image's next failure sets the flag again — so a thumbnail that is merely late resolves on the second attempt, which is the case the mechanism was written for, while a permanently broken one re-requested every 4s for as long as the row was mounted, on every such row of a thirty-row page. The address is synthesised from a template without checking storage, so one that 404s is the common case rather than the rare one, which is what made an unbounded poll expensive rather than theoretical. The single retry **re-arms when the address changes**: the address carries `?v={updatedAt}`, so a changed one means the item was genuinely written to — a new subject, not a repeat of the one that failed — and that is what lets the `Fetch cover` repair below be tried afresh instead of inheriting a verdict reached about a different address. On item detail the frame carries the `Fetch cover` repair control when — and only when — a `pictureUrl` exists **and** the image failed to load; the control lives on the page rather than in this component, so every row in the stream renders the same frame with no per-row action. It takes the unfilled secondary Plate Button, inset one division horizontally and two vertically so its own rule stays visibly clear of the frame's, and no ground is painted inside the frame. **Its 2px rule is load-bearing and must not be tidied away as a box inside a box.** Without it, caps centred in a ruled frame is precisely the *Empty* state in the state grammar — a ruled frame with a caps invitation — so `FETCH COVER` would read as a label describing the frame rather than an action on it. The rule is the whole difference between a control and a caption, and at 132px the label wraps to two centred lines, which is accepted: a wrapped caps plate still reads as printed, and shortening it to `FETCH` would drop the noun that says what is fetched. A collection member's frame also carries its order in a plate at the bottom-right, inside the rule — see Volume Plate for the two ways that one plate departs from the ruled construction. |
| **Volume Plate** | A 2px ruled rectangle with `--ink` mono figures, **no fill** — counts are inventory, not apparatus, and yellow is reserved for finding and acting. Carries only a real count or order: a library's `totalItems`, a collection's `itemCount`, a member's `order`. Never an invented sequence number — the API has no item ordinal, so one would be fabricated data wearing the imprint's clothes. Absent on standalone items. A `filled` variant exists on the component for the active or selected state — **and no caller passes it.** All three call sites take the ruled default, so the yellow branch is unexercised, and it is named as unexercised here: a variant described without that qualification reads as something a reader can go and look at. **The collection member's plate departs from the ruled construction twice, and this entry recorded neither.** Both departures are argued in `VolumeFrame.jsx`, which is where that plate is drawn rather than here. It takes a **`--paper` fill**, because it is the one plate with a picture behind it: sitting bottom-right *inside* the frame, it needs a ground of its own to read over artwork instead of over the page. And it takes a **1px rule, not 2**: at 10px, 2px of rule around a two-digit figure is mud rather than a plate. That is a size-dependent exception to the ruled plate, not a second component, and the order is padded to two digits so `07` and `12` occupy the same width. The type scale records the 1px in passing; nothing recorded the fill at all, which is how a reader noticing that one plate looks unlike every other found no answer at the entry describing plates. |
| **Search Field** | A **real text input**, never a link costumed as one: it takes the `--imprint` ground and is the loudest mark on the screen that carries it, because finding is the job this product exists for. **It is pinned on the libraries root and nowhere else.** A browse screen does not carry it — the field searches every library, so on a browse screen the loudest affordance would promise to leave the library being browsed. One field, one screen, no scope modes. It opens the full-screen search surface and returns the reader exactly where they were. |
| **Plate Line** | The engraved line under a title. Book: `AUTHOR`. Film: `DIRECTOR · 1974`. On detail it gains the edition — `AUTHOR · ISBN`. Fields differ by type; the line's position does not. Names are set in the sans; only figures take the mono, so a film's year is mono and a person's name is not — §3 reserves mono for numerals, and a name in mono is a category error that digits beside it used to disguise. **It never carries the library.** The line is the *work*; a library is where a *copy* is kept. An early comp ran them together as `AUTHOR · ISBN · LIBRARY`, three categories in one dot-separated run, which set the shelf in the same tone as the author and made location read as identity. Location belongs to the Detail Marks. |
| **Detail Marks** | The column beside the item-detail hero, holding everything true of the *copy* rather than the work: `IN <library>` as a link to it, the Shared Ribbon when the library is shared either way, and the Overprint Stamp when the item is out. Reading order is where it is filed → who else can see it → whether it is here. The ~210px next to a 132px frame was dead space; these three facts are one block and fill it. The first two are facts about the **library**, the stamp is a fact about the **item**, so the column spaces them as two clusters rather than listing all three at one gap — at a uniform gap `SHARED · 2` read as though the book itself were shared with two people, which this API cannot even express. **The stamp lives here, not under the title rule** — an overprint stamp belongs on the cover. `IN` is an interface label and takes caps; the library name is content the reader authored and never does, the same construction as `FROM <owner>`. The link is underlined rather than set in `--imprint`: it is navigation, not a primary action, and yellow beside the title rule would read as one. The sharing mark's green edge is an absolutely positioned rule hanging into the column's own left padding and never a `border-left`, which would add to the box and shove that one line right of the two beside it. **There is a second construction of the same idea, and it is a separate component rather than a variant of this one** — Search Row Marks, below, which owns its own figures and the rules that make it differ from this column. Stated there and only there: two independent accounts of one rule drift the moment either is edited. |
| **Index Letter** | Monumental sticky letter — `--imprint` filled with a 2px `--ink` stroke — over a 4px `--ink` rule, marking the reader's position in the stream. It is a separator and not a heading: it marks position, it does not title a section. **One treatment for every label**, letters and symbols alike. Its label comes from the server's own fold, so it is not always A–Z. **Its count appears only on a closed run.** A run closes the instant a different letter appears after it in the stream, at which point the number is final; the run at the tail of the loaded stream shows no count at all, and no placeholder. A number that grows while the reader looks at it is worse than no number. The count is items — standalone entries plus each board's `itemCount`, counting a board once and ignoring its `partial` continuation. **And it is a phrase, not a figure**, which this entry never said: `12 volumes`, at 11px in the quiet register, singular at one. Only the number takes the mono; `volume` and `volumes` are words and stay in the sans, because a word set in mono is the same category error as a name set in mono. That was invisible for as long as both faces resolved to the same fallback, and it is the instance that started the sweep for the rest. |
| **Overprint Stamp** | Rotated −4°, a 2px `--out` outline, caps at 10px/800 with +0.14em tracking. Marks a lent item, and carries words, never colour alone. Red measures 4.11:1 on paper — sound for rules and outlines, short of AA for small text — so the stamp's colour lives on its edge and its words stay in a legible tone. **There are two variants, and this entry described one of them as though it were the stamp.** On paper the stamp sits at `opacity-[0.92]` with its caps in `--ink` and `px-[6px] py-[2px]` of padding, so it reads as ink pressed over paper. Inverted, on the black cover, it sets its caps in `--paper` at full opacity with a tighter `px-[5px] py-px` — **there is no paper ground on the cover for the opacity trick to read against**, so 0.92 there would only dim the mark rather than sink it into the page. The comp defines the two as separate rules rather than one style read twice, and the build follows it. **On a row it reads `OUT` alone; the borrower and duration belong to item detail** (`OUT · MARIE · 6 DAYS`). `lentTo` permits 50 characters, which no row can hold, and the split follows the labelled-twice rule — the row answers *is it out*, the detail answers *who has it and how long*. Nothing is ever truncated. A third use is neither variant: the boxed Ledger Row renders the stamp **bare**, with no name and no duration, because that row's own two lines already state both. On detail the stamp and the ledger's first row **do** state the same loan, and that overlap is allowed: the stamp is current *state*, read beside the cover without looking for it; the ledger is the *record*, read only if you go down for it. The open loan is the single row where state and history coincide, and that coincidence is in the data, not in the design. Suppressing it either way would make one surface lie by omission — a stamp with no borrower, or a history missing its most recent loan — and `PRODUCT.md` requires lent-to-whom to be legible wherever the item appears, not a scroll away. |
| **Shared Ribbon** | 4px `--shared` left edge rule plus a caps tag: `SHARED · N` outbound, `FROM <owner>` inbound. |
| **Search Row Marks** | What a search result adds to a stream row, and nothing else. `SearchRowMarks` fills the `marks` slot `ItemRow` leaves empty, and the search screen is its only caller: inside a library the header already names the library, so repeating it on every row would state one fact twice, while across a result set spanning every shelf the reader can see, the shelf is the one genuinely new fact. Two facts, not one restated — `IN <library>` says where the copy is filed, and `FROM <owner>` says whose shelf that is, appearing only on a library shared *to* this reader and delegated to the Shared Ribbon, which sets it in `--shared` at 5.99:1 on paper. The whole mark sets a 13px line in the quiet register, one division under the Plate Line, with **the library name alone lifted to `--ink`**: the mark is secondary beside the title and the Plate Line above it, and the name is the part of it actually being read. The labels are interface words and take the caps at 10px/800 with +0.16em tracking; the library name and the owner's address are content the reader authored and never do, the same construction the Detail Marks column uses beside the hero. **Its rule is why this is a tag and not an edge.** The ribbon's own form is a 4px `--shared` left rule, and on a search row that edge is already spoken for: a lent item draws the `--out` rule there, as an absolutely positioned 4px element rather than a border so it displaces nothing. One element gets one left edge, and a lent book on somebody else's shelf is an ordinary row that must not have to choose which of its two states to show — so provenance moves inline and the edge stays with the state the reader can act on. It is also deliberately **not a link**, unlike `IN <library>` on item detail: it renders inside the row's own link, and an anchor inside an anchor is invalid markup that would give one row two destinations. The shelf becomes reachable one screen along instead. |
| **Collection Board** | A grouped collection: a 3px frame, the member count in a plate, a 2px rule under the head, members inset by one division. **Members render unconditionally.** This entry described the board as expanding in place, and nothing in the source has ever implemented expanding or collapsing — no expand state, no toggle, no control to press. A board shows its members. The board is filed alphabetically under the **collection's** name while its members run in `order`, not by title — so a board under "S" may legitimately open with *Aliens*. An earlier draft printed a `SERIES ORDER` caps label at the head to explain that, on the theory it would otherwise read as a sorting bug. It would not: **every member already carries a numbered plate**, and a numbered sequence needs no caption saying it is in sequence. The label restated what the numbers state — one fact labelled twice. The board's own name at the head is what files it; a named container filed under its name surprises nobody. **One caps label does earn its place, and this entry never named it: `CONTINUES`**, under the board's name at 10px in the quiet register, on a board the server flags `partial`. Normally a partial board merges into the board already on screen and nothing needs saying, because nothing was split in the reader's view. An orphaned one — a continuation page whose predecessor is not loaded — has nothing to merge into, and the label is then the only thing on screen stating that these members did not all arrive together. A member plate reading `07` does not prove it: orders run 1–1000 and a collection need not start at 1. Without the label, that board reads as a duplicate of one the reader has already passed. The board is also deliberately excluded from the stream's row-skipping: boards are variable-height, and a wrong intrinsic size drifts the scroll position at the exact moment a continuation page merges members into one mid-scroll. |
| **Sheet** | Bottom sheet on `--paper-deep` with a 3px `--ink` top rule and square corners, rising from the bottom edge in 200ms, linear — the press, not a spring — and instant under `prefers-reduced-motion` like every other transition. It is constrained to the same 448px column the app is and centred in it, carries its own bottom safe-area padding, and caps at `max-h-[80dvh]` with internal scroll, so a long body scrolls inside the panel rather than pushing it past the viewport. Its heading is the content's own name — the library or the item being acted on — at the Row Title step, 17/600, never uppercased, because content is never uppercased and because the sheet should read as that row expanded rather than as a screen with its own typography. `text-ink` is stated beside `bg-paper-deep` and is not decoration: anything that sets a ground sets a foreground for it, and this is the component that proved it, correct on every paper screen and unreadable at 1.09:1 on the one screen that inverts. Here the two sit on the same element, which is stricter than the general rule — a ground may also be answered by its text-bearing descendants each declaring one — and right for this component in particular, because a sheet's body is caller-supplied and there is no descendant it could rely on. **The single sentence this entry used to be hid the mechanism that makes it a dialog rather than a panel** — 193 lines of it, described in nine words. A **`bg-ink/40` scrim** fills the space above the panel and dismisses on click, because a reader tapping outside a sheet expects that; it is **a plain div and not a button**, having been a `<button aria-label="Close">` 545–657px tall, first in the tab order, announcing the same name as the panel's own close mark a few controls later. The panel is **portalled to `document.body`**, because every page mounts this as a sibling of its own `<main>` — inside the subtree that gets made inert — so moving it out is what lets *inert the app root* and *keep the sheet usable* both be true at once. The app root takes **`inert`, not `aria-hidden` alone**: `aria-modal` is a promise that nothing outside the dialog is reachable, and the search field and every library link behind an open sheet measured as tabbable. `inert` removes the subtree from the accessibility tree and the tab order at the platform level, so the browser keeps the promise rather than convention. A **module-level open-sheet counter** governs that lock, because sheets overlap — a delete confirmation opened from inside a menu sheet, two sheets mounted at once — and per-instance save-and-restore would let the first to close release the scroll lock and drop `inert` while another was still on screen. The body's overflow value in place before the first lock is captured and put back verbatim rather than reset to the empty string: nothing else sets it today, but reading a value costs nothing and assuming one is the habit being closed. The **focus trap is re-queried on every keypress**, not captured at open, because a sheet's controls change as its mode does — menu, lend, delete — so a list taken at open is stale the moment the reader picks an action; and the panel, which holds focus when the sheet opens and contains itself, has to count as sitting *before* the first control or Shift+Tab walks straight out the back. On close, **focus returns to the opener**, remembered as the active element at open: after `Delete for good` the trigger has gone with its row and focus would otherwise land on the body, stranding a keyboard reader at the top of a rebuilt stream. A **`Close` Mark sits inside the panel**, and is now the only control carrying that name. Escape closes too, but a phone has no Escape key, so this is the one visible, tappable route out — a visible mark duplicating a gesture, which is the same rule that governs long-press. |
| **Toast** | The confirmation surface, mounted once for the whole app by `ToastContext`'s provider and never per screen. Bottom-anchored on `--paper-deep` under a 3px `--ink` top rule, held in the same 448px column the app is and inset within it, with its own bottom safe-area padding; it announces politely rather than as an alert, because a confirmation is an aside and not an interruption, and it clears itself after four seconds. The wrapper takes no pointer events at all, so a confirmation can never intercept a tap meant for the screen it is congratulating. **Confirmations only, and the provider is built so that nothing else is reachable**: it exposes exactly one verb, `confirm`, and there is no failure form to call. A failure is inline and in place, where the reader is looking and where they can retry; a destructive action confirms *before* it happens rather than reporting afterwards. A toast says *that worked* to somebody who has already moved on, and nothing else — which also means it is never the only report of anything, since the thing it reports has already succeeded. **Its text is never uppercased, although it is an interface sentence.** Every message embeds content — an item's title, a borrower's name — so the caps utility would shout a French title and somebody's name across the bottom of the screen. It sets sentence case in the sans at 14px/600: the same defect as an uppercased sheet heading, one layer further in. |
| **Update Notice** | `UpdateNotice`, the surface for a waiting service worker, raised by `UpdatePrompt` whenever the registration reports one and by nothing else. Bottom-anchored on `--paper-deep` under a 3px `--ink` top rule, in the same 448px column with its own bottom safe-area padding — the same printed form a toast wears, and a different kind of thing. A caps label at 10px/800 with +0.16em tracking reads `NEW EDITION`, a 14px line says a newer printing of Alexandria is ready, and a single primary plate reads `Reload`. It says *edition* rather than *version* because an imprint issues editions and the reader is being told a newer printing of the same work exists, which is also the plainer sentence. **Its rule is that it is persistent, and that is exactly why it is not a toast.** A toast leaves after four seconds; this offer has to survive being ignored, because the reader may be mid-task and it must still be there when they are not. **It also carries no dismiss control, deliberately**: a reader who ignores it goes on using the edition they have, which is precisely what a dismiss button would achieve, without teaching them that the notice can be made to go away for good. It takes the status role rather than the alert one: an available update is not an emergency and must not interrupt a screen reader mid-sentence. Without this surface the app cannot be updated at all: the new worker installs and then waits, activating only on the message this notice's action sends, so nothing offering that action means every navigation is answered from the previous build's precache indefinitely. |
| **Plate Button** | Primary action: `--imprint` plate, ink caps. Secondary: a 2px ruled outline, no fill, rule and caps both `currentColor`. Destructive: a 2px `--out` outline — and **its caps are `currentColor`, not `--out`.** This entry said `--out` caps, while the colour section had already ruled the other way in the same document: red measures 4.11:1 on paper, sound for a 2px edge and short of AA for 12px text, so a red label would be the least legible text in the app on the one control where a misread costs most. One document, two claims, and this was the stale half. `currentColor` rather than a hardcoded `--ink`, for the same reason the secondary uses it: the variant paints no ground of its own, so it follows the ambient foreground instead of assuming one. A hardcoded ink did ship once and was invisible — ink on ink — the first time it reached item detail's black cover rather than a paper-grounded sheet; every earlier use happened to sit inside a Sheet, where ambient ink and hardcoded ink read identically and the bug had nowhere to show itself. **A disabled primary renders as the ruled outline, never as a tinted plate** — a 50% `--imprint` is a new colour meaning "disabled", which palette law forbids, and it drags its own label under the contrast floor. Becoming a filled plate the moment the form is valid is itself the affordance saying so — visually, and only visually, so a disabled button also carries a `reason` as `sr-only` text inside its own label. That text joins the button's accessible name, which browse-mode reading walks over even though a disabled control cannot take focus; an `aria-describedby` was tried there first and removed for exactly that reason. **Delete confirms in place, and that is a state rather than a component: see *Confirming a destructive action* in the state grammar, which is also the only caller this component's `forwardRef` has.** |
| **Field** | Form input: no radius, a 2px bottom rule, a caps label above at 11px/700 with +0.12em tracking in the quiet register, no floating label — a floating label would animate, and print does not. The control itself sets 16px, off the display scale on purpose: mobile Safari zooms the page when a focused input is smaller, which on a phone-first PWA would jerk the viewport on every tap into a field. **Four surfaces, one component, and this entry named one of them.** A plain input or textarea; a password field; a select; and the note row beneath any of them. A **password** field carries a **reveal mark** at its right: a hand-authored eye at 2px stroke, slashed when the password is showing, toggling `type` between `password` and `text`. It is a Mark rather than a `SHOW` / `HIDE` caps label because the state it reflects is already legible in the field itself — the reader can see whether their password is showing by looking at it — so this is not an icon standing in for state with nothing to read. It always opens masked, on every mount, and never remembers: a revealed password surviving a back-navigation onto a screen someone else can see is a real exposure, and *it was only remembered for the session* is exactly how that ships. The bottom rule moves from the input onto the row, because input and mark are one field to the reader, and the row indicates only when the **input** specifically is focus-visible, so the mark keeps its own separate ring rather than being suppressed whenever either descendant is focused. Its 48px target is negative-margined so it does not inflate the field. A **select** keeps the native control — real, focusable, keyboard-operable, with the platform's own picker and its own focus ring — and replaces only its arrow: `appearance-none` on the select, and a hand-drawn `ChevronDown` in the quiet register drawn over it, absolutely positioned, `aria-hidden` and out of the tab order. The native arrow is chrome this world has no vocabulary for, at someone else's stroke weight. A **textarea** takes `resize-none` and gets its height from `rows`, because the browser's grabber is a rounded diagonal handle in a system with no radii and no diagonals; a **number** input refuses its spinner for the same reason, which takes three declarations rather than one — `-moz-appearance: textfield` for Firefox, and both the inner and outer WebKit spin-button pseudo-elements. **There is no `outline-none` anywhere in this component, deliberately.** Tailwind's utilities sit in a later cascade layer than the focus rule, so suppressing the outline here would kill the focus ring on every input in the app while leaving its colour and its width resolving correctly — a defect invisible to a stylesheet test, which is why the browser check computes the resolved style instead. The **note row** renders when any of `error`, `hint` or `counter` exists: the note on the left, the counter on the right. `counter` prints `<n> LEFT` — the figure inherits the mono from its wrapper and the caps word is reset to the sans explicitly, weight stated, because the caps utility carries case and tracking and never weight. `liveHint` is opt-in rather than automatic, and marks a hint whose *change* is the information: a password rule list going from four unmet to none is otherwise silent at the one moment the reader is waiting for. Making every hint a live region would announce unchanging text on each render, which is the crying-wolf failure that gets a mechanism switched off rather than fixed. `required` sets both `required` and `aria-required`, so the field announces itself as required while the reader is *in* it, which is where the problem gets fixed — the complementary half of the disabled button's `reason`, and it works only because every form in this app carries `noValidate`, keeping the browser's own validation bubble out of a world with no vocabulary for it. **The error treatment is an Error construction in its own right, and this entry never named it**: the bottom rule turns `--out`, `aria-invalid` is set, and the note sets at 13px in `--ink` with `role="alert"`, where a hint at the same size sets in the quiet register. Red is on the rule and never on the words — the same resolution the stamp and the destructive button reach, from the same 4.11:1. |
| **Ledger Row** | One loan pairing, over two lines, separated by a hairline. **Line 1: the borrower's name, and the duration.** Line 2: `LENT <date> · RETURNED <date>`, and for an open loan **`LENT <date>` alone** — no second half, because there is no second date and the stamp already says it is out. The caps are interface labels, set in the sans with their weight stated at the site because the caps utility carries case and tracking and never weight; the dates are numerals and take the mono. There is **no arrow**: `→` (U+2192) is absent from every shipped cut of both faces, so it rendered in `ui-monospace` inside a line of Chivo Mono. An en dash was the obvious replacement and fails on the case that matters most — a dash states a *range*, and `07 Aug 2026 – still out` is not a range, it is a date beside a state. Labelling both endpoints works for a closed loan and a live one with the same grammar, which a connector cannot. The name is the reason the row exists — a ledger that records when a thing left but not who took it does not answer the question the product is for — and it comes from the **`LENT` event only**. The `RETURNED` event also carries a name; it is ignored, because the returner is the borrower and printing it again states one fact twice. The name is **content and sets in the sans**; only the dates and the day count take the mono, and the word `days` beside the figure stays in the sans for the same reason a name does. A 50-character `lentTo` is why the row is two lines and not one, and nothing is truncated. An **unresolved** pairing — a `LENT` superseded by another `LENT` with no `RETURNED` between them — takes the open loan's line 2 unchanged and reads `no return recorded` in the duration slot, which is the whole of what distinguishes it. **A boxed row also renders a bare Overprint Stamp on an open loan, and the reason is a hole in the palette rather than a flourish.** The comp marks an open loan by brightening the whole line, and that lift has somewhere to go only on the cover, where `--paper` sits above `--cover-body`. On paper there is no tone brighter than `--ink` to promote to, and palette law permits no eleventh token to invent one — so on the paper ledger card an open loan had no mark at all. The stamp's own construction, its `--out` outline and its ink caps, supplies the mark without spending colour. It is gated on `boxed` rather than on a new prop because `boxed` already means *this is the paper ledger card*: item detail's inline ledger is never boxed, item history's is always boxed. Inside a bordered card the row takes `px-4` so it does not sit flush against the rule, with the separator still spanning the full width; in a flush text column it takes none, so it aligns with the prose above it. |
| **Row Actions** | The visible duplicate of long-press, at the right of any row that has a sheet behind it. **Three 3px ink squares** — not round dots, not a text ellipsis: the world has no radii, and a glyph falls back to junk. 48px target, negative-margined so it does not inflate the row. Absent on rows with no actions, which is how a read-only shared library declares itself. |
| **Pull to refresh** | The touch shortcut for reloading a list. **The threshold is measured in finger travel, never in the transformed offset**: resistance is a visual affordance, and dividing the trigger by it silently multiplies the required drag — at 0.4 resistance a 64px offset threshold demands 160px of travel, roughly 2.5× the conventional 60–80px, so an ordinary pull does nothing at all. Trigger at **72px of travel**; let the offset stay damped and capped for feel. Two feedback states, both in the caps register: nothing before the threshold, where the paper moving is the whole signal, then `RELEASE TO REFRESH` once past it, then `REFRESHING` after release. Without the middle state a reader cannot learn how far to pull, which turns a mis-tuned threshold from an annoyance into an apparently dead gesture. |
| **Capture Caption** | The one caption construction both camera viewports use, `CaptureCaption`, with five instances behind it — a component rather than five copies of a class string precisely so that measuring one measures all of them. It narrates the lookup the viewport has started, in the caps register at 11px/700 with no tracking declared, so it takes the caps baseline. The barcode scanner prints `REQUESTING CAMERA ACCESS` and, on an automatic decode, `CODE READ · LOOKING IT UP`; the cover capture prints `REQUESTING CAMERA ACCESS`, then `LOOKING UP THIS COVER` after its shutter, and `FRAME THE TITLE` while idle. **A viewport must narrate at all because the slowest call in the product otherwise hides behind a frame that looks exactly like a frame doing nothing.** The scanning case is the sharp one: nothing was tapped, so without the caption the reader gets no acknowledgement that the code was even read, and on a slow connection goes on holding the phone at the barcode. **It therefore announces politely**, which belongs to the rule rather than beside it — on that path the caption is the *only* acknowledgement the decode fired, so a narration nobody hears is not a narration. The feed keeps running underneath — no spinner, no overlay wash, no progress device — because the running feed is the reassurance that nothing has died. **Its rule is the ground-and-foreground law read in the direction nobody checks: a surface over a ground the design does not own must paint an opaque ground of its own.** All five shipped as `--ink-soft` caps, transparent, over a live camera feed, where one unchanged string measured between 1.45:1 and 5.1:1 depending on where the camera happened to be pointing — legible and illegible within one render, at a contrast the app cannot compute because it does not own the pixels underneath. So the caption is a printed plate, ink on paper, both set in the same rule, pinned to the frame's bottom edge as a full-width strip rather than floated over the middle of the feed: it reads at 18.18:1 whatever the camera sees, and it cannot occlude the region the reader is aiming at — which `FRAME THE TITLE`, an instruction printed on top of its own target, previously did. **That instruction is first-use only**, gated on the session tally rather than on a second notion of *has this reader seen it*: an instruction that has been read is furniture, and by the tenth film it is a permanent strip restating what the reader learned at the first. On the film viewport the three conditions — requesting, ready-and-busy, ready-and-not-busy — are mutually exclusive by construction, so two captions stacking is impossible rather than merely avoided. **They are not a partition of every reachable state**, and the component's own comment says they are: that viewport also reaches a denied state and an unsupported one, neither of which any caption covers. Transcribing the comment would have carried the overstatement into this table, which is the failure this whole pass keeps finding. |
| **Filing Mark** | `FilingInto`, the `FILING INTO <name>` mark naming the collection the current cataloguing session is filing into. It is printed and never a toast, for the reason a toast cannot serve it: it has to survive being ignored for a whole session of back-to-back scans, which a notice shown once on a screen that flashes past does not. It appears on all four screens a session touches — the two capture screens, where the session actually sits, and the two candidate lists it passes through briefly, once per item. The label takes the caps at 11px/700 with +0.16em tracking in the quiet register; the collection name is content the reader authored, so it resets to sentence case at 13px beside it, the same override the Shared Ribbon already makes for an owner's address. **Absence is what says standalone** — no collection, no name, no mark — and it is never a gate on anything: the name is fetched best-effort and a failed lookup is swallowed, because this is a courtesy telling the reader the session still remembers their board, not a permission to file. **Its rule is where it appears: only on a surface that has nothing else stating the destination.** A manual entry form carries a collection control showing the collection, so the form takes no mark at all; printing one above the control would state a single fact twice. Same fact, one place, decided by which surface can already carry it. |
| **Flow Marks** | `FlowMarks`, the row that carries the filing mark and the session tally together — one thought, the state of a session in progress — and it is one component because either half can be absent: a standalone session has no collection, and the first item of any session has no tally. The row itself is absent when both are, so a screen with neither carries no dead margin. The tally reads `FILED THIS SESSION · N` in the same caps register as its neighbour, neither outranking the other, and **its figure takes the mono**, because a count on display is a labelled datum exactly as a library's item count is, rather than a numeral inside a sentence. It exists because filing was otherwise completely silent: the write succeeded, the app returned to the capture screen, and the result was textually identical to a fresh arrival. A toast does say *that one went in*, and answers only the last one; at item ten the question is *where did I get to*, which only an accumulating mark answers. **A session is defined by where the count lives** — a provider mounted as the layout route above the four add-flow routes, so it holds for as long as the reader is inside the flow, however many loops, and resets to zero the moment they leave. No timer, no storage key to expire, nothing to clear by hand. Threading the count through navigation state was refused because this flow's real inputs travel in the query precisely so a cold load can recover them, and the probes assert that nothing rides in navigation state on the hop to the candidate list; loosening them to admit a tally would weaken the one assertion that catches a wholesale state forward. Session storage was refused for surviving too much — a reader returning to the same tab an hour later would be told nine items went in *this session*. |
| **Marks** | The few universal affordances left after the no-icons-for-state rule — back, add, search, close and the like. **Hand-authored SVG at 2px stroke on the division scale; no icon library.** An imported set would arrive at someone else's stroke weights and optical sizes and quietly break the rule system, to carry nine. Eleven are authored and **nine are used**: back, the select's chevron, search in two cuts — 16 for the pinned field, 20 for the header plate on the cover — add, close, check, copy and the reveal pair. A camera and a three-dot mark are exported and imported by nothing. The row-actions affordance is not among these at all — its three squares are boxes rather than a drawn glyph, and Row Actions below owns them. State is never a mark; state is a stamp, a ribbon or a rule. **A Mark carries no colour of its own**: every one is stroked in `currentColor` at 2px with no fill, `aria-hidden` and out of the tab order, so the control around it owns both the colour and the accessible name. The shared base sets no `stroke-linecap`, so every mark in use renders at the SVG default of `butt`. This entry said *square caps*, which is what the file's own header comment claims and what the file does not do — a stale comment transcribed into the document, which is the exact failure this pass exists to close. The back Mark is the case worth recording, because it is two colours: **`--ink-soft` on paper**, where it is a quiet mark serving content rather than one of the structural rules that stay at full strength, and **`--imprint` when the header is inverted**, where yellow on `--ink` clears 11.71:1 and describes a form perfectly well. Both are permitted by the palette as it now reads and both were condemned by it as it read before — the quiet register was written as secondary content only, and the yellow law was stated palette-wide when the measurement behind it was a paper one. |

**Three components wear one printed silhouette, and nothing above tells them apart.** The Sheet, the
Toast and the Update Notice are all bottom-anchored, all centred in the same 448px column, all
recessed onto `--paper-deep` under a 3px `--ink` top rule, all carrying their own bottom safe-area
padding. They are a modal, an auto-dismissing confirmation and a persistent offer, and a reader
meeting the third has nothing in this vocabulary to distinguish it from the second.

What separates them is behaviour rather than form, and it is worth stating plainly because the shared
form will keep suggesting otherwise:

- **The sheet is modal, and only the sheet is.** It alone lays an `--ink` scrim over the space above
  it, dismisses on a tap outside, portals out of the page, inerts the app root, traps focus and hands
  it back to the opener on close, and caps its own height to scroll internally. Neither of the others
  moves focus.
- **The toast is transient and inert.** Four seconds and gone, with no pointer events anywhere on it,
  so it never intercepts a tap; and it sits *below* both of the others, so an open sheet or a waiting
  update covers it rather than being covered by it.
- **The update notice is persistent and offers exactly one action.** It stays until the reader acts,
  which is the whole reason it is not a toast, and it has no dismiss.

The test for anything later reaching for this silhouette: **does it block the app, does it leave on
its own, or does it wait?** A surface that blocks needs the sheet's entire apparatus and is not
finished without it. A surface that leaves on its own must carry nothing the reader has to act on. And
a surface that waits must not auto-dismiss, must not be dismissible by accident, and must be worth the
space it holds for the whole time it holds it.

---

## 6. State grammar

| State | Expression |
|---|---|
| Default | ink on paper, 2px frame |
| Active / selected | `--imprint` plate or fill; never a colour wash over content |
| On loan | The Overprint Stamp, in three places, with the 4px `--out` left edge rule in one of them. On an item row the stamp reads `OUT` alone beside that edge. In the Detail Marks column it carries the borrower and the day count and takes no edge, because there is no row for an edge to run down. On the boxed ledger card an open loan carries a **bare** stamp — no name, no day count, no edge — since the row's own two lines already say who has it and for how long, so the stamp contributes only the mark. This read *item rows only* until the paper ledger was given one: the cover's treatment for an open loan is to brighten the whole line, paper has no tone brighter than `--ink` to promote to, and palette law permits no eleventh token to invent one — so the stamp's own construction is what says it there. |
| Shared out | Shared Ribbon, `SHARED · N`. **Library rows and the Detail Marks column; never on a row in an item stream.** |
| Shared with me | Shared Ribbon, `FROM <owner>`. The same two places. The restriction is against repetition **in a stream**, not against detail: inside a library, provenance is declared once in the header and never on every row; on item detail it is declared once beside the cover, which is the only place that screen has to say it. On the cover the green moves to the edge and the caps take `--cover-body` — see §2. |
| Read-only | Actions are **absent**, not disabled, and provenance is declared in the header |
| Empty | A ruled frame with a caps invitation, at the same weight as a full block |
| Loading | Ruled skeletons at the shape of what is coming, so the layout does not move when content lands, with the skeleton block `aria-hidden`. `aria-busy` marks three skeleton screens — item detail, item history and the browse stream — and is nobody's signature; other surfaces carry it too, the route fallback among them. What those two skeleton *pages* do is **nest** the two — `aria-busy` on the `<main>`, an `aria-hidden` wrapper inside it — so the region announces that it is working while its contents announce nothing at all. **A bar is not a frame, and the difference is load-bearing.** A bar stands in for a line of text and carries a fill; a frame stands in for artwork and carries its rule and nothing else, because a filled rectangle in exactly the artwork's size and position reads as *the picture is here* before any fetch has returned — a failed image, which this grammar forbids outright. The fill is the recessed paper tone on paper, and on the black cover a **quarter-strength `--cover-rule`**: a structure token tuned with opacity rather than an eleventh token minted to hold one tint, which is the move the stamp's row variant already makes with its 0.92. |
| Appending a page | `Loading more`, 11px caps in `--ink-soft`, centred, `role="status"`, **below the stream rather than in place of it**. **Three shapes share the word *loading*, and the split is not the obvious one.** A **cold mount** empties the entries first, so the skeletons are all there is. A **pull-to-refresh** sets the same loading flag and does *not* empty them — only the mount does — so four skeletons draw **above** the thousand rows still on screen, and the reader sees both at once. An **append** draws no skeleton anywhere: the rows stay exactly as they are and one line beneath them says more is coming. So the distinction is **not** *loading replaces content and appending does not* — refresh disproves that, and this row said it until somebody read the refresh path. It is that an append is the only one of the three that adds nothing above the reader's place. Pagination itself stays invisible — no page number, no control, no count. |
| End of list | `End of the shelf`, 11px caps in `--ink-soft` under a 2px `--ink` top rule, **left-aligned like every other row in the stream** — it was centred once, which set it apart from the rows it terminates. That is the whole argument, and it is enough: the reason first given here was that this system never centres text, which is false in eleven places, one of them the `Loading more` line four source lines away and documented as centred in the row directly above. A rule stated wider than it holds gets applied, and this one would have left-aligned four correct constructions. It renders only when the stream is complete **and** has something in it, so an empty library is never told it has reached the end of itself. |
| Route chunk pending | `RouteFallback`, and it is a different absence from *Loading*: the content is not late, the **code** is. **Every** screen is lazily imported behind one suspense boundary, sign-in included, so between a tap and its chunk arriving there is no page at all — and a cold load of the sign-in screen renders this fallback, back control and all, before anything else. It paints the full-height paper ground so nothing jumps when the route lands, carries `aria-busy`, and — the part that matters — renders a working back control, because the header lives inside the chunk that has not arrived. Without it the loudest mark in the design leads to a blank page with nothing to press: one-handed, on the worst connection this product is designed for, in an installed PWA with no browser chrome to fall back on. It carries no title and no landmark of its own, deliberately — it does not know which route it is standing in for, so stepping back to wherever the reader was is the only honest destination it can offer. |
| A viewport narrating a lookup | A camera frame that has fired a request says so in the caps register, in `CaptureCaption`'s printed plate — ink on paper, both set in the one rule, full width, pinned to the frame's bottom edge, `aria-live="polite"` — while the feed keeps running underneath as the proof that nothing has died. No spinner, no wash, no progress device this world has no vocabulary for. Film reads `LOOKING UP THIS COVER`, naming the control that was tapped. Book reads `CODE READ · LOOKING IT UP`, which carries two facts where the other carries one, because nothing was tapped: the decode fired by itself, so the reader needs to know a code was captured *and* that a lookup is running. Until this existed, the slowest call in the product ran behind a frame that looked idle. |
| Artwork present but unavailable | `picture` is synthesised from a URL template whenever `pictureUrl` exists (`handlers/search.go`), without checking S3 — and thumbnails are produced asynchronously, so a freshly added item returns a URL that 404s for a while. The frame degrades to the ruled empty frame, **never a broken-image glyph**, and retries the image 4s later — **once, and then it holds**: a merely-late thumbnail resolves on the second try, and a permanently missing one stops asking rather than re-requesting every 4s on every visible row. The retry re-arms only when the address changes, which means the item was written to. The Volume Frame entry carries the reasoning. This applies to every frame in the stream, not only item detail. On item detail the same condition also raises the `Fetch cover` control — a *repair*, distinct from the cover field on the forms, which is for a wrong or missing address (`.claude/ui-v3.md`, EditItem). |
| Error | Inline, in place, always `role="alert"`, and never a toast alone for anything destructive or retryable. **One state, four constructions, chosen by the ground underneath — and only the first was ever written down.** On paper: a 2px `--out` top rule over `--paper-deep`, with `text-ink` set in the same rule rather than inherited — 30 sites, the ordinary case, one of which also closes with a matching bottom rule because it spans a stream rather than sitting at the head of a form. Inside a sheet: the same top rule over `--paper`, because the sheet's own panel is already `--paper-deep` and nothing recesses into the ground it is standing on — 5 sites. On the black cover: a full 2px `--out` box with **no ground at all**, its text inherited from the cover root, which is legitimate precisely because nothing here paints a background — the rule that a surface setting a ground must set its foreground governs elements that paint one, not every bordered block — 4 sites, all on item detail. And on a field: no block at all, the input's own 2px bottom rule turning `--out` with `aria-invalid` set, and the message beneath it at 13px in `--ink` rather than in red, which would be the least legible text on the screen. Counted rather than carried across: **43 `border-out` sites in the app's own source** — 46 grep hits less two test assertions and one comment — splitting 30 / 5 / 4, the remaining four being the stamp's outline, the destructive button variant, the field's error rule and item detail's in-place delete confirmation. **Recovery is a control, never an instruction to perform a gesture.** "Pull down to try again" is a sentence telling a keyboard or mouse user to do something they cannot do; the block carries a `Try again` action instead, and pull-to-refresh remains the touch shortcut for the same thing rather than its only route. |
| Confirming a destructive action | **Delete confirms in place, and the construction differs by where the trigger lives.** Four of the five are in a sheet. In the three actions sheets — for a library, an item, a collection — the body swaps to a delete mode; clearing an item's record opens a dedicated sheet that has no modes at all. All four then read alike: one 14px sentence naming precisely what goes with it, then the destructive variant beside `Keep it` in the secondary. **Only `Keep it` is common to all four**, because the destructive label names its own outcome — `Delete for good` on a library and on an item, `Clear for good` on a record, and **`Remove the grouping`** on a collection, where deleting orphans the members rather than destroying them and a button promising to delete for good would promise the opposite of what the endpoint does. What those four inherit from the sheet is the dialog role, the focus trap and the inert background. **They do not inherit an announcement**: the sheet moves focus to its panel once, when it opens, so a body that swaps to a delete mode announces nothing and leaves focus where the unmounted trigger left it. That is a gap rather than a reason, and it is written as one — the honest form of *these four need nothing further* is that nobody has yet built for them what item detail builds for itself. On item detail there is no sheet, so the confirmation authors all of that itself. It is inline page content that appeared and must be noticed, and it is named as exactly that: a `role="group"` labelled `Delete <title>?`, expanding **in place of** the Delete trigger inside the same action row, its description carried by an `aria-live="assertive"` paragraph that is also the visible text — one node for both audiences, so nothing is written twice. That paragraph takes a 2px `--out` top rule, the state grammar's own treatment for a destructive block: without it, at the same size, colour and margin as the summary above, the confirmation read as one more line of prose. `alertdialog` was tried and withdrawn — it is a variant of `dialog`, and assistive tech expects trapped focus and an Escape route, neither of which inline content has. Focus moves to `Keep it` on reveal, never to `Delete for good`, and back to the freshly remounted trigger on cancel; that ref-passing is the only reason this button forwards a ref at all. **The two are deliberately not extracted into a shared primitive.** A sheet confirmation is a paragraph and two buttons; the inline one is a labelled group, a live region, a rule and a focus handover. One component would carry both halves and use exactly one of them per site — group semantics and a live region are dead weight inside an element already declared a dialog, and the focus handling there is the sheet's job rather than the button's. Two mutually exclusive halves under one name is a component that must be read before it can be used, which is worse than two constructions each obviously right where it sits. |
| Offline | Declared honestly; the app is online-only by decision (see `/PRODUCT.md`) |

**A state derived from a failure is cleared by the success, not by a timer.** The frame's `failed`
flag exists to serve the artwork retry above. It used to clear on that component's own 4s clock, and
item detail read the same flag to raise `Fetch cover` — so a **successful** repair left the button on
screen for up to four seconds, re-offering an action that had already worked and looking identical to
"that did not work". The condition must be invalidated by the arriving data, not by whichever clock
happens to own the flag; and the test for it must not wait on that clock either, or it pins the bug
instead of the fix.

**Bounding the retry closed the other half of that, which nobody had named as a defect.** While the
retry was unbounded the flag did not merely clear late — it **oscillated**, set by each failure and
cleared by each timer, so on a permanently broken cover the repair control appeared and vanished on a
four-second cycle in front of the reader. A single retry leaves the flag settled true once it is
spent, so the control is stably visible, and the address changing is what resets it — which is
precisely the arriving data the rule above asks for.

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

  **And when a neighbour does collide, ask first whether it should be a button at all — the second form
  is the last resort, not the first.** Applied to `AddBook`, the second form printed `AN ISBN` in caps
  where the submit button would sit, and it read as nonsense: the field is already labelled `ISBN` and
  already hinted *"type the 10- or 13-digit ISBN"*, so the caps line stated the same fact a third time,
  and because caps means *interface label* in this system it parsed as a heading for the control beneath
  it rather than as an explanation of the one that was missing. Found by the owner looking at the screen,
  after I had measured the collision, ruled on it, and read the caps fragment in my own render capture as
  evidence the fix had worked.

  The mistake was reaching for the second form to escape a collision. **Its premise is that the reason is
  not visible**, and on that screen the reason was an empty labelled field directly above — as visible as
  a reason gets. The collision was real; the second form was not its remedy.

  The remedy is that `Enter by hand` is **navigation to another route, not an action on this screen**, and
  only `Look it up` acts. So it takes the underlined-link treatment this system already uses for
  `IN <library>` (§5, Detail Marks) rather than a Plate Button. The disabled primary is then the only
  ruled outline in its row, the first form applies exactly as written, and no caps line is needed. That
  is also the truer hierarchy: capture is the job and manual entry is the fallback, so they should not
  carry equal weight.

  **General rule: a collision between two controls is usually a sign that one of them is the wrong
  component**, not that the other needs a caption.
- **The reason is not visible** — a limit exceeded, a constraint the reader cannot infer. The slot
  carries the reason *instead of* the control, in the control's own position, which is the best
  possible place for the explanation. **Not in the caps register.** The one screen that has this
  state is unshare's over-limit bar, and it sets a 14px sentence carrying `role="alert"`: caps is
  for interface labels, and this is a sentence naming how many to deselect. A constraint the reader
  cannot infer also has to be *announced*, which a caps label with no live role would not be.

**The first form is purely visual, and it has no non-visual equivalent anywhere.** *"Becoming a filled
plate the moment the form is valid is itself the affordance saying so"* — true, and it says nothing to a
screen reader. Of the two forms only the second, being words, carried non-visually, and it has now been
removed from the capture screens for good reasons. So the gap is not a lost attribute on one screen: it
is that **every** disabled primary in the app announces its state visually and its reason not at all.

`aria-describedby` was the wrong repair even while it existed, and honestly so — a `disabled` button is
not focusable, so a description on it is reachable in browse mode and never by tabbing. It was doing less
than its presence implied.

**The ruling, settled by the owner in the implementation session's favour: a disabled primary keeps its
ruled-outline treatment and carries an `sr-only` line naming what is missing.** It costs nothing
visually, restores the parity the first form lacks, and reintroduces nothing on screen.

I twice ruled otherwise and both are withdrawn, recorded because the reasoning is more useful than the
outcome. First `aria-describedby` on the button — wrong even as it shipped, since a `disabled` button is
not focusable, so the description was reachable in browse mode and never by tabbing. Then `aria-disabled`
with the control kept focusable, which does make the reason reachable but imposes a focusable control
that swallows activation on every form in the app to deliver information late.

The observation worth keeping from the argument, whoever it favours: **the location of a visual
affordance is not necessarily the right location for its non-visual equivalent.** A sighted reader learns
the form is incomplete by watching the button; a screen-reader user is better served where the fix
happens, which is the field. Marking the required input `required` / `aria-required` through `Field` is
therefore complementary rather than competing, and is the implementation session's call to take or leave.

Whichever is built, it belongs in the shared primitive rather than on the screens that surfaced it — a
local patch to a system-wide gap is how the same defect returns on the next screen, which §6's collision
has demonstrated four times.

Not a regression and not urgent: the gap predates today and the attribute that briefly covered part of it
was itself ineffective. It is a small piece of code work across a shared primitive, so it waits on the
owner's word rather than riding along with a fix to something else.

So a disabled destructive action has no treatment, because the case does not exist: a destructive
button is already an outline and has nowhere to go. Unshare's bar therefore never holds a greyed
control — and it holds **four** states, not the three this paragraph counted. Nothing selected
gives the hint, `Select who to remove`. Past the ten addresses the API takes in one request, the
reason replaces the control. Otherwise the action, `Remove <n>`. And then the state that arrived
after the count was written: **confirming**, `Remove for good` beside `Keep access`, because
revoking somebody else's access is at least as consequential as deleting your own library, and
delete confirms in place. A fifth branch renders nothing at all, for a library shared with nobody,
which is not a state of the bar so much as the bar having no subject. The height, 80px, is
reserved across every one of them so nothing jumps.

**A count of states goes stale the moment a state is added, and nothing anywhere reports it.** The
word *exactly* is what makes this worth recording rather than merely correcting: it reads as a
figure somebody checked, and it was a figure nobody re-derived once the confirmation shipped. A
number in prose is the cheapest thing in this document to write and the only kind of claim here
that can be falsified by a commit that never opens the file.

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
| Sheet | 200ms rise from the bottom edge |
| Stamp appearing | No animation. It is printed. |

No springs, no parallax, no hover flourishes. Under `prefers-reduced-motion` every transition
becomes an instant swap. This austerity is also cheap, which suits a PWA on a phone.

**There is no route transition, and this table used to claim one** — *160ms single horizontal
shift, the next volume slid onto the table.* It was never built. Navigating between screens is an
instant swap, which is the more consistent answer anyway: a horizontal slide was the most
animation-like row in a table whose thesis is that print does not ease, and it was the only one
describing something the reader would have watched rather than simply found done.

**What hid it is worth more than the row.** `--press-route: 160ms` was declared beside the two
tokens that are real, AND given a `prefers-reduced-motion` override setting it to `0ms` — so
someone had written a rule retiring an animation that did not exist. A token that is declared,
themed and motion-gated reads as evidence of a working mechanism being handled responsibly; it
looks *more* finished than an unused constant would. It had zero consumers app-wide and was found
only by reconciling this document against the build.

That is the same shape as `font-stretch` being declared and silently ignored, and §3's tracking
values being declared and silently beaten: **a declaration standing in for a behaviour**, correct
in the source and absent from the screen, with nothing computing the thing that would say so.

**And there is no collection expand either — two rows in one small table describing motions nobody
built.** *160ms height change, no bounce* described a board opening and closing, and a Collection
Board does neither: it holds no open state, renders every member the API grouped into it, and has
nothing whose height changes. The component vocabulary called the same board *expandable in place*
until that phrase went the same way, so the claim stood in two documents and in no code.

Both survived for one reason: **a motion table is read as a record of what moves, not as a claim
that anything does**, so a row describing a plausible animation invites nobody to go and check.
What is left is three rows — two motions that run, and one that says there is none.

---

## 8. Accessibility

- Contrast targets per §2, with `--out` restricted to large/bold text, rules and stamp outlines.
- Minimum touch target 6 divisions (48px).
- Focus ring: the structural tone that contrasts with its own ground — `--ink` on `--paper` and on
  `--imprint`, `--paper` on the black cover. 3px, 2px offset; offset 0 where an ink rule already
  exists, so focus thickens that rule rather than drawing a concentric second one beside it. This
  line described the **pre-rewrite** ring for as long as the rewrite had been in the colour
  section — 3px `--imprint` at 2px offset, which the palette law's own arithmetic forbids, since
  yellow at ~1.55:1 on paper cannot describe a form at all. **A rule restated in a summary list is
  a second copy that can go stale**, and the summary is the version a reader skimming for the
  accessibility floor would have applied.
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
