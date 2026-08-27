<!-- Produced as the pass the design system asks for in its own preamble: "a design system
authored ahead of code is a specification, not a description: once v3 is built, reconcile this
document against what actually shipped rather than defending it."

IT HAS NOW BEEN RULED ON, IN FULL. See "Status — ruled" below for the outcome, the derivation of
its figures, and a per-finding disposition. The findings themselves are untouched: they are the
evidence, and only their status changed.

Tracked rather than left in `.superpowers/sdd/`, which is git-ignored scratch that `git clean -fdx`
removes. -->

# Reconciliation — `DESIGN.md` §2–§7 and `.claude/ui-v3.md` §4 against the shipped build

Audit date 2026-08-25, branch `ui-rework-v3`, working tree clean at `7bc45f7`.
Subject: `packages/web-client-v3/src`. Nothing was edited; this file is the whole output.

**Method note, recorded because it changed the result.** The copy of `DESIGN.md` and
`.claude/ui-v3.md` supplied in session context is **stale** relative to the files on disk — the
context copy still specifies an `--imprint` focus ring, a `0.9` stamp opacity, a blank
account-plate tracking cell and a `caps` utility that "carries case, never weight", all of which
the on-disk documents have already reconciled. Every citation below is to the **on-disk** file,
read with line numbers. Six findings that looked real against the context copy evaporated against
the artefact, which is this project's own recurring failure mode arriving one level up.

Counts: **List 1 — 14. List 2 — 11. List 3 — 21.** `ui-v3.md` §4: **4** divergences across 21
screens.

---

## Status — ruled

Applied by the reconciliation pass planned in
`docs/superpowers/plans/2026-08-25-ui-v3-reconciliation.md`, run 2026-08-25 to 2026-08-27 on `main`,
commits `794122b..81cbde2` — the audit's own application. The comment sweeps, the reviews and the
fixes that followed them run past that range to the end of the branch. **Every finding below has
been ruled on.** The findings are unchanged; this section is the only thing that was added.

**The outcome: 44 live findings — 8 needed a code change, 36 were the document being the stale
half — plus 2 already closed before the pass began.**

**Derivation, printed because this figure was got wrong repeatedly.** Take it from this file's own
counts line above, not from any summary of it:

```
List 1 (14) + List 2 (11) + List 3 (21)   =  46   findings in this audit
                       less already closed =  -2   (1.1 and 2.10)
                                              ----
                                    live    =  44
                       less code changes    =  -8
                                              ----
                    document corrections    =  36
```

Every retelling that said **42 live / 34 document** subtracted the same two findings a second time,
having read a derived summary instead of this file. That includes the pass's own controlling spec,
which printed 44 in its subject line and 42 sixteen lines below. A number a reader cannot re-derive
is a number that gets "corrected" back to a wrong one, so the arithmetic is printed rather than
asserted.

**The ratio is the finding behind the findings.** List 1 is headed *"Rules the build does not
follow"* — it assumes the build is the defendant. Read against the artefact, the document was the
stale half 36 times out of 44, and the whole of List 3 (21 entries) is a construction the build
needed and the document had no category for, not one of them a defect. A specification written ahead
of code accumulates claims the build has already answered better.

### The line numbers were read against the audit-date tree, and are not all reliable

**The header above says the tree was clean at `7bc45f7`. That commit is not the substrate.** It is
dated 2026-08-17, eight days before the audit, and at that tree `check-browser.mjs` is 1450 lines
with no caps manifest in it at all — so the manifest citation below points past the end of the file
there. The citations were read against the tree the audit was committed on, `aa93858`, where that
line is exactly the entry cited.

So do **not** read the citations as correct-as-of-a-commit. Two different things are true of them:

- **Some have genuinely drifted.** The caps manifest in `check-browser.mjs`, cited at `:1596`, was
  the wordmark entry on the audit-date tree and is now at `:1659`.
- **At least one was wrong when it was written.** `CollectionBoard.jsx`'s unconditional member
  render is cited at `:33`. It sits at line 50 on the audit-date tree, at line 50 at `7bc45f7`, and
  at line 50 today. It has never moved, so calling it drift would assert a movement that did not
  happen — the citation was simply wrong.

The body carries **94 source-file line citations**, plus 34 more into the two specification
documents, and they were **not** re-resolved. Grep for the quoted text rather than trusting the
number.

### Disposition, finding by finding

**code** — the build was wrong and was changed. **document** — the build was right and the
specification was corrected. **already closed** — settled before this pass opened.

Two rows are marked **code + document**, because the finding had a half on each side. **They are
counted once, in the code bucket** — which is what makes 8 + 36 = 44 hold. Counting rows containing
the word *document* gives 38, and is the wrong count.

**A documentation range is printed, not a single commit, and the reason is worth stating.** Every
documentation task ran as a write commit followed by a review-fix commit; citing only the second
sends a reader to a diff where the text they are checking appears as a *context* line, or — for the
new vocabulary entries — to a one-line commit. The first SHA in each range is where the change
landed. Code rows name a single commit because that is where the change is.

