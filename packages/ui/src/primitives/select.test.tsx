// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

// jsdom has no scrollIntoView; Radix Select calls it when the listbox opens.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
});

function renderHourSelect() {
  return render(
    <>
      <label htmlFor="hour">Start</label>
      <Select defaultValue="9" name="hour">
        <SelectTrigger id="hour">
          <SelectValue>09:00</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="9">09:00</SelectItem>
          <SelectItem value="10">10:00</SelectItem>
        </SelectContent>
      </Select>
    </>,
  );
}

describe("Select", () => {
  it("labels the trigger through its associated label and shows the current value", () => {
    // arrange, act
    renderHourSelect();

    // assert
    expect(screen.getByRole("combobox", { name: "Start" })).toHaveTextContent(
      "09:00",
    );
  });

  it("opens the listbox of options from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    renderHourSelect();
    const trigger = screen.getByRole("combobox", { name: "Start" });

    // act
    trigger.focus();
    await user.keyboard("{Enter}");

    // assert
    expect(screen.getByRole("option", { name: "10:00" })).toBeInTheDocument();
  });

  it("lays out the value and option text from the trigger and item, since Radix drops a className passed directly to Select.Value and Select.ItemText", async () => {
    // arrange
    const user = userEvent.setup();
    renderHourSelect();
    const trigger = screen.getByRole("combobox", { name: "Start" });

    // act
    trigger.focus();
    await user.keyboard("{Enter}");
    const option = screen.getByRole("option", { name: "10:00" });

    // assert
    expect(trigger).toHaveClass("[&>span:first-child]:flex");
    expect(option).toHaveClass("*:[span]:last:flex");
  });

  it("carries the one-line clipping classes its trigger contract publishes", () => {
    // arrange, act
    renderHourSelect();
    const trigger = screen.getByRole("combobox", { name: "Start" });

    // assert
    expect(trigger).toHaveClass("whitespace-nowrap");
    expect(trigger).toHaveClass("[&>span:first-child]:overflow-hidden");
    expect(trigger).toHaveClass("[&>span:first-child]:whitespace-nowrap");
  });
});
