# Direction E "The Shelf" — Whole-App UI Revamp (Design Spec)

> Status: **Fully specified. Buckets #1, #2, and #3 are all decided** (Bucket #3 resolved
> by the `frontend-design` skill — see §7). Ready for implementation.
>
> Design inputs (visual source of truth):
> - `docs/ui-design/shelf.md` — Direction E design doc
> - `docs/ui-design/e-the-shelf.html` — library-stream mockup
> - `docs/ui-design/home-shelf.html` — installed-PWA icon/splash mockup
>
> Target package: `packages/web-client-v2` (React 19 + Vite 6 + Tailwind 4 + vite-plugin-pwa).

---

## 1. Goal & summary

Replace the current dark "Library at Twilight" glassmorphism theme with **Direction E
"The Shelf"**: a warm, tactile, light bookshelf aesthetic where every item and collection
rests on a drawn walnut ledge, books and films are equal "covers on a shelf," and the type
pairs Bricolage Grotesque (display/UI) with Newsreader (serif accents).

The revamp is **whole-app** and **light-only**. Because the app's screens are driven by
shared shadcn CSS variables, most of the change is delivered by **re-theming the token
layer**; the library stream and a handful of bespoke components are then restyled directly.

### Locked decisions

| Decision | Choice |
|---|---|
| Scope | **Whole app** re-theme (not just the library stream) |
| Light/dark | **Light-only** — retire the dark glass theme and `--glass-*` tokens |
| Fonts | **Self-hosted woff2** (no CDN); Bricolage Grotesque = UI/display, Newsreader italic = author/director lines, summaries, tagline |
| Motion | **Keep the full existing motion set**, re-tuned to E; gated by `prefers-reduced-motion` |
| Splash fonts | **Preload the splash woff2 in `<head>`** so the wordmark is in-brand instantly |
| Icon assets | **Author one icon SVG → generate all PNG sizes via a sharp script** |
| Component strategy | **Token-first re-theme + restyle components in place.** Keep existing filenames/component names (`BookCard.jsx`, `VideoCard.jsx`, `CollectionCard.jsx`); rebuild internals. No new `ShelfItem`/`CollectionShelf`, no merging Book/Video. |
| Navigation safety rule | **Tap/Edit routing stays in `LibraryContent`, keyed on `item.type`.** Cards are presentation-only and just call `onClick(item)`/`onLongPress(item)`. Book → `/books/:id`, Video → `/videos/:id` is preserved exactly. |

### Workflow note

