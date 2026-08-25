import { libraries } from '../src/test/fixtures/libraries.js';
import { collectionsByLibrary, itemsByLibrary } from '../src/test/fixtures/items.js';
import { eventsByItem } from '../src/test/fixtures/events.js';
import { hugeItems } from '../src/test/fixtures/huge.js';
import { handleDetection } from './mock-detections.js';
import { handleSearch } from './mock-search.js';

const COLLECTION = 2;

const ok = (body) => ({ status: 200, body });
const notFound = () => ({ status: 404, body: { message: 'Not found' } });

// The real nextToken is opaque and encrypted; the mock only has to be opaque to the client.
const encodeToken = (offset) => Buffer.from(String(offset)).toString('base64url');
const decodeToken = (token) => Number(Buffer.from(token, 'base64url').toString('utf8'));

const flatten = (entries) =>
  entries.flatMap((entry) => (entry.type === COLLECTION ? [entry, ...(entry.items ?? [])] : [entry]));

// Mutable working copies, deep-cloned from the imported fixtures rather than the fixtures
// themselves. A LENT/RETURNED write has to be visible to the NEXT read against this same mock
// (that is the whole point of exercising the re-read-after-write path) but the raw fixture
// objects are imported directly by other tests and components that assume they are inert data,
// not a database. Mutating them in place would make this module's write handling leak into
// every other consumer of `itemsByLibrary`/`eventsByItem` within the same test file.
let itemsState = structuredClone(itemsByLibrary);
let eventsState = structuredClone(eventsByItem);

// Exposed so a test file that exercises writes can start each test from a clean fixture instead
// of the previous test's mutations — tests in one file share this module's instance.
export const resetMockState = () => {
  itemsState = structuredClone(itemsByLibrary);
  eventsState = structuredClone(eventsByItem);
};

// Every response body is CLONED on the way out, and this is not defensiveness — it is what makes
// mock-backed tests able to fail.
//
// The store holds live objects. Handing them straight to a caller meant the app's state held the
// SAME object the mock mutates, so a `RETURNED` event deleting `lentTo` in the store also deleted
// it from the array a screen was already rendering. Every patch implementation then looked
// correct: replacing, merging, or doing nothing at all produced an identical result, because the
// object had already changed underneath all three.
//
// Found by writing a probe for `patchItem` and watching it pass against a no-op of the very
// function it names. A fixture that shares references cannot distinguish a component that re-reads
// from one that never does — which is precisely the distinction this file's own comment below
// says it exists to preserve.
const cloneBody = (result) =>
  result && result.body != null ? { ...result, body: structuredClone(result.body) } : result;

export const handleMockRequest = (method, url, body) => cloneBody(handleRequest(method, url, body));

const handleRequest = (method, url, body) => {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const path = pathname.replace(/^\/api\/v1/, '');

  // Delegated to its own module: the fixture cases it must serve (mixed artwork, a failed
  // resolver, no result, a wrong OCR read) are numerous enough that inlining them here would
  // bury the route-matching this file otherwise stays flat and easy to scan.
  if (method === 'POST' && path === '/detections') return handleDetection(body);

  if (method === 'GET' && path === '/libraries') return ok({ libraries });

  const itemsMatch = path.match(/^\/libraries\/([^/]+)\/items$/);
  if (method === 'GET' && itemsMatch) {
    // lib-huge exists for the scale profile only and is absent from the library list.
    const all = itemsMatch[1] === 'lib-huge' ? hugeItems : (itemsState[itemsMatch[1]] ?? []);
    const limit = Math.min(Number(searchParams.get('limit') ?? 10), 50);
    const offset = searchParams.has('nextToken') ? decodeToken(searchParams.get('nextToken')) : 0;
    const page = all.slice(offset, offset + limit);
    const end = offset + limit;
    return ok(end < all.length ? { items: page, nextToken: encodeToken(end) } : { items: page });
  }

  const itemMatch = path.match(/^\/libraries\/([^/]+)\/items\/([^/]+)$/);
  if (method === 'GET' && itemMatch) {
    const found = flatten(itemsState[itemMatch[1]] ?? []).find((i) => i.id === itemMatch[2]);
    // Collections are not items on this route in the real API either.
    return found && found.type !== COLLECTION ? ok(found) : notFound();
  }

  const eventsMatch = path.match(/^\/libraries\/([^/]+)\/items\/([^/]+)\/events$/);
  if (eventsMatch) {
    const [, eventsLibraryId, eventsItemId] = eventsMatch;
    if (method === 'GET') return ok({ events: eventsState[eventsItemId] ?? [] });
    if (method === 'POST') {
      // Mutations return empty bodies by design (openapi.yaml), so the only way the client can
      // observe this write is by re-reading — which means THIS mock has to actually apply it,
      // the same way the real handler updates DynamoDB before the client's next GET. Without
      // this, a correct re-reading UI and a UI that never re-reads look identical against
      // fixtures: both would show the stale state.
      const item = flatten(itemsState[eventsLibraryId] ?? []).find((i) => i.id === eventsItemId);
      if (item) {
        if (body?.type === 'RETURNED') delete item.lentTo;
        else if (body?.type === 'LENT' && body?.event) item.lentTo = body.event;
      }
      const events = eventsState[eventsItemId] ?? (eventsState[eventsItemId] = []);
      // Newest first, matching the real API and the fixture's own documented order.
      events.unshift({ date: new Date().toISOString(), type: body?.type, event: body?.event });
      return { status: 201, body: null };
    }
    if (method === 'DELETE') {
      eventsState[eventsItemId] = [];
      return ok(null);
    }
  }

  const collectionsMatch = path.match(/^\/libraries\/([^/]+)\/collections$/);
  if (method === 'GET' && collectionsMatch) {
    return ok({ collections: collectionsByLibrary[collectionsMatch[1]] ?? [] });
  }

  // The single-collection GET (EditCollection's cold-load) — a header only, per the API and
  // DESIGN.md's "collections stay inline" note; never the member items.
  const collectionMatch = path.match(/^\/libraries\/([^/]+)\/collections\/([^/]+)$/);
  if (method === 'GET' && collectionMatch) {
    const found = (collectionsByLibrary[collectionMatch[1]] ?? []).find(
      (c) => c.id === collectionMatch[2],
    );
    return found ? ok(found) : notFound();
  }

  // Delegated to its own module for the same reason /detections is: the fixture cases it must
  // serve (the mixed/large/single/none/error states, per tools/mock-search.js) are numerous
  // enough that inlining them here would bury the route-matching this file otherwise stays flat
  // and easy to scan.
  if (method === 'POST' && path === '/search') return handleSearch(body);

  // Writes acknowledge with the empty body the real API returns, so the client's
  // re-read-after-write path is exercised rather than short-circuited.
  if (['POST', 'PUT', 'DELETE'].includes(method) && path.startsWith('/libraries')) {
    return { status: 200, body: { id: 'new-id' } };
  }

  return null;
};
