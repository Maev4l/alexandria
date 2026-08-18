import { forwardRef, useImperativeHandle } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoverCapture from './CoverCapture.jsx';

// LAYER 1 of the three the task brief names: the state machine — permission requested/denied,
// ready, and reporting a captured frame. `react-webcam` sits behind a fake here so every
// transition can be driven deterministically with no camera present.
//
// LAYER 2 (a "library binding" the way BarcodeScanner has one against a real decode call) does
// not really exist for this component: capturing a frame is a synchronous canvas draw+read with
// no external library or network call of its own — the actual OCR happens server-side, behind
// `detectionApi.video`, which is AddVideo's concern, not this component's. There is nothing
// client-side to bind against beyond what this file already drives through the fake — including
// the geometry maths below, which is plain arithmetic over `videoWidth`/`videoHeight`, not a
// call into any library.
//
// LAYER 3 (the live camera on a real device) is manual-only and not asserted anywhere in this
// codebase, identically to BarcodeScanner.
let latestProps;
// The underlying <video> element `webcamRef.current.video` resolves to (CoverCapture.jsx's own
// comment on why: `Webcam` is a class component whose instance ref exposes `this.video`
// directly). Mutable per test so the geometry suite can vary its intrinsic dimensions.
let fakeVideo;

vi.mock('react-webcam', () => ({
  default: forwardRef((props, ref) => {
    latestProps = props;
    useImperativeHandle(ref, () => ({ video: fakeVideo }));
    return <video data-testid="fake-webcam" />;
  }),
}));

// Canvas support is not implemented in jsdom, so `getContext`/`toDataURL` are stubbed here for
// every test in this file — including the geometry suite below, which additionally inspects
// `capturedCanvas` (the element `getContext` was called on) to assert its final width/height.
let drawImageMock;
let capturedCanvas;

const shootShutter = async () => {
  await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
};

const mockCanvas = () => {
  drawImageMock = vi.fn();
  capturedCanvas = undefined;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function mockGetContext() {
    capturedCanvas = this;
    return { drawImage: drawImageMock };
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/jpeg;base64,ZmFrZS1mcmFtZQ==',
  );
};

describe('CoverCapture — the state machine', () => {
  let originalMediaDevices;

  beforeEach(() => {
    latestProps = undefined;
    // A 1920x1080 sensor is wider than the 2:3 frame either way, so it crops but never fails —
    // the exact crop maths are the geometry suite's job, not this suite's.
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, clientWidth: 140, clientHeight: 210 };
    mockCanvas();
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
    vi.restoreAllMocks();
  });

  it('calls onError immediately with no camera API at all, and renders nothing', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    const onError = vi.fn();
    const { container } = render(<CoverCapture onCapture={() => {}} onError={onError} />);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('NotSupportedError');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a requesting caption before the stream attaches, and no shutter yet', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    expect(screen.getByText(/requesting camera access/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /look up this cover/i })).not.toBeInTheDocument();
  });

  it('is a ruled box with no fill, before the stream attaches', () => {
    const { container } = render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    const box = container.querySelector('.border-ink');
    expect(box.className).not.toContain('bg-paper-deep');
    expect(box.className).not.toMatch(/\bbg-(?!transparent)/);
  });

  // Change 3: halved from 280px now that capture is decoupled from this box's rendered size.
  it('halves the viewport to 140px, half of the original 280px', () => {
    const { container } = render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    const box = container.querySelector('.border-ink');
    expect(box.className).toContain('max-w-[140px]');
    expect(box.className).not.toContain('max-w-[280px]');
  });

  it('drops the requesting caption and shows the shutter once the stream attaches', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /look up this cover/i })).toBeInTheDocument();
  });

  it('adds no reticle, scan line or any other overlay — only the video and the shutter', () => {
    const { container } = render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    // The capture canvas is created off-DOM (`document.createElement('canvas')`, never
    // appended), so its existence must not show up here either.
    expect(container.querySelectorAll('svg, canvas')).toHaveLength(0);
  });

  it('reports a captured frame through onCapture with the data-URL prefix stripped', async () => {
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
    expect(drawImageMock).toHaveBeenCalled();
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });

  it('does nothing if the browser could not produce a frame yet', async () => {
    fakeVideo = { videoWidth: 0, videoHeight: 0 };
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
    expect(drawImageMock).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('moves to denied and calls onError when the browser refuses permission, rendering nothing', async () => {
    const onError = vi.fn();
    const { container } = render(<CoverCapture onCapture={() => {}} onError={onError} />);
    act(() => latestProps.onUserMediaError(new Error('NotAllowedError')));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('NotAllowedError');
  });

  it('asks for the environment-facing camera, not the front one', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    expect(latestProps.videoConstraints).toEqual({ facingMode: 'environment' });
    expect(latestProps.audio).toBe(false);
  });
});

