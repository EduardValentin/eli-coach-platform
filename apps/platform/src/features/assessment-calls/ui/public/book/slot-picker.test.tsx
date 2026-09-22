// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SlotPicker } from "./slot-picker";

const TODAY = new Date("2026-03-02T06:00:00.000Z");
const TIME_ZONE = "Europe/Bucharest";
const SLOT = "2026-03-03T15:00:00.000Z";
const SLOT_DAY = "2026-03-03";
const CALENDAR_TOP = 62;
const CALENDAR_BOTTOM = 400;
const TIMES_HEIGHT = 300;

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

function Harness() {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  return (
    <SlotPicker
      onSelectDay={setSelectedDayKey}
      onSelectSlot={() => {}}
      selectedDayKey={selectedDayKey}
      selectedSlot={null}
      slotsByDay={new Map([[SLOT_DAY, [SLOT]]])}
      timeZone={TIME_ZONE}
    />
  );
}

async function pickTheOpenDay(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(screen.getByRole("grid")).getByRole("button", {
      name: "Tuesday, 3 March 2026",
    }),
  );
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe("the slot picker", () => {
  it("scrolls the times into view when they render below the calendar", async () => {
    // arrange
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
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
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    layOut(CALENDAR_TOP);
    const user = userEvent.setup();
    render(<Harness />);

    // act
    await pickTheOpenDay(user);

    // assert
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
