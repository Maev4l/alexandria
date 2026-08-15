import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ItemForm from './ItemForm.jsx';

const BOOK = 0;
const FILM = 1;

const collections = [{ id: 'coll-1', name: 'Melville', itemCount: 4 }];

describe('ItemForm', () => {
  it('keeps the order field out of the form until a collection is chosen', async () => {
    render(<ItemForm type={BOOK} initial={{}} collections={collections} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.queryByLabelText(/order in the collection/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/collection/i), 'coll-1');
    expect(screen.getByLabelText(/order in the collection/i)).toBeInTheDocument();
  });

  it('blocks submit and reports the pair error when a collection has no order', async () => {
    const onSubmit = vi.fn();
    render(<ItemForm type={BOOK} initial={{}} collections={collections} onSubmit={onSubmit} submitLabel="Save" />);

    await userEvent.type(screen.getByLabelText(/title/i), 'A title');
    await userEvent.selectOptions(screen.getByLabelText(/collection/i), 'coll-1');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/order in the collection, 1 to 1000/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('enforces the release year and duration ranges on their own fields, for a film', async () => {
    const onSubmit = vi.fn();
    render(<ItemForm type={FILM} initial={{}} collections={[]} onSubmit={onSubmit} submitLabel="Save" />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Chinatown');
    await userEvent.type(screen.getByLabelText(/release year/i), '1799');
    await userEvent.type(screen.getByLabelText(/duration/i), '1001');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/1800/)).toBeInTheDocument();
    expect(screen.getByText(/1000/)).toBeInTheDocument();
    expect(screen.getByLabelText(/release year/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/duration/i)).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // MINOR 7: `setError(null)` used to run only after the field-validation early return, so a
  // failed save followed by a resubmit that trips FIELD validation left the old server-error
  // banner sitting above the new field errors.
  it('clears a stale API error banner once a later submit fails field validation instead', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Could not save this item'));
    render(<ItemForm type={FILM} initial={{}} collections={[]} onSubmit={onSubmit} submitLabel="Save" />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Chinatown');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/could not save this item/i)).toBeInTheDocument();

    // This submit never reaches the API — it trips the release-year field validation instead.
    await userEvent.type(screen.getByLabelText(/release year/i), '1799');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/1800/)).toBeInTheDocument();
    expect(screen.queryByText(/could not save this item/i)).toBeNull();
  });

  it('splits comma-separated authors into an array, only at submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<ItemForm type={BOOK} initial={{}} collections={[]} onSubmit={onSubmit} submitLabel="Save" />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Le Grand Sommeil');
    await userEvent.type(screen.getByLabelText(/authors/i), 'Raymond Chandler, Boris Vian ');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].authors).toEqual(['Raymond Chandler', 'Boris Vian']);
  });

  it('offers no "fetch cover again" control on a new item, which has no source to fetch from', () => {
    render(<ItemForm type={BOOK} initial={{}} collections={[]} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.queryByRole('checkbox', { name: /fetch the cover again/i })).toBeNull();
  });

  // DESIGN.md §6: when the reason a control is unavailable is not visible elsewhere on the
  // form, the slot carries the REASON instead of an inert control — never both. A `disabled`
  // checkbox drops out of the tab order, so this used to be unreachable by keyboard/AT and its
  // explanation was an orphan sentence with no `aria-describedby` pointing anywhere.
  it('replaces the control with its own reason on edit, when the item has no source image', () => {
    render(
      <ItemForm
        type={BOOK}
        initial={{ id: 'item-1', title: 'Nadja' }}
        collections={[]}
        onSubmit={vi.fn()}
        submitLabel="Save changes"
      />,
    );
    expect(screen.queryByRole('checkbox', { name: /fetch the cover again/i })).toBeNull();
    expect(screen.getByText(/no source image to fetch from/i)).toBeInTheDocument();
  });

  it('enables the control on edit when a pictureUrl is present', () => {
    render(
      <ItemForm
        type={BOOK}
        initial={{ id: 'item-1', title: 'Nadja', pictureUrl: 'https://example.test/cover.jpg' }}
        collections={[]}
        onSubmit={vi.fn()}
        submitLabel="Save changes"
      />,
    );
    expect(screen.getByRole('checkbox', { name: /fetch the cover again/i })).toBeEnabled();
  });
});
