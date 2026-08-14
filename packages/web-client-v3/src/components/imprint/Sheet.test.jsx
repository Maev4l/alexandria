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

  it('does not uppercase its title, which is usually a content name', () => {
    render(
      <Sheet open title="Bandes dessinées">
        <p>Body</p>
      </Sheet>,
    );
    // The rule exists because this collection's titles are mixed English and French, and a
    // library name shouted in caps is exactly the case §3 was written for.
    const heading = screen.getByRole('heading', { name: 'Bandes dessinées' });
    expect(heading.className).not.toContain('caps');
    expect(heading.className).not.toContain('uppercase');
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
