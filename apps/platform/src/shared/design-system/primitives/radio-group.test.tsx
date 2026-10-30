// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { RadioGroup, RadioGroupItem } from "./radio-group";

afterEach(() => {
  cleanup();
});

describe("RadioGroup", () => {
  it("checks the option a person picks and reports its value", async () => {
    // arrange
    const user = userEvent.setup();
    const chosen: string[] = [];
    render(
      <RadioGroup aria-label="Start" onValueChange={(v) => chosen.push(v)}>
        <RadioGroupItem aria-label="Now" value="now" />
        <RadioGroupItem aria-label="Later" value="later" />
      </RadioGroup>,
    );

    // act
    await user.click(screen.getByRole("radio", { name: "Later" }));

    // assert
    expect(screen.getByRole("radio", { name: "Later" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Now" })).not.toBeChecked();
    expect(chosen).toEqual(["later"]);
  });

  it("moves between options with the arrow keys and checks one with Space", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <RadioGroup aria-label="Start" defaultValue="now">
        <RadioGroupItem aria-label="Now" value="now" />
        <RadioGroupItem aria-label="Later" value="later" />
      </RadioGroup>,
    );
    screen.getByRole("radio", { name: "Now" }).focus();

    // act
    await user.keyboard("{ArrowDown}");
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("radio", { name: "Later" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Later" })).toBeChecked();
  });

  it("forwards its ref to the option so a caller can move focus to it", () => {
    // arrange
    const ref: { current: HTMLButtonElement | null } = { current: null };

    // act
    render(
      <RadioGroup aria-label="Start">
        <RadioGroupItem aria-label="Now" ref={ref} value="now" />
      </RadioGroup>,
    );

    // assert
    expect(ref.current).toBe(screen.getByRole("radio", { name: "Now" }));
  });
});
