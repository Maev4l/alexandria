import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetCameraStreamForTests } from '@/lib/cameraStream.js';
import CoverCapture from './CoverCapture.jsx';

// LAYER 1 of the three the task brief names: the state machine — permission requested/denied,
// ready, and reporting a captured frame. `getUserMedia` sits behind a stub here so every
// transition can be driven deterministically with no camera present.
//
// There is no `react-webcam` mock any more, because there is no react-webcam: it owned its own
// stream and could not be handed one, which was the only thing standing between this screen and
// a camera that survives the cataloguing loop. The component now renders a plain <video> and
// borrows the shared lease, so these tests drive the real element rather than a fake component's
// props — which is why the geometry fixtures below define their dimensions ON that element
// instead of supplying an object the mock returned. That distinction matters: the previous
// fixtures handed back an exact 2:3 box the MOCK ITSELF provided, so when the frame was reshaped
// to 358x240 the suite stayed green while exercising an aspect the app renders nowhere.
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
// The dimensions each test wants the rendered <video> to report. jsdom lays nothing out, so
// `videoWidth`/`videoHeight` (the sensor) and `clientWidth`/`clientHeight` (the rendered box) are
// all 0 unless defined, and `renderCapture` below defines them on the real element.
let fakeVideo;

// A stream the lease can cache and the component can attach. jsdom accepts any object as
// `srcObject`, so nothing here has to be a real MediaStream.
const makeStream = () => {
  const track = { readyState: 'live', stop: vi.fn() };
  return { getTracks: () => [track], getVideoTracks: () => [track] };
};

// Canvas support is not implemented in jsdom, so `getContext`/`toDataURL` are stubbed here for
// every test in this file — including the geometry suite below, which additionally inspects
// `capturedCanvas` (the element `getContext` was called on) to assert its final width/height.
let drawImageMock;
let capturedCanvas;

const shootShutter = async () => {
  await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
};

// Renders, waits for the shared stream to attach, and gives the real <video> the dimensions this
// test wants it to report. Returns that element, because the capture assertions are about what
// `drawImage` was handed — which is now the element itself rather than a mock's stand-in.
const renderCapture = async (props = {}) => {
  const utils = render(<CoverCapture onCapture={() => {}} onError={() => {}} {...props} />);
  await screen.findByRole('button', { name: /look up this cover/i });
  const video = utils.container.querySelector('video');
  for (const [key, value] of Object.entries(fakeVideo ?? {})) {
    Object.defineProperty(video, key, { configurable: true, value });
  }
  return { ...utils, video };
};

