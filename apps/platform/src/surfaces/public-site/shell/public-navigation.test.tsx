// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";

import { PublicNavigation } from "./public-navigation";

type TestUser = ReturnType<typeof userEvent.setup>;

const publicNavigationLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/pricing", label: "Pricing" },
] as const;

const nodesAddedOutsideReact: HTMLElement[] = [];

afterEach(() => {
  cleanup();
  while (nodesAddedOutsideReact.length > 0) {
    nodesAddedOutsideReact.pop()?.remove();
  }
  document.body.style.overflow = "";
  setScrollY(0);
});

// A link the overlay covers. Registered for teardown here rather than removed
// inline, so a failing assertion cannot leak it into the tests that follow.
function appendLinkBehindOverlay() {
  const link = document.createElement("a");
  link.href = "/behind";
  link.textContent = "Behind the overlay";
  document.body.append(link);
  nodesAddedOutsideReact.push(link);
}

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
  });
}

function renderPublicNavigation(options: {
  actions?: ReactNode;
  scrollBehavior?: "hero-overlay" | "solid";
  variant?: "waitlist" | "normal";
}) {
  render(
    <MotionConfig reducedMotion="always">
      <MemoryRouter>
        <PublicNavigation
          actions={options.actions}
          links={publicNavigationLinks}
          scrollBehavior={options.scrollBehavior ?? "hero-overlay"}
          variant={options.variant ?? "waitlist"}
        />
      </MemoryRouter>
    </MotionConfig>,
  );
}

// The separator before the actions is a pseudo-element on this row, hidden by
// the `empty:hidden` variant. `:empty` matches only when the row holds no nodes
// at all, so these tests pin that precondition: a stray whitespace expression
// between actions would strand a rule with nothing after it.
function queryNavigationActionsRow() {
  return document.querySelector('[class*="empty:hidden"]');
}

async function openMobileMenuWithKeyboard(user: TestUser) {
  const openMenuButton = screen.getByRole("button", { name: "Open menu" });

  openMenuButton.focus();
  await user.keyboard("{Enter}");
}

async function openMobileMenuWithPointer(user: TestUser) {
  await user.click(screen.getByRole("button", { name: "Open menu" }));
}

