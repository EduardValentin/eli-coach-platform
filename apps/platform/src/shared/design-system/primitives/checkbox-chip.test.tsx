// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CheckboxChip } from "./checkbox-chip";

afterEach(() => {
  cleanup();
});

describe("CheckboxChip", () => {
  it("exposes a labelled, checkable checkbox", () => {
    // arrange, act
    render(
      <CheckboxChip aria-label="Monday" isChecked={false} onChange={vi.fn()}>
        Mon
      </CheckboxChip>,
    );

    // assert
    const checkbox = screen.getByRole("checkbox", { name: "Monday" });

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("Mon")).toBeInTheDocument();
  });

  it("toggles from the keyboard through its native checkbox semantics", async () => {
    // arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CheckboxChip aria-label="Monday" isChecked={false} onChange={onChange}>
        Mon
      </CheckboxChip>,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Monday" });

    // act
    checkbox.focus();
    await user.keyboard(" ");

    // assert
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("reflects the checked state on the label for styling", () => {
    // arrange, act
    render(
      <CheckboxChip aria-label="Monday" isChecked={true} onChange={vi.fn()}>
        Mon
      </CheckboxChip>,
    );

    // assert
    const checkbox = screen.getByRole("checkbox", { name: "Monday" });

    expect(checkbox.closest("label")).toHaveAttribute("data-state", "on");
  });

  it("fills a selected chip with the primary colour and outlines an unselected one", () => {
    // arrange, act
    render(
      <>
        <CheckboxChip aria-label="Monday" isChecked={true} onChange={vi.fn()}>
          Mon
        </CheckboxChip>
        <CheckboxChip aria-label="Tuesday" isChecked={false} onChange={vi.fn()}>
          Tue
        </CheckboxChip>
      </>,
    );

    // assert
    const selected = screen
      .getByRole("checkbox", { name: "Monday" })
      .closest("label");
    const unselected = screen
      .getByRole("checkbox", { name: "Tuesday" })
      .closest("label");
    expect(selected).toHaveClass(
      "min-h-11",
      "min-w-11",
      "px-4",
      "font-semibold",
      "data-[state=on]:border-primary",
      "data-[state=on]:bg-primary",
      "data-[state=on]:text-primary-foreground",
      "data-[state=on]:hover:bg-primary-hover",
    );
    expect(unselected).toHaveClass(
      "data-[state=off]:border-border-default",
      "data-[state=off]:text-text-muted",
      "data-[state=off]:hover:border-primary",
      "data-[state=off]:hover:text-primary",
    );
  });

  it("sets a compact chip at the small height in medium extra-small text, tinting an unselected one on hover", () => {
    // arrange, act
    render(
      <>
        <CheckboxChip
          isChecked={true}
          onChange={vi.fn()}
          size="compact"
          aria-label="Strength"
        >
          Strength
        </CheckboxChip>
        <CheckboxChip
          isChecked={false}
          onChange={vi.fn()}
          size="compact"
          aria-label="Recovery"
        >
          Recovery
        </CheckboxChip>
      </>,
    );

    // assert
    const selected = screen
      .getByRole("checkbox", { name: "Strength" })
      .closest("label");
    const unselected = screen
      .getByRole("checkbox", { name: "Recovery" })
      .closest("label");
    expect(selected).toHaveClass(
      "h-8",
      "min-w-8",
      "px-3",
      "text-xs",
      "font-medium",
      "data-[state=on]:border-primary",
      "data-[state=on]:bg-primary",
      "data-[state=on]:text-primary-foreground",
    );
    expect(selected).not.toHaveClass("min-h-11", "font-semibold");
    expect(unselected).toHaveClass(
      "data-[state=off]:border-border-default",
      "data-[state=off]:text-text-muted",
      "data-[state=off]:hover:bg-primary-soft",
      "data-[state=off]:hover:text-primary",
      "data-[state=off]:has-focus-visible:border-focus-ring",
    );
  });

  it("toggles a compact chip from the keyboard as a native checkbox", async () => {
    // arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CheckboxChip
        isChecked={false}
        onChange={onChange}
        size="compact"
        aria-label="Strength"
      >
        Strength
      </CheckboxChip>,
    );

    // act
    await user.tab();
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("checkbox", { name: "Strength" })).toHaveFocus();
    expect(onChange).toHaveBeenCalledOnce();
  });
});
