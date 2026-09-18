import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar } from './Navbar';
import { AppProvider, useAppState } from '../context/AppContext';
import { STORE_PRODUCTS, StoreProvider, useStore } from '../context/StoreContext';
import { SignInError } from '../services/authService';

const completeSignIn = vi.hoisted(() => vi.fn());

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/authService')>();

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

function FocusOutsideDialogFixture() {
  return <a href="/behind-dialog">Behind dialog</a>;
}

function CartFixture() {
  const { addToCart, isCartOpen } = useStore();

  return (
    <>
      <button onClick={() => addToCart(STORE_PRODUCTS[0])} type="button">
        Seed cart
      </button>
      <span data-testid="cart-state">{isCartOpen ? 'open' : 'closed'}</span>
      {isCartOpen ? <div aria-label="Your Cart" role="dialog" /> : null}
    </>
  );
}

function renderNavbar(url = '/') {
  window.history.replaceState({}, '', url);

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

async function waitForMenuPanelToOpen() {
  await waitFor(
    () => {
      expect(
        screen.getByRole('navigation', { name: 'Public site menu' }).parentElement,
      ).toHaveStyle({ opacity: '1' });
    },
    { timeout: 3000 },
  );
}

function renderNavbarWithCart() {
  window.history.replaceState({}, '', '/');

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppProvider>
        <StoreProvider>
          <Navbar />
          <CartFixture />
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

  it.each(['client', 'coach'] as const)(
    'signs the visitor in as a %s and stays put when provisioning succeeds',
    async (role) => {
      // arrange
      completeSignIn.mockResolvedValue(role);
      renderNavbar();

      // act
      await userEvent.click(screen.getAllByRole('button', { name: 'Sign In' })[0]);

      // assert
      await waitFor(() => {
        expect(screen.getByTestId('session')).toHaveTextContent(role);
      });
      expect(screen.getByTestId('pathname')).toHaveTextContent('/');
      expect(screen.getAllByRole('button', { name: 'Sign Out' })[0]).toBeInTheDocument();
    },
  );
});

describe('Navbar portal link', () => {
  it.each([
    ['client', 'Client Portal', '/portal'],
    ['coach', 'Coach Portal', '/coach'],
  ] as const)('offers a signed-in %s the %s', (session, label, href) => {
    // arrange
    // act
    renderNavbar(`/?session=${session}`);

    // assert
    expect(screen.getAllByRole('link', { name: label })[0]).toHaveAttribute('href', href);
  });

  it('offers a signed-out visitor no portal link', () => {
    // arrange
    // act
    renderNavbar('/');

    // assert
    expect(screen.queryByRole('link', { name: /portal/i })).not.toBeInTheDocument();
  });
});

describe('Navbar mobile navigation', () => {
  it('opens as a named modal dialog', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbar('/');

    // act
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // assert
    expect(
      screen.getByRole('dialog', { name: 'Mobile public site navigation' }),
    ).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflow: 'hidden' });
  });

  it('moves initial focus to the first navigation link', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbar('/');

    // act
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // assert
    const dialog = screen.getByRole('dialog', {
      name: 'Mobile public site navigation',
    });
    const mobileNavigation = within(dialog).getByRole('navigation', {
      name: 'Public site menu',
    });
    expect(within(mobileNavigation).getByRole('link', { name: 'Home' })).toHaveFocus();
  });

  it('contains tab focus within the header and navigation', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbar('/');
    render(<FocusOutsideDialogFixture />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const reached: (string | null)[] = [];

    // act
    for (let step = 0; step < 10; step += 1) {
      await user.tab();
      reached.push(document.activeElement?.textContent ?? null);
    }

    // assert
    expect(reached).not.toContain('Behind dialog');
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbar('/');
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(trigger);

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Mobile public site navigation',
        }),
      ).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('can reopen while the previous menu is still animating out', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbar('/');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await waitForMenuPanelToOpen();
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    // act
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // assert
    expect(screen.getByRole('dialog', { name: 'Mobile public site navigation' })).toHaveAttribute(
      'data-state',
      'open',
    );
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
  });

  it('returns focus to the trigger after closing with the close button', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbar('/');
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // act
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Mobile public site navigation',
        }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('closes when the viewport crosses the desktop breakpoint', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbar('/');
    const menuTrigger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menuTrigger);

    // act
    menuTrigger.style.display = 'none';
    window.dispatchEvent(new Event('resize'));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Mobile public site navigation',
        }),
      ).not.toBeInTheDocument();
    });
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
  });

  it('closes before opening the cart from the dialog header', async () => {
    // arrange
    const user = userEvent.setup();
    renderNavbarWithCart();
    await user.click(screen.getByRole('button', { name: 'Seed cart' }));
    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // act
    const dialog = screen.getByRole('dialog', {
      name: 'Mobile public site navigation',
    });
    const [, mobileCartButton] = within(dialog).getAllByRole('button', { name: 'Open cart' });
    await user.click(mobileCartButton);

    // assert
    expect(screen.getByTestId('cart-state')).toHaveTextContent('open');
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Mobile public site navigation',
        }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Open menu' })).not.toHaveFocus();
  });
});
