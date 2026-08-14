import { describe, expect, it } from 'vitest';
import { pictureSrc } from './picture.js';

describe('pictureSrc', () => {
  it('returns nothing when the item has no thumbnail URL', () => {
    expect(pictureSrc({ id: 'a' })).toBeNull();
    expect(pictureSrc(undefined)).toBeNull();
  });

  it('cache-busts with updatedAt, because the CDN caches thumbnails for seven days', () => {
    const src = pictureSrc({ picture: 'https://cdn/x', updatedAt: '2026-08-01T09:12:00Z' });
    expect(src).toBe('https://cdn/x?v=2026-08-01T09%3A12%3A00Z');
  });

  it('falls back to the bare URL when updatedAt is omitted', () => {
    // omitempty means absent, not null — the field simply is not there.
    expect(pictureSrc({ picture: 'https://cdn/x' })).toBe('https://cdn/x');
  });
});
