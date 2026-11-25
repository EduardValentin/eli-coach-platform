// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  useIsDesktopViewport,
  useIsMobileViewport,
  useIsWideViewport,
} from "./viewport";

type ViewportListener = () => void;

const DEFAULT_TEXT_SIZE = 16;

const viewport = {
  listeners: new Set<ViewportListener>(),
  textSize: DEFAULT_TEXT_SIZE,
  width: 0,
};

function matchesWidth(query: string, width: number): boolean {
  const below = /width < ([\d.]+)em/.exec(query);
  const min = /min-width: ([\d.]+)em/.exec(query);
  const widthInEm = width / viewport.textSize;

  return (
    (below === null || widthInEm < Number(below[1])) &&
    (min === null || widthInEm >= Number(min[1]))
  );
}

function viewportIs(width: number, textSize = DEFAULT_TEXT_SIZE) {
  viewport.width = width;
  viewport.textSize = textSize;
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

  it("answers false at 1024 px once the browser text is enlarged to 20 px", () => {
    // arrange
    viewportIs(1024, 20);

    // act
    const { result } = renderHook(() => useIsDesktopViewport());

    // assert
    expect(result.current).toBe(false);
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

  it("answers true at 768 px once the browser text is enlarged to 20 px", () => {
    // arrange
    viewportIs(768, 20);

    // act
    const { result } = renderHook(() => useIsMobileViewport());

    // assert
    expect(result.current).toBe(true);
  });
});

describe("useIsWideViewport", () => {
  it.each([
    { width: 1024, wide: false },
    { width: 1279, wide: false },
    { width: 1280, wide: true },
    { width: 1920, wide: true },
  ])("answers $wide at $width px", ({ width, wide }) => {
    // arrange
    viewportIs(width);

    // act
    const { result } = renderHook(() => useIsWideViewport());

    // assert
    expect(result.current).toBe(wide);
  });

  it("follows the viewport across the wide breakpoint", () => {
    // arrange
    viewportIs(1440);
    const { result } = renderHook(() => useIsWideViewport());

    // act
    resizeViewportTo(1100);

    // assert
    expect(result.current).toBe(false);
  });
});
