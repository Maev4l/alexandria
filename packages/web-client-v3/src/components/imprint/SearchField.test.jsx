import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SearchField from './SearchField.jsx';

// Both of these were reported from the deployed app, on the most-tapped control in the product.
const Probe = () => {
  const location = useLocation();
  return <p>{`at:${location.pathname}${location.search}`}</p>;
};

const renderLauncher = () =>
  render(
    <MemoryRouter initialEntries={['/libraries']}>
      <SearchField />
      <Routes>
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('SearchField', () => {
  // "when I click on search there is somehow a zoom". Mobile Safari zooms the page when a focused
  // input's font-size is under 16px. `Field.jsx` has set `text-base` for exactly this reason since
  // it was written; the reason never reached here, and the type-scale guard could not help because
  // its exception was recorded as a property of that FILE rather than of inputs — so 13px here was
  // on the scale and passed.
  it('sets 16px, the size below which Mobile Safari zooms on focus', () => {
    renderLauncher();
    expect(screen.getByRole('searchbox')).toHaveClass('text-base');
  });

  // "I have to type the search string, then done on the keyboard, and then on the icon on the
  // right of the search field to trigger the search" — three steps for one intent, because the
  // virtual keyboard offered "Done", which only dismisses.
  it('asks the virtual keyboard for a search action, not a dismiss key', () => {
    renderLauncher();
    expect(screen.getByRole('searchbox')).toHaveAttribute('enterkeyhint', 'search');
  });

  // The hint changes the KEY; this is the part that makes pressing it do something. Asserted
  // separately because a label promising an action on a control that does not act is worse than
  // the "Done" it replaced.
  it('navigates on Enter, carrying what was typed', async () => {
    renderLauncher();
    await userEvent.type(screen.getByRole('searchbox'), 'chandler{Enter}');
    expect(await screen.findByText('at:/search?q=chandler')).toBeInTheDocument();
  });

  it('opens the surface with no query when Enter is pressed on an empty field', async () => {
    renderLauncher();
    await userEvent.type(screen.getByRole('searchbox'), '{Enter}');
    expect(await screen.findByText('at:/search')).toBeInTheDocument();
  });

  // Layout gaps between blocks are whole divisions, always. The division is 8px, and `mt-3` is
  // 12px — 1.5 divisions. The only layout-scale gap in the app that was off the scale, on the
  // loudest mark in the design.
  it('sits a whole division from the block above it', () => {
    const { container } = renderLauncher();
    expect(container.querySelector('.field-control').className).toContain('mt-4');
  });
});
