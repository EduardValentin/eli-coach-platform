// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import {
  createTestQueryClient,
  createTestQueryClientWrapper,
} from "~/test/query-client";

import StoreRoute from "../store";
import { STORE_CART_STORAGE_KEY } from "./store-cart";
import { StoreCartProvider } from "./store-cart-provider";
import {
  StoreCartButton,
  StoreCartDrawer,
} from "./store-cart-drawer";
import { STORE_CATALOG_API_URL } from "./store-query";

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
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );

    // act
    renderStore();

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
    expect(screen.queryByRole("group", { name: /currency/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /filter by/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Plans" })).not.toBeInTheDocument();
  });

  it("distinguishes an empty live catalog from a loading or error state", async () => {
    // arrange
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({ products: [], success: true }),
      ),
    );

    // act
    renderStore();

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "The store is getting ready",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a recoverable catalog error while keeping the public page available", async () => {
    // arrange
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

    // act
    renderStore();

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
    server.use(
      http.get(STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );

    // act
    const { baseElement } = renderStore();
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
    const { baseElement } = renderStore();
    await user.click(
      await screen.findByRole("button", { name: "Cart, 1 item" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Your cart" });
    await user.click(
      within(dialog).getByRole("button", { name: "Continue" }),
    );
    const results = await axe(baseElement);

    // assert
    expect(
      within(dialog).getByRole("heading", { name: "Almost there" }),
    ).toBeInTheDocument();
    expect(results.violations).toEqual([]);
  });
});

function renderStore() {
  const queryClient = createTestQueryClient();
  const QueryWrapper = createTestQueryClientWrapper(queryClient);

  return render(
    <QueryWrapper>
      <MemoryRouter>
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
      </MemoryRouter>
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
