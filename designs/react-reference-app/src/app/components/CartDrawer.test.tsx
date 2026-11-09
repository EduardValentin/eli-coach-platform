import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { PAID_DIGITAL_DELIVERY_CONSENT } from '~/bounded-contexts/legal/public';
import { CartDrawer } from './CartDrawer';
import { AppProvider } from '../context/AppContext';
import {
  StoreProvider,
  STORE_PRODUCTS,
  useStore,
  type Product,
} from '../context/StoreContext';
import {
  StoreAcquisitionError,
  STORE_ACQUISITION_ERROR_MESSAGES,
} from '../services/storeAcquisitionService';
import { SUBADDRESS_REFUSED_MESSAGE } from '../services/storeOrderService';

const submitStoreAcquisition = vi.hoisted(() => vi.fn());
const placeStoreOrder = vi.hoisted(() => vi.fn());

vi.mock('../services/storeAcquisitionService', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../services/storeAcquisitionService')
  >();

  return {
    ...actual,
    submitStoreAcquisition,
  };
});

vi.mock('../services/storeOrderService', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../services/storeOrderService')
  >();

  return {
    ...actual,
    placeStoreOrder,
  };
});

const freeEbook = STORE_PRODUCTS.find((p) => p.id === 'hormone-harmony-ebook')!;
const freePdf = STORE_PRODUCTS.find((p) => p.id === 'nutrition-tips-pdf')!;
const paidPlan = STORE_PRODUCTS.find((p) => p.id === 'fat-loss-30')!;
const secondPaidPlan = STORE_PRODUCTS.find((p) => p.id === 'bigger-glutes-30')!;

function AddButtons({ products }: { products: Product[] }) {
  const { addToCart } = useStore();
  return (
    <div>
      {products.map((product) => (
        <button key={product.id} onClick={() => addToCart(product)}>
          Add {product.title}
        </button>
      ))}
    </div>
  );
}

function CurrentRoute() {
  const { pathname } = useLocation();
  return <span data-testid="route">{pathname}</span>;
}

