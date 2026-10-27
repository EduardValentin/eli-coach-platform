import type { AssessmentCallSnapshot } from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it } from "vitest";

import { createCoachNotificationEmailContent } from "./coach-notification-email.server";

const JOIN_URL = "https://evoa.fit/book/ac-demo/join";
const CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE";

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
    visitorTimeZone: "America/New_York",
    coachTimeZone: "Europe/Bucharest",
    bookedAt: new Date("2026-02-20T09:41:07.000Z"),
    ...overrides,
  };
}

function createContent(overrides: Partial<AssessmentCallSnapshot> = {}) {
  return createCoachNotificationEmailContent({
    call: createCall(overrides),
    googleCalendarUrl: CALENDAR_URL,
    joinUrl: JOIN_URL,
  });
}

describe("createCoachNotificationEmailContent", () => {
  it("names who booked and when the call is in the coach's own zone", () => {
    // arrange
    // act
    const content = createContent();

    // assert
    expect(content.subject).toBe("New assessment call booked.");
    expect(content.html).toContain("A new assessment call.");
    expect(content.html).toContain("Sofia Marin");
    expect(content.html).toContain('href="mailto:sofia@example.com"');
    expect(content.html).toContain(
      "Monday, 2 March 2026 at 5:00 PM — Europe/Bucharest (GMT+2)",
    );
    expect(content.html).toContain("30 minutes");
    expect(content.text).toContain("WHO: Sofia Marin");
    expect(content.text).toContain("EMAIL: sofia@example.com");
    expect(content.text).toContain(
      "WHEN: Monday, 2 March 2026 at 5:00 PM — Europe/Bucharest (GMT+2)",
    );
    expect(content.text).toContain("HOW LONG: 30 minutes");
  });

  it("tells the coach the visitor's age on her booking day, gender, goal and country", () => {
    // arrange
    // act
    const content = createContent();

    // assert
    expect(content.html).toContain("AGE");
    expect(content.html).toContain("31 (born 14 March 1994)");
    expect(content.html).toContain("Female");
    expect(content.html).toContain("Build strength");
    expect(content.html).toContain("Romania");
    expect(content.text).toContain("AGE: 31 (born 14 March 1994)");
    expect(content.text).toContain("GENDER: Female");
    expect(content.text).toContain("GOAL: Build strength");
    expect(content.text).toContain("COUNTRY: Romania");
  });

  it("offers her phone as a tel link when she left one", () => {
    // arrange
    // act
    const content = createContent();

    // assert
    expect(content.html).toContain('href="tel:+40712345678"');
    expect(content.html).toContain("PHONE");
    expect(content.text).toContain("PHONE: +40712345678");
  });

  it("leaves the phone row out when she left none", () => {
    // arrange
    // act
    const content = createContent({ phone: null });

    // assert
    expect(content.html).not.toContain("PHONE");
    expect(content.html).not.toContain("tel:");
    expect(content.text).not.toContain("PHONE");
  });

  it("orders the rows who, email, phone, age, gender, goal, country, when, how long, what she shared", () => {
    // arrange
    const labels = [
      "WHO",
      "EMAIL",
      "PHONE",
      "AGE",
      "GENDER",
      "GOAL",
      "COUNTRY",
      "WHEN",
      "HOW LONG",
      "WHAT SHE SHARED",
    ];

    // act
    const content = createContent({ visitorNotes: "Sleeps badly" });
    const htmlPositions = labels.map((label) =>
      content.html.indexOf(`>${label}<`),
    );
    const textPositions = labels.map((label) =>
      content.text.indexOf(`${label}: `),
    );

    // assert
    expect(htmlPositions.every((position) => position >= 0)).toBe(true);
    expect(htmlPositions).toEqual([...htmlPositions].sort((a, b) => a - b));
    expect(textPositions.every((position) => position >= 0)).toBe(true);
    expect(textPositions).toEqual([...textPositions].sort((a, b) => a - b));
  });

  it("offers the join link, the Google Calendar link and the attached calendar file", () => {
    // arrange
    // act
    const content = createContent();

    // assert
    expect(content.html).toContain(`href="${JOIN_URL}"`);
    expect(content.html).toContain(`href="${CALENDAR_URL}"`);
    expect(content.html).toContain("calendar file is attached to this email");
    expect(content.text).toContain(`Join the call: ${JOIN_URL}`);
    expect(content.text).toContain(`Add to Google Calendar: ${CALENDAR_URL}`);
    expect(content.text).toContain("calendar file is attached to this email");
  });

  it("passes on what she shared when she wrote something", () => {
    // arrange
    // act
    const content = createContent({
      visitorNotes: "Training around a shoulder niggle",
    });

    // assert
    expect(content.html).toContain("WHAT SHE SHARED");
    expect(content.html).toContain("Training around a shoulder niggle");
    expect(content.text).toContain("WHAT SHE SHARED");
    expect(content.text).toContain("Training around a shoulder niggle");
  });

  it("leaves the shared-note block out when there is nothing to pass on", () => {
    // arrange
    // act
    const content = createContent({ visitorNotes: null });

    // assert
    expect(content.html).not.toContain("WHAT SHE SHARED");
    expect(content.text).not.toContain("WHAT SHE SHARED");
  });

  it("dates the footer from the booking rather than the wall clock", () => {
    // arrange
    // act
    const content = createContent({
      bookedAt: new Date("2025-12-31T23:30:00.000Z"),
    });

    // assert
    expect(content.html).toContain("2025 Evoa Fitness");
    expect(content.text).toContain("2025 Evoa Fitness");
  });

  it("renders a single document-titled HTML email", () => {
    // arrange
    // act
    const content = createContent();

    // assert
    expect(content.html.startsWith("<!doctype html>")).toBe(true);
    expect(content.html).toContain('<html dir="ltr" lang="en">');
    expect(content.html).toContain(
      "<title>New assessment call booked.</title>",
    );
  });
});
