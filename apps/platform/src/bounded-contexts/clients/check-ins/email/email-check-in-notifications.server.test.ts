import {
  CheckIn,
  type CheckInNotice,
  type CheckInSeriesNotice,
} from "@eli-coach-platform/domain/check-in";
import {
  InMemoryProductEmail,
  type ProductEmail,
} from "~/shared/email/index.server";
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
    seriesId: null,
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
    earlierStartsAt: null,
    moves: 0,
    newTimeNote: null,
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

const MOVED_CHECK_IN = {
  ...NOTICE.checkIn,
  startsAt: new Date("2026-10-23T14:00:00.000Z"),
  endsAt: new Date("2026-10-23T15:00:00.000Z"),
  earlierStartsAt: new Date("2026-10-22T14:00:00.000Z"),
  moves: 1,
  newTimeNote: "Friday suits me better.",
};

const NEW_TIME_NOTICES = [
  {
    notification: "newTimeProposed",
    recipient: "coach",
    to: COACH_EMAIL,
    replyTo: "ana@example.com",
    subject: "Ana Popescu proposed a new time for your check-in",
    zoneLine: "Europe/Bucharest",
  },
  {
    notification: "newTimeProposed",
    recipient: "client",
    to: "ana@example.com",
    replyTo: undefined,
    subject: "Eli proposed a new time for your check-in",
    zoneLine: "Europe/London",
  },
  {
    notification: "newTimeAccepted",
    recipient: "coach",
    to: COACH_EMAIL,
    replyTo: "ana@example.com",
    subject: "Ana Popescu accepted the new time",
    zoneLine: "Europe/Bucharest",
  },
  {
    notification: "newTimeAccepted",
    recipient: "client",
    to: "ana@example.com",
    replyTo: undefined,
    subject: "Eli accepted the new time",
    zoneLine: "Europe/London",
  },
  {
    notification: "newTimeDeclined",
    recipient: "coach",
    to: COACH_EMAIL,
    replyTo: "ana@example.com",
    subject: "Ana Popescu declined the new time",
    zoneLine: "Europe/Bucharest",
  },
  {
    notification: "newTimeDeclined",
    recipient: "client",
    to: "ana@example.com",
    replyTo: undefined,
    subject: "Eli declined the new time",
    zoneLine: "Europe/London",
  },
  {
    notification: "cancelled",
    recipient: "coach",
    to: COACH_EMAIL,
    replyTo: "ana@example.com",
    subject: "Ana Popescu cancelled the check-in",
    zoneLine: "Europe/Bucharest",
  },
  {
    notification: "cancelled",
    recipient: "client",
    to: "ana@example.com",
    replyTo: undefined,
    subject: "Eli cancelled the check-in",
    zoneLine: "Europe/London",
  },
] as const;

const COACH_REQUEST_NOTICE: CheckInNotice = {
  ...NOTICE,
  checkIn: { ...NOTICE.checkIn, initiatedBy: "coach", proposedBy: "coach" },
};

const SERIES_ID = "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a";
const SET_UP_AT = new Date("2026-10-13T08:00:00.000Z");
const CHANGED_AT = new Date("2026-10-15T08:00:00.000Z");
const STOPPED_AT = new Date("2026-10-16T08:00:00.000Z");

