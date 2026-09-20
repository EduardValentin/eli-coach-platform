// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { useCoachClock } from "./use-coach-clock";

afterEach(() => {
  cleanup();
});

const SERVER_NOW = "2026-09-20T09:00:00.000Z";
const COACH_TIME_ZONE = "Pacific/Kiritimati";

function CoachClockProbe() {
  const { now, timeZone } = useCoachClock(SERVER_NOW, COACH_TIME_ZONE);

  return (
    <p>
      {now.toISOString()} in {timeZone}
    </p>
  );
}

describe("the coach's clock", () => {
  it("paints the server's instant in the coach's zone before the browser runs", () => {
    // arrange, act
    const painted = renderToString(<CoachClockProbe />);

    // assert
    expect(painted).toContain(SERVER_NOW);
    expect(painted).toContain(COACH_TIME_ZONE);
  });

  it("reads the browser's own clock and zone once it has mounted", () => {
    // arrange
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const beforeRender = Date.now();

    // act
    render(<CoachClockProbe />);

    // assert
    const reading = screen.getByText(/ in /).textContent ?? "";
    const [instant] = reading.split(" in ");

    expect(reading).toContain(browserZone);
    expect(Date.parse(instant)).toBeGreaterThanOrEqual(beforeRender);
  });
});
