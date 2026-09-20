// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterChip, FilterChipGroup } from "./filter-chip-group";

afterEach(() => {
  cleanup();
});

function renderGroup(options: {
  onValueChange: (value: string | null) => void;
  tone?: "brand" | "brand-secondary";
  value: string | null;
}) {
  return render(
    <FilterChipGroup
      aria-label="Filter by Type"
      onValueChange={options.onValueChange}
      tone={options.tone}
      value={options.value}
    >
      <FilterChip value="workouts">Workouts</FilterChip>
      <FilterChip value="e-books">E-Books</FilterChip>
    </FilterChipGroup>,
  );
}

describe("filter chip group selection", () => {
  it("exposes a named group holding one radio per chip", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: null });

    // assert
    expect(
      screen.getByRole("group", { name: "Filter by Type" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("checks nothing while no value is chosen", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: null });

    // assert
    for (const chip of screen.getAllByRole("radio")) {
      expect(chip).toHaveAttribute("aria-checked", "false");
    }
  });

  it("checks only the radio matching the current value", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: "workouts" });

    // assert
    expect(screen.getByRole("radio", { name: "Workouts" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "E-Books" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("reports a clicked chip exactly once", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: null });

    // act
    await user.click(screen.getByRole("radio", { name: "Workouts" }));

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("workouts");
  });

  it("replaces the checked radio rather than adding to it", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "workouts" });

    // act
    await user.click(screen.getByRole("radio", { name: "E-Books" }));

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("e-books");
  });

  it("reports nothing chosen when the checked radio is activated again", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "workouts" });

    // act
    await user.click(screen.getByRole("radio", { name: "Workouts" }));

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("moves focus across the radios without choosing one", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "workouts" });

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");

    // assert
    expect(screen.getByRole("radio", { name: "E-Books" })).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("reports the focused radio when the keyboard activates it", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    renderGroup({ onValueChange, value: "workouts" });

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("e-books");
  });
});

describe("filter chip group appearance", () => {
  it("gives every chip the group's tone", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, tone: "brand-secondary", value: null });

    // assert
    for (const chip of screen.getAllByRole("radio")) {
      expect(chip).toHaveClass("data-[state=on]:bg-brand-secondary");
    }
  });

  it("falls back to the brand tone", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    renderGroup({ onValueChange, value: null });

    // assert
    expect(screen.getByRole("radio", { name: "Workouts" })).toHaveClass(
      "data-[state=on]:bg-brand-primary",
    );
  });

  it("passes ordinary group attributes through to the element", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    render(
      <FilterChipGroup
        aria-label="Filter by Type"
        id="type-filter"
        onValueChange={onValueChange}
        value={null}
      >
        <FilterChip disabled value="workouts">
          Workouts
        </FilterChip>
      </FilterChipGroup>,
    );

    // assert
    expect(
      screen.getByRole("group", { name: "Filter by Type" }),
    ).toHaveAttribute("id", "type-filter");
    expect(screen.getByRole("radio", { name: "Workouts" })).toBeDisabled();
  });
});