function renderCart(products: Product[]) {
  return render(
    <MemoryRouter>
      <AppProvider>
        <StoreProvider>
          <AddButtons products={products} />
          <CartDrawer />
          <CurrentRoute />
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

async function fillPaidCheckoutForm(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
) {
  await fillCheckoutForm(user, email);
  await user.click(
    screen.getByRole('checkbox', { name: /^I expressly request/ }),
  );
}

async function openCartWith(
  user: ReturnType<typeof userEvent.setup>,
  products: Product[],
) {
  for (const [index, product] of products.entries()) {
    await user.click(
      screen.getByRole('button', { name: `Add ${product.title}` }),
    );
    if (index < products.length - 1) {
      await user.keyboard('{Escape}');
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
    }
  }
  return screen.findByRole('dialog', { name: /your cart/i });
}

async function fillCheckoutForm(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
) {
  await user.click(screen.getByRole('button', { name: /^continue$/i }));
  await user.type(
    screen.getByRole('textbox', { name: /email address/i }),
    email,
  );
  await user.click(
    screen.getByRole('checkbox', { name: /i agree to the terms & conditions/i }),
  );
}

describe('CartDrawer', () => {
  beforeAll(() => {
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

  beforeEach(() => {
    submitStoreAcquisition.mockReset();
    submitStoreAcquisition.mockResolvedValue({ success: true });
    placeStoreOrder.mockReset();
    placeStoreOrder.mockResolvedValue({
      status: 'opened',
      checkoutUrl: '/checkout/store/cs_store_test',
    });
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('opens as a modal dialog, locks scrolling, and restores focus on Escape', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    const trigger = screen.getByRole('button', {
      name: `Add ${freeEbook.title}`,
    });

    // act
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: /your cart/i });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // assert
    expect(document.body).toHaveAttribute('data-scroll-locked');

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(document.body).not.toHaveAttribute('data-scroll-locked');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps focus inside the dialog when the checkout step changes', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    const dialog = await openCartWith(user, [freeEbook]);
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // act
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    // assert
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it('wraps Tab focus from the last control back to the first', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);
    screen.getByRole('button', { name: 'Close' }).focus();

    // act
    await user.tab();

    // assert
    expect(
      screen.getByRole('button', { name: `Remove ${freeEbook.title} from cart` }),
    ).toHaveFocus();
  });

  it.each(['client', 'coach'] as const)(
    'asks a signed-in %s for an email like any visitor',
    async (session) => {
      // arrange
      const user = userEvent.setup();
      window.history.replaceState(null, '', `/?session=${session}`);
      renderCart([freeEbook]);
      await openCartWith(user, [freeEbook]);

      // act
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      // assert
      expect(
        screen.getByRole('textbox', { name: /email address/i }),
      ).toBeInTheDocument();
      expect(submitStoreAcquisition).not.toHaveBeenCalled();
    },
  );

  it('returns to the emptied cart when reconciliation removes the only product', async () => {
    // arrange
    const user = userEvent.setup();
    submitStoreAcquisition.mockRejectedValueOnce(
      new StoreAcquisitionError(
        'UNAVAILABLE_PRODUCT',
        STORE_ACQUISITION_ERROR_MESSAGES.UNAVAILABLE_PRODUCT,
      ),
    );
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);
    await fillCheckoutForm(user, 'woman@example.com');

    // act
    await user.click(screen.getByRole('button', { name: /send my resources/i }));

    // assert
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^continue$/i }),
    ).not.toBeInTheDocument();
  });

  it('ticks the terms when the visitor clicks their statement', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    // act
    await user.click(screen.getByText(/^I agree to the/));

    // assert
    expect(
      screen.getByRole('checkbox', {
        name: /^I agree to the Terms & Conditions ?\. \(required\)$/,
      }),
    ).toBeChecked();
  });

  it('requires Terms acceptance but not marketing consent before sending', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'woman@example.com',
    );
    const submit = screen.getByRole('button', { name: /send my resources/i });

    // assert
    expect(submit).toBeDisabled();
    expect(
      screen.getByRole('textbox', { name: 'Email address (required)' }),
    ).toHaveValue('woman@example.com');
    expect(
      screen.getByRole('checkbox', {
        name: /^I agree to the Terms & Conditions ?\. \(required\)$/,
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', {
        name: 'Keep me posted about new plans, guides, and offers.',
      }),
    ).not.toBeChecked();

    // act
    await user.click(
      screen.getByRole('checkbox', {
        name: /i agree to the terms & conditions/i,
      }),
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    // assert
    await screen.findByRole('heading', { name: 'Check your inbox' });
    expect(submitStoreAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'woman@example.com',
        productIds: [freeEbook.id],
        marketingConsent: false,
        outcome: 'success',
      }),
    );
    expect(
      screen.getByRole('link', { name: 'contact@evoa.fit' }),
    ).toHaveAttribute('href', 'mailto:contact@evoa.fit');
  });

  it('rejects an invalid email before calling the acquisition service', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);
    await fillCheckoutForm(user, 'not-an-email');

    // act
    await user.click(screen.getByRole('button', { name: /send my resources/i }));

    // assert
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Enter a valid email address.');
    expect(submitStoreAcquisition).not.toHaveBeenCalled();
  });

  it('preserves the form and cart when delivery fails so the visitor can retry', async () => {
    // arrange
    const user = userEvent.setup();
    submitStoreAcquisition.mockRejectedValueOnce(
      new StoreAcquisitionError(
        'DELIVERY_FAILURE',
        STORE_ACQUISITION_ERROR_MESSAGES.DELIVERY_FAILURE,
      ),
    );
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);
    await fillCheckoutForm(user, 'woman@example.com');

    // act
    await user.click(screen.getByRole('button', { name: /send my resources/i }));

    // assert
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      STORE_ACQUISITION_ERROR_MESSAGES.DELIVERY_FAILURE,
    );
    expect(
      screen.getByRole('textbox', { name: /email address/i }),
    ).toHaveValue('woman@example.com');
    expect(
      screen.getByRole('button', { name: /send my resources/i }),
    ).toBeEnabled();
  });

  it('reconciles the cart and asks for review when a product is unavailable', async () => {
    // arrange
    const user = userEvent.setup();
    submitStoreAcquisition.mockRejectedValueOnce(
      new StoreAcquisitionError(
        'UNAVAILABLE_PRODUCT',
        STORE_ACQUISITION_ERROR_MESSAGES.UNAVAILABLE_PRODUCT,
      ),
    );
    renderCart([freeEbook, freePdf]);
    await openCartWith(user, [freeEbook, freePdf]);
    await fillCheckoutForm(user, 'woman@example.com');

    // act
    await user.click(screen.getByRole('button', { name: /send my resources/i }));

    // assert
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      STORE_ACQUISITION_ERROR_MESSAGES.UNAVAILABLE_PRODUCT,
    );
    expect(screen.getByText(freeEbook.title)).toBeInTheDocument();
    expect(screen.queryByText(freePdf.title)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled();
  });

  it('totals a paid-only cart in euros by default', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([paidPlan, secondPaidPlan]);

    // act
    await openCartWith(user, [paidPlan, secondPaidPlan]);

    // assert
    expect(screen.getByText('€39.00')).toBeInTheDocument();
    expect(screen.getByText('€49.00')).toBeInTheDocument();
    expect(screen.getByRole('term')).toHaveTextContent('Total');
    expect(screen.getByRole('definition')).toHaveTextContent('€88.00');
  });

  it('totals only the paid items of a mixed cart in the chosen currency', async () => {
    // arrange
    const user = userEvent.setup();
    localStorage.setItem('evoa.storeCurrency', 'USD');
    renderCart([paidPlan, freeEbook, secondPaidPlan]);

    // act
    await openCartWith(user, [paidPlan, freeEbook, secondPaidPlan]);

    // assert
    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('$55.00')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByRole('definition')).toHaveTextContent('$100.00');
  });

  it('shows no total for a cart of free resources', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook, freePdf]);

    // act
    await openCartWith(user, [freeEbook, freePdf]);

    // assert
    expect(screen.getAllByText('Free')).toHaveLength(2);
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  describe('a cart with a paid item', () => {
    it('summarises every item with its price or Free and the total in her currency', async () => {
      // arrange
      const user = userEvent.setup();
      localStorage.setItem('evoa.storeCurrency', 'USD');
      renderCart([paidPlan, freeEbook]);
      await openCartWith(user, [paidPlan, freeEbook]);

      // act
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      // assert
      const summary = screen.getByRole('heading', { name: 'Your order' })
        .nextElementSibling as HTMLElement;
      expect(within(summary).getAllByRole('term').map((term) => term.textContent)).toEqual([
        paidPlan.title,
        freeEbook.title,
        'Total',
      ]);
      expect(within(summary).getAllByRole('definition').map((value) => value.textContent)).toEqual([
        '$45.00',
        'Free',
        '$45.00',
      ]);
    });

    it('keeps payment out of reach until the immediate-delivery request is ticked', async () => {
      // arrange
      const user = userEvent.setup();
      renderCart([paidPlan]);
      await openCartWith(user, [paidPlan]);
      await fillCheckoutForm(user, 'woman@example.com');
      const submit = screen.getByRole('button', { name: 'Continue to payment' });

      // act
      await user.click(submit);

      // assert
      expect(submit).toHaveAttribute('aria-disabled', 'true');
      expect(
        await screen.findByText('Enter your email and tick both required boxes to continue.'),
      ).toBeInTheDocument();
      expect(placeStoreOrder).not.toHaveBeenCalled();
      expect(
        screen.getByRole('checkbox', {
          name: `${PAID_DIGITAL_DELIVERY_CONSENT.statement} (required)`,
        }),
      ).not.toBeChecked();
    });

    it('places the order with her consents and hands her to the hosted payment page', async () => {
      // arrange
      const user = userEvent.setup();
      renderCart([paidPlan, freeEbook]);
      await openCartWith(user, [paidPlan, freeEbook]);
      await fillPaidCheckoutForm(user, ' woman@example.com ');

      // act
      await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

      // assert
      await waitFor(() =>
        expect(screen.getByTestId('route')).toHaveTextContent('/checkout/store/cs_store_test'),
      );
      expect(placeStoreOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'woman@example.com',
          items: [paidPlan, freeEbook],
          currency: 'EUR',
          termsAccepted: true,
          deliveryConsent: true,
          marketing: false,
          outcome: 'paid-success',
        }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /order complete/i })).not.toBeInTheDocument();
    });

    it('asks for her main address when the email carries a + part', async () => {
      // arrange
      const user = userEvent.setup();
      placeStoreOrder.mockResolvedValueOnce({ status: 'subaddress_refused' });
      renderCart([paidPlan]);
      await openCartWith(user, [paidPlan]);
      await fillPaidCheckoutForm(user, 'woman+store@example.com');

      // act
      await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

      // assert
      expect(await screen.findByRole('alert')).toHaveTextContent(SUBADDRESS_REFUSED_MESSAGE);
      expect(screen.getByRole('textbox', { name: /email address/i })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    it('names the products still available and keeps her whole cart', async () => {
      // arrange
      const user = userEvent.setup();
      placeStoreOrder.mockResolvedValueOnce({
        status: 'unavailable_products',
        availableProductIds: [paidPlan.id],
      });
      renderCart([paidPlan, secondPaidPlan]);
      await openCartWith(user, [paidPlan, secondPaidPlan]);
      await fillPaidCheckoutForm(user, 'woman@example.com');

      // act
      await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

      // assert
      expect(await screen.findByRole('alert')).toHaveTextContent(
        `Some items in your cart are no longer available. Still available: ${paidPlan.title}. Remove the rest to continue.`,
      );
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled();
    });

    it('keeps her cart and entries when checkout cannot be opened', async () => {
      // arrange
      const user = userEvent.setup();
      placeStoreOrder.mockResolvedValueOnce({ status: 'checkout_unavailable' });
      renderCart([paidPlan]);
      await openCartWith(user, [paidPlan]);
      await fillPaidCheckoutForm(user, 'woman@example.com');

      // act
      await user.click(screen.getByRole('button', { name: 'Continue to payment' }));

      // assert
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Checkout is temporarily unavailable. Your cart and details are saved, so please try again shortly.',
      );
      expect(screen.getByRole('textbox', { name: /email address/i })).toHaveValue('woman@example.com');
      expect(screen.getByRole('checkbox', { name: /^I expressly request/ })).toBeChecked();
      expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeEnabled();
    });
  });

  it('asks a free-only cart for no immediate-delivery request and no order summary', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);

    // act
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    // assert
    expect(screen.queryByRole('checkbox', { name: /^I expressly request/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your order' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send my resources/i })).toBeDisabled();
  });
});
