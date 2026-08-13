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

  it('splits the collection across the page boundary, flagging the continuation', () => {
    const second = handleMockRequest(
      'GET',
      `/api/v1/libraries/lib-fiction/items?limit=10&nextToken=${
        handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items?limit=10').body.nextToken
      }`,
    );
    // The API emits a continuing collection FIRST on its continuation page.
    expect(second.body.items[0]).toMatchObject({ type: 2, id: 'coll-melville', partial: true });
  });

  it('serves a single item by id', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items/item-lent');
    expect(res.status).toBe(200);
    expect(res.body.lentTo).toBe('Marie');
  });

  it('finds an item nested inside a collection', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items/item-samourai');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Le Samouraï');
  });

  it('404s a collection id, because collections are not items on that route', () => {
    expect(handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items/coll-melville').status)
      .toBe(404);
  });

  it('404s an unknown item, as the real API does', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items/nope');
    expect(res.status).toBe(404);
  });

  it('returns null for a path it does not handle, so the caller can fall through', () => {
    expect(handleMockRequest('GET', '/api/v1/unknown')).toBeNull();
  });
});
