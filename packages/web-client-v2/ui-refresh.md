# Alexandria UI Refresh Plan

Modern UX enhancements for a more appealing, distinctive interface.

## Quick Reference

```
Phase 1 (Foundation)          Phase 2 (Details)           Phase 3+
─────────────────────────────────────────────────────────────────────
1.1 Dark theme ──────────┬──► 2.1 Color extraction ──► 2.2 Hero cover
1.2 Glassmorphism cards ─┘
1.3 Gradient background
1.4 Floating nav
                              2.3 Micro-interactions
                              2.4 Tab animations
                                                         3.x Layouts
                                                         4.x Advanced
```

**Recommended start**: 1.1 → 1.2 → 1.4 (biggest visual impact)

---

## Progress Log

### Phase 1 - In Progress

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Dark theme overhaul | ✅ | Deep blue-purple palette in `index.css` |
| 1.2 Glassmorphism cards | ✅ | Updated all 4 card components |
| 1.3 Gradient mesh background | ✅ | CSS ::before on body |
| 1.4 Floating nav pill | ✅ | Centered pill with sliding indicator |

#### Session Notes

**1.1 Dark theme** - Updated `index.css`:
- Dark-first design (`:root` is now dark, `.light` for light mode)
- Deep twilight palette with blue-purple undertones (hue 270-280)
- Added `--glass-*` CSS variables for glassmorphism
- Added `--accent-glow` for card hover effects

**1.2 Glassmorphism cards** - Updated components:
- `LibraryCard.jsx`: Frosted glass with backdrop-blur, glowing avatar, hover glow
- `BookCard.jsx`: Glass effect on non-compact, lifted cover shadows
- `VideoCard.jsx`: Same treatment as BookCard
- `CollectionCard.jsx`: Glass panel with subtle header, updated thumbnails

**1.3 Gradient mesh background** - Updated `index.css`:
- Added `body::before` with layered radial gradients
- Purple glow top-left, blue glow bottom-right, warm center accent
- Light mode variant with softer gradients

**1.4 Floating nav pill** - Rewrote `BottomTabs.jsx`:
- Centered floating pill design (not full-width)
- Glassmorphism effect (backdrop-blur + glass-bg)
- Sliding indicator pill that follows active tab
- Icons scale up when active
- Smaller labels (10px)

---

### Phase 1 Complete ✅

All visual foundation tasks done.

---

### Phase 2 - In Progress

| Task | Status | Notes |
|------|--------|-------|
| 2.1 Cover color extraction | ✅ | `lib/colorExtractor.js` with hook |
| 2.2 Detail page hero cover | ✅ | BookDetail + VideoDetail updated |
| 2.3 Micro-interactions | ✅ | Long press lift animation on cards |
| 2.4 Tab switch animations | ✅ | Directional slide between tabs |

**2.3 Micro-interactions** - Added to `index.css` + cards:
- `animate-card-lift`: Card rises with enhanced shadow on long press
- `animate-shimmer`: Skeleton loading effect
- Applied to LibraryCard, BookCard, VideoCard

**2.4 Tab switch animations** - Updated `Layout.jsx`:
- Tracks navigation direction between tabs
- Slides from right when moving to higher-order tab
- Slides from left when moving to lower-order tab
- Falls back to fade for non-tab routes

---

### Phase 2 Complete ✅

---

### Phase 3 - In Progress

| Task | Status | Notes |
|------|--------|-------|
| 3.1 Magazine layout | ⏭️ | Skipped - no `createdAt` field, pagination breaks "featured" logic |
| 3.2 Spotlight search | ✅ | Full-screen overlay style |
| 3.3 Stats dashboard | ⏸️ | Needs backend changes |

#### Session Notes - Phase 3

**3.1 Magazine layout** - ⏭️ Skipped:
- No `createdAt` field on items - can't determine "recently added" for hero card
- Items sorted alphabetically with pagination - "most recent" could be on any page
- Collections add complexity to layout logic
- Would require backend changes (creation date + sort options)

**3.2 Spotlight search** - Rewrote `Search.jsx`:
- Removed AppBar for full-screen overlay feel
- Floating glassmorphism search input with rounded corners + shadow
- Character count hint when typing < 3 chars
- Recent searches displayed as horizontal pill/chip buttons
- Search results in glassmorphism cards with staggered fade-in animation
- Improved empty state with centered icon in circular background
- No-results state with friendly illustration

