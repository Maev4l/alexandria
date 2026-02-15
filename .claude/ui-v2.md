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
    │   └── libraries.js    # Library API endpoints
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
- [ ] Search page implementation
- [ ] Settings page implementation
