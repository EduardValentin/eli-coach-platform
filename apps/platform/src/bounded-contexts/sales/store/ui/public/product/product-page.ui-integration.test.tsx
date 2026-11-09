// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";
import type { StoreCurrency } from "~/bounded-contexts/sales/store/public/store-currency";

import { StoreCartProvider } from "../cart/cart-provider";
import ProductDetailsRoute from "./product-page";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("store product details", () => {
  it("shows the published free resource and adds it to the shared cart", async () => {
    // arrange
    const user = userEvent.setup();
    renderProductPage({ product: createProduct() });

    // act
    await user.click(
      await screen.findByRole("button", {
        name: "Get Hormone Harmony for free",
      }),
    );

    // assert
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Hormone Harmony",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Added to your cart" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/[€$]/)).not.toBeInTheDocument();
    expect(screen.queryByText("Free", { exact: true })).not.toBeInTheDocument();
  });

  it("prices a paid product in euros and adds it to the shared cart", async () => {
    // arrange
    const user = userEvent.setup();
    renderProductPage({ product: createPlan() });

    // act
    await user.click(
      await screen.findByRole("button", {
        name: "Add 30-Day Fat Loss Plan to cart",
      }),
    );

    // assert
    expect(screen.getByText("€39.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Added to your cart" }),
    ).toBeInTheDocument();
  });

  it("prices a paid product in the currency the visitor chose", async () => {
    // arrange
    const product = createPlan();

    // act
    renderProductPage({ initialCurrency: "USD", product });

    // assert
    expect(await screen.findByText("$45.00")).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });
});

function renderProductPage(options: {
  initialCurrency?: StoreCurrency;
  product: StoreProduct;
}) {
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <StoreCartProvider initialCurrency={options.initialCurrency ?? "EUR"}>
            <ProductDetailsRoute />
          </StoreCartProvider>
        ),
        loader: () => options.product,
        path: "/store/:slug",
      },
    ],
    { initialEntries: [`/store/${options.product.slug}`] },
  );

  return render(<RouterProvider router={router} />);
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
