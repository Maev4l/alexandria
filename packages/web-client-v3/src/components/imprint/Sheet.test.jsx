import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
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
    // library name shouted in caps is exactly the case the content-is-never-uppercased rule
    // was written for.
    const heading = screen.getByRole('heading', { name: 'Bandes dessinées' });
    expect(heading.className).not.toContain('caps');
    expect(heading.className).not.toContain('uppercase');
  });

  it('returns focus to whatever opened it', async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Sheet open={open} title="Actions" onClose={() => setOpen(false)}>
            <p>Body</p>
          </Sheet>
        </>
      );
    };
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    // Not <body>: a keyboard reader must not be stranded when the sheet closes.
    expect(document.activeElement).toBe(opener);
  });

  // jsdom cannot prove that a scrollable list stops scrolling — that is layout, which jsdom
  // does not do — but locking is just an inline style assignment, which jsdom tracks exactly
  // like a real DOM does. The value asserted on close is 'scroll', not '', specifically to catch
  // a fix that resets to '' unconditionally rather than restoring whatever was really there.
  it('locks body scroll while open, and restores exactly what was there before rather than assuming it was unset', async () => {
    document.body.style.overflow = 'scroll';
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Sheet open={open} title="Actions" onClose={() => setOpen(false)}>
            <p>Body</p>
          </Sheet>
        </>
      );
    };
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.overflow = ''; // leave the shared jsdom document clean for the next test
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

  // The scrim used to be a <button aria-label="Close"> — 545–657px tall and the first stop in
  // tab order, announcing the same accessible name as the header's × a few controls later. jsdom
  // cannot prove tabbability (scripts/check-browser.mjs does, in a real browser, against real
  // `#root` inert behaviour) but it CAN prove the declaration: a plain, unlabelled div is not in
  // the tab order by construction, and there is exactly one element left claiming "Close".
  it('makes the scrim a plain div with no accessible name, leaving one control announced "Close"', () => {
    render(
      <Sheet open title="Actions">
        <p>Body</p>
      </Sheet>,
    );
    const scrim = screen.getByTestId('sheet-scrim');
    expect(scrim.tagName).toBe('DIV');
    expect(scrim).not.toHaveAttribute('aria-label');
    expect(scrim.tabIndex).toBe(-1);
    expect(screen.getAllByRole('button', { name: /close/i })).toHaveLength(1);
  });

  // DEFECT 1: the panel declared `bg-paper-deep` with no foreground of its own, so it inherited
  // whatever text colour its ambient context happened to set — `text-ink` on every ordinary
  // paper screen, but `text-paper` on item detail's inverted cover, 1.09:1, "grey on white,
  // hardly readable". jsdom cannot compute the resulting colour (that is scripts/check-browser.mjs's
  // job, proven both ways there); this only asserts the DECLARATION survives. Note it is the
  // STRICT, same-element form: ground and foreground on one class. The general rule is weaker —
  // a ground may also be answered by its text-bearing descendants each declaring their own — and
  // this component is held to the strict one deliberately, because a sheet's body is
  // caller-supplied and there is no descendant it could rely on.
  it('declares its own foreground alongside its own ground, so it never inherits an ambient colour', () => {
    render(
      <Sheet open title="Actions">
        <p>Body</p>
      </Sheet>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('bg-paper-deep');
    expect(panel.className).toContain('text-ink');
  });
});

describe('leaving a sheet', () => {
  it('offers a close control INSIDE the dialog', async () => {
    // The scrim is a real button with an accessible name, but it is a SIBLING of the panel, and
    // the panel is aria-modal="true" — so assistive tech hides everything outside it, the scrim
    // included. Escape is the only other route and a phone has no Escape key. "Long-press is
    // always duplicated by a visible affordance" has to apply to LEAVING a sheet too.
    const onClose = vi.fn();
    render(
      <Sheet open title="Bandes dessinées" onClose={onClose}>
        <p>body</p>
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog');
    const close = within(dialog).getByRole('button', { name: /close/i });
    await userEvent.click(close);

    expect(onClose).toHaveBeenCalled();
  });
});

describe('focus is trapped inside an open sheet', () => {
  const Harness = () => (
    <>
      <button type="button">outside before</button>
      <Sheet open title="Fiction" onClose={vi.fn()}>
        <button type="button">first</button>
        <button type="button">last</button>
      </Sheet>
      <button type="button">outside after</button>
    </>
  );

  // aria-modal="true" is a PROMISE to assistive tech that nothing outside the dialog is
  // reachable. Without a trap it is a lie: Tab walks straight out into the page behind, where a
  // screen reader has been told there is nothing, and the reader is silently stranded.
  it('does not let Tab walk out of the dialog', async () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');

    // Tab through more than the dialog holds; focus must still be inside it.
    for (let i = 0; i < 8; i += 1) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  // The test that distinguishes a real trap from a degenerate one. "Focus stayed in the dialog"
  // is also true of an implementation that pins focus to the panel and never moves it — which is
  // exactly what the first version of this did, invisibly, because jsdom reports offsetParent as
  // null for every element and the visibility filter emptied the list.
  it('cycles through the dialog\'s own controls rather than pinning focus', async () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');
    const inside = within(dialog).getAllByRole('button');
    expect(inside.length).toBeGreaterThan(1);

    const seen = new Set();
    for (let i = 0; i < inside.length + 1; i += 1) {
      await userEvent.tab();
      seen.add(document.activeElement);
    }

    // More than one distinct control received focus, and all of them were inside.
    expect(seen.size).toBeGreaterThan(1);
    [...seen].forEach((el) => expect(dialog.contains(el)).toBe(true));
  });

  it('does not let Shift+Tab walk out backwards either', async () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');

    for (let i = 0; i < 8; i += 1) {
      await userEvent.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});
