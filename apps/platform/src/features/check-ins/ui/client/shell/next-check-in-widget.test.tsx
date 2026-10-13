// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureAxe } from "vitest-axe";

import type { ClientCheckIn } from "~/features/check-ins/public/check-ins";

import { NextCheckInWidget } from "./next-check-in-widget";

const TIME_ZONE = "Europe/Bucharest";

const APPROVED: ClientCheckIn = {
  id: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  kind: "ad_hoc",
  status: "approved",
  initiatedBy: "client",
  proposedBy: "client",
  awaitsViewer: false,
  viewerMayWithdraw: false,
  viewerProposal: "allowed",
  viewerMayCancel: true,
  newTimeWaits: false,
  isWaitingRequest: false,
  startsAt: "2026-10-14T07:00:00.000Z",
  endsAt: "2026-10-14T08:00:00.000Z",
  joinEmphasisFrom: "2026-10-14T06:50:00.000Z",
  earlierStartsAt: null,
  moves: 0,
  note: null,
  newTimeNote: null,
};

const axe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderWidget(now: string) {
  vi.setSystemTime(new Date(now));

  return render(
    <MemoryRouter>
      <NextCheckInWidget checkIn={APPROVED} timeZone={TIME_ZONE} />
    </MemoryRouter>,
  );
}

describe("the client's next check-in widget", () => {
  it("names her next check-in with its day and time, a quiet way to join and a way to manage her check-ins", () => {
    // arrange, act
    renderWidget("2026-10-12T08:00:00.000Z");

    // assert
    const widget = screen.getByRole("region", { name: "Next check-in" });
    expect(widget).toHaveTextContent("Wed, Oct 14");
    expect(widget).toHaveTextContent("· 10:00 AM");
    const join = within(widget).getByRole("link", { name: "Join Meet" });
    expect(join).toHaveAttribute(
      "href",
      `/client/checkins/${APPROVED.id}/join`,
    );
    expect(join).not.toHaveClass("bg-primary");
    expect(
      within(widget).getByRole("link", { name: "Manage check-ins" }),
    ).toHaveAttribute("href", "/client/checkins");
  });

  it("emphasises Join Meet from ten minutes before her check-in starts", () => {
    // arrange, act
    renderWidget("2026-10-14T06:52:00.000Z");

    // assert
    expect(screen.getByRole("link", { name: "Join Meet" })).toHaveClass(
      "bg-primary",
    );
  });

  it("passes the axe checks", async () => {
    // arrange
    const { baseElement } = renderWidget("2026-10-12T08:00:00.000Z");

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
