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

import type { PublicSessionState } from "~/features/accounts/contracts/account";
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";

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

function createPublicLayoutRouter(options?: {
  basename?: string;
  session?: PublicSessionState;
  waitlist?: Waitlist;
}) {
  return createMemoryRouter(
    [
      {
        element: (
          <PublicLayout
            scrollBehavior="solid"
            session={options?.session ?? anonymousSession}
            storePath={STORE_PATH}
            waitlist={options?.waitlist ?? waitlist}
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
      basename: options?.basename,
      initialEntries: [options?.basename ? `${options.basename}/` : "/"],
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
    const router = createPublicLayoutRouter({ basename: "/evoa" });

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

describe("PublicLayout Library navigation", () => {
  it.each(["USER", "CLIENT", "COACH"] as const)(
    "offers a %s account the Library from the always-visible bar",
    (role) => {
      // arrange
      const router = createPublicLayoutRouter({
        session: { kind: "authenticated", role },
      });

      // act
      render(<RouterProvider router={router} />);

      // assert
      const header = screen.getByRole("navigation", {
        name: "Public site navigation",
      });
      expect(
        within(header).getByRole("link", { name: "Library" }),
      ).toHaveAttribute("href", "/library");
    },
  );

  it("puts the Library ahead of the account controls, as the prototype does", () => {
    // arrange
    const router = createPublicLayoutRouter({
      session: { kind: "authenticated", role: "CLIENT" },
    });

    // act
    render(<RouterProvider router={router} />);

    // assert
    const header = screen.getByRole("navigation", {
      name: "Public site navigation",
    });
    const libraryLink = within(header).getByRole("link", { name: "Library" });
    const portalLink = within(header).getByRole("link", { name: "Client Portal" });
    const signOut = within(header).getByRole("button", { name: "Sign Out" });
    expect(
      libraryLink.compareDocumentPosition(portalLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      libraryLink.compareDocumentPosition(signOut) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("offers the Library from the mobile menu too", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createPublicLayoutRouter({
      session: { kind: "authenticated", role: "USER" },
    });
    render(<RouterProvider router={router} />);

    // act
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // assert
    const overlay = await screen.findByRole("navigation", {
      name: "Mobile public site navigation",
    });
    expect(
      within(overlay).getByRole("link", { name: "Library" }),
    ).toHaveAttribute("href", "/library");
  });

  it("puts the Library ahead of the account controls in the mobile menu too", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createPublicLayoutRouter({
      session: { kind: "authenticated", role: "CLIENT" },
    });
    render(<RouterProvider router={router} />);

    // act
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // assert
    const overlay = await screen.findByRole("navigation", {
      name: "Mobile public site navigation",
    });
    const libraryLink = within(overlay).getByRole("link", { name: "Library" });
    const portalLink = within(overlay).getByRole("link", { name: "Client Portal" });
    const signOut = within(overlay).getByRole("button", { name: "Sign Out" });
    expect(
      libraryLink.compareDocumentPosition(portalLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      libraryLink.compareDocumentPosition(signOut) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("offers no Library to a visitor who is not signed in", () => {
    // arrange
    const router = createPublicLayoutRouter();

    // act
    render(<RouterProvider router={router} />);

    // assert
    expect(
      screen.queryByRole("link", { name: "Library" }),
    ).not.toBeInTheDocument();
  });

  it("withholds the Library in waiting list mode, as it does every auth control", () => {
    // arrange
    const router = createPublicLayoutRouter({
      session: { kind: "authenticated", role: "CLIENT" },
      waitlist: { ...waitlist, enabled: true },
    });

    // act
    render(<RouterProvider router={router} />);

    // assert
    expect(
      screen.queryByRole("link", { name: "Library" }),
    ).not.toBeInTheDocument();
  });
});
