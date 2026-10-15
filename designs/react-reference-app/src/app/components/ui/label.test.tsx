import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from './label';

describe('Label', () => {
  it('shows a hidden star and names the field as required', () => {
    // arrange & act
    render(
      <>
        <Label htmlFor="name" required>Name</Label>
        <input id="name" />
      </>,
    );

    // assert
    expect(screen.getByRole('textbox', { name: 'Name (required)' })).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows nothing extra when the field is optional', () => {
    // arrange & act
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <input id="name" />
      </>,
    );

    // assert
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });
});
