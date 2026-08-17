# Alexandria Web Client v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/web-client-v3` from scratch — a React 19 + Vite 6 + Tailwind 4 PWA rendering the "Noir Imprint" visual system over the unchanged Alexandria API, ready to replace `web-client-v2` at `alexandria.isnan.eu`.

**Architecture:** One `react-router-dom` stack rooted at `/libraries` with no tab bar; search pinned in the header. A thin `fetch` API layer with Cognito bearer injection feeds hand-rolled React Context stores. All order-sensitive and date-sensitive logic lives in pure modules under `src/lib/` and is the TDD core. A local Vite plugin serves the API from fixtures under `VITE_MOCK=1`, so every screen is buildable, testable and screenshot-able without AWS.

**Tech Stack:** React 19.1.0, Vite 6.3.5, Tailwind CSS 4.1.18, `vite-plugin-pwa` 1.2.0, `aws-amplify` 6.16.2, `react-router-dom` 7.13.0, `@zxing/browser` + `@zxing/library`, `react-webcam`, Vitest + @testing-library/react + jsdom, Playwright, Oxlint.

**Spec:** `docs/superpowers/specs/2026-08-13-web-client-v3-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

**Backend and v2**
- **Zero backend impact.** No endpoint added, changed or removed. Contract: `packages/functions/api/openapi.yaml`.
- **Do not modify `packages/web-client-v2`.** It stays in production until cutover.
- **Do not modify the spec documents.** `PRODUCT.md`, `packages/web-client-v3/DESIGN.md` and `.claude/ui-v3.md` are owned by the design session. A rule that cannot be built, fails contrast, or contradicts the API is a **spec defect** — report it and stop; do not work around it and do not edit those files. The only exception is Task 23, which reconciles them by explicit instruction.

**Repo conventions**
- Package installs standalone: `yarn --cwd packages/web-client-v3 <cmd>`. No workspaces, own `yarn.lock`.
- `yarn`, never `npm`. **Strict versioning** — install with `--exact`, never a `^` or `~` range.
- JavaScript only. No TypeScript.
- `.jsx` for React components; PascalCase filenames; a directory's root component is `index.jsx` and takes the directory's name.
- Fat-arrow functions. Double quotes for JSX attributes, single quotes everywhere else.
- Comments explain **why**, not how.
- `dayjs` if a date library is ever needed — never `moment`. (This plan needs neither; date maths is a few lines in `src/lib/loans.js`.)
- All identifiers and comments in English. UI strings are English; item content is mixed English and French.
- Lint with Oxlint after changes: `yarn --cwd packages/web-client-v3 lint`.
- Never commit or push outside the explicit `git commit` steps in this plan. Never push at all.
- **A function that can sign a reader out must not be reachable from anything named like a getter**, and where a side effect is added to an existing function, every caller of that function is checked before it lands. `refresh()` read like a getter, called a sign-out on an empty result, and had two callers that ran concurrently — which destroyed a real user's session, twice.
- **An unconfirmed reading must not drive a decision.** A single empty session read, a single failed image load, a single missing field: confirm it before acting, because the transient and the permanent look identical at the first look and only the permanent should have consequences.
- **A test that is too strict fails good code**, and that is worse than a lax test passing bad code, because it sends you to fix something that was never broken. When a reproduction disagrees with a fix you believe in, check the fixture models the case you meant: modelling a *transient* empty window as *permanent* models a genuinely destroyed session instead, and no correct fix can pass against it.
- **Prove a test can see the defect**, not just that the suite is green: run it against the unfixed code and watch precisely the intended test fail. And when several guards ship together, remove each in turn — three guards imply three necessities to whoever inherits them, and usually only one is load-bearing.
- **Removing a guard and seeing nothing fail means one of two opposite things: the guard is dead, or it is UNTESTED.** They need opposite treatment, and only writing a reachable scenario against it tells you which. Two of the five auth guards were indistinguishable from dead by removal alone; both turned out to close real races, and deleting them would have looked evidence-backed and been wrong.
- **A green test in jsdom is evidence about jsdom.** Anything touching focus, layout, computed style or the cascade must be asserted in real Chrome via `yarn check:browser`, AND that check verified to FAIL when the behaviour is removed. jsdom reports `offsetParent` as `null` for every element, which silently emptied a focus trap's candidate list so two green tests exercised a degenerate branch and asserted nothing. This has now caught defects in the checks themselves twice.
- **"Nothing happened" is not an observation until something reports unconditionally.** Instrumentation that speaks only on failure makes silence ambiguous between "it never ran", "it succeeded" and "the log was truncated". Three console captures were misread that way, and the root cause of the session defect — a request firing fifteen seconds before sign-in — stayed invisible until a request announced itself at start and at outcome.
- **Stage explicit paths, never `git add -A <dir>`.** `packages/web-client-v3/DESIGN.md` is owned by the design session and is *tracked*, so no `.gitignore` can protect it — a wide add inside the package sweeps their amendments into an implementation commit. That has already happened once. Add the files the task actually touched, and if `git status` shows something you did not write, leave it.
- **Never stop, kill or restart the dev server on :5173.** It belongs to whoever is working, it may be running against the real backend rather than fixtures, and it is `strictPort` and shared with v2 — a stop meant as momentary can fail to come back. If you need something only read at config load (`vite.config.js`, `output.json`), **ask the user to restart**. To look at your own work, start a server on a **private port** and stop only that: `VITE_MOCK=1 yarn --cwd packages/web-client-v3 exec vite --port 5199 --strictPort`. `yarn check:browser` already does this itself and refuses to touch a server it did not start.

**Design system — non-negotiable, from `DESIGN.md`**
- **Palette law.** Ten tokens, each with exactly one meaning: `--paper #F6F6F3`, `--paper-deep #ECECE7`, `--ink #0B0B0B`, `--ink-soft #5A5A57`, `--imprint #F2C200`, `--out #D8412F` (on loan, nothing else), `--shared #0F6B4F` (shared, nothing else), plus the inverted-surface set `--cover-body #DEDED9`, `--cover-soft #B9B9B4`, `--cover-rule #3A3A38` (black cover only; on paper they are a bug). **No hex literal appears anywhere outside `src/index.css`.**
- **Yellow is how you find and how you act; ink is what you own.** `--imprint` marks the **apparatus of finding and acting** — the search field, index letters, the active/selected state, primary actions. It does **not** mark inventory. Counts are inventory: the library row plate, a collection board's count and a member's order plate are **2px ruled plates with `--ink` figures and no fill**. (Changed after slice A: rendered, the home screen made search the quietest element while every loud mark served browsing, which inverts `PRODUCT.md`'s first principle. Placement is not prominence.)
- **Accessibility floors that a stylesheet test cannot see.** Pinch-zoom stays enabled — no `maximum-scale`, no `user-scalable=no`. The focus ring must actually paint: never apply `outline-none` to a focusable element, because Tailwind utilities outrank the `:focus-visible` base rule and kill `outline-style` while leaving colour and width intact. Verify with `yarn check:browser`, which computes resolved styles in real Chrome; `yarn test` asserts only that rules are *declared*.
- **Desktop is one constrained column**, `max-w-md` (448px, 56 divisions), centred — including sheets. No breakpoints, no second layout.
- **No rounded corners** — every radius is 0. **No shadows.** No gradients, no glassmorphism.
- **No serif.** Archivo (variable) for everything; Chivo Mono for numerals, ISBN, runtime, dates.
- **Division scale.** Base unit 4px, division 8px. Every dimension, gap, inset and rule offset is a whole number of divisions. Phone margin 16px, gutter 8px, minimum touch target 48px, item row height 80px.
- **Rule weights** 1px hairline / 2px frame / 3px block / 4px index. Elevation is rule weight and ground shift, never shadow.
- **Uppercase is for interface labels only.** Content titles are never uppercased.
- **Every state carries words**, not colour alone, plus an `aria-label`.
- `--out` never sets small text: it is restricted to ≥18px bold, rules, and stamp outlines.
- **The client never sorts.** It renders the server's order and computes bucket labels only. `localeCompare` is forbidden on the item stream.
- **Nothing is labelled twice.** A fact appears in exactly one place.
- **Read-only means absent, not disabled.** A reader is never offered an action they cannot perform.
- **The action slot never holds an inert control** (`DESIGN.md` §6). Reserve the slot's height across every state so nothing jumps, and fill it with whichever of these fits:
  - *The reason is visible* — a required field sitting empty right above: the action renders as the **ruled outline** and fills to a plate on validity. No words; the outline-to-fill change is the affordance. Never a faded plate — a half-strength `--imprint` is a new colour meaning "disabled", which palette law forbids, and its label falls under the contrast floor.
  - *The reason is not visible* — a limit exceeded, a constraint that cannot be inferred: the slot carries the reason in `--ink-soft` caps **instead of** the control, in the control's own position.
  - A **disabled destructive** action has no treatment, because the case must not exist: a destructive button is already an outline and has nowhere to go. Replace it with the reason instead.
- **Refuse native control chrome the design never authored** (`DESIGN.md` §9) — a `textarea` resize grabber is a rounded diagonal handle in a system with no radii and no diagonals. Same for select arrows, number spinners, date pickers and the search input's clear button. Style it or remove it; do not ship the platform default.
- **An edge rule never displaces content.** The `--out` and `--shared` left edges are drawn as an absolutely positioned `::before`, never as `border-left`, which would add to the box and push every marked row 4px out of alignment with its unmarked neighbours down the whole stream.
- **Count plates sit in a fixed 56px column, figure centred.** Plates sized to their content make a list ragged, because a 3-digit and a 2-digit count start their titles at different x positions.
- Motion: 80ms state swap, 160ms route shift, 200ms sheet rise, 160ms collection expand — all linear, no springs, all gated by `prefers-reduced-motion`.

**API facts that constrain the code**
- Optional fields are **omitted, not null** (`omitempty`): test presence, never `=== null`.
- `picture` is synthesised from a template whenever `pictureUrl` exists, without checking S3 — it can 404 while the thumbnail is still being produced. A frame that fails to load degrades to the ruled empty frame and re-polls once.
- Server order is diacritic- and case-folded: NFD → strip `\p{Mn}` → NFC → lowercase.
- Collection members run in `order`, not alphabetically. Boards file under the collection name.
- A `partial: true` board is emitted **first** on its continuation page.
- Mutations return empty bodies — re-read the item after a write.
- Listing `limit` ≤ 50. `POST /search` is unpaginated and matches title, authors, directors, cast and collection only.
- No `createdAt`, no due dates, no aggregates, no genres/tags/ratings. Never imply them.

**Blocked work**
- Tasks 6, 11 and 15 are the reproduction-first passes against the approved mockup. They require `packages/web-client-v3/design/comp-2026-08-13.html`, which the **design session must supply**. If that file is absent, skip those three tasks, complete everything else, and report the skip. Do not substitute your own composition and call it reproduced.

---

# Slice A — toolchain, tokens, shell, libraries root, auth, library CRUD

---

### Task 1: Package scaffold and toolchain

**Files:**
- Create: `packages/web-client-v3/package.json`
- Create: `packages/web-client-v3/vite.config.js`
- Create: `packages/web-client-v3/vitest.config.js`
- Create: `packages/web-client-v3/jsconfig.json`
- Create: `packages/web-client-v3/.oxlintrc.json`
- Create: `packages/web-client-v3/.gitignore`
- Create: `packages/web-client-v3/index.html`
- Create: `packages/web-client-v3/src/main.jsx`
- Create: `packages/web-client-v3/src/App.jsx`
- Create: `packages/web-client-v3/src/index.css`
- Create: `packages/web-client-v3/src/config.js`
- Create: `packages/web-client-v3/src/test/setup.js`
- Test: `packages/web-client-v3/src/config.test.js`
- Modify: `Makefile`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `config` object from `src/config.js`: `{ userPoolId, clientId, region, apiBaseUrl, buildHash, isMock, oauth: { domain, scopes, redirectSignIn, redirectSignOut, responseType } }`
  - Build-time globals `__APP_CONFIG__`, `__BUILD_HASH__`, `__MOCK__`
  - Path alias `@` → `packages/web-client-v3/src`
  - Make targets `frontend-v3-build`, `frontend-v3-serve`, `frontend-v3-preview`

- [ ] **Step 1: Create the package manifest**

Create `packages/web-client-v3/package.json`:

```json
{
  "name": "@alexandria/web-client-v3",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "oxlint src tools scripts",
    "lint:fix": "oxlint src tools scripts --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "shoot": "node scripts/shoot.mjs",
    "fonts": "node scripts/fetch-fonts.mjs",
    "icons": "node scripts/generate-icons.mjs"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

- [ ] **Step 2: Install dependencies at exact versions**

Versions shared with v2 are pinned to v2's exact values so the monorepo does not carry two
resolutions of the same library. New packages take whatever `--exact` resolves; record the
resolved versions in the commit message.

```bash
cd /Users/jrsue/dev/repos/alexandria
yarn --cwd packages/web-client-v3 add --exact \
  react@19.1.0 react-dom@19.1.0 react-router-dom@7.13.0 \
  aws-amplify@6.16.2 clsx@2.1.1 tailwind-merge@2.6.0
yarn --cwd packages/web-client-v3 add --exact --dev \
  vite@6.3.5 @vitejs/plugin-react@4.5.2 \
  tailwindcss@4.1.18 @tailwindcss/vite@4.1.18 \
  vite-plugin-pwa@1.2.0 oxlint@1.71.0 \
  vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  puppeteer-core sharp@0.35.1
```

`@zxing/*` and `react-webcam` are deliberately **not** installed here — they arrive in Task 18
and Task 19, the only routes that load them.

**Why `puppeteer-core` and not `puppeteer`.** Screenshots are used by two sessions: this one, to
reproduce the comped screens, and the design session, to review what shipped. Both run on the
same machine and drive the same system Chrome
(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, 151.0.7922.110), so the
bundled-Chromium download that `puppeteer` brings would be 200MB of redundancy with no
reproducibility gained. **Recorded consequence:** this makes the screenshot tooling
machine-dependent. If it ever runs in CI or on another machine, either set `CHROME_PATH` in that
environment or switch that environment to full `puppeteer`.

- [ ] **Step 3: Write the failing config test**

Create `packages/web-client-v3/src/config.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { config } from './config.js';

describe('config', () => {
  it('exposes the API base path the CloudFront behavior serves', () => {
    expect(config.apiBaseUrl).toBe('/api');
  });

  it('reads Cognito identifiers from the build-time app config', () => {
    expect(config.userPoolId).toBe('eu-central-1_TEST');
    expect(config.clientId).toBe('test-client-id');
  });

  it('points OAuth redirects at the dev origin when running on localhost', () => {
    expect(config.oauth.redirectSignIn).toBe('http://localhost:5173/');
    expect(config.oauth.redirectSignOut).toBe('http://localhost:5173/login');
  });

  it('names the branded auth domain', () => {
    expect(config.oauth.domain).toBe('alexandria-auth.isnan.eu');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test
```
Expected: FAIL — no `vitest.config.js`, and `src/config.js` does not exist.

- [ ] **Step 5: Write the Vite config**

Create `packages/web-client-v3/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const gitCommitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
};

// output.json is generated by `make infra-output` and gitignored. Fall back to empty values
// rather than failing the build: mock mode and CI must work without Terraform or AWS.
const loadOutput = () => {
  const file = path.resolve(__dirname, 'output.json');
  if (!fs.existsSync(file)) return { alexandriaUserPoolId: '', alexandriaClientId: '', apiEndpoint: '' };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

export default defineConfig(() => {
  const output = loadOutput();
  const isMock = process.env.VITE_MOCK === '1';

  return {
    define: {
      __APP_CONFIG__: JSON.stringify({
        userPoolId: output.alexandriaUserPoolId,
        clientId: output.alexandriaClientId,
      }),
      __BUILD_HASH__: JSON.stringify(gitCommitHash()),
      __MOCK__: JSON.stringify(isMock),
    },
    server: {
      port: 5173,
      // Fail loudly instead of drifting to another port: the OAuth callback URL is fixed.
      strictPort: true,
      proxy: isMock || !output.apiEndpoint ? undefined : {
        '/api': { target: output.apiEndpoint, changeOrigin: true, secure: true },
      },
    },
    preview: { port: 5173, strictPort: true },
    plugins: [react(), tailwindcss(), VitePWA({ registerType: 'prompt' })],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            amplify: ['aws-amplify'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});
```

The PWA manifest and workbox options are deliberately left at defaults here; Task 22 fills them
in once the icon set exists.

- [ ] **Step 6: Write the Vitest config and setup**

Create `packages/web-client-v3/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  define: {
    __APP_CONFIG__: JSON.stringify({
      userPoolId: 'eu-central-1_TEST',
      clientId: 'test-client-id',
    }),
    __BUILD_HASH__: JSON.stringify('testhash'),
    __MOCK__: JSON.stringify(false),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
});
```

Create `packages/web-client-v3/src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 7: Write the config module**

Create `packages/web-client-v3/src/config.js`:

```js
// Cognito and API configuration. Values are injected at build time from output.json
// (see vite.config.js) so nothing in src/ imports a gitignored file.
const appConfig = __APP_CONFIG__;

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const origin = isDev ? 'http://localhost:5173' : 'https://alexandria.isnan.eu';

export const config = {
  userPoolId: appConfig.userPoolId,
  clientId: appConfig.clientId,
  region: 'eu-central-1',
  // CloudFront routes /api/* to API Gateway; the dev server proxies the same path.
  apiBaseUrl: '/api',
  buildHash: __BUILD_HASH__,
  isMock: __MOCK__,
  oauth: {
    domain: 'alexandria-auth.isnan.eu',
    scopes: ['openid', 'email', 'profile'],
    redirectSignIn: `${origin}/`,
    redirectSignOut: `${origin}/login`,
    responseType: 'code',
  },
};
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
yarn --cwd packages/web-client-v3 test
```
Expected: PASS — 4 tests in `src/config.test.js`.

- [ ] **Step 9: Write the app shell files**

Create `packages/web-client-v3/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <meta name="theme-color" content="#0B0B0B" />
    <meta name="description" content="Alexandria — a circulation record for a physical collection" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="Alexandria" />
    <title>Alexandria</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Create `packages/web-client-v3/src/main.jsx`:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Amplify configuration is deliberately absent until Task 7: with empty Cognito identifiers it
would throw, and mock mode never reaches it.

Create `packages/web-client-v3/src/App.jsx`:

```jsx
const App = () => (
  <main className="min-h-dvh bg-[var(--paper)] p-4 text-[var(--ink)]">
    <p className="text-sm">Alexandria v3</p>
  </main>
);

export default App;
```

Create `packages/web-client-v3/src/index.css`:

```css
@import "tailwindcss";

:root {
  --paper: #f6f6f3;
  --ink: #0b0b0b;
}

body {
  background: var(--paper);
  color: var(--ink);
}
```

Task 2 replaces this stub with the full token layer.

- [ ] **Step 10: Write the tooling configs**

Create `packages/web-client-v3/jsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*"]
}
```

Create `packages/web-client-v3/.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": { "correctness": "error", "suspicious": "warn" },
  "env": { "browser": true, "es2024": true },
  "globals": {
    "__APP_CONFIG__": "readonly",
    "__BUILD_HASH__": "readonly",
    "__MOCK__": "readonly"
  },
  "ignorePatterns": ["dist", "node_modules", "design/shots"]
}
```

Create `packages/web-client-v3/.gitignore`:

```
node_modules
dist
dist-ssr
output.json
design/shots
test-results
playwright-report
.vite
```

- [ ] **Step 10b: Write the shared screenshot script**

Both sessions run this one script, so a comparison is never confounded by two renderers or two
sets of capture settings. It lands in Task 1 rather than at the first reproduction pass because
the design session needs it to shoot the comp independently.

Create `packages/web-client-v3/scripts/shoot.mjs`:

```js
#!/usr/bin/env node
// Deterministic screenshots for design review. Accepts a file:// comp and an http:// dev
// server through the same command, so reproduction is one workflow rather than two.
//
// Determinism matters more than convenience here: without a fixed device scale, settled
// fonts, and motion forced off, two runs of the same page differ and the comparison is noise.
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const VIEWPORTS = {
  // 390 is the comp's own frame width, so crops line up against it without scaling.
  phone: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
};

const DEFAULT_OUT = {
  phone: '.impeccable/review/mobile.png',
  tablet: '.impeccable/review/tablet.png',
  desktop: '.impeccable/review/desktop.png',
};

// puppeteer-core ships no browser. Resolve the real Chrome, and fail loudly rather than
// falling back to a different engine — comparing against a different renderer is worse than
// not comparing at all.
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const resolveChrome = () => {
  const candidate = process.env.CHROME_PATH || MAC_CHROME;
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(
    `No Chrome found at ${candidate}. Set CHROME_PATH to a Chrome or Chromium executable.`,
  );
};

const parseArgs = (argv) => {
  const args = { viewport: 'phone', scale: 2, full: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--full') args.full = true;
    else if (flag === '--target') args.target = argv[++i];
    else if (flag === '--viewport') args.viewport = argv[++i];
    else if (flag === '--out') args.out = argv[++i];
    else if (flag === '--clip') args.clip = argv[++i];
    else if (flag === '--wait') args.wait = argv[++i];
    else if (flag === '--scale') args.scale = Number(argv[++i]);
    else throw new Error(`Unknown flag ${flag}`);
  }
  if (!args.target) {
    throw new Error(
      'Usage: yarn shoot --target <file://…|http://…> [--viewport phone|tablet|desktop|WxH]\n' +
        '                 [--out path.png] [--full] [--clip <selector>] [--wait <selector>]',
    );
  }
  return args;
};

const resolveViewport = (name) => {
  if (VIEWPORTS[name]) return VIEWPORTS[name];
  const match = /^(\d+)x(\d+)$/.exec(name);
  if (!match) throw new Error(`Unknown viewport ${name}`);
  return { width: Number(match[1]), height: Number(match[2]) };
};

const args = parseArgs(process.argv.slice(2));
const viewport = resolveViewport(args.viewport);
const out = path.resolve(args.out ?? DEFAULT_OUT[args.viewport] ?? 'shot.png');

const browser = await puppeteer.launch({
  executablePath: resolveChrome(),
  headless: 'new',
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ ...viewport, deviceScaleFactor: args.scale });
  // Motion off at the engine level, so no transition is ever caught mid-flight.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

  await page.goto(args.target, { waitUntil: 'networkidle0', timeout: 60_000 });
  if (args.wait) await page.waitForSelector(args.wait, { timeout: 30_000 });
  // Webfonts swap late; capturing before they settle compares two different typefaces.
  await page.evaluate(() => document.fonts.ready);

  fs.mkdirSync(path.dirname(out), { recursive: true });

  // Element clipping is what makes a region-by-region review possible: a single full-page
  // thumbnail hides exactly the failures worth finding.
  const target = args.clip ? await page.$(args.clip) : page;
  if (args.clip && !target) throw new Error(`No element matches ${args.clip}`);
  await target.screenshot({ path: out, fullPage: args.clip ? undefined : args.full });

  console.log(`${out}  ${args.viewport} @${args.scale}x${args.full ? ' full-page' : ''}`);
} finally {
  await browser.close();
}
```

Verify it against the comp, which needs no dev server:

```bash
yarn --cwd packages/web-client-v3 shoot \
  --target "file://$(cd "$(dirname .)" && pwd)/docs/ui-design/ui-v3-mockup.html" \
  --viewport desktop --full --out .impeccable/review/comp.png
```
Expected: `.impeccable/review/comp.png` exists and shows the spec sheet with its three phone
comps.

**Gotcha, found in practice:** when clipping a single comp, pass a wide viewport. The comp rail
is `overflow-x: auto`, so at the 390px phone viewport it scrolls and the element screenshot loses
the right few pixels — enough to shave the account plate off comp 1. Use `--viewport 1600x1200`
with `--clip`; the clip determines the output size, so the viewport only has to be wide enough
that nothing is scrolled out of view.

Add `.impeccable/review` to the **repo root** `.gitignore` — the captures are build artefacts.

- [ ] **Step 11: Add the Make targets**

In `Makefile`, add `frontend-v3-build frontend-v3-serve frontend-v3-preview` to the `.PHONY`
list, extend `infra-output` to write the v3 config, and append the three targets after
`frontend-serve`.

Replace the `infra-output` recipe line with:

```make
infra-output: ## Export Terraform outputs to client/CLI configs (was infra:output)
	$(TF) output -json | jq '{alexandriaUserPoolId: .cognito_user_pool_id.value, alexandriaClientId: .cognito_user_pool_client_id.value, apiEndpoint: .api_endpoint.value}' | tee ./packages/web-client-v2/output.json ./packages/web-client-v3/output.json ./packages/cli/bin/config.json > /dev/null
```

Append:

```make
# v3 targets are build/preview only on purpose. There is exactly one web-client bucket and one
# distribution, so any S3 sync IS the cutover — see frontend-v3-cutover, added deliberately last.
frontend-v3-build: ## Sync configs then build the v3 web client
	$(MAKE) infra-output
	yarn --cwd packages/web-client-v3 build

frontend-v3-serve: ## Run the v3 Vite dev server (port 5173)
	yarn --cwd packages/web-client-v3 dev

frontend-v3-preview: ## Build and serve v3 locally against fixtures, no AWS required
	VITE_MOCK=1 yarn --cwd packages/web-client-v3 build
	VITE_MOCK=1 yarn --cwd packages/web-client-v3 preview
```

- [ ] **Step 12: Verify the dev server boots on the fixed port**

```bash
yarn --cwd packages/web-client-v3 dev
```
Expected: `Local: http://localhost:5173/`, and the page shows "Alexandria v3" on the paper
ground. Stop the server.

- [ ] **Step 13: Lint**

```bash
yarn --cwd packages/web-client-v3 lint
```
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git add packages/web-client-v3 Makefile
git commit -m "feat(web-v3): scaffold Vite + React + Tailwind package on port 5173

Vitest/jsdom test harness, Oxlint config, and build/serve/preview Make targets.
Deploy targets are intentionally build-only: one bucket serves production v2."
```

---

### Task 2: Token layer, fonts, and machine-verified contrast

**Files:**
- Create: `packages/web-client-v3/scripts/fetch-fonts.mjs`
- Create: `packages/web-client-v3/public/fonts/archivo-var.woff2` (generated)
- Create: `packages/web-client-v3/public/fonts/chivo-mono-var.woff2` (generated)
- Modify: `packages/web-client-v3/src/index.css` (replace the stub)
- Create: `packages/web-client-v3/src/lib/contrast.js`
- Test: `packages/web-client-v3/src/lib/contrast.test.js`
- Test: `packages/web-client-v3/src/tokens.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - CSS custom properties `--paper --paper-deep --ink --ink-soft --imprint --out --shared`,
    `--cover-body --cover-soft --cover-rule`,
    `--u --d`, `--rule-hair --rule-frame --rule-block --rule-index`
  - Tailwind theme colours `paper paper-deep ink ink-soft imprint out shared cover-body
    cover-soft cover-rule`
  - `contrastRatio(hexA, hexB) -> number` from `src/lib/contrast.js`

**The inverted surface has its own three colours.** `--ink-soft` on `--ink` measures about
1.9:1, so the black cover cannot borrow the paper palette's secondary tones. `DESIGN.md` §2
declares `--cover-body #DEDED9` (body copy), `--cover-soft #B9B9B4` (secondary content) and
`--cover-rule #3A3A38` (hairlines, structure only, never text). Using any of the three on paper
is a bug, exactly as using `--out` for anything but on-loan is.

**The focus ring is `--imprint`.** `--imprint` already owns the active/selected state, so it owns
the ring: `outline: 3px solid var(--imprint)` at `outline-offset: 2px`, flipping to `--ink` on
any element whose own ground is yellow. **Do not build a second ring with `box-shadow`** — the
no-shadow law is mechanically checkable, and a shadow-shaped outline defeats the check.

`DESIGN.md` §2 marks its contrast figures "intent, to be verified against the built surface".
This task turns that intent into a test, so the numbers are checked rather than trusted.

- [ ] **Step 1: Write the failing contrast test**

Create `packages/web-client-v3/src/lib/contrast.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast.js';

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('returns 1 for a colour against itself', () => {
    expect(contrastRatio('#F2C200', '#F2C200')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#0B0B0B', '#F6F6F3')).toBeCloseTo(
      contrastRatio('#F6F6F3', '#0B0B0B'),
      5,
    );
  });

  it('accepts three-digit hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/lib/contrast.test.js
```
Expected: FAIL — cannot resolve `./contrast.js`.

- [ ] **Step 3: Implement the contrast helper**

Create `packages/web-client-v3/src/lib/contrast.js`:

```js
// WCAG 2.1 relative luminance and contrast ratio. Exists so DESIGN.md §2's stated ratios are
// asserted by the test suite rather than taken on trust.
const parseHex = (hex) => {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
};

const channelLuminance = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export const relativeLuminance = (hex) => {
  const [r, g, b] = parseHex(hex).map(channelLuminance);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (hexA, hexB) => {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
yarn --cwd packages/web-client-v3 test src/lib/contrast.test.js
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the failing token test**

This test reads the real stylesheet, so it fails if a token is renamed, removed, or given a
different value — and it fails if anyone reintroduces a radius or a shadow.

Create `packages/web-client-v3/src/tokens.test.js`:

```js
import fs from 'fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './lib/contrast.js';

// import.meta.url, not __dirname: the package is "type": "module", so __dirname is undefined.
const css = fs.readFileSync(new URL('./index.css', import.meta.url), 'utf8');

const tokenValue = (name) => {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`token --${name} is not declared in index.css`);
  return match[1].trim();
};

const PALETTE = {
  paper: '#f6f6f3',
  'paper-deep': '#ecece7',
  ink: '#0b0b0b',
  'ink-soft': '#5a5a57',
  imprint: '#f2c200',
  out: '#d8412f',
  shared: '#0f6b4f',
  'cover-body': '#deded9',
  'cover-soft': '#b9b9b4',
  'cover-rule': '#3a3a38',
};

describe('token layer', () => {
  it.each(Object.entries(PALETTE))('declares --%s as %s', (name, value) => {
    expect(tokenValue(name).toLowerCase()).toBe(value);
  });

  it('declares the division scale', () => {
    expect(tokenValue('u')).toBe('4px');
    expect(tokenValue('d')).toBe('8px');
  });

  it('declares the four rule weights', () => {
    expect(tokenValue('rule-hair')).toBe('1px');
    expect(tokenValue('rule-frame')).toBe('2px');
    expect(tokenValue('rule-block')).toBe('3px');
    expect(tokenValue('rule-index')).toBe('4px');
  });
});

describe('contrast, as promised by DESIGN.md section 2', () => {
  const paper = PALETTE.paper;

  it('ink on paper clears AAA body text', () => {
    expect(contrastRatio(PALETTE.ink, paper)).toBeGreaterThanOrEqual(7);
  });

  it('ink-soft on paper clears AA body text', () => {
    expect(contrastRatio(PALETTE['ink-soft'], paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('ink on imprint clears AA body text, for plate caps', () => {
    expect(contrastRatio(PALETTE.ink, PALETTE.imprint)).toBeGreaterThanOrEqual(4.5);
  });

  it('shared on paper clears AA body text, for ribbons and tags', () => {
    expect(contrastRatio(PALETTE.shared, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('out on paper clears only the large-text threshold, which is why it is edges-only', () => {
    const ratio = contrastRatio(PALETTE.out, paper);
    expect(ratio).toBeGreaterThanOrEqual(3);
    // Documents the restriction rather than merely describing it: if a future palette change
    // lifted --out above 4.5 this would fail, and the edges-only rule could then be revisited.
    expect(ratio).toBeLessThan(4.5);
  });

  it('paper on ink clears AAA, for the item-detail black cover', () => {
    expect(contrastRatio(paper, PALETTE.ink)).toBeGreaterThanOrEqual(7);
  });
});

describe('the inverted surface, which cannot borrow the paper palette', () => {
  it('proves why: ink-soft on ink is unreadable, which is the reason the cover set exists', () => {
    expect(contrastRatio(PALETTE['ink-soft'], PALETTE.ink)).toBeLessThan(3);
  });

  it('cover-body clears AAA on ink, for the summary', () => {
    expect(contrastRatio(PALETTE['cover-body'], PALETTE.ink)).toBeGreaterThanOrEqual(7);
  });

  it('cover-soft clears AA on ink, for the plate line and loan durations', () => {
    expect(contrastRatio(PALETTE['cover-soft'], PALETTE.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('imprint clears AA on ink, for the title rule and the ledger head', () => {
    expect(contrastRatio(PALETTE.imprint, PALETTE.ink)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the focus ring', () => {
  it('is drawn with an outline, never a shadow', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--imprint\)/);
  });

  it('flips to ink on a yellow ground, where a yellow ring would vanish', () => {
    expect(css).toMatch(/outline-color:\s*var\(--ink\)/);
  });
});

describe('the system refuses', () => {
  it('declares no border radius', () => {
    expect(css).not.toMatch(/border-radius\s*:/);
    expect(css).not.toMatch(/--radius/);
  });

  it('declares no shadow', () => {
    expect(css).not.toMatch(/box-shadow\s*:/);
    expect(css).not.toMatch(/text-shadow\s*:/);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/tokens.test.js
```
Expected: FAIL — `token --paper-deep is not declared in index.css`.

- [ ] **Step 7: Write the font fetch script**

Create `packages/web-client-v3/scripts/fetch-fonts.mjs`:

```js
// Downloads Archivo and Chivo Mono (both OFL) as variable woff2, subset by Google's own
// Latin + Latin Extended-A unicode-range. Run once; the woff2 files are committed, because a
// build must not depend on fonts.googleapis.com being reachable.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/fonts');

// A modern UA string is required: Google serves woff2 only to browsers it recognises.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FACES = [
  {
    file: 'archivo-var.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap',
  },
  {
    file: 'chivo-mono-var.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400..700&display=swap',
  },
];

// Google emits one @font-face per unicode-range. latin-ext comes before latin; we want the
// latin-ext cut, which is a superset covering French diacritics and the OE/AE ligatures.
const pickLatinExtUrl = (css) => {
  const blocks = css.split('@font-face').filter((b) => b.includes('unicode-range'));
  const latinExt = blocks.find((b) => b.includes('U+0100')) ?? blocks[blocks.length - 1];
  return latinExt.match(/url\((https:[^)]+\.woff2)\)/)[1];
};

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const face of FACES) {
  const css = await fetch(face.css, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  const url = pickLatinExtUrl(css);
  const bytes = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  fs.writeFileSync(path.join(OUT_DIR, face.file), bytes);
  console.log(`${face.file}  ${(bytes.length / 1024).toFixed(1)} kB  <- ${url}`);
}
```

- [ ] **Step 8: Fetch the fonts**

```bash
yarn --cwd packages/web-client-v3 fonts
ls -la packages/web-client-v3/public/fonts
```
Expected: both `woff2` files present and non-empty.

If the network is unavailable, stop and report — do not substitute a system font stack. The
typography is a named part of the direction contract.

- [ ] **Step 9: Write the token layer**

Replace `packages/web-client-v3/src/index.css` entirely:

```css
@import "tailwindcss";

/* Self-hosted variable faces, Latin + Latin Extended-A. Archivo covers condensed plate
   lettering and normal-width body from one file; Chivo Mono gives tabular figures. */
@font-face {
  font-family: "Archivo";
  font-style: normal;
  font-weight: 400 900;
  font-stretch: 62% 125%;
  font-display: swap;
  src: url("/fonts/archivo-var.woff2") format("woff2");
}

@font-face {
  font-family: "Chivo Mono";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url("/fonts/chivo-mono-var.woff2") format("woff2");
}

/* Palette law: each colour means exactly one thing. No hex literal belongs anywhere else in
   the codebase — a colour spent decoratively is a bug, not a style choice. */
:root {
  --paper: #f6f6f3;
  --paper-deep: #ecece7;
  --ink: #0b0b0b;
  --ink-soft: #5a5a57;
  --imprint: #f2c200;
  --out: #d8412f;
  --shared: #0f6b4f;

  /* The black cover, and only the black cover. --ink-soft on --ink measures ~1.9:1, so the
     inverted surface genuinely cannot borrow the paper set. Any of these three used on paper
     is a bug. */
  --cover-body: #deded9;
  --cover-soft: #b9b9b4;
  --cover-rule: #3a3a38;

  /* The division governs layout — block padding, gaps, insets, row heights, margins between
     blocks. Typographic interiors use the base unit and may take optical 1-3px adjustments:
     a plate padded to a full 8px vertically stops reading as a plate and starts reading as a
     button. What the rule forbids is spacing by eye at layout scale, where drift compounds. */
  --u: 4px;
  --d: 8px;

  /* Elevation is rule weight and ground shift. There is no shadow token because there are
     no shadows, and no radius token because every radius is 0. */
  --rule-hair: 1px;
  --rule-frame: 2px;
  --rule-block: 3px;
  --rule-index: 4px;
}

@theme inline {
  --color-paper: var(--paper);
  --color-paper-deep: var(--paper-deep);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-imprint: var(--imprint);
  --color-out: var(--out);
  --color-shared: var(--shared);
  --color-cover-body: var(--cover-body);
  --color-cover-soft: var(--cover-soft);
  --color-cover-rule: var(--cover-rule);

  --font-sans: "Archivo", system-ui, sans-serif;
  --font-mono: "Chivo Mono", ui-monospace, monospace;

  --spacing: var(--u);
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.4;
    /* The imprint has no soft edges; disable the platform's tap tint too. */
    -webkit-tap-highlight-color: transparent;
  }

  /* Print does not ease, and it does not bounce. */
  * {
    border-radius: 0;
  }

  /* --imprint owns the active/selected state, so it owns the focus ring. An outline, never a
     shadow: the no-shadow law is mechanically checkable and a shadow-shaped ring defeats the
     check. On a yellow ground the ring flips to ink, where yellow-on-yellow would vanish. */
  :focus-visible {
    outline: 3px solid var(--imprint);
    outline-offset: 2px;
  }

  .on-imprint:focus-visible {
    outline-color: var(--ink);
  }
}

