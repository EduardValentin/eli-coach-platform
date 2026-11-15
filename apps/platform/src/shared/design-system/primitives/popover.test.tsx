// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";

afterEach(() => {
  cleanup();
});

function renderDatePopover() {
  return render(
    <Popover>
      <PopoverTrigger>Select a date</PopoverTrigger>
      <PopoverContent>Calendar goes here</PopoverContent>
    </Popover>,
  );
}

describe("Popover", () => {
  it("points its trigger at no content while closed", () => {
    // arrange, act
    renderDatePopover();

    // assert
    expect(
      screen.getByRole("button", { name: "Select a date" }),
    ).not.toHaveAttribute("aria-controls");
  });

  it("points its trigger at its content while open", async () => {
    // arrange
    const user = userEvent.setup();
    renderDatePopover();
    const trigger = screen.getByRole("button", { name: "Select a date" });

    // act
    await user.click(trigger);

    // assert
    expect(trigger).toHaveAttribute(
      "aria-controls",
      screen.getByRole("dialog").id,
    );
  });

  it("drops the pointer again once it closes", async () => {
    // arrange
    const user = userEvent.setup();
    renderDatePopover();
    const trigger = screen.getByRole("button", { name: "Select a date" });
    await user.click(trigger);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(trigger).not.toHaveAttribute("aria-controls");
  });

  it("opens its content when the trigger is clicked", async () => {
    // arrange
    const user = userEvent.setup();
    renderDatePopover();

    // act
    await user.click(screen.getByRole("button", { name: "Select a date" }));

    // assert
    expect(screen.getByRole("dialog")).toHaveTextContent("Calendar goes here");
  });

  it("closes on Escape", async () => {
    // arrange
    const user = userEvent.setup();
    renderDatePopover();
    await user.click(screen.getByRole("button", { name: "Select a date" }));

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns focus to the trigger once closed", async () => {
    // arrange
    const user = userEvent.setup();
    renderDatePopover();
    const trigger = screen.getByRole("button", { name: "Select a date" });
    await user.click(trigger);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(trigger).toHaveFocus();
  });
});
