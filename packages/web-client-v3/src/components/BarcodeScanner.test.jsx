import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { __resetCameraStreamForTests } from '@/lib/cameraStream.js';
import BarcodeScanner from './BarcodeScanner.jsx';

// LAYER 1 of the three the task brief names: the state machine — permission requested/denied,
// scanning, a decoded result, and stopping the stream on unmount. The decoder itself sits behind
// a fake here (this file), so every transition can be driven deterministically with no camera
// present. LAYER 2 (the real `@zxing` call against a committed still image of a known barcode)
// is NOT covered by this suite or any other in this task: no such fixture image exists in this
// repo, and fabricating a byte-valid EAN-13 raster under this task's time budget would be
// pretending to cover a layer this file cannot actually reach — see the task-18 report for the
// honest accounting. LAYER 3 (the live camera on a real device) is manual-only and not asserted
// anywhere in this codebase.
// `decodeFromVideoElement`, not `decodeFromVideoElement`: the component no longer opens the
// device at all. It borrows the shared lease (lib/cameraStream.js), attaches that stream to its
// own <video>, and asks zxing only to scan an element it already owns — which is what lets the
// stream outlive a remount instead of being re-requested on every item of a cataloguing session.
const decodeFromVideoElementMock = vi.fn();

// A real `function`, not an arrow, so `new BrowserMultiFormatReader(...)` — exactly how the
// component constructs it — has something constructible to call. Named differently from the
// mocked export itself so it does not shadow the `BrowserMultiFormatReader` imported below for
// the constructor-call assertions.
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn(function FakeBrowserMultiFormatReader() {
    this.decodeFromVideoElement = decodeFromVideoElementMock;
  }),
}));

// A minimal stand-in for the two enums BarcodeScanner reads by name — real values would work
// identically, but pinning them to plain strings here makes the hint-restriction assertion below
// read directly, with no dependency on @zxing/library's real numeric encoding.
vi.mock('@zxing/library', () => ({
  BarcodeFormat: { EAN_13: 'EAN_13', EAN_8: 'EAN_8' },
  DecodeHintType: { POSSIBLE_FORMATS: 'POSSIBLE_FORMATS' },
}));

