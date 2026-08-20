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

function renderPage(search = '') {
  window.history.replaceState({}, '', `/sign-in-failed${search}`);

  return render(
    <MemoryRouter initialEntries={['/sign-in-failed']}>
      <AppProvider>
        <SignInFailed />
        <SessionProbe />
      </AppProvider>
    </MemoryRouter>,
  );
}

const tryAgain = () => screen.getByRole('button', { name: /try again/i });

describe('SignInFailed', () => {
  beforeEach(() => {
    completeSignIn.mockReset();
  });

  it('states that the sign-in could not be completed and offers only Try Again', () => {
    // arrange
    // act
    renderPage();

    // assert
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /couldn't finish signing you in/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(tryAgain()).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('retries through the outcome the Dev Toggle selected', async () => {
    // arrange
    completeSignIn.mockRejectedValue(
      new SignInError('PROVISIONING_FAILURE', 'still failing'),
    );
    renderPage('?signin=provisioning-failure');

    // act
    await userEvent.click(tryAgain());

    // assert
    await waitFor(() => {
      expect(completeSignIn).toHaveBeenCalledWith('provisioning-failure');
    });
  });

  it('keeps the user signed out and on the page when the retry fails again', async () => {
    // arrange
    completeSignIn.mockRejectedValue(
      new SignInError('PROVISIONING_FAILURE', 'still failing'),
    );
    renderPage();

    // act
    await userEvent.click(tryAgain());

    // assert
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/that didn't work either/i);
    expect(screen.getByTestId('session')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/sign-in-failed');
  });

  it('signs the user in and returns them to the Store when the retry succeeds', async () => {
    // arrange
    completeSignIn.mockResolvedValue('user');
    renderPage();

    // act
    await userEvent.click(tryAgain());

    // assert
    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/store');
    });
    expect(screen.getByTestId('session')).toHaveTextContent('user');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('marks the action busy without disabling it, so keyboard focus survives', async () => {
    // arrange
    let releaseSignIn: () => void = () => {};
    completeSignIn.mockReturnValue(
      new Promise((resolve) => {
        releaseSignIn = () => resolve('user');
      }),
    );
    renderPage();

    // act
    await userEvent.click(tryAgain());

    // assert
    const busyAction = screen.getByRole('button', { name: /signing you in/i });
    expect(busyAction).toHaveAttribute('aria-busy', 'true');
    expect(busyAction).toBeEnabled();
    expect(busyAction).toHaveFocus();
    releaseSignIn();
    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/store');
    });
  });

  it('ignores a second press while a retry is already in flight', async () => {
    // arrange
    let releaseSignIn: () => void = () => {};
    completeSignIn.mockReturnValue(
      new Promise((resolve) => {
        releaseSignIn = () => resolve('user');
      }),
    );
    renderPage();

    // act
    await userEvent.click(tryAgain());
    await userEvent.click(screen.getByRole('button', { name: /signing you in/i }));

    // assert
    expect(completeSignIn).toHaveBeenCalledTimes(1);
    releaseSignIn();
    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/store');
    });
  });
});
