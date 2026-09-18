// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { NavigationDialog } from "./navigation-dialog";

afterEach(() => {
  cleanup();
});

const PANEL_VARIANTS = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

function CartPanel() {
  const closeCartRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeCartRef.current?.focus();
  }, []);

  return (
    <button ref={closeCartRef} type="button">
      Close cart
    </button>
  );
}

function NavigationDialogWithCart() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
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
        topBarActions={
          <button onClick={() => setIsCartOpen(true)} type="button">
            Cart
          </button>
        }
      >
        {(menu) => (
          <motion.div transition={{ duration: 0.3 }} variants={PANEL_VARIANTS}>
            <nav aria-label="Test links">
              <a href="/first" onClick={menu.close} ref={menu.firstLinkRef}>
                First
              </a>
            </nav>
          </motion.div>
        )}
      </NavigationDialog>
      {isCartOpen ? <CartPanel /> : null}
    </>
  );
}

function renderNavigationDialog(reducedMotion: "always" | "never") {
  return render(
    <MotionConfig reducedMotion={reducedMotion}>
      <NavigationDialogWithCart />
    </MotionConfig>,
  );
}

function queryDialog() {
  return screen.queryByRole("dialog", { name: "Test navigation" });
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open menu" }));
  await waitFor(() => {
    expect(
      screen.getByRole("navigation", { name: "Test links" }).parentElement,
    ).toHaveStyle({ opacity: "1" });
  });
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

  it("keeps the dialog mounted and focus on the menu button while it animates closed", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");
    await openMenu(user);

    // act
    await user.click(screen.getByRole("button", { name: "Close menu" }));

    // assert
    expect(queryDialog()).toBeInTheDocument();
    const menuButton = screen.getByRole("button", { name: "Open menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveFocus();
  });

  it("unmounts once the closing animation completes and returns focus to the trigger", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");
    await openMenu(user);

    // act
    await user.click(screen.getByRole("button", { name: "Close menu" }));

    // assert
    await waitFor(() => {
      expect(queryDialog()).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("reopens from the dialog top bar while animating closed and keeps focus on the menu button", async () => {
    // arrange
    const user = userEvent.setup();
    renderNavigationDialog("never");
    await openMenu(user);
    await user.keyboard("{Escape}");

    // act
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // assert
    expect(queryDialog()).toHaveAttribute("data-state", "open");
    const menuButton = screen.getByRole("button", { name: "Close menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(menuButton).toHaveFocus();
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
    await openMenu(user);

    // act
    await user.click(screen.getByRole("button", { name: "Cart" }));

    // assert
    expect(queryDialog()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close cart" })).toHaveFocus();
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