describe('BarcodeScanner — the state machine', () => {
  let originalMediaDevices;

  beforeEach(() => {
    decodeFromVideoElementMock.mockReset();
    vi.mocked(BrowserMultiFormatReader).mockClear();
    // The lease caches its stream in module scope, so it must be reset between specs or one
    // test's open camera answers the next test's acquire and the requesting state never appears.
    __resetCameraStreamForTests();
    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      // A stand-in stream: this suite never reads it, it only has to be something the lease can
      // cache and hand to the component's <video>.
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [], getVideoTracks: () => [{ readyState: 'live', stop: vi.fn() }] })) },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
  });

  it('calls onError immediately with no camera API at all, and renders nothing', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    const onError = vi.fn();
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={onError} />);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('NotSupportedError');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a requesting caption before permission resolves — no decoration, plain text', () => {
    decodeFromVideoElementMock.mockReturnValue(new Promise(() => {})); // never settles in this test
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(screen.getByText(/requesting camera access/i)).toBeInTheDocument();
  });

  it('drops the requesting caption once scanning starts, adding nothing in its place', async () => {
    decodeFromVideoElementMock.mockResolvedValue({ stop: vi.fn() });
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    await waitFor(() =>
      expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument(),
    );
    // No reticle, scan line, corner bracket or any other mark — only the video element the
    // component itself owns.
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    await waitFor(() => expect(container.querySelectorAll('video')).toHaveLength(1));
    expect(container.querySelectorAll('svg, canvas')).toHaveLength(0);
  });

  // The Volume Frame's own fill was retired for the same
  // reason — "a filled rectangle where an image belongs reads as a failed image" — and this box
  // is waiting for a live picture the same way. The rule alone describes it.
  it('is a ruled box with no fill, before the stream attaches', () => {
    decodeFromVideoElementMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(container.firstChild.className).not.toContain('bg-paper-deep');
    expect(container.firstChild.className).not.toMatch(/\bbg-(?!transparent)/);
  });

  it('reports a decoded result through onCode and ignores frames with no result', async () => {
    let capturedCallback;
    decodeFromVideoElementMock.mockImplementation((_video, callback) => {
      capturedCallback = callback;
      return Promise.resolve({ stop: vi.fn() });
    });
    const onCode = vi.fn();
    render(<BarcodeScanner onCode={onCode} onError={() => {}} />);
    await waitFor(() => expect(capturedCallback).toBeDefined());

    act(() => capturedCallback(undefined, new Error('NotFoundException')));
    expect(onCode).not.toHaveBeenCalled();

    act(() => capturedCallback({ getText: () => '9782070408504' }, undefined));
    expect(onCode).toHaveBeenCalledWith('9782070408504');
    expect(onCode).toHaveBeenCalledTimes(1);
  });

  it('moves to denied and calls onError when the browser refuses permission, rendering nothing', async () => {
    const onError = vi.fn();
    // The refusal arrives from `getUserMedia` now — the component asks the lease for a stream and
    // the lease asks the browser. The decoder is never reached at all on this path.
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new Error('NotAllowedError'));
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0].message).toBe('NotAllowedError');
    expect(container).toBeEmptyDOMElement();
  });

  it('stops the stream on unmount — an abandoned camera is a battery/privacy problem, not a leak', async () => {
    const stop = vi.fn();
    decodeFromVideoElementMock.mockResolvedValue({ stop });
    const { unmount } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    await waitFor(() => expect(BrowserMultiFormatReader).toHaveBeenCalledTimes(1));
    expect(stop).not.toHaveBeenCalled();
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops a decode that resolves AFTER the component has already unmounted', async () => {
    const stop = vi.fn();
    let resolveDecode;
    decodeFromVideoElementMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDecode = resolve;
      }),
    );
    const { unmount } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    // Wait until the decode has actually STARTED before unmounting. Acquiring the shared stream
    // is itself a microtask now, so unmounting immediately after render lands in the window
    // BEFORE the decode begins — a different case, covered by its own test below.
    await waitFor(() => expect(decodeFromVideoElementMock).toHaveBeenCalledTimes(1));
    unmount();
    resolveDecode({ stop });
    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  // The new window the shared lease opens, and the reason the test above had to grow a wait:
  // between mount and the stream arriving, there is a span in which no decode exists yet.
  // Unmounting there must leave nothing running — and must NOT stop the shared stream, which
  // belongs to the flow rather than to this component and may be feeding the next screen.
  it('starts no decode at all when unmounted before the shared stream arrives', async () => {
    const track = { readyState: 'live', stop: vi.fn() };
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(
      async () => ({ getTracks: () => [track], getVideoTracks: () => [track] }),
    );
    const { unmount } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    unmount();
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());
    expect(decodeFromVideoElementMock).not.toHaveBeenCalled();
    expect(track.stop).not.toHaveBeenCalled();
  });

  // The geometry task's barcode-frame reshape: full column width, fixed height. This component
  // decodes off the fake `decodeFromVideoElement`, which never reads the video element's CSS at
  // all — so this assertion is necessarily about layout, not decoding; the "decoding is
  // unaffected" half of the claim is structural (§ the source comment) rather than something
  // this suite can exercise, since nothing here ever measured decode success against box size.
  //
  // Pin the HEIGHT, not a width: a full-width frame's width is a consequence of the column it
  // sits in, so asserting it would just re-test `w-full`. The height is the actual decision —
  // 192px (24 divisions) replacing the old `aspect-[2/3]`.
  //
  // 192 rather than the 416 this first shipped with, and the reason is measured rather than
  // judged: at a 667-tall viewport the 416 frame pushed the document to 772px and the manual
  // escape to a bottom of 756, so the fallback path sat below the fold on a small phone. At 192
  // the document is exactly 667 and the escape ends at 532 — the whole screen fits on EVERY
  // phone rather than only the large ones. It also matches web-client-v2's own scanner
  // (`h-48 w-full max-w-xs`), which is where the height came from: the previous v2 is an
  // anti-reference for IDENTITY, not for what a viewfinder has to physically fit into.
  it('sets a fixed 192px height instead of the old 2:3 aspect ratio', () => {
    decodeFromVideoElementMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(container.firstChild.className).toContain('h-48');
    expect(container.firstChild.className).not.toContain('aspect-[2/3]');
    expect(container.firstChild.className).not.toContain('max-w-[140px]');
  });

  // Named for what it asserts, not for a box size that has since changed: this test was written
  // when the frame was halved, and the frame is now full-width at a fixed height. The zoom and
  // the clipping are what it checks, and both outlive any particular geometry.
  it('zooms the feed and clips it so it never escapes the ruled frame', () => {
    decodeFromVideoElementMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(container.firstChild.className).toContain('overflow-hidden');
    const video = container.querySelector('video');
    expect(video.className).toMatch(/\bscale-\d+\b/);
  });

  it('restricts decoding to EAN-13 and EAN-8 only, not the reader\'s full multi-format default', () => {
    decodeFromVideoElementMock.mockReturnValue(new Promise(() => {}));
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(BrowserMultiFormatReader).toHaveBeenCalledTimes(1);
    const hints = BrowserMultiFormatReader.mock.calls[0][0];
    expect(hints.get('POSSIBLE_FORMATS')).toEqual(['EAN_13', 'EAN_8']);
  });

  // The reported bug, reproduced the way production produced it: React double-invokes mount
  // effects under StrictMode (mount -> cleanup -> mount).
  //
  // THE INVARIANT CHANGED WITH THE MECHANISM, and the test says so rather than keeping an
  // assertion whose premise has gone. The original failure was zxing's: `decodeFromConstraints`
  // owned the stream, both runs raced to attach `srcObject` to the same shared <video>, and the
  // discarded run's late `stop()` called `cleanVideoSource()` — nulling the element's source out
  // from under the run that survived. Live LED, sourceless element, nothing decoding. It was
  // fixed by serialising the two attempts behind a chain promise.
  //
  // That window no longer exists. The component borrows the shared lease instead of opening the
  // device, so cleanup — synchronous, in the same commit — always fires while the discarded run
  // is still awaiting its stream, and that run returns without ever reaching the decoder. There
  // is nothing to serialise, and `decodeFromVideoElement` registers no finalizer, so `stop()`
  // cannot touch the stream or the element either. The chain was therefore removed rather than
  // kept as a guard against a failure the file can no longer produce.
  //
  // So what is asserted is what remains true and is worth holding: the double-invoke leaves
  // EXACTLY ONE decode running, and it belongs to the surviving run.
  it('leaves exactly one decode running through a StrictMode double-invoke', async () => {
    const controlsByCall = [];
    decodeFromVideoElementMock.mockImplementation(() => {
      const controls = { stop: vi.fn() };
      controlsByCall.push(controls);
      return Promise.resolve(controls);
    });

    render(
      <StrictMode>
        <BarcodeScanner onCode={() => {}} onError={() => {}} />
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument(),
    );

    expect(controlsByCall).toHaveLength(1);
    expect(controlsByCall[0].stop).not.toHaveBeenCalled();
  });
});

