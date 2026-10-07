// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type KeyboardEvent } from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ViewerDialog,
  ViewerDialogClose,
  ViewerDialogContent,
  ViewerDialogTitle,
} from "./viewer-dialog";

afterEach(() => {
  cleanup();
});

function MealPlan() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const turnWithArrowKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") setPage((current) => current + 1);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open meal plan
      </button>
      <ViewerDialog onOpenChange={setOpen} open={open}>
        <ViewerDialogContent
          data-parity-root="ResourceViewer"
          onKeyDown={turnWithArrowKeys}
        >
          <div>
            <ViewerDialogClose asChild>
              <button type="button">Close</button>
            </ViewerDialogClose>
            <ViewerDialogTitle className="text-base leading-normal">
              Meal plan
            </ViewerDialogTitle>
          </div>
          <p>Page {page}</p>
        </ViewerDialogContent>
      </ViewerDialog>
    </>
  );
}

async function openViewer() {
  const user = userEvent.setup();
  render(<MealPlan />);
  await user.click(screen.getByRole("button", { name: "Open meal plan" }));

  return { user, viewer: screen.getByRole("dialog", { name: "Meal plan" }) };
}

describe("ViewerDialog", () => {
  it("is named by the title its content renders and carries no description", async () => {
    // arrange
    // act
    const { viewer } = await openViewer();

    // assert
    expect(viewer).not.toHaveAttribute("aria-describedby");
    expect(
      within(viewer).getByRole("heading", { name: "Meal plan" }),
    ).toHaveClass("text-base", "leading-normal", "font-semibold");
  });

  it("fills a phone screen inside the safe area and becomes a centred panel on large screens", async () => {
    // arrange
    // act
    const { viewer } = await openViewer();

    // assert
    expect(viewer).toHaveClass(
      "fixed",
      "z-50",
      "bg-surface-base",
      "duration-200",
      "inset-0",
      "flex",
      "h-dvh",
      "flex-col",
      "gap-0",
      "overflow-hidden",
      "shadow-none",
      "pt-[env(safe-area-inset-top)]",
      "pr-[env(safe-area-inset-right)]",
      "pb-[env(safe-area-inset-bottom)]",
      "pl-[env(safe-area-inset-left)]",
      "lg:inset-auto",
      "lg:top-1/2",
      "lg:left-1/2",
      "lg:h-[min(90dvh,56rem)]",
      "lg:w-[calc(100%-4rem)]",
      "lg:max-w-6xl",
      "lg:-translate-x-1/2",
      "lg:-translate-y-1/2",
      "lg:rounded-card",
      "lg:border",
      "lg:shadow-action-hover",
    );
  });

  it("offers only the close control its content renders", async () => {
    // arrange
    // act
    const { viewer } = await openViewer();

    // assert
    expect(
      within(viewer).getAllByRole("button", { name: "Close" }),
    ).toHaveLength(1);
  });

  it("carries the content's parity root and hands it the keys pressed inside", async () => {
    // arrange
    const { user, viewer } = await openViewer();

    // act
    await user.keyboard("{ArrowRight}");

    // assert
    expect(viewer).toHaveAttribute("data-parity-root", "ResourceViewer");
    expect(within(viewer).getByText("Page 2")).toBeInTheDocument();
  });

  it("closes with its own close control and returns focus to the opener", async () => {
    // arrange
    const { user, viewer } = await openViewer();

    // act
    await user.click(within(viewer).getByRole("button", { name: "Close" }));

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Open meal plan" }),
      ).toHaveFocus(),
    );
  });

  it("closes on Escape", async () => {
    // arrange
    const { user } = await openViewer();

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
