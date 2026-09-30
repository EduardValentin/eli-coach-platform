// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

afterEach(() => {
  cleanup();
});

function renderInfoTooltip() {
  return render(
    <Tooltip>
      <TooltipTrigger aria-label="What the ratio means">i</TooltipTrigger>
      <TooltipContent>Waist divided by height.</TooltipContent>
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  it("shows its content as a tooltip while the trigger is hovered", async () => {
    // arrange
    const user = userEvent.setup();
    renderInfoTooltip();

    // act
    await user.hover(
      screen.getByRole("button", { name: "What the ratio means" }),
    );

    // assert
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Waist divided by height.",
    );
  });

  it("shows its content when the trigger takes keyboard focus", async () => {
    // arrange
    const user = userEvent.setup();
    renderInfoTooltip();

    // act
    await user.tab();

    // assert
    expect(
      screen.getByRole("button", { name: "What the ratio means" }),
    ).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Waist divided by height.",
    );
  });

  it("describes the trigger by its content while open", async () => {
    // arrange
    const user = userEvent.setup();
    renderInfoTooltip();

    // act
    await user.tab();

    // assert
    expect(
      screen.getByRole("button", { name: "What the ratio means" }),
    ).toHaveAccessibleDescription("Waist divided by height.");
  });

  it("closes on Escape", async () => {
    // arrange
    const user = userEvent.setup();
    renderInfoTooltip();
    await user.tab();
    await screen.findByRole("tooltip");

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("stays closed until the trigger is hovered or focused", () => {
    // arrange
    // act
    renderInfoTooltip();

    // assert
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
