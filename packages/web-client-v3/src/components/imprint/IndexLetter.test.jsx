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

  it('strokes an alphanumeric label, because yellow cannot describe a shape on paper', () => {
    // --imprint on --paper is 1.55:1, so the ink stroke IS the contrast, not decoration.
    const { container } = render(<IndexLetter letter="1" count={2} />);
    const glyph = container.querySelector('[aria-hidden="true"]');
    expect(glyph.className).toContain('text-imprint');
    expect(glyph.className).toContain('-webkit-text-stroke');
  });

  it('renders a self-crossing glyph solid ink instead, where a stroke would collide', () => {
    ['&', '#', '@'].forEach((label) => {
      const { container, unmount } = render(<IndexLetter letter={label} count={1} />);
      const glyph = container.querySelector('[aria-hidden="true"]');
      expect(glyph.className).toContain('text-ink');
      expect(glyph.className).not.toContain('-webkit-text-stroke');
      unmount();
    });
  });
});
