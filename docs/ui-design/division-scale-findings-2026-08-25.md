# Off-division layout gaps — found while applying the reconciliation, not part of it

Found by Task 07's sweep during
`docs/superpowers/plans/2026-08-25-ui-v3-reconciliation.md`, and **deliberately not fixed there**.
They are outside the 44 findings that pass applies, and folding unplanned corrections into a pass
is how `DESIGN.md` accumulated the divergences the pass exists to repair.

`DESIGN.md` §4: *"gaps between blocks … are whole divisions, always."* The division is 8px. §4 also
permits optical adjustments of 1–3px **inside** a plate, a tag or a stamp — so a typographic
interior is not bound by the rule and a gap between blocks is.

Both entries below were independently assessed by the task's reviewer, which agreed with the
implementer that each is a genuine layout-scale gap rather than an interior.

## 1. `src/pages/ItemDetail.jsx` — `mt-3` between two skeleton lines

`mt-3` is 12px, 1.5 divisions. **The internal evidence is stronger than "a candidate":** every other
gap in that same skeleton block is on the scale — `mt-2` (8px, title to plate line), `mt-6` (24px,
into the action row) — and only this one sits between them. It is also a full Tailwind step rather
than a hand-tuned bracket value like `PlateLine`'s `mt-[3px]`, which is the shape §4's optical
allowance is written for.

The implementer recorded it as "plausible"; the reviewer upgraded it, and the upgrade is the
record.

## 2. `src/pages/Search.jsx` — `pb-3` on the sticky wrapper around the search field

`pb-3` is 12px. It is padding before a structural rule (`border-b-2`), which §4 binds to whole
divisions, not an interior.

**This one is worth more than its size, because of where it sits.** Task 07 corrected
`SearchField`'s own top margin from `mt-3` to `mt-4` on the grounds that it was the only
layout-scale gap in the app off the scale, on the loudest mark in the design. That claim was true
of `SearchField.jsx`; it was not true of the field *as rendered on `/search`*, where this padding
boxes the same field from below inside the same visual cluster. So the field is on-division above
and off-division below, and the fix is **partially complete on that one screen**.

Not fixed there for the same reason as everything else on this page — and because nobody has
measured whether the right value is 8px or 16px. Task 07's own correction rested on a measurement;
this one should too.

## 3. The sweep that found these cannot find all of them

Task 07's Step 1 greps Tailwind's named odd-numbered steps (`3`, `5`, `7`, `9`, `11`). It does not
match **bracket-notation** gaps — `mt-[10px]`, `gap-[12px]` and the like — so an off-division layout
gap written in that form is invisible to it.

This is the same shape as the type-scale guard's own history, recorded in `DESIGN.md` §3: a
detector matching only the arbitrary `text-[Npx]` form would have covered 44 sites, missed 70, and
reported clean — *"indistinguishable from a guard that works"*. Here the blindness runs the other
way round, matching named steps and missing bracket ones, but the consequence is identical.

**So the count of off-division gaps in this codebase is unknown, and the two above are a lower
bound rather than the set.** Any pass that takes this on should widen the sweep before trusting it,
and should expect the widened version to be seen finding something the narrow one missed.
