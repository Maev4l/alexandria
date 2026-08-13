# Alexandria web client v3 — implementation design

## Goal

Build `packages/web-client-v3` from scratch: a React 19 + Vite 6 + Tailwind 4 PWA that
replaces `packages/web-client-v2` at `alexandria.isnan.eu`, rendering the visual system
recorded in `packages/web-client-v3/DESIGN.md` ("The Noir Imprint") over the unchanged
Alexandria API.

**Backend impact is zero.** No endpoint is added, changed, or removed. The contract is
`packages/functions/api/openapi.yaml`, and the Go source behind it was read to confirm the
JSON actually emitted (see *Backend facts established by reading the source*).

## Authority split

This is a two-session project. The split is binding and is recorded here so an executor
who joins later does not edit the wrong file.

| Document | Owner | Status |
| --- | --- | --- |
| `PRODUCT.md` | design session | product truth — read-only to implementation |
| `packages/web-client-v3/DESIGN.md` | design session | visual system — read-only to implementation |
| `.claude/ui-v3.md` | design session | IA, routes, screens — read-only to implementation |
| this design doc + its plan | implementation session | how it gets built |
| `packages/web-client-v3/**` (code) | implementation session | the build |

If the build hits a rule in `DESIGN.md` or `ui-v3.md` that cannot be built, fails contrast,
or contradicts the API, that is a **spec defect**: report it to the design session and wait
for an amendment. Do not work around it silently, and do not edit the spec files.

`DESIGN.md` was written before any code existed. It is a specification, not a description.
The final task of the plan reconciles it against what actually shipped.

## Sources

| Source | What it settles |
| --- | --- |
| `PRODUCT.md` | users, operating context, absent data that must not be faked, scale target |
| `packages/web-client-v3/DESIGN.md` | palette law, type scale, division scale, rule weights, component vocabulary, state grammar, motion, refusals |
| `.claude/ui-v3.md` | IA, 20 routes, per-screen composition/states/API calls, UX guidelines |
| `packages/functions/api/openapi.yaml` | the API contract |
| `packages/functions/**` (Go) | what the API *actually* returns, where the OpenAPI is thin |
| `docs/ui-design/ui-v3-mockup.html` | the approved comp — pixel target for libraries root, library browse and item detail, and law for those three screens |
| `packages/web-client-v2/**` | reference for API response shapes and Amplify wiring only. **Anti-reference for IA and appearance.** Left untouched and working. |

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Package | `packages/web-client-v3`, own `yarn.lock`, `yarn --cwd` | repo convention, no workspaces |
| Dev port | 5173 fixed | the port `cognito.tf` already registers as an OAuth callback, so Google sign-in works locally with **no Terraform change**. Accepted cost: v2 and v3 dev servers cannot run at once — stop one to start the other |
| Language | JavaScript, `.jsx` for components, PascalCase filenames, `index.jsx` for directory roots | repo convention |
| Quotes | double in JSX attributes, single elsewhere | repo convention |
| Lint | Oxlint | repo convention |
| Unit tests | **Vitest + @testing-library/react + jsdom** — new to this repo | the plan is TDD; v2 shipped with no tests and that is not a precedent worth keeping |
| Screenshots | **`puppeteer-core`** driving the system Chrome, through one checked-in `scripts/shoot.mjs` both sessions run | the comped screens are reproduction-first (build → screenshot → compare), and the design session needs to capture independently. `-core` avoids a redundant 200MB Chromium: both sessions run on the same machine. **Consequence:** the tooling is machine-dependent — in CI, set `CHROME_PATH` or switch to full `puppeteer` there. |
| Backendless dev | **local Vite plugin serving `/api/v1/*` from fixtures** under `VITE_MOCK=1` | deterministic screenshots, and screens are buildable without AWS credentials or a seeded account |
| Data layer | hand-rolled React Context stores, no query library | `PRODUCT.md` fixes the stack and calls UI primitives "locally owned"; the read patterns here are few and specific (append pages, re-read one item after a write, re-poll a thumbnail) and do not earn a cache library |
| Icons | **no icon library**; ~8 hand-authored inline SVGs | `DESIGN.md` §9 refuses icons carrying state, and the few universal affordances left want stroke weights on the division scale, not a 500-icon dependency |
| Long lists | `content-visibility: auto` + `contain-intrinsic-size`, with a measured 1000-item gate before escalating to a windowing library | windowing fights `position: sticky` index letters and needs dynamic measurement for variable-height collection boards; content-visibility skips off-screen layout and paint at zero dependencies |
| Styling | Tailwind 4 utilities over a token layer declared with `@theme`; component classes only where a mark is genuinely reusable (stamp, plate, frame) | keeps the palette law enforceable in one file |
| Deploy | `frontend-v3-build` / `-serve` / `-preview` targets that **never write to the production bucket**; a single explicit `frontend-v3-cutover` target added last | there is exactly one bucket and one distribution (see below) |