Per user direction, the step **after** this spec is the **`frontend-design` skill** (to
resolve Bucket #3 and execute the visuals), not `writing-plans`. An implementation plan can
still be produced afterward.

---

## 2. Theme & token layer (`src/index.css`)

Replace the dark token values with E's warm-light palette, **reusing the existing shadcn
variable names** so every screen inherits the new look without per-page rewrites.

| Variable | New value (E) | Was (dark) |
|---|---|---|
| `--background` | linen `#f3ecdd` | deep twilight |
| `--foreground` | ink `#2c2820` | near-white |
| `--card` / `--card-foreground` | cream `#faf5ea` (**opaque**) / ink | semi-transparent glass |
| `--popover` / `--popover-foreground` | cream / ink | glass |
| `--primary` / `--primary-foreground` | burnt sienna `#bb5a33` / cream | violet |
| `--secondary` / `--secondary-foreground` | deep green `#3f6157` / cream | purple-grey |
| `--muted` / `--muted-foreground` | warm sand / `#7d7361` | grey |
| `--accent` / `--accent-foreground` | warm hover tint / ink | brighter purple |
| `--destructive` | warm red that reads on linen | dark red |
| `--border` | hairline `#e0d6bf` | glowing |
| `--input` / `--ring` | warm input / sienna focus ring | dark |
| `--radius` | `1rem` (cards ~16px); covers use explicit 4px | 0.75rem |
| **new** `--wood` / `--wood-d` | `#a07c4f` / `#7c5d38` (shelf ledge gradient) | — |
| **new** `--shelf-shadow` | soft warm low drop shadow for covers on ledge | — |

Additional token-layer work:
- **Background mesh:** replace the dark `body::before` purple/blue radial glows with E's
  warm **linen → oat** gradient (subtle, per mockup). Keep it cheap (static gradient).
- **Shadows:** retune `--card-shadow` / `--card-shadow-hover` from cool `oklch(0 0 0 / .3)`
  glass shadows to **soft warm low** drop shadows.
- **Retire** `--glass-bg`, `--glass-border`, `--glass-blur`, `--accent-glow` and the
  `.light` block (light becomes the only theme — fold its good values into `:root`).
- **Lent indicator:** remove the old diagonal `.lent-ribbon` overlay. Lent (and shared) status
  is shown via the "Circulation Card" markers — see §8.
- **Fonts:** define `--font-display: "Bricolage Grotesque"` and a serif accent
  `"Newsreader"`. Load both as **self-hosted woff2** with `font-display: swap`
  (e.g. `@fontsource/...` or woff2 files under `public/fonts/` + `@font-face`). Set
  `body { font-family: var(--font-display) }` so UI text is Bricolage by default; apply
  Newsreader italic via a utility/class on author lines, summaries, and the tagline.

---

## 3. The library stream & its components

### 3.1 `pages/LibraryContent.jsx`

- **Data flow unchanged.** The backend returns the pre-sorted, interleaved array
  (standalone items + collections). Render in returned order; never re-group or re-sort.
- **Add passive sticky letter headers** (new, derived client-side):
  - As pages append via infinite scroll, walk the rendered `items`; when the first
    sort-letter of an item's title changes, inject a sticky `LetterHeader` divider before it.
  - Render E's large faint **ghost letter** behind the divider (`::before { content: attr(data-l) }`).
  - **Passive label only** — `role="separator"`, no jump/scroll behavior. (A–Z scrubber stays
    out of scope per `shelf.md §6`.)
  - Collection sort position uses its name's first letter (consistent with backend ordering).
- Each standalone item renders on its **own full-width wood ledge**; collections render
  inline at their alphabetical slot.
- **Preserve unchanged:** `loadMoreRef` intersection sentinel, scroll-position save/restore,
  pull-to-refresh, AppBar title-tap-to-top, and all sheets
  (`ItemActionsSheet`, `AddItemSheet`, `CollectionActionsSheet`, `NewCollectionSheet`) and
  their handlers (`handleAction`, lend/return/delete, collection CRUD).
- **Restyle states** to the warm theme: initial loader, "loading more" indicator, error
  state, and the `EmptyBookshelf` empty state.

### 3.2 `components/BookCard.jsx` & `components/VideoCard.jsx` (rebuilt in place, names kept)

- New layout: **cover standing at the left of a full-width walnut ledge**, casting a soft
  drop shadow (`--shelf-shadow`) onto the drawn ledge; info column fills the remaining width.
- **Title** in Bricolage (prominent). **Secondary line** in Newsreader italic:
  - `BookCard`: `authors` joined.
  - `VideoCard`: `dir. <first director> · <releaseYear>`.
- **No medium glyph, no "Novel / Film · DVD" label.** Medium is conveyed by the cover art
  (and the `dir.` prefix). Expose medium to assistive tech via `aria-label` (e.g. "Akira, film").
- Cover radius is **squared and identical across media** (media-equality, per `shelf.md §2`
  "covers 4px, book-like, squared"): standalone covers use `4px 4px 2px 2px` (tighter base
  where the cover meets the ledge); collection members use a flat `4px`. "Book-ness" is
  carried by cover art (and optionally a spine sheen overlay), **not** by corner geometry —
  the earlier per-type radii (book asymmetric / video rounded) were dropped on design-authority
  review. Fallback icons stay `BookOpen` / `Film`.
- **Lent state:** an amber **date-due slip** (`.lent-slip`) in the meta line — `LENT` micro-caps +
  borrower in Newsreader italic. Remove the diagonal `lent-ribbon` overlay. See §8.
- **Preserve unchanged:** long-press → lift → `onLongPress(item)`; `isSelected` lift while
  the action sheet is open; staggered `fade-in-up` entry (re-tuned); `onClick(item)` → parent
  routes by type.

### 3.3 `components/CollectionCard.jsx` (rebuilt in place, name kept)

- New look: a **wide wooden board / shelf**. Header shows the collection **name**, a
  sub-line, and a **count badge `⌗ {itemCount}`** using the true denormalized `itemCount`.
- Members = covers **standing on the shelf**, horizontal momentum scroll, hidden scrollbar,
  right-edge fade — as today. Keep per-item order badge.
- **Pending members** (`itemCount − items.length`) render as E's **ghost covers** (hatched
  placeholders) instead of the current shimmer skeletons; `partial`-split collections still
  fill in as more pages load.
