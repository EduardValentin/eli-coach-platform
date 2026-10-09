import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ErrorPageLink } from './ErrorPage';

function renderLink(direction: 'back' | 'forward') {
  render(
    <MemoryRouter>
      <ErrorPageLink direction={direction} to="/somewhere">
        Take me there
      </ErrorPageLink>
    </MemoryRouter>,
  );

  return screen.getByRole('link', { name: 'Take me there' });
}

describe('ErrorPageLink', () => {
  it('points a back action left, before the label', () => {
    // arrange
    // act
    const link = renderLink('back');

    // assert
    expect(link).toHaveAttribute('href', '/somewhere');
    expect(link.firstElementChild).toHaveClass('lucide-arrow-left');
    expect(link.querySelector('.lucide-arrow-right')).toBeNull();
  });

  it('points a forward action right, after the label', () => {
    // arrange
    // act
    const link = renderLink('forward');

    // assert
    expect(link.lastElementChild).toHaveClass('lucide-arrow-right');
    expect(link.querySelector('.lucide-arrow-left')).toBeNull();
  });
});
