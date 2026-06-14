# Direction E "The Shelf" — Whole-App UI Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the entire `web-client-v2` PWA from the dark "Library at Twilight" glassmorphism theme to Direction E "The Shelf" — a warm, light, tactile bookshelf aesthetic — across the token layer, library stream, every other screen, and the installed-PWA identity.

**Architecture:** Token-first. Rewrite the shared shadcn CSS variables in `src/index.css` so all screens shift to warm/light at once; then restyle the library stream and a handful of bespoke components in place (keeping all filenames, props, and routing). Navigation/edit routing stays in `LibraryContent`, keyed on `item.type` — cards are presentation-only. Source: `docs/superpowers/specs/2026-06-14-direction-e-shelf-ui-design.md`.

**Tech Stack:** React 19, Vite 6, Tailwind CSS v4 (CSS-first `@theme`), vite-plugin-pwa, self-hosted woff2 (Bricolage Grotesque + Newsreader), `sharp` (dev-only, icon generation), lucide-react.

**Testing note (read first):** This package has **no test runner** — only ESLint (`package.json` has no test framework, and the repo has no unit tests). Adding a JS test harness solely to assert CSS/theme output is YAGNI. Therefore each task is verified by **(a) `yarn --cwd packages/web-client-v2 lint`, (b) `yarn --cwd packages/web-client-v2 build`, and (c) a specific dev-server visual check** (`yarn --cwd packages/web-client-v2 dev`, then open the named route and confirm the described result). Treat the visual check as the task's acceptance test.

**Commit discipline:** We start on `master`; Task 0 creates a feature branch. Commit after every task. Do **not** push or open a PR unless the user asks.

---

## File map

**Foundation**
- `public/fonts/*.woff2` — self-hosted font files (created).
- `src/index.css` — token layer, `@font-face`, fonts wired into `@theme`, warm mesh, shadows, keyframes, lent restyle (rewritten).

**Library stream**
- `src/components/LetterHeader.jsx` — passive sticky A–Z divider with ghost letter (created).
- `src/pages/LibraryContent.jsx` — inject letter headers, warm states (modified).
- `src/components/BookCard.jsx` — cover-on-ledge standalone card (rewritten).
- `src/components/VideoCard.jsx` — cover-on-ledge standalone card (rewritten).
- `src/components/CollectionCard.jsx` — wide wooden board, ghost covers, `⌗` badge (rewritten).

**Bucket 2 (glass → wood)**
- `src/navigation/BottomTabs.jsx` — floating dark pill (rewritten).
- `src/components/LibraryCard.jsx` — wood-ledge library card (rewritten).
- `src/components/BottomSheet.jsx` — cream panel surface (modified).

**Bucket 1 (inherit sweep)**
- The ~18 token-only screens + remaining components — verify + fix stray dark hardcodes.

**Bucket 3 (resolved designs)**
- `src/pages/BookDetail.jsx`, `src/pages/VideoDetail.jsx` — "reading table" hero (rewritten).
- `src/lib/colorExtractor.js` — add a linen-wash halo helper (modified).
- `src/pages/Search.jsx` — "card index" (rewritten regions).
- `src/components/Onboarding.jsx` — "turning pages" warm palette (modified).

**PWA identity**
- `assets/icon/alexandria-icon.svg`, `assets/icon/alexandria-icon-maskable.svg` — source art (created).
- `scripts/generate-icons.mjs` — `sharp` SVG→PNG generator (created); `package.json` script + devDep.
- `public/logo144.png|logo180.png|logo192.png|logo512.png`, `public/favicon-16x16.png|favicon-32x32.png` — regenerated.
- `index.html` — cream splash, font preload, meta (rewritten).
- `vite.config.js` — manifest `theme_color`/`background_color`/icons (modified).

**Docs**
- `.claude/ui-v2.md` — tech-stack fonts, theme description, progress (modified).

---

## Task 0: Create feature branch

**Files:** none (git only).

- [ ] **Step 1: Branch off master**

```bash
cd /Users/jrsue/dev/repos/alexandria
git checkout -b feat/shelf-ui-revamp
```

- [ ] **Step 2: Verify clean start**

Run: `git status`
Expected: `On branch feat/shelf-ui-revamp`, working tree clean.

---

## Task 1: Self-host the fonts

**Files:**
- Create: `packages/web-client-v2/public/fonts/bricolage-600.woff2`, `bricolage-700.woff2`, `bricolage-800.woff2`, `newsreader-400.woff2`, `newsreader-italic-400.woff2`

- [ ] **Step 1: Create the fonts directory**

```bash
mkdir -p packages/web-client-v2/public/fonts
```

- [ ] **Step 2: Download the Bricolage Grotesque latin woff2 (weights 600/700/800)**

Google Fonts' `css2` endpoint returns `@font-face` blocks; for each weight take the **last** `src: url(...woff2)` (the `latin` subset). Run:

```bash
cd packages/web-client-v2/public/fonts
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
for W in 600 700 800; do
  URL=$(curl -sL -A "$UA" "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@${W}&display=swap" \
    | grep -Eo 'https://[^)]+\.woff2' | tail -1)
  echo "Bricolage $W -> $URL"
  curl -sL -A "$UA" "$URL" -o "bricolage-${W}.woff2"
done
```

- [ ] **Step 3: Download the Newsreader latin woff2 (400 normal + 400 italic)**

```bash
cd packages/web-client-v2/public/fonts
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
curl -sL -A "$UA" "https://fonts.googleapis.com/css2?family=Newsreader:wght@400&display=swap" \
  | grep -Eo 'https://[^)]+\.woff2' | tail -1 | xargs -I{} curl -sL -A "$UA" {} -o newsreader-400.woff2
curl -sL -A "$UA" "https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@1,400&display=swap" \
  | grep -Eo 'https://[^)]+\.woff2' | tail -1 | xargs -I{} curl -sL -A "$UA" {} -o newsreader-italic-400.woff2
```

- [ ] **Step 4: Verify all five files exist and are non-trivial**

Run: `ls -l packages/web-client-v2/public/fonts`
Expected: five `.woff2` files, each > 10 KB. If any is 0 bytes, re-run that weight (network/UA issue).

- [ ] **Step 5: Commit**

```bash
git add packages/web-client-v2/public/fonts
git commit -m "chore(web-client-v2): self-host Bricolage Grotesque + Newsreader woff2"
```

---

## Task 2: Rewrite the theme token layer (`src/index.css`)

**Files:**
- Modify (full rewrite): `packages/web-client-v2/src/index.css`

This is the keystone task — every screen shifts to warm/light from here. `--glass-*` vars are kept as **warm aliases** so not-yet-migrated components degrade gracefully; they are removed in Task 18's cleanup once nothing references them.

- [ ] **Step 1: Replace the entire file with the warm "Shelf" token layer**

