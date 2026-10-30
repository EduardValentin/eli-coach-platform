// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DateField } from "./date-field";

afterEach(() => {
  cleanup();
});

function renderBirthDate(props: Partial<ComponentProps<typeof DateField>>) {
  const chosen: string[] = [];
  render(
    <>
      <label htmlFor="birth-date">Date of birth</label>
      <DateField
        calendarLabel="Date of birth"
        id="birth-date"
        onChange={(isoDate) => chosen.push(isoDate)}
        value=""
        {...props}
      />
    </>,
  );

  return { chosen };
}

function trigger() {
  return screen.getByRole("button", { name: "Date of birth" });
}

describe("DateField trigger", () => {
  it("is a button named by the field's label, showing the placeholder while empty", () => {
    // arrange
    const props = { placeholder: "Pick a date" };

    // act
    renderBirthDate(props);

    // assert
    expect(trigger()).toHaveTextContent("Pick a date");
  });

  it("shows the chosen date spelled out", () => {
    // arrange
    const props = { value: "1990-03-05" };

    // act
    renderBirthDate(props);

    // assert
    expect(trigger()).toHaveTextContent("5 March 1990");
  });

  it("passes its field attributes to the trigger", () => {
    // arrange
    const props = { "aria-invalid": true };

    // act
    renderBirthDate(props);

    // assert
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
  });
});

describe("DateField calendar", () => {
  it("opens a calendar on the chosen month from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    renderBirthDate({ value: "1990-03-05" });

    // act
    await user.tab();
    await user.keyboard("{Enter}");

    // assert
    expect(
      within(screen.getByRole("dialog")).getByRole("grid", {
        name: "Date of birth, March 1990",
      }),
    ).toBeInTheDocument();
  });

  it("reports the picked day as an ISO date and closes, returning focus to the field", async () => {
    // arrange
    const user = userEvent.setup();
    const { chosen } = renderBirthDate({ value: "1990-03-05" });
    await user.click(trigger());

    // act
    await user.click(screen.getByRole("button", { name: /March 10th, 1990/ }));

    // assert
    expect(chosen).toEqual(["1990-03-10"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("reports leaving the field only once focus leaves it, not while she picks a day", async () => {
    // arrange
    const user = userEvent.setup();
    const onBlur = vi.fn();
    renderBirthDate({ onBlur, value: "1990-03-05" });
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: /March 10th, 1990/ }));
    const blurredWhilePicking = onBlur.mock.calls.length;

    // act
    await user.tab();

    // assert
    expect(blurredWhilePicking).toBe(0);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape without choosing a day", async () => {
    // arrange
    const user = userEvent.setup();
    const { chosen } = renderBirthDate({ value: "1990-03-05" });
    await user.click(trigger());

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(chosen).toEqual([]);
    expect(trigger()).toHaveFocus();
  });

  it("refuses a day the consumer disables", async () => {
    // arrange
    const user = userEvent.setup();
    const { chosen } = renderBirthDate({
      disabledDays: { after: new Date("1990-03-08T12:00:00Z") },
      value: "1990-03-05",
    });
    await user.click(trigger());
    const laterDay = screen.getByRole("button", { name: /March 10th, 1990/ });

    // act
    await user.click(laterDay);

    // assert
    expect(laterDay).toBeDisabled();
    expect(chosen).toEqual([]);
  });

  it("offers month and year selects when given a year range", async () => {
    // arrange
    const user = userEvent.setup();
    renderBirthDate({
      value: "1990-03-05",
      yearRange: { from: 1950, to: 2010 },
    });

    // act
    await user.click(trigger());

    // assert
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("combobox", { name: "Month" }),
    ).toHaveTextContent("March");
    expect(
      within(dialog).getByRole("combobox", { name: "Year" }),
    ).toHaveTextContent("1990");
  });

  it("opens on the default month while no date is chosen", async () => {
    // arrange
    const user = userEvent.setup();
    renderBirthDate({ defaultMonth: new Date("1996-06-01T12:00:00Z") });

    // act
    await user.click(trigger());

    // assert
    expect(
      screen.getByRole("grid", { name: "Date of birth, June 1996" }),
    ).toBeInTheDocument();
  });
});
