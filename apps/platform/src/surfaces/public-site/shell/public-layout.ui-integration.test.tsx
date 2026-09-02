// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

// PublicLayout composes AuthNavActions, which renders Clerk's SignInButton /
// SignOutButton. Those clone their child and wire an onClick into a live
// Clerk instance (see @clerk/react-router), which this legal-navigation
// integration test has no reason to stand up — the mock renders the child
// directly instead.
vi.mock("@clerk/react-router", () => ({
  SignInButton: ({ children }: PropsWithChildren) => children,
  SignOutButton: ({ children }: PropsWithChildren) => children,
}));

import { PublicLayout } from "./public-layout";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

const waitlist = {
  availability: "available" as const,
  enabled: false,
  offer: activeOffer,
};

const anonymousSession = { kind: "anonymous" as const };
const STORE_PATH = "/store";

afterEach(() => {
  cleanup();
});

function createPublicLayoutRouter(basename?: string) {
  return createMemoryRouter(
    [
      {
        element: (
          <PublicLayout
            scrollBehavior="solid"
            session={anonymousSession}
            storePath={STORE_PATH}
            waitlist={waitlist}
          >
            <h1>Public page</h1>
          </PublicLayout>
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

describe("PublicLayout legal navigation", () => {
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
