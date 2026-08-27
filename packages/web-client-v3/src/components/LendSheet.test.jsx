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
// genuinely needs input (a borrower's name) — and this sheet holds ONLY that
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

  it('drops the "50 LEFT" counter — a limit nobody at the door is near', () => {
    renderSheet();
    expect(screen.queryByText(/left/i)).toBeNull();
  });

  // The action slot's second form: at rest there is no disabled "Record the loan" outline sitting
  // next to the "Cancel" outline (the critique's finding — the two used to be the same shape).
  // The reason occupies the slot instead, and only the filled plate appears once the field is
  // valid.
  it('names the reason instead of showing a disabled twin of Cancel, until a name is given', async () => {
    renderSheet();
    expect(screen.queryByRole('button', { name: /record the loan/i })).toBeNull();
    expect(screen.getByText(/a borrower's name/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    expect(screen.queryByText(/a borrower's name/i)).toBeNull();
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
        // api/client.js's STATUS_COPY map: an error must never attribute a system fault to the
        // reader, so the server's raw prose never reaches the screen.
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
