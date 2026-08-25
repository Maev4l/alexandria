import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FlowMarks from './FlowMarks.jsx';

describe('FlowMarks', () => {
  it('renders nothing at all when there is neither a collection nor a filed item', () => {
    const { container } = render(<FlowMarks collectionName={null} filedCount={0} />);
    // Not "renders empty": an empty wrapper would still contribute the row's own bottom margin,
    // putting 16px of dead space above the capture frame on the commonest case of all — a
    // standalone session that has not filed anything yet.
    expect(container.firstChild).toBeNull();
  });

  it('renders the collection alone before anything has been filed', () => {
    render(<FlowMarks collectionName="Blake et Mortimer" filedCount={0} />);
    expect(screen.getByText('Blake et Mortimer')).toBeInTheDocument();
    expect(screen.queryByText(/filed this session/i)).not.toBeInTheDocument();
  });

  it('renders the tally alone when filing standalone', () => {
    render(<FlowMarks collectionName={null} filedCount={3} />);
    expect(screen.getByText(/filed this session/i)).toBeInTheDocument();
    expect(screen.getByText('3', { selector: '[data-mark="session-tally"]' })).toBeInTheDocument();
  });

  it('sets the figure in the mono and the label in caps, per DESIGN.md §3', () => {
    render(<FlowMarks collectionName={null} filedCount={9} />);
    const figure = screen.getByText('9', { selector: '[data-mark="session-tally"]' });
    // The DECLARATION only — whether `.num` resolves to Chivo Mono is a computed-style fact
    // jsdom cannot see, and is asserted by check:browser's MONO_FIELDS entry for this file.
    expect(figure).toHaveClass('num');
    expect(figure.parentElement).toHaveClass('caps');
  });
});
