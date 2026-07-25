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
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderHero(
  waitlist: {
    availability: "available" | "limited" | "closed" | null;
    enabled: boolean;
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
  it.each([
    ["available", "Reduced-price spots available"],
    ["limited", "Limited spots"],
    ["closed", "Reduced-price spots closed"],
  ] as const)(
    "renders only the %s qualitative availability claim",
    (availability, expectedClaim) => {
      // arrange
      const waitlist = { availability, enabled: true };

      // act
      renderHero(waitlist);

      // assert
      expect(
        screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(expectedClaim);
      for (const claim of [
        "Reduced-price spots available",
        "Limited spots",
        "Reduced-price spots closed",
      ]) {
        expect(screen.queryAllByText(claim)).toHaveLength(claim === expectedClaim ? 1 : 0);
      }
      expect(screen.getByLabelText("Email address")).toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.queryByText(/of \d+ spots remaining/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: availability === "closed" ? "Notify me" : "Join the list",
        }),
      ).toBeDisabled();
    },
  );

  it("renders neutral waitlist copy without an availability claim when observation is unavailable", () => {
    // arrange
    const waitlist = { availability: null, enabled: true };

    // act
    renderHero(waitlist);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Coaching built around your body." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Join the waitlist to hear when coaching opens."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Limited spots")).not.toBeInTheDocument();
    expect(screen.queryByText(/reduced pricing/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join the list" })).toBeDisabled();
  });

  it("renders the normal CTA as a booking link when waitlist mode is disabled", () => {
    // arrange
    const waitlist = { availability: "available" as const, enabled: false };

    // act
    renderHero(waitlist);

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Coaching with Eli — strength, nutrition, and a plan that takes your cycle into account.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Online or in-person/i)).not.toBeInTheDocument();
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
    const waitlistEnabled = { availability: "available" as const, enabled: true };
    const waitlistDisabled = { availability: "available" as const, enabled: false };

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
    const waitlist = { availability: "available" as const, enabled: false };

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
    const waitlist = { availability: "available" as const, enabled: false };
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
    renderHero({ availability: "available", enabled: true });

    // act
    await user.tab();

    // assert
    expect(screen.getByRole("button", { name: "Pause hero video" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Restart hero video" })).toBeInTheDocument();
  });

  it("pauses the background video when reduced motion is requested", async () => {
    // arrange
    const waitlist = { availability: "available" as const, enabled: true };
    const options = { reducedMotion: "always" } as const;

    // act
    renderHero(waitlist, options);

    // assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Play hero video" })).toBeInTheDocument();
    });
  });
});
