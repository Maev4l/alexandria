import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Sheet from './Sheet.jsx';

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    render(
      <Sheet open={false} title="Actions">
        <p>Body</p>
      </Sheet>,
    );
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('is a dialog with an accessible name', () => {
    render(
      <Sheet open title="Library actions">
        <p>Body</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Library actions');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Actions" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the scrim is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Actions" onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    await userEvent.click(screen.getByTestId('sheet-scrim'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
