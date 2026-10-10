import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "./calendar-invite.server";
import type { EmailAttachment } from "./product-email-contract.server";
import {
  buildCalendarInvite,
  buildGoogleCalendarUrl,
} from "./calendar-invite.server";

const JOIN_URL = "https://evoa.fit/appointments/apt-demo/join";
const INVITE_OPTIONS = {
  issuedAt: new Date("2026-02-20T09:41:07.000Z"),
  organizerEmail: "contact@evoa.fit",
  productName: "Appointment",
  uidHost: "evoa.fit",
};

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    description: `A session with Eli.\nWith: Sofia Marin\nJoin: ${JOIN_URL}`,
    endsAt: new Date("2026-03-02T15:30:00.000Z"),
    id: "apt-demo",
    joinUrl: JOIN_URL,
    startsAt: new Date("2026-03-02T15:00:00.000Z"),
    title: "Session with Eli",
    ...overrides,
  };
}

function decode(invite: EmailAttachment): string {
  return new TextDecoder().decode(invite.content);
}

function unfold(invite: string): string {
  return invite.replaceAll("\r\n ", "");
}

function contentLines(invite: string): string[] {
  return invite.split("\r\n").slice(0, -1);
}

describe("buildCalendarInvite", () => {
  it("attaches the calendar as invite.ics with a PUBLISH calendar content type", () => {
    // arrange
    const event = createEvent();

    // act
    const invite = buildCalendarInvite(event, INVITE_OPTIONS);

    // assert
    expect(invite.filename).toBe("invite.ics");
    expect(invite.contentType).toBe(
      "text/calendar; charset=utf-8; method=PUBLISH",
    );
  });

  it("writes a PUBLISH calendar whose event names its organizer, is pinned to UTC and is stamped at issue", () => {
    // arrange
    const event = createEvent();

    // act
    const invite = buildCalendarInvite(event, INVITE_OPTIONS);

    // assert
    expect(decode(invite)).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Evoa Fitness//Appointment//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:apt-demo@evoa.fit",
        "DTSTAMP:20260220T094107Z",
        "ORGANIZER;CN=Evoa Fitness:mailto:contact@evoa.fit",
        "DTSTART:20260302T150000Z",
        "DTEND:20260302T153000Z",
        "SUMMARY:Session with Eli",
        "DESCRIPTION:A session with Eli.\\nWith: Sofia Marin\\nJoin: https://evoa.fit/",
        " appointments/apt-demo/join",
        "LOCATION:https://evoa.fit/appointments/apt-demo/join",
        "URL:https://evoa.fit/appointments/apt-demo/join",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });

  it("returns the calendar as UTF-8 bytes", () => {
    // arrange
    const event = createEvent({ description: "With: Ștefania Mureșan" });

    // act
    const invite = buildCalendarInvite(event, INVITE_OPTIONS);

    // assert
    expect(invite.content).toBeInstanceOf(Uint8Array);
    expect(invite.content).toEqual(new TextEncoder().encode(decode(invite)));
  });

  it("escapes backslashes, semicolons, commas and newlines in text values", () => {
    // arrange
    const event = createEvent({
      description: "With: Marin, Sofia; a\\b\nsecond line",
      title: "Eli, check-in; review",
    });

    // act
    const invite = unfold(decode(buildCalendarInvite(event, INVITE_OPTIONS)));

    // assert
    expect(invite).toContain(
      "DESCRIPTION:With: Marin\\, Sofia\\; a\\\\b\\nsecond line\r\n",
    );
    expect(invite).toContain("SUMMARY:Eli\\, check-in\\; review\r\n");
  });

  it("escapes a bare carriage return so a description cannot start a content line of its own", () => {
    // arrange
    const event = createEvent({
      description: "Eve\rLOCATION:https://meet.evil.example/room",
    });

    // act
    const invite = unfold(decode(buildCalendarInvite(event, INVITE_OPTIONS)));

    // assert
    const lines = invite.split(/\r\n|\r|\n/);

    expect(lines.filter((line) => line.startsWith("LOCATION:"))).toEqual([
      `LOCATION:${JOIN_URL}`,
    ]);
    expect(invite).toContain(
      "DESCRIPTION:Eve\\nLOCATION:https://meet.evil.example/room\r\n",
    );
  });

  it("folds every content line to 75 octets without losing the value", () => {
    // arrange
    const event = createEvent({ description: "Ștefania".repeat(20) });

    // act
    const invite = decode(buildCalendarInvite(event, INVITE_OPTIONS));

    // assert
    for (const line of contentLines(invite)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfold(invite)).toContain(
      `DESCRIPTION:${"Ștefania".repeat(20)}\r\n`,
    );
  });

  it("keeps the UTC window across the Bucharest daylight-saving end", () => {
    // arrange
    const event = createEvent({
      startsAt: new Date("2026-10-25T05:00:00.000Z"),
      endsAt: new Date("2026-10-25T05:30:00.000Z"),
    });

    // act
    const invite = decode(buildCalendarInvite(event, INVITE_OPTIONS));

    // assert
    expect(invite).toContain("DTSTART:20261025T050000Z\r\n");
    expect(invite).toContain("DTEND:20261025T053000Z\r\n");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("templates the event with the UTC window and the recipient time zone", () => {
    // arrange
    const event = createEvent();

    // act
    const url = new URL(buildGoogleCalendarUrl(event, "Europe/Bucharest"));

    // assert
    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Session with Eli");
    expect(url.searchParams.get("dates")).toBe(
      "20260302T150000Z/20260302T153000Z",
    );
    expect(url.searchParams.get("location")).toBe(JOIN_URL);
    expect(url.searchParams.get("details")).toBe(event.description);
    expect(url.searchParams.get("ctz")).toBe("Europe/Bucharest");
  });

  it("templates the recipient's own zone for an event after the daylight-saving end", () => {
    // arrange
    const event = createEvent({
      startsAt: new Date("2026-10-25T05:00:00.000Z"),
      endsAt: new Date("2026-10-25T05:30:00.000Z"),
    });

    // act
    const url = new URL(buildGoogleCalendarUrl(event, "America/New_York"));

    // assert
    expect(url.searchParams.get("dates")).toBe(
      "20261025T050000Z/20261025T053000Z",
    );
    expect(url.searchParams.get("ctz")).toBe("America/New_York");
  });
});
