// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SlotPicker, type SlotPickerDay, type SlotPickerWording } from ".";

const TODAY = new Date("2026-03-02T06:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";
const EARLY_SLOT = "2026-03-03T15:00:00.000Z";
const LATE_SLOT = "2026-03-03T16:00:00.000Z";
const SLOT_DAY = "2026-03-03";
const CALENDAR_TOP = 62;
const CALENDAR_BOTTOM = 400;
const TIMES_HEIGHT = 300;

const WORDING: SlotPickerWording = {
  availableDays: "Open days",
  changeDate: "Pick another day",
  noOpenSlots: "Nothing open",
  pastDay: "Gone",
  selected: "chosen",
  today: "Now",
};

const DAYS: ReadonlyMap<string, SlotPickerDay> = new Map([
  [
    SLOT_DAY,
    {
      heading: "The third",
      slots: [
        { label: "Early", startsAt: EARLY_SLOT },
        { label: "Late", startsAt: LATE_SLOT },
      ],
    },
  ],
]);

const ZONED_DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: TIME_ZONE,
  year: "numeric",
});

function dayKeyOf(date: Date) {
  return ZONED_DAY_KEY.format(date);
}

function dayNameOf(date: Date) {
  return `Day ${dayKeyOf(date)}`;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function layOut(timesTop: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const isCalendar = this.querySelector('[role="grid"]') !== null;
      const top = isCalendar ? CALENDAR_TOP : timesTop;
      const bottom = isCalendar ? CALENDAR_BOTTOM : timesTop + TIMES_HEIGHT;

      return {
        bottom,
        height: bottom - top,
        left: 0,
        right: 320,
        toJSON: () => ({}),
        top,
        width: 320,
        x: 0,
        y: top,
      } as DOMRect;
    },
  );
}

function Harness(props: { onSelectSlot?: (startsAt: string) => void }) {
  const { onSelectSlot } = props;
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  return (
    <SlotPicker
      dayKeyOf={dayKeyOf}
      dayNameOf={dayNameOf}
      days={DAYS}
      onSelectDay={setSelectedDayKey}
      onSelectSlot={(startsAt) => {
        setSelectedSlot(startsAt);
        onSelectSlot?.(startsAt);
      }}
      selectedDayKey={selectedDayKey}
      selectedSlot={selectedSlot}
      timeZone={TIME_ZONE}
      wording={WORDING}
    />
  );
}

function calendarGrid() {
  return screen.getByRole("grid", { name: "Open days, March 2026" });
}

async function pickTheOpenDay(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(calendarGrid()).getByRole("button", { name: "Day 2026-03-03" }),
  );
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe("the slot picker's calendar", () => {
  it("names each day with the caller's wording for today, past days and days without slots", () => {
    // arrange
    render(<Harness />);

    // act
    const grid = calendarGrid();

    // assert
    expect(
      within(grid).getByRole("button", {
        name: "Now, Day 2026-03-02, Nothing open",
      }),
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole("button", { name: "Day 2026-03-01, Gone" }),
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole("button", { name: "Day 2026-03-03" }),
    ).toBeEnabled();
  });

  it("names the chosen day as chosen in the caller's wording", async () => {
    // arrange
    const user = userEvent.setup();
    render(<Harness />);

    // act
    await pickTheOpenDay(user);

    // assert
    expect(
      within(calendarGrid()).getByRole("button", {
        name: "Day 2026-03-03, chosen",
      }),
    ).toBeInTheDocument();
  });
});

describe("the slot picker's times", () => {
  it("shows no times until a day is chosen", () => {
    // arrange
    // act
    render(<Harness />);

    // assert
    expect(
      screen.queryByRole("heading", { name: "The third" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Early" }),
    ).not.toBeInTheDocument();
  });

  it("heads the chosen day's times with the caller's heading and labels", async () => {
    // arrange
    const user = userEvent.setup();
    render(<Harness />);

    // act
    await pickTheOpenDay(user);

    // assert
    expect(
      screen.getByRole("heading", { level: 3, name: "The third" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Early" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Late" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pick another day" }),
    ).toBeInTheDocument();
  });

  it("hands back the start of the time she picks and marks it pressed", async () => {
    // arrange
    const onSelectSlot = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelectSlot={onSelectSlot} />);
    await pickTheOpenDay(user);

    // act
    await user.click(screen.getByRole("button", { name: "Late" }));

    // assert
    expect(onSelectSlot).toHaveBeenCalledWith(LATE_SLOT);
    expect(screen.getByRole("button", { name: "Late" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("scrolls the times into view when they render below the calendar", async () => {
    // arrange
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    layOut(CALENDAR_BOTTOM + 32);
    const user = userEvent.setup();
    render(<Harness />);

    // act
    await pickTheOpenDay(user);

    // assert
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("leaves the page still when the times render beside the calendar", async () => {
    // arrange
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    layOut(CALENDAR_TOP);
    const user = userEvent.setup();
    render(<Harness />);

    // act
    await pickTheOpenDay(user);

    // assert
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
