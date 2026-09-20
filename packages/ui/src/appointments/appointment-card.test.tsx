// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppointmentCard } from "./appointment-card";

afterEach(() => {
  cleanup();
});

const ATTENDEE = { email: "ana@example.com", name: "Ana Popescu" };
const WHEN = { date: "Sun, Sep 20", time: "12:36 AM" };

describe("appointment card", () => {
  it("names the attendee and when the appointment falls", () => {
    // arrange, act
    render(<AppointmentCard attendee={{ name: "Ana Popescu" }} when={WHEN} />);

    // assert
    expect(screen.getByText("Ana Popescu")).toBeInTheDocument();
    expect(screen.getByText("Sun, Sep 20")).toBeInTheDocument();
    expect(screen.getByText("12:36 AM")).toBeInTheDocument();
  });

  it("offers the attendee's address as a mail link", () => {
    // arrange, act
    render(<AppointmentCard attendee={ATTENDEE} when={WHEN} />);

    // assert
    expect(
      screen.getByRole("link", { name: /ana@example.com/ }),
    ).toHaveAttribute("href", "mailto:ana@example.com");
  });

  it("leaves the address out when there is none to show", () => {
    // arrange, act
    render(<AppointmentCard attendee={{ name: "Ana Popescu" }} when={WHEN} />);

    // assert
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("titles the card as a heading when the list around it needs one", () => {
    // arrange, act
    render(
      <AppointmentCard attendee={ATTENDEE} titleElement="h2" when={WHEN} />,
    );

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Ana Popescu" }),
    ).toBeInTheDocument();
  });

  it("keeps the line breaks of a quoted note", () => {
    // arrange, act
    render(
      <AppointmentCard
        attendee={ATTENDEE}
        quote={"First line\nSecond line"}
        when={WHEN}
      />,
    );

    // assert
    const quote = screen.getByText(/First line/);

    expect(quote).toHaveTextContent('"First line Second line"');
    expect(quote).toHaveClass("whitespace-pre-line");
  });

  it("mutes a card whose appointment has already happened", () => {
    // arrange, act
    const { container } = render(
      <AppointmentCard attendee={ATTENDEE} status="past" when={WHEN} />,
    );

    // assert
    expect(container.firstElementChild).toHaveClass("text-text-muted");
  });

  it("carries the badges and the actions the caller hands it", () => {
    // arrange, act
    render(
      <AppointmentCard
        actions={<button type="button">Join call</button>}
        attendee={ATTENDEE}
        badges={<span>Today</span>}
        when={WHEN}
      />,
    );

    // assert
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join call" }),
    ).toBeInTheDocument();
  });
});