## Backend facts established by reading the source

These went beyond the OpenAPI and each one changes the build.

**Alphabetical order is diacritic- and case-folded.**
`packages/functions/internal/persistence/normalize.go:20` — `NormalizeForSort()` is
NFD → strip `\p{Mn}` → NFC → `ToLower`, and `MakeLibraryItemGSI1SK`
(`internal/persistence/models.go:96`) applies it to the title before it becomes the DynamoDB
sort key. The client reproduces server order exactly with:

```js
const foldForSort = (s) =>
  s.normalize('NFD').replace(/\p{Mn}/gu, '').normalize('NFC').toLowerCase();
```

Consequences: index letters are derived, never sorted client-side; `Élan` buckets under `E`;
and because NFD does not decompose `Œ` (U+0152) or `Æ` (U+00C6), those fold to `œ`/`æ` whose
UTF-8 lead bytes exceed `z`, so such titles sort *after* Z. Digits sort before letters. The
index-letter component therefore must not assume an A–Z alphabet or monotonic A→Z progression.

**A `picture` URL does not mean the thumbnail exists.**
`packages/functions/api/handlers/search.go:37-42` synthesises the CloudFront thumbnail URL from
a template whenever `pictureUrl` is non-null, without checking S3. Thumbnails are produced
asynchronously by the image-processing Lambda, so a freshly-added item returns a `picture` URL
that 404s for a while. Every Volume Frame therefore has three states, not two: no URL, URL that
loads, URL that fails. The third degrades to the ruled empty frame and re-polls once.

**Collection members are in `order`, not alphabetical order.**
`MakeLibraryItemGSI1SK` sorts members as `item#<folded collection>#<order %05d>#<folded title>`.
A board files into the stream under its collection name, and its members follow the series
order. A board under `S` can legitimately contain a member titled *Aliens*.

**Partial collections lead their page.**
`packages/functions/api/repositories/dynamodb/items.go:838-842` — a collection continuing from a
previous page is emitted first on the continuation page with `partial: true`, before that page's
own entries. The continuation label has a stable position.

**Optional fields are omitted, not null.**
`handlers/models.go:83-97` — `picture`, `pictureUrl`, `libraryId`, `libraryName`, `lentTo`,
`collectionId`, `collectionName`, `order`, `updatedAt` all carry `omitempty`. Client code tests
presence, never `=== null`.

**Search returns books and videos under `results`.**
`handlers/models.go:220-222` — the field is `results`; `handlers/search.go:60-77` fills it with
both `GetBookResponse` and `GetVideoResponse`. The OpenAPI types it as books only. No pagination,
and no `partial` — search is a flat list.

**Item events are raw and unpaired.** `LENT` / `RETURNED` with a name and a timestamp, newest
first, paginated. Loans are a client-side derivation.

## Deploy: the single-bucket problem

`packages/infrastructure/webclient.tf` declares one bucket, `alexandria-web-client`, and
`cloudfront.tf` one distribution aliased to `alexandria.isnan.eu` whose default behavior targets
it. `ui-v3.md` §1 asks for "`frontend-v3-*` Make targets that leave the v2 targets intact until
cutover" — but a v3 sync into that bucket *is* the cutover: it replaces production v2 the moment
it runs.

