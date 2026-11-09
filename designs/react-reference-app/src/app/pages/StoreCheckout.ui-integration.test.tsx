import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Store } from './Store';
import { StoreCheckoutStandIn } from './StoreCheckoutStandIn';
import { StoreOrderComplete } from './StoreOrderComplete';
import { CartDrawer } from '../components/CartDrawer';
import { AppProvider } from '../context/AppContext';
import { AssessmentCallProvider } from '../context/AssessmentCallContext';
import { ClientJourneyProvider } from '../context/ClientJourneyContext';
import { StoreProvider, STORE_PRODUCTS } from '../context/StoreContext';
import {
  payStoreCheckout,
  placeStoreOrder,
  storeOrderCompleteUrl,
  type PlacedStoreOrder,
} from '../services/storeOrderService';

const WAIT = { timeout: 4000 };
const TEST_TIMEOUT_MS = 20000;

const paidPlan = STORE_PRODUCTS.find((product) => product.id === 'fat-loss-30')!;
const freeEbook = STORE_PRODUCTS.find((product) => product.id === 'hormone-harmony-ebook')!;

class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function CurrentRoute() {
  const { pathname, search } = useLocation();
  return <span data-testid="route">{`${pathname}${search}`}</span>;
}

function renderStoreCheckout(url: string) {
  window.history.replaceState({}, '', url);

  render(
    <MemoryRouter initialEntries={[url]}>
      <AppProvider>
        <StoreProvider>
          <AssessmentCallProvider>
            <ClientJourneyProvider>
              <CartDrawer />
              <CurrentRoute />
              <Routes>
                <Route element={<Store />} path="/store" />
                <Route element={<StoreCheckoutStandIn />} path="/checkout/store/:sessionId" />
                <Route element={<StoreOrderComplete />} path="/store/checkout/complete" />
              </Routes>
            </ClientJourneyProvider>
          </AssessmentCallProvider>
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

async function addPaidAndFreeToCart(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: `Add ${paidPlan.title} to cart` }));
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: `Get ${freeEbook.title} for free` }));
  return screen.findByRole('dialog', { name: /your cart/i });
}

async function continueToHostedPage(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^continue$/i }));
  await user.type(screen.getByRole('textbox', { name: /email address/i }), 'woman@example.com');
  await user.click(screen.getByRole('checkbox', { name: /^I agree to the Terms/ }));
  await user.click(screen.getByRole('checkbox', { name: /^I expressly request/ }));
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
  await screen.findByRole('heading', { name: 'Pay for your order' }, WAIT);
}

