# Direction E — "The Shelf"

> Visual source of truth: [`e-the-shelf.html`](./e-the-shelf.html) (phone-framed mockup).
> This document is the design input for implementing the new Library Content UI in
> `packages/web-client-v2`. It describes the concept, aesthetics, UI structure, UX
> behaviour, and the rules for mapping the existing backend/data model onto it.

---

## 1. Concept

A warm, tactile **bookshelf** that holds your whole collection. The defining idea is
**media equality**: a book and a film are the *same kind of object* — a cover standing
on a shelf. We never dress the app in a single medium's costume (no "card catalogue",
no "cinema"). Books and DVDs simply share the shelf.

Tone: modern-literary, warm, hand-made-but-clean. Not vintage, not "dusty museum".

> Companion direction: **I — The Glass Shelf** (`glass-shelf.md`) is the *same layout
> and UX* rendered in edge-lit glass on a dark canvas. E and I are deliberately
> interchangeable skins over one structure; keep them in sync.

---

## 2. Aesthetics

| Token | Value / intent |
|---|---|
| Mode | **Light**, warm |
| Background | Linen / oat gradient (`#f3ecdd → #d9cdb0`) |
| Surface | Card `#faf5ea`, hairline `#e0d6bf` |
| Ink | `#2c2820`, muted `#7d7361` |
| Accent | Burnt sienna `#bb5a33` (primary), deep green `#3f6157` (secondary) |
| Shelf material | **Walnut wood ledge** (`#a07c4f → #7c5d38`), thin, under every item/collection |
| Display type | **Bricolage Grotesque** (700–800) — characterful modern grotesque |
| Body / serif | **Newsreader** (italic for author lines) — literary warmth |
| Radius | Cards ~16px; covers 4px (book-like, squared) |
| Shadow | Soft, warm, low — covers cast a short drop shadow onto the ledge |
| Motion | Staggered fade-in-up on entry (~80ms cascade); subtle press feedback |

**Signature element:** the **wooden ledge**. Every standalone item and every collection
rests on a drawn walnut shelf edge, so the whole list reads as physical shelving.

Covers are the hero. The covers in the mockup are colour placeholders; in production
they are the real S3/CloudFront thumbnails. Let cover art breathe — minimal chrome on top.

---

## 3. Layout & UI structure

### 3.1 The stream (shared rule — critical)
The library content is **one single alphabetical vertical stream** that **interleaves**
standalone items and collections. There is **NO** "collections on top, standalone below"
split. A collection appears at its own alphabetical position (by collection name);
standalone books/films appear at theirs.

Vertical scrolling moves through the stream. **Horizontal scrolling exists only *inside*
a collection.**

### 3.2 Header
- App/section title ("The Shelf, *everything on it.*"), Bricolage display + Newsreader italic.
- Stat row: counts (e.g. `173 books · 75 films · 7 sets`). **Plain text, no medium glyph.**
- Safe-area top padding (PWA notch): `pt-[max(1rem,env(safe-area-inset-top))]`.

### 3.3 Passive sticky letter headers
- A small sticky letter divider (`A`, `D`, `K`, …) marks where each alphabetical run begins.
- **Passive only**: derived client-side from already-loaded items as infinite scroll
  appends pages. They *label*; they do **not** navigate.
- A tappable A–Z jump scrubber is explicitly **out of scope** (backend cannot start a
  page at an arbitrary letter — see §6).

### 3.4 Standalone item = one full-width shelf
- **One item per shelf.** The shelf (wood ledge) spans the **full content width**.
- The single cover **stands at the left** of the ledge; the info fills the space to its right.
- Info: **title** (Bricolage, prominent), **author / director** (Newsreader italic; films
  use a `dir.` prefix), and a meta line (year, edition).
- **No medium glyph and no "Novel / Film · DVD" label.** Medium is communicated by the
  cover art itself (and the `dir.` prefix on films). Books and films use the identical card.
- **Lent state:** a warm chip `Lent to <name>` in the meta line.

### 3.5 Collection = wide shelf, members scroll horizontally
- A collection is a labelled **board** on a wide wooden shelf.
- Header: collection **name**, a sub-line (e.g. `novels & films together · 4 of 6`), and a
  **count badge** showing the true `itemCount` (`⌗ 6`). No medium glyph in the badge.
- Members are covers **standing on the shelf**, scrolling **horizontally** for large sets.
- A collection **may mix media** (the canonical demo: a "Dune" set holding the novels *and*
  the films). This is a first-class case, not an edge case.
- **Pending / partial members:** when the page carries fewer members than `itemCount`,
  render **ghost covers** (hatched placeholders) for the remainder. If the collection is
  split across a pagination boundary (`partial: true`), it continues seamlessly as more
  pages load.

### 3.6 Bottom navigation
- Floating dark pill: **Library · Search · Account**. No medium glyph.
- Safe-area bottom padding.

### 3.7 States
- **Loading more:** an inline "reaching for the next shelf…" sentinel triggers the next page.
- **Skeletons:** ghost covers for pending collection members; shimmer rows acceptable for
  first load.
- **Empty library / empty collection:** friendly shelf-empty message (copy TBD at build).

---

## 4. Data → UI mapping (backend reality)

