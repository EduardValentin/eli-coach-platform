import {
  CheckIn,
  type CheckInNotice,
} from "@eli-coach-platform/domain/check-in";
import {
  InMemoryProductEmail,
  type ProductEmail,
} from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import { EmailCheckInNotifications } from "./email-check-in-notifications.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const COACH_EMAIL = "eli@evoa.fit";

const NOTICE: CheckInNotice = {
  checkIn: CheckIn.reconstitute({
    id: CHECK_IN_ID,
    clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
    startsAt: new Date("2026-10-22T14:00:00.000Z"),
    clientTimeZone: "Europe/London",
    coachTimeZone: "Europe/Bucharest",
    kind: "ad_hoc",
    recordedStatus: "pending",
    initiatedBy: "client",
    proposedBy: "client",
    note: "Can we talk about my knees?",
    requestedAt: new Date("2026-10-19T08:00:00.000Z"),
    answeredAt: null,
  }).toSnapshot(),
  client: {
    clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
  },
};

function createNotifications(productEmail: ProductEmail) {
  return new EmailCheckInNotifications(productEmail, {
    appBasePath: "/eli-coach-platform",
    clock: { now: () => new Date("2026-10-19T08:00:00.000Z") },
    coachEmail: COACH_EMAIL,
    publicAppUrl: "https://evoa.fit",
  });
}

describe("EmailCheckInNotifications", () => {
  it.each([
    {
      notification: "requested",
      to: COACH_EMAIL,
      replyTo: "ana@example.com",
    },
    {
      notification: "withdrawn",
      to: COACH_EMAIL,
      replyTo: "ana@example.com",
    },
    { notification: "approved", to: "ana@example.com", replyTo: undefined },
    { notification: "declined", to: "ana@example.com", replyTo: undefined },
  ] as const)(
    "sends the $notification email to $to, keyed by the check-in and the event",
    async ({ notification, to, replyTo }) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      const delivery = await notifications[notification](NOTICE);

      // assert
      expect(delivery).toBe("sent");
      expect(productEmail.sent).toHaveLength(1);
      expect(productEmail.sent[0]?.to).toBe(to);
      expect(productEmail.sent[0]?.replyTo).toBe(replyTo);
      expect(productEmail.sent[0]?.idempotencyKey).toBe(
        `check-in:${CHECK_IN_ID}:${notification}`,
      );
      expect(productEmail.sent[0]?.attachments).toBeUndefined();
    },
  );

  it("links the coach's request email to her Check-ins page on the public origin", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.requested(NOTICE);

    // assert
    expect(productEmail.sent[0]?.html).toContain(
      'href="https://evoa.fit/eli-coach-platform/coach/checkins"',
    );
  });

  it("links the client's approval email to her join link on the public origin", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.approved(NOTICE);

    // assert
    expect(productEmail.sent[0]?.html).toContain(
      `href="https://evoa.fit/eli-coach-platform/client/checkins/${CHECK_IN_ID}/join"`,
    );
  });

  it("links the client's decline email to her Check-ins page on the public origin", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.declined(NOTICE);

    // assert
    expect(productEmail.sent[0]?.html).toContain(
      'href="https://evoa.fit/eli-coach-platform/client/checkins"',
    );
  });

  it.each([
    { notification: "requested", zoneLine: "Europe/Bucharest" },
    { notification: "withdrawn", zoneLine: "Europe/Bucharest" },
    { notification: "approved", zoneLine: "Europe/London" },
    { notification: "declined", zoneLine: "Europe/London" },
  ] as const)(
    "words the $notification email's time in its recipient's zone",
    async ({ notification, zoneLine }) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      await notifications[notification](NOTICE);

      // assert
      expect(productEmail.sent[0]?.text).toContain(zoneLine);
    },
  );

  it("reports a send the provider refused as failed", async () => {
    // arrange
    const refusing: ProductEmail = {
      provider: "refusing",
      send: async () => ({ kind: "rejected", reason: "validation_error" }),
    };
    const notifications = createNotifications(refusing);

    // act
    const delivery = await notifications.approved(NOTICE);

    // assert
    expect(delivery).toBe("failed");
  });
});
