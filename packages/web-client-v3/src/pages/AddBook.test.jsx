import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectionApi } from '@/api';
import { NO_INPUT_MESSAGE } from '@/lib/addFlowState.js';

// The camera is mocked: jsdom has no getUserMedia, and the behaviour under test here is the
// escape hatch and the lookup flow, not the decoder itself (that lives in
// BarcodeScanner.test.jsx, layer 1 of the three the task brief names). A second button lets a
// couple of tests below drive a successful decode the same way a manual submit is driven.
vi.mock('@/components/BarcodeScanner.jsx', () => ({
  default: ({ onCode, onError }) => (
    <div>
      <button type="button" onClick={() => onError(new Error('NotAllowedError'))}>
        simulate denial
      </button>
      <button type="button" onClick={() => onCode('9782070408504')}>
        simulate decode
      </button>
    </div>
  ),
}));

vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    detectionApi: { ...actual.detectionApi, book: vi.fn() },
  };
});

const AddBook = (await import('./AddBook.jsx')).default;

// Prints the route it landed on and its full query, so a test can assert the ISBN (and, when
// present, the collection) actually travelled in the URL rather than merely that SOME
// navigation happened.
const LocationProbe = () => {
  const location = useLocation();
  return (
    <p>
      landed:{location.pathname}
      {location.search} state:{location.state === null ? 'none' : JSON.stringify(location.state)}
    </p>
  );
};

const renderPage = (initialPath = '/libraries/lib-1/add/book', initialState) =>
  render(
    <MemoryRouter
      initialEntries={[
        initialState ? { pathname: initialPath, state: initialState } : initialPath,
      ]}
    >
      <Routes>
        <Route path="/libraries/:libraryId/add/book" element={<AddBook />} />
        <Route path="/libraries/:libraryId/add/book/results" element={<LocationProbe />} />
        <Route path="/libraries/:libraryId/items/new/book" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(detectionApi.book).mockReset().mockResolvedValue({ detectedBooks: [] });
});

