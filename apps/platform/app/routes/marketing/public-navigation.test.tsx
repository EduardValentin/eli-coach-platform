// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { publicNavigationLinks } from "@eli-coach-platform/domain";

import { PublicNavigation } from "./public-navigation";

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
    expect(screen.getByRole("button", { name: "Toggle menu" })).toHaveAttribute(
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

  it("opens the mobile menu and dismisses it immediately on link click", () => {
    renderPublicNavigation({ variant: "waitlist" });

    const menuButton = screen.getByRole("button", { name: "Toggle menu" });
    fireEvent.click(menuButton);

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile public site navigation",
    });

    expect(screen.getByRole("button", { name: "Toggle menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(mobileNavigation).getByRole("link", { name: "Store" })).toHaveAttribute(
      "href",
      "/store",
    );
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    fireEvent.click(within(mobileNavigation).getByRole("link", { name: "Store" }));

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
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header).toHaveAttribute("data-appearance", "solid");
    });
  });

  it("uses the solid appearance immediately for non-hero routes", () => {
    renderPublicNavigation({ scrollBehavior: "solid", variant: "normal" });

    expect(screen.getByRole("banner")).toHaveAttribute("data-appearance", "solid");
  });
});
