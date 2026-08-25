import { describe, expect, it } from 'vitest';
import { validateCollectionOrder, validateItem } from './validate.js';

describe('validateCollectionOrder', () => {
  it('accepts neither set — membership is optional', () => {
    expect(validateCollectionOrder({})).toBeNull();
  });

  it('accepts both set within range', () => {
    expect(validateCollectionOrder({ collectionId: 'c', order: 12 })).toBeNull();
  });

  it('rejects an order with no collection', () => {
    expect(validateCollectionOrder({ order: 3 })).toMatch(/collection/i);
  });

  it('holds the order inside 1-1000', () => {
    expect(validateCollectionOrder({ collectionId: 'c', order: 0 })).toMatch(/1 to 1000/);
    expect(validateCollectionOrder({ collectionId: 'c', order: 1001 })).toMatch(/1 to 1000/);
    expect(validateCollectionOrder({ collectionId: 'c', order: 1.5 })).toMatch(/whole number/);
  });

  // The pair requirement this project invented (.claude/ui-v3.md, corrected at e302fd1) is gone:
  // the API only demands order alongside a collection when the collection is UNCHANGED — see
  // task-17a-brief.md. These five replace the old unconditional "collection needs an order" test.
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

  it('accepts an empty cover image address — the field is optional', () => {
    expect(validateItem(0, { title: 'ok', pictureUrl: '' }).pictureUrl).toBeUndefined();
  });

  it('accepts an http(s) cover image address', () => {
    expect(validateItem(0, { title: 'ok', pictureUrl: 'https://example.test/cover.jpg' }).pictureUrl).toBeUndefined();
  });

  it('rejects a cover image address with no http(s) scheme', () => {
    expect(validateItem(0, { title: 'ok', pictureUrl: 'not-a-url' }).pictureUrl).toMatch(/http/i);
  });

  it('passes a valid film', () => {
    expect(
      validateItem(1, { title: 'Chinatown', releaseYear: 1974, duration: 130, directors: ['RP'] }),
    ).toEqual({});
  });
});
