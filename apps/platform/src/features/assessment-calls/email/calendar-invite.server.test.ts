import type { AssessmentCallSnapshot } from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it } from "vitest";

import { buildGoogleCalendarUrl, buildIcs } from "./calendar-invite.server";

const JOIN_URL = "https://evoa.fit/book/ac-demo/join";
const UID_HOST = "evoa.fit";
const INVITE_OPTIONS = {
  joinUrl: JOIN_URL,
  organizerEmail: "contact@evoa.fit",
  uidHost: UID_HOST,
};

function createCall(
  overrides: Partial<AssessmentCallSnapshot> = {},
): AssessmentCallSnapshot {
  return {
    id: "ac-demo",
    firstName: "Sofia",
    lastName: "Marin",
    fullName: "Sofia Marin",
    visitorEmail: "sofia@example.com",
    visitorNotes: null,
    dateOfBirth: "1994-03-14",
    gender: "female",
    primaryGoal: "build_strength",
    country: "RO",
    phone: "+40712345678",
    startsAt: new Date("2026-03-02T15:00:00.000Z"),
    endsAt: new Date("2026-03-02T15:30:00.000Z"),
    visitorTimeZone: "Europe/Bucharest",
    coachTimeZone: "Europe/Bucharest",
    bookedAt: new Date("2026-02-20T09:41:07.000Z"),
    ...overrides,
  };
}

function decode(invite: Uint8Array): string {
  return new TextDecoder().decode(invite);
}

function unfold(invite: string): string {
  return invite.replaceAll("\r\n ", "");
}

function contentLines(invite: string): string[] {
  return invite.split("\r\n").slice(0, -1);
}

describe("buildIcs", () => {
  it("writes a PUBLISH calendar whose event names its organizer, is pinned to UTC and is stamped from the booking", () => {
    // arrange
    const call = createCall();

    // act
    const invite = buildIcs(call, INVITE_OPTIONS);

    // assert
    expect(decode(invite)).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Evoa Fitness//Assessment Call//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:ac-demo@evoa.fit",
        "DTSTAMP:20260220T094107Z",
        "ORGANIZER;CN=Evoa Fitness:mailto:contact@evoa.fit",
        "DTSTART:20260302T150000Z",
        "DTEND:20260302T153000Z",
        "SUMMARY:Free assessment call with Eli",
        "DESCRIPTION:A free 30-minute assessment call with Eli.\\nBooked by: Sofia Ma",
        " rin\\nJoin the call: https://evoa.fit/book/ac-demo/join",
        "LOCATION:https://evoa.fit/book/ac-demo/join",
        "URL:https://evoa.fit/book/ac-demo/join",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });

  it("returns the calendar as UTF-8 bytes", () => {
    // arrange
    const call = createCall({ fullName: "Ștefania Mureșan" });

    // act
    const invite = buildIcs(call, INVITE_OPTIONS);

    // assert
    expect(invite).toBeInstanceOf(Uint8Array);
    expect(invite).toEqual(new TextEncoder().encode(decode(invite)));
  });

  it("escapes backslashes, semicolons, commas and newlines in text values", () => {
    // arrange
    const call = createCall({ fullName: "Marin, Sofia; a\\b\nsecond line" });

    // act
    const invite = unfold(decode(buildIcs(call, INVITE_OPTIONS)));

    // assert
    expect(invite).toContain(
      "Booked by: Marin\\, Sofia\\; a\\\\b\\nsecond line\\nJoin the call:",
    );
  });

  it("escapes a bare carriage return so a name cannot start a content line of its own", () => {
    // arrange
    const call = createCall({
      fullName: "Eve\rLOCATION:https://meet.evil.example/room",
    });

    // act
    const invite = unfold(decode(buildIcs(call, INVITE_OPTIONS)));

    // assert
    const lines = invite.split(/\r\n|\r|\n/);

    expect(lines.filter((line) => line.startsWith("LOCATION:"))).toEqual([
      `LOCATION:${JOIN_URL}`,
    ]);
    expect(invite).toContain(
      "Booked by: Eve\\nLOCATION:https://meet.evil.example/room\\nJoin the call:",
    );
  });

  it("folds every content line to 75 octets without losing the value", () => {
    // arrange
    const call = createCall({ fullName: "Ștefania".repeat(20) });

    // act
    const invite = decode(buildIcs(call, INVITE_OPTIONS));

    // assert
    for (const line of contentLines(invite)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfold(invite)).toContain(
      `Booked by: ${"Ștefania".repeat(20)}\\nJoin the call:`,
    );
  });

  it("keeps the UTC window across the Bucharest daylight-saving end", () => {
    // arrange
    const call = createCall({
      startsAt: new Date("2026-10-25T05:00:00.000Z"),
      endsAt: new Date("2026-10-25T05:30:00.000Z"),
    });

    // act
    const invite = decode(buildIcs(call, INVITE_OPTIONS));

    // assert
    expect(invite).toContain("DTSTART:20261025T050000Z\r\n");
    expect(invite).toContain("DTEND:20261025T053000Z\r\n");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("templates the event with the UTC window and the recipient time zone", () => {
    // arrange
    const call = createCall();

    // act
    const url = new URL(
      buildGoogleCalendarUrl(call, {
        joinUrl: JOIN_URL,
        timeZone: "Europe/Bucharest",
      }),
    );

    // assert
    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Free assessment call with Eli");
    expect(url.searchParams.get("dates")).toBe(
      "20260302T150000Z/20260302T153000Z",
    );
    expect(url.searchParams.get("location")).toBe(JOIN_URL);
    expect(url.searchParams.get("details")).toContain(JOIN_URL);
    expect(url.searchParams.get("ctz")).toBe("Europe/Bucharest");
  });

  it("templates the recipient's own zone for a call after the daylight-saving end", () => {
    // arrange
    const call = createCall({
      startsAt: new Date("2026-10-25T05:00:00.000Z"),
      endsAt: new Date("2026-10-25T05:30:00.000Z"),
    });

    // act
    const url = new URL(
      buildGoogleCalendarUrl(call, {
        joinUrl: JOIN_URL,
        timeZone: "America/New_York",
      }),
    );

    // assert
    expect(url.searchParams.get("dates")).toBe(
      "20261025T050000Z/20261025T053000Z",
    );
    expect(url.searchParams.get("ctz")).toBe("America/New_York");
  });
});
