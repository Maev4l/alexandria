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

  it('splits a collection across the page boundary, flagging the continuation', () => {
    // lib-huge, not lib-fiction: fiction is smaller than one page, so a real server would never
    // emit a continuation for it. Modelling the split there produced two entries for one
    // collection inside a single response, which no server does.
    const first = handleMockRequest('GET', '/api/v1/libraries/lib-huge/items?limit=30');
    const second = handleMockRequest(
      'GET',
      `/api/v1/libraries/lib-huge/items?limit=30&nextToken=${first.body.nextToken}`,
    );
    // The API emits a continuing collection FIRST on its continuation page.
    expect(second.body.items[0]).toMatchObject({ type: 2, id: 'huge-coll', partial: true });
  });

  it('serves a whole collection in one entry when the library fits on one page', () => {
    const res = handleMockRequest('GET', '/api/v1/libraries/lib-fiction/items?limit=30');
    const boards = res.body.items.filter((entry) => entry.type === 2);
    expect(boards).toHaveLength(1);
    expect(boards[0].items).toHaveLength(4);
    expect(boards[0].partial).toBeUndefined();
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
