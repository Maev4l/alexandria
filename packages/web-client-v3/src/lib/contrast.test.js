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
