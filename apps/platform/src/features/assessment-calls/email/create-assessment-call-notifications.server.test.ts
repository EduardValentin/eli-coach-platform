import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import { createAssessmentCallNotifications } from "./create-assessment-call-notifications.server";
import { EmailAssessmentCallNotifications } from "./email-assessment-call-notifications.server";

describe("createAssessmentCallNotifications", () => {
  it("returns the email assessment call notifications", () => {
    // arrange
    const productEmail = new InMemoryProductEmail();

    // act
    const notifications = createAssessmentCallNotifications(productEmail, {
      appBasePath: "/",
      coachEmail: "eli@evoa.fit",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://evoa.fit",
    });

    // assert
    expect(notifications).toBeInstanceOf(EmailAssessmentCallNotifications);
  });

  it("sends both emails through the product email it was given", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createAssessmentCallNotifications(productEmail, {
      appBasePath: "/",
      coachEmail: "eli@evoa.fit",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://evoa.fit",
    });

    // act
    const result = await notifications.notifyBooked({
      id: "ac-demo",
      visitorName: "Sofia Marin",
      visitorEmail: "sofia@example.com",
      visitorNotes: null,
      startsAt: new Date("2026-03-02T15:00:00.000Z"),
      endsAt: new Date("2026-03-02T15:30:00.000Z"),
      visitorTimeZone: "Europe/Bucharest",
      coachTimeZone: "Europe/Bucharest",
      bookedAt: new Date("2026-02-20T09:41:07.000Z"),
    });

    // assert
    expect(result).toEqual({ coach: "sent", visitor: "sent" });
    expect(productEmail.sent.map((command) => command.to)).toEqual([
      "sofia@example.com",
      "eli@evoa.fit",
    ]);
  });
});
