// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { MarketingAbout } from "./about";

function renderWaitlistAbout() {
  const router = createMemoryRouter(
    [
      {
        element: (
          <MarketingAbout
            waitlist={{ cap: 10, enabled: true, spotsRemaining: 10 }}
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
            waitlist={{ cap: 10, enabled: false, spotsRemaining: 10 }}
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
    renderWaitlistAbout();

    expect(
      screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Strength & nutrition for women")).toBeInTheDocument();
    expect(
      screen.getByAltText("Eli, personal trainer and nutritionist for women, smiling outdoors"),
    ).toBeInTheDocument();
    expect(screen.getByText("Doors open soon. Get on the list so yours is held.")).toBeInTheDocument();

    const credentials = screen.getByRole("list", {
      name: "Eli's credentials and coaching focus",
    });

    expect(within(credentials).getAllByRole("listitem")).toHaveLength(3);
    expect(within(credentials).getByText("IFBB Certified Trainer")).toBeInTheDocument();
    expect(within(credentials).getByText("Certified Nutritionist")).toBeInTheDocument();
    expect(within(credentials).getByText("Women Focused")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Instagram stories — tap left or right to navigate"),
    ).toBeInTheDocument();
  });

  it("renders normal-mode CTAs with internal routes", () => {
    renderNormalAbout();

    expect(
      screen.getByText("Ready to start? Let's build a plan you can actually stick to."),
    ).toBeInTheDocument();
    const startPlanLink = screen.getByRole("link", { name: "Start my plan" });

    expect(startPlanLink).toHaveAttribute("href", "/book");
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
