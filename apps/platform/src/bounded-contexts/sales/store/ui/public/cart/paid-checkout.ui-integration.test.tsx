// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMAIL_SUBADDRESS_REFUSED_MESSAGE } from "~/shared/submission-checks/email-address-copy";
import { PAID_DIGITAL_DELIVERY_CONSENT } from "~/bounded-contexts/legal/public";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { requiredName } from "~test-support/index";

import { clientAction as acquireResources } from "~/bounded-contexts/sales/store/adapters/inbound/http/acquisitions/acquisitions";
import { clientAction as placeOrder } from "~/bounded-contexts/sales/store/adapters/inbound/http/checkouts/checkouts";
import { frameworkModeAction } from "~/composition-root/test-support/framework-mode-action";

import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";

import { STORE_CART_STORAGE_KEY } from "./cart";
import { StoreCartProvider } from "./cart-provider";
import { StoreCartButton, StoreCartDrawer } from "./cart-drawer";
import {
  STORE_ACQUISITIONS_API_PATH,
  STORE_CATALOG_API_URL,
  STORE_CHECKOUTS_API_PATH,
  STORE_CHECKOUTS_API_URL,
} from "../api-client";

const PAID_SUBMIT_HINT =
  "Enter your email and tick both required boxes to continue.";
const HOSTED_PAGE_URL = "https://checkout.stripe.com/c/pay/cs_test_order";

const server = setupServer();

