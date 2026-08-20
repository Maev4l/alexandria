import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import About from './About.jsx';
import { config } from '@/config.js';

const renderPage = () =>
  render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  );

describe('About', () => {
  it('names itself in the header and drops the wordmark', () => {
    renderPage();
    expect(within(screen.getByRole('banner')).getByText('About')).toBeInTheDocument();
    expect(screen.queryByText('Alexandria')).not.toBeInTheDocument();
  });

  it('prints the build this reader is actually running', () => {
    renderPage();
    expect(screen.getByText(config.appVersion)).toBeInTheDocument();
    expect(screen.getByText(config.buildHash)).toBeInTheDocument();
  });

  it('says what the build marks are for, so they are not decoration', () => {
    renderPage();
    expect(screen.getByText(/report|wrong|administrator/i)).toBeInTheDocument();
  });

  it('offers no account deletion, because the API has no such endpoint', () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/delete/i);
  });
});
