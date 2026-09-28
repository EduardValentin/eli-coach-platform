// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { BottomSheet } from "./bottom-sheet";

afterEach(() => {
  cleanup();
});

type SheetOptions = {
  reducedMotion?: "always" | "never";
};

function SheetOpener() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open sheet
      </button>
      <BottomSheet
        description="The rest of your portal"
        id="portal-more-sheet"
        onOpenChange={setOpen}
        open={open}
        title="More"
      >
        <a href="/client/cycle">Cycle</a>
      </BottomSheet>
    </>
  );
}

function renderSheet(options: SheetOptions = {}) {
  const { reducedMotion = "always" } = options;

  return render(
    <MotionConfig reducedMotion={reducedMotion}>
      <SheetOpener />
    </MotionConfig>,
  );
}

async function openSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open sheet" }));

  return screen.findByRole("dialog", { name: "More" });
}

describe("BottomSheet", () => {
  it("opens as a dialog named by its visually hidden title and described by its description", async () => {
    // arrange
    const user = userEvent.setup();
    renderSheet();

    // act
    const sheet = await openSheet(user);

    // assert
    expect(sheet).toHaveAccessibleDescription("The rest of your portal");
    expect(screen.getByText("More")).toHaveClass("sr-only");
    expect(screen.getByText("The rest of your portal")).toHaveClass("sr-only");
  });

  it("carries the id its opener controls", async () => {
    // arrange
    const user = userEvent.setup();
    renderSheet();

    // act
    const sheet = await openSheet(user);

    // assert
    expect(sheet).toHaveAttribute("id", "portal-more-sheet");
  });

  it("draws the grab handle", async () => {
    // arrange
    const user = userEvent.setup();
    renderSheet();

    // act
    const sheet = await openSheet(user);

    // assert
    expect(sheet.querySelector('[data-parity="sheet-handle"]')).not.toBeNull();
  });

  it("closes on Escape and returns focus to the control that opened it", async () => {
    // arrange
    const user = userEvent.setup();
    renderSheet({ reducedMotion: "never" });
    await openSheet(user);

    // act
    await user.keyboard("{Escape}");

    // assert
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByRole("button", { name: "Open sheet" })).toHaveFocus();
  });

  it("slides and drags when motion is allowed", async () => {
    // arrange
    const user = userEvent.setup();
    renderSheet({ reducedMotion: "never" });

    // act
    const sheet = await openSheet(user);

    // assert
    expect(sheet.style.transform).not.toBe("");
    expect(sheet.style.touchAction).not.toBe("");
  });

  it("renders in place without the slide or the drag under reduced motion", async () => {
    // arrange
    const user = userEvent.setup();
    renderSheet({ reducedMotion: "always" });

    // act
    const sheet = await openSheet(user);

    // assert
    expect(sheet.style.transform).toBe("");
    expect(sheet.style.touchAction).toBe("");
  });
});