| Finding | Status | Settled by |
|---|---|---|
| 1.1 route transition never built | already closed | `f3f7323` — the motion row and its unconsumed token dropped, before this pass |
| 1.2 board not expandable, expand motion absent | document | `b838b0f..d6d3a9a` component vocabulary, `cff5cf4..65dedd9` motion table, `a5424fb..81cbde2` screen specification |
| 1.3 destructive button's caps are `currentColor` | document | `b838b0f..d6d3a9a` — the vocabulary now carries the code's own contrast reasoning |
| 1.4 `--out` on the pending-approval badge | **code** | `c9dbd98` |
| 1.5 yellow carrying a shape | **code** + document | `c9dbd98` fixed the invisible rule on the sign-in notice; `c70fb30..40e3873` rescoped the law, which was derived from a paper-only measurement |
| 1.6 `--imprint` on a navigational link | **code** | `c9dbd98` |
| 1.7 ground/foreground stated stricter than the guard enforces | document | `c70fb30..40e3873` — the rule now states what is enforced, and its inverse case |
| 1.8 skeleton reintroduced the fill the frame removed | **code** | `5a89501` |
| 1.9 home and unshare empty states | **code** | `8bd1009` |
| 1.10 unshare bar's state count | document | `cff5cf4..65dedd9` — five branches, four states plus one that renders nothing |
| 1.11 stamp on a ledger row | document | `b838b0f..d6d3a9a` vocabulary, `cff5cf4..65dedd9` state grammar |
| 1.12 `--ink-soft` used for structure | document | `c70fb30..40e3873` — the token means the quiet register, marks and content alike |
| 1.13 member order plate has a fill and a 1px rule | document | `b838b0f..d6d3a9a` |
| 1.14 Error has three constructions, one documented | document | `cff5cf4..65dedd9` — and the count corrected to 43 sites, 30/5/4 with a remainder of four |
| 2.1 search input at 16px | document | `ad27016..9f062fc` — the platform-zoom exception widened past the one component that named it |
| 2.2 wordmark at the section-header step on two auth screens | **code** | `ac50805`, with the guard widened to see it; `7597223` completed the manifest |
| 2.3 library row sub-line and the shared count | **code** + document | `6f5b119` put the figure in the mono (`b21dd1b` extracted the shared matcher); `ad27016..9f062fc` published the row |
| 2.4 stream row height in no table row | document | `ad27016..9f062fc` |
| 2.5 member plate 1px | document | `b838b0f..d6d3a9a` |
| 2.6 stamp's inverted variant | document | `b838b0f..d6d3a9a` |
| 2.7 three structural separators at 2px | document | `ad27016..9f062fc` — all seven 1px sites and all five 3px sites enumerated |
| 2.8 `mt-3` on the search field | **code** | `db8e4aa` |
| 2.9 frame has three sizes | document | `b838b0f..d6d3a9a` |
| 2.10 `.field-control` outlined in `--imprint` | already closed | `aebdc4d`, before this pass — the focus ruling changed `:focus-visible` and left the sibling on the accent, so the search field had a yellow ring on yellow and every form field one at ~1.55:1 against a 3:1 floor |
| 2.11 `--cover-rule` at 25% as a ground | document | `cff5cf4..65dedd9` |
| List 3 #1 `CaptureCaption` | document | `c70fb30..40e3873` recorded the inverse-ground case as a rule with the guard that finds it; `9d10c59..151b258` added the component |
| List 3 #2 `FilingInto`, `FlowMarks` | document | `9d10c59..151b258` |
| List 3 #3 `SearchRowMarks` | document | `b838b0f..d6d3a9a` and `9d10c59..151b258` — stated once, with the second site a pointer |
| List 3 #4 Toast | document | `9d10c59..151b258` |
| List 3 #5 `UpdateNotice`, and the shared silhouette | document | `9d10c59..151b258` |
| List 3 #6 end of list | document | `cff5cf4..65dedd9` — the rule is `--ink`, not `--ink-soft` |
| List 3 #7 appending | document | `cff5cf4..65dedd9` |
| List 3 #8 in-flight capture lookup | document | `cff5cf4..65dedd9` |
| List 3 #9 route-chunk pending | document | `cff5cf4..65dedd9` |
| List 3 #10 capture viewports are not the item ratio | document | `ad27016..9f062fc` |
| List 3 #11 the Sheet's real mechanism | document | `b838b0f..d6d3a9a` |
| List 3 #12 the `Field` variants and its error treatment | document | `b838b0f..d6d3a9a` |
| List 3 #13 index-letter count is a phrase | document | `b838b0f..d6d3a9a` |
| List 3 #14 section heads carry counts | document | `ad27016..9f062fc` |
| List 3 #15 `CONTINUES` | document | `b838b0f..d6d3a9a` |
| List 3 #16 `.row-skip` | document | `ad27016..9f062fc` — with the constraint that it must never wrap a sticky letter |
| List 3 #17 `AddFlowLayout` | document | `a5424fb..81cbde2` — a route that is not a screen |
| List 3 #18 the empty-fold branch | document | `ad27016..9f062fc` — and the fallback shows the raw character, which the server did **not** sort on |
| List 3 #19 `on-imprint` as a documented no-op | document | `c70fb30..40e3873` — 10 call sites, recounted |
| List 3 #20 `AddItemSheet`'s `Back` | document | `a5424fb..81cbde2` — an option is scoped by the flow's premise; a return path is not an option |
| List 3 #21 the in-place delete confirmation | document | `b838b0f..d6d3a9a` recorded it, `cff5cf4..65dedd9` moved it whole into the state grammar — a confirmation is a state, not a component |

The two closing notes that are **not** findings are also settled: the accessibility list's
pre-rewrite focus sentence in `cff5cf4..65dedd9`, and `typeScale.test.js`'s stale paragraph above the live
one in `db8e4aa`.

