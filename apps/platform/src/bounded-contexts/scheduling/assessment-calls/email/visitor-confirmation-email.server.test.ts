import type { AssessmentCallSnapshot } from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it } from "vitest";

import { createVisitorConfirmationEmailContent } from "./visitor-confirmation-email.server";

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
    visitorTimeZone: "Europe/Bucharest",
    coachTimeZone: "Europe/Bucharest",
    bookedAt: new Date("2026-02-20T09:41:07.000Z"),
    ...overrides,
  };
}

function createContent(overrides: Partial<AssessmentCallSnapshot> = {}) {
  return createVisitorConfirmationEmailContent({
    call: createCall(overrides),
    contactEmail: "contact@evoa.fit",
    googleCalendarUrl: CALENDAR_URL,
    joinUrl: JOIN_URL,
  });
}

describe("createVisitorConfirmationEmailContent", () => {
  it("announces the booking and names the call in the visitor's own zone", () => {
    // arrange
    // act
    const content = createContent();

    // assert
    expect(content.subject).toBe("Your free assessment call is booked.");
    expect(content.html).toContain("Your call is booked.");
    expect(content.html).toContain(
      "Monday, 2 March 2026 at 5:00 PM — Europe/Bucharest (GMT+2)",
    );
    expect(content.html).toContain("30 minutes");
    expect(content.text).toContain(
      "Monday, 2 March 2026 at 5:00 PM — Europe/Bucharest (GMT+2)",
    );
    expect(content.text).toContain("30 minutes");
  });

  it("names the call in a visitor zone away from the coach's", () => {
    // arrange
    // act
    const content = createContent({ visitorTimeZone: "America/New_York" });

    // assert
    expect(content.html).toContain(
      "Monday, 2 March 2026 at 10:00 AM — America/New_York (GMT-5)",
    );
    expect(content.text).toContain(
      "Monday, 2 March 2026 at 10:00 AM — America/New_York (GMT-5)",
    );
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

  it("greets the visitor by her first name and tells her where the confirmation went", () => {
    // arrange
    // act
    const content = createContent();

    // assert
    expect(content.html).toContain("Hi Sofia,");
    expect(content.html).not.toContain("Hi Sofia Marin,");
    expect(content.html).toContain("sofia@example.com");
    expect(content.html).toContain('href="mailto:contact@evoa.fit"');
    expect(content.text).toContain("Hi Sofia,");
    expect(content.text).toContain("sofia@example.com");
    expect(content.text).toContain("contact@evoa.fit");
  });

  it("repeats what the visitor shared when she wrote something", () => {
    // arrange
    // act
    const content = createContent({
      visitorNotes: "Recovering from a knee injury",
    });

    // assert
    expect(content.html).toContain("WHAT YOU SHARED");
    expect(content.html).toContain("Recovering from a knee injury");
    expect(content.text).toContain("WHAT YOU SHARED");
    expect(content.text).toContain("Recovering from a knee injury");
  });

  it("leaves the shared-note block out when there is nothing to repeat", () => {
    // arrange
    // act
    const content = createContent({ visitorNotes: "   " });

    // assert
    expect(content.html).not.toContain("WHAT YOU SHARED");
    expect(content.text).not.toContain("WHAT YOU SHARED");
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
      "<title>Your free assessment call is booked.</title>",
    );
  });
});
