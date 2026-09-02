// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

afterEach(() => {
  cleanup();
});

const options = [
  { label: "Beginner", value: "Beginner" },
  { label: "Intermediate", value: "Intermediate" },
] as const;

describe("SegmentedControl", () => {
  it("exposes a named radio group with the current choice checked", () => {
    // arrange, act
    render(
      <SegmentedControl
        legend="Difficulty"
        name="difficulty"
        onValueChange={() => {}}
        options={options}
        value="Intermediate"
      />,
    );

    // assert
    const group = screen.getByRole("group", { name: "Difficulty" });
    expect(
      within(group).getByRole("radio", { name: "Intermediate" }),
    ).toBeChecked();
    expect(
      within(group).getByRole("radio", { name: "Beginner" }),
    ).not.toBeChecked();
  });

  it("reports the option the coach picks", async () => {
    // arrange
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        legend="Difficulty"
        name="difficulty"
        onValueChange={onValueChange}
        options={options}
        value="Beginner"
      />,
    );

    // act
    await user.click(screen.getByRole("radio", { name: "Intermediate" }));

    // assert
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("Intermediate");
  });

  it("submits the choice under the given field name", () => {
    // arrange, act
    render(
      <SegmentedControl
        legend="Difficulty"
        name="difficulty"
        onValueChange={() => {}}
        options={options}
        value="Beginner"
      />,
    );

    // assert
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAttribute("name", "difficulty");
    }
  });
});
