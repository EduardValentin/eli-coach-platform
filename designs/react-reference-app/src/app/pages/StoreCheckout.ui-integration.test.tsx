import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
  await user.click(screen.getByRole('checkbox', { name: /^Start my download now/ }));
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }));
  await screen.findByRole('heading', { name: 'Pay for your order' }, WAIT);
}

async function leaveHostedPageThroughBack(user: ReturnType<typeof userEvent.setup>): Promise<string | null> {
  let documentUrl: string | null = null;
  const recordDocumentNavigation = (event: MouseEvent) => {
    const link = (event.target as Element).closest('a');
    if (event.defaultPrevented || !link) return;
    event.preventDefault();
    documentUrl = link.getAttribute('href');
  };
  document.addEventListener('click', recordDocumentNavigation);
  await user.click(screen.getByRole('link', { name: 'Back' }));
  document.removeEventListener('click', recordDocumentNavigation);
  return documentUrl;
}

function loadDocument(url: string) {
  cleanup();
  renderStoreCheckout(url);
}

async function returnFromHostedPageWithFullLoad(user: ReturnType<typeof userEvent.setup>) {
  renderStoreCheckout('/store');
  await addPaidAndFreeToCart(user);
  await continueToHostedPage(user);
  loadDocument((await leaveHostedPageThroughBack(user))!);
  return screen.findByRole('dialog', { name: /your cart/i });
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
    'leaves the hosted page through a full page load of the cancelled return',
    async () => {
      // arrange
      const user = userEvent.setup();
      renderStoreCheckout('/store');
      await addPaidAndFreeToCart(user);
      await continueToHostedPage(user);

      // act
      const documentUrl = await leaveHostedPageThroughBack(user);

      // assert
      expect(documentUrl).toBe('/store?payment=cancelled');
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'brings her back to her unchanged cart with a notice on the full load of the cancelled return',
    async () => {
      // arrange
      const user = userEvent.setup();
      renderStoreCheckout('/store');
      await addPaidAndFreeToCart(user);
      await continueToHostedPage(user);
      const documentUrl = (await leaveHostedPageThroughBack(user))!;

      // act
      loadDocument(documentUrl);

      // assert
      const drawer = await screen.findByRole('dialog', { name: /your cart/i });
      expect(within(drawer).getByRole('status')).toHaveTextContent(
        'Payment not completed. Your cart is saved.',
      );
      expect(within(drawer).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        expect.stringContaining(paidPlan.title),
        expect.stringContaining(freeEbook.title),
      ]);
      expect(within(drawer).getByRole('button', { name: /^continue$/i })).toBeInTheDocument();
      await waitFor(() => expect(within(drawer).getByRole('button', { name: 'Close' })).toHaveFocus());
      await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent(/^\/store$/));
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'restores her email and ticked boxes once she continues from the cancelled return',
    async () => {
      // arrange
      const user = userEvent.setup();
      const drawer = await returnFromHostedPageWithFullLoad(user);

      // act
      await user.click(within(drawer).getByRole('button', { name: /^continue$/i }));

      // assert
      expect(within(drawer).getByRole('textbox', { name: /email address/i })).toHaveValue('woman@example.com');
      expect(within(drawer).getByRole('checkbox', { name: /^I agree to the Terms/ })).toBeChecked();
      expect(within(drawer).getByRole('checkbox', { name: /^Start my download now/ })).toBeChecked();
      expect(within(drawer).getByRole('checkbox', { name: /^Keep me posted/ })).not.toBeChecked();
      expect(within(drawer).getByRole('button', { name: 'Continue to payment' })).toBeEnabled();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'lets her dismiss the cancelled-payment notice',
    async () => {
      // arrange
      const user = userEvent.setup();
      const drawer = await returnFromHostedPageWithFullLoad(user);

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

  it(
    'keeps keyboard focus on "Send my order email again" while it sends',
    async () => {
      // arrange
      const user = userEvent.setup();
      const sessionId = await paidOrderSessionId();
      renderStoreCheckout(`${storeOrderCompleteUrl(sessionId)}&orderresend=sent`);
      const resend = await screen.findByRole('button', { name: 'Send my order email again' }, WAIT);
      resend.focus();

      // act
      await user.keyboard('{Enter}');

      // assert
      expect(resend).toHaveAttribute('aria-disabled', 'true');
      expect(resend).toHaveFocus();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sent again to'), WAIT);
      expect(resend).toHaveFocus();
    },
    TEST_TIMEOUT_MS,
  );
});
