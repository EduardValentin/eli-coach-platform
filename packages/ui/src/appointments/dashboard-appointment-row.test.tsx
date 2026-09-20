// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DashboardAppointmentRow } from "./dashboard-appointment-row";

afterEach(() => {
  cleanup();
});

describe("dashboard appointment row", () => {
  it("states the attendee and the moment on one line", () => {
    // arrange, act
    render(
      <DashboardAppointmentRow
        action={<button type="button">Join call</button>}
        attendeeName="Ana Popescu"
        when={{ date: "Sun, Sep 20", time: "12:36 AM" }}
      />,
    );

    // assert
    expect(screen.getByText("Ana Popescu")).toBeInTheDocument();
    expect(screen.getByText("Sun, Sep 20").closest("p")).toHaveTextContent(
      "Sun, Sep 20 at 12:36 AM",
    );
  });

  it("shows the badges beside the name and the action at the end", () => {
    // arrange, act
    render(
      <DashboardAppointmentRow
        action={<button type="button">Join call</button>}
        attendeeName="Ana Popescu"
        badges={<span>Today</span>}
        when={{ date: "Sun, Sep 20", time: "12:36 AM" }}
      />,
    );

    // assert
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join call" }),
    ).toBeInTheDocument();
  });

  it("keeps the date and the time from breaking mid-phrase", () => {
    // arrange, act
    render(
      <DashboardAppointmentRow
        action={<button type="button">Join call</button>}
        attendeeName="Ana Popescu"
        when={{ date: "Sun, Sep 20", time: "12:36 AM" }}
      />,
    );

    // assert
    expect(screen.getByText("Sun, Sep 20")).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("12:36 AM")).toHaveClass("whitespace-nowrap");
  });
});