### Two entries that were not in the lists above

- **`SharedRibbon` renders at two caps sizes — found while planning, not by the audit.** It sets
  11px/700 as a library row's sub-line and 10px/800 in the mark column beside the item-detail hero
  and on a search row, while the typography rules published a single row for it. The caps manifest's
  one entry was routed to the libraries root, so it measured the 11/700 instance against the row
  describing the 10/800 one — and had only ever been green because the two surfaces coincide on the
  one property it asserted, the tracking. A true measurement of the wrong substrate, inside the
  guard written to prevent exactly that. Neither rendered size changed; both are now published
  (`ad27016..9f062fc`) and both are now measured (`7597223`).
- **The weight probe: probed clean, asserted.** The caps manifest computed only tracking, so two of
  the three properties the typography rules publish per role were unasserted. The size half found a
  real defect (2.2); the weight half was probed against all ten roles and **every one matched its
  published value**, including the corrected 700 on the library-row ribbon. Because it was clean, it
  was asserted rather than filed — `495ab49` — so the manifest now computes size, weight and
  tracking, and the typography rules may state that their caps table is computed in full.

### What this pass produced and did not fix

Three records hold the findings that arrived out of this work — seven between them, one of
them titled for holding four. All sit outside the 44 and were deliberately left as evidence rather
than folded into a documentation commit. **This section was written by the task that closed the
audit and was then overtaken by the tasks after it**, so its counts are restated here rather than
left at the figures that were true when it was first typed:

- `docs/ui-design/behaviour-findings-2026-08-25.md` — **four**, of which one is a real product
  defect: a cover that never loads retried every four seconds for ever, on every visible row, where
  every document describing it claimed a single delayed re-poll. Those documents were corrected
  first; the bound has since been built in its own commit, and they have been corrected a second
  time to describe it — the frame now retries once and then holds, re-arming only when the
  cache-busted address changes. Plus one piece of housekeeping (two icon exports imported by
  nothing, one of them the sole declarer of a linecap its file advertises); one product question
  that is not a bug — pull-to-refresh paints skeletons *above* the rows already on screen, and
  nobody has decided whether a refresh should replace the stream, append to it, or draw above it;
  and one guard blind spot, found by the review of the final comment sweep — the focus check matches
  the `outline:` shorthand only, so the two rules written as `outline-color` longhand are invisible
  to it.
- `docs/ui-design/division-scale-findings-2026-08-25.md` — two off-division layout gaps, and the
  fact that the sweep which found them matches only Tailwind's named odd steps and is blind to
  bracket-notation gaps, so two is a lower bound rather than the set.
- The plan itself, for the two comment sweeps: this pass's own citation comments, and the
  pre-existing citations across the wider source. **Both have since run.** Their file set was
  `.jsx`, `.js` and `.mjs`, so `src/index.css` was excluded by construction and was swept separately
  afterwards.

Both findings files were written carrying the wrong count — the double-subtraction described above —
and both have since been corrected to 44, the figure derived at the top of this section.

---

## List 1 — Rules the build does not follow

### 1.1 §7's route transition does not exist *(defect — silent)*

`DESIGN.md:977` — "Route transition | 160ms single horizontal shift — the next volume slid onto
the table."

`src/index.css:92` declares `--press-route: 160ms` and `:295` retires it under
`prefers-reduced-motion`. **It has zero consumers.** Verified by grepping the whole of `src/`:
the only three motion sites in the application are `PullToRefresh.jsx:120` and
`PlateButton.jsx:53` (both `--press-fast`) and `Sheet.jsx:157` (`--press-sheet`). Routes swap
instantly.

The token being declared, themed and reduced-motion-gated is what makes this invisible: every
mechanical trace of the feature is present except the feature.

### 1.2 §5's collection board is not expandable, and §7's expand motion does not exist *(defect)*

`DESIGN.md:818` — "Server-grouped, **expandable in place**." `DESIGN.md:980` — "Collection expand
| 160ms height change, no bounce."

