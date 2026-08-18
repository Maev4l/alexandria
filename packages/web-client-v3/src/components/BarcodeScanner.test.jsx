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
});