let openHostedPage: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  openHostedPage = vi
    .spyOn(window.location, "assign")
    .mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("StoreCartDrawer with a plan in the cart", () => {
  it("shows her order with its total and asks for the immediate-delivery request", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["fat-loss-plan", "hormone-harmony"]);
    serveCatalog();
    renderCart();
    const dialog = await openCart(user, "Cart, 2 items");

    // act
    await user.click(
      await within(dialog).findByRole("button", { name: "Continue" }),
    );

    // assert
    expect(
      within(dialog).getByText(
        "Check your order, enter your email, then continue to payment.",
      ),
    ).toBeInTheDocument();
    const summary = within(dialog).getByRole("heading", {
      level: 3,
      name: "Your order",
    }).nextElementSibling as HTMLElement;
    expect(
      within(summary)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["30-Day Fat Loss Plan", "Hormone Harmony", "Total"]);
    expect(
      within(summary)
        .getAllByRole("definition")
        .map((value) => value.textContent),
    ).toEqual(["€39.00", "Free", "€39.00"]);
    expect(deliveryConsent(dialog)).not.toBeChecked();
    expect(
      within(dialog).getByText(
        /We use your email to process your order and keep evidence of your purchase and choices\./,
      ),
    ).toBeInTheDocument();
  });

  it("keeps Continue to payment unavailable with its reason until both required boxes are ticked", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["fat-loss-plan"]);
    serveCatalog();
    renderCart();
    const dialog = await openDetails(user, "Cart, 1 item");
    await user.type(emailField(dialog), "woman@example.com");
    await user.click(termsCheckbox(dialog));
    const continueToPayment = within(dialog).getByRole("button", {
      name: "Continue to payment",
    });

    // act
    await user.hover(continueToPayment);

    // assert
    expect(continueToPayment).toHaveAttribute("aria-disabled", "true");
    expect(await screen.findByText(PAID_SUBMIT_HINT)).toBeInTheDocument();
    await user.click(deliveryConsent(dialog));
    expect(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("sends her to the hosted payment page with her order and choices", async () => {
    // arrange
    const user = userEvent.setup();
    const submissions: FormData[] = [];
    seedCart(["fat-loss-plan", "hormone-harmony"]);
    serveCatalog();
    server.use(
      http.post(STORE_CHECKOUTS_API_URL, async ({ request }) => {
        submissions.push(await request.formData());

        return HttpResponse.json(
          { checkoutUrl: HOSTED_PAGE_URL, success: true },
          { status: 201 },
        );
      }),
    );
    renderCart();
    const dialog = await openDetails(user, "Cart, 2 items");
    await completeRequiredDetails(dialog, user);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    );

    // assert
    await waitFor(() => {
      expect(openHostedPage).toHaveBeenCalledWith(HOSTED_PAGE_URL);
    });
    expect(
      within(dialog).getByRole("button", { name: "Opening checkout…" }),
    ).toBeDisabled();
    const [submission] = submissions;
    expect(Object.fromEntries(submission!)).toEqual({
      "cf-turnstile-response": "static-store-token",
      currency: "EUR",
      deliveryConsent: "true",
      email: "woman@example.com",
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      marketingConsent: "false",
      productSlugs: JSON.stringify(["fat-loss-plan", "hormone-harmony"]),
      termsAccepted: "true",
    });
  });

  it("names the refused subaddress under her email", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["fat-loss-plan"]);
    serveCatalog();
    answerCheckout({
      error: { code: "subaddress_refused", message: "Refused." },
      status: 422,
    });
    renderCart();
    const dialog = await openDetails(user, "Cart, 1 item");
    await completeRequiredDetails(dialog, user);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    );

    // assert
    expect(
      await within(dialog).findByText(EMAIL_SUBADDRESS_REFUSED_MESSAGE),
    ).toBeInTheDocument();
    expect(emailField(dialog)).toHaveAttribute("aria-invalid", "true");
    expect(openHostedPage).not.toHaveBeenCalled();
  });

  it("keeps her cart and details and retries the same order when checkout is unavailable", async () => {
    // arrange
    const user = userEvent.setup();
    const submittedKeys: string[] = [];
    seedCart(["fat-loss-plan"]);
    serveCatalog();
    server.use(
      http.post(STORE_CHECKOUTS_API_URL, async ({ request }) => {
        submittedKeys.push(
          String((await request.formData()).get("idempotencyKey")),
        );

        return HttpResponse.json(
          {
            error: {
              code: "checkout_unavailable",
              message: "Checkout is temporarily unavailable.",
            },
            success: false,
          },
          { status: 503 },
        );
      }),
    );
    renderCart();
    const dialog = await openDetails(user, "Cart, 1 item");
    await completeRequiredDetails(dialog, user);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    );
    await within(dialog).findByRole("alert");
    await user.click(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    );

    // assert
    await waitFor(() => {
      expect(submittedKeys).toHaveLength(2);
    });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Checkout is temporarily unavailable. Your cart and details are saved, so please try again shortly.",
    );
    expect(submittedKeys[1]).toBe(submittedKeys[0]);
    expect(emailField(dialog)).toHaveValue("woman@example.com");
    expect(termsCheckbox(dialog)).toBeChecked();
    expect(deliveryConsent(dialog)).toBeChecked();
    expect(readStoredProductSlugs()).toEqual(["fat-loss-plan"]);
  });

  it("returns to her unchanged cart naming what is still available when a product was withdrawn", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["fat-loss-plan", "hormone-harmony"]);
    serveCatalog();
    answerCheckout({
      error: {
        availableProductSlugs: ["hormone-harmony"],
        code: "unavailable_products",
        message: "Some products are unavailable.",
      },
      status: 409,
    });
    renderCart();
    const dialog = await openDetails(user, "Cart, 2 items");
    await completeRequiredDetails(dialog, user);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    );

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Some items in your cart are no longer available. Still available: Hormone Harmony. Remove the rest to continue.",
    );
    expect(
      within(dialog).getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(2);
    expect(readStoredProductSlugs()).toEqual([
      "fat-loss-plan",
      "hormone-harmony",
    ]);
  });

  it("uses a fresh idempotency key after a refusal", async () => {
    // arrange
    const user = userEvent.setup();
    const submittedKeys: string[] = [];
    seedCart(["fat-loss-plan"]);
    serveCatalog();
    server.use(
      http.post(STORE_CHECKOUTS_API_URL, async ({ request }) => {
        submittedKeys.push(
          String((await request.formData()).get("idempotencyKey")),
        );

        return HttpResponse.json(
          {
            error: { code: "bot_verification_failed", message: "Refused." },
            success: false,
          },
          { status: 400 },
        );
      }),
    );
    renderCart();
    const dialog = await openDetails(user, "Cart, 1 item");
    await completeRequiredDetails(dialog, user);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "We couldn't verify this request. Please try again.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Continue to payment" }),
    );

    // assert
    await waitFor(() => {
      expect(submittedKeys).toHaveLength(2);
    });
    expect(submittedKeys[1]).not.toBe(submittedKeys[0]);
  });
});