```css
/* Generated by Claude. */
/* Tailwind CSS v4 - import via CSS */
@import "tailwindcss";

/* ============================================================
   Self-hosted fonts — Bricolage Grotesque (display/UI) + Newsreader (serif accent)
   ============================================================ */
@font-face {
  font-family: "Bricolage Grotesque";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/bricolage-600.woff2") format("woff2");
}
@font-face {
  font-family: "Bricolage Grotesque";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/bricolage-700.woff2") format("woff2");
}
@font-face {
  font-family: "Bricolage Grotesque";
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("/fonts/bricolage-800.woff2") format("woff2");
}
@font-face {
  font-family: "Newsreader";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/newsreader-400.woff2") format("woff2");
}
@font-face {
  font-family: "Newsreader";
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/newsreader-italic-400.woff2") format("woff2");
}

/* shadcn/ui CSS variables for theming + font tokens */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* Typography: Bricolage for all UI, Newsreader for serif accents */
  --font-sans: "Bricolage Grotesque", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif: "Newsreader", Georgia, "Times New Roman", serif;
}

/* =============================================================================
   "The Shelf" — warm, light, tactile bookshelf theme (light-only)
   ============================================================================= */
:root {
  /* Linen canvas */
  --background: #f3ecdd;
  --foreground: #2c2820;

  /* Cards: opaque cream (no glass) */
  --card: #faf5ea;
  --card-foreground: #2c2820;
  --popover: #faf5ea;
  --popover-foreground: #2c2820;

  /* Primary: burnt sienna */
  --primary: #bb5a33;
  --primary-foreground: #faf5ea;

  /* Secondary: deep green */
  --secondary: #3f6157;
  --secondary-foreground: #faf5ea;

  /* Muted: warm sand */
  --muted: #ece2cc;
  --muted-foreground: #7d7361;

  /* Accent: warm hover tint */
  --accent: #ece2cc;
  --accent-foreground: #2c2820;

  /* Destructive: warm red that reads on linen */
  --destructive: #b23a23;
  --destructive-foreground: #faf5ea;

  /* Borders / inputs / focus ring */
  --border: #e0d6bf;
  --input: #e7ddc7;
  --ring: #bb5a33;

  --radius: 1rem;

  /* Walnut shelf ledge */
  --wood: #a07c4f;
  --wood-d: #7c5d38;
  --wood-edge: #c8a877; /* front-edge highlight */

  /* Lent accent (amber-on-linen) */
  --lent: #b9762a;
  --lent-bg: #f3e3c8;

  /* Soft warm low shadows (replace cool glass shadows) */
  --card-shadow: 0 1px 2px rgba(74, 58, 36, 0.10), 0 2px 6px rgba(74, 58, 36, 0.07);
  --card-shadow-hover: 0 6px 18px rgba(74, 58, 36, 0.16), 0 2px 6px rgba(74, 58, 36, 0.10);
  --shelf-shadow: 2px 4px 10px rgba(74, 58, 36, 0.22);

  /* Glass aliases — warm fallbacks so un-migrated components degrade gracefully.
     Removed in the Task 18 cleanup once nothing references them. */
  --glass-bg: var(--card);
  --glass-border: var(--border);
  --glass-blur: 0px;
  --accent-glow: rgba(187, 90, 51, 0.12);
}

@layer base {
  * {
    @apply border-border;
  }
  html {
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0;
    min-height: 100%;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
  }
  /* Warm linen → oat ambient mesh */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(ellipse 80% 50% at 12% 0%, rgba(208, 150, 54, 0.10) 0%, transparent 55%),
      radial-gradient(ellipse 70% 50% at 88% 100%, rgba(63, 97, 87, 0.08) 0%, transparent 55%),
      linear-gradient(180deg, #f3ecdd 0%, #ead9b8 100%);
  }
  #root {
    min-height: 100svh;
    overflow-x: hidden;
  }
}

/* The walnut ledge — drawn under standalone items, collections, library cards */
.shelf-ledge {
  background: linear-gradient(180deg, var(--wood) 0%, var(--wood-d) 100%);
  box-shadow: inset 0 1px 0 var(--wood-edge), 0 2px 5px rgba(74, 58, 36, 0.20);
}

/* Lent chip */
.lent-chip {
  color: var(--lent);
  background: var(--lent-bg);
}

/* Ghost cover (pending collection members) — hatched placeholder */
.ghost-cover {
  background-color: #ece2cc;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(124, 93, 56, 0.12) 0px,
    rgba(124, 93, 56, 0.12) 2px,
    transparent 2px,
    transparent 7px
  );
  border: 1px dashed rgba(124, 93, 56, 0.35);
}

/* Staggered list animations - fade in + slide up */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; opacity: 0; }

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fade-in 0.25s ease-out forwards; }

@keyframes page-enter { from { opacity: 0; } to { opacity: 1; } }
.animate-page-enter { animation: page-enter 0.2s ease-out forwards; }

@keyframes slide-from-right { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slide-from-left { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
.animate-slide-from-right { animation: slide-from-right 0.25s ease-out forwards; }
.animate-slide-from-left { animation: slide-from-left 0.25s ease-out forwards; }

/* Detail hero: cover "settles" onto the shelf */
@keyframes cover-settle {
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-cover-settle { animation: cover-settle 0.25s ease-out forwards; }

/* Hide scrollbar but keep functionality */
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }

/* Long press "lift" — card rises with warm shadow */
.card-lifting {
  transform: scale(1.03) translateY(-4px) !important;
  box-shadow: 0 12px 28px rgba(74, 58, 36, 0.24) !important;
  z-index: 10;
  position: relative;
}

@keyframes haptic-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.97); } }
.animate-haptic-pulse { animation: haptic-pulse 0.15s ease-in-out; }

/* Shimmer loading (warm) */
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.animate-shimmer {
  background: linear-gradient(90deg, var(--muted) 0%, #f5ecd9 50%, var(--muted) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Collection unfold */
@keyframes unfold-item { 0% { opacity: 0; transform: translateX(-20px) scale(0.9); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
.animate-unfold-item { animation: unfold-item 0.35s ease-out forwards; opacity: 0; }

/* Respect reduced motion: disable entry/unfold/settle, keep static states */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up,
  .animate-fade-in,
  .animate-page-enter,
  .animate-slide-from-right,
  .animate-slide-from-left,
  .animate-cover-settle,
  .animate-unfold-item,
  .animate-shimmer {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

- [ ] **Step 2: Lint**

Run: `yarn --cwd packages/web-client-v2 lint`
Expected: PASS (CSS isn't linted, but confirms no JS broke).

- [ ] **Step 3: Build**

Run: `yarn --cwd packages/web-client-v2 build`
Expected: build succeeds; the five woff2 files are emitted to `dist/fonts/`.

- [ ] **Step 4: Visual check**

Run: `yarn --cwd packages/web-client-v2 dev`, open `/libraries`.
Expected: background is warm linen (not dark), text is dark ink, headings render in Bricolage Grotesque (geometric, characterful), the app no longer looks dark/purple. Cards may still look transitional — that's fine; later tasks restyle them.

- [ ] **Step 5: Commit**

```bash
git add packages/web-client-v2/src/index.css
git commit -m "feat(web-client-v2): warm 'Shelf' token layer + self-hosted fonts"
```

---

## Task 3: Create the passive sticky letter header (`LetterHeader.jsx`)

**Files:**
- Create: `packages/web-client-v2/src/components/LetterHeader.jsx`

- [ ] **Step 1: Write the component**

```jsx
// Edited by Claude.
// Passive sticky alphabetical divider for the library stream.
// Client-derived label only (does NOT navigate). A large faint "ghost letter"
// sits behind the small sticky label.
const LetterHeader = ({ letter }) => {
  return (
    <div
      role="separator"
      aria-label={`Items starting with ${letter}`}
      data-l={letter}
      className="sticky top-0 z-20 -mx-4 px-4 py-1.5 select-none pointer-events-none
                 before:content-[attr(data-l)] before:absolute before:right-4 before:top-1/2
                 before:-translate-y-1/2 before:text-5xl before:font-extrabold
                 before:text-[var(--wood-d)]/10 before:leading-none before:pointer-events-none"
    >
      <span className="relative inline-block font-sans text-sm font-bold tracking-wide text-[var(--wood-d)]">
        {letter}
      </span>
    </div>
  );
};

export default LetterHeader;
```

- [ ] **Step 2: Lint**

Run: `yarn --cwd packages/web-client-v2 lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/web-client-v2/src/components/LetterHeader.jsx
git commit -m "feat(web-client-v2): passive sticky LetterHeader with ghost letter"
```

---

## Task 4: Inject passive letter headers into the stream (`LibraryContent.jsx`)

**Files:**
- Modify: `packages/web-client-v2/src/pages/LibraryContent.jsx`

- [ ] **Step 1: Import the new component**

Find:
```jsx
import CollectionCard from '@/components/CollectionCard';
```
Add immediately after:
```jsx
import LetterHeader from '@/components/LetterHeader';
```

- [ ] **Step 2: Add a sort-letter helper above the component**

Find:
```jsx
// Item type constants (matches backend domain.ItemType)
const ITEM_TYPE_VIDEO = 1;
const ITEM_TYPE_COLLECTION = 2;
```
Add immediately after:
```jsx
// First alphabetical "bucket" letter of an item's title (collections sort by name too).
// Non-letters (digits, symbols) bucket under "#". Matches the backend's case-insensitive sort.
const sortLetter = (title) => {
  const c = (title || '').trim().charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
};
```

- [ ] **Step 3: Render a `LetterHeader` whenever the bucket letter changes**

Find the stream map opening:
```jsx
        <div className="p-4 space-y-2">
          {items.map((item, idx) => {
            // Collections (type=2) have nested items array from backend
            if (item.type === ITEM_TYPE_COLLECTION) {
```
Replace with (wrap each row in a fragment preceded by a divider when the letter changes):
```jsx
        <div className="p-4 space-y-2">
          {items.map((item, idx) => {
            const letter = sortLetter(item.title);
            const prevLetter = idx > 0 ? sortLetter(items[idx - 1].title) : null;
            const showLetter = letter !== prevLetter;
            const divider = showLetter ? <LetterHeader key={`letter-${letter}-${idx}`} letter={letter} /> : null;
            // Collections (type=2) have nested items array from backend
            if (item.type === ITEM_TYPE_COLLECTION) {
```

- [ ] **Step 4: Emit the divider before each branch's card**

In the same map, each `return (<SomeCard ... />)` becomes a fragment with the divider. Replace the three `return (` card blocks so each is wrapped. For the collection branch, find:
```jsx
              return (
                <CollectionCard
                  key={`collection-${item.id}`}
```
Replace with:
```jsx
              return (
                <div key={`collection-${item.id}`}>
                  {divider}
                  <CollectionCard
```
…and find that block's closing:
```jsx
                  index={idx}
                />
              );
            }
```
Replace with:
```jsx
                  index={idx}
                  />
                </div>
              );
            }
```

For the video branch, find:
```jsx
              return (
                <VideoCard
                  key={item.id}
```
Replace with:
```jsx
              return (
                <div key={item.id}>
                  {divider}
                  <VideoCard
```
…and find its close:
```jsx
                  index={idx}
                />
              );
            }
```
Replace with:
```jsx
                  index={idx}
                  />
                </div>
              );
            }
```

For the book branch (final return), find:
```jsx
            return (
              <BookCard
                key={item.id}
```
Replace with:
```jsx
            return (
              <div key={item.id}>
                {divider}
                <BookCard
```
…and find its close:
```jsx
                index={idx}
              />
            );
          })}
```
Replace with:
```jsx
                index={idx}
                />
              </div>
            );
          })}
