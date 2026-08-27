import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlateLine from './PlateLine.jsx';

// PlateLine had no test file of its own: it was covered incidentally, through the screens that
// render it. That was survivable while it had one shape and became a gap the moment its
// by-surface variation reached it — a component with two constructions and no direct test is one
// where "the row is unchanged" is nobody's assertion.
const FILM = 1;
const BOOK = 0;

describe('PlateLine', () => {
  const film = { type: FILM, directors: ['Jean-Pierre Melville'], releaseYear: 1967, duration: 105 };

  describe('the browse row (default surface)', () => {
    it('reads DIRECTOR · YEAR for a film', () => {
      const { container } = render(<PlateLine item={film} />);
      expect(container.textContent).toBe('Jean-Pierre Melville · 1967');
    });

    it('reads the authors alone for a book — no year, no identifier', () => {
      const { container } = render(<PlateLine item={{ type: BOOK, authors: ['Gustave Flaubert'], isbn: '978' }} />);
      expect(container.textContent).toBe('Gustave Flaubert');
    });

    it('renders nothing at all when the item carries neither', () => {
      // The accepted residual: a film entered by hand with no director and no year prints a bare
      // title, indistinguishable from a book. The line is absent, not an empty element.
      const { container } = render(<PlateLine item={{ type: FILM, directors: [] }} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // THE THIRD SURFACE. This line already varies by surface — it gains the edition on item
  // detail — so a candidate row gaining the runtime is a third variant of one rule rather than a
  // widening of the contract. It folds in rather than keeping a line of its own because on a
  // comparison screen every row's height is paid once per candidate, five times at the maximum.
  describe('the candidate surface', () => {
    it('reads DIRECTOR · YEAR · RUNTIME on one line', () => {
      const { container } = render(<PlateLine item={film} surface="candidate" />);
      expect(container.textContent).toBe('Jean-Pierre Melville · 1967 · 105′');
    });

    it('leaves the browse row unchanged, with no runtime', () => {
      // The default surface must not inherit the new field: the stream is a scan rather than a
      // comparison, and the runtime is deliberately withheld from it.
      const { container } = render(<PlateLine item={film} />);
      expect(container.textContent).toBe('Jean-Pierre Melville · 1967');
    });

    it('sets only the figures in the mono, never the name', () => {
      const { container } = render(<PlateLine item={film} surface="candidate" />);
      expect([...container.querySelectorAll('.num')].map((el) => el.textContent)).toEqual(['1967', '105′']);
    });

    it('keeps a zero-minute runtime, which a truthy check would drop', () => {
      // `duration` permits 0 (CreateVideoRequest), so presence is the test, not truthiness.
      const { container } = render(<PlateLine item={{ ...film, duration: 0 }} surface="candidate" />);
      expect(container.textContent).toBe('Jean-Pierre Melville · 1967 · 0′');
    });

    it('never prints an identifier for a book candidate', () => {
      // Derived explicitly rather than from `detailLineParts`, which returns the ISBN for a book:
      // a row must never carry one, and on that screen the scanned code already sits once at
      // the head. This assertion is what stops that leak if anyone reuses the detail parts here.
      const { container } = render(
        <PlateLine item={{ type: BOOK, authors: ['Flaubert'], isbn: '9782070368228' }} surface="candidate" />,
      );
      expect(container.textContent).toBe('Flaubert');
    });
  });
});