describe('AddBook', () => {
  it('always shows the manual entry escape, before anything goes wrong', () => {
    renderPage();
    expect(screen.getByLabelText(/isbn/i)).toBeInTheDocument();
  });

  // Fix round 2 (finding 1): a disabled "Look it up" sitting next to the always-enabled "Enter by
  // hand" — same 2px ink outline, same transparent ground — was indistinguishable at rest, on
  // this screen exactly as much as AddVideo's (AddVideo.test.jsx carries the fuller comment).
  // DESIGN.md §6's second form replaces the button entirely with the reason, in caps, in the
  // control's own position, both while the field is empty and while it holds an invalid format —
  // a same-colour ruled neighbour forces the second form regardless of which.
  it('shows the reason instead of a disabled button while the code is empty, and calls nothing', async () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /look it up/i })).not.toBeInTheDocument();
    expect(screen.getByText(/an isbn/i)).toBeInTheDocument();
    screen.getByLabelText(/isbn/i).focus();
    await userEvent.keyboard('{Enter}');
    expect(detectionApi.book).not.toHaveBeenCalled();
  });

  it('links the reason to the code field for a screen-reader user, and drops the link once valid', async () => {
    renderPage();
    const field = screen.getByLabelText(/isbn/i);
    const reasonId = screen.getByText(/an isbn/i).id;
    expect(field.getAttribute('aria-describedby')).toContain(reasonId);

    await userEvent.type(field, '9782070404209');
    expect(screen.queryByText(/an isbn/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^look it up$/i })).toBeEnabled();
    expect(field.getAttribute('aria-describedby')).not.toContain(reasonId);
  });

  it('says what to do when the camera is refused, rather than only that it failed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate denial/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/type the isbn/i);
  });

  it('accepts a 13-digit ISBN and an ISBN-10', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/isbn/i), '9782070404209');
    expect(screen.getByRole('button', { name: /look it up/i })).toBeEnabled();
  });

  it('refuses a code that is not an ISBN, naming the reason', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/isbn/i), '12345');
    expect(screen.getByText(/10 or 13 digits/i)).toBeInTheDocument();
  });

  // The brief's own test above types only a 13-digit code despite its title naming an ISBN-10
  // too — this is the ISBN-10 case that title actually promises, with the ISO 2108 checksum
  // letter, so the "10 or 13" branch of the validator is exercised on both real lengths.
  it('also accepts a 10-digit ISBN carrying the X checksum character', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/isbn/i), '080442957X');
    expect(screen.getByRole('button', { name: /look it up/i })).toBeEnabled();
  });

  it('looks up a manually typed code and hands it to the results screen in the query', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/isbn/i), '9782070404209');
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));
    expect(detectionApi.book).toHaveBeenCalledWith('9782070404209');
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/book/results?isbn=9782070404209 state:none'),
    ).toBeInTheDocument();
  });

  it('carries the collection through into the results query, never as location.state', async () => {
    renderPage('/libraries/lib-1/add/book?collectionId=c1');
    await userEvent.type(screen.getByLabelText(/isbn/i), '9782070404209');
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));
    expect(
      await screen.findByText(
        'landed:/libraries/lib-1/add/book/results?isbn=9782070404209&collectionId=c1 state:none',
      ),
    ).toBeInTheDocument();
  });

  it('does not navigate away when detection itself fails, and explains why in place', async () => {
    vi.mocked(detectionApi.book).mockRejectedValueOnce(
      new Error('Could not reach the server. Check your connection and try again.'),
    );
    renderPage();
    await userEvent.type(screen.getByLabelText(/isbn/i), '9782070404209');
    await userEvent.click(screen.getByRole('button', { name: /look it up/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.queryByText(/^landed:/)).not.toBeInTheDocument();
  });

  it('a decoded barcode is looked up exactly like a manual submit, with no length check first', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /simulate decode/i }));
    expect(detectionApi.book).toHaveBeenCalledWith('9782070408504');
    expect(
      await screen.findByText('landed:/libraries/lib-1/add/book/results?isbn=9782070408504 state:none'),
    ).toBeInTheDocument();
  });

  it('still offers Enter by hand, unrelated to any ISBN lookup state, and carries the collection through its own query', async () => {
    renderPage('/libraries/lib-1/add/book?collectionId=c1');
    await userEvent.click(screen.getByRole('button', { name: /^enter by hand$/i }));
    expect(
      await screen.findByText('landed:/libraries/lib-1/items/new/book?collectionId=c1 state:none'),
    ).toBeInTheDocument();
  });

  // Kept from the stub this replaces: with no collection on this screen's own URL, the manual
  // escape must add no query at all — not an empty `?collectionId=`, and never `location.state`.
  it('sends no query at all into Enter by hand with no collection on its own URL', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /^enter by hand$/i }));
    expect(
      await screen.findByText('landed:/libraries/lib-1/items/new/book state:none'),
    ).toBeInTheDocument();
  });

  // ui-v3.md task 18, Step 6: the stub row (back + wordmark) is correct only while a screen has
  // nothing to call itself. `getByText` cannot be used verbatim here as a plain page-wide query
  // — the header's own visible title and the sr-only <h1> both carry the exact string "Add a
  // book" as their own direct text, which `getByText` treats as two independent matches (dom-
  // testing-library's getNodeText looks only at each element's own text-node children, not its
  // descendants' — verified against a two-sibling probe before writing this).
  //
  // Fix round 1: `getAllByText(...).length > 0` (the first fix) only re-asserted half the
  // criterion — it catches the wordmark RETURNING, but not the header title VANISHING, because
  // the sr-only <h1> is permanent and independent of `<AppHeader>`'s own `title` prop: dropping
  // `title` entirely would leave that query still finding one match (the h1 alone) and green.
  // Scoping to the header specifically closes that gap in both directions at once — the query
  // can only be satisfied by AppHeader's own title span, and the second assertion below still
  // covers the wordmark's absence from the whole page (it can only ever render in the header,
  // but scoping it too costs nothing and keeps both assertions parallel).
  it("takes its own name rather than the stub row's wordmark", () => {
    renderPage();
    const header = within(document.querySelector('header'));
    expect(header.getByText('Add a book')).toBeInTheDocument();
    expect(header.queryByText(/alexandria/i)).not.toBeInTheDocument();
  });

  // Fix round 1: this shared message and the redirect that feeds it belong to
  // BookDetectionResults (a bare `/add/book/results` with no `?isbn=`), but the printed line
  // itself is asserted here, on the screen that renders it — mirroring AddVideo.test.jsx's
  // identical case. Asserted against the exact shared string (`NO_INPUT_MESSAGE`), not a
  // substring, so the two screens cannot silently drift apart.
  it('prints the shared no-input message when redirected back here with nothing to resolve', () => {
    renderPage('/libraries/lib-1/add/book', { noInput: true });
    expect(screen.getByText(NO_INPUT_MESSAGE)).toBeInTheDocument();
  });
});
