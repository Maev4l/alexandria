import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LendSheet from './LendSheet.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';

const item = { id: 'i1', title: 'Le Grand Sommeil', libraryId: 'lib-1' };

const renderSheet = (props = {}) =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <LendSheet item={item} libraryId="lib-1" open onClose={vi.fn()} {...props} />
      </ToastProvider>
    </MemoryRouter>,
  );

const okFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => null,
    })),
  );

beforeEach(okFetch);
afterEach(() => vi.unstubAllGlobals());

// Detail's rebuilt actions: Lend is the one action that still needs a sheet, because it
// genuinely needs input (a borrower's name) — and per DESIGN.md this sheet holds ONLY that
// form. It replaces `ItemActionsSheet` on this one screen, which offered Edit/Lend/Delete
// behind a button labelled with a single specific action — the defect this component fixes.
describe('LendSheet', () => {
  it('holds only the lend form — no Edit, no Delete', () => {
    renderSheet();
    expect(screen.getByLabelText(/who has it/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('caps the borrower name at the API limit of 50', () => {
    renderSheet();
    expect(screen.getByLabelText(/who has it/i)).toHaveAttribute('maxLength', '50');
  });

  it('keeps the primary out of reach until a name is given — the reason is visible', async () => {
    renderSheet();
    expect(screen.getByRole('button', { name: /record the loan/i })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    expect(screen.getByRole('button', { name: /record the loan/i })).toBeEnabled();
  });

  it('re-reads the item after the write, because the API returns no body', async () => {
    const onLent = vi.fn();
    renderSheet({ onLent });
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));
    await vi.waitFor(() => expect(onLent).toHaveBeenCalledOnce());
  });

  it('confirms as a toast and closes once the write succeeds', async () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));
    expect(await screen.findByText(/le grand sommeil is out with marie/i)).toBeInTheDocument();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('Cancel closes the sheet without recording anything', async () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reports a failure inline, never as a toast, and never the server\'s own words', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        // Deliberately NOT a message that reads well — proving the app never renders it, per
        // ui-v3.md §7 and api/client.js's STATUS_COPY map.
        json: async () => ({ message: 'internal failure xyz' }),
      })),
    );
    renderSheet();
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(alert).not.toHaveTextContent('internal failure xyz');
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('does not uppercase the item title in its heading, which is content', () => {
    renderSheet();
    expect(screen.getByRole('heading', { name: 'Le Grand Sommeil' }).className).not.toContain(
      'caps',
    );
  });
});
