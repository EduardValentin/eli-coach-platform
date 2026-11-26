import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ComingSoon } from './ComingSoon';

function renderPage() {
  render(
    <MemoryRouter>
      <ComingSoon />
    </MemoryRouter>,
  );
}

describe('ComingSoon', () => {
  it('has one heading and a main landmark named Coming soon', () => {
    // arrange
    renderPage();

    // act
    const headings = screen.getAllByRole('heading');

    // assert
    expect(headings).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Evoa is almost here.' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Coming soon' })).toBeInTheDocument();
  });

  it('says what Evoa is and that the site opens soon', () => {
    // arrange
    renderPage();

    // act
    const description = screen.getByText(
      'Strength, nutrition, and cycle-aware coaching. The full site opens soon.',
    );

    // assert
    expect(description).toBeInTheDocument();
    expect(screen.getByText('Coming soon', { selector: 'p' })).toBeInTheDocument();
  });

  it('offers nothing to click and hides the brand mark from assistive tech', () => {
    // arrange
    renderPage();

    // act
    const mark = document.querySelector('[data-parity="brand-mark"]');

    // assert
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });
});
