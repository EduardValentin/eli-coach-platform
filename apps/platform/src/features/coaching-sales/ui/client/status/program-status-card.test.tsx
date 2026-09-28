// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";

import { ProgramStatusCard } from "./program-status-card";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function readerIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

describe("ProgramStatusCard", () => {
  it("labels the section, names her onboarding as sent and tells her Eli will start soon", () => {
    // arrange
    const status: ProgramStatus = {
      kind: "submitted",
      submittedAt: "2026-10-01T09:00:00.000Z",
      workStartsOn: null,
    };

    // act
    render(<ProgramStatusCard status={status} />);

    // assert
    expect(
      screen.getByRole("region", { name: "Your onboarding" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent to your coach")).toBeInTheDocument();
    expect(
      screen.getByText("Eli has your answers and will start on them soon."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Let Eli start now" }),
    ).not.toBeInTheDocument();
  });

  it("tells her the date Eli starts on when she kept her right of withdrawal, in her own time zone", () => {
    // arrange
    readerIsIn("Europe/Bucharest");
    const status: ProgramStatus = {
      kind: "submitted",
      submittedAt: "2026-10-01T09:00:00.000Z",
      workStartsOn: "2026-10-11T22:30:00.000Z",
    };

    // act
    render(<ProgramStatusCard status={status} />);

    // assert
    expect(
      screen.getByText(
        "Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on 12 October. Your program will be delivered as soon as it is completed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Let Eli start now" }),
    ).not.toBeInTheDocument();
  });
});
