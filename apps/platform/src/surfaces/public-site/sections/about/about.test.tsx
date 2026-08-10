// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { MarketingAbout } from "./about";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

function renderWaitlistAbout() {
  const router = createMemoryRouter(
    [
      {
        element: (
          <MarketingAbout
            waitlist={{ availability: "available", enabled: true, offer: activeOffer }}
          />
        ),
        path: "/",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

function renderNormalAbout() {
  const router = createMemoryRouter(
    [
      {
        element: (
          <MarketingAbout
            waitlist={{ availability: "available", enabled: false, offer: activeOffer }}
          />
        ),
        path: "/",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
});

describe("MarketingAbout", () => {
  it("renders the waitlist-mode about layout", () => {
    // arrange
    // act
    renderWaitlistAbout();

    // assert
    expect(screen.getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: /\S/ })).toHaveLength(1);
    const credentials = screen.getByRole("list", { name: /\S/ });

    expect(within(credentials).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /\S/ })).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: /\S/ })).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /\S/ });

    expect(links.filter((link) => link.getAttribute("href") === "/book")).toHaveLength(0);
    expect(links.filter((link) => link.getAttribute("href") === "/pricing")).toHaveLength(0);
  });

  it("renders normal-mode CTAs with internal routes", () => {
    // arrange
    // act
    renderNormalAbout();

    // assert
    const links = screen.getAllByRole("link", { name: /\S/ });

    expect(links.filter((link) => link.getAttribute("href") === "/book")).toHaveLength(1);
    expect(links.filter((link) => link.getAttribute("href") === "/pricing")).toHaveLength(1);
  });
});
