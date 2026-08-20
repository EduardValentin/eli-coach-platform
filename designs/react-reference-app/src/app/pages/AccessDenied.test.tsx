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
    renderAt('?session=user');

    // act
    const action = screen.getByRole('link');

    // assert
    expect(
      screen.getByRole('heading', { level: 1, name: /don't have access/i }),
    ).toBeInTheDocument();
    expect(action).toHaveAccessibleName(/back to the store/i);
    expect(action).toHaveAttribute('href', '/store');
  });

  it('sends a client denied coach access back to the client portal', () => {
    // arrange
    renderAt('?session=client');

    // act
    const action = screen.getByRole('link');

    // assert
    expect(action).toHaveAccessibleName(/back to your portal/i);
    expect(action).toHaveAttribute('href', '/portal');
  });

  it('sends a coach denied client access back to the coach portal', () => {
    // arrange
    renderAt('?session=coach');

    // act
    const action = screen.getByRole('link');

    // assert
    expect(action).toHaveAccessibleName(/back to the coach portal/i);
    expect(action).toHaveAttribute('href', '/coach');
  });

  it('falls back to the Store when the page is opened without a session', () => {
    // arrange
    renderAt('');

    // act
    const action = screen.getByRole('link');

    // assert
    expect(action).toHaveAttribute('href', '/store');
  });

  it('offers exactly one recovery action', () => {
    // arrange
    renderAt('?session=coach');

    // act
    const actions = screen.getAllByRole('link');

    // assert
    expect(actions).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
