import type { AssessmentCallSnapshot } from "@eli-coach-platform/domain/assessment-call";
import type {
  ProductEmail,
  ProductEmailCommand,
} from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it, vi } from "vitest";

import { EmailAssessmentCallNotifications } from "./email-assessment-call-notifications.server";

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

function createProductEmail() {
  return {
    provider: "resend",
    send: vi.fn().mockResolvedValue({
      kind: "sent",
      providerMessageId: "email_123",
    }),
  } satisfies ProductEmail;
}

function createNotifications(productEmail: ProductEmail) {
  return new EmailAssessmentCallNotifications(productEmail, {
    appBasePath: "/",
    coachEmail: "eli@evoa.fit",
    contactEmail: "contact@evoa.fit",
    publicAppUrl: "https://evoa.fit",
  });
}

function sentTo(
  productEmail: { send: ReturnType<typeof vi.fn> },
  recipient: string,
): ProductEmailCommand {
  const command = productEmail.send.mock.calls
    .map((call) => call[0] as ProductEmailCommand)
    .find((candidate) => candidate.to === recipient);

  if (!command) {
    throw new Error(`Expected an email addressed to ${recipient}.`);
  }

  return command;
}

describe("EmailAssessmentCallNotifications", () => {
  it("writes to the visitor and the coach, each in their own time zone", async () => {
    // arrange
    const productEmail = createProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.notifyBooked(createCall());

    // assert
    expect(result).toEqual({ coach: "sent", visitor: "sent" });
    expect(productEmail.send).toHaveBeenCalledTimes(2);

    const visitorEmail = sentTo(productEmail, "sofia@example.com");
    const coachEmail = sentTo(productEmail, "eli@evoa.fit");

    expect(visitorEmail.subject).toBe("Your free assessment call is booked.");
    expect(visitorEmail.html).toContain(
      "Monday, 2 March 2026 at 10:00 AM — America/New_York (GMT-5)",
    );
    expect(coachEmail.subject).toBe("New assessment call booked.");
    expect(coachEmail.html).toContain(
      "Monday, 2 March 2026 at 5:00 PM — Europe/Bucharest (GMT+2)",
    );
  });

  it("carries the absolute join link and a matching Google Calendar link into both emails", async () => {
    // arrange
    const productEmail = createProductEmail();
    const notifications = new EmailAssessmentCallNotifications(productEmail, {
      appBasePath: "/eli-coach-platform",
      coachEmail: "eli@evoa.fit",
      contactEmail: "contact@evoa.fit",
      publicAppUrl: "https://evoa.fit",
    });

    // act
    await notifications.notifyBooked(createCall());

    // assert
    const joinUrl = "https://evoa.fit/eli-coach-platform/book/ac-demo/join";

    for (const recipient of ["sofia@example.com", "eli@evoa.fit"]) {
      const email = sentTo(productEmail, recipient);

      expect(email.text).toContain(`Join the call: ${joinUrl}`);
      expect(email.html).toContain(`href="${joinUrl}"`);
      expect(email.html).toContain(
        "https://calendar.google.com/calendar/render",
      );
    }
    expect(sentTo(productEmail, "sofia@example.com").html).toContain(
      "ctz=America%2FNew_York",
    );
    expect(sentTo(productEmail, "eli@evoa.fit").html).toContain(
      "ctz=Europe%2FBucharest",
    );
  });

  it("attaches the same calendar invite to both emails", async () => {
    // arrange
    const productEmail = createProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.notifyBooked(createCall());

    // assert
    const attachments = ["sofia@example.com", "eli@evoa.fit"].map(
      (recipient) => sentTo(productEmail, recipient).attachments?.[0],
    );

    for (const attachment of attachments) {
      expect(attachment?.filename).toBe("invite.ics");
      expect(attachment?.contentType).toBe(
        "text/calendar; charset=utf-8; method=PUBLISH",
      );
      expect(new TextDecoder().decode(attachment?.content)).toContain(
        "UID:ac-demo@evoa.fit\r\n",
      );
      expect(new TextDecoder().decode(attachment?.content)).toContain(
        "ORGANIZER;CN=Evoa Fitness:mailto:contact@evoa.fit\r\n",
      );
    }
    expect(attachments[0]?.content).toEqual(attachments[1]?.content);
  });

  it("routes the coach's reply to the visitor and leaves the visitor's on the default", async () => {
    // arrange
    const productEmail = createProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.notifyBooked(createCall());

    // assert
    expect(sentTo(productEmail, "eli@evoa.fit").replyTo).toBe(
      "sofia@example.com",
    );
    expect(sentTo(productEmail, "sofia@example.com").replyTo).toBeUndefined();
  });

  it("keys each send so a retry cannot double-send either email", async () => {
    // arrange
    const productEmail = createProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.notifyBooked(createCall());

    // assert
    expect(sentTo(productEmail, "sofia@example.com").idempotencyKey).toBe(
      "assessment-call:ac-demo:visitor",
    );
    expect(sentTo(productEmail, "eli@evoa.fit").idempotencyKey).toBe(
      "assessment-call:ac-demo:coach",
    );
  });

  it("reports the recipient whose email the provider did not accept", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi
        .fn()
        .mockResolvedValueOnce({
          kind: "sent",
          providerMessageId: "email_123",
        })
        .mockResolvedValueOnce({ kind: "rejected", reason: "invalid_to" }),
    } satisfies ProductEmail;
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.notifyBooked(createCall());

    // assert
    expect(result).toEqual({ coach: "failed", visitor: "sent" });
  });

  it("still writes to the coach when the visitor's send throws", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn(async (command: ProductEmailCommand) => {
        if (command.to === "sofia@example.com") {
          throw new Error("provider unreachable");
        }

        return { kind: "sent" as const, providerMessageId: "email_123" };
      }),
    } satisfies ProductEmail;
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.notifyBooked(createCall());

    // assert
    expect(result).toEqual({ coach: "sent", visitor: "failed" });
    expect(sentTo(productEmail, "eli@evoa.fit").subject).toBe(
      "New assessment call booked.",
    );
  });

  it("still writes to the visitor when the coach's send throws", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn(async (command: ProductEmailCommand) => {
        if (command.to === "eli@evoa.fit") {
          throw new Error("provider unreachable");
        }

        return { kind: "sent" as const, providerMessageId: "email_123" };
      }),
    } satisfies ProductEmail;
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.notifyBooked(createCall());

    // assert
    expect(result).toEqual({ coach: "failed", visitor: "sent" });
  });

  it("treats an unconfirmed send as a failure for that recipient", async () => {
    // arrange
    const productEmail = {
      provider: "resend",
      send: vi.fn().mockResolvedValue({ kind: "unconfirmed" }),
    } satisfies ProductEmail;
    const notifications = createNotifications(productEmail);

    // act
    const result = await notifications.notifyBooked(createCall());

    // assert
    expect(result).toEqual({ coach: "failed", visitor: "failed" });
  });

  it("passes the visitor's note on to the coach and back to her", async () => {
    // arrange
    const productEmail = createProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.notifyBooked(
      createCall({ visitorNotes: "Recovering from a knee injury" }),
    );

    // assert
    expect(sentTo(productEmail, "sofia@example.com").text).toContain(
      "WHAT YOU SHARED: Recovering from a knee injury",
    );
    expect(sentTo(productEmail, "eli@evoa.fit").text).toContain(
      "WHAT SHE SHARED: Recovering from a knee injury",
    );
  });
});
