import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CollectionBoard from './CollectionBoard.jsx';

const board = {
  id: 'coll-melville',
  title: 'Melville',
  itemCount: 2,
  items: [
    { id: 'item-bob', type: 1, title: 'Bob le flambeur', order: 1, libraryId: 'lib-1' },
    { id: 'item-doulos', type: 1, title: 'Le Doulos', order: 2, libraryId: 'lib-1' },
  ],
};

const renderBoard = (props) =>
  render(
    <MemoryRouter>
      <CollectionBoard board={{ ...board, ...props }} libraryId="lib-1" />
    </MemoryRouter>,
  );

describe('CollectionBoard', () => {
  // SERIES ORDER was retired: every member already carries a numbered plate, and a numbered
  // sequence needs no caption saying it runs in sequence. An ordinary board states nothing
  // about its own ordering.
  it('carries no ordering caption on an ordinary board', () => {
    renderBoard({ partial: false });
    expect(screen.queryByText(/series order/i)).toBeNull();
    expect(screen.queryByText('Continues')).toBeNull();
  });

  // CONTINUES is the one label that survives, and it earns its place for a reason the member
  // plates don't cover: a first member reading e.g. `07` does not itself prove continuation,
  // because orders run 1-1000 and a collection need not start at 1. Pinned so it cannot be
  // deleted by momentum along with its two retired siblings.
  it('labels a partial board as Continues, and only a partial one', () => {
    renderBoard({ partial: true });
    expect(screen.getByText('Continues')).toBeInTheDocument();
  });

  it('still shows the board name and the member-count plate', () => {
    renderBoard({});
    expect(screen.getByText('Melville')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
