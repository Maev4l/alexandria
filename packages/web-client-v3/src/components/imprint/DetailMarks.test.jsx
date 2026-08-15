import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DetailMarks from './DetailMarks.jsx';

const item = { id: 'x', libraryId: 'lib-fiction', title: 'Le Grand Sommeil' };

const renderMarks = (props) =>
  render(
    <MemoryRouter>
      <DetailMarks item={item} {...props} />
    </MemoryRouter>,
  );

describe('DetailMarks', () => {
  it('links IN <library> to the library, and never uppercases the authored name', () => {
    renderMarks({ library: { name: 'Fiction', sharedTo: [] } });
    const link = screen.getByRole('link', { name: 'Fiction' });
    expect(link).toHaveAttribute('href', '/libraries/lib-fiction');
    expect(link.className).not.toContain('uppercase');
  });

  it('shows the sharing mark outbound as SHARED · N, on a green edge', () => {
    const { container } = renderMarks({
      library: { name: 'Fiction', sharedTo: ['marie@example.com', 'paul@example.com'] },
    });
    expect(screen.getByText(/shared · 2/i)).toBeInTheDocument();
    expect(container.querySelector('.bg-shared')).not.toBeNull();
  });

  it('shows the sharing mark inbound as FROM <owner>, owner never uppercased', () => {
    renderMarks({ library: { name: 'Polars', sharedFrom: 'marie@example.com' } });
    expect(screen.getByText(/from/i)).toBeInTheDocument();
    const owner = screen.getByText('marie@example.com');
    expect(owner.className).toContain('normal-case');
  });

  it('shows no stamp for an item that is not lent', () => {
    renderMarks({ library: { name: 'Fiction', sharedTo: [] }, loans: [] });
    expect(screen.queryByLabelText(/on loan/i)).toBeNull();
  });

  it('carries the stamp here — not under the title rule — with the borrower and duration', () => {
    render(
      <MemoryRouter>
        <DetailMarks
          item={{ ...item, lentTo: 'Marie' }}
          library={{ name: 'Fiction', sharedTo: [] }}
          loans={[{ open: true, days: 6 }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('On loan to Marie')).toHaveTextContent(/out · marie · 6 days/i);
  });

  it('renders nothing when there is no library, no sharing and no loan', () => {
    const { container } = renderMarks({ library: null });
    expect(container.firstChild).toBeNull();
  });

  it('does not displace the sharing text with its own edge rule', () => {
    // §6: an edge rule never displaces content. The edge is an absolutely positioned sibling
    // hanging into the column's own padding-left, never a border on the text itself — a border
    // would add to the box and shove SHARED right of IN/OUT beside it (the regression the
    // design session's first `border-left` attempt produced).
    const { container } = renderMarks({
      library: { name: 'Fiction', sharedTo: ['marie@example.com'] },
    });
    const textNode = container.querySelector('[data-mark="shared"]');
    const wrapper = textNode.closest('span.relative');
    const edge = wrapper.querySelector('[aria-hidden]');
    expect(edge).not.toBeNull();
    expect(edge.className).toContain('absolute');
    expect(textNode.className).not.toContain('border-l');
  });
});
