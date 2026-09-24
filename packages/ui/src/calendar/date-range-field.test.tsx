// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DateRangeField, type IsoDateRange } from "./date-range-field";

const NO_RANGE: IsoDateRange = { from: null, to: null };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function RangeHarness() {
  const [range, setRange] = useState<IsoDateRange>(NO_RANGE);

  return (
    <DateRangeField aria-label="Date range" onChange={setRange} value={range} />
  );
}

function rangeField() {
  return screen.getByRole("button", { name: "Date range" });
}

describe("the date range field", () => {
  it("reads as unset until a range is picked", () => {
    // arrange, act
    render(<RangeHarness />);

    // assert
    expect(rangeField()).toHaveTextContent("Pick dates");
  });

  it("shrinks to the small control height when asked", () => {
    // arrange, act
    render(
      <DateRangeField
        aria-label="Date range"
        onChange={() => undefined}
        size="sm"
        value={NO_RANGE}
      />,
    );

    // assert
    expect(rangeField()).toHaveClass("h-(--size-control-sm)", "text-sm");
  });

  it("stays in Safari's default Tab order like the native field it replaces", () => {
    // arrange, act
    render(<RangeHarness />);

    // assert
    expect(rangeField()).toHaveAttribute("tabindex", "0");
  });

  it("names the span a range covers, once with the year they share", () => {
    // arrange, act
    render(
      <DateRangeField
        aria-label="Date range"
        onChange={vi.fn()}
        value={{ from: "2026-09-18", to: "2026-09-22" }}
      />,
    );

    // assert
    expect(rangeField()).toHaveTextContent("18 Sep – 22 Sep 2026");
  });

  it("names both years when the range crosses one", () => {
    // arrange, act
    render(
      <DateRangeField
        aria-label="Date range"
        onChange={vi.fn()}
        value={{ from: "2025-02-23", to: "2026-10-24" }}
      />,
    );

    // assert
    expect(rangeField()).toHaveTextContent("23 Feb 2025 – 24 Oct 2026");
  });

  it("keeps the calendar open between the first and the second day", async () => {
    // arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<RangeHarness />);

    // act
    await user.click(rangeField());
    await user.click(
      screen.getByRole("button", { name: /September 18th, 2026/ }),
    );

    // assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("closes on the second day and names the span it covers", async () => {
    // arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<RangeHarness />);

    // act
    await user.click(rangeField());
    await user.click(
      screen.getByRole("button", { name: /September 18th, 2026/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /September 22nd, 2026/ }),
    );

    // assert
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(rangeField()).toHaveTextContent("18 Sep – 22 Sep 2026");
  });

  it("starts a fresh pair of picks each time it opens", async () => {
    // arrange
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<RangeHarness />);
    await user.click(rangeField());
    await user.click(
      screen.getByRole("button", { name: /September 18th, 2026/ }),
    );
    await user.keyboard("{Escape}");

    // act
    await user.click(rangeField());
    await user.click(
      screen.getByRole("button", { name: /September 22nd, 2026/ }),
    );

    // assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(rangeField()).toHaveTextContent("18 Sep – 22 Sep 2026");
  });
});
