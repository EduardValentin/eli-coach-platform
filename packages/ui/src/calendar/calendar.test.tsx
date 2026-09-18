// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Calendar } from "./calendar";

afterEach(() => {
  cleanup();
});

const march2026 = new Date("2026-03-01T12:00:00Z");
const march10 = new Date("2026-03-10T12:00:00Z");
const march11 = new Date("2026-03-11T12:00:00Z");
const lateOnMarchFifteenthInUtc = new Date("2026-03-15T22:30:00Z");
const lateOnMarchTenthInBucharest = new Date("2026-03-10T21:00:00Z");

describe("calendar structure", () => {
  it("names the month grid with the calendar's own label and its month", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // assert
    expect(
      screen.getByRole("grid", { name: "Available days, March 2026" }),
    ).toBeInTheDocument();
  });

  it("labels both month navigation buttons", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Go to the Previous Month" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to the Next Month" }),
    ).toBeInTheDocument();
  });
});

describe("calendar keyboard navigation", () => {
  it("moves focus to the next day of the week", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: /March 10th, 2026/ }));
    await user.keyboard("{ArrowRight}");

    // assert
    expect(
      screen.getByRole("button", { name: /March 11th, 2026/ }),
    ).toHaveFocus();
  });

  it("moves focus to the same weekday of the next week", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: /March 10th, 2026/ }));
    await user.keyboard("{ArrowDown}");

    // assert
    expect(
      screen.getByRole("button", { name: /March 17th, 2026/ }),
    ).toHaveFocus();
  });

  it("steps over a disabled day when moving focus", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Available days"
        disabled={march11}
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: /March 10th, 2026/ }));
    await user.keyboard("{ArrowRight}");

    // assert
    expect(
      screen.getByRole("button", { name: /March 12th, 2026/ }),
    ).toHaveFocus();
  });
});

describe("calendar selection", () => {
  it("marks the selected day as selected in the grid", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        selected={march10}
        timeZone="UTC"
      />,
    );

    // assert
    expect(screen.getByRole("gridcell", { selected: true })).toHaveTextContent(
      "10",
    );
  });

  it("reports the day the visitor chooses", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: /March 10th, 2026/ }));

    // assert
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it("refuses a disabled day", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Available days"
        disabled={march11}
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    const disabledDay = screen.getByRole("button", {
      name: /March 11th, 2026/,
    });

    // act
    await user.click(disabledDay);

    // assert
    expect(disabledDay).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("calendar time zones", () => {
  it("places one instant on different days in two time zones", () => {
    // arrange
    const onSelect = vi.fn();

    const { rerender } = render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        selected={lateOnMarchFifteenthInUtc}
        timeZone="Europe/Bucharest"
      />,
    );

    const inBucharest = screen.getByRole("gridcell", {
      selected: true,
    }).textContent;

    // act
    rerender(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        selected={lateOnMarchFifteenthInUtc}
        timeZone="America/New_York"
      />,
    );

    const inNewYork = screen.getByRole("gridcell", {
      selected: true,
    }).textContent;

    // assert
    expect(inBucharest).toBe("16");
    expect(inNewYork).toBe("15");
  });

  it("rules out only the days before the one an instant falls on", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        disabled={{ before: lateOnMarchTenthInBucharest }}
        month={march2026}
        onSelect={onSelect}
        timeZone="Europe/Bucharest"
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: /March 10th, 2026/ }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /March 9th, 2026/ }),
    ).toBeDisabled();
  });
});

describe("calendar day annotations", () => {
  it("announces the reason a day cannot be chosen", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        disabled={march11}
        labels={{
          labelDayButton: (date, modifiers) =>
            modifiers.noOpenSlots
              ? `${date.getDate()} March 2026, no open slots`
              : `${date.getDate()} March 2026`,
        }}
        modifiers={{ noOpenSlots: march11 }}
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "11 March 2026, no open slots" }),
    ).toBeDisabled();
  });

  it("styles a day from the modifier the consumer supplies", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        modifiers={{ noOpenSlots: march11 }}
        modifiersClassNames={{ noOpenSlots: "text-text-muted" }}
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: /March 11th, 2026/ }).closest("td"),
    ).toHaveClass("text-text-muted");
  });
});