#### Session Notes - Phase 4

**4.1 Bookshelf spines view** - ⏭️ Skipped:
- Vertical text on narrow spines is hard to read on mobile
- Users typically have few libraries (2-5) - doesn't look like a "shelf"
- High effort for novelty view with low practical value
- Current glassmorphism cards already look good
- If applied to items: pagination means incomplete shelf, no genre for grouping

**4.2 Collection unfold animation** - Updated `CollectionCard.jsx` + `index.css`:
- Items in collections animate in with staggered "unfold" effect
- Each item slides in from left with scale (like pages fanning out)
- 80ms delay between each item for smooth cascade
- Added `animate-unfold-item` keyframe animation
- Skipped deck-of-cards stack/expand (too complex, not intuitive)

## 1. Visual Identity - "Library at Twilight" Theme

**Concept**: Dark-first design with rich gradients and glassmorphism - makes book/video covers pop like jewels.

```
┌─────────────────────────────────────────┐
│ ░░░░░░░░ gradient blur header ░░░░░░░░ │
│   My Libraries                   [+]    │
│─────────────────────────────────────────│
│  ┌──────────┐  ┌──────────┐             │
│  │ 🎨 blur  │  │ 🎨 blur  │  ← frosted │
│  │  glass   │  │  glass   │    glass   │
│  │  cards   │  │  cards   │    cards   │
│  └──────────┘  └──────────┘             │
└─────────────────────────────────────────┘
```

**Implementation breakdown**:

| Sub-task | Description | Files affected |
|----------|-------------|----------------|
| 1a. Dark theme overhaul | New dark-first CSS variables, richer colors | `index.css` |
| 1b. Glassmorphism cards | Frosted glass effect with `backdrop-blur-xl` + border glow | `LibraryCard.jsx`, `BookCard.jsx`, `VideoCard.jsx`, `CollectionCard.jsx` |
| 1c. Gradient mesh background | Subtle animated gradient behind content | `Layout.jsx` or new `GradientBackground.jsx` |
| 1d. Cover color extraction | Extract dominant color from covers → card glow / page bg | New `lib/colorExtractor.js`, `BookDetail.jsx`, `VideoDetail.jsx` |

---

## 2. Navigation - "Floating Island"

**Replace rigid bottom tabs** with a floating pill that feels more organic:

```
                    ┌───────────────────────┐
                    │  📚   🔍   ⚙️         │  ← floating pill
                    │  •                    │    with indicator dot
                    └───────────────────────┘
```

**Details**:
- Floating pill with rounded corners, slight shadow, positioned above safe area
- Morphing indicator - active icon scales up + background pill slides to it
- Gesture navigation - swipe left/right between tabs
- Auto-hide on scroll - pill slides down when scrolling, reappears on scroll up

---

## 3. Library Cards - "Bookshelf Spines"

**Alternative view mode** showing libraries as book spines on a shelf:

```
┌─────────────────────────────────────────┐
│    ╔═══╗ ╔═══╗ ╔═══╗ ╔═══╗ ╔═══╗       │
│    ║ S ║ ║ F ║ ║ M ║ ║ C ║ ║ T ║       │
│    ║ c ║ ║ i ║ ║ y ║ ║ o ║ ║ e ║       │
│    ║ i ║ ║ c ║ ║ s ║ ║ m ║ ║ c ║       │
│    ║ - ║ ║ t ║ ║ t ║ ║ i ║ ║ h ║       │
│    ║ F ║ ║ i ║ ║ e ║ ║ c ║ ║   ║       │
│    ║ i ║ ║ o ║ ║ r ║ ║ s ║ ║   ║       │
│    ╚═══╝ ╚═══╝ ╚═══╝ ╚═══╝ ╚═══╝       │
│    ════════════════════════════ shelf   │
└─────────────────────────────────────────┘
```

**Details**:
- Tap spine to expand into full card (flip animation)
- Different spine colors per library (generated from name hash)
- View toggle in header: Grid ↔ Spines

---

## 4. Book/Video Detail - "Cover Flow" Hero

**Detail pages** with immersive cover presentation:

