// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
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
  it("renders a skip link, labeled public navigation, and the main content landmark", () => {
    // arrange
    const waitlist = { enabled: true, cap: 10, offer: activeOffer, spotsRemaining: 10 };

    // act
    render(
      <MemoryRouter>
        <PublicMarketingLayout scrollBehavior="solid" waitlist={waitlist}>
          <h1>Public page</h1>
        </PublicMarketingLayout>
      </MemoryRouter>,
    );

    // assert
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("navigation", { name: "Public site navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("heading", { level: 1, name: "Public page" })).toBeInTheDocument();
  });
});

describe("PublicMarketingLayout accessibility", () => {
  it("has no obvious axe violations", async () => {
    // arrange
    const waitlist = { enabled: false, cap: 10, offer: activeOffer, spotsRemaining: 10 };

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
