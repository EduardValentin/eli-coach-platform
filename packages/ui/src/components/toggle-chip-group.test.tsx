// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToggleChipGroup, ToggleChipGroupItem } from "./toggle-chip-group";

afterEach(() => {
  cleanup();
});

function renderGroup(options: {
  onValueChange: (value: string) => void;
  value: string;
}) {
  return render(
    <ToggleChipGroup
      aria-label="Filter by Type"
      onValueChange={options.onValueChange}
      value={options.value}
    >
      <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
      <ToggleChipGroupItem value="workouts">Workouts</ToggleChipGroupItem>
      <ToggleChipGroupItem value="e-books">E-Books</ToggleChipGroupItem>
    </ToggleChipGroup>,
  );
}

describe("toggle chip group selection", () => {
  it("exposes a named group holding one button per chip", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: "all" });

    // assert
    expect(
      screen.getByRole("group", { name: "Filter by Type" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("presses only the chip matching the current value", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: "workouts" });

    // assert
    expect(
      screen.getByRole("button", { name: "Workouts" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports a clicked chip exactly once", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "all" });

    // act
    await user.click(screen.getByRole("button", { name: "Workouts" }));

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("workouts");
  });

  it("moves focus across the chips without choosing one", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "all" });

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");

    // assert
    expect(screen.getByRole("button", { name: "Workouts" })).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("reports the focused chip when the keyboard activates it", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "all" });

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("workouts");
  });

  it("stays quiet when a chip merely takes focus", () => {
    // arrange
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "all" });

    // act
    screen.getByRole("button", { name: "E-Books" }).focus();

    // assert
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps the selection when the pressed chip is pressed again", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "workouts" });

    // act
    await user.click(screen.getByRole("button", { name: "Workouts" }));

    // assert
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("toggle chip group appearance", () => {
  it("fills a pressed chip with its tone", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    render(
      <ToggleChipGroup
        aria-label="Filter by Goal"
        onValueChange={onValueChange}
        value="all"
      >
        <ToggleChipGroupItem tone="brand" value="all">
          All
        </ToggleChipGroupItem>
        <ToggleChipGroupItem tone="brand-secondary" value="fat-loss">
          Fat Loss
        </ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // assert
    expect(screen.getByRole("button", { name: "All" })).toHaveClass(
      "data-[state=on]:bg-brand-primary",
    );
    expect(screen.getByRole("button", { name: "Fat Loss" })).toHaveClass(
      "data-[state=on]:bg-brand-secondary",
    );
  });

  it("keeps an explicit focus-visible outline on every chip", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: "all" });

    // assert
    expect(screen.getByRole("button", { name: "All" })).toHaveClass(
      "focus-visible:outline-solid",
    );
  });
});
