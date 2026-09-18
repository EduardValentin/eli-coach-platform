// @vitest-environment happy-dom

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCloseMobileNavigationOnDesktop } from "./use-close-mobile-navigation-on-desktop";

describe("useCloseMobileNavigationOnDesktop", () => {
  it("closes an open menu whose mobile control is hidden by an ancestor", async () => {
    // arrange
    const close = vi.fn();
    const hiddenRegion = document.createElement("div");
    const mobileControl = document.createElement("button");
    hiddenRegion.style.display = "none";
    hiddenRegion.append(mobileControl);
    document.body.append(hiddenRegion);
    const mainContent = document.createElement("main");
    const focusMainContent = vi.spyOn(mainContent, "focus");
    document.body.append(mainContent);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const mobileControlRef = { current: mobileControl };

    // act
    renderHook(() =>
      useCloseMobileNavigationOnDesktop({
        close,
        isOpen: true,
        mobileControlRef,
      }),
    );

    // assert
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(focusMainContent).toHaveBeenCalledOnce();
    expect(mainContent.getAttribute("tabindex")).toBe("-1");
    hiddenRegion.remove();
    mainContent.remove();
  });
});
