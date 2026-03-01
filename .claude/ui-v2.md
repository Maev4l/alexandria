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

## Authentication

See @authn-scheme.md for full authentication documentation (native + Google OAuth, account linking, admin approval).

## Tech stack

| Lib                      | Version |
| ------------------------ | ------- |
| React                    | 19.1.0  |
| Vite                     | 6.3.5   |
| Tailwind CSS             | 4.1.18  |
| vite-plugin-pwa          | 1.2.0   |
| class-variance-authority | 0.7.1   |
| clsx                     | 2.1.1   |
| tailwind-merge           | 2.6.0   |
| lucide-react             | 0.469.0 |
| aws-amplify              | 6.16.2  |
| react-router-dom         | 7.13.0  |
| @zxing/browser           | 0.1.5   |
| @zxing/library           | 0.21.3  |
| react-webcam             | 7.2.0   |
| lottie-react             | 2.4.0   |

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
    │   └── AuthContext.jsx # AuthProvider, useAuth hook (Cognito + Google OAuth, account linking)
    ├── navigation/         # react-router-dom based navigation
    │   ├── index.js        # Exports: AppBar, Layout
    │   ├── AppBar.jsx      # Props-based header (title, headerLeft, headerRight) - rendered by each page
    │   ├── BottomTabs.jsx  # Sticky footer with NavLink-based tab buttons (internal)
    │   └── Layout.jsx      # Authenticated layout: Outlet + BottomTabs
    ├── hooks/              # Navigation helper hooks (bridge URL params to context)
    │   ├── index.js        # Module exports
    │   ├── useLibraryData.js  # useLibraryData(libraryId) → { library, isSharedLibrary, isLoading }
    │   ├── useItemData.js  # useItemData(libraryId, itemId) → { item, library, isSharedLibrary, isLoading }
    │   └── useOnboarding.js   # useOnboarding() → { showOnboarding, completeOnboarding } (localStorage)
    ├── api/                # API client layer
    │   ├── index.js        # Module exports
    │   ├── client.js       # Base fetch with auth token injection
    │   ├── libraries.js    # Library API endpoints
    │   ├── detection.js    # Detection API (ISBN lookup + video OCR/title search)
    │   └── search.js       # Search API (fuzzy search for books + videos)
    ├── state/              # Shared state (React Context, no Redux)
    │   ├── index.js        # Module exports
    │   └── LibrariesContext.jsx  # Libraries state + actions
    ├── pages/
    │   ├── Login.jsx       # Login form (native + Google OAuth)
    │   ├── SignUp.jsx      # Native signup form with password validation
    │   ├── PendingApproval.jsx # Shown when user.approved = false
    │   ├── Libraries.jsx   # Libraries list with pull-to-refresh + actions
    │   ├── NewLibrary.jsx  # Create library form
    │   ├── EditLibrary.jsx # Edit library form
    │   ├── UnshareLibrary.jsx # Unshare library - user selection
    │   ├── LibraryContent.jsx # Library items: unified list (books + videos, collections), alphabetically sorted
    │   ├── AddBook.jsx     # Add book: camera scan or manual ISBN entry
    │   ├── BookDetectionResults.jsx # ISBN lookup results - select and create, or link to NewBook
    │   ├── NewBook.jsx     # Manual book entry form (Cancel goes to LibraryContent)
    │   ├── EditBook.jsx    # Edit book form (pre-filled from item)
    │   ├── BookDetail.jsx  # Book detail view (cover, info, summary, history button)
    │   ├── AddVideo.jsx    # Add video: camera OCR or manual title search
    │   ├── VideoDetectionResults.jsx # TMDB lookup results - select and create video
    │   ├── NewVideo.jsx    # Manual video entry form (Cancel goes to LibraryContent)
    │   ├── EditVideo.jsx   # Edit video form (pre-filled from item)
    │   ├── VideoDetail.jsx # Video detail view (poster, info, cast, summary, history button)
    │   ├── ItemHistory.jsx # Item lending/return history (paginated list)
    │   ├── Search.jsx      # Search tab: fuzzy search for books + videos, recent searches
    │   ├── Settings.jsx    # Settings tab: list with Account, About, Sign out
    │   ├── Account.jsx     # Account page: avatar, username (copy), password change
    │   └── About.jsx       # About page: app info and version
    ├── components/
    │   ├── LibraryCard.jsx # Compact card with long press support
    │   ├── BookCard.jsx    # Book item card with cover image + optional order number
    │   ├── VideoCard.jsx   # Video item card with poster image + optional order number
    │   ├── CollectionCard.jsx # Horizontal scroll card for grouped items (books + videos) in a collection
    │   ├── AddItemSheet.jsx    # Action sheet for choosing item type (Book/Video)
    │   ├── LibraryActionsSheet.jsx  # Actions: Edit, Share (inline), Unshare, Delete
    │   ├── ItemActionsSheet.jsx  # Actions: Edit, Lend, Delete (for items)
    │   ├── PullToRefresh.jsx  # Pull-to-refresh (transform-based, with ref for scroll control)
    │   ├── BottomSheet.jsx # Reusable bottom sheet
    │   ├── Toast.jsx       # Toast notification system
    │   ├── Onboarding.jsx  # Full-screen swipeable onboarding with Lottie animations
    │   └── ui/             # shadcn/ui components
    │       ├── Button.jsx
    │       ├── Card.jsx
    │       ├── Input.jsx
    │       ├── Label.jsx
    │       ├── Textarea.jsx
    │       └── Timeline.jsx  # Reusable timeline (compound: Timeline + Timeline.Item)
    ├── lib/
    │   ├── utils.js        # cn() utility (clsx + tailwind-merge)
    │   └── splash.js       # hideSplash() utility
    └── assets/
        └── animations/     # Lottie JSON files for onboarding (welcome, add-item, collections, share)
