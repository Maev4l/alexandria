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
