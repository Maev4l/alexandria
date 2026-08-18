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
// not really exist for this component: `getScreenshot()` is a synchronous canvas read with no
// external library or network call of its own — the actual OCR happens server-side, behind
// `detectionApi.video`, which is AddVideo's concern, not this component's. There is nothing
// client-side to bind against beyond what this file already drives through the fake.
//
// LAYER 3 (the live camera on a real device) is manual-only and not asserted anywhere in this
// codebase, identically to BarcodeScanner.
let latestProps;
let getScreenshotMock;

vi.mock('react-webcam', () => ({
  default: forwardRef((props, ref) => {
    latestProps = props;
    useImperativeHandle(ref, () => ({ getScreenshot: getScreenshotMock }));
    return <video data-testid="fake-webcam" />;
  }),
}));

describe('CoverCapture — the state machine', () => {
  let originalMediaDevices;

  beforeEach(() => {
    latestProps = undefined;
    getScreenshotMock = vi.fn(() => 'data:image/jpeg;base64,ZmFrZS1mcmFtZQ==');
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

  it('drops the requesting caption and shows the shutter once the stream attaches', () => {
    render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    expect(screen.queryByText(/requesting camera access/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /look up this cover/i })).toBeInTheDocument();
  });

  it('adds no reticle, scan line or any other overlay — only the video and the shutter', () => {
    const { container } = render(<CoverCapture onCapture={() => {}} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    expect(container.querySelectorAll('svg, canvas')).toHaveLength(0);
  });

  it('reports a captured frame through onCapture with the data-URL prefix stripped', async () => {
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
    expect(getScreenshotMock).toHaveBeenCalled();
    expect(onCapture).toHaveBeenCalledWith('ZmFrZS1mcmFtZQ==');
  });

  it('does nothing if the browser could not produce a frame yet', async () => {
    getScreenshotMock = vi.fn(() => null);
    const onCapture = vi.fn();
    render(<CoverCapture onCapture={onCapture} onError={() => {}} />);
    act(() => latestProps.onUserMedia());
    await userEvent.click(screen.getByRole('button', { name: /look up this cover/i }));
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