- **Preserve unchanged:** `onItemClick`, `onItemLongPress`, `onMorePress`, and the collection
  unfold animation (re-tuned).

---

## 4. Whole-app coverage plan

### Bucket 1 — Inherit the theme for free (verify only, no design work)

These screens use only shadcn tokens + `components/ui/*` primitives, so they flip to
light/warm automatically when §2 lands. Action: **smoke-test each and fix stray dark
hardcodes** (e.g. `text-amber-*`, cool `rgba(0,0,0,…)` shadows, any `oklch(0 0 0 …)`).

`Login`, `SignUp`, `PendingApproval`, `Libraries` (page chrome), `NewLibrary`, `EditLibrary`,
`UnshareLibrary`, `NewBook`, `EditBook`, `NewVideo`, `EditVideo`, `AddBook`, `AddVideo`,
`BookDetectionResults`, `VideoDetectionResults`, `ItemHistory`, `Settings`, `About`, `Account`.

### Bucket 2 — Mechanical "glass → wood/solid" restyle (one consistent rule, no mockup)

| Component | Change |
|---|---|
| `navigation/BottomTabs.jsx` | Glass pill → E's floating **dark pill** nav (`shelf.md §3.6`); active tab uses sienna. |
| `components/LibraryCard.jsx` + `pages/Libraries.jsx` | Revamped from a 2-col tile grid to **full-width "shelf-section" rows** (continuous with the item stream). Each row: a deterministic **spine cluster** (`components/SpineCluster.jsx`, colors/heights hashed from the library name — libraries have no cover art) standing on a full-width walnut ledge, the **name** (Bricolage) + an item-count sub-line (Newsreader italic, `N items` from `totalItems`; no books/films breakdown exists). Sharing is signalled in **deep green** (`--secondary`), never sienna, via the §8 markers: a library I shared **out** → top-right hollow `SHARED · N` **stamp** (`.share-stamp`); a library shared **with me** → left-edge green **ribbon** (`.share-ribbon`, notched tail) + a `Lent to you` micro-caps label and a *from `<owner>`'s library* sub-line (Newsreader italic, muted spines). Sections "My Libraries" / "Shared with me" kept, headers restyled as rule lines. Long-press (owned only) preserved. |
| `components/BottomSheet.jsx` + sheets (`AddItemSheet`, `ItemActionsSheet`, `LibraryActionsSheet`, `CollectionActionsSheet`, `CollectionPickerSheet`, `NewCollectionSheet`) | Surface from glass → **cream panel**; warm handle, hairline borders, sienna primary actions. |
| `components/EmptyBookshelf.jsx` | Recolor illustration strokes to the warm palette. |
| `components/Toast.jsx`, `components/PullToRefresh.jsx`, `components/PWAUpdatePrompt.jsx` | Verify against warm tokens; fix any dark-specific values. |

