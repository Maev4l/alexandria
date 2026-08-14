import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IndexLetter from './IndexLetter.jsx';

describe('IndexLetter', () => {
  it('is a separator, not a heading — it marks position, it does not title a section', () => {
    render(<IndexLetter letter="A" count={2} />);
    expect(screen.getByRole('separator')).toHaveAccessibleName('Titles beginning A');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('shows no count on the run still filling', () => {
    render(<IndexLetter letter="Z" count={null} />);
    expect(screen.queryByText(/volume/)).toBeNull();
  });

  it('says one volume, not one volumes', () => {
    render(<IndexLetter letter="A" count={1} />);
    expect(screen.getByText('1 volume')).toBeInTheDocument();
  });

  it('pluralises everything else', () => {
    render(<IndexLetter letter="A" count={14} />);
    expect(screen.getByText('14 volumes')).toBeInTheDocument();
  });

  it('names the tail bucket honestly rather than folding it to a letter', () => {
    render(<IndexLetter letter="Œ" count={1} />);
    expect(screen.getByRole('separator')).toHaveAccessibleName('Titles beginning Œ');
  });
});
