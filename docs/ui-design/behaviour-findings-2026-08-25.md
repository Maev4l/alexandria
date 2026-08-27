# Six behaviour findings, found while reconciling the documents — not fixed there

Found during `docs/superpowers/plans/2026-08-25-ui-v3-reconciliation.md`, which is a documentation
pass over the design system. None is one of the 44 audited findings that pass applies, and none was
fixed there: a code change smuggled into a documentation commit is how a reviewer stops being able
to see any of them.

The first is a real product defect. The second is housekeeping. The third is a product question
rather than a bug, and it is the one that blocked a sentence in the design system from being
written the obvious way. The fourth is a guard blind to two of the rules it claims to cover. The
fifth is a guard blind to a construction it cannot even see, because nothing on the element
carries the class it would check.

The sixth arrived later than the other five and by a different route: it is what closing the fifth
one turned up. A guard that can finally measure an inherited size immediately reported three
numerals the design system has never published a size for at all.

## 1. A cover that never loads retries every four seconds, for ever, on every visible row — FIXED

`src/components/imprint/VolumeFrame.jsx`. The frame's own comment, the state grammar and the screen
specification all described this as **one delayed re-poll**. It was not bounded at all.

**Both halves are now closed.** The documents were corrected first, in the reconciliation pass, to
say what the component actually did; the bound was then built in its own commit, and every one of
those descriptions has been corrected a second time to say what it does now. The frame retries once
and then holds the ruled empty frame, and the single retry re-arms when the address changes — a
changed `?v={updatedAt}` means the item was genuinely written to, so it is a new subject rather than
a repeat of the one that failed.

**A second defect fell out of the same bound, and nobody had filed it.** The failure flag is
reported upward, and item detail raises its `Fetch cover` repair from it. While the retry was
unbounded that flag did not merely clear late — it **oscillated**, set by each failure and cleared by
each timer — so on a permanently broken cover the repair control appeared and vanished on a
four-second cycle while the reader looked at it. A bounded retry settles the flag true, so the
control is stably on screen. The finding as filed named the request volume and missed the thing on
screen; the fix for one was the fix for the other.

**The guard is the negative, and it was watched fail before the bound existed.** A test that fails
the image, advances well past a second interval and asserts no further attempt is the one that would
have caught this; a second test asserts the flag never returns to false once the retry is spent, and
a third that a changed address re-arms it, because the repair flow depends on that.

The cycle, verified by reading the component:

1. The `<img>` renders while `failed` is false. Its `onError` sets `failed` to true.
2. An effect keyed on `failed` arms a 4-second timer whenever `failed` is true, and that timer sets
   `failed` back to false.
3. `failed` going false re-renders the `<img>`, whose `onError` fires again.

Nothing counts attempts. There is no "we already tried" state, so step 3 returns to step 1
indefinitely. For a thumbnail that is *temporarily* missing this is the intended behaviour and it
resolves on the first success. For one that is **permanently** missing it is a four-second poll with
no exit.

**Why this is not hypothetical here.** The product record states that the thumbnail URL is
synthesised from a template whenever a source picture URL exists, **without checking storage** — so
a URL that 404s is the common case, not the rare one, and an item whose thumbnail generation failed
outright keeps that URL for ever. The browse stream renders 30 rows a page and every frame owns its
own timer, so a page holding thirty such items issues thirty requests every four seconds for as long
as the reader stays on the screen.

**What the fix is not.** Lengthening the interval only makes it slower. The missing thing is a
bound: retry once, record that the retry happened, and then hold the ruled empty frame — which is
what all of those documents used to claim happens, and what the empty frame exists to be.

**Why it was not fixed in that pass.** It was outside the 44 findings, it is a behaviour change to a
component rendered on every row of the densest screen in the app, and it deserved its own commit
rather than riding along inside a documentation one. It was fixed in that separate commit, which is
what the deferral was for.

**One inherited-claim note worth keeping.** All three descriptions of this behaviour said "re-polls
once on a delay" — five, once the product record and the screen specification were counted. That
phrase was written once and copied into the rest, and not one copy was checked against the effect.
The design system corrected its own Volume Frame entry and left the other two rows of itself
asserting the opposite, which is the same defect one level in. This is the pattern the reconciliation kept finding: a claim
travelling between documents faster than anyone re-reads the code under it.

## 2. Two icon exports are imported by nothing

`src/components/icons/index.jsx` exports eleven marks. The app imports nine — the back chevron, the
select chevron, search, add, close, check, copy, and the two password-reveal eyes. **`More` and
`Camera` are dead.**

`More` matters slightly more than an unused export usually would, because it is a drawn
three-dot mark while the visible row-actions affordance is three CSS boxes
(`RowActions.jsx` renders `<span className="block size-[3px] bg-ink" />` three times). So the
codebase holds two constructions for one mark, one of which nothing renders — and a reviewer reading
the icon file would reasonably conclude the SVG is what ships.

It is also the source of a documentation error caught in review: the design system was briefly
written to describe the row-actions dots as SVG paths with a square linecap, which is true of the
dead export and false of the shipped component.

