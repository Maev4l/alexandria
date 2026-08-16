import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppHeader from './AppHeader.jsx';

const renderHeader = (props) =>
  render(
    <MemoryRouter>
      <AppHeader {...props} />
    </MemoryRouter>,
  );

describe('AppHeader', () => {
  it('shows the imprint wordmark at the root', () => {
    renderHeader({ wordmark: true });
    expect(screen.getByText('Alexandria')).toBeInTheDocument();
  });

  it('pins a REAL search input, not a link costumed as one', () => {
    renderHeader({ wordmark: true });
    // It was a <Link> with the box, the placeholder and the magnifier, accepting no keystroke —
    // which inverted the product's first principle: the front door did not open.
    const field = screen.getByRole('searchbox', { name: /search every library/i });
    expect(field.tagName).toBe('INPUT');
    expect(screen.queryByRole('link', { name: /search every library/i })).toBeNull();
  });

  it('gives the field the imprint ground, because finding is the dominant job', () => {
    const { container } = renderHeader({ wordmark: true });
    expect(container.querySelector('[role=search]').className).toContain('bg-imprint');
  });

  it('does not embolden the placeholder, which would read as a button rather than a field', () => {
    renderHeader({ wordmark: true });
    const field = screen.getByRole('searchbox', { name: /search every library/i });
    expect(field.className).toContain('font-normal');
  });

  it('drops the pinned search field on the inverted cover', () => {
    renderHeader({ inverted: true, onBack: () => {} });
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('renders a back control when onBack is given', async () => {
    const onBack = vi.fn();
    renderHeader({ title: 'Fiction', onBack });
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('does not uppercase the library title, which may be French', () => {
    renderHeader({ title: 'Bandes dessinées', onBack: () => {} });
    const title = screen.getByText('Bandes dessinées');
    expect(title.className).not.toContain('uppercase');
    expect(title.className).not.toContain('caps');
  });

  it('scrolls to top when the title is tapped, per the iOS convention', async () => {
    const onTitleTap = vi.fn();
    renderHeader({ title: 'Fiction', onBack: () => {}, onTitleTap });
    await userEvent.click(screen.getByText('Fiction'));
    expect(onTitleTap).toHaveBeenCalledOnce();
  });

  // The title used to render as a <button> even with no onTitleTap, so a screen reader announced
  // "Fiction, button" for a control that did nothing on activation.
  it('renders the title as plain text, not a button, when there is no onTitleTap to fire', () => {
    renderHeader({ title: 'Fiction', onBack: () => {} });
    const title = screen.getByText('Fiction');
    expect(title.tagName).toBe('SPAN');
    expect(screen.queryByRole('button', { name: /fiction/i })).toBeNull();
  });

  it('renders the title as a button, with the 48px touch target, only when onTitleTap is given', () => {
    renderHeader({ title: 'Fiction', onBack: () => {}, onTitleTap: vi.fn() });
    const button = screen.getByRole('button', { name: /fiction/i });
    expect(button.className).toContain('min-h-12');
    expect(button.className).toContain('min-w-0');
  });

  it('renders whatever the right slot is given, since it differs per screen', () => {
    renderHeader({ wordmark: true, right: <span>JR</span> });
    expect(screen.getByText('JR')).toBeInTheDocument();
  });

  it('pads for the notch', () => {
    const { container } = renderHeader({ wordmark: true });
    expect(container.querySelector('header').className).toContain('pad-top-safe');
  });
});
