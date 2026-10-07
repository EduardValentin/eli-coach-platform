// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ZoomableImage } from "./zoomable-image";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const PARITY = { stage: "viewer-page-stage", image: "viewer-page" };

function renderImage() {
  const onSwipeLeft = vi.fn();
  const onSwipeRight = vi.fn();
  render(
    <ZoomableImage
      alt="Meal plan, page 2"
      className="flex-1 p-4"
      imageClassName="rounded-tile border"
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      parity={PARITY}
      src="/pages/2.webp"
    />,
  );
  const image = screen.getByRole("img", { name: "Meal plan, page 2" });

  return { image, onSwipeLeft, onSwipeRight, user: userEvent.setup() };
}

function frameImageAt(image: HTMLElement, frame: DOMRect) {
  vi.spyOn(image, "getBoundingClientRect").mockReturnValue(frame);
}

async function swipe(
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
  { fromX, toX }: { fromX: number; toX: number },
) {
  await user.pointer([
    { keys: "[TouchA>]", target, coords: { clientX: fromX, clientY: 300 } },
    { pointerName: "TouchA", target, coords: { clientX: toX, clientY: 305 } },
    { keys: "[/TouchA]", target },
  ]);
}

describe("ZoomableImage", () => {
  it("fits the image inside its stage and carries the caller's classes and parity hooks", () => {
    // arrange
    // act
    const { image } = renderImage();

    // assert
    const stage = image.parentElement;
    expect(stage).toHaveClass(
      "flex",
      "min-w-0",
      "touch-pinch-zoom",
      "items-center",
      "justify-center",
      "overflow-hidden",
      "select-none",
      "flex-1",
      "p-4",
    );
    expect(stage).toHaveAttribute("data-parity", "viewer-page-stage");
    expect(image).toHaveClass(
      "max-h-full",
      "max-w-full",
      "object-contain",
      "transition-transform",
      "duration-200",
      "motion-reduce:transition-none",
      "cursor-zoom-in",
      "rounded-tile",
      "border",
    );
    expect(image).toHaveAttribute("data-parity", "viewer-page");
    expect(image).toHaveAttribute("draggable", "false");
    expect(image.style.transform).toBe("scale(1)");
    expect(image.style.transformOrigin).toBe("center");
  });

  it("doubles the image around the point under the pointer on a double click and fits it again on the next", async () => {
    // arrange
    const { image, user } = renderImage();
    frameImageAt(image, new DOMRect(100, 50, 400, 200));

    // act
    await user.pointer([
      {
        keys: "[MouseLeft]",
        target: image,
        coords: { clientX: 200, clientY: 100 },
      },
      {
        keys: "[MouseLeft]",
        target: image,
        coords: { clientX: 200, clientY: 100 },
      },
    ]);
    const zoomed = {
      transform: image.style.transform,
      origin: image.style.transformOrigin,
      zoomOut: image.classList.contains("cursor-zoom-out"),
    };
    await user.dblClick(image);

    // assert
    expect(zoomed).toEqual({
      transform: "scale(2)",
      origin: "25% 25%",
      zoomOut: true,
    });
    expect(image.style.transform).toBe("scale(1)");
    expect(image).toHaveClass("cursor-zoom-in");
  });

  it("zooms around the centre when the image has no size yet", async () => {
    // arrange
    const { image, user } = renderImage();
    frameImageAt(image, new DOMRect(0, 0, 0, 0));

    // act
    await user.dblClick(image);

    // assert
    expect(image.style.transform).toBe("scale(2)");
    expect(image.style.transformOrigin).toBe("center");
  });

  it("reports a swipe left and a swipe right", async () => {
    // arrange
    const { image, onSwipeLeft, onSwipeRight, user } = renderImage();

    // act
    await swipe(user, image, { fromX: 240, toX: 150 });
    await swipe(user, image, { fromX: 100, toX: 200 });

    // assert
    expect(onSwipeLeft).toHaveBeenCalledOnce();
    expect(onSwipeRight).toHaveBeenCalledOnce();
  });

  it("reports nothing when the finger moves less than a swipe", async () => {
    // arrange
    const { image, onSwipeLeft, onSwipeRight, user } = renderImage();

    // act
    await swipe(user, image, { fromX: 240, toX: 215 });

    // assert
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
