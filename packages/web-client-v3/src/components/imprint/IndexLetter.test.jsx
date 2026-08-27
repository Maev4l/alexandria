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

  // The count is now split across two elements — the figure in `.num`, the word inherited sans
  // (LedgerRow's "9 days" idiom) — so `getByText` can no longer match the whole phrase in one
  // node; `toHaveTextContent` reads the concatenated text the way LedgerRow's own tests do.
  it('says one volume, not one volumes', () => {
    const { container } = render(<IndexLetter letter="A" count={1} />);
    expect(container.querySelector('.text-ink-soft')).toHaveTextContent('1 volume');
  });

  it('pluralises everything else', () => {
    const { container } = render(<IndexLetter letter="A" count={14} />);
    expect(container.querySelector('.text-ink-soft')).toHaveTextContent('14 volumes');
  });

  // The seed instance for this sweep: "volume"/"volumes" is a word, not a numeral, so it must
  // never sit inside `.num` — only the figure is.
  it('keeps the word out of the mono: only the figure is a numeral', () => {
    const { container } = render(<IndexLetter letter="A" count={14} />);
    const countLine = container.querySelector('.text-ink-soft');
    const monoText = [...countLine.querySelectorAll('.num')].map((el) => el.textContent).join('');
    expect(monoText).toBe('14');
    expect(monoText).not.toMatch(/volume/);
  });

  it('names the tail bucket honestly rather than folding it to a letter', () => {
    render(<IndexLetter letter="Œ" count={1} />);
    expect(screen.getByRole('separator')).toHaveAccessibleName('Titles beginning Œ');
  });

  // F3: Candidate F restored. Round 2's rejection (stroked fill collides in M/N/P's counters) was
  // measured entirely in system-ui fallback, at a font-stretch a width-less fallback face ignores
  // — re-tested in the real, fixed Archivo (scripts/check-index-letter.mjs renders actual pixels,
  // which jsdom cannot), M/N/P/Œ all have fully open counters, and the same re-test found the
  // symbol carve-out's own claim (that `#` fragments) doesn't hold either. So every label — letter
  // or symbol — takes the SAME stroked-imprint treatment; there is no split to re-test per glyph.
  it('renders every label with the stroked imprint fill — no split by glyph shape', () => {
    ['1', 'A', 'M', 'N', 'P', 'Œ', '&', '#', '@'].forEach((label) => {
      const { container, unmount } = render(<IndexLetter letter={label} count={1} />);
      const glyph = container.querySelector('[aria-hidden="true"]');
      expect(glyph.className).toContain('text-imprint');
      expect(glyph.className).not.toContain('text-ink');
      expect(glyph.className).toContain('-webkit-text-stroke:2px_var(--ink)');
      unmount();
    });
  });

  it('keeps the yellow on the letter itself; the rule beneath is ink', () => {
    // The stroke IS the yellow-on-paper contrast mechanism now (--imprint on --paper is ~1.55:1
    // and needs the ink outline to read as a shape at all) — so unlike round
    // 2's solid-ink treatment, the accent does not need to live on the rule instead, and doesn't.
    render(<IndexLetter letter="A" count={1} />);
    expect(screen.getByRole('separator').className).toContain('border-ink');
    expect(screen.getByRole('separator').className).not.toContain('border-imprint');
  });
});