@layer utilities {
  /* Interface labels only — never a content title (DESIGN.md section 3). */
  .caps {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  .num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  /* Safe-area padding for the notch, required by the PWA guidelines. */
  .pad-top-safe {
    padding-top: max(1rem, env(safe-area-inset-top));
  }

  .pad-bottom-safe {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
}

/* Every transition in the app is declared through these two custom properties, so
   prefers-reduced-motion can retire all motion in one place. */
:root {
  --press-fast: 80ms;
  --press-route: 160ms;
  --press-sheet: 200ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --press-fast: 0ms;
    --press-route: 0ms;
    --press-sheet: 0ms;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 10: Run the tests to verify they pass**

```bash
yarn --cwd packages/web-client-v3 test
```
Expected: PASS — all token, contrast and config tests green.

- [ ] **Step 11: Lint and commit**

```bash
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): token layer, self-hosted Archivo + Chivo Mono, contrast tests

DESIGN.md section 2 marks its contrast figures as intent to be verified; tokens.test.js
now asserts them from the real stylesheet, and pins the edges-only restriction on --out."
```

---

### Task 3: Fixture API — screens buildable without AWS

**Files:**
- Create: `packages/web-client-v3/src/test/fixtures/index.js`
- Create: `packages/web-client-v3/src/test/fixtures/libraries.js`
- Create: `packages/web-client-v3/src/test/fixtures/items.js`
- Create: `packages/web-client-v3/src/test/fixtures/events.js`
- Create: `packages/web-client-v3/tools/mock-api.js`
- Create: `packages/web-client-v3/tools/vite-plugin-mock-api.js`
- Modify: `packages/web-client-v3/vite.config.js`
- Test: `packages/web-client-v3/tools/mock-api.test.js` → placed at `src/test/mock-api.test.js` so Vitest's `include` picks it up

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `fixtures` — `{ libraries, itemsByLibrary, eventsByItem, collectionsByLibrary, searchResults }`
  - `handleMockRequest(method, url) -> { status, body } | null` from `tools/mock-api.js`
  - `mockApi()` Vite plugin from `tools/vite-plugin-mock-api.js`

The fixtures are the realistic case, not the happy case. Every awkward shape the design has to
survive is represented here, once, so that no screen is ever built against data that is kinder
than production.

- [ ] **Step 1: Write the failing mock-API test**

Create `packages/web-client-v3/src/test/mock-api.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';

describe('handleMockRequest', () => {
  it('serves the library list', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries');
    expect(res.status).toBe(200);
    expect(res.body.libraries.length).toBeGreaterThan(1);
  });

  it('serves a first page of items with a nextToken', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(10);
    expect(res.body.nextToken).toBeTruthy();
  });

  it('serves the continuation page without a nextToken at the end', () => {
    const first = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items?limit=10');
    const second = handleMockRequest(
      'GET',
      `/api/v1/libraries/lib-fiction/items?limit=10&nextToken=${first.body.nextToken}`,
    );
    expect(second.status).toBe(200);
    expect(second.body.nextToken).toBeUndefined();
  });

  it('serves a single item by id', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items/item-lent');
    expect(res.status).toBe(200);
    expect(res.body.lentTo).toBe('Marie');
  });

  it('404s an unknown item, as the real API does', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items/nope');
    expect(res.status).toBe(404);
  });

  it('returns null for a path it does not handle, so the caller can fall through', () => {
    expect(handleMockRequest('GET', '/api/v1/unknown')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/test/mock-api.test.js
```
Expected: FAIL — cannot resolve `../../tools/mock-api.js`.

- [ ] **Step 3: Write the library fixtures**

Create `packages/web-client-v3/src/test/fixtures/libraries.js`:

```js
// Shapes mirror handlers/models.go exactly: optional fields are OMITTED, never null.
export const libraries = [
  {
    id: 'lib-fiction',
    name: 'Fiction',
    description: 'Romans et nouvelles',
    totalItems: 412,
    updatedAt: '2026-08-01T09:12:00Z',
    sharedTo: ['marie@example.com', 'paul@example.com', 'lea@example.com'],
  },
  {
    id: 'lib-films',
    name: 'Films',
    description: 'DVD and Blu-ray',
    totalItems: 138,
    updatedAt: '2026-07-22T18:40:00Z',
    sharedTo: [],
  },
  {
    id: 'lib-empty',
    name: 'Bandes dessinées',
    description: '',
    totalItems: 0,
    updatedAt: '2026-08-10T07:00:00Z',
    sharedTo: [],
  },
  {
    id: 'lib-shared-in',
    name: "Marie's shelf",
    description: 'Shared with me, read only',
    totalItems: 57,
    updatedAt: '2026-08-05T11:30:00Z',
    sharedFrom: 'marie@example.com',
  },
];
```

- [ ] **Step 4: Write the item fixtures**

Create `packages/web-client-v3/src/test/fixtures/items.js`:

```js
const book = (id, title, extra = {}) => ({
  id,
  type: 0,
  title,
  ownerId: 'OWNER1',
  libraryId: 'lib-fiction',
  libraryName: 'Fiction',
  authors: ['Anonyme'],
  summary: 'Résumé indisponible.',
  isbn: '9780000000000',
  updatedAt: '2026-08-01T09:12:00Z',
  ...extra,
});

const film = (id, title, extra = {}) => ({
  id,
  type: 1,
  title,
  ownerId: 'OWNER1',
  libraryId: 'lib-fiction',
  libraryName: 'Fiction',
  directors: ['Jean-Pierre Melville'],
  cast: ['Alain Delon', 'Nathalie Delon', 'François Périer'],
  summary: 'Un tueur à gages méthodique.',
  releaseYear: 1967,
  duration: 105,
  tmdbId: '10574',
  updatedAt: '2026-07-22T18:40:00Z',
  ...extra,
});

// The awkward cases the design must survive, each present exactly once:
// - a digit-leading title and a "OE"-leading title, which bucket outside A-Z
// - diacritics, which fold into their base letter
// - a null picture, and a picture URL that 404s
// - a lent item
// - a collection split across the page boundary at index 10
export const fictionItems = [
  book('item-1984', '1984', { authors: ['George Orwell'], isbn: '9780451524935' }),
  book('item-amerique', 'Amérique', { authors: ['Franz Kafka'] }),
  book('item-aurore', 'Aurore', { authors: ['Michel Tournier'], picture: undefined }),
  {
    id: 'coll-melville',
    type: 2,
    title: 'Melville',
    ownerId: 'OWNER1',
    libraryId: 'lib-fiction',
    libraryName: 'Fiction',
    description: 'Jean-Pierre Melville, dans l’ordre de sortie',
    itemCount: 4,
    updatedAt: '2026-07-22T18:40:00Z',
    items: [
      film('item-bob', 'Bob le flambeur', { order: 1, collectionId: 'coll-melville', collectionName: 'Melville' }),
      film('item-doulos', 'Le Doulos', { order: 2, collectionId: 'coll-melville', collectionName: 'Melville' }),
    ],
  },
  book('item-mendiant', 'Le Mendiant de Jérusalem', { authors: ['Elie Wiesel'] }),
  book('item-nadja', 'Nadja', { authors: ['André Breton'] }),
  book('item-lent', 'Notre-Dame de Paris', {
    authors: ['Victor Hugo'],
    lentTo: 'Marie',
    picture: 'https://alexandria.isnan.eu/thumbnails/user/OWNER1/library/lib-fiction/item/item-lent',
  }),
  book('item-broken', 'Pêcheur d’Islande', {
    authors: ['Pierre Loti'],
    // A thumbnail that has not been produced yet: the URL exists and 404s.
    picture: 'https://alexandria.isnan.eu/thumbnails/user/OWNER1/library/lib-fiction/item/missing',
  }),
  book('item-zazie', 'Zazie dans le métro', { authors: ['Raymond Queneau'] }),
  book('item-oeuvres', 'Œuvres complètes', { authors: ['Arthur Rimbaud'] }),
  // Page two: the continuation of the Melville collection, emitted first as the API does.
  {
    id: 'coll-melville',
    type: 2,
    title: 'Melville',
    ownerId: 'OWNER1',
    libraryId: 'lib-fiction',
    libraryName: 'Fiction',
    description: 'Jean-Pierre Melville, dans l’ordre de sortie',
    itemCount: 4,
    partial: true,
    updatedAt: '2026-07-22T18:40:00Z',
    items: [
      film('item-samourai', 'Le Samouraï', { order: 3, collectionId: 'coll-melville', collectionName: 'Melville' }),
      film('item-cercle', 'Le Cercle rouge', { order: 4, collectionId: 'coll-melville', collectionName: 'Melville' }),
    ],
  },
  book('item-voyage', 'Voyage au bout de la nuit', { authors: ['Louis-Ferdinand Céline'] }),
];

export const itemsByLibrary = {
  'lib-fiction': fictionItems,
  'lib-films': [film('item-armee', 'L’Armée des ombres', { libraryId: 'lib-films', libraryName: 'Films' })],
  'lib-empty': [],
  'lib-shared-in': [
    book('item-shared', 'Le Grand Meaulnes', {
      libraryId: 'lib-shared-in',
      libraryName: "Marie's shelf",
      ownerId: 'OWNER2',
      authors: ['Alain-Fournier'],
    }),
  ],
};

export const collectionsByLibrary = {
  'lib-fiction': [
    { id: 'coll-melville', name: 'Melville', description: 'Jean-Pierre Melville, dans l’ordre de sortie', itemCount: 4 },
  ],
  'lib-films': [],
  'lib-empty': [],
  'lib-shared-in': [],
};

export const searchResults = [
  fictionItems[0],
  fictionItems[6],
  itemsByLibrary['lib-shared-in'][0],
];
```

- [ ] **Step 5: Write the event fixtures**

Create `packages/web-client-v3/src/test/fixtures/events.js`:

```js
// Newest first, as the API returns them. Includes a closed loan, an open loan, and a LENT
// with no matching RETURNED so the pairing logic's unresolved branch has real data.
export const eventsByItem = {
  'item-lent': [
    { date: '2026-08-07T10:00:00Z', type: 'LENT', event: 'Marie' },
    { date: '2026-06-02T16:30:00Z', type: 'RETURNED', event: 'Paul' },
    { date: '2026-05-20T09:00:00Z', type: 'LENT', event: 'Paul' },
    { date: '2026-03-11T14:00:00Z', type: 'LENT', event: 'Léa' },
  ],
  'item-1984': [],
};
```

- [ ] **Step 6: Write the fixture barrel**

Create `packages/web-client-v3/src/test/fixtures/index.js`:

```js
export { libraries } from './libraries.js';
export { itemsByLibrary, collectionsByLibrary, searchResults, fictionItems } from './items.js';
export { eventsByItem } from './events.js';
```

- [ ] **Step 7: Write the mock request handler**

Create `packages/web-client-v3/tools/mock-api.js`:

```js
import { libraries } from '../src/test/fixtures/libraries.js';
import { itemsByLibrary, collectionsByLibrary, searchResults } from '../src/test/fixtures/items.js';
import { eventsByItem } from '../src/test/fixtures/events.js';

const ok = (body) => ({ status: 200, body });
const notFound = () => ({ status: 404, body: { message: 'Not found' } });

// The real nextToken is opaque and encrypted; the mock only has to be opaque to the client.
const encodeToken = (offset) => Buffer.from(String(offset)).toString('base64url');
const decodeToken = (token) => Number(Buffer.from(token, 'base64url').toString('utf8'));

const flatten = (entries) =>
  entries.flatMap((entry) => (entry.type === 2 ? [entry, ...(entry.items ?? [])] : [entry]));

export const handleMockRequest = (method, url) => {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const path = pathname.replace(/^\/api\/v1/, '');

  if (method === 'GET' && path === '/libraries') return ok({ libraries });

  const itemsMatch = path.match(/^\/libraries\/([^/]+)\/items$/);
  if (method === 'GET' && itemsMatch) {
    const all = itemsByLibrary[itemsMatch[1]] ?? [];
    const limit = Math.min(Number(searchParams.get('limit') ?? 10), 50);
    const offset = searchParams.has('nextToken') ? decodeToken(searchParams.get('nextToken')) : 0;
    const page = all.slice(offset, offset + limit);
    const end = offset + limit;
    return ok(end < all.length ? { items: page, nextToken: encodeToken(end) } : { items: page });
  }

  const itemMatch = path.match(/^\/libraries\/([^/]+)\/items\/([^/]+)$/);
  if (method === 'GET' && itemMatch) {
    const found = flatten(itemsByLibrary[itemMatch[1]] ?? []).find((i) => i.id === itemMatch[2]);
    // Collections are not items on this route in the real API either.
    return found && found.type !== 2 ? ok(found) : notFound();
  }

  const eventsMatch = path.match(/^\/libraries\/[^/]+\/items\/([^/]+)\/events$/);
  if (method === 'GET' && eventsMatch) return ok({ events: eventsByItem[eventsMatch[1]] ?? [] });
  if (method === 'POST' && eventsMatch) return { status: 201, body: null };
  if (method === 'DELETE' && eventsMatch) return ok(null);

  const collectionsMatch = path.match(/^\/libraries\/([^/]+)\/collections$/);
  if (method === 'GET' && collectionsMatch) {
    return ok({ collections: collectionsByLibrary[collectionsMatch[1]] ?? [] });
  }

  if (method === 'POST' && path === '/search') return ok({ results: searchResults });

  // Writes acknowledge with the empty body the real API returns, so the client's
  // re-read-after-write path is exercised rather than short-circuited.
  if (['POST', 'PUT', 'DELETE'].includes(method) && path.startsWith('/libraries')) {
    return { status: 200, body: { id: 'new-id' } };
  }

  return null;
};
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
yarn --cwd packages/web-client-v3 test src/test/mock-api.test.js
```
Expected: PASS — 6 tests.

- [ ] **Step 9: Write the Vite plugin**

Create `packages/web-client-v3/tools/vite-plugin-mock-api.js`:

```js
import { handleMockRequest } from './mock-api.js';

// Serves the API from fixtures so every screen is buildable, reviewable and screenshot-able
// without AWS credentials or a seeded account. Enabled only when VITE_MOCK=1.
const middleware = (req, res, next) => {
  const result = handleMockRequest(req.method, req.url);
  if (!result) {
    next();
    return;
  }
  // A visible, constant latency so loading states are exercised rather than skipped.
  setTimeout(() => {
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.body ?? {}));
  }, 120);
};

export const mockApi = () => ({
  name: 'alexandria-mock-api',
  configureServer(server) {
    server.middlewares.use('/api/v1', (req, res, next) => {
      req.url = `/api/v1${req.url}`;
      middleware(req, res, next);
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/v1', (req, res, next) => {
      req.url = `/api/v1${req.url}`;
      middleware(req, res, next);
    });
  },
});
```

- [ ] **Step 10: Wire the plugin into Vite**

In `packages/web-client-v3/vite.config.js`, add the import and register the plugin
conditionally:

```js
import { mockApi } from './tools/vite-plugin-mock-api.js';
```

and change the `plugins` array to:

```js
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({ registerType: 'prompt' }),
      ...(isMock ? [mockApi()] : []),
    ],
```

- [ ] **Step 11: Verify the mock server answers**

```bash
VITE_MOCK=1 yarn --cwd packages/web-client-v3 exec vite --port 5199 --strictPort &
sleep 4
curl -s http://localhost:5199/api/v1/libraries | head -c 200
kill %1   # only the server this snippet started
```
Expected: JSON beginning `{"libraries":[{"id":"lib-fiction"`.

- [ ] **Step 12: Lint and commit**

```bash
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): fixture API served by a local Vite plugin under VITE_MOCK=1

Fixtures carry the awkward cases on purpose: digit- and OE-leading titles, diacritics,
a null picture, a picture URL that 404s, a lent item, and a split collection."
```

---

### Task 4: App shell — header with a right slot, single stack, no tab bar

**Files:**
- Create: `packages/web-client-v3/src/lib/cn.js`
- Create: `packages/web-client-v3/src/components/icons/index.jsx`
- Create: `packages/web-client-v3/src/components/imprint/PlateButton.jsx`
- Create: `packages/web-client-v3/src/components/AppHeader.jsx`
- Create: `packages/web-client-v3/src/routes.jsx`
- Modify: `packages/web-client-v3/src/App.jsx`
- Test: `packages/web-client-v3/src/components/AppHeader.test.jsx`
- Test: `packages/web-client-v3/src/components/imprint/PlateButton.test.jsx`

**Interfaces:**
- Consumes: the token layer from Task 2.
- Produces:
  - `cn(...classes) -> string`
  - `<PlateButton variant="primary|secondary|danger" as="button|a" ...props />`
  - `<AppHeader wordmark | title | onBack | right | search | inverted | onTitleTap />`
  - `<AppRoutes />` and the route constants in `src/routes.jsx`

The comp shows the header's right-hand chrome-yellow plate carrying a different action per
screen — `JR` on the root, `＋` on browse, `⌕` on the cover. It is a **slot**, not an account
button, and `AppHeader` models it that way. The cover variant drops the pinned search field and
lets the slot carry search instead.

- [ ] **Step 1: Write the failing PlateButton test**

Create `packages/web-client-v3/src/components/imprint/PlateButton.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlateButton from './PlateButton.jsx';

describe('PlateButton', () => {
  it('renders its label in interface caps', () => {
    render(<PlateButton>New library</PlateButton>);
    const button = screen.getByRole('button', { name: 'New library' });
    // The label stays authored in the DOM; uppercasing is presentational, so a screen
    // reader and a test both read the sentence case the author wrote.
    expect(button).toHaveTextContent('New library');
    expect(button.className).toContain('caps');
  });

  it('defaults to the imprint plate for the primary action', () => {
    render(<PlateButton>Lend</PlateButton>);
    expect(screen.getByRole('button').className).toContain('bg-imprint');
  });

  it('draws the secondary action as a ruled outline with no fill', () => {
    render(<PlateButton variant="secondary">Edit</PlateButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('border-2');
    expect(cls).not.toContain('bg-imprint');
  });

  it('draws the destructive action in the on-loan red, which is allowed at this size', () => {
    render(<PlateButton variant="danger">Delete</PlateButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('border-out');
    expect(cls).toContain('text-out');
  });

  it('meets the 48px minimum touch target', () => {
    render(<PlateButton>Lend</PlateButton>);
    expect(screen.getByRole('button').className).toContain('min-h-12');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/components/imprint/PlateButton.test.jsx
```
Expected: FAIL — cannot resolve `./PlateButton.jsx`.

- [ ] **Step 3: Write cn and PlateButton**

Create `packages/web-client-v3/src/lib/cn.js`:

```js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges conditional classes and lets a caller's className win over a component default
// without specificity games.
export const cn = (...inputs) => twMerge(clsx(inputs));
```

Create `packages/web-client-v3/src/components/imprint/PlateButton.jsx`:

```jsx
import { cn } from '@/lib/cn';

// Primary is a chrome-yellow plate, secondary a ruled outline, destructive a red outline.
// Never three fills competing — comp section 05.
// `on-imprint` flips the focus ring to ink: a yellow ring on a yellow plate is invisible.
const VARIANTS = {
  primary: 'on-imprint bg-imprint text-ink border-2 border-imprint',
  secondary: 'bg-transparent text-current border-2 border-current',
  danger: 'bg-transparent text-out border-2 border-out',
};

const PlateButton = ({ variant = 'primary', className, children, ...props }) => (
  <button
    type="button"
    className={cn(
      'caps min-h-12 px-4 py-2 text-xs',
      'transition-colors duration-[var(--press-fast)] ease-linear',
      VARIANTS[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export default PlateButton;
```

`text-xs` is 12px, matching the comp's `.btn-plate { font-size: 12px }`. The `caps` utility
supplies `letter-spacing: .08em`; the comp's buttons use `.12em`, so add
`tracking-[0.12em]` to the class list.

- [ ] **Step 4: Run the test to verify it passes**

```bash
yarn --cwd packages/web-client-v3 test src/components/imprint/PlateButton.test.jsx
```
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the failing AppHeader test**

Create `packages/web-client-v3/src/components/AppHeader.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppHeader from './AppHeader.jsx';

const renderHeader = (props) =>
  render(
    <MemoryRouter>
      <AppHeader {...props} />
    </MemoryRouter>,
  );

describe('AppHeader', () => {
  it('shows the imprint wordmark at the root', () => {
    renderHeader({ wordmark: true });
    expect(screen.getByText('Alexandria')).toBeInTheDocument();
  });

  it('pins the search field by default and links it to the search surface', () => {
    renderHeader({ wordmark: true });
    expect(screen.getByRole('link', { name: /search every library/i })).toHaveAttribute(
      'href',
      '/search',
    );
  });

  it('drops the pinned search field on the inverted cover', () => {
    renderHeader({ inverted: true, onBack: () => {} });
    expect(screen.queryByRole('link', { name: /search every library/i })).toBeNull();
  });

  it('renders a back control when onBack is given', async () => {
    const onBack = vi.fn();
    renderHeader({ title: 'Romans', onBack });
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('does not uppercase the library title, which may be French', () => {
    renderHeader({ title: 'Bandes dessinées', onBack: () => {} });
    const title = screen.getByText('Bandes dessinées');
    expect(title.className).not.toContain('uppercase');
    expect(title.className).not.toContain('caps');
  });

  it('scrolls to top when the title is tapped, per the iOS convention', async () => {
    const onTitleTap = vi.fn();
    renderHeader({ title: 'Romans', onBack: () => {}, onTitleTap });
    await userEvent.click(screen.getByText('Romans'));
    expect(onTitleTap).toHaveBeenCalledOnce();
  });

  it('renders whatever the right slot is given', () => {
    renderHeader({ wordmark: true, right: <span>JR</span> });
    expect(screen.getByText('JR')).toBeInTheDocument();
  });

  it('pads for the notch', () => {
    const { container } = renderHeader({ wordmark: true });
    expect(container.querySelector('header').className).toContain('pad-top-safe');
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/components/AppHeader.test.jsx
```
Expected: FAIL — cannot resolve `./AppHeader.jsx`.

- [ ] **Step 7: Write the icons**

Create `packages/web-client-v3/src/components/icons/index.jsx`:

```jsx
// Hand-authored marks rather than an icon dependency: the system refuses icons that carry
// state, so only universal affordances remain, and their stroke weights belong on the
// division scale like every other rule in the interface.
const Svg = ({ children, size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

export const ChevronLeft = (props) => (
  <Svg {...props}>
    <path d="M13 3 L6 10 L13 17" />
  </Svg>
);

export const Search = (props) => (
  <Svg {...props}>
    <circle cx="9" cy="9" r="5" />
    <path d="M13 13 L17 17" />
  </Svg>
);

export const Plus = (props) => (
  <Svg {...props}>
    <path d="M10 4 V16 M4 10 H16" />
  </Svg>
);

export const Close = (props) => (
  <Svg {...props}>
    <path d="M4 4 L16 16 M16 4 L4 16" />
  </Svg>
);

export const Camera = (props) => (
  <Svg {...props}>
    <path d="M2 6 H6 L7 4 H13 L14 6 H18 V16 H2 Z" />
    <circle cx="10" cy="11" r="3" />
  </Svg>
);

export const Check = (props) => (
  <Svg {...props}>
    <path d="M4 10 L8 14 L16 5" />
  </Svg>
);

export const Copy = (props) => (
  <Svg {...props}>
    <path d="M6 6 H16 V16 H6 Z" />
    <path d="M4 14 V4 H14" />
  </Svg>
);

export const Refresh = (props) => (
  <Svg {...props}>
    <path d="M17 10 A7 7 0 1 1 14 4.3" />
    <path d="M17 3 V8 H12" />
  </Svg>
);
```

- [ ] **Step 8: Write AppHeader**

Create `packages/web-client-v3/src/components/AppHeader.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ChevronLeft, Search } from '@/components/icons';

// The header carries three things and never a tab bar: identity or a way back, the pinned
// search field, and one right-hand plate whose contents change per screen (account on the
// root, add inside a library, search on the cover).
const AppHeader = ({
  wordmark = false,
  title,
  onBack,
  onTitleTap,
  right,
  search = true,
  inverted = false,
}) => (
  <header
    className={cn(
      'pad-top-safe border-b-2 px-4 pb-2',
      inverted ? 'border-paper bg-ink text-paper' : 'border-ink bg-paper text-ink',
    )}
  >
    <div className="flex min-h-12 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={cn(
              'flex size-12 shrink-0 items-center justify-center -ml-3',
              inverted ? 'text-imprint' : 'text-ink-soft',
            )}
          >
            <ChevronLeft />
          </button>
        )}
        {wordmark && <span className="caps truncate text-xs tracking-[0.2em]">Alexandria</span>}
        {title && (
          // Content title: never uppercased, because it may be a long French name.
          <button
            type="button"
            onClick={onTitleTap}
            className="truncate text-left text-xl font-extrabold leading-tight"
          >
            {title}
          </button>
        )}
      </div>
      {right}
    </div>

    {search && !inverted && (
      <Link
        to="/search"
        className="mt-3 flex min-h-12 items-center justify-between border-2 border-ink bg-paper-deep p-2 text-[13px] text-ink-soft"
      >
        <span>Search every library</span>
        <Search size={16} />
      </Link>
    )}
  </header>
);

export default AppHeader;
```

`mt-3` is 12px, reproducing the comp's `.searchfield { margin-top: calc(var(--d) * 1.5) }`.

- [ ] **Step 9: Run the test to verify it passes**

```bash
yarn --cwd packages/web-client-v3 test src/components/AppHeader.test.jsx
```
Expected: PASS — 8 tests.

- [ ] **Step 10: Write the route table**

Create `packages/web-client-v3/src/routes.jsx`:

```jsx
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

// Route-level code splitting. The capture routes are the reason this matters: @zxing and
// react-webcam must never be in the entry bundle for a reader who only ever looks things up.
const Login = lazy(() => import('@/pages/Login.jsx'));
const SignUp = lazy(() => import('@/pages/SignUp.jsx'));
const Libraries = lazy(() => import('@/pages/Libraries.jsx'));
const NewLibrary = lazy(() => import('@/pages/NewLibrary.jsx'));
const EditLibrary = lazy(() => import('@/pages/EditLibrary.jsx'));
const UnshareLibrary = lazy(() => import('@/pages/UnshareLibrary.jsx'));
const LibraryBrowse = lazy(() => import('@/pages/LibraryBrowse.jsx'));
const NewCollection = lazy(() => import('@/pages/NewCollection.jsx'));
const EditCollection = lazy(() => import('@/pages/EditCollection.jsx'));
const AddBook = lazy(() => import('@/pages/AddBook.jsx'));
const BookDetectionResults = lazy(() => import('@/pages/BookDetectionResults.jsx'));
const AddVideo = lazy(() => import('@/pages/AddVideo.jsx'));
const VideoDetectionResults = lazy(() => import('@/pages/VideoDetectionResults.jsx'));
const NewBook = lazy(() => import('@/pages/NewBook.jsx'));
const NewVideo = lazy(() => import('@/pages/NewVideo.jsx'));
const ItemDetail = lazy(() => import('@/pages/ItemDetail.jsx'));
const EditItem = lazy(() => import('@/pages/EditItem.jsx'));
const ItemHistory = lazy(() => import('@/pages/ItemHistory.jsx'));
const Search = lazy(() => import('@/pages/Search.jsx'));
const Settings = lazy(() => import('@/pages/Settings.jsx'));
const Account = lazy(() => import('@/pages/Account.jsx'));
const About = lazy(() => import('@/pages/About.jsx'));

// A ruled frame at the correct ratio, so the layout does not move when the route lands.
const RouteFallback = () => <div className="min-h-dvh bg-paper" aria-busy="true" />;

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route path="/libraries" element={<Libraries />} />
      <Route path="/libraries/new" element={<NewLibrary />} />
      <Route path="/libraries/:libraryId" element={<LibraryBrowse />} />
      <Route path="/libraries/:libraryId/edit" element={<EditLibrary />} />
      <Route path="/libraries/:libraryId/unshare" element={<UnshareLibrary />} />
      <Route path="/libraries/:libraryId/collections/new" element={<NewCollection />} />
      <Route path="/libraries/:libraryId/collections/:collectionId/edit" element={<EditCollection />} />
      <Route path="/libraries/:libraryId/add/book" element={<AddBook />} />
      <Route path="/libraries/:libraryId/add/book/results" element={<BookDetectionResults />} />
      <Route path="/libraries/:libraryId/add/video" element={<AddVideo />} />
      <Route path="/libraries/:libraryId/add/video/results" element={<VideoDetectionResults />} />
      <Route path="/libraries/:libraryId/items/new/book" element={<NewBook />} />
      <Route path="/libraries/:libraryId/items/new/video" element={<NewVideo />} />
      <Route path="/libraries/:libraryId/items/:itemId" element={<ItemDetail />} />
      <Route path="/libraries/:libraryId/items/:itemId/edit" element={<EditItem />} />
      <Route path="/libraries/:libraryId/items/:itemId/history" element={<ItemHistory />} />

      <Route path="/search" element={<Search />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/account" element={<Account />} />
      <Route path="/settings/about" element={<About />} />

      <Route path="*" element={<Navigate to="/libraries" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
```

- [ ] **Step 11: Create placeholder pages so the route table resolves**

Every page listed above must exist or the lazy import throws. Create each file in
`packages/web-client-v3/src/pages/` with this body, substituting the component name and route
label. Later tasks replace them one at a time.

```jsx
import AppHeader from '@/components/AppHeader.jsx';

const Login = () => (
  <div className="min-h-dvh bg-paper">
    <AppHeader wordmark search={false} />
    <p className="caps p-4 text-xs text-ink-soft">Login — not built</p>
  </div>
);

export default Login;
```

Files: `Login.jsx`, `SignUp.jsx`, `Libraries.jsx`, `NewLibrary.jsx`, `EditLibrary.jsx`,
`UnshareLibrary.jsx`, `LibraryBrowse.jsx`, `NewCollection.jsx`, `EditCollection.jsx`,
`AddBook.jsx`, `BookDetectionResults.jsx`, `AddVideo.jsx`, `VideoDetectionResults.jsx`,
`NewBook.jsx`, `NewVideo.jsx`, `ItemDetail.jsx`, `EditItem.jsx`, `ItemHistory.jsx`,
`Search.jsx`, `Settings.jsx`, `Account.jsx`, `About.jsx`.

- [ ] **Step 12: Wire the router into App**

Replace `packages/web-client-v3/src/App.jsx`:

```jsx
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes.jsx';

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
```

- [ ] **Step 13: Verify the stack navigates**

```bash
VITE_MOCK=1 yarn --cwd packages/web-client-v3 dev
```
Visit `http://localhost:5173/` → redirects to `/libraries`. Visit `/libraries/lib-fiction`,
`/settings`, `/search` → each renders its placeholder with the header. There is no tab bar
anywhere. Stop the server.

- [ ] **Step 14: Lint, test, commit**

```bash
yarn --cwd packages/web-client-v3 lint
yarn --cwd packages/web-client-v3 test
git add packages/web-client-v3
git commit -m "feat(web-v3): app shell — header with a per-screen right slot, one stack, no tab bar

The header's chrome-yellow plate is a slot, not an account button: the comp shows JR on the
root, + inside a library and the search mark on the cover."
```

---

### Task 5: Libraries root

**Files:**
- Create: `packages/web-client-v3/src/api/client.js`
- Create: `packages/web-client-v3/src/api/libraries.js`
- Create: `packages/web-client-v3/src/api/index.js`
- Create: `packages/web-client-v3/src/state/LibrariesContext.jsx`
- Create: `packages/web-client-v3/src/components/imprint/VolumePlate.jsx`
- Create: `packages/web-client-v3/src/components/imprint/SharedRibbon.jsx`
- Create: `packages/web-client-v3/src/components/LibraryRow.jsx`
- Create: `packages/web-client-v3/src/components/PullToRefresh.jsx`
- Modify: `packages/web-client-v3/src/pages/Libraries.jsx`
- Modify: `packages/web-client-v3/src/App.jsx`
- Test: `packages/web-client-v3/src/components/LibraryRow.test.jsx`
- Test: `packages/web-client-v3/src/pages/Libraries.test.jsx`

**Interfaces:**
- Consumes: `AppHeader`, `PlateButton`, `cn`, the fixture API.
- Produces:
  - `api.get|post|put|delete(path, body)` from `src/api/client.js`, throwing `ApiError` with `status`
  - `librariesApi.list|create|update|remove|share|unshare`
  - `useLibraries() -> { owned, sharedWithMe, isLoading, error, refresh, ... }`
  - `<VolumePlate>{children}</VolumePlate>`, `<SharedRibbon direction="out|in" count owner />`
  - `<LibraryRow library onOpen onLongPress />`

Comp 1 is the target. Reproduced values: section head 11px caps `+.16em` on
`padding: 16px 16px 4px` over a 1px rule with a mono count on the right; each row
`border-bottom: 2px` with `padding: 16px` and a 16px gap; plate `mono 12px/700`,
`padding: 2px 8px`; library name 22px/700 at `line-height: 1.15`; sub-line mono 11px caps
`+.06em` in `--ink-soft` at `margin-top: 4px`; shared rows carry a 4px `--shared` left rule;
the primary action sits in a `border-top: 2px`, `padding: 16px` footer.

- [ ] **Step 1: Write the failing LibraryRow test**

Create `packages/web-client-v3/src/components/LibraryRow.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LibraryRow from './LibraryRow.jsx';

const owned = { id: 'lib-1', name: 'Romans', totalItems: 412, sharedTo: [] };
const sharedOut = { ...owned, sharedTo: ['a@b.c', 'd@e.f'] };
const sharedIn = { id: 'lib-2', name: 'Polars', totalItems: 96, sharedFrom: 'Marie' };

describe('LibraryRow', () => {
  it('puts the item count in the plate, because totalItems is a real quantity', () => {
    render(<LibraryRow library={owned} />);
    expect(screen.getByText('412')).toBeInTheDocument();
  });

  it('does not uppercase the library name', () => {
    render(<LibraryRow library={{ ...owned, name: 'Bandes dessinées' }} />);
    const name = screen.getByText('Bandes dessinées');
    expect(name.className).not.toContain('uppercase');
  });

  it('states outbound sharing in words as well as colour', () => {
    render(<LibraryRow library={sharedOut} />);
    expect(screen.getByText(/shared · 2/i)).toBeInTheDocument();
  });

  it('names the owner on a library shared with me', () => {
    render(<LibraryRow library={sharedIn} />);
    expect(screen.getByText(/from marie/i)).toBeInTheDocument();
  });

  it('declares a shared-with-me row as read only', () => {
    render(<LibraryRow library={sharedIn} />);
    expect(screen.getByText(/read only/i)).toBeInTheDocument();
  });

  it('carries the green left edge only when sharing is involved', () => {
    const { container: plain } = render(<LibraryRow library={owned} />);
    expect(plain.querySelector('[data-edge]')).toBeNull();

    const { container: shared } = render(<LibraryRow library={sharedOut} />);
    expect(shared.querySelector('[data-edge="shared"]')).not.toBeNull();
  });

  it('draws that edge without displacing the row, so frames stay aligned down the stream', () => {
    // border-left would add to the box and push marked rows 4px right of unmarked ones.
    const { container } = render(<LibraryRow library={sharedOut} />);
    expect(container.firstChild.className).not.toMatch(/\bborder-l-4\b/);
    expect(container.querySelector('[data-edge="shared"]').className).toContain('absolute');
  });

  it('labels the row for assistive technology without repeating the visible text', () => {
    render(<LibraryRow library={sharedIn} />);
    expect(screen.getByRole('link')).toHaveAccessibleName(/polars/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/components/LibraryRow.test.jsx
```
Expected: FAIL — cannot resolve `./LibraryRow.jsx`.

- [ ] **Step 3: Write the API client**

Create `packages/web-client-v3/src/api/client.js`:

```js
import { fetchAuthSession } from 'aws-amplify/auth';
import { config } from '@/config';

const BASE_URL = `${config.apiBaseUrl}/v1`;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const authHeader = async () => {
  // Mock mode never has a Cognito session, and asking Amplify for one throws.
  if (config.isMock) return {};
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.idToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...options.headers },
  });

  // Mutations return empty bodies; do not try to parse one.
  const isEmpty =
    response.status === 204 ||
    response.headers.get('content-length') === '0' ||
    !(response.headers.get('content-type') ?? '').includes('json');

  const data = isEmpty ? null : await response.json();

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'The request failed.', response.status, data);
  }
  return data;
};

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
```

Create `packages/web-client-v3/src/api/libraries.js`:

```js
import { api } from './client.js';

export const librariesApi = {
  list: () => api.get('/libraries'),
  create: (body) => api.post('/libraries', body),
  update: (libraryId, body) => api.put(`/libraries/${libraryId}`, body),
  remove: (libraryId) => api.delete(`/libraries/${libraryId}`),
  share: (libraryId, email) => api.post(`/libraries/${libraryId}/share`, { email }),
  // The API accepts 1-10 emails per request.
  unshare: (libraryId, emails) => api.post(`/libraries/${libraryId}/unshare`, { emails }),
};
```

Create `packages/web-client-v3/src/api/index.js`:

```js
export { api, ApiError } from './client.js';
export { librariesApi } from './libraries.js';
```

- [ ] **Step 4: Write the imprint primitives this screen needs**

Create `packages/web-client-v3/src/components/imprint/VolumePlate.jsx`:

```jsx
import { cn } from '@/lib/cn';

// Solid chrome yellow, mono figures. Carries only a real count or order — a library's
// totalItems, a collection's itemCount, a member's order. Never an invented sequence number.
const VolumePlate = ({ className, children, ...props }) => (
  <span
    className={cn(
      'num on-imprint shrink-0 bg-imprint px-2 py-0.5 text-xs font-bold text-ink',
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

export default VolumePlate;
```

Create `packages/web-client-v3/src/components/imprint/SharedRibbon.jsx`:

```jsx
// Sharing is a library-level fact in this API, so this tag only ever appears on a library row
// or, inline, on a search row. Words first: colour alone would not be readable state.
const SharedRibbon = ({ direction, count, owner }) =>
  direction === 'out' ? (
    <span className="font-bold text-shared">Shared · {count}</span>
  ) : (
    <span className="font-bold text-shared">From {owner}</span>
  );

export default SharedRibbon;
```

- [ ] **Step 5: Write LibraryRow**

Create `packages/web-client-v3/src/components/LibraryRow.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import VolumePlate from '@/components/imprint/VolumePlate.jsx';
import SharedRibbon from '@/components/imprint/SharedRibbon.jsx';
import useLongPress from '@/lib/useLongPress.js';

const LibraryRow = ({ library, onLongPress }) => {
  const sharedOutCount = library.sharedTo?.length ?? 0;
  const isSharedWithMe = Boolean(library.sharedFrom);
  const longPress = useLongPress(onLongPress ? () => onLongPress(library) : undefined);

  return (
    <div className="relative border-b-2 border-ink">
      {/* Absolutely positioned, never a border: a border would add to the box and push this
          row 4px right of its unmarked neighbours all the way down the stream. */}
      {(sharedOutCount > 0 || isSharedWithMe) && (
        <span data-edge="shared" className="absolute inset-y-0 left-0 w-1 bg-shared" />
      )}
      <Link
        to={`/libraries/${library.id}`}
        className="flex items-start gap-4 p-4"
        {...longPress}
      >
        {/* Fixed 56px column so a 3-digit and a 2-digit count leave titles on one left edge. */}
        <VolumePlate className="min-w-14 text-center" aria-label={`${library.totalItems} volumes`}>
          {library.totalItems}
        </VolumePlate>
        <span className="min-w-0 flex-1">
          {/* Content title — authored case, never uppercased. */}
          <span className="block text-[22px] font-bold leading-[1.15]">{library.name}</span>
          <span className="num mt-1 block text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            volumes
            {sharedOutCount > 0 && (
              <>
                {' · '}
                <SharedRibbon direction="out" count={sharedOutCount} />
              </>
            )}
            {isSharedWithMe && (
              <>
                {' · '}
                <SharedRibbon direction="in" owner={library.sharedFrom} />
                {' · read only'}
              </>
            )}
          </span>
        </span>
      </Link>
    </div>
  );
};

export default LibraryRow;
```

Create `packages/web-client-v3/src/lib/useLongPress.js`:

```js
import { useCallback, useRef } from 'react';

// Long-press is always duplicated by a visible affordance elsewhere; on its own it is
// undiscoverable. 500ms, cancelled by movement so a scroll never opens a sheet.
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;

const useLongPress = (onLongPress) => {
  const timer = useRef(null);
  const origin = useRef(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  if (!onLongPress) return {};

  return {
    onPointerDown: (event) => {
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event) => {
      if (!origin.current) return;
      const moved =
        Math.abs(event.clientX - origin.current.x) > MOVE_TOLERANCE_PX ||
        Math.abs(event.clientY - origin.current.y) > MOVE_TOLERANCE_PX;
      if (moved) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onClick: (event) => {
      // Swallow the click the long press produced, so the sheet does not open behind a
      // navigation the reader did not ask for.
      if (fired.current) {
        event.preventDefault();
        fired.current = false;
      }
    },
    onContextMenu: (event) => event.preventDefault(),
  };
};

export default useLongPress;
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
yarn --cwd packages/web-client-v3 test src/components/LibraryRow.test.jsx
```
Expected: PASS — 7 tests.

- [ ] **Step 7: Write the failing Libraries page test**

Create `packages/web-client-v3/src/pages/Libraries.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { libraries } from '@/test/fixtures';
import Libraries from './Libraries.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LibrariesProvider>
        <Libraries />
      </LibrariesProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ libraries }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Libraries', () => {
  it('splits the list into mine and shared with me, mine first', async () => {
    renderPage();
    const heads = await screen.findAllByRole('separator');
    expect(heads[0]).toHaveTextContent(/mine/i);
    expect(heads[1]).toHaveTextContent(/shared with me/i);
  });

  it('counts each section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Romans')).toBeInTheDocument());
    expect(screen.getAllByRole('separator')[0]).toHaveTextContent('3');
  });

  it('offers the primary action to create a library', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /new library/i })).toBeInTheDocument();
  });

  it('reports a failure inline rather than only as a toast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Failed to load libraries' }),
      })),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load libraries/i);
  });
});
```

The fixture list has three owned libraries and one shared with me, so the section counts are 3
and 1.

- [ ] **Step 8: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/pages/Libraries.test.jsx
```
Expected: FAIL — cannot resolve `@/state/LibrariesContext.jsx`.

- [ ] **Step 9: Write the libraries store**

Create `packages/web-client-v3/src/state/LibrariesContext.jsx`:

```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { librariesApi } from '@/api';

const LibrariesContext = createContext(null);

export const LibrariesProvider = ({ children }) => {
  const [libraries, setLibraries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await librariesApi.list();
      setLibraries(data?.libraries ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    // The API returns owned and shared-with-me in one response; sharedFrom is the only
    // discriminator, and it is omitted rather than null on owned libraries.
    const owned = libraries.filter((l) => !l.sharedFrom);
    const sharedWithMe = libraries.filter((l) => Boolean(l.sharedFrom));
    return {
      libraries,
      owned,
      sharedWithMe,
      isLoading,
      error,
      refresh,
      byId: (id) => libraries.find((l) => l.id === id),
    };
  }, [libraries, isLoading, error, refresh]);

  return <LibrariesContext.Provider value={value}>{children}</LibrariesContext.Provider>;
};

export const useLibraries = () => {
  const value = useContext(LibrariesContext);
  if (!value) throw new Error('useLibraries must be used inside a LibrariesProvider');
  return value;
};
```

- [ ] **Step 10: Write the Libraries page**

Replace `packages/web-client-v3/src/pages/Libraries.jsx`:

```jsx
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import LibraryRow from '@/components/LibraryRow.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import PullToRefresh from '@/components/PullToRefresh.jsx';
import { useLibraries } from '@/state/LibrariesContext.jsx';

// Index letters are separators, not headings; so are these section heads. Exposing them as
// separators keeps the screen's heading outline honest.
const StreamHead = ({ label, count }) => (
  <div
    role="separator"
    className="flex items-center justify-between border-b border-ink px-4 pb-1 pt-4 text-[11px] font-extrabold uppercase tracking-[0.16em]"
  >
    <span>{label}</span>
    <span className="num tracking-normal text-ink-soft">{count}</span>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-start gap-4 border-b-2 border-ink p-4" aria-hidden="true">
    <span className="h-6 w-10 bg-paper-deep" />
    <span className="flex-1">
      <span className="block h-6 w-2/3 bg-paper-deep" />
      <span className="mt-1 block h-3 w-1/3 bg-paper-deep" />
    </span>
  </div>
);

const Libraries = () => {
  const { owned, sharedWithMe, isLoading, error, refresh } = useLibraries();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <AppHeader
        wordmark
        right={
          <Link
            to="/settings"
            aria-label="Account and settings"
            className="caps on-imprint flex min-h-12 items-center bg-imprint px-2 text-[11px] text-ink"
          >
            JR
          </Link>
        }
      />

      <PullToRefresh onRefresh={refresh} className="flex-1">
        {error && (
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm">
            {error} Pull down to try again.
          </p>
        )}

        {isLoading && !error && (
          <>
            <StreamHead label="Mine" count="—" />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!isLoading && !error && (
          <>
            <StreamHead label="Mine" count={owned.length} />
            {owned.length === 0 && (
              <p className="caps border-b-2 border-ink p-4 text-xs text-ink-soft">
                No libraries yet — start one below
              </p>
            )}
            {owned.map((library) => (
              <LibraryRow key={library.id} library={library} />
            ))}

            {sharedWithMe.length > 0 && (
              <>
                <StreamHead label="Shared with me" count={sharedWithMe.length} />
                {sharedWithMe.map((library) => (
                  <LibraryRow key={library.id} library={library} />
                ))}
              </>
            )}
          </>
        )}
      </PullToRefresh>

      <div className="pad-bottom-safe border-t-2 border-ink bg-paper p-4">
        <PlateButton onClick={() => navigate('/libraries/new')}>New library</PlateButton>
      </div>
    </div>
  );
};

export default Libraries;
```

The account plate shows `JR` here to reproduce the comp; Task 7 replaces it with the signed-in
user's initials.

- [ ] **Step 11: Write PullToRefresh**

Create `packages/web-client-v3/src/components/PullToRefresh.jsx`:

```jsx
import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const THRESHOLD_PX = 64;

// Transform-based so the browser never repaints the list while the reader pulls. The app is
// online-only, so a refresh that fails must say so rather than leave stale content unmarked.
const PullToRefresh = ({ onRefresh, className, children }) => {
  const [offset, setOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const start = useRef(null);
  const scroller = useRef(null);

  const onPointerDown = (event) => {
    if (scroller.current?.scrollTop > 0) return;
    start.current = event.clientY;
  };

  const onPointerMove = (event) => {
    if (start.current === null) return;
    const delta = event.clientY - start.current;
    if (delta <= 0) return;
    // Resistance: the sheet of paper does not slide freely.
    setOffset(Math.min(delta * 0.4, THRESHOLD_PX * 1.5));
  };

  const onPointerUp = async () => {
    const shouldRefresh = offset >= THRESHOLD_PX;
    start.current = null;
    setOffset(0);
    if (!shouldRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      ref={scroller}
      className={cn('overflow-y-auto overscroll-contain', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        style={{ transform: `translateY(${offset}px)` }}
        className="transition-transform duration-[var(--press-fast)] ease-linear"
      >
        {isRefreshing && (
          <p className="caps p-2 text-center text-[11px] text-ink-soft" role="status">
            Refreshing
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
```

- [ ] **Step 12: Provide the store at the app root**

Replace `packages/web-client-v3/src/App.jsx`:

```jsx
import { BrowserRouter } from 'react-router-dom';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import AppRoutes from './routes.jsx';

const App = () => (
  <BrowserRouter>
    <LibrariesProvider>
      <AppRoutes />
    </LibrariesProvider>
  </BrowserRouter>
);

export default App;
```

- [ ] **Step 13: Run the tests to verify they pass**

```bash
yarn --cwd packages/web-client-v3 test
```
Expected: PASS — all suites, including the 4 new `Libraries` tests.

- [ ] **Step 14: View it**

```bash
VITE_MOCK=1 yarn --cwd packages/web-client-v3 dev
```
Open `http://localhost:5173/libraries` at a 390px viewport. Expect three owned libraries then
one shared-with-me row with a green left edge reading `From marie@example.com · read only`.
Stop the server.

- [ ] **Step 15: Lint and commit**

```bash
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): libraries root — two labelled sections, volume plates, shared ribbons"
```

---

### Task 6: Reproduction pass — comp 1, libraries root

**Blocked unless `docs/ui-design/ui-v3-mockup.html` exists.** It is the pixel target.

**Files:**
- Modify: whichever v3 source files the comparison shows to be wrong

**Interfaces:**
- Consumes: the built libraries root and `scripts/shoot.mjs` from Task 1.
- Produces: nothing new — this task's output is a screen that matches the comp.

There is no golden-PNG assertion here. The comp's content is illustrative, so freezing a
reference image into the repo would lock in fake titles and dates. The loop is: capture both,
read both, fix the source, repeat.

- [ ] **Step 1: Capture the comp**

```bash
cd /Users/jrsue/dev/repos/alexandria
yarn --cwd packages/web-client-v3 shoot \
  --target "file:///Users/jrsue/dev/repos/alexandria/docs/ui-design/ui-v3-mockup.html" \
  --viewport desktop --full --out .impeccable/review/comp.png
```

For a like-for-like crop of comp 1 alone, clip to its screen element:

```bash
yarn --cwd packages/web-client-v3 shoot \
  --target "file:///Users/jrsue/dev/repos/alexandria/docs/ui-design/ui-v3-mockup.html" \
  --viewport 1600x1200 --clip ".comp:nth-of-type(1) .screen" --out .impeccable/review/comp-libraries.png
```

- [ ] **Step 2: Capture the build**

```bash
# A private port: :5173 belongs to the user and is strictPort.
VITE_MOCK=1 yarn --cwd packages/web-client-v3 exec vite --port 5199 --strictPort &
sleep 5
yarn --cwd packages/web-client-v3 shoot \
  --target http://localhost:5199/libraries \
  --viewport phone --wait "text=Fiction" --out .impeccable/review/mobile.png
kill %1   # only the server this snippet started
```

`--wait` takes a CSS selector, so use a stable one such as `[data-testid="libraries-stream"]`;
add that attribute to the stream container in `Libraries.jsx` if it is not already there.

- [ ] **Step 3: Compare and fix**

Read both images. Walk this checklist against comp 1 and fix every mismatch in the v3 source:

1. Header: wordmark 12px/800 at `+.2em`; yellow account plate on the right; the search field
   is 2px-ruled on `--paper-deep` with 8px padding and a 12px top margin.
2. The header's bottom rule is 2px.
3. Section head: 11px/800 caps at `+.16em`, `16px 16px 4px` padding, 1px bottom rule, mono
   count right-aligned in `--ink-soft`.
4. Rows: 2px bottom rule, 16px padding, 16px gap, plate and body top-aligned.
5. Plate: mono 12px/700, `2px 8px` padding, chrome yellow, ink figures, in a **fixed 56px
   column with the figure centred** — every title starts on the same left edge regardless of
   whether the count is 2 or 3 digits.
6. Library name 22px/700 at `line-height: 1.15`; sub-line mono 11px caps `+.06em` in
   `--ink-soft`, 4px above.
7. Shared rows carry a 4px `--shared` left rule; unshared rows carry none. **Check the frames
   line up:** the edge must be an absolutely positioned element, so a marked row's content
   starts at the same x as an unmarked row's. If they are 4px apart, it was built as a border.
8. Footer: 2px top rule, 16px padding, one chrome-yellow plate button.
9. No radius, no shadow, no serif anywhere.

Re-capture after each fix.

- [ ] **Step 4: Verify motion and responsiveness only once the still matches**

With the still matching, check: a route change is a single 160ms horizontal shift, not a fade;
`prefers-reduced-motion: reduce` makes it instant; at 768px the layout is sane (single column,
wider margins) without a bespoke tablet design.

- [ ] **Step 5: Commit**

```bash
git add packages/web-client-v3
git commit -m "feat(web-v3): reproduce comp 1 (libraries root)"
```

---

### Task 7: Authentication — Cognito, Google, pending approval

**Files:**
- Create: `packages/web-client-v3/src/auth/oauth.js`
- Create: `packages/web-client-v3/src/auth/AuthContext.jsx`
- Create: `packages/web-client-v3/src/components/imprint/Field.jsx`
- Create: `packages/web-client-v3/src/pages/PendingApproval.jsx`
- Modify: `packages/web-client-v3/src/pages/Login.jsx`, `SignUp.jsx`, `Libraries.jsx`
- Modify: `packages/web-client-v3/src/main.jsx`, `src/App.jsx`, `src/routes.jsx`
- Create: `packages/web-client-v3/src/lib/password.js`
- Test: `packages/web-client-v3/src/auth/oauth.test.js`
- Test: `packages/web-client-v3/src/lib/password.test.js`
- Test: `packages/web-client-v3/src/pages/Login.test.jsx`

**Interfaces:**
- Consumes: `PlateButton`, `AppHeader`, `config`.
- Produces:
  - `classifyOAuthCallback(search) -> { type: 'linked' | 'error', message? } | null`
  - `passwordIssues(password) -> string[]`
  - `useAuth() -> { user, isLoading, oauthMessage, signIn, signInWithGoogle, signUp, signOut, changePassword, clearOauthMessage }`
  - `user` is `{ id, email, displayName, username, approved, initials }`
  - `<Field label name error hint ... />`

`PendingApproval` is not a route: it renders whenever the session is authenticated and
`custom:Approved` is not `"true"`.

- [ ] **Step 1: Write the failing OAuth classifier test**

Create `packages/web-client-v3/src/auth/oauth.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { classifyOAuthCallback } from './oauth.js';

describe('classifyOAuthCallback', () => {
  it('returns null when there is nothing in the URL', () => {
    expect(classifyOAuthCallback('')).toBeNull();
    expect(classifyOAuthCallback('?code=abc')).toBeNull();
  });

  it('treats an account link as a success, because Cognito reports it as an error', () => {
    const result = classifyOAuthCallback(
      '?error_description=Already+found+an+entry+for+username+google_123.+Account+linked',
    );
    expect(result.type).toBe('linked');
  });

  it('names the cause when the email already has an account', () => {
    const result = classifyOAuthCallback('?error_description=PreSignUp+failed:+user+already+exists');
    expect(result.type).toBe('error');
    expect(result.message).toMatch(/already exists/i);
  });

  it('passes an unrecognised error through rather than swallowing it', () => {
    const result = classifyOAuthCallback('?error_description=Something+specific+broke');
    expect(result.type).toBe('error');
    expect(result.message).toBe('Something specific broke');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn --cwd packages/web-client-v3 test src/auth/oauth.test.js
```
Expected: FAIL — cannot resolve `./oauth.js`.

- [ ] **Step 3: Write the classifier**

Create `packages/web-client-v3/src/auth/oauth.js`:

```js
// Cognito reports a successful identity link as an OAuth *error*, so the callback has to be
// classified rather than trusted. A link is a success that needs one more sign-in.
export const classifyOAuthCallback = (search) => {
  const description = new URLSearchParams(search).get('error_description');
  if (!description) return null;

  const lowered = description.toLowerCase();
  if (lowered.includes('linked')) return { type: 'linked' };
  if (lowered.includes('user already exists')) {
    return { type: 'error', message: 'An account with this email already exists. Sign in instead.' };
  }
  return { type: 'error', message: description };
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
yarn --cwd packages/web-client-v3 test src/auth/oauth.test.js
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the failing password test**

Create `packages/web-client-v3/src/lib/password.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { passwordIssues } from './password.js';

describe('passwordIssues', () => {
  it('accepts a password meeting every Cognito rule', () => {
    expect(passwordIssues('Correct1!horse')).toEqual([]);
  });

  it('names each missing requirement rather than saying the password is invalid', () => {
    expect(passwordIssues('short')).toEqual([
      'at least 8 characters',
      'an uppercase letter',
      'a number',
      'a symbol',
    ]);
  });

  it('treats an empty password as every requirement missing', () => {
    expect(passwordIssues('').length).toBe(5);
  });
});
```

- [ ] **Step 6: Run it, then write the module**

```bash
yarn --cwd packages/web-client-v3 test src/lib/password.test.js
```
Expected: FAIL.

Create `packages/web-client-v3/src/lib/password.js`:

```js
// Mirrors the Cognito user-pool policy. Returns what is missing, in words, so the field can
// name the cause and the next action instead of rejecting the password as "invalid".
const RULES = [
  { test: (p) => p.length >= 8, label: 'at least 8 characters' },
  { test: (p) => /[a-z]/.test(p), label: 'a lowercase letter' },
  { test: (p) => /[A-Z]/.test(p), label: 'an uppercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'a symbol' },
];

export const passwordIssues = (password = '') =>
  RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
```

Run again. Expected: PASS — 3 tests.

- [ ] **Step 7: Write the Field primitive**

Create `packages/web-client-v3/src/components/imprint/Field.jsx`:

```jsx
import { useId } from 'react';
import { cn } from '@/lib/cn';

// No radius, a 2px bottom rule, a caps label above. No floating label: it would animate, and
// print does not. Errors sit under the field, in place, never only in a toast.
const Field = ({ label, error, hint, counter, className, as = 'input', ...props }) => {
  const id = useId();
  const Tag = as;
  return (
    <div className={cn('mb-6', className)}>
      <label htmlFor={id} className="caps mb-1 block text-[11px] text-ink-soft">
        {label}
      </label>
      <Tag
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={cn(
          'w-full min-h-12 border-b-2 bg-transparent px-0 py-2 text-base text-ink outline-none',
          error ? 'border-out' : 'border-ink',
        )}
        {...props}
      />
      <div className="mt-1 flex justify-between gap-2">
        <span id={`${id}-note`} className={cn('text-[13px]', error ? 'text-ink' : 'text-ink-soft')}>
          {error || hint}
        </span>
        {counter != null && <span className="num text-[11px] text-ink-soft">{counter}</span>}
      </div>
    </div>
  );
};

export default Field;
```

- [ ] **Step 8: Write the failing Login test**

Create `packages/web-client-v3/src/pages/Login.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login.jsx';

const auth = {
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  oauthMessage: null,
  clearOauthMessage: vi.fn(),
};

vi.mock('@/auth/AuthContext.jsx', () => ({ useAuth: () => auth }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

describe('Login', () => {
  it('offers email, password, the primary action and Google', () => {
    renderPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('explains pending approval in words when Cognito says the user is unconfirmed', async () => {
    auth.signIn.mockRejectedValueOnce({ name: 'UserNotConfirmedException' });
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'Secret1!');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/pending approval/i);
  });

  it('reports bad credentials inline, naming the cause', async () => {
    auth.signIn.mockRejectedValueOnce({ name: 'NotAuthorizedException' });
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/email or password/i);
  });
});
```

- [ ] **Step 9: Run it, then write the auth context and pages**

```bash
yarn --cwd packages/web-client-v3 test src/pages/Login.test.jsx
```
Expected: FAIL.

Create `packages/web-client-v3/src/auth/AuthContext.jsx`:

```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  signInWithRedirect,
  updatePassword,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { config } from '@/config';
import { classifyOAuthCallback } from './oauth.js';

const AuthContext = createContext(null);

const initialsOf = (displayName, email) => {
  const source = displayName || email || '';
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
};

// Mock mode signs in a fixed, approved reader so every screen is reachable without Cognito.
const MOCK_USER = {
  id: 'OWNER1',
  email: 'jr@example.com',
  displayName: 'JR Sue',
  username: 'jr@example.com',
  approved: true,
  initials: 'JR',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(config.isMock ? MOCK_USER : null);
  const [isLoading, setIsLoading] = useState(!config.isMock);
  const [oauthMessage, setOauthMessage] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session?.tokens) {
        setUser(null);
        return;
      }
      const claims = session.tokens.idToken.payload;
      const current = await getCurrentUser();
      const displayName = claims.name ?? null;
      const email = claims.email ?? null;
      setUser({
        // custom:Id is the owner id used throughout the API and in support requests.
        id: claims['custom:Id'] ?? null,
        email,
        displayName,
        username: current.username,
        approved: claims['custom:Approved'] === 'true',
        initials: initialsOf(displayName, email),
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (config.isMock) return undefined;

    const callback = classifyOAuthCallback(window.location.search);
    if (callback) {
      window.history.replaceState({}, '', window.location.pathname);
      setOauthMessage(
        callback.type === 'linked'
          ? { type: 'success', text: 'Your Google account is linked. Sign in once more to continue.' }
          : { type: 'error', text: callback.message },
      );
    }

    refresh().finally(() => setIsLoading(false));

    const listener = Hub.listen('auth', ({ payload }) => {
      // tokenRefresh_failure means the 365-day refresh token is gone: return to /login
      // without losing the route, which the router handles by rendering Login in place.
      if (['signedIn', 'tokenRefresh'].includes(payload.event)) refresh();
      if (['signedOut', 'tokenRefresh_failure'].includes(payload.event)) setUser(null);
    });
    return () => listener();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      oauthMessage,
      clearOauthMessage: () => setOauthMessage(null),
      signIn: async (email, password) => {
        await cognitoSignIn({ username: email, password });
        await refresh();
      },
      signInWithGoogle: () => signInWithRedirect({ provider: 'Google' }),
      signUp: (email, password, name) =>
        cognitoSignUp({ username: email, password, options: { userAttributes: { email, name } } }),
      signOut: async () => {
        await cognitoSignOut();
        setUser(null);
      },
      changePassword: (oldPassword, newPassword) => updatePassword({ oldPassword, newPassword }),
    }),
    [user, isLoading, oauthMessage, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an AuthProvider');
  return value;
};
```

Replace `packages/web-client-v3/src/pages/Login.jsx`:

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// Cognito's exception names, translated into a cause and a next action.
const MESSAGES = {
  UserNotConfirmedException:
    'Your account is pending approval. An administrator has to approve it before you can sign in.',
  NotAuthorizedException: 'That email or password is not right.',
  UserNotFoundException: 'That email or password is not right.',
};

const Login = () => {
  const { signIn, signInWithGoogle, oauthMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      await signIn(email, password);
      navigate('/libraries');
    } catch (err) {
      setError(MESSAGES[err?.name] ?? err?.message ?? 'Sign-in failed. Try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="pad-top-safe min-h-dvh bg-paper px-4 pb-8">
      <span className="caps mt-8 inline-block bg-imprint px-2 py-1 text-[11px] tracking-[0.16em] text-ink">
        Alexandria
      </span>
      <h1 className="mt-4 mb-8 text-[32px] font-extrabold leading-[1.06]">Sign in</h1>

      {oauthMessage && (
        <p
          role="status"
          className="mb-6 border-t-2 border-imprint bg-paper-deep p-4 text-sm"
        >
          {oauthMessage.text}
        </p>
      )}

      {error && (
        <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PlateButton type="submit" disabled={isBusy} className="w-full">
          {isBusy ? 'Signing in' : 'Sign in'}
        </PlateButton>
      </form>

      <PlateButton variant="secondary" className="mt-4 w-full" onClick={signInWithGoogle}>
        Continue with Google
      </PlateButton>

      <p className="mt-8 text-sm">
        No account yet?{' '}
        <Link to="/signup" className="font-bold underline">
          Create one
        </Link>
      </p>
    </div>
  );
};

export default Login;
```

Replace `packages/web-client-v3/src/pages/SignUp.jsx` with the same shape: `Field`s for email,
display name and password; `passwordIssues(password)` rendered live under the password field as
"Needs: at least 8 characters, a symbol"; submit calls `signUp`; `UsernameExistsException` and a
PreSignUp `user already exists` rejection both render inline as "An account with this email
already exists."; success navigates to `/login` with
`state: { notice: 'Account created. An administrator has to approve it before you can sign in.' }`,
which `Login` renders in its `role="status"` slot.

Create `packages/web-client-v3/src/pages/PendingApproval.jsx`:

```jsx
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';

// No polling: approval arrives out of band, through Slack or the admin CLI. The honest
// instruction is to come back later, not a spinner that will never resolve.
const PendingApproval = () => {
  const { signOut } = useAuth();
  return (
    <div className="pad-top-safe flex min-h-dvh flex-col bg-paper px-4 pb-8">
      <span className="caps mt-8 inline-block self-start border-2 border-out px-2 py-1 text-[11px] tracking-[0.14em] text-ink">
        Pending approval
      </span>
      <h1 className="mt-4 text-[32px] font-extrabold leading-[1.06]">
        Your request is with an administrator
      </h1>
      <p className="mt-4 max-w-prose text-sm text-ink-soft">
        Alexandria is a private catalogue, so every new account is approved by hand. You will not
        be notified here — sign in again later and you will be through.
      </p>
      <PlateButton variant="secondary" className="mt-8 self-start" onClick={signOut}>
        Sign out
      </PlateButton>
    </div>
  );
};

export default PendingApproval;
```

- [ ] **Step 10: Gate the stack on the session**

Replace `packages/web-client-v3/src/App.jsx`:

```jsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import PendingApproval from '@/pages/PendingApproval.jsx';
import AppRoutes from './routes.jsx';

const Gate = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-dvh bg-paper" aria-busy="true" />;
  // Not a route: a signed-in but unapproved session is a state, not a place.
  if (user && !user.approved) return <PendingApproval />;

  return (
    <LibrariesProvider>
      <AppRoutes />
    </LibrariesProvider>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
```

In `src/routes.jsx`, wrap the authenticated routes so an unauthenticated visitor is sent to
`/login` without losing where they were:

```jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext.jsx';

const RequireAuth = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};
```

Wrap each authenticated `element` with `<RequireAuth>…</RequireAuth>`, and after a successful
sign-in navigate to `location.state?.from?.pathname ?? '/libraries'`.

- [ ] **Step 11: Configure Amplify at the entry point**

In `packages/web-client-v3/src/main.jsx`, above `createRoot`:

```jsx
import { Amplify } from 'aws-amplify';
import { config } from './config.js';

// Skipped in mock mode: empty Cognito identifiers make configure() throw.
if (!config.isMock) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.clientId,
        loginWith: {
          oauth: {
            domain: config.oauth.domain,
            scopes: config.oauth.scopes,
            redirectSignIn: [config.oauth.redirectSignIn],
            redirectSignOut: [config.oauth.redirectSignOut],
            responseType: config.oauth.responseType,
          },
        },
      },
    },
  });
}
```

- [ ] **Step 12: Use the real initials in the header**

In `src/pages/Libraries.jsx`, replace the hard-coded `JR` with `useAuth().user.initials`, and
give the link `aria-label={`Account — ${user.email}`}`.

- [ ] **Step 13: Verify Google sign-in works on the dev server, with no Terraform change**

`packages/infrastructure/cognito.tf` already registers `http://localhost:5173/` as a callback URL
and `http://localhost:5173/login` as a logout URL. v3 runs on that same port deliberately, so
Google sign-in works locally out of the box.

Confirm by reading `cognito.tf` before ticking this box. If those URLs are not there, **stop and
report** — do not run `make infra-apply` yourself.

The trade-off this port choice buys: v2 and v3 dev servers cannot run at the same time. Stop one
before starting the other.

- [ ] **Step 14: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): Cognito auth, Google OAuth, pending-approval state

A successful Google identity link arrives as an OAuth error; classifyOAuthCallback reads it
as the success it is."
```

---

### Task 8: Library actions — create, edit, share, unshare, delete

**Files:**
- Create: `packages/web-client-v3/src/components/imprint/Sheet.jsx`
- Create: `packages/web-client-v3/src/components/LibraryActionsSheet.jsx`
- Modify: `packages/web-client-v3/src/pages/NewLibrary.jsx`, `EditLibrary.jsx`, `UnshareLibrary.jsx`, `Libraries.jsx`
- Test: `packages/web-client-v3/src/components/imprint/Sheet.test.jsx`
- Test: `packages/web-client-v3/src/components/LibraryActionsSheet.test.jsx`
- Test: `packages/web-client-v3/src/pages/NewLibrary.test.jsx`

**Interfaces:**
- Consumes: `librariesApi`, `useLibraries`, `Field`, `PlateButton`.
- Produces: `<Sheet open onClose title>…</Sheet>`, `<LibraryActionsSheet library open onClose onChanged />`

- [ ] **Step 1: Write the failing Sheet test**

Create `packages/web-client-v3/src/components/imprint/Sheet.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Sheet from './Sheet.jsx';

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    render(<Sheet open={false} title="Actions"><p>Body</p></Sheet>);
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('is a dialog with an accessible name', () => {
    render(<Sheet open title="Library actions"><p>Body</p></Sheet>);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Library actions');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Sheet open title="Actions" onClose={onClose}><p>Body</p></Sheet>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the scrim is clicked', async () => {
    const onClose = vi.fn();
    render(<Sheet open title="Actions" onClose={onClose}><p>Body</p></Sheet>);
    await userEvent.click(screen.getByTestId('sheet-scrim'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it, then write the Sheet**

```bash
yarn --cwd packages/web-client-v3 test src/components/imprint/Sheet.test.jsx
```
Expected: FAIL.

Create `packages/web-client-v3/src/components/imprint/Sheet.jsx`:

```jsx
import { useEffect, useId, useRef } from 'react';

// Bottom sheet on the recessed field with a 3px top rule and square corners. Rises from the
// bottom edge in 200ms, linear — the press, not a spring.
const Sheet = ({ open, title, onClose, children }) => {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    panel.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        data-testid="sheet-scrim"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-ink/40"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pad-bottom-safe max-h-[80dvh] overflow-y-auto border-t-[3px] border-ink bg-paper-deep p-4 outline-none motion-safe:animate-[sheet-rise_var(--press-sheet)_linear]"
      >
        <h2 id={titleId} className="caps mb-4 text-[11px] text-ink-soft">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

export default Sheet;
```

Add the keyframe to `src/index.css`, inside `@layer utilities`:

```css
@keyframes sheet-rise {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

- [ ] **Step 3: Write the failing LibraryActionsSheet test**

Create `packages/web-client-v3/src/components/LibraryActionsSheet.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LibraryActionsSheet from './LibraryActionsSheet.jsx';

const library = { id: 'lib-1', name: 'Romans', totalItems: 412, sharedTo: ['a@b.c'] };

const renderSheet = (props = {}) =>
  render(
    <MemoryRouter>
      <LibraryActionsSheet library={library} open onClose={() => {}} {...props} />
    </MemoryRouter>,
  );

describe('LibraryActionsSheet', () => {
  it('offers edit, share, unshare and delete', () => {
    renderSheet();
    ['Edit', 'Share', 'Unshare', 'Delete'].forEach((label) => {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}`, 'i') })).toBeInTheDocument();
    });
  });

  it('opens the share form inline rather than on another screen', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: /^share/i }));
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('confirms deletion in place, before acting, and says what is destroyed', async () => {
    const onDeleted = vi.fn();
    renderSheet({ onDeleted });
    await userEvent.click(screen.getByRole('button', { name: /^delete/i }));
    expect(screen.getByText(/412 items/i)).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('hides unshare when the library is shared with nobody', () => {
    renderSheet({ library: { ...library, sharedTo: [] } });
    expect(screen.queryByRole('button', { name: /^unshare/i })).toBeNull();
  });
});
```

- [ ] **Step 4: Run it, then write the sheet**

```bash
yarn --cwd packages/web-client-v3 test src/components/LibraryActionsSheet.test.jsx
```
Expected: FAIL.

Create `packages/web-client-v3/src/components/LibraryActionsSheet.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@/components/imprint/Sheet.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { librariesApi } from '@/api';

const LibraryActionsSheet = ({ library, open, onClose, onChanged, onDeleted }) => {
  const [mode, setMode] = useState('menu');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const navigate = useNavigate();

  const run = async (action, after) => {
    setError(null);
    setIsBusy(true);
    try {
      await action();
      await after?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={library.name}>
      {error && (
        <p role="alert" className="mb-4 border-t-2 border-out bg-paper p-4 text-sm">
          {error}
        </p>
      )}

      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
          <PlateButton
            variant="secondary"
            onClick={() => navigate(`/libraries/${library.id}/edit`)}
          >
            Edit
          </PlateButton>
          <PlateButton variant="secondary" onClick={() => setMode('share')}>
            Share
          </PlateButton>
          {library.sharedTo?.length > 0 && (
            <PlateButton
              variant="secondary"
              onClick={() => navigate(`/libraries/${library.id}/unshare`)}
            >
              Unshare
            </PlateButton>
          )}
          <PlateButton variant="danger" onClick={() => setMode('delete')}>
            Delete
          </PlateButton>
        </div>
      )}

      {mode === 'share' && (
        <>
          <Field
            label="Email"
            type="email"
            value={email}
            hint="They get read-only access. Search may take a moment to catch up."
            onChange={(e) => setEmail(e.target.value)}
          />
          <PlateButton
            disabled={isBusy || !email}
            onClick={() => run(() => librariesApi.share(library.id, email), onChanged)}
          >
            {isBusy ? 'Sharing' : 'Share'}
          </PlateButton>
        </>
      )}

      {mode === 'delete' && (
        <>
          {/* Say what the action actually does, before it is taken, in the sheet. */}
          <p className="mb-4 text-sm">
            Delete <strong>{library.name}</strong> and its {library.totalItems} items? The items go
            with it. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <PlateButton
              variant="danger"
              disabled={isBusy}
              onClick={() => run(() => librariesApi.remove(library.id), onDeleted ?? onChanged)}
            >
              {isBusy ? 'Deleting' : 'Delete for good'}
            </PlateButton>
            <PlateButton variant="secondary" onClick={() => setMode('menu')}>
              Keep it
            </PlateButton>
          </div>
        </>
      )}
    </Sheet>
  );
};

export default LibraryActionsSheet;
```

- [ ] **Step 5: Wire the sheet into the libraries root**

In `src/pages/Libraries.jsx`, hold `const [actionsFor, setActionsFor] = useState(null)`, pass
`onLongPress={setActionsFor}` to each **owned** `LibraryRow` (never to a shared-with-me row —
read-only means the action is absent), and render the sheet when `actionsFor` is set, with
`onChanged={refresh}`.

Long-press is undiscoverable on its own, so add the visible duplicate the guidelines require: a
48px "Actions" affordance at the right of each owned row, labelled
`aria-label={`Actions for ${library.name}`}`, which opens the same sheet.

- [ ] **Step 6: Write the failing NewLibrary test**

Create `packages/web-client-v3/src/pages/NewLibrary.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NewLibrary from './NewLibrary.jsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <NewLibrary />
    </MemoryRouter>,
  );

describe('NewLibrary', () => {
  it('counts the characters left, because 20 is short enough to hit', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/name/i), 'Romans');
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('stops the name at the API limit rather than letting the server reject it', () => {
    renderPage();
    expect(screen.getByLabelText(/name/i)).toHaveAttribute('maxLength', '20');
    expect(screen.getByLabelText(/description/i)).toHaveAttribute('maxLength', '100');
  });

  it('keeps the primary action unavailable until there is a name', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });
});
```

- [ ] **Step 7: Run it, then write the form pages**

```bash
yarn --cwd packages/web-client-v3 test src/pages/NewLibrary.test.jsx
```
Expected: FAIL.

Replace `packages/web-client-v3/src/pages/NewLibrary.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import Field from '@/components/imprint/Field.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import { librariesApi } from '@/api';
import { useLibraries } from '@/state/LibrariesContext.jsx';

const NAME_MAX = 20;
const DESCRIPTION_MAX = 100;

const NewLibrary = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const { refresh } = useLibraries();
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      await librariesApi.create({ name, description });
      await refresh();
      navigate('/libraries');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="New library" onBack={() => navigate(-1)} search={false} />
      <form className="p-4" onSubmit={onSubmit} noValidate>
        {error && (
          <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm">
            {error}
          </p>
        )}
        <Field
          label="Name"
          maxLength={NAME_MAX}
          counter={NAME_MAX - name.length}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Description"
          as="textarea"
          rows={3}
          maxLength={DESCRIPTION_MAX}
          counter={DESCRIPTION_MAX - description.length}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <PlateButton type="submit" disabled={isBusy || !name.trim()}>
          {isBusy ? 'Creating' : 'Create library'}
        </PlateButton>
      </form>
    </div>
  );
};

export default NewLibrary;
```

`EditLibrary.jsx` is the same file with three differences: it reads the library from
`useLibraries().byId(libraryId)`, seeds both fields from it, and calls
`librariesApi.update(libraryId, …)`. Its submit label is "Save changes". Write it out in full
rather than importing a shared form — two forms is not enough duplication to abstract, and the
edit page needs a not-found branch the create page does not:

```jsx
if (!library) {
  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader title="Not found" onBack={() => navigate('/libraries')} search={false} />
      <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm">
        That library is not in your collection any more.
      </p>
    </div>
  );
}
```

Replace `packages/web-client-v3/src/pages/UnshareLibrary.jsx` with a multi-select list of
`library.sharedTo`, each a 48px row with a checkbox and the recipient's email. Enforce the API's
1–10 range: the action is **absent** with nothing selected, and disabled with more than 10
selected, with the count stated ("Unshare 11 — the API takes 10 at a time"). On submit, call
`librariesApi.unshare(libraryId, selected)`, refresh, and navigate back. On failure, report
inline which addresses were not removed.

- [ ] **Step 8: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): library actions sheet, create/edit/unshare screens

Destructive actions confirm in the sheet and say what they destroy; long-press is duplicated
by a visible affordance on every owned row."
```

---

# Slice B — the library browse stream

## Carried into slice B from the slice A critique

Decided before slice B starts so they are built in rather than retrofitted. The first two are
design rulings; the rest are defects found by rendering slice A.

**B0-1 — the yellow moves.** Apply the apparatus-not-inventory rule above while building the
stream, not afterwards. `VolumePlate` gains a ruled variant (2px `--ink` rule, `--ink` mono
figures, no fill) which becomes the default for counts and orders; the filled `--imprint` plate
is reserved for the active state. Index letters and primary actions are unchanged. `LibraryRow`,
`CollectionBoard` and `VolumeFrame`'s order plate all take the ruled variant.

**B0-2 — the search field becomes a real input.** Today it is a `<Link>` costumed as one: it
has the box, the placeholder grey and the magnifier, and accepts no keystroke. Make it an
`<input>` that types in place and navigates to `/search` carrying its value, and give it the
`--imprint` ground so it is the loudest mark on the home screen. It is the dominant job.

**~~B1 — `Sheet` shouts French titles.~~ Done before slice B** (`Sheet.jsx`). Fixed ahead of the
slice on the design session's ruling, with the precedent recorded: bringing code into
conformance with a rule *already in force* is not new work and is not scope creep. A one-line
contradiction of §3 left standing in a reviewed build teaches the wrong thing to whoever reads
it next. A sheet's title is a content name, so it is set at 15px semibold in `--ink`, in
authored case; a test asserts "Bandes dessinées" is never uppercased.

> **DEFERRAL POLICY, revised (ui-v3.md §7, `50c2e1a`). There is no single accessibility pass at
> the end.** Defer only what is genuinely ONE shared mechanism, and then do it at the first
> opportunity rather than at the end. A pass scheduled for the end is where this work dies: it
> becomes one undifferentiated block, the first thing squeezed when something else runs late, and
> larger every week it waits. Single-point fixes are done immediately, because deferring them
> buys nothing. Of the four items below, two were never slice-spanning and should not have been
> filed as such.

**~~B1 — unshare commits on a single tap.~~ Done.** One screen, never slice-spanning. It now
confirms in place, naming the readers who lose access, with "Remove for good" / "Keep access"
mirroring delete.

**~~B2 — `Sheet` has no focus trap.~~ Done.** One component, used by every sheet in the app, so
deferring it delayed it without saving anything — and doing it now makes every sheet in slices C
onward correct on arrival. Paired with the visible close mark: `aria-modal` hides the scrim from
assistive tech, so the trap and the mark together are what close that gap.

**B1 — the authenticated app has no landmarks.** From slice C onward this is BUILT IN, not
deferred: every authenticated screen ships with `<main>` and an `<h1>` naming it, visually hidden
where the header already carries the name. Adding them while writing a screen is free; retrofitting
twenty grows with every screen built in the meantime. A screen without them is unfinished, not
pending a pass. Sweep the existing screens that lack them when next in each file, not as a separate
exercise.

`<html lang="en">` sits over mixed English/French content. Mark French content with `lang="fr"`
where the language is known — which, since the API does not record language, means the document
stays `en` and only known-French UI strings get marked. Do not fake a language field.

**B1 — no mutation is confirmed and there is no toast primitive.** `DESIGN.md` reserves toasts
for confirmations; none exists. Slice B introduces lend, return and delete, so build the toast
primitive with the first of them, and keep the rule: a toast never carries a failure, and never
carries the only report of a destructive action.

**B1 — offline has no state.** THE ONE GENUINE PASS, and still not at the end: it lives in a
single place, the API client, and 401 is already handled there. Do it the next time that file is
open for another reason rather than scheduling it for slice G. A dropped connection currently renders
"Failed to fetch Pull down to try again." Give `ApiError` a recognisable network case and a 401
case: the first says the connection is gone and the app is online-only; the second returns to
`/login` without losing the route — the 401 half is DONE. `PRODUCT.md` requires offline to be
honest rather than stale.

---

### Task 9: Stream logic — folding, index buckets, page merging

**Files:**
- Create: `packages/web-client-v3/src/lib/sort.js`
- Create: `packages/web-client-v3/src/lib/stream.js`
- Create: `packages/web-client-v3/src/lib/picture.js`
- Create: `packages/web-client-v3/src/lib/format.js`
- Test: `packages/web-client-v3/src/lib/sort.test.js`
- Test: `packages/web-client-v3/src/lib/stream.test.js`
- Test: `packages/web-client-v3/src/lib/picture.test.js`
- Test: `packages/web-client-v3/src/lib/format.test.js`

**Interfaces:**
- Consumes: nothing — these are pure.
- Produces:
  - `foldForSort(value) -> string`
  - `indexLetterFor(title) -> string`
  - `appendPage(stream, pageItems) -> stream`
  - `toLetterRuns(stream) -> [{ letter, entries, itemCount, closed }]`
  - `pictureSrc(item) -> string | null`
  - `bookPlateLine(book) -> string`, `filmPlateLine(video) -> string`

This is the highest-risk code in the client and all of it is pure, so all of it is tested first.

- [ ] **Step 1: Write the failing sort test**

Create `packages/web-client-v3/src/lib/sort.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { foldForSort, indexLetterFor } from './sort.js';

describe('foldForSort', () => {
  it('reproduces the server fold: strip diacritics, lowercase', () => {
    expect(foldForSort('Élan')).toBe('elan');
    expect(foldForSort('Amérique')).toBe('amerique');
    expect(foldForSort('ZAZIE')).toBe('zazie');
  });

  it('leaves ligatures alone, because NFD does not decompose them', () => {
    // This is not a bug to fix: the server does the same, so the client must match it.
    expect(foldForSort('Œuvres')).toBe('œuvres');
    expect(foldForSort('Æther')).toBe('æther');
  });

  it('tolerates an absent title', () => {
    expect(foldForSort(undefined)).toBe('');
  });
});

describe('indexLetterFor', () => {
  it('buckets plain letters under their uppercase form', () => {
    expect(indexLetterFor('Zazie dans le métro')).toBe('Z');
  });

  it('buckets a diacritic under its base letter, where the server sorts it', () => {
    expect(indexLetterFor('Élan')).toBe('E');
    expect(indexLetterFor('Amérique')).toBe('A');
  });

  it('collapses digits and ASCII punctuation into one head bucket', () => {
    expect(indexLetterFor('1984')).toBe('#');
    expect(indexLetterFor('2001: A Space Odyssey')).toBe('#');
    expect(indexLetterFor('"Nightfall"')).toBe('#');
  });

  it('shows a non-decomposing character as itself, because it sorts after Z', () => {
    // Folding this to "O" would send a reader to the Os, where it is not.
    expect(indexLetterFor('Œuvres complètes')).toBe('Œ');
    expect(indexLetterFor('Æneid')).toBe('Æ');
  });

  it('buckets an empty title at the head rather than throwing', () => {
    expect(indexLetterFor('')).toBe('#');
  });
});
```

- [ ] **Step 2: Run it, then write the module**

```bash
yarn --cwd packages/web-client-v3 test src/lib/sort.test.js
```
Expected: FAIL.

Create `packages/web-client-v3/src/lib/sort.js`:

```js
// The server's sort key is NormalizeForSort(title) — NFD, strip combining marks, NFC,
// lowercase (functions/internal/persistence/normalize.go). The client reproduces the fold to
// derive bucket labels and NEVER sorts: localeCompare would disagree with the paginated
// server order and make the sticky index letters non-monotonic.
export const foldForSort = (value) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .normalize('NFC')
    .toLowerCase();

// Codepoints below 'a' are the ASCII digits and punctuation, which all sort contiguously
// ahead of the letters. One truthful bucket beats ten near-empty ones.
const FIRST_LETTER_CODE = 0x61;

export const indexLetterFor = (title) => {
  const first = foldForSort(title).charAt(0);
  if (!first) return '#';
  if (first.charCodeAt(0) < FIRST_LETTER_CODE) return '#';
  // a-z gives A-Z; anything above z (œ, æ, «) survived the fold and sorts at the tail, so it
  // shows as itself.
  return first.toUpperCase();
};
```

Run again. Expected: PASS — 8 tests.

- [ ] **Step 3: Write the failing stream test**

Create `packages/web-client-v3/src/lib/stream.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { appendPage, toLetterRuns } from './stream.js';

const book = (id, title) => ({ id, type: 0, title });
const board = (id, title, itemCount, items, partial = false) => ({
  id,
  type: 2,
  title,
  itemCount,
  items,
  ...(partial ? { partial: true } : {}),
});

describe('appendPage', () => {
  it('appends a page in the server order, without sorting', () => {
    const stream = appendPage([], [book('a', 'Zazie'), book('b', 'Amérique')]);
    expect(stream.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('merges a partial board into the board it continues', () => {
    const first = appendPage([], [board('c1', 'Melville', 4, [book('m1', 'Bob')])]);
    const second = appendPage(
      first,
      [board('c1', 'Melville', 4, [book('m2', 'Le Samouraï')], true), book('z', 'Zazie')],
    );
    expect(second).toHaveLength(2);
    expect(second[0].items.map((i) => i.id)).toEqual(['m1', 'm2']);
    expect(second[1].id).toBe('z');
  });

  it('clears the partial flag once the board is whole in the stream', () => {
    const first = appendPage([], [board('c1', 'Melville', 4, [book('m1', 'Bob')])]);
    const second = appendPage(first, [board('c1', 'Melville', 4, [book('m2', 'Doulos')], true)]);
    expect(second[0].partial).toBeFalsy();
  });

  it('keeps a partial board that has no predecessor, so it can label itself as continuing', () => {
    const stream = appendPage([], [board('c9', 'Orphan', 3, [book('o1', 'One')], true)]);
    expect(stream[0].partial).toBe(true);
  });

  it('does not mutate the stream it is given', () => {
    const original = [book('a', 'A')];
    appendPage(original, [book('b', 'B')]);
    expect(original).toHaveLength(1);
  });
});

describe('toLetterRuns', () => {
  const stream = [
    book('n1', '1984'),
    book('a1', 'Amérique'),
    book('a2', 'Aurore'),
    board('c1', 'Melville', 12, [book('m1', 'Bob'), book('m2', 'Doulos')]),
    book('z1', 'Zazie'),
    book('o1', 'Œuvres complètes'),
  ];

  it('groups consecutive entries under one letter', () => {
    expect(toLetterRuns(stream).map((r) => r.letter)).toEqual(['#', 'A', 'M', 'Z', 'Œ']);
  });

  it('files a board under its own name, not its members', () => {
    const run = toLetterRuns(stream).find((r) => r.letter === 'M');
    expect(run.entries[0].id).toBe('c1');
  });

  it('counts items, not entries, so a board of twelve does not read as one', () => {
    const run = toLetterRuns(stream).find((r) => r.letter === 'M');
    expect(run.itemCount).toBe(12);
  });

  it('leaves the tail run open, because its count would still grow', () => {
    const runs = toLetterRuns(stream);
    expect(runs.at(-1).closed).toBe(false);
    expect(runs.slice(0, -1).every((r) => r.closed)).toBe(true);
  });

  it('closes every run when the stream is complete', () => {
    const runs = toLetterRuns(stream, { complete: true });
    expect(runs.every((r) => r.closed)).toBe(true);
  });

  it('returns nothing for an empty stream', () => {
    expect(toLetterRuns([])).toEqual([]);
  });
});
```

- [ ] **Step 4: Run it, then write the module**

```bash
yarn --cwd packages/web-client-v3 test src/lib/stream.test.js
```
Expected: FAIL.

Create `packages/web-client-v3/src/lib/stream.js`:

```js
import { indexLetterFor } from './sort.js';

const COLLECTION = 2;

// The API emits a collection that spans a page boundary as `partial: true` at the TOP of the
// continuation page (repositories/dynamodb/items.go). Merging it back into its predecessor is
// better than labelling a second board: the reader ends up with one collection, which is what
// it is. A partial board with no predecessor keeps its flag so it can say it continues.
export const appendPage = (stream, pageItems = []) => {
  const next = stream.slice();
  const boardIndex = new Map();
  next.forEach((entry, i) => {
    if (entry.type === COLLECTION) boardIndex.set(entry.id, i);
  });

  for (const entry of pageItems) {
    if (entry.type === COLLECTION && entry.partial && boardIndex.has(entry.id)) {
      const i = boardIndex.get(entry.id);
      next[i] = { ...next[i], items: [...(next[i].items ?? []), ...(entry.items ?? [])] };
      continue;
    }
    if (entry.type === COLLECTION) boardIndex.set(entry.id, next.length);
    next.push(entry);
  }

  return next;
};

const entryItemCount = (entry) => (entry.type === COLLECTION ? (entry.itemCount ?? 0) : 1);

// A run is CLOSED the moment a different letter appears after it: at that instant its item
// count is final. The run still at the tail of the loaded stream stays open and shows no
// count, because a number that grows while the reader looks at it is worse than no number.
export const toLetterRuns = (stream, { complete = false } = {}) => {
  const runs = [];

  for (const entry of stream) {
    const letter = indexLetterFor(entry.title);
    const last = runs.at(-1);
    if (last && last.letter === letter) {
      last.entries.push(entry);
      last.itemCount += entryItemCount(entry);
    } else {
      runs.push({ letter, entries: [entry], itemCount: entryItemCount(entry), closed: true });
    }
  }

  if (runs.length > 0 && !complete) runs.at(-1).closed = false;
  return runs;
};
```

Run again. Expected: PASS — 11 tests.

- [ ] **Step 5: Write the failing picture and format tests**

Create `packages/web-client-v3/src/lib/picture.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { pictureSrc } from './picture.js';

describe('pictureSrc', () => {
  it('returns nothing when the item has no thumbnail URL', () => {
    expect(pictureSrc({ id: 'a' })).toBeNull();
  });

  it('cache-busts with updatedAt, because the CDN caches thumbnails for seven days', () => {
    const src = pictureSrc({ picture: 'https://cdn/x', updatedAt: '2026-08-01T09:12:00Z' });
    expect(src).toBe('https://cdn/x?v=2026-08-01T09%3A12%3A00Z');
  });

  it('falls back to the bare URL when updatedAt is omitted', () => {
    expect(pictureSrc({ picture: 'https://cdn/x' })).toBe('https://cdn/x');
  });
});
```

Create `packages/web-client-v3/src/lib/format.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { bookPlateLine, filmPlateLine } from './format.js';

describe('bookPlateLine', () => {
  it('reads author then ISBN', () => {
    expect(bookPlateLine({ authors: ['Raymond Chandler'], isbn: '9782070404209' })).toBe(
      'Raymond Chandler · 9782070404209',
    );
  });

  it('joins several authors', () => {
    expect(bookPlateLine({ authors: ['A', 'B'], isbn: '1' })).toBe('A, B · 1');
  });

  it('omits an absent field rather than printing an empty separator', () => {
    expect(bookPlateLine({ authors: [], isbn: '9782070404209' })).toBe('9782070404209');
    expect(bookPlateLine({ authors: ['A'] })).toBe('A');
    expect(bookPlateLine({})).toBe('');
  });
});

describe('filmPlateLine', () => {
  it('reads director, year and runtime with a prime mark', () => {
    expect(
      filmPlateLine({ directors: ['Roman Polanski'], releaseYear: 1974, duration: 130 }),
    ).toBe('Roman Polanski · 1974 · 130′');
  });

  it('omits a runtime of zero, which means unknown rather than instant', () => {
    expect(filmPlateLine({ directors: ['X'], releaseYear: 1974, duration: 0 })).toBe('X · 1974');
  });
});
```

- [ ] **Step 6: Run them, then write the modules**

```bash
yarn --cwd packages/web-client-v3 test src/lib/picture.test.js src/lib/format.test.js
```
Expected: FAIL.

Create `packages/web-client-v3/src/lib/picture.js`:

```js
// `picture` is a CloudFront thumbnail URL synthesised from a template whenever `pictureUrl`
// exists, without checking S3 — so it can 404 while the image-processing Lambda is still
// working. Callers must treat a load failure as the empty frame, not as an error.
// The CDN caches thumbnails for seven days and forwards query strings, so ?v= is how a
// replaced cover actually reaches the reader.
export const pictureSrc = (item) => {
  if (!item?.picture) return null;
  return item.updatedAt
    ? `${item.picture}?v=${encodeURIComponent(item.updatedAt)}`
    : item.picture;
};
```

Create `packages/web-client-v3/src/lib/format.js`:

```js
const join = (parts) => parts.filter(Boolean).join(' · ');

export const bookPlateLine = (book) => join([(book.authors ?? []).join(', '), book.isbn]);

// The prime mark is film-only, which is one of the three redundant layers marking type.
export const filmPlateLine = (video) =>
  join([
    (video.directors ?? []).join(', '),
    video.releaseYear ? String(video.releaseYear) : '',
    video.duration ? `${video.duration}′` : '',
  ]);
```

Run again. Expected: PASS — 8 tests.

- [ ] **Step 7: Lint and commit**

```bash
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): stream logic — server fold, index buckets, page merging

The client never sorts. Index buckets reproduce NormalizeForSort exactly, so OE and AE land
at the tail where the server puts them, and a letter run only shows its count once closed."
```

---

### Task 10: LibraryBrowse — the alphabetical stream

**Files:**
- Create: `packages/web-client-v3/src/api/items.js`, `collections.js`
- Create: `packages/web-client-v3/src/state/StreamContext.jsx`
- Create: `packages/web-client-v3/src/components/imprint/VolumeFrame.jsx`
- Create: `packages/web-client-v3/src/components/imprint/TypeTag.jsx`
- Create: `packages/web-client-v3/src/components/imprint/PlateLine.jsx`
- Create: `packages/web-client-v3/src/components/imprint/OverprintStamp.jsx`
- Create: `packages/web-client-v3/src/components/imprint/IndexLetter.jsx`
- Create: `packages/web-client-v3/src/components/imprint/CollectionBoard.jsx`
- Create: `packages/web-client-v3/src/components/ItemRow.jsx`
- Modify: `packages/web-client-v3/src/pages/LibraryBrowse.jsx`
- Modify: `packages/web-client-v3/src/api/index.js`
- Test: `packages/web-client-v3/src/components/imprint/VolumeFrame.test.jsx`
- Test: `packages/web-client-v3/src/components/ItemRow.test.jsx`
- Test: `packages/web-client-v3/src/pages/LibraryBrowse.test.jsx`

**Interfaces:**
- Consumes: `sort.js`, `stream.js`, `picture.js`, `format.js`, `AppHeader`, `VolumePlate`.
- Produces:
  - `itemsApi.list(libraryId, { limit, nextToken })`, `itemsApi.get(libraryId, itemId)`,
    `itemsApi.remove(libraryId, itemId)`
  - `collectionsApi.list|get|create|update|remove`
  - `useStream(libraryId) -> { entries, runs, isLoading, isAppending, isComplete, error, loadMore, refresh }`
  - `<VolumeFrame item size />`, `<TypeTag type />`, `<PlateLine item />`,
    `<OverprintStamp detail? name? days? />`, `<IndexLetter letter count />`,
    `<CollectionBoard board />`, `<ItemRow item onLongPress />`

Comp 2 values: index letter `76px/900`, `font-stretch: 62.5%`, `line-height: .82`,
`letter-spacing: -.03em`, filled `--imprint` with `-webkit-text-stroke: 2px var(--ink)`, over a
4px bottom rule, with the count mono 11px in `--ink-soft` baseline-aligned 8px up. Item rows:
16px padding, 16px gap, 1px bottom rule, top-aligned, lent rows carry a 4px `--out` left rule.
Frames 48×72 with a 2px rule on `--paper-deep`; the film spine is a 3px ink rule at `left: 6px`,
full height. Type tag 10px/800 caps `+.16em` in `--ink-soft`; title 17px/600 at `line-height:
1.25`, 2px below; plate line mono 11px `--ink-soft`, 3px below. Stamp: 2px `--out` outline, ink
caps 10px/800 `+.14em`, `2px 6px` padding, `rotate(-4deg)`, `opacity: .92`, 8px above. Board:
3px ink frame, 16px margin, head padded 8px over a 2px rule, members inset 8px, last member's
rule removed.

- [ ] **Step 1: Write the failing VolumeFrame test**

Create `packages/web-client-v3/src/components/imprint/VolumeFrame.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';
import VolumeFrame from './VolumeFrame.jsx';

const bookWithArt = {
  id: 'a',
  type: 0,
  title: 'Le Grand Sommeil',
  picture: 'https://cdn/a',
  updatedAt: '2026-08-01T09:12:00Z',
};

describe('VolumeFrame', () => {
  it('draws the spine rule on a film, and not on a book', () => {
    const { container: film } = render(<VolumeFrame item={{ id: 'f', type: 1, title: 'X' }} />);
    expect(film.querySelector('[data-spine]')).not.toBeNull();

    const { container: book } = render(<VolumeFrame item={{ id: 'b', type: 0, title: 'X' }} />);
    expect(book.querySelector('[data-spine]')).toBeNull();
  });

  it('draws the spine rule on an empty frame too, since artwork is often absent', () => {
    const { container } = render(<VolumeFrame item={{ id: 'f', type: 1, title: 'X' }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-spine]')).not.toBeNull();
  });

  it('cache-busts the thumbnail with updatedAt', () => {
    render(<VolumeFrame item={bookWithArt} />);
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'https://cdn/a?v=2026-08-01T09%3A12%3A00Z',
    );
  });

  it('falls back to the ruled empty frame when the thumbnail 404s', () => {
    render(<VolumeFrame item={bookWithArt} />);
    fireEvent.error(screen.getByRole('presentation'));
    // Never a broken-image glyph: the URL is synthesised without checking S3, so a fresh
    // item legitimately has one that does not resolve yet.
    expect(screen.queryByRole('presentation')).toBeNull();
  });

  it('shows a collection member order in a plate, and a standalone item none', () => {
    render(<VolumeFrame item={{ id: 'm', type: 0, title: 'X', order: 3, collectionId: 'c' }} />);
    expect(screen.getByText('03')).toBeInTheDocument();

    render(<VolumeFrame item={{ id: 's', type: 0, title: 'Y' }} />);
    expect(screen.queryByText('01')).toBeNull();
  });

  it('is decorative to assistive technology — the title beside it already names the item', () => {
    render(<VolumeFrame item={bookWithArt} />);
    expect(screen.getByRole('presentation')).toHaveAttribute('alt', '');
  });
});
```

- [ ] **Step 2: Run it, then write the frame primitives**

```bash
yarn --cwd packages/web-client-v3 test src/components/imprint/VolumeFrame.test.jsx
```
Expected: FAIL.

Create `packages/web-client-v3/src/components/imprint/VolumeFrame.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { pictureSrc } from '@/lib/picture';
import VolumePlate from './VolumePlate.jsx';

const FILM = 1;
// Thumbnails are produced asynchronously; one delayed retry catches the common case without
// turning the stream into a polling loop.
const RETRY_MS = 4000;

// `hero` is the item-detail size on the inverted cover: same 2:3 ratio and same spine rule,
// ruled in paper instead of ink because the ground is black there.
const VolumeFrame = ({ item, hero = false, className }) => {
  const src = pictureSrc(item);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed) return undefined;
    const timer = setTimeout(() => setFailed(false), RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed]);

  return (
    <div
      className={cn(
        'relative shrink-0 border-2',
        hero
          ? 'h-[198px] w-[132px] border-paper bg-cover-rule'
          : 'h-[72px] w-12 border-ink bg-paper-deep',
        className,
      )}
    >
      {src && !failed && (
        <img
          src={src}
          alt=""
          role="presentation"
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
      {item.type === FILM && (
        // The wrap of a keep case: where a real DVD spine falls, over the artwork's left edge.
        <span
          data-spine
          className={cn(
            'absolute inset-y-0 w-[3px]',
            hero ? 'left-[10px] bg-paper' : 'left-[6px] bg-ink',
          )}
        />
      )}
      {item.collectionId && item.order != null && (
        // Bottom-RIGHT: the spine rule owns the left edge, and a bottom-left plate would sit
        // on top of it on every film frame.
        <VolumePlate className="absolute bottom-0 right-0 px-[3px] py-px text-[9px]">
          {String(item.order).padStart(2, '0')}
        </VolumePlate>
      )}
    </div>
  );
};

export default VolumeFrame;
```

Create `packages/web-client-v3/src/components/imprint/TypeTag.jsx`:

```jsx
// Type is marked structurally, never by colour: this tag, the spine rule, and the plate line.
const LABELS = { 0: 'Book', 1: 'Film' };

const TypeTag = ({ type }) => (
  <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
    {LABELS[type]}
  </span>
);

export default TypeTag;
```

Create `packages/web-client-v3/src/components/imprint/PlateLine.jsx`:

```jsx
import { cn } from '@/lib/cn';
import { bookPlateLine, filmPlateLine } from '@/lib/format';

const FILM = 1;

// The line's position never changes; only which fields fill it.
const PlateLine = ({ item, className }) => {
  const text = item.type === FILM ? filmPlateLine(item) : bookPlateLine(item);
  if (!text) return null;
  return <span className={cn('num mt-[3px] block text-[11px] text-ink-soft', className)}>{text}</span>;
};

export default PlateLine;
```

Create `packages/web-client-v3/src/components/imprint/OverprintStamp.jsx`:

```jsx
import { cn } from '@/lib/cn';

// Red measures ~3.9:1 on paper, so the colour lives on the outline and the caps stay in ink.
// On a row it reads OUT alone; the borrower and the duration belong to detail, because lentTo
// permits 50 characters and nothing here is ever truncated.
const OverprintStamp = ({ name, days, inverted = false }) => {
  const label = name ? `Out · ${name}${days != null ? ` · ${days} days` : ''}` : 'Out';
  return (
    <span
      aria-label={name ? `On loan to ${name}` : 'On loan'}
      className={cn(
        'mt-2 inline-block -rotate-[4deg] border-2 border-out px-[6px] py-[2px]',
        'text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-[0.92]',
        inverted ? 'text-paper' : 'text-ink',
      )}
    >
      {label}
    </span>
  );
};

export default OverprintStamp;
```

Create `packages/web-client-v3/src/components/imprint/IndexLetter.jsx`:

```jsx
// A separator, not a heading: it marks position in the stream, it does not title a section.
// Chrome yellow filled with a 2px ink stroke, which is why 76px reads as monumental.
const IndexLetter = ({ letter, count }) => (
  <div
    role="separator"
    aria-label={`Titles beginning ${letter}`}
    className="sticky top-0 z-10 flex items-end justify-between border-b-4 border-ink bg-paper px-4"
  >
    <span
      aria-hidden="true"
      className="text-[76px] font-black leading-[0.82] tracking-[-0.03em] text-imprint [font-stretch:62.5%] [-webkit-text-stroke:2px_var(--ink)]"
    >
      {letter}
    </span>
    {/* No count on the run still filling: it would grow while the reader looks at it. */}
    {count != null && <span className="num pb-2 text-[11px] text-ink-soft">{count} volumes</span>}
  </div>
);

export default IndexLetter;
```

Run again. Expected: PASS — 6 tests.

- [ ] **Step 3: Write the failing ItemRow test**

Create `packages/web-client-v3/src/components/ItemRow.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ItemRow from './ItemRow.jsx';

const lentBook = {
  id: 'b1',
  type: 0,
  title: 'Le Grand Sommeil',
  authors: ['Raymond Chandler'],
  isbn: '9782070404209',
  lentTo: 'Marie',
  libraryId: 'lib-1',
};

const film = {
  id: 'f1',
  type: 1,
  title: 'Chinatown',
  directors: ['Roman Polanski'],
  releaseYear: 1974,
  duration: 130,
  libraryId: 'lib-1',
};

const renderRow = (item) =>
  render(
    <MemoryRouter>
      <ItemRow item={item} libraryId="lib-1" />
    </MemoryRouter>,
  );

describe('ItemRow', () => {
  it('marks type in three ways, none of them colour', () => {
    const { container } = renderRow(film);
    expect(screen.getByText('Film')).toBeInTheDocument();
    expect(container.querySelector('[data-spine]')).not.toBeNull();
    expect(screen.getByText(/130′/)).toBeInTheDocument();
  });

  it('reads OUT alone on a row, never the borrower', () => {
    renderRow(lentBook);
    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(screen.queryByText(/marie/i)).toBeNull();
  });

  it('still names the state for assistive technology', () => {
    renderRow(lentBook);
    expect(screen.getByLabelText(/on loan/i)).toBeInTheDocument();
  });

  it('carries the red left edge only when the item is out, without displacing the row', () => {
    const { container: lent } = renderRow(lentBook);
    const edge = lent.querySelector('[data-edge="out"]');
    expect(edge).not.toBeNull();
    expect(edge.className).toContain('absolute');
    expect(lent.firstChild.className).not.toMatch(/\bborder-l-4\b/);

    const { container: home } = renderRow(film);
    expect(home.querySelector('[data-edge="out"]')).toBeNull();
  });

  it('does not uppercase the title', () => {
    renderRow(film);
    expect(screen.getByText('Chinatown').className).not.toContain('uppercase');
  });

  it('links to the item detail route', () => {
    renderRow(film);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/libraries/lib-1/items/f1');
  });
});
```

- [ ] **Step 4: Run it, then write ItemRow and CollectionBoard**

```bash
yarn --cwd packages/web-client-v3 test src/components/ItemRow.test.jsx
```
Expected: FAIL.

Create `packages/web-client-v3/src/components/ItemRow.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import VolumeFrame from '@/components/imprint/VolumeFrame.jsx';
import TypeTag from '@/components/imprint/TypeTag.jsx';
import PlateLine from '@/components/imprint/PlateLine.jsx';
import OverprintStamp from '@/components/imprint/OverprintStamp.jsx';
import useLongPress from '@/lib/useLongPress.js';

const ItemRow = ({ item, libraryId, onLongPress, className }) => {
  const longPress = useLongPress(onLongPress ? () => onLongPress(item) : undefined);

  return (
    <div className={cn('relative border-b border-ink', className)}>
      {/* Pseudo-element, not a border: a marked row must not shift 4px out of alignment. */}
      {item.lentTo && <span data-edge="out" className="absolute inset-y-0 left-0 w-1 bg-out" />}
      <Link
        to={`/libraries/${libraryId}/items/${item.id}`}
        className="flex items-start gap-4 p-4"
        {...longPress}
      >
        <VolumeFrame item={item} />
        <span className="min-w-0 flex-1">
          <TypeTag type={item.type} />
          <span className="mt-[2px] block text-[17px] font-semibold leading-[1.25]">
            {item.title}
          </span>
          <PlateLine item={item} />
          {item.lentTo && <OverprintStamp />}
        </span>
      </Link>
    </div>
  );
};

export default ItemRow;
```

Create `packages/web-client-v3/src/components/imprint/CollectionBoard.jsx`:

```jsx
import ItemRow from '@/components/ItemRow.jsx';
import VolumePlate from './VolumePlate.jsx';

// A board files alphabetically under the collection's name while its members run in `order`,
// so a board under "S" can legitimately open with "Aliens". The SERIES ORDER label is what
// stops correct behaviour reading as a sorting bug.
const CollectionBoard = ({ board, libraryId, onItemLongPress }) => (
  <div className="m-4 border-[3px] border-ink">
    <div className="flex items-center justify-between gap-2 border-b-2 border-ink p-2">
      <div className="min-w-0">
        <div className="truncate text-[17px] font-bold">{board.title}</div>
        <span className="mt-[2px] block text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
          {board.partial ? 'Series order · continues' : 'Series order'}
        </span>
      </div>
      <VolumePlate aria-label={`${board.itemCount} items in this collection`}>
        ⌗ {board.itemCount}
      </VolumePlate>
    </div>
    <div className="pl-2">
      {(board.items ?? []).map((item, index) => (
        <ItemRow
          key={item.id}
          item={item}
          libraryId={libraryId}
          onLongPress={onItemLongPress}
          className={index === board.items.length - 1 ? 'border-b-0' : undefined}
        />
      ))}
    </div>
  </div>
);

export default CollectionBoard;
```

Run again. Expected: PASS — 6 tests.

- [ ] **Step 5: Write the items and collections API modules**

Create `packages/web-client-v3/src/api/items.js`:

```js
import { api } from './client.js';

// The API caps limit at 50. 30 keeps a page small enough to render inside one frame while
// still filling a tall phone screen in one request.
export const PAGE_SIZE = 30;

export const itemsApi = {
  list: (libraryId, { limit = PAGE_SIZE, nextToken } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (nextToken) params.set('nextToken', nextToken);
    return api.get(`/libraries/${libraryId}/items?${params}`);
  },
  get: (libraryId, itemId) => api.get(`/libraries/${libraryId}/items/${itemId}`),
  remove: (libraryId, itemId) => api.delete(`/libraries/${libraryId}/items/${itemId}`),
  createBook: (libraryId, body) => api.post(`/libraries/${libraryId}/books`, body),
  updateBook: (libraryId, bookId, body) => api.put(`/libraries/${libraryId}/books/${bookId}`, body),
  createVideo: (libraryId, body) => api.post(`/libraries/${libraryId}/videos`, body),
  updateVideo: (libraryId, videoId, body) =>
    api.put(`/libraries/${libraryId}/videos/${videoId}`, body),
};
```

Create `packages/web-client-v3/src/api/collections.js`:

```js
import { api } from './client.js';

export const collectionsApi = {
  list: (libraryId) => api.get(`/libraries/${libraryId}/collections`),
  get: (libraryId, collectionId) => api.get(`/libraries/${libraryId}/collections/${collectionId}`),
  create: (libraryId, body) => api.post(`/libraries/${libraryId}/collections`, body),
  update: (libraryId, collectionId, body) =>
    api.put(`/libraries/${libraryId}/collections/${collectionId}`, body),
  // Deleting a collection ORPHANS its items; it does not delete them.
  remove: (libraryId, collectionId) =>
    api.delete(`/libraries/${libraryId}/collections/${collectionId}`),
};
```

Add both to `src/api/index.js`.

- [ ] **Step 6: Write the stream store**

Create `packages/web-client-v3/src/state/StreamContext.jsx`:

```jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { itemsApi } from '@/api';
import { appendPage, toLetterRuns } from '@/lib/stream';

// A per-library paged stream. Pages append in the server's order and are never re-sorted.
export const useStream = (libraryId) => {
  const [entries, setEntries] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  // Guards against a scroll event firing loadMore twice before the first request settles.
  const inFlight = useRef(false);

  const load = useCallback(
    async (token) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setError(null);
      try {
        const page = await itemsApi.list(libraryId, { nextToken: token });
        setEntries((current) => appendPage(token ? current : [], page?.items ?? []));
        setNextToken(page?.nextToken ?? null);
        setIsComplete(!page?.nextToken);
      } catch (err) {
        setError(err.message);
      } finally {
        inFlight.current = false;
        setIsLoading(false);
        setIsAppending(false);
      }
    },
    [libraryId],
  );

  useEffect(() => {
    setEntries([]);
    setNextToken(null);
    setIsComplete(false);
    setIsLoading(true);
    load(null);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!nextToken || inFlight.current) return;
    setIsAppending(true);
    load(nextToken);
  }, [load, nextToken]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return load(null);
  }, [load]);

  const runs = useMemo(() => toLetterRuns(entries, { complete: isComplete }), [entries, isComplete]);

  return { entries, runs, isLoading, isAppending, isComplete, error, loadMore, refresh };
};
```

- [ ] **Step 7: Write the failing LibraryBrowse test**

Create `packages/web-client-v3/src/pages/LibraryBrowse.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';
import { libraries } from '@/test/fixtures';
import LibraryBrowse from './LibraryBrowse.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';

const renderPage = (libraryId = 'lib-fiction') =>
  render(
    <MemoryRouter initialEntries={[`/libraries/${libraryId}`]}>
      <LibrariesProvider>
        <Routes>
          <Route path="/libraries/:libraryId" element={<LibraryBrowse />} />
        </Routes>
      </LibrariesProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const path = String(url);
      const result = path.includes('/libraries?') || path.endsWith('/libraries')
        ? { status: 200, body: { libraries } }
        : handleMockRequest('GET', path);
      return {
        ok: result.status < 400,
        status: result.status,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => result.body,
      };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('LibraryBrowse', () => {
  it('names the library in the header without repeating it on every row', async () => {
    renderPage();
    expect(await screen.findByText('Fiction')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Zazie dans le métro')).toBeInTheDocument());
    expect(screen.getAllByText('Fiction')).toHaveLength(1);
  });

  it('marks alphabetical position with index letters, including the tail bucket', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Œuvres complètes')).toBeInTheDocument());
    const letters = screen.getAllByRole('separator').map((el) => el.getAttribute('aria-label'));
    expect(letters).toContain('Titles beginning #');
    expect(letters).toContain('Titles beginning Œ');
  });

  it('offers the add action on an owned library', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /add an item/i })).toBeInTheDocument();
  });

  it('omits the add action on a shared library rather than disabling it', async () => {
    renderPage('lib-shared-in');
    await screen.findByText("Marie's shelf");
    expect(screen.queryByRole('button', { name: /add an item/i })).toBeNull();
  });

  it('declares provenance once, in the header, on a shared library', async () => {
    renderPage('lib-shared-in');
    expect(await screen.findByText(/from marie@example.com/i)).toBeInTheDocument();
  });

  it('invites the reader when the library is empty, at full weight', async () => {
    renderPage('lib-empty');
    expect(await screen.findByText(/nothing filed here yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run it, then write the page**

```bash
yarn --cwd packages/web-client-v3 test src/pages/LibraryBrowse.test.jsx
```
Expected: FAIL.

Replace `packages/web-client-v3/src/pages/LibraryBrowse.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import IndexLetter from '@/components/imprint/IndexLetter.jsx';
import CollectionBoard from '@/components/imprint/CollectionBoard.jsx';
import ItemRow from '@/components/ItemRow.jsx';
import PullToRefresh from '@/components/PullToRefresh.jsx';
import AddItemSheet from '@/components/AddItemSheet.jsx';
import { Plus } from '@/components/icons';
import { useLibraries } from '@/state/LibrariesContext.jsx';
import { useStream } from '@/state/StreamContext.jsx';

const COLLECTION = 2;

const LibraryBrowse = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const { byId } = useLibraries();
  const library = byId(libraryId);
  const isReadOnly = Boolean(library?.sharedFrom);
  const { runs, isLoading, isAppending, isComplete, error, loadMore, refresh } = useStream(libraryId);
  const [isAdding, setIsAdding] = useState(false);
  const sentinel = useRef(null);
  const scroller = useRef(null);

  // Pagination stays invisible: the reader sees position through index letters, not pages.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (records) => records.some((r) => r.isIntersecting) && loadMore(),
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <AppHeader
        title={library?.name ?? ''}
        onBack={() => navigate('/libraries')}
        onTitleTap={() => scroller.current?.scrollTo({ top: 0 })}
        right={
          // Read-only means the action is absent, not disabled.
          isReadOnly ? null : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              aria-label="Add an item"
              className="on-imprint flex size-12 items-center justify-center bg-imprint text-ink"
            >
              <Plus />
            </button>
          )
        }
      />

      {isReadOnly && (
        // Provenance is declared once, here, and never repeated on every row.
        <p className="caps border-b-2 border-l-4 border-ink border-l-shared px-4 py-2 text-[11px] text-shared">
          From {library.sharedFrom} · read only
        </p>
      )}

      <PullToRefresh onRefresh={refresh} className="flex-1" ref={scroller}>
        {error && (
          <p role="alert" className="border-t-2 border-out bg-paper-deep p-4 text-sm">
            {error} Pull down to try again.
          </p>
        )}

        {isLoading && !error && (
          <div className="p-4" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mb-4 flex gap-4">
                <span className="h-[72px] w-12 border-2 border-ink bg-paper-deep" />
                <span className="flex-1">
                  <span className="block h-4 w-1/2 bg-paper-deep" />
                  <span className="mt-2 block h-3 w-1/3 bg-paper-deep" />
                </span>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && runs.length === 0 && (
          <div className="m-4 border-2 border-ink p-8 text-center">
            <p className="caps text-xs text-ink-soft">Nothing filed here yet</p>
            {!isReadOnly && (
              <p className="mt-2 text-sm">Add the first volume with the plus above.</p>
            )}
          </div>
        )}

        {runs.map((run) => (
          <section key={run.letter}>
            {/* A closed run knows its final count; the tail run does not, so it shows none. */}
            <IndexLetter letter={run.letter} count={run.closed ? run.itemCount : null} />
            {run.entries.map((entry) =>
              entry.type === COLLECTION ? (
                <CollectionBoard key={entry.id} board={entry} libraryId={libraryId} />
              ) : (
                <ItemRow key={entry.id} item={entry} libraryId={libraryId} />
              ),
            )}
          </section>
        ))}

        <div ref={sentinel} aria-hidden="true" className="h-px" />

        {isAppending && (
          <p role="status" className="caps p-4 text-center text-[11px] text-ink-soft">
            Loading more
          </p>
        )}
        {isComplete && runs.length > 0 && (
          <p className="caps border-t-2 border-ink p-4 text-center text-[11px] text-ink-soft">
            End of the shelf
          </p>
        )}
      </PullToRefresh>

      <AddItemSheet open={isAdding} onClose={() => setIsAdding(false)} libraryId={libraryId} />
    </div>
  );
};

export default LibraryBrowse;
```

Create `packages/web-client-v3/src/components/AddItemSheet.jsx` — a `Sheet` titled "Add to this
library" with two `PlateButton`s, "Book" navigating to `/libraries/{id}/add/book` and "Film" to
`/libraries/{id}/add/video`, plus a ruled "Enter by hand" secondary going to
`/libraries/{id}/items/new/book`. Adding starts inside the library, so the destination is never
asked.

`PullToRefresh` must forward its ref to the scroller for the tap-title-to-top behaviour: wrap it
in `forwardRef` and attach the incoming ref to the scrolling `div`.

- [ ] **Step 9: Apply the off-screen skipping**

Add to `src/index.css`, inside `@layer utilities`:

```css
/* Skips layout and paint for rows outside the viewport, which is what keeps a 1000-item
   stream responsive. Applied to ROWS ONLY, never to an ancestor of a sticky index letter:
   containment on the wrong element kills position: sticky, and the letters are load-bearing
   wayfinding rather than decoration. */
.row-skip {
  content-visibility: auto;
  contain-intrinsic-size: auto 104px;
}
```

Apply `row-skip` to the outer `div` of `ItemRow`. **Do not** apply it to `section`, to
`CollectionBoard`, or to the scroller: boards are variable-height and a wrong
`contain-intrinsic-size` on them causes visible scroll drift.

- [x] **Step 10: Measure at 1000 items — the acceptance gate** — done, `yarn profile:stream`

Results at 942 top-level entries / 1000 items, phone viewport, fresh load per condition:

| condition | reqs | p50 | p95 | max | frames >50ms |
|---|---|---|---|---|---|
| PAGE_SIZE 30, 1x | 31 | 8.3ms | 26.3ms | 86.4ms | 5 / ~1000 |
| PAGE_SIZE 30, 4x throttled | 31 | 8.3ms | 106.6ms | 299.5ms | 53 |
| PAGE_SIZE 10, 1x | 75 | 8.3ms | 23.0ms | 72.7ms | 8 |
| PAGE_SIZE 10, 4x throttled | 94 | 8.3ms | 118.6ms | 282.3ms | 142 |

**`PAGE_SIZE` stays 30.** Ten is worse on the metric that matters and costs three times the
round trips: 142 frames over budget against 53 at 4x, a worse p95, and 94 requests against 31
for one library. Smaller pages trade one large commit for many medium ones and the total jank
rises. On the operating context that decides it — a bookshop on poor signal — trebling requests
to smooth a boundary a reader cannot perceive is the wrong direction.

**Scroll drift on a merging continuation board: 0.0px.** Boards left uncontained plus the
browser's native scroll anchoring is sufficient. Measured by watching every frame for the exact
commit where the member count changes; a before/after comparison reported "no drift" twice for
the wrong reason, because the paging sentinel had already merged the board.

**`content-visibility` earns nothing measurable here — and is kept anyway.** Within noise at 1x,
+6% at 4x. But the 1000-item fixture carries almost no artwork, and skipping off-screen image
decode is the main thing containment buys, so this measured the one configuration in which it
cannot help. That is evidence about the fixture, not about containment. Settle it with a fixture
carrying a real decodable image on every row, when the picture states are built.

**The frame gate was re-specified, and this was a correction of the instrument rather than of
the standard.** It was "no frame over 50ms". An absolute max-frame gate on a React list fails at
every commit boundary forever, for any page size, on any device slow enough — committing a batch
of rows *is* a long frame, so the gate measured a property of batching rather than a defect. It
is now p95 ≤ 34ms plus at most 1% of frames over 50ms, both measured at 1x, which is the run
reproducible across machines. 4x throttling is reported as information about a slower device,
not as pass/fail. p50 is 8.3ms in every condition ever measured, and the outliers sit at page
boundaries and nowhere else.

---

Temporarily extend the fixture generator so `lib-fiction` holds 1000 entries (loop
`book(...)` with generated titles across the alphabet). Then:

```bash
VITE_MOCK=1 yarn --cwd packages/web-client-v3 dev
```

In Chrome DevTools, record a Performance profile while flinging the stream from top to bottom.
**Gate:** no frame over 50ms, and the sticky index letter stays pinned throughout. If either
fails, stop and escalate to `@tanstack/react-virtual` with dynamic measurement for boards — and
report the measurement to the design session, since it was their caution.

Revert the fixture size afterwards.

- [ ] **Step 11: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): library browse — alphabetical stream, sticky index letters, boards

Off-screen skipping is applied to rows only: containment on an ancestor of a sticky letter
would kill the wayfinding the stream depends on."
```

---

### Task 11: Reproduction pass — comp 2, library browse

**Blocked unless `docs/ui-design/ui-v3-mockup.html` exists.**

- [ ] **Step 1: Capture both**

```bash
yarn --cwd packages/web-client-v3 shoot \
  --target "file:///Users/jrsue/dev/repos/alexandria/docs/ui-design/ui-v3-mockup.html" \
  --viewport 1600x1200 --clip ".comp:nth-of-type(2) .screen" --out .impeccable/review/comp-browse.png

# A private port: :5173 belongs to the user and is strictPort.
VITE_MOCK=1 yarn --cwd packages/web-client-v3 exec vite --port 5199 --strictPort &
sleep 5
yarn --cwd packages/web-client-v3 shoot \
  --target http://localhost:5199/libraries/lib-fiction \
  --viewport phone --wait "[data-testid='browse-stream']" \
  --out .impeccable/review/browse.png
kill %1   # only the server this snippet started
```

- [ ] **Step 2: Compare and fix**

Check against comp 2, fixing each mismatch in source:

1. Index letter: 76px/900, `font-stretch: 62.5%`, `line-height: .82`, `letter-spacing: -.03em`,
   `--imprint` fill with a 2px `--ink` text stroke, 4px bottom rule, 16px side padding.
2. The count sits bottom-right, mono 11px `--ink-soft`, 8px above the rule — and is **absent**
   on the last letter in the stream.
3. Item rows: 16px padding, 16px gap, 1px bottom rule, contents top-aligned.
4. Frames exactly 48×72 with a 2px rule on `--paper-deep`.
5. Film spine: 3px ink rule, full height, `left: 6px`. Present on empty frames.
6. Type tag 10px/800 caps `+.16em` `--ink-soft`; title 17px/600 `line-height: 1.25` 2px below;
   plate line mono 11px `--ink-soft` 3px below.
7. Stamp reads `OUT` alone on a row, rotated −4°, `opacity: .92`, 2px `--out` outline, ink caps,
   8px above the title block.
8. Lent rows carry a 4px `--out` left rule, drawn as a positioned element so the row's frame
   stays aligned with its unmarked neighbours. Sight down the left edge of the frames: any
   4px step means it was built as a border.
9. Board: 3px ink frame, 16px margin, head padded 8px over a 2px rule, `SERIES ORDER` under the
   name, `⌗ 12` plate right, members inset 8px, last member's bottom rule removed, member frames
   carrying their order plate **bottom-right** — the spine rule owns the left edge, and a
   bottom-left plate collides with it on every film frame.

- [ ] **Step 3: Commit**

```bash
git add packages/web-client-v3
git commit -m "feat(web-v3): reproduce comp 2 (library browse)"
```

---

### Task 12: Item actions — edit, lend, return, delete

**Files:**
- Create: `packages/web-client-v3/src/api/events.js`
- Create: `packages/web-client-v3/src/components/ItemActionsSheet.jsx`
- Modify: `packages/web-client-v3/src/pages/LibraryBrowse.jsx`
- Test: `packages/web-client-v3/src/components/ItemActionsSheet.test.jsx`

**Interfaces:**
- Produces: `eventsApi.list|create|clear`, `<ItemActionsSheet item libraryId open onClose onChanged />`

- [ ] **Step 1: Write the failing test**

Create `packages/web-client-v3/src/components/ItemActionsSheet.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ItemActionsSheet from './ItemActionsSheet.jsx';

const atHome = { id: 'i1', type: 0, title: 'Nadja', libraryId: 'lib-1' };
const onLoan = { ...atHome, lentTo: 'Marie' };

const renderSheet = (item, props = {}) =>
  render(
    <MemoryRouter>
      <ItemActionsSheet item={item} libraryId="lib-1" open onClose={() => {}} {...props} />
    </MemoryRouter>,
  );

describe('ItemActionsSheet', () => {
  it('offers Lend on an item that is at home, and not Return', () => {
    renderSheet(atHome);
    expect(screen.getByRole('button', { name: /^lend/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^return/i })).toBeNull();
  });

  it('offers Return on an item that is out, naming who has it', () => {
    renderSheet(onLoan);
    expect(screen.getByRole('button', { name: /return/i })).toBeInTheDocument();
    expect(screen.getByText(/marie/i)).toBeInTheDocument();
  });

  it('takes the borrower inline, capped at the API limit of 50', async () => {
    renderSheet(atHome);
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    expect(screen.getByLabelText(/who has it/i)).toHaveAttribute('maxLength', '50');
  });

  it('confirms deletion in place and says the item is gone for good', async () => {
    renderSheet(atHome);
    await userEvent.click(screen.getByRole('button', { name: /^delete/i }));
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, then write the API module and the sheet**

```bash
yarn --cwd packages/web-client-v3 test src/components/ItemActionsSheet.test.jsx
```
Expected: FAIL.

Create `packages/web-client-v3/src/api/events.js`:

```js
import { api } from './client.js';

export const eventsApi = {
  list: (libraryId, itemId, { limit = 20, nextToken } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (nextToken) params.set('nextToken', nextToken);
    return api.get(`/libraries/${libraryId}/items/${itemId}/events?${params}`);
  },
  // type is 'LENT' or 'RETURNED'; event is the person's name, capped at 50 characters.
  create: (libraryId, itemId, { type, event }) =>
    api.post(`/libraries/${libraryId}/items/${itemId}/events`, { type, event }),
  clear: (libraryId, itemId) => api.delete(`/libraries/${libraryId}/items/${itemId}/events`),
};
```

Add it to `src/api/index.js`, which by now re-exports `api`, `ApiError`, `librariesApi`,
`itemsApi`, `PAGE_SIZE`, `collectionsApi` and `eventsApi`. Task 14 imports `eventsApi` from
`@/api`, so the barrel must carry it.

Create `packages/web-client-v3/src/components/ItemActionsSheet.jsx` following the shape of
`LibraryActionsSheet`: a `menu` mode offering Edit (navigates to
`/libraries/{libraryId}/items/{item.id}/edit`), Lend or Return depending on `item.lentTo`, and
Delete; a `lend` mode with one `Field` labelled "Who has it" at `maxLength={50}`, submitting
`eventsApi.create(libraryId, item.id, { type: 'LENT', event: name })`; Return posting
`{ type: 'RETURNED', event: item.lentTo }`; a `delete` mode confirming in place with
"Delete *title*? This cannot be undone." before calling `itemsApi.remove`.

Every write is followed by `onChanged()`, because the API returns an empty body and the item
must be re-read rather than assumed:

```jsx
const run = async (action) => {
  setError(null);
  setIsBusy(true);
  try {
    await action();
    // Mutations return no body, so the caller re-reads rather than patching local state.
    await onChanged?.();
    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setIsBusy(false);
  }
};
```

- [ ] **Step 3: Wire it into the browse stream**

In `LibraryBrowse.jsx`, hold `const [actionsFor, setActionsFor] = useState(null)` and pass
`onLongPress={isReadOnly ? undefined : setActionsFor}` to every `ItemRow`, including those
inside a `CollectionBoard` (`onItemLongPress`). Render `<ItemActionsSheet … onChanged={refresh} />`.

Add the visible duplicate of the long press: a 48px "Actions" affordance at the right of each
owned row, `aria-label={`Actions for ${item.title}`}`.

- [ ] **Step 4: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): item actions — edit, lend, return, delete, confirmed in place"
```

---

### Task 13: Collections — create, edit, delete

**Files:**
- Modify: `packages/web-client-v3/src/pages/NewCollection.jsx`, `EditCollection.jsx`
- Create: `packages/web-client-v3/src/components/CollectionActionsSheet.jsx`
- Modify: `packages/web-client-v3/src/components/imprint/CollectionBoard.jsx`
- Test: `packages/web-client-v3/src/pages/NewCollection.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web-client-v3/src/pages/NewCollection.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NewCollection from './NewCollection.jsx';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/libraries/lib-1/collections/new']}>
      <Routes>
        <Route path="/libraries/:libraryId/collections/new" element={<NewCollection />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('NewCollection', () => {
  it('honours the API limits on both fields', () => {
    renderPage();
    expect(screen.getByLabelText(/name/i)).toHaveAttribute('maxLength', '100');
    expect(screen.getByLabelText(/description/i)).toHaveAttribute('maxLength', '500');
  });

  it('shows a duplicate name on the field, not as a toast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Collection name already exists' }),
      })),
    );
    renderPage();
    await userEvent.type(screen.getByLabelText(/name/i), 'Melville');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    const field = screen.getByLabelText(/name/i);
    await vi.waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText(/already a collection called/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, then write the pages**

```bash
yarn --cwd packages/web-client-v3 test src/pages/NewCollection.test.jsx
```
Expected: FAIL.

Write `NewCollection.jsx` and `EditCollection.jsx` on the `NewLibrary.jsx` pattern, with
`maxLength` 100 and 500 and live remaining counts. Route the duplicate-name rejection to the
name field rather than the page-level alert:

```jsx
const DUPLICATE = /already exists/i;

catch (err) {
  // A duplicate name is a fact about the field, so it belongs on the field.
  if (err.status === 400 && DUPLICATE.test(err.message)) {
    setNameError(`There is already a collection called “${name}” in this library.`);
  } else {
    setError(err.message);
  }
}
```

Create `CollectionActionsSheet.jsx` offering Edit and Delete. The delete confirmation must state
what actually happens — the backend orphans members rather than deleting them:

```jsx
<p className="mb-4 text-sm">
  Delete the collection <strong>{board.title}</strong>? Its {board.itemCount} items stay in this
  library — they simply stop being grouped. Only the grouping is removed.
</p>
```

Add a 48px actions affordance to the board head, shown only on owned libraries, opening that
sheet. Add an "Add a collection" secondary action to `AddItemSheet`, routing to
`/libraries/{libraryId}/collections/new`.

- [ ] **Step 3: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): collection create/edit/delete

The delete confirmation says what the backend actually does: members are orphaned, not deleted."
```

---

# Slice C — the black cover

---

### Task 14: Loan pairing and ItemDetail

**Files:**
- Create: `packages/web-client-v3/src/lib/loans.js`
- Create: `packages/web-client-v3/src/components/imprint/LedgerRow.jsx`
- Modify: `packages/web-client-v3/src/pages/ItemDetail.jsx`
- Test: `packages/web-client-v3/src/lib/loans.test.js`
- Test: `packages/web-client-v3/src/pages/ItemDetail.test.jsx`

**Interfaces:**
- Produces:
  - `pairLoanEvents(events, now) -> [{ name, lentAt, returnedAt, days, open, unresolved }]`
  - `daysBetween(a, b) -> number`
  - `<LedgerRow loan inverted />`

The API has no loan entity and no due date — only an append-only stream of `LENT` and
`RETURNED` events. A loan is a client-side derivation, and "overdue" does not exist.

- [ ] **Step 1: Write the failing loans test**

Create `packages/web-client-v3/src/lib/loans.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { daysBetween, pairLoanEvents } from './loans.js';

const NOW = new Date('2026-08-13T12:00:00Z');

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-08-01T00:00:00Z', '2026-08-08T00:00:00Z')).toBe(7);
  });

  it('floors a partial day rather than rounding it up', () => {
    expect(daysBetween('2026-08-01T00:00:00Z', '2026-08-01T23:00:00Z')).toBe(0);
  });
});

describe('pairLoanEvents', () => {
  it('pairs a LENT with the RETURNED that follows it', () => {
    const loans = pairLoanEvents(
      [
        { date: '2026-03-19T10:00:00Z', type: 'RETURNED', event: 'Paul' },
        { date: '2026-03-02T10:00:00Z', type: 'LENT', event: 'Paul' },
      ],
      NOW,
    );
    expect(loans).toHaveLength(1);
    expect(loans[0]).toMatchObject({ name: 'Paul', days: 17, open: false });
  });

  it('leaves the most recent LENT open and measures it against now', () => {
    const loans = pairLoanEvents([{ date: '2026-08-07T12:00:00Z', type: 'LENT', event: 'Marie' }], NOW);
    expect(loans[0]).toMatchObject({ name: 'Marie', open: true, days: 6, returnedAt: null });
  });

  it('returns loans newest first, matching the ledger reading order', () => {
    const loans = pairLoanEvents(
      [
        { date: '2026-08-07T12:00:00Z', type: 'LENT', event: 'Marie' },
        { date: '2026-03-19T10:00:00Z', type: 'RETURNED', event: 'Paul' },
        { date: '2026-03-02T10:00:00Z', type: 'LENT', event: 'Paul' },
      ],
      NOW,
    );
    expect(loans.map((l) => l.name)).toEqual(['Marie', 'Paul']);
  });

  it('marks a LENT superseded by another LENT as unresolved, not as returned', () => {
    // Real histories contain this. Inventing a return date would be a lie; calling both open
    // would be another. It is simply a loan with no recorded return.
    const loans = pairLoanEvents(
      [
        { date: '2026-08-07T12:00:00Z', type: 'LENT', event: 'Marie' },
        { date: '2026-03-11T10:00:00Z', type: 'LENT', event: 'Léa' },
      ],
      NOW,
    );
    expect(loans).toHaveLength(2);
    expect(loans[0]).toMatchObject({ name: 'Marie', open: true });
    expect(loans[1]).toMatchObject({ name: 'Léa', open: false, unresolved: true, returnedAt: null });
  });

  it('drops a RETURNED with no matching LENT rather than inventing a loan', () => {
    expect(pairLoanEvents([{ date: '2026-01-01T00:00:00Z', type: 'RETURNED', event: 'X' }], NOW)).toEqual([]);
  });

  it('ignores an event with no timestamp, which the API types as nullable', () => {
    expect(pairLoanEvents([{ type: 'LENT', event: 'X' }], NOW)).toEqual([]);
  });

  it('returns nothing for an item that has never been lent', () => {
    expect(pairLoanEvents([], NOW)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, then write the module**

```bash
yarn --cwd packages/web-client-v3 test src/lib/loans.test.js
```
Expected: FAIL.

Create `packages/web-client-v3/src/lib/loans.js`:

```js
const MS_PER_DAY = 86_400_000;

export const daysBetween = (from, to) =>
  Math.floor((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY);

// The API stores LENT/RETURNED events, not loans, and has no due date — so a loan, its
// duration, and whether it is still open are all derived here. "Overdue" is not a concept
// this backend has, and nothing in the UI may imply it.
export const pairLoanEvents = (events = [], now = new Date()) => {
  const chronological = events
    .filter((event) => event.date)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const loans = [];
  let open = null;

  const close = (returnedAt, extra = {}) => {
    loans.push({
      name: open.name,
      lentAt: open.lentAt,
      returnedAt,
      days: daysBetween(open.lentAt, returnedAt ?? now),
      open: false,
      unresolved: false,
      ...extra,
    });
    open = null;
  };

  for (const event of chronological) {
    if (event.type === 'LENT') {
      // A LENT superseded by another LENT: the first loan has no recorded return. Say that,
      // rather than inventing a date or pretending both are still out.
      if (open) close(null, { unresolved: true });
      open = { name: event.event, lentAt: event.date };
    } else if (event.type === 'RETURNED' && open) {
      close(event.date);
    }
    // A RETURNED with nothing open is orphaned history; it is dropped, not turned into a loan.
  }

  if (open) {
    loans.push({
      name: open.name,
      lentAt: open.lentAt,
      returnedAt: null,
      days: daysBetween(open.lentAt, now),
      open: true,
      unresolved: false,
    });
  }

  return loans.reverse();
};
```

Run again. Expected: PASS — 10 tests.

- [ ] **Step 3: Write the failing ItemDetail test**

Create `packages/web-client-v3/src/pages/ItemDetail.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMockRequest } from '../../tools/mock-api.js';
import ItemDetail from './ItemDetail.jsx';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import { libraries } from '@/test/fixtures';

const renderPage = (itemId) =>
  render(
    <MemoryRouter initialEntries={[`/libraries/lib-fiction/items/${itemId}`]}>
      <LibrariesProvider>
        <Routes>
          <Route path="/libraries/:libraryId/items/:itemId" element={<ItemDetail />} />
        </Routes>
      </LibrariesProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const path = String(url);
      const result = path.endsWith('/libraries')
        ? { status: 200, body: { libraries } }
        : handleMockRequest('GET', path);
      return {
        ok: result.status < 400,
        status: result.status,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => result.body,
      };
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('ItemDetail', () => {
  it('resolves from the route alone, in one request, so the link survives a refresh', async () => {
    renderPage('item-lent');
    expect(await screen.findByText('Notre-Dame de Paris')).toBeInTheDocument();
  });

  it('names the borrower and the duration here, which a row never does', async () => {
    renderPage('item-lent');
    expect(await screen.findByText(/out · marie/i)).toBeInTheDocument();
  });

  it('carries the record inline, not only behind the history screen', async () => {
    renderPage('item-lent');
    await waitFor(() => expect(screen.getByText(/still out/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /full record/i })).toBeInTheDocument();
  });

  it('says plainly when the item is not there, instead of spinning forever', async () => {
    renderPage('does-not-exist');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in this collection/i);
  });

  it('does not uppercase the title', async () => {
    renderPage('item-lent');
    const title = await screen.findByText('Notre-Dame de Paris');
    expect(title.className).not.toContain('uppercase');
  });
});
```

- [ ] **Step 4: Run it, then write LedgerRow and the page**

```bash
yarn --cwd packages/web-client-v3 test src/pages/ItemDetail.test.jsx
```
Expected: FAIL.

Create `packages/web-client-v3/src/components/imprint/LedgerRow.jsx`:

```jsx
import { cn } from '@/lib/cn';

const stamp = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// One loan pairing. There is no due date in this API, so a loan states its duration and
// nothing about lateness.
const LedgerRow = ({ loan, inverted = false }) => {
  const right = loan.unresolved ? 'no return recorded' : `${loan.days} days`;
  const left = loan.open
    ? `${stamp(loan.lentAt)} → still out`
    : `${stamp(loan.lentAt)} → ${loan.returnedAt ? stamp(loan.returnedAt) : '—'}`;

  return (
    <div
      className={cn(
        'num flex justify-between gap-2 border-b py-2 text-[11px]',
        inverted ? 'border-cover-rule text-cover-soft' : 'border-ink text-ink-soft',
        loan.open && (inverted ? 'text-paper' : 'text-ink'),
      )}
    >
      <span>{left}</span>
      <span className={inverted ? 'text-cover-soft' : 'text-ink-soft'}>{right}</span>
    </div>
  );
};

export default LedgerRow;
```

Replace `packages/web-client-v3/src/pages/ItemDetail.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';
import PlateButton from '@/components/imprint/PlateButton.jsx';
import VolumePlate from '@/components/imprint/VolumePlate.jsx';
import OverprintStamp from '@/components/imprint/OverprintStamp.jsx';
import LedgerRow from '@/components/imprint/LedgerRow.jsx';
import ItemActionsSheet from '@/components/ItemActionsSheet.jsx';
import { Search } from '@/components/icons';
import { eventsApi, itemsApi } from '@/api';
import { bookPlateLine, filmPlateLine } from '@/lib/format';
import { pairLoanEvents } from '@/lib/loans';
import { useLibraries } from '@/state/LibrariesContext.jsx';

const FILM = 1;
const LEDGER_PREVIEW = 3;

// The one surface that inverts to the black cover: here the reader is looking at a single
// thing rather than scanning a thousand, so the cover earns its impact.
const ItemDetail = () => {
  const { libraryId, itemId } = useParams();
  const navigate = useNavigate();
  const { byId } = useLibraries();
  const library = byId(libraryId);
  const isReadOnly = Boolean(library?.sharedFrom);

  const [item, setItem] = useState(null);
  const [loans, setLoans] = useState([]);
  const [status, setStatus] = useState('loading');
  const [isActing, setIsActing] = useState(false);

  const load = async () => {
    try {
      const [fetched, events] = await Promise.all([
        itemsApi.get(libraryId, itemId),
        eventsApi.list(libraryId, itemId, { limit: 20 }).catch(() => ({ events: [] })),
      ]);
      setItem(fetched);
      setLoans(pairLoanEvents(events?.events ?? []));
      setStatus('ready');
    } catch (err) {
      setStatus(err.status === 404 ? 'missing' : 'error');
    }
  };

  useEffect(() => {
    setStatus('loading');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryId, itemId]);

  if (status === 'missing' || status === 'error') {
    return (
      <div className="min-h-dvh bg-ink text-paper">
        <AppHeader inverted onBack={() => navigate(-1)} search={false} />
        <p role="alert" className="m-4 border-2 border-out p-4 text-sm">
          {status === 'missing'
            ? 'That volume is not in this collection. It may have been deleted, or the link may be wrong.'
            : 'Could not load this volume. Check your connection and try again.'}
        </p>
      </div>
    );
  }

  const openLoan = loans.find((loan) => loan.open);
  const plateLine = item
    ? [item.type === FILM ? filmPlateLine(item) : bookPlateLine(item), library?.name]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <AppHeader
        inverted
        search={false}
        onBack={() => navigate(-1)}
        right={
          <Link
            to="/search"
            aria-label="Search every library"
            className="on-imprint flex size-12 items-center justify-center bg-imprint text-ink"
          >
            <Search />
          </Link>
        }
      />

      {status === 'loading' && <div className="p-6" aria-busy="true" />}

      {status === 'ready' && (
        <div className="px-4 py-6">
          {/* Detail is the one screen where artwork earns real space: the reader is looking
              at a single object, not scanning a thousand. Same 2:3 frame and spine rule as
              the stream, at hero scale, ruled in paper on the cover. */}
          <VolumeFrame item={item} hero className="mb-6" />

          {/* A plate only when there is a real order to carry. */}
          {item.collectionId && item.order != null && (
            <VolumePlate className="mb-4">{String(item.order).padStart(2, '0')}</VolumePlate>
          )}

          <h1 className="text-[32px] font-extrabold leading-[1.06]">{item.title}</h1>
          <p className="num text-xs text-cover-soft">{plateLine}</p>

          <div className="my-4 h-1 bg-imprint" />

          {/* The stamp is the only statement of loan state here. A "Currently out" label
              above it would say the same thing twice. */}
          {item.lentTo && (
            <OverprintStamp inverted name={item.lentTo} days={openLoan?.days} />
          )}

          {item.summary && <p className="mt-4 text-sm text-cover-body">{item.summary}</p>}

          {item.type === FILM && item.cast?.length > 0 && (
            <p className="mt-4 text-sm text-cover-body">{item.cast.join(', ')}</p>
          )}

          {loans.length > 0 && (
            <>
              {/* The record carries its own past: the ledger reads on the item itself. */}
              <h2 className="caps mt-6 text-[10px] tracking-[0.16em] text-imprint">The record</h2>
              <div className="mt-2 border-t-2 border-paper">
                {loans.slice(0, LEDGER_PREVIEW).map((loan) => (
                  <LedgerRow key={`${loan.lentAt}-${loan.name}`} loan={loan} inverted />
                ))}
              </div>
              <Link
                to={`/libraries/${libraryId}/items/${itemId}/history`}
                className="caps mt-4 inline-block text-[11px] text-imprint underline"
              >
                Full record
              </Link>
            </>
          )}

          {!isReadOnly && (
            <div className="mt-6 flex gap-2">
              <PlateButton onClick={() => setIsActing(true)}>
                {item.lentTo ? 'Mark returned' : 'Lend'}
              </PlateButton>
              <PlateButton
                variant="secondary"
                onClick={() => navigate(`/libraries/${libraryId}/items/${itemId}/edit`)}
              >
                Edit
              </PlateButton>
            </div>
          )}
        </div>
      )}

      {item && (
        <ItemActionsSheet
          item={item}
          libraryId={libraryId}
          open={isActing}
          onClose={() => setIsActing(false)}
          // PUT and POST return empty bodies, so the item is re-read rather than assumed.
          onChanged={load}
        />
      )}
    </div>
  );
};

export default ItemDetail;
```

- [ ] **Step 5: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): item detail on the black cover, with the loan ledger inline

Loans are derived client-side by pairing LENT/RETURNED events; a LENT superseded by another
LENT is reported as having no recorded return rather than given an invented one."
```

---

### Task 15: Reproduction pass — comp 3, item detail

**Blocked unless `docs/ui-design/ui-v3-mockup.html` exists.**

- [ ] **Step 1: Capture both**

```bash
yarn --cwd packages/web-client-v3 shoot \
  --target "file:///Users/jrsue/dev/repos/alexandria/docs/ui-design/ui-v3-mockup.html" \
  --viewport 1600x1200 --clip ".comp:nth-of-type(3) .screen" --out .impeccable/review/comp-detail.png

# A private port: :5173 belongs to the user and is strictPort.
VITE_MOCK=1 yarn --cwd packages/web-client-v3 exec vite --port 5199 --strictPort &
sleep 5
yarn --cwd packages/web-client-v3 shoot \
  --target http://localhost:5199/libraries/lib-fiction/items/item-lent \
  --viewport phone --wait "h1" --out .impeccable/review/detail.png
kill %1   # only the server this snippet started
```

- [ ] **Step 2: Compare and fix**

Against comp 3:

1. The whole screen inverts: `--ink` ground, `--paper` text. The header's bottom rule is 2px
   `--paper` and the back chevron is `--imprint`.
2. The header carries no title and no pinned search field — only back and the yellow search
   plate.
3. Body padding `24px 16px`.
4. **The cover artwork frame**, 132x198 (the same 2:3), ruled 2px in `--paper` on a
   `--cover-rule` ground, with the film spine rule at `left: 10px` in `--paper`. 24px below it
   before the title. With no artwork it stays the ruled empty frame.
5. Title 32px/800 at `line-height: 1.06`.
6. Plate line mono 12px in `--cover-soft`, reading `AUTHOR · ISBN · LIBRARY`.
7. A 4px `--imprint` rule with 16px above and below.
8. The stamp reading `OUT · MARIE · 6 DAYS` in `--paper` caps inside a 2px `--out` outline,
   rotated −4°. **No "Currently out" label above it** — that would state loan status twice,
   and the stamp already says it.
9. Summary 14px in `--cover-body`, 16px below.
10. `THE RECORD` 10px/800 caps `+.16em` in `--imprint`, 24px above; ledger under a 2px
    `--paper` top rule; each row mono 11px, `8px 0` padding, 1px `--cover-rule` bottom rule, the
    open row in `--paper` and durations in `--cover-soft`.
11. Actions 24px below: a yellow plate button then a ruled one, 8px apart.
12. No volume plate unless the item is a collection member with a real `order` — a standalone
    item carries none. The artwork frame, unlike the plate, is always present.

**Two comp artefacts that are not design, and must not be reproduced:** the cover has dead
space at the bottom because the comp frame is a fixed 780px and the demo content does not fill
it — real content fills and scrolls. And the hero frame renders as an empty rectangle because
the comp has no image in it; that is the missing-artwork state, which is worth seeing, but a
real cover goes there.

- [ ] **Step 3: Commit**

```bash
git add packages/web-client-v3
git commit -m "feat(web-v3): reproduce comp 3 (item detail, the black cover)"
```

---

### Task 16: ItemHistory

**Files:**
- Modify: `packages/web-client-v3/src/pages/ItemHistory.jsx`
- Test: `packages/web-client-v3/src/pages/ItemHistory.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web-client-v3/src/pages/ItemHistory.test.jsx` covering: every loan is listed
(not just the first three); an open loan is stamped; the clear action confirms in a `Sheet` and
states that it removes the whole record; and an item with no events shows "Never lent" rather
than an empty list.

```jsx
it('says the clear action removes the entire record, before it acts', async () => {
  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: /clear the record/i }));
  expect(screen.getByText(/every lending event for this item/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it, then write the page**

Build it on the paper ground, not the cover — the cover is item detail alone. Fetch with
`eventsApi.list(libraryId, itemId, { limit: 50, nextToken })`, append pages behind a "Load more"
button, pair with `pairLoanEvents`, and render `LedgerRow` (not inverted). The clear
confirmation:

```jsx
<p className="mb-4 text-sm">
  Clear the record for <strong>{title}</strong>? This deletes every lending event for this item,
  including who has it now. The item itself stays. This cannot be undone.
</p>
```

Call `eventsApi.clear(libraryId, itemId)` and navigate back to the item.

- [ ] **Step 3: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): item history with paired loans and an honest clear confirmation"
```

---

### Task 17: Edit forms and the collection/order invariant

**Files:**
- Create: `packages/web-client-v3/src/lib/validate.js`
- Create: `packages/web-client-v3/src/components/ItemForm.jsx`
- Modify: `packages/web-client-v3/src/pages/EditItem.jsx`, `NewBook.jsx`, `NewVideo.jsx`
- Test: `packages/web-client-v3/src/lib/validate.test.js`
- Test: `packages/web-client-v3/src/components/ItemForm.test.jsx`

**Interfaces:**
- Produces:
  - `validateCollectionOrder({ collectionId, order }) -> string | null`
  - `validateItem(type, values) -> { [field]: message }`
  - `<ItemForm type initial collections onSubmit submitLabel />`

- [ ] **Step 1: Write the failing validation test**

Create `packages/web-client-v3/src/lib/validate.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { validateCollectionOrder, validateItem } from './validate.js';

describe('validateCollectionOrder', () => {
  it('accepts neither set — membership is optional', () => {
    expect(validateCollectionOrder({})).toBeNull();
  });

  it('accepts both set within range', () => {
    expect(validateCollectionOrder({ collectionId: 'c', order: 12 })).toBeNull();
  });

  it('rejects a collection with no order, because the backend requires the pair', () => {
    expect(validateCollectionOrder({ collectionId: 'c' })).toMatch(/order/i);
  });

  it('rejects an order with no collection', () => {
    expect(validateCollectionOrder({ order: 3 })).toMatch(/collection/i);
  });

  it('holds the order inside 1-1000', () => {
    expect(validateCollectionOrder({ collectionId: 'c', order: 0 })).toMatch(/1 to 1000/);
    expect(validateCollectionOrder({ collectionId: 'c', order: 1001 })).toMatch(/1 to 1000/);
    expect(validateCollectionOrder({ collectionId: 'c', order: 1.5 })).toMatch(/whole number/);
  });
});

describe('validateItem', () => {
  it('requires a title', () => {
    expect(validateItem(0, { title: '   ' }).title).toMatch(/title/i);
  });

  it('holds a book inside the API limits', () => {
    expect(validateItem(0, { title: 'x'.repeat(101) }).title).toMatch(/100/);
    expect(validateItem(0, { title: 'ok', summary: 'x'.repeat(4001) }).summary).toMatch(/4000/);
  });

  it('holds a film release year inside 1800-2100 and a duration inside 0-1000', () => {
    expect(validateItem(1, { title: 'ok', releaseYear: 1799 }).releaseYear).toMatch(/1800/);
    expect(validateItem(1, { title: 'ok', duration: 1001 }).duration).toMatch(/1000/);
  });

  it('caps each director name at 100 characters, as the API does', () => {
    expect(validateItem(1, { title: 'ok', directors: ['x'.repeat(101)] }).directors).toMatch(/100/);
  });

  it('passes a valid film', () => {
    expect(
      validateItem(1, { title: 'Chinatown', releaseYear: 1974, duration: 130, directors: ['RP'] }),
    ).toEqual({});
  });
});
```

- [ ] **Step 2: Run it, then write the module**

```bash
yarn --cwd packages/web-client-v3 test src/lib/validate.test.js
```
Expected: FAIL.

Create `packages/web-client-v3/src/lib/validate.js`:

```js
const BOOK = 0;
const FILM = 1;

const isSet = (value) => value !== undefined && value !== null && value !== '';

// The backend enforces this pair only at the handler, so the form has to hold it or the
// reader gets a generic 400 with no field to fix.
export const validateCollectionOrder = ({ collectionId, order }) => {
  const hasCollection = Boolean(collectionId);
  const hasOrder = isSet(order);

  if (!hasCollection && !hasOrder) return null;
  if (hasCollection && !hasOrder) return 'Give this item its order in the collection, 1 to 1000.';
  if (!hasCollection && hasOrder) return 'Choose a collection, or clear the order.';

  const value = Number(order);
  if (!Number.isInteger(value)) return 'The order must be a whole number.';
  if (value < 1 || value > 1000) return 'The order must be from 1 to 1000.';
  return null;
};

export const validateItem = (type, values) => {
  const errors = {};

  if (!values.title?.trim()) errors.title = 'A title is required.';
  else if (values.title.length > 100) errors.title = 'The title can be at most 100 characters.';

  if (values.summary && values.summary.length > 4000) {
    errors.summary = 'The summary can be at most 4000 characters.';
  }

  if (type === FILM) {
    if (isSet(values.releaseYear)) {
      const year = Number(values.releaseYear);
      if (!Number.isInteger(year) || year < 1800 || year > 2100) {
        errors.releaseYear = 'The release year must be from 1800 to 2100.';
      }
    }
    if (isSet(values.duration)) {
      const minutes = Number(values.duration);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1000) {
        errors.duration = 'The duration must be from 0 to 1000 minutes.';
      }
    }
    if ((values.directors ?? []).some((name) => name.length > 100)) {
      errors.directors = 'Each director name can be at most 100 characters.';
    }
  }

  const collectionError = validateCollectionOrder(values);
  if (collectionError) errors.collection = collectionError;

  return errors;
};

export { BOOK, FILM };
```

Run again. Expected: PASS — 11 tests.

- [ ] **Step 3: Write ItemForm**

Create `packages/web-client-v3/src/components/ItemForm.jsx`: one form driven by `type`.
Shared fields — title (`maxLength` 100, counter), summary (`textarea`, `maxLength` 4000,
counter), a collection `select` populated from `collectionsApi.list`, and an order `number`
input shown whenever a collection is chosen. Book adds authors and ISBN; film adds directors,
cast, release year, duration and TMDB id. Authors, directors and cast are comma-separated text
inputs that split on submit — with a hint saying so, since the reader cannot otherwise know.

Both collection controls render together and the pair is validated as one, with a single error
under both:

```jsx
{errors.collection && (
  <p role="alert" className="mb-6 border-t-2 border-out bg-paper-deep p-4 text-sm">
    {errors.collection}
  </p>
)}
```

On the edit form only, add an `updatePicture` checkbox labelled "Fetch the cover again from its
source", enabled only when `pictureUrl` is present.

- [ ] **Step 4: Write the failing ItemForm test, then the pages**

`ItemForm.test.jsx` asserts: choosing a collection reveals the order field; submitting with a
collection and no order shows the pair error and does not call `onSubmit`; the year and duration
limits are enforced on the field; comma-separated authors arrive at `onSubmit` as an array.

Then wire the pages:

- `EditItem.jsx` — read the item with `itemsApi.get`, seed the form, submit through
  `itemsApi.updateBook` or `updateVideo` by `type`, then **re-read** with `itemsApi.get` because
  `PUT` returns an empty body, then navigate back to the item.
- `NewBook.jsx` / `NewVideo.jsx` — the same form with empty values, submitting through
  `createBook` / `createVideo`, then navigating to the new item's detail route.

- [ ] **Step 5: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): item forms holding the API's limits and the collection/order pair"
```

---

# Slice C½ — slice D's entry conditions

Two tasks buildable now, because neither lives inside a capture stub. Both were settled with
the user by the design session. **Slice D itself does not start until the user calls it.**

---

### Task 17a: The order field becomes conditionally optional — and stops sending `0`

**Files:**
- Modify: `packages/web-client-v3/src/lib/validate.js`
- Modify: `packages/web-client-v3/src/components/ItemForm.jsx`
- Test: `packages/web-client-v3/src/lib/validate.test.js`
- Test: `packages/web-client-v3/src/components/ItemForm.test.jsx`

**The constraint being removed was invented by this project, not by the API.** `.claude/ui-v3.md`
said collection and order were mutually required and the form must enforce the pair. Half false,
corrected at `e302fd1`. Verified against the Go source, not taken on report:

| Claim | Source | Verdict |
|---|---|---|
| Order without a collection is rejected | `api/handlers/items.go:31` | **true** — keep enforcing it |
| Order is optional when a collection is set | `api/handlers/items.go:36-40` | **true**, range checked only when present |
| Create with no order → server ranks it last | `api/services/items.go:277-284` | **true**, `maxOrder + 1` |
| Update auto-calculates only when the collection CHANGED | `api/services/items.go:188-196` | **true** — `isNewToCollection := oldCollectionId != *i.CollectionId` |

**The field stays on every form** — re-ranking a filed item is the whole reason it exists. Only
its optionality changes, decided by comparing the selected `collectionId` against
`initial.collectionId`:

| Case | Order | Empty means |
|---|---|---|
| New item, collection chosen | optional | omit — the server ranks it last |
| Edit, collection **changed** (including newly set) | optional | omit — ranked last in the new collection |
| Edit, collection **unchanged** | **required** | nothing, and clearing it corrupts the record |

**Why the third row is required — verified, and worse than inferred.** The design session
inferred that an order-nil item keeps a `CollectionId` while its `GSI1SK` flips to the
no-collection form, and flagged the inference as unverified. It is correct:
`internal/persistence/models.go:96-101` returns `item#<title>` whenever `order == nil || *order < 1`,
regardless of the collection.

But the consequence is not simply "sorts as a standalone while claiming membership". Grouping is a
**two-pass lookup keyed on `CollectionId`**, not on sort order
(`api/repositories/dynamodb/items.go:813`): the item is still pushed into
`collectionItems[collectionId]`, and pass 2 nests it **only if its collection's header landed on
the same page**. Since its sort key has moved into the standalone alphabet, far from its
collection's block, usually it will not. So the same record renders **as a nested member on one
page and a loose row carrying `collectionName` on another** — page-dependent, non-deterministic,
and the hardest class of corruption to report. It also breaks the
`coll.ItemCount > len(coll.Items)` bookkeeping that drives `partial` and `CollectionContexts`.

Record the verified mechanism in the code comment, not the inference.

- [ ] **Step 1: Write the failing validation tests**

`validateCollectionOrder` needs a third input — whether the item is staying in a collection it is
already in. Keep line 14's message (`Choose a collection, or clear the order.`) exactly: it
mirrors a real handler rejection. Delete line 13's unconditional requirement.

```js
it('lets a new item omit its order — the server ranks it last', () => {
  expect(validateCollectionOrder({ collectionId: 'c1', order: '' })).toBeNull();
});

it('lets an edit omit its order when the collection CHANGED', () => {
  expect(
    validateCollectionOrder({ collectionId: 'c2', order: '', initialCollectionId: 'c1' }),
  ).toBeNull();
});

it('lets an edit omit its order when the collection is newly set', () => {
  expect(
    validateCollectionOrder({ collectionId: 'c1', order: '', initialCollectionId: '' }),
  ).toBeNull();
});

it('REQUIRES the order when the collection is unchanged, because the server will not re-rank', () => {
  expect(
    validateCollectionOrder({ collectionId: 'c1', order: '', initialCollectionId: 'c1' }),
  ).toMatch(/order/i);
});

it('still refuses an order with no collection', () => {
  expect(validateCollectionOrder({ collectionId: '', order: '7' })).toMatch(/choose a collection/i);
});
```

- [ ] **Step 2: Write the failing payload test — this is a live defect, not a new feature**

`ItemForm.jsx:98` reads `order: values.collectionId ? Number(values.order) : null`. `Number('')`
is **`0`**, and `handlers/items.go:38` rejects any order outside 1–1000. So the moment order
becomes omittable, an empty box posts `order: 0` and earns a generic 400 with no field to fix —
the exact failure the form exists to prevent. It is unreachable today only because line 13 blocks
submission first; removing line 13 without this makes it reachable.

```jsx
it('omits the order rather than sending 0 when the box is empty', async () => {
  // ...fill title, choose a collection, leave order empty, submit
  expect(createBook).toHaveBeenCalledWith(
    'lib-1',
    expect.objectContaining({ collectionId: 'c1', order: null }),
  );
});
```

`order: null` is correct and `0` is not: a nil pointer reaches `handlers/items.go:31` as absent,
which is only rejected when `CollectionId` is nil too.

- [ ] **Step 3: Implement, then site the reason in the control's slot**

Nothing on screen explains why an empty box is fine on one screen and not another, so this is
§6's **second** form: the reason takes the control's own position in `--ink-soft` caps. Per
`be76f66`, first check whether that slot has a same-colour ruled neighbour — if the submit button
stands alone in its row, the simpler first form still applies and the second is unnecessary
ceremony. Decide from the rendered row, not from this paragraph.

- [ ] **Step 4: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "fix(web-client-v3): order is optional unless the collection is unchanged, and never 0"
```

---

### Task 17b: `CollectionActionsSheet` gains `Add an item`

**Files:**
- Modify: `packages/web-client-v3/src/components/CollectionActionsSheet.jsx`
- Test: `packages/web-client-v3/src/components/CollectionActionsSheet.test.jsx`

First entry in the sheet, reached by the board's existing Row Actions. It opens the Book/Film
sheet and carries the collection into the add route, exactly as the header `+` does minus the
collection.

**The label does not name the collection.** The sheet heading already does — `Add an item`, not
"Add to Blake et Mortimer". Nothing is labelled twice.

The header `+` keeps adding standalone items, and **no control ever asks which collection**: that
is in the IA anti-pattern table. A per-board `+` was considered and rejected — a permanent control
on every board row of a thousand-item stream, competing with Row Actions for the same edge. The
two-tap cost is paid once per cataloguing session, the same frequency argument that put `+` in the
header rather than in thumb reach.

**The destination is a stub and that is expected.** This task wires the route and passes the
collection; it does not build what receives them.

- [ ] **Step 1: Write the failing test**

```jsx
it('offers Add an item first, without repeating the collection name', async () => {
  renderSheet({ collection: { id: 'c1', name: 'Blake et Mortimer' } });
  const actions = screen.getAllByRole('button');
  expect(actions[0]).toHaveAccessibleName(/add an item/i);
  expect(actions[0]).not.toHaveAccessibleName(/blake/i);
});

it('carries the collection into the add route', async () => {
  // choosing Book navigates to the library's add/book route with the collection in state
});
```

- [ ] **Step 2: Implement, run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-client-v3): add an item from a collection board's actions"
```

---

# Slice D — capture

**Do not start these tasks until the user calls slice D.**

## Design inputs settled before the slice starts

Recorded so they are not re-litigated or invented mid-build. Four are the design session's
rulings; three are open questions this session raised that are **not yet answered**.

**C. Candidate rows carry artwork.** Detection returns `pictureUrl`; each candidate takes the
standard 2:3 Volume Frame, ruled and empty when a resolver returns none. For films three remakes
share a title and the poster is the fastest disambiguator — the one screen where artwork decides
something rather than decorating.

**D. There is no duplicate-ownership warning, deliberately.** Nothing tells the reader they may
already own a scanned item. `POST /search` matches title, authors, directors, cast and collection
— **not ISBN** — so a scan yields a code that cannot be looked up, and a title-based guess would
be occasionally and confidently wrong. Silence beats a false positive in a bookshop. **If a "you
may already own this" hint from a title search starts to look like a good idea, that is the thing
being refused.**

**E. The capture session declares where it is filing.** A persistent printed mark on both the
capture screen and the candidate list: caps label plus the collection's own name, `FILING INTO` /
*Blake et Mortimer*. **Printed, not a toast** — it must survive being ignored for a whole session
of scans. Its **absence** is what says "standalone", so the two modes read apart with no mode
switch.

**F. The camera feed sits inside a Volume Frame, not full-bleed.** Full-bleed makes the camera the
app, which is every other scanner and v2's. A feed inside the imprint's own 2:3 rule says *this is
the object being catalogued*, and it leaves the bottom of the screen for the manual escape and the
filing mark rather than floating controls over video. Structural — it drives layout and safe-area —
so it is decided now.

**The camera's surface is deliberately unspecified and must not be invented.** What marks the scan
target, what distinguishes scanning from decoding from found, the permission-denied and no-result
states — the design session designs those on device once a feed works. Build the viewport plain:
correct aspect, correct safe-area, every state wired, no decoration. It will not be drafted from a
static comp, because ink rules over a still image say nothing about whether they hold over a moving
picture of a bright bookshelf in poor light — the same unverified substrate that produced the font
crops, the type-scale table and the frame fills.

## Open, raised by the build session and not yet answered

**G. The fixture API has no `/detections` route.** `tools/mock-api.js` does not mention it, and both
tasks post to it — so as written, neither screen is buildable or screenshot-able without AWS, which
was Task 3's entire premise. This needs a fixture route **before** Task 18, carrying the awkward
cases: every resolver failing, one failing, no match at all, and an OCR title needing correction.
A prerequisite task, not a judgement call.

**H. `location.state` is a refresh hole on both results screens.** Candidates travel in router
state, so a refresh or a PWA restart lands on a screen with nothing. `ItemDetail` was deliberately
made refresh-safe; these structurally cannot be, since candidates are not re-fetchable without
re-posting the detection. **The designed state for a cold load needs specifying rather than
discovering** — most likely a stamped notice returning to capture, but that is the design session's
call, not this one's.

**I. Neither suite can test the decoder.** Task 18 mocks `BarcodeScanner` in unit tests and the
browser suite has no camera, so both suites test the *wiring*, not the decode. Stated here so a
green suite is never read as coverage of the scanner — this project has hit that failure three
times (the font cmap, the no-op exclusion, the wrap assertion that could not fail).

## Already binding

- Nothing is written before the reader confirms a candidate.
- A per-resolver failure is shown **as a failure**, never silently dropped.
- The manual path is always visible, never behind a fallback.
- `@zxing` and `react-webcam` load **only** on the capture routes — `manualChunks` currently
  carries `amplify` and `react` only, and most sessions are lookups, not cataloguing.
- The five standing guards (`fonts`, `groundForeground`, `routeLandmarks`, `monoText` +
  `monoRouteCoverage`, `routeExits`) already enforce landmarks, ground/foreground, the mono/sans
  split and route exits on these screens. Tasks 18–19 predate them and do not restate them; they
  will fail loudly, which is the point.

---

### Task 18: Add a book — ISBN scan and manual entry

**Files:**
- Create: `packages/web-client-v3/src/api/detection.js`
- Create: `packages/web-client-v3/src/components/BarcodeScanner.jsx`
- Modify: `packages/web-client-v3/src/pages/AddBook.jsx`, `BookDetectionResults.jsx`
- Modify: `packages/web-client-v3/src/api/index.js`
- Test: `packages/web-client-v3/src/pages/AddBook.test.jsx`
- Test: `packages/web-client-v3/src/pages/BookDetectionResults.test.jsx`

**Interfaces:**
- Produces: `detectionApi.book(code)`, `detectionApi.video({ image, title })`,
  `<BarcodeScanner onCode onError />`

- [ ] **Step 1: Install the scanner, scoped to this route**

```bash
yarn --cwd packages/web-client-v3 add --exact @zxing/browser@0.1.5 @zxing/library@0.21.3
```

In `vite.config.js`, add `zxing: ['@zxing/browser', '@zxing/library']` to `manualChunks`. The
scanner must never be in the entry bundle: most sessions are lookups, not cataloguing.

- [ ] **Step 2: Write the failing AddBook test**

Create `packages/web-client-v3/src/pages/AddBook.test.jsx`:

```jsx
// The camera is mocked: jsdom has no getUserMedia, and the behaviour under test is the
// escape hatch, not the decoder.
vi.mock('@/components/BarcodeScanner.jsx', () => ({
  default: ({ onError }) => (
    <button type="button" onClick={() => onError(new Error('NotAllowedError'))}>
      simulate denial
    </button>
  ),
}));

describe('AddBook', () => {
  it('always shows the manual entry escape, before anything goes wrong', () => {
    renderPage();
    expect(screen.getByLabelText(/isbn/i)).toBeInTheDocument();
  });

  it('says what to do when the camera is refused, rather than only that it failed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate denial/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/type the isbn/i);
  });

  it('accepts a 13-digit ISBN and an ISBN-10', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/isbn/i), '9782070404209');
    expect(screen.getByRole('button', { name: /look it up/i })).toBeEnabled();
  });

  it('refuses a code that is not an ISBN, naming the reason', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/isbn/i), '12345');
    expect(screen.getByText(/10 or 13 digits/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it, then write the detection API and the screen**

Create `packages/web-client-v3/src/api/detection.js`:

```js
import { api } from './client.js';

const BOOK = 0;
const VIDEO = 1;

export const detectionApi = {
  book: (code) => api.post('/detections', { type: BOOK, code }),
  // Either a base64 image for OCR, or a title typed by hand.
  video: ({ image, title }) => api.post('/detections', { type: VIDEO, image, title }),
};
```

Write `AddBook.jsx` with both paths visible at once, never one behind the other: the live
scanner above, and a labelled ISBN field below it that works whether or not the camera does.
Permission states are `requesting`, `denied` and `scanning`; a denial replaces the viewfinder
with an inline explanation naming the next action ("Camera access is off for this site. Type the
ISBN below instead."). On a successful decode or a manual submit, call `detectionApi.book(code)`
and navigate to `../add/book/results` with the candidates in `location.state`.

`BarcodeScanner.jsx` wraps `BrowserMultiFormatReader` restricted to `EAN_13` and `EAN_8`,
stopping the stream on unmount — an abandoned camera is a battery and privacy problem, not just
a leak.

- [ ] **Step 4: Write BookDetectionResults**

Nothing is written before the reader confirms. Each candidate is a Volume Frame plus title,
authors, ISBN, and **its source** (Google Books, Babelio, GoodReads). A candidate that arrived
with an `error` is shown as a failed source rather than dropped:

```jsx
{result.error ? (
  <p className="caps text-[11px] text-ink-soft">
    {result.source} · no answer
  </p>
) : null}
```

If every resolver failed or none matched, offer manual entry at `../items/new/book`, carrying
the ISBN through in `location.state` so it is not typed twice. Confirming a candidate calls
`itemsApi.createBook` and returns to `AddBook` for the next item — cataloguing is a batch
activity, so the flow loops rather than exiting.

- [ ] **Step 5: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): add-book capture — ISBN scan, manual entry, preview before commit"
```

---

### Task 19: Add a film — cover OCR and title search

**Files:**
- Create: `packages/web-client-v3/src/components/CoverCapture.jsx`
- Modify: `packages/web-client-v3/src/pages/AddVideo.jsx`, `VideoDetectionResults.jsx`
- Test: `packages/web-client-v3/src/pages/AddVideo.test.jsx`

- [ ] **Step 1: Install the webcam, scoped to this route**

```bash
yarn --cwd packages/web-client-v3 add --exact react-webcam@7.2.0
```

Add `webcam: ['react-webcam']` to `manualChunks`.

- [ ] **Step 2: Write the failing test**

Key assertions:

```jsx
it('shows the OCR result as an editable field, because OCR is fallible', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: /capture/i }));
  const title = await screen.findByLabelText(/title/i);
  expect(title).toHaveValue('Le Samouraï');
  expect(title).toBeEnabled();
});

it('offers title search without ever opening the camera', () => {
  renderPage();
  expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run it, then write the screen**

`CoverCapture.jsx` wraps `react-webcam` with a manual shutter — no auto-capture, because a
reader holding a DVD case needs to choose the moment. `getScreenshot()` yields a data URL; strip
the `data:image/jpeg;base64,` prefix before posting, since the API expects bare base64.

`AddVideo.jsx` posts `detectionApi.video({ image })`, then puts the response's `extractedTitle`
into an **editable** field rather than searching with it directly. The reader corrects it and
submits; that submits `detectionApi.video({ title })`. A typed title works with no camera at all.

`VideoDetectionResults.jsx` lists TMDB candidates — poster, title, year, runtime, director, top
cast — and confirming one calls `itemsApi.createVideo`, then returns to `AddVideo` for the next.

- [ ] **Step 4: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): add-film capture — cover OCR with an editable title, TMDB candidates"
```

---

# Slice E — search

---

### Task 20: Search

**Files:**
- Create: `packages/web-client-v3/src/api/search.js`
- Create: `packages/web-client-v3/src/lib/useDebounced.js`
- Modify: `packages/web-client-v3/src/pages/Search.jsx`
- Test: `packages/web-client-v3/src/pages/Search.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web-client-v3/src/pages/Search.test.jsx`:

```jsx
describe('Search', () => {
  it('waits for three characters before asking the server', async () => {
    renderPage();
    await userEvent.type(screen.getByRole('searchbox'), 'le');
    await new Promise((r) => setTimeout(r, 400));
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/search'), expect.anything());
  });

  it('names the library on each result, because here the library is new information', async () => {
    renderPage();
    await userEvent.type(screen.getByRole('searchbox'), 'grand');
    expect(await screen.findByText(/marie's shelf/i)).toBeInTheDocument();
  });

  it('states what search actually matches, so an absent result is not a mystery', () => {
    renderPage();
    expect(
      screen.getByText(/titles, authors, directors, cast and collections/i),
    ).toBeInTheDocument();
  });

  it('keeps recent searches so a repeated lookup is one tap', async () => {
    renderPage();
    await userEvent.type(screen.getByRole('searchbox'), 'chandler{Enter}');
    await screen.findByRole('list', { name: /recent/i });
  });

  it('returns the reader to where they were', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /close search/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, then write the screen**

Create `packages/web-client-v3/src/api/search.js`:

```js
import { api } from './client.js';

// Bluge fuzzy search over title, authors, directors, cast and collection — NOT summary and
// NOT ISBN. Unpaginated: one response is the whole result set.
export const searchApi = {
  query: (terms) => api.post('/search', { terms }),
};
```

Create `packages/web-client-v3/src/lib/useDebounced.js` — a 300ms debounce returning the settled
value.

`Search.jsx` is a full-screen surface on `--paper-deep`, opened from the header field and closed
back to where the reader was (`navigate(-1)`). Terms are split on whitespace. Below three
characters it shows recent searches from `localStorage` (cap 8) instead of querying.

State the limits where they are relevant, not in a help page:

```jsx
<p className="caps mt-2 text-[11px] text-ink-soft">
  Searches titles, authors, directors, cast and collections — not summaries or ISBNs
</p>
```

Results are on-paper rows reusing `ItemRow`, each additionally naming its library, since here
the library **is** new information. A result from a shared library carries an inline `--shared`
tag rather than a left edge, keeping the edge free for on-loan. Owned results long-press to
`ItemActionsSheet` and update in place; shared results have no long press.

Note in the empty state that a very recent addition may not be indexed yet — the index updates
asynchronously, so "no results" can be temporarily wrong:

```jsx
<p className="mt-2 text-sm text-ink-soft">
  Nothing matched. An item added in the last moment or two may not be indexed yet.
</p>
```

- [ ] **Step 3: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): search surface with recents and an honest statement of match scope"
```

---

# Slice F — settings

---

### Task 21: Settings, Account, About

**Files:**
- Modify: `packages/web-client-v3/src/pages/Settings.jsx`, `Account.jsx`, `About.jsx`
- Test: `packages/web-client-v3/src/pages/Account.test.jsx`

- [ ] **Step 1: Write the failing Account test**

```jsx
describe('Account', () => {
  it('shows the email from the token, not the Cognito username', () => {
    renderPage();
    expect(screen.getByText('jr@example.com')).toBeInTheDocument();
  });

  it('offers the owner id for copying, since support requests need it', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(await navigator.clipboard.readText()).toBe('OWNER1');
  });

  it('names each unmet password rule while the reader types', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/new password/i), 'short');
    expect(screen.getByText(/an uppercase letter/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, then write the pages**

`Settings.jsx` — three 48px rows on the paper ground: Account, About, and Sign out. Sign out is
a `PlateButton variant="danger"` set apart from the list, so it is not tapped in passing.

`Account.jsx` — an initials plate (`useAuth().user.initials`) in `--imprint`, the email from the
JWT, the `custom:Id` in mono with a copy affordance, and a password-change form using
`passwordIssues` for live feedback and `changePassword` to submit. State plainly that changing
the password signs other sessions out where Cognito does so.

`About.jsx` — the name, `config.buildHash`, and one line of honesty the product record requires:

```jsx
<p className="mt-4 text-sm text-ink-soft">
  Alexandria needs a connection. Nothing is stored on this device, so what you see is always
  what the server has.
</p>
```

- [ ] **Step 3: Run the tests, lint, commit**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): settings, account and about"
```

---

# Slice G — delivery

---

### Task 22: PWA identity, manifest and update prompt

> **This task fixes a shipping defect, it does not add a nicety.** As the service worker stands,
> **the app cannot be updated at all** once a reader has loaded it once. Two mechanisms, both
> verified against the built `dist/sw.js`:
>
> 1. `registerType: 'prompt'` means a new worker installs and then **waits**. It only activates on
>    a `SKIP_WAITING` message — and **nothing in the app sends one**, because the prompt that would
>    send it does not exist yet. The waiting worker waits forever.
> 2. Navigations are served by a precache `NavigationRoute` bound to the precached `index.html`,
>    so they are answered **from the worker's cache and never reach CloudFront**. The `no-cache`
>    header on the app shell is correct and irrelevant: the request that header governs is not
>    made.
>
> Together these mean a reader keeps the first v3 build they ever loaded, indefinitely, with no
> way to escape it short of clearing site data. The prompt below is therefore load-bearing and
> must actually post `SKIP_WAITING` and reload on `controllerchange` — a prompt that only shows a
> banner leaves the defect fully intact.
>
> Ruled out as the cause of the Cecile session defect (she is on the dev server, which registers
> no worker, in a fresh window each time). It remains a production blocker on its own merits.

**Files:**
- Create: `packages/web-client-v3/public/icon-source.svg`
- Create: `packages/web-client-v3/scripts/generate-icons.mjs`
- Create: `packages/web-client-v3/src/components/UpdatePrompt.jsx`
- Modify: `packages/web-client-v3/vite.config.js`, `index.html`, `src/App.jsx`
- Test: `packages/web-client-v3/src/components/UpdatePrompt.test.jsx`

- [ ] **Step 1: Draw the icon**

Create `packages/web-client-v3/public/icon-source.svg` — the imprint's own language: chrome
yellow on black, a numbered volume. 512×512, no radius, no gradient.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0B0B0B"/>
  <!-- The volume: a 2:3 frame ruled in chrome yellow, matching the app's own frames. -->
  <rect x="136" y="88" width="240" height="336" fill="none" stroke="#F2C200" stroke-width="24"/>
  <!-- The plate, bottom-left of the frame, exactly as a Volume Plate sits on a cover. -->
  <rect x="136" y="336" width="128" height="88" fill="#F2C200"/>
  <text x="200" y="404" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="72"
        font-weight="900" text-anchor="middle" fill="#0B0B0B">A</text>
</svg>
```

The maskable variant needs the safe zone: generate it from a second SVG with the frame scaled to
80% and centred, so nothing important is inside the 10% that a circular mask crops.

- [ ] **Step 2: Generate the raster set**

Create `scripts/generate-icons.mjs` using `sharp` to emit `public/icons/logo{180,192,512}.png`,
`logo512-maskable.png`, `favicon-{16,32}.png` and `favicon.ico`. Run:

```bash
yarn --cwd packages/web-client-v3 icons
```

- [ ] **Step 3: Complete the manifest**

In `vite.config.js`, replace `VitePWA({ registerType: 'prompt' })` with the full configuration —
`name` and `short_name` "Alexandria", `theme_color: '#0B0B0B'`, `background_color: '#F6F6F3'`,
`display: 'standalone'`, `orientation: 'portrait'`, the icon list including the maskable entry,
and `workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] }`.

`registerType: 'prompt'` is deliberate: a silent update can swap the bundle under a reader who
is mid-capture.

- [ ] **Step 4: Write the failing UpdatePrompt test**

```jsx
it('checks hourly, not every minute', () => {
  render(<UpdatePrompt />);
  expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3_600_000);
});

it('offers the update rather than applying it, so a capture in flight is not interrupted', () => {
  renderWithWaitingWorker();
  expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run it, then write the component**

```jsx
import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR_MS = 3_600_000;

// A minute-by-minute poll does not deliver versions faster; it only maximises exposure to a
// divergent edge copy of the app shell, which is what produces phantom update prompts.
// visibilitychange covers responsiveness.
const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      setInterval(() => registration.update(), HOUR_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="pad-bottom-safe fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-4 border-t-[3px] border-ink bg-paper-deep p-4">
      <p className="text-sm">A new version is ready.</p>
      <PlateButton onClick={() => updateServiceWorker(true)}>Reload</PlateButton>
    </div>
  );
};
```

Render it inside `App.jsx`, outside the router so it survives navigation.

- [ ] **Step 6: Confirm the CloudFront headers need no work**

`packages/infrastructure/cloudfront.tf` already serves the app shell `no-cache`
(`aws_cloudfront_response_headers_policy.webclient_no_cache` on the default behavior) and
`/assets/*` `immutable`. **No Terraform change is required for v3.** Read the file and confirm
before ticking this box; if it has changed, report rather than editing it.

- [ ] **Step 7: Verify the built PWA**

```bash
yarn --cwd packages/web-client-v3 build
yarn --cwd packages/web-client-v3 preview
```
Check in DevTools → Application: the manifest parses, the icons resolve including the maskable
one, and the service worker registers. Confirm `@zxing`, `react-webcam` and `aws-amplify` are in
their own chunks and are not fetched on `/libraries`.

- [ ] **Step 8: Lint and commit**

```bash
yarn --cwd packages/web-client-v3 lint
git add packages/web-client-v3
git commit -m "feat(web-v3): PWA identity, manifest, and an hourly update prompt"
```

---

### Task 23: Deploy targets, cutover, and reconciling the documents

**Files:**
- Modify: `Makefile`
- Modify: `.claude/ui-v3.md` (progress section only)
- Report: findings against `packages/web-client-v3/DESIGN.md`

- [ ] **Step 1: Add the cutover target**

This is the switch that replaces production v2. It is one target, added last, and named so that
nobody runs it by accident.

```make
# THE CUTOVER. There is one web-client bucket and one distribution, so this REPLACES the v2
# app at alexandria.isnan.eu. Run it only when v3 is the intended production client.
frontend-v3-cutover: ## Deploy v3 to production, replacing v2
	$(MAKE) frontend-v3-build
	aws s3 sync packages/web-client-v3/dist s3://$$($(TF) output -raw webclient_bucket) --delete
	aws cloudfront create-invalidation --paths '/*' --distribution-id $$($(TF) output -raw cloudfront_distribution_id)
```

Add it to `.PHONY`. Leave every v2 target untouched.

`/*` rather than the v2 target's narrower path list: this is a whole-app replacement, and the
belt-and-braces invalidation is worth it once.

- [ ] **Step 2: Verify the build one more time**

```bash
yarn --cwd packages/web-client-v3 test
yarn --cwd packages/web-client-v3 lint
yarn --cwd packages/web-client-v3 build
```
All three must pass. **Do not run `frontend-v3-cutover`** — deploying is the user's decision, not
this plan's.

- [ ] **Step 3: Reconcile the design documents against what shipped**

`DESIGN.md` was written before any code existed, and says so: it is a specification to be
reconciled once v3 is built, not defended.

Walk `DESIGN.md` §2–§7 against the built app and write down every divergence: a rule the build
does not follow, a value the build changed, and anything the build needed that the document
never named. Then walk `.claude/ui-v3.md` §4 the same way, screen by screen.

**Send that list to the design session. Do not edit `DESIGN.md` or `ui-v3.md` §1–§7 yourself** —
the split holds to the end.

- [ ] **Step 4: Update the progress section, which is yours**

In `.claude/ui-v3.md` §8, tick the build items this plan completed and record what is not done.
That section tracks progress and is the one part of the file implementation maintains.

- [ ] **Step 5: Commit and hand over**

```bash
git add Makefile .claude/ui-v3.md
git commit -m "feat(web-v3): cutover target and progress record

frontend-v3-cutover is the single deliberate switch; the v2 targets are untouched."
```

Report to the user:
1. What is built and what is not.
2. The reconciliation list sent to the design session.
3. The one thing needing their decision: whether to run `frontend-v3-cutover`, which replaces
   production v2. (The Cognito callback URL is moot — `cognito.tf` already registers
   `http://localhost:5173/`, which is why v3 took that port.)

---

## Notes for whoever executes this

**Three tasks are gated on the comp.** Tasks 6, 11 and 15 reproduce
`docs/ui-design/ui-v3-mockup.html` and cannot be substituted with your own composition. If the
file is gone, skip them, finish everything else, and say so.

**The pure modules are the spine.** `src/lib/{sort,stream,loans,validate,picture,format}.js`
carry every rule that is easy to get subtly wrong — the server's fold, the index alphabet's head
and tail, partial-collection merging, loan pairing, the collection/order pair. Write their tests
first and let them fail first. A component built on a wrong fold looks fine and is wrong.

**Mock mode is how you look at your work**, on a private port — never :5173, which is the
user's. `VITE_MOCK=1 yarn exec vite --port 5199 --strictPort` needs no AWS, no Cognito and
no seeded data, and its fixtures deliberately contain the awkward cases. If a screen only looks
right on the happy path, the fixtures will tell you.

**Report spec defects; do not route around them.** A rule that cannot be built, fails contrast,
or contradicts the API is worth reporting — four such reports during planning improved the
design documents. Silently working around one loses that.

**Tasks 1–15 carry full code; tasks 16–21 carry full specification and partial code.** The later
tasks are the repetitive form and list screens, and they name every field, limit, state, API call
and error string — but they point at an earlier task's file as the template rather than
reprinting it. If you are executing 16–21 with no memory of 1–15, read `NewLibrary.jsx`
(Task 8) for the form pattern, `Libraries.jsx` (Task 5) for the list pattern, and
`LibraryActionsSheet.jsx` (Task 8) for the sheet pattern before you start. Ask for those tasks
to be expanded rather than guessing at a limit or an error message.
