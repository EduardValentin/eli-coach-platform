// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import { PublicMarketingLayout } from "./public-marketing-layout";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

afterEach(() => {
  cleanup();
});

describe("PublicMarketingLayout", () => {
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
        <PublicMarketingLayout scrollBehavior="solid" waitlist={waitlist}>
          <h1>Short public page</h1>
        </PublicMarketingLayout>
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
        <PublicMarketingLayout scrollBehavior="solid" waitlist={waitlist}>
          <h1>Public page</h1>
        </PublicMarketingLayout>
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
});

describe("PublicMarketingLayout accessibility", () => {
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
        <PublicMarketingLayout scrollBehavior="solid" waitlist={waitlist}>
          <h1>Public page</h1>
        </PublicMarketingLayout>
      </MemoryRouter>,
    );

    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
