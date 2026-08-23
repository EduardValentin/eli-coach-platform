// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToggleChipGroup, ToggleChipGroupItem } from "./toggle-chip-group";

afterEach(() => {
  cleanup();
});

describe("toggle chip group selection", () => {
  it("exposes a radio group holding one radio per chip", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    render(
      <ToggleChipGroup
        aria-label="Filter by Type"
        onValueChange={onValueChange}
        value="all"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
        <ToggleChipGroupItem value="workouts">Workouts</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // assert
    expect(
      screen.getByRole("radiogroup", { name: "Filter by Type" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("checks only the chip matching the current value", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    render(
      <ToggleChipGroup
        aria-label="Filter by Type"
        onValueChange={onValueChange}
        value="workouts"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
        <ToggleChipGroupItem value="workouts">Workouts</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // assert
    expect(screen.getByRole("radio", { name: "Workouts" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "All" })).not.toBeChecked();
  });

  it("reports the chosen value when a chip is clicked", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleChipGroup
        aria-label="Filter by Type"
        onValueChange={onValueChange}
        value="all"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
        <ToggleChipGroupItem value="workouts">Workouts</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // act
    await user.click(screen.getByRole("radio", { name: "Workouts" }));

    // assert
    expect(onValueChange).toHaveBeenCalledWith("workouts");
  });

  it("checks the chip the arrow keys move onto", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleChipGroup
        aria-label="Filter by Goal"
        onValueChange={onValueChange}
        value="all"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
        <ToggleChipGroupItem value="fat-loss">Fat Loss</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // act
    await user.tab();
    await user.keyboard("{ArrowRight}");

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("fat-loss");
  });

  it("reports a clicked chip exactly once", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleChipGroup
        aria-label="Filter by Type"
        onValueChange={onValueChange}
        value="all"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
        <ToggleChipGroupItem value="workouts">Workouts</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // act
    await user.click(screen.getByRole("radio", { name: "Workouts" }));

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("workouts");
  });

  it("stays quiet when the already checked chip takes focus", async () => {
    // arrange
    const onValueChange = vi.fn();

    render(
      <ToggleChipGroup
        aria-label="Filter by Type"
        onValueChange={onValueChange}
        value="workouts"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
        <ToggleChipGroupItem value="workouts">Workouts</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // act
    screen.getByRole("radio", { name: "Workouts" }).focus();

    // assert
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it("keeps the selection when the checked chip is clicked again", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleChipGroup
        aria-label="Filter by Type"
        onValueChange={onValueChange}
        value="workouts"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
        <ToggleChipGroupItem value="workouts">Workouts</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // act
    await user.click(screen.getByRole("radio", { name: "Workouts" }));

    // assert
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("toggle chip group appearance", () => {
  it("fills a selected chip with its tone", () => {
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
    expect(screen.getByRole("radio", { name: "All" })).toHaveClass(
      "data-[state=on]:bg-brand-primary",
    );
    expect(screen.getByRole("radio", { name: "Fat Loss" })).toHaveClass(
      "data-[state=on]:bg-brand-secondary",
    );
  });

  it("keeps an explicit focus-visible outline on every chip", () => {
    // arrange
    const onValueChange = vi.fn();

    // act
    render(
      <ToggleChipGroup
        aria-label="Filter by Type"
        onValueChange={onValueChange}
        value="all"
      >
        <ToggleChipGroupItem value="all">All</ToggleChipGroupItem>
      </ToggleChipGroup>,
    );

    // assert
    expect(screen.getByRole("radio", { name: "All" })).toHaveClass(
      "focus-visible:outline-solid",
    );
  });
});