async function paidOrderSessionId(): Promise<string> {
  const placed: PlacedStoreOrder = await placeStoreOrder({
    email: 'woman@example.com',
    items: [paidPlan, freeEbook],
    currency: 'EUR',
    termsAccepted: true,
    deliveryConsent: true,
    marketing: false,
    outcome: 'paid-success',
  });
  if (placed.status !== 'opened') throw new Error(`Checkout did not open: ${placed.status}`);
  const sessionId = placed.checkoutUrl.split('/').pop()!;
  await payStoreCheckout(sessionId);
  return sessionId;
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('paying for a store cart through the Stripe stand-in', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
  });

  it(
    'shows the hosted page with her locked email and only the paid lines',
    async () => {
      // arrange
      const user = userEvent.setup();
      renderStoreCheckout('/store');
      await addPaidAndFreeToCart(user);

      // act
      await continueToHostedPage(user);

      // assert
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('woman@example.com');
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('readonly');
      const lines = screen.getByRole('main', { name: 'Checkout' }).querySelector('dl')!;
      expect(within(lines).getAllByRole('term').map((term) => term.textContent)).toEqual([
        paidPlan.title,
        'Total',
      ]);
      expect(screen.getByRole('button', { name: 'Pay €39.00' })).toBeEnabled();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'brings her back to her unchanged cart with a notice when she leaves the hosted page',
    async () => {
      // arrange
      const user = userEvent.setup();
      renderStoreCheckout('/store');
      await addPaidAndFreeToCart(user);
      await continueToHostedPage(user);

      // act
      await user.click(screen.getByRole('link', { name: 'Back' }));

      // assert
      const drawer = await screen.findByRole('dialog', { name: /your cart/i });
      expect(within(drawer).getByRole('status')).toHaveTextContent(
        'Payment not completed. Your cart is saved.',
      );
      expect(within(drawer).getByText(paidPlan.title)).toBeInTheDocument();
      expect(within(drawer).getByText(freeEbook.title)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent(/^\/store$/));
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'lets her dismiss the cancelled-payment notice',
    async () => {
      // arrange
      const user = userEvent.setup();
      renderStoreCheckout('/store');
      await addPaidAndFreeToCart(user);
      await continueToHostedPage(user);
      await user.click(screen.getByRole('link', { name: 'Back' }));
      const drawer = await screen.findByRole('dialog', { name: /your cart/i });

      // act
      await user.click(within(drawer).getByRole('button', { name: 'Dismiss' }));

      // assert
      expect(within(drawer).queryByRole('status')).not.toBeInTheDocument();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'confirms the order with her email and every item after she pays',
    async () => {
      // arrange
      const user = userEvent.setup();
      renderStoreCheckout('/store');
      await addPaidAndFreeToCart(user);
      await continueToHostedPage(user);

      // act
      await user.click(screen.getByRole('button', { name: 'Pay €39.00' }));

      // assert
      expect(await screen.findByRole('heading', { name: 'Order confirmed' }, WAIT)).toBeInTheDocument();
      expect(screen.getByTestId('route')).toHaveTextContent('/store/checkout/complete?session_id=cs_store_');
      expect(screen.getByText(/Your order email is on its way to/)).toHaveTextContent(
        'Your order email is on its way to woman@example.com. Your download link is in that email and works for seven days.',
      );
      expect(screen.getByText('Stripe sends your payment receipt in a separate email.')).toBeInTheDocument();
      const summary = screen.getByRole('heading', { name: 'Your order' }).nextElementSibling as HTMLElement;
      expect(within(summary).getAllByRole('definition').map((value) => value.textContent)).toEqual([
        '€39.00',
        'Free',
        '€39.00',
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'tells her the payment was not completed when the hosted page did not take it',
    async () => {
      // arrange
      const user = userEvent.setup();
      renderStoreCheckout('/store?paidcheckout=paid-not-completed');
      await addPaidAndFreeToCart(user);
      await continueToHostedPage(user);

      // act
      await user.click(screen.getByRole('button', { name: 'Pay €39.00' }));

      // assert
      expect(await screen.findByRole('heading', { name: 'Payment not completed' }, WAIT)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to the store' })).toHaveAttribute('href', '/store');
    },
    TEST_TIMEOUT_MS,
  );
});

describe('the store order-complete page', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it(
    'shows an unknown checkout as not completed',
    async () => {
      // arrange
      const url = storeOrderCompleteUrl('cs_store_unknown');

      // act
      renderStoreCheckout(url);

      // assert
      expect(await screen.findByRole('heading', { name: 'Payment not completed' }, WAIT)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send my order email again' })).not.toBeInTheDocument();
    },
    TEST_TIMEOUT_MS,
  );

  it.each([
    ['sent', 'Sent again to woman@example.com. Use the newest email: links in earlier ones no longer work.'],
    ['processing', 'Your order is still being processed. Your email will arrive shortly.'],
    ['rate-limited', "You can't send it again just yet. Please try again later."],
  ])(
    'answers "Send my order email again" with the %s feedback',
    async (outcome, feedback) => {
      // arrange
      const user = userEvent.setup();
      const sessionId = await paidOrderSessionId();
      renderStoreCheckout(`${storeOrderCompleteUrl(sessionId)}&orderresend=${outcome}`);
      const resend = await screen.findByRole('button', { name: 'Send my order email again' }, WAIT);

      // act
      await user.click(resend);

      // assert
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(feedback), WAIT);
      expect(resend).toBeEnabled();
    },
    TEST_TIMEOUT_MS,
  );
});
