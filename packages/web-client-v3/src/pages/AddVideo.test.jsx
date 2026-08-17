import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AddVideo from './AddVideo.jsx';

// Prints the query and confirms there is no router state at all — the shape of a cold load
// (a fresh tab, a deep link, a PWA restart resuming this exact URL), which is exactly the case
// this control must survive.
const LocationProbe = () => {
  const location = useLocation();
  return (
    <p>
      state:{location.state === null ? 'none' : JSON.stringify(location.state)} search:
      {location.search || 'none'}
    </p>
  );
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/libraries/:libraryId/add/video" element={<AddVideo />} />
        <Route
          path="/libraries/:libraryId/items/new/video"
          element={<LocationProbe />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('AddVideo', () => {
  it('offers a manual escape, since this stub has no other way to add a film yet — the bug this fixes', () => {
    renderAt('/libraries/lib-1/add/video');
    expect(screen.getByRole('button', { name: /enter by hand/i })).toBeInTheDocument();
  });

  it('carries the collection from its own query into the manual escape', async () => {
    renderAt('/libraries/lib-1/add/video?collectionId=c1');
    await userEvent.click(screen.getByRole('button', { name: /enter by hand/i }));
    expect(screen.getByText('state:none search:?collectionId=c1')).toBeInTheDocument();
  });

  it('sends no query at all with no collection on its own URL', async () => {
    renderAt('/libraries/lib-1/add/video');
    await userEvent.click(screen.getByRole('button', { name: /enter by hand/i }));
    expect(screen.getByText('state:none search:none')).toBeInTheDocument();
  });
});
