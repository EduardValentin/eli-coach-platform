// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  createMemoryRouter,
  RouterProvider,
} from "react-router";

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: vi.fn(),
}));

import { StoreCartProvider } from "./store-cart";
import ProductDetailsRoute from "./product-details";

describe("store product details", () => {
  it("shows the published free resource and adds it to the shared cart", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        {
          Component: () => (
            <StoreCartProvider>
              <ProductDetailsRoute />
            </StoreCartProvider>
          ),
          loader: () => createProduct(),
          path: "/store/:slug",
        },
      ],
      { initialEntries: ["/store/hormone-harmony"] },
    );
    render(<RouterProvider router={router} />);

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
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Free", { exact: true })).not.toBeInTheDocument();
  });
});

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
