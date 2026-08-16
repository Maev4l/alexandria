import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Search from './Search.jsx';

// DEFECT (critique P0 #1): this screen used to render `<AppHeader wordmark search={false} />`
// with no `onBack` and no back mark — reached from the loudest control in the whole design (the
// chrome-yellow Search Field), it was a dead end. Installed as a PWA in standalone mode there is
// no browser chrome to escape with, so a one-handed reader mid-lookup was stranded. These tests
// pin the fix directly on the component; scripts/reachability.test.jsx pins it end-to-end from
// the actual affordances that route here.
const renderAt = (from) =>
  render(
    <MemoryRouter initialEntries={[from, '/search']} initialIndex={1}>
      <Routes>
        <Route path="/search" element={<Search />} />
        <Route path={from} element={<p>Back where the reader started</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('Search (stub)', () => {
  it('has a landmark and a heading, even though the surface is not built yet', () => {
    renderAt('/libraries');
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
  });

  it('says honestly that it is not built, rather than rendering empty', () => {
    renderAt('/libraries');
    expect(screen.getByText(/arrives next/i)).toBeInTheDocument();
  });

  it('offers a real way back — the loudest control in the app must never dead-end', async () => {
    renderAt('/libraries');
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByText('Back where the reader started')).toBeInTheDocument();
  });

  it('does not carry the root wordmark — this is a destination, not the root', () => {
    renderAt('/libraries');
    expect(screen.queryByText('Alexandria')).toBeNull();
  });
});
