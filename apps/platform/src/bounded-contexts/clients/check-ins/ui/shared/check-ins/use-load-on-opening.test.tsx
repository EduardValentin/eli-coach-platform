// @vitest-environment happy-dom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLoadOnOpening } from "./use-load-on-opening";

afterEach(() => {
  cleanup();
});

function renderOpening(initialProps: { open: boolean }) {
  const load = vi.fn();
  const rendered = renderHook(({ open }) => useLoadOnOpening({ load, open }), {
    initialProps,
    reactStrictMode: true,
  });

  return { load, rerender: rendered.rerender };
}

describe("useLoadOnOpening", () => {
  it("loads once when it mounts open, even as strict mode replays its effects", () => {
    // arrange, act
    const { load } = renderOpening({ open: true });

    // assert
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("loads nothing while closed", () => {
    // arrange, act
    const { load } = renderOpening({ open: false });

    // assert
    expect(load).not.toHaveBeenCalled();
  });

  it("loads once more on every new opening and not while it stays open", () => {
    // arrange
    const { load, rerender } = renderOpening({ open: true });

    // act
    rerender({ open: true });
    rerender({ open: false });
    rerender({ open: true });

    // assert
    expect(load).toHaveBeenCalledTimes(2);
  });
});
