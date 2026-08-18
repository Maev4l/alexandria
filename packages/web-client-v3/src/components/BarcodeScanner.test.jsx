import { StrictMode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserMultiFormatReader } from '@zxing/browser';
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
const decodeFromConstraintsMock = vi.fn();

// A real `function`, not an arrow, so `new BrowserMultiFormatReader(...)` — exactly how the
// component constructs it — has something constructible to call. Named differently from the
// mocked export itself so it does not shadow the `BrowserMultiFormatReader` imported below for
// the constructor-call assertions.
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn(function FakeBrowserMultiFormatReader() {
    this.decodeFromConstraints = decodeFromConstraintsMock;
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
    decodeFromConstraintsMock.mockReset();
    vi.mocked(BrowserMultiFormatReader).mockClear();
    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
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
    decodeFromConstraintsMock.mockReturnValue(new Promise(() => {})); // never settles in this test
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(screen.getByText(/requesting camera access/i)).toBeInTheDocument();
  });

  it('drops the requesting caption once scanning starts, adding nothing in its place', async () => {
    decodeFromConstraintsMock.mockResolvedValue({ stop: vi.fn() });
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

  // Fix round 1, finding 4: DESIGN.md §5 retired a filled empty Volume Frame for the same
  // reason — "a filled rectangle where an image belongs reads as a failed image" — and this box
  // is waiting for a live picture the same way. The rule alone describes it.
  it('is a ruled box with no fill, before the stream attaches', () => {
    decodeFromConstraintsMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(container.firstChild.className).not.toContain('bg-paper-deep');
    expect(container.firstChild.className).not.toMatch(/\bbg-(?!transparent)/);
  });

  it('reports a decoded result through onCode and ignores frames with no result', async () => {
    let capturedCallback;
    decodeFromConstraintsMock.mockImplementation((_constraints, _video, callback) => {
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
    decodeFromConstraintsMock.mockRejectedValue(new Error('NotAllowedError'));
    const { container } = render(<BarcodeScanner onCode={() => {}} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0].message).toBe('NotAllowedError');
    expect(container).toBeEmptyDOMElement();
  });

  it('stops the stream on unmount — an abandoned camera is a battery/privacy problem, not a leak', async () => {
    const stop = vi.fn();
    decodeFromConstraintsMock.mockResolvedValue({ stop });
    const { unmount } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    await waitFor(() => expect(BrowserMultiFormatReader).toHaveBeenCalledTimes(1));
    expect(stop).not.toHaveBeenCalled();
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops a stream that resolves AFTER the component has already unmounted', async () => {
    const stop = vi.fn();
    let resolveDecode;
    decodeFromConstraintsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDecode = resolve;
      }),
    );
    const { unmount } = render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    unmount();
    resolveDecode({ stop });
    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  it('restricts decoding to EAN-13 and EAN-8 only, not the reader\'s full multi-format default', () => {
    decodeFromConstraintsMock.mockReturnValue(new Promise(() => {}));
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} />);
    expect(BrowserMultiFormatReader).toHaveBeenCalledTimes(1);
    const hints = BrowserMultiFormatReader.mock.calls[0][0];
    expect(hints.get('POSSIBLE_FORMATS')).toEqual(['EAN_13', 'EAN_8']);
  });

  // Reproduces the reported bug faithfully rather than by hand-rolled unmount/remount calls:
  // React double-invokes mount effects under StrictMode (mount -> cleanup -> mount), which is
  // exactly the production shape that exposed the race. `decodeFromConstraints` is async (it
  // awaits getUserMedia), so the cleanup between the two mounts fires while the FIRST run's
  // promise is still pending and its controls are not yet assigned — that gap is the whole bug.
  //
  // Real zxing's `stop()` calls `cleanVideoSource(videoElement)`, which unconditionally sets
  // `videoElement.srcObject = null` regardless of which run currently owns the element. Since
  // decodeFromConstraints is mocked here (no real <video>/MediaStream plumbing exists in jsdom),
  // `sharedVideoState.attached` stands in for that shared element's srcObject: each fake
  // `decodeFromConstraints` resolution "attaches" its own id to it (mirroring the library
  // assigning srcObject just before resolving), and each fake `stop()` unconditionally clears it
  // (mirroring cleanVideoSource) — so the assertion below observes the exact DOM-level side
  // effect the real component's serialization must prevent, not just its own internal refs.
  it('does not let a stale StrictMode remount clear the surviving run\'s stream', async () => {
    const sharedVideoState = { attached: null };
    const makeControls = (id) => ({
      stop: vi.fn(() => {
        sharedVideoState.attached = null;
      }),
      id,
    });

    let resolveFirst;
    let callCount = 0;
    const controlsByCall = {};
    decodeFromConstraintsMock.mockImplementation(() => {
      callCount += 1;
      const id = callCount === 1 ? 'A' : 'B';
      if (callCount === 1) {
        // Held open deliberately: this is the run StrictMode's cleanup discards while it is
        // still in flight, and it is resolved LATE — after that cleanup has already run — which
        // is the precise window the real bug lives in.
        return new Promise((resolve) => {
          resolveFirst = () => {
            sharedVideoState.attached = id;
            controlsByCall[id] = makeControls(id);
            resolve(controlsByCall[id]);
          };
        });
      }
      sharedVideoState.attached = id;
      controlsByCall[id] = makeControls(id);
      return Promise.resolve(controlsByCall[id]);
    });

    render(
      <StrictMode>
        <BarcodeScanner onCode={() => {}} onError={() => {}} />
      </StrictMode>,
    );

    // Let the discarded first run resolve late, after its own cleanup has already fired.
    resolveFirst();

    await waitFor(() => expect(decodeFromConstraintsMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument(),
    );

    // The invariant: whichever run survives must still own the shared element's stream — a
    // stale run's late stop() must never clear it.
    expect(sharedVideoState.attached).toBe('B');
    expect(controlsByCall.B.stop).not.toHaveBeenCalled();
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
    decodeFromConstraintsMock.mockReset().mockResolvedValue({ stop: vi.fn() });
    vi.mocked(BrowserMultiFormatReader).mockClear();
    originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
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
    decodeFromConstraintsMock.mockReturnValue(new Promise(() => {})); // never settles
    render(<BarcodeScanner onCode={() => {}} onError={() => {}} busy />);
    // Still in `requesting` — there is no scanning frame yet to narrate a lookup against.
    expect(screen.queryByText(/code read/i)).not.toBeInTheDocument();
  });
});
