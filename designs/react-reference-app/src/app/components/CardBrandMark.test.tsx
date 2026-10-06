import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardBrandMark } from './CardBrandMark';

function renderedMark(brand: Parameters<typeof CardBrandMark>[0]['brand']) {
  const { container } = render(<CardBrandMark brand={brand} />);
  const mark = container.querySelector('svg');
  if (!mark) throw new Error('No mark rendered');

  return mark;
}

describe('the card brand mark', () => {
  it('draws the Visa mark for a Visa card', () => {
    // arrange
    const brand = 'visa';

    // act
    const mark = renderedMark(brand);

    // assert
    expect(mark).toHaveAttribute('data-mark', 'visa');
  });

  it('draws the Mastercard mark for a Mastercard', () => {
    // arrange
    const brand = 'mastercard';

    // act
    const mark = renderedMark(brand);

    // assert
    expect(mark).toHaveAttribute('data-mark', 'mastercard');
  });

  it('draws the neutral card mark for any other brand', () => {
    // arrange
    const brand = 'amex';

    // act
    const mark = renderedMark(brand);

    // assert
    expect(mark).toHaveAttribute('data-mark', 'card');
  });

  it('stays out of the accessibility tree and fills the tile inside its border', () => {
    // arrange
    const brand = 'visa';

    // act
    const mark = renderedMark(brand);

    // assert
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveAttribute('viewBox', '0 0 46 30');
  });
});