`CollectionBoard.jsx:33-40` renders `(board.items ?? []).map(...)` unconditionally. There is no
expanded/collapsed state anywhere in `src/` (grep for `expand`/`collaps` returns only prose
comments and `lib/sort.js`'s "nothing is collapsed"). Boards are always fully open.

Two of §7's five rows therefore have no implementation. The remaining three are correct: state
swap 80ms linear, sheet 200ms rise, stamp unanimated.

### 1.3 §5's destructive Plate Button does not set `--out` caps *(deliberate, documented in code, undocumented in `DESIGN.md`)*

`DESIGN.md:820` — "Destructive: 2px `--out` outline, `--out` caps."

`PlateButton.jsx:22` — `danger: 'bg-transparent text-current border-2 border-out'`. The caps are
`currentColor`, never `--out`. The code states the reason at `:11-21`: *"--out is 4.11:1 on
paper, sound for a 2px edge and short of AA for 12px text, so a red label here would be the least
legible text in the app on the one control where a misread costs most."*

The build is right and §2:90 agrees with it ("Never small red body text"). **§5 is the stale
half**, and it contradicts §2 inside one document. Not a defect; a doc correction owed.

### 1.4 `--out` is spent on something that is not a loan *(defect — no code justification)*

`DESIGN.md:75` — "`--out` | `#D8412F` | **On loan. Nothing else, ever.**"

`pages/PendingApproval.jsx:10` renders the screen's identifying badge as
`border-2 border-out … text-ink` — the Overprint Stamp's exact construction, minus the rotation,
spent on an approval notice. No comment justifies it. It is the only `--out` site in the app that
neither §2 nor §6 sanctions.

Note the doc's own inconsistency behind it: §6:842 legislates a `2px --out top rule` for **Error**,
which §2:75's "nothing else, ever" already forbids. The 40-odd error blocks follow §6 and are
fine; `PendingApproval` follows neither.

Also worth recording: `Login.jsx:44` and `SignUp.jsx:49` give the *same* structural slot — a
screen-identifying badge above the `<h1>` — an `--imprint` plate. Two legislated colours, one
element, three screens.

**That palette row has since been rescoped**, on the same grounds as `--imprint`'s in §1.5/1.6: red
is the alarm register, and §6 sanctions it on Error blocks, the destructive button, a failing field
and delete confirmations. This finding's argument stands on the surviving half — an approval
notice is none of those, so `PendingApproval` was wearing the lent stamp's construction for no
state it has. `DESIGN.md:75`'s quote above is this finding's record of the row **as it stood at
audit time**, not a claim that the row still reads that way.

### 1.5 §2's "yellow never carries a shape by itself" is broken on the cover, and once invisibly on paper *(one deliberate, one defect)*

`DESIGN.md:97-101` — "**Yellow never carries a shape by itself.** At ~1.55:1 against paper,
`--imprint` cannot describe a form; it can only be a *ground* with ink on top of it, or a *fill*
inside an ink outline. **Any future use of yellow that has no ink doing the describing is
unreadable, not subtle.**"

Written as a palette-wide law. Derived from a **paper-only** measurement; §2's contrast table has
no `--imprint` on `--ink` row at all. Computed from the shipped tokens, `--imprint` on `--ink` is
**11.71:1** — the same figure §2:88 already prints for the inverse pair.

Three sites rely on the unscoped case, all on the black cover, and all are legible:

- `AppHeader.jsx:36` — the back Mark takes `text-imprint` when `inverted`.
- `ItemDetail.jsx:435` — the `THE RECORD` ledger heading.
- `ItemDetail.jsx:477` — the `Full record` link.

These are fine in practice and the rule that forbids them is wrong as written. **One site is not
fine:** `Login.jsx:52` renders the OAuth success / account-created notice as
`border-t-2 border-imprint bg-paper-deep` — a 2px yellow rule with no ink describing it, on a
recessed paper ground. `--imprint` on `--paper-deep` computes to **~1.42:1**. It is the notice's
only distinguishing mark and it is effectively invisible. This is exactly the failure §2 predicts,
in the one place nobody scoped the rule out of.

### 1.6 §5 forbids `--imprint` for navigation, and the same screen uses it for navigation *(defect)*

`DESIGN.md:814` (Detail Marks) — "The link is underlined rather than set in `--imprint`: it is
navigation, not a primary action, and yellow beside the title rule would read as one."

`DetailMarks.jsx:119` obeys it: `text-cover-body underline underline-offset-[3px]`.

`ItemDetail.jsx:477` — `Full record`, a navigational link, **sixty lines below on the same
screen**, is `caps … text-imprint underline`. It takes both treatments at once: the underline the
rule prescribes and the yellow the rule refuses, by the rule's own reasoning.

### 1.7 §2's ground/foreground law is stated more strictly than the build (or its guard) implements *(divergence in the rule, not the code)*

`DESIGN.md:132-135` — "Anything that sets a ground sets its foreground, **in the same rule**. … any
surface that paints its own background must paint its text colour too, never inherit it."

`pwa/UpdateNotice.jsx:18` sets `bg-paper-deep` with **no** `text-*`; its two `<p>` children colour
themselves at `:22` and `:25`.

This is not an oversight — it is what the guard permits. `src/groundForeground.test.js:124-131`
(`isCoveredElement`) passes any surface whose text-bearing descendants each declare their own
foreground, and `:19-26` deliberately excludes bare `bg-paper` from the checked tokens. So the
enforced rule is *"a ground's text is coloured somewhere at or below it"*, which is weaker than
"in the same rule" and demonstrably sufficient. The document should say what is enforced, or the
guard should be tightened; today they differ and only one of them is load-bearing.

### 1.8 §6's loading skeleton fills the frame that §5 unfilled *(defect)*

`DESIGN.md:840` — "Loading | **Ruled** skeleton frames at correct ratio."
`DESIGN.md:810` — "**'Ruled' means the rule and nothing else — the empty frame carries no fill.**
… The non-hero frame's `bg-paper-deep` read as harmless (1.09:1, recomputed — the estimate filed
here was ~1.05) but was still a fill where the
rule alone was already doing the job."

`LibraryBrowse.jsx:21` — `<span className="h-[72px] w-12 border-2 border-ink bg-paper-deep" />`.
That is the 48×72 frame with precisely the `bg-paper-deep` fill §5 removed from `VolumeFrame`,
reintroduced in the skeleton that stands in for it. `Libraries.jsx:29-32` does the same with
`bg-paper-deep` bars.

`ItemDetail.jsx:332` gets it right — `border-2 border-paper` with no fill — and uses
`bg-cover-rule/25` only for the *line* skeletons, which it argues for at `:320-327`. The two
screens disagree; the browse one contradicts §5 verbatim.

### 1.9 §6's Empty state has two constructions, and one of them is not a frame *(defect)*

