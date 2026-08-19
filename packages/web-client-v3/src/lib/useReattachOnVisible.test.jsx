import { useRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetCameraStreamForTests } from '@/lib/cameraStream.js';
import { useReattachOnVisible } from './useReattachOnVisible.js';

const makeStream = () => {
  const track = { readyState: 'live', stop: vi.fn() };
  return { getTracks: () => [track], getVideoTracks: () => [track] };
};

let onFailure;

const Probe = () => {
  const videoRef = useRef(null);
  useReattachOnVisible(videoRef, onFailure);
  return <video ref={videoRef} />;
};

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
};

let originalMediaDevices;

beforeEach(() => {
  __resetCameraStreamForTests();
  onFailure = vi.fn();
  originalMediaDevices = navigator.mediaDevices;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => makeStream()) },
  });
});

afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('re-attaching the shared camera on return from the background', () => {
  it('takes a fresh stream and attaches it when the app becomes visible', async () => {
    const { container } = render(<Probe />);
    const video = container.querySelector('video');
    expect(video.srcObject).toBeFalsy();

    setVisibility('visible');

    await waitFor(() => expect(video.srcObject).toBeTruthy());
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('does nothing on the way OUT — releasing is the flow layout\'s job, not this hook\'s', async () => {
    render(<Probe />);
    setVisibility('hidden');
    // Two responsibilities, deliberately split: the layout releases because it spans the whole
    // flow including the results screen, which has no <video> at all; this hook only re-attaches,
    // because only a component holding an element can.
    await Promise.resolve();
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('reports a permission revoked while backgrounded rather than leaving a dead frame', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new Error('NotAllowedError'));
    render(<Probe />);
    setVisibility('visible');
    await waitFor(() => expect(onFailure).toHaveBeenCalledTimes(1));
    expect(onFailure.mock.calls[0][0].message).toBe('NotAllowedError');
  });

  it('stops listening once unmounted, so a late return cannot open a camera nobody is showing', async () => {
    const { unmount } = render(<Probe />);
    unmount();
    setVisibility('visible');
    await Promise.resolve();
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });
});
