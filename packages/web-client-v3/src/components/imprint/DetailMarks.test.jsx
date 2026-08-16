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
    // Accessibility is parity, not a shorter summary (round 5 critique #4): the announced name
    // carries the same duration the visible label does, in the same sentence shape the ruling
    // specified — "for N days", not a comma splice.
    expect(screen.getByLabelText('On loan to Marie for 6 days')).toHaveTextContent(
      /out · marie · 6 days/i,
    );
  });

  it('renders nothing when there is no library, no sharing and no loan', () => {
    const { container } = renderMarks({ library: null });
    expect(container.firstChild).toBeNull();
  });

  // Round 5 critique #2: at one uniform gap, IN/SHARED (facts about the LIBRARY) and the stamp
  // (a fact about the ITEM) read as one list, and "SHARED · 2" landed as though the book itself
  // were shared with two people. The fix groups the two library facts on the division scale's
  // OWN 8px unit (gap-2) and doubles the space before the stamp to 16px (gap-4), so the grouping
  // is expressed in the gap itself rather than a label.
  it('groups the library facts at one division apart, and doubles the gap before the stamp', () => {
    const { container } = render(
      <MemoryRouter>
        <DetailMarks
          item={{ ...item, lentTo: 'Marie' }}
          library={{ name: 'Fiction', sharedTo: ['marie@example.com'] }}
          loans={[{ open: true, days: 6 }]}
        />
      </MemoryRouter>,
    );
    const outerColumn = container.firstChild;
    expect(outerColumn.className).toContain('gap-4');
    const libraryFactsGroup = outerColumn.querySelector('[data-mark="in"]').closest('div');
    expect(libraryFactsGroup.className).toContain('gap-2');
    expect(libraryFactsGroup.className).not.toContain('gap-4');
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
