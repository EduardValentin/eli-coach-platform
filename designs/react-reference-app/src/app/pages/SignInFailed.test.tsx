import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInFailed } from './SignInFailed';
import { AppProvider, useAppState } from '../context/AppContext';
import { SignInError } from '../services/authService';

const completeSignIn = vi.hoisted(() => vi.fn());

vi.mock('../services/authService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../services/authService')>();

  return { ...actual, completeSignIn };
});

function SessionProbe() {
  const { appState } = useAppState();
  const location = useLocation();

  return (
    <div>
      <span data-testid="session">{appState.session}</span>
      <span data-testid="pathname">{location.pathname}</span>
    </div>
  );
}

function renderPage() {
  window.history.replaceState({}, '', '/sign-in-failed');

  return render(
    <MemoryRouter initialEntries={['/sign-in-failed']}>
      <AppProvider>
        <SignInFailed />
        <SessionProbe />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('SignInFailed', () => {
  beforeEach(() => {
    completeSignIn.mockReset();
  });

  it('states that the sign-in could not be completed and offers only Try Again', () => {
    // arrange
    renderPage();

    // act
    const actions = screen.getAllByRole('button');

    // assert
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /couldn't finish signing you in/i,
      }),
    ).toBeInTheDocument();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAccessibleName(/try again/i);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the user signed out and on the page when the retry fails again', async () => {
    // arrange
    completeSignIn.mockRejectedValue(
      new SignInError('PROVISIONING_FAILURE', 'still failing'),
    );
    renderPage();

    // act
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    // assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
    });
    expect(screen.getByTestId('session')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/sign-in-failed');
  });

  it('signs the user in and returns them to the Store when the retry succeeds', async () => {
    // arrange
    completeSignIn.mockResolvedValue('user');
    renderPage();

    // act
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    // assert
    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/store');
    });
    expect(screen.getByTestId('session')).toHaveTextContent('user');
  });

  it('disables the action while the retry is in flight', async () => {
    // arrange
    let releaseSignIn = () => {};
    completeSignIn.mockReturnValue(
      new Promise((resolve) => {
        releaseSignIn = () => resolve('user');
      }),
    );
    renderPage();

    // act
    await userEvent.click(screen.getByRole('button', { name: /signing|try again/i }));

    // assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing you in/i })).toBeDisabled();
    });
    expect(completeSignIn).toHaveBeenCalledTimes(1);
    releaseSignIn();
  });
});
