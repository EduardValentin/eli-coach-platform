import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AccessDenied } from './AccessDenied';
import { AppProvider } from '../context/AppContext';

function renderAt(search: string) {
  window.history.replaceState({}, '', `/403${search}`);

  return render(
    <MemoryRouter>
      <AppProvider>
        <AccessDenied />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('AccessDenied', () => {
  it('sends a signed-in user without portal access back to the Store', () => {
    // arrange
    // act
    renderAt('?session=user');

    // assert
    const action = screen.getByRole('link');
    expect(
      screen.getByRole('heading', { level: 1, name: /don't have access/i }),
    ).toBeInTheDocument();
    expect(action).toHaveAccessibleName(/back to the store/i);
    expect(action).toHaveAttribute('href', '/store');
  });

  it('sends a client denied coach access back to the client portal', () => {
    // arrange
    // act
    renderAt('?session=client');

    // assert
    const action = screen.getByRole('link');
    expect(action).toHaveAccessibleName(/back to your portal/i);
    expect(action).toHaveAttribute('href', '/portal');
  });

  it('sends a coach denied client access back to the coach portal', () => {
    // arrange
    // act
    renderAt('?session=coach');

    // assert
    const action = screen.getByRole('link');
    expect(action).toHaveAccessibleName(/back to the coach portal/i);
    expect(action).toHaveAttribute('href', '/coach');
  });

  it('tells an anonymous visitor they are not signed in and points at the Store', () => {
    // arrange
    // act
    renderAt('');

    // assert
    const action = screen.getByRole('link');
    expect(action).toHaveAttribute('href', '/store');
    expect(screen.getByText(/not signed in/i)).toBeInTheDocument();
  });

  it('offers exactly one recovery action', () => {
    // arrange
    // act
    renderAt('?session=coach');

    // assert
    const actions = screen.getAllByRole('link');
    expect(actions).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
