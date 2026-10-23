// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaOverlayActions } from "./media-overlay-actions";

afterEach(() => {
  cleanup();
});

function renderOverlay(
  props: Partial<Parameters<typeof MediaOverlayActions>[0]> = {},
) {
  return render(
    <MediaOverlayActions
      onRemove={vi.fn()}
      onReplace={vi.fn()}
      subject="recipe photo"
      {...props}
    />,
  );
}

describe("MediaOverlayActions", () => {
  it("names Replace and Remove for the media they act on and labels each with its verb", () => {
    // arrange
    // act
    renderOverlay();

    // assert
    const replace = screen.getByRole("button", {
      name: "Replace recipe photo",
    });
    const remove = screen.getByRole("button", { name: "Remove recipe photo" });
    expect(replace).toHaveTextContent("Replace");
    expect(remove).toHaveTextContent("Remove");
    expect(replace.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(remove.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("sets both actions as extra-small glass buttons in a bar fading in from the top edge of the inverted media", () => {
    // arrange
    // act
    renderOverlay();

    // assert
    const replace = screen.getByRole("button", {
      name: "Replace recipe photo",
    });
    const remove = screen.getByRole("button", { name: "Remove recipe photo" });
    const bar = replace.parentElement as HTMLElement;
    expect(bar).toContainElement(remove);
    expect(bar).toHaveAttribute("data-surface", "inverted");
    expect(bar).toHaveClass(
      "absolute",
      "inset-x-0",
      "top-0",
      "flex",
      "justify-end",
      "gap-2",
      "bg-gradient-to-b",
      "from-surface-inverted/80",
      "via-surface-inverted/40",
      "to-transparent",
      "px-2",
      "pt-2",
      "pb-12",
    );
    for (const button of [replace, remove]) {
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveClass(
        "bg-text-inverted/15",
        "backdrop-blur-sm",
        "h-(--size-control-xs)",
      );
    }
  });

  it("replaces or removes the media when the matching action is pressed", async () => {
    // arrange
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const onRemove = vi.fn();
    renderOverlay({ onRemove, onReplace });

    // act
    await user.click(
      screen.getByRole("button", { name: "Replace recipe photo" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Remove recipe photo" }),
    );

    // assert
    expect(onReplace).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("locks both actions while it is disabled", () => {
    // arrange
    // act
    renderOverlay({ disabled: true });

    // assert
    expect(
      screen.getByRole("button", { name: "Replace recipe photo" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remove recipe photo" }),
    ).toBeDisabled();
  });

  it("marks Replace as the control in error and points it at the problem it is given", () => {
    // arrange
    // act
    render(
      <>
        <MediaOverlayActions
          onRemove={vi.fn()}
          onReplace={vi.fn()}
          replaceProps={{
            "aria-describedby": "photo-problem",
            "aria-invalid": true,
          }}
          subject="recipe photo"
        />
        <p id="photo-problem">dinner.gif is not a .jpg, .png or .webp</p>
      </>,
    );

    // assert
    const replace = screen.getByRole("button", {
      name: "Replace recipe photo",
    });
    expect(replace).toHaveAttribute("aria-invalid", "true");
    expect(replace).toHaveAccessibleDescription(
      "dinner.gif is not a .jpg, .png or .webp",
    );
    expect(
      screen.getByRole("button", { name: "Remove recipe photo" }),
    ).not.toHaveAttribute("aria-invalid");
  });

  it("hands its caller the Replace button so focus can move to it", () => {
    // arrange
    const replaceRef = createRef<HTMLButtonElement>();

    // act
    renderOverlay({ replaceRef });

    // assert
    expect(replaceRef.current).toBe(
      screen.getByRole("button", { name: "Replace recipe photo" }),
    );
  });

  it("passes data attributes to its bar", () => {
    // arrange
    // act
    renderOverlay({ "data-parity": "recipe-photo-actions" });

    // assert
    expect(
      screen.getByRole("button", { name: "Replace recipe photo" })
        .parentElement,
    ).toHaveAttribute("data-parity", "recipe-photo-actions");
  });
});
