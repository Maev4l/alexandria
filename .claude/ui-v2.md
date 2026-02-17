# Alexandria Front-End v2

## Technical requirements

- PWA (Progressive Web App) based on React
- Leverage shadcn/ui
- Use vite
- Based on yarn workspace
- Deployed on AWS via a CloudFormation template (`infra.yaml`)

## Development guidelines
- Naming:
    - Extensions: Use .jsx extension for React components.
    - Filename: Use PascalCase for filenames. E.g., ReservationCard.jsx.
    - Reference Naming: Use PascalCase for React components and camelCase for their instances.
    - Component Naming: Use the filename as the component name. For example, ReservationCard.jsx should have a reference name of ReservationCard. However, for root components of a directory, use index.jsx as the filename and use the directory name as the component name.
    - Props Naming: Avoid using DOM component prop names for different purposes.
- Always use double quotes (") for JSX attributes, but single quotes (') for all other JS

## Pitfalls
- The user id, comes from the 'sub' claim in the JWT returned by Cognito, where the dashes are removed and the final value capitalized

## Tech stack

| Lib | Version |
|---|---|
| React | 19.1.0 |
| Vite | 6.3.5 |
| Tailwind CSS | 4.1.18 |
| vite-plugin-pwa | 1.2.0 |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| tailwind-merge | 2.6.0 |
| lucide-react | 0.469.0 |
| aws-amplify | 6.16.2 |
| react-router-dom | 7.13.0 |
| @zxing/browser | 0.1.5 |
| @zxing/library | 0.21.3 |

## Project structure

```
packages/web-client-v2/
├── index.html              # Splash screen + app shell
├── package.json
├── vite.config.js          # Vite + React + Tailwind + PWA plugins, "@" alias
├── jsconfig.json           # Path alias for "@/*" -> "./src/*"
├── public/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── logo144.png
│   ├── logo192.svg
│   └── logo512.svg
└── src/
    ├── main.jsx            # Entry point, Amplify init
    ├── App.jsx             # Root component, routing + auth + screens config
    ├── config.js           # Cognito & API config from output.json
    ├── index.css           # Tailwind + shadcn/ui CSS variables (light/dark)
    ├── auth/
    │   └── AuthContext.jsx # AuthProvider, useAuth hook (Cognito)
    ├── navigation/         # Declarative navigation system (React Navigation-inspired)
    │   ├── index.js        # Module exports
    │   ├── NavigationContext.jsx  # Navigation state + params + scroll-to-top registration
    │   ├── AppBar.jsx      # Sticky header: centered title (tap to scroll top), back button, right slot
    │   ├── BottomTabs.jsx  # Sticky footer with tab buttons
    │   └── TabNavigator.jsx # Tab screens + stack screens support
    ├── api/                # API client layer
    │   ├── index.js        # Module exports
    │   ├── client.js       # Base fetch with auth token injection
    │   ├── libraries.js    # Library API endpoints
    │   └── detection.js    # ISBN detection API (book lookup)
    ├── state/              # Shared state (React Context, no Redux)
    │   ├── index.js        # Module exports
    │   └── LibrariesContext.jsx  # Libraries state + actions
    ├── pages/
    │   ├── Login.jsx       # Login form
    │   ├── Libraries.jsx   # Libraries list with pull-to-refresh + actions
    │   ├── NewLibrary.jsx  # Create library form
    │   ├── EditLibrary.jsx # Edit library form
    │   ├── ShareLibrary.jsx # Share library form
    │   ├── UnshareLibrary.jsx # Unshare library - user selection
    │   ├── LibraryContent.jsx # Library items: unified list (standalone + collections), alphabetically sorted
    │   ├── AddBook.jsx     # Add book: camera scan, manual ISBN, or full manual entry
    │   ├── BookDetectionResults.jsx # ISBN lookup results - select and create book directly
    │   ├── NewBook.jsx     # Manual book entry form (when detection fails)
    │   ├── EditBook.jsx    # Edit book form (pre-filled from item)
    │   ├── Search.jsx      # Search tab (placeholder)
    │   └── Settings.jsx    # Settings tab (placeholder)
    ├── components/
    │   ├── LibraryCard.jsx # Compact card with long press support
    │   ├── BookCard.jsx    # Book item card with cover image + optional order number
    │   ├── CollectionCard.jsx # Collapsible card for grouped books in a collection
    │   ├── LibraryActionsSheet.jsx  # Actions: Edit, Share, Unshare, Delete
    │   ├── ItemActionsSheet.jsx  # Actions: Edit, Lend, Delete (for books)
    │   ├── PullToRefresh.jsx  # Pull-to-refresh (transform-based, with ref for scroll control)
    │   ├── BottomSheet.jsx # Reusable bottom sheet
    │   ├── Toast.jsx       # Toast notification system
    │   └── ui/             # shadcn/ui components
    │       ├── Button.jsx
    │       ├── Card.jsx
    │       ├── Input.jsx
    │       ├── Label.jsx
    │       └── Textarea.jsx
    ├── lib/
    │   ├── utils.js        # cn() utility (clsx + tailwind-merge)
    │   └── splash.js       # hideSplash() utility
    └── assets/
```

## Screen flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UNAUTHENTICATED                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                              ┌────────────┐
                              │   Login    │
                              └────────────┘
                                     │ login success
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATED (Tab Navigator)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Libraries]              [Search]                [Settings]                │
│      ▼                       ▼                        ▼                     │
│  Libraries.jsx           Search.jsx              Settings.jsx               │
│  (list + PTR)            (placeholder)           (placeholder)              │
└─────────────────────────────────────────────────────────────────────────────┘
       │
       │ tap card
       ▼
