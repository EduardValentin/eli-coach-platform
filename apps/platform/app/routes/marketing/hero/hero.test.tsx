// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

  const renderTree = (reducedMotion: "always" | "never" | "user") => (
    <MotionConfig reducedMotion={reducedMotion}>
      <PlatformQueryProvider>
        <RouterProvider router={router} />
      </PlatformQueryProvider>
    </MotionConfig>
  );
  const renderedHero = render(renderTree(options.reducedMotion ?? "never"));

  return {
    ...renderedHero,
    setReducedMotion(reducedMotion: "always" | "never" | "user") {
      renderedHero.rerender(renderTree(reducedMotion));
    },
  };
}

function getHeroSubmitButton() {
  const emailInput = screen.getByRole("textbox", { name: /\S/ });
  const form = emailInput.closest("form");

  if (!form) {
    throw new Error("Expected the hero email input to belong to a form.");
  }

  return within(form).getByRole("button", { name: /\S/ });
}

describe("MarketingHero local interactions", () => {
  it("renders an enabled waitlist state when availability is known", () => {
    // arrange
    const waitlist = { availability: "available" as const, enabled: true };

    // act
    renderHero(waitlist);

    // assert
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /\S/ })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(getHeroSubmitButton()).toBeDisabled();
  });

  it("keeps the waitlist form available without a status when observation is unavailable", () => {
    // arrange
    const waitlist = { availability: null, enabled: true };

    // act
    renderHero(waitlist);

    // assert
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /\S/ })).toBeInTheDocument();
    expect(getHeroSubmitButton()).toBeDisabled();
  });

  it("renders the normal CTA as a booking link when waitlist mode is disabled", () => {
    // arrange
    const waitlist = { availability: "available" as const, enabled: false };

    // act
    renderHero(waitlist);

    // assert
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /\S/ })).toHaveAttribute("href", "/book");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders exactly one h1", () => {
    // arrange
    const waitlistEnabled = { availability: "available" as const, enabled: true };
    const waitlistDisabled = { availability: "available" as const, enabled: false };

    // act
    const { unmount } = renderHero(waitlistEnabled);
    const waitlistHeadingCount = screen.getAllByRole("heading", {
      level: 1,
      name: /\S/,
    }).length;
    unmount();
    renderHero(waitlistDisabled);
    const normalHeadingCount = screen.getAllByRole("heading", {
      level: 1,
      name: /\S/,
    }).length;

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
    const mediaSources = Array.from(container.querySelectorAll("[src]")).map((element) =>
      element.getAttribute("src"),
    );

    expect(
      mediaSources.every(
        (source) =>
          source !== null &&
          !source.includes("pexels.com") &&
          !source.includes("images.unsplash.com"),
      ),
    ).toBe(true);
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

  it("operates video playback from focused keyboard controls", async () => {
    // arrange
    vi.useFakeTimers();
    const { container } = renderHero({ availability: "available", enabled: false });
    const video = container.querySelector("video");

    if (!video) {
      throw new Error("Expected the hero to render a background video.");
    }

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    vi.useRealTimers();

    const user = userEvent.setup();
    const videoControls = screen.getAllByRole("button", { name: /\S/ });
    const [playbackControl, restartControl] = videoControls;
    video.currentTime = 18;

    // act
    await user.tab();
    const playbackControlReceivedFocus = playbackControl === document.activeElement;
    await user.keyboard("{Enter}");
    const pausedAfterFirstActivation = video.paused;
    await user.keyboard(" ");
    const playingAfterSecondActivation = !video.paused;
    await user.tab();
    const restartControlReceivedFocus = restartControl === document.activeElement;
    await user.keyboard("{Enter}");

    // assert
    expect(videoControls).toHaveLength(2);
    expect(playbackControl).toHaveAccessibleName(/\S/);
    expect(restartControl).toHaveAccessibleName(/\S/);
    expect(playbackControlReceivedFocus).toBe(true);
    expect(restartControlReceivedFocus).toBe(true);
    expect(pausedAfterFirstActivation).toBe(true);
    expect(playingAfterSecondActivation).toBe(true);
    expect(video.currentTime).toBe(0);
    expect(video.paused).toBe(false);
  });

  it("pauses active playback when reduced motion is requested", async () => {
    // arrange
    vi.useFakeTimers();
    const waitlist = { availability: "available" as const, enabled: true };
    const options = { reducedMotion: "never" } as const;

    // act
    const { container, setReducedMotion } = renderHero(waitlist, options);
    const video = container.querySelector("video");

    if (!video) {
      throw new Error("Expected the hero to render a background video.");
    }

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    vi.useRealTimers();
    const playingBeforePreferenceChange = !video.paused;
    setReducedMotion("always");

    // assert
    await waitFor(() => {
      expect(video.paused).toBe(true);
    });
    expect(playingBeforePreferenceChange).toBe(true);
  });
});
