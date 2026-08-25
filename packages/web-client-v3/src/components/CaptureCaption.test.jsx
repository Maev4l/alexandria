import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CaptureCaption from './CaptureCaption.jsx';

describe('CaptureCaption', () => {
  it('sets its own ground as well as its foreground, in the same rule', () => {
    render(<CaptureCaption>Frame the title</CaptureCaption>);
    const caption = screen.getByText('Frame the title');
    // The defect this exists for: a foreground over a live camera feed with no ground at all,
    // measured between 1.45:1 and 5.1:1 on the same string depending on what the lens saw.
    // Declaration only — the resolved colours are check:browser's job, on a real feed.
    expect(caption).toHaveClass('bg-paper');
    expect(caption).toHaveClass('text-ink');
  });

  it('pins to the frame\'s bottom edge rather than covering it', () => {
    render(<CaptureCaption>Frame the title</CaptureCaption>);
    const caption = screen.getByText('Frame the title');
    // `inset-0` centred the text over the aiming region — an instruction printed on top of the
    // thing it is telling the reader to aim at.
    expect(caption).toHaveClass('bottom-0');
    expect(caption).not.toHaveClass('inset-0');
  });

  it('announces politely, so a state change is heard as well as seen', () => {
    render(<CaptureCaption>Code read · looking it up</CaptureCaption>);
    expect(screen.getByText(/code read/i)).toHaveAttribute('aria-live', 'polite');
  });
});