`More` additionally declares a `stroke-linecap` the shared mark does not, so the file's own header
comment — *"2px stroke, square caps, no fill"* — is true of the one export nothing uses and false of
the nine that ship. That comment was transcribed into the design system before review caught it.

## 3. Pull-to-refresh draws skeletons above the rows the reader is already reading — RATIFIED

`src/state/StreamContext.jsx` and `src/pages/LibraryBrowse.jsx`. Found while reconciling the state
grammar, and it is the reason one sentence in that grammar could not be written the obvious way.

`refresh()` sets the loading flag and **does not clear the entries** — only the mount effect does
that. The browse screen wires pull-to-refresh straight to `refresh`, gates its skeleton block on the
loading flag alone, and renders the loaded runs unconditionally underneath. So pulling to refresh a
library of a thousand items paints four skeleton rows **above** the thousand real ones, rather than
replacing anything or appending anything.

**Why it was recorded rather than fixed on the spot.** It was outside the 44 findings that pass
applied, and it was not obviously a defect: skeletons above live content is a defensible way to say
*new data is arriving*. What was certain was narrower and is why the note existed at all — the design
system could not describe the loading state honestly while the behaviour had no name, because the
natural sentence ("skeletons stand in for content that is not there yet") is false of the refresh
path, and the distinction the document drew between a cold load and an appended page had a third
shape sitting between them that nobody had named.

**Ratified.** Drawing above is correct, and the reason is the mechanism itself: `refresh()` sets the
loading flag without clearing the entries, so the reader keeps seeing what they already have for as
long as the request is in flight, and only a null-token load — which starts from an empty array —
swaps the whole stream in one motion once the response lands. That is the right behaviour on its own
terms: a reader pulling to refresh a thousand-item library should not have it blanked onto bare paper
while a request they already trust to succeed is still in the air. The design system now describes
this as a decided third shape rather than as an unnamed omission.

## 4. A focus guard checks only the shorthand, while its comment says it checks every rule

`packages/web-client-v3/src/tokens.test.js`, around line 151. Found by the review of the final
comment sweep, on a line that sweep had rewritten.

The comment says the check covers **every** focus rule rather than only the base one, and its test is
named for spending no accent on any focus outline *anywhere in the stylesheet*. The filter behind
both matches the `outline:` **shorthand** only.

Two focus rules in `src/index.css` set their colour by longhand `outline-color` — the inverted cover
surface and the accent-ground flip — and neither is visible to the check. So the sibling-rule drift
the comment exists to prevent is undetectable in exactly the two rules written the other way, and
that drift is not hypothetical here: this pass began with a defect of precisely that shape, where a
focus ruling changed one rule and its sibling silently kept the accent.

**Not fixed in that sweep, deliberately.** That task was comment-only, and widening what a guard
detects is a behaviour change needing its own verification — including confirming that the two
longhand rules pass once they become visible. The comment was corrected to describe what the code
actually checks, which is that task's own rule.

**What the fix is.** Match the longhand as well as the shorthand, then re-run and confirm the two
newly-visible rules pass rather than assuming they will. If either fails, that is a real finding and
not a guard bug.

**The general shape, which is this pass's most repeated lesson.** A guard's comment is the most
authoritative statement of its rule outside the specification, and it is written by the person who
believes the code does what they meant. This is the third guard in this pass found describing
something its own code does not do — after one quoting a retired stricter rule as current, and one
whose fallback claim was inverted.

## 5. A type-scale guard cannot see a numeral that takes its size from its parent's line, not its own class

`packages/web-client-v3/src/typeScale.test.js` and
`packages/web-client-v3/src/components/imprint/LedgerRow.jsx`. Found while correcting the design
system's published size for the ledger duration, which had been recorded at 11px against a
rendered 13.

The guard walks the JSX tree for elements carrying a `text-[Npx]` or named-size class and checks
each one against the published scale. `LedgerRow.jsx`'s duration renders as
`<span className="num">{loan.days}</span>` — no size class of its own. Its 13px comes from the
line it sits inside, `<span className="flex justify-between gap-2 text-[13px]">`, the same way any
inline text inherits its container's size. There is nothing on the duration's own element for the
guard to find, so it is not exempted from the check — it is invisible to it.

That is the deliberate construction, not an oversight in the markup: the design system states that
the duration takes the ledger name line's size rather than carrying one of its own, because sizing
it independently would put a mismatched figure beside a differently-sized unit word on one flex
line. But the guard's method — read the element's own classes — cannot represent "declares nothing,
inherits from its container" as a covered case. A row that had shipped at the wrong size here would
have passed the same way this one does; the green result asserts nothing about this construction
either way.

**Not fixed here, deliberately.** This pass was comment-only. Closing the gap means teaching the
guard to resolve a size from an ancestor when the element itself declares none — a real widening of
what it checks, the same class of change as behaviour finding 4's longhand-outline widening, and it
needs its own verification once it exists: confirming the ledger duration passes on its own merits,
and checking whether any other numeral in the app relies on the same size-by-inheritance
construction and would newly come into view.

