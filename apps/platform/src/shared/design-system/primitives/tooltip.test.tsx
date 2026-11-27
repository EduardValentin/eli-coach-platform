// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderTooltip() {
  return render(
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button">Reorder</button>
      </TooltipTrigger>
      <TooltipContent>Drag to reorder</TooltipContent>
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  it("stays hidden until its trigger is focused", () => {
    // arrange
    // act
    renderTooltip();

    // assert
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows its text when its trigger takes keyboard focus", async () => {
    // arrange
    const user = userEvent.setup();
    renderTooltip();

    // act
    await user.tab();

    // assert
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Drag to reorder",
    );
    expect(
      screen.getByRole("button", { name: "Reorder" }),
    ).toHaveAccessibleDescription("Drag to reorder");
  });

  it("hides again on Escape", async () => {
    // arrange
    const user = userEvent.setup();
    renderTooltip();
    await user.tab();
    await screen.findByRole("tooltip");

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("floats above an open sheet on the inverted surface and animates only when motion is welcome", async () => {
    // arrange
    const user = userEvent.setup();
    renderTooltip();

    // act
    await user.tab();

    // assert
    await screen.findByRole("tooltip");
    const content = screen
      .getAllByText("Drag to reorder")
      .find((element) => element.hasAttribute("data-side"));
    expect(content).toHaveClass(
      "z-floating-over-sheet",
      "bg-surface-inverted",
      "text-text-inverted",
      "rounded-field",
      "motion-safe:data-[state=open]:animate-[ui-popover-in_150ms_ease-out]",
      "motion-safe:data-[state=closed]:animate-[ui-popover-out_150ms_ease-out]",
    );
  });
});