// A decode is automatic — no tap acknowledges it the way a shutter press does — so a slow lookup
// left the reader with no sign the code was ever read at all, and the frame kept looking exactly
// like it was still scanning. This narrates BOTH facts the reader is missing: a code WAS read, and
// a lookup is now running for it. That is two facts, not one, which is what distinguishes this
// text from CoverCapture's single-fact "Looking up this cover" — a shutter tap is already
// self-acknowledging, an automatic decode is not (see CoverCapture.test.jsx's mirror suite).
describe('BarcodeScanner — narrating a lookup in flight', () => {
  let originalMediaDevices;

  beforeEach(() => {
    decodeFromVideoElementMock.mockReset().mockResolvedValue({ stop: vi.fn() });
    vi.mocked(BrowserMultiFormatReader).mockClear();
    // The lease caches its stream in module scope, so it must be reset between specs or one
    // test's open camera answers the next test's acquire and the requesting state never appears.
    __resetCameraStreamForTests();
    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      // A stand-in stream: this suite never reads it, it only has to be something the lease can
      // cache and hand to the component's <video>.
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [], getVideoTracks: () => [{ readyState: 'live', stop: vi.fn() }] })) },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
  });

  it('says nothing while no lookup is in flight, once scanning', async () => {
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} busy={false} />);
    await waitFor(() =>
      expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/looking it up/i)).not.toBeInTheDocument();
  });

  it('narrates both that a code was read AND that a lookup is running, once scanning and busy', async () => {
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} busy />);
    await waitFor(() => expect(screen.getByText(/code read/i)).toBeInTheDocument());
    // Both facts in the SAME node — a test asserting only "some caps text appears" would pass on
    // a film-style single-fact string too, and would miss the entire reason the two differ.
    const node = screen.getByText(/code read/i);
    expect(node).toHaveTextContent(/code read/i);
    expect(node).toHaveTextContent(/looking it up/i);
  });

  it('does not narrate a lookup before the stream has attached, even if busy is set early', () => {
    decodeFromVideoElementMock.mockReturnValue(new Promise(() => {})); // never settles
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} busy />);
    // Still in `requesting` — there is no scanning frame yet to narrate a lookup against.
    expect(screen.queryByText(/code read/i)).not.toBeInTheDocument();
  });
});
