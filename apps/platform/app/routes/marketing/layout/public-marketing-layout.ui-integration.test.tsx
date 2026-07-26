// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { PublicMarketingLayout } from "./public-marketing-layout";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

const waitlist = {
  availability: "available" as const,
  enabled: false,
  offer: activeOffer,
};

afterEach(() => {
  cleanup();
});

function createPublicLayoutRouter() {
  return createMemoryRouter(
    [
      {
        element: (
          <PublicMarketingLayout scrollBehavior="solid" waitlist={waitlist}>
            <h1>Public page</h1>
          </PublicMarketingLayout>
        ),
        path: "/",
      },
      {
        element: <h1>Privacy page</h1>,
        path: "/privacy",
      },
    ],
    {
      initialEntries: ["/"],
    },
  );
}

describe("PublicMarketingLayout legal navigation", () => {
  it("leaves footer privacy navigation to the browser", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createPublicLayoutRouter();

    render(<RouterProvider router={router} />);

    const privacyLink = screen
      .getAllByRole("link", { name: /\S/ })
      .find((link) => link.getAttribute("href") === "/privacy");
    const preventDocumentNavigation = (event: MouseEvent) => {
      event.preventDefault();
    };

    if (!privacyLink) {
      throw new Error("Expected the public footer to link to the privacy page.");
    }

    document.addEventListener("click", preventDocumentNavigation);

    try {
      // act
      await user.click(privacyLink);

      // assert
      expect(router.state.location.pathname).toBe("/");
    } finally {
      document.removeEventListener("click", preventDocumentNavigation);
    }
  });
});
