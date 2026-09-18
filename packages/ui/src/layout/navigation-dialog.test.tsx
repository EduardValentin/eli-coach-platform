// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it } from "vitest";

import { NavigationDialog } from "./navigation-dialog";

afterEach(() => {
  cleanup();
});

function renderNavigationDialog(reducedMotion: "always" | "never") {
  return render(
    <MotionConfig reducedMotion={reducedMotion}>
      <NavigationDialog
        closeMenuIcon={<span aria-hidden="true" />}
        contentClassName="fixed inset-0"
        menuButtonClassName="menu-button"
        openMenuIcon={<span aria-hidden="true" />}
        renderTopBar={(topBar) => (
          <header>
            {topBar.actions}
            {topBar.menuButton}
          </header>
        )}
        title="Test navigation"
        topBarActions={<button type="button">Cart</button>}
      >
        {(menu) => (
          <nav aria-label="Test links">
            <a href="/first" onClick={menu.close} ref={menu.firstLinkRef}>
              First
            </a>
            <button onClick={menu.closeForAction} type="button">
              Open cart drawer
            </button>
            <button onClick={menu.completeClose} type="button">
              Finish closing animation
            </button>
          </nav>
        )}
      </NavigationDialog>
    </MotionConfig>,
  );
}

function queryDialog() {
  return screen.queryByRole("dialog", { name: "Test navigation" });
}

describe("NavigationDialog", () => {
  it("moves initial focus to the first link", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");

    // act
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // assert
    expect(screen.getByRole("link", { name: "First" })).toHaveFocus();
  });

  it("keeps the dialog mounted while it animates closed", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(queryDialog()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("unmounts once the closing animation completes and returns focus to the trigger", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");
    const menuTrigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(menuTrigger);
    await user.keyboard("{Escape}");

    // act
    await user.click(
      screen.getByRole("button", { name: "Finish closing animation" }),
    );

    // assert
    expect(queryDialog()).not.toBeInTheDocument();
    await waitFor(() => {
      expect(menuTrigger).toHaveFocus();
    });
  });

  it("reopens from the dialog top bar while animating closed", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.keyboard("{Escape}");

    // act
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // assert
    expect(queryDialog()).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes without animating when the visitor prefers reduced motion", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("always");
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(queryDialog()).not.toBeInTheDocument();
  });

  it("closes immediately and leaves focus with the action that closed it", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");
    const menuTrigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(menuTrigger);

    // act
    await user.click(screen.getByRole("button", { name: "Open cart drawer" }));

    // assert
    expect(queryDialog()).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(menuTrigger).not.toHaveFocus();
  });

  it("shows the top-bar actions only in the visible top bar", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");

    // act
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // assert
    expect(screen.getAllByRole("button", { name: "Cart" })).toHaveLength(1);
  });
});