```
┌─────────────────────────────────────────┐
│                                         │
│          ╭─────────────────╮            │
│         ╱                   ╲           │
│        │   [BOOK COVER]     │  ← 3D tilt│
│        │   with reflection  │    on drag│
│         ╲                   ╱           │
│          ╰─────────────────╯            │
│     ░░░░░░ blurred reflection ░░░░░░░   │
│                                         │
│         The Great Gatsby                │
│         F. Scott Fitzgerald             │
│─────────────────────────────────────────│
│   Summary • Details • History           │
│   ═══════                               │
└─────────────────────────────────────────┘
```

**Details**:
- 3D perspective on cover with subtle parallax on device tilt
- Blurred reflection below cover
- Segmented control for Summary/Details/History (swipeable)
- Dominant color gradient as page background (extracted from cover)

---

## 5. Library Content - "Magazine Layout"

**Mix card sizes** for visual interest:

```
┌─────────────────────────────────────────┐
│  ┌────────────────────┐ ┌──────┐        │
│  │                    │ │      │        │
│  │   FEATURED BOOK    │ │ Book │        │
│  │   (recently added) │ │  2   │        │
│  │                    │ └──────┘        │
│  │                    │ ┌──────┐        │
│  └────────────────────┘ │ Book │        │
│  ┌──────┐ ┌──────┐      │  3   │        │
│  │ Book │ │ Book │      └──────┘        │
│  │  4   │ │  5   │                      │
│  └──────┘ └──────┘                      │
└─────────────────────────────────────────┘
```

**Details**:
- Hero card for most recent or currently reading
- Masonry grid that flows naturally
- Quick actions on hover/tap - lend, edit icons appear on card

---

## 6. Micro-interactions

| Interaction | Animation |
|-------------|-----------|
| **Add item** | Card flies in from "+" button with spring physics |
| **Delete item** | Card implodes with particle dust effect |
| **Lend item** | Ribbon unfurls from corner |
| **Pull to refresh** | Custom book-flip animation (not spinner) |
| **Tab switch** | Content slides in from direction of tab |
| **Long press** | Card lifts up with scale + shadow increase |

---

## 7. Quick Stats Dashboard

**Collapsible stats header** on Libraries page:

```
┌─────────────────────────────────────────┐
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │   127   │ │    8    │ │    3    │    │
│  │  books  │ │  videos │ │  lent   │    │
│  └─────────┘ └─────────┘ └─────────┘    │
│         ▲ swipe up to collapse          │
└─────────────────────────────────────────┘
```

---

## 8. Search - "Spotlight Style"

**Modal search** that feels premium:

```
┌─────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← dimmed bg
│    ┌─────────────────────────────────┐  │
│    │ 🔍  Search books & videos       │  │ ← floating input
│    └─────────────────────────────────┘  │
│                                         │
│    Recent: Gatsby • 1984 • Inception    │
│                                         │
│    ┌─────────────────────────────────┐  │
│    │ [cover] The Great Gatsby        │  │ ← instant results
│    └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 9. Collection Cards - "Deck of Cards"

**Stack visualization** for collections:

```
     ╭───────────────────╮
    ╭┤                   ├╮
   ╭┤│   Harry Potter    │├╮
   │││   Collection      │││  ← stacked cards
   ╰┤│      7 items      │├╯    fan out on tap
    ╰┤                   ├╯
     ╰───────────────────╯
```

**Details**:
- Tap to fan out into scrollable horizontal carousel
- Drag items between collections

---

## 10. Onboarding - "Story Mode"

**First-time experience** as swipeable story cards:

```
     ┌─────────────────────┐
     │    📚 Welcome to    │
     │    Alexandria       │
     │                     │
     │  [illustration]     │
     │                     │
     │  Your personal      │
     │  library awaits     │
     │                     │
     │      ● ○ ○ ○        │  ← progress dots
     └─────────────────────┘
