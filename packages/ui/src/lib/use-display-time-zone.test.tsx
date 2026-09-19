// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDisplayTimeZone } from "./use-display-time-zone";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function TimeZoneProbe(props: { coachTimeZone: string | null }) {
  const timeZone = useDisplayTimeZone(props.coachTimeZone);

  return <p>zone: {timeZone}</p>;
}

describe("display time zone", () => {
  it("shows the reader's own zone once the browser has rendered", () => {
    // arrange
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // act
    render(<TimeZoneProbe coachTimeZone="Pacific/Kiritimati" />);

    // assert
    expect(screen.getByText(`zone: ${browserZone}`)).toBeInTheDocument();
  });

  it("falls back to the reader's own zone when no coach zone is offered", () => {
    // arrange
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // act
    render(<TimeZoneProbe coachTimeZone={null} />);

    // assert
    expect(screen.getByText(`zone: ${browserZone}`)).toBeInTheDocument();
  });
});
