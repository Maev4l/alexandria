# web-client-v3 — agent notes

Loaded only when working inside this package. The two specs below are large (~70 KB each) and are
NOT imported: read the section the task touches, by its heading, rather than the whole file.

## Before changing anything

- **UX, IA, routes, screens, API constraints:** `.claude/ui-v3.md` (repo root)
- **Visual system — colour, type, spacing, components, states:** `DESIGN.md` (this package)
- **Product truth:** `PRODUCT.md` (repo root). **API contract:** `packages/functions/api/openapi.yaml` — grep, never read whole.

Both specs describe what shipped. A change that alters behaviour or visuals updates the matching
section in the same commit.

## Binding rules — digest

The rules most often breached, one line each. **This is a pointer, not the rule**: the cited section
is authoritative and carries the reasoning. Read it before relying on a line here, and if the two ever
disagree, the section wins and this line gets fixed. `D` = `DESIGN.md`, `U` = `.claude/ui-v3.md`.

**Visual**

- No rounded corners, no shadows, no gradients, no serif — anywhere. (D §1, §9)
- Each colour means one thing. `--imprint` only marks finding and acting (search field, index letters, active state, primary action) and is never text or a shape on paper. `--out` only marks alarm (lent, destructive, invalid), is never small text, a ground or focus. `--shared` only marks sharing. (D §2)
- `--cover-*` tokens belong to the item-detail black cover only; paper tokens never go onto it. A surface that paints a ground sets its own text colour, never inherits it across the boundary. (D §2, `groundForeground.test.js`)
- Focus ring: `--ink` on paper and imprint, `--paper` on the cover, 3px at 2px offset. Never `--imprint`, `--out` or a `box-shadow`. No `outline-none` in `Field`. (D §2)
- Two faces only: Archivo and Chivo Mono. Mono is for numerals presented as a datum, never prose. Check a glyph exists in the shipped font before using it (`⌗` and `→` do not). (D §3, §9)
- Type steps: 10, 11, 12, 13, 14, 17, 20, 22, 32, 76 — nothing else. Every input sets 16px. (D §3)
- `.caps` for interface labels only, with weight set explicitly at the use site. Content — titles, names, emails — is never uppercased. (D §3)
- Spacing: whole 8px divisions between blocks; 4px only between a label and its own content. Touch targets 48px, measured as hit area. (D §4, §8)
- Shell: `flex h-dvh flex-col`, fixed header, exactly one `min-h-0 flex-1 overflow-y-auto` region marked `data-scroll-region`. The document never scrolls; anything `absolute` needs a positioned ancestor inside the region. (D §4)
- Edge rules (lent, shared) are absolutely positioned, never `border-left`. (D §6)
- Every item frame is portrait 2:3 and type is not marked. An empty frame is the rule with no fill; a failed image degrades to it (never a broken-image glyph) and retries once at 4s. (D §4, §5)
- State always carries words. An `aria-label` never carries fewer facts than the visible text. (D §8)
- A disabled primary is the ruled outline, never a tinted plate. An action slot never holds an inert control. (D §5, §6)
- Motion: 80ms linear swaps, 200ms sheet rise, instant under `prefers-reduced-motion`. No springs, no route transitions. (D §7)

**Behaviour and data**

- Render the server's order; the client never sorts and never uses `localeCompare`. (U §4 LibraryBrowse, D §4)
- Nothing implies data the API lacks: no `createdAt`, due dates, genres, tags, ratings, watched state. (U §6)
- Optional fields are omitted, not null: test with `== null` or presence, never `=== null`. A detected `pictureUrl` can be `""`, so test truthiness. (U §6)
- Mutations return empty bodies: re-read the item, and patch by **replacement, never merge**. (U §6)
- Shared libraries: actions are absent, not disabled. Every long-press has a visible duplicate (Row Actions). (U §2, D §5)
- Add-flow identifying inputs (`?isbn=`, `?title=`, `?collectionId=`) travel in the query, not `location.state`. (U §3, §4)
- A detection miss is "no candidate without an error", not `length === 0`. An errored candidate renders as a note, never as a titled candidate. (U §4 AddBook, BookDetectionResults)
- Errors are inline with `role="alert"`; toasts are for confirmations only; destructive actions confirm in place. Never render `data.message`; branch on status codes, never on prose. (U §7, D §6)
- Every authenticated screen has `<main>` and an `<h1>`; a built screen's header carries its own name, not the wordmark. (U §2, §7, `routeLandmarks.test.jsx`)
- Search runs on submit, never as typed. Neither the stream nor search is windowed — measured; do not reinstate without new measurements. (U §4 Search, §7)

**Conventions and checks**

- `.jsx`, PascalCase filenames, directory roots as `index.jsx`; double quotes in JSX attributes, single elsewhere. Dev server on port 5173. Lint with Oxlint. (U §1)
- `yarn test` checks rules are declared; `yarn check:browser` checks they survive the cascade. Run both. (U §1)
- Writing or changing a guard: read U §8, *Guard-writing rules earned the hard way*, first — a new guard must be seen to fail.
- CloudFront cache headers are already correct: do not write Terraform for them. (U §7)

## Section map — `.claude/ui-v3.md`

| § | Covers |
|---|---|
| 1 Technical baseline | stack, dev port 5173, lint, the two test suites and profilers |
| 2 Information architecture | no tab bar, the header and its right slot, IA anti-patterns |
| 3 Routes | route table, `AddFlowLayout` (filing session, camera lease) |
| 4 Screen specification | one subsection per screen — read the screen you are editing |
| 5 Flows | add, lend/return, share/unshare, auth |
| 6 API constraints | what the backend does and does not return; patching is replacement, never merge |
| 7 UX guidelines | copy, errors, touch, landmarks, PWA update prompt, performance |
| 8 Status | what is built, the guards and what each enforces, guard-writing and planning rules, open items |

## Section map — `DESIGN.md`

| § | Covers |
|---|---|
| 1 Direction contract | thesis, binding disciplines |
| 2 Colour | tokens and their single meaning, contrast, black cover, ground/foreground, focus |
| 3 Typography | faces, scale, mono-for-numerals rule, caps roles and tracking, 16px inputs |
| 4 Division scale | spacing, rule weights, the shell and scroll regions, viewports, frames, plates, index alphabet |
| 5 Component vocabulary | one row per component — read the component you are editing |
| 6 State grammar | loading, empty, error, lent, shared, confirmations, action-slot rules |
| 7 Motion | the press; reduced motion |
| 8 Accessibility | targets, aria-label rules, safe areas, no orientation lock |
| 9 What this system refuses | glyphs outside the fonts, native chrome, category defaults |
