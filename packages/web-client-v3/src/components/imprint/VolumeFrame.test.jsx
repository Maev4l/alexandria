import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';
import VolumeFrame from './VolumeFrame.jsx';

const bookWithArt = {
  id: 'a',
  type: 0,
  title: 'Le Grand Sommeil',
  picture: 'https://cdn/a',
  updatedAt: '2026-08-01T09:12:00Z',
};

describe('VolumeFrame', () => {
  it('draws the spine rule on a film, and not on a book', () => {
    const { container: film } = render(<VolumeFrame item={{ id: 'f', type: 1, title: 'X' }} />);
    expect(film.querySelector('[data-spine]')).not.toBeNull();

    const { container: book } = render(<VolumeFrame item={{ id: 'b', type: 0, title: 'X' }} />);
    expect(book.querySelector('[data-spine]')).toBeNull();
  });

  it('draws the spine rule on an empty frame too, since artwork is often absent', () => {
    const { container } = render(<VolumeFrame item={{ id: 'f', type: 1, title: 'X' }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-spine]')).not.toBeNull();
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

  it('is decorative to assistive technology — the title beside it already names the item', () => {
    render(<VolumeFrame item={bookWithArt} />);
    expect(screen.getByRole('presentation')).toHaveAttribute('alt', '');
  });

  it('takes the hero size on the inverted cover, ruled in paper', () => {
    const { container } = render(<VolumeFrame hero item={{ id: 'f', type: 1, title: 'X' }} />);
    expect(container.firstChild.className).toContain('border-paper');
    expect(container.querySelector('[data-spine]').className).toContain('bg-paper');
  });
});