describe("StoreCartDrawer with only free resources", () => {
  it("keeps the free delivery details without an order summary or delivery request", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["hormone-harmony"]);
    serveCatalog();
    renderCart();

    // act
    const dialog = await openDetails(user, "Cart, 1 item");

    // assert
    expect(
      within(dialog).getByText(
        "Enter your email and we'll send one private download link for everything in your cart.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("heading", { name: "Your order" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("checkbox", {
        name: requiredName(PAID_DIGITAL_DELIVERY_CONSENT.statement),
      }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    ).toBeDisabled();
  });
});

function renderCart() {
  const router = createMemoryRouter([
    {
      Component: () => (
        <StoreCartProvider initialCurrency="EUR">
          <StoreCartButton />
          <main aria-label="Store" tabIndex={-1} />
          <StoreCartDrawer
            botDetection={{ provider: "static", token: "static-store-token" }}
          />
        </StoreCartProvider>
      ),
      path: "/",
    },
    {
      loader: () => fetch(STORE_CATALOG_API_URL),
      path: STORE_CATALOG_API_URL,
    },
    {
      action: frameworkModeAction(acquireResources),
      path: STORE_ACQUISITIONS_API_PATH,
    },
    {
      action: frameworkModeAction(placeOrder),
      path: STORE_CHECKOUTS_API_PATH,
    },
  ]);

  return render(<RouterProvider router={router} />);
}

async function openCart(
  user: ReturnType<typeof userEvent.setup>,
  cartName: string,
): Promise<HTMLElement> {
  await user.click(await screen.findByRole("button", { name: cartName }));

  return screen.findByRole("dialog", { name: "Your cart" });
}

async function openDetails(
  user: ReturnType<typeof userEvent.setup>,
  cartName: string,
): Promise<HTMLElement> {
  const dialog = await openCart(user, cartName);
  await user.click(
    await within(dialog).findByRole("button", { name: "Continue" }),
  );

  return dialog;
}

async function completeRequiredDetails(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.type(emailField(dialog), "woman@example.com");
  await user.click(termsCheckbox(dialog));
  await user.click(deliveryConsent(dialog));
}

function answerCheckout(refusal: {
  error: Record<string, unknown>;
  status: number;
}) {
  server.use(
    http.post(STORE_CHECKOUTS_API_URL, () =>
      HttpResponse.json(
        { error: refusal.error, success: false },
        { status: refusal.status },
      ),
    ),
  );
}

function serveCatalog() {
  server.use(
    http.get(STORE_CATALOG_API_URL, () =>
      HttpResponse.json({
        products: [createPlan(), createProduct()],
        success: true,
      }),
    ),
  );
}

function emailField(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole("textbox", {
    name: requiredName("Email address"),
  });
}

function termsCheckbox(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole("checkbox", {
    name: /^I agree to the Terms & Conditions/,
  });
}

function deliveryConsent(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole("checkbox", {
    name: requiredName(PAID_DIGITAL_DELIVERY_CONSENT.statement),
  });
}

function seedCart(productSlugs: readonly string[]) {
  localStorage.setItem(
    STORE_CART_STORAGE_KEY,
    JSON.stringify({ productSlugs, version: 1 }),
  );
}

function readStoredProductSlugs(): readonly string[] {
  return JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!).productSlugs;
}

function createPlan(): StoreProduct {
  return {
    ...createProduct(),
    price: { eurCents: 3900, usdCents: 4500 },
    slug: "fat-loss-plan",
    title: "30-Day Fat Loss Plan",
  };
}

function createProduct(): StoreProduct {
  return {
    cardSummary: "A practical cycle-aware guide.",
    cover: {
      alt: "Hormone Harmony guide cover",
      url: "/api/store/covers/hormone-harmony.webp",
    },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase nutrition guidance.",
    goals: [{ displayOrder: 3, label: "Wellness", slug: "wellness" }],
    includedItems: ["Phase-by-phase guidance"],
    price: null,
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
  };
}
