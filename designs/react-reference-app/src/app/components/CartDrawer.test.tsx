import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
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

const submitStoreAcquisition = vi.hoisted(() => vi.fn());

vi.mock('../services/storeAcquisitionService', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../services/storeAcquisitionService')
  >();

  return {
    ...actual,
    submitStoreAcquisition,
  };
});

const freeEbook = STORE_PRODUCTS.find((p) => p.id === 'hormone-harmony-ebook')!;
const freePdf = STORE_PRODUCTS.find((p) => p.id === 'nutrition-tips-pdf')!;
const paidPlan = STORE_PRODUCTS.find((p) => p.id === 'fat-loss-30')!;

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

function renderCart(products: Product[]) {
  return render(
    <MemoryRouter>
      <AppProvider>
        <StoreProvider>
          <AddButtons products={products} />
          <CartDrawer />
        </StoreProvider>
      </AppProvider>
    </MemoryRouter>,
  );
}

async function openCartWith(
  user: ReturnType<typeof userEvent.setup>,
  products: Product[],
) {
  for (const product of products) {
    await user.click(
      screen.getByRole('button', { name: `Add ${product.title}` }),
    );
  }
  return screen.findByRole('dialog', { name: /your cart/i });
}

async function fillCheckoutForm(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
) {
  await user.click(screen.getByRole('button', { name: /^checkout$/i }));
  await user.type(
    screen.getByRole('textbox', { name: /email address/i }),
    email,
  );
  await user.click(
    screen.getByRole('checkbox', { name: /i agree to the terms of service/i }),
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
    await waitFor(() => expect(dialog).toHaveFocus());

    // assert
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');

    // act
    await user.keyboard('{Escape}');

    // assert
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(document.body.style.overflow).toBe('');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps focus inside the dialog when the checkout step changes', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    const dialog = await openCartWith(user, [freeEbook]);
    await waitFor(() => expect(dialog).toHaveFocus());

    // act
    await user.click(screen.getByRole('button', { name: /^checkout$/i }));

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
    const checkout = screen.getByRole('button', { name: /^checkout$/i });
    checkout.focus();

    // act
    await user.tab();

    // assert
    expect(screen.getByRole('button', { name: /close cart/i })).toHaveFocus();
  });

  it('skips the email form entirely for signed-in users', async () => {
    // arrange
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?session=user');
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);

    // act
    await user.click(screen.getByRole('button', { name: /^checkout$/i }));

    // assert
    await screen.findByRole('heading', { name: /check your email/i });
    expect(submitStoreAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({ email: '', productIds: [freeEbook.id] }),
    );
    expect(
      screen.queryByRole('textbox', { name: /email address/i }),
    ).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });

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
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      STORE_ACQUISITION_ERROR_MESSAGES.UNAVAILABLE_PRODUCT,
    );
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('requires Terms acceptance but not marketing consent before sending', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([freeEbook]);
    await openCartWith(user, [freeEbook]);
    await user.click(screen.getByRole('button', { name: /^checkout$/i }));
    await user.type(
      screen.getByRole('textbox', { name: /email address/i }),
      'woman@example.com',
    );
    const submit = screen.getByRole('button', { name: /send my resources/i });

    // assert
    expect(submit).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: /keep me posted/i }),
    ).not.toBeChecked();

    // act
    await user.click(
      screen.getByRole('checkbox', {
        name: /i agree to the terms of service/i,
      }),
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    // assert
    await screen.findByRole('heading', { name: /check your email/i });
    expect(submitStoreAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'woman@example.com',
        productIds: [freeEbook.id],
        marketingConsent: false,
        outcome: 'success',
      }),
    );
    expect(screen.getByText('woman@example.com')).toBeInTheDocument();
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

  it('keeps order framing for carts containing paid products', async () => {
    // arrange
    const user = userEvent.setup();
    renderCart([paidPlan]);
    await openCartWith(user, [paidPlan]);
    await fillCheckoutForm(user, 'woman@example.com');

    // act
    const submit = screen.getByRole('button', { name: /complete order/i });
    expect(submit).toHaveTextContent('Complete Order • $49.00');
    await user.click(submit);

    // assert
    await screen.findByRole('heading', { name: /order complete/i });
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
    expect(screen.getByText('1 item')).toBeInTheDocument();
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
    expect(screen.getByText('2 items')).toBeInTheDocument();

    // act
    await user.click(screen.getByRole('button', { name: /send my resources/i }));

    // assert
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      STORE_ACQUISITION_ERROR_MESSAGES.UNAVAILABLE_PRODUCT,
    );
    expect(
      screen.getByRole('heading', { name: freeEbook.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: freePdf.title }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^checkout$/i })).toBeEnabled();
  });
});
