// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { ABOUT_CREDENTIAL_CHIPS, ABOUT_INSTAGRAM_URL, ABOUT_STORIES } from "./about-content";
import { MarketingAbout } from "./about";

afterEach(() => {
  cleanup();
});

function renderAbout(waitlistMode: boolean) {
  const router = createMemoryRouter(
    [
      {
        element: <MarketingAbout waitlistMode={waitlistMode} />,
        path: "/",
      },
      {
        element: <div>Pricing page</div>,
        path: "/pricing",
      },
      {
        element: <div>Booking shell</div>,
        path: "/book",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("MarketingAbout", () => {
  it("renders the approved prototype content and credentials", () => {
    renderAbout(true);

    expect(
      screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Strength & nutrition for women")).toBeInTheDocument();
    expect(
      screen.getByText("I'm a personal trainer and nutritionist", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Doors open soon. Get on the list so yours is held."),
    ).toBeInTheDocument();

    const list = screen.getByRole("list", { name: "Eli's credentials" });
    for (const chip of ABOUT_CREDENTIAL_CHIPS) {
      expect(within(list).getByText(chip)).toBeInTheDocument();
    }
  });

  it("shows both plan and pricing CTAs only in normal mode", () => {
    renderAbout(false);

    expect(
      screen.getByText("Ready to start? Let's build a plan you can actually stick to."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start my plan" })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("hides the plan and pricing CTAs in waitlist mode", () => {
    renderAbout(true);

    expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See pricing" })).not.toBeInTheDocument();
  });

  it("renders the Instagram widget with safe external handle and temporary hero media", () => {
    const { container } = renderAbout(true);

    expect(
      screen.getByRole("region", { name: "Instagram stories from Eli" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@elilungu_ on Instagram" })).toHaveAttribute(
      "href",
      ABOUT_INSTAGRAM_URL,
    );
    expect(screen.getByRole("link", { name: "@elilungu_ on Instagram" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: "@elilungu_ on Instagram" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );

    const video = container.querySelector("video");
    expect(video).toHaveAttribute("poster", "/media/hero/hero-training-poster.jpg");
    expect(video?.querySelector("source[type='video/webm']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.webm",
    );
    expect(video?.querySelector("source[type='video/mp4']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.mp4",
    );
    expect(ABOUT_STORIES).toHaveLength(3);
  });
});
