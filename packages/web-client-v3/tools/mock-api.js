import { libraries } from '../src/test/fixtures/libraries.js';
import {
  collectionsByLibrary,
  itemsByLibrary,
  searchResults,
} from '../src/test/fixtures/items.js';
import { eventsByItem } from '../src/test/fixtures/events.js';
import { hugeItems } from '../src/test/fixtures/huge.js';

const COLLECTION = 2;

const ok = (body) => ({ status: 200, body });
const notFound = () => ({ status: 404, body: { message: 'Not found' } });

// The real nextToken is opaque and encrypted; the mock only has to be opaque to the client.
const encodeToken = (offset) => Buffer.from(String(offset)).toString('base64url');
const decodeToken = (token) => Number(Buffer.from(token, 'base64url').toString('utf8'));

const flatten = (entries) =>
  entries.flatMap((entry) => (entry.type === COLLECTION ? [entry, ...(entry.items ?? [])] : [entry]));

export const handleMockRequest = (method, url) => {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const path = pathname.replace(/^\/api\/v1/, '');

  if (method === 'GET' && path === '/libraries') return ok({ libraries });

  const itemsMatch = path.match(/^\/libraries\/([^/]+)\/items$/);
  if (method === 'GET' && itemsMatch) {
    // lib-huge exists for the scale profile only and is absent from the library list.
    const all = itemsMatch[1] === 'lib-huge' ? hugeItems : (itemsByLibrary[itemsMatch[1]] ?? []);
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
    return found && found.type !== COLLECTION ? ok(found) : notFound();
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
