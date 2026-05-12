// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InstagramStoryWidget } from "./instagram-story-widget";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubReducedMotionPreference() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    }),
  );
}

function stubNoReducedMotionPreference() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    }),
  );
}

describe("InstagramStoryWidget", () => {
  it("renders the story chrome and hardened Instagram handle link", () => {
    render(<InstagramStoryWidget />);

    expect(screen.getByAltText("Story 1 of 3")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-poster.jpg",
    );
    expect(screen.getByRole("link", { name: "eli.fitness" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/elilungu_",
    );
    expect(screen.getByRole("link", { name: "eli.fitness" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "eli.fitness" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share story" })).toBeInTheDocument();
  });

  it("advances and rewinds from the left and right halves", () => {
    render(<InstagramStoryWidget />);

    const surface = screen.getByLabelText("Instagram stories — tap left or right to navigate");
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 600,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(surface, { clientX: 250 });
    expect(screen.getByAltText("Story 2 of 3")).toBeInTheDocument();

    fireEvent.click(surface, { clientX: 25 });
    expect(screen.getByAltText("Story 1 of 3")).toBeInTheDocument();
  });

  it("loops from the last story back to the first", () => {
    render(<InstagramStoryWidget />);

    const surface = screen.getByLabelText("Instagram stories — tap left or right to navigate");

    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(screen.getByAltText("Story 2 of 3")).toBeInTheDocument();

    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(screen.getByAltText("Story 3 of 3")).toBeInTheDocument();

    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(screen.getByAltText("Story 1 of 3")).toBeInTheDocument();
  });

  it("activates the story navigation button with Space", () => {
    render(<InstagramStoryWidget />);

    fireEvent.keyDown(screen.getByLabelText("Instagram stories — tap left or right to navigate"), {
      key: " ",
    });

    expect(screen.getByAltText("Story 2 of 3")).toBeInTheDocument();
  });

  it("toggles like state for the current story", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    await user.click(screen.getByRole("button", { name: "Like story" }));
    expect(screen.getByRole("button", { name: "Unlike story" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unlike story" }));
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();
  });

  it("auto-advances after the story duration", async () => {
    vi.useFakeTimers();
    stubNoReducedMotionPreference();
    render(<InstagramStoryWidget />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByAltText("Story 2 of 3")).toBeInTheDocument();
  });

  it("disables auto-advance when reduced motion is requested", async () => {
    vi.useFakeTimers();
    stubReducedMotionPreference();
    render(<InstagramStoryWidget />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByAltText("Story 1 of 3")).toBeInTheDocument();
  });
});
