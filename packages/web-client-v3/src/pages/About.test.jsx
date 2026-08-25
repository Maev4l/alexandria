import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import About from './About.jsx';
import { PWAContext } from '@/pwa/PWAContext.jsx';
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

// Reported from the deployed app: the update prompt "missing", and no way to check. It was not
// broken — there was no newer build to offer, and nothing said so. An automatic prompt with
// nothing to announce and a dead one are indistinguishable from outside, which is what this
// control answers.
describe('About: checking for a new edition', () => {
  const renderWithPWA = (pwa) =>
    render(
      <MemoryRouter>
        <PWAContext.Provider value={{ needRefresh: false, applyUpdate: () => {}, ...pwa }}>
          <About />
        </PWAContext.Provider>
      </MemoryRouter>,
    );

  it('offers a check', () => {
    renderWithPWA({ checkForUpdate: vi.fn(), checkState: 'idle' });
    expect(screen.getByRole('button', { name: /check for a new edition/i })).toBeInTheDocument();
  });

  it('runs the check when asked', async () => {
    const checkForUpdate = vi.fn();
    renderWithPWA({ checkForUpdate, checkState: 'idle' });
    await userEvent.click(screen.getByRole('button', { name: /check for a new edition/i }));
    expect(checkForUpdate).toHaveBeenCalled();
  });

  // THE ASSERTION THAT MATTERS. A check that finds nothing and says nothing is exactly the state
  // that was reported as a defect, so the ordinary answer has to be spoken.
  it('says you are current when the check finds nothing', () => {
    renderWithPWA({ checkForUpdate: vi.fn(), checkState: 'current' });
    expect(screen.getByRole('status')).toHaveTextContent(/newest edition/i);
  });

  it('reports a check that could not run, rather than calling it up to date', () => {
    // "Up to date" here would be a lie: the check did not happen. No registration means no worker
    // took control — on a dev server, or if registration failed.
    renderWithPWA({ checkForUpdate: vi.fn(), checkState: 'failed' });
    expect(screen.getByRole('status')).toHaveTextContent(/could not run/i);
  });

  it('stays quiet about being current when a build IS waiting — the notice says that', () => {
    renderWithPWA({ checkForUpdate: vi.fn(), checkState: 'current', needRefresh: true });
    expect(screen.queryByText(/newest edition/i)).toBeNull();
  });
});

