import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
import { AppProvider, useAppState } from '../context/AppContext';
import { StoreProvider } from '../context/StoreContext';
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

function renderNavbar() {
  window.history.replaceState({}, '', '/');

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppProvider>
        <StoreProvider>
          <Navbar />
          <SessionProbe />
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('Navbar sign-in', () => {
  beforeEach(() => {
    completeSignIn.mockReset();
  });

  it('sends the visitor to the failure page and leaves them anonymous when provisioning fails', async () => {
    // arrange
    completeSignIn.mockRejectedValue(
      new SignInError('PROVISIONING_FAILURE', 'provisioning failed'),
    );
    renderNavbar();

    // act
    await userEvent.click(screen.getAllByRole('button', { name: 'Sign In' })[0]);

    // assert
    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/sign-in-failed');
    });
    expect(screen.getByTestId('session')).toHaveTextContent('anonymous');
  });

  it('signs the visitor in as a user and stays put when provisioning succeeds', async () => {
    // arrange
    completeSignIn.mockResolvedValue('user');
    renderNavbar();

    // act
    await userEvent.click(screen.getAllByRole('button', { name: 'Sign In' })[0]);

    // assert
    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('user');
    });
    expect(screen.getByTestId('pathname')).toHaveTextContent('/');
    expect(screen.getAllByRole('button', { name: 'Sign Out' })[0]).toBeInTheDocument();
  });
});
