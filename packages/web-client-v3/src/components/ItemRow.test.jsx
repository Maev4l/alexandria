import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ItemRow from './ItemRow.jsx';

const lentBook = {
  id: 'b1',
  type: 0,
  title: 'Le Grand Sommeil',
  authors: ['Raymond Chandler'],
  isbn: '9782070404209',
  lentTo: 'Marie',
  libraryId: 'lib-1',
};

const film = {
  id: 'f1',
  type: 1,
  title: 'Chinatown',
  directors: ['Roman Polanski'],
  releaseYear: 1974,
  duration: 130,
  libraryId: 'lib-1',
};

const renderRow = (item, props = {}) =>
  render(
    <MemoryRouter>
      <ItemRow item={item} libraryId="lib-1" {...props} />
    </MemoryRouter>,
  );

describe('ItemRow', () => {
  it('marks type in three ways, none of them colour', () => {
    const { container } = renderRow(film);
    expect(screen.getByText('Film')).toBeInTheDocument();
    expect(container.querySelector('[data-spine]')).not.toBeNull();
    expect(screen.getByText(/130′/)).toBeInTheDocument();
  });

  it('reads OUT alone on a row, never the borrower', () => {
    renderRow(lentBook);
    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(screen.queryByText(/marie/i)).toBeNull();
  });

  it('still names the state for assistive technology', () => {
    renderRow(lentBook);
    expect(screen.getByLabelText(/on loan/i)).toBeInTheDocument();
  });

  it('carries the red left edge only when the item is out, without displacing the row', () => {
    const { container: lent } = renderRow(lentBook);
    const edge = lent.querySelector('[data-edge="out"]');
    expect(edge).not.toBeNull();
    expect(edge.className).toContain('absolute');
    expect(lent.firstChild.className).not.toMatch(/\bborder-l-4\b/);

    const { container: home } = renderRow(film);
    expect(home.querySelector('[data-edge="out"]')).toBeNull();
  });

  it('does not uppercase the title', () => {
    renderRow(film);
    expect(screen.getByText('Chinatown').className).not.toContain('uppercase');
  });

  it('links to the item detail route', () => {
    renderRow(film);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/libraries/lib-1/items/f1');
  });

  it('offers a visible actions affordance when actions are available', () => {
    renderRow(film, { onActions: () => {} });
    expect(screen.getByRole('button', { name: /actions for chinatown/i })).toBeInTheDocument();
  });

  it('omits the actions affordance on a read-only library', () => {
    renderRow(film);
    expect(screen.queryByRole('button', { name: /actions/i })).toBeNull();
  });

  it('skips off-screen layout and paint, which is what holds a thousand items', () => {
    const { container } = renderRow(film);
    expect(container.firstChild.className).toContain('row-skip');
  });
});
