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

  it('pins the search field by default and links it to the search surface', () => {
    renderHeader({ wordmark: true });
    expect(screen.getByRole('link', { name: /search every library/i })).toHaveAttribute(
      'href',
      '/search',
    );
  });

  it('drops the pinned search field on the inverted cover', () => {
    renderHeader({ inverted: true, onBack: () => {} });
    expect(screen.queryByRole('link', { name: /search every library/i })).toBeNull();
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

  it('renders whatever the right slot is given, since it differs per screen', () => {
    renderHeader({ wordmark: true, right: <span>JR</span> });
    expect(screen.getByText('JR')).toBeInTheDocument();
  });

  it('pads for the notch', () => {
    const { container } = renderHeader({ wordmark: true });
    expect(container.querySelector('header').className).toContain('pad-top-safe');
  });
});