┌──────────────────┐    long press    ┌─────────────────────┐
│  LibraryContent  │ ───────────────► │ LibraryActionsSheet │
│  (items + PTR)   │                  │ Edit/Share/Unshare/ │
└──────────────────┘                  │ Delete              │
       │                              └─────────────────────┘
       │                                      │
       │ tap "+"                              ├── Edit ──────► EditLibrary
       ▼                                      ├── Share ─────► ShareLibrary
┌──────────────────┐                          ├── Unshare ───► UnshareLibrary
│     AddBook      │                          └── Delete ────► (confirm in sheet)
│ ┌──────────────┐ │
│ │ Camera scan  │ │ scan success
│ └──────────────┘ ├─────────────────────┐
│ ┌──────────────┐ │                     │
│ │ Manual ISBN  │ │ submit              │
│ └──────────────┘ ├─────────────────────┤
│ ┌──────────────┐ │                     ▼
│ │ Manual entry │ │         ┌─────────────────────┐
│ └──────────────┘ │         │ BookDetectionResults│
└────────┬─────────┘         │ (select from list)  │
         │                   └─────────────────────┘
         │ tap "manual"              │
         ▼                           │ tap "Add"
┌──────────────────┐                 │ (creates book via API)
│     NewBook      │                 │
│  (form + Done)   │                 │
└──────────────────┘                 │
         │                           │
         │ tap "Done"                │ no results → tap "manual"
         │ (creates book via API)    │
         │                           ▼
         └───────────────────────────┴───► back to LibraryContent
                                           (items refreshed)

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ITEM ACTIONS (long press)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  LibraryContent                                                             │
│       │                                                                     │
│       │ long press on BookCard                                              │
│       ▼                                                                     │
│  ┌─────────────────────┐                                                    │
│  │  ItemActionsSheet   │                                                    │
│  │  - Edit ──────────────► EditBook (form with pre-filled data)             │
│  │  - Lend/Return ───────► (TODO: LendBook)                                 │
│  │  - Delete ────────────► (deletes via API, list refreshed)                │
│  └─────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Progress

- [x] Scaffold: Vite + React + PWA + Tailwind CSS + shadcn/ui foundation
- [x] Routing setup (react-router-dom, protected/public routes)
- [x] Authentication (AWS Cognito via aws-amplify, login form, auth context)
- [x] App layout: sticky AppBar + BottomTabs with declarative navigation
- [x] Splash screen with logo and tagline (min 2s display, fades out)
- [x] PWA icons configured (favicon, apple-touch-icon, manifest)
- [x] API client with auth token injection
- [x] Libraries state management (React Context)
- [x] Libraries page: fetch + display owned/shared with different styling
- [x] Pull-to-refresh on Libraries page
- [x] Alphabetical sorting of libraries
- [x] Create library: dedicated page with form
- [x] Edit library: dedicated page with pre-filled form
- [x] Long press on library card → action sheet (Edit, Share, Unshare, Delete)
- [x] Toast notification system for errors
- [x] Share library: dedicated page with email input
- [x] Unshare library: dedicated page with user list + selection
- [x] Delete library with two-step confirmation in action sheet
- [x] Library content page with infinite scroll + pull-to-refresh
- [x] Collection grouping: items with same collection grouped in collapsible cards, sorted by order
- [x] Tap AppBar title to scroll content to top (iOS convention)
- [x] Long press on item → action sheet (Edit, Lend, Delete)
- [x] Add book flow: "+" button → AddBook (3 options: scan, manual ISBN, manual entry)
- [x] ISBN detection: manual ISBN input → API lookup → select result → create book directly
- [x] Detection fallback: no results found → link to NewBook for manual entry
- [x] Scan ISBN: camera barcode scanning (@zxing/browser, EAN-13/EAN-8)
- [x] Edit book: form with pre-filled data, updates via context
- [ ] Lend/Return functionality
- [ ] Search page implementation
- [ ] Settings page implementation

