import {
  CheckIn,
  type CheckInNotice,
  type CheckInSeriesSnapshot,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { describe, expect, it } from "vitest";

import { CheckInNotificationDraftsAdapter } from "./check-in-notification-drafts-adapter.server";

const CHECK_IN_ID = "6f2b9c1e-4d3a-4e8b-9a7c-1d2e3f4a5b6c";
const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const SERIES_ID = "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a";
const FIRST_WEEK_ID = "9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0";
const STARTS_AT = new Date("2026-10-17T15:00:00.000Z");
const NOW = new Date("2026-10-15T09:00:00.000Z");

const ANA = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
};

const CHECK_IN = CheckIn.reconstitute({
  id: CHECK_IN_ID,
  seriesId: null,
  clientId: CLIENT_ID,
  startsAt: STARTS_AT,
  clientTimeZone: "Europe/London",
  coachTimeZone: "Europe/Bucharest",
  kind: "ad_hoc",
  recordedStatus: "pending",
  initiatedBy: "client",
  proposedBy: "client",
  note: null,
  requestedAt: NOW,
  answeredAt: null,
  earlierStartsAt: null,
  moves: 0,
  newTimeNote: null,
}).toSnapshot();

const SERIES: CheckInSeriesSnapshot = {
  id: SERIES_ID,
  clientId: CLIENT_ID,
  weekday: "wednesday",
  hour: 18,
  timeZone: "Europe/Bucharest",
  coversFrom: new Date("2026-10-20T09:00:00.000Z"),
  coversUntil: new Date("2027-01-20T09:00:00.000Z"),
  setUpAt: NOW,
  changedAt: null,
  stoppedAt: null,
};

const WEEK_STARTS_AT = new Date("2026-10-21T15:00:00.000Z");

function noticeTo(recipient: CheckInNotice["recipient"]): CheckInNotice {
  return { checkIn: CHECK_IN, client: ANA, recipient };
}

function seriesNotice(firstWeekId: string | null) {
  return {
    series: SERIES,
    weekStartsAt: WEEK_STARTS_AT,
    clientTimeZone: "Europe/London",
    client: ANA,
    recipient: "client" as const,
    firstWeekId,
  };
}

function lapsedFor(
  party: "coach" | "client",
): Parameters<CheckInNotificationDraftsAdapter["lapseOf"]>[0] {
  return {
    checkIn: CHECK_IN,
    lapse: { kind: "request_expired", lapsedAt: STARTS_AT },
    party,
    client: ANA,
  };
}

describe("CheckInNotificationDrafts#checkInEvent", () => {
  it("addresses the coach with the check-in, its time and the client's full name", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.checkInEvent("requested", noticeTo("coach"), NOW);

    // assert
    expect(draft).toEqual({
      recipient: { party: "coach" },
      kind: "check-in.requested",
      facts: {
        checkInId: CHECK_IN_ID,
        startsAt: STARTS_AT.toISOString(),
        clientName: "Ana Popescu",
      },
      arrivedAt: NOW,
      onceKey: null,
    });
  });

  it("addresses the client by her id without naming her", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.checkInEvent("approved", noticeTo("client"), NOW);

    // assert
    expect(draft).toEqual({
      recipient: { party: "client", clientId: CLIENT_ID },
      kind: "check-in.approved",
      facts: { checkInId: CHECK_IN_ID, startsAt: STARTS_AT.toISOString() },
      arrivedAt: NOW,
      onceKey: null,
    });
  });

  it("refuses to draft facts the bell could not read back", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();
    const notice = {
      ...noticeTo("client"),
      checkIn: { ...CHECK_IN, id: "not-a-check-in-id" },
    };

    // act
    const drafting = () => drafts.checkInEvent("approved", notice, NOW);

    // assert
    expect(drafting).toThrow();
  });

  it.each([
    { event: "requested", kind: "check-in.requested" },
    { event: "withdrawn", kind: "check-in.withdrawn" },
    { event: "approved", kind: "check-in.approved" },
    { event: "declined", kind: "check-in.declined" },
    { event: "newTimeProposed", kind: "check-in.new-time-proposed" },
    { event: "newTimeAccepted", kind: "check-in.new-time-accepted" },
    { event: "newTimeDeclined", kind: "check-in.new-time-declined" },
    { event: "cancelled", kind: "check-in.cancelled" },
  ] as const)("names the $event event $kind", ({ event, kind }) => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.checkInEvent(event, noticeTo("client"), NOW);

    // assert
    expect(draft.kind).toBe(kind);
  });
});

