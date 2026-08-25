import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetCameraStreamForTests,
  acquireCameraStream,
  releaseCameraStream,
} from './cameraStream.js';

const makeTrack = () => {
  const track = { readyState: 'live', stop: vi.fn() };
  track.stop.mockImplementation(() => {
    track.readyState = 'ended';
  });
  return track;
};

const makeStream = () => {
  const track = makeTrack();
  return { getTracks: () => [track], getVideoTracks: () => [track], track };
};

let getUserMedia;
let originalMediaDevices;

beforeEach(() => {
  __resetCameraStreamForTests();
  getUserMedia = vi.fn(async () => makeStream());
  originalMediaDevices = navigator.mediaDevices;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
});

afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: originalMediaDevices,
  });
});

describe('the shared camera lease', () => {
  it('opens the device once and hands the same stream to every later caller', async () => {
    const first = await acquireCameraStream();
    const second = await acquireCameraStream();
    // The whole point: a save remounts the capture screen, and a remount must re-attach rather
    // than re-request. Ten items used to mean ten device-open-and-refocus cycles.
    expect(second).toBe(first);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('does not open the device twice for two overlapping callers', async () => {
    const [a, b] = await Promise.all([acquireCameraStream(), acquireCameraStream()]);
    // React StrictMode double-invokes mount effects in development, so two acquires genuinely do
    // race on the first mount. Both must land on one request.
    expect(a).toBe(b);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('stops every track on release, so the camera is actually off', async () => {
    const stream = await acquireCameraStream();
    releaseCameraStream();
    expect(stream.track.stop).toHaveBeenCalled();
  });

  it('re-requests after a release rather than handing back a stopped stream', async () => {
    const first = await acquireCameraStream();
    releaseCameraStream();
    const second = await acquireCameraStream();
    expect(second).not.toBe(first);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('stops a stream that arrives AFTER the flow was released', async () => {
    let settle;
    getUserMedia.mockImplementationOnce(() => new Promise((resolve) => { settle = resolve; }));
    const inFlight = acquireCameraStream();
    releaseCameraStream();

    const stream = makeStream();
    settle(stream);
    await expect(inFlight).resolves.toBeNull();
    // Without the generation check this stream would have landed in the cache after the release
    // that was meant to stop it: a live camera nobody holds, and nothing left to turn it off.
    expect(stream.track.stop).toHaveBeenCalled();
  });

  it('re-requests when the cached stream\'s tracks have died', async () => {
    const first = await acquireCameraStream();
    // The OS reclaimed the device, or another app took it. Handing this back would attach a dead
    // stream to a live element and show a permanently black frame with no error anywhere.
    first.track.readyState = 'ended';
    const second = await acquireCameraStream();
    expect(second).not.toBe(first);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('lets a rejection through and does not cache it', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'));
    await expect(acquireCameraStream()).rejects.toThrow('NotAllowedError');
    // A denial must not poison the lease: the reader can grant permission and try again.
    getUserMedia.mockImplementationOnce(async () => makeStream());
    await expect(acquireCameraStream()).resolves.not.toBeNull();
  });
});