```

## URL Structure

| Route                 | URL                                           | Notes                                     |
| --------------------- | --------------------------------------------- | ----------------------------------------- |
| Login                 | `/login`                                      | Public, native + Google OAuth             |
| SignUp                | `/signup`                                     | Public, native signup only                |
| PendingApproval       | (conditional)                                 | Shown when authenticated but not approved |
| Libraries             | `/libraries`                                  | Tab: Libraries                            |
| Search                | `/search`                                     | Tab: Search                               |
| Settings              | `/settings`                                   | Tab: Settings                             |
| Account               | `/settings/account`                           | Stack                                     |
| About                 | `/settings/about`                             | Stack                                     |
| NewLibrary            | `/libraries/new`                              | Stack                                     |
| EditLibrary           | `/libraries/:libraryId/edit`                  | Stack                                     |
| UnshareLibrary        | `/libraries/:libraryId/unshare`               | Stack                                     |
| LibraryContent        | `/libraries/:libraryId`                       | Stack                                     |
| AddBook               | `/libraries/:libraryId/add-book`              | Stack                                     |
| BookDetectionResults  | `/libraries/:libraryId/book-results`          | Stack, state via location.state           |
| NewBook               | `/libraries/:libraryId/books/new`             | Stack                                     |
| EditBook              | `/libraries/:libraryId/books/:itemId/edit`    | Stack                                     |
| BookDetail            | `/libraries/:libraryId/books/:itemId`         | Stack                                     |
| AddVideo              | `/libraries/:libraryId/add-video`             | Stack                                     |
| VideoDetectionResults | `/libraries/:libraryId/video-results`         | Stack, state via location.state           |
| NewVideo              | `/libraries/:libraryId/videos/new`            | Stack                                     |
| EditVideo             | `/libraries/:libraryId/videos/:itemId/edit`   | Stack                                     |
| VideoDetail           | `/libraries/:libraryId/videos/:itemId`        | Stack                                     |
| ItemHistory           | `/libraries/:libraryId/items/:itemId/history` | Stack                                     |

## Screen flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UNAUTHENTICATED                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                               ┌────────────┐
                               │   Login    │◄──────────────────┐
                               │ (native +  │                   │
                               │  Google)   │                   │
                               └────────────┘                   │
                                      │                         │
                    ┌─────────────────┼─────────────────┐       │
                    │                 │                 │       │
                    ▼                 │                 ▼       │
             ┌────────────┐           │          ┌────────────┐ │
             │   SignUp   │           │          │   Google   │ │
             │  (native)  │           │          │   OAuth    │ │
             └────────────┘           │          └────────────┘ │
                    │                 │                 │       │
                    │ success         │                 │       │
                    ▼                 │                 │       │
             ┌────────────┐           │                 │       │
             │  Account   │           │ login success   │       │
             │  Created   │───────────┼─────────────────┘       │
             │  (toast)   │           │                         │
             └────────────┘           ▼                         │
                                ┌───────────┐                   │
                                │ approved? │                   │
                                └───────────┘                   │
                                      │                         │
                         ┌────────────┴────────────┐            │
                         │ NO                      │ YES        │
                         ▼                         ▼            │
                  ┌─────────────┐           ┌───────────┐       │
                  │  Pending    │           │   App     │       │
                  │  Approval   │           │  (Layout) │       │
                  │  (sign out) │───────────┘           │       │
                  └─────────────┘     sign out          │       │
                         │                              │       │
                         └──────────────────────────────┴───────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATED (react-router-dom Layout)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Libraries]               [Search]                [Settings]               │
│       ▼                        ▼                        ▼                   │
│  Libraries.jsx            Search.jsx              Settings.jsx              │
│  (list + PTR)             (fuzzy search)          (Account/About/SignOut)   │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        │ tap card
        ▼
┌───────────────────┐   long press   ┌─────────────────────┐
│  LibraryContent   │───────────────►│ LibraryActionsSheet │
│  (items + PTR)    │                │ Edit/Share/Unshare/ │
└───────────────────┘                │ Delete              │
        │                            └─────────────────────┘
        │                                     │
        │ tap "+"                             ├── Edit ──────► EditLibrary
        ▼                                     ├── Share ─────► (inline form)
┌───────────────────┐                         ├── Unshare ───► UnshareLibrary
│  AddItemSheet     │                         └── Delete ────► (confirm)
│  - Add Book ──────┼─────────────────────────────────────────┐
│  - Add Video ─────┼─────────────────────────────────────────┼────┐
└───────────────────┘                                         │    │
                                                              ▼    │
┌─────────────────────────────────────────────────────────────┐    │
│  AddBook                                                    │    │
│  ┌──────────────┐  scan success   ┌─────────────────────┐   │    │
│  │ Camera scan  │────────────────►│ BookDetectionResults│   │    │
│  └──────────────┘                 │ (Cancel → Library)  │   │    │
│  ┌──────────────┐  submit         └──────────┬──────────┘   │    │
│  │ Manual ISBN  │────────────────────────────┤              │    │
│  └──────────────┘                            │              │    │
│  ┌──────────────┐  tap "manual"              │ no results   │    │
│  │ Manual entry │────────────────►┌──────────▼──────────┐   │    │
│  └──────────────┘                 │ NewBook             │   │    │
│                                   │ (Cancel → Library)  │   │    │
└───────────────────────────────────┴─────────────────────┘   │    │
                                                              │    │
                                                              │    ▼
┌─────────────────────────────────────────────────────────────┼────────┐
│  AddVideo                                                   │        │
│  ┌──────────────┐  capture success  ┌──────────────────────┐│        │
│  │ Camera OCR   │──────────────────►│ VideoDetectionResults││        │
│  │ (capture)    │                   │ (Cancel → Library)   ││        │
│  └──────────────┘                   └──────────────────────┘│        │
│  ┌──────────────┐  submit                    ▲              │        │
│  │ Title search │────────────────────────────┘              │        │
│  └──────────────┘                                           │        │
└─────────────────────────────────────────────────────────────┘        │
                                                                       │
                  ◄────────────────────────────────────────────────────┘
                                 (back to LibraryContent)

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ITEM ACTIONS (long press)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  LibraryContent                                                             │
│       │                                                                     │
│       │ long press on BookCard or VideoCard                                 │
│       ▼                                                                     │
│  ┌─────────────────────┐                                                    │
│  │  ItemActionsSheet   │                                                    │
│  │  - Edit ──────────────► EditBook or EditVideo (based on item type)       │
│  │  - Lend ─────────────────► (inline form in sheet, enter name)            │
│  │  - Return ───────────────► (API call, clears lentTo)                     │
│  │  - Delete ────────────► (deletes via API, list refreshed)                │
│  └─────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ITEM DETAIL (tap on item)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  LibraryContent                                                             │
│       │                                                                     │
│       │ tap on BookCard           │ tap on VideoCard                        │
│       ▼                           ▼                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐                         │
│  │  BookDetail         │    │  VideoDetail        │                         │
│  │  (cover, authors,   │    │  (poster, directors,│                         │
│  │   summary, ISBN)    │    │   cast, duration)   │                         │
│  │  [History button]   │    │  [History button]   │                         │
│  └──────────┬──────────┘    └──────────┬──────────┘                         │
│             └───────────────────────────┴──► ItemHistory (shared)           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           SETTINGS (tab)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Settings.jsx                                                               │
│       │                                                                     │
│       ├── Account ──────────► Account.jsx (avatar, username copy, password) │
│       ├── About ────────────► About.jsx (app info, version)                 │
│       └── Sign out ─────────► (signs out, redirects to Login)               │
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
- [x] Share library: inline form in LibraryActionsSheet (email input)
- [x] Unshare library: dedicated page with user list + selection
- [x] Delete library with two-step confirmation in action sheet
- [x] Library content page with infinite scroll + pull-to-refresh
- [x] Collection grouping: items with same collection grouped in collapsible cards, sorted by order
- [x] Tap AppBar title to scroll content to top (iOS convention)
- [x] Long press on item → action sheet (Edit, Lend, Delete)
- [x] Add book flow: "+" button → AddBook (scan or manual ISBN)
- [x] ISBN detection: manual ISBN input → API lookup → select result → create book directly
- [x] Detection fallback: no results found → link to NewBook (Cancel → LibraryContent)
- [x] Scan ISBN: camera barcode scanning (@zxing/browser, EAN-13/EAN-8)
- [x] Edit book: form with pre-filled data, updates via context
- [x] Book detail page: tap book → full info view (read-only) with history button
- [x] Lend/Return: inline form in ItemActionsSheet (lend), direct API call (return)
- [x] Item history page: paginated lending/return events accessed from BookDetail
- [x] Shared library read-only mode: header shows sharer, no add button, no item actions
- [x] Search page: fuzzy search with debounce (3+ chars), recent searches (localStorage), navigate to BookDetail
- [x] Settings page: Account, About (app info), Sign out
- [x] Account page: avatar with initials, username (copy), password change with complexity validation
- [x] Video support: item type selection sheet (Book/Video) when adding items
- [x] Add video flow: camera OCR (manual capture) or title search
- [x] Video detection: TMDB lookup → select result → create video (Cancel → LibraryContent)
- [x] VideoCard component: displays video in library list with directors/year
- [x] Edit video: form with pre-filled data (directors, cast, year, duration)
- [x] Video detail page: poster, directors, cast (top 5), duration, summary
- [x] CollectionCard: renders VideoCard for video items within collections
- [x] Search: unified results for books and videos, navigates to appropriate detail page
- [x] Google OAuth sign-in: button on login page, redirect flow via Cognito
- [x] Native signup: form with email, display name, password validation
- [x] Pending approval page: shown when user.approved = false, with sign out
- [x] OAuth callback handling: account linked message, error display
- [x] Account page: shows email from JWT (not username)
- [x] Onboarding: swipeable story mode with Lottie animations for first-time users

### UI Refresh

- [x] Dark theme: "Library at Twilight" deep blue-purple palette, dark-first design
- [x] Glassmorphism cards: frosted glass effect with backdrop-blur on all cards
- [x] Gradient mesh background: layered radial gradients (purple/blue glows)
- [x] Floating nav pill: centered bottom tabs with sliding indicator
- [x] Cover color extraction: `lib/colorExtractor.js` extracts dominant color from covers
- [x] Detail page hero: gradient background from cover color, reflection effect
- [x] Long press lift animation: cards rise with enhanced shadow
- [x] Tab switch animations: directional slide between tabs
- [x] Spotlight search: full-screen overlay, glassmorphism input, pill chips for recent
- [x] Collection unfold animation: staggered item reveal (80ms delay)

## Future Enhancements

### Medium Effort

| Feature         | Description                                            |
| --------------- | ------------------------------------------------------ |
| Swipe actions   | Swipe left on cards to reveal Edit/Delete/Lend buttons |
| Cover zoom      | Tap cover image to see full-size in a modal            |
| Drag to reorder | Reorder items within collections by dragging           |
| Tags            | Custom tags beyond collections                         |

### Higher Effort

| Feature      | Description                       |
| ------------ | --------------------------------- |
| Offline mode | Cache data for offline browsing   |

### Needs Backend Changes

| Feature          | Description                                                 | Blocker                    |
| ---------------- | ----------------------------------------------------------- | -------------------------- |
| Sorting options  | Sort by title, date added, author (dropdown in AppBar)      | Needs `createdAt` field    |
| Statistics card  | Show total books/videos, lent items count on Libraries page | Needs aggregation endpoint |
| Recently added   | Horizontal scroll of last 5 items on home                   | Needs `createdAt` field    |
| Dashboard        | Visual stats: items per month chart, genre breakdown        | Needs aggregation endpoint |
