import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SharedRibbon from './SharedRibbon.jsx';

describe('SharedRibbon', () => {
  // A count beside its own label is a labelled datum, which §3 puts in the mono. This
  // component's own comment said so — "Mono is for the count, not the word or the address" —
  // and the change that took the mono off the word and the address never put it on the count.
  it('sets the outbound count in the mono and the word in the sans', () => {
    render(<SharedRibbon direction="out" count={3} />);
    const figure = screen.getByText('3');
    expect(figure.className).toContain('num');
    expect(screen.getByText(/shared/i).className).not.toContain('num');
  });

  // An address is content, never a numeral. This is the regression the mono guard caught once.
  it('never sets the owner address in the mono', () => {
    render(<SharedRibbon direction="in" owner="marie@example.com" />);
    expect(screen.getByText('marie@example.com').className).not.toContain('num');
  });
});