const SERIES_NOTICE: CheckInSeriesNotice = {
  series: {
    id: SERIES_ID,
    clientId: "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02",
    weekday: "wednesday",
    hour: 18,
    timeZone: "Europe/Bucharest",
    coversFrom: new Date("2026-10-14T08:00:00.000Z"),
    coversUntil: new Date("2027-01-13T08:00:00.000Z"),
    setUpAt: SET_UP_AT,
    changedAt: null,
    stoppedAt: null,
  },
  weekStartsAt: new Date("2026-10-14T15:00:00.000Z"),
  clientTimeZone: "Europe/London",
  client: NOTICE.client,
  recipient: "client",
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
    "sends the $notification email for the $recipient to $to, keyed by the check-in, its moves and the event",
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
        `check-in:${CHECK_IN_ID}:0:${notification}`,
      );
    },
  );

  it.each(NEW_TIME_NOTICES)(
    "sends the $notification email for the $recipient to $to in that recipient's zone, keyed by the move",
    async ({ notification, recipient, to, replyTo, subject, zoneLine }) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      const delivery = await notifications[notification]({
        ...NOTICE,
        checkIn: MOVED_CHECK_IN,
        recipient,
      });

      // assert
      expect(delivery).toBe("sent");
      const [sent, ...others] = productEmail.sent;
      expect(others).toEqual([]);
      expect(sent?.to).toBe(to);
      expect(sent?.replyTo).toBe(replyTo);
      expect(sent?.subject).toBe(subject);
      expect(sent?.text).toContain(zoneLine);
      expect(sent?.idempotencyKey).toBe(
        `check-in:${CHECK_IN_ID}:1:${notification}`,
      );
    },
  );

  it("names both times and the proposer's note in the new-time email, linking the recipient's Check-ins page", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.newTimeProposed({
      ...NOTICE_TO_CLIENT,
      checkIn: MOVED_CHECK_IN,
    });

    // assert
    const sent = productEmail.sent[0];
    expect(sent?.text).toContain(
      "EARLIER: Thursday, 22 October 2026 at 3:00 PM",
    );
    expect(sent?.text).toContain(
      "NEW TIME: Friday, 23 October 2026 at 3:00 PM",
    );
    expect(sent?.text).toContain("NOTE: Friday suits me better.");
    expect(sent?.html).toContain(
      'href="https://evoa.fit/eli-coach-platform/client/checkins"',
    );
  });

  it("leaves the note out of the new-time email when the proposer wrote none", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.newTimeProposed({
      ...NOTICE,
      checkIn: { ...MOVED_CHECK_IN, newTimeNote: null },
    });

    // assert
    expect(productEmail.sent[0]?.text).not.toContain("NOTE:");
  });

  it("attaches the accepted new time to the proposer's email as a calendar invite with her join link", async () => {
    // arrange
    const productEmail = new InMemoryProductEmail();
    const notifications = createNotifications(productEmail);

    // act
    await notifications.newTimeAccepted({
      ...NOTICE,
      checkIn: MOVED_CHECK_IN,
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
    expect(ics).toContain("DTSTART:20261023T140000Z");
  });

  it.each(["newTimeDeclined", "cancelled"] as const)(
    "attaches no calendar invite to the %s email",
    async (notification) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      await notifications[notification]({
        ...NOTICE_TO_CLIENT,
        checkIn: MOVED_CHECK_IN,
      });

      // assert
      expect(productEmail.sent[0]?.attachments).toBeUndefined();
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

  it.each([
    {
      notification: "seriesSetUp",
      series: SERIES_NOTICE.series,
      subject: "Eli set up a weekly check-in with you",
      idempotencyKey: `check-in-series:${SERIES_ID}:${SET_UP_AT.toISOString()}:seriesSetUp`,
      firstWeek: true,
    },
    {
      notification: "seriesChanged",
      series: { ...SERIES_NOTICE.series, changedAt: CHANGED_AT },
      subject: "Eli changed your weekly check-in",
      idempotencyKey: `check-in-series:${SERIES_ID}:${CHANGED_AT.toISOString()}:seriesChanged`,
      firstWeek: true,
    },
    {
      notification: "seriesStopped",
      series: { ...SERIES_NOTICE.series, stoppedAt: STOPPED_AT },
      subject: "Eli stopped your weekly check-in",
      idempotencyKey: `check-in-series:${SERIES_ID}:${STOPPED_AT.toISOString()}:seriesStopped`,
      firstWeek: false,
    },
  ] as const)(
    "emails the client once per $notification with the weekly moment in her zone",
    async ({ notification, series, subject, idempotencyKey, firstWeek }) => {
      // arrange
      const productEmail = new InMemoryProductEmail();
      const notifications = createNotifications(productEmail);

      // act
      const delivery = await notifications[notification]({
        ...SERIES_NOTICE,
        series,
      });

      // assert
      const sent = productEmail.sent[0];
      expect(delivery).toBe("sent");
      expect(sent?.to).toBe("ana@example.com");
      expect(sent?.replyTo).toBeUndefined();
      expect(sent?.subject).toBe(subject);
      expect(sent?.idempotencyKey).toBe(idempotencyKey);
      expect(sent?.attachments).toBeUndefined();
      expect(sent?.text).toContain(
        "WHEN: Every Wednesday at 4:00 PM — Europe/London (GMT+1)",
      );
      expect(
        sent?.text.includes(
          "FIRST WEEK: Wednesday, 14 October 2026 at 4:00 PM",
        ),
      ).toBe(firstWeek);
      expect(sent?.html).toContain(
        'href="https://evoa.fit/eli-coach-platform/client/checkins"',
      );
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
    const delivery = await notifications.approved(NOTICE_TO_CLIENT);

    // assert
    expect(delivery).toBe("failed");
  });
});