**Decision.** The v3 Make targets added by this plan are `frontend-v3-build`,
`frontend-v3-serve` and `frontend-v3-preview` only. None of them touches S3 or CloudFront.
Review happens against the local preview server. A separate `frontend-v3-cutover` target is
added as the plan's final task and is the single, deliberate switch. The v2 targets are not
modified.

**Left to the user.** If v3 needs a shared, deployed URL for review before cutover, that
requires a second bucket + distribution (e.g. `alexandria-v3.isnan.eu`) — new Terraform, no
backend change. Not in this plan; raise it if wanted.

**Already satisfied.** `ui-v3.md` §7's CloudFront cache-header requirement needs no work:
`cloudfront.tf` already serves the app shell `no-cache`
(`aws_cloudfront_response_headers_policy.webclient_no_cache` on the default behavior) and
`/assets/*` `immutable`. The invalidation paths in `frontend-invalidate` are reused verbatim.

## Package layout

```
packages/web-client-v3/
├── DESIGN.md                     # owned by the design session
├── package.json                  # own deps, own yarn.lock
├── yarn.lock
├── vite.config.js                # react + tailwind + PWA + mock-api plugin, port 5173
├── vitest.config.js              # jsdom, setup file
├── playwright.config.js          # 390×844 phone viewport, preview server
├── jsconfig.json                 # "@/*" -> "./src/*"
├── .oxlintrc.json
├── index.html                    # viewport-fit=cover, theme-color #0B0B0B
├── output.json                   # generated by `make infra-output` (gitignored)
├── scripts/
│   ├── shoot.mjs                 # shared deterministic screenshots (puppeteer-core)
│   ├── fetch-fonts.mjs           # download + subset Archivo / Chivo Mono to woff2
│   └── generate-icons.mjs        # PWA icon set from the source SVG (sharp)
├── public/
│   ├── fonts/                    # archivo-var.woff2, chivo-mono-var.woff2
│   └── icons/                    # favicon + logo{180,192,512,512-maskable}.png
├── tools/
│   └── vite-plugin-mock-api.js   # serves /api/v1/* from fixtures when VITE_MOCK=1
└── src/
    ├── main.jsx                  # Amplify configure, root render
    ├── App.jsx                   # router, providers
    ├── config.js                 # Cognito + API config from output.json
    ├── index.css                 # @font-face, @theme tokens, component marks
    ├── routes.jsx                # route table, lazy boundaries
    ├── auth/
    │   ├── AuthContext.jsx       # session, custom:Id, custom:Approved, OAuth outcomes
    │   └── oauth.js              # classify OAuth callback params (pure)
    ├── api/
    │   ├── index.js
    │   ├── client.js             # fetch + bearer injection + typed errors
    │   ├── libraries.js
    │   ├── items.js
    │   ├── collections.js
    │   ├── events.js
    │   ├── detection.js
    │   └── search.js
    ├── lib/                      # pure logic — the TDD core
    │   ├── cn.js
    │   ├── useLongPress.js       # 500ms, cancelled by movement so a scroll never fires it
    │   ├── useDebounced.js
    │   ├── password.js           # mirrors the Cognito policy, names what is missing
    │   ├── contrast.js           # WCAG ratios, so DESIGN.md section 2 is asserted not trusted
    │   ├── sort.js               # foldForSort, indexLetterFor
    │   ├── stream.js             # page merging, partial-collection continuation, letter runs
    │   ├── loans.js              # pairLoanEvents, loan duration, open loans
    │   ├── picture.js            # pictureSrc(item) with ?v= cache busting
    │   ├── validate.js           # field limits, collection/order invariant, password rules
    │   └── format.js             # plate lines, runtime prime mark, day counts
    ├── state/
    │   ├── LibrariesContext.jsx
    │   └── StreamContext.jsx     # per-library paged stream
    ├── components/
    │   ├── imprint/              # the component vocabulary of DESIGN.md §5
    │   │   ├── VolumeFrame.jsx
    │   │   ├── VolumePlate.jsx
    │   │   ├── PlateLine.jsx
    │   │   ├── TypeTag.jsx
    │   │   ├── IndexLetter.jsx
    │   │   ├── OverprintStamp.jsx
    │   │   ├── SharedRibbon.jsx
    │   │   ├── CollectionBoard.jsx
    │   │   ├── PlateButton.jsx
    │   │   ├── Field.jsx
    │   │   ├── Sheet.jsx
    │   │   └── LedgerRow.jsx
    │   ├── icons/                # hand-authored inline SVGs
    │   ├── AppHeader.jsx         # wordmark / pinned search / account plate, safe areas
    │   ├── PullToRefresh.jsx
    │   ├── LibraryRow.jsx
    │   ├── ItemRow.jsx
    │   └── UpdatePrompt.jsx      # service-worker update, hourly + visibilitychange
    ├── pages/                    # one file per route in ui-v3.md §3
    └── test/
        ├── setup.js
        └── fixtures/             # real-shaped API responses, incl. French titles and Œuvres
```

