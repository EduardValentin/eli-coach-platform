import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ItemIdentity } from './ItemIdentity';

describe('ItemIdentity', () => {
  it('names the item in bold primary ink', () => {
    // arrange
    render(<ItemIdentity icon={Activity} title="Back squat" />);

    // act
    const title = screen.getByText('Back squat');

    // assert
    expect(title).toHaveClass('text-sm', 'font-semibold', 'text-text-primary');
  });

  it('follows the name with its summary in small secondary ink', () => {
    // arrange
    render(<ItemIdentity icon={Activity} title="Back squat" summary="Strength · Barbell" />);

    // act
    const summary = screen.getByText('Strength · Barbell');

    // assert
    expect(summary).toHaveClass('mt-0.5', 'text-xs', 'text-text-secondary');
  });

  it('shows no summary line when the item has none', () => {
    // arrange
    const { container } = render(<ItemIdentity icon={Activity} title="Back squat" />);

    // act
    const lines = container.querySelectorAll('p');

    // assert
    expect(lines).toHaveLength(1);
  });

  it("leads with the item's glyph, hidden from assistive technology", () => {
    // arrange
    const { container } = render(<ItemIdentity icon={Activity} title="Back squat" />);

    // act
    const glyph = container.querySelector('svg.lucide-activity')?.parentElement;

    // assert
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks the glyph and the summary with the parity hooks it is given', () => {
    // arrange
    const { container } = render(
      <ItemIdentity
        icon={Activity}
        title="Back squat"
        summary="Strength · Barbell"
        glyphParity="exercise-glyph"
        summaryParity="exercise-summary"
      />,
    );

    // act
    const glyph = container.querySelector('[data-parity="exercise-glyph"]');
    const summary = screen.getByText('Strength · Barbell');

    // assert
    expect(glyph).toContainElement(container.querySelector('svg'));
    expect(summary).toHaveAttribute('data-parity', 'exercise-summary');
  });
});
