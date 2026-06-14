# Direction I — "The Glass Shelf"

> Visual source of truth: [`i-glass-shelf.html`](./i-glass-shelf.html) (phone-framed mockup).
> This document is the design input for implementing the new Library Content UI in
> `packages/web-client-v2`. It describes the concept, aesthetics, UI structure, UX
> behaviour, and the rules for mapping the existing backend/data model onto it.

---

## 1. Concept

Browse your collection by **lamplight**, in the dark, on **edge-lit glass shelves**. The
covers glow against a flat, neutral charcoal; each shelf is a clear glass pane whose front
edge catches the light. It is the premium, modern, "after-dark" counterpart to **E — The
Shelf**: identical layout and UX, different material.

The defining idea is the same **media equality** as E: a book and a film are the same kind
of object — a cover standing on a shelf. No medium costume; books and DVDs share the glass.

> **Not glassmorphism.** This is *literal glass shelving* (a clear pane + a lit leading
> edge + soft float shadow), deliberately distinct from the frosted translucent-card
> "glassmorphism" the previous app used and that we are moving away from.

> Companion direction: **E — The Shelf** (`shelf.md`) is the warm/wood, light-mode skin of
> the same structure. Keep E and I in sync.

---

## 2. Aesthetics

| Token | Value / intent |
|---|---|
| Mode | **Dark**, flat neutral (no blue/purple tint) |
| Background | `#0d0d0f` |
| Surface | `#161619`, secondary `#1d1d21`, hairline `#2a2a30` |
| Ink | `#f3f2ef`, muted `#8a8a92` |
| Accent | **Electric lime** `#cdf24a` (UI/primary). Coral `#ff7a59` reserved for *lent* and as the secondary media-pair colour |
| Shelf material | **Edge-lit glass:** transparent pane (subtle white gradient) with a bright white/lime **leading edge** + soft blurred float shadow beneath |
| Display type | **Sora** (700–800) — modern geometric |
| Body type | **Inter Tight** (400–600) |
| Radius | Covers 9px top / 2px bottom (sit flat on glass); cards/pills 11–20px |
| Cover bloom | Each cover casts a soft halo of **its own dominant colour** into the dark |
| Texture | Film **grain + vignette** overlay for cinematic depth |
| Motion | Slow "lamp" breathing glow; staggered entry; press lift |

**Signature elements (the "bells & whistles"):**
1. **Cover bloom** — covers glow their own colour. In production, derive the glow colour
   from the cover via the existing `lib/colorExtractor.js`.
2. **Lamplight pool** — a warm amber/lime radial glow breathing slowly at the top of the
   screen, fading to black (the "nightstand lamp"). ~5.5s loop.
3. **Lit glass edge** — the bright white/lime line along each shelf front; this single
   detail is what sells "glass". Keep it crisp.
4. **Film grain + vignette**, **ghost letters** behind the sticky dividers, lime-glow on the
   collection count badge / active nav / "glass" in the masthead, coral-glow lent chip.

---

## 3. Layout & UI structure

### 3.1 The stream (shared rule — critical)
One **single alphabetical vertical stream** that **interleaves** standalone items and
collections. **No** "collections-on-top / standalone-below" split. A collection appears at
its own alphabetical position (by name); standalone items at theirs. Vertical scroll moves
through the stream; **horizontal scroll exists only inside a collection.**

### 3.2 Header
- Masthead "On the **glass.**" (Sora; "glass." in glowing lime). Small lime "lamp" dot in eyebrow.
- Stat pills: `173 books · 75 films · 7 sets` with lime/coral dots (books = lime, films =
  coral). **No medium glyph.**
- Safe-area top padding (PWA notch).

### 3.3 Passive sticky letter headers
- Sticky letter divider per alphabetical run, with a large faint **ghost letter** behind it.
- **Passive only** (client-derived from loaded items). They label, they do not navigate.
- Tappable A–Z jump scrubber is **out of scope** (see §6).

### 3.4 Standalone item = one full-width glass shelf
- **One item per shelf.** The glass pane spans the **full content width**.
- The single cover **stands at the left** on the lit edge; info fills the space to the right.
- Info: **title** (Sora), **author / director** (films use `dir.` prefix), meta chips
  (year, edition).
- **No medium glyph and no "Novel / Film · DVD" text.** Cover art (+ `dir.`) conveys medium.
- **Lent state:** coral `Lent · <name>` chip in the meta line (glows).

### 3.5 Collection = wide glass shelf, members float, scroll horizontally
- Header: collection **name**, sub-line, and lime **count badge** (`⌗ 6`) using true `itemCount`.
- Members are covers with their **title underneath** — the caption lifts each cover so it
  **floats just above** the wide glass shelf. Row **scrolls horizontally** for big sets.
- A collection **may mix media** (canonical demo: "Dune" = novels + films). First-class case.
- **Pending / partial members:** render **empty glass slots** (dashed, faint) for
  `itemCount − items.length`. If `partial: true`, the set continues as more pages load.

### 3.6 Bottom navigation
- Floating frosted-dark pill: **Library · Search · Account**; active tab glows lime.

### 3.7 States
- **Loading more:** a lime-tinted shimmer bar sentinel triggers the next page.
- **Skeletons:** empty glass slots for pending members; shimmer acceptable on first load.
- **Empty library / collection:** friendly empty message (copy TBD at build).

---

## 4. Data → UI mapping (backend reality)

Source: `GET /libraries/{libraryId}/items` returns a mixed, already-ordered array of
`GetBookResponse | GetVideoResponse | GetCollectionWithItemsResponse`.