**Rule applied across Bucket 2:** remove `backdrop-blur`, replace `--glass-*` usage with
`--card` / `--border`; replace cool shadows with `--shelf-shadow`; primary accents → sienna.

---

## 5. Typography, motion & accessibility

### Typography
- **Bricolage Grotesque** = all UI chrome (titles, labels, buttons, form fields, nav, body).
- **Newsreader italic** = author/director lines, item summaries (reading text), the splash
  tagline. Applied via a dedicated class, not the global body font.
- Self-hosted woff2, `font-display: swap`. Weights: Bricolage 600/700/800; Newsreader 400
  regular + 400 italic (and the optical-size axis if using the variable font).

### Motion (keep full set, re-tuned; all gated by `prefers-reduced-motion`)
- Staggered `fade-in-up` on stream entry (~80ms cascade).
- Long-press **lift** on cards (warm shadow instead of glow).
- Collection **unfold** (staggered member reveal).
- Tab **slide** transitions.
- **New:** detail-page cover **"settle"** onto the shelf on load (subtle drop + shadow bloom),
  then info staggers in beneath (see Bucket 3 hero).
- `prefers-reduced-motion`: disable stagger/entry/unfold/settle; keep static states only.

### Accessibility
- Medium is visual-only on cards → always expose via `aria-label` ("Akira, film" / "Dune, book").
- Letter dividers: `role="separator"` with accessible text.
- **Contrast:** verify sienna `#bb5a33` and green `#3f6157` on linen/cream meet WCAG AA for
  text and UI; treat decorative warm glows as decoration only, never the sole carrier of meaning.
- Lent/shared status conveyed by **form** (slip / stamp / ribbon) + text, not colour alone (see §8).
- Preserve focus styles via the sienna `--ring`.

---

## 6. PWA identity & icon-asset pipeline

> Visual source of truth: `docs/ui-design/home-shelf.html`. **Brand mark:** three covers
> standing on a shelf. (Final visual treatment is a Bucket-3 open question — see §7.)

### Icon SVG → PNG pipeline
- Author the icon as a single source **SVG** (vector) under e.g. `assets/icon/alexandria-icon.svg`
  (and a maskable variant with full-bleed background, or a `padding`/safe-zone parameter).
- A small **sharp** Node script (e.g. `scripts/generate-icons.mjs`, run via a `package.json`
  script) renders all required raster sizes into `public/`:
  - `logo144.png` (144), `logo180.png` (180, iOS `apple-touch-icon`), `logo192.png` (192),
    `logo512.png` (512), and the **maskable 512** (background fills the full bleed; mark in
    the centre **80%** safe zone).
  - `favicon-16x16.png`, `favicon-32x32.png`. (`favicon.ico` regenerated in the same script
    via an ico encoder, or left as-is if encoding is impractical — note in the build script.)
- sharp is already a dependency elsewhere in the repo (`functions/images-processing`); add it
  as a dev dependency to the web package for this script.

### Splash (`index.html`, inline CSS)
- Cream radial background (`#f7f0e1 → #e0d1ad`).
- Centred: app icon, wordmark **"Alexandria"** (Bricolage 800), a short **walnut rule**, and
  the existing tagline **"Your personal wonder"** (Newsreader italic). **Tagline text must not change.**
- **Preload** the splash woff2 (Bricolage 800 + Newsreader italic) in `<head>` so the wordmark
  renders in-brand immediately (decided in §1).
- Update `#splash` colors from dark `#1a1a2e` to the cream palette; keep the fade-out + min
  display behavior and `#splash-build`.

### Manifest & meta
| Where | Key | New value |
|---|---|---|
| `vite.config.js` manifest | `theme_color` | `#bb5a33` |
| `vite.config.js` manifest | `background_color` | `#f3ecdd` |
| `vite.config.js` manifest | `name` / `short_name` / `display` / `orientation` | unchanged (Alexandria / Alexandria / standalone / portrait) |
| `vite.config.js` manifest | `icons` | point at regenerated PNGs (192 / 512 / maskable 512) |
| `index.html` | `<meta name="theme-color">` | `#bb5a33` (was `#1a1a2e`) |
| `index.html` | `apple-mobile-web-app-status-bar-style` | light-appropriate (e.g. `default`) instead of `black-translucent` |
| `index.html` | `<link rel="apple-touch-icon">` / favicons | point at regenerated assets |

