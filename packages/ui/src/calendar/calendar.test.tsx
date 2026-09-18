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
    expect(grid).toHaveClass("table-fixed", "w-full");
    expect(dayButton).toHaveClass("w-full", "aspect-square", "max-w-11");
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
    ).toHaveClass("group-data-[outside=true]:text-text-secondary");
  });
});

describe("calendar day marks", () => {
  it("rings today in the brand colour and rounds each day to the small corner", () => {
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
      "rounded-sm",
      "font-medium",
      "group-data-[today=true]:ring-2",
      "group-data-[today=true]:ring-brand-primary/30",
    );
    expect(dayButton).not.toHaveClass(
      "rounded-pill",
      "group-data-[today=true]:text-brand-primary",
    );
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
      "text-label",
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
      screen.getByRole("button", { name: /March 10th, 2026/ }).closest("td"),
    ).toHaveClass("pt-1");
  });

  it("keeps the selected day in the brand colour while hovered", () => {
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
    expect(selectedDay).toHaveClass(
      "group-data-[selected=true]:hover:bg-brand-primary",
    );
    expect(selectedDay).not.toHaveClass(
      "group-data-[selected=true]:hover:bg-brand-primary-hover",
    );
  });

  it("fades a month button that cannot move further", () => {
    // arrange
    const onSelect = vi.fn();

    // act
    render(
      <Calendar
        aria-label="Available days"
        month={march2026}
        onSelect={onSelect}
        startMonth={march2026}
        timeZone="UTC"
      />,
    );

    // assert
    const previousMonth = screen.getByRole("button", {
      name: "Go to the Previous Month",
    });
    expect(previousMonth).toHaveAttribute("aria-disabled", "true");
    expect(previousMonth).toHaveClass("aria-disabled:opacity-30");
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