## Token layer

`DESIGN.md` §2–§4 map to CSS custom properties in `src/index.css`, exposed to Tailwind through
`@theme`. The palette law is enforceable because every colour is declared exactly once here and
nothing else in the codebase writes a hex value.

| Token | Value | Sole meaning |
| --- | --- | --- |
| `--paper` | `#F6F6F3` | the ground |
| `--paper-deep` | `#ECECE7` | recessed field |
| `--ink` | `#0B0B0B` | content and structure |
| `--ink-soft` | `#5A5A57` | secondary content only |
| `--imprint` | `#F2C200` | the imprint's mark, active state, primary action |
| `--out` | `#D8412F` | on loan |
| `--shared` | `#0F6B4F` | shared |

Division scale as `--u: 4px`, `--d: 8px`, with rule weights 1/2/3/4px named
`--rule-hair|frame|block|index`. Radius is 0 everywhere and there is no shadow token — their
absence is the enforcement.

`DESIGN.md` §2 marks its contrast figures "intent, to be verified against the built surface". A
unit test parses the token values and asserts the WCAG ratios, so the numbers in §2 are checked
by the build rather than trusted. The `--out` restriction (≥18px bold, rules, stamp outlines
only) is verified the same way.

## Fonts

Archivo (variable, `wght` 400–900 / `wdth` 62–125) and Chivo Mono, both OFL, self-hosted as
`woff2` subset to Latin + Latin Extended-A, matching v2's `public/fonts/` practice. Fetching and
subsetting is a checked-in script so the step is reproducible; the resulting `woff2` files are
committed, because a build must not depend on Google Fonts being reachable.

## Testing strategy

**Pure logic, TDD, Vitest.** `src/lib/*` is where the real risk sits and it is all pure:
sort folding and index letters (including `Œ`, digits, and French diacritics), stream page
merging and partial-collection continuation, loan pairing and duration, the collection/order
invariant, picture cache-busting, plate-line formatting.

**Components, Vitest + Testing Library.** Assertions are on the rules the design system makes
falsifiable: every state carries words and an `aria-label`, never colour alone; content titles
are not uppercased; read-only surfaces omit actions rather than disabling them; index letters
are exposed as separators, not headings.

**The three comped screens, `puppeteer-core`.** `yarn shoot` captures either a `file://` comp or
the running dev server through the same command, at a fixed device scale, with fonts settled and
motion forced off — without those three, two runs of the same page differ and the comparison is
noise. Whole-screen captures default to `.impeccable/review/{mobile,desktop}.png`, which is where
the finish review looks; `--clip <selector>` supports the region-by-region comparison that
actually catches crude controls and wrong lettering. The loop is capture both → read both → fix
the source → repeat. Motion and responsive behaviour are added only after the still matches.

