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
});
