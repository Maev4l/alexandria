# Critique ignore list

Findings that have been investigated and are **not** defects. `critique` reads this file at setup and
drops matching findings silently. This exists because the same three were re-filed across two
consecutive critiques — the second time after the first had explicitly corrected them.

## `getBoundingClientRect` is not the touch target

Any finding that a control is under 48px, based on its **element box**, where that control carries a
`::before` hit-area expansion. The box understates the target **by design**; `getBoundingClientRect`
does not include pseudo-elements. Measure with `elementFromPoint` walking outward from the control's
centre, never a class and never the box.

Known instances, all **compliant**, with measured hit areas:

| Control | Box | Hit area |
|---|---|---|
| `IN <library>` on item detail (`DetailMarks.jsx:119`) | 42.2 × 18.2 | **49 × 56** |
| `Full record` on item detail | 90.8 × 15.4 | **91 × 55** |
| `/libraries` rows (`before:-inset-y-4`) | 25.3–47.5 tall | **57** |

`IN <library>`'s **horizontal** case was a genuine defect in slice D and was fixed with
`before:w-[max(50px,100%)]` plus centring, so the hit width is 49px for every library name and no
longer tracks the text. **Any finding quoting `before:inset-x-0` on that control is quoting the
comment that documents the fix** (`DetailMarks.jsx:82`) and reading it as current behaviour.

All three now have hit-area guards in `check-browser.mjs`. Two of them did not, which is exactly why
only those two could be re-reported as failing without anything going red.
