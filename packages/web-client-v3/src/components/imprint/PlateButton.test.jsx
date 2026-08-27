import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlateButton from './PlateButton.jsx';

describe('PlateButton', () => {
  it('keeps its label in authored case in the DOM, uppercasing only presentationally', () => {
    render(<PlateButton>New library</PlateButton>);
    const button = screen.getByRole('button', { name: 'New library' });
    expect(button).toHaveTextContent('New library');
    expect(button.className).toContain('caps');
  });

  it('defaults to the imprint plate for the primary action', () => {
    render(<PlateButton>Lend</PlateButton>);
    expect(screen.getByRole('button').className).toContain('bg-imprint');
  });

  it('draws the secondary action as a ruled outline with no fill', () => {
    render(<PlateButton variant="secondary">Edit</PlateButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('border-2');
    expect(cls).not.toContain('bg-imprint');
  });

  it('puts the destructive red on the RULE and keeps its label ambient, never red', () => {
    render(<PlateButton variant="danger">Delete</PlateButton>);
    const cls = screen.getByRole('button').className;
    // --out is 4.11:1 on paper — sound for a 2px edge, short of AA for 12px caps, so it is
    // restricted to >=18px bold, rules and stamp outlines, and the label cannot be red.
    expect(cls).toContain('border-out');
    expect(cls).not.toContain('text-out');
    // `text-current`, not a hardcoded `text-ink`: this variant sets no ground of its own, so it
    // follows ambient exactly like `secondary` does. A hardcoded ink read fine every time this
    // button sat inside a paper-grounded sheet, and was invisible — ink on ink — the one time it
    // shipped straight onto item detail's black cover instead.
    expect(cls).toContain('text-current');
  });

  it('flips the focus ring to ink on the yellow plate, where a yellow ring would vanish', () => {
    render(<PlateButton>Lend</PlateButton>);
    expect(screen.getByRole('button').className).toContain('on-imprint');
  });

  it('meets the 48px minimum touch target', () => {
    render(<PlateButton>Lend</PlateButton>);
    expect(screen.getByRole('button').className).toContain('min-h-12');
  });

  it('draws a disabled primary as the ruled outline, never as a faded plate', () => {
    render(<PlateButton disabled>Create library</PlateButton>);
    const cls = screen.getByRole('button').className;
    // A half-strength --imprint would be a new colour meaning "disabled", which palette law
    // forbids, and its label would fall under the contrast floor.
    expect(cls).not.toContain('bg-imprint');
    expect(cls).not.toContain('opacity');
    expect(cls).toContain('border-2');
  });

  it('fills the plate in the moment it becomes usable', () => {
    const { rerender } = render(<PlateButton disabled>Create library</PlateButton>);
    expect(screen.getByRole('button').className).not.toContain('bg-imprint');
    rerender(<PlateButton>Create library</PlateButton>);
    expect(screen.getByRole('button').className).toContain('bg-imprint');
  });

  // The outline-to-plate swap (above) is the sighted affordance for "why is this inert" and has
  // no non-visual equivalent anywhere in the app. `reason` closes that: a screen reader moving
  // through the page in browse mode (not tab order — a disabled button is unfocusable) must
  // encounter the cause, not just the "dimmed" state.
  describe('disabled reason', () => {
    it('exposes the reason in the accessibility tree when disabled', () => {
      render(
        <PlateButton disabled reason="Enter an ISBN to continue">
          Look up
        </PlateButton>,
      );
      const button = screen.getByRole('button');
      // toHaveAccessibleName reads exactly what browse-mode reading computes: the button's own
      // label plus this sr-only text, both folded into one accessible name — proving the reason
      // is reachable without ever focusing an element that cannot take focus.
      expect(button).toHaveAccessibleName(/Enter an ISBN to continue/);
      expect(button).toHaveAccessibleName(/Look up/);
    });

    it('keeps the reason out of the rendered page — sr-only, not a visible caption', () => {
      render(
        <PlateButton disabled reason="Enter an ISBN to continue">
          Look up
        </PlateButton>,
      );
      // The disabled primary's outline-fills-to-plate treatment stays the only thing a sighted
      // reader sees; a printed caption reading "Enter an ISBN to continue" next to a button
      // already labelled "Look up" is exactly the visible-nonsense the removed aria-describedby
      // attempt produced.
      expect(screen.getByText('Enter an ISBN to continue')).toHaveClass('sr-only');
    });

    it('never speaks a reason for a button that is not disabled', () => {
      render(
        <PlateButton reason="Enter an ISBN to continue">Look up</PlateButton>,
      );
      expect(screen.queryByText('Enter an ISBN to continue')).toBeNull();
      expect(screen.getByRole('button')).toHaveAccessibleName('Look up');
    });

    it('is harmless when disabled with no reason given — the existing, unchanged case', () => {
      render(<PlateButton disabled>Create library</PlateButton>);
      expect(screen.getByRole('button')).toHaveAccessibleName('Create library');
    });
  });
});
