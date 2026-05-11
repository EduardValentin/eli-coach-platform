// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ABOUT_STORY_DURATION_MS } from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

describe("InstagramStoryWidget", () => {
  it("advances and rewinds stories with pointer controls", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous story" }));
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("loops after the last story", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    await user.click(screen.getByRole("button", { name: "Next story" }));
    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByText("Story 3 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("wraps to the last story when rewinding from the first story", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    await user.click(screen.getByRole("button", { name: "Previous story" }));

    expect(screen.getByText("Story 3 of 3")).toBeInTheDocument();
  });

  it("supports arrow-key navigation when the widget has focus", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    const widget = screen.getByRole("region", { name: "Instagram stories from Eli" });
    widget.focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("scrolls the story panel into view when keyboard focus lands on it", () => {
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(<InstagramStoryWidget />);

      screen.getByRole("region", { name: "Instagram stories from Eli" }).focus();

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "center",
        inline: "nearest",
      });
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollIntoView",
          originalScrollIntoView,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });

  it("keeps liked state per story", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    await user.click(screen.getByRole("button", { name: "Like story 1" }));
    expect(screen.getByRole("button", { name: "Unlike story 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByRole("button", { name: "Like story 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous story" }));
    expect(screen.getByRole("button", { name: "Unlike story 1" })).toBeInTheDocument();
  });

  it("auto-advances on the story timer and loops to the first story", async () => {
    vi.useFakeTimers();
    render(<InstagramStoryWidget />);

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });
    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });
    expect(screen.getByText("Story 3 of 3")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("pauses and resumes automatic story advancement", async () => {
    vi.useFakeTimers();
    render(<InstagramStoryWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Pause story auto-advance" }));
    expect(
      screen.getByRole("button", { name: "Resume story auto-advance" }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS * 2);
    });
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume story auto-advance" }));

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });
    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();
  });

  it("keeps timer navigation in reduced motion without animated progress fill", async () => {
    vi.useFakeTimers();
    stubReducedMotion(true);
    const { container } = render(<InstagramStoryWidget />);

    await act(async () => {
      await Promise.resolve();
    });

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("loop");
    expect(video?.querySelectorAll("source")).toHaveLength(0);
    expect(screen.getByTestId("story-progress-active")).toHaveStyle({ width: "100%" });

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });

    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("story-progress-active")).toHaveStyle({ width: "100%" });
  });

  it("lets reduced-motion users pause automatic story advancement", async () => {
    vi.useFakeTimers();
    stubReducedMotion(true);
    render(<InstagramStoryWidget />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pause story auto-advance" }));

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });

    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("story-progress-active")).toHaveStyle({ width: "100%" });
  });

  it("uses poster-only media until motion preference can be checked", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { container } = render(<InstagramStoryWidget />);

    const video = container.querySelector("video");

    expect(video).toBeInTheDocument();
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("loop");
    expect(video?.querySelectorAll("source")).toHaveLength(0);
  });

  it("shows a fallback when the active story media fails", () => {
    const { container } = render(<InstagramStoryWidget />);
    const video = container.querySelector("video");

    expect(video).toBeInTheDocument();
    fireEvent.error(video as HTMLVideoElement);

    expect(screen.getByRole("status")).toHaveTextContent("Story media unavailable");
    expect(screen.getByRole("button", { name: "Next story" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous story" })).toBeInTheDocument();
  });

  describe("under StrictMode", () => {
    it("advances one story with the next control", async () => {
      const user = userEvent.setup();
      render(
        <StrictMode>
          <InstagramStoryWidget />
        </StrictMode>,
      );

      await user.click(screen.getByRole("button", { name: "Next story" }));

      expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();
    });

    it("likes the active story once", async () => {
      const user = userEvent.setup();
      render(
        <StrictMode>
          <InstagramStoryWidget />
        </StrictMode>,
      );

      await user.click(screen.getByRole("button", { name: "Like story 1" }));

      expect(screen.getByRole("button", { name: "Unlike story 1" })).toBeInTheDocument();
    });

    it("advances one story on the timer", async () => {
      vi.useFakeTimers();
      render(
        <StrictMode>
          <InstagramStoryWidget />
        </StrictMode>,
      );

      await act(async () => {
        vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
      });

      expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();
    });
  });
});
