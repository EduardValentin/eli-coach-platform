// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { createOwnedProduct } from "~/features/store/ui/public/library-products.test-support";
import type { LibraryContent } from "~/features/store/ui/public/library-view";

import LibraryRoute from "./library";

afterEach(() => {
  cleanup();
});

describe("library page", () => {
  it("loads the Library again when the failure card offers to try", async () => {
    // arrange
    const user = userEvent.setup();
    const library = stubLoader([
      { status: "unavailable" },
      { products: [createOwnedProduct()], status: "loaded" },
    ]);
    render(<RouterProvider router={library.router} />);
    await screen.findByRole("alert");

    // act
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // assert
    await screen.findByRole("status");
    expect(screen.getByRole("status")).toHaveTextContent("Loading your Library");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await library.releasePendingLoad();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Hormone Harmony" }),
    ).toBeInTheDocument();
  });

  it("renders the products the loader served", async () => {
    // arrange
    const library = stubLoader([{ products: [createOwnedProduct()], status: "loaded" }]);

    // act
    render(<RouterProvider router={library.router} />);

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Your Library" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download Hormone Harmony" }),
    ).toBeInTheDocument();
  });
});

function stubLoader(outcomes: readonly LibraryContent[]) {
  let loadCount = 0;
  let releaseLoad: (() => void) | undefined;

  const router = createMemoryRouter(
    [
      {
        Component: LibraryRoute,
        loader: async () => {
          const outcome = outcomes[Math.min(loadCount, outcomes.length - 1)];
          loadCount += 1;

          if (loadCount > 1) {
            await new Promise<void>((release) => {
              releaseLoad = release;
            });
          }

          return outcome;
        },
        path: "/library",
      },
    ],
    { initialEntries: ["/library"] },
  );

  return {
    async releasePendingLoad() {
      await waitFor(() => {
        expect(releaseLoad).toBeDefined();
      });
      releaseLoad?.();
    },
    router,
  };
}

