import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NotFound } from './NotFound';

// Safety net for the shared ErrorPage extraction: 404, 403 and the sign-in
// failure render from one skeleton, so this pins the 404's half of it.
describe('NotFound', () => {
  it('names the error and offers a single way home', () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole('main')).toHaveAccessibleName('Error');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Error 404')).toBeInTheDocument();
    const actions = screen.getAllByRole('link');
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAttribute('href', '/');
  });
});