## UI Revamp

Two design directions for future visual enhancements.

### Option A: Literary Editorial

Magazine-inspired aesthetic treating the book collection as a curated editorial experience.

**Typography**
- Display: Playfair Display or Cormorant Garamond (serif, literary)
- Body: Source Sans 3 or DM Sans (readable, modern contrast)
- Large, confident typography for library names and headers
- Uppercase, letterspaced titles for books

**Color Palette**
```css
--bg-cream: #FAF8F5;        /* Warm paper-like background */
--text-ink: #1C1917;        /* Deep ink black */
--accent-burgundy: #7C2D12; /* Library/leather accent */
--muted-sage: #A3A592;      /* Soft muted green */
--highlight-gold: #CA8A04;  /* Lent/special status */
```

**Book Card Style**
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │      │  HARRY POTTER         │  ← Uppercase, letterspaced
│  │ 📖  │  and the Philosopher's │
│  │      │  Stone                │
│  │      │                       │
│  │      │  J.K. Rowling         │  ← Muted, elegant
│  └──────┘  ─────────────────    │
│            Collection: 1 of 7   │  ← Subtle metadata
└─────────────────────────────────┘
```

**Collection Display - Stacked Spines**
```
┌─────────────────────────────────┐
│ Harry Potter                    │
│ ┌──┬──┬──┬──┬──┬──┬──┐         │
│ │1 │2 │3 │4 │5 │6 │7 │  → Tap  │  ← Visual spine view
│ └──┴──┴──┴──┴──┴──┴──┘         │
└─────────────────────────────────┘
```

**Micro-interactions**
- Book cards tilt slightly on press (3D perspective)
- Pull-to-refresh: book page flip animation
- Long-press: haptic pulse + scale down

---

### Option B: Modern Bookshelf

Visual browsing focus with book covers as primary UI element.

**Typography**
- Display: DM Serif Display or Fraunces
- Body: Inter or DM Sans
- Clean, minimal text - let covers speak

**Color Palette**
```css
--bg-warm: #F5F3EF;         /* Warm off-white */
--bg-shelf: #E8E4DC;        /* Shelf/card background */
--text-primary: #292524;    /* Stone 800 */
--text-muted: #78716C;      /* Stone 500 */
--accent-wood: #A16207;     /* Warm wood tone */
--lent-overlay: rgba(0,0,0,0.5); /* Dimmed lent books */
```

**Library Grid Layout**
```
┌────────────────────────────────┐
│ My Libraries                   │
├────────────────────────────────┤
│ ┌────────┐ ┌────────┐         │
│ │████████│ │████████│         │
│ │  Sci-  │ │ Litt.  │         │
│ │  Fi    │ │ FR     │  Grid   │
│ │  (42)  │ │  (18)  │  view   │
│ └────────┘ └────────┘         │
└────────────────────────────────┘
```

**Horizontal Scrolling Collections**
```
┌────────────────────────────────┐
│ Cryptonomicon           See all│
│ ┌────┐ ┌────┐ ┌────┐          │
│ │ 1  │ │ 2  │ │ 3  │  →       │  ← Horizontal scroll
│ └────┘ └────┘ └────┘          │
├────────────────────────────────┤
│ Standalone                     │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │    │ │    │ │    │ │    │  │  ← Vertical grid
│ └────┘ └────┘ └────┘ └────┘  │
└────────────────────────────────┘
```

**Lent Indicator - Visual Overlay**
```
┌────────┐
│░░░░░░░░│ ← Dimmed cover
│░░LENT░░│ ← Overlay badge
│░░░░░░░░│
└────────┘
```

---

### Quick Wins (Either Style)

1. Subtle shadows on book cards for depth
2. Realistic book cover corners: `border-radius: 2px 6px 6px 2px`
3. Warm background tint instead of pure white/black
4. Staggered animation on list load (50ms delay per card)
5. Empty state: sketch of empty bookshelf
6. "Lent to" as colored dot/ribbon, not just text