```

- [ ] **Step 5: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 6: Visual check**

Dev server, open a library with several items spanning multiple letters.
Expected: a small sticky letter label appears before each new alphabetical run, with a large faint ghost letter behind it; scrolling pins the current letter; tapping a letter does nothing (passive).

- [ ] **Step 7: Commit**

```bash
git add packages/web-client-v2/src/pages/LibraryContent.jsx
git commit -m "feat(web-client-v2): passive A–Z letter headers in library stream"
```

---

## Task 5: Rebuild `BookCard.jsx` (cover standing on a full-width walnut ledge)

**Files:**
- Modify (full rewrite): `packages/web-client-v2/src/components/BookCard.jsx`

Props, long-press/lift behavior, `onClick(book)`, `isSelected`, `index`, `compact`, `showOrder` are all preserved. Only the markup/styling changes. Author line uses `font-serif italic` (Newsreader). Lent → chip; no diagonal ribbon.

- [ ] **Step 1: Replace the file**

```jsx
// Edited by Claude.
// Book standalone card — cover standing on a full-width walnut ledge.
// Media-equality layout shared in spirit with VideoCard. Presentation-only:
// navigation/edit routing lives in the parent (keyed on item.type).
import { useRef, useCallback, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const LONG_PRESS_DURATION = 500;
const LIFT_DELAY = 150;
const STAGGER_DELAY = 50;

const BookCard = ({ book, onClick, onLongPress, showOrder = false, compact = false, isSharedLibrary = false, isSelected = false, index }) => {
  const cloudFrontUrl = book.picture
    ? `${book.picture}?v=${book.updatedAt ? new Date(book.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const authors = book.authors?.join(', ') || '';
  const isLent = !!book.lentTo;

  const pressTimer = useRef(null);
  const liftTimer = useRef(null);
  const isLongPress = useRef(false);
  const [isLifting, setIsLifting] = useState(false);
  const showLift = isLifting || isSelected;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    if (!compact && onLongPress) {
      liftTimer.current = setTimeout(() => setIsLifting(true), LIFT_DELAY);
    }
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsLifting(false);
      onLongPress?.(book);
    }, LONG_PRESS_DURATION);
  }, [book, compact, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (liftTimer.current) { clearTimeout(liftTimer.current); liftTimer.current = null; }
    setIsLifting(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) onClick?.(book);
  }, [book, onClick]);

  const animationStyle = index != null && !compact
    ? { animationDelay: `${index * STAGGER_DELAY}ms` }
    : undefined;

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => { if (onLongPress) { e.preventDefault(); onLongPress(book); } }}
      style={animationStyle}
      aria-label={`${book.title}, book`}
      className={cn(
        'w-full text-left select-none',
        'transition-[box-shadow,transform] duration-200',
        index != null && !compact && 'animate-fade-in-up',
        showLift && !compact && 'card-lifting'
      )}
    >
      {/* Cover + info row */}
      <div className={cn('flex items-end gap-3', compact ? 'px-1' : 'px-1')}>
        {showOrder && book.order != null && (
          <div className="shrink-0 w-5 self-center text-center text-sm font-medium text-muted-foreground">
            {book.order}
          </div>
        )}
        <div
          className={cn(
            'shrink-0 bg-muted flex items-center justify-center overflow-hidden',
            'rounded-[2px_6px_6px_2px]',
            compact ? 'w-14 h-20' : 'w-16 h-24',
            !compact && 'shadow-[var(--shelf-shadow)]'
          )}
        >
          {hasImage ? (
            <FadeImage src={cloudFrontUrl} alt={book.title} className="w-full h-full object-cover"
              fallback={<BookOpen className="h-6 w-6 text-muted-foreground/50" />} />
          ) : (
            <BookOpen className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0 pb-1.5">
          <p className={cn('font-sans font-semibold text-foreground truncate', compact ? 'text-sm' : 'text-base')}>
            {book.title}
          </p>
          {authors && (
            <p className={cn('font-serif italic text-muted-foreground truncate', compact ? 'text-xs' : 'text-sm')}>
              {authors}
            </p>
          )}
          {isLent && !isSharedLibrary && (
            <span className="lent-chip mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium">
              Lent to {book.lentTo}
            </span>
          )}
        </div>
      </div>
      {/* Walnut ledge under the cover (full width) */}
      {!compact && <div className="shelf-ledge mt-0 h-1.5 w-full rounded-[1px]" />}
    </button>
  );
};

export default BookCard;
```

- [ ] **Step 2: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 3: Visual check**

Dev server, open a library containing books.
Expected: each book is a cover standing on a full-width walnut ledge, title in Bricolage, author in Newsreader italic, no medium glyph, no "Novel" label; long-press lifts the card; lent books show a warm "Lent to …" chip.

- [ ] **Step 4: Commit**

```bash
git add packages/web-client-v2/src/components/BookCard.jsx
git commit -m "feat(web-client-v2): BookCard as cover-on-ledge (Shelf)"
```

---

## Task 6: Rebuild `VideoCard.jsx` (cover standing on a full-width walnut ledge)

**Files:**
- Modify (full rewrite): `packages/web-client-v2/src/components/VideoCard.jsx`

Mirror of BookCard with: rounded poster radius, `Film` fallback, and `dir. <director> · <year>` meta in Newsreader italic.

- [ ] **Step 1: Replace the file**

```jsx
// Edited by Claude.
// Video standalone card — poster standing on a full-width walnut ledge.
// Presentation-only: navigation/edit routing lives in the parent (keyed on item.type).
import { useRef, useCallback, useState } from 'react';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const LONG_PRESS_DURATION = 500;
const LIFT_DELAY = 150;
const STAGGER_DELAY = 50;

const VideoCard = ({ video, onClick, onLongPress, showOrder = false, compact = false, isSharedLibrary = false, isSelected = false, index }) => {
  const pressTimer = useRef(null);
  const liftTimer = useRef(null);
  const isLongPress = useRef(false);
  const [isLifting, setIsLifting] = useState(false);
  const isLent = !!video.lentTo;

  const cloudFrontUrl = video.picture
    ? `${video.picture}?v=${video.updatedAt ? new Date(video.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const showLift = isLifting || isSelected;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    if (!compact && onLongPress) {
      liftTimer.current = setTimeout(() => setIsLifting(true), LIFT_DELAY);
    }
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsLifting(false);
      onLongPress?.(video);
    }, LONG_PRESS_DURATION);
  }, [video, compact, onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (liftTimer.current) { clearTimeout(liftTimer.current); liftTimer.current = null; }
    setIsLifting(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) onClick?.(video);
  }, [video, onClick]);

  const handleContextMenu = (e) => { e.preventDefault(); if (onLongPress) onLongPress(video); };

  const metaParts = [];
  if (video.directors?.length > 0) metaParts.push(`dir. ${video.directors[0]}`);
  if (video.releaseYear) metaParts.push(video.releaseYear);
  const metaLine = metaParts.join(' · ');

  const animationStyle = index != null && !compact
    ? { animationDelay: `${index * STAGGER_DELAY}ms` }
    : undefined;

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
      style={animationStyle}
      aria-label={`${video.title}, film`}
      className={cn(
        'w-full text-left select-none',
        'transition-[box-shadow,transform] duration-200',
        index != null && !compact && 'animate-fade-in-up',
        showLift && !compact && 'card-lifting'
      )}
    >
      <div className="flex items-end gap-3 px-1">
        {showOrder && video.order != null && (
          <div className="shrink-0 w-5 self-center text-center text-sm font-medium text-muted-foreground">
            {video.order}
          </div>
        )}
        <div
          className={cn(
            'shrink-0 bg-muted flex items-center justify-center overflow-hidden rounded-md',
            compact ? 'w-14 h-20' : 'w-16 h-24',
            !compact && 'shadow-[var(--shelf-shadow)]'
          )}
        >
          {hasImage ? (
            <FadeImage src={cloudFrontUrl} alt={video.title} className="w-full h-full object-cover"
              fallback={<Film className="h-6 w-6 text-muted-foreground/50" />} />
          ) : (
            <Film className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1 min-w-0 pb-1.5">
          <p className={cn('font-sans font-semibold text-foreground truncate', compact ? 'text-sm' : 'text-base')}>
            {video.title}
          </p>
          {metaLine && (
            <p className={cn('font-serif italic text-muted-foreground truncate', compact ? 'text-xs' : 'text-sm')}>
              {metaLine}
            </p>
          )}
          {isLent && !isSharedLibrary && (
            <span className="lent-chip mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium">
              Lent to {video.lentTo}
            </span>
          )}
        </div>
      </div>
      {!compact && <div className="shelf-ledge mt-0 h-1.5 w-full rounded-[1px]" />}
    </button>
  );
};

