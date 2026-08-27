import { act, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import VolumeFrame, { RETRY_MS } from './VolumeFrame.jsx';

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
  // THE test for the bound. The retry exists for a thumbnail that is merely late; a thumbnail
  // that is permanently missing must stop asking. Before the bound there was nothing counting
  // attempts, so the timer cleared the flag, the <img> remounted, its onError set the flag, and
  // the timer was armed again — every four seconds, for as long as the row stayed mounted, on
  // every row of a thirty-row page. Written and watched fail against that code before the bound
  // existed: a guard that has only ever been green is indistinguishable from a comment.
  it('retries exactly once and then holds the empty frame, however long it is left', () => {
    vi.useFakeTimers();
    try {
      render(<VolumeFrame item={bookWithArt} />);

      // First attempt fails.
      fireEvent.error(screen.getByRole('presentation'));
      expect(screen.queryByRole('presentation')).toBeNull();

      // The one retry: the image comes back and is tried again.
      act(() => vi.advanceTimersByTime(RETRY_MS));
      expect(screen.getByRole('presentation')).toBeInTheDocument();

      // It fails again. That is the answer, and the frame holds it.
      fireEvent.error(screen.getByRole('presentation'));
      expect(screen.queryByRole('presentation')).toBeNull();

      act(() => vi.advanceTimersByTime(RETRY_MS * 25));
      expect(screen.queryByRole('presentation')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  // The bound must not settle the flag by oscillating it. Item detail raises its "Fetch cover"
  // repair from this signal, so a flag that flipped back and forth on a four-second clock made
  // that control appear and vanish while the reader looked at it. Once the retry is spent the
  // flag is true and stays true, so the control is stably on screen.
  it('settles its failure signal true rather than flickering it on a clock', () => {
    vi.useFakeTimers();
    try {
      const onFailedChange = vi.fn();
      render(<VolumeFrame item={bookWithArt} onFailedChange={onFailedChange} />);

      fireEvent.error(screen.getByRole('presentation'));
      act(() => vi.advanceTimersByTime(RETRY_MS));
      fireEvent.error(screen.getByRole('presentation'));
      expect(onFailedChange).toHaveBeenLastCalledWith(true);

      onFailedChange.mockClear();
      act(() => vi.advanceTimersByTime(RETRY_MS * 25));
      expect(onFailedChange).not.toHaveBeenCalledWith(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // A new src is a new subject, not a repeat of the one that failed. The address carries
  // ?v={updatedAt}, so a changed src means the item was genuinely written to — which is exactly
  // what the "Fetch cover" repair does. Item detail clears its own copy of the flag after that
  // write on the reasoning that the cache-busted address has not been tried yet; this is what
  // makes that reasoning true rather than a guess.
  it('re-arms its single retry when the src changes, which is what the cover repair needs', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<VolumeFrame item={bookWithArt} />);

      fireEvent.error(screen.getByRole('presentation'));
      act(() => vi.advanceTimersByTime(RETRY_MS));
      fireEvent.error(screen.getByRole('presentation'));
      act(() => vi.advanceTimersByTime(RETRY_MS * 25));
      expect(screen.queryByRole('presentation')).toBeNull();

      // The repair wrote the item, so updatedAt moved and the address is new.
      const repaired = { ...bookWithArt, updatedAt: '2026-08-20T11:00:00Z' };
      rerender(<VolumeFrame item={repaired} />);
      const img = screen.getByRole('presentation');
      expect(img).toHaveAttribute('src', 'https://cdn/a?v=2026-08-20T11%3A00%3A00Z');

      // And the fresh subject gets a fresh retry, not the spent one.
      fireEvent.error(img);
      expect(screen.queryByRole('presentation')).toBeNull();
      act(() => vi.advanceTimersByTime(RETRY_MS));
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