**What the fix would be.** When an element carrying `.num` (or matched as a catalogue numeral)
declares no `text-*` class of its own, walk up to the nearest ancestor that does and assert the
resolved size against the scale instead of skipping the element. Then re-run against the whole app,
not just this row, since the same gap would apply to any other inherited-size numeral nobody has
gone looking for yet.

## 6. Three catalogue numerals render at sizes the mono table publishes for nobody — RESOLVED

`packages/web-client-v3/scripts/check-browser.mjs`, the catalogue-field manifest. Found by giving
that manifest the published size of each role and measuring the computed size alongside the face it
already checked — which is the widening behaviour finding 5 asks for, done in the browser rather
than in the source-parsing guard, because a computed size is the only thing that can see a size
arriving from a parent line.

Fifteen of the eighteen fields measure exactly the size their role publishes, including the two
that carry no size class of their own — the ledger duration at 13 and the index letter's run count
at 11. That half is closed and the assertion ships.

**Three fields have no role in the mono table to measure against.** Not a disagreement between the
document and the code — an absence. Each renders a numeral in the mono face at a size nothing
publishes:

| Field | Route | Renders at | Source line |
|---|---|---|---|
| The scanned code echoed at the head of a book results screen | `/libraries/:libraryId/add/book/results` | 13px | `src/pages/BookDetectionResults.jsx:198`, `className="num mb-4 text-[13px] text-ink-soft"` |
| The filed-this-session tally | the capture flow's marks | 11px | `src/components/imprint/FlowMarks.jsx:29`, `className="num tracking-normal"`, size inherited from its line |
| The app version | `/settings/about` | 14px | `src/pages/About.jsx:30`, `className="num"` inside a `text-sm` paragraph |

All three sit on the type scale, so nothing here is off-scale. What is missing is a published row
saying which step each is meant to take, and until one exists the guard measures them and reports
the number rather than asserting anything — declared in the manifest as an explicit absence, not as
a forgotten field, because a missing property and a deliberate one cannot otherwise be told apart.

**Not decided here, deliberately.** Choosing a step for each of these three is a design judgement,
and the wrong way to make it is to read what the component happens to render and write that number
into the table — which would make the guard agree with the code by construction and assert nothing,
the exact failure the ledger duration's 11-against-13 was found by avoiding.

**Decided since, by the owner, and the three went three different ways — which is the part worth
keeping.** The instinct on finding three unpublished sizes is to publish three rows, and that would
have been wrong twice over: it would have grown the table by three roles to describe one genuine
design decision, and it would have written the rendered number into the document for each, which is
the by-construction agreement this finding warned against. Each was asked the same question — *is
this a role, or is it an instance of one?* — and only one of the three answered yes.

| Field | Decided | Why this one, and not the others |
|---|---|---|
| The filed-this-session tally | **Folded into the published 11px row.** Document only; nothing on screen changed. | It already renders at 11, which is exactly where the index-letter count and the ledger dates sit. It was never a role — it was an unnamed member of an existing one, and all that was missing was the naming. Its weight is the one thing it does not share: it inherits 700 from the caps label it sits inside, which the row now says, the same way the section-header count row already accounts for its inherited 800. |
| The scanned code at the head of a detection results screen | **Published at 13px, with its reason, as its own row.** | This is the one real role of the three, and the giveaway is that its size *disagrees* with a published neighbour: the detail ISBN is 13's neighbour at 12, and the two are different jobs. The head code is an echo of what the reader just typed or scanned, sized to be read at a glance and confirmed; the detail ISBN is an identifier inside a dense metadata line. A published size without its reason is exactly what gets "corrected" to match its neighbour by the next reader who notices they differ — which is how this table acquired the contradictions this pass has been removing — so the row carries the reason, not just the number. |
| The app version | **Moved to the published 12px step. A code change, not a documentation one.** | "The version number on the About screen" is not a role a design system should carry a row for. So rather than publish a fourth role to describe what the component happened to render at 14, the component moved onto a step the table already publishes. It sets 12 in the mono inside a 14px sans line, which is this system's ordinary construction rather than a new mix — the Plate Line is precisely that pairing, and it was the check that 12 does not read wrong beside the sans hash next to it. |

**The guard now asserts all three**, and the three measured what the table publishes on the first
run: 13, 11 and 12. With no field left unpublished, the manifest's `px: null` convention is gone
along with the branch that skipped it — an entry with no size is now a forgotten key that fails,
where before it was indistinguishable from a declared absence.

**The general shape: an unpublished value is not automatically a missing row.** Two of these three
were closed without the table growing at all, and the table is better for it — a system that
publishes a row per rendered instance stops being a system. The question to ask of each is whether
the value would still be true if the component moved, and only the head code's 13 was.

**And a fourth thing came out of the same run, which is a property of the check rather than of the
app.** The Melville board's member count and the `M` index letter's run count both render `4` on the
browse stream, at 12 and 11 respectively — each correct for its own role. A value-driven manifest
cannot tell them apart, and it never had to while only the face was measured, because every mono
role shares one face. The two can never be separated by a fixture edit either: a run holding exactly
one board and nothing else always equals that board's count. So that one entry names the element it
means. The general shape worth keeping: **asserting a second property can make an anchor ambiguous
that was perfectly serviceable for the first.**
