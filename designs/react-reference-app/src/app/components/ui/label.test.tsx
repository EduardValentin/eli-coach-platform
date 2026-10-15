import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label, RequiredMark } from './label';

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

  it('sets the star snug against the label text', () => {
    // arrange
    render(<Label htmlFor="name" required>Name</Label>);

    // act
    const star = screen.getByText('*');

    // assert
    expect(star).toHaveClass('-ml-1.5');
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

  it('lets a long name and its qualifiers wrap on a shared baseline', () => {
    // arrange
    render(<Label htmlFor="waist" layout="wrap" required>Waist</Label>);

    // act
    const label = screen.getByText('Waist');

    // assert
    expect(label).toHaveClass('flex-wrap', 'items-baseline', 'gap-1.5');
    expect(label).not.toHaveClass('items-center', 'gap-2');
    expect(screen.getByText('*')).toHaveClass('-ml-1');
  });

  it('places the star after the name and before its qualifiers', () => {
    // arrange
    render(
      <Label htmlFor="waist" layout="wrap" required trailing={<span>(cm)</span>}>
        Waist
      </Label>,
    );

    // act
    const label = screen.getByText('Waist');

    // assert
    expect(label).toHaveTextContent(/^Waist\* \(required\)\(cm\)$/);
  });
});

describe('RequiredMark', () => {
  it('stars running text with a hidden star and a spoken "(required)"', () => {
    // arrange & act
    render(
      <p>
        I agree to the terms.
        <RequiredMark />
      </p>,
    );

    // assert
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('*')).toHaveClass('ml-0.5');
    expect(screen.getByText('(required)')).toHaveClass('sr-only');
  });
});