`DESIGN.md:839` — "Empty | A **ruled frame** with a caps invitation, **at the same weight as a
full block**."

`LibraryBrowse.jsx:143-157` is correct: `m-4 border-2 border-ink p-8 text-center` with a caps line
and a Plate Button.

`Libraries.jsx:89-91` is not: `<p className="caps border-b-2 border-ink p-4 text-xs font-bold
text-ink-soft">No libraries yet — start one below</p>`. No frame, and at 12px `--ink-soft` it is
quieter than the 22px/700 `--ink` rows it replaces — the opposite of "the same weight as a full
block". It is also the app's home screen, so the state is the reader's first impression.

`UnshareLibrary.jsx:73` uses a third variant (`caps p-4 text-xs … text-ink-soft`, no rule at all).

### 1.10 §6 says the unshare bar has exactly three states; it has four *(divergence — the fourth is an improvement)*

`DESIGN.md:934-936` — "Unshare's bar therefore has exactly three states — hint, action, reason —
and never a greyed control. Reserve the slot's height across all three so nothing jumps."

`UnshareLibrary.jsx:108-140` reserves the height correctly (`min-h-20`) and never greys a control,
but branches five ways: nothing-to-unshare → `null`; nothing selected → hint; over the API's
10-per-request limit → reason; **confirming → a named `Remove for good` / `Keep access` pair**;
otherwise → action. The confirmation step is right (§7 requires destructive actions to confirm in
place) and the document counted before it existed.

### 1.11 §6 scopes the Overprint Stamp to item rows; a Ledger Row renders one *(deliberate, documented in code)*

`DESIGN.md:835` — "On loan | Overprint Stamp + `--out` left edge rule. **Item rows only.**"

`LedgerRow.jsx:108` — `{boxed && loan.open && <OverprintStamp />}`. The reasoning is at `:96-107`:
on the paper ledger card an open loan had no mark at all, because the comp's "brighten the whole
line" treatment has nowhere to go on paper (`--ink` is already the top tone), and palette law
permits no eleventh token. Sound — but §6's scoping sentence is now false, and §5's Ledger Row
entry (`:822`) does not mention the stamp either.

### 1.12 `--ink-soft` is used for structure, which §2 forbids in bold *(defect, low severity, systemic)*

`DESIGN.md:73` — "`--ink-soft` | `#5A5A57` | Secondary content only (metadata lines, counts).
**Never structure.**"

- `AppHeader.jsx:36` — the back Mark on paper is `text-ink-soft`. A navigational affordance is not
  metadata.
- `Field.jsx:106` — the hand-drawn `ChevronDown` replacing the select's native arrow, likewise.

The document itself already breaches this at §6:896 ("the slot carries the reason in `--ink-soft`
caps"), and the build extends it to every quiet caps label (`PullToRefresh.jsx:236`,
`LibraryBrowse.jsx:188,195`, `FlowMarks.jsx:24`). The honest reconciliation is that `--ink-soft`
means *the quiet register*, content and marks alike — not what §2:73 says it means.

### 1.13 §5's Volume Plate says "no fill"; the member order plate has one *(deliberate, documented in code)*

`DESIGN.md:811` — "**Volume Plate** | A 2px ruled rectangle with `--ink` mono figures, **no
fill**."

`VolumeFrame.jsx:95` — `<VolumePlate className="absolute bottom-0 right-0 border bg-paper px-[3px] py-0 text-[10px]">`.
Both the fill and the rule weight depart, and `:81-94` justifies both: a `--paper` ground "so it
reads over artwork", and `border` (1px) because "2px around a figure this small is mud".

§3:296 already records the 1px. **§5:811 does not**, and neither document records the fill.

### 1.14 §6 gives Error one construction; the build has three *(divergence)*

`DESIGN.md:842` — "Error | Inline, in place, on `--paper-deep` with a 2px `--out` top rule."

Verified across all 44 `border-out` sites:

- **On paper (the majority, ~30 sites)** — `border-t-2 border-out bg-paper-deep p-4 text-ink`.
  Exactly §6.
- **Inside a Sheet (5 sites:** `ItemActionsSheet.jsx:43`, `LibraryActionsSheet.jsx:35`,
  `LendSheet.jsx:40`, `CollectionActionsSheet.jsx:54`, `ItemHistory.jsx:253`**)** — the same rule
  but `bg-paper`, because the sheet's own ground is already `--paper-deep`. Correct, unnamed.
- **On the black cover (4 sites:** `ItemDetail.jsx:289, 414, 491, 506`**)** — a full
  `border-2 border-out` box with **no ground at all**, text inherited from the cover root.
  `ItemDetail.jsx:502-505` argues the inheritance is legitimate because no ground is set. Correct,
  unnamed, and a different silhouette from the other two.

One state, three treatments, one documented.

---

## List 2 — Values the build changed

