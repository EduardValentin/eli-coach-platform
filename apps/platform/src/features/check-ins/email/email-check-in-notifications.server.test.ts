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
const CONTACT_EMAIL = "hello@evoa.fit";
const JOIN_URL = `https://evoa.fit/eli-coach-platform/client/checkins/${CHECK_IN_ID}/join`;
const COACH_JOIN_URL = `https://evoa.fit/eli-coach-platform/coach/checkins/${CHECK_IN_ID}/join`;

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
  recipient: "coach",
};

const NOTICE_TO_CLIENT: CheckInNotice = { ...NOTICE, recipient: "client" };

const COACH_REQUEST_NOTICE: CheckInNotice = {
  ...NOTICE,
  checkIn: { ...NOTICE.checkIn, initiatedBy: "coach", proposedBy: "coach" },
};

function createNotifications(productEmail: ProductEmail) {
  return new EmailCheckInNotifications(productEmail, {
    appBasePath: "/eli-coach-platform",
    clock: { now: () => new Date("2026-10-19T08:00:00.000Z") },
    coachEmail: COACH_EMAIL,
    contactEmail: CONTACT_EMAIL,
    publicAppUrl: "https://evoa.fit",
  });
}

describe("EmailCheckInNotifications", () => {
  it.each([
    {
      notification: "requested",
      recipient: "coach",
      to: COACH_EMAIL,
      replyTo: "ana@example.com",
      subject: "Ana Popescu asked for a check-in",
    },
    {
      notification: "withdrawn",
      recipient: "coach",
      to: COACH_EMAIL,
      replyTo: "ana@example.com",
      subject: "Ana Popescu withdrew the check-in request",
    },
    {
      notification: "approved",
      recipient: "client",
      to: "ana@example.com",
      replyTo: undefined,
      subject: "Your check-in is approved",
    },
    {
      notification: "declined",
      recipient: "client",
      to: "ana@example.com",
      replyTo: undefined,
      subject: "Eli could not make your check-in time",
    },
    {
      notification: "requested",
      recipient: "client",
      to: "ana@example.com",
      replyTo: undefined,
      subject: "Eli scheduled a check-in with you",
    },
    {
      notification: "withdrawn",
      recipient: "client",
      to: "ana@example.com",
      replyTo: undefined,
      subject: "Eli cancelled the check-in request",
    },
    {
      notification: "approved",
      recipient: "coach",
      to: COACH_EMAIL,
      replyTo: "ana@example.com",
      subject: "Ana Popescu approved the check-in",
    },
    {
      notification: "declined",
      recipient: "coach",
      to: COACH_EMAIL,
      replyTo: "ana@example.com",
      subject: "Ana Popescu declined the check-in",
    },
  ] as const)(
    "sends the $notification email for the $recipient to $to, keyed by the check-in and the event",
    async ({ notification, recipient, to, replyTo, subject }) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      const delivery = await notifications[notification]({
        ...NOTICE,
        recipient,
      });

      // assert
      expect(delivery).toBe("sent");
      expect(productEmail.sent).toHaveLength(1);
      expect(productEmail.sent[0]?.to).toBe(to);
      expect(productEmail.sent[0]?.replyTo).toBe(replyTo);
      expect(productEmail.sent[0]?.subject).toBe(subject);
      expect(productEmail.sent[0]?.idempotencyKey).toBe(
        `check-in:${CHECK_IN_ID}:${notification}`,
      );
    },
  );

  it.each([
    { notification: "requested", recipient: "coach" },
    { notification: "withdrawn", recipient: "coach" },
    { notification: "declined", recipient: "client" },
    { notification: "requested", recipient: "client" },
    { notification: "withdrawn", recipient: "client" },
    { notification: "declined", recipient: "coach" },
  ] as const)(
    "attaches no calendar invite to the $notification email for the $recipient",
    async ({ notification, recipient }) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      await notifications[notification]({ ...NOTICE, recipient });

      // assert
      expect(productEmail.sent[0]?.attachments).toBeUndefined();
    },
  );

  it("attaches the approved check-in to the client's email as a calendar invite", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.approved(NOTICE_TO_CLIENT);

    // assert
    const [invite, ...others] = productEmail.sent[0]?.attachments ?? [];
    expect(others).toEqual([]);
    expect(invite?.filename).toBe("invite.ics");
    expect(invite?.contentType).toBe(
      "text/calendar; charset=utf-8; method=PUBLISH",
    );
    const ics = new TextDecoder()
      .decode(invite?.content)
      .replaceAll("\r\n ", "");
    expect(ics).toContain("SUMMARY:Check-in with Eli");
    expect(ics).toContain("DTSTART:20261022T140000Z");
    expect(ics).toContain("DTEND:20261022T150000Z");
    expect(ics).toContain("DTSTAMP:20261019T080000Z");
    expect(ics).toContain(`UID:${CHECK_IN_ID}@evoa.fit`);
    expect(ics).toContain(`ORGANIZER;CN=Evoa Fitness:mailto:${CONTACT_EMAIL}`);
    expect(ics).toContain(`URL:${JOIN_URL}`);
  });

  it("links the client's approval email to Google Calendar in her own zone", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.approved(NOTICE_TO_CLIENT);

    // assert
    const calendarUrl = new URL(
      /Add to Google Calendar: (\S+)/.exec(
        productEmail.sent[0]?.text ?? "",
      )?.[1] ?? "",
    );
    expect(calendarUrl.origin + calendarUrl.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(calendarUrl.searchParams.get("text")).toBe("Check-in with Eli");
    expect(calendarUrl.searchParams.get("dates")).toBe(
      "20261022T140000Z/20261022T150000Z",
    );
    expect(calendarUrl.searchParams.get("ctz")).toBe("Europe/London");
    expect(calendarUrl.searchParams.get("location")).toBe(JOIN_URL);
    expect(calendarUrl.searchParams.get("details")).toContain(JOIN_URL);
  });

  it.each(["requested", "withdrawn"] as const)(
    "names the client on one line in the %s email's subject",
    async (notification) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);
      const notice: CheckInNotice = {
        ...NOTICE,
        recipient: "coach",
        client: {
          ...NOTICE.client,
          firstName: "Ana\r\nBcc: someone@example.com",
          lastName: "  Popescu\t",
        },
      };

      // act
      await notifications[notification](notice);

      // assert
      expect(productEmail.sent[0]?.subject).toMatch(
        /^Ana Bcc: someone@example\.com Popescu (asked|withdrew)/,
      );
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
    await notifications.approved(NOTICE_TO_CLIENT);

    // assert
    expect(productEmail.sent[0]?.html).toContain(`href="${JOIN_URL}"`);
  });

  it("links the client's decline email to her Check-ins page on the public origin", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.declined(NOTICE_TO_CLIENT);

    // assert
    expect(productEmail.sent[0]?.html).toContain(
      'href="https://evoa.fit/eli-coach-platform/client/checkins"',
    );
  });

  it.each([
    {
      notification: "requested",
      recipient: "coach",
      zoneLine: "Europe/Bucharest",
    },
    {
      notification: "withdrawn",
      recipient: "coach",
      zoneLine: "Europe/Bucharest",
    },
    {
      notification: "approved",
      recipient: "client",
      zoneLine: "Europe/London",
    },
    {
      notification: "declined",
      recipient: "client",
      zoneLine: "Europe/London",
    },
    {
      notification: "requested",
      recipient: "client",
      zoneLine: "Europe/London",
    },
    {
      notification: "withdrawn",
      recipient: "client",
      zoneLine: "Europe/London",
    },
    {
      notification: "approved",
      recipient: "coach",
      zoneLine: "Europe/Bucharest",
    },
    {
      notification: "declined",
      recipient: "coach",
      zoneLine: "Europe/Bucharest",
    },
  ] as const)(
    "words the $notification email for the $recipient in that recipient's zone",
    async ({ notification, recipient, zoneLine }) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      await notifications[notification]({ ...NOTICE, recipient });

      // assert
      expect(productEmail.sent[0]?.text).toContain(zoneLine);
    },
  );

  it("links the client's email about the coach's request to her Check-ins page with the coach's note", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.requested({
      ...COACH_REQUEST_NOTICE,
      recipient: "client",
    });

    // assert
    expect(productEmail.sent[0]?.html).toContain(
      'href="https://evoa.fit/eli-coach-platform/client/checkins"',
    );
    expect(productEmail.sent[0]?.text).toContain(
      "NOTE: Can we talk about my knees?",
    );
  });

  it("attaches the check-in the client approved to the coach's email as a calendar invite with her join link", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.approved({
      ...COACH_REQUEST_NOTICE,
      recipient: "coach",
    });

    // assert
    const sent = productEmail.sent[0];
    expect(sent?.html).toContain(`href="${COACH_JOIN_URL}"`);
    const [invite, ...others] = sent?.attachments ?? [];
    expect(others).toEqual([]);
    const ics = new TextDecoder()
      .decode(invite?.content)
      .replaceAll("\r\n ", "");
    expect(ics).toContain("SUMMARY:Check-in with Ana Popescu");
    expect(ics).toContain("DTSTART:20261022T140000Z");
    expect(ics).toContain(`URL:${COACH_JOIN_URL}`);
    const calendarUrl = new URL(
      /Add to Google Calendar: (\S+)/.exec(sent?.text ?? "")?.[1] ?? "",
    );
    expect(calendarUrl.searchParams.get("text")).toBe(
      "Check-in with Ana Popescu",
    );
    expect(calendarUrl.searchParams.get("ctz")).toBe("Europe/Bucharest");
    expect(calendarUrl.searchParams.get("location")).toBe(COACH_JOIN_URL);
  });

  it("reports a send the provider refused as failed", async () => {
    // arrange
    const refusing: ProductEmail = {
      provider: "refusing",
      send: async () => ({ kind: "rejected", reason: "validation_error" }),
    };
    const notifications = createNotifications(refusing);

    // act
    const delivery = await notifications.approved(NOTICE_TO_CLIENT);

    // assert
    expect(delivery).toBe("failed");
  });
});
