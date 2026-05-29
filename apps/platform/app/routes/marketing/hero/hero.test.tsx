// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { PlatformQueryProvider } from "~/query-client";

import { MarketingHero } from "./hero";

const STATIC_BOT_DETECTION = {
  provider: "static",
  token: TURNSTILE_TEST_RESPONSE_TOKEN,
} satisfies BotDetectionConfig;

const activeOffer = {
  plan: "12-months",
  slug: "12-months-launch-1",
} as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderHero(
  waitlist: {
    enabled: boolean;
    cap: number;
    spotsRemaining: number | null;
  },
  options: {
    reducedMotion?: "always" | "never" | "user";
  } = {},
) {
  const waitlistWithOffer = {
    ...waitlist,
    offer: activeOffer,
  };
  const router = createMemoryRouter(
    [
      {
        element: (
          <MarketingHero
            botDetectionConfig={STATIC_BOT_DETECTION}
            waitlist={waitlistWithOffer}
          />
        ),
        path: "/",
      },
      {
        action: () => new Response(null, { status: 404, statusText: "Not Found" }),
        path: "/api/waitlist",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(
    <MotionConfig reducedMotion={options.reducedMotion ?? "never"}>
      <PlatformQueryProvider>
        <RouterProvider router={router} />
      </PlatformQueryProvider>
    </MotionConfig>,
  );
}

describe("MarketingHero local interactions", () => {
  it("renders the waitlist form and counter in waitlist mode", () => {
    // arrange
    const waitlist = { enabled: true, cap: 10, spotsRemaining: 10 };

    // act
    renderHero(waitlist);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Limited spots")).toBeInTheDocument();
    expect(
      screen.getByText("Strength, nutrition, and cycle-aware coaching", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "reduced pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByText("10 of 10 spots remaining")).toBeInTheDocument();
  });

  it("renders the closed waitlist state when all spots are claimed", () => {
    // arrange
    const waitlist = { enabled: true, cap: 10, spotsRemaining: 0 };

    // act
    renderHero(waitlist);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
    ).toBeInTheDocument();
    expect(screen.getByText("This round is full")).toBeInTheDocument();
    expect(
      screen.getByText("Leave your email — I'll let you know when new spots open."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("All 10 spots have been claimed", { exact: false }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();
    expect(screen.queryByText("0 of 10 spots remaining")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("renders the normal CTA as a booking link when waitlist mode is disabled", () => {
    // arrange
    const waitlist = { enabled: false, cap: 10, spotsRemaining: 10 };

    // act
    renderHero(waitlist);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See if we’re a fit" })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(
      screen.queryByRole("button", { name: "See if we’re a fit" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });

  it("renders exactly one h1", () => {
    // arrange
    const waitlistEnabled = { enabled: true, cap: 10, spotsRemaining: 10 };
    const waitlistDisabled = { enabled: false, cap: 10, spotsRemaining: 10 };

    // act
    const { unmount } = renderHero(waitlistEnabled);
    const waitlistHeadingCount = screen.getAllByRole("heading", { level: 1 }).length;
    unmount();
    renderHero(waitlistDisabled);
    const normalHeadingCount = screen.getAllByRole("heading", { level: 1 }).length;

    // assert
    expect(waitlistHeadingCount).toBe(1);
    expect(normalHeadingCount).toBe(1);
  });

  it("renders a first-party hero video with a poster before loading sources", async () => {
    // arrange
    vi.useFakeTimers();
    const waitlist = { enabled: false, cap: 10, spotsRemaining: 10 };

    // act
    const { container } = renderHero(waitlist);

    const video = container.querySelector("video");
    const sourceCountBeforeLoading = video?.querySelectorAll("source").length;
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // assert
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("poster", "/media/hero/hero-training-poster.jpg");
    expect(video).toHaveAttribute("preload", "none");
    expect(sourceCountBeforeLoading).toBe(0);
    expect(video?.querySelector("source[type='video/webm']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.webm",
    );
    expect(video?.querySelector("source[type='video/mp4']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.mp4",
    );
    expect(container.innerHTML).not.toContain("pexels.com");
    expect(container.innerHTML).not.toContain("images.unsplash.com");
  });

  it("keeps the poster only when reduced motion is requested", async () => {
    // arrange
    vi.useFakeTimers();
    const waitlist = { enabled: false, cap: 10, spotsRemaining: 10 };
    const options = { reducedMotion: "always" } as const;

    // act
    const { container } = renderHero(waitlist, options);

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // assert
    expect(container.querySelector("video source")).not.toBeInTheDocument();
  });

  it("exposes keyboard-operable video controls", async () => {
    // arrange
    const user = userEvent.setup();
    renderHero({ enabled: true, cap: 10, spotsRemaining: 10 });

    // act
    await user.tab();

    // assert
    expect(screen.getByRole("button", { name: "Pause hero video" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Restart hero video" })).toBeInTheDocument();
  });

  it("pauses the background video when reduced motion is requested", async () => {
    // arrange
    const waitlist = { enabled: true, cap: 10, spotsRemaining: 10 };
    const options = { reducedMotion: "always" } as const;

    // act
    renderHero(waitlist, options);

    // assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play hero video" })).toBeInTheDocument();
    });
  });
});