> CLAUDE.md PWA cache-header guidance (no-cache app shell, immutable hashed assets) is already
> handled at the infra layer and is **out of scope** for this revamp.

---

## 7. Bucket 3 — Resolved design decisions (was: open questions for `frontend-design`)

> **Resolved 2026-06-14.** These four screens had no mockup; the `frontend-design` skill
> resolved them below. They are now **decisions**, not recommendations.

### 7.1 Book/Video detail-page hero → "The reading table"
Replace the saturated **cover-color gradient hero + mirror reflection** (a generic
media-app cliché) with the cover as a **physical object on a lit walnut ledge**:
- Cover stands **large, centered, on a full-width walnut ledge** (front-edge highlight + faint
  grain), casting a soft drop shadow *onto the wood*. Cover radius is squared and identical for
  books and films (`6px 6px 3px 3px` at hero scale) — no per-type radius.
- **Keep `lib/colorExtractor.js` but demote it:** the extracted color becomes only a **faint
  warm halo** behind the cover — washed ~85% toward linen via `color-mix`, opacity ≤ 0.22.
  Never a band. Remove `createCoverGradient`'s saturated usage and the reflection block.
- Below the ledge: title in **Bricolage**; author / `dir.` in **Newsreader italic**; details in
  a **cream "card on the table"** (hairline border, no glass). Lent → amber **date-due slip** tucked at the cover's lower edge (`.lent-duecard`, see §8).
- **Signature load moment:** the cover **"settles"** — drops ~10px while its shadow blooms
  (~250ms ease-out) — then title/author/meta **stagger up** beneath (~60ms cascade). Gated by
  `prefers-reduced-motion`.

### 7.2 Search spotlight → "The card index" (`pages/Search.jsx`)
Reframe the dark-glass overlay into a warm catalog search; **results look like the shelf itself**:
- Search bar = a **cream catalog card**: sienna search glyph, Newsreader-italic placeholder
  *"Search your shelves…"*, soft inset paper shadow, sienna focus ring.
- Recent searches = **catalog tags** (cream pills, sienna left tick, Newsreader) — not glass chips.
- **Results reuse the new on-ledge `BookCard`/`VideoCard` layout** so search feels like the same
  shelf; library name as a small footnote (keep Library/Users icons). Result count in Newsreader italic.
- Empty state: quiet line-art shelf glyph + Bricolage "Search your shelves." Keep
  `ItemActionsSheet` wiring untouched; lent indicator → inline amber **date-due slip** (`.lent-slip`, see §8).

### 7.3 Onboarding → "Turning pages" (`components/Onboarding.jsx`)
- Recolor the four slides from the violet/blue/emerald/amber rainbow into **one warm family**:
  linen base with a subtle per-slide tint (sienna → ochre → green → walnut). One coherent
  palette, not four hues.
- Fallback icon medallion: **cream with a walnut hairline + sienna icon** (no glass). Headings
  Bricolage 800, body Newsreader. Active progress dot + primary button → **sienna**.
- Verify the Lottie files read on a light canvas; recolor/swap any built light-on-dark. Keep
  swipe + the existing slide transition (reads as a page turn).

### 7.4 App icon → cream-radial, three covers on a walnut shelf
**Decision:** the cream-radial **three-covers-on-a-walnut-shelf** mark (per `home-shelf.html`).
Chosen over solid-sienna (reads generic/utility, fights other warm icons) and an "A" monogram
(loses the shelf signature). Covers-on-a-shelf says *collection* instantly and the varied spine
colors carry media-equality.
- Spines sienna `#cf6a3c` / green `#4a6f5f` / ochre `#d09636` on a walnut bar (thin top
  highlight); cream radial bg `#fbf5e8 → #e7d9ba`; mark within the centre **80%** safe zone;
  maskable variant fills cream to full bleed.
