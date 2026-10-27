// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCloseMobileNavigationOnDesktop } from "./use-close-mobile-navigation-on-desktop";

const nodesAddedOutsideReact: HTMLElement[] = [];

afterEach(() => {
  while (nodesAddedOutsideReact.length > 0) {
    nodesAddedOutsideReact.pop()?.remove();
  }
});

function appendHiddenMobileControl() {
  const hiddenRegion = document.createElement("div");
  const mobileControl = document.createElement("button");
  hiddenRegion.style.display = "none";
  hiddenRegion.append(mobileControl);
  document.body.append(hiddenRegion);
  nodesAddedOutsideReact.push(hiddenRegion);

  return mobileControl;
}

describe("useCloseMobileNavigationOnDesktop", () => {
  it("closes an open menu whose mobile control is hidden by an ancestor", () => {
    // arrange
    const close = vi.fn();
    const mobileControlRef = { current: appendHiddenMobileControl() };

    // act
    renderHook(() =>
      useCloseMobileNavigationOnDesktop({
        close,
        isOpen: true,
        mobileControlRef,
      }),
    );

    // assert
    expect(close).toHaveBeenCalledOnce();
  });
});
