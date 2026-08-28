// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

// PublicLayout composes AuthNavActions, which renders Clerk's SignInButton /
// SignOutButton. Those clone their child and wire an onClick into a live
// Clerk instance (see @clerk/react-router), which this layout test has no
// reason to stand up — the layout's own contract (landmarks, footer, waitlist
// gating) doesn't depend on Clerk being loaded, so the mock renders the
// child directly instead.
vi.mock("@clerk/react-router", () => ({
  SignInButton: ({ children }: PropsWithChildren) => children,
  SignOutButton: ({ children }: PropsWithChildren) => children,
}));

import { PublicLayout } from "./public-layout";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

const anonymousSession = { kind: "anonymous" } as const;
const STORE_PATH = "/store";

afterEach(() => {
  cleanup();
});

describe("PublicLayout", () => {
  it("lets short public pages fill the viewport before rendering the footer", () => {
    // arrange
    const waitlist = {
      availability: "available" as const,
      enabled: true,
      offer: activeOffer,
    };

    // act
    render(
      <MemoryRouter>
        <PublicLayout
          scrollBehavior="solid"
          session={anonymousSession}
          storePath={STORE_PATH}
          waitlist={waitlist}
        >
          <h1>Short public page</h1>
        </PublicLayout>
      </MemoryRouter>,
    );

    // assert
    const main = screen.getByRole("main", { name: /\S/ });

    expect(main.parentElement).toHaveClass("flex", "min-h-screen", "flex-col");
    expect(main).toHaveClass("flex-1");
  });

  it("renders the public navigation, named main content, and one legal footer", () => {
    // arrange
    const waitlist = { availability: "available" as const, enabled: true, offer: activeOffer };

    // act
    render(
      <MemoryRouter>
        <PublicLayout
          scrollBehavior="solid"
          session={anonymousSession}
          storePath={STORE_PATH}
          waitlist={waitlist}
        >
          <h1>Public page</h1>
        </PublicLayout>
      </MemoryRouter>,
    );

    // assert
    const main = screen.getByRole("main", { name: /\S/ });
    const skipLink = screen
      .getAllByRole("link", { name: /\S/ })
      .find((link) => link.getAttribute("href") === "#main-content");

    expect(skipLink).toBeDefined();
    expect(main).toHaveAttribute("id", "main-content");
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(screen.getAllByRole("navigation", { name: /\S/ })).toHaveLength(2);
    const [publicFooter] = screen.getAllByRole("contentinfo");

    expect(publicFooter).toBeInTheDocument();

    const legalNavigation = within(publicFooter).getByRole("navigation", { name: /\S/ });
    const legalHrefs = within(legalNavigation)
      .getAllByRole("link", { name: /\S/ })
      .map((link) => link.getAttribute("href"));

    expect(legalNavigation).toBeInTheDocument();
    expect(legalHrefs).toEqual(["/privacy", "/terms"]);
  });

  it("hides every auth control during the waitlist while keeping the cart", () => {
    // arrange
    const waitlist = { availability: "available" as const, enabled: true, offer: activeOffer };
    const cart = <button type="button">Cart, 2 items</button>;

    // act
    render(
      <MemoryRouter>
        <PublicLayout
          navigationActions={cart}
          scrollBehavior="solid"
          session={{ kind: "authenticated", role: "CLIENT" }}
          storePath={STORE_PATH}
          waitlist={waitlist}
        >
          <h1>Public page</h1>
        </PublicLayout>
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("button", { name: "Cart, 2 items" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign (in|out)/i })).not.toBeInTheDocument();
  });

  it("shows the session's auth controls alongside the cart once the waitlist ends", () => {
    // arrange
    const waitlist = { availability: null, enabled: false, offer: activeOffer };
    const cart = <button type="button">Cart, 1 item</button>;

    // act
    render(
      <MemoryRouter>
        <PublicLayout
          navigationActions={cart}
          scrollBehavior="solid"
          session={{ kind: "authenticated", role: "COACH" }}
          storePath={STORE_PATH}
          waitlist={waitlist}
        >
          <h1>Public page</h1>
        </PublicLayout>
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("button", { name: "Cart, 1 item" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Coach Portal" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Sign Out" }).length).toBeGreaterThan(0);
  });
});

describe("PublicLayout accessibility", () => {
  it("has no obvious axe violations", async () => {
    // arrange
    const waitlist = {
      availability: "available" as const,
      enabled: false,
      offer: activeOffer,
    };

    // act
    const { baseElement } = render(
      <MemoryRouter>
        <PublicLayout
          scrollBehavior="solid"
          session={anonymousSession}
          storePath={STORE_PATH}
          waitlist={waitlist}
        >
          <h1>Public page</h1>
        </PublicLayout>
      </MemoryRouter>,
    );

    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