describe("PublicNavigation", () => {
  it("leaves the actions row free of nodes when every action renders nothing", () => {
    // arrange
    const EmptyAction = () => null;

    // act
    renderPublicNavigation({ actions: <EmptyAction />, variant: "normal" });

    // assert
    const actionsRow = queryNavigationActionsRow();
    expect(actionsRow).not.toBeNull();
    expect(actionsRow?.childNodes).toHaveLength(0);
  });

  it("fills the actions row once an action renders", () => {
    // arrange
    const PresentAction = () => <button type="button">Cart</button>;

    // act
    renderPublicNavigation({ actions: <PresentAction />, variant: "normal" });

    // assert
    const actionsRow = queryNavigationActionsRow();
    expect(actionsRow?.childNodes.length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Cart" }),
    ).toBeInTheDocument();
  });

  it("keeps the free store visible in waitlist mode without unrelated product controls", () => {
    // arrange
    const navigationOptions = { variant: "waitlist" } as const;

    // act
    renderPublicNavigation(navigationOptions);

    // assert
    expect(screen.getByRole("link", { name: "Eli Fitness" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Store" })).toHaveAttribute("href", "/store");
    expect(screen.queryByRole("button", { name: /cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("shows public links without cart, portal, or auth controls in normal mode", () => {
    // arrange
    const navigationOptions = { variant: "normal" } as const;

    // act
    renderPublicNavigation(navigationOptions);

    // assert
    expect(screen.getByRole("link", { name: "Eli Fitness" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Store" })).toHaveAttribute("href", "/store");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByRole("button", { name: /cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign/i })).not.toBeInTheDocument();
  });

  it("moves focus into the open menu and back to the toggle on close", async () => {
    // arrange
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "normal" });
    const openMenuButton = screen.getByRole("button", { name: "Open menu" });

    // act
    await openMobileMenuWithPointer(user);
    const focusedAfterOpen = document.activeElement;
    await user.keyboard("{Escape}");

    // assert
    expect(focusedAfterOpen).toHaveAccessibleName("Home");
    await waitFor(() => {
      expect(
        screen.queryByRole("navigation", {
          name: "Mobile public site navigation",
        }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(openMenuButton).toHaveFocus();
    });
  });

  it("keeps tabbing inside the header and the open menu", async () => {
    // arrange
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "normal" });
    appendLinkBehindOverlay();

    // act
    await openMobileMenuWithPointer(user);
    const reached: (string | null)[] = [];
    for (let step = 0; step < 12; step += 1) {
      await user.tab();
      reached.push(document.activeElement?.textContent ?? null);
    }

    // assert
    expect(reached).not.toContain("Behind the overlay");
  });

  it("opens the mobile menu through the keyboard-operable button", async () => {
    // arrange
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "normal" });

    // act
    await openMobileMenuWithKeyboard(user);

    // assert
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile public site navigation",
    });
    const closeMenuButton = screen.getByRole("button", { name: "Close menu" });

    expect(closeMenuButton).toHaveAttribute("aria-expanded", "true");
    expect(within(mobileNavigation).getByRole("link", { name: "Store" })).toHaveAttribute(
      "href",
      "/store",
    );
    expect(document.body).toHaveStyle({ overflow: "hidden" });
  });

  it("keeps authentication suppressed in the waitlist mobile menu", async () => {
    // arrange
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "waitlist" });

    // act
    await openMobileMenuWithKeyboard(user);

    // assert
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile public site navigation",
    });

    expect(
      within(mobileNavigation).queryByRole("link", { name: "Sign In" }),
    ).not.toBeInTheDocument();
    expect(within(mobileNavigation).getByRole("link", { name: "Store" })).toHaveAttribute(
      "href",
      "/store",
    );
  });

  it("closes the mobile menu through the keyboard-operable button", async () => {
    // arrange
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "normal" });
    await openMobileMenuWithKeyboard(user);

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("navigation", { name: "Mobile public site navigation" }),
      ).not.toBeInTheDocument();
    });
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
  });

  it("dismisses the mobile menu on link click", async () => {
    // arrange
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "normal" });
    await openMobileMenuWithPointer(user);

    const storeLink = within(
      screen.getByRole("navigation", {
        name: "Mobile public site navigation",
      }),
    ).getByRole("link", { name: "Store" });

    // act
    await user.click(storeLink);

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole("navigation", { name: "Mobile public site navigation" }),
      ).not.toBeInTheDocument();
    });
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
  });

  it("uses the transparent hero appearance before the scroll threshold is crossed", () => {
    // arrange
    setScrollY(0);

    // act
    renderPublicNavigation({ scrollBehavior: "hero-overlay", variant: "normal" });

    // assert
    expect(screen.getByRole("banner")).toHaveAttribute("data-appearance", "transparent");
  });

  it("uses the solid hero appearance after the scroll threshold is crossed", async () => {
    // arrange
    setScrollY(0);
    renderPublicNavigation({ scrollBehavior: "hero-overlay", variant: "normal" });
    const header = screen.getByRole("banner");

    // act
    setScrollY(51);
    window.dispatchEvent(new Event("scroll"));

    // assert
    await waitFor(() => {
      expect(header).toHaveAttribute("data-appearance", "solid");
    });
  });

  it("uses the solid appearance immediately for non-hero routes", () => {
    // arrange
    const navigationOptions = { scrollBehavior: "solid", variant: "normal" } as const;

    // act
    renderPublicNavigation(navigationOptions);

    // assert
    expect(screen.getByRole("banner")).toHaveAttribute("data-appearance", "solid");
  });
});
