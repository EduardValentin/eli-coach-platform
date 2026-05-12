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
  it("renders the prototype copy, portrait, chips, and story widget", () => {
    renderWaitlistAbout();

    expect(
      screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Strength & nutrition for women")).toBeInTheDocument();
    expect(
      screen.getByAltText("Eli, personal trainer and nutritionist for women, smiling outdoors"),
    ).toHaveAttribute("src", "/media/hero/hero-training-poster.jpg");
    expect(screen.getByText("IFBB Certified Trainer")).toBeInTheDocument();
    expect(screen.getByText("Certified Nutritionist")).toBeInTheDocument();
    expect(screen.getByText("Women Focused")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Instagram stories — tap left or right to navigate"),
    ).toBeInTheDocument();
  });

  it("renders waitlist closing copy and hides normal-mode CTAs", () => {
    renderWaitlistAbout();

    expect(screen.getByText("Doors open soon. Get on the list so yours is held.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See pricing" })).not.toBeInTheDocument();
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

  it("does not introduce a second h1", () => {
    renderNormalAbout();

    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(
      screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
    ).toBeInTheDocument();
  });

  it("keeps chip labels grouped as a list", () => {
    renderWaitlistAbout();

    const list = screen.getByRole("list", { name: "Eli's credentials and coaching focus" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });
});
