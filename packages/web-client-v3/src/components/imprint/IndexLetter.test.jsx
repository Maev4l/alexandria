import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IndexLetter from './IndexLetter.jsx';

describe('IndexLetter', () => {
  it('is a separator, not a heading — it marks position, it does not title a section', () => {
    render(<IndexLetter letter="A" count={2} />);
    expect(screen.getByRole('separator')).toHaveAccessibleName('Titles beginning A');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('shows no count on the run still filling', () => {
    render(<IndexLetter letter="Z" count={null} />);
    expect(screen.queryByText(/volume/)).toBeNull();
  });

  it('says one volume, not one volumes', () => {
    render(<IndexLetter letter="A" count={1} />);
    expect(screen.getByText('1 volume')).toBeInTheDocument();
  });

  it('pluralises everything else', () => {
    render(<IndexLetter letter="A" count={14} />);
    expect(screen.getByText('14 volumes')).toBeInTheDocument();
  });

  it('names the tail bucket honestly rather than folding it to a letter', () => {
    render(<IndexLetter letter="Œ" count={1} />);
    expect(screen.getByRole('separator')).toHaveAccessibleName('Titles beginning Œ');
  });

  // Round 2: a stroked yellow fill is the construction that cannot work — a
  // `-webkit-text-stroke` outline traces every stroke of a glyph independently and collides with
  // itself wherever a counter is narrower than the stroke (M, N, P all did, at any weight/stretch
  // tried — see IndexLetter.jsx's header). Solid ink has no offset outline to collide with, for
  // any glyph the server's fold can produce, so every label now takes the SAME treatment — the
  // alphanumeric/symbol split is gone, not just re-tuned.
  it('renders every label as solid ink, with no stroke — the split by glyph shape is gone', () => {
    ['1', 'A', 'M', 'N', 'P', 'Œ', '&', '#', '@'].forEach((label) => {
      const { container, unmount } = render(<IndexLetter letter={label} count={1} />);
      const glyph = container.querySelector('[aria-hidden="true"]');
      expect(glyph.className).toContain('text-ink');
      expect(glyph.className).not.toContain('text-imprint');
      expect(glyph.className).not.toContain('-webkit-text-stroke');
      unmount();
    });
  });

  it('moves the yellow to the rule beneath the letter, not the letter itself', () => {
    // DESIGN.md's Iridescent Edge donation: state colour lives on edges and rules, never the
    // content field — this is that discipline applied to the index letter itself.
    render(<IndexLetter letter="A" count={1} />);
    expect(screen.getByRole('separator').className).toContain('border-imprint');
  });
});
