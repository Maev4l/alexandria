import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LibraryRow from './LibraryRow.jsx';

const owned = { id: 'lib-1', name: 'Fiction', totalItems: 412, sharedTo: [] };
const sharedOut = { ...owned, sharedTo: ['a@b.c', 'd@e.f'] };
const sharedIn = { id: 'lib-2', name: 'Polars', totalItems: 96, sharedFrom: 'Marie' };

const renderRow = (library, props = {}) =>
  render(
    <MemoryRouter>
      <LibraryRow library={library} {...props} />
    </MemoryRouter>,
  );

describe('LibraryRow', () => {
  it('puts the item count in the plate, because totalItems is a real quantity', () => {
    renderRow(owned);
    expect(screen.getByText('412')).toBeInTheDocument();
  });

  it('holds the plate in a fixed column so titles share one left edge', () => {
    renderRow(owned);
    // Plates sized to their content make the list ragged: 412 and 77 would start their
    // titles at different x positions.
    expect(screen.getByText('412').className).toContain('min-w-14');
  });

  it('does not uppercase the library name', () => {
    renderRow({ ...owned, name: 'Bandes dessinées' });
    expect(screen.getByText('Bandes dessinées').className).not.toContain('uppercase');
  });

  it('states outbound sharing in words as well as colour', () => {
    renderRow(sharedOut);
    expect(screen.getByText(/shared · 2/i)).toBeInTheDocument();
  });

  it('names the owner on a library shared with me', () => {
    renderRow({ ...sharedIn, sharedFrom: 'marie@example.com' });
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText(/marie@example\.com/)).toBeInTheDocument();
  });

  it('leaves the owner address in its own case, because an address is content', () => {
    renderRow({ ...sharedIn, sharedFrom: 'marie@example.com' });
    // §3: interface labels are uppercase, content never is. An email is content.
    expect(screen.getByText(/marie@example\.com/).className).not.toContain('uppercase');
  });

  it('declares read-only by absence rather than by printing the words', () => {
    renderRow(sharedIn);
    // Read-only is declared by the green FROM tag and by the absent row actions, not by
    // printing the words as well — that would say one fact three times.
    expect(screen.queryByText(/read only/i)).toBeNull();
    expect(screen.getByText(/from/i)).toBeInTheDocument();
  });

  it('carries the green left edge only when sharing is involved', () => {
    const { container: plain } = renderRow(owned);
    expect(plain.querySelector('[data-edge]')).toBeNull();

    const { container: shared } = renderRow(sharedOut);
    expect(shared.querySelector('[data-edge="shared"]')).not.toBeNull();
  });

  it('draws that edge without displacing the row, so rows stay aligned down the stream', () => {
    // border-left would add to the box and push marked rows 4px right of unmarked ones.
    const { container } = renderRow(sharedOut);
    expect(container.firstChild.className).not.toMatch(/\bborder-l-4\b/);
    expect(container.querySelector('[data-edge="shared"]').className).toContain('absolute');
  });

  it('links to the library', () => {
    renderRow(owned);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/libraries/lib-1');
  });

  it('offers a visible actions affordance when actions are available', () => {
    renderRow(owned, { onActions: () => {} });
    // Long-press alone is undiscoverable, so it is always duplicated by something visible.
    expect(screen.getByRole('button', { name: /actions for fiction/i })).toBeInTheDocument();
  });

  it('omits the actions affordance entirely on a read-only row', () => {
    renderRow(sharedIn);
    expect(screen.queryByRole('button', { name: /actions/i })).toBeNull();
  });
});
