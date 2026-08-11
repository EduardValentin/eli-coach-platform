// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORE_MARKETING_CONSENT } from "@eli-coach-platform/content";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import type {
  BotDetectionConfig,
  BotDetectionRuntimeState,
} from "@eli-coach-platform/infrastructure/bot-detection";
import {
  createTestQueryClient,
  createTestQueryClientWrapper,
} from "~test-support/query-client";

import { STORE_CART_STORAGE_KEY } from "./cart";
import {
  StoreCartProvider,
  useStoreCart,
} from "./cart-provider";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "./cart-drawer";
import {
  STORE_ACQUISITIONS_API_URL,
  STORE_CATALOG_API_URL,
} from "./api-client";

const server = setupServer();

beforeAll(() => {
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }

  globalThis.ResizeObserver = ResizeObserverStub;
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  delete window.turnstile;
  localStorage.clear();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("StoreCartDrawer", () => {
  it("keeps the saved cart available when the live catalog cannot load", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: "server_error",
              message: "The store is temporarily unavailable.",
            },
            success: false,
          },
          { status: 503 },
        ),
      ),
    );
    renderCart();

    // act
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    const catalogError = within(dialog).getByRole("alert");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    // assert
    expect(catalogError).toHaveTextContent(
      "Your cart is temporarily unavailable.",
    );
    expect(
      screen.getByRole("button", { name: "Cart, 1 item" }),
    ).toBeInTheDocument();
  });

  it("restores focus to the control that opened the cart after keyboard dismissal", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );
    renderCart();
    const cartButton = await screen.findByRole("button", {
      name: "Cart, 1 item",
    });
    await user.click(cartButton);
    await screen.findByRole("dialog", { name: "Your cart" });

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cartButton).toHaveFocus();
  });

  it("restores focus to the persistent cart control when the opener disappears", async () => {
    // arrange
    const user = userEvent.setup();
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );
    renderCart();
    const cartButton = screen.getByRole("button", {
      name: "Cart, 0 items",
    });

    // act
    await user.click(
      screen.getByRole("button", {
        name: "Open cart from disappearing control",
      }),
    );
    await screen.findByRole("dialog", { name: "Your cart" });
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cartButton).toHaveFocus();
  });

  it("delivers the selected resources and clears the cart only after accepted delivery", async () => {
    // arrange
    const user = userEvent.setup();
    const submittedForm = { current: null as FormData | null };
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, async ({ request }) => {
        submittedForm.current = await request.formData();

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderCart();

    // act
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    expect(within(dialog).queryByText("Total")).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText("Free", { exact: true }),
    ).not.toBeInTheDocument();
    await continueToAcquisitionDetails(dialog, user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email address" }),
      "woman@example.com",
    );
    expect(
      within(dialog)
        .getByRole("link", { name: "Terms & Conditions" })
        .closest("label"),
    ).toBeNull();
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: STORE_MARKETING_CONSENT,
      }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    );

    // assert
    expect(
      await within(dialog).findByRole("heading", {
        name: "Check your inbox",
      }),
    ).toBeInTheDocument();
    expect(submittedForm.current?.get("email")).toBe("woman@example.com");
    expect(submittedForm.current?.get("productSlugs")).toBe(
      JSON.stringify(["hormone-harmony"]),
    );
    expect(submittedForm.current?.get("termsAccepted")).toBe("true");
    expect(submittedForm.current?.get("marketingConsent")).toBe("true");
    expect(submittedForm.current?.get("cf-turnstile-response")).toBe(
      "static-store-token",
    );
    await waitFor(() => {
      expect(readStoredProductSlugs()).toEqual([]);
    });
  });

  it("keeps the cart and details for retry when the delivery cooldown declines the request", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: "rate_limited",
              message: "Unable to deliver store resources.",
            },
            success: false,
          },
          { status: 429 },
        ),
      ),
    );
    renderCart();

    // act
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email address" }),
      "woman@example.com",
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    );

    // assert
    expect(
      await within(dialog).findByText(
        "Requests are limited to one per minute. Your selections are saved — please wait a moment and try again.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("heading", { name: "Check your inbox" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("textbox", { name: "Email address" }),
    ).toHaveValue("woman@example.com");
    expect(readStoredProductSlugs()).toEqual(["hormone-harmony"]);
  });

  it("clears the email validation error once the email becomes valid", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );
    renderCart();
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );
    const emailInput = within(dialog).getByRole("textbox", {
      name: "Email address",
    });
    await user.type(emailInput, "not-an-email");

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    );
    const emailError = await within(dialog).findByRole("alert");

    // assert
    expect(emailError).toHaveTextContent("Enter a valid email address.");
    await user.clear(emailInput);
    await user.type(emailInput, "woman@example.com");
    expect(emailError).not.toBeInTheDocument();
  });

  it("keeps acquisition submission disabled until the required fields are complete", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );
    renderCart();
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    const submitButton = within(dialog).getByRole("button", {
      name: "Send my resources",
    });

    // act
    const emailInput = within(dialog).getByRole("textbox", {
      name: "Email address",
    });

    // assert
    expect(submitButton).toBeDisabled();
    await user.type(emailInput, "woman@example.com");
    expect(submitButton).toBeDisabled();
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );
    expect(submitButton).toBeEnabled();
  });

  it("preserves the cart and form after delivery is unavailable", async () => {
    // arrange
    const user = userEvent.setup();
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: "delivery_unavailable",
              message: "Unable to deliver store resources.",
            },
            success: false,
          },
          { status: 503 },
        ),
      ),
    );
    renderCart();
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email address" }),
      "woman@example.com",
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    );

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "couldn't send your resources",
    );
    expect(
      within(dialog).getByRole("textbox", { name: "Email address" }),
    ).toHaveValue("woman@example.com");
    expect(readStoredProductSlugs()).toEqual(["hormone-harmony"]);
  });

  it("shows a retryable error when bot verification cannot complete", async () => {
    // arrange
    const user = userEvent.setup();
    let challengeError = () => {};
    let acquisitionRequests = 0;
    window.turnstile = {
      execute: () => challengeError(),
      remove: () => {},
      render: (_container, options) => {
        challengeError = options["error-callback"];

        return "store-turnstile-widget";
      },
      reset: () => {},
    };
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, () => {
        acquisitionRequests += 1;

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderCart({
      botDetectionConfig: {
        provider: "turnstile",
        siteKey: "store-test-site-key",
      },
    });
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email address" }),
      "woman@example.com",
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    );

    // assert
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "couldn't verify this request",
    );
    expect(acquisitionRequests).toBe(0);
    expect(
      within(dialog).getByRole("textbox", { name: "Email address" }),
    ).toHaveValue("woman@example.com");
    expect(readStoredProductSlugs()).toEqual(["hormone-harmony"]);
  });

  it("freezes acquisition fields while bot verification is pending", async () => {
    // arrange
    const user = userEvent.setup();
    const submittedForm = { current: null as FormData | null };
    let completeChallenge = (_token: string) => {};
    let challengeExecutions = 0;
    window.turnstile = {
      execute: () => {
        challengeExecutions += 1;
      },
      remove: () => {},
      render: (_container, options) => {
        completeChallenge = options.callback;

        return "store-turnstile-widget";
      },
      reset: () => {},
    };
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, async ({ request }) => {
        submittedForm.current = await request.formData();

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderCart({
      botDetectionConfig: {
        provider: "turnstile",
        siteKey: "store-test-site-key",
      },
    });
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    const email = within(dialog).getByRole("textbox", {
      name: "Email address",
    });
    const terms = within(dialog).getByRole("checkbox", {
      name: /agree to the terms/i,
    });
    const marketing = within(dialog).getByRole("checkbox", {
      name: STORE_MARKETING_CONSENT,
    });
    await user.type(email, "woman@example.com");
    await user.click(terms);
    await user.click(marketing);

    // act
    await user.click(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    );
    await user.click(terms);
    await user.click(marketing);
    act(() => {
      completeChallenge("delayed-store-token");
    });

    // assert
    expect(challengeExecutions).toBe(1);
    expect(email).toBeDisabled();
    expect(email).toHaveValue("woman@example.com");
    expect(terms).toBeDisabled();
    expect(terms).toBeChecked();
    expect(marketing).toBeDisabled();
    expect(marketing).toBeChecked();
    expect(
      await within(dialog).findByRole("heading", {
        name: "Check your inbox",
      }),
    ).toBeInTheDocument();
    expect(submittedForm.current?.get("email")).toBe("woman@example.com");
    expect(submittedForm.current?.get("termsAccepted")).toBe("true");
    expect(submittedForm.current?.get("marketingConsent")).toBe("true");
    expect(submittedForm.current?.get("cf-turnstile-response")).toBe(
      "delayed-store-token",
    );
  });

  it("keeps acquisition submission disabled until runtime bot configuration is ready", async () => {
    // arrange
    const user = userEvent.setup();
    let acquisitionRequests = 0;
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, () => {
        acquisitionRequests += 1;

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderCart({
      botDetection: {
        config: null,
        status: "loading",
      },
    });
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email address" }),
      "woman@example.com",
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );

    // act
    const submitButton = within(dialog).getByRole("button", {
      name: "Send my resources",
    });

    // assert
    expect(submitButton).toBeDisabled();
    expect(acquisitionRequests).toBe(0);
  });

  it("uses a fresh idempotency key for a deliberate retry after an ambiguous response", async () => {
    // arrange
    const user = userEvent.setup();
    const submittedKeys: string[] = [];
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedKeys.push(String(formData.get("idempotencyKey")));

        return submittedKeys.length === 1
          ? HttpResponse.json(
              {
                error: {
                  code: "delivery_retryable",
                  message: "Unable to deliver store resources.",
                },
                success: false,
              },
              { status: 500 },
            )
          : HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderCart();
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email address" }),
      "woman@example.com",
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );
    const submitButton = within(dialog).getByRole("button", {
      name: "Send my resources",
    });

    // act
    await user.click(submitButton);
    await within(dialog).findByRole("alert");
    await user.click(submitButton);

    // assert
    expect(
      await within(dialog).findByRole("heading", {
        name: "Check your inbox",
      }),
    ).toBeInTheDocument();
    expect(submittedKeys).toHaveLength(2);
    expect(submittedKeys[1]).not.toBe(submittedKeys[0]);
  });

  it("uses a fresh idempotency key for a later deliberate acquisition", async () => {
    // arrange
    const user = userEvent.setup();
    const submittedKeys: string[] = [];
    seedCart(["hormone-harmony"]);
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
      http.post(STORE_ACQUISITIONS_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedKeys.push(String(formData.get("idempotencyKey")));

        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    renderCart();
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    let dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "Email address" }),
      "woman@example.com",
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: /agree to the terms/i,
      }),
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: STORE_MARKETING_CONSENT,
      }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Send my resources" }),
    );
    await within(dialog).findByRole("heading", {
      name: "Check your inbox",
    });
    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    // act
    await user.click(
      screen.getByRole("button", { name: "Add test resource" }),
    );
    dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await continueToAcquisitionDetails(dialog, user);
    const termsCheckbox = within(dialog).getByRole("checkbox", {
      name: /agree to the terms/i,
    });
    const marketingCheckbox = within(dialog).getByRole("checkbox", {
      name: STORE_MARKETING_CONSENT,
    });
    const submitButton = within(dialog).getByRole("button", {
      name: "Send my resources",
    });
    expect(termsCheckbox).not.toBeChecked();
    expect(marketingCheckbox).not.toBeChecked();
    expect(submitButton).toBeDisabled();
    await user.click(termsCheckbox);
    await user.click(submitButton);

    // assert
    await waitFor(() => {
      expect(submittedKeys).toHaveLength(2);
    });
    expect(submittedKeys[1]).not.toBe(submittedKeys[0]);
  });
});