- Memorability refinement: the shelf casts a faint shadow and the centre spine gets a tiny
  page-edge notch, so it reads as *objects on a shelf* even at 48px.

---

## 8. Status markers — the "Circulation Card" system

> Visual source of truth: [`status-markers.html`](../../ui-design/status-markers.html).

Item/library status is shown as **library ephemera applied to a shelved object** — small printed
artifacts sharing one type system (Bricolage uppercase micro-caps via `.ephemera-caps`, a hairline,
the human/name part in Newsreader italic, a faint "placed by hand" tilt) but a **different physical
form** per meaning, so they never blur (form carries meaning, colour reinforces):

| Meaning | Artifact | Form | Colour |
|---|---|---|---|
| **Lent** (a loan in time) | date-due **slip** (`.lent-slip`; tab variant `.lent-tab`; hero `.lent-duecard`) | filled, **perforated dashed top edge**, square 2px corners, ~−1.5° tilt | amber `--lent` / `--lent-bg` |
| **Shared out** (a copy you lend) | ink **stamp** (`.share-stamp`) | **hollow** outlined rounded-rect, no fill, ~−2° tilt | green `--secondary` |
| **Shared with me** (a library lent to you) | spine **ribbon** (`.share-ribbon`) | left-edge ribbon with a notched/forked tail (`clip-path`) | green `--secondary` |

Wording is **"Lent"** everywhere (not "Out" / "On loan").

**Per surface:**
- `BookCard` / `VideoCard` meta line — inline `.lent-slip`: `LENT` + divider + borrower in Newsreader italic.
- `CollectionCard` thumbnail (64px) — `.lent-tab` corner tab reading `LENT`, overhanging the cover's top edge (no borrower — no room).
- `BookDetail` / `VideoDetail` hero — `.lent-duecard` tucked at the cover's lower edge: `LENT` / `to <name>` (no since-date; the lend date isn't on the item object).
- `ItemHistory` open loan — `.lent-slip` `LENT · <N> days` at the row end + the amber binding-edge border; closed loans keep the calm green duration pill; ledger meta uses `lent <date> · back <date>`.
- `Search` results — inline `.lent-slip` (drops the old lucide arrow icon).
- `LibraryCard` — shared out → `.share-stamp` `SHARED · N` top-right (replaces the filled pill + `Users` icon); shared with me → `.share-ribbon` left edge + `Lent to you` micro-caps + *from <owner>'s library* (Newsreader italic).

**Tokens:** reuses `--lent` / `--lent-bg` / `--secondary` (no new colours). Net-new `index.css` utilities:
`.ephemera-caps`, `.lent-slip` (+ `.lent-slip__div`), `.lent-tab`, `.lent-duecard`, `.share-stamp`, `.share-ribbon`.
The old `.lent-chip` is removed; the round `LENT` pill, the filled green `Shared · N` pill, and the
lucide `Users` / lent-arrow icons are dropped.

### 8.1 Icon set (lucide-react)

Icons stay **lucide-react**; a small set was retuned toward a bookish/circulation read, the rest
kept standard. Visual source: [`icons.html`](../../ui-design/icons.html). (Custom inline-SVG icons
were prototyped in [`custom-icons.html`](../../ui-design/custom-icons.html) but **not adopted** —
lucide retained for consistency/maintenance.) Final picks:

- Book entity `BookOpen` → `Book`; **collection → `Layers`** everywhere (entity, picker, Add-Item
  sheet, onboarding); edit `Pencil` → `PencilLine`.
- Lend `ArrowRightFromLine` → `BookUp`; return `Undo2` → `BookDown`; history `History` → `Stamp`.
- Camera-unavailable `VideoOff` → `CameraOff`; recent-searches `Clock` → `History`;
  pending-approval `Clock` → `Hourglass`.