| # | Document | Code | Explained in code? |
|---|---|---|---|
| 2.1 | §3:260 — "Search field input \| **13** \| 400 \| sans" | `SearchField.jsx:103` — `text-base` (**16px**) | **Yes**, `:70-81`: "Mobile Safari ZOOMS THE PAGE when a focused input's font-size is under 16px — reported from the deployed app". §3:337's exception paragraph still names only `Field`'s three controls, so the doc contradicts itself across two sections; the guard has already been widened (`typeScale.test.js:121-131`: "AN INPUT, not a file"). |
| 2.2 | §3:302 — "Wordmark \| **12** \| 800 \| **+0.20em**" | `AppHeader.jsx:47,60` — 12/800/`tracking-[0.2em]` ✓. **`Login.jsx:44` and `SignUp.jsx:49` — `text-[11px] … tracking-[0.16em]`** | No. Unguarded: `check-browser.mjs:1596` checks the wordmark only on `/libraries`. Two screens print the wordmark at a size and tracking §3 assigns to a section header. |
| 2.3 | §3:295 — "index letter count, ledger dates, ledger duration, **library row sub** \| 11 \| **400** \| **tabular**" | `LibraryRow.jsx:57,62` — `caps text-[11px] **font-bold** tracking-[0.16em]`, sans; and `SharedRibbon.jsx:18` sets `Shared · {count}` with **no `.num` at all** | Partly, and the comment overshoots. `LibraryRow.jsx:52-55`: *"Mono is for the count, not the word or the address."* The code puts the count in the sans too. §3:269-272 lists "a library's item count" as a mono datum. Not covered by `MONO_FIELDS`. |
| 2.4 | §4:533-534 — "Row height, with a sub-line \| 10 divisions (80px)"; "without \| 8 divisions (64px)" | `LibraryRow.jsx:31` — `min-h-16` (64) growing with content ✓. **`ItemRow.jsx` sets no height at all**: `p-4` + a 72px frame = **104px**, confirmed by `index.css:278` `contain-intrinsic-size: auto 104px` | No. 104px is 13 divisions and on the scale, but the stream row — the app's densest, most repeated element — is described by neither row in §4's table. |
| 2.5 | §5:811 — Volume Plate "2px ruled" | `VolumeFrame.jsx:95` — `border` (1px) on the member plate | Yes (`:83`). §3:296 records it; §5 does not. |
| 2.6 | §5:816 — Overprint Stamp "Rotated −4°, **0.92 opacity** … caps set in **`--ink`**" | `OverprintStamp.jsx:36` — paper: `-rotate-[4deg] … opacity-[0.92] text-ink px-[6px] py-[2px]` ✓. **`:35` inverted: `px-[5px] py-px text-paper`, full opacity** | Yes (`:10-14`): "there is no paper ground on the cover for the opacity trick to read against". §5 names one variant. |
| 2.7 | §4:543 — "1px \| hairline separators inside a block" | `CollectionBoard.jsx:21` head separator `border-b-2`; `LibraryRow.jsx:13` row separator `border-b-2`; `AppHeader.jsx:23` `border-b-2` | No. §4:544 assigns 2px to "volume frames, field underlines"; three structural separators use it for something else. `ItemRow.jsx:21` uses 1px correctly. |
| 2.8 | §4:517 — "gaps between blocks … are whole divisions, always" | `SearchField.jsx:65` — `mt-3` = **12px** (3 base units, 1.5 divisions) | No. The one layout-scale gap found off the division; `RowActions.jsx:14`'s `gap-[3px]` and `PlateLine.jsx:29`'s `mt-[3px]` are typographic interiors, which §4:518 explicitly permits. |
| 2.9 | §5:810 — Volume Frame, one construction | `VolumeFrame.jsx:10-14` — **three** sizes: `row` 48×72, `candidate` 88×132, `hero` 132×198 | Yes (`:23-30`): the candidate size exists because on the results screen "the picture is what decides the match". All three are exactly 2:3 ✓. Only the hero is named, and only in `ui-v3.md`. |
| 2.10 | §2:147-151 — focus ring | `index.css:146-149` — 3px `--ink` / 2px offset ✓; `:155` `--paper` on `.cover` ✓; `:164` `.focus-control` offset 0 ✓; **`:219` `.field-control` outlines in `--imprint`, not `--ink`** | No. §2's Focus section was rewritten to make the ring the *structural* tone precisely because yellow cannot describe a form — and the one surviving `--imprint` outline is on `.field-control`, used by both `SearchField.jsx:65` (yellow ground: a yellow ring on yellow) and `Field.jsx:63` (paper ground: ~1.55:1). The `.on-imprint` flip is documented at `:196-202` as a deliberate no-op anchor. **Highest-value item in this list.** |
| 2.11 | §2:127 — "`--cover-rule` … **Structure only, never text**" | `ItemDetail.jsx:334-343` — `bg-cover-rule/25` as the ground of the skeleton line bars | Yes (`:325-327`): "the same token `OverprintStamp`'s row variant already tunes with opacity, not a new one". A 25% tint of a structure token used as a ground is not covered either way by §2's palette law. |

---

## List 3 — Things the build needed that the document never named

The most valuable list, and it divides cleanly: **five components in the imprint's own vocabulary
with no §5 entry**, **four states with no §6 row**, and **twelve constructions the document has no
category for.**

### Components absent from §5

1. **`CaptureCaption`** (`src/components/CaptureCaption.jsx`) — the caps status strip pinned to the
   bottom edge of both camera viewports (`FRAME THE TITLE`, `CODE READ · LOOKING IT UP`). Its
   header comment records the discovery that matters more than the component:
   *"'anything that sets a ground sets its foreground' was written for a surface painting its own
   background. Here nothing set a ground at all, which is the same defect arriving from the other
   side."* Measured 1.45:1–5.1:1 against a live feed. **§2's law has an inverse case — a
   foreground over a ground the design does not own — and §2 does not state it.** This is the
   single most useful thing in the build that the document lacks.
