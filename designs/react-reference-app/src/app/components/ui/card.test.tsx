import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('draws a listing item on the bordered white surface with the soft shadow and card corners', () => {
    // arrange
    const label = 'Chicken rice bowl';

    // act
    render(
      <Card variant="item" role="article" aria-label={label}>
        {label}
      </Card>,
    );

    // assert
    expect(screen.getByRole('article', { name: label })).toHaveClass(
      'border',
      'rounded-card',
      'border-border-subtle',
      'bg-surface-base',
      'shadow-soft',
    );
  });

  it('lets a past listing item drop its shadow and keep the rest of the surface', () => {
    // arrange
    const label = 'Past call';

    // act
    render(
      <Card variant="item" role="article" aria-label={label} className="shadow-none">
        {label}
      </Card>,
    );

    // assert
    const card = screen.getByRole('article', { name: label });
    expect(card).toHaveClass('shadow-none', 'rounded-card', 'border-border-subtle', 'bg-surface-base');
    expect(card).not.toHaveClass('shadow-soft');
  });
});
