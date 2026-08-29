import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ItemActionsSheet from './ItemActionsSheet.jsx';
import { ToastProvider } from '@/state/ToastContext.jsx';

const atHome = { id: 'i1', type: 0, title: 'Nadja', libraryId: 'lib-1' };
const onLoan = { ...atHome, lentTo: 'Marie' };

const renderSheet = (item, props = {}) =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <ItemActionsSheet item={item} libraryId="lib-1" open onClose={() => {}} {...props} />
      </ToastProvider>
    </MemoryRouter>,
  );

const okFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({}),
    })),
  );

beforeEach(okFetch);
afterEach(() => vi.unstubAllGlobals());

describe('ItemActionsSheet', () => {
  it('offers Lend on an item that is at home, and not Return', () => {
    renderSheet(atHome);
    expect(screen.getByRole('button', { name: /^lend/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /return/i })).toBeNull();
  });

  it('offers Return on an item that is out, and names who has it', () => {
    renderSheet(onLoan);
    expect(screen.getByRole('button', { name: /return/i })).toBeInTheDocument();
    expect(screen.getByText(/marie/i)).toBeInTheDocument();
  });

  it('takes the borrower inline, capped at the API limit of 50', async () => {
    renderSheet(atHome);
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    expect(screen.getByLabelText(/who has it/i)).toHaveAttribute('maxLength', '50');
  });

  it('drops the "50 LEFT" counter — a limit nobody at the door is near', async () => {
    renderSheet(atHome);
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    expect(screen.queryByText(/left/i)).toBeNull();
  });

  // The second place this exact defect shipped (LendSheet was the first): a disabled primary
  // renders as a ruled outline, indistinguishable at rest from the "Back" outline beside it —
  // the action slot's second form names the reason instead, in the button's own position, until
  // the field is valid.
  it('names the reason instead of showing a disabled twin of Back, until a name is given', async () => {
    renderSheet(atHome);
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    expect(screen.queryByRole('button', { name: /record the loan/i })).toBeNull();
    expect(screen.getByText(/a borrower's name/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    expect(screen.queryByText(/a borrower's name/i)).toBeNull();
    expect(screen.getByRole('button', { name: /record the loan/i })).toBeEnabled();
  });

  it('re-reads the item after a write, because the API returns no body', async () => {
    const onChanged = vi.fn();
    renderSheet(atHome, { onChanged });
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('confirms deletion in place and says the item is gone for good', async () => {
    const onChanged = vi.fn();
    renderSheet(atHome, { onChanged });
    await userEvent.click(screen.getByRole('button', { name: /^delete/i }));
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    // Nothing happens until the second, explicit step.
    expect(onChanged).not.toHaveBeenCalled();
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
    renderSheet(atHome);
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/went wrong/i);
    expect(alert).not.toHaveTextContent('internal failure xyz');
    expect(document.querySelector('[data-toast]')).toBeNull();
  });

  it('does not uppercase a confirmation, which embeds a title and a person', async () => {
    renderSheet({ ...atHome, title: 'Bandes dessinées' });
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
    await userEvent.click(screen.getByRole('button', { name: /record the loan/i }));
    const toast = await vi.waitFor(() => {
      const el = document.querySelector('[data-toast]');
      expect(el).not.toBeNull();
      return el;
    });
    expect(toast.className).not.toContain('caps');
    expect(toast.className).not.toContain('uppercase');
    expect(toast).toHaveTextContent('Bandes dessinées is out with Marie');
  });

  it('does not uppercase the item title in its heading', () => {
    renderSheet({ ...atHome, title: 'Bandes dessinées' });
    expect(screen.getByRole('heading', { name: 'Bandes dessinées' }).className).not.toContain(
      'caps',
    );
  });

  // THE SEAM. EditItem can only name itself on its first frame if this navigation carries the
  // type, and EditItem's own probes pass a hand-built entry — they would stay green with this
  // call site handing over nothing at all. Asserted at the destination rather than by spying on
  // `navigate`, so it is the router's actual delivered state that is checked.
  it('hands the item type to the edit screen, so that screen never has to guess its own name', async () => {
    const Landed = () => <p>TYPE {String(useLocation().state?.type)}</p>;
    render(
      <MemoryRouter initialEntries={['/']}>
        <ToastProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ItemActionsSheet item={atHome} libraryId="lib-1" open onClose={() => {}} />
              }
            />
            <Route path="/libraries/:libraryId/items/:itemId/edit" element={<Landed />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    // `atHome` is a book, type 0 — the value a truthiness test would drop.
    expect(screen.getByText('TYPE 0')).toBeInTheDocument();
  });
});
