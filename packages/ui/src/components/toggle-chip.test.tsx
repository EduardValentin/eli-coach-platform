// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToggleChip } from "./toggle-chip";

afterEach(() => {
  cleanup();
});

describe("ToggleChip", () => {
  it("renders a pressable button reporting its state", async () => {
    // arrange
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <ToggleChip onPressedChange={onPressedChange} pressed={false}>
        Strength
      </ToggleChip>,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Strength" }));

    // assert
    expect(screen.getByRole("button", { name: "Strength" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it("shows the pressed state it is given", () => {
    // arrange, act
    render(
      <ToggleChip onPressedChange={() => {}} pressed>
        Recovery
      </ToggleChip>,
    );

    // assert
    expect(screen.getByRole("button", { name: "Recovery" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reports the opposite state when the keyboard activates it", async () => {
    // arrange
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <ToggleChip onPressedChange={onPressedChange} pressed>
        Hypertrophy
      </ToggleChip>,
    );

    // act
    await user.tab();
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("button", { name: "Hypertrophy" })).toHaveFocus();
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onPressedChange).toHaveBeenCalledWith(false);
  });

  it("passes ordinary button attributes through to the element", () => {
    // arrange, act
    render(
      <ToggleChip disabled onPressedChange={() => {}} pressed={false}>
        Strength
      </ToggleChip>,
    );

    // assert
    expect(screen.getByRole("button", { name: "Strength" })).toBeDisabled();
  });
});
