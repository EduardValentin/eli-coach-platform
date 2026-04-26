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

afterEach(() => {
  cleanup();
});

describe("PublicMarketingLayout", () => {
  it("renders a skip link, labeled public navigation, and the main content landmark", () => {
    render(
      <MemoryRouter>
        <PublicMarketingLayout launchMode="waitlist" scrollBehavior="solid">
          <h1>Public page</h1>
        </PublicMarketingLayout>
      </MemoryRouter>,
    );

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
    const { baseElement } = render(
      <MemoryRouter>
        <PublicMarketingLayout launchMode="normal" scrollBehavior="solid">
          <h1>Public page</h1>
        </PublicMarketingLayout>
      </MemoryRouter>,
    );

    const results = await axe(baseElement);

    expect(results.violations).toEqual([]);
  });
});
