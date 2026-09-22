// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Calendar } from "./calendar";

afterEach(() => {
  cleanup();
});

const march2026 = new Date("2026-03-01T12:00:00Z");
const september2026 = new Date("2026-09-01T12:00:00Z");
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

  it("sizes its day cells from the width it is given rather than a fixed step", () => {
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
    const grid = screen.getByRole("grid", {
      name: "Available days, March 2026",
    });
    const dayButton = screen.getByRole("button", { name: /March 10th, 2026/ });
    expect(grid).toHaveClass("w-full");
    expect(dayButton).toHaveClass("w-full", "aspect-square");
    expect(dayButton.className).not.toMatch(/(^|\s)size-\d/);
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

describe("calendar outside days", () => {
  it("fills the last week with the next month's leading days", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        month={september2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // assert
    const grid = screen.getByRole("grid", {
      name: "Available days, September 2026",
    });
    expect(
      within(grid).getByRole("button", { name: /October 1st, 2026/ }),
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole("button", { name: /October 3rd, 2026/ }),
    ).toBeInTheDocument();
  });

  it("lets the visitor choose a leading day of the next month", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Available days"
        month={september2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: /October 1st, 2026/ }));

    // assert
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toEqual(new Date("2026-10-01T00:00:00Z"));
  });

  it("refuses a leading day of the next month the consumer disables", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const october3 = new Date("2026-10-03T12:00:00Z");

    render(
      <Calendar
        aria-label="Available days"
        disabled={october3}
        month={september2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );
    const disabledDay = screen.getByRole("button", {
      name: /October 3rd, 2026/,
    });

    // act
    await user.click(disabledDay);

    // assert
    expect(disabledDay).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("greys a leading day of the next month in the secondary text colour", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        month={september2026}
        onSelect={onSelect}
        timeZone="UTC"
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: /October 1st, 2026/ }),
    ).toHaveClass("text-text-secondary");
  });
});

describe("calendar day marks", () => {
  it("rings today in the brand colour and rounds each day to the button corner", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        timeZone="UTC"
        today={march10}
      />,
    );

    // assert
    const dayButton = screen.getByRole("button", { name: /March 10th, 2026/ });
    expect(dayButton).toHaveClass(
      "rounded-control",
      "font-medium",
      "ring-2",
      "ring-brand-primary/30",
    );
    expect(dayButton).not.toHaveClass("rounded-full", "text-brand-primary");
  });
});

describe("calendar weekdays and weeks", () => {
  it("sets the weekday names in small uppercase secondary text on a 40px row", () => {
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
    const weekdays = screen.getAllByRole("columnheader", { hidden: true });
    expect(weekdays).toHaveLength(7);
    expect(weekdays[0]).toHaveClass(
      "h-10",
      "text-caption",
      "uppercase",
      "tracking-wider",
      "text-text-secondary",
    );
  });

  it("separates the weeks by the smallest space step", () => {
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
      screen.getByRole("button", { name: /March 10th, 2026/ }).closest("tr"),
    ).toHaveClass("mt-1");
  });

  it("darkens the selected day while hovered, whether or not it has focus", () => {
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
    const selectedDay = screen.getByRole("button", {
      name: /March 10th, 2026/,
    });
    expect(selectedDay).toHaveClass("hover:bg-brand-primary-hover");
    expect(selectedDay).not.toHaveClass(
      "hover:bg-surface-muted",
      "focus:bg-brand-primary",
    );
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
});

describe("calendar year range", () => {
  it("jumps the grid to the year chosen in the Year select", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Date of birth"
        defaultMonth={march2026}
        onSelect={onSelect}
        timeZone="UTC"
        yearRange={{ from: 1906, to: 2026 }}
      />,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Year" }));
    await user.click(screen.getByRole("option", { name: "1994" }));

    // assert
    expect(
      screen.getByRole("grid", { name: "Date of birth, March 1994" }),
    ).toBeInTheDocument();
  });

  it("jumps the grid to the month chosen in the Month select", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Date of birth"
        defaultMonth={march2026}
        onSelect={onSelect}
        timeZone="UTC"
        yearRange={{ from: 1906, to: 2026 }}
      />,
    );

    // act
    await user.click(screen.getByRole("combobox", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: "September" }));

    // assert
    expect(
      screen.getByRole("grid", { name: "Date of birth, September 2026" }),
    ).toBeInTheDocument();
  });

  it("replaces the plain month navigation with labelled month buttons", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Date of birth"
        defaultMonth={march2026}
        onSelect={onSelect}
        timeZone="UTC"
        yearRange={{ from: 1906, to: 2026 }}
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Next month" }));

    // assert
    expect(
      screen.getByRole("grid", { name: "Date of birth, April 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Go to the Next Month" }),
    ).not.toBeInTheDocument();
  });

  it("stops at the last month of the range", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Date of birth"
        defaultMonth={new Date("2026-12-01T12:00:00Z")}
        onSelect={onSelect}
        timeZone="UTC"
        yearRange={{ from: 1906, to: 2026 }}
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeEnabled();
  });

  it("keeps the plain caption when no year range is given", () => {
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
      screen.queryByRole("combobox", { name: "Year" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("March 2026")).toBeInTheDocument();
  });
});

describe("calendar range selection", () => {
  const march12 = new Date("2026-03-12T12:00:00Z");

  it("fills the ends of the range in the brand colour and tints the days between", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Date range"
        mode="range"
        month={march2026}
        onSelect={onSelect}
        required
        selected={{ from: march10, to: march12 }}
        timeZone="UTC"
      />,
    );

    // assert
    const start = screen.getByRole("button", { name: /March 10th, 2026/ });
    const middle = screen.getByRole("button", { name: /March 11th, 2026/ });
    expect(start).toHaveClass("bg-brand-primary", "text-text-inverted");
    expect(middle).toHaveClass("bg-brand-primary-soft", "text-brand-primary");
    expect(middle).not.toHaveClass("bg-brand-primary", "text-text-inverted");
  });

  it("extends a one-day range to the day the visitor picks next", async () => {
    // arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Calendar
        aria-label="Date range"
        mode="range"
        month={march2026}
        onSelect={onSelect}
        required
        selected={{ from: march10, to: march10 }}
        timeZone="UTC"
      />,
    );

    // act
    await user.click(screen.getByRole("button", { name: /March 12th, 2026/ }));

    // assert
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toEqual({
      from: march10,
      to: new Date("2026-03-12T00:00:00Z"),
    });
  });
});