describe("CheckInNotificationDrafts#seriesEvent", () => {
  it.each([
    { event: "seriesSetUp", kind: "check-in.series-set-up" },
    { event: "seriesChanged", kind: "check-in.series-changed" },
  ] as const)(
    "addresses the client with her first week for $event",
    ({ event, kind }) => {
      // arrange
      const drafts = new CheckInNotificationDraftsAdapter();

      // act
      const draft = drafts.seriesEvent(event, seriesNotice(FIRST_WEEK_ID), NOW);

      // assert
      expect(draft).toEqual({
        recipient: { party: "client", clientId: CLIENT_ID },
        kind,
        facts: {
          firstWeekId: FIRST_WEEK_ID,
          firstWeekStartsAt: WEEK_STARTS_AT.toISOString(),
        },
        arrivedAt: NOW,
        onceKey: null,
      });
    },
  );

  it("leaves the first week out when no week was recorded", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.seriesEvent("seriesChanged", seriesNotice(null), NOW);

    // assert
    expect(draft.facts).toEqual({
      firstWeekStartsAt: WEEK_STARTS_AT.toISOString(),
    });
  });

  it("tells the client her weekly check-in stopped with no further facts", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.seriesEvent("seriesStopped", seriesNotice(null), NOW);

    // assert
    expect(draft).toEqual({
      recipient: { party: "client", clientId: CLIENT_ID },
      kind: "check-in.series-stopped",
      facts: {},
      arrivedAt: NOW,
      onceKey: null,
    });
  });
});

describe("CheckInNotificationDrafts#clashesAdded", () => {
  it("tells the coach how many new weeks clash, whose they are and the earliest one", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.clashesAdded(
      {
        series: SERIES,
        client: ANA,
        clashes: 2,
        earliest: { id: FIRST_WEEK_ID, startsAt: WEEK_STARTS_AT },
      },
      NOW,
    );

    // assert
    expect(draft).toEqual({
      recipient: { party: "coach" },
      kind: "check-in.series-clashes",
      facts: {
        clientName: "Ana Popescu",
        clashes: 2,
        earliestId: FIRST_WEEK_ID,
        earliestStartsAt: WEEK_STARTS_AT.toISOString(),
      },
      arrivedAt: NOW,
      onceKey: null,
    });
  });
});

describe("CheckInNotificationDrafts#lapseOf", () => {
  it("records the coach's expiry once, arriving when the check-in's time passed and naming the client", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.lapseOf(lapsedFor("coach"));

    // assert
    expect(draft).toEqual({
      recipient: { party: "coach" },
      kind: "check-in.request-expired",
      facts: {
        checkInId: CHECK_IN_ID,
        startsAt: STARTS_AT.toISOString(),
        clientName: "Ana Popescu",
      },
      arrivedAt: STARTS_AT,
      onceKey: `check-in:${CHECK_IN_ID}:request_expired:coach`,
    });
  });

  it("records the client's expiry under a once-key of her own", () => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.lapseOf(lapsedFor("client"));

    // assert
    expect(draft.recipient).toEqual({ party: "client", clientId: CLIENT_ID });
    expect(draft.facts).toEqual({
      checkInId: CHECK_IN_ID,
      startsAt: STARTS_AT.toISOString(),
    });
    expect(draft.onceKey).toBe(
      `check-in:${CHECK_IN_ID}:request_expired:client`,
    );
  });

  it.each([
    { lapseKind: "request_expired", kind: "check-in.request-expired" },
    { lapseKind: "new_time_expired", kind: "check-in.new-time-expired" },
    { lapseKind: "clash_missed", kind: "check-in.clash-missed" },
  ] as const)("names the $lapseKind lapse $kind", ({ lapseKind, kind }) => {
    // arrange
    const drafts = new CheckInNotificationDraftsAdapter();

    // act
    const draft = drafts.lapseOf({
      ...lapsedFor("coach"),
      lapse: { kind: lapseKind, lapsedAt: STARTS_AT },
    });

    // assert
    expect(draft.kind).toBe(kind);
  });
});
