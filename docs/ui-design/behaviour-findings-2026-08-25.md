# Two behaviour findings, found while reconciling the documents — not fixed there

Found during `docs/superpowers/plans/2026-08-25-ui-v3-reconciliation.md`, which is a documentation
pass over the design system. Neither is one of the 42 audited findings that pass applies, and
neither was fixed there: a code change smuggled into a documentation commit is how a reviewer stops
being able to see either one.

The first is a real product defect. The second is housekeeping.

## 1. A cover that never loads retries every four seconds, for ever, on every visible row

`src/components/imprint/VolumeFrame.jsx`. The frame's own comment, the state grammar and the screen
specification all describe this as **one delayed re-poll**. It is not bounded at all.

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
what all three documents already claim happens, and what the empty frame exists to be.

**Why it was not fixed in that pass.** It is outside the 42 findings, it is a behaviour change to a
component rendered on every row of the densest screen in the app, and it deserves its own
measurement — how many frames in a real library actually reach the permanent case — rather than
riding along inside a documentation commit.

**One inherited-claim note worth keeping.** All three descriptions of this behaviour say "re-polls
once on a delay". That phrase was written once and copied into the other two, and none of the three
was checked against the effect. This is the pattern the reconciliation kept finding: a claim
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