function renderCart(options?: {
  botDetection?: BotDetectionRuntimeState;
  botDetectionConfig?: BotDetectionConfig;
}) {
  const queryClient = createTestQueryClient();
  const QueryWrapper = createTestQueryClientWrapper(queryClient);
  const router = createMemoryRouter([
    {
      Component: () => (
        <StoreCartProvider>
          <StoreCartButton />
          <StoreCartTestControls />
          <DisappearingStoreCartTestControl />
          <StoreCartDrawer
            botDetection={
              options?.botDetection ?? {
                config: options?.botDetectionConfig ?? {
                  provider: "static",
                  token: "static-store-token",
                },
                status: "ready",
              }
            }
          />
        </StoreCartProvider>
      ),
      path: "/",
    },
    {
      loader: () => fetch(STORE_CATALOG_API_URL),
      path: STORE_CATALOG_API_URL,
    },
  ]);

  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>,
  );
}

async function continueToAcquisitionDetails(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(
    await within(dialog).findByRole("button", { name: "Continue" }),
  );
}

function DisappearingStoreCartTestControl() {
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={(event) => {
        addProduct("hormone-harmony");
        openCartFrom(event.currentTarget);
        setIsVisible(false);
      }}
      type="button"
    >
      Open cart from disappearing control
    </button>
  );
}

function StoreCartTestControls() {
  const addProduct = useStoreCart((cart) => cart.addProduct);
  const openCartFrom = useStoreCart((cart) => cart.openCartFrom);

  return (
    <button
      onClick={(event) => {
        addProduct("hormone-harmony");
        openCartFrom(event.currentTarget);
      }}
      type="button"
    >
      Add test resource
    </button>
  );
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

function createProduct() {
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
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
  };
}
