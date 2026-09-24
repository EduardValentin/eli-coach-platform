import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Reading } from './Reading';

describe('Reading', () => {
  it('renders the label and default-size value', () => {
    render(<Reading label="Height & weight" value="5'6&quot; / 145 lb" />);

    expect(screen.getByText('Height & weight')).toBeVisible();
    expect(screen.getByText('5\'6" / 145 lb')).toHaveClass('text-sm');
  });

  it('renders a large value with its unit', () => {
    render(<Reading label="Weight change" size="lg" unit="kg" value="-1.9" />);

    const value = screen.getByText('-1.9');
    expect(value).toHaveClass('text-2xl');
    expect(screen.getByText('kg')).toBeVisible();
  });

  it('renders as a definition-list item', () => {
    render(<Reading as="dl-item" label="Bundle" value="3 months" />);

    expect(screen.getByText('Bundle').tagName).toBe('DT');
    expect(screen.getByText('3 months').tagName).toBe('DD');
  });
});
