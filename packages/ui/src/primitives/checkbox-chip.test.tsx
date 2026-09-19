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
});