| Backend fact | UI consequence |
|---|---|
| Single interleaved, alphabetically-sorted array | Render in returned order; never re-group/re-sort client-side |
| Collection sorts by **name**; members nested in `items` | Collection renders inline at its letter; members are its horizontal row |
| `itemCount` = true size; `items` may be a subset | Count badge uses `itemCount`; render `itemCount − items.length` empty glass slots |
| `partial: true` | Set continues across pages; slots fill as members arrive |
| `nextToken` pagination | Infinite scroll via intersection observer on the sentinel |
| Default page size 10, max 50 | Keep current paging; covers lazy-load |
| `lentTo` | Coral lent chip |
| Books & Videos share `GetItemResponseBase` | One shared cover card; only `dir.`/author differ |

---

## 5. UX guidelines

- **Tap a cover/row → detail** (BookDetail / VideoDetail).
- **Long-press an owned item → action sheet** (Edit, Lend/Return, Delete) — preserve existing
  `ItemActionsSheet`.
- **Shared (read-only) libraries:** no add button, no long-press actions; header notes owner.
- **Scrolling:** vertical for the stream; horizontal **only** inside a collection row
  (momentum scroll, hidden scrollbar, right-edge fade / "more →" affordance when overflowed).
- **Pull-to-refresh** resets to the first page.
- **Scroll restoration:** preserve per-library scroll position.
- **Cover busting:** `updatedAt` as cache-buster (`?v={timestamp}`).
- **Accessibility:** medium is visual-only → expose via `aria-label` ("Akira, film" / "Dune,
  book"). Ensure lime/coral and glow meet contrast as *decoration*, never as the sole carrier
  of meaning. Letter dividers exposed as separators.
- **Reduced motion:** respect `prefers-reduced-motion` — **disable the lamp animation, cover
  bloom pulse, and entry stagger**; keep static glow only.
- **Performance:** the bloom/glow must be cheap (box-shadow/`filter`, not per-frame JS);
  extract cover colour once and cache; lazy-load covers; reserve 5:7 aspect to avoid CLS;
  grain is a static overlay.
- **Dark-mode legibility:** keep the lit glass edge bright enough to read as glass; avoid the
  whole screen drowning in glow — covers glow, surfaces stay flat.
- **PWA:** safe-area padding on header and bottom nav; `viewport-fit=cover`.

---

## 6. Out of scope / needs backend

- **A–Z jump scrubber:** requires a backend cursor that can start a page at an arbitrary
  prefix/letter. Not available today. Passive letter headers ship now; scrubber is future.
- **Sort options / "collections only" filter:** not part of this direction (single
  interleaved A–Z stream by design).

---

## 7. Component mapping (`packages/web-client-v2`)

Restyle, don't re-architect:
- `pages/LibraryContent.jsx` — interleaved stream, sticky ghost letters, infinite scroll,
  lamp + grain overlays.
- `components/BookCard.jsx`, `components/VideoCard.jsx` — the shared "cover standing on glass"
  standalone card (medium-agnostic).
- `components/CollectionCard.jsx` — wide glass shelf, floating captioned members, horizontal
  scroll, empty glass slots.
- `lib/colorExtractor.js` — feed the per-cover bloom colour.
- Theme tokens in `src/index.css` — replace palette/typography with the I tokens in §2
  (load Sora + Inter Tight); add grain overlay + lamp glow primitives.

---

## 8. Installed-PWA identity (icon · splash · manifest)

> Visual source of truth: [`home-glass-shelf.html`](./home-glass-shelf.html).

**Brand mark (shared concept with E):** *three covers standing on a shelf.* Reads as
"a collection", legible at 48px, and the varied cover colours quietly signal mixed media —
no book/disc glyph needed (consistent with the in-app decision to drop it). Same mark as E,
rendered in glass: the shelf becomes the glowing lime edge.

### App icon — "The Glass Shelf"
- **Background:** charcoal radial (`#1c1c22 → #0c0c0e`) with a faint warm/lime lamp glow at top.
- **Mark:** three cover silhouettes (coral `#ff8a5a`, blue `#5f7bff`, teal `#18c2ae`, each
  with a soft colour bloom) standing on a bright **lime glass edge** (`#cdf24a` glow). The lit
  edge is the brand signature — keep it crisp and bright.
- **Safe zone:** mark within the centre **80%**; charcoal fills the full bleed so the Android
  maskable / circular crop stays seamless (see the circular preview).
- **Exports:** rounded-square art → iOS `apple-touch-icon` (180); plus `192`, `512`, and a
  **maskable 512** (charcoal bleed).

### Launch splash — "The Glass Shelf"
- Charcoal background (`#0d0d0f`) with the **lamp glow** at top + **grain/vignette**.
- Centred: the app icon (glowing), the wordmark **“Alexandria”** (Sora 800) with the tail
  set in glowing lime, a lit lime glass-edge rule, and the existing tagline
  **“Your personal wonder”**.

### Manifest values
| Key | Value |
|---|---|
| `name` / `short_name` | Alexandria / Alexandria |
| `background_color` | `#0d0d0f` (splash background) |
| `theme_color` | `#0d0d0f` (dark status bar) |
| `display` | `standalone` |
| `icons` | 192, 512, **maskable 512** |
| Tagline (splash) | **Your personal wonder** (existing — do not change) |

**Open options (not yet decided):** an **“A” monogram** worked into the glass shelf instead
of the pure covers-on-shelf mark.
