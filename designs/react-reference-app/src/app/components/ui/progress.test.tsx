import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './progress';

describe('Progress', () => {
  it('reports how far it has got', () => {
    // arrange
    const value = 40;

    // act
    render(<Progress aria-label="Upload progress" value={value} />);

    // assert
    const bar = screen.getByRole('progressbar', { name: 'Upload progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('data-state', 'loading');
  });

  it('moves a segment with no value while the end is unknown, and holds it still for reduced motion', () => {
    // arrange
    const label = 'Preparing pages';

    // act
    render(<Progress aria-label={label} />);

    // assert
    const bar = screen.getByRole('progressbar', { name: label });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('data-state', 'indeterminate');
    const indicator = bar.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveClass(
      'animate-progress-indeterminate',
      'motion-reduce:animate-none',
      'motion-reduce:w-full',
    );
  });
});