```

---

## Implementation Priority

### Phase 1: Visual Identity Foundation (High Impact) ✅

| # | Task | Section | Impact | Effort | Status |
|---|------|---------|--------|--------|--------|
| 1.1 | Dark theme overhaul | 1a | High | Low | ✅ |
| 1.2 | Glassmorphism cards | 1b | High | Low | ✅ |
| 1.3 | Gradient mesh background | 1c | Medium | Low | ✅ |
| 1.4 | Floating nav pill | §2 | High | Medium | ✅ |

### Phase 2: Detail Pages & Interactions ✅

| # | Task | Section | Impact | Effort | Status |
|---|------|---------|--------|--------|--------|
| 2.1 | Cover color extraction | 1d | Medium | Medium | ✅ |
| 2.2 | Detail page hero cover | §4 | High | Medium | ✅ |
| 2.3 | Micro-interactions (long press, add) | §6 | Medium | Low | ✅ |
| 2.4 | Tab switch animations | §6 | Low | Low | ✅ |

### Phase 3: Layout & Navigation Enhancements

| # | Task | Section | Impact | Effort | Status |
|---|------|---------|--------|--------|--------|
| 3.1 | Magazine layout | §5 | Medium | Medium | ⏭️ Skipped |
| 3.2 | Spotlight search | §8 | Medium | Medium | ✅ |
| 3.3 | Stats dashboard | §7 | Low | Low | ⏸️ (needs backend)

### Phase 4: Advanced Features

| # | Task | Section | Impact | Effort | Status |
|---|------|---------|--------|--------|--------|
| 4.1 | Bookshelf spines view | §3 | Medium | High | ⏭️ Skipped |
| 4.2 | Deck of cards collections | §9 | Medium | High | ✅ |
| 4.3 | Onboarding story mode | §10 | Low | Medium | ⬜ |

---

## Technical Notes

### Dark Theme Overhaul (1.1)

```css
/* Richer, deeper dark palette with subtle warmth */
.dark {
  --background: oklch(0.13 0.02 270);      /* Deep blue-black */
  --foreground: oklch(0.93 0.01 260);      /* Soft white */
  --card: oklch(0.18 0.025 270 / 0.8);     /* Semi-transparent for glass */
  --card-foreground: oklch(0.93 0.01 260);
  --primary: oklch(0.75 0.15 280);         /* Soft purple accent */
  --primary-foreground: oklch(0.13 0.02 270);
  --muted: oklch(0.25 0.02 270);
  --muted-foreground: oklch(0.60 0.02 270);
  --border: oklch(0.30 0.03 270 / 0.5);    /* Subtle glow border */
  --accent-glow: oklch(0.6 0.2 280 / 0.15); /* For card hover glow */
}
```

### Gradient Mesh Background (1.3)

```css
.gradient-mesh {
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse at 20% 0%, oklch(0.25 0.1 280 / 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, oklch(0.2 0.08 200 / 0.3) 0%, transparent 50%),
    var(--background);
  /* Optional: subtle animation */
  animation: mesh-shift 20s ease-in-out infinite alternate;
}

@keyframes mesh-shift {
  0% { background-position: 0% 0%, 100% 100%; }
  100% { background-position: 10% 10%, 90% 90%; }
}
```

### Glassmorphism CSS (1.2)

```css
.glass-card {
  background: oklch(0.2 0.02 260 / 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid oklch(1 0 0 / 0.1);
  box-shadow:
    0 4px 30px oklch(0 0 0 / 0.1),
    inset 0 1px 0 oklch(1 0 0 / 0.1);
}
```

### Floating Nav Animation

```css
.floating-nav {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-nav.hidden {
  transform: translateY(calc(100% + 2rem));
}
```

### Cover Reflection (2.2)

```css
.cover-reflection {
  transform: scaleY(-1);
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 50%);
  filter: blur(2px);
}
```

### Cover Color Extraction (2.1)

```javascript
// lib/colorExtractor.js
// Uses canvas to sample dominant color from cover image

export const extractDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 10; // Sample small for performance
      canvas.height = 10;
      ctx.drawImage(img, 0, 0, 10, 10);
      const data = ctx.getImageData(0, 0, 10, 10).data;

      // Average RGB values
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      const pixels = data.length / 4;
      resolve({
        r: Math.round(r / pixels),
        g: Math.round(g / pixels),
        b: Math.round(b / pixels)
      });
    };
    img.onerror = () => resolve({ r: 100, g: 100, b: 120 }); // Fallback
    img.src = imageUrl;
  });
};

// Usage: creates CSS gradient from extracted color
export const createCoverGradient = (color) => {
  return `radial-gradient(ellipse at 50% 0%,
    rgba(${color.r}, ${color.g}, ${color.b}, 0.3) 0%,
    transparent 70%)`;
};
```
