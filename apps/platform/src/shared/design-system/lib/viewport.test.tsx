// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useIsDesktopViewport, useIsMobileViewport } from "./viewport";

type ViewportListener = () => void;

const viewport = {
  listeners: new Set<ViewportListener>(),
  width: 0,
};

function matchesWidth(query: string, width: number): boolean {
  const max = /max-width:\s*(\d+)px/.exec(query);
  const min = /min-width:\s*(\d+)px/.exec(query);

  return (
    (max === null || width <= Number(max[1])) &&
    (min === null || width >= Number(min[1]))
  );
}

function viewportIs(width: number) {
  viewport.width = width;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: (_type: string, listener: ViewportListener) =>
        viewport.listeners.add(listener),
      get matches() {
        return matchesWidth(query, viewport.width);
      },
      media: query,
      removeEventListener: (_type: string, listener: ViewportListener) =>
        viewport.listeners.delete(listener),
    }),
  });
}

function resizeViewportTo(width: number) {
  act(() => {
    viewport.width = width;
    viewport.listeners.forEach((listener) => listener());
  });
}

afterEach(() => {
  cleanup();
  viewport.listeners.clear();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("useIsDesktopViewport", () => {
  it.each([
    { width: 390, desktop: false },
    { width: 1023, desktop: false },
    { width: 1024, desktop: true },
    { width: 1440, desktop: true },
  ])("answers $desktop at $width px", ({ width, desktop }) => {
    // arrange
    viewportIs(width);

    // act
    const { result } = renderHook(() => useIsDesktopViewport());

    // assert
    expect(result.current).toBe(desktop);
  });

  it("follows the viewport across the large breakpoint", () => {
    // arrange
    viewportIs(1280);
    const { result } = renderHook(() => useIsDesktopViewport());

    // act
    resizeViewportTo(800);

    // assert
    expect(result.current).toBe(false);
  });
});

describe("useIsMobileViewport", () => {
  it.each([
    { width: 767, mobile: true },
    { width: 768, mobile: false },
  ])("answers $mobile at $width px", ({ width, mobile }) => {
    // arrange
    viewportIs(width);

    // act
    const { result } = renderHook(() => useIsMobileViewport());

    // assert
    expect(result.current).toBe(mobile);
  });
});
