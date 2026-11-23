// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Switch } from "./switch";

afterEach(() => {
  cleanup();
});

function ReminderSwitch(props: { disabled?: boolean }) {
  const [checked, setChecked] = useState(false);

  return (
    <Switch
      aria-label="Weekly reminder"
      checked={checked}
      disabled={props.disabled}
      onCheckedChange={setChecked}
    />
  );
}

describe("Switch", () => {
  it("is announced as a switch that is off at rest", () => {
    // arrange, act
    render(<ReminderSwitch />);

    // assert
    const toggle = screen.getByRole("switch", { name: "Weekly reminder" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAttribute("data-state", "unchecked");
  });

  it("turns on when clicked", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ReminderSwitch />);

    // act
    await user.click(screen.getByRole("switch", { name: "Weekly reminder" }));

    // assert
    expect(
      screen.getByRole("switch", { name: "Weekly reminder" }),
    ).toBeChecked();
  });

  it("toggles with Space from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ReminderSwitch />);
    await user.tab();

    // act
    await user.keyboard(" ");

    // assert
    expect(
      screen.getByRole("switch", { name: "Weekly reminder" }),
    ).toBeChecked();
  });

  it("stays off and out of the tab order while disabled", async () => {
    // arrange
    const user = userEvent.setup();
    render(<ReminderSwitch disabled />);

    // act
    await user.click(screen.getByRole("switch", { name: "Weekly reminder" }));
    await user.tab();

    // assert
    const toggle = screen.getByRole("switch", { name: "Weekly reminder" });
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
    expect(toggle).not.toHaveFocus();
  });

  it("carries its own 48px pointer target", () => {
    // arrange, act
    render(<ReminderSwitch />);

    // assert
    expect(screen.getByRole("switch")).toHaveClass("hit-area");
  });
});
