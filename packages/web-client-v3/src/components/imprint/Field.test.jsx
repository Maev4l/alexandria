import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Field from './Field.jsx';

describe('Field', () => {
  it('renders a plain field with no reveal control for a non-password type', () => {
    render(<Field label="Email" type="email" onChange={() => {}} />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens masked, every mount — the only safe default', () => {
    render(<Field label="Password" type="password" onChange={() => {}} />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('reveals what was typed on click, and names the action rather than the state', async () => {
    render(<Field label="Password" type="password" onChange={() => {}} />);
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    await userEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    // The label changes to the next action, not to a state word — and there is no aria-pressed
    // alongside it, which would announce the same fact twice in two registers.
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide password' })).not.toHaveAttribute(
      'aria-pressed',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('is a type="button", so it never submits the form it lives in', async () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Field label="Password" type="password" onChange={() => {}} />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('never remembers: unmounting and remounting opens masked again', async () => {
    const { unmount } = render(<Field label="Password" type="password" onChange={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    unmount();

    // A fresh mount — the shape of a route change landing back on a screen that carries a
    // password field. Nothing revealed here may have been carried over: no localStorage, no
    // module-level variable, no context outliving the component that would let a revealed
    // password survive a back-navigation onto a screen someone else can see.
    render(<Field label="Password" type="password" onChange={() => {}} />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  // A bare `100` (or, at the moment it matters most, a bare `3`) is an unlabelled number. The
  // ruling is `<n> LEFT` — same split IndexLetter's own count already makes (its test asserts
  // this identical shape): the figure alone sits in `.num`, the word stays in the sans.
  describe('counter', () => {
    it('renders nothing when there is no counter to show', () => {
      const { container } = render(<Field label="Title" onChange={() => {}} />);
      expect(container.querySelector('.num')).toBeNull();
    });

    it('labels the figure: "<n> LEFT", not a bare number', () => {
      const { container } = render(<Field label="Title" counter={3} onChange={() => {}} />);
      // getByText can't match the whole phrase in one node (split across two spans, the same
      // reason IndexLetter.test.jsx reads via toHaveTextContent rather than getByText).
      expect(screen.getByText('left')).toBeInTheDocument();
      expect(container.querySelector('.num')).toHaveTextContent('3 left');
    });

    // The seed instance for the whole sweep was exactly this shape (IndexLetter's "volume"/
    // "volumes"): a word sitting inside `.num` is DESIGN.md §3's category error. Only the
    // figure may be mono; "left" must resolve to the sans.
    it('keeps the word out of the mono: only the figure is a numeral', () => {
      const { container } = render(<Field label="Title" counter={97} onChange={() => {}} />);
      const wrapper = container.querySelector('.num');
      const figureOnly = wrapper.childNodes[0].textContent;
      expect(figureOnly).toBe('97');
      expect(screen.getByText('left')).toHaveClass('font-sans');
    });

    it('shows 0 left, not nothing, at the limit', () => {
      const { container } = render(<Field label="Title" counter={0} onChange={() => {}} />);
      expect(container.querySelector('.num')).toHaveTextContent('0 left');
    });
  });

  // `required` announces "<label>, required" WHILE the reader is in the field — where the fix
  // actually happens — rather than only at a disabled submit button, where a sighted reader
  // merely observes the consequence. Every form using Field already sets `noValidate`, so this
  // never raises the browser's own validation bubble (DESIGN.md §9 refuses platform chrome).
  describe('required', () => {
    it('exposes a required field as required to the accessibility tree', () => {
      render(<Field label="ISBN" required onChange={() => {}} />);
      const input = screen.getByLabelText('ISBN');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('leaves an ordinary field alone — no required attribute invented', () => {
      render(<Field label="Summary" onChange={() => {}} />);
      const input = screen.getByLabelText('Summary');
      expect(input).not.toBeRequired();
      expect(input).not.toHaveAttribute('aria-required');
    });
  });
});
