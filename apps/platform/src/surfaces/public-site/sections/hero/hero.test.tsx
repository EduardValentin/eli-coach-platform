// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "~/shared/submission-checks/bot-detection-settings";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { BotDetectionConfig } from "~/shared/submission-checks/bot-detection";

import { presentWaitlist } from "~/bounded-contexts/sales/waitlist/ui/shared/waitlist-presentation";

import { PublicHero } from "./hero";

import { BOOK_PATH } from "~/bounded-contexts/scheduling/public/paths";

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
  const waitlistPresentation = presentWaitlist({
    ...waitlist,
    offer: activeOffer,
  });
  const router = createMemoryRouter(
    [
      {
        element: (
          <PublicHero
            botDetection={STATIC_BOT_DETECTION}
            waitlist={waitlistPresentation}
          />
        ),
        path: "/",
      },
      {
        action: () =>
          new Response(null, { status: 404, statusText: "Not Found" }),
        path: "/api/waitlist",
      },
    ],
    { initialEntries: ["/"] },
  );

  const renderTree = (reducedMotion: "always" | "never" | "user") => (
    <MotionConfig reducedMotion={reducedMotion}>
      <RouterProvider router={router} />
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

describe("PublicHero local interactions", () => {
  it("renders an enabled waitlist state when availability is known", () => {
    // arrange
    const waitlist = { availability: "available" as const, enabled: true };

    // act
    renderHero(waitlist);

    // assert
    expect(
      screen.getAllByRole("heading", { level: 1, name: /\S/ }),
    ).toHaveLength(1);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /\S/ })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(getHeroSubmitButton()).toBeDisabled();
  });

  it("keeps the waitlist form available with an error when observation is unavailable", () => {
    // arrange
    const waitlist = { availability: null, enabled: true };

    // act
    renderHero(waitlist);

    // assert
    expect(screen.getByRole("alert")).toBeInTheDocument();
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
    expect(
      screen.getAllByRole("heading", { level: 1, name: /\S/ }),
    ).toHaveLength(1);
    expect(screen.getByRole("link", { name: /\S/ })).toHaveAttribute(
      "href",
      BOOK_PATH,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders exactly one h1", () => {
    // arrange
    const waitlistEnabled = {
      availability: "available" as const,
      enabled: true,
    };
    const waitlistDisabled = {
      availability: "available" as const,
      enabled: false,
    };

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
    expect(video).toHaveAttribute(
      "poster",
      "/media/hero/hero-studio-poster.webp",
    );
    expect(video).toHaveAttribute("preload", "none");
    expect(sourceCountBeforeLoading).toBe(0);
    const mediaSources = Array.from(container.querySelectorAll("[src]")).map(
      (element) => element.getAttribute("src"),
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

  it("offers phones the 720p clip and prefers AV1 over H.264 at each size", async () => {
    // arrange
    vi.useFakeTimers();
    const waitlist = { availability: "available" as const, enabled: false };
    const { container } = renderHero(waitlist);

    // act
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // assert
    expect(
      Array.from(container.querySelectorAll("video source")).map((source) => ({
        media: source.getAttribute("media"),
        src: source.getAttribute("src"),
        type: source.getAttribute("type"),
      })),
    ).toEqual([
      {
        media: "(max-width: 767px)",
        src: "/media/hero/hero-studio-loop-720.av1.mp4",
        type: 'video/mp4; codecs="av01.0.05M.08"',
      },
      {
        media: "(max-width: 767px)",
        src: "/media/hero/hero-studio-loop-720.h264.mp4",
        type: "video/mp4",
      },
      {
        media: null,
        src: "/media/hero/hero-studio-loop-1080.av1.mp4",
        type: 'video/mp4; codecs="av01.0.08M.08"',
      },
      {
        media: null,
        src: "/media/hero/hero-studio-loop-1080.h264.mp4",
        type: "video/mp4",
      },
    ]);
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

  it("offers to play, not pause, the poster it keeps for a visitor saving data", async () => {
    // arrange
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      ...navigator,
      connection: { saveData: true },
    });
    const waitlist = { availability: "available" as const, enabled: false };

    // act
    const { container } = renderHero(waitlist);
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // assert
    expect(container.querySelector("video source")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Play hero video" }),
    ).toBeInTheDocument();
  });

  it("operates video playback from focused keyboard controls", async () => {
    // arrange
    vi.useFakeTimers();
    const { container } = renderHero({
      availability: "available",
      enabled: false,
    });
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
    const bookingLink = screen.getByRole("link", { name: /\S/ });

    // act
    await user.tab();
    const bookingLinkReceivedFocus = bookingLink === document.activeElement;
    await user.tab();
    const playbackControlReceivedFocus =
      playbackControl === document.activeElement;
    await user.keyboard("{Enter}");
    const pausedAfterFirstActivation = video.paused;
    await user.keyboard(" ");
    const playingAfterSecondActivation = !video.paused;
    await user.tab();
    const restartControlReceivedFocus =
      restartControl === document.activeElement;
    await user.keyboard("{Enter}");

    // assert
    expect(videoControls).toHaveLength(2);
    expect(playbackControl).toHaveAccessibleName(/\S/);
    expect(restartControl).toHaveAccessibleName(/\S/);
    expect(bookingLinkReceivedFocus).toBe(true);
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
