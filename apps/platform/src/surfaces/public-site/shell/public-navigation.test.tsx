// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { PublicNavigation } from "./public-navigation";

type TestUser = ReturnType<typeof userEvent.setup>;

const publicNavigationLinks = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/pricing", label: "Pricing" },
] as const;

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  setScrollY(0);
});

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
  });
}

function renderPublicNavigation(options: {
  scrollBehavior?: "hero-overlay" | "solid";
  variant?: "waitlist" | "normal";
}) {
  render(
    <MotionConfig reducedMotion="always">
      <MemoryRouter>
        <PublicNavigation
          links={publicNavigationLinks}
          scrollBehavior={options.scrollBehavior ?? "hero-overlay"}
          variant={options.variant ?? "waitlist"}
        />
      </MemoryRouter>
    </MotionConfig>,
  );
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

  it("renders no authentication control of its own, in either mode", async () => {
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
