import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import VolumeFrame from './VolumeFrame.jsx';

const bookWithArt = {
  id: 'a',
  type: 0,
  title: 'Le Grand Sommeil',
  picture: 'https://cdn/a',
  updatedAt: '2026-08-01T09:12:00Z',
};

describe('VolumeFrame', () => {
  // Type used to be marked three redundant ways, one of them a spine rule drawn on this
  // frame. It is gone now: a book and a film render the IDENTICAL frame, with
  // or without artwork. This is the inverse of the old spine tests, and it is the one a future
  // contributor restoring a type marker would break — pinned deliberately.
  //
  // With no picture, collectionId or order, the compared outerHTML was a bare frame div with no
  // children at all — a matching identity a type marker could reintroduce as a THIRD child and
  // still pass. Giving both items the same collectionId/order makes the assertion also cover the
  // one child node the frame can actually render (the order plate), which is what would carry a
  // reintroduced marker.
  it('renders the identical frame for a book and a film — type is not marked here', () => {
    const { container: book } = render(
      <VolumeFrame item={{ id: 'b', type: 0, title: 'X', collectionId: 'c', order: 3 }} />,
    );
    const { container: film } = render(
      <VolumeFrame item={{ id: 'f', type: 1, title: 'X', collectionId: 'c', order: 3 }} />,
    );
    expect(film.firstChild.outerHTML).toBe(book.firstChild.outerHTML);
    expect(book.querySelector('[data-spine]')).toBeNull();
  });

  it('cache-busts the thumbnail with updatedAt', () => {
    render(<VolumeFrame item={bookWithArt} />);
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'https://cdn/a?v=2026-08-01T09%3A12%3A00Z',
    );
  });

  it('falls back to the ruled empty frame when the thumbnail 404s', () => {
    render(<VolumeFrame item={bookWithArt} />);
    fireEvent.error(screen.getByRole('presentation'));
    // Never a broken-image glyph: the URL is synthesised without checking S3, so a fresh item
    // legitimately has one that does not resolve yet.
    expect(screen.queryByRole('presentation')).toBeNull();
  });

  it('shows a collection member order in a plate, and a standalone item none', () => {
    render(<VolumeFrame item={{ id: 'm', type: 0, title: 'X', order: 3, collectionId: 'c' }} />);
    expect(screen.getByText('03')).toBeInTheDocument();

    render(<VolumeFrame item={{ id: 's', type: 0, title: 'Y' }} />);
    expect(screen.queryByText('01')).toBeNull();
  });

  it('rules the order plate rather than filling it, because an order is inventory', () => {
    render(<VolumeFrame item={{ id: 'm', type: 0, title: 'X', order: 3, collectionId: 'c' }} />);
    const plate = screen.getByText('03');
    expect(plate.className).not.toContain('bg-imprint');
    expect(plate.className).toContain('border-ink');
  });

  // Round 5 critique #1: the empty frame used to fill with `bg-paper-deep` (row) or
  // `bg-cover-rule/25` (hero) — a near-invisible tint on paper, but a mid-grey slab on the
  // cover that read as a failed image on the app's peak screen. "Ruled" now means the rule and
  // nothing else, on both surfaces, so neither fill class may reappear on either size.
  it('carries no fill on either surface — the rule alone describes the empty frame', () => {
    const { container: row } = render(<VolumeFrame item={{ id: 'r', type: 0, title: 'X' }} />);
    expect(row.firstChild.className).not.toMatch(/bg-(paper-deep|cover-rule)/);

    const { container: hero } = render(
      <VolumeFrame size="hero" item={{ id: 'h', type: 0, title: 'X' }} />,
    );
    expect(hero.firstChild.className).not.toMatch(/bg-(paper-deep|cover-rule)/);
  });

  it('is decorative to assistive technology — the title beside it already names the item', () => {
    render(<VolumeFrame item={bookWithArt} />);
    expect(screen.getByRole('presentation')).toHaveAttribute('alt', '');
  });

  it('takes the hero size on the inverted cover, ruled in paper', () => {
    const { container } = render(<VolumeFrame size="hero" item={{ id: 'f', type: 1, title: 'X' }} />);
    expect(container.firstChild.className).toContain('border-paper');
    expect(container.querySelector('[data-spine]')).toBeNull();
  });

  // Surfaces the internal `failed` signal to whichever caller asked for it — item detail's
  // "Fetch cover" repair, today — without VolumeFrame itself knowing that control exists.
  it('reports its load-failure state through onFailedChange, both ways', () => {
    const onFailedChange = vi.fn();
    render(<VolumeFrame item={bookWithArt} onFailedChange={onFailedChange} />);
    expect(onFailedChange).toHaveBeenLastCalledWith(false);

    fireEvent.error(screen.getByRole('presentation'));
    expect(onFailedChange).toHaveBeenLastCalledWith(true);
  });

  // ItemRow (the browse stream) calls this with neither a `size` nor `onFailedChange` — an
  // optional prop nobody passes must be a true no-op, not something that needs a default to
  // avoid crashing. This is what keeps the "Fetch cover" repair from being reachable per-row.
  it('never requires onFailedChange — a caller that never passes it sees nothing different', () => {
    expect(() => {
      render(<VolumeFrame item={bookWithArt} />);
      fireEvent.error(screen.getByRole('presentation'));
    }).not.toThrow();
  });

  // The third size, and the reason it exists: on the detection-results screen
  // "the picture is what decides the match" — a candidate list is where a reader compares
  // editions, and choosing the wrong one writes a record they cannot detect as wrong later. It
  // shipped at the row's 48x72, smaller than a stream row's job needs, on the screen with the
  // most vertical room to spare.
  it('takes a larger frame on the candidate screens, still ruled in ink and still 2:3', () => {
    const { container } = render(<VolumeFrame size="candidate" item={{ id: 'c', type: 0, title: 'X' }} />);
    expect(container.firstChild.className).toContain('h-[132px]');
    expect(container.firstChild.className).toContain('w-[88px]');
    expect(container.firstChild.className).toContain('border-ink');
    // 88x132 is exactly 2:3, like the other two — the size changes, never the ratio: one ratio
    // for every item, so nothing is ever cropped.
    expect(132 / 88).toBeCloseTo(3 / 2, 5);
  });
});
