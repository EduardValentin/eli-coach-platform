// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import { MAIN_CONTENT_ID } from "../constants";
import { MarketingSurfaceLayout } from "./marketing-surface-layout";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

async function expectNoAxeViolations(baseElement: HTMLElement) {
  const results = await axe(baseElement);

  expect(results.violations).toEqual([]);
}

describe("MarketingSurfaceLayout", () => {
  it("renders a skip link, labeled navigation, and the main content landmark", () => {
    render(
      <MemoryRouter>
        <MarketingSurfaceLayout
          links={[{ href: "/", label: "Home" }]}
          navigationLabel="Public site navigation"
          title="Eli Coach Platform"
        >
          <div>Marketing content</div>
        </MarketingSurfaceLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      `#${MAIN_CONTENT_ID}`,
    );
    expect(screen.getByRole("navigation", { name: "Public site navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
  });
});

describe("MarketingSurfaceLayout accessibility", () => {
  it("has no obvious axe violations", async () => {
    const { baseElement } = render(
      <MemoryRouter>
        <MarketingSurfaceLayout
          links={[{ href: "/", label: "Home" }]}
          navigationLabel="Public site navigation"
          title="Eli Coach Platform"
        >
          <div>Marketing content</div>
        </MarketingSurfaceLayout>
      </MemoryRouter>,
    );

    await expectNoAxeViolations(baseElement);
  });
});
