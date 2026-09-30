// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { ResponsiveSheetDialog } from "./responsive-sheet-dialog";

const PHONE_WIDTH = 390;
const DESKTOP_WIDTH = 1280;

type ViewportListener = () => void;

const viewport = {
  listeners: new Set<ViewportListener>(),
  width: DESKTOP_WIDTH,
};

function maxWidthOf(query: string): number {
  const match = /max-width:\s*(\d+)px/.exec(query);

  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function viewportIs(width: number) {
  viewport.width = width;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: (_type: string, listener: ViewportListener) =>
        viewport.listeners.add(listener),
      get matches() {
        return viewport.width <= maxWidthOf(query);
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

function AddMeasurements() {
  const [open, setOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="always">
      <button onClick={() => setOpen(true)} type="button">
        Add
      </button>
      <ResponsiveSheetDialog
        description="Same time of day, same tape, same spots."
        onOpenChange={setOpen}
        open={open}
        title="Add measurements"
      >
        <label>
          Weight
          <input type="text" />
        </label>
      </ResponsiveSheetDialog>
    </MotionConfig>
  );
}

async function openOnViewport(width: number) {
  viewportIs(width);
  const user = userEvent.setup();
  render(<AddMeasurements />);

  await user.click(screen.getByRole("button", { name: "Add" }));

  return {
    surface: await screen.findByRole("dialog", { name: "Add measurements" }),
    user,
  };
}

describe("ResponsiveSheetDialog", () => {
  it("opens as a centred dialog named and described by its visually hidden title and description on a wide screen", async () => {
    // arrange, act
    const { surface } = await openOnViewport(DESKTOP_WIDTH);

    // assert
    expect(surface).toHaveAccessibleDescription(
      "Same time of day, same tape, same spots.",
    );
    expect(surface).toHaveClass("flex", "flex-col", "sm:max-w-2xl");
    expect(screen.getByText("Add measurements")).toHaveClass("sr-only");
    expect(screen.getByRole("textbox", { name: "Weight" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("opens as a bottom sheet named and described the same way on a phone", async () => {
    // arrange, act
    const { surface } = await openOnViewport(PHONE_WIDTH);

    // assert
    expect(surface).toHaveAccessibleDescription(
      "Same time of day, same tape, same spots.",
    );
    expect(surface).toHaveClass("rounded-t-panel");
    expect(screen.getByText("Add measurements")).toHaveClass("sr-only");
    expect(screen.getByRole("textbox", { name: "Weight" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("closes on Escape and hands focus back to its opener on a wide screen", async () => {
    // arrange
    const { user } = await openOnViewport(DESKTOP_WIDTH);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toHaveFocus();
  });

  it("closes on Escape and hands focus back to its opener on a phone", async () => {
    // arrange
    const { user } = await openOnViewport(PHONE_WIDTH);

    // act
    await user.keyboard("{Escape}");

    // assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add" })).toHaveFocus();
  });

  it("becomes a bottom sheet when the screen narrows to a phone", async () => {
    // arrange
    await openOnViewport(DESKTOP_WIDTH);

    // act
    resizeViewportTo(PHONE_WIDTH);

    // assert
    expect(
      await screen.findByRole("dialog", { name: "Add measurements" }),
    ).toHaveClass("rounded-t-panel");
  });

  it("renders its opener on the server without reading the screen", () => {
    // arrange
    Reflect.deleteProperty(window, "matchMedia");

    // act
    const html = renderToString(<AddMeasurements />);

    // assert
    expect(html).toContain("Add");
  });
});
