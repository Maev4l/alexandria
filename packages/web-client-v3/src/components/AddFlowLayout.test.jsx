import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetCameraStreamForTests, acquireCameraStream } from '@/lib/cameraStream.js';
import AddFlowLayout from './AddFlowLayout.jsx';

const makeStream = () => {
  const track = { readyState: 'live', stop: vi.fn() };
  return { getTracks: () => [track], getVideoTracks: () => [track], track };
};

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/libraries/lib-1/add/book']}>
      <Routes>
        <Route element={<AddFlowLayout />}>
          <Route path="/libraries/:libraryId/add/book" element={<p>capture</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
};

let originalMediaDevices;

beforeEach(() => {
  __resetCameraStreamForTests();
  originalMediaDevices = navigator.mediaDevices;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => makeStream()) },
  });
});

afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  vi.useRealTimers();
});

describe('AddFlowLayout owns the camera for exactly the flow\'s lifetime', () => {
  it('releases the shared stream when the app goes to the background', async () => {
    renderLayout();
    const stream = await acquireCameraStream();
    setVisibility('hidden');
    // The condition that makes the trade defensible: the camera is open while the reader is in
    // the flow AND the app is in front of them, not merely until they leave the flow.
    expect(stream.track.stop).toHaveBeenCalled();
  });

  it('releases the shared stream when the reader leaves the flow', async () => {
    vi.useFakeTimers();
    const { unmount } = renderLayout();
    const acquired = acquireCameraStream();
    await vi.advanceTimersByTimeAsync(0);
    const stream = await acquired;
    unmount();
    // Deferred by one macrotask so a StrictMode remount can cancel it — see the source. The
    // deferral is not a grace window; nothing perceivable happens in that tick.
    expect(stream.track.stop).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(stream.track.stop).toHaveBeenCalled();
  });

  it('does not release across an unmount that is immediately followed by a mount', async () => {
    vi.useFakeTimers();
    const first = renderLayout();
    const acquired = acquireCameraStream();
    await vi.advanceTimersByTimeAsync(0);
    const stream = await acquired;

    // StrictMode's double-invoke, reproduced as the sequence it actually produces. An immediate
    // release here stopped the stream the first mount had just acquired and forced a second
    // getUserMedia — the fix reintroducing, through its own teardown, the exact cost it removes.
    first.unmount();
    renderLayout();
    await vi.advanceTimersByTimeAsync(0);

    expect(stream.track.stop).not.toHaveBeenCalled();
  });
});
