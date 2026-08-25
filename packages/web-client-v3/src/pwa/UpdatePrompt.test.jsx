import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { needRefresh: false, updateServiceWorker: vi.fn(), registered: null };

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options) => {
    state.registered = options?.onRegisteredSW;
    return {
      needRefresh: [state.needRefresh, () => {}],
      updateServiceWorker: state.updateServiceWorker,
    };
  },
}));

const UpdatePrompt = (await import('./UpdatePrompt.jsx')).default;
// Registration, the hourly check and the manual one moved into the provider: `useRegisterSW` must
// be called once, and the registration it returns is the only thing that can be asked to check.
const { PWAProvider, UPDATE_CHECK_INTERVAL_MS } = await import('./PWAContext.jsx');

beforeEach(() => {
  state.needRefresh = false;
  state.updateServiceWorker = vi.fn();
});

describe('the update prompt', () => {
  it('shows nothing when no build is waiting', () => {
    render(
      <PWAProvider>
        <UpdatePrompt />
      </PWAProvider>,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('offers the new edition when a build is waiting', () => {
    state.needRefresh = true;
    render(
      <PWAProvider>
        <UpdatePrompt />
      </PWAProvider>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/new edition/i)).toBeInTheDocument();
  });

  // THE DEFECT ITSELF. A prompt that shows a banner and does not post SKIP_WAITING leaves the
  // app exactly as unupdatable as no prompt at all — the waiting worker keeps waiting. The
  // argument being `true` is the entire mechanism, so it is asserted rather than assumed.
  it('posts SKIP_WAITING and reloads, rather than only showing a banner', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    state.needRefresh = true;
    render(
      <PWAProvider>
        <UpdatePrompt />
      </PWAProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /reload/i }));

    expect(state.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('checks hourly, not every minute', () => {
    // A tighter interval does not deliver builds faster; it only widens exposure to a divergent
    // edge copy of the app shell, which is what produces phantom prompts with no deploy behind
    // them. visibilitychange covers responsiveness.
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(3_600_000);
  });

  it('re-checks when the reader returns to the app', () => {
    const update = vi.fn();
    const addEventListener = vi.spyOn(document, 'addEventListener');
    render(
      <PWAProvider>
        <UpdatePrompt />
      </PWAProvider>,
    );
    state.registered('/sw.js', { update });

    const [, handler] = addEventListener.mock.calls.find(([type]) => type === 'visibilitychange');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    handler();

    expect(update).toHaveBeenCalled();
    addEventListener.mockRestore();
  });
});