export default VideoCard;
```

- [ ] **Step 2: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 3: Visual check**

Dev server, open a library containing videos.
Expected: poster standing on a ledge, `dir. … · year` in Newsreader italic, rounded poster, lent chip when applicable; long-press lifts.

- [ ] **Step 4: Commit**

```bash
git add packages/web-client-v2/src/components/VideoCard.jsx
git commit -m "feat(web-client-v2): VideoCard as poster-on-ledge (Shelf)"
```

---

## Task 7: Rebuild `CollectionCard.jsx` (wide wooden board + ghost covers + `⌗` badge)

**Files:**
- Modify (full rewrite): `packages/web-client-v2/src/components/CollectionCard.jsx`

Props preserved: `collection`, `items`, `itemCount`, `onItemClick`, `onItemLongPress`, `onMorePress`, `isSharedLibrary`, `index`. Members scroll horizontally and stand on a wide shelf; pending members render as `.ghost-cover`s.

- [ ] **Step 1: Replace the file**

```jsx
// Edited by Claude.
// Collection — a wide wooden board. Members are covers standing on the shelf,
// scrolling horizontally; pending members render as hatched ghost covers.
import { useRef, useCallback } from 'react';
import { BookOpen, Film, MoreHorizontal, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import FadeImage from './FadeImage';

const STAGGER_DELAY = 50;
const ITEM_UNFOLD_DELAY = 80;
const LONG_PRESS_DURATION = 500;
const ITEM_TYPE_VIDEO = 1;

const ItemThumbnail = ({ item, onClick, onLongPress, isSharedLibrary, unfoldIndex }) => {
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);
  const isVideo = item.type === ITEM_TYPE_VIDEO;
  const cloudFrontUrl = item.picture
    ? `${item.picture}?v=${item.updatedAt ? new Date(item.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const isLent = !!item.lentTo;
  const unfoldStyle = unfoldIndex != null ? { animationDelay: `${unfoldIndex * ITEM_UNFOLD_DELAY}ms` } : undefined;

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => { isLongPress.current = true; onLongPress?.(item); }, LONG_PRESS_DURATION);
  }, [item, onLongPress]);
  const handleTouchEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);
  const handleClick = useCallback(() => { if (!isLongPress.current) onClick?.(item); }, [item, onClick]);
  const handleContextMenu = (e) => { e.preventDefault(); if (onLongPress) onLongPress(item); };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={handleContextMenu}
      style={unfoldStyle}
      aria-label={`${item.title}, ${isVideo ? 'film' : 'book'}`}
      className={cn('flex flex-col items-center gap-1 shrink-0 select-none group', unfoldIndex != null && 'animate-unfold-item')}
    >
      <div className="relative">
        <div className={cn(
          'w-16 h-24 bg-muted flex items-center justify-center overflow-hidden',
          'transition-transform duration-150 group-active:scale-95 shadow-[var(--shelf-shadow)]',
          isVideo ? 'rounded-md' : 'rounded-[2px_6px_6px_2px]'
        )}>
          {hasImage ? (
            <FadeImage src={cloudFrontUrl} alt={item.title} className="w-full h-full object-cover"
              fallback={isVideo ? <Film className="h-6 w-6 text-muted-foreground/50" /> : <BookOpen className="h-6 w-6 text-muted-foreground/50" />} />
          ) : isVideo ? (
            <Film className="h-6 w-6 text-muted-foreground/50" />
          ) : (
            <BookOpen className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        {item.order != null && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-card border border-border text-[10px] font-semibold text-foreground flex items-center justify-center shadow-sm">
            {item.order}
          </div>
        )}
        {isLent && !isSharedLibrary && (
          <span className="lent-chip absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-bold leading-none">LENT</span>
        )}
      </div>
      {/* Title under the cover — caption lifts the cover so it "floats" above the shelf */}
      <p className="w-16 text-xs text-center truncate font-serif italic text-muted-foreground group-hover:text-foreground transition-colors">
        {item.title}
      </p>
    </button>
  );
};

const CollectionCard = ({ collection, items, itemCount: totalItemCount, onItemClick, onItemLongPress, onMorePress, isSharedLibrary = false, index }) => {
  const itemCount = totalItemCount ?? items.length;
  const loadedItemCount = items.length;
  const name = collection?.name || 'Unknown';
  const pendingItemCount = Math.max(0, itemCount - loadedItemCount);
  const isLoading = totalItemCount > 0 && loadedItemCount === 0;
  const animationStyle = index != null ? { animationDelay: `${index * STAGGER_DELAY}ms` } : undefined;

  const handleMoreClick = useCallback((e) => { e.stopPropagation(); onMorePress?.(collection); }, [collection, onMorePress]);

  return (
    <div style={animationStyle} className={cn('rounded-2xl overflow-hidden bg-card shadow-[var(--card-shadow)]', index != null && 'animate-fade-in-up')}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex flex-col">
          <h3 className="font-sans font-semibold text-foreground">{name}</h3>
          <span className="font-serif italic text-xs text-muted-foreground">
            {itemCount === 1 ? 'novels & films together' : `${loadedItemCount} of ${itemCount}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
            <Hash className="h-3.5 w-3.5" />{itemCount}
          </span>
          {onMorePress && !isSharedLibrary && (
            <button onClick={handleMoreClick}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={`More options for ${name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Members standing on a wide wooden shelf */}
      <div className="relative">
        {itemCount === 0 && !isLoading ? (
          <div className="px-3 pb-3 font-serif italic text-sm text-muted-foreground">
            {isSharedLibrary ? 'No items' : 'Tap ••• to add items'}
          </div>
        ) : (
          <>
            <div className="flex gap-3 px-3 pt-1 pb-2 overflow-x-auto scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {items.map((item, idx) => (
                <ItemThumbnail key={item.id} item={item} onClick={onItemClick} onLongPress={onItemLongPress}
                  isSharedLibrary={isSharedLibrary} unfoldIndex={idx} />
              ))}
              {pendingItemCount > 0 && Array.from({ length: pendingItemCount }).map((_, i) => (
                <div key={`ghost-${i}`} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="ghost-cover w-16 h-24 rounded-[2px_6px_6px_2px]" />
                  <div className="ghost-cover w-12 h-3 rounded" />
                </div>
              ))}
            </div>
            {/* The walnut board the covers stand on */}
            <div className="shelf-ledge mx-3 h-2 rounded-[1px]" />
            {(itemCount > 4 || pendingItemCount > 0) && (
              <div className="absolute right-0 top-1 bottom-4 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectionCard;
```

- [ ] **Step 2: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 3: Visual check**

Dev server, open a library with a collection (ideally one with pending members so `itemCount > items.length`).
Expected: a cream board with the collection name, an italic sub-line, a `⌗ N` sienna count badge, covers standing on a walnut shelf with titles underneath, hatched ghost covers for not-yet-loaded members, and a right-edge fade when overflowing.

- [ ] **Step 4: Commit**

```bash
git add packages/web-client-v2/src/components/CollectionCard.jsx
git commit -m "feat(web-client-v2): CollectionCard as wide wooden board with ghost covers"
```

---

## Task 8: Rebuild `BottomTabs.jsx` (floating dark pill)

**Files:**
- Modify: `packages/web-client-v2/src/navigation/BottomTabs.jsx`

- [ ] **Step 1: Replace the `<nav>` styling and active states**

Find:
```jsx
      <nav
        ref={navRef}
        className={cn(
          'relative flex items-center gap-1 px-2 py-2 pointer-events-auto',
          // Glassmorphism pill
          'rounded-2xl',
          'bg-[var(--glass-bg)] backdrop-blur-xl',
          'border border-[var(--glass-border)]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_0_var(--glass-border)]'
        )}
      >
        {/* Sliding active indicator - behind buttons */}
        <div
          className="absolute top-2 bottom-2 rounded-xl bg-primary/15 transition-all duration-300 ease-out"
```
Replace with:
```jsx
      <nav
        ref={navRef}
        className={cn(
          'relative flex items-center gap-1 px-2 py-2 pointer-events-auto',
          // Warm-dark walnut pill
          'rounded-2xl',
          'bg-[#2c241b] text-[#f3ecdd]',
          'shadow-[0_6px_20px_rgba(74,58,36,0.35)]'
        )}
      >
        {/* Sliding active indicator - behind buttons */}
        <div
          className="absolute top-2 bottom-2 rounded-xl bg-[var(--primary)]/30 transition-all duration-300 ease-out"
```

- [ ] **Step 2: Update the per-tab active/inactive colors**

Find:
```jsx
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground active:text-foreground'
```
Replace with:
```jsx
                  isActive
                    ? 'text-[#f3ecdd]'
                    : 'text-[#f3ecdd]/55 hover:text-[#f3ecdd]/85 active:text-[#f3ecdd]'
```

- [ ] **Step 3: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 4: Visual check**

Dev server, any tab route.
Expected: a floating warm-dark walnut pill with cream labels, the active tab fully cream over a soft sienna indicator; no glass blur.

- [ ] **Step 5: Commit**

```bash
git add packages/web-client-v2/src/navigation/BottomTabs.jsx
git commit -m "feat(web-client-v2): BottomTabs as floating walnut pill"
```

---

## Task 9: Rebuild `LibraryCard.jsx` (wood-ledge library card)

**Files:**
- Modify: `packages/web-client-v2/src/components/LibraryCard.jsx`

Keep the avatar/initial, shared badges, long-press behavior, props. Swap glass → cream card sitting on a ledge.

- [ ] **Step 1: Replace the className block on the root `<button>`**

Find:
```jsx
      className={cn(
        // Grid card: square-ish, centered content with glassmorphism
        'relative flex flex-col items-center justify-center p-4 rounded-2xl text-center select-none',
        'aspect-[4/3] min-h-[120px]',
        // Glassmorphism: frosted glass effect
        'bg-[var(--glass-bg)] backdrop-blur-xl',
        'border border-[var(--glass-border)]',
        // Subtle inner glow at top edge
        'shadow-[var(--card-shadow),inset_0_1px_0_0_var(--glass-border)]',
        // Transitions
        'transition-[background-color,box-shadow,transform,border-color] duration-200',
        // Hover: lift up with glow (disabled during lift)
        !showLift && 'hover:shadow-[var(--card-shadow-hover),inset_0_1px_0_0_var(--glass-border),0_0_20px_var(--accent-glow)]',
        !showLift && 'hover:border-primary/20',
        !showLift && 'active:scale-[0.97]',
        // Long press lift state (during press or while action sheet open)
        showLift && 'card-lifting',
        // Staggered fade-in animation
        index != null && 'animate-fade-in-up'
      )}
```
Replace with:
```jsx
      className={cn(
        // Cream card sitting on a walnut ledge
        'relative flex flex-col items-center justify-center p-4 pb-5 rounded-2xl text-center select-none overflow-hidden',
        'aspect-[4/3] min-h-[120px]',
        'bg-card shadow-[var(--card-shadow)]',
        'transition-[box-shadow,transform] duration-200',
        !showLift && 'hover:shadow-[var(--card-shadow-hover)] active:scale-[0.97]',
        showLift && 'card-lifting',
        index != null && 'animate-fade-in-up'
      )}
```

- [ ] **Step 2: Update the shared badge + avatar + name + count styling**

Find:
```jsx
      {/* Shared indicator badge - top right corner */}
      {(isSharedFromOther || isSharedToOthers) && (
        <div className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-primary/10 backdrop-blur-sm">
          {isSharedFromOther ? (
            <UserCheck className="h-3.5 w-3.5 text-primary/70" />
          ) : (
            <Users className="h-3.5 w-3.5 text-primary/70" />
          )}
        </div>
      )}

      {/* Library initial avatar - glowing accent */}
      <div className="mb-2 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold bg-primary/15 text-primary border border-primary/20 shadow-[0_0_12px_var(--accent-glow)]">
        {getInitial(library.name)}
      </div>

      {/* Library name */}
      <span className="font-medium text-sm leading-tight line-clamp-2 max-w-full px-1">
        {library.name}
      </span>

      {/* Item count or shared by */}
      <span className="text-xs text-muted-foreground mt-1 w-full px-1 truncate">
```
Replace with:
```jsx
      {/* Shared indicator badge - top right corner */}
      {(isSharedFromOther || isSharedToOthers) && (
        <div className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-primary/10">
          {isSharedFromOther ? (
            <UserCheck className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Users className="h-3.5 w-3.5 text-primary" />
          )}
        </div>
      )}

      {/* Library initial avatar */}
      <div className="mb-2 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold bg-primary/12 text-primary">
        {getInitial(library.name)}
      </div>

      {/* Library name */}
      <span className="font-sans font-semibold text-sm leading-tight line-clamp-2 max-w-full px-1">
        {library.name}
      </span>

      {/* Item count or shared by */}
      <span className="font-serif italic text-xs text-muted-foreground mt-1 w-full px-1 truncate">
```

- [ ] **Step 3: Add the ledge at the bottom of the card**

Find the closing of the count span and the button end:
```jsx
        )}
      </span>
    </button>
  );
```
Replace with:
```jsx
        )}
      </span>
      {/* Walnut ledge along the bottom edge */}
      <div className="shelf-ledge absolute inset-x-0 bottom-0 h-1.5" />
    </button>
  );
```

- [ ] **Step 4: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 5: Visual check**

Dev server, `/libraries`.
Expected: cream library cards each sitting on a thin walnut ledge, sienna initial avatar, name in Bricolage, count in Newsreader italic; long-press lifts; shared badge visible.

- [ ] **Step 6: Commit**

```bash
git add packages/web-client-v2/src/components/LibraryCard.jsx
git commit -m "feat(web-client-v2): LibraryCard as cream card on a walnut ledge"
```

---

## Task 10: Restyle `BottomSheet.jsx` (cream panel)

**Files:**
- Modify: `packages/web-client-v2/src/components/BottomSheet.jsx`

- [ ] **Step 1: Warm the sheet surface + handle**

Find:
```jsx
        className={cn(
          'relative bg-background rounded-t-xl min-h-[50vh] max-h-[90vh] flex flex-col border border-white/10',
          'transition-all',
```
Replace with:
```jsx
        className={cn(
          'relative bg-card rounded-t-2xl min-h-[50vh] max-h-[90vh] flex flex-col border-t border-border',
          'transition-all',
```

Find:
```jsx
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
```
Replace with:
```jsx
          <div className="w-10 h-1 rounded-full bg-[var(--wood)]/40" />
```

- [ ] **Step 2: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 3: Visual check**

Dev server; open any sheet (e.g. long-press an item → ItemActionsSheet; or the "+" → AddItemSheet).
Expected: cream sheet panel on a dark scrim, warm walnut drag handle, sienna action text (inherited from `--primary`). All six sheets (`AddItemSheet`, `ItemActionsSheet`, `LibraryActionsSheet`, `CollectionActionsSheet`, `CollectionPickerSheet`, `NewCollectionSheet`) inherit this since they render through `BottomSheet` or use tokens. Confirm at least the Add-item and Item-actions sheets.

- [ ] **Step 4: Commit**

```bash
git add packages/web-client-v2/src/components/BottomSheet.jsx
git commit -m "feat(web-client-v2): BottomSheet cream panel surface"
```

---

## Task 11: Bucket-1 inherit sweep + remaining components (kill dark hardcodes)

**Files (modify as found):** all `src/pages/*.jsx` not otherwise rebuilt, plus `src/components/EmptyBookshelf.jsx`, `src/components/Toast.jsx`, `src/components/PullToRefresh.jsx`, `src/components/PWAUpdatePrompt.jsx`, and the action sheets.

- [ ] **Step 1: Find every dark-specific hardcode still present**

Run:
```bash
cd packages/web-client-v2/src
grep -rnE "text-amber-[0-9]|bg-amber-|rgba\(0,\s*0,\s*0|oklch\(0 0 0|backdrop-blur|--glass-|--accent-glow|border-white/|from-violet|from-blue-|from-emerald|from-amber|to-purple|to-cyan|to-teal|to-orange|1a1a2e" .
```
Expected: a list of remaining hits. The rebuilt files (BookCard, VideoCard, CollectionCard, LibraryCard, BottomTabs, BottomSheet) should NOT appear; Bucket-3 files (BookDetail, VideoDetail, Search, Onboarding) are handled in their own tasks — skip them here.

- [ ] **Step 2: Fix each remaining hit using these rules**

Apply mechanically:
- `text-amber-400` / `text-amber-500` (lent text) → `text-[var(--lent)]`.
- `bg-amber-500/20 … border-amber-500/30` (lent badge) → `lent-chip` class (drop the amber bg/border utilities).
- `bg-[var(--glass-bg)] backdrop-blur-xl` → `bg-card`.
- `border border-[var(--glass-border)]` → `border border-border`.
- `shadow-[…rgba(0,0,0,…)…]` → `shadow-[var(--card-shadow)]` (cards) or remove if purely decorative glow.
- `border-white/10` → `border-border`.
- any literal `#1a1a2e` → remove (token-driven).

For each edited file, keep behavior identical — only swap the styling tokens.

- [ ] **Step 3: Re-run the grep to confirm zero hits (excluding Bucket-3 files)**

Run the Step 1 command again.
Expected: only `BookDetail.jsx`, `VideoDetail.jsx`, `Search.jsx`, `Onboarding.jsx` may still appear (handled later). Everything else clean.

- [ ] **Step 4: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 5: Visual smoke test each inherited screen**

Dev server. Walk: `/login`, `/signup`, `/libraries`, `/libraries/new`, a library → item → `/edit`, `/settings`, `/settings/account`, `/settings/about`, an item history page, add-book and add-video flows, detection results pages, unshare page.
Expected: every screen reads warm/light, no dark panels, no purple, no amber text; forms/buttons use sienna primary; lent indicators are warm chips.

- [ ] **Step 6: Commit**

```bash
git add -A packages/web-client-v2/src
git commit -m "fix(web-client-v2): purge dark/glass hardcodes from inherited screens"
```

---

## Task 12: Add the linen-wash halo helper (`colorExtractor.js`)

**Files:**
- Modify: `packages/web-client-v2/src/lib/colorExtractor.js`

Keep `extractDominantColor` / `useExtractedColor`. Replace the saturated `createCoverGradient` usage with a restrained halo. Update the fallback color to a warm one.

- [ ] **Step 1: Warm the fallback color**

Find:
```js
    // Default fallback color (muted purple to match theme)
    const fallback = { r: 80, g: 70, b: 120 };
```
Replace with:
```js
    // Default fallback color (warm walnut to match the Shelf theme)
    const fallback = { r: 160, g: 124, b: 79 };
```

- [ ] **Step 2: Add a linen-wash halo helper (keep the old export for compatibility)**

Find:
```js
export const createCoverGradient = (color, opacity = 0.4) => {
  return `radial-gradient(ellipse 120% 80% at 50% 0%, rgba(${color.r}, ${color.g}, ${color.b}, ${opacity}) 0%, transparent 70%)`;
};
```
Add immediately after:
```js
/**
 * A restrained, linen-washed halo for the detail "reading table" hero.
 * Blends the cover color ~85% toward linen so it reads as warm atmosphere,
 * never a saturated band. Returns a CSS radial-gradient centered behind the cover.
 * @param {{r:number,g:number,b:number}} color
 * @returns {string} CSS background value
 */
export const createCoverHalo = (color) => {
  if (!color) return 'transparent';
  // Linen base #f3ecdd = rgb(243,236,221); mix 15% cover / 85% linen.
  const mix = (c, base) => Math.round(c * 0.15 + base * 0.85);
  const r = mix(color.r, 243);
  const g = mix(color.g, 236);
  const b = mix(color.b, 221);
  return `radial-gradient(ellipse 90% 60% at 50% 18%, rgba(${r}, ${g}, ${b}, 0.9) 0%, transparent 70%)`;
};
```

- [ ] **Step 3: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/web-client-v2/src/lib/colorExtractor.js
git commit -m "feat(web-client-v2): linen-wash cover halo helper + warm fallback"
```

---

## Task 13: Rebuild `BookDetail.jsx` ("reading table" hero)

**Files:**
- Modify (full rewrite): `packages/web-client-v2/src/pages/BookDetail.jsx`

- [ ] **Step 1: Replace the file**

```jsx
// Edited by Claude.
// Book detail — "reading table": cover standing on a lit walnut ledge against linen,
// with a restrained linen-washed halo of the cover color. No reflection, no saturated band.
import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, History } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import FadeImage from '@/components/FadeImage';
import { useExtractedColor, createCoverHalo } from '@/lib/colorExtractor';

const BookDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { item: contextItem, isSharedLibrary } = useItemData(libraryId, itemId);

  const book = contextItem || location.state?.item;

  const cloudFrontUrl = book?.picture
    ? `${book.picture}?v=${book.updatedAt ? new Date(book.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const authors = book?.authors?.join(', ') || '';
  const isLent = !!book?.lentTo;

  const { color } = useExtractedColor(cloudFrontUrl);
  const haloStyle = useMemo(() => ({ background: createCoverHalo(color), opacity: color ? 0.22 : 0 }), [color]);

  if (!book) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <AppBar title="Book" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Book not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AppBar
        title={book.title}
        headerRight={
          !isSharedLibrary ? (
            <button
              onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/history`)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              aria-label="View history"
            >
              <History className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 min-h-0 relative">
        {/* Restrained linen-washed halo */}
        <div className="absolute inset-0 transition-opacity duration-700 pointer-events-none" style={haloStyle} />

        <div className="absolute inset-0 overflow-y-auto">
          {/* Hero: cover standing on a walnut ledge */}
          <div className="relative pt-8 px-6 flex flex-col items-center">
            <div className="w-44 h-64 rounded-[3px_10px_10px_3px] bg-muted flex items-center justify-center overflow-hidden shadow-[var(--shelf-shadow)] animate-cover-settle">
              {hasImage ? (
                <FadeImage src={cloudFrontUrl} alt={book.title} className="w-full h-full object-cover"
                  fallback={<BookOpen className="h-14 w-14 text-muted-foreground/50" />} />
              ) : (
                <BookOpen className="h-14 w-14 text-muted-foreground/50" />
              )}
            </div>
            {/* The lit walnut ledge */}
            <div className="shelf-ledge mt-0 h-2.5 w-56 max-w-full rounded-[1px]" />

            <div className="text-center mt-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <h1 className="font-sans text-2xl font-bold text-foreground">{book.title}</h1>
              {authors && <p className="font-serif italic text-lg text-muted-foreground mt-1">{authors}</p>}
            </div>

            {isLent && (
              <span className="lent-chip mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-medium animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                {isSharedLibrary ? 'Lent' : `Lent to ${book.lentTo}`}
              </span>
            )}
          </div>

          {/* Details: cream card on the table */}
          <div className="px-4 pt-6 pb-8">
            <div className="bg-card rounded-2xl shadow-[var(--card-shadow)] p-4 space-y-4">
              {book.isbn && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ISBN</p>
                  <p className="text-sm font-mono">{book.isbn}</p>
                </div>
              )}
              {book.collectionName && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collection</p>
                  <p className="text-sm">
                    {book.collectionName}
                    {book.order != null && <span className="text-muted-foreground"> #{book.order}</span>}
                  </p>
                </div>
              )}
              {book.summary && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
                  <p className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{book.summary}</p>
                </div>
              )}
              {!book.isbn && !book.collectionName && !book.summary && (
                <p className="text-sm text-muted-foreground text-center py-2">No additional details</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
```

- [ ] **Step 2: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 3: Visual check**

Dev server, open a book detail.
Expected: cover stands large on a walnut ledge against linen, a barely-there warm halo behind it (no saturated band, no mirror reflection), title in Bricolage, authors in Newsreader italic, the cover "settles" in on load then text staggers, summary set in Newsreader, details in a cream card; lent shows a warm chip.

- [ ] **Step 4: Commit**

```bash
git add packages/web-client-v2/src/pages/BookDetail.jsx
git commit -m "feat(web-client-v2): BookDetail 'reading table' hero"
```

---

## Task 14: Rebuild `VideoDetail.jsx` ("reading table" hero)

**Files:**
- Modify (full rewrite): `packages/web-client-v2/src/pages/VideoDetail.jsx`

- [ ] **Step 1: Replace the file**

```jsx
// Edited by Claude.
// Video detail — "reading table": poster standing on a lit walnut ledge against linen,
// with a restrained linen-washed halo. No reflection, no saturated band.
import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Film, Clock, Calendar, History } from 'lucide-react';
import { AppBar } from '@/navigation';
import { useItemData } from '@/hooks';
import FadeImage from '@/components/FadeImage';
import { useExtractedColor, createCoverHalo } from '@/lib/colorExtractor';

const VideoDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { item: contextItem, isSharedLibrary } = useItemData(libraryId, itemId);

  const video = contextItem || location.state?.item;

  const cloudFrontUrl = video?.picture
    ? `${video.picture}?v=${video.updatedAt ? new Date(video.updatedAt).getTime() : '0'}`
    : null;
  const hasImage = !!cloudFrontUrl;
  const isLent = !!video?.lentTo;

  const { color } = useExtractedColor(cloudFrontUrl);
  const haloStyle = useMemo(() => ({ background: createCoverHalo(color), opacity: color ? 0.22 : 0 }), [color]);

  if (!video) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <AppBar title="Video" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Video not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AppBar
        title={video.title}
        headerRight={
          !isSharedLibrary ? (
            <button
              onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/history`)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              aria-label="View history"
            >
              <History className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 transition-opacity duration-700 pointer-events-none" style={haloStyle} />

        <div className="absolute inset-0 overflow-y-auto">
          <div className="relative pt-8 px-6 flex flex-col items-center">
            <div className="w-44 h-64 rounded-xl bg-muted flex items-center justify-center overflow-hidden shadow-[var(--shelf-shadow)] animate-cover-settle">
              {hasImage ? (
                <FadeImage src={cloudFrontUrl} alt={video.title} className="w-full h-full object-cover"
                  fallback={<Film className="h-14 w-14 text-muted-foreground/50" />} />
              ) : (
                <Film className="h-14 w-14 text-muted-foreground/50" />
              )}
            </div>
            <div className="shelf-ledge mt-0 h-2.5 w-56 max-w-full rounded-[1px]" />

            <div className="text-center mt-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              <h1 className="font-sans text-2xl font-bold text-foreground">{video.title}</h1>
              {video.directors?.length > 0 && (
                <p className="font-serif italic text-lg text-muted-foreground mt-1">dir. {video.directors.join(', ')}</p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {video.releaseYear && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <Calendar className="h-3.5 w-3.5" />{video.releaseYear}
                </div>
              )}
              {video.duration && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  <Clock className="h-3.5 w-3.5" />{video.duration} min
                </div>
              )}
            </div>

            {isLent && (
              <span className="lent-chip mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-medium animate-fade-in-up" style={{ animationDelay: '120ms' }}>
                {isSharedLibrary ? 'Lent' : `Lent to ${video.lentTo}`}
              </span>
            )}
          </div>

          <div className="px-4 pt-6 pb-8">
            <div className="bg-card rounded-2xl shadow-[var(--card-shadow)] p-4 space-y-4">
              {video.cast?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cast</p>
                  <p className="text-sm">{video.cast.join(', ')}</p>
                </div>
              )}
              {video.collectionName && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collection</p>
                  <p className="text-sm">
                    {video.collectionName}
                    {video.order != null && <span className="text-muted-foreground"> #{video.order}</span>}
                  </p>
                </div>
              )}
              {video.summary && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
                  <p className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">{video.summary}</p>
                </div>
              )}
              {!video.cast?.length && !video.collectionName && !video.summary && (
                <p className="text-sm text-muted-foreground text-center py-2">No additional details</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
```

- [ ] **Step 2: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 3: Visual check**

Dev server, open a video detail.
Expected: same "reading table" treatment as books; `dir.` prefix in Newsreader italic; year/duration warm chips; no reflection/saturated band.

- [ ] **Step 4: Commit**

```bash
git add packages/web-client-v2/src/pages/VideoDetail.jsx
git commit -m "feat(web-client-v2): VideoDetail 'reading table' hero"
```

---

## Task 15: Rebuild `Search.jsx` regions ("card index")

**Files:**
- Modify: `packages/web-client-v2/src/pages/Search.jsx`

Three regions change: the result card, the search input, and the recent-search chips/empty state. Logic untouched.

- [ ] **Step 1: Restyle `SearchResultCard` to the on-ledge look**

Find:
```jsx
      className={cn(
        'w-full flex gap-3 p-3 rounded-xl text-left select-none',
        'bg-[var(--glass-bg)] backdrop-blur-xl',
        'border border-[var(--glass-border)]',
        'transition-all duration-200',
        'hover:bg-accent/30 active:scale-[0.99]',
        'animate-fade-in-up'
      )}
```
Replace with:
```jsx
      aria-label={`${item.title}, ${isVideo ? 'film' : 'book'}`}
      className={cn(
        'w-full flex gap-3 p-3 rounded-xl text-left select-none',
        'bg-card shadow-[var(--card-shadow)]',
        'transition-[box-shadow,transform] duration-200',
        'hover:shadow-[var(--card-shadow-hover)] active:scale-[0.99]',
        'animate-fade-in-up'
      )}
```

- [ ] **Step 2: Cover shadow + subtitle/lent styling in the result card**

Find:
```jsx
      <div className={cn(
        'shrink-0 w-12 h-16 bg-muted/50 flex items-center justify-center overflow-hidden',
        'shadow-[2px_2px_8px_rgba(0,0,0,0.3)]',
        isVideo ? 'rounded-md' : 'rounded-[2px_6px_6px_2px]'
      )}>
```
Replace with:
```jsx
      <div className={cn(
        'shrink-0 w-12 h-16 bg-muted flex items-center justify-center overflow-hidden',
        'shadow-[var(--shelf-shadow)]',
        isVideo ? 'rounded-md' : 'rounded-[2px_6px_6px_2px]'
      )}>
```

Find:
```jsx
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
```
Replace with:
```jsx
        {subtitle && (
          <p className="font-serif italic text-sm text-muted-foreground truncate">{isVideo ? `dir. ${subtitle}` : subtitle}</p>
        )}
```

Find:
```jsx
        {/* Lent indicator */}
        {item.lentTo && (
          <p className="text-xs text-amber-500 truncate mt-0.5 flex items-center gap-1">
            <ArrowRightFromLine className="h-3 w-3 shrink-0" />
            Lent to {item.lentTo}
          </p>
        )}
```
Replace with:
```jsx
        {/* Lent indicator */}
        {item.lentTo && (
          <p className="text-xs text-[var(--lent)] truncate mt-0.5 flex items-center gap-1">
            <ArrowRightFromLine className="h-3 w-3 shrink-0" />
            Lent to {item.lentTo}
          </p>
        )}
```

- [ ] **Step 3: Restyle the search input as a cream catalog card**

Find:
```jsx
        <div className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-[var(--glass-bg)] backdrop-blur-xl',
          'border border-[var(--glass-border)]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.2)]'
        )}>
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search books & videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              'w-full h-14 pl-12 pr-12 bg-transparent',
              'text-lg text-foreground placeholder:text-muted-foreground',
              'focus:outline-none'
            )}
          />
```
Replace with:
```jsx
        <div className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-card border border-border',
          'shadow-[inset_0_1px_3px_rgba(74,58,36,0.08),var(--card-shadow)]',
          'focus-within:ring-2 focus-within:ring-[var(--ring)]'
        )}>
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search your shelves…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              'w-full h-14 pl-12 pr-12 bg-transparent',
              'font-serif italic text-lg text-foreground placeholder:text-muted-foreground placeholder:italic',
              'focus:outline-none'
            )}
          />
```

- [ ] **Step 4: Restyle the recent-search chips as catalog tags**

Find:
```jsx
                <button
                  key={index}
                  onClick={() => handleRecentClick(term)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm',
                    'bg-muted/30 hover:bg-muted/50',
                    'border border-border/50',
                    'transition-colors'
                  )}
                >
                  {term}
                </button>
```
Replace with:
```jsx
                <button
                  key={index}
                  onClick={() => handleRecentClick(term)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm',
                    'bg-card border border-border hover:border-primary/40',
                    'transition-colors'
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {term}
                </button>
```

- [ ] **Step 5: Warm the empty-state medallion**

Find:
```jsx
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <SearchIcon className="h-10 w-10 text-primary/50" />
            </div>
            <p className="text-xl font-medium">Search your library</p>
```
Replace with:
```jsx
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <SearchIcon className="h-10 w-10 text-primary" />
            </div>
            <p className="font-sans text-xl font-bold">Search your shelves</p>
```

- [ ] **Step 6: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 7: Visual check**

Dev server, `/search`.
Expected: a cream catalog-card input with Newsreader-italic placeholder "Search your shelves…" and sienna focus ring; recent searches as cream tags with a sienna tick; results as on-ledge cards with `dir.`/author in Newsreader italic and warm lent text. Long-press an owned result still opens the actions sheet.

- [ ] **Step 8: Commit**

```bash
git add packages/web-client-v2/src/pages/Search.jsx
git commit -m "feat(web-client-v2): Search 'card index' warm restyle"
```

---

## Task 16: Restyle `Onboarding.jsx` ("turning pages")

**Files:**
- Modify: `packages/web-client-v2/src/components/Onboarding.jsx`

- [ ] **Step 1: Recolor the four slide gradients into one warm family**

Find:
```jsx
    icon: Book,
    animationKey: '/src/assets/animations/welcome.json',
    gradient: 'from-violet-500/20 to-purple-600/20',
```
Replace with:
```jsx
    icon: Book,
    animationKey: '/src/assets/animations/welcome.json',
    gradient: 'from-[#bb5a33]/12 to-transparent',
```

Find:
```jsx
    icon: ScanBarcode,
    animationKey: '/src/assets/animations/add-item.json',
    gradient: 'from-blue-500/20 to-cyan-500/20',
```
Replace with:
```jsx
    icon: ScanBarcode,
    animationKey: '/src/assets/animations/add-item.json',
    gradient: 'from-[#d09636]/14 to-transparent',
```

Find:
```jsx
    icon: FolderOpen,
    animationKey: '/src/assets/animations/collections.json',
    gradient: 'from-emerald-500/20 to-teal-500/20',
```
Replace with:
```jsx
    icon: FolderOpen,
    animationKey: '/src/assets/animations/collections.json',
    gradient: 'from-[#3f6157]/14 to-transparent',
```

Find:
```jsx
    icon: Share2,
    animationKey: '/src/assets/animations/share.json',
    gradient: 'from-amber-500/20 to-orange-500/20',
```
Replace with:
```jsx
    icon: Share2,
    animationKey: '/src/assets/animations/share.json',
    gradient: 'from-[#7c5d38]/16 to-transparent',
```

- [ ] **Step 2: Warm the fallback icon medallion**

Find:
```jsx
            <div className="flex h-48 w-48 items-center justify-center rounded-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]">
              <Icon className="h-24 w-24 text-primary" strokeWidth={1.5} />
            </div>
```
Replace with:
```jsx
            <div className="flex h-48 w-48 items-center justify-center rounded-full bg-card border border-[var(--wood)]/40 shadow-[var(--card-shadow)]">
              <Icon className="h-24 w-24 text-primary" strokeWidth={1.5} />
            </div>
```

- [ ] **Step 3: Headings in Bricolage, body in Newsreader**

Find:
```jsx
          <h1 className="mb-4 text-2xl font-bold text-foreground">{slide.title}</h1>
          <p className="max-w-xs text-muted-foreground">{slide.description}</p>
```
Replace with:
```jsx
          <h1 className="mb-4 font-sans text-2xl font-extrabold text-foreground">{slide.title}</h1>
          <p className="max-w-xs font-serif text-[15px] leading-relaxed text-muted-foreground">{slide.description}</p>
```

- [ ] **Step 4: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS.

- [ ] **Step 5: Visual check**

Dev server. Trigger onboarding (clear its localStorage flag — key used by `useOnboarding`, e.g. via DevTools Application → Local Storage → remove the onboarding key, then reload).
Expected: each slide sits on warm linen with a single subtle tint (sienna → ochre → green → walnut), cream icon medallion with sienna icon, Bricolage heading, Newsreader body, sienna active dot + sienna "Next/Get Started" button. Verify the Lottie animations are legible on linen; if any reads as light-on-dark, note it for a follow-up asset swap.

- [ ] **Step 6: Commit**

```bash
git add packages/web-client-v2/src/components/Onboarding.jsx
git commit -m "feat(web-client-v2): Onboarding 'turning pages' warm palette"
```

---

## Task 17: App icon — source SVG + sharp generator + regenerated PNGs

**Files:**
- Create: `packages/web-client-v2/assets/icon/alexandria-icon.svg`, `packages/web-client-v2/assets/icon/alexandria-icon-maskable.svg`
- Create: `packages/web-client-v2/scripts/generate-icons.mjs`
- Modify: `packages/web-client-v2/package.json` (add `sharp` devDep + `icons` script)
- Regenerate: `packages/web-client-v2/public/logo144.png|logo180.png|logo192.png|logo512.png`, `public/favicon-16x16.png|favicon-32x32.png`

- [ ] **Step 1: Add `sharp` as a dev dependency**

```bash
yarn --cwd packages/web-client-v2 add -D sharp
```
Expected: `sharp` appears under `devDependencies`.

- [ ] **Step 2: Create the icon source SVG** (`assets/icon/alexandria-icon.svg`) — three covers on a walnut shelf, cream radial bg, mark within centre 80%

```xml
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="32%" r="75%">
      <stop offset="0%" stop-color="#fbf5e8"/>
      <stop offset="60%" stop-color="#f0e6cf"/>
      <stop offset="100%" stop-color="#e7d9ba"/>
    </radialGradient>
    <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cf6a3c"/><stop offset="100%" stop-color="#9a3f1f"/></linearGradient>
    <linearGradient id="s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a6f5f"/><stop offset="100%" stop-color="#274038"/></linearGradient>
    <linearGradient id="s3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d09636"/><stop offset="100%" stop-color="#9a6618"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a9824f"/><stop offset="100%" stop-color="#7c5d38"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- soft shelf shadow -->
  <ellipse cx="256" cy="356" rx="150" ry="16" fill="#7c5d38" opacity="0.18"/>
  <!-- spines (centre 80% safe zone: x within 51..461, y within 51..461) -->
  <g>
    <rect x="171" y="180" width="46" height="160" rx="7" fill="url(#s1)"/>
    <rect x="233" y="150" width="46" height="190" rx="7" fill="url(#s2)"/>
    <!-- page-edge notch on the tall centre spine -->
    <rect x="271" y="158" width="5" height="174" rx="2" fill="#ffffff" opacity="0.28"/>
    <rect x="295" y="205" width="46" height="135" rx="7" fill="url(#s3)"/>
  </g>
  <!-- walnut shelf -->
  <rect x="150" y="340" width="212" height="26" rx="6" fill="url(#wood)"/>
  <rect x="150" y="340" width="212" height="5" rx="2.5" fill="#c8a877" opacity="0.8"/>
</svg>
```

- [ ] **Step 3: Create the maskable variant** (`assets/icon/alexandria-icon-maskable.svg`) — same mark, cream fills full bleed (no rounded rect), mark scaled into the centre safe zone

```xml
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#fbf5e8"/>
      <stop offset="60%" stop-color="#f0e6cf"/>
      <stop offset="100%" stop-color="#e7d9ba"/>
    </radialGradient>
    <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cf6a3c"/><stop offset="100%" stop-color="#9a3f1f"/></linearGradient>
    <linearGradient id="s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a6f5f"/><stop offset="100%" stop-color="#274038"/></linearGradient>
    <linearGradient id="s3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d09636"/><stop offset="100%" stop-color="#9a6618"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a9824f"/><stop offset="100%" stop-color="#7c5d38"/></linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- mark grouped + scaled to ~70% around centre for maskable safe zone -->
  <g transform="translate(256,256) scale(0.7) translate(-256,-256)">
    <ellipse cx="256" cy="356" rx="150" ry="16" fill="#7c5d38" opacity="0.18"/>
    <rect x="171" y="180" width="46" height="160" rx="7" fill="url(#s1)"/>
    <rect x="233" y="150" width="46" height="190" rx="7" fill="url(#s2)"/>
    <rect x="271" y="158" width="5" height="174" rx="2" fill="#ffffff" opacity="0.28"/>
    <rect x="295" y="205" width="46" height="135" rx="7" fill="url(#s3)"/>
    <rect x="150" y="340" width="212" height="26" rx="6" fill="url(#wood)"/>
    <rect x="150" y="340" width="212" height="5" rx="2.5" fill="#c8a877" opacity="0.8"/>
  </g>
</svg>
```

- [ ] **Step 4: Create the generator** (`scripts/generate-icons.mjs`)

```js
// Generated by Claude.
// Renders the Alexandria app icon SVGs to the PNG sizes the PWA/manifest needs.
// Run: yarn --cwd packages/web-client-v2 icons
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const standard = readFileSync(resolve(root, 'assets/icon/alexandria-icon.svg'));
const maskable = readFileSync(resolve(root, 'assets/icon/alexandria-icon-maskable.svg'));
const out = (f) => resolve(root, 'public', f);

const jobs = [
  { svg: standard, size: 144, file: 'logo144.png' },
  { svg: standard, size: 180, file: 'logo180.png' },
  { svg: standard, size: 192, file: 'logo192.png' },
  { svg: standard, size: 512, file: 'logo512.png' },
  { svg: maskable, size: 512, file: 'logo512-maskable.png' },
  { svg: standard, size: 32, file: 'favicon-32x32.png' },
  { svg: standard, size: 16, file: 'favicon-16x16.png' },
];

for (const { svg, size, file } of jobs) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(file));
  console.log(`✓ ${file} (${size}×${size})`);
}
console.log('Done. Note: favicon.ico is left as-is (sharp does not emit .ico).');
```

- [ ] **Step 5: Add the `icons` script to `package.json`**

Find:
```json
    "lint:fix": "eslint src --fix",
```
Replace with:
```json
    "lint:fix": "eslint src --fix",
    "icons": "node scripts/generate-icons.mjs",
```

- [ ] **Step 6: Generate the PNGs**

Run: `yarn --cwd packages/web-client-v2 icons`
Expected: `✓` lines for `logo144/180/192/512`, `logo512-maskable`, `favicon-32x32`, `favicon-16x16`.

- [ ] **Step 7: Eyeball the output**

Run: `open packages/web-client-v2/public/logo512.png packages/web-client-v2/public/logo512-maskable.png`
Expected: three colored spines on a walnut shelf over a cream radial; maskable version has the mark comfortably inside the centre with cream bleed all around.

- [ ] **Step 8: Commit**

```bash
git add packages/web-client-v2/assets/icon packages/web-client-v2/scripts/generate-icons.mjs packages/web-client-v2/package.json packages/web-client-v2/public/logo144.png packages/web-client-v2/public/logo180.png packages/web-client-v2/public/logo192.png packages/web-client-v2/public/logo512.png packages/web-client-v2/public/logo512-maskable.png packages/web-client-v2/public/favicon-16x16.png packages/web-client-v2/public/favicon-32x32.png
git commit -m "feat(web-client-v2): Shelf app icon (SVG source + sharp generator + PNGs)"
```

---

## Task 18: Splash, manifest, meta + glass-alias cleanup

**Files:**
- Modify: `packages/web-client-v2/index.html`
- Modify: `packages/web-client-v2/vite.config.js`
- Modify: `packages/web-client-v2/src/index.css` (remove glass aliases)

- [ ] **Step 1: Rewrite the splash + head in `index.html`**

Replace the entire file with:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/svg+xml" href="/logo512.svg" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="apple-touch-icon" sizes="144x144" href="/logo144.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/logo180.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#bb5a33" />
    <meta name="description" content="Alexandria - Manage your books and videos" />
    <!-- iOS PWA meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Alexandria" />
    <!-- Preload splash fonts so the wordmark renders in-brand instantly -->
    <link rel="preload" href="/fonts/bricolage-800.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/newsreader-italic-400.woff2" as="font" type="font/woff2" crossorigin />
    <title>Alexandria</title>
    <style>
      @font-face {
        font-family: "Bricolage Grotesque";
        font-style: normal; font-weight: 800; font-display: swap;
        src: url("/fonts/bricolage-800.woff2") format("woff2");
      }
      @font-face {
        font-family: "Newsreader";
        font-style: italic; font-weight: 400; font-display: swap;
        src: url("/fonts/newsreader-italic-400.woff2") format("woff2");
      }
      #splash {
        position: fixed; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: radial-gradient(120% 90% at 50% 0%, #f7f0e1 0%, #ece0c6 70%, #e0d1ad 100%);
        color: #2c2820;
        font-family: "Bricolage Grotesque", system-ui, -apple-system, sans-serif;
        z-index: 9999; opacity: 1; transition: opacity 0.3s ease-out;
      }
      #splash.fade-out { opacity: 0; pointer-events: none; }
      #splash-logo { width: 96px; height: 96px; margin-bottom: 24px; border-radius: 22px; animation: pulse 2s ease-in-out infinite; box-shadow: 0 18px 30px -16px rgba(106,90,58,0.5); }
      #splash-title { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 10px 0; }
      #splash-rule { width: 54px; height: 3px; border-radius: 2px; background: linear-gradient(90deg,#a07c4f,#7c5d38); margin: 0 0 12px 0; }
      #splash-tagline { font-family: "Newsreader", Georgia, serif; font-style: italic; font-size: 1.0625rem; color: #7d7361; margin: 0; }
      #splash-build { position: absolute; bottom: 24px; font-size: 0.75rem; color: #a8997b; margin: 0; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    </style>
  </head>
  <body>
    <!-- Splash screen: displayed while app loads -->
    <div id="splash">
      <img id="splash-logo" src="/logo192.png" alt="Alexandria logo" />
      <h1 id="splash-title">Alexandria</h1>
      <div id="splash-rule"></div>
      <p id="splash-tagline">Your personal wonder</p>
      <p id="splash-build"></p>
    </div>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Update the manifest in `vite.config.js`**

Find:
```js
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
```
Replace with:
```js
        theme_color: "#bb5a33",
        background_color: "#f3ecdd",
```

Find:
```js
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
```
Replace with:
```js
          {
            src: "logo512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
```

Find:
```js
      includeAssets: ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "logo144.png", "logo180.png", "logo192.png", "logo512.png"],
```
Replace with:
```js
      includeAssets: ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "logo144.png", "logo180.png", "logo192.png", "logo512.png", "logo512-maskable.png"],
```

- [ ] **Step 3: Remove the glass aliases from `index.css`**

Find:
```css
  /* Glass aliases — warm fallbacks so un-migrated components degrade gracefully.
     Removed in the Task 18 cleanup once nothing references them. */
  --glass-bg: var(--card);
  --glass-border: var(--border);
  --glass-blur: 0px;
  --accent-glow: rgba(187, 90, 51, 0.12);
```
Replace with:
```css
```
(Delete those lines entirely.)

- [ ] **Step 4: Verify nothing references the removed vars**

Run:
```bash
grep -rnE "--glass-|--accent-glow|backdrop-blur" packages/web-client-v2/src packages/web-client-v2/index.html
```
Expected: **no hits**. If any remain, fix them (swap to `bg-card`/`border-border`) before continuing.

- [ ] **Step 5: Lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: PASS; `dist/index.html` references the cream splash; manifest in `dist` has `theme_color #bb5a33`.

- [ ] **Step 6: Visual check**

Run dev server with a hard reload (clear cache). On first paint expect the **cream splash** with the new icon, "Alexandria" in Bricolage 800, a walnut rule, and "Your personal wonder" in Newsreader italic. The browser theme-color/status bar reads warm.

- [ ] **Step 7: Commit**

```bash
git add packages/web-client-v2/index.html packages/web-client-v2/vite.config.js packages/web-client-v2/src/index.css
git commit -m "feat(web-client-v2): cream splash, warm manifest/meta, drop glass aliases"
```

---

## Task 19: Update the design doc (`.claude/ui-v2.md`)

**Files:**
- Modify: `.claude/ui-v2.md`

- [ ] **Step 1: Update the tech-stack table fonts row + theme note**

In the `## Tech stack` table, after the `lottie-react` row add:
```markdown
| Fonts (self-hosted) | Bricolage Grotesque + Newsreader |
```

- [ ] **Step 2: Replace the "UI Refresh" progress block with the Shelf revamp**

Find the `### UI Refresh` heading and its checklist; replace the whole block with:
```markdown
### UI Revamp — Direction E "The Shelf"

- [x] Light-only warm theme ("The Shelf"): linen canvas, burnt-sienna accent, deep-green secondary, walnut ledges
- [x] Self-hosted fonts: Bricolage Grotesque (UI/display) + Newsreader (serif accents: authors, summaries, tagline)
- [x] Token layer rewrite (`src/index.css`): retired dark "Library at Twilight" glass theme and `--glass-*` vars
- [x] Library stream: standalone items on full-width walnut ledges; passive sticky A–Z letter headers with ghost letters
- [x] Collections: wide wooden board, covers standing on the shelf, `⌗` count badge, hatched ghost covers for pending members
- [x] BottomTabs: floating walnut pill; LibraryCard: cream card on a ledge; sheets: cream panels
- [x] Detail "reading table" hero: cover on a lit ledge + restrained linen-washed cover-color halo (no reflection/saturated band); cover "settle" load animation
- [x] Search "card index": cream catalog-card input, catalog-tag recents, on-ledge results
- [x] Onboarding "turning pages": one warm tint-family across slides, cream icon medallion
- [x] PWA identity: three-covers-on-a-walnut-shelf icon (SVG → sharp PNGs incl. maskable), cream splash, manifest `theme_color #bb5a33` / `background_color #f3ecdd`
- [x] Accessibility: medium exposed via `aria-label`; passive letter dividers as separators; motion gated by `prefers-reduced-motion`
```

- [ ] **Step 3: Commit**

```bash
git add .claude/ui-v2.md
git commit -m "docs: record Direction E 'Shelf' UI revamp in ui-v2.md"
```

---

## Task 20: Final QA pass against acceptance criteria

**Files:** none (verification only).

- [ ] **Step 1: Full lint + build**

Run: `yarn --cwd packages/web-client-v2 lint && yarn --cwd packages/web-client-v2 build`
Expected: both PASS clean.

- [ ] **Step 2: Confirm no dark/glass residue anywhere**

Run:
```bash
grep -rnE "--glass-|--accent-glow|backdrop-blur|text-amber-|1a1a2e|Library at Twilight|from-violet|to-purple" packages/web-client-v2/src packages/web-client-v2/index.html
```
Expected: **no hits**.

- [ ] **Step 3: Walk the acceptance criteria from the spec (§9)**

Dev server. Confirm each:
- Warm light theme on every route; no dark-glass remnants.
- Library stream: interleaved A–Z; standalone on full-width ledges; collections as boards with `⌗` badges + horizontal scroll + ghost covers; passive letter headers with ghost letters.
- Tapping a **book** → book detail route; a **video** → video detail route; Edit → correct edit page (routing in `LibraryContent`, keyed on type).
- Bricolage for UI, Newsreader italic for author/director/summary/tagline; splash wordmark in-brand.
- Motion preserved; with OS "reduce motion" on, entry/unfold/settle are suppressed.
- PWA: regenerated icons (incl. maskable 512), cream splash, manifest `theme_color #bb5a33` / `background_color #f3ecdd`, light status bar.
- a11y: items expose medium via `aria-label`; letter dividers are separators.

- [ ] **Step 4: Confirm shared/read-only library behavior intact**

Open a library shared *from* another user.
Expected: header notes the owner; no add button; no long-press actions; lent chips still show.

- [ ] **Step 5: Final commit (if any QA fixes were made)**

```bash
git add -A packages/web-client-v2
git commit -m "fix(web-client-v2): QA polish for Shelf revamp"
```

---

## Self-review (author's check against the spec)

- **Spec coverage:** §2 token layer → Task 2. §3 stream/cards → Tasks 3–7. §4 Bucket 1 → Task 11; Bucket 2 → Tasks 8–10. §5 typography/motion/a11y → Tasks 2 (fonts/keyframes/reduced-motion), 3–16 (applied). §6 PWA → Tasks 17–18. §7 Bucket 3 → Tasks 12–16 (13/14 hero, 15 search, 16 onboarding, 17 icon). §8 file inventory → File map. §9 acceptance → Task 20. §10 out-of-scope respected (no A–Z scrubber, no sort filter, no dark mode, no backend/infra). Covered.
- **Placeholder scan:** every code step contains complete code or exact anchored find/replace; verification steps give exact commands + expected output. No TBD/TODO.
- **Type/name consistency:** `createCoverHalo` defined in Task 12 and consumed in Tasks 13–14; `sortLetter` defined and used in Task 4; `.shelf-ledge`, `.lent-chip`, `.ghost-cover`, `.animate-cover-settle`, `--shelf-shadow`, `--lent`, `--wood`/`--wood-d`/`--wood-edge` defined in Task 2 and referenced consistently thereafter; `logo512-maskable.png` produced in Task 17 and referenced in Task 18. Component props unchanged, so `LibraryContent` callers remain valid.
- **Ordering safety:** glass aliases kept warm in Task 2 and removed only in Task 18 after all references are migrated (verified by grep in 18.4 and 20.2), so no commit leaves a broken surface.
```
