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

  it('draws the destructive action in the on-loan red, which is allowed at this size', () => {
    render(<PlateButton variant="danger">Delete</PlateButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('border-out');
    expect(cls).toContain('text-out');
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
});
