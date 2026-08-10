// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { configureAxe } from "vitest-axe";

import {
  createTestQueryClient,
  createTestQueryClientWrapper,
} from "~tests/support/query-client";

import StoreRoute, { ErrorBoundary as StoreErrorBoundary } from "../store";
import { STORE_CART_STORAGE_KEY } from "~/features/store/ui/public/cart";
import { StoreCartProvider } from "~/features/store/ui/public/cart-provider";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "~/features/store/ui/public/cart-drawer";
import { STORE_CATALOG_API_URL } from "~/features/store/ui/public/api-client";

const server = setupServer();
const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

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
  localStorage.clear();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("store catalog", () => {
  it("shows live free resources without paid-store controls", async () => {
    // arrange
    const products = [createProduct()];

    // act
    renderStore({ products });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Free resources",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Hormone Harmony" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Get Hormone Harmony for free",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /currency/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /filter by/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Plans" }),
    ).not.toBeInTheDocument();
  });

  it("distinguishes an empty live catalog from a loading or error state", async () => {
    // arrange
    const products: readonly ReturnType<typeof createProduct>[] = [];

    // act
    renderStore({ products });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "The store is getting ready",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("prunes saved resources missing from the server-rendered catalog after hydration", async () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs: ["hormone-harmony", "removed-guide"],
        version: 1,
      }),
    );

    // act
    renderStore({ products: [createProduct()] });

    // assert
    expect(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!),
    ).toEqual({
      productSlugs: ["hormone-harmony"],
      version: 1,
    });
  });

  it("shows a recoverable catalog error while keeping the public page available", async () => {
    // arrange
    const catalogError = new Response(
      "The store is temporarily unavailable.",
      { status: 503 },
    );

    // act
    renderStore({ catalogError });

    // assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The store is temporarily unavailable",
    );
    expect(
      screen.getByRole("link", { name: "Return home" }),
    ).toHaveAttribute("href", "/");
  });

  it("has no obvious accessibility violations with a live catalog", async () => {
    // arrange
    const products = [createProduct()];

    // act
    const { baseElement } = renderStore({ products });
    await screen.findByRole("heading", {
      level: 2,
      name: "Free resources",
    });
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("has no obvious accessibility violations in the open acquisition drawer", async () => {
    // arrange
    const user = userEvent.setup();
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({
        productSlugs: ["hormone-harmony"],
        version: 1,
      }),
    );
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );

    // act
    const { baseElement } = renderStore({ products: [createProduct()] });
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await user.click(
      await within(dialog).findByRole("button", { name: "Continue" }),
    );
    const results = await axe(baseElement);

    // assert
    expect(
      within(dialog).getByRole("heading", { name: "Almost there" }),
    ).toBeInTheDocument();
    expect(results.violations).toEqual([]);
  });
});

function renderStore(options: {
  catalogError?: Response;
  products?: readonly ReturnType<typeof createProduct>[];
}) {
  const queryClient = createTestQueryClient();
  const QueryWrapper = createTestQueryClientWrapper(queryClient);
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <StoreCartProvider>
            <StoreCartButton />
            <StoreRoute />
            <StoreCartDrawer
              botDetection={{
                config: {
                  provider: "static",
                  token: "static-store-token",
                },
                status: "ready",
              }}
            />
          </StoreCartProvider>
        ),
        ErrorBoundary: StoreErrorBoundary,
        loader: () => {
          if (options.catalogError) {
            throw options.catalogError;
          }

          return { products: options.products ?? [] };
        },
        path: "/store",
      },
      {
        loader: () => fetch(STORE_CATALOG_API_URL),
        path: STORE_CATALOG_API_URL,
      },
    ],
    { initialEntries: ["/store"] },
  );

  return render(
    <QueryWrapper>
      <RouterProvider router={router} />
    </QueryWrapper>,
  );
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