const stubCamera = (getUserMedia) => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
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
    __resetCameraStreamForTests();
    // A 1920x1080 sensor is wider than the shipped 358×240 frame either way, so it crops but
    // never fails — the exact crop maths are the geometry suite's job, not this suite's.
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, clientWidth: 358, clientHeight: 240 };
    mockCanvas();
    originalMediaDevices = navigator.mediaDevices;
    stubCamera(vi.fn(async () => makeStream()));
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

  // The frame reads a title now, not cover art — landscape at a fixed height is the shape that
  // target needs (CoverCapture.jsx's own comment on why). Pin the HEIGHT, not a width: a
  // full-width frame's width is a consequence of the column, so asserting it would only re-test
  // `w-full`.
  it('is a fixed 240px tall, landscape rather than portrait', () => {
    const { container } = render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    const box = container.querySelector('.border-ink');
    expect(box.className).toContain('h-[240px]');
    expect(box.className).not.toContain('aspect-[2/3]');
    expect(box.className).not.toContain('max-w-[140px]');
  });

  // `w-fit` sized the wrapper to its widest child, which silently un-does a full-width frame
  // (measured at 319px where 358 was expected). Once the frame itself spans the column, `mx-auto
  // w-fit` have nothing left to do; `items-center` alone still centres the shutter beneath it.
  it('drops w-fit and mx-auto from the wrapper now that the frame is full width', () => {
    const { container } = render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    const wrapper = container.querySelector('.border-ink').parentElement;
    expect(wrapper.className).not.toContain('w-fit');
    expect(wrapper.className).not.toContain('mx-auto');
    expect(wrapper.className).toContain('items-center');
  });

  it('drops the requesting caption and shows the shutter once the stream attaches', async () => {
    await renderCapture();
    expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /look up this cover/i })).toBeInTheDocument();
  });

  it('adds no reticle, scan line or any other overlay — only the video and the shutter', async () => {
    const { container } = await renderCapture();
    // The capture canvas is created off-DOM (`document.createElement('canvas')`, never
    // appended), so its existence must not show up here either.
    expect(container.querySelectorAll('svg, canvas')).toHaveLength(0);
  });

  it('reports a captured frame through onCapture with the data-URL prefix stripped', async () => {
    const onCapture = vi.fn();
    await renderCapture({ onCapture });
    await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
    expect(drawImageMock).toHaveBeenCalled();
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });

  it('does nothing if the browser could not produce a frame yet', async () => {
    fakeVideo = { videoWidth: 0, videoHeight: 0 };
    const onCapture = vi.fn();
    await renderCapture({ onCapture });
    await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
    expect(drawImageMock).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('moves to denied and calls onError when the browser refuses permission, rendering nothing', async () => {
    const onError = vi.fn();
    // The refusal arrives from `getUserMedia` now — the component asks the shared lease and the
    // lease asks the browser. There is no third-party callback in between any more.
    stubCamera(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    const { container } = render(<CoverCapture onCapture={() => {}} onError={onError} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('NotAllowedError');
  });

  it('asks for the environment-facing camera, not the front one', async () => {
    await renderCapture();
    // Asserted on the lease's own request now. Audio was never asked for and cannot be: the
    // lease requests `{ video: ... }` and nothing else, so there is no audio flag left to get
    // wrong.
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
    });
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

  // The frame this component actually renders: `h-[240px] w-full`, measured at 358×240 at a
  // 390px viewport (aspect ~1.4917, landscape). It used to be a 2:3 portrait box (aspect
  // 0.667) — the reshape changed the frame's shape without this describe block noticing, so
  // every fixture below kept exercising the crop maths against an aspect the app no longer
  // renders anywhere. Fixed by using the shipped shape here, once.
  const REAL_FRAME = { clientWidth: 358, clientHeight: 240 };

  beforeEach(() => {
    __resetCameraStreamForTests();
    mockCanvas();
    originalMediaDevices = navigator.mediaDevices;
    stubCamera(vi.fn(async () => makeStream()));
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    vi.restoreAllMocks();
  });

  it('crops the left/right edges when the sensor is relatively WIDER than the real 358×240 frame', async () => {
    // 1920x1080 (aspect 1.778) is wider than the shipped frame's ~1.4917 (358/240): object-cover
    // keeps the full height and crops the sides, centred. This fixture was already in the WIDE
    // branch against the old 2:3 frame (1.778 > 0.667) too, so the reshape does not move it to
    // the other branch — only the crop amount changes, since less is now cropped off each side.
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, ...REAL_FRAME };
    const onCapture = vi.fn();
    const { video } = await renderCapture({ onCapture });
    await shootShutter();

    expect(capturedCanvas.width).toBe(1611); // 1080 * (358 / 240)
    expect(capturedCanvas.height).toBe(1080);
    expect(drawImageMock).toHaveBeenCalledWith(video, 154.5, 0, 1611, 1080, 0, 0, 1611, 1080);
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
    await renderCapture({ onCapture });
    await shootShutter();

    expect(drawImageMock).not.toHaveBeenCalled();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('crops the top/bottom edges when the sensor is relatively TALLER than the real 358×240 frame', async () => {
    // 480x1280 (aspect 0.375) is taller than the shipped frame's ~1.4917: object-cover keeps
    // the full width and crops top and bottom, centred. Also unchanged branch from the old 2:3
    // frame (0.375 < 0.667 too) — but the crop amount moved non-trivially: the new frame is far
    // wider relative to its height, so MORE is cropped off top and bottom than the old 2:3 frame
    // cropped (was 720px kept of 1280, now ~322px kept).
    fakeVideo = { videoWidth: 480, videoHeight: 1280, ...REAL_FRAME };
    const onCapture = vi.fn();
    const { video } = await renderCapture({ onCapture });
    await shootShutter();

    expect(capturedCanvas.width).toBe(480);
    expect(capturedCanvas.height).toBe(322); // Math.round(480 / (358 / 240)) = Math.round(321.79)
    expect(drawImageMock).toHaveBeenCalledWith(
      video,
      0,
      479.10614525139664, // (1280 - 480/(358/240)) / 2
      480,
      321.7877094972067, // 480 / (358 / 240)
      0,
      0,
      480,
      322,
    );
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });

  it('derives capture size from the INTRINSIC sensor resolution, not the ~280px rendered element', async () => {
    // The defect this replaces: react-webcam's default getCanvas() sizes off video.clientWidth,
    // never the sensor. A 4K sensor cropped to the shipped frame's ratio must still yield a
    // 4K-scale crop — nowhere near 280 — proving the element's rendered size plays no part in
    // the maths. Same WIDE branch as the 1920x1080 case above, at 2x the resolution.
    fakeVideo = { videoWidth: 3840, videoHeight: 2160, ...REAL_FRAME };
    const onCapture = vi.fn();
    await renderCapture({ onCapture });
    await shootShutter();

    expect(capturedCanvas.width).toBe(3222); // 2160 * (358 / 240)
    expect(capturedCanvas.height).toBe(2160);
    expect(capturedCanvas.width).not.toBe(280);
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });

  // Not modelling the shipped frame, nor the retired one — a plain aspect-0.5 portrait box, kept
  // only to exercise the branch-selection maths generically. `objectCoverSourceRect` takes
  // `containerAspect` as a parameter and must resolve correctly for ANY aspect, not just the two
  // this app has ever shipped (0.667, then 1.4917); this proves the WIDE branch at a third,
  // arbitrary one.
  it('resolves the WIDE branch correctly at an arbitrary aspect the app has never shipped (generic check)', async () => {
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, clientWidth: 100, clientHeight: 200 }; // aspect 0.5
    const onCapture = vi.fn();
    const { video } = await renderCapture({ onCapture });
    await shootShutter();

    expect(capturedCanvas.width).toBe(540); // 1080 * (100 / 200)
    expect(capturedCanvas.height).toBe(1080);
    expect(drawImageMock).toHaveBeenCalledWith(video, 690, 0, 540, 1080, 0, 0, 540, 1080);
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
    __resetCameraStreamForTests();
    __resetCameraStreamForTests();
    // Dimensions unchecked by this describe block (it asserts caption text, never crop geometry)
    // — kept at the shipped 358×240 frame's shape anyway so nothing here implies a box the app
    // does not render.
    fakeVideo = { videoWidth: 1920, videoHeight: 1080, clientWidth: 358, clientHeight: 240 };
    mockCanvas();
    originalMediaDevices = navigator.mediaDevices;
    stubCamera(vi.fn(async () => makeStream()));
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    vi.restoreAllMocks();
  });

  it('says nothing while no lookup is in flight, once the stream is ready', async () => {
    await renderCapture({ busy: false });
    expect(screen.queryByText(/looking up this cover/i)).not.toBeInTheDocument();
  });

  // The three captions — requesting, ready-idle, ready-busy — are gated to be mutually exclusive
  // BY CONSTRUCTION (`state === 'requesting'`, `state === 'ready' && busy`,
  // `state === 'ready' && !busy` partition every reachable state). These three assertions pin
  // each one individually so a later edit widening any gate cannot make two overlap unnoticed.
  it('shows "Frame the title" once ready and not busy — the idle caption', async () => {
    await renderCapture({ busy: false });
    expect(screen.getByText(/frame the title/i)).toBeInTheDocument();
  });

  it('hides "Frame the title" while a lookup is in flight', async () => {
    await renderCapture({ busy: true });
    expect(screen.queryByText(/frame the title/i)).not.toBeInTheDocument();
    expect(screen.getByText(/looking up this cover/i)).toBeInTheDocument();
  });

  it('hides "Frame the title" before the stream is ready', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} busy={false} />);
    // Still `requesting` — onUserMedia has not fired.
    expect(screen.queryByText(/frame the title/i)).not.toBeInTheDocument();
    expect(screen.getByText(/requesting camera access/i)).toBeInTheDocument();
  });

  it('narrates the lookup — and only the one fact — once ready and busy', async () => {
    await renderCapture({ busy: true });
    expect(screen.getByText(/looking up this cover/i)).toBeInTheDocument();
  });

  it('never says "code read" — that fact belongs to the automatic decoder, not a tapped shutter', async () => {
    await renderCapture({ busy: true });
    expect(screen.queryByText(/code read/i)).not.toBeInTheDocument();
  });

  it('does not narrate a lookup before the stream is ready, even if busy is set early', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} busy />);
    // Still `requesting` — onUserMedia has not fired, so there is no ready frame to narrate over.
    expect(screen.queryByText(/looking up this cover/i)).not.toBeInTheDocument();
  });

  it('leaves the shutter tappable while busy — no disabled state (explicitly out of scope)', async () => {
    await renderCapture({ busy: true });
    expect(screen.getByRole('button', { name: /look up this cover/i })).toBeEnabled();
  });

  // ---- The idle guidance is a FIRST-USE state ----
  it('prints "Frame the title" while the frame is idle', async () => {
    await renderCapture();
    expect(screen.getByText(/frame the title/i)).toBeInTheDocument();
  });

  it('drops it once the caller says the reader has done this before', async () => {
    await renderCapture({ showGuidance: false });
    // Asserts something that DOES render first, so this cannot pass merely because the component
    // is still in its `requesting` state — a bare `queryByText` there would be vacuously true.
    expect(screen.getByRole('button', { name: /look up this cover/i })).toBeInTheDocument();
    expect(screen.queryByText(/frame the title/i)).not.toBeInTheDocument();
  });
});