No golden PNG is committed: the comp's titles, counts and dates are illustrative, so freezing a
reference image would lock invented content into the repo as a test fixture.

**Fixtures are the realistic case, not the happy case.** The fixture library includes a French
title with diacritics, a title starting `Œ`, a title starting with a digit, an item with no
`picture`, an item whose `picture` 404s, a lent item, a collection split across a page boundary,
a shared-with-me library, and an empty library.

## Slicing

Vertical, so each slice is independently reviewable and viewable in the browser:

| Slice | Delivers |
| --- | --- |
| A | toolchain, tokens, fonts, mock API, app shell, **libraries root (comped)**, auth, library CRUD + sharing |
| B | **library browse (comped)** — stream, index letters, collection boards, pagination, item actions, lend/return, collections CRUD |
| C | **item detail (comped)** — black cover, inline loan ledger, full history, edit forms |
| D | capture — ISBN scan, cover OCR, manual paths, preview-before-commit |
| E | search surface |
| F | settings, account, about |
| G | PWA identity, update prompt, deploy targets, spec reconciliation |

Auth lands *after* the libraries root inside slice A: mock mode makes the root viewable without
a session, so the comped screen can be reproduced and reviewed before Cognito is wired.

## Out of scope

- Any backend, Lambda, or API change.
- Any change to `packages/web-client-v2`, which stays in production until cutover.
- A second bucket/distribution for a pre-cutover review URL (needs a user decision).
- Offline browsing — `PRODUCT.md` fixes the app as online-only.
- Anything implying data the API lacks: genres, tags, ratings, due dates, date sorting,
  "recently added", an on-loan overview, or a collection destination route.

## Design rulings obtained during planning

Four questions were raised with the design session and answered by amendments to `DESIGN.md`
and `.claude/ui-v3.md`. They are recorded here because the plan's tasks depend on them.

| Question | Ruling | Where |
| --- | --- | --- |
| What number does a Volume Plate carry, given the API has no item ordinal? | Only real quantities: `totalItems` on a library row, `⌗ itemCount` on a collection board, `order` on a collection member, **no plate at all** on a standalone item, `order`-or-nothing on item detail. | `DESIGN.md` §4, *What a plate carries* |
| What does the Index Letter show outside A–Z? | `a`–`z` → the uppercase letter. ASCII digit or ASCII punctuation → a single `#` bucket at the head. Anything else (`œ`, `æ`, `«`) → **the character itself**, uppercased, at the tail. Folding `Œ` to a display "O" is refused as a lie about position. | `DESIGN.md` §4, *The index alphabet* |
| Does the Overprint Stamp truncate `lentTo` on a row? | No — nothing is truncated. A row reads `OUT` alone; item detail reads `OUT · MARIE · 6 DAYS`. The split follows the labelled-twice rule: the row answers *is it out*, the detail answers *who and how long*. | `DESIGN.md` §5 |
| Can an `--out` edge and a `--shared` edge collide? | They cannot: sharing is library-level in this API, so `--shared` marks library rows and `--out` marks item rows. On a search row a shared library is named with an inline `--shared` tag, leaving the left edge free. If they ever met, the actionable state wins. | `DESIGN.md` §6, *One left edge per element* |

Two further amendments followed from the backend findings above: the *Artwork present but
unavailable* state was added to `DESIGN.md` §6, and the Collection Board head gained a
`SERIES ORDER` caps label so that members running in `order` under an alphabetically-filed board
does not read as a sorting bug.

## Resolved by the user during planning

1. **Dev port is 5173, not 5174.** Taking the port `cognito.tf` already registers means Google
   sign-in works on the dev server with no Terraform change at all. Accepted cost: v2 and v3 dev
   servers cannot run simultaneously.
2. **No staging environment.** Review happens against the local `yarn preview`, then the
   deliberate `frontend-v3-cutover`. No second bucket, no second distribution, no new Terraform.

## Open questions

None. Both infrastructure questions above were resolved by choosing the option that needs no
infrastructure change, so this build touches no Terraform whatsoever.