2. **`FilingInto`** (`components/imprint/FilingInto.jsx`) and **`FlowMarks`**
   (`components/imprint/FlowMarks.jsx`) — the two marks a cataloguing session prints on all four
   add screens: `FILING INTO <name>` and the `FILED THIS SESSION · N` tally. Both are printed
   marks, deliberately not toasts, precisely so they survive a session of back-to-back scans.
   `ui-v3.md` names the filing mark; §5 names neither.
3. **`SearchRowMarks`** (`components/SearchRowMarks.jsx:29`) — the inline `IN <library> · FROM
   <owner>` tag a search row adds. §6:963-964 sanctions "an inline `--shared` tag" on a search row
   in one clause; §5 has no entry, and the `IN <library>` half — a second, non-link variant of the
   Detail Marks construction — is named nowhere.
4. **Toast** (`state/ToastContext.jsx:36`) — `border-t-[3px] border-ink bg-paper-deep p-4 text-sm
   font-semibold text-ink`. §6 mentions toasts twice as a *policy* ("confirmations only") and
   never as a component.
5. **`UpdateNotice`** (`pwa/UpdateNotice.jsx:18`) — the `NEW EDITION` notice. `ui-v3.md` §7
   specifies it in detail; `DESIGN.md` does not mention it.

   **And the three above share one silhouette.** Sheet (`Sheet.jsx:157`), Toast
   (`ToastContext.jsx:27,36`) and UpdateNotice (`UpdateNotice.jsx:18`) are all
   `mx-auto max-w-md`, bottom-anchored, `border-t-[3px] border-ink bg-paper-deep p-4`. Three
   different things — a modal, an auto-dismissing confirmation, a persistent offer — with one
   printed form and nothing in §5 distinguishing them.

### States absent from §6

6. **End of list** — `LibraryBrowse.jsx:195`, `End of the shelf`, `caps border-t-2 … text-ink-soft`.
7. **Appending** — `LibraryBrowse.jsx:188`, `Loading more`, `role="status"`. Distinct from
   §6's *Loading*, which is the cold skeleton.
8. **In-flight capture lookup** — `CaptureCaption`'s busy strings. §6 has no row for "a viewport
   is narrating a request".
9. **Route-chunk pending** — `routes.jsx:44-51`, a `RouteFallback` that renders the full paper
   ground plus a working back control. §6's *Loading* covers content, not code-splitting.

### Constructions the document has no category for

10. **The two capture viewports are not 2:3, deliberately.** `BarcodeScanner.jsx:172` —
    `h-48 w-full` (192px). `CoverCapture.jsx:189` — `h-[240px] min-h-[120px] w-full`. §4's frame
    law ("One ratio for every item: portrait 2:3") is written about *items*; nothing in
    `DESIGN.md` acknowledges that a viewfinder is a different subject with a different shape.
    `ui-v3.md` argues both at length; `DESIGN.md` §4/§5 mention no capture frame at all.
11. **The Sheet's real mechanism.** §5:819 is one sentence. The component is 193 lines: a
    `bg-ink/40` scrim (`:141`, an overlay tone with no token), a portal to `document.body`
    (`:133`), `inert` on `#root` with a module-level open-sheet counter (`:23-51`), a re-queried
    focus trap (`:79-116`), focus restoration to the opener, a `Close` Mark inside the panel
    (`:177`), and `max-h-[80dvh]` with internal scroll.
12. **The `Field` variants.** §5:821 names the input, the bottom rule, the caps label and the
    password reveal. Unnamed: the `select` variant with a hand-drawn `ChevronDown` and
    `appearance-none` (`:85-108`), number-spinner suppression (`:130-131`), textarea
    `resize-none` (`:126`), the `counter` / `hint` / `liveHint` / `required` props, and — the real
    gap — **the inline field-error treatment**: `border-out` on the bottom rule plus a 13px
    `--ink` note with `role="alert"` (`:37,141-144`). That is a fourth Error construction beyond
    §6's three.
13. **The Index Letter's count is a phrase, not a figure.** `IndexLetter.jsx:47-49` renders
    `<span class="num">{count}</span> volume(s)` — the noun sits in the sans. §5:815 says only
    "Its count appears only on a closed run".
14. **Section heads carry counts.** `Libraries.jsx:19-24` — `MINE` / `SHARED WITH ME` each with a
    `.num tracking-normal text-ink-soft` count on the right. §3:304 gives the section header a
    size and tracking; no document gives it a figure, and §4's *What a plate carries* is the only
    place counts are legislated.
15. **`CONTINUES`** — `CollectionBoard.jsx:26-27`, the one label on an orphaned partial board.
    `ui-v3.md` §4 specifies it; §5:818 discusses only the `SERIES ORDER` label that was removed.
16. **`.row-skip`** — `index.css:276-279`, `content-visibility: auto` with
    `contain-intrinsic-size: auto 104px`. A layout-affecting utility with a hard constraint
    (`:271-275`: it must never wrap a sticky index letter, and boards are excluded because a wrong
    intrinsic size drifts the scroll on a continuation merge). §4 legislates the division scale and
    says nothing about containment.
17. **`AddFlowLayout`** — `routes.jsx:86-91`, a layout route that owns the filing session's
    identity *and* the camera lease for its whole span. `ui-v3.md` §3 says "Sheets, which are not
    routes"; a route that is not a screen has no place in either document.