- Onboarding: welcome `Book` → `BookOpen`, add `ScanBarcode` → `BookPlus`, collections → `Layers`.
- Add-Item sheet uses **parallel entity icons** (`Book` / `Film` / `Layers`); the "+" affordance
  lives on the AppBar button that opens it.
- Kept standard (universal affordances): chevrons, search, plus, trash-2, share-2, users,
  user-minus, more-horizontal, scan-barcode, camera, pen-line, user, log-out, copy, info,
  library / library-big, refresh-cw, calendar, clock (duration), hash, loader-2, eye/eye-off, x,
  check/check-circle, alert-circle/alert-triangle.

## 9. File-change inventory

**Theme / shell**
- `src/index.css` — token re-theme, fonts, mesh, shadows, retire glass/`.light`, lent restyle.
- `index.html` — splash recolor + font preload, meta theme-color, status-bar style, icon links.
- `vite.config.js` — manifest `theme_color`/`background_color`/icons.
- `public/fonts/*` (or `@fontsource` deps) — self-hosted woff2.
- `assets/icon/alexandria-icon.svg` + `scripts/generate-icons.mjs` + regenerated `public/logo*.png`, favicons.

**Library stream (Buckets covered above)**
- `src/pages/LibraryContent.jsx` — passive letter headers + warm states.
- `src/components/BookCard.jsx`, `VideoCard.jsx`, `CollectionCard.jsx` — rebuilt in place.
- new `src/components/LetterHeader.jsx` (passive sticky divider).

**Bucket 2**
- `src/navigation/BottomTabs.jsx`, `src/components/LibraryCard.jsx`,
  `src/components/BottomSheet.jsx` + sheets, `EmptyBookshelf.jsx`, `Toast.jsx`,
  `PullToRefresh.jsx`, `PWAUpdatePrompt.jsx`.

**Bucket 3 (deferred to `frontend-design`)**
- `src/pages/BookDetail.jsx`, `VideoDetail.jsx`, `Search.jsx`,
  `src/components/Onboarding.jsx`, `src/lib/colorExtractor.js` (usage), final icon SVG art.

**Docs**
- Update `.claude/ui-v2.md` (tech stack fonts, theme description, progress) after implementation.

---

## 10. Acceptance criteria

- App renders in the warm E light theme on every route; no dark-glass remnants
  (`--glass-*` removed; no stray `backdrop-blur` / cool shadows / dark hardcodes).
- Library stream: single interleaved A–Z stream; standalone items on full-width wood ledges;
  collections as wide boards with `⌗` count badges, horizontal member scroll, and ghost covers
  for pending members; passive sticky letter headers with ghost letters.
- Tapping a book opens the book detail route; tapping a video opens the video detail route;
  Edit routes to the correct edit page — i.e. type-based routing in `LibraryContent` intact.
- Bricolage loads for UI, Newsreader italic for author/director/summary/tagline; both
  self-hosted; splash wordmark in-brand via preload.
- Motion set preserved and re-tuned; fully suppressed under `prefers-reduced-motion`.
- PWA: regenerated icons (incl. maskable 512 with 80% safe zone), cream splash, manifest
  `theme_color #bb5a33` / `background_color #f3ecdd`, light status bar.
- a11y: medium exposed via `aria-label`; letter dividers as separators; sienna/green text meet
  WCAG AA on linen/cream.
- Bucket #3 screens are explicitly left for the `frontend-design` pass (not regressed: they
  still function on the new tokens even before their bespoke redesign).

---

## 11. Out of scope

- A–Z jump scrubber (needs backend cursor — `shelf.md §6`).
- Sort options / "collections only" filter.
- Direction I "The Glass Shelf" (dark mode) — possible future second skin.
- Backend / API changes.
- CloudFront cache-header configuration (already handled at infra layer).
