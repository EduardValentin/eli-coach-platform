// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { PublicNavigation } from "./public-navigation";

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
    <MemoryRouter>
      <PublicNavigation
        links={publicNavigationLinks}
        scrollBehavior={options.scrollBehavior ?? "hero-overlay"}
        variant={options.variant ?? "waitlist"}
      />
    </MemoryRouter>,
  );
}

describe("PublicNavigation", () => {
  it("shows public links in waitlist mode", () => {
    renderPublicNavigation({ variant: "waitlist" });

    expect(screen.getByRole("link", { name: "Eli Fitness" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Store" })).toHaveAttribute("href", "/store");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("shows public links without cart, portal, or auth controls in normal mode", () => {
    renderPublicNavigation({ variant: "normal" });

    expect(screen.getByRole("link", { name: "Eli Fitness" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Store" })).toHaveAttribute("href", "/store");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByRole("button", { name: /cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign/i })).not.toBeInTheDocument();
  });

  it("opens and closes the mobile menu through the keyboard-operable button", async () => {
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "waitlist" });

    const openMenuButton = screen.getByRole("button", { name: "Open menu" });

    openMenuButton.focus();
    await user.keyboard("{Enter}");

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

    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.queryByRole("navigation", { name: "Mobile public site navigation" }),
    ).not.toBeInTheDocument();
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
  });

  it("dismisses the mobile menu on link click", async () => {
    const user = userEvent.setup();
    renderPublicNavigation({ variant: "waitlist" });

    const openMenuButton = screen.getByRole("button", { name: "Open menu" });

    await user.click(openMenuButton);

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile public site navigation",
    });
    const storeLink = within(mobileNavigation).getByRole("link", { name: "Store" });

    expect(document.body).toHaveStyle({ overflow: "hidden" });

    await user.click(storeLink);

    expect(
      screen.queryByRole("navigation", { name: "Mobile public site navigation" }),
    ).not.toBeInTheDocument();
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
  });

  it("uses the transparent hero appearance until the scroll threshold is crossed", async () => {
    setScrollY(0);
    renderPublicNavigation({ scrollBehavior: "hero-overlay", variant: "normal" });

    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-appearance", "transparent");

    setScrollY(51);
    window.dispatchEvent(new Event("scroll"));

    await waitFor(() => {
      expect(header).toHaveAttribute("data-appearance", "solid");
    });
  });

  it("uses the solid appearance immediately for non-hero routes", () => {
    renderPublicNavigation({ scrollBehavior: "solid", variant: "normal" });

    expect(screen.getByRole("banner")).toHaveAttribute("data-appearance", "solid");
  });
});
