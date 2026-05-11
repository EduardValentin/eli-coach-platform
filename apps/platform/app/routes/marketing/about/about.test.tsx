// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";

import { ABOUT_PORTRAIT } from "./about-content";
import { MarketingAbout } from "./about";

const APPROVED_CREDENTIAL_CHIPS = [
  "IFBB Certified Trainer",
  "Certified Nutritionist",
  "Women Focused",
] as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    }),
  );
}

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

function renderAboutStaticShell(waitlistMode: boolean) {
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

  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderToString(<RouterProvider router={router} />);

  return wrapper;
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
    for (const chip of APPROVED_CREDENTIAL_CHIPS) {
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

  it("uses a first-party portrait asset", () => {
    renderAbout(true);

    expect(screen.getByRole("img", { name: ABOUT_PORTRAIT.alt })).toHaveAttribute(
      "src",
      "/media/about/eli-training-portrait.jpg",
    );
  });

  it("renders the Instagram widget with safe external handle and temporary hero media", async () => {
    stubReducedMotion(false);
    const { container } = renderAbout(true);

    expect(
      screen.getByRole("region", { name: "Instagram stories from Eli" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@elilungu_ on Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/elilungu_",
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
    await waitFor(() => {
      expect(video?.querySelector("source[type='video/webm']")).toHaveAttribute(
        "src",
        "/media/hero/hero-training-loop.webm",
      );
      expect(video?.querySelector("source[type='video/mp4']")).toHaveAttribute(
        "src",
        "/media/hero/hero-training-loop.mp4",
      );
    });
    expect(screen.getAllByTestId("story-progress-segment")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Like story" })).not.toBeInTheDocument();
  });

  it("keeps the story media poster-only in the initial static shell", () => {
    stubReducedMotion(false);
    const container = renderAboutStaticShell(true);

    const video = container.querySelector("video");

    expect(video?.querySelector("source")).not.toBeInTheDocument();
    expect(video).toHaveAttribute("poster", "/media/hero/hero-training-poster.jpg");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("loop");
  });

  it("keeps the story media poster-only when reduced motion is requested", () => {
    stubReducedMotion(true);
    const { container } = renderAbout(true);

    const video = container.querySelector("video");

    expect(video?.querySelector("source")).not.toBeInTheDocument();
    expect(video).toHaveAttribute("poster", "/media/hero/hero-training-poster.jpg");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("loop");
  });
});
