import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LedgerRow from './LedgerRow.jsx';

// A closed loan and an open one — the two shapes `pairLoanEvents` produces (loans.js), used
// directly here rather than via the pairing function: that function already has its own tests
// (loans.test.js), and this file only checks how a paired loan RENDERS.
const closedLoan = {
  name: 'Jean-Raymond',
  lentAt: '2026-08-01T10:00:00Z',
  returnedAt: '2026-08-18T10:00:00Z',
  days: 17,
  open: false,
  unresolved: false,
};

const openLoan = {
  name: 'Marie',
  lentAt: '2026-08-07T10:00:00Z',
  returnedAt: null,
  days: 6,
  open: true,
  unresolved: false,
};

// The third shape `pairLoanEvents` produces (loans.js): a LENT superseded by another LENT with
// no RETURNED in between. Unlike an open loan this one DID end — something else started
// afterwards — it just has no recorded return date.
const unresolvedLoan = {
  name: 'Léa',
  lentAt: '2026-03-11T14:00:00Z',
  returnedAt: null,
  days: 70,
  open: false,
  unresolved: true,
};

describe('LedgerRow', () => {
  // Defect 1: `loan.name` was set by pairLoanEvents and never rendered, so the row answered
  // "when" but never "who" — the exact question PRODUCT.md says the product exists for.
  it('renders the borrower, not just dates', () => {
    render(<LedgerRow loan={openLoan} />);
    expect(screen.getByText('Marie')).toBeInTheDocument();
  });

  it('reads the name from the LENT event only: it never renders a RETURNED name instead', () => {
    // pairLoanEvents already discards the RETURNED event's name (loans.js `close()` uses
    // `open.name`), so a loan object never actually carries a separate returner name — this
    // pins that a differently-named field on the object couldn't leak through the row either.
    const loanWithStrayReturnerField = { ...closedLoan, returnedBy: 'Someone Else' };
    render(<LedgerRow loan={loanWithStrayReturnerField} />);
    expect(screen.getByText('Jean-Raymond')).toBeInTheDocument();
    expect(screen.queryByText('Someone Else')).toBeNull();
  });

  it('lays the loan out as two lines: borrower+duration, then the date range', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    const lines = container.firstChild.children;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent('Jean-Raymond');
    expect(lines[0]).toHaveTextContent('17 days');
    expect(lines[1]).toHaveTextContent('01 Aug 2026');
    expect(lines[1]).toHaveTextContent('18 Aug 2026');
  });

  // The ruling: an open loan has no second half at all — not "still out", nothing. There is no
  // second date, and the loan is already stamped OUT elsewhere (DetailMarks on the cover, or
  // this row's own bare OverprintStamp when boxed) — printing "still out" beside that stamp
  // would say the same thing twice.
  it('states an open loan as LENT <date> alone — no "still out", no second half', () => {
    const { container } = render(<LedgerRow loan={openLoan} />);
    const dateLine = container.firstChild.children[1];
    expect(dateLine).toHaveTextContent('Lent 07 Aug 2026');
    expect(screen.queryByText(/still out/i)).toBeNull();
    expect(screen.queryByText(/returned/i)).toBeNull();
    expect(screen.queryByText(/overdue|due/i)).toBeNull();
  });

  it('states a closed loan as LENT <date> · RETURNED <date>, both labels present', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    const dateLine = container.firstChild.children[1];
    expect(dateLine).toHaveTextContent('Lent 01 Aug 2026 · Returned 18 Aug 2026');
  });

  // Round 2 of the ruling: an unresolved pairing shares the OPEN row's line-2 grammar —
  // `LENT <date>` alone, no RETURNED label. A `RETURNED —` here would restate, in a weaker
  // form, exactly what the duration slot on line 1 already states precisely ("no return
  // recorded") — the same "nothing is labelled twice" reasoning that drops "still out" from an
  // open loan's line 2 because its own stamp already says it.
  it('states an unresolved loan as LENT <date> alone — same line-2 grammar as an open loan', () => {
    const { container } = render(<LedgerRow loan={unresolvedLoan} />);
    const dateLine = container.firstChild.children[1];
    expect(dateLine).toHaveTextContent('Lent 11 Mar 2026');
    expect(dateLine).not.toHaveTextContent(/returned/i);
  });

  it('distinguishes an unresolved loan from an open one on line 1 (duration), not line 2', () => {
    const openLines = render(<LedgerRow loan={openLoan} />).container.firstChild.children;
    const unresolvedLines = render(<LedgerRow loan={unresolvedLoan} />).container.firstChild
      .children;
    // Line 2 is identical in shape for both — `LENT <date>` alone.
    expect(openLines[1]).toHaveTextContent(/^lent \d{2} \w{3} \d{4}$/i);
    expect(unresolvedLines[1]).toHaveTextContent(/^lent \d{2} \w{3} \d{4}$/i);
    // Line 1's duration slot is where the two facts actually differ.
    expect(openLines[0]).toHaveTextContent('6 days');
    expect(unresolvedLines[0]).toHaveTextContent('no return recorded');
    expect(unresolvedLines[0]).not.toHaveTextContent(/\d+ days/);
  });

  it('never renders the rightwards arrow anywhere — the glyph neither face has', () => {
    render(<LedgerRow loan={closedLoan} />);
    expect(screen.queryByText(/→/)).toBeNull();
  });

  // The name is content and authored by whoever typed it into the Lend sheet — it sets in the
  // sans. Only the dates and the day count are numerals, and take the mono utility (`.num`):
  // a name in mono is the category error the Plate Line already warns
  // about, and this component must not import it.
  it('sets the name in the sans, never the mono', () => {
    render(<LedgerRow loan={closedLoan} />);
    const name = screen.getByText('Jean-Raymond');
    expect(name.className).not.toMatch(/\bnum\b/);
    expect(name.closest('.num')).toBeNull();
  });

  // Round 2 of the ruling: "9 days"/"17 days" is a FIGURE plus a unit WORD, not one numeral —
  // only the figure is mono. This was invisible while the whole app fell back to `system-ui`
  // (no face was distinguishable), and the font fix that surfaced the `→` gap surfaced this
  // one too: "days" was rendering in Chivo Mono on every row, the exact category error the
  // Plate Line entry already names for a person's name.
  it('splits the duration: the figure takes the mono, "days" stays in the sans', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    const durationLine = container.firstChild.children[0];
    expect(durationLine).toHaveTextContent('17 days');
    const figure = durationLine.querySelector('.num');
    expect(figure).not.toBeNull();
    expect(figure.textContent).toBe('17');
    // "days" itself must not sit inside any `.num`-classed element.
    const monoText = [...durationLine.querySelectorAll('.num')].map((el) => el.textContent).join('');
    expect(monoText).not.toMatch(/days/);
  });

  // An unresolved loan's duration slot has no numeral in it at all ("no return recorded"), so
  // none of it may sit inside `.num` — a WORD in the mono is the same category error the
  // figure-and-unit split above exists to prevent.
  it('renders "no return recorded" entirely in the sans — it has no numeral to be mono', () => {
    const { container } = render(<LedgerRow loan={unresolvedLoan} />);
    const durationLine = container.firstChild.children[0];
    expect(durationLine).toHaveTextContent('no return recorded');
    expect(durationLine.querySelector('.num')).toBeNull();
  });

  // Line 2 is now mixed: LENT/RETURNED are interface labels and take the sans (`caps`, never
  // `.num`), while only the date values themselves are numerals. A name in mono was the
  // category error the Plate Line warns about — a LABEL in mono would be the same error.
  it('keeps LENT/RETURNED in the sans (caps) and only the dates themselves in the mono', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    const dateLine = container.firstChild.children[1];
    const labels = [...dateLine.querySelectorAll('.caps')].map((el) => el.textContent);
    expect(labels).toEqual(['Lent', 'Returned']);
    for (const label of dateLine.querySelectorAll('.caps')) {
      expect(label.className).not.toMatch(/\bnum\b/);
    }
    const dateValues = [...dateLine.querySelectorAll('.num')].map((el) => el.textContent);
    expect(dateValues).toEqual(['01 Aug 2026', '18 Aug 2026']);
  });

  // Defect 2: the row must be able to take inset padding when it sits inside a bordered card
  // (ItemHistory) without doing so on item detail's flush inline ledger — and the switch is a
  // dedicated `boxed` prop, not a side effect of `inverted`, which is a surface fact (paper vs.
  // the black cover) and would break the moment a boxed ledger ever appears on a cover.
  it('adds no horizontal padding by default (the flush inline ledger on item detail)', () => {
    const { container } = render(<LedgerRow loan={closedLoan} />);
    expect(container.firstChild.className).not.toMatch(/\bpx-4\b/);
  });

  it('insets with px-4 only when boxed is set (the bordered card on item history)', () => {
    const { container } = render(<LedgerRow loan={closedLoan} boxed />);
    expect(container.firstChild.className).toMatch(/\bpx-4\b/);
  });

  it('boxed and inverted are independent: boxed insets on the cover too', () => {
    const { container } = render(<LedgerRow loan={closedLoan} boxed inverted />);
    expect(container.firstChild.className).toMatch(/\bpx-4\b/);
    expect(container.firstChild.className).toMatch(/\bborder-cover-rule\b/);
  });

  it('un-boxed stays flush even when inverted (item detail hero)', () => {
    const { container } = render(<LedgerRow loan={closedLoan} inverted />);
    expect(container.firstChild.className).not.toMatch(/\bpx-4\b/);
  });

  // Round 5 critique #6: an open loan on the paper surface (item history's boxed card) carried
  // no stamp at all. Gated on `boxed` — the existing signal for "this is the paper ledger card"
  // — rather than a new prop, since item detail's own inline ledger already states the open
  // loan via DetailMarks' Overprint Stamp and must not gain a second one.
  it('stamps an open loan OUT when boxed (item history), bare — no name or days of its own', () => {
    render(<LedgerRow loan={openLoan} boxed />);
    const stamp = screen.getByLabelText('On loan');
    expect(stamp).toHaveTextContent(/^out$/i);
  });

  it('does not stamp a closed loan, even when boxed', () => {
    render(<LedgerRow loan={closedLoan} boxed />);
    expect(screen.queryByLabelText(/on loan/i)).toBeNull();
  });

  it('does not stamp an open loan when unboxed — item detail already carries the stamp itself', () => {
    render(<LedgerRow loan={openLoan} inverted />);
    expect(screen.queryByLabelText(/on loan/i)).toBeNull();
  });

  // Every colour rule below is a surface pairing: the cover set (`--cover-*`) only appears
  // together with `inverted`, and the paper set only without it — never mixed. A ground's text
  // is coloured at or below it, and never inherited across a surface boundary.
  it('never mixes the two surfaces’ secondary tones', () => {
    const paper = render(<LedgerRow loan={closedLoan} />).container.firstChild;
    expect(paper.className).toMatch(/\btext-ink-soft\b/);
    expect(paper.className).not.toMatch(/cover-soft|cover-body|cover-rule/);

    const cover = render(<LedgerRow loan={closedLoan} inverted />).container.firstChild;
    expect(cover.className).toMatch(/\btext-cover-soft\b/);
    expect(cover.className).not.toMatch(/\btext-ink-soft\b/);
  });
});
