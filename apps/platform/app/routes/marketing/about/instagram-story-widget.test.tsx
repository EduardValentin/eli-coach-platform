// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InstagramStoryWidget } from "./instagram-story-widget";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderStoryWidget(options: {
  reducedMotion?: "always" | "never" | "user";
} = {}) {
  render(
    <MotionConfig reducedMotion={options.reducedMotion ?? "never"}>
      <InstagramStoryWidget />
    </MotionConfig>,
  );
}

describe("InstagramStoryWidget", () => {
  it("renders the story chrome and hardened Instagram handle link", () => {
    renderStoryWidget();

    const instagramLink = screen.getByRole("link", { name: "eli.fitness" });

    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
    expect(instagramLink).toHaveAttribute(
      "href",
      "https://www.instagram.com/elilungu_",
    );
    expect(instagramLink).toHaveAttribute("target", "_blank");
    expect(instagramLink).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share story" })).toBeInTheDocument();
  });

  it("advances and rewinds from the left and right halves", () => {
    renderStoryWidget();

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
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();

    fireEvent.click(surface, { clientX: 25 });
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
  });

  it("loops from the last story back to the first", () => {
    renderStoryWidget();

    const surface = screen.getByLabelText("Instagram stories — tap left or right to navigate");

    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();

    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(screen.getByLabelText("Story 3 of 3")).toBeInTheDocument();

    fireEvent.keyDown(surface, { key: "ArrowRight" });
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
  });

  it("activates the story navigation button with Space", () => {
    renderStoryWidget();

    fireEvent.keyDown(screen.getByLabelText("Instagram stories — tap left or right to navigate"), {
      key: " ",
    });

    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();
  });

  it("toggles like state for the current story", async () => {
    const user = userEvent.setup();
    renderStoryWidget();

    await user.click(screen.getByRole("button", { name: "Like story" }));
    expect(screen.getByRole("button", { name: "Unlike story" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unlike story" }));
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();
  });

  it("keeps liked state independent for each story", async () => {
    const user = userEvent.setup();
    renderStoryWidget();

    await user.click(screen.getByRole("button", { name: "Like story" }));

    fireEvent.keyDown(screen.getByLabelText("Instagram stories — tap left or right to navigate"), {
      key: "ArrowRight",
    });

    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText("Instagram stories — tap left or right to navigate"), {
      key: "ArrowLeft",
    });

    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlike story" })).toBeInTheDocument();
  });

  it("auto-advances after the story duration", async () => {
    vi.useFakeTimers();
    renderStoryWidget();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();
  });

  it("disables auto-advance when reduced motion is requested", async () => {
    vi.useFakeTimers();
    renderStoryWidget({ reducedMotion: "always" });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
  });
});