// Change 1 of the geometry task: the two verified `react-webcam` defects this replaces were (1)
// sizing the capture off the rendered element width (~280px) instead of the sensor's intrinsic
// resolution, and (2) drawing the whole sensor frame while the preview shows only the centre crop
// `object-cover` selects. These assertions establish the PROPERTY the fix must hold — capture
// dimensions derive from `videoWidth`/`videoHeight` and the framed region, never from the
// element's client size — rather than pinning literal pixel values that would also pass on the
// bug (a test asserting `280` or `1280` would not have caught either defect).
describe('CoverCapture — capture geometry (what object-cover displays, at sensor resolution)', () => {
  let originalMediaDevices;

  beforeEach(() => {
    latestProps = undefined;
    mockCanvas();
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
    vi.restoreAllMocks();
  });

  it('crops the left/right edges when the sensor is relatively WIDER than the 2:3 frame', async () => {
    // 1920x1080 (aspect 1.778) is wider than 2:3 (0.667): object-cover keeps the full height
    // and crops the sides, centred.
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, clientWidth: 140, clientHeight: 210 };
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await shootShutter();

    expect(capturedCanvas.width).toBe(720); // 1080 * (2 / 3)
    expect(capturedCanvas.height).toBe(1080);
    expect(drawImageMock).toHaveBeenCalledWith(fakeVideo, 600, 0, 720, 1080, 0, 0, 720, 1080);
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });

  it('captures nothing when the frame has no rendered size yet, rather than NaN geometry', async () => {
    // The aspect is derived from the element's own rendered box, so a video that has not been
    // laid out yet (clientWidth/clientHeight still 0) would divide by zero and hand drawImage a
    // NaN source rect — which fails far more confusingly, and later, than declining to capture.
    // The shutter simply yields nothing and stays available, exactly as it does for a frame the
    // browser could not produce.
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, clientWidth: 0, clientHeight: 0 };
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await shootShutter();

    expect(drawImageMock).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('crops the top/bottom edges when the sensor is relatively TALLER than the 2:3 frame', async () => {
    // 480x1280 (aspect 0.375) is taller than 2:3 (0.667): object-cover keeps the full width and
    // crops top and bottom, centred.
    fakeVideo = { videoWidth: 480, videoHeight: 1280, clientWidth: 140, clientHeight: 210 };
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await shootShutter();

    expect(capturedCanvas.width).toBe(480);
    expect(capturedCanvas.height).toBe(720); // 480 / (2 / 3)
    expect(drawImageMock).toHaveBeenCalledWith(fakeVideo, 0, 280, 480, 720, 0, 0, 480, 720);
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });

  it('derives capture size from the INTRINSIC sensor resolution, not the ~280px rendered element', async () => {
    // The defect this replaces: react-webcam's default getCanvas() sizes off video.clientWidth,
    // never the sensor. A 4K sensor cropped to this frame's ratio must still yield a 4K-scale
    // crop — nowhere near 280 — proving the element's rendered size plays no part in the maths.
    fakeVideo = { videoWidth: 3840, videoHeight: 2160, clientWidth: 140, clientHeight: 210 };
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await shootShutter();

    expect(capturedCanvas.width).toBe(1440); // 2160 * (2 / 3)
    expect(capturedCanvas.height).toBe(2160);
    expect(capturedCanvas.width).not.toBe(280);
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });
});

// A shutter tap is self-acknowledging — the reader pressed something — so this owes only the ONE
// fact BarcodeScanner's automatic decode does not already give for free: that the lookup it
// started is still running. Deliberately a single-fact string, unlike the barcode viewport's two
// (see BarcodeScanner.test.jsx's mirror suite) — the asymmetry is the point of this change, not an
// inconsistency to harmonise away.
describe('CoverCapture — narrating a lookup in flight', () => {
  let originalMediaDevices;

  beforeEach(() => {
    latestProps = undefined;
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, clientWidth: 140, clientHeight: 210 };
    mockCanvas();
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
    vi.restoreAllMocks();
  });

  it('says nothing while no lookup is in flight, once the stream is ready', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} busy={false} />);
    act(() => latestProps.onUserMedia());
    expect(screen.queryByText(/looking up this cover/i)).not.toBeInTheDocument();
  });

  it('narrates the lookup — and only the one fact — once ready and busy', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} busy />);
    act(() => latestProps.onUserMedia());
    expect(screen.getByText(/looking up this cover/i)).toBeInTheDocument();
  });

  it('never says "code read" — that fact belongs to the automatic decoder, not a tapped shutter', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} busy />);
    act(() => latestProps.onUserMedia());
    expect(screen.queryByText(/code read/i)).not.toBeInTheDocument();
  });

  it('does not narrate a lookup before the stream is ready, even if busy is set early', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} busy />);
    // Still `requesting` — onUserMedia has not fired, so there is no ready frame to narrate over.
    expect(screen.queryByText(/looking up this cover/i)).not.toBeInTheDocument();
  });

  it('leaves the shutter tappable while busy — no disabled state (explicitly out of scope)', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} busy />);
    act(() => latestProps.onUserMedia());
    expect(screen.getByRole('button', { name: /look up this cover/i })).toBeEnabled();
  });
});
