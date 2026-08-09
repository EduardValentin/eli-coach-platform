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
    // arrange
    // act
    renderStoryWidget();

    // assert
    const instagramLink = screen.getByRole("link", { name: "eli.fitness" });

    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Send message…")).toBeInTheDocument();
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
    // arrange
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

    // act
    fireEvent.click(surface, { clientX: 250 });

    // assert
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();

    // act
    fireEvent.click(surface, { clientX: 25 });

    // assert
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
  });

  it("loops from the last story back to the first", () => {
    // arrange
    renderStoryWidget();

    const surface = screen.getByLabelText("Instagram stories — tap left or right to navigate");

    // act
    fireEvent.keyDown(surface, { key: "ArrowRight" });

    // assert
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();

    // act
    fireEvent.keyDown(surface, { key: "ArrowRight" });

    // assert
    expect(screen.getByLabelText("Story 3 of 3")).toBeInTheDocument();

    // act
    fireEvent.keyDown(surface, { key: "ArrowRight" });

    // assert
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
  });

  it("activates the story navigation button with Space", () => {
    // arrange
    renderStoryWidget();

    // act
    fireEvent.keyDown(screen.getByLabelText("Instagram stories — tap left or right to navigate"), {
      key: " ",
    });

    // assert
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();
  });

  it("toggles like state for the current story", async () => {
    // arrange
    const user = userEvent.setup();
    renderStoryWidget();

    // act
    await user.click(screen.getByRole("button", { name: "Like story" }));

    // assert
    expect(screen.getByRole("button", { name: "Unlike story" })).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Unlike story" }));

    // assert
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();
  });

  it("keeps liked state independent for each story", async () => {
    // arrange
    const user = userEvent.setup();
    renderStoryWidget();

    // act
    await user.click(screen.getByRole("button", { name: "Like story" }));

    fireEvent.keyDown(screen.getByLabelText("Instagram stories — tap left or right to navigate"), {
      key: "ArrowRight",
    });

    // assert
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();

    // act
    fireEvent.keyDown(screen.getByLabelText("Instagram stories — tap left or right to navigate"), {
      key: "ArrowLeft",
    });

    // assert
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlike story" })).toBeInTheDocument();
  });

  it("auto-advances after the story duration", async () => {
    // arrange
    vi.useFakeTimers();
    renderStoryWidget();

    // act
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // assert
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();
  });

  it("disables auto-advance when reduced motion is requested", async () => {
    // arrange
    vi.useFakeTimers();
    renderStoryWidget({ reducedMotion: "always" });

    // act
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // assert
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
  });
});
