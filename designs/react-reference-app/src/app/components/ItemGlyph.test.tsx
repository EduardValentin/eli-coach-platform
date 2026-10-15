import { render } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ItemGlyph } from './ItemGlyph';

describe('ItemGlyph', () => {
  it('draws the icon it is given', () => {
    // arrange
    const { container } = render(<ItemGlyph icon={Activity} />);

    // act
    const icon = container.querySelector('svg');

    // assert
    expect(icon).toHaveClass('lucide-activity');
  });

  it('hides itself from assistive technology, since the item is named beside it', () => {
    // arrange
    const { container } = render(<ItemGlyph icon={Activity} />);

    // act
    const glyph = container.firstElementChild;

    // assert
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
  });
});
