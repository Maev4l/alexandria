import { fireEvent, render, screen } from '@testing-library/react';
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

  // The critique's finding: 4000 is not 100. A counter shown from the first keystroke narrates a
  // budget nobody at ordinary summary length is anywhere near. It should appear only once a
  // reader is actually close to it (SUMMARY_COUNTER_THRESHOLD in ItemForm.jsx).
  it('hides the SUMMARY counter for an ordinary summary and shows it once the wall is near', () => {
    render(<ItemForm type={BOOK} initial={{}} collections={[]} onSubmit={vi.fn()} submitLabel="Save" />);
    const summary = screen.getByLabelText(/summary/i);

    // Title's own counter (100 max) is always on screen and unaffected by this finding — so the
    // baseline is ONE "left" (title's), not zero, and the assertion is that Summary adds a
    // second only once it is actually close to its wall.
    fireEvent.change(summary, { target: { value: 'Un tueur à gages méthodique.' } });
    expect(screen.getAllByText(/left/i)).toHaveLength(1);

    // 4000 - 3800 = 200 remaining, inside the 300-character threshold.
    fireEvent.change(summary, { target: { value: 'x'.repeat(3800) } });
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getAllByText(/left/i)).toHaveLength(2);
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

  // The corrected ruling (ui-v3.md, "the cover becomes a field"): a new item has no detection
  // result yet, so the field exists but starts empty rather than being withheld — withholding
  // it would repeat the exact gate-on-presence mistake the checkbox shipped with.
  it('offers an empty cover image field on a new item, with no source yet to pre-fill it', () => {
    render(<ItemForm type={BOOK} initial={{}} collections={[]} onSubmit={vi.fn()} submitLabel="Save" />);
    expect(screen.getByLabelText(/cover image/i)).toHaveValue('');
  });

  it('pre-fills the cover image field from the item on edit', () => {
    render(
      <ItemForm
        type={BOOK}
        initial={{ id: 'item-1', title: 'Nadja', pictureUrl: 'https://example.test/cover.jpg' }}
        collections={[]}
        onSubmit={vi.fn()}
        submitLabel="Save changes"
      />,
    );
    expect(screen.getByLabelText(/cover image/i)).toHaveValue('https://example.test/cover.jpg');
  });

  // Server-side fetch: a typo's only other feedback would be a cover that silently never shows.
  it('rejects a cover image address with no http(s) scheme, inline on the field', async () => {
    const onSubmit = vi.fn();
    render(<ItemForm type={BOOK} initial={{}} collections={[]} onSubmit={onSubmit} submitLabel="Save" />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Nadja');
    await userEvent.type(screen.getByLabelText(/cover image/i), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/http:\/\/ or https:\/\//i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends a new cover address on edit with updatePicture, since the source actually changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <ItemForm
        type={BOOK}
        initial={{ id: 'item-1', title: 'Nadja', pictureUrl: 'https://example.test/old.jpg' }}
        collections={[]}
        onSubmit={onSubmit}
        submitLabel="Save changes"
      />,
    );

    const field = screen.getByLabelText(/cover image/i);
    await userEvent.clear(field);
    await userEvent.type(field, 'https://example.test/new.jpg');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      pictureUrl: 'https://example.test/new.jpg',
      updatePicture: true,
    });
  });

  it('clears the cover address as pictureUrl: null, with no updatePicture — nothing left to fetch from', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <ItemForm
        type={BOOK}
        initial={{ id: 'item-1', title: 'Nadja', pictureUrl: 'https://example.test/old.jpg' }}
        collections={[]}
        onSubmit={onSubmit}
        submitLabel="Save changes"
      />,
    );

    await userEvent.clear(screen.getByLabelText(/cover image/i));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].pictureUrl).toBeNull();
    expect(onSubmit.mock.calls[0][0].updatePicture).toBeUndefined();
  });

  it('never sends updatePicture on a brand-new item, even with a cover address filled in', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<ItemForm type={BOOK} initial={{}} collections={[]} onSubmit={onSubmit} submitLabel="Add book" />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Nadja');
    await userEvent.type(screen.getByLabelText(/cover image/i), 'https://example.test/cover.jpg');
    await userEvent.click(screen.getByRole('button', { name: /add book/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].updatePicture).toBeUndefined();
  });
});
