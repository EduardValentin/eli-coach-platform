import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Stepper } from './stepper';

describe('Stepper', () => {
  it('gives the step count the id it is given, so a heading can be described by it', () => {
    // arrange
    const props = { countId: 'onboarding-step-count', current: 2, total: 5 };

    // act
    render(
      <>
        <h2 aria-describedby="onboarding-step-count">Your goal</h2>
        <Stepper {...props} />
      </>,
    );

    // assert
    expect(
      screen.getByRole('heading', { name: 'Your goal' }),
    ).toHaveAccessibleDescription('Step 2 of 5');
  });
});