18. **The index alphabet's empty-fold branch.** `lib/sort.js:27-31` — a title whose first
    character is a bare combining mark folds to nothing, and the label falls back to the **raw**
    first character. §4:737 says "The label is always the actual folded first character" with no
    exception.
19. **`on-imprint` as a documented no-op.** `index.css:196-202` keeps the class alive purely as an
    anchor for ~15 call sites after the focus ring stopped needing it. A deliberate dead class,
    correctly flagged in code, invisible in the document.
20. **`AddItemSheet`'s `Back` option** — `AddItemSheet.jsx:53-57`, a fourth entry when the sheet is
    reached from a collection board. `ui-v3.md` §7 legislates carefully which options this sheet
    may hold; `Back` is not among them.
21. **The delete confirmation as a distinct construction.** `ItemDetail.jsx:533-574` — a
    `role="group"` with an `aria-live="assertive"` description carrying a `border-t-2 border-out`
    rule, expanding **in place of** the trigger inside the same action row, with focus moved to the
    safe option. §7 requires "confirm in place"; nothing describes the form it takes, and it is
    reproduced by hand in `UnshareLibrary.jsx:120-140` rather than shared.

---

## `.claude/ui-v3.md` §4 — screen by screen

The on-disk §4 is heavily reconciled and mostly **matches**. Verified per screen:

| Screen | Verdict |
|---|---|
| Login `/login` | Matches. Imprint wordmark plate (`Login.jsx:44`), password reveal via `Field`, Google secondary, OAuth outcomes read from URL params. See 2.2 (wordmark size) and 1.5 (the invisible imprint rule on the success notice). |
| SignUp `/signup` | Matches. |
| PendingApproval | Matches structurally (`PendingApproval.jsx`), no polling, sign-out only. See 1.4 for its `--out` badge. |
| Libraries `/libraries` | Matches: two labelled sections, plates, ribbons, Row Actions absent on shared rows (`Libraries.jsx:102` passes no `onActions`), `READ ONLY` not printed, pull-to-refresh, bottom-bar primary. **Divergence:** the empty state (1.9). |
| NewLibrary / EditLibrary | Matches — live remaining-character counters via `Field`'s `counter`. |
| UnshareLibrary | Matches, multi-select 1–10, partial-failure reporting. See 1.10. |
| LibraryBrowse | Matches: server order never re-sorted, sticky letters, boards, `CONTINUES`, add absent when read-only, title tap scrolls to top, invisible pagination. **Divergence:** the skeleton (1.8), and boards are not expandable (1.2). |
| NewCollection / EditCollection | Matches, and better than specified: duplicate names branch on **409** (`NewCollection.jsx:35`, `EditCollection.jsx:56`), not on prose. |
| AddBook | Matches. `Enter by hand` is the underlined link §6 prescribes (`AddBook.jsx:240`), not a Plate Button. |
| BookDetectionResults | Matches. The scanned code sits once at the head in the mono (`:198`, `data-mark="lookup-code"`, `class="num"`), `?isbn=` / `?collectionId=` recovery, failures as ruled notes. |
| AddVideo / VideoDetectionResults | Matches, including the one-tap `LOOK UP THIS COVER` shutter and `?title=` on every navigation. |
| NewBook / NewVideo / EditItem | Matches. `COVER IMAGE` sits between `SUMMARY` and the type block (`ItemForm.jsx:189, 211, 222`); the order field is optional/required by the three-case rule (`:68`) with a per-case `reason` (`:300`). |
| ItemDetail | Matches: hero 132×198 ruled in paper, Detail Marks column, yellow title rule, inline ledger, three un-menued actions. **Divergences:** `Full record` in `--imprint` (1.6) and the error boxes (1.14). |
| ItemHistory | Matches — paginated, paired into loans, clear confirms in a `Sheet`. |
| Search `/search` | Matches, including the honest match-scope line ("…not ISBNs", `Search.jsx:261`) and `localStorage` recents. |
| Settings / Account / About | Matches, and this is the clearest case for reading the artefact. §4:971-973 on disk reads "email from the JWT **with a copy Mark beside it**… `custom:Id` is **not on this screen**", and the build does exactly that (`Account.jsx:52` copies `user.email`; `custom:Id` appears nowhere on the screen). The session-context copy of §4 still says "`custom:Id` copyable (it is the owner id used for support)" — which would have produced a precise, reproducible, **wrong** finding against correct code. The password section is conditionally absent for a federated sign-in, keyed on the username prefix, as §4 requires. |

**Four §4 divergences total**, all already listed above: 1.2, 1.6, 1.8, 1.9. §4's screen
descriptions are the most accurate part of the corpus — no screen renders something §4 does not
describe, and no screen omits something §4 requires.

---

## Two notes that are not findings

- **`DESIGN.md` §8:991** still reads "Focus ring per §2, *Focus*: 3px `--imprint` at 2px offset,
  switching to `--ink` on yellow grounds" — the pre-rewrite rule, contradicting §2:149-151 and the
  build. §8 is out of this audit's scope; flagged because it is a live contradiction inside one
  document, and it is the version a reader skimming the accessibility section would apply.
- **`src/typeScale.test.js:96-120`** carries a superseded paragraph ("Scoped to that one file
  rather than to a count… 16px anywhere else is a violation") immediately above the block that
  reverses it (`:121-131`, "AN INPUT, not a file"). Both are present; the later one is what the
  code does. A stale comment above the live one is the exact hazard `index.css:173-182` records
  paying for.
