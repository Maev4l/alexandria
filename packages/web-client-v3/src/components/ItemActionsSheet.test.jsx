import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

  it('keeps the lend action out of reach until a name is given', async () => {
    renderSheet(atHome);
    await userEvent.click(screen.getByRole('button', { name: /^lend/i }));
    // The reason is visible — an empty required field right above — so the action is a ruled
    // outline that fills on validity rather than an inert control.
    expect(screen.getByRole('button', { name: /record the loan/i })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/who has it/i), 'Marie');
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
        // ui-v3.md §7 and api/client.js's STATUS_COPY map.
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
});
