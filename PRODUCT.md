# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite 6 + Tailwind CSS 4 + `vite-plugin-pwa`, with `aws-amplify` for Cognito
auth and `react-router-dom` for routing — confirmed by the user as the same base as
`packages/web-client-v2`. UI primitives are locally owned source files (shadcn-style, not a
component-library dependency). JavaScript only, no TypeScript; `yarn` with a package-local
`yarn.lock` (no workspaces); Oxlint for linting.

Target package: `packages/web-client-v3/` (currently empty — greenfield build).

## Users

**Primary: the collection owner.** Someone who owns a physical library of books and films
(DVD / Blu-ray) and wants to know what is in it without walking to the shelf. Uses the app
on a phone, typically one-handed, in two distinct situations: away from home deciding
whether they already own something, and at home adding new acquisitions.

**Secondary: family and friends — full users in their own right.** They keep their own
libraries *and* receive libraries shared to them. "Mine" versus "shared with me" is an
everyday distinction for them, not an edge case, so both roles are first-class. Recipients
of a shared library have read-only access to it.

**Admin (the owner):** approves new signups. Handled outside the web client via Slack
buttons or the Go CLI, not a UI concern.

## Product Purpose

Alexandria is a private catalogue of a personal physical media collection. It exists to
answer, in seconds and away from the shelf: *do I own this, which library is it in, and who
currently has it?* Success is that the owner trusts the catalogue enough to rely on it in a
bookshop, and that lent items reliably come back because the app remembers who took what
and when.

It is deliberately not a social reading network, a reading tracker, or a wishlist. It
records ownership, location, and circulation of physical objects.

## Positioning

A **circulation record for a physical collection**, not a media database. The distinguishing
mechanism is the combination of:

- **Capture by pointing a camera at the object** — ISBN barcode for books, cover OCR
  (Bedrock/Claude vision) plus TMDB lookup for films. The physical item is the input.
- **Per-item lending history** — an append-only ledger of LENT / RETURNED events per item,
  so "who has my copy" is answerable with dates, not memory.
- **Read-only library sharing between real accounts** — other people browse your shelves
  without being able to change them.

Books and films live in the same catalogue under one item model, so a household's media is
one collection rather than two apps.

## Operating Context

- **Away from home, deciding to buy.** Phone in one hand, book in the other, possibly poor
  signal and poor light. The question is binary and urgent: do I already own this? This is
  the dominant reason the app gets opened.
- **Cataloguing session at home.** A stack of new arrivals processed back-to-back: scan,
  confirm, next. Detection is imperfect (multiple resolvers, per-resolver errors, no match
  at all), so a manual path must always be reachable — manual ISBN entry for books, manual
  title search for films.
- **Lending at the door.** An item leaves with someone; the name is recorded in seconds.
  Later, the reverse.
- **Browsing / showing off.** Occasional, lower-frequency: flipping through a library or
  showing it to someone.
- **Installed as a PWA.** Phone-first (portrait, thumb reach). Tablet and desktop must be
  sane and usable but do not get bespoke layouts.
- **Online only** (confirmed). Connectivity is required; offline states must be honest
  rather than silently stale. Offline browsing stays on the future list.

## Capabilities and Constraints

The backend is fixed AWS Lambda (Go) behind API Gateway. **The UI rework must not require
new or changed endpoints** — the contract is `packages/functions/api/openapi.yaml`.

### Entities

- **Library** — name (≤20 chars), description (≤100), `totalItems`, `sharedTo` (usernames),
  `sharedFrom` (owner, when shared to you). CRUD + share (by email) + unshare (1–10 emails).
- **Item** — a Book or a Video in exactly one library. Shared base: title, cover, owner,
  `lentTo`, optional collection + order, `updatedAt`. Books add authors, summary, ISBN.
  Videos add directors, cast (top 5), release year, duration in minutes, TMDB id.
- **Collection** — an optional named grouping inside one library (name ≤100, unique per
  library; description ≤500). Membership is optional; an item has a collection *and* an
  order (1–1000) or neither. Deleting a collection orphans its items rather than deleting
  them.
- **Item event** — `LENT` or `RETURNED` with a person's name (≤50) and a timestamp.
  Append-only per item; deletable only as a whole history.

### Reads, and what they constrain

- `GET /libraries` — all libraries, owned and shared-with-me, in one response.
- `GET /libraries/{id}/items` — the only item-listing read. Paginated (`limit` ≤50,
  opaque `nextToken`), **alphabetically sorted by title, server-side grouped**: collections
  arrive as `type=2` entries with their members nested, and a collection split across a page
  boundary is flagged `partial: true` on the continuation page. There is no server-side
  sort, filter, or facet beyond this.
- `POST /search` — Bluge fuzzy search over `title`, `authors`, `directors`, `cast`, and
  `collection`, across the libraries the user can see. Terms are lowercased; there is no
  explicit accent folding, so accent-insensitive matching relies on fuzzy edit distance.
  No pagination.
- `GET /libraries/{libraryId}/items/{itemId}` — a single book or video, in the **same shape
  as the listing**, readable by the owner and by recipients of a shared library. `404` when
  absent. Item-detail routes are therefore deep-linkable and survive a page refresh or a PWA
  restart with one request.