Source: `GET /libraries/{libraryId}/items` (`ListLibraryItems`) returns a mixed,
already-ordered array of `GetBookResponse | GetVideoResponse | GetCollectionWithItemsResponse`.

| Backend fact | UI consequence |
|---|---|
| Single interleaved, alphabetically-sorted array | Render in returned order; do **not** re-group or re-sort client-side |
| Collection sorts by its **name**; members nested in `items` | Collection renders inline at its letter; members are its horizontal row |
| `itemCount` = true size; `items` may be a subset on this page | Count badge uses `itemCount`; render `itemCount − items.length` ghost covers |
| `partial: true` (collection split across page boundary) | Collection continues across pages; ghosts fill until members arrive |
| `nextToken` pagination | Infinite scroll via intersection observer on the sentinel |
| Default page size 10, max 50 | Keep current paging; covers lazy-load |
| `lentTo` | Lent chip |
| Books vs Videos share `GetItemResponseBase` | One shared cover card; only `dir.`/author differ |

---

## 5. UX guidelines

- **Tap a cover/row → detail** (BookDetail / VideoDetail).
- **Long-press an owned item → action sheet** (Edit, Lend/Return, Delete) — preserve the
  existing `ItemActionsSheet` behaviour.
- **Shared (read-only) libraries:** no add button, no long-press actions; header notes the
  owner. Lent chips still visible.
- **Scrolling:** vertical for the stream; horizontal **only** inside a collection row.
  Horizontal rows must use momentum scrolling and hide scrollbars; show a soft right-edge
  fade / "swipe →" affordance when overflowed.
- **Pull-to-refresh** resets to the first page (keep existing component).
- **Scroll restoration:** preserve per-library scroll position (existing behaviour).
- **Cover busting:** use `updatedAt` as cache-buster (`?v={timestamp}`).
- **Accessibility:** medium is conveyed visually only, so expose it to assistive tech via
  `aria-label` (e.g. "Akira, film" / "Dune, book") even though no on-screen label is shown.
  Letter dividers should be `role="separator"` / visually-hidden text as needed.
- **Reduced motion:** respect `prefers-reduced-motion` — disable stagger/entry animation.
- **Performance:** lazy-load cover images; cap concurrent decodes; reserve cover aspect
  ratio (5:7) to avoid layout shift.
- **PWA:** safe-area padding on header and bottom nav; `viewport-fit=cover`.

---

## 6. Out of scope / needs backend

- **A–Z jump scrubber** (tap a letter to jump): requires a backend cursor that can start a
  page at an arbitrary prefix/letter. Not available today. Passive letter headers ship now;
  the scrubber is a future enhancement gated on that capability.
- **Sort options / "collections only" filter:** not part of this direction (the stream is a
  single interleaved A–Z list by design).

---

## 7. Component mapping (`packages/web-client-v2`)

Restyle, don't re-architect:
- `pages/LibraryContent.jsx` — the interleaved stream, sticky letters, infinite scroll.
- `components/BookCard.jsx`, `components/VideoCard.jsx` — the shared standalone "item on a
  shelf" card (collapse stylistic differences; medium-agnostic).
- `components/CollectionCard.jsx` — the wide shelf with horizontal member row + ghost covers.
- Theme tokens in `src/index.css` — replace the current palette/typography with the E tokens
  in §2 (load Bricolage Grotesque + Newsreader).

---

## 8. Installed-PWA identity (icon · splash · manifest)

> Visual source of truth: [`home-shelf.html`](./home-shelf.html).

**Brand mark (shared concept with I):** *three covers standing on a shelf.* Reads as
"a collection", legible at 48px, and the varied cover colours quietly signal mixed media —
no book/disc glyph needed (consistent with the in-app decision to drop it).

### App icon — "The Shelf"
- **Background:** warm cream radial (`#fbf5e8 → #e7d9ba`).
- **Mark:** three spines (sienna `#cf6a3c`, green `#4a6f5f`, ochre `#d09636`) of varied
  height standing on a **walnut shelf** bar (`#a9824f → #7c5d38`) with a thin top highlight.
- **Safe zone:** keep the whole mark within the centre **80%** so the Android maskable /
  circular crop never clips it (see the circular preview in the mockup).
- **Exports:** rounded-square art → iOS `apple-touch-icon` (180); plus `192`, `512`, and a
  **maskable 512** (cream fills the full bleed).

### Launch splash — "The Shelf"
- Cream radial background (`#f7f0e1 → #e0d1ad`).
- Centred: the app icon, the wordmark **“Alexandria”** (Bricolage Grotesque 800), a short
  walnut rule, and the existing tagline **“Your personal wonder”** (Newsreader italic).

### Manifest values
| Key | Value |
|---|---|
| `name` / `short_name` | Alexandria / Alexandria |
| `background_color` | `#f3ecdd` (splash background) |
| `theme_color` | `#bb5a33` (status / address bar) |
| `display` | `standalone` |
| `icons` | 192, 512, **maskable 512** |
| Tagline (splash) | **Your personal wonder** (existing — do not change) |

**Open options (not yet decided):** a bolder **solid-sienna** icon background for stronger
contrast on busy wallpapers; an **“A” monogram** worked into the shelf instead of the pure
covers-on-shelf mark.
