// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaRemoveButton } from "./media-remove-button";

afterEach(() => {
  cleanup();
});

describe("MediaRemoveButton", () => {
  it("is a round outline X resting on the card shadow that fills with the muted surface on hover", () => {
    // arrange
    // act
    render(<MediaRemoveButton aria-label="Remove video" />);

    // assert
    const button = screen.getByRole("button", { name: "Remove video" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass(
      "border",
      "bg-surface-base",
      "size-(--size-control-xs)",
      "rounded-full",
      "shadow-card",
      "not-aria-disabled:hover:bg-surface-muted",
    );
    expect(button).not.toHaveClass("not-aria-disabled:hover:bg-surface-quiet");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("removes the media when pressed and takes its place from the caller", async () => {
    // arrange
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MediaRemoveButton
        aria-label="Remove front photo"
        className="absolute top-1 right-1"
        onClick={onClick}
      />,
    );
    const button = screen.getByRole("button", { name: "Remove front photo" });

    // act
    await user.click(button);

    // assert
    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toHaveClass("absolute", "top-1", "right-1");
  });

  it("stays put while it is disabled", () => {
    // arrange
    // act
    render(<MediaRemoveButton aria-label="Remove video" disabled />);

    // assert
    expect(screen.getByRole("button", { name: "Remove video" })).toBeDisabled();
  });
});
