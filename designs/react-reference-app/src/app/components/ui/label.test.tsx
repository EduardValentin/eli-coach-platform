import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label, LabelSuffix, Legend, RequiredMark } from './label';

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

  it('places the star after the name and before its qualifiers', () => {
    // arrange
    render(
      <Label htmlFor="waist" layout="wrap" required trailing={<LabelSuffix>(cm)</LabelSuffix>}>
        Waist
      </Label>,
    );

    // act
    const label = screen.getByText('Waist');

    // assert
    expect(label).toHaveTextContent(/^Waist\* \(required\)\(cm\)$/);
  });
});

describe('Legend', () => {
  it('names the group of fields it heads', () => {
    // arrange & act
    render(
      <fieldset>
        <Legend>How do you measure?</Legend>
        <input aria-label="Metric" type="radio" />
      </fieldset>,
    );

    // assert
    expect(screen.getByRole('group', { name: 'How do you measure?' })).toBeInTheDocument();
  });

  it('stars a required group, hides the star, and names the group as required', () => {
    // arrange & act
    render(
      <fieldset>
        <Legend required>Where do you train?</Legend>
        <input aria-label="Gym" type="radio" />
      </fieldset>,
    );

    // assert
    expect(
      screen.getByRole('group', { name: 'Where do you train? (required)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('RequiredMark', () => {
  it('stars running text with a hidden star and a spoken "(required)"', () => {
    // arrange & act
    render(
      <label>
        <input type="checkbox" />
        I agree to the terms.
        <RequiredMark />
      </label>,
    );

    // assert
    expect(
      screen.getByRole('checkbox', { name: 'I agree to the terms. (required)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });
});