- **Collections are not items on that route.** A collection id returns `404`; its header comes
  from `GET /libraries/{id}/collections/{collectionId}`, which carries `name`, `description`
  and `itemCount` but **not its member items**. Members are only obtainable from the library
  listing, so a *collection* detail view is cheap only inside a listing session — a cold
  deep link to one cannot fetch its contents in a single call.
- **Covers:** `picture` is a CloudFront thumbnail URL (S3-backed, produced asynchronously by
  the image-processing Lambda); `pictureUrl` is the external source URL from a detection API.
  Cache-bust with `?v={updatedAt}`.
- **A very large majority of items carry a cover** (confirmed by the owner). Detection resolves
  artwork for most books and nearly all films, so **artwork present is the normal case and the empty
  frame is the exception** — the reverse of what the fixture data suggests. Do not reason from the
  fixtures about how dense or sparse a real stream looks. Two distinct things must not be conflated:
  a cover the collection genuinely lacks (rare), and a `picture` URL that **404s while the thumbnail
  is still being produced, or that was synthesised from a template without checking S3** (common, and
  transient). The second is the dominant cover failure, which makes the load-failure fallback and its
  retry load-bearing, not the empty state. (That retry repeats rather than firing once — see
  `packages/web-client-v3/src/components/imprint/VolumeFrame.jsx`.)

### Absent data (must not be faked)

- **No `createdAt` on items** — "recently added", date sorting, and activity feeds are
  impossible without backend work.
- **No due date on loans** — only LENT/RETURNED event timestamps exist. Loan duration must
  be derived client-side by pairing events; "overdue" is not a backend concept.
- **No aggregate/statistics endpoint** — no dashboards or collection-wide counts beyond each
  library's `totalItems` and each collection's `itemCount`.
- **No genres, tags, ratings, or read/watched state.**

### Consistency

Renames of a library or collection, new items appearing in search, and cover thumbnails all
propagate asynchronously (DynamoDB streams / S3, roughly ~100ms but not guaranteed). The UI
must tolerate a just-written value not yet being reflected everywhere.

### Scale

Must stay comfortable at **1000+ items** across many libraries and collections — long lists,
alphabetical navigation, and pagination are load-bearing — while remaining light for a
small library.

### Auth

AWS Cognito: email + password, or Google OAuth. One account per email (federated identities
are linked). Every new user is blocked behind `custom:Approved` until an admin approves, so
a *signed in but not yet approved* state is a real, designed state. Access/ID tokens last 60
minutes, refresh tokens 365 days.

## Brand Commitments

- **The name "Alexandria" is binding.**
- **The URL and deploy pipeline are binding:** v3 eventually replaces v2 at
  `alexandria.isnan.eu` via the existing S3 + CloudFront + Makefile flow (parallel v3 Make
  targets during the transition). Auth lives at `alexandria-auth.isnan.eu`.
- **The visual identity is *not* binding.** The existing logo and PWA icon set may be
  replaced; the user explicitly asked that v3 not be influenced by the v2 interface. v2 is
  an anti-reference, not a starting point.

## Evidence on Hand

- **API contract:** `packages/functions/api/openapi.yaml` — authoritative and complete.
- **Architecture:** `documentation/architecture.jpg` / `.drawio`.
- **Existing v2 client:** `packages/web-client-v2/` — a working reference for *what the API
  returns and which flows exist*, and an explicit anti-reference for how it looks.
- **Reusable assets available but not mandated:** PWA icon set and Lottie animations in
  `packages/web-client-v2/public/` and `src/assets/`.
- **Real content:** the owner's actual collection. Item titles, summaries and metadata are
  **mixed English and French** — typography, line-breaking, and alphabetical grouping must
  handle French diacritics correctly.
- **Absent:** no marketing site, no public landing page, no testimonials, no pricing, no
  usage metrics, no user research. This is a private application behind admin approval;
  none of that may be invented.

## Product Principles

1. **Lookup is the front door.** The dominant job is "do I own this?" — the shortest,
   fastest path in the app must answer it. Everything else yields floor space to it.
2. **State is a fact, not a decoration.** Lent-to-whom and shared-with-whom must be legible
   wherever an item or library appears, not hidden a tap away. Circulation is the point of
   the product.
3. **Capture must survive repetition and failure.** Adding is a batch activity against
   unreliable detection: the flow must tolerate back-to-back items, partial results, wrong
   matches, and no match, with a manual path always in reach.
4. **Design inside the API's grain.** Alphabetical, paginated, server-grouped reads with no
   `createdAt`, no due dates, and no server-side filter or sort. Single items are directly
   readable; collection *members* are not. No UX that quietly requires backend work; no UI
   that implies data the backend does not have.
5. **Hold at a thousand, stay light at fifty.** Navigation must not collapse as the
   collection grows, and must not feel like industrial tooling when it is small.

## Accessibility & Inclusion

No formal conformance standard has been mandated. Established, product-specific needs:

- **One-handed phone use in portrait** is the primary interaction posture; primary actions
  belong in thumb reach.
- **Camera capture always needs a non-camera alternative** (manual ISBN entry, manual title
  search) — for poor light, denied camera permission, or damaged/absent barcodes.
- **Mixed English/French content** must render and sort correctly with diacritics.
- **Read-only shared libraries must be unmistakably read-only**, so recipients are never
  offered an action they cannot perform.
