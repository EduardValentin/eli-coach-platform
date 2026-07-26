// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
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

function createPublicLayoutRouter(basename?: string) {
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
      {
        element: <h1>Terms page</h1>,
        path: "/terms",
      },
    ],
    {
      basename,
      initialEntries: [basename ? `${basename}/` : "/"],
    },
  );
}

describe("PublicMarketingLayout legal navigation", () => {
  it("leaves footer legal navigation to the browser", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createPublicLayoutRouter();

    render(<RouterProvider router={router} />);

    const legalNavigation = screen.getByRole("navigation", { name: "Legal" });
    const privacyLink = within(legalNavigation).getByRole("link", { name: "Privacy Policy" });
    const termsLink = within(legalNavigation).getByRole("link", { name: "Terms & Conditions" });
    const preventDocumentNavigation = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("click", preventDocumentNavigation);

    try {
      // act
      await user.click(privacyLink);
      await user.click(termsLink);

      // assert
      expect(router.state.location.pathname).toBe("/");
    } finally {
      document.removeEventListener("click", preventDocumentNavigation);
    }
  });

  it("includes the basename in each footer legal link", () => {
    // arrange
    const router = createPublicLayoutRouter("/evoa");

    // act
    render(<RouterProvider router={router} />);

    // assert
    const legalNavigation = screen.getByRole("navigation", { name: "Legal" });
    const legalHrefs = within(legalNavigation)
      .getAllByRole("link", { name: /\S/ })
      .map((link) => link.getAttribute("href"));

    expect(legalHrefs).toEqual(["/evoa/privacy", "/evoa/terms"]);
  });
});
