import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PendingApproval from './PendingApproval.jsx';

vi.mock('@/auth/AuthContext.jsx', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

describe('PendingApproval', () => {
  // --out means on loan and nothing else, ever. This badge wore the
  // Overprint Stamp's own construction on a screen that holds no items at all, so the one
  // colour the palette reserves for circulation was marking an account state.
  it('marks the state with an ink rule, never with the lent colour', () => {
    render(
      <MemoryRouter>
        <PendingApproval />
      </MemoryRouter>,
    );
    const badge = screen.getByText(/pending approval/i);
    expect(badge.className).toContain('border-ink');
    expect(badge.className).not.toContain('border-out');
  });
});
